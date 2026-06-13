import { create } from 'zustand';
import { CanvasNode, CanvasEdge, LogItem, NodeType, NodeConfig, ValidationError, CompilationResult, GraphOperation, Collaborator, TrainingJob, CanvasNodeGroup, ModelCheckpoint, CustomBlock } from '@/types/canvas';
import dagre from 'dagre';
import { toast } from './notificationStore';
import { 
  graphqlRequest, 
  ADD_NODE, 
  ADD_EDGE, 
  DELETE_NODE, 
  DELETE_EDGE, 
  GET_PROJECT_DETAILS,
  VALIDATE_PROJECT_COMPILATION,
  TRIGGER_TRAINING_JOB,
  GET_TRAINING_JOB,
  GET_DATASETS
} from '@/lib/graphql/client';
import { useProjectStore } from './projectStore';


let compilationTimeout: NodeJS.Timeout | null = null;
let heartbeatInterval: NodeJS.Timeout | null = null;
let reconnectTimeout: NodeJS.Timeout | null = null;
let trainingInterval: NodeJS.Timeout | null = null;
let hardwareFluctuationInterval: NodeJS.Timeout | null = null;
let autoSaveTimeout: NodeJS.Timeout | null = null;

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
  activeAnimationEdgeIds: string[];

  // Validation & Sandbox State
  validationErrors: ValidationError[];
  compilationResult: CompilationResult | null;
  isValidating: boolean;

  // History / Undo / Redo Engine State
  undoStack: GraphOperation[];
  redoStack: GraphOperation[];
  isApplyingUndoRedo: boolean;

  // Collaboration State
  ws: WebSocket | null;
  clientId: string | null;
  myUserId: string | null;
  myUsername: string | null;
  collaborators: Record<string, Collaborator>;
  syncStatus: 'disconnected' | 'connecting' | 'connected';
  
  // Core Actions
  loadGraph: (projectId: string) => Promise<void>;
  addNode: (type: NodeType, x: number, y: number, presetId?: string, isRemote?: boolean) => Promise<string | undefined>;
  removeNode: (id: string, isUndoRedo?: boolean, isRemote?: boolean) => Promise<void>;
  updateNodeConfig: (id: string, config: Partial<NodeConfig>, isUndoRedo?: boolean, isRemote?: boolean) => void;
  updateNodeName: (id: string, name: string, isUndoRedo?: boolean, isRemote?: boolean) => void;
  addEdge: (sourceId: string, targetId: string, presetId?: string, isRemote?: boolean) => Promise<void>;
  removeEdge: (id: string, isUndoRedo?: boolean, isRemote?: boolean) => Promise<void>;
  moveNode: (id: string, x: number, y: number, isUndoRedo?: boolean, isRemote?: boolean) => void;
  setSelectedNodeId: (id: string | null) => void;
  setZoom: (zoom: number | ((prev: number) => number)) => void;
  setPan: (pan: { x: number; y: number } | ((prev: { x: number; y: number }) => { x: number; y: number })) => void;
  
  // Log Actions
  addLog: (type: LogItem['type'], text: string) => void;
  clearLogs: () => void;
  
  // Interactive Flow Actions
  runForwardPass: () => Promise<void>;
  recalculateShapes: () => void;
  triggerCompilation: () => Promise<void>;
  showStatsOverlay: boolean;
  toggleStatsOverlay: () => void;

  // History Actions
  pushOperation: (op: Omit<GraphOperation, 'id'>) => void;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  clearHistory: () => void;

  // Collaboration Actions
  connectCollaboration: (projectId: string) => void;
  disconnectCollaboration: () => void;
  sendCursorPosition: (x: number, y: number) => void;
  sendSelection: (nodeId: string | null) => void;

  // Training & Telemetry State
  trainingJob: TrainingJob | null;
  isTrainingLoading: boolean;
  trainingProvider: 'local' | 'vertex';
  trainingEpochs: number;
  datasets: any[];
  
  // Training Actions
  setTrainingProvider: (provider: 'local' | 'vertex') => void;
  setTrainingEpochs: (epochs: number) => void;
  loadDatasets: () => Promise<void>;
  startTraining: (datasetId?: string | null) => Promise<void>;
  pauseTraining: () => void;
  stopTraining: () => void;
  trainingBatchSize: number;
  trainingLearningRate: number;
  trainingOptimizer: 'Adam' | 'SGD' | 'RMSprop' | 'AdamW';
  trainingScheduler: 'None' | 'StepLR' | 'CosineAnnealing' | 'ReduceLROnPlateau';
  setTrainingBatchSize: (size: number) => void;
  setTrainingLearningRate: (lr: number) => void;
  setTrainingOptimizer: (opt: 'Adam' | 'SGD' | 'RMSprop' | 'AdamW') => void;
  setTrainingScheduler: (sched: 'None' | 'StepLR' | 'CosineAnnealing' | 'ReduceLROnPlateau') => void;
  restartTraining: (datasetId?: string | null) => Promise<void>;

  // Advanced Graph Editing UX State
  selectedNodeIds: string[];
  nodeGroups: CanvasNodeGroup[];

  // Advanced Graph Editing UX Actions
  setSelectedNodeIds: (ids: string[]) => void;
  addNodeGroup: (name: string, nodeIds: string[]) => void;
  removeNodeGroup: (groupId: string) => void;
  toggleGroupCollapse: (groupId: string) => void;
  alignSelectedNodes: (alignment: 'top' | 'left' | 'distribute-h' | 'distribute-v') => void;
  batchMoveNodes: (nodePositions: { id: string; x: number; y: number }[]) => void;

  // Model Versioning & Auto-saving State
  draftSavedStatus: 'idle' | 'saving' | 'saved' | 'error';
  checkpoints: ModelCheckpoint[];

  // Model Versioning Actions
  triggerAutoSave: () => void;
  saveCheckpoint: (name: string) => void;
  restoreCheckpoint: (checkpointId: string) => void;
  deleteCheckpoint: (checkpointId: string) => void;
  loadCheckpoints: (projectId: string) => void;

  // Reusable Custom Blocks State & Actions
  customBlocks: CustomBlock[];
  saveCustomBlock: (name: string, nodeIds: string[]) => void;
  spawnCustomBlock: (blockId: string, targetX: number, targetY: number) => void;
  deleteCustomBlock: (blockId: string) => void;
  loadCustomBlocks: () => void;

  // Auto-Layout Suggester Engine Actions
  triggerAutoLayout: () => void;
  loadPrebuiltTemplate: (templateName: string) => Promise<void>;

  // Admin Allocations State & Actions
  clusterPriority: 'High' | 'Medium' | 'Low';
  gpuThrottleLimit: number;
  setClusterPriority: (priority: 'High' | 'Medium' | 'Low') => void;
  setGpuThrottleLimit: (limit: number) => void;

  // Jump-to-node Visual Highlight State & Action
  highlightedNodeId: string | null;
  setHighlightedNodeId: (id: string | null) => void;
  heatmapMode: 'none' | 'flops' | 'memory' | 'latency';
  setHeatmapMode: (mode: 'none' | 'flops' | 'memory' | 'latency') => void;
}



export const getTopologicalOrder = (nodes: CanvasNode[], edges: CanvasEdge[]): CanvasNode[] => {
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
    
    const orderedNodes = order.map(id => nodes.find(n => n.id === id)!).filter(Boolean);
    const remainingNodes = nodes.filter(n => !order.includes(n.id));
    return [...orderedNodes, ...remainingNodes];
  };

/**
 * Normalize an incoming shape by stripping the leading null/None batch dimension
 * that the DB stores (PyTorch 4D format: [null, C, H, W] → [H, W, C] HWC-canvas format).
 * The frontend canvas always works in [H, W, C] for spatial and [F] for flat.
 */
const normalizeInputShape = (shape: number[]): number[] => {
  // 4D shape with null/undefined batch: [null, C, H, W] → convert to [H, W, C]
  if (shape.length === 4 && (shape[0] === null || shape[0] === undefined)) {
    const [, C, H, W] = shape as any[];
    if (H != null && W != null && C != null) return [H, W, C];
  }
  // 3D shape with null/undefined batch: [null, H, W] → [H, W] (edge case)
  if (shape.length === 3 && (shape[0] === null || shape[0] === undefined)) {
    const [, H, W] = shape as any[];
    if (H != null && W != null) return [H, W];
  }
  return shape;
};

export const computeNodeOutputShape = (type: NodeType, rawInputShape: number[], config: NodeConfig): number[] => {
    if (type === 'Input') {
      return config.dim || [224, 224, 3];
    }
    if (rawInputShape.length === 0) {
      return [];
    }

    // Normalize to strip DB-stored null batch dimension before all arithmetic
    const inputShape = normalizeInputShape(rawInputShape);

    if (type === 'Conv2D') {
      // inputShape is [H, W, C] in canvas convention
      if (inputShape.length < 2) return inputShape;
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
      const outH = Math.max(1, Math.floor(H / poolSize));
      const outW = Math.max(1, Math.floor(W / poolSize));
      return [outH, outW, C];
    }

    if (type === 'Flatten') {
      const size = inputShape.filter(v => v != null).reduce((acc, val) => acc * (val || 1), 1);
      return [size];
    }

    if (type === 'Dense') {
      const units = config.units || 10;
      return [units];
    }

    if (type === 'BatchNorm2D' || type === 'Dropout' || type === 'LayerNorm' || type === 'PositionalEncoding' || type === 'TransformerBlock' || type === 'EncoderBlock' || type === 'DecoderBlock') {
      return inputShape;
    }

    // ResidualAdd: output the same shape as its first parent (shapes must match — validation handles mismatches)
    if (type === 'ResidualAdd') {
      return inputShape;
    }

    if (type === 'Embedding') {
      const embedDim = config.embedding_dim || 128;
      const T = inputShape[0] || 128;
      return [T, embedDim];
    }

    if (type === 'Attention' || type === 'MultiHeadAttention') {
      const T = inputShape[0] || 128;
      const embedDim = config.embed_dim || config.embedding_dim || inputShape[1] || 128;
      return [T, embedDim];
    }

    if (type === 'RNN' || type === 'LSTM' || type === 'GRU') {
      const T = inputShape[0] || 128;
      const hiddenSize = config.hidden_size || config.units || 64;
      const returnSeqs = config.return_sequences !== undefined ? config.return_sequences : true;
      return returnSeqs ? [T, hiddenSize] : [hiddenSize];
    }

    if (type === 'BiLSTM') {
      const T = inputShape[0] || 128;
      const hiddenSize = config.hidden_size || config.units || 64;
      const returnSeqs = config.return_sequences !== undefined ? config.return_sequences : true;
      return returnSeqs ? [T, 2 * hiddenSize] : [2 * hiddenSize];
    }

    if (type === 'GCN' || type === 'GraphSAGE' || type === 'GAT') {
      const N = inputShape[0] || 100;
      const outFeatures = config.out_features || config.units || config.hidden_size || 64;
      return [N, outFeatures];
    }

    return inputShape;
  };

export const useCanvasStore = create<CanvasState>((set, get) => {

  const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  const getFormattedTime = () => {
    const now = new Date();
    return now.toTimeString().split(' ')[0];
  };

  return {
    nodes: [],
    edges: [],
    selectedNodeId: null,
    zoom: 1,
    pan: { x: 0, y: 0 },
    isConnecting: false,
    connectingSourceId: null,
    logs: [],
    isPlayingAnimation: false,
    activeAnimationNodeId: null,
    activeAnimationEdgeId: null,
    activeAnimationEdgeIds: [],
    showStatsOverlay: false,
    validationErrors: [],
    compilationResult: null,
    isValidating: false,
    undoStack: [],
    redoStack: [],
    isApplyingUndoRedo: false,
    ws: null,
    clientId: null,
    myUserId: null,
    myUsername: null,
    collaborators: {},
    syncStatus: 'disconnected',

    // Training & Telemetry State Init
    trainingJob: null,
    isTrainingLoading: false,
    trainingProvider: 'local',
    trainingEpochs: 10,
    datasets: [],
    trainingBatchSize: 32,
    trainingLearningRate: 0.001,
    trainingOptimizer: 'Adam',
    trainingScheduler: 'None',

    // Advanced Graph Editing UX State Init
    selectedNodeIds: [],
    nodeGroups: [],

    // Model Versioning State Init
    draftSavedStatus: 'idle',
    checkpoints: [],

    // Admin Allocations State Init
    clusterPriority: 'High',
    gpuThrottleLimit: 80,
    highlightedNodeId: null,
    heatmapMode: 'none',
    customBlocks: [],

    loadGraph: async (projectId) => {
      const isOnline = await useProjectStore.getState().checkBackendStatus();
      const time = getFormattedTime();

      // Always load checkpoints from local storage
      get().loadCheckpoints(projectId);

      if (isOnline) {
        try {
          const data = await graphqlRequest(GET_PROJECT_DETAILS, { id: projectId });
          if (data && data.project) {
            const p = data.project;
            const nodesTranslated: CanvasNode[] = (p.nodes || []).map((n: any) => ({
              id: n.id,
              type: n.type as NodeType,
              name: n.label || n.type.toUpperCase(),
              x: n.positionX || 100,
              y: n.positionY || 100,
              inputShape: n.inputShape || [],
              outputShape: n.outputShape || [],
              config: n.config || {},
            }));

            const edgesTranslated: CanvasEdge[] = (p.edges || []).map((e: any) => ({
              id: e.id,
              source: e.fromNodeId,
              target: e.toNodeId,
            }));

            // Retrieve saved node groups from local project draft if available
            let localNodeGroups: CanvasNodeGroup[] = [];
            if (typeof window !== 'undefined') {
              const savedDraft = localStorage.getItem(`mlbuilder_project_draft_${projectId}`);
              if (savedDraft) {
                try {
                  const parsed = JSON.parse(savedDraft);
                  localNodeGroups = parsed.nodeGroups || [];
                } catch (e) {
                  console.warn('Failed to parse draft for node groups:', e);
                }
              }
            }

            set({
              nodes: nodesTranslated,
              edges: edgesTranslated,
              nodeGroups: localNodeGroups,
              logs: [
                { id: 'init', timestamp: time, type: 'success', text: `GraphQL Synced: Pulled ${nodesTranslated.length} nodes from cloud database.` }
              ]
            });
            setTimeout(() => get().recalculateShapes(), 50);
            return;
          }
        } catch (err) {
          console.warn('Failed to load project details from database. Falling back to local draft...', err);
        }
      }

      // Check if there's a saved draft in localStorage as a self-healing sandbox recovery
      if (typeof window !== 'undefined') {
        const savedDraft = localStorage.getItem(`mlbuilder_project_draft_${projectId}`);
        if (savedDraft) {
          try {
            const parsed = JSON.parse(savedDraft);
            set({
              nodes: parsed.nodes || [],
              edges: parsed.edges || [],
              nodeGroups: parsed.nodeGroups || [],
              logs: [
                { id: 'init-draft', timestamp: time, type: 'warning', text: `Offline Sandbox: Restored visual graph from local auto-save draft.` }
              ]
            });
            setTimeout(() => get().recalculateShapes(), 50);
            return;
          } catch (err) {
            console.error('Failed to parse offline local draft:', err);
          }
        }
      }

      // Enforce connection warning and set empty state
      set({
        nodes: [],
        edges: [],
        logs: [
          { id: 'offline', timestamp: time, type: 'error', text: 'Connection Failure: Cannot connect to Strawberry GraphQL API. Visual workspace offline.' }
        ]
      });
    },

    addNode: async (type, x, y, presetId, isRemote = false): Promise<string | undefined> => {
      const isOnline = useProjectStore.getState().isOnline;
      const activeProjId = useProjectStore.getState().activeProjectId;
      const ws = get().ws;
      const isWsConnected = get().syncStatus === 'connected' && ws && ws.readyState === WebSocket.OPEN;

      if (isRemote) return;

      const count = get().nodes.filter(n => n.type === type).length + 1;
      const name = `${type.toUpperCase()}_${count}`;
      
      let config: NodeConfig = {};
      if (type === 'Input') {
        config = { 
          dim: [224, 224, 3],
          shape: [null, 3, 224, 224]
        };
      } else if (type === 'Conv2D') {
        config = { filters: 64, kernelSize: 3, stride: 1, padding: 'same', activation: 'ReLU' };
      } else if (type === 'MaxPool2D') {
        config = { poolSize: 2, stride: 2 };
      } else if (type === 'Flatten') {
        config = {};
      } else if (type === 'Dense') {
        config = { units: 10 };
      } else if (type === 'BatchNorm2D') {
        config = {};
      } else if (type === 'Dropout') {
        config = { rate: 0.5 };
      } else if (type === 'Embedding') {
        config = { vocab_size: 10000, embedding_dim: 128 };
      } else if (type === 'PositionalEncoding') {
        config = { embed_dim: 128, max_len: 5000 };
      } else if (type === 'LayerNorm') {
        config = {};
      } else if (type === 'Attention') {
        config = {};
      } else if (type === 'MultiHeadAttention') {
        config = { num_heads: 12, embed_dim: 768 };
      } else if (type === 'ResidualAdd') {
        config = {};
      } else if (type === 'TransformerBlock' || type === 'EncoderBlock' || type === 'DecoderBlock') {
        config = { num_heads: 8, embed_dim: 128, hidden_size: 512 };
      } else if (type === 'RNN' || type === 'LSTM' || type === 'GRU' || type === 'BiLSTM') {
        config = { hidden_size: 128, return_sequences: true };
      } else if (type === 'GCN' || type === 'GraphSAGE' || type === 'GAT') {
        config = { out_features: 64 };
      }

      if (!isWsConnected && (!isOnline || !activeProjId)) {
        // Offline Sandbox path
        const tempId = presetId || `node_${Math.random().toString(36).substr(2, 9)}`;
        const newNode: CanvasNode = {
          id: tempId,
          type,
          name,
          x,
          y,
          inputShape: [],
          outputShape: [],
          config,
        };
        set(state => ({
          nodes: [...state.nodes, newNode],
          selectedNodeId: tempId,
          logs: [...state.logs, {
            id: Math.random().toString(),
            timestamp: getFormattedTime(),
            type: 'info',
            text: `Offline Sandbox: Created temporary local layer ${name}.`,
          }]
        }));
        if (!get().isApplyingUndoRedo) {
          get().pushOperation({
            type: 'ADD_NODE',
            payload: { node: newNode },
          });
        }
        setTimeout(() => get().recalculateShapes(), 50);
        return tempId;
      }

      if (isWsConnected) {
        // Collaborative WebSocket path
        const generatedId = presetId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `node_${Math.random().toString(36).substr(2, 9)}`);
        const newNode: CanvasNode = {
          id: generatedId,
          type,
          name,
          x: parseFloat(x.toFixed(1)),
          y: parseFloat(y.toFixed(1)),
          inputShape: [],
          outputShape: [],
          config,
        };

        set(state => ({
          nodes: [...state.nodes, newNode],
          selectedNodeId: generatedId,
          logs: [...state.logs, {
            id: Math.random().toString(),
            timestamp: getFormattedTime(),
            type: 'success',
            text: `Collaborative: Created local layer ${name}. Syncing...`,
          }]
        }));

        const op = {
          action: 'ADD_NODE',
          payload: {
            node_id: generatedId,
            type,
            label: name,
            position_x: parseFloat(x.toFixed(1)),
            position_y: parseFloat(y.toFixed(1)),
            config
          },
          timestamp: Date.now() / 1000
        };
        ws.send(JSON.stringify({ type: 'operation', op }));

        if (!get().isApplyingUndoRedo) {
          get().pushOperation({
            type: 'ADD_NODE',
            payload: { node: newNode },
          });
        }
        setTimeout(() => get().recalculateShapes(), 50);
        return generatedId;
      }

      // Standard GraphQL fallback path
      try {
        const data = await graphqlRequest(ADD_NODE, {
          projectId: activeProjId,
          type,
          label: name,
          position: { x: parseFloat(x.toFixed(1)), y: parseFloat(y.toFixed(1)) },
          config,
        });
        if (data && data.addNode) {
          const n = data.addNode;
          const newNode: CanvasNode = {
            id: n.id,
            type: n.type as NodeType,
            name: n.label,
            x: n.positionX,
            y: n.positionY,
            inputShape: n.inputShape || [],
            outputShape: n.outputShape || [],
            config: n.config || {},
          };
          set(state => ({
            nodes: [...state.nodes, newNode],
            logs: [...state.logs, {
              id: Math.random().toString(),
              timestamp: getFormattedTime(),
              type: 'success',
              text: `GraphQL sync: Added visual node ${n.label} in database.`,
            }],
            selectedNodeId: n.id,
          }));

          if (!get().isApplyingUndoRedo) {
            get().pushOperation({
              type: 'ADD_NODE',
              payload: { node: newNode },
            });
          }

          setTimeout(() => get().recalculateShapes(), 50);
          return n.id;
        }
      } catch (err: any) {
        alert(`Mutation error adding block: ${err.message || err}`);
      }
      return undefined;
    },

    removeNode: async (id, isUndoRedo = false, isRemote = false) => {
      const isOnline = useProjectStore.getState().isOnline;
      const activeProjId = useProjectStore.getState().activeProjectId;
      const ws = get().ws;
      const isWsConnected = get().syncStatus === 'connected' && ws && ws.readyState === WebSocket.OPEN;

      if (isRemote) return;

      const nodeToRemove = get().nodes.find(n => n.id === id);
      if (!nodeToRemove) return;

      const connectedEdges = get().edges.filter(e => e.source === id || e.target === id);

      if (!isWsConnected && (!isOnline || !activeProjId)) {
        // Offline Sandbox path
        set(state => ({
          nodes: state.nodes.filter(n => n.id !== id),
          edges: state.edges.filter(e => e.source !== id && e.target !== id),
          selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
          logs: [...state.logs, {
            id: Math.random().toString(),
            timestamp: getFormattedTime(),
            type: 'warning',
            text: `Offline Sandbox: Deleted local layer ${nodeToRemove.name}.`,
          }]
        }));
        if (!isUndoRedo && !get().isApplyingUndoRedo) {
          get().pushOperation({
            type: 'REMOVE_NODE',
            payload: { node: nodeToRemove, edges: connectedEdges },
          });
        }
        setTimeout(() => get().recalculateShapes(), 50);
        return;
      }

      if (isWsConnected) {
        // Collaborative WebSocket path
        set(state => ({
          nodes: state.nodes.filter(n => n.id !== id),
          edges: state.edges.filter(e => e.source !== id && e.target !== id),
          selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
          logs: [...state.logs, {
            id: Math.random().toString(),
            timestamp: getFormattedTime(),
            type: 'warning',
            text: `Collaborative: Removed layer ${nodeToRemove.name}. Syncing...`,
          }]
        }));

        const op = {
          action: 'DELETE_NODE',
          payload: { node_id: id },
          timestamp: Date.now() / 1000
        };
        ws.send(JSON.stringify({ type: 'operation', op }));

        if (!isUndoRedo && !get().isApplyingUndoRedo) {
          get().pushOperation({
            type: 'REMOVE_NODE',
            payload: { node: nodeToRemove, edges: connectedEdges },
          });
        }
        setTimeout(() => get().recalculateShapes(), 50);
        return;
      }

      // Standard GraphQL fallback path (Optimistic UI)
      set(state => ({
        nodes: state.nodes.filter(n => n.id !== id),
        edges: state.edges.filter(e => e.source !== id && e.target !== id),
        selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
        logs: [...state.logs, {
          id: Math.random().toString(),
          timestamp: getFormattedTime(),
          type: 'warning',
          text: `GraphQL sync: Deleting layer ${nodeToRemove.name} (optimistic update)...`,
        }]
      }));

      if (!isUndoRedo && !get().isApplyingUndoRedo) {
        get().pushOperation({
          type: 'REMOVE_NODE',
          payload: { node: nodeToRemove, edges: connectedEdges },
        });
      }
      setTimeout(() => get().recalculateShapes(), 50);

      // Perform mutation asynchronously in the background
      (async () => {
        try {
          await graphqlRequest(DELETE_NODE, {
            projectId: activeProjId,
            nodeId: id,
          });
        } catch (err: any) {
          console.error('Failed to sync node deletion to backend database:', err);
          get().addLog('error', `Failed to sync deletion of '${nodeToRemove.name}' to server: ${err.message || err}`);
          toast.error('Sync Error', `Failed to sync deletion of '${nodeToRemove.name}' to database.`);
        }
      })();
    },

    updateNodeConfig: (id, newConfig, isUndoRedo = false, isRemote = false) => {
      const node = get().nodes.find(n => n.id === id);
      if (!node) return;

      if (!isRemote) {
        const ws = get().ws;
        const isWsConnected = get().syncStatus === 'connected' && ws && ws.readyState === WebSocket.OPEN;

        if (isWsConnected) {
          const op = {
            action: 'UPDATE_NODE_CONFIG',
            payload: {
              node_id: id,
              config: newConfig
            },
            timestamp: Date.now() / 1000
          };
          ws.send(JSON.stringify({ type: 'operation', op }));
        }
      }

      if (!isUndoRedo && !get().isApplyingUndoRedo && !isRemote) {
        get().pushOperation({
          type: 'UPDATE_CONFIG',
          payload: {
            nodeId: id,
            oldConfig: { ...node.config },
            newConfig: { ...node.config, ...newConfig },
          },
        });
      }

      set((state) => {
        const updatedNodes = state.nodes.map((n) => {
          if (n.id === id) {
            const config = { ...n.config, ...newConfig };
            return { ...n, config };
          }
          return n;
        });
        setTimeout(() => get().recalculateShapes(), 50);
        return { nodes: updatedNodes };
      });
    },

    updateNodeName: (id, name, isUndoRedo = false, isRemote = false) => {
      const node = get().nodes.find(n => n.id === id);
      if (!node) return;

      if (!isUndoRedo && !get().isApplyingUndoRedo && !isRemote) {
        get().pushOperation({
          type: 'UPDATE_NAME',
          payload: {
            nodeId: id,
            oldName: node.name,
            newName: name.toUpperCase(),
          },
        });
      }

      set((state) => ({
        nodes: state.nodes.map((n) => n.id === id ? { ...n, name: name.toUpperCase() } : n),
      }));
    },

    moveNode: (id, x, y, isUndoRedo = false, isRemote = false) => {
      const node = get().nodes.find(n => n.id === id);
      if (!node) return;

      if (!isRemote) {
        const ws = get().ws;
        const isWsConnected = get().syncStatus === 'connected' && ws && ws.readyState === WebSocket.OPEN;

        if (isWsConnected) {
          const op = {
            action: 'MOVE_NODE',
            payload: {
              node_id: id,
              position_x: x,
              position_y: y
            },
            timestamp: Date.now() / 1000
          };
          ws.send(JSON.stringify({ type: 'operation', op }));
        }
      }

      if (!isUndoRedo && !get().isApplyingUndoRedo && !isRemote) {
        get().pushOperation({
          type: 'MOVE_NODE',
          payload: {
            nodeId: id,
            oldX: node.x,
            oldY: node.y,
            newX: x,
            newY: y,
          },
        });
      }

      set((state) => ({
        nodes: state.nodes.map((n) => n.id === id ? { ...n, x, y } : n),
      }));
      setTimeout(() => get().recalculateShapes(), 50);
    },

    addEdge: async (sourceId, targetId, presetId, isRemote = false) => {
      const isOnline = useProjectStore.getState().isOnline;
      const activeProjId = useProjectStore.getState().activeProjectId;
      const ws = get().ws;
      const isWsConnected = get().syncStatus === 'connected' && ws && ws.readyState === WebSocket.OPEN;

      if (isRemote) return;

      const edgeExists = get().edges.some(e => e.source === sourceId && e.target === targetId);
      const isSelfConnection = sourceId === targetId;

      if (edgeExists || isSelfConnection) return;

      const generatedId = presetId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `edge_${Math.random().toString(36).substr(2, 9)}`);
      const newEdge: CanvasEdge = {
        id: generatedId,
        source: sourceId,
        target: targetId,
      };

      if (!isWsConnected && (!isOnline || !activeProjId)) {
        // Offline Sandbox path
        set(state => ({
          edges: [...state.edges, newEdge],
          logs: [...state.logs, {
            id: Math.random().toString(),
            timestamp: getFormattedTime(),
            type: 'info',
            text: 'Offline Sandbox: Connected layer flow locally.',
          }]
        }));

        if (!get().isApplyingUndoRedo) {
          get().pushOperation({
            type: 'ADD_EDGE',
            payload: { edge: newEdge },
          });
        }
        setTimeout(() => get().recalculateShapes(), 50);
        return;
      }

      if (isWsConnected) {
        // Collaborative WebSocket path
        set(state => ({
          edges: [...state.edges, newEdge],
          logs: [...state.logs, {
            id: Math.random().toString(),
            timestamp: getFormattedTime(),
            type: 'success',
            text: 'Collaborative: Connected layer flow. Syncing...',
          }]
        }));

        const op = {
          action: 'ADD_EDGE',
          payload: {
            edge_id: generatedId,
            from_node_id: sourceId,
            to_node_id: targetId
          },
          timestamp: Date.now() / 1000
        };
        ws.send(JSON.stringify({ type: 'operation', op }));

        if (!get().isApplyingUndoRedo) {
          get().pushOperation({
            type: 'ADD_EDGE',
            payload: { edge: newEdge },
          });
        }
        setTimeout(() => get().recalculateShapes(), 50);
        return;
      }

      // GraphQL mutation fallback path
      try {
        const data = await graphqlRequest(ADD_EDGE, {
          projectId: activeProjId,
          fromNodeId: sourceId,
          toNodeId: targetId,
        });
        if (data && data.addEdge) {
          const edge = data.addEdge;
          const gqlEdge: CanvasEdge = {
            id: edge.id,
            source: edge.fromNodeId,
            target: edge.toNodeId,
          };
          set(state => ({
            edges: [...state.edges, gqlEdge],
            logs: [...state.logs, {
              id: Math.random().toString(),
              timestamp: getFormattedTime(),
              type: 'success',
              text: `GraphQL sync: Created edge connection in database.`,
            }]
          }));

          if (!get().isApplyingUndoRedo) {
            get().pushOperation({
              type: 'ADD_EDGE',
              payload: { edge: gqlEdge },
            });
          }

          setTimeout(() => get().recalculateShapes(), 50);
        }
      } catch (err: any) {
        alert(`Mutation error connecting edge: ${err.message || err}`);
      }
    },

    removeEdge: async (id, isUndoRedo = false, isRemote = false) => {
      const isOnline = useProjectStore.getState().isOnline;
      const activeProjId = useProjectStore.getState().activeProjectId;
      const ws = get().ws;
      const isWsConnected = get().syncStatus === 'connected' && ws && ws.readyState === WebSocket.OPEN;

      if (isRemote) return;

      const edgeToRemove = get().edges.find(e => e.id === id);
      if (!edgeToRemove) return;

      if (!isWsConnected && (!isOnline || !activeProjId)) {
        // Offline Sandbox path
        set(state => ({
          edges: state.edges.filter(e => e.id !== id),
          logs: [...state.logs, {
            id: Math.random().toString(),
            timestamp: getFormattedTime(),
            type: 'warning',
            text: 'Offline Sandbox: Disconnected layer flow locally.',
          }]
        }));

        if (!isUndoRedo && !get().isApplyingUndoRedo) {
          get().pushOperation({
            type: 'REMOVE_EDGE',
            payload: { edge: edgeToRemove },
          });
        }
        setTimeout(() => get().recalculateShapes(), 50);
        return;
      }

      if (isWsConnected) {
        // Collaborative WebSocket path
        set(state => ({
          edges: state.edges.filter(e => e.id !== id),
          logs: [...state.logs, {
            id: Math.random().toString(),
            timestamp: getFormattedTime(),
            type: 'warning',
            text: 'Collaborative: Disconnected layer flow. Syncing...',
          }]
        }));

        const op = {
          action: 'DELETE_EDGE',
          payload: {
            edge_id: id
          },
          timestamp: Date.now() / 1000
        };
        ws.send(JSON.stringify({ type: 'operation', op }));

        if (!isUndoRedo && !get().isApplyingUndoRedo) {
          get().pushOperation({
            type: 'REMOVE_EDGE',
            payload: { edge: edgeToRemove },
          });
        }
        setTimeout(() => get().recalculateShapes(), 50);
        return;
      }

      // GraphQL mutation fallback path (Optimistic UI)
      set(state => ({
        edges: state.edges.filter(e => e.id !== id),
        logs: [...state.logs, {
          id: Math.random().toString(),
          timestamp: getFormattedTime(),
          type: 'warning',
          text: `GraphQL sync: Disconnecting layer flow connection (optimistic update)...`,
        }]
      }));

      if (!isUndoRedo && !get().isApplyingUndoRedo) {
        get().pushOperation({
          type: 'REMOVE_EDGE',
          payload: { edge: edgeToRemove },
        });
      }
      setTimeout(() => get().recalculateShapes(), 50);

      // Perform mutation asynchronously in the background
      (async () => {
        try {
          await graphqlRequest(DELETE_EDGE, {
            projectId: activeProjId,
            edgeId: id,
          });
        } catch (err: any) {
          console.error('Failed to sync edge deletion to backend database:', err);
          get().addLog('error', `Failed to sync disconnection to server: ${err.message || err}`);
          toast.error('Sync Error', 'Failed to sync edge disconnection to database.');
        }
      })();
    },

    setSelectedNodeId: (id) => set({ selectedNodeId: id }),
    setHighlightedNodeId: (id) => set({ highlightedNodeId: id }),
    setHeatmapMode: (mode) => set((state) => {
      state.addLog('info', `Changed execution heatmap mode to: ${mode.toUpperCase()}`);
      return { heatmapMode: mode };
    }),

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
      const shapesMap = new Map<string, number[]>();
      const localErrors: ValidationError[] = [];

      // First pass: compute shapes in topological order so parent shapes are always computed first
      orderedNodes.forEach(n => {
        const incomingEdges = state.edges.filter(e => e.target === n.id);
        let inputShape: number[] = [];

        if (incomingEdges.length > 0) {
          // Always use the first parent's output shape as the primary input shape.
          // For ResidualAdd and other multi-input merge nodes, the broadcast
          // conflict check in the second pass handles shape mismatch errors.
          const parentId = incomingEdges[0].source;
          const parentOutputShape = shapesMap.get(parentId);
          if (parentOutputShape && parentOutputShape.length > 0) {
            inputShape = parentOutputShape;
          } else {
            // If first parent shape isn't available yet, try other parents
            for (let i = 1; i < incomingEdges.length; i++) {
              const altShape = shapesMap.get(incomingEdges[i].source);
              if (altShape && altShape.length > 0) {
                inputShape = altShape;
                break;
              }
            }
          }
        }

        const outputShape = computeNodeOutputShape(n.type, inputShape, n.config);
        shapesMap.set(n.id, outputShape);
      });

      // Second pass: map state.nodes to attach computed shapes, preserving original array order
      const computedNodes = state.nodes.map(n => {
        const incomingEdges = state.edges.filter(e => e.target === n.id);
        let inputShape: number[] = [];

        if (incomingEdges.length > 0) {
          const parentId = incomingEdges[0].source;
          const parentOutputShape = shapesMap.get(parentId);
          if (parentOutputShape) {
            inputShape = parentOutputShape;
          }
        }

        const outputShape = shapesMap.get(n.id) || [];

        return {
          ...n,
          inputShape,
          outputShape,
        };
      });

      // 1. DAG DFS Cycle checker
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

      if (hasCycle) {
        localErrors.push({
          type: 'error',
          category: 'cycle',
          message: 'DAG loop validation failed: Cyclic connections detected in model architecture! Loops are not allowed.',
        });
        const wasCycle = state.validationErrors.some(e => e.category === 'cycle');
        if (!wasCycle) {
          toast.error('Cycle Detected', 'DAG loop validation failed: Cyclic connections detected in model!');
        }
      }

      // 2. Disconnected components check
      const inputNode = computedNodes.find(n => n.type === 'Input');
      if (inputNode) {
        const flowVisited = new Set<string>();
        const queue = [inputNode.id];
        while (queue.length > 0) {
          const curr = queue.shift()!;
          if (!flowVisited.has(curr)) {
            flowVisited.add(curr);
            const neighbors = state.edges.filter(e => e.source === curr).map(e => e.target);
            neighbors.forEach(v => {
              if (!flowVisited.has(v)) queue.push(v);
            });
          }
        }

        computedNodes.forEach(n => {
          if (!flowVisited.has(n.id) && n.type !== 'Input') {
            localErrors.push({
              nodeId: n.id,
              type: 'warning',
              category: 'disconnected',
              message: `Layer '${n.name}' is disconnected from the main 'Input' graph flow. All active layers must connect.`,
            });
          }
        });
      }

      // 3. Ranks and shape validation
      computedNodes.forEach(n => {
        if (n.type === 'Conv2D' || n.type === 'MaxPool2D') {
          if (n.inputShape.length > 0 && n.inputShape.length !== 3) {
            localErrors.push({
              nodeId: n.id,
              type: 'error',
              category: 'rank',
              message: `Layer '${n.name}' (${n.type}) requires a 3D input tensor [Height, Width, Channels] (implicit batch). Received: [${n.inputShape.join(', ')}] (Rank ${n.inputShape.length}).`,
            });
          }
        } else if (n.type === 'Dense') {
          if (n.inputShape.length > 0 && n.inputShape.length !== 1) {
            localErrors.push({
              nodeId: n.id,
              type: 'error',
              category: 'rank',
              message: `Layer '${n.name}' (${n.type}) requires a 1D input tensor [Features] (implicit batch). Received: [${n.inputShape.join(', ')}] (Rank ${n.inputShape.length}). Insert a Flatten block.`,
            });
          }
        }
      });

      // 4. Broadcasting validation for merging links
      computedNodes.forEach(n => {
        const incomingEdges = state.edges.filter(e => e.target === n.id);
        if (incomingEdges.length > 1) {
          const firstParentId = incomingEdges[0].source;
          const firstShape = shapesMap.get(firstParentId) || [];
          
          for (let idx = 1; idx < incomingEdges.length; idx++) {
            const otherParentId = incomingEdges[idx].source;
            const otherParent = state.nodes.find(node => node.id === otherParentId);
            const otherShape = shapesMap.get(otherParentId) || [];
            
            let isCompatible = true;
            if (firstShape.length !== otherShape.length) {
              isCompatible = false;
            } else {
              for (let d = 0; d < firstShape.length; d++) {
                if (firstShape[d] !== otherShape[d] && firstShape[d] !== 1 && otherShape[d] !== 1) {
                  isCompatible = false;
                  break;
                }
              }
            }
            
            if (!isCompatible) {
              localErrors.push({
                nodeId: n.id,
                type: 'error',
                category: 'broadcast',
                message: `Broadcasting conflict at Layer '${n.name}': Incoming shape from '${otherParent?.name || 'parent'}' [${otherShape.join(', ')}] conflicts with base shape [${firstShape.join(', ')}].`,
              });
            }
          }
        }
      });

      const updatedLogs = [...state.logs];
      localErrors.forEach(err => {
        if (!updatedLogs.some(l => l.text === err.message)) {
          updatedLogs.push({
            id: Math.random().toString(),
            timestamp: getFormattedTime(),
            type: err.type,
            text: err.message,
          });
        }
      });

      // 5. Benchmark Alerts for parameter explosions
      const prevNodes = state.nodes;
      computedNodes.forEach(n => {
        if (n.type === 'Dense' && n.inputShape && n.inputShape.length > 0) {
          const inputDim = n.inputShape.reduce((a, b) => a * b, 1);
          const units = n.config.units || 10;
          const params = inputDim * units;
          
          if (params > 500000) {
            const wasExploded = prevNodes.find(node => node.id === n.id)?.config._exploded;
            if (!wasExploded) {
              toast.warning(
                'Benchmark Alert',
                `Warning: Dense parameter explosion (${(params/1e6).toFixed(1)}M params) detected at '${n.name}'! Overfitting/vRAM risk.`
              );
              n.config = { ...n.config, _exploded: true };
            }
          } else {
            if (n.config._exploded) {
              const updatedConfig = { ...n.config };
              delete updatedConfig._exploded;
              n.config = updatedConfig;
            }
          }
        }
      });

      // Trigger server-side compilation validation query debounced
      setTimeout(() => get().triggerCompilation(), 50);

      // Trigger automated local-storage draft saving
      setTimeout(() => get().triggerAutoSave(), 100);

      return {
        nodes: computedNodes,
        validationErrors: localErrors,
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
        
        set({ activeAnimationNodeId: node.id });
        state.addLog('info', `Forward-pass: Activated ${node.name} [Shape: [${node.outputShape.join(', ')}]]`);
        await new Promise(resolve => setTimeout(resolve, 600));

        const outgoingEdges = state.edges.filter(e => e.source === node.id);
        if (outgoingEdges.length > 0 && i < order.length - 1) {
          const edgeIds = outgoingEdges.map(e => e.id);
          set({ 
            activeAnimationEdgeIds: edgeIds,
            activeAnimationEdgeId: edgeIds[0]
          });
          await new Promise(resolve => setTimeout(resolve, 450));
          set({ 
            activeAnimationEdgeIds: [],
            activeAnimationEdgeId: null 
          });
        }
      }

      set({
        isPlayingAnimation: false,
        activeAnimationNodeId: null,
        activeAnimationEdgeId: null,
        activeAnimationEdgeIds: [],
      });

      state.addLog('success', 'Forward pass simulation completed: Outputs calculated for all active layers.');
    },

    toggleStatsOverlay: () => {
      set((state) => {
        const nextVal = !state.showStatsOverlay;
        state.addLog('info', `${nextVal ? 'Enabled' : 'Disabled'} live visual node statistics layer overlays.`);
        return { showStatsOverlay: nextVal };
      });
    },

    triggerCompilation: async () => {
      const isOnline = useProjectStore.getState().isOnline;
      const activeProjId = useProjectStore.getState().activeProjectId;
      if (!isOnline || !activeProjId) return;

      if (compilationTimeout) {
        clearTimeout(compilationTimeout);
      }

      set({ isValidating: true });

      compilationTimeout = setTimeout(async () => {
        try {
          const data = await graphqlRequest(VALIDATE_PROJECT_COMPILATION, { projectId: activeProjId });
          if (data && data.validateProjectCompilation) {
            const res = data.validateProjectCompilation;
            const semanticErrors = res.semanticErrors || [];
            const compatibilityErrors = res.compatibilityErrors || [];
            const compilationErrors = res.compilationErrors || [];
            
            // Map string errors to ValidationError objects
            const serverErrors: ValidationError[] = [
              ...semanticErrors.map((msg: string) => {
                const matchedNode = get().nodes.find(n => msg.includes(`'${n.name}'`));
                return {
                  nodeId: matchedNode?.id,
                  type: 'error' as const,
                  category: 'rank' as const,
                  message: msg,
                };
              }),
              ...compatibilityErrors.map((msg: string) => {
                const matchedNode = get().nodes.find(n => msg.includes(`'${n.name}'`));
                return {
                  nodeId: matchedNode?.id,
                  type: 'warning' as const,
                  category: 'compatibility' as const,
                  message: msg,
                };
              }),
              ...compilationErrors.map((msg: string) => {
                const matchedNode = get().nodes.find(n => msg.includes(`'${n.name}'`));
                return {
                  nodeId: matchedNode?.id,
                  type: 'error' as const,
                  category: 'compilation' as const,
                  message: msg,
                };
              }),
            ];

            // Merge local and server errors (removing duplicates if any)
            set((state) => {
              const localErrors = state.validationErrors.filter(e => 
                e.category === 'cycle' || e.category === 'disconnected' || e.category === 'rank' || e.category === 'broadcast'
              );
              
              const allErrors = [...localErrors];
              serverErrors.forEach(se => {
                if (!allErrors.some(le => le.message === se.message)) {
                  allErrors.push(se);
                }
              });

              const updatedLogs = [...state.logs];
              if (res.success) {
                if (!updatedLogs.some(l => l.text.includes('Sandbox Compilation: Successful'))) {
                  updatedLogs.push({
                    id: Math.random().toString(),
                    timestamp: getFormattedTime(),
                    type: 'success',
                    text: 'Sandbox Compilation: Successful. PyTorch module verified and tested in Python environment.',
                  });
                }
                toast.success('Compilation Successful', 'Model compiled cleanly. PyTorch, TensorFlow, and JAX module outputs ready!');
              } else {
                compilationErrors.forEach((err: string) => {
                  if (!updatedLogs.some(l => l.text === err)) {
                    updatedLogs.push({
                      id: Math.random().toString(),
                      timestamp: getFormattedTime(),
                      type: 'error',
                      text: `Compiler Traceback: ${err}`,
                    });
                  }
                });
                toast.error('Compilation Failed', 'Model sandbox run crashed. Check AST & Compile errors for tracebacks.');
              }

              return {
                validationErrors: allErrors,
                compilationResult: {
                  success: res.success,
                  generatedCode: res.generatedCode || '',
                  executionLogs: res.executionLogs || '',
                  semanticErrors,
                  compatibilityErrors,
                  compilationErrors,
                },
                isValidating: false,
                logs: updatedLogs,
              };
            });
          }
        } catch (err: any) {
          console.warn('Sandbox validation failed:', err);
          set({ isValidating: false });
          toast.error('Sandbox Connection Failed', 'Failed to communicate with the compiler validation sandbox.');
        }
      }, 2500); // 2500ms debounce
    },

    pushOperation: (op) => set((state) => {
      const nextOp = {
        ...op,
        id: Math.random().toString(),
      };
      const undoStack = [nextOp, ...state.undoStack].slice(0, 50); // limit to 50 items
      return {
        undoStack,
        redoStack: [], // clear redo on new operation
      };
    }),

    clearHistory: () => set({ undoStack: [], redoStack: [] }),

    undo: async () => {
      if (get().undoStack.length === 0) return;

      const undoStack = [...get().undoStack];
      const op = undoStack.shift()!;
      
      set({ isApplyingUndoRedo: true });
      const activeProjId = useProjectStore.getState().activeProjectId;

      try {
        switch (op.type) {
          case 'ADD_NODE': {
            if (op.payload.node) {
              await get().removeNode(op.payload.node.id, true);
            }
            break;
          }
          case 'REMOVE_NODE': {
            const oldNode = op.payload.node;
            if (oldNode) {
              const isOnline = useProjectStore.getState().isOnline;
              if (!isOnline) {
                // Offline fallback - restore node and edges locally
                const newNode = { ...oldNode };
                const restoredEdges = op.payload.edges || [];
                set(state => ({
                  nodes: [...state.nodes, newNode],
                  edges: [...state.edges, ...restoredEdges]
                }));
                break;
              }

              const data = await graphqlRequest(ADD_NODE, {
                projectId: activeProjId,
                type: oldNode.type,
                label: oldNode.name,
                position: { x: oldNode.x, y: oldNode.y },
                config: oldNode.config,
              });
              if (data && data.addNode) {
                const n = data.addNode;
                const newId = n.id;
                const oldId = oldNode.id;

                const newNode: CanvasNode = {
                  id: newId,
                  type: n.type as NodeType,
                  name: n.label,
                  x: n.positionX,
                  y: n.positionY,
                  inputShape: n.inputShape || [],
                  outputShape: n.outputShape || [],
                  config: n.config || {},
                };
                
                set(state => ({
                  nodes: [...state.nodes, newNode],
                }));

                // Recreate connected edges, mapping oldId -> newId
                const restoredEdges: CanvasEdge[] = [];
                const edgesToRestore = op.payload.edges || [];
                for (const oldEdge of edgesToRestore) {
                  const srcId = oldEdge.source === oldId ? newId : oldEdge.source;
                  const trgId = oldEdge.target === oldId ? newId : oldEdge.target;
                  
                  const edgeData = await graphqlRequest(ADD_EDGE, {
                    projectId: activeProjId,
                    fromNodeId: srcId,
                    toNodeId: trgId,
                  });
                  if (edgeData && edgeData.addEdge) {
                    const edgeRes = edgeData.addEdge;
                    restoredEdges.push({
                      id: edgeRes.id,
                      source: edgeRes.fromNodeId,
                      target: edgeRes.toNodeId,
                    });
                  }
                }

                set(state => ({
                  edges: [...state.edges, ...restoredEdges],
                }));

                // Save translated IDs inside operation payload for future Redo steps
                op.payload.node = { ...newNode };
                op.payload.edges = restoredEdges;
              }
            }
            break;
          }
          case 'ADD_EDGE': {
            if (op.payload.edge) {
              await get().removeEdge(op.payload.edge.id, true);
            }
            break;
          }
          case 'REMOVE_EDGE': {
            const oldEdge = op.payload.edge;
            if (oldEdge) {
              const isOnline = useProjectStore.getState().isOnline;
              if (!isOnline) {
                // Offline fallback - restore edge locally
                const newEdge: CanvasEdge = {
                  id: oldEdge.id || `edge_${Math.random().toString(36).substring(2, 11)}`,
                  source: oldEdge.source,
                  target: oldEdge.target,
                };
                set(state => ({
                  edges: [...state.edges, newEdge],
                }));
                op.payload.edge = newEdge;
                break;
              }

              const edgeData = await graphqlRequest(ADD_EDGE, {
                projectId: activeProjId,
                fromNodeId: oldEdge.source,
                toNodeId: oldEdge.target,
              });
              if (edgeData && edgeData.addEdge) {
                const edgeRes = edgeData.addEdge;
                const newEdge: CanvasEdge = {
                  id: edgeRes.id,
                  source: edgeRes.fromNodeId,
                  target: edgeRes.toNodeId,
                };
                set(state => ({
                  edges: [...state.edges, newEdge],
                }));
                op.payload.edge = newEdge;
              }
            }
            break;
          }
          case 'UPDATE_CONFIG': {
            if (op.payload.nodeId && op.payload.oldConfig) {
              get().updateNodeConfig(op.payload.nodeId, op.payload.oldConfig, true);
            }
            break;
          }
          case 'UPDATE_NAME': {
            if (op.payload.nodeId && op.payload.oldName) {
              get().updateNodeName(op.payload.nodeId, op.payload.oldName, true);
            }
            break;
          }
          case 'MOVE_NODE': {
            if (op.payload.batchNodes) {
              op.payload.batchNodes.forEach(item => {
                get().moveNode(item.id, item.oldX, item.oldY, true);
              });
            } else if (op.payload.nodeId && op.payload.oldX !== undefined && op.payload.oldY !== undefined) {
              get().moveNode(op.payload.nodeId, op.payload.oldX, op.payload.oldY, true);
            }
            break;
          }
          case 'SET_GRAPH': {
            if (op.payload.oldNodes && op.payload.oldEdges && op.payload.oldNodeGroups) {
              set({
                nodes: op.payload.oldNodes,
                edges: op.payload.oldEdges,
                nodeGroups: op.payload.oldNodeGroups,
                selectedNodeIds: [],
                selectedNodeId: null
              });
            }
            break;
          }
        }

        set((state) => ({
          undoStack,
          redoStack: [op, ...state.redoStack],
        }));
        setTimeout(() => get().recalculateShapes(), 50);
      } catch (err) {
        console.warn('Undo operation execution failed:', err);
      } finally {
        set({ isApplyingUndoRedo: false });
      }
    },

    redo: async () => {
      if (get().redoStack.length === 0) return;

      const redoStack = [...get().redoStack];
      const op = redoStack.shift()!;
      
      set({ isApplyingUndoRedo: true });
      const activeProjId = useProjectStore.getState().activeProjectId;

      try {
        switch (op.type) {
          case 'ADD_NODE': {
            const oldNode = op.payload.node;
            if (oldNode) {
              const isOnline = useProjectStore.getState().isOnline;
              if (!isOnline) {
                // Offline fallback - add node locally
                const newNode = { ...oldNode };
                set(state => ({ nodes: [...state.nodes, newNode] }));
                break;
              }

              const data = await graphqlRequest(ADD_NODE, {
                projectId: activeProjId,
                type: oldNode.type,
                label: oldNode.name,
                position: { x: oldNode.x, y: oldNode.y },
                config: oldNode.config,
              });
              if (data && data.addNode) {
                const n = data.addNode;
                const newNode = {
                  id: n.id,
                  type: n.type as NodeType,
                  name: n.label,
                  x: n.positionX,
                  y: n.positionY,
                  inputShape: n.inputShape || [],
                  outputShape: n.outputShape || [],
                  config: n.config || {},
                };
                set(state => ({ nodes: [...state.nodes, newNode] }));
                op.payload.node = newNode;
              }
            }
            break;
          }
          case 'REMOVE_NODE': {
            if (op.payload.node) {
              await get().removeNode(op.payload.node.id, true);
            }
            break;
          }
          case 'ADD_EDGE': {
            const oldEdge = op.payload.edge;
            if (oldEdge) {
              const isOnline = useProjectStore.getState().isOnline;
              if (!isOnline) {
                // Offline fallback - add edge locally
                const newEdge = { ...oldEdge };
                set(state => ({ edges: [...state.edges, newEdge] }));
                break;
              }

              const edgeData = await graphqlRequest(ADD_EDGE, {
                projectId: activeProjId,
                fromNodeId: oldEdge.source,
                toNodeId: oldEdge.target,
              });
              if (edgeData && edgeData.addEdge) {
                const edgeRes = edgeData.addEdge;
                const newEdge = { id: edgeRes.id, source: edgeRes.fromNodeId, target: edgeRes.toNodeId };
                set(state => ({ edges: [...state.edges, newEdge] }));
                op.payload.edge = newEdge;
              }
            }
            break;
          }
          case 'REMOVE_EDGE': {
            if (op.payload.edge) {
              await get().removeEdge(op.payload.edge.id, true);
            }
            break;
          }
          case 'UPDATE_CONFIG': {
            if (op.payload.nodeId && op.payload.newConfig) {
              get().updateNodeConfig(op.payload.nodeId, op.payload.newConfig, true);
            }
            break;
          }
          case 'UPDATE_NAME': {
            if (op.payload.nodeId && op.payload.newName) {
              get().updateNodeName(op.payload.nodeId, op.payload.newName, true);
            }
            break;
          }
          case 'MOVE_NODE': {
            if (op.payload.batchNodes) {
              op.payload.batchNodes.forEach(item => {
                get().moveNode(item.id, item.newX, item.newY, true);
              });
            } else if (op.payload.nodeId && op.payload.newX !== undefined && op.payload.newY !== undefined) {
              get().moveNode(op.payload.nodeId, op.payload.newX, op.payload.newY, true);
            }
            break;
          }
          case 'SET_GRAPH': {
            if (op.payload.newNodes && op.payload.newEdges && op.payload.newNodeGroups) {
              set({
                nodes: op.payload.newNodes,
                edges: op.payload.newEdges,
                nodeGroups: op.payload.newNodeGroups,
                selectedNodeIds: [],
                selectedNodeId: null
              });
            }
            break;
          }
        }

        set((state) => ({
          redoStack,
          undoStack: [op, ...state.undoStack],
        }));
        setTimeout(() => get().recalculateShapes(), 50);
      } catch (err) {
        console.warn('Redo operation execution failed:', err);
      } finally {
        set({ isApplyingUndoRedo: false });
      }
    },



    connectCollaboration: (projectId) => {
      if (get().ws) return;

      const isOnline = useProjectStore.getState().isOnline;
      const token = typeof window !== 'undefined' ? localStorage.getItem('mlbuilder_token') : null;

      if (!isOnline || !token) {
        // Silently fall back to offline sandbox mode and skip connection
        set({ syncStatus: 'disconnected', ws: null });
        return;
      }

      set({ syncStatus: 'connecting' });
      toast.info('Syncing Room', 'Attempting real-time workspace handshake...');
      const wsUrl = `ws://localhost:8000/ws/projects/${projectId}?token=${token}`;

      let socket: WebSocket;
      try {
        socket = new WebSocket(wsUrl);
      } catch (err) {
        console.error('Failed to instantiate WebSocket connection:', err);
        set({ syncStatus: 'disconnected', ws: null });
        toast.warning('Local Sandbox', 'Lost cloud database sync. Local edits active.');
        return;
      }

      socket.onopen = () => {
        set({ syncStatus: 'connected', ws: socket });
        get().addLog('success', 'Real-time collaboration: Connected to workspace room.');
        toast.success('Room Connected', 'Cloud Sync established. Collaborators active.');

        if (heartbeatInterval) clearInterval(heartbeatInterval);
        heartbeatInterval = setInterval(() => {
          const ws = get().ws;
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 20000);
      };

      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          switch (msg.type) {
            case 'SessionInit': {
              let myUserId: string | null = null;
              let myUsername: string | null = null;
              if (Array.isArray(msg.presence)) {
                const selfEntry = msg.presence.find((col: any) => col.client_id === msg.client_id);
                if (selfEntry) {
                  myUserId = selfEntry.user_id;
                  myUsername = selfEntry.username;
                }
              }

              const collaboratorsMap: Record<string, Collaborator> = {};
              if (Array.isArray(msg.presence)) {
                msg.presence.forEach((col: any) => {
                  const isSelf = col.client_id === msg.client_id || 
                                 (myUserId && col.user_id === myUserId) || 
                                 (myUsername && col.username === myUsername);
                  if (!isSelf) {
                    collaboratorsMap[col.client_id] = {
                      clientId: col.client_id,
                      userId: col.user_id,
                      username: col.username,
                      color: col.color,
                      cursor: col.cursor || null,
                      selection: col.selection || null
                    };
                  }
                });
              }
              set({ 
                clientId: msg.client_id, 
                myUserId, 
                myUsername, 
                collaborators: collaboratorsMap 
              });
              break;
            }
            case 'UserJoined': {
              const u = msg.user;
              const myUserId = get().myUserId;
              const myUsername = get().myUsername;
              
              const isSelf = u.client_id === get().clientId || 
                             (myUserId && u.user_id === myUserId) || 
                             (myUsername && u.username === myUsername);
              
              if (!isSelf) {
                set((state) => {
                  const collaborators = { ...state.collaborators };
                  collaborators[u.client_id] = {
                    clientId: u.client_id,
                    userId: u.user_id,
                    username: u.username,
                    color: u.color,
                    cursor: u.cursor || null,
                    selection: u.selection || null
                  };
                  return { collaborators };
                });
                get().addLog('info', `${u.username} joined the workspace.`);
              }
              break;
            }
            case 'UserLeft': {
              if (msg.client_id !== get().clientId) {
                set((state) => {
                  const collaborators = { ...state.collaborators };
                  const leftUser = collaborators[msg.client_id];
                  delete collaborators[msg.client_id];
                  if (leftUser) {
                    setTimeout(() => get().addLog('info', `${leftUser.username} left the workspace.`), 50);
                  }
                  return { collaborators };
                });
              }
              break;
            }
            case 'UserCursor': {
              if (msg.client_id !== get().clientId) {
                set((state) => {
                  const collaborators = { ...state.collaborators };
                  if (collaborators[msg.client_id]) {
                    collaborators[msg.client_id].cursor = { x: msg.x, y: msg.y };
                  }
                  return { collaborators };
                });
              }
              break;
            }
            case 'UserSelection': {
              if (msg.client_id !== get().clientId) {
                set((state) => {
                  const collaborators = { ...state.collaborators };
                  if (collaborators[msg.client_id]) {
                    collaborators[msg.client_id].selection = msg.node_id;
                  }
                  return { collaborators };
                });
              }
              break;
            }
            case 'OperationApplied': {
              if (msg.client_id !== get().clientId) {
                const op = msg.op;
                set({ isApplyingUndoRedo: true });

                (async () => {
                  try {
                    switch (op.type || op.action) {
                      case 'ADD_NODE': {
                        const payload = op.payload || {};
                        const nodeId = payload.node_id || payload.node?.id;
                        if (nodeId && !get().nodes.some(n => n.id === nodeId)) {
                          const name = payload.label || payload.node?.name || 'REMOTE_LAYER';
                          const newNode: CanvasNode = {
                            id: nodeId,
                            type: (payload.type || payload.node?.type || 'Dense') as NodeType,
                            name,
                            x: payload.position_x || payload.node?.x || 100,
                            y: payload.position_y || payload.node?.y || 100,
                            inputShape: [],
                            outputShape: [],
                            config: payload.config || payload.node?.config || {}
                          };
                          set((state) => ({
                            nodes: [...state.nodes, newNode]
                          }));
                          get().addLog('info', `Collaborator added layer: ${name}`);
                        }
                        break;
                      }
                      case 'DELETE_NODE':
                      case 'REMOVE_NODE': {
                        const payload = op.payload || {};
                        const nodeId = payload.node_id || payload.node?.id;
                        if (nodeId) {
                          const targetNode = get().nodes.find(n => n.id === nodeId);
                          set((state) => ({
                            nodes: state.nodes.filter(n => n.id !== nodeId),
                            edges: state.edges.filter(e => e.source !== nodeId && e.target !== nodeId)
                          }));
                          if (targetNode) {
                            get().addLog('info', `Collaborator deleted layer: ${targetNode.name}`);
                          }
                        }
                        break;
                      }
                      case 'ADD_EDGE': {
                        const payload = op.payload || {};
                        const edgeId = payload.edge_id || payload.edge?.id;
                        const fromNodeId = payload.from_node_id || payload.edge?.source;
                        const toNodeId = payload.to_node_id || payload.edge?.target;
                        if (edgeId && fromNodeId && toNodeId && !get().edges.some(e => e.id === edgeId)) {
                          const newEdge: CanvasEdge = {
                            id: edgeId,
                            source: fromNodeId,
                            target: toNodeId
                          };
                          set((state) => ({
                            edges: [...state.edges, newEdge]
                          }));
                          get().addLog('info', 'Collaborator connected a new layer flow link.');
                        }
                        break;
                      }
                      case 'DELETE_EDGE':
                      case 'REMOVE_EDGE': {
                        const payload = op.payload || {};
                        const edgeId = payload.edge_id || payload.edge?.id;
                        if (edgeId) {
                          set((state) => ({
                            edges: state.edges.filter(e => e.id !== edgeId)
                          }));
                          get().addLog('info', 'Collaborator disconnected a layer flow link.');
                        }
                        break;
                      }
                      case 'UPDATE_NODE_CONFIG':
                      case 'UPDATE_CONFIG': {
                        const payload = op.payload || {};
                        const nodeId = payload.node_id || payload.nodeId;
                        const config = payload.config || payload.newConfig;
                        if (nodeId && config) {
                          set((state) => ({
                            nodes: state.nodes.map(n => n.id === nodeId ? { ...n, config: { ...n.config, ...config } } : n)
                          }));
                          get().addLog('info', 'Collaborator updated layer hyperparameters.');
                        }
                        break;
                      }
                      case 'MOVE_NODE': {
                        const payload = op.payload || {};
                        const nodeId = payload.node_id || payload.nodeId;
                        const x = payload.position_x !== undefined ? payload.position_x : payload.newX;
                        const y = payload.position_y !== undefined ? payload.position_y : payload.newY;
                        if (nodeId && x !== undefined && y !== undefined) {
                          set((state) => ({
                            nodes: state.nodes.map(n => n.id === nodeId ? { ...n, x, y } : n)
                          }));
                        }
                        break;
                      }
                    }
                    setTimeout(() => get().recalculateShapes(), 50);
                  } catch (err) {
                    console.error('Failed to apply remote collaborative operation:', err);
                  } finally {
                    set({ isApplyingUndoRedo: false });
                  }
                })();
              }
              break;
            }
            case 'OperationRejected': {
              get().addLog('error', `Operation Rejected: ${msg.reason}`);
              const activeProjId = useProjectStore.getState().activeProjectId;
              if (activeProjId) {
                get().loadGraph(activeProjId);
              }
              break;
            }
          }
        } catch (err) {
          console.warn('Failed to parse incoming WebSocket frame:', err);
        }
      };

      socket.onclose = (event) => {
        const wasConnected = get().syncStatus === 'connected';
        set({ syncStatus: 'disconnected', ws: null, clientId: null, collaborators: {} });
        if (heartbeatInterval) clearInterval(heartbeatInterval);

        if (wasConnected) {
          toast.warning('Local Sandbox', 'Lost cloud database sync. Local edits active.');
        }

        const activeProjId = useProjectStore.getState().activeProjectId;
        const online = useProjectStore.getState().isOnline;
        const activeToken = typeof window !== 'undefined' ? localStorage.getItem('mlbuilder_token') : null;

        if (activeProjId && event.code !== 1000 && online && activeToken) {
          if (reconnectTimeout) clearTimeout(reconnectTimeout);
          reconnectTimeout = setTimeout(() => {
            get().connectCollaboration(projectId);
          }, 5000);
        }
      };

      socket.onerror = () => {
        set({ syncStatus: 'disconnected' });
      };
    },

    disconnectCollaboration: () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (heartbeatInterval) clearInterval(heartbeatInterval);

      const ws = get().ws;
      if (ws) {
        ws.close(1000, 'User Navigating Away');
      }
      set({ ws: null, clientId: null, collaborators: {}, syncStatus: 'disconnected' });
    },

    sendCursorPosition: (x, y) => {
      const ws = get().ws;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'presence_cursor',
          x,
          y
        }));
      }
    },

    sendSelection: (nodeId) => {
      const ws = get().ws;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'presence_selection',
          node_id: nodeId
        }));
      }
    },

    setTrainingProvider: (provider) => {
      set({ trainingProvider: provider });
      get().addLog('info', `Switched execution toggle to: ${provider === 'vertex' ? 'Google Cloud Vertex AI' : 'Local Celery Worker'}`);
    },

    setTrainingEpochs: (epochs) => {
      set({ trainingEpochs: epochs });
    },

    setTrainingBatchSize: (size) => {
      set({ trainingBatchSize: size });
      get().addLog('info', `[Tuning] Batch size adjusted to: ${size}`);
    },

    setTrainingLearningRate: (lr) => {
      set({ trainingLearningRate: lr });
      get().addLog('info', `[Tuning] Learning rate live-tuned to: ${lr}`);
    },

    setTrainingOptimizer: (opt) => {
      set({ trainingOptimizer: opt });
      get().addLog('info', `[Tuning] Optimizer updated to: ${opt}`);
    },

    setTrainingScheduler: (sched) => {
      set({ trainingScheduler: sched });
      get().addLog('info', `[Tuning] LR Scheduler set to: ${sched}`);
    },

    restartTraining: async (datasetId = null) => {
      get().addLog('warning', `Restarting training pipeline execution with current parameters...`);
      get().stopTraining();
      setTimeout(() => {
        get().startTraining(datasetId);
      }, 300);
    },

    loadDatasets: async () => {
      const isOnline = useProjectStore.getState().isOnline;
      if (isOnline) {
        try {
          const data = await graphqlRequest(GET_DATASETS);
          if (data && data.datasets) {
            set({ datasets: data.datasets });
            return;
          }
        } catch (err) {
          console.warn('Failed to load datasets, falling back to mock.', err);
        }
      }
      
      // Fallback
      set({
        datasets: [
          { id: 'ds_cifar10', name: 'CIFAR-10 Objects', datasetType: 'Image', status: 'READY', numRecords: 60000 },
          { id: 'ds_mnist', name: 'MNIST Digits', datasetType: 'Image', status: 'READY', numRecords: 70000 },
          { id: 'ds_imdb', name: 'IMDB Sentiment', datasetType: 'Text', status: 'READY', numRecords: 50000 }
        ]
      });
    },

    startTraining: async (datasetId = null) => {
      const isOnline = useProjectStore.getState().isOnline;
      const activeProjId = useProjectStore.getState().activeProjectId;
      
      if (trainingInterval) clearInterval(trainingInterval);
      if (hardwareFluctuationInterval) clearInterval(hardwareFluctuationInterval);
      
      const totalEpochs = get().trainingEpochs;
      const provider = get().trainingProvider;
      
      get().addLog('info', `Initializing network training workflow (Provider: ${provider === 'vertex' ? 'Vertex AI' : 'Local Celery'})...`);
      toast.info('Training Started', 'Initializing container and loading datasets...');
      
      let milestone25 = false;
      let milestone50 = false;
      let milestone75 = false;

      const initialJob: TrainingJob = {
        id: `job_${Math.random().toString(36).substring(2, 10)}`,
        projectId: activeProjId || 'sandbox_project',
        datasetId,
        status: 'PENDING',
        epochs: totalEpochs,
        currentEpoch: 0,
        lossHistory: [],
        accuracyHistory: [],
        metricsMetadata: {
          provider,
          device: provider === 'vertex' ? 'NVIDIA Tesla T4 (1x)' : 'CPU Worker',
          machine_type: provider === 'vertex' ? 'n1-standard-4' : 'Celery Thread',
          logs: 'Job initialized. Preparing execution container...',
          temperature: provider === 'vertex' ? 62 : 41,
          memory_used_mb: provider === 'vertex' ? 2450 : 380,
          system_load: 12
        }
      };
      
      set({ trainingJob: initialJob });
      
      if (isOnline && activeProjId) {
        set({ isTrainingLoading: true });
        try {
          const res = await graphqlRequest(TRIGGER_TRAINING_JOB, {
            projectId: activeProjId,
            epochs: totalEpochs,
            datasetId: datasetId
          });
          
          const backendJobId = res.triggerTrainingJob;
          get().addLog('success', `Training job successfully registered on backend. ID: ${backendJobId}`);
          
          set((state) => {
            if (state.trainingJob) {
              return {
                isTrainingLoading: false,
                trainingJob: {
                  ...state.trainingJob,
                  id: backendJobId,
                  status: 'RUNNING'
                }
              };
            }
            return {};
          });
          
          // Poll the database every 1.5s
          trainingInterval = setInterval(async () => {
            try {
              const pollRes = await graphqlRequest(GET_TRAINING_JOB, { id: backendJobId });
              if (pollRes && pollRes.trainingJob) {
                const job = pollRes.trainingJob;
                
                // Formulate updated object
                const updatedJob: TrainingJob = {
                  id: job.id,
                  projectId: job.projectId,
                  datasetId: job.datasetId,
                  status: job.status as any,
                  epochs: job.epochs,
                  currentEpoch: job.currentEpoch,
                  lossHistory: job.lossHistory || [],
                  accuracyHistory: job.accuracyHistory || [],
                  metricsMetadata: {
                    ...get().trainingJob?.metricsMetadata,
                    ...job.metricsMetadata,
                    // Inject fluctuating parameters
                    temperature: provider === 'vertex' 
                      ? Math.min(85, Math.max(60, 68 + Math.round((Math.random() - 0.5) * 5)))
                      : Math.min(60, Math.max(38, 44 + Math.round((Math.random() - 0.5) * 3))),
                    memory_used_mb: provider === 'vertex'
                      ? Math.round(11200 + Math.random() * 500)
                      : Math.round(420 + Math.random() * 30),
                    system_load: Math.min(99, Math.max(70, 85 + Math.round((Math.random() - 0.5) * 10)))
                  }
                };
                
                set({ trainingJob: updatedJob });
                
                // Alert on progress benchmarks
                const percent = Math.round((job.currentEpoch / totalEpochs) * 100);
                if (percent >= 25 && !milestone25) {
                  milestone25 = true;
                  toast.info('Training Progress: 25%', `Model training has completed 25% of epochs (${job.currentEpoch}/${totalEpochs}).`);
                }
                if (percent >= 50 && !milestone50) {
                  milestone50 = true;
                  toast.info('Training Progress: 50%', `Model training is halfway completed (${job.currentEpoch}/${totalEpochs}).`);
                }
                if (percent >= 75 && !milestone75) {
                  milestone75 = true;
                  toast.info('Training Progress: 75%', `Model training has completed 75% of epochs (${job.currentEpoch}/${totalEpochs}).`);
                }

                if (job.status === 'COMPLETED' || job.status === 'SUCCESS' || job.status === 'FAILED') {
                  if (trainingInterval) clearInterval(trainingInterval);
                  get().addLog(
                    job.status === 'FAILED' ? 'error' : 'success', 
                    `Training run ${job.status === 'FAILED' ? 'failed' : 'completed successfully'} at epoch ${job.currentEpoch}/${job.epochs}.`
                  );
                  if (job.status === 'FAILED') {
                    toast.error('Training Failed', `Training run failed at epoch ${job.currentEpoch}/${job.epochs}. Check console logs.`);
                  } else {
                    toast.success('Training Completed', `Model converged successfully after ${job.epochs} epochs.`);
                  }
                }
              }
            } catch (pollErr) {
              console.error('Failed to poll training job:', pollErr);
            }
          }, 1500);
          
          return;
        } catch (err) {
          get().addLog('warning', `Failed to initiate cloud training: ${err instanceof Error ? err.message : err}. Falling back to high-fidelity Sandbox simulation...`);
        }
      }
      
      // Sandbox local fallback loop
      set({ isTrainingLoading: false });
      
      set((state) => {
        if (state.trainingJob) {
          return {
            trainingJob: {
              ...state.trainingJob,
              status: 'RUNNING'
            }
          };
        }
        return {};
      });
      
      get().addLog('info', 'Sandbox Training session started.');
      
      let curEpoch = 0;
      let currentLoss = 0.82;
      let currentAcc = 0.22;
      
      const lossList: number[] = [];
      const accList: number[] = [];
      
      trainingInterval = setInterval(() => {
        curEpoch++;
        if (curEpoch > totalEpochs) {
          if (trainingInterval) clearInterval(trainingInterval);
          if (hardwareFluctuationInterval) clearInterval(hardwareFluctuationInterval);
          
          set((state) => {
            if (state.trainingJob) {
              const updated: TrainingJob = {
                ...state.trainingJob,
                status: 'COMPLETED',
                metricsMetadata: {
                  ...state.trainingJob.metricsMetadata,
                  logs: `Sandbox training completed successfully for ${totalEpochs} epochs.`,
                  peak_memory_used_mb: provider === 'vertex' ? 14450 : 480,
                  training_duration_seconds: totalEpochs * 1.2,
                  final_loss: lossList[lossList.length - 1],
                  final_accuracy: accList[accList.length - 1]
                }
              };
              return { trainingJob: updated };
            }
            return {};
          });
          
          get().addLog('success', `[Sandbox] Model converged. Final validation accuracy: ${(accList[accList.length - 1] * 100).toFixed(2)}%`);
          toast.success('Training Completed', `Sandbox model converged successfully after ${totalEpochs} epochs.`);
          return;
        }
        
        // Dynamic convergence based on live learning rate tuning (base LR is 0.001)
        const lrFactor = get().trainingLearningRate / 0.001;
        const baseDecay = 0.08 + Math.random() * 0.08;
        const baseGrowth = 0.05 + Math.random() * 0.07;
        
        // Scale curves based on learning rate updates
        const decay = Math.min(0.4, baseDecay * Math.sqrt(lrFactor));
        const growth = Math.min(0.3, baseGrowth * Math.sqrt(lrFactor));
        
        currentLoss = Math.max(0.015, currentLoss * (1 - decay));
        currentAcc = Math.min(0.992, currentAcc + (1 - currentAcc) * growth);
        
        lossList.push(Number(currentLoss.toFixed(4)));
        accList.push(Number(currentAcc.toFixed(4)));
        
        set((state) => {
          if (state.trainingJob) {
            const updated: TrainingJob = {
              ...state.trainingJob,
              currentEpoch: curEpoch,
              lossHistory: [...lossList],
              accuracyHistory: [...accList],
              metricsMetadata: {
                ...state.trainingJob.metricsMetadata,
                logs: `Epoch ${curEpoch}/${totalEpochs} - Loss: ${currentLoss.toFixed(4)} - Val Accuracy: ${(currentAcc * 100).toFixed(2)}%`
              }
            };
            return { trainingJob: updated };
          }
          return {};
        });
        
        get().addLog('info', `[Sandbox] Epoch ${curEpoch}/${totalEpochs} - Loss: ${currentLoss.toFixed(4)} - Accuracy: ${(currentAcc * 100).toFixed(2)}%`);

        // Alert on progress benchmarks for Sandbox
        const percent = Math.round((curEpoch / totalEpochs) * 100);
        if (percent >= 25 && !milestone25) {
          milestone25 = true;
          toast.info('Training Progress: 25%', `Sandbox completed ${curEpoch}/${totalEpochs} epochs.`);
        }
        if (percent >= 50 && !milestone50) {
          milestone50 = true;
          toast.info('Training Progress: 50%', `Sandbox completed ${curEpoch}/${totalEpochs} epochs.`);
        }
        if (percent >= 75 && !milestone75) {
          milestone75 = true;
          toast.info('Training Progress: 75%', `Sandbox completed ${curEpoch}/${totalEpochs} epochs.`);
        }
      }, 1000);
      
      // Animate Hardware metrics fluctuation
      hardwareFluctuationInterval = setInterval(() => {
        set((state) => {
          if (state.trainingJob && state.trainingJob.metricsMetadata) {
            const temp = provider === 'vertex'
              ? Math.min(85, Math.max(68, 73 + Math.round((Math.random() - 0.5) * 4)))
              : Math.min(58, Math.max(40, 44 + Math.round((Math.random() - 0.5) * 2)));
              
            const mem = provider === 'vertex'
              ? Math.round(11200 + Math.random() * 400)
              : Math.round(410 + Math.random() * 20);
              
            const load = Math.min(99, Math.max(60, 88 + Math.round((Math.random() - 0.5) * 8)));
            
            return {
              trainingJob: {
                ...state.trainingJob,
                metricsMetadata: {
                  ...state.trainingJob.metricsMetadata,
                  temperature: temp,
                  memory_used_mb: mem,
                  system_load: load
                }
              }
            };
          }
          return {};
        });
      }, 800);
    },

    pauseTraining: () => {
      if (trainingInterval) clearInterval(trainingInterval);
      if (hardwareFluctuationInterval) clearInterval(hardwareFluctuationInterval);
      
      set((state) => {
        if (state.trainingJob) {
          return {
            trainingJob: {
              ...state.trainingJob,
              status: 'PAUSED'
            }
          };
        }
        return {};
      });
      
      get().addLog('warning', 'Training paused by user.');
    },

    stopTraining: () => {
      if (trainingInterval) clearInterval(trainingInterval);
      if (hardwareFluctuationInterval) clearInterval(hardwareFluctuationInterval);
      
      set((state) => {
        if (state.trainingJob) {
          return {
            trainingJob: {
              ...state.trainingJob,
              status: 'STOPPED'
            }
          };
        }
        return {};
      });
      
      get().addLog('error', 'Training process aborted by developer.');
    },

    setSelectedNodeIds: (ids) => {
      set({ selectedNodeIds: ids, selectedNodeId: ids[0] || null });
    },

    addNodeGroup: (name, nodeIds) => {
      const newGroup: CanvasNodeGroup = {
        id: `group_${Math.random().toString(36).substring(2, 10)}`,
        name,
        color: ['#c5a3ff', '#8ab4f8', '#80cbc4', '#ffe082', '#81c784'][Math.floor(Math.random() * 5)],
        nodeIds,
        isCollapsed: false
      };
      set((state) => ({
        nodeGroups: [...state.nodeGroups, newGroup],
        selectedNodeIds: []
      }));
      get().addLog('success', `Created layer group container: "${name}" wrapping ${nodeIds.length} layers.`);
    },

    removeNodeGroup: (groupId) => {
      set((state) => ({
        nodeGroups: state.nodeGroups.filter(g => g.id !== groupId)
      }));
      get().addLog('info', `Unpacked layer group container.`);
    },

    toggleGroupCollapse: (groupId) => {
      set((state) => ({
        nodeGroups: state.nodeGroups.map(g => 
          g.id === groupId ? { ...g, isCollapsed: !g.isCollapsed } : g
        )
      }));
    },

    alignSelectedNodes: (alignment) => {
      const selectedIds = get().selectedNodeIds;
      if (selectedIds.length < 2) return;
      const selectedNodes = get().nodes.filter(n => selectedIds.includes(n.id));
      
      let updatedNodes = [...get().nodes];
      if (alignment === 'top') {
        const minY = Math.min(...selectedNodes.map(n => n.y));
        updatedNodes = get().nodes.map(n => 
          selectedIds.includes(n.id) ? { ...n, y: minY } : n
        );
        get().addLog('info', `Aligned selected layers to top boundary.`);
      } else if (alignment === 'left') {
        const minX = Math.min(...selectedNodes.map(n => n.x));
        updatedNodes = get().nodes.map(n => 
          selectedIds.includes(n.id) ? { ...n, x: minX } : n
        );
        get().addLog('info', `Aligned selected layers to left boundary.`);
      } else if (alignment === 'distribute-h') {
        const sorted = [...selectedNodes].sort((a, b) => a.x - b.x);
        const minX = sorted[0].x;
        const maxX = sorted[sorted.length - 1].x;
        const span = maxX - minX;
        
        if (sorted.length > 2 && span > 0) {
          const step = span / (sorted.length - 1);
          const newCoords = new Map<string, number>();
          sorted.forEach((n, idx) => {
            newCoords.set(n.id, Math.round((minX + idx * step) / 20) * 20);
          });
          updatedNodes = get().nodes.map(n => 
            newCoords.has(n.id) ? { ...n, x: newCoords.get(n.id)! } : n
          );
          get().addLog('info', `Distributed selected layers evenly horizontally.`);
        }
      } else if (alignment === 'distribute-v') {
        const sorted = [...selectedNodes].sort((a, b) => a.y - b.y);
        const minY = sorted[0].y;
        const maxY = sorted[sorted.length - 1].y;
        const span = maxY - minY;
        
        if (sorted.length > 2 && span > 0) {
          const step = span / (sorted.length - 1);
          const newCoords = new Map<string, number>();
          sorted.forEach((n, idx) => {
            newCoords.set(n.id, Math.round((minY + idx * step) / 20) * 20);
          });
          updatedNodes = get().nodes.map(n => 
            newCoords.has(n.id) ? { ...n, y: newCoords.get(n.id)! } : n
          );
          get().addLog('info', `Distributed selected layers evenly vertically.`);
        }
      }
      
      set({ nodes: updatedNodes });
      get().recalculateShapes();
    },

    batchMoveNodes: (nodePositions) => {
      const updatedNodes = get().nodes.map(n => {
        const targetPos = nodePositions.find(p => p.id === n.id);
        if (targetPos) {
          return { ...n, x: targetPos.x, y: targetPos.y };
        }
        return n;
      });
      set({ nodes: updatedNodes });
    },

    // Model Versioning & Auto-saving actions
    triggerAutoSave: () => {
      const projectId = useProjectStore.getState().activeProjectId;
      if (!projectId) return;

      set({ draftSavedStatus: 'saving' });

      if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
      }

      autoSaveTimeout = setTimeout(() => {
        try {
          const { nodes, edges, nodeGroups } = get();
          const data = JSON.stringify({ nodes, edges, nodeGroups });
          localStorage.setItem(`mlbuilder_project_draft_${projectId}`, data);
          set({ draftSavedStatus: 'saved' });

          const activeCheckpoints = get().checkpoints;
          localStorage.setItem(`mlbuilder_project_checkpoints_${projectId}`, JSON.stringify(activeCheckpoints));
        } catch (err) {
          console.error('Failed to auto-save draft:', err);
          set({ draftSavedStatus: 'error' });
        }
      }, 800);
    },

    loadCheckpoints: (projectId) => {
      if (typeof window === 'undefined') return;
      try {
        const saved = localStorage.getItem(`mlbuilder_project_checkpoints_${projectId}`);
        if (saved) {
          set({ checkpoints: JSON.parse(saved) });
        } else {
          set({ checkpoints: [] });
        }
      } catch (err) {
        console.warn('Failed to load checkpoints from localStorage:', err);
      }
    },

    saveCheckpoint: (name) => {
      const projectId = useProjectStore.getState().activeProjectId;
      if (!projectId) return;

      const { nodes, edges, nodeGroups, checkpoints } = get();
      const newCheckpoint: ModelCheckpoint = {
        id: 'cp_' + Math.random().toString(36).substr(2, 9),
        name: name || `Checkpoint - ${new Date().toLocaleTimeString()}`,
        timestamp: new Date().toLocaleString(),
        nodes: JSON.parse(JSON.stringify(nodes)),
        edges: JSON.parse(JSON.stringify(edges)),
        nodeGroups: JSON.parse(JSON.stringify(nodeGroups))
      };

      const updated = [newCheckpoint, ...checkpoints];
      set({ checkpoints: updated });
      localStorage.setItem(`mlbuilder_project_checkpoints_${projectId}`, JSON.stringify(updated));
      get().addLog('success', `Created named checkpoint snapshot: "${newCheckpoint.name}"`);
    },

    restoreCheckpoint: (checkpointId) => {
      const cp = get().checkpoints.find(c => c.id === checkpointId);
      if (!cp) return;

      // Pushing to undo stack for seamless undo of checkpoint restores!
      const originalNodes = get().nodes;
      const originalEdges = get().edges;
      const originalGroups = get().nodeGroups;

      const batchNodesMove = originalNodes.map(n => {
        const target = cp.nodes.find(cn => cn.id === n.id);
        return {
          id: n.id,
          oldX: n.x,
          oldY: n.y,
          newX: target ? target.x : n.x,
          newY: target ? target.y : n.y
        };
      });

      get().pushOperation({
        type: 'MOVE_NODE',
        payload: {
          batchNodes: batchNodesMove
        }
      });

      set({
        nodes: JSON.parse(JSON.stringify(cp.nodes)),
        edges: JSON.parse(JSON.stringify(cp.edges)),
        nodeGroups: JSON.parse(JSON.stringify(cp.nodeGroups)),
        selectedNodeIds: [],
        selectedNodeId: null
      });

      get().recalculateShapes();
      get().addLog('info', `Restored visual graph from checkpoint: "${cp.name}"`);
      get().triggerAutoSave();
    },

    deleteCheckpoint: (checkpointId) => {
      const projectId = useProjectStore.getState().activeProjectId;
      if (!projectId) return;

      const updated = get().checkpoints.filter(c => c.id !== checkpointId);
      set({ checkpoints: updated });
      localStorage.setItem(`mlbuilder_project_checkpoints_${projectId}`, JSON.stringify(updated));
      get().addLog('info', `Deleted checkpoint snapshot.`);
    },

    loadCustomBlocks: () => {
      if (typeof window === 'undefined') return;
      try {
        const saved = localStorage.getItem('mlbuilder_custom_blocks');
        if (saved) {
          set({ customBlocks: JSON.parse(saved) });
        } else {
          set({ customBlocks: [] });
        }
      } catch (err) {
        console.warn('Failed to load custom blocks from localStorage:', err);
      }
    },

    saveCustomBlock: (name, nodeIds) => {
      if (nodeIds.length === 0) return;
      const { nodes, edges } = get();
      
      const targetNodes = nodes.filter(n => nodeIds.includes(n.id));
      if (targetNodes.length === 0) return;

      const targetEdges = edges.filter(e => nodeIds.includes(e.source) && nodeIds.includes(e.target));

      const newBlock: CustomBlock = {
        id: 'block_' + Math.random().toString(36).substring(2, 10),
        name: name || `Block - ${new Date().toLocaleTimeString()}`,
        nodes: JSON.parse(JSON.stringify(targetNodes)),
        edges: JSON.parse(JSON.stringify(targetEdges))
      };

      const updated = [...get().customBlocks, newBlock];
      set({ customBlocks: updated });
      if (typeof window !== 'undefined') {
        localStorage.setItem('mlbuilder_custom_blocks', JSON.stringify(updated));
      }
      get().addLog('success', `Saved reusable custom block: "${newBlock.name}" containing ${targetNodes.length} layers.`);
    },

    spawnCustomBlock: (blockId, targetX, targetY) => {
      const block = get().customBlocks.find(b => b.id === blockId);
      if (!block) return;

      const { nodes: blockNodes, edges: blockEdges } = block;
      if (blockNodes.length === 0) return;

      const NODE_WIDTH = 220;
      const NODE_HEIGHT = 80;
      const minX = Math.min(...blockNodes.map(n => n.x));
      const minY = Math.min(...blockNodes.map(n => n.y));
      const maxX = Math.max(...blockNodes.map(n => n.x + NODE_WIDTH));
      const maxY = Math.max(...blockNodes.map(n => n.y + NODE_HEIGHT));
      
      const blockCenterX = (minX + maxX) / 2;
      const blockCenterY = (minY + maxY) / 2;

      const idMap: { [oldId: string]: string } = {};
      const spawnedNodes = blockNodes.map(node => {
        const newId = `${node.type.toLowerCase()}_${Math.random().toString(36).substring(2, 10)}`;
        idMap[node.id] = newId;

        const newX = Math.round((node.x - blockCenterX + targetX) / 20) * 20;
        const newY = Math.round((node.y - blockCenterY + targetY) / 20) * 20;

        const newName = `${node.type.toUpperCase()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

        return {
          ...node,
          id: newId,
          name: newName,
          x: newX,
          y: newY
        };
      });

      const spawnedEdges = blockEdges
        .filter(edge => idMap[edge.source] && idMap[edge.target])
        .map(edge => ({
          id: `edge_${Math.random().toString(36).substring(2, 10)}`,
          source: idMap[edge.source],
          target: idMap[edge.target]
        }));

      const updatedNodes = [...get().nodes, ...spawnedNodes];
      const updatedEdges = [...get().edges, ...spawnedEdges];
      
      set({
        nodes: updatedNodes,
        edges: updatedEdges,
        selectedNodeIds: spawnedNodes.map(n => n.id),
        selectedNodeId: spawnedNodes[0]?.id || null
      });

      get().addLog('success', `Spawned custom block: "${block.name}" with ${spawnedNodes.length} layers.`);

      const groupNodeIds = spawnedNodes.map(n => n.id);
      get().addNodeGroup(block.name, groupNodeIds);

      get().recalculateShapes();
      get().triggerAutoSave();
    },

    deleteCustomBlock: (blockId) => {
      const updated = get().customBlocks.filter(b => b.id !== blockId);
      set({ customBlocks: updated });
      if (typeof window !== 'undefined') {
        localStorage.setItem('mlbuilder_custom_blocks', JSON.stringify(updated));
      }
      get().addLog('info', 'Deleted custom block.');
    },

    // Topological Auto-Layout Suggester Engine (Upgraded to Dagre.js)
    triggerAutoLayout: () => {
      const { nodes, edges } = get();
      if (nodes.length === 0) return;

      try {
        // 1. Initialize Dagre graph layout container
        const g = new dagre.graphlib.Graph();
        g.setGraph({ 
          rankdir: 'LR',  // Left-to-Right structural flow
          ranksep: 90,    // Horizontal rank separation
          nodesep: 60,    // Vertical node separation
          marginx: 100,
          marginy: 100
        });
        g.setDefaultEdgeLabel(() => ({}));

        // 2. Add nodes with standard box dimensions (220 width, 80 height)
        nodes.forEach(node => {
          g.setNode(node.id, { width: 220, height: 80 });
        });

        // 3. Add connection edges
        edges.forEach(edge => {
          if (g.hasNode(edge.source) && g.hasNode(edge.target)) {
            g.setEdge(edge.source, edge.target);
          }
        });

        // 4. Run Dagre hierarchical layout solver
        dagre.layout(g);

        // 5. Retrieve coordinates, convert from center-based to top-left, and snap to 20px grid
        const batchNodesMove: { id: string; oldX: number; oldY: number; newX: number; newY: number }[] = [];
        const nodePositions: { id: string; x: number; y: number }[] = [];

        nodes.forEach(node => {
          const dagreNode = g.node(node.id);
          if (dagreNode) {
            // Dagre coordinates represent the center of the node box (220 x 80)
            const calculatedX = dagreNode.x - 110;
            const calculatedY = dagreNode.y - 40;

            // Apply 20px visual grid snapping
            const snappedX = Math.round(calculatedX / 20) * 20;
            const snappedY = Math.round(calculatedY / 20) * 20;

            batchNodesMove.push({
              id: node.id,
              oldX: node.x,
              oldY: node.y,
              newX: snappedX,
              newY: snappedY
            });
            nodePositions.push({ id: node.id, x: snappedX, y: snappedY });
          }
        });

        // 6. Push batch transaction to the undo stack for single-click undo safety
        get().pushOperation({
          type: 'MOVE_NODE',
          payload: {
            batchNodes: batchNodesMove
          }
        });

        // 7. Apply layout shifts and trigger reactive shape propagation
        get().batchMoveNodes(nodePositions);
        get().recalculateShapes();
        get().addLog('success', `Dagre Auto-Layout: Arranged visual model graph using hierarchical Gansner-North solver.`);
      } catch (err) {
        console.error('Dagre layout computation failed:', err);
        get().addLog('error', `Auto-Layout Error: Dagre solver failed.`);
      }
    },

    loadPrebuiltTemplate: async (templateName) => {
      const oldNodes = JSON.parse(JSON.stringify(get().nodes));
      const oldEdges = JSON.parse(JSON.stringify(get().edges));
      const oldNodeGroups = JSON.parse(JSON.stringify(get().nodeGroups));

      let newNodes: CanvasNode[] = [];
      let newEdges: CanvasEdge[] = [];
      let newNodeGroups: CanvasNodeGroup[] = [];

      const time = getFormattedTime();

      if (templateName === 'ResNet50') {
        const inputId = generateUUID();
        const convStemId = generateUUID();
        const bnStemId = generateUUID();
        const poolStemId = generateUUID();

        const conv1a = generateUUID();
        const bn1a = generateUUID();
        const conv1b = generateUUID();
        const bn1b = generateUUID();
        const conv1c = generateUUID();
        const bn1c = generateUUID();
        const conv1short = generateUUID();
        const bn1short = generateUUID();
        const conv1merge = generateUUID();

        const conv2a = generateUUID();
        const bn2a = generateUUID();
        const conv2b = generateUUID();
        const bn2b = generateUUID();
        const conv2c = generateUUID();
        const bn2c = generateUUID();
        const conv2merge = generateUUID();

        const poolGlobal = generateUUID();
        const flatten = generateUUID();
        const classifier = generateUUID();

        newNodes = [
          { id: inputId, type: 'Input', name: 'INPUT_IMAGE', x: 100, y: 300, inputShape: [], outputShape: [224, 224, 3], config: { dim: [224, 224, 3] } },
          { id: convStemId, type: 'Conv2D', name: 'CONV_STEM', x: 280, y: 300, inputShape: [], outputShape: [], config: { filters: 64, kernelSize: 7, stride: 2, padding: 'same', activation: 'ReLU' } },
          { id: bnStemId, type: 'BatchNorm2D', name: 'BN_STEM', x: 460, y: 300, inputShape: [], outputShape: [], config: {} },
          { id: poolStemId, type: 'MaxPool2D', name: 'POOL_STEM', x: 640, y: 300, inputShape: [], outputShape: [], config: { poolSize: 3 } },

          // Block 1 (Conv Block)
          { id: conv1a, type: 'Conv2D', name: 'RES1_CONV_A', x: 820, y: 200, inputShape: [], outputShape: [], config: { filters: 64, kernelSize: 1, stride: 1, padding: 'same', activation: 'ReLU' } },
          { id: bn1a, type: 'BatchNorm2D', name: 'RES1_BN_A', x: 1000, y: 200, inputShape: [], outputShape: [], config: {} },
          { id: conv1b, type: 'Conv2D', name: 'RES1_CONV_B', x: 1180, y: 200, inputShape: [], outputShape: [], config: { filters: 64, kernelSize: 3, stride: 1, padding: 'same', activation: 'ReLU' } },
          { id: bn1b, type: 'BatchNorm2D', name: 'RES1_BN_B', x: 1360, y: 200, inputShape: [], outputShape: [], config: {} },
          { id: conv1c, type: 'Conv2D', name: 'RES1_CONV_C', x: 1540, y: 200, inputShape: [], outputShape: [], config: { filters: 256, kernelSize: 1, stride: 1, padding: 'same', activation: 'None' } },
          { id: bn1c, type: 'BatchNorm2D', name: 'RES1_BN_C', x: 1720, y: 200, inputShape: [], outputShape: [], config: {} },
          { id: conv1short, type: 'Conv2D', name: 'RES1_CONV_SHORT', x: 1180, y: 400, inputShape: [], outputShape: [], config: { filters: 256, kernelSize: 1, stride: 1, padding: 'same', activation: 'None' } },
          { id: bn1short, type: 'BatchNorm2D', name: 'RES1_BN_SHORT', x: 1360, y: 400, inputShape: [], outputShape: [], config: {} },
          { id: conv1merge, type: 'ResidualAdd', name: 'RES1_MERGE_ADD', x: 1900, y: 300, inputShape: [], outputShape: [], config: {} },

          // Block 2 (Identity Block)
          { id: conv2a, type: 'Conv2D', name: 'RES2_CONV_A', x: 2080, y: 200, inputShape: [], outputShape: [], config: { filters: 64, kernelSize: 1, stride: 1, padding: 'same', activation: 'ReLU' } },
          { id: bn2a, type: 'BatchNorm2D', name: 'RES2_BN_A', x: 2260, y: 200, inputShape: [], outputShape: [], config: {} },
          { id: conv2b, type: 'Conv2D', name: 'RES2_CONV_B', x: 2440, y: 200, inputShape: [], outputShape: [], config: { filters: 64, kernelSize: 3, stride: 1, padding: 'same', activation: 'ReLU' } },
          { id: bn2b, type: 'BatchNorm2D', name: 'RES2_BN_B', x: 2620, y: 200, inputShape: [], outputShape: [], config: {} },
          { id: conv2c, type: 'Conv2D', name: 'RES2_CONV_C', x: 2800, y: 200, inputShape: [], outputShape: [], config: { filters: 256, kernelSize: 1, stride: 1, padding: 'same', activation: 'None' } },
          { id: bn2c, type: 'BatchNorm2D', name: 'RES2_BN_C', x: 2980, y: 200, inputShape: [], outputShape: [], config: {} },
          { id: conv2merge, type: 'ResidualAdd', name: 'RES2_MERGE_ADD', x: 3160, y: 300, inputShape: [], outputShape: [], config: {} },

          // Head
          { id: poolGlobal, type: 'MaxPool2D', name: 'AVG_POOL_GLOBAL', x: 3340, y: 300, inputShape: [], outputShape: [], config: { poolSize: 7 } },
          { id: flatten, type: 'Flatten', name: 'FLATTEN_HEAD', x: 3520, y: 300, inputShape: [], outputShape: [], config: {} },
          { id: classifier, type: 'Dense', name: 'DENSE_CLASSIFIER', x: 3700, y: 300, inputShape: [], outputShape: [], config: { units: 1000 } }
        ];

        newEdges = [
          { id: generateUUID(), source: inputId, target: convStemId },
          { id: generateUUID(), source: convStemId, target: bnStemId },
          { id: generateUUID(), source: bnStemId, target: poolStemId },

          // Block 1 branch
          { id: generateUUID(), source: poolStemId, target: conv1a },
          { id: generateUUID(), source: conv1a, target: bn1a },
          { id: generateUUID(), source: bn1a, target: conv1b },
          { id: generateUUID(), source: conv1b, target: bn1b },
          { id: generateUUID(), source: bn1b, target: conv1c },
          { id: generateUUID(), source: conv1c, target: bn1c },
          { id: generateUUID(), source: bn1c, target: conv1merge },

          // Block 1 shortcut
          { id: generateUUID(), source: poolStemId, target: conv1short },
          { id: generateUUID(), source: conv1short, target: bn1short },
          { id: generateUUID(), source: bn1short, target: conv1merge },

          // Block 2 branch
          { id: generateUUID(), source: conv1merge, target: conv2a },
          { id: generateUUID(), source: conv2a, target: bn2a },
          { id: generateUUID(), source: bn2a, target: conv2b },
          { id: generateUUID(), source: conv2b, target: bn2b },
          { id: generateUUID(), source: bn2b, target: conv2c },
          { id: generateUUID(), source: conv2c, target: bn2c },
          { id: generateUUID(), source: bn2c, target: conv2merge },

          // Block 2 shortcut
          { id: generateUUID(), source: conv1merge, target: conv2merge },

          // Head connections
          { id: generateUUID(), source: conv2merge, target: poolGlobal },
          { id: generateUUID(), source: poolGlobal, target: flatten },
          { id: generateUUID(), source: flatten, target: classifier }
        ];

        newNodeGroups = [
          { id: generateUUID(), name: 'ResNet Stem', color: '#8ab4f8', nodeIds: [convStemId, bnStemId, poolStemId] },
          { id: generateUUID(), name: 'Residual Block 1 (Conv)', color: '#ffe082', nodeIds: [conv1a, bn1a, conv1b, bn1b, conv1c, bn1c, conv1short, bn1short, conv1merge] },
          { id: generateUUID(), name: 'Residual Block 2 (Identity)', color: '#81c784', nodeIds: [conv2a, bn2a, conv2b, bn2b, conv2c, bn2c, conv2merge] },
          { id: generateUUID(), name: 'Classification Head', color: '#c5a3ff', nodeIds: [poolGlobal, flatten, classifier] }
        ];
      } else if (templateName === 'ViT') {
        const inputId = generateUUID();
        const patchConvId = generateUUID();

        const norm1 = generateUUID();
        const denseQkv = generateUUID();
        const denseAttnOut = generateUUID();
        const dropoutAttn = generateUUID();
        const attnMerge = generateUUID();

        const norm2 = generateUUID();
        const denseMlp1 = generateUUID();
        const denseMlp2 = generateUUID();
        const dropoutMlp = generateUUID();
        const mlpMerge = generateUUID();

        const headFlat = generateUUID();
        const classifier = generateUUID();

        newNodes = [
          { id: inputId, type: 'Input', name: 'INPUT_IMAGE', x: 100, y: 300, inputShape: [], outputShape: [224, 224, 3], config: { dim: [224, 224, 3] } },
          { id: patchConvId, type: 'Conv2D', name: 'PATCH_PROJECTION', x: 280, y: 300, inputShape: [], outputShape: [], config: { filters: 768, kernelSize: 16, stride: 16, padding: 'valid', activation: 'None' } },

          // Transformer Encoder Self Attention
          { id: norm1, type: 'BatchNorm2D', name: 'ATTN_LAYERNORM', x: 640, y: 200, inputShape: [], outputShape: [], config: {} },
          { id: denseQkv, type: 'Conv2D', name: 'QKV_PROJECTION', x: 820, y: 200, inputShape: [], outputShape: [], config: { filters: 768, kernelSize: 1, stride: 1, padding: 'same', activation: 'ReLU' } },
          { id: denseAttnOut, type: 'Conv2D', name: 'ATTN_OUT_PROJ', x: 1000, y: 200, inputShape: [], outputShape: [], config: { filters: 768, kernelSize: 1, stride: 1, padding: 'same', activation: 'None' } },
          { id: dropoutAttn, type: 'Dropout', name: 'ATTN_DROPOUT', x: 1180, y: 200, inputShape: [], outputShape: [], config: { rate: 0.1 } },
          { id: attnMerge, type: 'ResidualAdd', name: 'ATTN_RESIDUAL_ADD', x: 1360, y: 300, inputShape: [], outputShape: [], config: {} },

          // MLP
          { id: norm2, type: 'BatchNorm2D', name: 'MLP_LAYERNORM', x: 1540, y: 200, inputShape: [], outputShape: [], config: {} },
          { id: denseMlp1, type: 'Conv2D', name: 'MLP_DENSE_HIDE', x: 1720, y: 200, inputShape: [], outputShape: [], config: { filters: 3072, kernelSize: 1, stride: 1, padding: 'same', activation: 'ReLU' } },
          { id: denseMlp2, type: 'Conv2D', name: 'MLP_DENSE_OUT', x: 1900, y: 200, inputShape: [], outputShape: [], config: { filters: 768, kernelSize: 1, stride: 1, padding: 'same', activation: 'None' } },
          { id: dropoutMlp, type: 'Dropout', name: 'MLP_DROPOUT', x: 2080, y: 200, inputShape: [], outputShape: [], config: { rate: 0.1 } },
          { id: mlpMerge, type: 'ResidualAdd', name: 'MLP_RESIDUAL_ADD', x: 2260, y: 300, inputShape: [], outputShape: [], config: {} },

          // Classifier Head
          { id: headFlat, type: 'Flatten', name: 'FLATTEN_TOKENS', x: 2440, y: 300, inputShape: [], outputShape: [], config: {} },
          { id: classifier, type: 'Dense', name: 'DENSE_CLASSIFIER', x: 2620, y: 300, inputShape: [], outputShape: [], config: { units: 1000 } }
        ];

        newEdges = [
          { id: generateUUID(), source: inputId, target: patchConvId },
          { id: generateUUID(), source: patchConvId, target: norm1 },

          // Attn Branch
          { id: generateUUID(), source: norm1, target: denseQkv },
          { id: generateUUID(), source: denseQkv, target: denseAttnOut },
          { id: generateUUID(), source: denseAttnOut, target: dropoutAttn },
          { id: generateUUID(), source: dropoutAttn, target: attnMerge },
          // Attn shortcut (skip connection — same shape [14,14,768])
          { id: generateUUID(), source: patchConvId, target: attnMerge },

          // MLP Branch
          { id: generateUUID(), source: attnMerge, target: norm2 },
          { id: generateUUID(), source: norm2, target: denseMlp1 },
          { id: generateUUID(), source: denseMlp1, target: denseMlp2 },
          { id: generateUUID(), source: denseMlp2, target: dropoutMlp },
          { id: generateUUID(), source: dropoutMlp, target: mlpMerge },
          // MLP shortcut (skip connection — same shape [14,14,768])
          { id: generateUUID(), source: attnMerge, target: mlpMerge },

          // Head connections
          { id: generateUUID(), source: mlpMerge, target: headFlat },
          { id: generateUUID(), source: headFlat, target: classifier }
        ];

        newNodeGroups = [
          { id: generateUUID(), name: 'Patch Projection', color: '#8ab4f8', nodeIds: [patchConvId] },
          { id: generateUUID(), name: 'Transformer Block 1 (Self Attention)', color: '#ffe082', nodeIds: [norm1, denseQkv, denseAttnOut, dropoutAttn, attnMerge] },
          { id: generateUUID(), name: 'Transformer Block 1 (MLP)', color: '#81c784', nodeIds: [norm2, denseMlp1, denseMlp2, dropoutMlp, mlpMerge] },
          { id: generateUUID(), name: 'Classification Head', color: '#c5a3ff', nodeIds: [headFlat, classifier] }
        ];
      } // NOTE: UNet template is handled by the 'U-Net' || 'UNet' branch below.
      else if (templateName === 'MobileNet') {
        const inputId = generateUUID();
        const convStemId = generateUUID();
        const bnStemId = generateUUID();

        const convDw1 = generateUUID();
        const bnDw1 = generateUUID();
        const convPw1 = generateUUID();
        const bnPw1 = generateUUID();

        const convDw2 = generateUUID();
        const bnDw2 = generateUUID();
        const convPw2 = generateUUID();
        const bnPw2 = generateUUID();

        // Attention block
        const attnNorm = generateUUID();
        const attnQkv = generateUUID();
        const attnOut = generateUUID();
        const attnDrop = generateUUID();
        const attnAdd = generateUUID();

        const poolGlobal = generateUUID();
        const flatten = generateUUID();
        const classifier = generateUUID();

        newNodes = [
          { id: inputId, type: 'Input', name: 'INPUT_IMAGE', x: 100, y: 300, inputShape: [], outputShape: [224, 224, 3], config: { dim: [224, 224, 3] } },
          { id: convStemId, type: 'Conv2D', name: 'STEM_CONV_32', x: 280, y: 300, inputShape: [], outputShape: [], config: { filters: 32, kernelSize: 3, stride: 2, padding: 'same', activation: 'ReLU' } },
          { id: bnStemId, type: 'BatchNorm2D', name: 'STEM_BN', x: 460, y: 300, inputShape: [], outputShape: [], config: {} },

          // Separable Block 1
          { id: convDw1, type: 'Conv2D', name: 'DW_CONV_1', x: 640, y: 300, inputShape: [], outputShape: [], config: { filters: 32, kernelSize: 3, stride: 1, padding: 'same', activation: 'ReLU' } },
          { id: bnDw1, type: 'BatchNorm2D', name: 'DW_BN_1', x: 820, y: 300, inputShape: [], outputShape: [], config: {} },
          { id: convPw1, type: 'Conv2D', name: 'PW_CONV_1', x: 1000, y: 300, inputShape: [], outputShape: [], config: { filters: 64, kernelSize: 1, stride: 1, padding: 'same', activation: 'ReLU' } },
          { id: bnPw1, type: 'BatchNorm2D', name: 'PW_BN_1', x: 1180, y: 300, inputShape: [], outputShape: [], config: {} },

          // Separable Block 2
          { id: convDw2, type: 'Conv2D', name: 'DW_CONV_2', x: 1360, y: 300, inputShape: [], outputShape: [], config: { filters: 64, kernelSize: 3, stride: 2, padding: 'same', activation: 'ReLU' } },
          { id: bnDw2, type: 'BatchNorm2D', name: 'DW_BN_2', x: 1540, y: 300, inputShape: [], outputShape: [], config: {} },
          { id: convPw2, type: 'Conv2D', name: 'PW_CONV_2', x: 1720, y: 300, inputShape: [], outputShape: [], config: { filters: 128, kernelSize: 1, stride: 1, padding: 'same', activation: 'ReLU' } },
          { id: bnPw2, type: 'BatchNorm2D', name: 'PW_BN_2', x: 1900, y: 300, inputShape: [], outputShape: [], config: {} },

          // Attention Block
          { id: attnNorm, type: 'BatchNorm2D', name: 'ATTN_LAYERNORM', x: 2080, y: 300, inputShape: [], outputShape: [], config: {} },
          { id: attnQkv, type: 'Conv2D', name: 'ATTN_QKV_PROJ', x: 2260, y: 200, inputShape: [], outputShape: [], config: { filters: 128, kernelSize: 1, stride: 1, padding: 'same', activation: 'ReLU' } },
          { id: attnOut, type: 'Conv2D', name: 'ATTN_OUT_PROJ', x: 2440, y: 200, inputShape: [], outputShape: [], config: { filters: 128, kernelSize: 1, stride: 1, padding: 'same', activation: 'None' } },
          { id: attnDrop, type: 'Dropout', name: 'ATTN_DROPOUT', x: 2620, y: 200, inputShape: [], outputShape: [], config: { rate: 0.1 } },
          { id: attnAdd, type: 'ResidualAdd', name: 'ATTN_RESIDUAL_ADD', x: 2800, y: 300, inputShape: [], outputShape: [], config: {} },

          // Head
          { id: poolGlobal, type: 'MaxPool2D', name: 'AVG_POOL_GLOBAL', x: 2980, y: 300, inputShape: [], outputShape: [], config: { poolSize: 7 } },
          { id: flatten, type: 'Flatten', name: 'FLATTEN_HEAD', x: 3160, y: 300, inputShape: [], outputShape: [], config: {} },
          { id: classifier, type: 'Dense', name: 'DENSE_CLASSIFIER', x: 3340, y: 300, inputShape: [], outputShape: [], config: { units: 1000 } }
        ];

        newEdges = [
          { id: generateUUID(), source: inputId, target: convStemId },
          { id: generateUUID(), source: convStemId, target: bnStemId },
          { id: generateUUID(), source: bnStemId, target: convDw1 },

          // Block 1
          { id: generateUUID(), source: convDw1, target: bnDw1 },
          { id: generateUUID(), source: bnDw1, target: convPw1 },
          { id: generateUUID(), source: convPw1, target: bnPw1 },
          { id: generateUUID(), source: bnPw1, target: convDw2 },

          // Block 2
          { id: generateUUID(), source: convDw2, target: bnDw2 },
          { id: generateUUID(), source: bnDw2, target: convPw2 },
          { id: generateUUID(), source: convPw2, target: bnPw2 },

          // Attention Branch
          { id: generateUUID(), source: bnPw2, target: attnNorm },
          { id: generateUUID(), source: attnNorm, target: attnQkv },
          { id: generateUUID(), source: attnQkv, target: attnOut },
          { id: generateUUID(), source: attnOut, target: attnDrop },
          { id: generateUUID(), source: attnDrop, target: attnAdd },
          // Attention Shortcut
          { id: generateUUID(), source: bnPw2, target: attnAdd },

          // Head
          { id: generateUUID(), source: attnAdd, target: poolGlobal },
          { id: generateUUID(), source: poolGlobal, target: flatten },
          { id: generateUUID(), source: flatten, target: classifier }
        ];

        newNodeGroups = [
          { id: generateUUID(), name: 'Stem Block', color: '#8ab4f8', nodeIds: [convStemId, bnStemId] },
          { id: generateUUID(), name: 'Separable Block 1', color: '#ffe082', nodeIds: [convDw1, bnDw1, convPw1, bnPw1] },
          { id: generateUUID(), name: 'Separable Block 2', color: '#81c784', nodeIds: [convDw2, bnDw2, convPw2, bnPw2] },
          { id: generateUUID(), name: 'MobileNet Attention Block', color: '#ffe082', nodeIds: [attnNorm, attnQkv, attnOut, attnDrop, attnAdd] },
          { id: generateUUID(), name: 'Classifier Head', color: '#c5a3ff', nodeIds: [poolGlobal, flatten, classifier] }
        ];
      } else if (templateName === 'Sentiment Classifier') {
        const inputId = generateUUID();
        const embedId = generateUUID();
        const lstmId = generateUUID();
        const denseId = generateUUID();

        newNodes = [
          { id: inputId, type: 'Input', name: 'TOKEN_SEQUENCES', x: 250, y: 100, inputShape: [], outputShape: [128], config: { dim: [128], shape: [null, 128] } },
          { id: embedId, type: 'Embedding', name: 'WORD_EMBEDDINGS', x: 250, y: 220, inputShape: [], outputShape: [], config: { vocab_size: 10000, embedding_dim: 256 } },
          { id: lstmId, type: 'LSTM', name: 'LSTM_PROCESSING', x: 250, y: 340, inputShape: [], outputShape: [], config: { hidden_size: 128, return_sequences: false } },
          { id: denseId, type: 'Dense', name: 'SENTIMENT_OUT', x: 250, y: 460, inputShape: [], outputShape: [], config: { units: 2 } }
        ];

        newEdges = [
          { id: generateUUID(), source: inputId, target: embedId },
          { id: generateUUID(), source: embedId, target: lstmId },
          { id: generateUUID(), source: lstmId, target: denseId }
        ];

        newNodeGroups = [
          { id: generateUUID(), name: 'NLP Sentiment Classifier', color: '#8ab4f8', nodeIds: [inputId, embedId, lstmId, denseId] }
        ];

      } else if (templateName === 'Text Classifier') {
        const inputId = generateUUID();
        const embedId = generateUUID();
        const bilstmId = generateUUID();
        const gruId = generateUUID();
        const dense1Id = generateUUID();
        const dense2Id = generateUUID();

        newNodes = [
          { id: inputId, type: 'Input', name: 'TEXT_TOKENS', x: 250, y: 50, inputShape: [], outputShape: [128], config: { dim: [128], shape: [null, 128] } },
          { id: embedId, type: 'Embedding', name: 'TOKEN_EMBEDDINGS', x: 250, y: 170, inputShape: [], outputShape: [], config: { vocab_size: 10000, embedding_dim: 128 } },
          { id: bilstmId, type: 'BiLSTM', name: 'BIDIRECTIONAL_LSTM', x: 250, y: 290, inputShape: [], outputShape: [], config: { hidden_size: 64, return_sequences: true } },
          { id: gruId, type: 'GRU', name: 'GRU_PROCESSING', x: 250, y: 410, inputShape: [], outputShape: [], config: { hidden_size: 64, return_sequences: false } },
          { id: dense1Id, type: 'Dense', name: 'DENSE_PROJECTION', x: 250, y: 530, inputShape: [], outputShape: [], config: { units: 64 } },
          { id: dense2Id, type: 'Dense', name: 'TEXT_CLASSES_OUT', x: 250, y: 650, inputShape: [], outputShape: [], config: { units: 5 } }
        ];

        newEdges = [
          { id: generateUUID(), source: inputId, target: embedId },
          { id: generateUUID(), source: embedId, target: bilstmId },
          { id: generateUUID(), source: bilstmId, target: gruId },
          { id: generateUUID(), source: gruId, target: dense1Id },
          { id: generateUUID(), source: dense1Id, target: dense2Id }
        ];

        newNodeGroups = [
          { id: generateUUID(), name: 'Text Classifier Pipeline', color: '#ffe082', nodeIds: [inputId, embedId, bilstmId, gruId, dense1Id, dense2Id] }
        ];

      } else if (templateName === 'Seq2Seq') {
        const inputId = generateUUID();
        const embedId = generateUUID();
        const encLstmId = generateUUID();
        const decLstmId = generateUUID();
        const denseId = generateUUID();

        newNodes = [
          { id: inputId, type: 'Input', name: 'SOURCE_SEQUENCES', x: 250, y: 100, inputShape: [], outputShape: [80], config: { dim: [80], shape: [null, 80] } },
          { id: embedId, type: 'Embedding', name: 'SOURCE_EMBEDDINGS', x: 250, y: 220, inputShape: [], outputShape: [], config: { vocab_size: 5000, embedding_dim: 256 } },
          { id: encLstmId, type: 'LSTM', name: 'ENCODER_LSTM', x: 250, y: 340, inputShape: [], outputShape: [], config: { hidden_size: 256, return_sequences: true } },
          { id: decLstmId, type: 'LSTM', name: 'DECODER_LSTM', x: 250, y: 460, inputShape: [], outputShape: [], config: { hidden_size: 256, return_sequences: false } },
          { id: denseId, type: 'Dense', name: 'TARGET_VOCAB_OUT', x: 250, y: 580, inputShape: [], outputShape: [], config: { units: 5000 } }
        ];

        newEdges = [
          { id: generateUUID(), source: inputId, target: embedId },
          { id: generateUUID(), source: embedId, target: encLstmId },
          { id: generateUUID(), source: encLstmId, target: decLstmId },
          { id: generateUUID(), source: decLstmId, target: denseId }
        ];

        newNodeGroups = [
          { id: generateUUID(), name: 'Seq2Seq Translator', color: '#81c784', nodeIds: [inputId, embedId, encLstmId, decLstmId, denseId] }
        ];

      } else if (templateName === 'Mini-BERT') {
        const inputId = generateUUID();
        const embedId = generateUUID();
        const posId = generateUUID();
        const normId = generateUUID();
        const enc1Id = generateUUID();
        const enc2Id = generateUUID();
        const flatId = generateUUID();
        const denseId = generateUUID();

        newNodes = [
          { id: inputId, type: 'Input', name: 'MASKED_TOKEN_INPUTS', x: 250, y: 50, inputShape: [], outputShape: [128], config: { dim: [128], shape: [null, 128] } },
          { id: embedId, type: 'Embedding', name: 'WORD_EMBEDDINGS', x: 250, y: 170, inputShape: [], outputShape: [], config: { vocab_size: 10000, embedding_dim: 256 } },
          { id: posId, type: 'PositionalEncoding', name: 'POSITIONAL_ENCODINGS', x: 250, y: 290, inputShape: [], outputShape: [], config: { embed_dim: 256, max_len: 128 } },
          { id: normId, type: 'LayerNorm', name: 'BERT_LAYERNORM_1', x: 250, y: 410, inputShape: [], outputShape: [], config: {} },
          { id: enc1Id, type: 'TransformerBlock', name: 'ENCODER_BLOCK_1', x: 250, y: 530, inputShape: [], outputShape: [], config: { num_heads: 4, embed_dim: 256 } },
          { id: enc2Id, type: 'TransformerBlock', name: 'ENCODER_BLOCK_2', x: 250, y: 650, inputShape: [], outputShape: [], config: { num_heads: 4, embed_dim: 256 } },
          { id: flatId, type: 'Flatten', name: 'SEQUENCE_FLATTEN', x: 250, y: 770, inputShape: [], outputShape: [], config: {} },
          { id: denseId, type: 'Dense', name: 'VOCAB_PROJECTIONS', x: 250, y: 890, inputShape: [], outputShape: [], config: { units: 10000 } }
        ];

        newEdges = [
          { id: generateUUID(), source: inputId, target: embedId },
          { id: generateUUID(), source: embedId, target: posId },
          { id: generateUUID(), source: posId, target: normId },
          { id: generateUUID(), source: normId, target: enc1Id },
          { id: generateUUID(), source: enc1Id, target: enc2Id },
          { id: generateUUID(), source: enc2Id, target: flatId },
          { id: generateUUID(), source: flatId, target: denseId }
        ];

        newNodeGroups = [
          { id: generateUUID(), name: 'Mini-BERT Encoder', color: '#c5a3ff', nodeIds: [inputId, embedId, posId, normId, enc1Id, enc2Id, flatId, denseId] }
        ];

      } else if (templateName === 'Mini-GPT') {
        const inputId = generateUUID();
        const embedId = generateUUID();
        const posId = generateUUID();
        const dec1Id = generateUUID();
        const dec2Id = generateUUID();
        const flatId = generateUUID();
        const denseId = generateUUID();

        newNodes = [
          { id: inputId, type: 'Input', name: 'CONTEXT_TOKEN_INPUTS', x: 250, y: 50, inputShape: [], outputShape: [128], config: { dim: [128], shape: [null, 128] } },
          { id: embedId, type: 'Embedding', name: 'TOKEN_EMBEDDINGS', x: 250, y: 170, inputShape: [], outputShape: [], config: { vocab_size: 10000, embedding_dim: 256 } },
          { id: posId, type: 'PositionalEncoding', name: 'POSITIONAL_SIGNATURES', x: 250, y: 290, inputShape: [], outputShape: [], config: { embed_dim: 256, max_len: 128 } },
          { id: dec1Id, type: 'TransformerBlock', name: 'DECODER_BLOCK_1', x: 250, y: 410, inputShape: [], outputShape: [], config: { num_heads: 4, embed_dim: 256 } },
          { id: dec2Id, type: 'TransformerBlock', name: 'DECODER_BLOCK_2', x: 250, y: 530, inputShape: [], outputShape: [], config: { num_heads: 4, embed_dim: 256 } },
          { id: flatId, type: 'Flatten', name: 'SEQUENCE_FLATTEN', x: 250, y: 650, inputShape: [], outputShape: [], config: {} },
          { id: denseId, type: 'Dense', name: 'NEXT_TOKEN_PREDICTIONS', x: 250, y: 770, inputShape: [], outputShape: [], config: { units: 10000 } }
        ];

        newEdges = [
          { id: generateUUID(), source: inputId, target: embedId },
          { id: generateUUID(), source: embedId, target: posId },
          { id: generateUUID(), source: posId, target: dec1Id },
          { id: generateUUID(), source: dec1Id, target: dec2Id },
          { id: generateUUID(), source: dec2Id, target: flatId },
          { id: generateUUID(), source: flatId, target: denseId }
        ];

        newNodeGroups = [
          { id: generateUUID(), name: 'Mini-GPT Generator', color: '#ffe082', nodeIds: [inputId, embedId, posId, dec1Id, dec2Id, flatId, denseId] }
        ];

      } else if (templateName === 'Transformer Encoder') {
        const inputId = generateUUID();
        const embedId = generateUUID();
        const posId = generateUUID();
        const stackId = generateUUID();
        const normId = generateUUID();
        const flatId = generateUUID();
        const denseId = generateUUID();

        newNodes = [
          { id: inputId, type: 'Input', name: 'INPUT_SEQUENCES', x: 250, y: 50, inputShape: [], outputShape: [64], config: { dim: [64], shape: [null, 64] } },
          { id: embedId, type: 'Embedding', name: 'SEQUENCE_EMBEDDINGS', x: 250, y: 170, inputShape: [], outputShape: [], config: { vocab_size: 1000, embedding_dim: 512 } },
          { id: posId, type: 'PositionalEncoding', name: 'POSITIONAL_SIGNATURES', x: 250, y: 290, inputShape: [], outputShape: [], config: { embed_dim: 512, max_len: 64 } },
          { id: stackId, type: 'TransformerBlock', name: 'ENCODER_STACK', x: 250, y: 410, inputShape: [], outputShape: [], config: { num_heads: 8, embed_dim: 512 } },
          { id: normId, type: 'LayerNorm', name: 'STACK_NORMALIZATION', x: 250, y: 530, inputShape: [], outputShape: [], config: {} },
          { id: flatId, type: 'Flatten', name: 'FLATTEN_SEQUENCE', x: 250, y: 650, inputShape: [], outputShape: [], config: {} },
          { id: denseId, type: 'Dense', name: 'CLASSIFIER_OUT', x: 250, y: 770, inputShape: [], outputShape: [], config: { units: 2 } }
        ];

        newEdges = [
          { id: generateUUID(), source: inputId, target: embedId },
          { id: generateUUID(), source: embedId, target: posId },
          { id: generateUUID(), source: posId, target: stackId },
          { id: generateUUID(), source: stackId, target: normId },
          { id: generateUUID(), source: normId, target: flatId },
          { id: generateUUID(), source: flatId, target: denseId }
        ];

        newNodeGroups = [
          { id: generateUUID(), name: 'Transformer Representation Block', color: '#8ab4f8', nodeIds: [inputId, embedId, posId, stackId, normId, flatId, denseId] }
        ];

      } else if (templateName === 'ResNet18') {
        const inputId = generateUUID();
        const convStemId = generateUUID();
        const bnStemId = generateUUID();
        const poolStemId = generateUUID();

        const conv1a = generateUUID();
        const bn1a = generateUUID();
        const conv1b = generateUUID();
        const bn1b = generateUUID();
        const resAdd = generateUUID();

        const poolGlobal = generateUUID();
        const flatten = generateUUID();
        const classifier = generateUUID();

        newNodes = [
          { id: inputId, type: 'Input', name: 'INPUT_IMAGE', x: 250, y: 50, inputShape: [], outputShape: [224, 224, 3], config: { dim: [224, 224, 3] } },
          { id: convStemId, type: 'Conv2D', name: 'CONV_STEM', x: 250, y: 170, inputShape: [], outputShape: [], config: { filters: 64, kernelSize: 7, stride: 2, padding: 'same', activation: 'None' } },
          { id: bnStemId, type: 'BatchNorm2D', name: 'BN_STEM', x: 250, y: 290, inputShape: [], outputShape: [], config: {} },
          { id: poolStemId, type: 'MaxPool2D', name: 'POOL_STEM', x: 250, y: 410, inputShape: [], outputShape: [], config: { poolSize: 3 } },

          // Stage 1 (Residual Add Block)
          { id: conv1a, type: 'Conv2D', name: 'RES1_CONV_A', x: 120, y: 530, inputShape: [], outputShape: [], config: { filters: 64, kernelSize: 3, stride: 1, padding: 'same', activation: 'ReLU' } },
          { id: bn1a, type: 'BatchNorm2D', name: 'RES1_BN_A', x: 120, y: 650, inputShape: [], outputShape: [], config: {} },
          { id: conv1b, type: 'Conv2D', name: 'RES1_CONV_B', x: 120, y: 770, inputShape: [], outputShape: [], config: { filters: 64, kernelSize: 3, stride: 1, padding: 'same', activation: 'None' } },
          { id: bn1b, type: 'BatchNorm2D', name: 'RES1_BN_B', x: 120, y: 890, inputShape: [], outputShape: [], config: {} },
          { id: resAdd, type: 'ResidualAdd', name: 'RES1_ADD_MERGE', x: 250, y: 1010, inputShape: [], outputShape: [], config: {} },

          // Head
          { id: poolGlobal, type: 'MaxPool2D', name: 'AVG_POOL_GLOBAL', x: 250, y: 1130, inputShape: [], outputShape: [], config: { poolSize: 7 } },
          { id: flatten, type: 'Flatten', name: 'FLATTEN_HEAD', x: 250, y: 1250, inputShape: [], outputShape: [], config: {} },
          { id: classifier, type: 'Dense', name: 'DENSE_CLASSIFIER', x: 250, y: 1370, inputShape: [], outputShape: [], config: { units: 10 } }
        ];

        newEdges = [
          { id: generateUUID(), source: inputId, target: convStemId },
          { id: generateUUID(), source: convStemId, target: bnStemId },
          { id: generateUUID(), source: bnStemId, target: poolStemId },

          // Branch path
          { id: generateUUID(), source: poolStemId, target: conv1a },
          { id: generateUUID(), source: conv1a, target: bn1a },
          { id: generateUUID(), source: bn1a, target: conv1b },
          { id: generateUUID(), source: conv1b, target: bn1b },
          { id: generateUUID(), source: bn1b, target: resAdd },

          // Shortcut path
          { id: generateUUID(), source: poolStemId, target: resAdd },

          // Head
          { id: generateUUID(), source: resAdd, target: poolGlobal },
          { id: generateUUID(), source: poolGlobal, target: flatten },
          { id: generateUUID(), source: flatten, target: classifier }
        ];

        newNodeGroups = [
          { id: generateUUID(), name: 'ResNet Stem', color: '#8ab4f8', nodeIds: [convStemId, bnStemId, poolStemId] },
          { id: generateUUID(), name: 'Residual Stage 1', color: '#ffe082', nodeIds: [conv1a, bn1a, conv1b, bn1b, resAdd] },
          { id: generateUUID(), name: 'Classification Head', color: '#c5a3ff', nodeIds: [poolGlobal, flatten, classifier] }
        ];

      } else if (templateName === 'U-Net' || templateName === 'UNet') {
        const inputId = generateUUID();
        const convEnc1 = generateUUID();
        const poolEnc1 = generateUUID();
        const convEnc2 = generateUUID();
        const poolEnc2 = generateUUID();

        const convBottle = generateUUID();

        const dec2Up = generateUUID();
        // dec2SkipMerge: ResidualAdd that merges dec2Up [64,64,128] + poolEnc2 [64,64,128]
        // Both have identical spatial dims since shape engine keeps same-padding H,W unchanged
        const dec2SkipMerge = generateUUID();
        const dec2Conv1 = generateUUID();
        const dec2Bn1 = generateUUID();
        const dec2Conv2 = generateUUID();
        const dec2Bn2 = generateUUID();

        const dec1Up = generateUUID();
        const dec1Conv1 = generateUUID();
        const dec1Bn1 = generateUUID();
        const dec1Conv2 = generateUUID();
        const dec1Bn2 = generateUUID();

        const convOut = generateUUID();

        newNodes = [
          { id: inputId, type: 'Input', name: 'INPUT_IMAGE', x: 100, y: 300, inputShape: [], outputShape: [256, 256, 3], config: { dim: [256, 256, 3] } },

          // Encoder
          { id: convEnc1, type: 'Conv2D', name: 'ENC1_CONV_64', x: 280, y: 300, inputShape: [], outputShape: [], config: { filters: 64, kernelSize: 3, stride: 1, padding: 'same', activation: 'ReLU' } },
          { id: poolEnc1, type: 'MaxPool2D', name: 'ENC1_MAXPOOL', x: 460, y: 300, inputShape: [], outputShape: [], config: { poolSize: 2 } },
          { id: convEnc2, type: 'Conv2D', name: 'ENC2_CONV_128', x: 640, y: 450, inputShape: [], outputShape: [], config: { filters: 128, kernelSize: 3, stride: 1, padding: 'same', activation: 'ReLU' } },
          { id: poolEnc2, type: 'MaxPool2D', name: 'ENC2_MAXPOOL', x: 820, y: 450, inputShape: [], outputShape: [], config: { poolSize: 2 } },

          // Bottleneck
          { id: convBottle, type: 'Conv2D', name: 'BOTTLENECK_CONV', x: 1000, y: 600, inputShape: [], outputShape: [], config: { filters: 256, kernelSize: 3, stride: 1, padding: 'same', activation: 'ReLU' } },

          // Decoder Stage 2 — uses ResidualAdd to merge upsampled decoder with poolEnc2 skip
          // dec2Up and poolEnc2 both output [H_bottleneck, W_bottleneck, 128] → shapes match
          { id: dec2Up, type: 'Conv2D', name: 'DEC2_UP_CONV', x: 1180, y: 450, inputShape: [], outputShape: [], config: { filters: 128, kernelSize: 2, stride: 1, padding: 'same', activation: 'ReLU' } },
          { id: dec2SkipMerge, type: 'ResidualAdd', name: 'DEC2_SKIP_MERGE', x: 1360, y: 450, inputShape: [], outputShape: [], config: {} },
          { id: dec2Conv1, type: 'Conv2D', name: 'DEC2_CONV_1', x: 1540, y: 450, inputShape: [], outputShape: [], config: { filters: 128, kernelSize: 3, stride: 1, padding: 'same', activation: 'ReLU' } },
          { id: dec2Bn1, type: 'BatchNorm2D', name: 'DEC2_BN_1', x: 1720, y: 450, inputShape: [], outputShape: [], config: {} },
          { id: dec2Conv2, type: 'Conv2D', name: 'DEC2_CONV_2', x: 1900, y: 450, inputShape: [], outputShape: [], config: { filters: 128, kernelSize: 3, stride: 1, padding: 'same', activation: 'ReLU' } },
          { id: dec2Bn2, type: 'BatchNorm2D', name: 'DEC2_BN_2', x: 2080, y: 450, inputShape: [], outputShape: [], config: {} },

          // Decoder Stage 1 — linear path (spatial dim mismatch prevents skip from enc1)
          { id: dec1Up, type: 'Conv2D', name: 'DEC1_UP_CONV', x: 2260, y: 300, inputShape: [], outputShape: [], config: { filters: 64, kernelSize: 2, stride: 1, padding: 'same', activation: 'ReLU' } },
          { id: dec1Conv1, type: 'Conv2D', name: 'DEC1_CONV_1', x: 2440, y: 300, inputShape: [], outputShape: [], config: { filters: 64, kernelSize: 3, stride: 1, padding: 'same', activation: 'ReLU' } },
          { id: dec1Bn1, type: 'BatchNorm2D', name: 'DEC1_BN_1', x: 2620, y: 300, inputShape: [], outputShape: [], config: {} },
          { id: dec1Conv2, type: 'Conv2D', name: 'DEC1_CONV_2', x: 2800, y: 300, inputShape: [], outputShape: [], config: { filters: 64, kernelSize: 3, stride: 1, padding: 'same', activation: 'ReLU' } },
          { id: dec1Bn2, type: 'BatchNorm2D', name: 'DEC1_BN_2', x: 2980, y: 300, inputShape: [], outputShape: [], config: {} },

          // Head
          { id: convOut, type: 'Conv2D', name: 'OUTPUT_SEG_MASK', x: 3160, y: 300, inputShape: [], outputShape: [], config: { filters: 2, kernelSize: 1, stride: 1, padding: 'same', activation: 'Softmax' } }
        ];

        newEdges = [
          { id: generateUUID(), source: inputId, target: convEnc1 },
          { id: generateUUID(), source: convEnc1, target: poolEnc1 },
          { id: generateUUID(), source: poolEnc1, target: convEnc2 },
          { id: generateUUID(), source: convEnc2, target: poolEnc2 },
          { id: generateUUID(), source: poolEnc2, target: convBottle },

          // Dec 2: bottleneck → dec2Up → dec2SkipMerge ← poolEnc2 (skip)
          // poolEnc2 and dec2Up both carry [H,W,128] → ResidualAdd receives matching shapes
          { id: generateUUID(), source: convBottle, target: dec2Up },
          { id: generateUUID(), source: dec2Up, target: dec2SkipMerge },
          { id: generateUUID(), source: poolEnc2, target: dec2SkipMerge },
          { id: generateUUID(), source: dec2SkipMerge, target: dec2Conv1 },
          { id: generateUUID(), source: dec2Conv1, target: dec2Bn1 },
          { id: generateUUID(), source: dec2Bn1, target: dec2Conv2 },
          { id: generateUUID(), source: dec2Conv2, target: dec2Bn2 },

          // Dec 1: linear path from dec2Bn2
          { id: generateUUID(), source: dec2Bn2, target: dec1Up },
          { id: generateUUID(), source: dec1Up, target: dec1Conv1 },
          { id: generateUUID(), source: dec1Conv1, target: dec1Bn1 },
          { id: generateUUID(), source: dec1Bn1, target: dec1Conv2 },
          { id: generateUUID(), source: dec1Conv2, target: dec1Bn2 },

          // Output
          { id: generateUUID(), source: dec1Bn2, target: convOut }
        ];

        newNodeGroups = [
          { id: generateUUID(), name: 'Encoder Stage 1', color: '#8ab4f8', nodeIds: [convEnc1, poolEnc1] },
          { id: generateUUID(), name: 'Encoder Stage 2', color: '#ffe082', nodeIds: [convEnc2, poolEnc2] },
          { id: generateUUID(), name: 'UNet Bottleneck', color: '#80cbc4', nodeIds: [convBottle] },
          { id: generateUUID(), name: 'Decoder Stage 2', color: '#81c784', nodeIds: [dec2Up, dec2SkipMerge, dec2Conv1, dec2Bn1, dec2Conv2, dec2Bn2] },
          { id: generateUUID(), name: 'Decoder Stage 1', color: '#c5a3ff', nodeIds: [dec1Up, dec1Conv1, dec1Bn1, dec1Conv2, dec1Bn2] },
          { id: generateUUID(), name: 'Segmentation Head', color: '#ffe082', nodeIds: [convOut] }
        ];

      } else if (templateName === 'GCN') {
        const featId = generateUUID();
        const gcn1Id = generateUUID();
        const gcn2Id = generateUUID();

        // Edge index removed: shape [2, num_edges] is incompatible with node feature shape
        // causing broadcast validation errors at every GCN layer. The edge structure is
        // handled internally by the GCN layer type during code generation.
        newNodes = [
          { id: featId, type: 'Input', name: 'NODE_FEATURES', x: 250, y: 100, inputShape: [], outputShape: [1433], config: { dim: [1433], shape: [null, 1433] } },
          { id: gcn1Id, type: 'GCN', name: 'GCN_LAYER_1', x: 500, y: 100, inputShape: [], outputShape: [], config: { out_features: 64 } },
          { id: gcn2Id, type: 'GCN', name: 'GCN_LAYER_2', x: 750, y: 100, inputShape: [], outputShape: [], config: { out_features: 7 } }
        ];

        newEdges = [
          { id: generateUUID(), source: featId, target: gcn1Id },
          { id: generateUUID(), source: gcn1Id, target: gcn2Id }
        ];

        newNodeGroups = [
          { id: generateUUID(), name: 'Graph Convolutional Network', color: '#81c784', nodeIds: [featId, gcn1Id, gcn2Id] }
        ];

      } else if (templateName === 'GraphSAGE') {
        const featId = generateUUID();
        const sage1Id = generateUUID();
        const sage2Id = generateUUID();

        // Edge index removed: shape [2, num_edges] is incompatible with node feature shape
        // causing broadcast validation errors at every SAGE layer. The neighborhood
        // aggregation is handled internally by the GraphSAGE layer during code generation.
        newNodes = [
          { id: featId, type: 'Input', name: 'NODE_FEATURES', x: 250, y: 100, inputShape: [], outputShape: [1433], config: { dim: [1433], shape: [null, 1433] } },
          { id: sage1Id, type: 'GraphSAGE', name: 'SAGE_LAYER_1', x: 500, y: 100, inputShape: [], outputShape: [], config: { out_features: 64 } },
          { id: sage2Id, type: 'GraphSAGE', name: 'SAGE_LAYER_2', x: 750, y: 100, inputShape: [], outputShape: [], config: { out_features: 7 } }
        ];

        newEdges = [
          { id: generateUUID(), source: featId, target: sage1Id },
          { id: generateUUID(), source: sage1Id, target: sage2Id }
        ];

        newNodeGroups = [
          { id: generateUUID(), name: 'SAGE Graph Network', color: '#ffe082', nodeIds: [featId, sage1Id, sage2Id] }
        ];

      } else if (templateName === 'DenseNet') {
        // DenseNet-inspired architecture: each block's output is concatenated to ALL subsequent inputs
        // Simulated here as dense skip connections via ResidualAdd nodes
        const inputId = generateUUID();
        const conv0 = generateUUID();
        const bn0 = generateUUID();

        const conv1 = generateUUID(); const bn1 = generateUUID(); const add1 = generateUUID();
        const conv2 = generateUUID(); const bn2 = generateUUID(); const add2 = generateUUID();
        const conv3 = generateUUID(); const bn3 = generateUUID(); const add3 = generateUUID();
        const conv4 = generateUUID(); const bn4 = generateUUID(); const add4 = generateUUID();

        const pool = generateUUID();
        const flatten = generateUUID();
        const dense1 = generateUUID();
        const drop1 = generateUUID();
        const dense2 = generateUUID();

        newNodes = [
          { id: inputId, type: 'Input', name: 'INPUT_IMAGE', x: 80, y: 300, inputShape: [], outputShape: [224, 224, 3], config: { dim: [224, 224, 3] } },

          // Stem
          { id: conv0, type: 'Conv2D', name: 'STEM_CONV', x: 260, y: 300, inputShape: [], outputShape: [], config: { filters: 64, kernelSize: 7, stride: 2, padding: 'same', activation: 'ReLU' } },
          { id: bn0, type: 'BatchNorm2D', name: 'STEM_BN', x: 420, y: 300, inputShape: [], outputShape: [], config: {} },

          // Dense Block 1 — all blocks use filters=64 to match stem output for valid ResidualAdd element-wise addition
          { id: conv1, type: 'Conv2D', name: 'DENSE1_CONV', x: 580, y: 200, inputShape: [], outputShape: [], config: { filters: 64, kernelSize: 3, stride: 1, padding: 'same', activation: 'ReLU' } },
          { id: bn1, type: 'BatchNorm2D', name: 'DENSE1_BN', x: 740, y: 200, inputShape: [], outputShape: [], config: {} },
          { id: add1, type: 'ResidualAdd', name: 'DENSE1_SKIP', x: 900, y: 300, inputShape: [], outputShape: [], config: {} },

          // Dense Block 2
          { id: conv2, type: 'Conv2D', name: 'DENSE2_CONV', x: 1060, y: 200, inputShape: [], outputShape: [], config: { filters: 64, kernelSize: 3, stride: 1, padding: 'same', activation: 'ReLU' } },
          { id: bn2, type: 'BatchNorm2D', name: 'DENSE2_BN', x: 1220, y: 200, inputShape: [], outputShape: [], config: {} },
          { id: add2, type: 'ResidualAdd', name: 'DENSE2_SKIP', x: 1380, y: 300, inputShape: [], outputShape: [], config: {} },

          // Dense Block 3
          { id: conv3, type: 'Conv2D', name: 'DENSE3_CONV', x: 1540, y: 200, inputShape: [], outputShape: [], config: { filters: 64, kernelSize: 3, stride: 1, padding: 'same', activation: 'ReLU' } },
          { id: bn3, type: 'BatchNorm2D', name: 'DENSE3_BN', x: 1700, y: 200, inputShape: [], outputShape: [], config: {} },
          { id: add3, type: 'ResidualAdd', name: 'DENSE3_SKIP', x: 1860, y: 300, inputShape: [], outputShape: [], config: {} },

          // Dense Block 4
          { id: conv4, type: 'Conv2D', name: 'DENSE4_CONV', x: 2020, y: 200, inputShape: [], outputShape: [], config: { filters: 64, kernelSize: 3, stride: 1, padding: 'same', activation: 'ReLU' } },
          { id: bn4, type: 'BatchNorm2D', name: 'DENSE4_BN', x: 2180, y: 200, inputShape: [], outputShape: [], config: {} },
          { id: add4, type: 'ResidualAdd', name: 'DENSE4_SKIP', x: 2340, y: 300, inputShape: [], outputShape: [], config: {} },

          // Head
          { id: pool, type: 'MaxPool2D', name: 'GLOBAL_POOL', x: 2500, y: 300, inputShape: [], outputShape: [], config: { poolSize: 7 } },
          { id: flatten, type: 'Flatten', name: 'FLATTEN', x: 2660, y: 300, inputShape: [], outputShape: [], config: {} },
          { id: dense1, type: 'Dense', name: 'FC_1024', x: 2820, y: 300, inputShape: [], outputShape: [], config: { units: 1024 } },
          { id: drop1, type: 'Dropout', name: 'DROPOUT_0_5', x: 2980, y: 300, inputShape: [], outputShape: [], config: { rate: 0.5 } },
          { id: dense2, type: 'Dense', name: 'CLASSIFIER', x: 3140, y: 300, inputShape: [], outputShape: [], config: { units: 1000 } },
        ];

        newEdges = [
          { id: generateUUID(), source: inputId, target: conv0 },
          { id: generateUUID(), source: conv0, target: bn0 },

          // Dense Block 1
          { id: generateUUID(), source: bn0, target: conv1 },
          { id: generateUUID(), source: conv1, target: bn1 },
          { id: generateUUID(), source: bn1, target: add1 },
          { id: generateUUID(), source: bn0, target: add1 }, // skip from stem

          // Dense Block 2
          { id: generateUUID(), source: add1, target: conv2 },
          { id: generateUUID(), source: conv2, target: bn2 },
          { id: generateUUID(), source: bn2, target: add2 },
          { id: generateUUID(), source: add1, target: add2 }, // skip from block 1

          // Dense Block 3
          { id: generateUUID(), source: add2, target: conv3 },
          { id: generateUUID(), source: conv3, target: bn3 },
          { id: generateUUID(), source: bn3, target: add3 },
          { id: generateUUID(), source: add2, target: add3 }, // skip from block 2

          // Dense Block 4
          { id: generateUUID(), source: add3, target: conv4 },
          { id: generateUUID(), source: conv4, target: bn4 },
          { id: generateUUID(), source: bn4, target: add4 },
          { id: generateUUID(), source: add3, target: add4 }, // skip from block 3

          // Head
          { id: generateUUID(), source: add4, target: pool },
          { id: generateUUID(), source: pool, target: flatten },
          { id: generateUUID(), source: flatten, target: dense1 },
          { id: generateUUID(), source: dense1, target: drop1 },
          { id: generateUUID(), source: drop1, target: dense2 },
        ];

        newNodeGroups = [
          { id: generateUUID(), name: 'Stem', color: '#8ab4f8', nodeIds: [conv0, bn0] },
          { id: generateUUID(), name: 'Dense Block 1', color: '#ffe082', nodeIds: [conv1, bn1, add1] },
          { id: generateUUID(), name: 'Dense Block 2', color: '#81c784', nodeIds: [conv2, bn2, add2] },
          { id: generateUUID(), name: 'Dense Block 3', color: '#c5a3ff', nodeIds: [conv3, bn3, add3] },
          { id: generateUUID(), name: 'Dense Block 4', color: '#f28b82', nodeIds: [conv4, bn4, add4] },
          { id: generateUUID(), name: 'Classification Head', color: '#80cbc4', nodeIds: [pool, flatten, dense1, drop1, dense2] },
        ];

      } else if (templateName === 'AlexNet') {
        const inputId = generateUUID();
        const conv1Id = generateUUID(); const pool1Id = generateUUID();
        const conv2Id = generateUUID(); const pool2Id = generateUUID();
        const conv3Id = generateUUID();
        const conv4Id = generateUUID();
        const conv5Id = generateUUID(); const pool5Id = generateUUID();
        const flatId = generateUUID();
        const fc1Id = generateUUID(); const drop1Id = generateUUID();
        const fc2Id = generateUUID(); const drop2Id = generateUUID();
        const fc3Id = generateUUID();

        newNodes = [
          { id: inputId, type: 'Input', name: 'INPUT_IMAGE', x: 80, y: 300, inputShape: [], outputShape: [224, 224, 3], config: { dim: [224, 224, 3] } },

          // Conv layers
          { id: conv1Id, type: 'Conv2D', name: 'CONV1_96', x: 260, y: 300, inputShape: [], outputShape: [], config: { filters: 96, kernelSize: 11, stride: 4, padding: 'valid', activation: 'ReLU' } },
          { id: pool1Id, type: 'MaxPool2D', name: 'POOL1', x: 440, y: 300, inputShape: [], outputShape: [], config: { poolSize: 3 } },
          { id: conv2Id, type: 'Conv2D', name: 'CONV2_256', x: 620, y: 300, inputShape: [], outputShape: [], config: { filters: 256, kernelSize: 5, stride: 1, padding: 'same', activation: 'ReLU' } },
          { id: pool2Id, type: 'MaxPool2D', name: 'POOL2', x: 800, y: 300, inputShape: [], outputShape: [], config: { poolSize: 3 } },
          { id: conv3Id, type: 'Conv2D', name: 'CONV3_384', x: 980, y: 300, inputShape: [], outputShape: [], config: { filters: 384, kernelSize: 3, stride: 1, padding: 'same', activation: 'ReLU' } },
          { id: conv4Id, type: 'Conv2D', name: 'CONV4_384', x: 1160, y: 300, inputShape: [], outputShape: [], config: { filters: 384, kernelSize: 3, stride: 1, padding: 'same', activation: 'ReLU' } },
          { id: conv5Id, type: 'Conv2D', name: 'CONV5_256', x: 1340, y: 300, inputShape: [], outputShape: [], config: { filters: 256, kernelSize: 3, stride: 1, padding: 'same', activation: 'ReLU' } },
          { id: pool5Id, type: 'MaxPool2D', name: 'POOL5', x: 1520, y: 300, inputShape: [], outputShape: [], config: { poolSize: 3 } },

          // Classifier
          { id: flatId, type: 'Flatten', name: 'FLATTEN', x: 1700, y: 300, inputShape: [], outputShape: [], config: {} },
          { id: fc1Id, type: 'Dense', name: 'FC1_4096', x: 1880, y: 300, inputShape: [], outputShape: [], config: { units: 4096 } },
          { id: drop1Id, type: 'Dropout', name: 'DROPOUT_1', x: 2060, y: 300, inputShape: [], outputShape: [], config: { rate: 0.5 } },
          { id: fc2Id, type: 'Dense', name: 'FC2_4096', x: 2240, y: 300, inputShape: [], outputShape: [], config: { units: 4096 } },
          { id: drop2Id, type: 'Dropout', name: 'DROPOUT_2', x: 2420, y: 300, inputShape: [], outputShape: [], config: { rate: 0.5 } },
          { id: fc3Id, type: 'Dense', name: 'CLASSIFIER_1000', x: 2600, y: 300, inputShape: [], outputShape: [], config: { units: 1000 } },
        ];

        newEdges = [
          { id: generateUUID(), source: inputId, target: conv1Id },
          { id: generateUUID(), source: conv1Id, target: pool1Id },
          { id: generateUUID(), source: pool1Id, target: conv2Id },
          { id: generateUUID(), source: conv2Id, target: pool2Id },
          { id: generateUUID(), source: pool2Id, target: conv3Id },
          { id: generateUUID(), source: conv3Id, target: conv4Id },
          { id: generateUUID(), source: conv4Id, target: conv5Id },
          { id: generateUUID(), source: conv5Id, target: pool5Id },
          { id: generateUUID(), source: pool5Id, target: flatId },
          { id: generateUUID(), source: flatId, target: fc1Id },
          { id: generateUUID(), source: fc1Id, target: drop1Id },
          { id: generateUUID(), source: drop1Id, target: fc2Id },
          { id: generateUUID(), source: fc2Id, target: drop2Id },
          { id: generateUUID(), source: drop2Id, target: fc3Id },
        ];

        newNodeGroups = [
          { id: generateUUID(), name: 'Feature Extraction (Conv)', color: '#8ab4f8', nodeIds: [conv1Id, pool1Id, conv2Id, pool2Id, conv3Id, conv4Id, conv5Id, pool5Id] },
          { id: generateUUID(), name: 'Classifier (FC)', color: '#c5a3ff', nodeIds: [flatId, fc1Id, drop1Id, fc2Id, drop2Id, fc3Id] },
        ];

      } else if (templateName === 'LeNet') {
        const inputId = generateUUID();
        const conv1Id = generateUUID(); const pool1Id = generateUUID();
        const conv2Id = generateUUID(); const pool2Id = generateUUID();
        const flatId = generateUUID();
        const fc1Id = generateUUID();
        const fc2Id = generateUUID();
        const fc3Id = generateUUID();

        newNodes = [
          { id: inputId, type: 'Input', name: 'INPUT_32x32', x: 80, y: 300, inputShape: [], outputShape: [32, 32, 1], config: { dim: [32, 32, 1] } },
          { id: conv1Id, type: 'Conv2D', name: 'C1_CONV_6', x: 260, y: 300, inputShape: [], outputShape: [], config: { filters: 6, kernelSize: 5, stride: 1, padding: 'valid', activation: 'Tanh' } },
          { id: pool1Id, type: 'MaxPool2D', name: 'S2_AVG_POOL', x: 440, y: 300, inputShape: [], outputShape: [], config: { poolSize: 2 } },
          { id: conv2Id, type: 'Conv2D', name: 'C3_CONV_16', x: 620, y: 300, inputShape: [], outputShape: [], config: { filters: 16, kernelSize: 5, stride: 1, padding: 'valid', activation: 'Tanh' } },
          { id: pool2Id, type: 'MaxPool2D', name: 'S4_AVG_POOL', x: 800, y: 300, inputShape: [], outputShape: [], config: { poolSize: 2 } },
          { id: flatId, type: 'Flatten', name: 'FLATTEN', x: 980, y: 300, inputShape: [], outputShape: [], config: {} },
          { id: fc1Id, type: 'Dense', name: 'F5_DENSE_120', x: 1160, y: 300, inputShape: [], outputShape: [], config: { units: 120 } },
          { id: fc2Id, type: 'Dense', name: 'F6_DENSE_84', x: 1340, y: 300, inputShape: [], outputShape: [], config: { units: 84 } },
          { id: fc3Id, type: 'Dense', name: 'OUTPUT_10', x: 1520, y: 300, inputShape: [], outputShape: [], config: { units: 10 } },
        ];

        newEdges = [
          { id: generateUUID(), source: inputId, target: conv1Id },
          { id: generateUUID(), source: conv1Id, target: pool1Id },
          { id: generateUUID(), source: pool1Id, target: conv2Id },
          { id: generateUUID(), source: conv2Id, target: pool2Id },
          { id: generateUUID(), source: pool2Id, target: flatId },
          { id: generateUUID(), source: flatId, target: fc1Id },
          { id: generateUUID(), source: fc1Id, target: fc2Id },
          { id: generateUUID(), source: fc2Id, target: fc3Id },
        ];

        newNodeGroups = [
          { id: generateUUID(), name: 'Feature Maps (Conv)', color: '#8ab4f8', nodeIds: [conv1Id, pool1Id, conv2Id, pool2Id] },
          { id: generateUUID(), name: 'Classifier (FC)', color: '#c5a3ff', nodeIds: [flatId, fc1Id, fc2Id, fc3Id] },
        ];

      } else {
        return;
      }

      get().pushOperation({
        type: 'SET_GRAPH',
        payload: {
          oldNodes,
          oldEdges,
          oldNodeGroups,
          newNodes,
          newEdges,
          newNodeGroups
        }
      });

      set({
        nodes: newNodes,
        edges: newEdges,
        nodeGroups: newNodeGroups,
        selectedNodeIds: [],
        selectedNodeId: null
      });

      get().recalculateShapes();
      get().addLog('success', `Marketplace Import: Successfully imported prebuilt ${templateName} template into visual canvas.`);
      toast.success('Template Loaded', `Visual workspace populated with prebuilt ${templateName} layout.`);

      const syncWithDatabase = async () => {
        const activeProjId = useProjectStore.getState().activeProjectId;
        if (!activeProjId) return;

        // Poll for WebSocket connection readiness up to 15 times (3 seconds)
        let attempts = 0;
        while (get().syncStatus !== 'connected' && attempts < 15) {
          await new Promise(resolve => setTimeout(resolve, 200));
          attempts++;
        }

        const ws = get().ws;
        const isWsConnected = get().syncStatus === 'connected' && ws && ws.readyState === WebSocket.OPEN;

        if (isWsConnected) {
          // 1. Delete all old nodes (backend cascades to edges)
          oldNodes.forEach((n: CanvasNode) => {
            ws.send(JSON.stringify({
              type: 'operation',
              op: {
                action: 'DELETE_NODE',
                payload: { node_id: n.id },
                timestamp: Date.now() / 1000
              }
            }));
          });

          // 2. Add new nodes
          newNodes.forEach((n: CanvasNode) => {
            ws.send(JSON.stringify({
              type: 'operation',
              op: {
                action: 'ADD_NODE',
                payload: {
                  node_id: n.id,
                  type: n.type,
                  label: n.name,
                  position_x: n.x,
                  position_y: n.y,
                  config: n.config
                },
                timestamp: Date.now() / 1000
              }
            }));
          });

          // 3. Add new edges
          newEdges.forEach((e: CanvasEdge) => {
            ws.send(JSON.stringify({
              type: 'operation',
              op: {
                action: 'ADD_EDGE',
                payload: {
                  edge_id: e.id,
                  from_node_id: e.source,
                  to_node_id: e.target
                },
                timestamp: Date.now() / 1000
              }
            }));
          });

          get().addLog('success', `Database Synced: Pushed ${newNodes.length} nodes & ${newEdges.length} edges via WebSocket.`);
        } else {
          // Fallback to GraphQL if WS is still not connected
          get().addLog('warning', 'WebSocket sync unavailable. Syncing template via GraphQL...');
          try {
            // Delete old nodes
            for (const n of oldNodes) {
              await graphqlRequest(DELETE_NODE, { projectId: activeProjId, nodeId: n.id });
            }
            
            // Map old client IDs to new database UUIDs
            const oldToNewIdMap = new Map<string, string>();
            for (const n of newNodes) {
              const res = await graphqlRequest(ADD_NODE, {
                projectId: activeProjId,
                type: n.type,
                label: n.name,
                position: { x: n.x, y: n.y },
                config: n.config
              });
              if (res && res.addNode) {
                oldToNewIdMap.set(n.id, res.addNode.id);
              }
            }

            // Add new edges
            for (const e of newEdges) {
              const newSource = oldToNewIdMap.get(e.source);
              const newTarget = oldToNewIdMap.get(e.target);
              if (newSource && newTarget) {
                await graphqlRequest(ADD_EDGE, {
                  projectId: activeProjId,
                  fromNodeId: newSource,
                  toNodeId: newTarget
                });
              }
            }

            // Map old client IDs to new database UUIDs in nodeGroups
            const updatedNodeGroups = newNodeGroups.map(group => ({
              ...group,
              nodeIds: group.nodeIds.map(oldId => oldToNewIdMap.get(oldId) || oldId)
            }));

            // Save the updated draft to localStorage immediately so loadGraph loads it correctly
            if (typeof window !== 'undefined') {
              const mappedNodes = newNodes.map(n => ({
                ...n,
                id: oldToNewIdMap.get(n.id) || n.id
              }));
              const mappedEdges = newEdges.map(e => ({
                ...e,
                source: oldToNewIdMap.get(e.source) || e.source,
                target: oldToNewIdMap.get(e.target) || e.target
              }));
              const draftData = JSON.stringify({
                nodes: mappedNodes,
                edges: mappedEdges,
                nodeGroups: updatedNodeGroups
              });
              localStorage.setItem(`mlbuilder_project_draft_${activeProjId}`, draftData);
            }

            // Since GraphQL mutations generated new database IDs, reload graph to align client IDs
            await get().loadGraph(activeProjId);
            get().addLog('success', `GraphQL Synced: Template saved successfully.`);
          } catch (err: any) {
            console.error('GraphQL template sync failed:', err);
            get().addLog('error', `Database Sync Error: Failed to save template. ${err.message || err}`);
          }
        }
      };

      if (useProjectStore.getState().isOnline) {
        syncWithDatabase();
      }
    },

    setClusterPriority: (priority) => {
      set({ clusterPriority: priority });
      get().addLog('info', `Admin: Cluster Priority updated to ${priority}`);
    },

    setGpuThrottleLimit: (limit) => {
      set({ gpuThrottleLimit: limit });
      get().addLog('info', `Admin: GPU Throttle Limit set to ${limit}%`);
    },
  };
});


