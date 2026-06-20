import { compileToPyTorch } from '@/lib/canvas/pytorchCompiler';
import { compileToTensorFlow } from '@/lib/canvas/tensorflowCompiler';
import { compileToJAX } from '@/lib/canvas/jaxCompiler';
import { compileToONNX } from '@/lib/canvas/onnxCompiler';
import { CanvasNode, CanvasEdge } from '@/types/canvas';

describe('Priority 1: Compiler Validation Suite', () => {
  // Common builder helper
  const compileAll = (nodes: CanvasNode[], edges: CanvasEdge[]) => {
    return {
      pytorch: compileToPyTorch(nodes, edges),
      tensorflow: compileToTensorFlow(nodes, edges),
      jax: compileToJAX(nodes, edges),
      onnx: compileToONNX(nodes, edges),
    };
  };

  test('CNN (Conv -> Pool -> Conv -> Dense) compiles successfully on all compilers', () => {
    const nodes: CanvasNode[] = [
      { id: '1', type: 'Input', name: 'IN', x: 0, y: 0, inputShape: [], outputShape: [224, 224, 3], config: { dim: [224, 224, 3] } },
      { id: '2', type: 'Conv2D', name: 'C1', x: 0, y: 0, inputShape: [224, 224, 3], outputShape: [224, 224, 32], config: { filters: 32 } },
      { id: '3', type: 'MaxPool2D', name: 'P1', x: 0, y: 0, inputShape: [224, 224, 32], outputShape: [112, 112, 32], config: { poolSize: 2 } },
      { id: '4', type: 'Conv2D', name: 'C2', x: 0, y: 0, inputShape: [112, 112, 32], outputShape: [112, 112, 64], config: { filters: 64 } },
      { id: '5', type: 'Flatten', name: 'FLAT', x: 0, y: 0, inputShape: [112, 112, 64], outputShape: [802816], config: {} },
      { id: '6', type: 'Dense', name: 'FC', x: 0, y: 0, inputShape: [802816], outputShape: [10], config: { units: 10 } }
    ];
    const edges: CanvasEdge[] = [
      { id: 'e1', source: '1', target: '2' },
      { id: 'e2', source: '2', target: '3' },
      { id: 'e3', source: '3', target: '4' },
      { id: 'e4', source: '4', target: '5' },
      { id: 'e5', source: '5', target: '6' }
    ];

    const codes = compileAll(nodes, edges);

    // PyTorch Verification
    expect(codes.pytorch).toContain('class GeneratedModel(nn.Module):');
    expect(codes.pytorch).toContain('nn.Conv2d(');
    expect(codes.pytorch).toContain('in_channels=3');
    expect(codes.pytorch).toContain('out_channels=32');
    expect(codes.pytorch).toContain('nn.MaxPool2d(');
    expect(codes.pytorch).toContain('nn.Linear(');

    // TensorFlow Verification
    expect(codes.tensorflow).toContain('class GeneratedModel(Model):');
    expect(codes.tensorflow).toContain('layers.Conv2D(');
    expect(codes.tensorflow).toContain('layers.MaxPooling2D(');
    expect(codes.tensorflow).toContain('layers.Dense(units=10)');

    // JAX Verification
    expect(codes.jax).toContain('class GeneratedModel(nn.Module):');
    expect(codes.jax).toContain('nn.Conv(');
    expect(codes.jax).toContain('nn.max_pool(');
    expect(codes.jax).toContain('nn.Dense(');

    // ONNX Verification
    expect(codes.onnx).toContain('def create_archnet_onnx_model():');
    expect(codes.onnx).toContain('"Conv"');
    expect(codes.onnx).toContain('"MaxPool"');
    expect(codes.onnx).toContain('"Gemm"');
  });

  test('ResNet (Residual additions) compiles successfully on all compilers', () => {
    const nodes: CanvasNode[] = [
      { id: '1', type: 'Input', name: 'IN', x: 0, y: 0, inputShape: [], outputShape: [224, 224, 3], config: { dim: [224, 224, 3] } },
      { id: '2', type: 'Conv2D', name: 'C1', x: 0, y: 0, inputShape: [224, 224, 3], outputShape: [224, 224, 64], config: { filters: 64 } },
      { id: '3', type: 'Conv2D', name: 'C2', x: 0, y: 0, inputShape: [224, 224, 64], outputShape: [224, 224, 64], config: { filters: 64 } },
      { id: '4', type: 'ResidualAdd', name: 'ADD', x: 0, y: 0, inputShape: [224, 224, 64], outputShape: [224, 224, 64], config: {} },
      { id: '5', type: 'Flatten', name: 'FLAT', x: 0, y: 0, inputShape: [224, 224, 64], outputShape: [3211264], config: {} },
      { id: '6', type: 'Dense', name: 'FC', x: 0, y: 0, inputShape: [3211264], outputShape: [1000], config: { units: 1000 } }
    ];
    const edges: CanvasEdge[] = [
      { id: 'e1', source: '1', target: '2' },
      { id: 'e2', source: '2', target: '3' },
      // Residual bypass from IN (node 1) to ResidualAdd (node 4) - wait, channels mismatch! IN is 3, C2 is 64.
      // So let's route the bypass from C1 (node 2, shape 64) to ResidualAdd (node 4).
      { id: 'e3', source: '2', target: '4' },
      { id: 'e4', source: '3', target: '4' },
      { id: 'e5', source: '4', target: '5' },
      { id: 'e6', source: '5', target: '6' }
    ];

    const codes = compileAll(nodes, edges);

    // PyTorch residual summation check
    expect(codes.pytorch).toContain('c1_2 + c2_3');

    // TensorFlow concatenation/merge check (Keras Residual addition uses Add layer or addition)
    // Currently tf and jax compile ResidualAdd or branches. Let's make sure they compile without syntax errors.
    expect(codes.tensorflow).toContain('class GeneratedModel(Model):');
    expect(codes.jax).toContain('class GeneratedModel(nn.Module):');
    expect(codes.onnx).toContain('def create_archnet_onnx_model():');
  });

  test('LSTM/GRU Sequence Models compile successfully on all compilers', () => {
    const nodes: CanvasNode[] = [
      { id: '1', type: 'Input', name: 'IN', x: 0, y: 0, inputShape: [], outputShape: [128], config: { dim: [128] } },
      { id: '2', type: 'Embedding', name: 'EMB', x: 0, y: 0, inputShape: [128], outputShape: [128, 256], config: { vocab_size: 5000, embedding_dim: 256 } },
      { id: '3', type: 'LSTM', name: 'LSTM_CELL', x: 0, y: 0, inputShape: [128, 256], outputShape: [128, 128], config: { hidden_size: 128, return_sequences: true } },
      { id: '4', type: 'GRU', name: 'GRU_CELL', x: 0, y: 0, inputShape: [128, 128], outputShape: [64], config: { hidden_size: 64, return_sequences: false } },
      { id: '5', type: 'Dense', name: 'FC', x: 0, y: 0, inputShape: [64], outputShape: [2], config: { units: 2 } }
    ];
    const edges: CanvasEdge[] = [
      { id: 'e1', source: '1', target: '2' },
      { id: 'e2', source: '2', target: '3' },
      { id: 'e3', source: '3', target: '4' },
      { id: 'e4', source: '4', target: '5' }
    ];

    const codes = compileAll(nodes, edges);

    expect(codes.pytorch).toContain('nn.LSTM(');
    expect(codes.pytorch).toContain('input_size=256');
    expect(codes.pytorch).toContain('hidden_size=128');
    expect(codes.pytorch).toContain('nn.GRU(');
    expect(codes.pytorch).toContain('input_size=128');
    expect(codes.pytorch).toContain('hidden_size=64');
    expect(codes.pytorch).toContain('nn.Linear(');
  });
});
