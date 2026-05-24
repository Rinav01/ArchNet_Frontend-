export type NodeType = 'Input' | 'Conv2D' | 'MaxPool2D' | 'Flatten' | 'Dense';

export interface NodeConfig {
  // Input specific
  dim?: number[];
  
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
  framework: 'PyTorch' | 'TensorFlow' | 'JAX';
  status: 'Production Ready' | 'Training' | 'Draft';
  layersCount: number;
  learningRate?: string;
  loss?: string;
  latency?: string;
  parameters?: string;
  updatedAt: string;
  notes?: string;
}
