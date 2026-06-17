export type NodeType =
  | 'Input'
  | 'Conv2D'
  | 'MaxPool2D'
  | 'Flatten'
  | 'Dense'
  | 'BatchNorm2D'
  | 'Dropout'
  | 'Embedding'
  | 'PositionalEncoding'
  | 'LayerNorm'
  | 'Attention'
  | 'MultiHeadAttention'
  | 'ResidualAdd'
  | 'TransformerBlock'
  | 'EncoderBlock'
  | 'DecoderBlock'
  | 'LSTM'
  | 'GRU'
  | 'BiLSTM'
  | 'RNN'
  | 'GCN'
  | 'GraphSAGE'
  | 'GAT';

export interface NodeConfig {
  // Input specific
  dim?: number[];
  shape?: (number | null)[];
  
  // Conv2D specific
  filters?: number;
  kernelSize?: number;
  stride?: number;
  padding?: 'same' | 'valid';
  activation?: 'ReLU' | 'Sigmoid' | 'Tanh' | 'Softmax' | 'None';

  // MaxPool2D specific
  poolSize?: number;

  // Dense specific
  units?: number;

  // Dropout specific
  rate?: number;

  // NLP / Transformer specific
  vocab_size?: number;
  embedding_dim?: number;
  num_heads?: number;
  embed_dim?: number;
  max_len?: number;
  hidden_size?: number;
  return_sequences?: boolean;
  
  // GNN specific
  out_features?: number;
  num_layers?: number;

  // Private parameters tracking flag
  _exploded?: boolean;
}

export interface CanvasNode {
  id: string;
  type: NodeType;
  name: string;
  x: number;
  y: number;
  inputShape: number[];
  outputShape: number[];
  config: NodeConfig;
}

export interface CanvasEdge {
  id: string;
  source: string; // source node ID
  target: string; // target node ID
}

export interface LogItem {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
  text: string;
}

export interface Project {
  id: string;
  name: string;
  framework: 'PyTorch' | 'TensorFlow' | 'JAX' | 'ONNX';
  status: 'Production Ready' | 'Training' | 'Draft';
  layersCount: number;
  learningRate?: string;
  loss?: string;
  latency?: string;
  parameters?: string;
  updatedAt: string;
  notes?: string;
  totalParameterCount?: number;
  estimatedGpuMemoryMb?: number;
}

export interface ValidationError {
  nodeId?: string; // Undefined if global graph-level error (e.g. cycles)
  type: 'error' | 'warning' | 'info';
  severity?: 'info' | 'warning' | 'error' | 'fatal';
  category: 'rank' | 'broadcast' | 'reshape' | 'attention' | 'cycle' | 'disconnected' | 'compatibility' | 'compilation';
  message: string;
  stackTrace?: string; // python stack trace or detail
}

export interface CompilationResult {
  success: boolean;
  generatedCode: string;
  executionLogs: string;
  semanticErrors: string[];
  compatibilityErrors: string[];
  compilationErrors: string[];
}

export interface GraphOperation {
  id: string;
  type: 'ADD_NODE' | 'REMOVE_NODE' | 'UPDATE_CONFIG' | 'UPDATE_NAME' | 'ADD_EDGE' | 'REMOVE_EDGE' | 'MOVE_NODE' | 'SET_GRAPH';
  payload: {
    nodeId?: string;
    node?: CanvasNode;
    edges?: CanvasEdge[];
    edge?: CanvasEdge;
    oldConfig?: NodeConfig;
    newConfig?: NodeConfig;
    oldName?: string;
    newName?: string;
    oldX?: number;
    oldY?: number;
    newX?: number;
    newY?: number;
    batchNodes?: { id: string; oldX: number; oldY: number; newX: number; newY: number }[];
    oldNodes?: CanvasNode[];
    newNodes?: CanvasNode[];
    oldEdges?: CanvasEdge[];
    newEdges?: CanvasEdge[];
    oldNodeGroups?: CanvasNodeGroup[];
    newNodeGroups?: CanvasNodeGroup[];
  };
}

export interface Collaborator {
  clientId: string;
  userId: string;
  username: string;
  color: string;
  cursor: { x: number; y: number } | null;
  selection: string | null;
}

export interface TrainingJob {
  id: string;
  projectId: string;
  datasetId: string | null;
  status: 'IDLE' | 'PENDING' | 'RUNNING' | 'PAUSED' | 'STOPPED' | 'COMPLETED' | 'FAILED';
  epochs: number;
  currentEpoch: number;
  lossHistory: number[];
  accuracyHistory: number[];
  metricsMetadata: {
    provider?: 'local' | 'vertex' | string;
    machine_type?: string;
    accelerator?: string;
    peak_memory_used_mb?: number;
    training_duration_seconds?: number;
    final_loss?: number;
    final_accuracy?: number;
    logs?: string;
    error?: string;
    [key: string]: any;
  } | null;
}

export interface CanvasNodeGroup {
  id: string;
  name: string;
  color: string;
  nodeIds: string[];
  isCollapsed?: boolean;
}

export interface ModelCheckpoint {
  id: string;
  name: string;
  timestamp: string;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  nodeGroups: CanvasNodeGroup[];
}

export interface CustomBlock {
  id: string;
  name: string;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

export interface AutoMLSuggestion {
  id: string;
  title: string;
  category: 'anti-pattern' | 'optimization' | 'architecture';
  description: string;
  advice: string;
  severity: 'high' | 'medium' | 'info';
  score: number; // 0 to 10
  nodeId?: string;
  fixLabel: string;
  applyFix: () => void;
}






