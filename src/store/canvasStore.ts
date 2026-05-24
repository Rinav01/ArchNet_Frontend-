import { create } from 'zustand';
import { CanvasNode, CanvasEdge, LogItem, NodeType, NodeConfig } from '@/types/canvas';

interface CanvasState {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  selectedNodeId: string | null;
  zoom: number;
  pan: { x: number; y: number };
  
  // Visual/Connecting State
  isConnecting: boolean;
  connectingSourceId: string | null;
  
  // Console / Logs State
  logs: LogItem[];
  
  // Animation State
  isPlayingAnimation: boolean;
  activeAnimationNodeId: string | null;
  activeAnimationEdgeId: string | null;
  
  // Core Actions
  addNode: (type: NodeType, x: number, y: number) => void;
  removeNode: (id: string) => void;
  updateNodeConfig: (id: string, config: Partial<NodeConfig>) => void;
  updateNodeName: (id: string, name: string) => void;
  addEdge: (sourceId: string, targetId: string) => void;
  removeEdge: (id: string) => void;
  setSelectedNodeId: (id: string | null) => void;
  setZoom: (zoom: number | ((prev: number) => number)) => void;
  setPan: (pan: { x: number; y: number } | ((prev: { x: number; y: number }) => { x: number; y: number })) => void;
  
  // Log Actions
  addLog: (type: LogItem['type'], text: string) => void;
  clearLogs: () => void;
  
  // Interactive Flow Actions
  runForwardPass: () => Promise<void>;
  recalculateShapes: () => void;
}

// Initial setup nodes mimicking Image 2 (ResNet-Mini initial structure)
const initialNodes: CanvasNode[] = [
  {
    id: 'input_1',
    type: 'Input',
    name: 'INPUT_1',
    x: 200,
    y: 180,
    inputShape: [],
    outputShape: [224, 224, 3],
    config: { dim: [224, 224, 3] },
  },
  {
    id: 'conv2d_base',
    type: 'Conv2D',
    name: 'CONV2D_BASE',
    x: 450,
    y: 250,
    inputShape: [224, 224, 3],
    outputShape: [224, 224, 64],
    config: { filters: 64, kernelSize: 3, stride: 1, padding: 'same', activation: 'ReLU' },
  },
  {
    id: 'maxpool2d_1',
    type: 'MaxPool2D',
    name: 'MAXPOOL2D_1',
    x: 720,
    y: 190,
    inputShape: [224, 224, 64],
    outputShape: [112, 112, 64],
    config: { poolSize: 2, stride: 2 },
  },
  {
    id: 'relu_1',
    type: 'Dense',
    name: 'RELU_1',
    x: 720,
    y: 320,
    inputShape: [224, 224, 64],
    outputShape: [100],
    config: { units: 100 },
  }
];

const initialEdges: CanvasEdge[] = [
  { id: 'edge_1', source: 'input_1', target: 'conv2d_base' },
  { id: 'edge_2', source: 'conv2d_base', target: 'maxpool2d_1' },
  { id: 'edge_3', source: 'conv2d_base', target: 'relu_1' },
];

const initialLogs: LogItem[] = [
  { id: '1', timestamp: '14:22:01', type: 'info', text: 'Graph initialized.' },
  { id: '2', timestamp: '14:22:03', type: 'info', text: 'Validating ResNet-Mini architecture...' },
  { id: '3', timestamp: '14:22:05', type: 'success', text: 'DAG Validation: Successful' },
  { id: '4', timestamp: '14:22:06', type: 'info', text: 'Ready for code generation' },
];

export const useCanvasStore = create<CanvasState>((set, get) => {
  // Topological sort helper for animations and shape propagation
  const getTopologicalOrder = (nodes: CanvasNode[], edges: CanvasEdge[]): CanvasNode[] => {
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
    
    // Fallback if there is a cycle or isolated nodes
    const orderedNodes = order.map(id => nodes.find(n => n.id === id)!).filter(Boolean);
    const remainingNodes = nodes.filter(n => !order.includes(n.id));
    return [...orderedNodes, ...remainingNodes];
  };

  const computeNodeOutputShape = (type: NodeType, inputShape: number[], config: NodeConfig): number[] => {
    if (type === 'Input') {
      return config.dim || [224, 224, 3];
    }
    if (inputShape.length === 0) {
      return [];
    }

    if (type === 'Conv2D') {
      // Input shape H, W, C
      const [H, W] = inputShape;
      const filters = config.filters || 64;
      const kernelSize = config.kernelSize || 3;
      const stride = config.stride || 1;
      const padding = config.padding || 'same';

      if (padding === 'same') {
        return [H, W, filters];
      } else {
        const outH = Math.max(1, Math.floor((H - kernelSize) / stride) + 1);
        const outW = Math.max(1, Math.floor((W - kernelSize) / stride) + 1);
        return [outH, outW, filters];
      }
    }

    if (type === 'MaxPool2D') {
      if (inputShape.length < 3) return inputShape;
      const [H, W, C] = inputShape;
      const poolSize = config.poolSize || 2;
      const stride = config.stride || 2;
      const outH = Math.max(1, Math.floor(H / poolSize));
      const outW = Math.max(1, Math.floor(W / poolSize));
      return [outH, outW, C];
    }

    if (type === 'Flatten') {
      const size = inputShape.reduce((acc, val) => acc * val, 1);
      return [size];
    }

    if (type === 'Dense') {
      const units = config.units || 10;
      return [units];
    }

    return inputShape;
  };

  const getFormattedTime = () => {
    const now = new Date();
    return now.toTimeString().split(' ')[0];
  };

  return {
    nodes: initialNodes,
    edges: initialEdges,
    selectedNodeId: null,
    zoom: 1,
    pan: { x: 0, y: 0 },
    isConnecting: false,
    connectingSourceId: null,
    logs: initialLogs,
    isPlayingAnimation: false,
    activeAnimationNodeId: null,
    activeAnimationEdgeId: null,

    addNode: (type, x, y) => set((state) => {
      const count = state.nodes.filter(n => n.type === type).length + 1;
      const id = `${type.toLowerCase()}_${count}_${Math.random().toString(36).substr(2, 4)}`;
      const name = `${type.toUpperCase()}_${count}`;
      
      let config: NodeConfig = {};
      let inputShape: number[] = [];
      let outputShape: number[] = [];

      if (type === 'Input') {
        config = { dim: [224, 224, 3] };
        outputShape = [224, 224, 3];
      } else if (type === 'Conv2D') {
        config = { filters: 64, kernelSize: 3, stride: 1, padding: 'same', activation: 'ReLU' };
      } else if (type === 'MaxPool2D') {
        config = { poolSize: 2, stride: 2 };
      } else if (type === 'Flatten') {
        config = {};
      } else if (type === 'Dense') {
        config = { units: 10 };
      }

      const newNode: CanvasNode = {
        id,
        type,
        name,
        x,
        y,
        inputShape,
        outputShape,
        config,
      };

      const updatedNodes = [...state.nodes, newNode];
      
      const time = getFormattedTime();
      const log: LogItem = {
        id: Math.random().toString(),
        timestamp: time,
        type: 'info',
        text: `Added visual block: ${name}`,
      };

      setTimeout(() => get().recalculateShapes(), 50);

      return {
        nodes: updatedNodes,
        logs: [...state.logs, log],
        selectedNodeId: id,
      };
    }),

    removeNode: (id) => set((state) => {
      const nodeToRemove = state.nodes.find(n => n.id === id);
      if (!nodeToRemove) return {};

      const updatedNodes = state.nodes.filter(n => n.id !== id);
      const updatedEdges = state.edges.filter(e => e.source !== id && e.target !== id);

      const time = getFormattedTime();
      const log: LogItem = {
        id: Math.random().toString(),
        timestamp: time,
        type: 'warning',
        text: `Removed block: ${nodeToRemove.name}`,
      };

      setTimeout(() => get().recalculateShapes(), 50);

      return {
        nodes: updatedNodes,
        edges: updatedEdges,
        selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
        logs: [...state.logs, log],
      };
    }),

    updateNodeConfig: (id, newConfig) => set((state) => {
      const updatedNodes = state.nodes.map((n) => {
        if (n.id === id) {
          const config = { ...n.config, ...newConfig };
          return { ...n, config };
        }
        return n;
      });

      setTimeout(() => get().recalculateShapes(), 50);

      return { nodes: updatedNodes };
    }),

    updateNodeName: (id, name) => set((state) => ({
      nodes: state.nodes.map((n) => n.id === id ? { ...n, name: name.toUpperCase() } : n),
    })),

    addEdge: (sourceId, targetId) => set((state) => {
      // Avoid duplicate edges
      const edgeExists = state.edges.some(e => e.source === sourceId && e.target === targetId);
      const isSelfConnection = sourceId === targetId;

      if (edgeExists || isSelfConnection) return {};

      const edgeId = `edge_${Math.random().toString(36).substr(2, 9)}`;
      const newEdge: CanvasEdge = { id: edgeId, source: sourceId, target: targetId };

      const time = getFormattedTime();
      const srcNode = state.nodes.find(n => n.id === sourceId);
      const trgNode = state.nodes.find(n => n.id === targetId);
      
      const log: LogItem = {
        id: Math.random().toString(),
        timestamp: time,
        type: 'success',
        text: `Connected output of ${srcNode?.name || sourceId} to input of ${trgNode?.name || targetId}`,
      };

      setTimeout(() => get().recalculateShapes(), 50);

      return {
        edges: [...state.edges, newEdge],
        logs: [...state.logs, log],
      };
    }),

    removeEdge: (id) => set((state) => {
      const updatedEdges = state.edges.filter(e => e.id !== id);

      const time = getFormattedTime();
      const log: LogItem = {
        id: Math.random().toString(),
        timestamp: time,
        type: 'warning',
        text: `Disconnected tensor edge connection`,
      };

      setTimeout(() => get().recalculateShapes(), 50);

      return {
        edges: updatedEdges,
        logs: [...state.logs, log],
      };
    }),

    setSelectedNodeId: (id) => set({ selectedNodeId: id }),

    setZoom: (zoomUpdate) => set((state) => {
      const nextZoom = typeof zoomUpdate === 'function' ? zoomUpdate(state.zoom) : zoomUpdate;
      return { zoom: Math.min(2, Math.max(0.2, nextZoom)) };
    }),

    setPan: (panUpdate) => set((state) => {
      const nextPan = typeof panUpdate === 'function' ? panUpdate(state.pan) : panUpdate;
      return { pan: nextPan };
    }),

    addLog: (type, text) => set((state) => ({
      logs: [...state.logs, {
        id: Math.random().toString(),
        timestamp: getFormattedTime(),
        type,
        text,
      }],
    })),

    clearLogs: () => set({ logs: [] }),

    recalculateShapes: () => set((state) => {
      const orderedNodes = getTopologicalOrder(state.nodes, state.edges);
      const shapesMap = new Map<string, number[]>(); // nodeId -> outputShape

      const computedNodes = state.nodes.map(n => {
        // Find inputs
        const incomingEdges = state.edges.filter(e => e.target === n.id);
        let inputShape: number[] = [];

        if (incomingEdges.length > 0) {
          // Take the output shape of the first incoming edge's source
          const parentId = incomingEdges[0].source;
          const parentOutputShape = shapesMap.get(parentId);
          if (parentOutputShape) {
            inputShape = parentOutputShape;
          }
        }

        const outputShape = computeNodeOutputShape(n.type, inputShape, n.config);
        shapesMap.set(n.id, outputShape);

        return {
          ...n,
          inputShape,
          outputShape,
        };
      });

      // Check if DAG has a cycle
      const visited = new Set<string>();
      const recStack = new Set<string>();
      let hasCycle = false;

      const hasCycleDFS = (u: string): boolean => {
        visited.add(u);
        recStack.add(u);

        const neighbors = state.edges.filter(e => e.source === u).map(e => e.target);
        for (const v of neighbors) {
          if (!visited.has(v)) {
            if (hasCycleDFS(v)) return true;
          } else if (recStack.has(v)) {
            return true;
          }
        }

        recStack.delete(u);
        return false;
      };

      state.nodes.forEach(n => {
        if (!visited.has(n.id)) {
          if (hasCycleDFS(n.id)) {
            hasCycle = true;
          }
        }
      });

      const updatedLogs = [...state.logs];
      if (hasCycle) {
        const time = getFormattedTime();
        updatedLogs.push({
          id: Math.random().toString(),
          timestamp: time,
          type: 'error',
          text: 'DAG loop validation failed: Cyclic connections detected in model architecture!',
        });
      }

      return {
        nodes: computedNodes,
        logs: updatedLogs,
      };
    }),

    runForwardPass: async () => {
      const state = get();
      if (state.isPlayingAnimation) return;

      set({ isPlayingAnimation: true });
      state.addLog('info', 'Executing visual neural forward pass...');

      const order = getTopologicalOrder(state.nodes, state.edges);
      
      for (let i = 0; i < order.length; i++) {
        const node = order[i];
        
        // Highlight Node
        set({ activeAnimationNodeId: node.id });
        state.addLog('info', `Forward-pass: Activated ${node.name} [Shape: [${node.outputShape.join(', ')}]]`);
        await new Promise(resolve => setTimeout(resolve, 600));

        // Find edge leaving this node
        const outgoingEdge = state.edges.find(e => e.source === node.id);
        if (outgoingEdge && i < order.length - 1) {
          set({ activeAnimationEdgeId: outgoingEdge.id });
          await new Promise(resolve => setTimeout(resolve, 450));
          set({ activeAnimationEdgeId: null });
        }
      }

      set({
        isPlayingAnimation: false,
        activeAnimationNodeId: null,
        activeAnimationEdgeId: null,
      });

      state.addLog('success', 'Forward pass simulation completed: Outputs calculated for all active layers.');
    },
  };
});
