import { create } from 'zustand';

export interface Experiment {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  runs: ExperimentRun[];
}

export interface ExperimentRun {
  id: string;
  name: string;
  accuracy: number;
  loss: number;
  latencyMs: number;
  memoryMb: number;
  datasetName: string;
  datasetVersion: string;
  artifactVersion: string;
  framework: 'PyTorch' | 'TensorFlow' | 'JAX' | 'ONNX';
  status: 'COMPLETED' | 'FAILED' | 'RUNNING';
  createdAt: string;
}

export interface ModelVersion {
  id: string;
  versionTag: string;
  commitHash: string;
  accuracy: number;
  loss: number;
  framework: string;
  author: string;
  timestamp: string;
  isActive: boolean;
}

interface ExperimentStoreState {
  experiments: Experiment[];
  selectedCompareRunIds: string[];
  modelVersions: ModelVersion[];
  
  // Actions
  toggleRunSelection: (runId: string) => void;
  clearSelection: () => void;
  rollbackVersion: (versionId: string) => Promise<void>;
  createVersionTag: (tag: string, accuracy: number, loss: number, framework: string) => void;
}

export const useExperimentStore = create<ExperimentStoreState>((set, get) => ({
  experiments: [
    {
      id: 'exp_1',
      name: 'ResNet Optimization Study',
      description: 'Evaluating deeper layers and learning rate dropouts.',
      createdAt: '2026-06-05T10:00:00Z',
      runs: [
        {
          id: 'run_1',
          name: 'Baseline - LR 1e-3',
          accuracy: 0.912,
          loss: 0.185,
          latencyMs: 14.2,
          memoryMb: 412,
          datasetName: 'CIFAR-100',
          datasetVersion: 'v1.0.0',
          artifactVersion: 'v1.0.0',
          framework: 'PyTorch',
          status: 'COMPLETED',
          createdAt: '2026-06-05T11:30:00Z'
        },
        {
          id: 'run_2',
          name: 'AdamW + Cosine LR Decay',
          accuracy: 0.934,
          loss: 0.112,
          latencyMs: 16.5,
          memoryMb: 450,
          datasetName: 'CIFAR-100',
          datasetVersion: 'v1.1.0',
          artifactVersion: 'v1.1.0',
          framework: 'PyTorch',
          status: 'COMPLETED',
          createdAt: '2026-06-05T12:45:00Z'
        },
        {
          id: 'run_3',
          name: 'Mixed Precision - 16bit Float',
          accuracy: 0.929,
          loss: 0.134,
          latencyMs: 8.4,
          memoryMb: 245,
          datasetName: 'CIFAR-100',
          datasetVersion: 'v1.1.0',
          artifactVersion: 'v1.2.0',
          framework: 'ONNX',
          status: 'COMPLETED',
          createdAt: '2026-06-05T14:15:00Z'
        },
        {
          id: 'run_4',
          name: 'Heavy Dropout 0.5',
          accuracy: 0.895,
          loss: 0.224,
          latencyMs: 13.9,
          memoryMb: 412,
          datasetName: 'CIFAR-100',
          datasetVersion: 'v1.1.0',
          artifactVersion: 'v1.3.0',
          framework: 'TensorFlow',
          status: 'COMPLETED',
          createdAt: '2026-06-05T15:30:00Z'
        }
      ]
    }
  ],
  selectedCompareRunIds: ['run_2', 'run_3'], // Pre-select two runs for comparison
  modelVersions: [
    { id: 'v_3', versionTag: 'Model v3', commitHash: 'sha256:9af8c2b71d4e', accuracy: 0.948, loss: 0.082, framework: 'PyTorch', author: 'SandboxArchitect', timestamp: '2 hours ago', isActive: true },
    { id: 'v_2', versionTag: 'Model v2', commitHash: 'sha256:7bc3d1a8e9f2', accuracy: 0.912, loss: 0.185, framework: 'ONNX', author: 'SandboxArchitect', timestamp: '1 day ago', isActive: false },
    { id: 'v_1', versionTag: 'Model v1', commitHash: 'sha256:3cd9e8d4a7b1', accuracy: 0.884, loss: 0.264, framework: 'TensorFlow', author: 'CollaboratorBeta', timestamp: '3 days ago', isActive: false },
  ],

  toggleRunSelection: (runId) => set((state) => {
    const isSelected = state.selectedCompareRunIds.includes(runId);
    let nextIds = [];
    if (isSelected) {
      nextIds = state.selectedCompareRunIds.filter(id => id !== runId);
    } else {
      // Allow up to 3 runs to compare side-by-side
      if (state.selectedCompareRunIds.length >= 3) {
        nextIds = [...state.selectedCompareRunIds.slice(1), runId];
      } else {
        nextIds = [...state.selectedCompareRunIds, runId];
      }
    }
    return { selectedCompareRunIds: nextIds };
  }),

  clearSelection: () => set({ selectedCompareRunIds: [] }),

  rollbackVersion: async (versionId) => {
    // Simulate rollback delays
    await new Promise((resolve) => setTimeout(resolve, 1500));
    set((state) => ({
      modelVersions: state.modelVersions.map(v => ({
        ...v,
        isActive: v.id === versionId
      }))
    }));
  },

  createVersionTag: (tag, accuracy, loss, framework) => {
    const newVer: ModelVersion = {
      id: `v_${Math.random().toString(36).substring(2, 9)}`,
      versionTag: tag,
      commitHash: `sha256:${Math.random().toString(16).substring(2, 14)}`,
      accuracy,
      loss,
      framework,
      author: 'SandboxArchitect',
      timestamp: 'Just now',
      isActive: false
    };
    set((state) => ({
      modelVersions: [newVer, ...state.modelVersions]
    }));
  }
}));
