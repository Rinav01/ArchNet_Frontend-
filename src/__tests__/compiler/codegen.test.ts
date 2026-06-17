import { compileToPyTorch } from '@/lib/canvas/pytorchCompiler';
import { CanvasNode, CanvasEdge } from '@/types/canvas';

describe('Code Generation & PyTorch Compiler Tests', () => {
  test('should compile empty node canvas into fallback comments', () => {
    const nodes: CanvasNode[] = [];
    const edges: CanvasEdge[] = [];

    const output = compileToPyTorch(nodes, edges);
    expect(output).toContain('# Empty canvas model');
    expect(output).toContain('# Add visual blocks to generate PyTorch module');
  });

  test('should compile simple CNN graph into standard PyTorch module', () => {
    const nodes: CanvasNode[] = [
      { id: '1', type: 'Input', name: 'IN', x: 0, y: 0, inputShape: [], outputShape: [224, 224, 3], config: { dim: [224, 224, 3] } },
      { id: '2', type: 'Conv2D', name: 'CONV', x: 0, y: 0, inputShape: [224, 224, 3], outputShape: [224, 224, 64], config: { filters: 64, kernelSize: 3, padding: 'same' } },
      { id: '3', type: 'MaxPool2D', name: 'POOL', x: 0, y: 0, inputShape: [224, 224, 64], outputShape: [112, 112, 64], config: { poolSize: 2 } },
      { id: '4', type: 'Flatten', name: 'FLAT', x: 0, y: 0, inputShape: [112, 112, 64], outputShape: [802816], config: {} },
      { id: '5', type: 'Dense', name: 'FC', x: 0, y: 0, inputShape: [802816], outputShape: [10], config: { units: 10 } }
    ];
    const edges: CanvasEdge[] = [
      { id: 'e1', source: '1', target: '2' },
      { id: 'e2', source: '2', target: '3' },
      { id: 'e3', source: '3', target: '4' },
      { id: 'e4', source: '4', target: '5' }
    ];

    const output = compileToPyTorch(nodes, edges);

    // Assert overall structural features
    expect(output).toContain('class GeneratedModel(nn.Module):');
    expect(output).toContain('def __init__(self):');
    expect(output).toContain('super(GeneratedModel, self).__init__()');
    expect(output).toContain('def forward(self, x):');

    // Assert layer instantiations
    expect(output).toContain('nn.Conv2d');
    expect(output).toContain('in_channels=3');
    expect(output).toContain('out_channels=64');
    expect(output).toContain('kernel_size=3');
    expect(output).toContain('nn.MaxPool2d(kernel_size=2, stride=2)');
    expect(output).toContain('nn.Flatten()');
    expect(output).toContain('nn.Linear(in_features=802816, out_features=10)');

    // Assert execution flow
    expect(output).toContain('return');
  });

  test('should generate compilation failure report when graph has fatal errors (unsupported layer)', () => {
    const nodes: CanvasNode[] = [
      { id: '1', type: 'Input', name: 'IN', x: 0, y: 0, inputShape: [], outputShape: [224, 224, 3], config: { dim: [224, 224, 3] } },
      { id: 'lstm_1', type: 'LSTM' as any, name: 'LSTM_LAYER', x: 0, y: 0, inputShape: [], outputShape: [], config: {} }
    ];
    const edges: CanvasEdge[] = [
      { id: 'e1', source: '1', target: 'lstm_1' }
    ];

    const output = compileToPyTorch(nodes, edges);

    expect(output).toContain('ArchNet Compilation Report');
    expect(output).toContain('Compilation Status: FAILED');
    expect(output).toContain("Unsupported layer type 'LSTM' detected at node 'lstm_1'");
    expect(output).toContain('raise NotImplementedError("Unsupported layer type \'LSTM\' detected at node \'lstm_1\'")');
  });

  test('should generate correct addition code for ResidualAdd connection', () => {
    const nodes: CanvasNode[] = [
      { id: '1', type: 'Input', name: 'IN', x: 0, y: 0, inputShape: [], outputShape: [224, 224, 3], config: { dim: [224, 224, 3] } },
      { id: 'conv_1', type: 'Conv2D', name: 'CONV1', x: 0, y: 0, inputShape: [224, 224, 3], outputShape: [224, 224, 64], config: { filters: 64, kernelSize: 3, padding: 'same' } },
      { id: 'conv_2', type: 'Conv2D', name: 'CONV2', x: 0, y: 0, inputShape: [224, 224, 3], outputShape: [224, 224, 64], config: { filters: 64, kernelSize: 3, padding: 'same' } },
      { id: 'res_add_1', type: 'ResidualAdd', name: 'ADD', x: 0, y: 0, inputShape: [224, 224, 64], outputShape: [224, 224, 64], config: {} }
    ];
    const edges: CanvasEdge[] = [
      { id: 'e1', source: '1', target: 'conv_1' },
      { id: 'e2', source: '1', target: 'conv_2' },
      { id: 'e3', source: 'conv_1', target: 'res_add_1' },
      { id: 'e4', source: 'conv_2', target: 'res_add_1' }
    ];

    const output = compileToPyTorch(nodes, edges);

    expect(output).toContain('class GeneratedModel(nn.Module):');
    expect(output).toContain('conv1_conv_1 + conv2_conv_2');
  });

  test('should generate correct PyTorch code for newly supported template layers', () => {
    const nodes: CanvasNode[] = [
      { id: '1', type: 'Input', name: 'IN', x: 0, y: 0, inputShape: [], outputShape: [128], config: { dim: [128] } },
      { id: 'embed_1', type: 'Embedding', name: 'EMBED', x: 0, y: 0, inputShape: [128], outputShape: [128, 256], config: { vocab_size: 10000, embedding_dim: 256 } },
      { id: 'pos_1', type: 'PositionalEncoding', name: 'POS', x: 0, y: 0, inputShape: [128, 256], outputShape: [128, 256], config: { embed_dim: 256, max_len: 128 } },
      { id: 'norm_1', type: 'LayerNorm', name: 'NORM', x: 0, y: 0, inputShape: [128, 256], outputShape: [128, 256], config: {} },
      { id: 'trans_1', type: 'TransformerBlock', name: 'TRANS', x: 0, y: 0, inputShape: [128, 256], outputShape: [128, 256], config: { num_heads: 4, embed_dim: 256 } },
      { id: 'gcn_1', type: 'GCN', name: 'GCN', x: 0, y: 0, inputShape: [128, 256], outputShape: [128, 64], config: { out_features: 64 } },
      { id: 'sage_1', type: 'GraphSAGE', name: 'SAGE', x: 0, y: 0, inputShape: [128, 64], outputShape: [128, 10], config: { out_features: 10 } }
    ];
    const edges: CanvasEdge[] = [
      { id: 'e1', source: '1', target: 'embed_1' },
      { id: 'e2', source: 'embed_1', target: 'pos_1' },
      { id: 'e3', source: 'pos_1', target: 'norm_1' },
      { id: 'e4', source: 'norm_1', target: 'trans_1' },
      { id: 'e5', source: 'trans_1', target: 'gcn_1' },
      { id: 'e6', source: 'gcn_1', target: 'sage_1' }
    ];

    const output = compileToPyTorch(nodes, edges);

    // Verify custom helper classes are output
    expect(output).toContain('class PositionalEncoding(nn.Module):');
    expect(output).toContain('class GCN(nn.Module):');
    expect(output).toContain('class GraphSAGE(nn.Module):');

    // Verify model layers are initialized correctly
    expect(output).toContain('nn.Embedding(num_embeddings=10000, embedding_dim=256)');
    expect(output).toContain('PositionalEncoding(embed_dim=256, max_len=128)');
    expect(output).toContain('nn.LayerNorm(256)');
    expect(output).toContain('nn.TransformerEncoderLayer(d_model=256, nhead=4, batch_first=True)');
    expect(output).toContain('GCN(in_features=256, out_features=64)');
    expect(output).toContain('GraphSAGE(in_features=64, out_features=10)');
  });
});
