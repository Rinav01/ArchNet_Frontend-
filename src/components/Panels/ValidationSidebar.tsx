'use client';

import React, { useState } from 'react';
import { useCanvasStore, getTopologicalOrder, computeNodeOutputShape } from '@/store/canvasStore';
import { useProjectStore } from '@/store/projectStore';
import { AutoMLSuggestion, CanvasNode, CanvasEdge, ValidationError } from '@/types/canvas';
import { graphqlRequest, SCORE_ARCHITECTURE, RECOMMEND_ARCHITECTURE } from '@/lib/graphql/client';
import { toast } from '@/store/notificationStore';
import { 
  AlertTriangle, 
  CheckCircle, 
  Terminal, 
  Layers, 
  ChevronRight, 
  ChevronLeft,
  XCircle,
  Activity,
  Cpu,
  RefreshCw,
  Code,
  Sparkles,
  Lightbulb,
  Wrench
} from 'lucide-react';

interface ExtendedValidationError extends ValidationError {
  customBlockId?: string;
}

export default function ValidationSidebar() {
  const [activeTab, setActiveTab] = useState<'issues' | 'suggestions' | 'trace' | 'sandbox'>('issues');
  const [expandedIssueIdx, setExpandedIssueIdx] = useState<number | null>(null);
  
  const { 
    nodes, 
    edges, 
    customBlocks,
    validationErrors, 
    compilationResult, 
    isValidating, 
    triggerCompilation, 
    setSelectedNodeId 
  } = useCanvasStore();
  
  const activeProjectId = useProjectStore((state) => state.activeProjectId);
  const isOnline = useProjectStore((state) => state.isOnline);

  const [backendScore, setBackendScore] = useState<number | null>(null);
  const [backendGrade, setBackendGrade] = useState<string | null>(null);
  const [backendBreakdown, setBackendBreakdown] = useState<any | null>(null);
  const [backendRecommendations, setBackendRecommendations] = useState<any[] | null>(null);
  const [isScoringLoading, setIsScoringLoading] = useState(false);

  React.useEffect(() => {
    let active = true;
    const fetchScores = async () => {
      if (!isOnline || !activeProjectId) {
        setBackendScore(null);
        setBackendGrade(null);
        setBackendBreakdown(null);
        setBackendRecommendations(null);
        return;
      }
      setIsScoringLoading(true);
      try {
        const [scoreData, recommendData] = await Promise.all([
          graphqlRequest(SCORE_ARCHITECTURE, { projectId: activeProjectId }),
          graphqlRequest(RECOMMEND_ARCHITECTURE, { projectId: activeProjectId })
        ]);
        if (active) {
          if (scoreData?.scoreArchitecture) {
            setBackendScore(scoreData.scoreArchitecture.score);
            setBackendGrade(scoreData.scoreArchitecture.grade);
            setBackendBreakdown(scoreData.scoreArchitecture.breakdown);
          }
          if (recommendData?.recommendArchitecture) {
            setBackendRecommendations(recommendData.recommendArchitecture);
          }
        }
      } catch (err) {
        console.error("Failed to fetch architecture score/recommendations:", err);
      } finally {
        if (active) setIsScoringLoading(false);
      }
    };

    fetchScores();
    return () => {
      active = false;
    };
  }, [activeProjectId, nodes, edges, isOnline]);

  const applyAddBatchNorm = async (convNodeId: string) => {
    const store = useCanvasStore.getState();
    const convNode = store.nodes.find(n => n.id === convNodeId);
    if (!convNode) return;

    const outgoingEdges = store.edges.filter(e => e.source === convNodeId);
    const newX = convNode.x + 120;
    const newY = convNode.y;

    const actualBnId = await store.addNode('BatchNorm2D', newX, newY);
    if (!actualBnId) return;

    if (outgoingEdges.length > 0) {
      for (const edge of outgoingEdges) {
        await store.removeEdge(edge.id);
        await store.addEdge(actualBnId, edge.target);
      }
    }
    await store.addEdge(convNodeId, actualBnId);
    store.addLog('success', `AutoML Fix: Inserted BatchNorm2D after Conv2D Layer ${convNode.name}.`);
    store.triggerCompilation();
  };

  const applyReduceDenseWidth = (denseNodeId: string) => {
    const store = useCanvasStore.getState();
    const denseNode = store.nodes.find(n => n.id === denseNodeId);
    if (!denseNode) return;

    store.updateNodeConfig(denseNode.id, { units: 128 });
    store.addLog('success', `AutoML Fix: Reduced units of Dense Layer ${denseNode.name} to 128.`);
    store.triggerCompilation();
  };


  // Helper function to validate a custom block internally for shape, rank, cycle, and broadcasting errors
  const getCustomBlockErrors = (): ExtendedValidationError[] => {
    const cbErrors: ExtendedValidationError[] = [];
    if (!customBlocks) return cbErrors;

    customBlocks.forEach(block => {
      // 1. DAG DFS Cycle checker
      const visited = new Set<string>();
      const recStack = new Set<string>();
      let hasCycle = false;

      const hasCycleDFS = (u: string): boolean => {
        visited.add(u);
        recStack.add(u);

        const neighbors = block.edges.filter(e => e.source === u).map(e => e.target);
        for (const v of neighbors) {
          if (!visited.has(v)) {
            if (hasCycleDFS(v)) return true;
          } else if (recStack.has(v)) {
            return true;
          }
        }

        recStack.delete(u);
        return false;
      };

      block.nodes.forEach(n => {
        if (!visited.has(n.id)) {
          if (hasCycleDFS(n.id)) {
            hasCycle = true;
          }
        }
      });

      if (hasCycle) {
        cbErrors.push({
          type: 'error',
          category: 'cycle',
          message: `[Custom Block: "${block.name}"] DAG loop validation failed: Cyclic connections detected in custom block!`,
          customBlockId: block.id
        });
      }

      // 2. Disconnected components check
      const inputNode = block.nodes.find(n => n.type === 'Input');
      const flowVisited = new Set<string>();
      if (inputNode) {
        const queue = [inputNode.id];
        while (queue.length > 0) {
          const curr = queue.shift()!;
          if (!flowVisited.has(curr)) {
            flowVisited.add(curr);
            const neighbors = block.edges.filter(e => e.source === curr).map(e => e.target);
            neighbors.forEach(v => {
              if (!flowVisited.has(v)) queue.push(v);
            });
          }
        }

        block.nodes.forEach(n => {
          if (!flowVisited.has(n.id) && n.type !== 'Input') {
            cbErrors.push({
              nodeId: n.id,
              type: 'warning',
              category: 'disconnected',
              message: `[Custom Block: "${block.name}"] Layer '${n.name}' is disconnected from the main flow.`,
              customBlockId: block.id
            });
          }
        });
      }

      // 3. Topological sorting & Shape propagation
      const orderedNodes = getTopologicalOrder(block.nodes, block.edges);
      const shapesMap = new Map<string, number[]>();

      const computedNodes = orderedNodes.map(n => {
        const incomingEdges = block.edges.filter(e => e.target === n.id);
        let inputShape: number[] = [];

        if (incomingEdges.length > 0) {
          const parentId = incomingEdges[0].source;
          const parentOutputShape = shapesMap.get(parentId);
          if (parentOutputShape) {
            inputShape = parentOutputShape;
          }
        }

        const outputShape = computeNodeOutputShape(n.type, inputShape, n.config);
        shapesMap.set(n.id, outputShape);

        return {
          ...n,
          inputShape,
          outputShape,
        };
      });

      // 4. Ranks & Shape validation
      computedNodes.forEach(n => {
        if (n.type === 'Conv2D' || n.type === 'MaxPool2D') {
          if (n.inputShape.length > 0 && n.inputShape.length !== 3) {
            cbErrors.push({
              nodeId: n.id,
              type: 'error',
              category: 'rank',
              message: `[Custom Block: "${block.name}"] Layer '${n.name}' (${n.type}) requires a 3D input tensor. Received: [${n.inputShape.join(', ')}].`,
              customBlockId: block.id
            });
          }
        } else if (n.type === 'Dense') {
          if (n.inputShape.length > 0 && n.inputShape.length !== 1) {
            cbErrors.push({
              nodeId: n.id,
              type: 'error',
              category: 'rank',
              message: `[Custom Block: "${block.name}"] Layer '${n.name}' (${n.type}) requires a 1D input tensor. Received: [${n.inputShape.join(', ')}]. Insert a Flatten block.`,
              customBlockId: block.id
            });
          }
        }
      });

      // 5. Broadcasting validation
      computedNodes.forEach(n => {
        const incomingEdges = block.edges.filter(e => e.target === n.id);
        if (incomingEdges.length > 1) {
          const firstParentId = incomingEdges[0].source;
          const firstShape = shapesMap.get(firstParentId) || [];
          
          for (let idx = 1; idx < incomingEdges.length; idx++) {
            const otherParentId = incomingEdges[idx].source;
            const otherParent = block.nodes.find(node => node.id === otherParentId);
            const otherShape = shapesMap.get(otherParentId) || [];
            
            let isCompatible = true;
            if (firstShape.length !== otherShape.length) {
              isCompatible = false;
            } else {
              for (let d = 0; d < firstShape.length; d++) {
                if (firstShape[d] !== otherShape[d] && firstShape[d] !== 1 && otherShape[d] !== 1) {
                  isCompatible = false;
                  break;
                }
              }
            }
            
            if (!isCompatible) {
              cbErrors.push({
                nodeId: n.id,
                type: 'error',
                category: 'broadcast',
                message: `[Custom Block: "${block.name}"] Broadcasting conflict at Layer '${n.name}': Incoming shape from '${otherParent?.name || 'parent'}' [${otherShape.join(', ')}] conflicts with base shape [${firstShape.join(', ')}].`,
                customBlockId: block.id
              });
            }
          }
        }
      });
    });
    return cbErrors;
  };

  const customBlockErrors = getCustomBlockErrors();
  const allErrorsAndWarnings = [...validationErrors, ...customBlockErrors];

  const errors = allErrorsAndWarnings.filter(e => e.type === 'error');
  const warnings = allErrorsAndWarnings.filter(e => e.type === 'warning');

  // Topological sorting helper for the active trace viewer
  const getTraceOrder = () => {
    return getTopologicalOrder(nodes, edges);
  };

  const traceOrder = getTraceOrder();

  const getAutoMLSuggestions = (): AutoMLSuggestion[] => {
    const suggestions: AutoMLSuggestion[] = [];

    // --- Active Canvas Suggestions ---

    // 1. Check Conv2D activation None
    nodes.forEach(node => {
      if (node.type === 'Conv2D' && (!node.config.activation || node.config.activation === 'None')) {
        suggestions.push({
          id: `conv_act_${node.id}`,
          title: `Conv2D Activation Missing`,
          category: 'anti-pattern',
          description: `Layer '${node.name}' has no activation function configured. Linear convolutions restrict model representational capacity.`,
          advice: `Applying a non-linear activation like ReLU after convolutions allows the network to learn complex non-linear feature maps.`,
          severity: 'high',
          score: 8.8,
          nodeId: node.id,
          fixLabel: `Set Activation to ReLU`,
          applyFix: () => {
            useCanvasStore.getState().updateNodeConfig(node.id, { activation: 'ReLU' });
            useCanvasStore.getState().addLog('success', `AutoML Fix applied: Configured ReLU activation for Layer ${node.name}.`);
          }
        });
      }
    });

    // 1b. Check Conv2D BatchNorm2D missing
    const hasBatchNorm = nodes.some(n => n.type === 'BatchNorm2D');
    const firstConv = nodes.find(n => n.type === 'Conv2D');
    if (firstConv && !hasBatchNorm) {
      suggestions.push({
        id: `local_add_bn_${firstConv.id}`,
        title: `Add BatchNorm`,
        category: 'architecture',
        description: `Conv2D Layer '${firstConv.name}' is missing a batch normalization layer. Standard vision networks use Batch Normalization to stabilize training.`,
        advice: `Adding a BatchNorm2D layer after '${firstConv.name}' normalizes feature maps, mitigating internal covariate shift.`,
        severity: 'medium',
        score: 7.0,
        nodeId: firstConv.id,
        fixLabel: `Add BatchNorm`,
        applyFix: async () => {
          await applyAddBatchNorm(firstConv.id);
        }
      });
    }

    // 2. Check input dimensions power of 2 or typical sizes
    const inputNode = nodes.find(n => n.type === 'Input');
    if (inputNode && inputNode.config.dim) {
      const [h, w] = inputNode.config.dim;
      if (h !== 224 || w !== 224) {
        suggestions.push({
          id: `input_dim_${inputNode.id}`,
          title: `Non-Standard Input Dimension`,
          category: 'optimization',
          description: `Input shape [${inputNode.config.dim.join(', ')}] is non-standard. Most pretrained CNN networks (ResNet, VGG) expect a 224x224 size.`,
          advice: `Resizing your input images to a standard 224x224 dimension ensures optimal spatial pooling grids and compatibility with model hub backbones.`,
          severity: 'info',
          score: 4.5,
          nodeId: inputNode.id,
          fixLabel: `Resize to 224x224`,
          applyFix: () => {
            useCanvasStore.getState().updateNodeConfig(inputNode.id, { 
              dim: [224, 224, 3],
              shape: [null, 3, 224, 224]
            });
            useCanvasStore.getState().addLog('success', `AutoML Fix applied: Resized Input Layer dimension to 224x224.`);
          }
        });
      }
    }

    // 3. Check direct Conv2D/MaxPool2D connection to Dense without Flatten
    edges.forEach(edge => {
      const src = nodes.find(n => n.id === edge.source);
      const tgt = nodes.find(n => n.id === edge.target);
      if (src && tgt && (src.type === 'Conv2D' || src.type === 'MaxPool2D') && tgt.type === 'Dense') {
        suggestions.push({
          id: `missing_flatten_${edge.id}`,
          title: `Missing Flatten Layer`,
          category: 'anti-pattern',
          description: `Layer '${src.name}' (outputting 3D spatial tensor) is connected directly to Dense Layer '${tgt.name}' (expecting 1D feature vector).`,
          advice: `Fully connected Dense layers require a preceding Flatten layer to collapse spatial dimensions (H x W x C) into a flat 1D projection shape.`,
          severity: 'high',
          score: 9.5,
          nodeId: src.id,
          fixLabel: `Insert Flatten Layer`,
          applyFix: async () => {
            const store = useCanvasStore.getState();
            
            // Remove the direct mismatching edge
            await store.removeEdge(edge.id);

            // Calculate midpoint between src and tgt
            const midX = Math.round((src.x + tgt.x) / 2) / 20 * 20;
            const midY = Math.round((src.y + tgt.y) / 2) / 20 * 20;
            
            // Add Flatten node and get its actual ID
            const actualFlattenId = await store.addNode('Flatten', midX, midY);
            if (!actualFlattenId) return;

            // Connect src -> Flatten -> tgt
            await store.addEdge(src.id, actualFlattenId);
            await store.addEdge(actualFlattenId, tgt.id);

            store.addLog('success', `AutoML Fix applied: Inserted Flatten Layer between ${src.name} and ${tgt.name}.`);
          }
        });
      }
    });

    // 4. Parameter explosion check (Large Flat node connected to Dense units)
    nodes.forEach(node => {
      if (node.type === 'Dense' && node.inputShape && node.inputShape.length > 0) {
        const inputDim = node.inputShape.reduce((a, b) => a * b, 1);
        const units = node.config.units || 10;
        const totalParams = inputDim * units;
        if (totalParams > 500000) {
          suggestions.push({
            id: `param_explosion_${node.id}`,
            title: `Reduce Dense Width`,
            category: 'optimization',
            description: `Fully connected projection at '${node.name}' contains over ${totalParams.toLocaleString()} parameters. This is highly redundant and leads to heavy vRAM memory footprint.`,
            advice: `Consider reducing the Dense units or adding pooling layers (MaxPool2D) before flattening to reduce spatial feature dimensions.`,
            severity: 'medium',
            score: 7.5,
            nodeId: node.id,
            fixLabel: `Reduce Dense Width`,
            applyFix: () => {
              applyReduceDenseWidth(node.id);
            }
          });
        }
      }
    });

    // 5. Architecture advice: Adding Pooling after successive Conv2D
    let consecutiveConvCount = 0;
    let lastConvNode: CanvasNode | null = null;
    traceOrder.forEach(n => {
      if (n.type === 'Conv2D') {
        consecutiveConvCount++;
        lastConvNode = n;
      } else if (n.type === 'MaxPool2D') {
        consecutiveConvCount = 0;
      }
    });

    if (consecutiveConvCount >= 3 && lastConvNode) {
      const targetNode = lastConvNode as CanvasNode;
      suggestions.push({
        id: `consecutive_conv_pooling_${targetNode.id}`,
        title: `Deep Feature Grid without Pooling`,
        category: 'architecture',
        description: `Your network layers list consecutive convolutions ('${targetNode.name}') without pooling. This prevents spatial feature downsampling, increasing memory costs.`,
        advice: `Standard deep vision backbones downsample spatial feature maps by adding MaxPool2D layers every 2 convolutions to aggregate local features and accelerate field size growth.`,
        severity: 'medium',
        score: 6.8,
        nodeId: targetNode.id,
        fixLabel: `Insert MaxPool2D Layer`,
        applyFix: async () => {
          const store = useCanvasStore.getState();
          // Find outgoing edge of targetNode
          const outgoing = store.edges.find(e => e.source === targetNode.id);
          if (outgoing) {
            await store.removeEdge(outgoing.id);

            const midX = Math.round((targetNode.x + 180) / 20) * 20;
            const midY = Math.round((targetNode.y) / 20) * 20;
            
            const actualPoolId = await store.addNode('MaxPool2D', midX, midY);
            if (!actualPoolId) return;

            await store.addEdge(targetNode.id, actualPoolId);
            await store.addEdge(actualPoolId, outgoing.target);

            store.addLog('success', `AutoML Fix applied: Inserted MaxPool2D downsampling after ${targetNode.name}.`);
          } else {
            // Simply append MaxPool2D at the end
            const midX = Math.round((targetNode.x + 240) / 20) * 20;
            const midY = Math.round((targetNode.y) / 20) * 20;
            
            const actualPoolId = await store.addNode('MaxPool2D', midX, midY);
            if (!actualPoolId) return;
            await store.addEdge(targetNode.id, actualPoolId);
            
            store.addLog('success', `AutoML Fix applied: Appended MaxPool2D layer after ${targetNode.name}.`);
          }
        }
      });
    }

    // --- Custom Saved Blocks Suggestions ---
    if (customBlocks) {
      customBlocks.forEach(block => {
        // CB Rule 1: Conv2D Activation None
        block.nodes.forEach(node => {
          if (node.type === 'Conv2D' && (!node.config.activation || node.config.activation === 'None')) {
            suggestions.push({
              id: `cb_conv_act_${block.id}_${node.id}`,
              title: `[Custom Block: "${block.name}"] Conv2D Activation Missing`,
              category: 'anti-pattern',
              description: `Layer '${node.name}' in custom block "${block.name}" has no activation function configured. Linear convolutions severely restrict model representational capacity.`,
              advice: `Applying a non-linear activation like ReLU after convolutions allows the network to learn complex non-linear feature maps.`,
              severity: 'high',
              score: 8.8,
              nodeId: node.id,
              fixLabel: `Set Activation to ReLU`,
              applyFix: () => {
                const updated = useCanvasStore.getState().customBlocks.map(cb => {
                  if (cb.id === block.id) {
                    return {
                      ...cb,
                      nodes: cb.nodes.map(n => n.id === node.id ? { ...n, config: { ...n.config, activation: 'ReLU' as const } } : n)
                    };
                  }
                  return cb;
                });
                useCanvasStore.setState({ customBlocks: updated });
                localStorage.setItem('mlbuilder_custom_blocks', JSON.stringify(updated));
                useCanvasStore.getState().addLog('success', `AutoML Fix: Configured ReLU activation for Layer ${node.name} in custom block "${block.name}".`);
              }
            });
          }
        });

        // CB Rule 2: Input dimensions non-standard
        const cbInput = block.nodes.find(n => n.type === 'Input');
        if (cbInput && cbInput.config.dim) {
          const [h, w] = cbInput.config.dim;
          if (h !== 224 || w !== 224) {
            suggestions.push({
              id: `cb_input_dim_${block.id}_${cbInput.id}`,
              title: `[Custom Block: "${block.name}"] Non-Standard Input Dimension`,
              category: 'optimization',
              description: `Input shape [${cbInput.config.dim.join(', ')}] in custom block "${block.name}" is non-standard. Most pretrained CNN networks (ResNet, VGG) expect a 224x224 size.`,
              advice: `Resizing your input images to a standard 224x224 dimension ensures optimal spatial pooling grids and compatibility with model hub backbones.`,
              severity: 'info',
              score: 4.5,
              nodeId: cbInput.id,
              fixLabel: `Resize to 224x224`,
              applyFix: () => {
                const updated = useCanvasStore.getState().customBlocks.map(cb => {
                  if (cb.id === block.id) {
                    return {
                      ...cb,
                      nodes: cb.nodes.map(n => n.id === cbInput.id ? { 
                        ...n, 
                        config: { ...n.config, dim: [224, 224, 3], shape: [null, 3, 224, 224] } 
                      } : n)
                    };
                  }
                  return cb;
                });
                useCanvasStore.setState({ customBlocks: updated });
                localStorage.setItem('mlbuilder_custom_blocks', JSON.stringify(updated));
                useCanvasStore.getState().addLog('success', `AutoML Fix: Resized Input Layer in custom block "${block.name}" to 224x224.`);
              }
            });
          }
        }

        // CB Rule 3: Missing Flatten Layer
        block.edges.forEach(edge => {
          const src = block.nodes.find(n => n.id === edge.source);
          const tgt = block.nodes.find(n => n.id === edge.target);
          if (src && tgt && (src.type === 'Conv2D' || src.type === 'MaxPool2D') && tgt.type === 'Dense') {
            suggestions.push({
              id: `cb_missing_flatten_${block.id}_${edge.id}`,
              title: `[Custom Block: "${block.name}"] Missing Flatten Layer`,
              category: 'anti-pattern',
              description: `Layer '${src.name}' is connected directly to Dense Layer '${tgt.name}' in custom block "${block.name}".`,
              advice: `Fully connected Dense layers require a preceding Flatten layer to collapse spatial dimensions (H x W x C) into a flat 1D projection shape.`,
              severity: 'high',
              score: 9.5,
              nodeId: src.id,
              fixLabel: `Insert Flatten Layer`,
              applyFix: () => {
                const updated = useCanvasStore.getState().customBlocks.map(cb => {
                  if (cb.id === block.id) {
                    const newEdges = cb.edges.filter(e => e.id !== edge.id);
                    const midX = Math.round((src.x + tgt.x) / 2 / 20) * 20;
                    const midY = Math.round((src.y + tgt.y) / 2 / 20) * 20;
                    const flattenId = `node_flatten_${Math.random().toString(36).substr(2, 9)}`;
                    const flattenNode: CanvasNode = {
                      id: flattenId,
                      type: 'Flatten',
                      name: `FLATTEN_${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
                      x: midX,
                      y: midY,
                      inputShape: [],
                      outputShape: [],
                      config: {}
                    };
                    return {
                      ...cb,
                      nodes: [...cb.nodes, flattenNode],
                      edges: [
                        ...newEdges,
                        { id: `edge_${Math.random().toString(36).substring(2, 10)}`, source: src.id, target: flattenId },
                        { id: `edge_${Math.random().toString(36).substring(2, 10)}`, source: flattenId, target: tgt.id }
                      ]
                    };
                  }
                  return cb;
                });
                useCanvasStore.setState({ customBlocks: updated });
                localStorage.setItem('mlbuilder_custom_blocks', JSON.stringify(updated));
                useCanvasStore.getState().addLog('success', `AutoML Fix: Inserted Flatten Layer in custom block "${block.name}".`);
              }
            });
          }
        });

        // CB Rule 4: Parameter explosion
        const cbOrdered = getTopologicalOrder(block.nodes, block.edges);
        const cbShapesMap = new Map<string, number[]>();
        cbOrdered.forEach(n => {
          const incomingEdges = block.edges.filter(e => e.target === n.id);
          let inputShape: number[] = [];

          if (incomingEdges.length > 0) {
            const parentId = incomingEdges[0].source;
            const parentOutputShape = cbShapesMap.get(parentId);
            if (parentOutputShape) {
              inputShape = parentOutputShape;
            }
          }

          const outputShape = computeNodeOutputShape(n.type, inputShape, n.config);
          cbShapesMap.set(n.id, outputShape);

          if (n.type === 'Dense' && inputShape.length > 0) {
            const inputDim = inputShape.reduce((a, b) => a * b, 1);
            const units = n.config.units || 10;
            const totalParams = inputDim * units;
            if (totalParams > 500000) {
              suggestions.push({
                id: `cb_param_explosion_${block.id}_${n.id}`,
                title: `[Custom Block: "${block.name}"] Dense Parameter Explosion`,
                category: 'optimization',
                description: `Fully connected projection at '${n.name}' in custom block "${block.name}" contains over ${totalParams.toLocaleString()} parameters. This leads to heavy memory footprints.`,
                advice: `Consider reducing the Dense units or adding pooling layers (MaxPool2D) before flattening to reduce spatial feature dimensions.`,
                severity: 'medium',
                score: 7.5,
                nodeId: n.id,
                fixLabel: `Reduce Units to 128`,
                applyFix: () => {
                  const updated = useCanvasStore.getState().customBlocks.map(cb => {
                    if (cb.id === block.id) {
                      return {
                        ...cb,
                        nodes: cb.nodes.map(node => node.id === n.id ? {
                          ...node,
                          config: { ...node.config, units: 128 }
                        } : node)
                      };
                    }
                    return cb;
                  });
                  useCanvasStore.setState({ customBlocks: updated });
                  localStorage.setItem('mlbuilder_custom_blocks', JSON.stringify(updated));
                  useCanvasStore.getState().addLog('success', `AutoML Fix: Reduced units of Dense Layer ${n.name} to 128 in custom block "${block.name}".`);
                }
              });
            }
          }
        });

        // CB Rule 5: Deep Feature Grid without Pooling
        let consecutiveCount = 0;
        let lastConv: CanvasNode | null = null;
        cbOrdered.forEach(n => {
          if (n.type === 'Conv2D') {
            consecutiveCount++;
            lastConv = n;
          } else if (n.type === 'MaxPool2D') {
            consecutiveCount = 0;
          }
        });

        if (consecutiveCount >= 3 && lastConv) {
          const targetNode = lastConv as CanvasNode;
          suggestions.push({
            id: `cb_consecutive_conv_pooling_${block.id}_${targetNode.id}`,
            title: `[Custom Block: "${block.name}"] Deep Feature Grid without Pooling`,
            category: 'architecture',
            description: `Your custom block "${block.name}" layers list consecutive convolutions ('${targetNode.name}') without pooling.`,
            advice: `Standard deep vision backbones downsample spatial feature maps by adding MaxPool2D layers every 2 convolutions to aggregate local features and accelerate field size growth.`,
            severity: 'medium',
            score: 6.8,
            nodeId: targetNode.id,
            fixLabel: `Insert MaxPool2D Layer`,
            applyFix: () => {
              const updated = useCanvasStore.getState().customBlocks.map(cb => {
                if (cb.id === block.id) {
                  const outgoing = cb.edges.find(e => e.source === targetNode.id);
                  const midX = Math.round((targetNode.x + 180) / 20) * 20;
                  const midY = Math.round((targetNode.y) / 20) * 20;
                  const poolId = `node_pool_${Math.random().toString(36).substr(2, 9)}`;
                  const poolNode: CanvasNode = {
                    id: poolId,
                    type: 'MaxPool2D',
                    name: `POOL_${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
                    x: midX,
                    y: midY,
                    inputShape: [],
                    outputShape: [],
                    config: { poolSize: 2 }
                  };

                  if (outgoing) {
                    const newEdges = cb.edges.filter(e => e.id !== outgoing.id);
                    return {
                      ...cb,
                      nodes: [...cb.nodes, poolNode],
                      edges: [
                        ...newEdges,
                        { id: `edge_${Math.random().toString(36).substring(2, 10)}`, source: targetNode.id, target: poolId },
                        { id: `edge_${Math.random().toString(36).substring(2, 10)}`, source: poolId, target: outgoing.target }
                      ]
                    };
                  } else {
                    return {
                      ...cb,
                      nodes: [...cb.nodes, poolNode],
                      edges: [
                        ...cb.edges,
                        { id: `edge_${Math.random().toString(36).substring(2, 10)}`, source: targetNode.id, target: poolId }
                      ]
                    };
                  }
                }
                return cb;
              });
              useCanvasStore.setState({ customBlocks: updated });
              localStorage.setItem('mlbuilder_custom_blocks', JSON.stringify(updated));
              useCanvasStore.getState().addLog('success', `AutoML Fix: Inserted MaxPool2D after ${targetNode.name} in custom block "${block.name}".`);
            }
          });
        }
      });
    }

    return suggestions;
  };

  const autoMLSuggestions = getAutoMLSuggestions();
  
  const getIssueMeta = (err: ExtendedValidationError) => {
    const isInputShapeError = err.message.toLowerCase().includes("input layer") && err.message.toLowerCase().includes("shape");
    const isDenseRank = err.category === 'rank' && err.message.toLowerCase().includes("dense");
    const isCycle = err.category === 'cycle';
    const isDisconnected = err.category === 'disconnected';

    let explanation = "This block encountered a configuration or alignment mismatch that stops model compilation.";
    let fixLabel = "Resolve Issue";
    let hasFix = false;
    let applyFix = async () => {};

    if (err.customBlockId) {
      const blockId = err.customBlockId;
      const block = customBlocks.find(b => b.id === blockId);
      if (block) {
        if (isInputShapeError) {
          explanation = "Input dimensions are currently unconfigured or empty in this custom block.";
          fixLabel = "Initialize Standard 224x224 Shape";
          hasFix = true;
          applyFix = async () => {
            const updated = customBlocks.map(cb => {
              if (cb.id === blockId) {
                return {
                  ...cb,
                  nodes: cb.nodes.map(n => n.type === 'Input' ? { ...n, config: { ...n.config, dim: [224, 224, 3] } } : n)
                };
              }
              return cb;
            });
            useCanvasStore.setState({ customBlocks: updated });
            localStorage.setItem('mlbuilder_custom_blocks', JSON.stringify(updated));
            useCanvasStore.getState().addLog('success', `AutoML Fix: Configured 224x224 shape for Input in custom block "${block.name}".`);
          };
        } else if (isDenseRank) {
          explanation = "Fully connected Dense blocks expect flat 1D vectors [Features]. In this custom block, a preceding layer outputs a 3D matrix block.";
          fixLabel = "Insert Flatten Block";
          hasFix = true;
          applyFix = async () => {
            const updated = customBlocks.map(cb => {
              if (cb.id === blockId) {
                const edge = cb.edges.find(e => e.target === err.nodeId);
                const src = cb.nodes.find(n => n.id === edge?.source);
                const tgt = cb.nodes.find(n => n.id === err.nodeId);
                if (edge && src && tgt) {
                  const newEdges = cb.edges.filter(e => e.id !== edge.id);
                  const midX = Math.round((src.x + tgt.x) / 2 / 20) * 20;
                  const midY = Math.round((src.y + tgt.y) / 2 / 20) * 20;
                  const flattenId = `node_flatten_${Math.random().toString(36).substr(2, 9)}`;
                  const flattenNode: CanvasNode = {
                    id: flattenId,
                    type: 'Flatten',
                    name: `FLATTEN_${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
                    x: midX,
                    y: midY,
                    inputShape: [],
                    outputShape: [],
                    config: {}
                  };
                  return {
                    ...cb,
                    nodes: [...cb.nodes, flattenNode],
                    edges: [
                      ...newEdges,
                      { id: `edge_${Math.random().toString(36).substring(2, 10)}`, source: src.id, target: flattenId },
                      { id: `edge_${Math.random().toString(36).substring(2, 10)}`, source: flattenId, target: tgt.id }
                    ]
                  };
                }
              }
              return cb;
            });
            useCanvasStore.setState({ customBlocks: updated });
            localStorage.setItem('mlbuilder_custom_blocks', JSON.stringify(updated));
            useCanvasStore.getState().addLog('success', `AutoML Fix: Inserted Flatten Layer in custom block "${block.name}".`);
          };
        } else if (isCycle) {
          explanation = "Cycle loops detected in custom block computational connections.";
          fixLabel = "Remove Loop Connection";
          hasFix = true;
          applyFix = async () => {
            const updated = customBlocks.map(cb => {
              if (cb.id === blockId) {
                const edge = cb.edges.find(e => e.target === err.nodeId || e.source === err.nodeId);
                if (edge) {
                  return {
                    ...cb,
                    edges: cb.edges.filter(e => e.id !== edge.id)
                  };
                }
              }
              return cb;
            });
            useCanvasStore.setState({ customBlocks: updated });
            localStorage.setItem('mlbuilder_custom_blocks', JSON.stringify(updated));
            useCanvasStore.getState().addLog('success', `AutoML Fix: Removed cycle connection in custom block "${block.name}".`);
          };
        } else if (isDisconnected) {
          explanation = "This block layer is inside the custom block but not connected to any path originating from the input.";
          fixLabel = "Connect from Upstream Block";
          hasFix = true;
          applyFix = async () => {
            const updated = customBlocks.map(cb => {
              if (cb.id === blockId) {
                const targetNode = cb.nodes.find(n => n.id === err.nodeId);
                const closestNode = cb.nodes.find(n => n.id !== err.nodeId && n.type !== 'Input');
                if (targetNode && closestNode) {
                  return {
                    ...cb,
                    edges: [
                      ...cb.edges,
                      { id: `edge_${Math.random().toString(36).substring(2, 10)}`, source: closestNode.id, target: targetNode.id }
                    ]
                  };
                }
              }
              return cb;
            });
            useCanvasStore.setState({ customBlocks: updated });
            localStorage.setItem('mlbuilder_custom_blocks', JSON.stringify(updated));
            useCanvasStore.getState().addLog('success', `AutoML Fix: Linked disconnected layer in custom block "${block.name}".`);
          };
        }
      }
    } else {
      if (isInputShapeError) {
        explanation = "Input dimensions are currently unconfigured or empty. The graph tracer needs a base coordinate size (e.g. 224x224 RGB image shape) to propagate channels and height/width grids downstream, helping the PyTorch compiler pre-calculate parameter weights.";
        fixLabel = "Initialize Standard 224x224 Shape";
        hasFix = true;
        applyFix = async () => {
          const inputNode = nodes.find(n => n.type === 'Input');
          if (inputNode) {
            useCanvasStore.getState().updateNodeConfig(inputNode.id, { 
              dim: [224, 224, 3],
              shape: [null, 3, 224, 224]
            });
            useCanvasStore.getState().addLog('success', "AutoML Fix: Configured [224, 224, 3] dimensions for Input block.");
            useCanvasStore.getState().triggerCompilation();
          }
        };
      } else if (isDenseRank) {
        explanation = "Fully connected Dense blocks expect flat 1D vectors [Features]. The preceding Convolutional/Pooling layer outputs a 3D matrix block [Channels, Height, Width]. Connecting them directly leads to rank conflicts.";
        fixLabel = "Insert Flatten Block";
        hasFix = true;
        applyFix = async () => {
          const store = useCanvasStore.getState();
          const edge = edges.find(e => e.target === err.nodeId);
          const src = nodes.find(n => n.id === edge?.source);
          const tgt = nodes.find(n => n.id === err.nodeId);

          if (edge && src && tgt) {
            await store.removeEdge(edge.id);
            const midX = Math.round((src.x + tgt.x) / 2 / 20) * 20;
            const midY = Math.round((src.y + tgt.y) / 2 / 20) * 20;
            const actualFlattenId = await store.addNode('Flatten', midX, midY);
            if (!actualFlattenId) return;
            await store.addEdge(src.id, actualFlattenId);
            await store.addEdge(actualFlattenId, tgt.id);
            store.addLog('success', `AutoML Fix: Inserted Flatten between ${src.name} and ${tgt.name}.`);
          }
        };
      } else if (isCycle) {
        explanation = "Cycle loops detected in computational connections. Deep feedforward compilers propagate gradients consecutively from inputs to outputs and cannot resolve circular feedbacks.";
        fixLabel = "Remove Loop Connection";
        hasFix = true;
        applyFix = async () => {
          const store = useCanvasStore.getState();
          const edge = edges.find(e => e.target === err.nodeId || e.source === err.nodeId);
          if (edge) {
            await store.removeEdge(edge.id);
            store.addLog('success', "AutoML Fix: Removed cycle-inducing connection.");
          }
        };
      } else if (isDisconnected) {
        explanation = "This block layer is placed on the editor board but not connected to any path originating from the input grid. It will be completely skipped in PyTorch model generation.";
        fixLabel = "Connect from Upstream Block";
        hasFix = true;
        applyFix = async () => {
          const store = useCanvasStore.getState();
          const closestNode = nodes.find(n => n.id !== err.nodeId && n.type !== 'Input');
          if (closestNode && err.nodeId) {
            await store.addEdge(closestNode.id, err.nodeId);
            store.addLog('success', `AutoML Fix: Linked ${closestNode.name} ➔ ${nodes.find(x => x.id === err.nodeId)?.name}.`);
          }
        };
      }
    }

    return { explanation, fixLabel, hasFix, applyFix };
  };

  const getLocalScore = () => {
    let score = 100;
    
    // Deduct for validation errors
    errors.forEach(() => {
      score -= 10;
    });
    // Deduct for warnings
    warnings.forEach(() => {
      score -= 5;
    });

    // Deduct for AutoML suggestions
    const localSuggestions = getAutoMLSuggestions();
    localSuggestions.forEach((s) => {
      if (s.severity === 'high') {
        score -= 8;
      } else if (s.severity === 'medium') {
        score -= 5;
      } else {
        score -= 2;
      }
    });

    // Clamp between 10 and 100
    score = Math.max(10, Math.min(100, score));

    // Calculate grade
    let grade = 'A';
    if (score >= 95) grade = 'A+';
    else if (score >= 90) grade = 'A';
    else if (score >= 85) grade = 'B+';
    else if (score >= 80) grade = 'B';
    else if (score >= 70) grade = 'C';
    else if (score >= 60) grade = 'D';
    else grade = 'F';

    return { score, grade };
  };

  const currentScore = isOnline && backendScore !== null ? backendScore : getLocalScore().score;
  const currentGrade = isOnline && backendGrade !== null ? backendGrade : getLocalScore().grade;

  const getGradeTheme = (grade: string) => {
    const g = grade.toUpperCase();
    if (g.startsWith('A')) {
      return {
        color: '#10b981', // emerald
        glow: 'rgba(16, 185, 129, 0.4)',
        textColor: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/20'
      };
    } else if (g.startsWith('B')) {
      return {
        color: '#f59e0b', // amber/yellow
        glow: 'rgba(245, 158, 11, 0.4)',
        textColor: 'text-amber-400',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/20'
      };
    } else {
      return {
        color: '#ef4444', // rose/red
        glow: 'rgba(239, 68, 68, 0.4)',
        textColor: 'text-rose-400',
        bg: 'bg-rose-500/10',
        border: 'border-rose-500/20'
      };
    }
  };

  const theme = getGradeTheme(currentGrade);
  const scoreColor = theme.color;
  const scoreGlowColor = theme.glow;
  const gradeTextColor = theme.textColor;

  const mapBackendRecommendationToSuggestion = (rec: any): AutoMLSuggestion | null => {
    const bottleneck = rec.bottleneck || '';
    const recommendedAction = rec.recommendedAction || '';
    const severity = (rec.severity || 'medium').toLowerCase() as 'high' | 'medium' | 'info';

    // 1. "Add BatchNorm"
    if (bottleneck.includes("Add BatchNorm") || recommendedAction.toLowerCase().includes("batchnorm")) {
      const match = bottleneck.match(/'([^']+)'/) || recommendedAction.match(/'([^']+)'/);
      const nodeName = match ? match[1] : '';
      const targetNode = nodes.find(n => n.name === nodeName || n.type === 'Conv2D');
      
      if (targetNode) {
        return {
          id: `backend_bn_${targetNode.id}`,
          title: `Add BatchNorm`,
          category: 'architecture',
          description: recommendedAction || `Add a BatchNorm2D layer after '${targetNode.name}' to normalize activations.`,
          advice: `Batch Normalization stabilizes neural training dynamics by standardizing inputs to each layer.`,
          severity: severity,
          score: 8.0,
          nodeId: targetNode.id,
          fixLabel: `Add BatchNorm`,
          applyFix: async () => {
            await applyAddBatchNorm(targetNode.id);
          }
        };
      }
    }

    // 2. "Reduce Dense Layer" / "Reduce Dense Width"
    if (bottleneck.includes("Reduce Dense") || recommendedAction.toLowerCase().includes("reduce dense") || bottleneck.toLowerCase().includes("dense width")) {
      const match = bottleneck.match(/'([^']+)'/) || recommendedAction.match(/'([^']+)'/);
      const nodeName = match ? match[1] : '';
      const targetNode = nodes.find(n => n.name === nodeName || n.type === 'Dense');

      if (targetNode) {
        return {
          id: `backend_dense_${targetNode.id}`,
          title: `Reduce Dense Width`,
          category: 'optimization',
          description: recommendedAction || `Reduce Dense Layer '${targetNode.name}' units to 128.`,
          advice: `Reducing units in wide projection layers decreases overfitting risks and footprint size.`,
          severity: severity,
          score: 7.5,
          nodeId: targetNode.id,
          fixLabel: `Reduce Dense Width`,
          applyFix: () => {
            applyReduceDenseWidth(targetNode.id);
          }
        };
      }
    }

    // 2a. "Parameter Explosion" -> Insert MaxPool2D Downsampling
    if (bottleneck.includes("Parameter Explosion") || recommendedAction.toLowerCase().includes("parameter explosion")) {
      const quotes = [...recommendedAction.matchAll(/'([^']+)'/g)].map(m => m[1]);
      const parentLabel = quotes[2];
      const childLabel = quotes[3];
      const parentNode = nodes.find(n => n.name === parentLabel);
      const childNode = nodes.find(n => n.name === childLabel);

      if (parentNode && childNode) {
        return {
          id: `backend_param_explosion_${parentNode.id}_${childNode.id}`,
          title: `Insert MaxPool2D Downsampling`,
          category: 'optimization',
          description: recommendedAction,
          advice: `Inserting a MaxPool2D downsampler before high-dimensional linear projections reduces parameter counts and prevents out-of-memory errors.`,
          severity: severity,
          score: 8.5,
          nodeId: childNode.id,
          fixLabel: `Insert MaxPool2D`,
          applyFix: async () => {
            const store = useCanvasStore.getState();
            const edge = store.edges.find(e => e.source === parentNode.id && e.target === childNode.id);
            if (edge) {
              await store.removeEdge(edge.id);
              const midX = Math.round((parentNode.x + childNode.x) / 2) / 20 * 20;
              const midY = Math.round((parentNode.y + childNode.y) / 2) / 20 * 20;
              const actualPoolId = await store.addNode('MaxPool2D', midX, midY);
              if (actualPoolId) {
                await store.addEdge(parentNode.id, actualPoolId);
                await store.addEdge(actualPoolId, childNode.id);
                store.addLog('success', `AutoML Fix: Inserted MaxPool2D downsampler between ${parentNode.name} and ${childNode.name}.`);
                store.triggerCompilation();
              }
            }
          }
        };
      }
    }

    // 2b. "High Overfitting Risk" -> Insert Dropout after node
    if (bottleneck.includes("High Overfitting Risk") || recommendedAction.toLowerCase().includes("overfitting")) {
      const quotes = [...recommendedAction.matchAll(/'([^']+)'/g)].map(m => m[1]);
      const targetLabel = quotes[1];
      const targetNode = nodes.find(n => n.name === targetLabel);

      if (targetNode) {
        return {
          id: `backend_overfitting_${targetNode.id}`,
          title: `Add Regularizing Dropout`,
          category: 'optimization',
          description: recommendedAction,
          advice: `Dropout randomly mutes activations during training, preventing neural co-adaptation and overfitting.`,
          severity: severity,
          score: 7.0,
          nodeId: targetNode.id,
          fixLabel: `Add Dropout Layer`,
          applyFix: async () => {
            const store = useCanvasStore.getState();
            const outgoingEdges = store.edges.filter(e => e.source === targetNode.id);
            const newX = targetNode.x + 120;
            const newY = targetNode.y;
            
            const actualDropoutId = await store.addNode('Dropout', newX, newY);
            if (actualDropoutId) {
              if (outgoingEdges.length > 0) {
                for (const edge of outgoingEdges) {
                  await store.removeEdge(edge.id);
                  await store.addEdge(actualDropoutId, edge.target);
                }
              }
              await store.addEdge(targetNode.id, actualDropoutId);
              store.addLog('success', `AutoML Fix: Inserted Dropout layer after ${targetNode.name}.`);
              store.triggerCompilation();
            }
          }
        };
      }
    }

    // 2c. "Consecutive Linear Operations" -> Set activation to ReLU
    if (bottleneck.includes("Consecutive Linear Operations") || recommendedAction.toLowerCase().includes("consecutive linear")) {
      const quotes = [...bottleneck.matchAll(/'([^']+)'/g)].map(m => m[1]);
      const targetLabel = quotes[0];
      const targetNode = nodes.find(n => n.name === targetLabel);

      if (targetNode) {
        return {
          id: `backend_linear_ops_${targetNode.id}`,
          title: `Add Non-Linear Activation`,
          category: 'anti-pattern',
          description: recommendedAction,
          advice: `Without non-linear activations, multi-layer networks collapse mathematically to a single linear layer.`,
          severity: severity,
          score: 8.0,
          nodeId: targetNode.id,
          fixLabel: `Set Activation to ReLU`,
          applyFix: async () => {
            const store = useCanvasStore.getState();
            store.updateNodeConfig(targetNode.id, { activation: 'ReLU' });
            store.addLog('success', `AutoML Fix: Set activation of layer ${targetNode.name} to ReLU.`);
            store.triggerCompilation();
          }
        };
      }
    }

    // 3. Generic backend recommendations
    return {
      id: `backend_generic_${Math.random().toString(36).substring(2, 9)}`,
      title: bottleneck.split(':')[0] || 'Optimization Recommendation',
      category: 'architecture',
      description: recommendedAction,
      advice: `Applying standard optimization fixes improves the model compilation and performance.`,
      severity: severity,
      score: 5.0,
      fixLabel: `Apply Suggestion`,
      applyFix: () => {
        const match = bottleneck.match(/'([^']+)'/) || recommendedAction.match(/'([^']+)'/);
        const nodeName = match ? match[1] : '';
        const targetNode = nodes.find(n => n.name === nodeName);
        if (targetNode) {
          setSelectedNodeId(targetNode.id);
          toast.info('Inspect Node', `Please inspect node '${targetNode.name}' to apply the recommendation manually.`);
        } else {
          toast.info('Info', 'This recommendation needs manual resolution.');
        }
      }
    };
  };

  const getMergedSuggestions = (): AutoMLSuggestion[] => {
    const localSuggestions = getAutoMLSuggestions();

    if (isOnline && backendRecommendations && backendRecommendations.length > 0) {
      const mappedBackend = backendRecommendations
        .map(mapBackendRecommendationToSuggestion)
        .filter(Boolean) as AutoMLSuggestion[];

      const hasBackendBN = mappedBackend.some(b => b.title === 'Add BatchNorm');
      const hasBackendDense = mappedBackend.some(b => b.title === 'Reduce Dense Width');

      return [
        ...mappedBackend,
        ...localSuggestions.filter(s => {
          if (s.title === 'Add BatchNorm' && hasBackendBN) return false;
          if (s.title === 'Reduce Dense Width' && hasBackendDense) return false;
          return true;
        })
      ];
    }

    return localSuggestions;
  };

  const mergedSuggestions = getMergedSuggestions();

  const handleOneClickFix = async () => {
    if (mergedSuggestions.length === 0) return;
    const firstSug = mergedSuggestions[0];
    toast.info('One-Click Fix', `Applying suggestion: "${firstSug.title}"...`);
    await firstSug.applyFix();
  };

  const handleIssueClick = (nodeId?: string) => {
    if (nodeId) {
      const activeNode = nodes.find(n => n.id === nodeId);
      if (activeNode) {
        setSelectedNodeId(nodeId);
        useCanvasStore.getState().addLog('info', `Navigated to visual block in compiler window.`);
      } else {
        useCanvasStore.getState().addLog('info', `Selected block is inside a saved custom block and not currently on the canvas.`);
      }
    }
  };

  return (
    <div className="w-full h-full bg-[#1e1f22] flex flex-col select-none relative">
      
      {/* Title block */}
      <div className="p-4 border-b border-[#3f4046] shrink-0">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#9aa0a6] block">Diagnostic Center</span>
          <div className="flex items-center gap-1">
            {isValidating ? (
              <RefreshCw size={12} className="text-[#8ab4f8] animate-spin" />
            ) : errors.length > 0 ? (
              <XCircle size={13} className="text-[#f28b82]" />
            ) : warnings.length > 0 ? (
              <AlertTriangle size={13} className="text-[#ffe082]" />
            ) : (
              <CheckCircle size={13} className="text-[#81c784]" />
            )}
          </div>
        </div>
        
        {/* Trigger manually button */}
        <button
          onClick={() => triggerCompilation()}
          disabled={isValidating || !isOnline}
          className={`w-full mt-2 flex items-center justify-center gap-1.5 py-1.5 rounded-xl border text-[10px] font-extrabold uppercase tracking-wider transition-all ${
            isValidating 
              ? 'bg-[#8ab4f8]/5 border-[#8ab4f8]/20 text-[#8ab4f8] cursor-not-allowed'
              : !isOnline
                ? 'bg-[#3f4046]/10 border-transparent text-[#5f6368] cursor-not-allowed'
                : 'bg-[#8ab4f8]/10 border-[#8ab4f8]/20 hover:bg-[#8ab4f8]/20 text-[#8ab4f8] cursor-pointer'
          }`}
        >
          <RefreshCw size={11} className={isValidating ? 'animate-spin' : ''} />
          <span>{isValidating ? 'Running Sandbox Validate...' : 'Compile & Sandbox Run'}</span>
        </button>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-[#3f4046] text-[10px] bg-black/10 font-bold select-none shrink-0">
        <button
          onClick={() => setActiveTab('issues')}
          className={`flex-1 py-3 text-center border-b-2 transition-all cursor-pointer ${
            activeTab === 'issues' 
              ? 'border-[#8ab4f8] text-[#8ab4f8] bg-[#1e1f22]/50' 
              : 'border-transparent text-[#9aa0a6] hover:text-white'
          }`}
        >
          Issues ({allErrorsAndWarnings.length})
        </button>
        <button
          onClick={() => setActiveTab('suggestions')}
          className={`flex-1 py-3 text-center border-b-2 transition-all cursor-pointer relative ${
            activeTab === 'suggestions' 
              ? 'border-[#8ab4f8] text-[#8ab4f8] bg-[#1e1f22]/50' 
              : 'border-transparent text-[#9aa0a6] hover:text-white'
          }`}
        >
          AutoML
          {mergedSuggestions.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-amber-500 text-[#1e1f22] text-[8px] font-black rounded-full leading-none animate-pulse inline-block">
              {mergedSuggestions.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('trace')}
          className={`flex-1 py-3 text-center border-b-2 transition-all cursor-pointer ${
            activeTab === 'trace' 
              ? 'border-[#8ab4f8] text-[#8ab4f8] bg-[#1e1f22]/50' 
              : 'border-transparent text-[#9aa0a6] hover:text-white'
          }`}
        >
          Trace ({nodes.length})
        </button>
        <button
          onClick={() => setActiveTab('sandbox')}
          className={`flex-1 py-3 text-center border-b-2 transition-all cursor-pointer ${
            activeTab === 'sandbox' 
              ? 'border-[#8ab4f8] text-[#8ab4f8] bg-[#1e1f22]/50' 
              : 'border-transparent text-[#9aa0a6] hover:text-white'
          }`}
        >
          Sandbox
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto bg-[#1e1f22]">
        
        {/* Tab: AutoML Suggestions */}
        {activeTab === 'suggestions' && (
          <div className="p-4 space-y-4">
            
            {/* Architecture Score gauge */}
            <div className="flex flex-col items-center justify-center bg-[#2b2d31]/30 border border-[#3f4046]/40 p-5 rounded-2xl gap-3 shrink-0">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#9aa0a6]">Architecture Score</span>
              
              {/* Circular gauge */}
              <div className="relative flex items-center justify-center">
                {/* SVG Circular Progress */}
                <svg className="w-28 h-28 transform -rotate-90">
                  <circle
                    cx="56"
                    cy="56"
                    r="46"
                    stroke="#2b2d31"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <circle
                    cx="56"
                    cy="56"
                    r="46"
                    stroke={scoreColor}
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 46}
                    strokeDashoffset={2 * Math.PI * 46 * (1 - currentScore / 100)}
                    className="transition-all duration-700 ease-out"
                    strokeLinecap="round"
                    style={{ filter: `drop-shadow(0 0 6px ${scoreGlowColor})` }}
                  />
                </svg>
                {/* Text overlay in center */}
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-2xl font-black text-white leading-none">{currentScore}</span>
                  <span className="text-[9px] font-bold text-[#9aa0a6] mt-0.5">/ 100</span>
                </div>
              </div>

              {/* Grade Badge */}
              <div className="flex items-center gap-1.5 bg-black/30 border border-[#3f4046]/30 px-3 py-1 rounded-full">
                <span className="text-[9px] font-bold text-[#9aa0a6] uppercase tracking-wider">Grade:</span>
                <span className={`text-[10px] font-black uppercase tracking-wider ${gradeTextColor}`}>
                  {currentGrade}
                </span>
              </div>
            </div>

            {/* Sparkles description */}
            <div className="bg-[#2b2d31]/40 border border-[#3f4046]/50 rounded-xl p-3.5 flex items-start gap-3">
              <Sparkles size={16} className="text-amber-400 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-xs font-black text-white uppercase tracking-wider">AutoML Copilot</h4>
                <p className="text-[10px] text-[#9aa0a6] mt-1 font-semibold leading-relaxed">
                  Real-time neural architecture search heuristical sweeps analyze your design layers for anti-patterns and performance optimizations.
                </p>
              </div>
            </div>

            {/* Global One Click Fix */}
            {mergedSuggestions.length > 0 && (
              <button
                onClick={handleOneClickFix}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-[#1e1f22] rounded-xl text-xs font-black shadow-lg shadow-amber-500/10 transition-all cursor-pointer border-none"
              >
                <Sparkles size={14} className="animate-pulse" />
                <span>One Click Fix</span>
              </button>
            )}

            {/* Suggestions Checklist */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#9aa0a6]">Suggestions</span>
                <span className="text-[9px] font-bold text-gray-500">
                  {mergedSuggestions.length} available
                </span>
              </div>

              {mergedSuggestions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center select-none">
                  <CheckCircle size={32} className="text-[#81c784] mb-3 opacity-90" />
                  <h4 className="text-xs font-bold text-gray-300 uppercase">Architecture Optimized</h4>
                  <p className="text-[10px] text-[#9aa0a6] mt-1 max-w-[200px] font-semibold leading-relaxed">
                    No anti-patterns, parameters bottleneck, or dimensional scale anomalies found in your graph flow!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {mergedSuggestions.map((cp) => {
                    const isHigh = cp.severity === 'high';
                    const isMed = cp.severity === 'medium';
                    
                    const borderClass = isHigh 
                      ? 'border-rose-500/30 bg-rose-500/5 hover:border-rose-500/40' 
                      : isMed 
                        ? 'border-amber-500/30 bg-amber-500/5 hover:border-amber-500/40' 
                        : 'border-blue-500/30 bg-blue-500/5 hover:border-blue-500/40';

                    const badgeClass = isHigh 
                      ? 'bg-rose-500/10 text-rose-400' 
                      : isMed 
                        ? 'bg-amber-500/10 text-amber-400' 
                        : 'bg-blue-500/10 text-blue-400';

                    return (
                      <div 
                        key={cp.id} 
                        className={`border p-3.5 rounded-xl transition-all space-y-3 ${borderClass}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded tracking-wider ${badgeClass}`}>
                              {cp.severity.toUpperCase()} (Score: {cp.score})
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-amber-400 text-xs shrink-0">•</span>
                              <h4 className="text-xs font-black text-white">{cp.title}</h4>
                            </div>
                          </div>
                          <span className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-wider">{cp.category}</span>
                        </div>

                        <p className="text-[10px] text-gray-300 font-semibold leading-relaxed select-text">{cp.description}</p>
                        
                        {cp.advice && (
                          <div className="bg-black/20 border border-[#3f4046]/30 p-2.5 rounded-lg">
                            <p className="text-[9.5px] text-[#9aa0a6] font-semibold leading-relaxed select-text flex gap-1">
                              <Lightbulb size={11} className="shrink-0 text-[#8ab4f8] mt-0.5" />
                              <span>{cp.advice}</span>
                            </p>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1 border-t border-[#3f4046]/30">
                          {cp.nodeId ? (
                            <button
                              onClick={() => handleIssueClick(cp.nodeId)}
                              className="text-[9px] font-bold text-[#8ab4f8] hover:underline cursor-pointer bg-transparent border-none p-0"
                            >
                              Inspect Block
                            </button>
                          ) : <div />}
                          <button
                            onClick={cp.applyFix}
                            className="flex items-center gap-1 px-3 py-1 bg-amber-500 hover:bg-amber-400 text-[#1e1f22] rounded-lg text-[9px] font-extrabold shadow-sm transition-all cursor-pointer border-none"
                          >
                            <Wrench size={10} />
                            <span>Apply Suggestion</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 1: Issues */}
        {activeTab === 'issues' && (
          <div className="p-4 space-y-4">
            {allErrorsAndWarnings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle size={32} className="text-[#81c784] mb-3 animate-bounce" />
                <h4 className="text-xs font-bold text-gray-300 uppercase">Architecture Perfect</h4>
                <p className="text-[10px] text-[#9aa0a6] mt-1 max-w-[200px] font-semibold leading-relaxed">
                  No rank mismatches, loop cycles, or broadcast incompatibilities found. Safe to export.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {allErrorsAndWarnings.map((err, idx) => {
                  const isError = err.type === 'error';
                  const isExpanded = expandedIssueIdx === idx;
                  const levelColor = isError 
                    ? 'border-rose-500/30 bg-rose-500/5 hover:border-rose-500/40' 
                    : 'border-amber-500/30 bg-amber-500/5 hover:border-amber-500/40';
                  const iconColor = isError ? 'text-[#f28b82]' : 'text-[#ffe082]';
                  const labelText = isError ? 'ERROR' : 'WARNING';
                  const meta = getIssueMeta(err);
                  
                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        handleIssueClick(err.nodeId);
                        setExpandedIssueIdx(isExpanded ? null : idx);
                      }}
                      className={`p-3.5 border rounded-xl flex flex-col gap-2.5 transition-all select-text cursor-pointer ${levelColor}`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className={`mt-0.5 ${iconColor} shrink-0`}>
                          {isError ? <XCircle size={14} /> : <AlertTriangle size={14} />}
                        </div>
                        <div className="space-y-1 min-w-0">
                          <span className={`text-[8.5px] font-extrabold uppercase px-1.5 py-0.5 rounded tracking-wider ${
                            isError ? 'bg-[#f28b82]/10 text-[#f28b82]' : 'bg-[#ffe082]/10 text-[#ffe082]'
                          }`}>
                            {labelText} ({err.category})
                          </span>
                          <p className="text-[10.5px] text-gray-300 font-semibold leading-relaxed break-words">
                            {err.message}
                          </p>
                        </div>
                      </div>

                      {/* Expanded Illustrative Explanation & Auto Fix button */}
                      {isExpanded && (
                        <div className="border-t border-[#3f4046]/35 pt-3.5 mt-1 space-y-3 animate-in fade-in slide-in-from-top-1 duration-150 text-left">
                          <div className="bg-black/20 border border-[#3f4046]/35 p-2.5 rounded-lg flex gap-2 items-start">
                            <Lightbulb size={12} className="shrink-0 text-[#8ab4f8] mt-0.5 animate-pulse" />
                            <p className="text-[10px] text-[#9aa0a6] font-semibold leading-relaxed leading-normal select-text">
                              {meta.explanation}
                            </p>
                          </div>

                          {meta.hasFix && (
                            <div className="flex justify-end">
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation(); // Avoid re-collapsing on click
                                  await meta.applyFix();
                                  setExpandedIssueIdx(null); // Close card
                                }}
                                className="flex items-center gap-1.5 px-3 py-1 bg-amber-500 hover:bg-amber-400 text-[#1e1f22] rounded-lg text-[9px] font-extrabold shadow-sm transition-all cursor-pointer border-none"
                              >
                                <Wrench size={10} />
                                <span>{meta.fixLabel}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Runtime Trace Viewer */}
        {activeTab === 'trace' && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between text-[10px] font-extrabold text-[#9aa0a6] uppercase tracking-wider mb-2">
              <span>Topological Evaluation</span>
              <Activity size={12} className="text-[#8ab4f8] animate-pulse" />
            </div>

            {traceOrder.length === 0 ? (
              <div className="text-center text-xs text-[#9aa0a6] py-12 font-semibold">
                No blocks on canvas. Add blocks to trace shape propagation.
              </div>
            ) : (
              <div className="relative border-l border-[#3f4046] ml-2 pl-4 space-y-5 py-2">
                {traceOrder.map((n, idx) => {
                  const nodeHasError = validationErrors.some(err => err.nodeId === n.id);
                  
                  return (
                    <div key={n.id} className="relative group select-text">
                      {/* Node Bullet Point */}
                      <span className={`absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full border-2 ${
                        nodeHasError 
                          ? 'bg-[#f28b82] border-[#2b2d31] animate-ping' 
                          : 'bg-[#8ab4f8] border-[#2b2d31]'
                      }`}></span>

                      <div 
                        onClick={() => handleIssueClick(n.id)}
                        className={`p-2.5 bg-[#2b2d31] border rounded-xl cursor-pointer hover:border-[#8ab4f8]/30 transition-all ${
                          nodeHasError ? 'border-[#f28b82]/30 bg-rose-950/10' : 'border-[#3f4046]'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[9.5px] font-extrabold text-white tracking-wider truncate max-w-[120px]">
                            {n.name}
                          </span>
                          <span className="text-[8.5px] font-extrabold uppercase text-[#9aa0a6] bg-[#1e1f22] px-1.5 py-0.5 rounded font-mono">
                            {n.type}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 font-mono text-[9px] text-[#9aa0a6] font-semibold">
                          <span>IN:</span>
                          <span className="text-gray-300">
                            {n.inputShape.length > 0 ? `[${n.inputShape.join(', ')}]` : 'None'}
                          </span>
                          <span className="text-[#5f6368] font-bold">➔</span>
                          <span>OUT:</span>
                          <span className="text-gray-300">
                            {n.outputShape.length > 0 ? `[${n.outputShape.join(', ')}]` : 'None'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: CLI Sandbox Terminal Redirect Card */}
        {activeTab === 'sandbox' && (
          <div className="p-6 flex flex-col items-center justify-center text-center h-full max-w-sm mx-auto select-none gap-4">
            <div className="w-16 h-16 rounded-full bg-[#8ab4f8]/10 border border-[#8ab4f8]/20 flex items-center justify-center text-[#8ab4f8] shadow-md animate-pulse">
              <Terminal size={28} />
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-black text-white uppercase tracking-wider">Terminal Expanded</h4>
              <p className="text-[10.5px] text-[#9aa0a6] font-semibold leading-relaxed">
                Python sandbox stdout logs, Abstract Syntax Tree checks, and clean error tracebacks have been expanded into the bottom **IDE Terminal Console** for comfortable reading and debugging.
              </p>
            </div>

            <div className="w-full bg-[#2b2d31]/50 border border-[#3f4046] p-4 rounded-2xl flex flex-col gap-2.5 shadow-sm text-left font-sans mt-2">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-300">
                <CheckCircle size={14} className="text-[#81c784]" />
                <span>Features Included:</span>
              </div>
              <ul className="text-[10px] text-gray-400 font-semibold space-y-1.5 list-disc pl-4 leading-normal">
                <li>Real-time Python Subprocess Stdout</li>
                <li>Dynamic parameter weights estimator</li>
                <li>Memory footprint byte calculations</li>
                <li>Clean exception category traceback parses</li>
              </ul>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

