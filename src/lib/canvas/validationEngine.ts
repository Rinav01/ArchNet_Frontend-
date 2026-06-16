import { CanvasNode, CanvasEdge, ValidationError } from '@/types/canvas';
import { getTopologicalOrder, cleanVarName } from './astBuilder';

// Note: To avoid circular imports, we could duplicate computeNodeOutputShape logic here, 
// or import it from a shared utils file. For now, we will import it from canvasStore.
// Wait, we can just use the store's computeNodeOutputShape directly, but let's implement the core validation logic.
import { computeNodeOutputShape } from '@/store/canvasStore';

export function validateGraph(nodes: CanvasNode[], edges: CanvasEdge[]): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (nodes.length === 0) {
    return [];
  }

  // 1. Check for cycles using DFS
  const adj = new Map<string, string[]>();
  nodes.forEach(n => adj.set(n.id, []));
  edges.forEach(e => {
    if (adj.has(e.source) && adj.has(e.target)) {
      adj.get(e.source)!.push(e.target);
    }
  });

  const visited = new Set<string>();
  const recStack = new Set<string>();
  let hasCycle = false;

  function dfs(v: string) {
    if (recStack.has(v)) {
      hasCycle = true;
      return;
    }
    if (visited.has(v)) return;
    
    visited.add(v);
    recStack.add(v);
    
    const neighbors = adj.get(v) || [];
    for (const neighbor of neighbors) {
      dfs(neighbor);
    }
    
    recStack.delete(v);
  }

  nodes.forEach(n => {
    if (!visited.has(n.id)) {
      dfs(n.id);
    }
  });

  if (hasCycle) {
    errors.push({
      type: 'error',
      category: 'cycle',
      message: 'Cycle detected in the computation graph. Directed Acyclic Graph (DAG) required.'
    });
    // If there's a cycle, we can't reliably do a forward pass
    return errors;
  }

  // 2. Validate Shapes based on pre-computed inputShape and outputShape in nodes
  for (const node of nodes) {
    const incomingEdges = edges.filter(e => e.target === node.id);
    
    if (incomingEdges.length === 0) {
      if (node.type !== 'Input') {
        errors.push({
          nodeId: node.id,
          type: 'warning',
          category: 'disconnected',
          message: `Node ${node.name} has no inputs but is not an Input layer.`
        });
      }
    } else if (incomingEdges.length > 1) {
      // Multiple inputs (e.g. Concatenation, Add)
      const parentOuts = incomingEdges.map(e => {
        const p = nodes.find(n => n.id === e.source);
        return p ? p.outputShape : [];
      });
      
      if (node.type === 'ResidualAdd') {
        // Validate broadcast compatibility for Addition
        const baseShape = parentOuts[0];
        let shapeMismatch = false;
        for (let i = 1; i < parentOuts.length; i++) {
          if (parentOuts[i].length !== baseShape.length) {
            shapeMismatch = true;
            break;
          }
          for (let j = 0; j < baseShape.length; j++) {
            if (baseShape[j] !== parentOuts[i][j] && baseShape[j] !== 1 && parentOuts[i][j] !== 1) {
              shapeMismatch = true;
            }
          }
        }
        
        if (shapeMismatch) {
          errors.push({
            nodeId: node.id,
            type: 'error',
            category: 'broadcast',
            message: `ResidualAdd expected matching shapes but received mismatched inputs: [${parentOuts.map(s => s.join(',')).join('] and [')}]`
          });
        }
      } else {
        // Concat validation
        let shapeMismatch = false;
        const baseShape = parentOuts[0];
        
        for (let i = 0; i < parentOuts.length; i++) {
            if (parentOuts[i].length !== baseShape.length && parentOuts[i].length > 0) {
                shapeMismatch = true;
            }
        }

        if (shapeMismatch) {
            errors.push({
                nodeId: node.id,
                type: 'error',
                category: 'reshape',
                message: `Implicit concatenation expected matching spatial dimensions but got mismatched ranks.`
            });
        }
      }
    }

    // Specific ML validation rules based on already populated inputShape
    if (node.type === 'Conv2D' || node.type === 'MaxPool2D') {
      if (node.inputShape.length > 0 && node.inputShape.length !== 3) {
        errors.push({
          nodeId: node.id,
          type: 'error',
          category: 'rank',
          message: `Layer '${node.name}' expects 3D input [H, W, C], got [${node.inputShape.join(', ')}] (rank ${node.inputShape.length})`
        });
      }
    } else if (node.type === 'Dense') {
      if (node.inputShape.length > 0 && node.inputShape.length !== 1) {
        errors.push({
          nodeId: node.id,
          type: 'error',
          category: 'rank',
          message: `Layer '${node.name}' expects 1D flattened input [Features], got [${node.inputShape.join(', ')}].`
        });
      }
    }
  }

  // 3. Disconnected components check
  const inputNode = nodes.find(n => n.type === 'Input');
  if (inputNode) {
    const flowVisited = new Set<string>();
    const queue = [inputNode.id];
    while (queue.length > 0) {
      const curr = queue.shift()!;
      if (!flowVisited.has(curr)) {
        flowVisited.add(curr);
        const neighbors = edges.filter(e => e.source === curr).map(e => e.target);
        neighbors.forEach(v => {
          if (!flowVisited.has(v)) queue.push(v);
        });
      }
    }

    nodes.forEach(n => {
      if (!flowVisited.has(n.id) && n.type !== 'Input') {
        errors.push({
          nodeId: n.id,
          type: 'warning',
          category: 'disconnected',
          message: `Layer '${n.name}' is disconnected from the main 'Input' graph flow. All active layers must connect.`
        });
      }
    });
  }

  return errors;
}

function incomingEdgesCount(nodeId: string, edges: CanvasEdge[]): number {
  return edges.filter(e => e.target === nodeId).length;
}
