import { CanvasNode, CanvasEdge } from '@/types/canvas';

function cleanVarName(id: string, type: string, name?: string): string {
  let base = (name || type || 'layer').toLowerCase().replace(/[^a-z0-9_]/g, '_');
  if (!/^[a-z_]/.test(base)) {
    base = 'node_' + base;
  }
  const idHash = id.replace(/-/g, '').substring(0, 8);
  return `${base}_${idHash}`;
}

export function compileToJAX(nodes: CanvasNode[], edges: CanvasEdge[]): string {
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
    return `# Empty canvas model\n# Add visual blocks to generate JAX module`;
  }

  let forwardSteps: string[] = [];
  
  // Track out degrees to determine final returns
  const outgoingCount = new Map<string, number>();
  nodes.forEach(n => outgoingCount.set(n.id, 0));
  edges.forEach(e => {
    outgoingCount.set(e.source, (outgoingCount.get(e.source) || 0) + 1);
  });

  // Compile individual node declarations in Flax Linen Compact mode
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
      // In JAX, we concatenate on the channel axis (usually axis=-1)
      inputVar = `jnp.concatenate([${parentVars.join(', ')}], axis=-1)`;
    }

    if (node.type === 'Input') {
      const dims = config.dim || [224, 224, 3];
      forwardSteps.push(`        # Input layer config: [${dims.join(', ')}] (channels_last format)`);
      forwardSteps.push(`        ${varName} = x`);
    } 
    
    else if (node.type === 'Conv2D') {
      const filters = config.filters || 64;
      const kernelSize = config.kernelSize || 3;
      const stride = config.stride || 1;
      const padding = config.padding ? config.padding.toUpperCase() : 'SAME';
      const activation = config.activation || 'ReLU';

      let actSuffix = '';
      if (activation && activation !== 'None') {
        actSuffix = `, activation=nn.${activation.toLowerCase()}`;
      }

      forwardSteps.push(`        # Spatial Convolution features=${filters}`);
      forwardSteps.push(`        ${varName} = nn.Conv(\n            features=${filters},\n            kernel_size=(${kernelSize}, ${kernelSize}),\n            strides=(${stride}, ${stride}),\n            padding='${padding}'${actSuffix}\n        )(${inputVar})`);
    } 
    
    else if (node.type === 'MaxPool2D') {
      const poolSize = config.poolSize || 2;
      const stride = config.stride || 2;

      forwardSteps.push(`        # Spatial Downsampling MaxPool`);
      forwardSteps.push(`        ${varName} = nn.max_pool(\n            ${inputVar},\n            window_shape=(${poolSize}, ${poolSize}),\n            strides=(${stride}, ${stride})\n        )`);
    } 
    
    else if (node.type === 'Flatten') {
      forwardSteps.push(`        # Flatten multi-dim feature map to vector`);
      forwardSteps.push(`        ${varName} = ${inputVar}.reshape((${inputVar}.shape[0], -1))`);
    } 
    
    else if (node.type === 'Dense') {
      const units = config.units || 10;
      forwardSteps.push(`        # Dense linear projection layer`);
      forwardSteps.push(`        ${varName} = nn.Dense(features=${units})(${inputVar})`);
    }
    
    else if (node.type === 'BatchNorm2D') {
      forwardSteps.push(`        # Feature Normalization`);
      forwardSteps.push(`        ${varName} = nn.BatchNorm()(${inputVar})`);
    }
    
    else if (node.type === 'Dropout') {
      const rate = config.rate !== undefined ? config.rate : 0.5;
      forwardSteps.push(`        # Regularization Dropout`);
      forwardSteps.push(`        ${varName} = nn.Dropout(rate=${rate}, deterministic=True)(${inputVar})`);
    }

    forwardSteps.push(''); // add spacer line
  });

  // Calculate final return elements
  const finalLeaves = nodes.filter(n => outgoingCount.get(n.id) === 0);
  let returnStatement = 'return x';
  if (finalLeaves.length === 1) {
    returnStatement = `return ${cleanVarName(finalLeaves[0].id, finalLeaves[0].type, finalLeaves[0].name)}`;
  } else if (finalLeaves.length > 1) {
    returnStatement = `return ${finalLeaves.map(n => cleanVarName(n.id, n.type, n.name)).join(', ')}`;
  }

  // Assemble full modular Flax Linen subclass
  return `import jax
import jax.numpy as jnp
from flax import linen as nn

class MLBuilderModule(nn.Module):
    """
    Generated automatically by MLBuilder visual designer.
    Topology contains ${nodes.length} nodes and ${edges.length} connections.
    Uses Flax Linen Compact notation.
    """
    @nn.compact
    def __call__(self, x):
        """
        Executes structural graph trace using inline variable allocations.
        Expected input x format: [Batch, Height, Width, Channels]
        """
${forwardSteps.join('\n')}
        ${returnStatement}

# Instantiation & Param Initialization Example
if __name__ == '__main__':
    # Instantiate the Flax Module
    model = MLBuilderModule()
    
    # Generate random input keys and key splits
    key = jax.random.PRNGKey(42)
    key, init_key = jax.random.split(key)
    
    # Mock forward input pass matching standard channels_last format
    mock_input = jnp.ones((1, 224, 224, 3))
    
    try:
        # Initialize JAX parameters
        params = model.init(init_key, mock_input)
        print("Success! Model weights successfully allocated.")
        
        # Execute forward pass with current params
        output = model.apply(params, mock_input)
        print("Success! JAX Forward pass completed.")
        
        if isinstance(output, tuple):
            print("Outputs shape:", [o.shape for o in output])
        else:
            print("Output shape:", output.shape)
    except Exception as e:
        print("JAX init trace warning:", e)
`;
}
