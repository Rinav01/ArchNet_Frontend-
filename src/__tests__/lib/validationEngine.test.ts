import { computeNodeOutputShape } from '@/store/canvasStore';
import { validateGraph } from '@/lib/canvas/validationEngine';
import { CanvasNode } from '@/types/canvas';

describe('Topological Shape Solver & Validation Engine Tests', () => {
  describe('computeNodeOutputShape Calculations', () => {
    test('Conv2D outputs same shape for SAME padding', () => {
      const input = [224, 224, 3];
      const config = { filters: 64, kernelSize: 3, stride: 1, padding: 'same' as const };
      const output = computeNodeOutputShape('Conv2D', input, config);
      expect(output).toEqual([224, 224, 64]);
    });

    test('Conv2D scales down grid size for VALID padding and stride', () => {
      const input = [224, 224, 3];
      const config = { filters: 64, kernelSize: 3, stride: 2, padding: 'valid' as const };
      // (224 - 3)/2 + 1 = 111.5 -> floor -> 111
      const output = computeNodeOutputShape('Conv2D', input, config);
      expect(output).toEqual([111, 111, 64]);
    });

    test('MaxPool2D downsamples grid size', () => {
      const input = [112, 112, 64];
      const config = { poolSize: 2 };
      const output = computeNodeOutputShape('MaxPool2D', input, config);
      expect(output).toEqual([56, 56, 64]);
    });

    test('Flatten collapses all spatial dimensions', () => {
      const input = [7, 7, 512];
      const config = {};
      const output = computeNodeOutputShape('Flatten', input, config);
      expect(output).toEqual([7 * 7 * 512]);
    });

    test('Dense outputs configured projection units', () => {
      const input = [25088];
      const config = { units: 10 };
      const output = computeNodeOutputShape('Dense', input, config);
      expect(output).toEqual([10]);
    });
  });

  describe('validateGraph Diagnostic Rules', () => {
    test('should detect loop cycles (DFS cycles)', () => {
      const nodes: CanvasNode[] = [
        { id: '1', type: 'Input', name: 'IN', x: 0, y: 0, inputShape: [], outputShape: [224, 224, 3], config: {} },
        { id: '2', type: 'Conv2D', name: 'CONV', x: 0, y: 0, inputShape: [], outputShape: [], config: {} }
      ];
      const edges = [
        { id: 'e1', source: '1', target: '2' },
        { id: 'e2', source: '2', target: '1' } // cycle back to 1
      ];

      const errors = validateGraph(nodes, edges);
      const cycleErr = errors.find(e => e.category === 'cycle');
      expect(cycleErr).toBeDefined();
      expect(cycleErr?.type).toBe('error');
    });

    test('should identify disconnected components from main input path', () => {
      const nodes: CanvasNode[] = [
        { id: '1', type: 'Input', name: 'IN', x: 0, y: 0, inputShape: [], outputShape: [224, 224, 3], config: {} },
        { id: '2', type: 'Conv2D', name: 'CONV', x: 0, y: 0, inputShape: [], outputShape: [], config: {} },
        { id: '3', type: 'Dense', name: 'DENSE', x: 0, y: 0, inputShape: [], outputShape: [], config: {} }
      ];
      const edges = [
        { id: 'e1', source: '1', target: '2' }
        // Node 3 is completely disconnected
      ];

      const errors = validateGraph(nodes, edges);
      const disconnectedErr = errors.find(e => e.nodeId === '3' && e.category === 'disconnected');
      expect(disconnectedErr).toBeDefined();
      expect(disconnectedErr?.type).toBe('warning');
    });

    test('should trigger rank error if Dense receives multi-dimensional input without Flatten', () => {
      const nodes: CanvasNode[] = [
        { id: '1', type: 'Input', name: 'IN', x: 0, y: 0, inputShape: [], outputShape: [224, 224, 3], config: {} },
        { id: '2', type: 'Dense', name: 'FC', x: 0, y: 0, inputShape: [224, 224, 3], outputShape: [], config: { units: 10 } }
      ];
      const edges = [
        { id: 'e1', source: '1', target: '2' }
      ];

      const errors = validateGraph(nodes, edges);
      const rankErr = errors.find(e => e.nodeId === '2' && e.category === 'rank');
      expect(rankErr).toBeDefined();
      expect(rankErr?.message).toContain("expects 1D flattened input");
    });

    test('should validate ResidualAdd input broadcasting compatibility', () => {
      const nodes: CanvasNode[] = [
        { id: '1', type: 'Input', name: 'IN', x: 0, y: 0, inputShape: [], outputShape: [224, 224, 3], config: {} },
        { id: '2', type: 'Conv2D', name: 'CONV1', x: 0, y: 0, inputShape: [224, 224, 3], outputShape: [224, 224, 64], config: {} },
        { id: '3', type: 'Conv2D', name: 'CONV2', x: 0, y: 0, inputShape: [224, 224, 3], outputShape: [112, 112, 64], config: {} },
        { id: '4', type: 'ResidualAdd', name: 'ADD', x: 0, y: 0, inputShape: [], outputShape: [], config: {} }
      ];
      const edges = [
        { id: 'e1', source: '2', target: '4' },
        { id: 'e2', source: '3', target: '4' }
      ];

      const errors = validateGraph(nodes, edges);
      const broadcastErr = errors.find(e => e.nodeId === '4' && e.category === 'broadcast');
      expect(broadcastErr).toBeDefined();
      expect(broadcastErr?.message).toContain("ResidualAdd expected matching shapes but received mismatched inputs");
    });

    test('should trigger fatal error for unsupported layer types', () => {
      const nodes: CanvasNode[] = [
        { id: '1', type: 'Input', name: 'IN', x: 0, y: 0, inputShape: [], outputShape: [224, 224, 3], config: {} },
        { id: '2', type: 'LSTM' as any, name: 'LSTM_LAYER', x: 0, y: 0, inputShape: [], outputShape: [], config: {} }
      ];
      const edges = [
        { id: 'e1', source: '1', target: '2' }
      ];
      const errors = validateGraph(nodes, edges);
      const unsupportedErr = errors.find(e => e.nodeId === '2' && e.category === 'compatibility');
      expect(unsupportedErr).toBeDefined();
      expect(unsupportedErr?.severity).toBe('fatal');
      expect(unsupportedErr?.message).toContain("Unsupported layer type 'LSTM' detected at node '2'");
    });

    test('should trigger fatal error when graph lacks an Input layer', () => {
      const nodes: CanvasNode[] = [
        { id: '2', type: 'Conv2D', name: 'CONV', x: 0, y: 0, inputShape: [], outputShape: [], config: {} }
      ];
      const edges: any[] = [];
      const errors = validateGraph(nodes, edges);
      const inputErr = errors.find(e => e.category === 'compilation' && e.message.includes('Input layer'));
      expect(inputErr).toBeDefined();
      expect(inputErr?.severity).toBe('fatal');
    });

    test('should trigger fatal error when graph lacks a terminal node', () => {
      const nodes: CanvasNode[] = [
        { id: '1', type: 'Input', name: 'IN', x: 0, y: 0, inputShape: [], outputShape: [224, 224, 3], config: {} },
        { id: '2', type: 'Conv2D', name: 'CONV', x: 0, y: 0, inputShape: [], outputShape: [], config: {} }
      ];
      // Circular connections mean there is no node with 0 outgoing edges
      const edges = [
        { id: 'e1', source: '1', target: '2' },
        { id: 'e2', source: '2', target: '1' }
      ];
      const errors = validateGraph(nodes, edges);
      const terminalErr = errors.find(e => e.category === 'compilation' && e.message.includes('terminal node'));
      expect(terminalErr).toBeDefined();
      expect(terminalErr?.severity).toBe('fatal');
    });

    test('should trigger fatal error when ResidualAdd does not have exactly 2 parents', () => {
      const nodes: CanvasNode[] = [
        { id: '1', type: 'Input', name: 'IN', x: 0, y: 0, inputShape: [], outputShape: [224, 224, 3], config: {} },
        { id: '2', type: 'ResidualAdd', name: 'ADD', x: 0, y: 0, inputShape: [], outputShape: [], config: {} }
      ];
      const edges = [
        { id: 'e1', source: '1', target: '2' }
      ];
      const errors = validateGraph(nodes, edges);
      const addCountErr = errors.find(e => e.nodeId === '2' && e.category === 'broadcast');
      expect(addCountErr).toBeDefined();
      expect(addCountErr?.severity).toBe('fatal');
      expect(addCountErr?.message).toContain("ResidualAdd must have exactly 2 incoming connections");
    });
  });
});
