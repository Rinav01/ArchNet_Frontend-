import { compileToPyTorch } from '@/lib/canvas/pytorchCompiler';
import { CanvasNode, CanvasEdge } from '@/types/canvas';

describe('Research SOTA Template Compiler Verification Tests', () => {
  test('BERT template should compile into valid PyTorch with proper Attention, Embeddings and norms', () => {
    const nodes: CanvasNode[] = [
      { id: '1', type: 'Input', name: 'IN', x: 0, y: 0, inputShape: [], outputShape: [128], config: { dim: [128] } },
      { id: '2', type: 'Embedding', name: 'EMBED', x: 0, y: 0, inputShape: [128], outputShape: [128, 768], config: { vocab_size: 30522, embedding_dim: 768 } },
      { id: '3', type: 'PositionalEncoding', name: 'POS', x: 0, y: 0, inputShape: [128, 768], outputShape: [128, 768], config: { embed_dim: 768, max_len: 128 } },
      { id: '4', type: 'LayerNorm', name: 'LN', x: 0, y: 0, inputShape: [128, 768], outputShape: [128, 768], config: {} },
      { id: '5', type: 'TransformerBlock', name: 'ENC1', x: 0, y: 0, inputShape: [128, 768], outputShape: [128, 768], config: { num_heads: 12, embed_dim: 768 } },
      { id: '6', type: 'TransformerBlock', name: 'ENC2', x: 0, y: 0, inputShape: [128, 768], outputShape: [128, 768], config: { num_heads: 12, embed_dim: 768 } },
      { id: '7', type: 'Dense', name: 'HEAD', x: 0, y: 0, inputShape: [128, 768], outputShape: [128, 10], config: { units: 10 } }
    ];
    const edges: CanvasEdge[] = [
      { id: 'e1', source: '1', target: '2' },
      { id: 'e2', source: '2', target: '3' },
      { id: 'e3', source: '3', target: '4' },
      { id: 'e4', source: '4', target: '5' },
      { id: 'e5', source: '5', target: '6' },
      { id: 'e6', source: '6', target: '7' }
    ];

    const output = compileToPyTorch(nodes, edges);

    // Verify metadata
    expect(output).toContain('Framework: PyTorch');
    expect(output).toContain('Input Shape: [128]');
    expect(output).toContain('Output Shape: [128, 10]');
    expect(output).toContain('Verification Status: Passed');

    // Verify core architectural instances
    expect(output).toContain('nn.Embedding(num_embeddings=30522, embedding_dim=768)');
    expect(output).toContain('PositionalEncoding(embed_dim=768, max_len=128)');
    expect(output).toContain('nn.LayerNorm(768)');
    expect(output).toContain('nn.TransformerEncoderLayer(d_model=768, nhead=12, batch_first=True)');
  });

  test('ViT template should compile into valid PyTorch with Conv2D patch projection and true Multi-Head Self Attention', () => {
    const nodes: CanvasNode[] = [
      { id: '1', type: 'Input', name: 'IN', x: 0, y: 0, inputShape: [], outputShape: [224, 224, 3], config: { dim: [224, 224, 3] } },
      { id: '2', type: 'Conv2D', name: 'PATCH_PROJ', x: 0, y: 0, inputShape: [224, 224, 3], outputShape: [14, 14, 768], config: { filters: 768, kernelSize: 16, stride: 16, padding: 'valid' } },
      { id: '3', type: 'Flatten', name: 'FLAT', x: 0, y: 0, inputShape: [14, 14, 768], outputShape: [196, 768], config: {} },
      { id: '4', type: 'MultiHeadAttention', name: 'MHA', x: 0, y: 0, inputShape: [196, 768], outputShape: [196, 768], config: { num_heads: 12, embed_dim: 768 } },
      { id: '5', type: 'Dense', name: 'HEAD', x: 0, y: 0, inputShape: [196, 768], outputShape: [10], config: { units: 10 } }
    ];
    const edges: CanvasEdge[] = [
      { id: 'e1', source: '1', target: '2' },
      { id: 'e2', source: '2', target: '3' },
      { id: 'e3', source: '3', target: '4' },
      { id: 'e4', source: '4', target: '5' }
    ];

    const output = compileToPyTorch(nodes, edges);

    // Verify metadata
    expect(output).toContain('Framework: PyTorch');
    expect(output).toContain('Input Shape: [3, 224, 224]');
    expect(output).toContain('Output Shape: [10]');

    // Verify Conv2D patch projection
    expect(output).toContain('nn.Conv2d(');
    expect(output).toContain('in_channels=3');
    expect(output).toContain('out_channels=768');
    expect(output).toContain('kernel_size=16');
    expect(output).toContain('stride=16');
    
    // Verify Multi-head attention instantiation
    expect(output).toContain('nn.MultiheadAttention(embed_dim=768, num_heads=12, batch_first=True)');
    
    // Verify self-attention call with Q=K=V
    expect(output).toContain('self.mha_4(flat_3, flat_3, flat_3)[0]');
  });

  test('GraphSAGE template should compile and contain message passing initializations', () => {
    const nodes: CanvasNode[] = [
      { id: '1', type: 'Input', name: 'IN', x: 0, y: 0, inputShape: [], outputShape: [1000, 1433], config: { dim: [1000, 1433] } },
      { id: '2', type: 'GraphSAGE', name: 'SAGE1', x: 0, y: 0, inputShape: [1000, 1433], outputShape: [1000, 128], config: { out_features: 128 } },
      { id: '3', type: 'GCN', name: 'GCN1', x: 0, y: 0, inputShape: [1000, 128], outputShape: [1000, 10], config: { out_features: 10 } }
    ];
    const edges: CanvasEdge[] = [
      { id: 'e1', source: '1', target: '2' },
      { id: 'e2', source: '2', target: '3' }
    ];

    const output = compileToPyTorch(nodes, edges);

    expect(output).toContain('class GraphSAGE(nn.Module):');
    expect(output).toContain('class GCN(nn.Module):');
    expect(output).toContain('GraphSAGE(in_features=1433, out_features=128)');
    expect(output).toContain('GCN(in_features=128, out_features=10)');
  });
});
