import { computeNodeOutputShape } from '@/store/canvasStore';
import { NodeConfig } from '@/types/canvas';

describe('Shape Solver Verification Tests', () => {
  describe('Dynamic Image Sizes', () => {
    test('Conv2D propagates dynamic width and height shapes correctly', () => {
      const input = [512, 512, 3];
      const config: NodeConfig = { filters: 128, kernelSize: 5, stride: 2, padding: 'valid' };
      // (512 - 5)/2 + 1 = 254.5 -> floor -> 254
      const output = computeNodeOutputShape('Conv2D', input, config);
      expect(output).toEqual([254, 254, 128]);
    });

    test('MaxPool2D downsamples dynamic grid inputs correctly', () => {
      const input = [254, 254, 128];
      const config: NodeConfig = { poolSize: 3 };
      // floor(254 / 3) = 84
      const output = computeNodeOutputShape('MaxPool2D', input, config);
      expect(output).toEqual([84, 84, 128]);
    });

    test('Flatten calculates dynamic flattened vector size correctly', () => {
      const input = [84, 84, 128];
      const output = computeNodeOutputShape('Flatten', input, {});
      expect(output).toEqual([84 * 84 * 128]);
    });
  });

  describe('Dynamic Sequence Lengths & NLP layers', () => {
    test('Embedding adds embedding dimension to sequence lengths', () => {
      const input = [128]; // sequence length
      const config: NodeConfig = { embedding_dim: 256 };
      const output = computeNodeOutputShape('Embedding', input, config);
      expect(output).toEqual([128, 256]);
    });

    test('TransformerBlock preserves sequence and embedding dimensions', () => {
      const input = [128, 256];
      const config: NodeConfig = { num_heads: 8, embed_dim: 256 };
      const output = computeNodeOutputShape('TransformerBlock', input, config);
      expect(output).toEqual([128, 256]);
    });

    test('LSTM propagates hidden dimensions with return_sequences true', () => {
      const input = [128, 256];
      const config: NodeConfig = { hidden_size: 512, return_sequences: true };
      const output = computeNodeOutputShape('LSTM', input, config);
      expect(output).toEqual([128, 512]);
    });

    test('LSTM collapses sequence dimension when return_sequences is false', () => {
      const input = [128, 256];
      const config: NodeConfig = { hidden_size: 512, return_sequences: false };
      const output = computeNodeOutputShape('LSTM', input, config);
      expect(output).toEqual([512]);
    });

    test('BiLSTM output channels are doubled compared to hidden dimension size', () => {
      const input = [128, 256];
      const config: NodeConfig = { hidden_size: 256, return_sequences: true };
      const output = computeNodeOutputShape('BiLSTM', input, config);
      expect(output).toEqual([128, 512]); // 2 * hidden_size
    });
  });

  describe('Residual and Broadcasting Operations', () => {
    test('ResidualAdd output matches its first parent shape', () => {
      const input = [112, 112, 64];
      const output = computeNodeOutputShape('ResidualAdd', input, {});
      expect(output).toEqual([112, 112, 64]);
    });

    test('GraphSAGE preserves number of nodes and outputs out_features dimension', () => {
      const input = [1000, 128]; // [Nodes, Features]
      const config: NodeConfig = { out_features: 64 };
      const output = computeNodeOutputShape('GraphSAGE', input, config);
      expect(output).toEqual([1000, 64]);
    });
  });
});
