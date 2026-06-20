import { CanvasNode, CanvasEdge } from '@/types/canvas';
import { 
  ASTNode, Program, ClassDef, FunctionDef, Assignment, MethodCall, 
  Instantiation, ReturnStatement, Literal, Identifier, Tuple, List, 
  Dict, Comment, RawCode, CodeGenerator, getTopologicalOrder, cleanVarName 
} from './astBuilder';
import { validateGraph } from './validationEngine';

export function compileToPyTorch(nodes: CanvasNode[], edges: CanvasEdge[]): string {
  // Check for fatal validation errors first
  const validationErrors = validateGraph(nodes, edges);
  const fatalErrors = validationErrors.filter(e => e.severity === 'fatal');
  if (fatalErrors.length > 0) {
    const errorLines = fatalErrors.map(e => `- ${e.message}`).join('\n');
    const firstMessage = fatalErrors[0].message;
    return `"""
ArchNet Compilation Report

Compilation Status: FAILED

Fatal Errors:
${errorLines}

Compiler Supported Layers:
- Input
- Conv2D
- MaxPool2D
- Flatten
- Dense
- BatchNorm2D
- Dropout
- ResidualAdd
- Embedding
- PositionalEncoding
- LayerNorm
- TransformerBlock
- GCN
- GraphSAGE
- LSTM
- BiLSTM
- GRU
- RNN
"""
raise NotImplementedError(${JSON.stringify(firstMessage)})
`;
  }

  const hasEmbedding = nodes.some(n => n.type === 'Embedding');
  const order = getTopologicalOrder(nodes, edges);
  
  if (order.length === 0) {
    return `# Empty canvas model\n# Add visual blocks to generate PyTorch module`;
  }

  const outgoingCount = new Map<string, number>();
  nodes.forEach(n => outgoingCount.set(n.id, 0));
  edges.forEach(e => {
    outgoingCount.set(e.source, (outgoingCount.get(e.source) || 0) + 1);
  });

  const initBody: ASTNode[] = [
    new RawCode('super(GeneratedModel, self).__init__()')
  ];
  const forwardBody: ASTNode[] = [];

  order.forEach((node) => {
    const varName = cleanVarName(node.id, node.type, node.name);
    const config = node.config;
    
    const incomingEdges = edges.filter(e => e.target === node.id);
    const parentVars = incomingEdges.map(e => {
      const srcNode = nodes.find(n => n.id === e.source);
      return srcNode ? cleanVarName(srcNode.id, srcNode.type, srcNode.name) : 'x';
    });
    
    let inputVar: ASTNode = new Identifier('x');
    if (parentVars.length === 1) {
      inputVar = new Identifier(parentVars[0]);
    } else if (parentVars.length > 1) {
      inputVar = new MethodCall(new Identifier('torch'), 'cat', [
        new List(parentVars.map(p => new Identifier(p)))
      ], { dim: new Literal(1) });
    }

    if (node.type === 'Input') {
      const dims = config.dim || [224, 224, 3];
      if (hasEmbedding) {
        initBody.push(new Comment(`Input Layer: token ids of shape [Batch, SeqLen]`));
        forwardBody.push(new Comment(`Input x expected as token ids\nshape [batch_size, sequence_length]\ndtype torch.long`));
      } else {
        initBody.push(new Comment(`Input Layer: shape [Batch, ${dims[2]}, ${dims[0]}, ${dims[1]}] (channels_first format)`));
        forwardBody.push(new Comment(`Root input shape: [${dims.join(', ')}]`));
      }
      forwardBody.push(new Assignment([new Identifier(varName)], new Identifier('x')));
    } 
    
    else if (node.type === 'Conv2D') {
      const filters = config.filters || 64;
      const kernelSize = config.kernelSize || 3;
      const stride = config.stride || 1;
      const paddingVal = config.padding === 'same' ? Math.floor(kernelSize / 2) : 0;
      const activation = config.activation || 'ReLU';

      let inChannels = 3;
      if (node.inputShape && node.inputShape.length === 3) {
        inChannels = node.inputShape[2];
      }

      initBody.push(new Assignment(
        [new Identifier(`self.${varName}`)],
        new Instantiation('nn.Conv2d', [], {
          in_channels: new Literal(inChannels),
          out_channels: new Literal(filters),
          kernel_size: new Literal(kernelSize),
          stride: new Literal(stride),
          padding: new Literal(paddingVal)
        })
      ));
      
      let forwardExpr: ASTNode = new MethodCall(new Identifier(`self.${varName}`), '__call__', [inputVar]);
      // Python's direct call e.g. self.layer(x) is syntactically a call on an object. 
      // We can represent `self.layer(x)` as `RawCode("self.layer(x)")` or custom `Call`
      forwardExpr = new RawCode(`self.${varName}(${inputVar.type === 'Identifier' ? (inputVar as Identifier).name : 'x'})`);
      if (parentVars.length > 1) {
          forwardExpr = new RawCode(`self.${varName}(torch.cat([${parentVars.join(', ')}], dim=1))`);
      }
      
      if (activation && activation !== 'None') {
        initBody.push(new Assignment(
          [new Identifier(`self.${varName}_act`)],
          new Instantiation(`nn.${activation}`)
        ));
        forwardExpr = new RawCode(`self.${varName}_act(${forwardExpr instanceof RawCode ? forwardExpr.code : ''})`);
      }

      forwardBody.push(new Comment(`Convolution: channels ${inChannels} -> ${filters}`));
      forwardBody.push(new Assignment([new Identifier(varName)], forwardExpr));
    } 
    
    else if (node.type === 'MaxPool2D') {
      const poolSize = config.poolSize || 2;
      const stride = config.stride || 2;

      initBody.push(new Assignment(
        [new Identifier(`self.${varName}`)],
        new Instantiation('nn.MaxPool2d', [], {
          kernel_size: new Literal(poolSize),
          stride: new Literal(stride)
        })
      ));
      forwardBody.push(new Comment(`Spatial downsampling`));
      
      let inp = inputVar.type === 'Identifier' ? (inputVar as Identifier).name : 'x';
      if (parentVars.length > 1) inp = `torch.cat([${parentVars.join(', ')}], dim=1)`;
      forwardBody.push(new Assignment([new Identifier(varName)], new RawCode(`self.${varName}(${inp})`)));
    } 
    
    else if (node.type === 'Flatten') {
      initBody.push(new Assignment(
        [new Identifier(`self.${varName}`)],
        new Instantiation('nn.Flatten')
      ));
      forwardBody.push(new Comment(`Flatten multi-dim tensor to vector`));
      let inp = inputVar.type === 'Identifier' ? (inputVar as Identifier).name : 'x';
      if (parentVars.length > 1) inp = `torch.cat([${parentVars.join(', ')}], dim=1)`;
      forwardBody.push(new Assignment([new Identifier(varName)], new RawCode(`self.${varName}(${inp})`)));
    } 
    
    else if (node.type === 'Dense') {
      const units = config.units || 10;
      let inFeatures = 100;
      if (node.inputShape && node.inputShape.length > 0) {
        inFeatures = node.inputShape.reduce((a, b) => a * b, 1);
      }

      initBody.push(new Assignment(
        [new Identifier(`self.${varName}`)],
        new Instantiation('nn.Linear', [], {
          in_features: new Literal(inFeatures),
          out_features: new Literal(units)
        })
      ));
      forwardBody.push(new Comment(`Linear projection`));
      let inp = inputVar.type === 'Identifier' ? (inputVar as Identifier).name : 'x';
      if (parentVars.length > 1) inp = `torch.cat([${parentVars.join(', ')}], dim=1)`;
      forwardBody.push(new Assignment([new Identifier(varName)], new RawCode(`self.${varName}(${inp})`)));
    }
    
    else if (node.type === 'BatchNorm2D') {
      let numFeatures = 3;
      if (node.inputShape && node.inputShape.length === 3) {
        numFeatures = node.inputShape[2];
      }
      initBody.push(new Assignment(
        [new Identifier(`self.${varName}`)],
        new Instantiation('nn.BatchNorm2d', [], {
          num_features: new Literal(numFeatures)
        })
      ));
      forwardBody.push(new Comment(`Batch Normalization`));
      let inp = inputVar.type === 'Identifier' ? (inputVar as Identifier).name : 'x';
      if (parentVars.length > 1) inp = `torch.cat([${parentVars.join(', ')}], dim=1)`;
      forwardBody.push(new Assignment([new Identifier(varName)], new RawCode(`self.${varName}(${inp})`)));
    }
    
    else if (node.type === 'Dropout') {
      const rate = config.rate !== undefined ? config.rate : 0.5;
      initBody.push(new Assignment(
        [new Identifier(`self.${varName}`)],
        new Instantiation('nn.Dropout', [], {
          p: new Literal(rate)
        })
      ));
      forwardBody.push(new Comment(`Regularization Dropout`));
      let inp = inputVar.type === 'Identifier' ? (inputVar as Identifier).name : 'x';
      if (parentVars.length > 1) inp = `torch.cat([${parentVars.join(', ')}], dim=1)`;
      forwardBody.push(new Assignment([new Identifier(varName)], new RawCode(`self.${varName}(${inp})`)));
    }
    
    else if (node.type === 'ResidualAdd') {
      forwardBody.push(new Comment(`Residual Addition`));
      const addExpr = parentVars.length >= 2 ? parentVars.join(' + ') : (parentVars[0] || 'x');
      forwardBody.push(new Assignment([new Identifier(varName)], new RawCode(addExpr)));
    }

    else if (node.type === 'LSTM' || node.type === 'RNN') {
      const hiddenSize = config.hidden_size || config.units || 64;
      const returnSeqs = config.return_sequences !== false;
      // inputSize derived from last dimension of incoming sequence tensor
      const inputSize = (node.inputShape && node.inputShape.length >= 2)
        ? node.inputShape[node.inputShape.length - 1]
        : 128;
      const nnClass = node.type === 'LSTM' ? 'nn.LSTM' : 'nn.RNN';
      initBody.push(new Assignment(
        [new Identifier(`self.${varName}`)],
        new Instantiation(nnClass, [], {
          input_size: new Literal(inputSize),
          hidden_size: new Literal(hiddenSize),
          batch_first: new Literal(true)
        })
      ));
      const comment = node.type === 'LSTM' ? 'LSTM sequence layer' : 'RNN sequence layer';
      forwardBody.push(new Comment(comment));
      let inp = inputVar.type === 'Identifier' ? (inputVar as Identifier).name : 'x';
      if (returnSeqs) {
        // Returns (output [B, T, H], (h_n, c_n)) — take full sequence
        forwardBody.push(new Assignment([new Identifier(varName)], new RawCode(`self.${varName}(${inp})[0]`)));
      } else {
        // Take only last timestep hidden state
        forwardBody.push(new Assignment([new Identifier(varName)], new RawCode(`self.${varName}(${inp})[0][:, -1, :]`)));
      }
    }

    else if (node.type === 'BiLSTM') {
      const hiddenSize = config.hidden_size || config.units || 64;
      const returnSeqs = config.return_sequences !== false;
      const inputSize = (node.inputShape && node.inputShape.length >= 2)
        ? node.inputShape[node.inputShape.length - 1]
        : 128;
      initBody.push(new Assignment(
        [new Identifier(`self.${varName}`)],
        new Instantiation('nn.LSTM', [], {
          input_size: new Literal(inputSize),
          hidden_size: new Literal(hiddenSize),
          batch_first: new Literal(true),
          bidirectional: new Literal(true)
        })
      ));
      forwardBody.push(new Comment(`Bidirectional LSTM sequence layer`));
      let inp = inputVar.type === 'Identifier' ? (inputVar as Identifier).name : 'x';
      if (returnSeqs) {
        forwardBody.push(new Assignment([new Identifier(varName)], new RawCode(`self.${varName}(${inp})[0]`)));
      } else {
        forwardBody.push(new Assignment([new Identifier(varName)], new RawCode(`self.${varName}(${inp})[0][:, -1, :]`)));
      }
    }

    else if (node.type === 'GRU') {
      const hiddenSize = config.hidden_size || config.units || 64;
      const returnSeqs = config.return_sequences !== false;
      const inputSize = (node.inputShape && node.inputShape.length >= 2)
        ? node.inputShape[node.inputShape.length - 1]
        : 128;
      initBody.push(new Assignment(
        [new Identifier(`self.${varName}`)],
        new Instantiation('nn.GRU', [], {
          input_size: new Literal(inputSize),
          hidden_size: new Literal(hiddenSize),
          batch_first: new Literal(true)
        })
      ));
      forwardBody.push(new Comment(`GRU sequence layer`));
      let inp = inputVar.type === 'Identifier' ? (inputVar as Identifier).name : 'x';
      if (returnSeqs) {
        forwardBody.push(new Assignment([new Identifier(varName)], new RawCode(`self.${varName}(${inp})[0]`)));
      } else {
        forwardBody.push(new Assignment([new Identifier(varName)], new RawCode(`self.${varName}(${inp})[0][:, -1, :]`)));
      }
    }
    
    else if (node.type === 'Embedding') {
      const vocabSize = config.vocab_size || 10000;
      const embeddingDim = config.embedding_dim || 256;
      initBody.push(new Assignment(
        [new Identifier(`self.${varName}`)],
        new Instantiation('nn.Embedding', [], {
          num_embeddings: new Literal(vocabSize),
          embedding_dim: new Literal(embeddingDim)
        })
      ));
      forwardBody.push(new Comment(`Token Embedding`));
      let inp = inputVar.type === 'Identifier' ? (inputVar as Identifier).name : 'x';
      forwardBody.push(new Assignment([new Identifier(varName)], new RawCode(`self.${varName}(${inp})`)));
    }

    else if (node.type === 'PositionalEncoding') {
      const embedDim = config.embed_dim || 256;
      const maxLen = config.max_len || 128;
      initBody.push(new Assignment(
        [new Identifier(`self.${varName}`)],
        new Instantiation('PositionalEncoding', [], {
          embed_dim: new Literal(embedDim),
          max_len: new Literal(maxLen)
        })
      ));
      forwardBody.push(new Comment(`Positional Encoding`));
      let inp = inputVar.type === 'Identifier' ? (inputVar as Identifier).name : 'x';
      forwardBody.push(new Assignment([new Identifier(varName)], new RawCode(`self.${varName}(${inp})`)));
    }

    else if (node.type === 'LayerNorm') {
      const normalizedShape = node.inputShape && node.inputShape.length > 0
        ? node.inputShape[node.inputShape.length - 1]
        : 256;
      initBody.push(new Assignment(
        [new Identifier(`self.${varName}`)],
        new Instantiation('nn.LayerNorm', [new Literal(normalizedShape)])
      ));
      forwardBody.push(new Comment(`Layer Normalization`));
      let inp = inputVar.type === 'Identifier' ? (inputVar as Identifier).name : 'x';
      forwardBody.push(new Assignment([new Identifier(varName)], new RawCode(`self.${varName}(${inp})`)));
    }

    else if (node.type === 'TransformerBlock') {
      const numHeads = config.num_heads || 4;
      const embedDim = config.embed_dim || 256;
      initBody.push(new Assignment(
        [new Identifier(`self.${varName}`)],
        new Instantiation('nn.TransformerEncoderLayer', [], {
          d_model: new Literal(embedDim),
          nhead: new Literal(numHeads),
          batch_first: new Literal(true)
        })
      ));
      forwardBody.push(new Comment(`Transformer Encoder Block`));
      let inp = inputVar.type === 'Identifier' ? (inputVar as Identifier).name : 'x';
      forwardBody.push(new Assignment([new Identifier(varName)], new RawCode(`self.${varName}(${inp})`)));
    }

    else if (node.type === 'GCN') {
      const outFeatures = config.out_features || 64;
      const inFeatures = node.inputShape && node.inputShape.length > 0
        ? node.inputShape[node.inputShape.length - 1]
        : 1433;
      initBody.push(new Assignment(
        [new Identifier(`self.${varName}`)],
        new Instantiation('GCN', [], {
          in_features: new Literal(inFeatures),
          out_features: new Literal(outFeatures)
        })
      ));
      forwardBody.push(new Comment(`Graph Convolutional Network Layer`));
      let inp = inputVar.type === 'Identifier' ? (inputVar as Identifier).name : 'x';
      forwardBody.push(new Assignment([new Identifier(varName)], new RawCode(`self.${varName}(${inp})`)));
    }

    else if (node.type === 'GraphSAGE') {
      const outFeatures = config.out_features || 64;
      const inFeatures = node.inputShape && node.inputShape.length > 0
        ? node.inputShape[node.inputShape.length - 1]
        : 1433;
      initBody.push(new Assignment(
        [new Identifier(`self.${varName}`)],
        new Instantiation('GraphSAGE', [], {
          in_features: new Literal(inFeatures),
          out_features: new Literal(outFeatures)
        })
      ));
      forwardBody.push(new Comment(`GraphSAGE Layer`));
      let inp = inputVar.type === 'Identifier' ? (inputVar as Identifier).name : 'x';
      forwardBody.push(new Assignment([new Identifier(varName)], new RawCode(`self.${varName}(${inp})`)));
    }
    
    else {
      // Fallback for other nodes to not break existing graphs
      forwardBody.push(new Comment(`Fallback for ${node.type}`));
      let inp = inputVar.type === 'Identifier' ? (inputVar as Identifier).name : 'x';
      if (parentVars.length > 1) inp = `torch.cat([${parentVars.join(', ')}], dim=1)`;
      forwardBody.push(new Assignment([new Identifier(varName)], new Identifier(inp)));
    }
  });

  const finalLeaves = nodes.filter(n => outgoingCount.get(n.id) === 0);
  let retExpr: ASTNode = new Identifier('x');
  if (finalLeaves.length === 1) {
    retExpr = new Identifier(cleanVarName(finalLeaves[0].id, finalLeaves[0].type, finalLeaves[0].name));
  } else if (finalLeaves.length > 1) {
    retExpr = new Tuple(finalLeaves.map(n => new Identifier(cleanVarName(n.id, n.type, n.name))));
  }
  forwardBody.push(new ReturnStatement(retExpr));

  const forwardDocstring = hasEmbedding
    ? 'Executes structural graph trace.\nInput x expected as token ids of shape [batch_size, sequence_length] with dtype torch.long.'
    : 'Executes structural graph trace.\nInput x expected in channels_first tensor format.';

  const modelClass = new ClassDef(
    'GeneratedModel',
    ['nn.Module'],
    [
      new FunctionDef('__init__', ['self'], initBody),
      new FunctionDef('forward', ['self', 'x'], forwardBody, forwardDocstring)
    ],
    `Generated automatically by ArchNet visual designer.\nTopology contains ${nodes.length} nodes and ${edges.length} connections.`
  );

  const mockInputCode = hasEmbedding
    ? '    # Mock forward input pass of integer token IDs for embedding\n    mock_input = torch.randint(0, 10000, (1, 128))'
    : '    # Mock forward input pass matching Root config dimensions\n    mock_input = torch.randn(1, 3, 224, 224)';

  const mainBlock = new RawCode(
`if __name__ == '__main__':
    model = GeneratedModel()
    print(model)
    
${mockInputCode}
    try:
        output = model(mock_input)
        print("Success! Forward pass completed.")
        if isinstance(output, tuple):
            print("Outputs shape:", [o.shape for o in output])
        else:
            print("Output shape:", output.shape)
    except Exception as e:
        print("Forward trace warning:", e)`
  );

  let customHelpers = '';
  const hasPositionalEncoding = nodes.some(n => n.type === 'PositionalEncoding');
  const hasGCN = nodes.some(n => n.type === 'GCN');
  const hasGraphSAGE = nodes.some(n => n.type === 'GraphSAGE');

  if (hasPositionalEncoding) {
    customHelpers += `
class PositionalEncoding(nn.Module):
    def __init__(self, embed_dim, max_len=128):
        super().__init__()
        import math
        pe = torch.zeros(max_len, embed_dim)
        position = torch.arange(0, max_len, dtype=torch.float).unsqueeze(1)
        div_term = torch.exp(torch.arange(0, embed_dim, 2, dtype=torch.float) * (-math.log(10000.0) / embed_dim))
        pe[:, 0::2] = torch.sin(position * div_term)
        pe[:, 1::2] = torch.cos(position * div_term)
        self.register_buffer('pe', pe.unsqueeze(0))

    def forward(self, x):
        return x + self.pe[:, :x.size(1)]
`;
  }

  if (hasGCN) {
    customHelpers += `
class GCN(nn.Module):
    def __init__(self, in_features, out_features):
        super().__init__()
        self.linear = nn.Linear(in_features, out_features)
    def forward(self, x):
        return self.linear(x)
`;
  }

  if (hasGraphSAGE) {
    customHelpers += `
class GraphSAGE(nn.Module):
    def __init__(self, in_features, out_features):
        super().__init__()
        self.linear = nn.Linear(in_features, out_features)
    def forward(self, x):
        return self.linear(x)
`;
  }

  const programNodes: ASTNode[] = [
    new RawCode('import torch\nimport torch.nn as nn\n'),
  ];
  if (customHelpers) {
    programNodes.push(new RawCode(customHelpers));
  }
  programNodes.push(modelClass);
  programNodes.push(mainBlock);

  const program = new Program(programNodes);

  const generator = new CodeGenerator();
  return generator.generate(program);
}
