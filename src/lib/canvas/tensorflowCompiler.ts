import { CanvasNode, CanvasEdge } from '@/types/canvas';

export function compileToTensorFlow(nodes: CanvasNode[], edges: CanvasEdge[]): string {
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
    return `# Empty canvas model\n# Add visual blocks to generate TensorFlow module`;
  }

  let initializers: string[] = [];
  let forwardSteps: string[] = [];
  
  // Track out degrees to determine final returns
  const outgoingCount = new Map<string, number>();
  nodes.forEach(n => outgoingCount.set(n.id, 0));
  edges.forEach(e => {
    outgoingCount.set(e.source, (outgoingCount.get(e.source) || 0) + 1);
  });

  // Compile individual node declarations and traces
  order.forEach((node) => {
    const varName = node.id;
    const config = node.config;
    
    // Find incoming parent nodes/variables
    const incomingEdges = edges.filter(e => e.target === node.id);
    const parentVars = incomingEdges.map(e => e.source);
    
    let inputVar = 'x';
    if (parentVars.length === 1) {
      inputVar = parentVars[0];
    } else if (parentVars.length > 1) {
      // In TensorFlow, multiple parents are concatenated on the channel dimension (usually axis=-1)
      inputVar = `layers.Concatenate(axis=-1)([${parentVars.join(', ')}])`;
    }

    if (node.type === 'Input') {
      const dims = config.dim || [224, 224, 3];
      initializers.push(`        # Input Layer: shape [Batch, ${dims[0]}, ${dims[1]}, ${dims[2]}] (channels_last format)`);
      forwardSteps.push(`        # Root input shape: [${dims.join(', ')}]`);
      forwardSteps.push(`        ${varName} = x`);
    } 
    
    else if (node.type === 'Conv2D') {
      const filters = config.filters || 64;
      const kernelSize = config.kernelSize || 3;
      const stride = config.stride || 1;
      const padding = config.padding || 'same';
      const activation = config.activation || 'ReLU';

      let actVal = 'None';
      if (activation && activation !== 'None') {
        actVal = `'${activation.toLowerCase()}'`;
      }

      initializers.push(`        self.${varName} = layers.Conv2D(\n            filters=${filters},\n            kernel_size=(${kernelSize}, ${kernelSize}),\n            strides=(${stride}, ${stride}),\n            padding='${padding}',\n            activation=${actVal}\n        )`);
      
      forwardSteps.push(`        # Spatial Convolution`);
      forwardSteps.push(`        ${varName} = self.${varName}(${inputVar})`);
    } 
    
    else if (node.type === 'MaxPool2D') {
      const poolSize = config.poolSize || 2;
      const stride = config.stride || 2;
      const padding = 'valid'; // Standard MaxPooling default in Keras

      initializers.push(`        self.${varName} = layers.MaxPooling2D(\n            pool_size=(${poolSize}, ${poolSize}),\n            strides=(${stride}, ${stride}),\n            padding='${padding}'\n        )`);
      forwardSteps.push(`        # Spatial downsampling`);
      forwardSteps.push(`        ${varName} = self.${varName}(${inputVar})`);
    } 
    
    else if (node.type === 'Flatten') {
      initializers.push(`        self.${varName} = layers.Flatten()`);
      forwardSteps.push(`        # Flatten multi-dim tensor to vector`);
      forwardSteps.push(`        ${varName} = self.${varName}(${inputVar})`);
    } 
    
    else if (node.type === 'Dense') {
      const units = config.units || 10;
      initializers.push(`        self.${varName} = layers.Dense(units=${units})`);
      forwardSteps.push(`        # Dense projection layer`);
      forwardSteps.push(`        ${varName} = self.${varName}(${inputVar})`);
    }

    forwardSteps.push(''); // add spacer line
  });

  // Calculate final return elements
  const finalLeaves = nodes.filter(n => outgoingCount.get(n.id) === 0);
  let returnStatement = 'return x';
  if (finalLeaves.length === 1) {
    returnStatement = `return ${finalLeaves[0].id}`;
  } else if (finalLeaves.length > 1) {
    returnStatement = `return ${finalLeaves.map(n => n.id).join(', ')}`;
  }

  // Assemble full modular python class
  return `import tensorflow as tf
from tensorflow.keras import layers, Model

class MLBuilderModel(Model):
    """
    Generated automatically by MLBuilder visual designer.
    Topology contains ${nodes.length} nodes and ${edges.length} connections.
    """
    def __init__(self):
        super(MLBuilderModel, self).__init__()
        
${initializers.join('\n\n')}

    def call(self, x):
        """
        Executes structural graph trace.
        Input x expected in standard channels_last [Batch, Height, Width, Channels] format.
        """
${forwardSteps.join('\n')}
        ${returnStatement}

# Instantiation & Summary Example
if __name__ == '__main__':
    # Initialize the model subclass
    model = MLBuilderModel()
    
    # Build Keras graph by passing mock tensor matching Root dims
    # TensorFlow standard format: [Batch, Height, Width, Channels]
    mock_input = tf.random.normal([1, 224, 224, 3])
    try:
        output = model(mock_input)
        model.summary()
        print("\\nSuccess! Forward pass completed.")
        if isinstance(output, tuple):
            print("Outputs shape:", [o.shape for o in output])
        else:
            print("Output shape:", output.shape)
    except Exception as e:
        print("Forward trace warning:", e)
`;
}
