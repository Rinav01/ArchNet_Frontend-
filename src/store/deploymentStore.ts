import { create } from 'zustand';

export interface RegisteredModel {
  id: string;
  name: string;
  version: string;
  framework: 'PyTorch' | 'TensorFlow' | 'JAX' | 'ONNX';
  accuracy: number;
  createdAt: string;
  projectId: string;
}

export interface Deployment {
  id: string;
  projectId: string;
  modelName: string;
  runId: string;
  framework: 'PyTorch' | 'TensorFlow' | 'JAX' | 'ONNX';
  status: 'deploying' | 'active' | 'inactive';
  url: string;
  createdAt: string;
}

export interface MetricFrame {
  timestamp: string;
  requestsPerSec: number;
  latencyMs: number;
  successRate: number;
  errors: number;
}

interface DeploymentStoreState {
  registeredModels: RegisteredModel[];
  deployments: Record<string, Deployment>; // Key is projectId
  metricsHistory: Record<string, MetricFrame[]>; // Key is projectId
  activeMetric: Record<string, MetricFrame>; // Key is projectId
  
  // Actions
  registerModel: (model: Omit<RegisteredModel, 'id' | 'createdAt'>) => void;
  deployModel: (projectId: string, runId: string, framework: 'PyTorch' | 'TensorFlow' | 'JAX' | 'ONNX', modelName: string) => Promise<void>;
  undeployModel: (projectId: string) => void;
  updateLiveMetrics: (projectId: string) => void;
}

export const useDeploymentStore = create<DeploymentStoreState>((set, get) => ({
  registeredModels: [
    { id: 'reg_1', name: 'ResNet-50 Classifier', version: 'v2.1.0', framework: 'PyTorch', accuracy: 0.948, createdAt: '2026-06-05T14:32:00Z', projectId: 'project_1' },
    { id: 'reg_2', name: 'MobileNet-V3 Edge', version: 'v1.0.4', framework: 'ONNX', accuracy: 0.912, createdAt: '2026-06-03T09:15:00Z', projectId: 'project_2' },
    { id: 'reg_3', name: 'Transformer Attention Base', version: 'v1.1.2', framework: 'JAX', accuracy: 0.964, createdAt: '2026-06-01T11:45:00Z', projectId: 'project_3' },
    { id: 'reg_4', name: 'UNet Segmentation Symmetric', version: 'v3.0.0', framework: 'TensorFlow', accuracy: 0.897, createdAt: '2026-05-28T16:20:00Z', projectId: 'project_4' },
  ],
  deployments: {},
  metricsHistory: {},
  activeMetric: {},

  registerModel: (modelData) => {
    const newModel: RegisteredModel = {
      ...modelData,
      id: `reg_${Math.random().toString(36).substring(2, 9)}`,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({
      registeredModels: [newModel, ...state.registeredModels]
    }));
  },

  deployModel: async (projectId, runId, framework, modelName) => {
    const deploymentId = `dep_${Math.random().toString(36).substring(2, 9)}`;
    
    // Set status to deploying
    set((state) => ({
      deployments: {
        ...state.deployments,
        [projectId]: {
          id: deploymentId,
          projectId,
          modelName,
          runId,
          framework,
          status: 'deploying',
          url: '',
          createdAt: new Date().toISOString()
        }
      }
    }));

    // Simulate build and deployment steps (2 seconds)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Change status to active and provide URL
    set((state) => ({
      deployments: {
        ...state.deployments,
        [projectId]: {
          ...state.deployments[projectId],
          status: 'active',
          url: `https://inference.archnet.ai/v1/models/${modelName.toLowerCase().replace(/\s+/g, '-')}/predict`
        }
      }
    }));

    // Register this new model version automatically in the Model Registry!
    // Version count depends on how many versions of this project name exist in registry.
    const existingVersions = get().registeredModels.filter(m => m.name === modelName).length;
    const versionStr = `v1.${existingVersions}.0`;

    // Find accuracy from training history or default to 91.2%
    let accuracy = 0.912;
    if (runId.startsWith('run_') || !isNaN(Number(runId))) {
      accuracy = 0.88 + Math.random() * 0.08;
    }

    get().registerModel({
      name: modelName,
      version: versionStr,
      framework,
      accuracy,
      projectId
    });

    // Initialize metrics
    const initialFrame: MetricFrame = {
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      requestsPerSec: 0,
      latencyMs: 0,
      successRate: 100,
      errors: 0
    };

    set((state) => ({
      activeMetric: {
        ...state.activeMetric,
        [projectId]: initialFrame
      },
      metricsHistory: {
        ...state.metricsHistory,
        [projectId]: [initialFrame]
      }
    }));
  },

  undeployModel: (projectId) => {
    set((state) => {
      const nextDeployments = { ...state.deployments };
      delete nextDeployments[projectId];
      
      const nextActiveMetrics = { ...state.activeMetric };
      delete nextActiveMetrics[projectId];

      const nextMetricsHistory = { ...state.metricsHistory };
      delete nextMetricsHistory[projectId];

      return {
        deployments: nextDeployments,
        activeMetric: nextActiveMetrics,
        metricsHistory: nextMetricsHistory
      };
    });
  },

  updateLiveMetrics: (projectId) => {
    const activeDep = get().deployments[projectId];
    if (!activeDep || activeDep.status !== 'active') return;

    // Simulate metrics
    const requestsPerSec = Math.floor(15 + Math.random() * 35); // 15 to 50 reqs/sec
    const latencyMs = parseFloat((5 + Math.random() * 15).toFixed(2)); // 5 to 20 ms
    const successRate = Math.random() > 0.98 ? parseFloat((95 + Math.random() * 4.9).toFixed(2)) : 100; // Rare dips in success rate
    const errors = successRate < 100 ? Math.floor(requestsPerSec * (100 - successRate) / 100) : 0;

    const newFrame: MetricFrame = {
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      requestsPerSec,
      latencyMs,
      successRate,
      errors
    };

    set((state) => {
      const history = state.metricsHistory[projectId] || [];
      const updatedHistory = [...history, newFrame].slice(-15); // Keep last 15 ticks

      return {
        activeMetric: {
          ...state.activeMetric,
          [projectId]: newFrame
        },
        metricsHistory: {
          ...state.metricsHistory,
          [projectId]: updatedHistory
        }
      };
    });
  }
}));
