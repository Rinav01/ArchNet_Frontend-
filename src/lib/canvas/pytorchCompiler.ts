import { CanvasNode, CanvasEdge } from '@/types/canvas';
import { 
  ASTNode, Program, ClassDef, FunctionDef, Assignment, MethodCall, 
  Instantiation, ReturnStatement, Literal, Identifier, Tuple, List, 
  Dict, Comment, RawCode, CodeGenerator, getTopologicalOrder, cleanVarName 
} from './astBuilder';

export function compileToPyTorch(nodes: CanvasNode[], edges: CanvasEdge[]): string {
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
    new MethodCall(new MethodCall(new Identifier('super'), 'GeneratedModel', []), '__init__')
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
      initBody.push(new Comment(`Input Layer: shape [Batch, ${dims[2]}, ${dims[0]}, ${dims[1]}] (channels_first format)`));
      forwardBody.push(new Comment(`Root input shape: [${dims.join(', ')}]`));
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

  const modelClass = new ClassDef(
    'GeneratedModel',
    ['nn.Module'],
    [
      new FunctionDef('__init__', ['self'], initBody),
      new FunctionDef('forward', ['self', 'x'], forwardBody, 'Executes structural graph trace.\nInput x expected in channels_first tensor format.')
    ],
    `Generated automatically by ArchNet visual designer.\nTopology contains ${nodes.length} nodes and ${edges.length} connections.`
  );

  const mainBlock = new RawCode(
`if __name__ == '__main__':
    model = GeneratedModel()
    print(model)
    
    # Mock forward input pass matching Root config dimensions
    mock_input = torch.randn(1, 3, 224, 224)
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

  const program = new Program([
    new RawCode('import torch\nimport torch.nn as nn\n'),
    modelClass,
    mainBlock
  ]);

  const generator = new CodeGenerator();
  return generator.generate(program);
}
