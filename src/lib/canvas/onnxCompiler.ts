import { CanvasNode, CanvasEdge } from '@/types/canvas';

function cleanVarName(id: string, type: string, name?: string): string {
  let base = (name || type || 'layer').toLowerCase().replace(/[^a-z0-9_]/g, '_');
  if (!/^[a-z_]/.test(base)) {
    base = 'node_' + base;
  }
  const idHash = id.replace(/-/g, '').substring(0, 8);
  return `${base}_${idHash}`;
}

export function compileToONNX(nodes: CanvasNode[], edges: CanvasEdge[]): string {
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
    return `# Empty canvas model\n# Add visual blocks to generate ONNX graph builder script`;
  }

  let helperNodes: string[] = [];
  let initializers: string[] = [];
  
  // Track out degrees to determine final returns
  const outgoingCount = new Map<string, number>();
  nodes.forEach(n => outgoingCount.set(n.id, 0));
  edges.forEach(e => {
    outgoingCount.set(e.source, (outgoingCount.get(e.source) || 0) + 1);
  });

  // Compile individual node builders
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
      // Create ONNX Concat Node
      helperNodes.push(`    # Merge branches
    node_concat_${varName} = helper.make_node(
        "Concat",
        inputs=[${parentVars.map(v => `"${v}"`).join(', ')}],
        outputs=["concat_${varName}"],
        axis=1 # Channel dimension
    )
    onnx_nodes.append(node_concat_${varName})`);
      inputVar = `concat_${varName}`;
    }

    if (node.type === 'Input') {
      const dims = config.dim || [224, 224, 3];
      // ONNX inputs are channels_first by convention
      forwardStepsPlaceholder(varName, dims);
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

      // Conv weights & biases in initializers
      initializers.push(`    # Conv Weight Initializer for ${varName}
    w_shape_${varName} = [${filters}, ${inChannels}, ${kernelSize}, ${kernelSize}]
    w_val_${varName} = np.random.randn(*w_shape_${varName}).astype(np.float32) * 0.01
    w_tensor_${varName} = helper.make_tensor(
        name="W_${varName}",
        data_type=TensorProto.FLOAT,
        dims=w_shape_${varName},
        vals=w_val_${varName}.flatten()
    )
    onnx_initializers.append(w_tensor_${varName})`);

      helperNodes.push(`    # Spatial Convolution: ${varName}
    node_${varName} = helper.make_node(
        "Conv",
        inputs=["${inputVar}", "W_${varName}"],
        outputs=["conv_out_${varName}"],
        kernel_shape=[${kernelSize}, ${kernelSize}],
        strides=[${stride}, ${stride}],
        pads=[${paddingVal}, ${paddingVal}, ${paddingVal}, ${paddingVal}]
    )
    onnx_nodes.append(node_${varName})`);

      if (activation && activation !== 'None') {
        helperNodes.push(`    # Activation: ${activation} for ${varName}
    node_act_${varName} = helper.make_node(
        "${activation}",
        inputs=["conv_out_${varName}"],
        outputs=["${varName}"]
    )
    onnx_nodes.append(node_act_${varName})`);
      } else {
        // Identity fallback to match variable naming conventions
        helperNodes.push(`    node_act_${varName} = helper.make_node(
        "Identity",
        inputs=["conv_out_${varName}"],
        outputs=["${varName}"]
    )
    onnx_nodes.append(node_act_${varName})`);
      }
    } 
    
    else if (node.type === 'MaxPool2D') {
      const poolSize = config.poolSize || 2;
      const stride = config.stride || 2;

      helperNodes.push(`    # Spatial pooling downsampling: ${varName}
    node_${varName} = helper.make_node(
        "MaxPool",
        inputs=["${inputVar}"],
        outputs=["${varName}"],
        kernel_shape=[${poolSize}, ${poolSize}],
        strides=[${stride}, ${stride}]
    )
    onnx_nodes.append(node_${varName})`);
    } 
    
    else if (node.type === 'Flatten') {
      helperNodes.push(`    # Flatten spatial tensor: ${varName}
    node_${varName} = helper.make_node(
        "Flatten",
        inputs=["${inputVar}"],
        outputs=["${varName}"],
        axis=1
    )
    onnx_nodes.append(node_${varName})`);
    } 
    
    else if (node.type === 'Dense') {
      const units = config.units || 10;
      let inFeatures = 100;
      if (node.inputShape.length > 0) {
        inFeatures = node.inputShape.reduce((a, b) => a * b, 1);
      }

      // Dense weights (Gemm matrix)
      initializers.push(`    # Dense Weights (Transposed for Gemm)
    w_shape_${varName} = [${units}, ${inFeatures}]
    w_val_${varName} = np.random.randn(*w_shape_${varName}).astype(np.float32) * 0.05
    w_tensor_${varName} = helper.make_tensor(
        name="W_${varName}",
        data_type=TensorProto.FLOAT,
        dims=w_shape_${varName},
        vals=w_val_${varName}.flatten()
    )
    onnx_initializers.append(w_tensor_${varName})`);

      helperNodes.push(`    # Dense projection Gemm: ${varName}
    node_${varName} = helper.make_node(
        "Gemm",
        inputs=["${inputVar}", "W_${varName}"],
        outputs=["${varName}"],
        transB=1
    )
    onnx_nodes.append(node_${varName})`);
    }
    
    else if (node.type === 'BatchNorm2D') {
      let inChannels = 3;
      if (node.inputShape.length === 3) {
        inChannels = node.inputShape[2];
      }
      initializers.push(`    # BatchNorm parameters for ${varName}
    scale_val_${varName} = np.ones([${inChannels}]).astype(np.float32)
    bias_val_${varName} = np.zeros([${inChannels}]).astype(np.float32)
    mean_val_${varName} = np.zeros([${inChannels}]).astype(np.float32)
    var_val_${varName} = np.ones([${inChannels}]).astype(np.float32)
    
    scale_tensor_${varName} = helper.make_tensor("scale_${varName}", TensorProto.FLOAT, [${inChannels}], scale_val_${varName})
    bias_tensor_${varName} = helper.make_tensor("bias_${varName}", TensorProto.FLOAT, [${inChannels}], bias_val_${varName})
    mean_tensor_${varName} = helper.make_tensor("mean_${varName}", TensorProto.FLOAT, [${inChannels}], mean_val_${varName})
    var_tensor_${varName} = helper.make_tensor("var_${varName}", TensorProto.FLOAT, [${inChannels}], var_val_${varName})
    
    onnx_initializers.extend([scale_tensor_${varName}, bias_tensor_${varName}, mean_tensor_${varName}, var_tensor_${varName}])`);

      helperNodes.push(`    # Batch Normalization: ${varName}
    node_${varName} = helper.make_node(
        "BatchNormalization",
        inputs=["${inputVar}", "scale_${varName}", "bias_${varName}", "mean_${varName}", "var_${varName}"],
        outputs=["${varName}"]
    )
    onnx_nodes.append(node_${varName})`);
    }
    
    else if (node.type === 'Dropout') {
      const rate = config.rate !== undefined ? config.rate : 0.5;
      helperNodes.push(`    # Regularization Dropout: ${varName}
    node_${varName} = helper.make_node(
        "Dropout",
        inputs=["${inputVar}"],
        outputs=["${varName}"],
        ratio=${rate}
    )
    onnx_nodes.append(node_${varName})`);
    }
  });

  // Calculate final return elements
  const finalLeaves = nodes.filter(n => outgoingCount.get(n.id) === 0);
  let outputsArray = `["${finalLeaves[0] ? cleanVarName(finalLeaves[0].id, finalLeaves[0].type, finalLeaves[0].name) : 'x'}"]`;
  if (finalLeaves.length > 1) {
    outputsArray = `[${finalLeaves.map(n => `"${cleanVarName(n.id, n.type, n.name)}"`).join(', ')}]`;
  }

  // Placeholder function for shape mapping
  function forwardStepsPlaceholder(id: string, dims: number[]) {
    // Generate dimension mapping
  }

  const inputNode = nodes.find(n => n.type === 'Input');
  const inputDims = inputNode?.config.dim || [224, 224, 3];

  // Assemble full modular python class
  return `import onnx
from onnx import helper, TensorProto
import numpy as np

def create_archnet_onnx_model():
    """
    Generated automatically by ArchNet visual designer.
    Topology contains ${nodes.length} nodes and ${edges.length} connections.
    Constructs an equivalent ONNX computational graph using standard onnx.helper APIs.
    """
    onnx_nodes = []
    onnx_initializers = []
    
    # --- Weight and Param Initializers ---
${initializers.join('\n\n')}

    # --- Computational Nodes ---
${helperNodes.join('\n\n')}

    # --- Graph Inputs & Outputs Sizing Schema ---
    # Input expected in channels_first format: [Batch, Channels, Height, Width]
    graph_input = helper.make_tensor_value_info(
        "x",
        TensorProto.FLOAT,
        [1, ${inputDims[2]}, ${inputDims[0]}, ${inputDims[1]}]
    )
    
    # Output nodes matching terminal nodes
    graph_outputs = []
${finalLeaves.map(leaf => {
  const cleanLeafName = cleanVarName(leaf.id, leaf.type, leaf.name);
  return `    graph_outputs.append(
        helper.make_tensor_value_info(
            "${cleanLeafName}",
            TensorProto.FLOAT,
            [1, ${leaf.outputShape.length > 0 ? leaf.outputShape.reduce((a, b) => a * b, 1) : 10}]
        )
    )`;
}).join('\n')}

    # --- Construct Computational Graph ---
    graph = helper.make_graph(
        nodes=onnx_nodes,
        name="ArchNetVisualGraph",
        inputs=[graph_input],
        outputs=graph_outputs,
        initializer=onnx_initializers
    )

    # --- Construct ONNX Model ---
    model = helper.make_model(graph, producer_name="ArchNet Workspace Compiler")
    return model

if __name__ == '__main__':
    # Compile the ONNX model graph structure
    onnx_model = create_archnet_onnx_model()
    
    # Check model consistency and validate topology schemas
    try:
        onnx.checker.check_model(onnx_model)
        print("ONNX Model compiled and successfully validated!")
        
        # Save ONNX model binary to local disk
        onnx.save(onnx_model, "archnet_graph_model.onnx")
        print("Saved compiled ONNX binary model as 'archnet_graph_model.onnx'.")
    except Exception as e:
        print("ONNX validation trace warning:", e)
`;
}
