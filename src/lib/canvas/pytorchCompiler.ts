import { CanvasNode, CanvasEdge } from '@/types/canvas';

function cleanVarName(id: string, type: string, name?: string): string {
  let base = (name || type || 'layer').toLowerCase().replace(/[^a-z0-9_]/g, '_');
  if (!/^[a-z_]/.test(base)) {
    base = 'node_' + base;
  }
  const idHash = id.replace(/-/g, '').substring(0, 8);
  return `${base}_${idHash}`;
}

export function compileToPyTorch(nodes: CanvasNode[], edges: CanvasEdge[]): string {
  // 1. Topological Sort
  const getTopologicalOrder = (): CanvasNode[] => {
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

  const order = getTopologicalOrder();
  
  if (order.length === 0) {
    return `# Empty canvas model\n# Add visual blocks to generate PyTorch module`;
  }

  let initializers: string[] = [];
  let forwardSteps: string[] = [];
  
  // Track out degrees to determine final returns (nodes with 0 outgoing edges)
  const outgoingCount = new Map<string, number>();
  nodes.forEach(n => outgoingCount.set(n.id, 0));
  edges.forEach(e => {
    outgoingCount.set(e.source, (outgoingCount.get(e.source) || 0) + 1);
  });

  // Compile individual node declarations and traces
  order.forEach((node) => {
    const varName = cleanVarName(node.id, node.type, node.name);
    const config = node.config;
    
    // Find incoming parent nodes/variables
    const incomingEdges = edges.filter(e => e.target === node.id);
    const parentVars = incomingEdges.map(e => {
      const srcNode = nodes.find(n => n.id === e.source);
      return srcNode ? cleanVarName(srcNode.id, srcNode.type, srcNode.name) : 'x';
    });
    
    let inputVar = 'x';
    if (parentVars.length === 1) {
      inputVar = parentVars[0];
    } else if (parentVars.length > 1) {
      inputVar = `torch.cat([${parentVars.join(', ')}], dim=1)`;
    }

    if (node.type === 'Input') {
      const dims = config.dim || [224, 224, 3];
      initializers.push(`        # Input Layer: shape [Batch, ${dims[2]}, ${dims[0]}, ${dims[1]}] (channels_first format)`);
      forwardSteps.push(`        # Root input shape: [${dims.join(', ')}]`);
      forwardSteps.push(`        ${varName} = x`);
    } 
    
    else if (node.type === 'Conv2D') {
      const filters = config.filters || 64;
      const kernelSize = config.kernelSize || 3;
      const stride = config.stride || 1;
      const paddingVal = config.padding === 'same' ? Math.floor(kernelSize / 2) : 0;
      const activation = config.activation || 'ReLU';

      // Deduce input channels
      let inChannels = 3;
      if (node.inputShape.length === 3) {
        inChannels = node.inputShape[2];
      }

      initializers.push(`        self.${varName} = nn.Conv2d(\n            in_channels=${inChannels},\n            out_channels=${filters},\n            kernel_size=${kernelSize},\n            stride=${stride},\n            padding=${paddingVal}\n        )`);
      
      let forwardExpr = `self.${varName}(${inputVar})`;
      
      if (activation && activation !== 'None') {
        initializers.push(`        self.${varName}_act = nn.${activation}()`);
        forwardExpr = `self.${varName}_act(${forwardExpr})`;
      }

      forwardSteps.push(`        # Convolution: channels ${inChannels} -> ${filters}`);
      forwardSteps.push(`        ${varName} = ${forwardExpr}`);
    } 
    
    else if (node.type === 'MaxPool2D') {
      const poolSize = config.poolSize || 2;
      const stride = config.stride || 2;

      initializers.push(`        self.${varName} = nn.MaxPool2d(kernel_size=${poolSize}, stride=${stride})`);
      forwardSteps.push(`        # Spatial downsampling`);
      forwardSteps.push(`        ${varName} = self.${varName}(${inputVar})`);
    } 
    
    else if (node.type === 'Flatten') {
      initializers.push(`        self.${varName} = nn.Flatten()`);
      forwardSteps.push(`        # Flatten multi-dim tensor to vector`);
      forwardSteps.push(`        ${varName} = self.${varName}(${inputVar})`);
    } 
    
    else if (node.type === 'Dense') {
      const units = config.units || 10;
      let inFeatures = 100;
      if (node.inputShape.length > 0) {
        inFeatures = node.inputShape.reduce((a, b) => a * b, 1);
      }

      initializers.push(`        self.${varName} = nn.Linear(in_features=${inFeatures}, out_features=${units})`);
      forwardSteps.push(`        # Linear projection`);
      forwardSteps.push(`        ${varName} = self.${varName}(${inputVar})`);
    }
    
    else if (node.type === 'BatchNorm2D') {
      let numFeatures = 3;
      if (node.inputShape.length === 3) {
        numFeatures = node.inputShape[2];
      }
      initializers.push(`        self.${varName} = nn.BatchNorm2d(num_features=${numFeatures})`);
      forwardSteps.push(`        # Batch Normalization`);
      forwardSteps.push(`        ${varName} = self.${varName}(${inputVar})`);
    }
    
    else if (node.type === 'Dropout') {
      const rate = config.rate !== undefined ? config.rate : 0.5;
      initializers.push(`        self.${varName} = nn.Dropout(p=${rate})`);
      forwardSteps.push(`        # Regularization Dropout`);
      forwardSteps.push(`        ${varName} = self.${varName}(${inputVar})`);
    }

    forwardSteps.push(''); // add spacer line
  });

  // Calculate final return elements (nodes with outDegree = 0)
  const finalLeaves = nodes.filter(n => outgoingCount.get(n.id) === 0);
  let returnStatement = 'return x';
  if (finalLeaves.length === 1) {
    returnStatement = `return ${cleanVarName(finalLeaves[0].id, finalLeaves[0].type, finalLeaves[0].name)}`;
  } else if (finalLeaves.length > 1) {
    returnStatement = `return ${finalLeaves.map(n => cleanVarName(n.id, n.type, n.name)).join(', ')}`;
  }

  // Assemble full modular python class
  return `import torch
import torch.nn as nn

class MLBuilderModule(nn.Module):
    """
    Generated automatically by MLBuilder visual designer.
    Topology contains ${nodes.length} nodes and ${edges.length} connections.
    """
    def __init__(self):
        super(MLBuilderModule, self).__init__()
        
${initializers.join('\n\n')}

    def forward(self, x):
        """
        Executes structural graph trace.
        Input x expected in channels_first tensor format.
        """
${forwardSteps.join('\n')}
        ${returnStatement}

# Instantiation & Summary Example
if __name__ == '__main__':
    model = MLBuilderModule()
    print(model)
    
    # Mock forward input pass matching Root config dimensions
    # Assuming input is e.g. [1, Channels, Height, Width]
    mock_input = torch.randn(1, 3, 224, 224)
    try:
        output = model(mock_input)
        print("Success! Forward pass completed.")
        if isinstance(output, tuple):
            print("Outputs shape:", [o.shape for o in output])
        else:
            print("Output shape:", output.shape)
    except Exception as e:
        print("Forward trace warning:", e)
`;
}
