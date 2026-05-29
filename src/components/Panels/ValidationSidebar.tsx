'use client';

import React, { useState } from 'react';
import { useCanvasStore } from '@/store/canvasStore';
import { useProjectStore } from '@/store/projectStore';
import { AutoMLSuggestion, CanvasNode, CanvasEdge } from '@/types/canvas';
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

export default function ValidationSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'issues' | 'suggestions' | 'trace' | 'sandbox'>('issues');
  
  const { 
    nodes, 
    edges, 
    validationErrors, 
    compilationResult, 
    isValidating, 
    triggerCompilation, 
    setSelectedNodeId 
  } = useCanvasStore();
  
  const isOnline = useProjectStore((state) => state.isOnline);

  const errors = validationErrors.filter(e => e.type === 'error');
  const warnings = validationErrors.filter(e => e.type === 'warning');

  // Topological sorting helper for the trace viewer
  const getTraceOrder = () => {
    const adj = new Map<string, string[]>();
    const inDegree = new Map<string, number>();
    
    nodes.forEach(n => {
      adj.set(n.id, []);
      inDegree.set(n.id, 0);
    });
    
    edges.forEach(e => {
      if (adj.has(e.source) && adj.has(e.target)) {
        adj.get(e.source)!.push(e.target);
        inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
      }
    });
    
    const queue: string[] = [];
    inDegree.forEach((deg, id) => {
      if (deg === 0) queue.push(id);
    });
    
    const order: string[] = [];
    while (queue.length > 0) {
      const u = queue.shift()!;
      order.push(u);
      
      const neighbors = adj.get(u) || [];
      neighbors.forEach(v => {
        inDegree.set(v, inDegree.get(v)! - 1);
        if (inDegree.get(v) === 0) {
          queue.push(v);
        }
      });
    }
    
    return order.map(id => nodes.find(n => n.id === id)!).filter(Boolean);
  };

  const traceOrder = getTraceOrder();

  const getAutoMLSuggestions = (): AutoMLSuggestion[] => {
    const suggestions: AutoMLSuggestion[] = [];

    // 1. Check Conv2D activation None
    nodes.forEach(node => {
      if (node.type === 'Conv2D' && (!node.config.activation || node.config.activation === 'None')) {
        suggestions.push({
          id: `conv_act_${node.id}`,
          title: `Conv2D Activation Missing`,
          category: 'anti-pattern',
          description: `Layer '${node.name}' has no activation function configured. Linear convolutions severely restrict model representational capacity.`,
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
            useCanvasStore.getState().updateNodeConfig(inputNode.id, { dim: [224, 224, 3] });
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
            
            // Generate a random temporary ID for the new Flatten node
            const flattenId = `node_flatten_${Math.random().toString(36).substr(2, 9)}`;
            
            // Add Flatten node
            await store.addNode('Flatten', midX, midY, flattenId);

            // Connect src -> Flatten -> tgt
            await store.addEdge(src.id, flattenId);
            await store.addEdge(flattenId, tgt.id);

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
            title: `Dense Parameter Explosion`,
            category: 'optimization',
            description: `Fully connected projection at '${node.name}' contains over ${totalParams.toLocaleString()} parameters. This is highly redundant and leads to heavy vRAM memory footprint and overfitting.`,
            advice: `Consider reducing the Dense units or adding pooling layers (MaxPool2D) before flattening to reduce spatial feature dimensions.`,
            severity: 'medium',
            score: 7.5,
            nodeId: node.id,
            fixLabel: `Reduce Units to 128`,
            applyFix: () => {
              useCanvasStore.getState().updateNodeConfig(node.id, { units: 128 });
              useCanvasStore.getState().addLog('success', `AutoML Fix applied: Reduced units of Dense Layer ${node.name} to 128.`);
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
            
            const poolId = `node_pool_${Math.random().toString(36).substr(2, 9)}`;
            await store.addNode('MaxPool2D', midX, midY, poolId);

            await store.addEdge(targetNode.id, poolId);
            await store.addEdge(poolId, outgoing.target);

            store.addLog('success', `AutoML Fix applied: Inserted MaxPool2D downsampling after ${targetNode.name}.`);
          } else {
            // Simply append MaxPool2D at the end
            const midX = Math.round((targetNode.x + 240) / 20) * 20;
            const midY = Math.round((targetNode.y) / 20) * 20;
            
            const poolId = `node_pool_${Math.random().toString(36).substr(2, 9)}`;
            await store.addNode('MaxPool2D', midX, midY, poolId);
            await store.addEdge(targetNode.id, poolId);
            
            store.addLog('success', `AutoML Fix applied: Appended MaxPool2D layer after ${targetNode.name}.`);
          }
        }
      });
    }

    return suggestions;
  };

  const autoMLSuggestions = getAutoMLSuggestions();

  const handleIssueClick = (nodeId?: string) => {
    if (nodeId) {
      setSelectedNodeId(nodeId);
      // Log interaction
      useCanvasStore.getState().addLog('info', `Navigated to visual block in compiler window.`);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="absolute top-1/2 right-0 -translate-y-1/2 bg-[#2b2d31] border-l border-y border-[#3f4046] hover:bg-[#313338] text-white p-2 rounded-l-2xl z-40 shadow-xl transition-all"
        title="Open Diagnostic Center"
      >
        <ChevronLeft size={18} className="animate-pulse text-[#8ab4f8]" />
      </button>
    );
  }

  return (
    <div className="w-80 border-l border-[#3f4046] bg-[#1e1f22] flex flex-col h-full select-none z-20 relative transition-all duration-300">
      
      {/* Collapse Toggle Handle */}
      <button
        onClick={() => setIsOpen(false)}
        className="absolute top-1/2 -left-3.5 -translate-y-1/2 bg-[#1e1f22] border border-[#3f4046] hover:bg-[#2b2d31] text-[#9aa0a6] hover:text-white p-0.5 rounded-full z-30 shadow-md transition-all"
      >
        <ChevronRight size={14} />
      </button>

      {/* Title block */}
      <div className="p-6 border-b border-[#3f4046]">
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
        <h3 className="text-xl font-black text-white mt-1 flex items-center gap-2">
          <Cpu size={18} className="text-[#8ab4f8]" />
          <span>Compiler Engine</span>
        </h3>
        
        {/* Trigger manually button */}
        <button
          onClick={() => triggerCompilation()}
          disabled={isValidating || !isOnline}
          className={`w-full mt-3 flex items-center justify-center gap-1.5 py-1.5 rounded-xl border text-[10px] font-extrabold uppercase tracking-wider transition-all ${
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
      <div className="flex border-b border-[#3f4046] text-[10px] bg-black/10 font-bold select-none">
        <button
          onClick={() => setActiveTab('issues')}
          className={`flex-1 py-3 text-center border-b-2 transition-all cursor-pointer ${
            activeTab === 'issues' 
              ? 'border-[#8ab4f8] text-[#8ab4f8] bg-[#1e1f22]/50' 
              : 'border-transparent text-[#9aa0a6] hover:text-white'
          }`}
        >
          Issues ({validationErrors.length})
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
          {autoMLSuggestions.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-amber-500 text-[#1e1f22] text-[8px] font-black rounded-full leading-none animate-pulse inline-block">
              {autoMLSuggestions.length}
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
            <div className="bg-[#2b2d31]/40 border border-[#3f4046]/50 rounded-xl p-3.5 flex items-start gap-3">
              <Sparkles size={16} className="text-amber-400 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-xs font-black text-white uppercase tracking-wider">AutoML Copilot</h4>
                <p className="text-[10px] text-[#9aa0a6] mt-1 font-semibold leading-relaxed">
                  Real-time neural architecture search heuristical sweeps analyze your design layers for anti-patterns and performance optimizations.
                </p>
              </div>
            </div>

            {autoMLSuggestions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center select-none">
                <CheckCircle size={32} className="text-[#81c784] mb-3 opacity-90" />
                <h4 className="text-xs font-bold text-gray-300 uppercase">Architecture Optimized</h4>
                <p className="text-[10px] text-[#9aa0a6] mt-1 max-w-[200px] font-semibold leading-relaxed">
                  No anti-patterns, parameters bottleneck, or dimensional scale anomalies found in your graph flow!
                </p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {autoMLSuggestions.map((cp) => {
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
                          <h4 className="text-xs font-black text-white">{cp.title}</h4>
                        </div>
                        <span className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-wider">{cp.category}</span>
                      </div>

                      <p className="text-[10px] text-gray-300 font-semibold leading-relaxed select-text">{cp.description}</p>
                      
                      <div className="bg-black/20 border border-[#3f4046]/30 p-2.5 rounded-lg">
                        <p className="text-[9.5px] text-[#9aa0a6] font-semibold leading-relaxed select-text flex gap-1">
                          <Lightbulb size={11} className="shrink-0 text-[#8ab4f8] mt-0.5" />
                          <span>{cp.advice}</span>
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-[#3f4046]/30">
                        {cp.nodeId && (
                          <button
                            onClick={() => handleIssueClick(cp.nodeId)}
                            className="text-[9px] font-bold text-[#8ab4f8] hover:underline cursor-pointer"
                          >
                            Inspect Block
                          </button>
                        )}
                        <button
                          onClick={cp.applyFix}
                          className="flex items-center gap-1 px-3 py-1 bg-amber-500 hover:bg-amber-400 text-[#1e1f22] rounded-lg text-[9px] font-extrabold shadow-sm transition-all cursor-pointer"
                        >
                          <Wrench size={10} />
                          <span>{cp.fixLabel}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 1: Issues */}
        {activeTab === 'issues' && (
          <div className="p-4 space-y-4">
            {validationErrors.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle size={32} className="text-[#81c784] mb-3 animate-bounce" />
                <h4 className="text-xs font-bold text-gray-300 uppercase">Architecture Perfect</h4>
                <p className="text-[10px] text-[#9aa0a6] mt-1 max-w-[200px] font-semibold leading-relaxed">
                  No rank mismatches, loop cycles, or broadcast incompatibilities found. Safe to export.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {validationErrors.map((err, idx) => {
                  const isError = err.type === 'error';
                  const levelColor = isError ? 'border-rose-500/30 bg-rose-500/5' : 'border-amber-500/30 bg-amber-500/5';
                  const iconColor = isError ? 'text-[#f28b82]' : 'text-[#ffe082]';
                  const labelText = isError ? 'ERROR' : 'WARNING';
                  
                  return (
                    <div
                      key={idx}
                      onClick={() => handleIssueClick(err.nodeId)}
                      className={`p-3 border rounded-xl flex items-start gap-2.5 transition-all select-text cursor-pointer hover:border-white/10 ${levelColor}`}
                    >
                      <div className={`mt-0.5 ${iconColor}`}>
                        {isError ? <XCircle size={14} /> : <AlertTriangle size={14} />}
                      </div>
                      <div className="space-y-1">
                        <span className={`text-[8.5px] font-extrabold uppercase px-1.5 py-0.5 rounded tracking-wider ${
                          isError ? 'bg-[#f28b82]/10 text-[#f28b82]' : 'bg-[#ffe082]/10 text-[#ffe082]'
                        }`}>
                          {labelText} ({err.category})
                        </span>
                        <p className="text-[10.5px] text-gray-300 font-semibold leading-relaxed">
                          {err.message}
                        </p>
                      </div>
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
                  const isLast = idx === traceOrder.length - 1;
                  
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
