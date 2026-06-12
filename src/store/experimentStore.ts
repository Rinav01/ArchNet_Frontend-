import { create } from 'zustand';
import { 
  isBackendOnline, 
  graphqlRequest, 
  GET_EXPERIMENTS, 
  CREATE_EXPERIMENT, 
  PROMOTE_MODEL_VERSION 
} from '@/lib/graphql/client';
import { toast } from './notificationStore';

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
  isOnline: boolean;
  isLoading: boolean;
  
  // Actions
  loadExperimentsAndVersions: (projectId: string) => Promise<void>;
  createExperiment: (projectId: string, name: string, description: string) => Promise<void>;
  toggleRunSelection: (runId: string) => void;
  clearSelection: () => void;
  rollbackVersion: (versionId: string) => Promise<void>;
}

export const useExperimentStore = create<ExperimentStoreState>((set, get) => ({
  experiments: [],
  selectedCompareRunIds: [],
  modelVersions: [],
  isOnline: false,
  isLoading: false,

  loadExperimentsAndVersions: async (projectId) => {
    set({ isLoading: true });
    const online = await isBackendOnline();
    set({ isOnline: online });

    if (online) {
      try {
        const data = await graphqlRequest(GET_EXPERIMENTS, { projectId });
        if (data && data.experiments) {
          const formattedExps: Experiment[] = data.experiments.map((e: any) => ({
            id: e.id,
            name: e.name,
            description: e.description || '',
            createdAt: e.createdAt,
            runs: (e.trainingRuns || []).map((r: any) => {
              const metrics = typeof r.metricsJson === 'string' ? JSON.parse(r.metricsJson) : (r.metricsJson || {});
              const config = typeof r.configJson === 'string' ? JSON.parse(r.configJson) : (r.configJson || {});
              return {
                id: r.id,
                name: `Run #${r.id.substring(0, 4)}`,
                accuracy: r.accuracy || 0,
                loss: r.loss || 0,
                latencyMs: metrics.latency_ms || 14.2,
                memoryMb: metrics.memory_mb || 412,
                datasetName: config.dataset || 'CIFAR-100',
                datasetVersion: config.dataset_version || 'v1.0.0',
                artifactVersion: `v1.${r.id.substring(0,2)}.0`,
                framework: (config.framework || 'PyTorch') as any,
                status: (metrics.status || 'COMPLETED') as any,
                createdAt: r.createdAt
              };
            })
          }));

          // Gather flat list of model versions from all completed runs
          const flatRuns = formattedExps.flatMap(e => e.runs);
          const versions: ModelVersion[] = flatRuns.map((r, idx) => ({
            id: r.id,
            versionTag: `Model v${flatRuns.length - idx}`,
            commitHash: `sha256:${r.id.replace(/-/g, '').substring(0, 12)}`,
            accuracy: r.accuracy,
            loss: r.loss,
            framework: r.framework,
            author: 'SandboxArchitect',
            timestamp: new Date(r.createdAt).toLocaleDateString() || 'Recent',
            isActive: idx === 0 // default first to active
          }));

          set({ experiments: formattedExps, modelVersions: versions, selectedCompareRunIds: flatRuns.slice(0, 2).map(r => r.id), isLoading: false });
          return;
        }
      } catch (err) {
        console.warn('Failed to load experiments from backend GraphQL API.', err);
      }
    }

    // Fallback offline mock data
    const mockExps: Experiment[] = [
      {
        id: 'exp_1',
        name: 'ResNet Optimization Study',
        description: 'Evaluating deeper layers and learning rate dropouts.',
        createdAt: '2026-06-05T10:00:00Z',
        runs: [
          { id: 'run_1', name: 'Baseline - LR 1e-3', accuracy: 0.912, loss: 0.185, latencyMs: 14.2, memoryMb: 412, datasetName: 'CIFAR-100', datasetVersion: 'v1.0.0', artifactVersion: 'v1.0.0', framework: 'PyTorch', status: 'COMPLETED', createdAt: '2026-06-05T11:30:00Z' },
          { id: 'run_2', name: 'AdamW + Cosine LR Decay', accuracy: 0.934, loss: 0.112, latencyMs: 16.5, memoryMb: 450, datasetName: 'CIFAR-100', datasetVersion: 'v1.1.0', artifactVersion: 'v1.1.0', framework: 'PyTorch', status: 'COMPLETED', createdAt: '2026-06-05T12:45:00Z' },
          { id: 'run_3', name: 'Mixed Precision - 16bit Float', accuracy: 0.929, loss: 0.134, latencyMs: 8.4, memoryMb: 245, datasetName: 'CIFAR-100', datasetVersion: 'v1.1.0', artifactVersion: 'v1.2.0', framework: 'ONNX', status: 'COMPLETED', createdAt: '2026-06-05T14:15:00Z' },
          { id: 'run_4', name: 'Heavy Dropout 0.5', accuracy: 0.895, loss: 0.224, latencyMs: 13.9, memoryMb: 412, datasetName: 'CIFAR-100', datasetVersion: 'v1.1.0', artifactVersion: 'v1.3.0', framework: 'TensorFlow', status: 'COMPLETED', createdAt: '2026-06-05T15:30:00Z' }
        ]
      }
    ];

    const mockVersions: ModelVersion[] = [
      { id: 'v_3', versionTag: 'Model v3', commitHash: 'sha256:9af8c2b71d4e', accuracy: 0.948, loss: 0.082, framework: 'PyTorch', author: 'SandboxArchitect', timestamp: '2 hours ago', isActive: true },
      { id: 'v_2', versionTag: 'Model v2', commitHash: 'sha256:7bc3d1a8e9f2', accuracy: 0.912, loss: 0.185, framework: 'ONNX', author: 'SandboxArchitect', timestamp: '1 day ago', isActive: false },
      { id: 'v_1', versionTag: 'Model v1', commitHash: 'sha256:3cd9e8d4a7b1', accuracy: 0.884, loss: 0.264, framework: 'TensorFlow', author: 'CollaboratorBeta', timestamp: '3 days ago', isActive: false }
    ];

    set({ experiments: mockExps, modelVersions: mockVersions, selectedCompareRunIds: ['run_2', 'run_3'], isLoading: false });
  },

  createExperiment: async (projectId, name, description) => {
    const online = get().isOnline;
    if (online) {
      try {
        await graphqlRequest(CREATE_EXPERIMENT, { projectId, name, description });
        get().loadExperimentsAndVersions(projectId);
        toast.success('Experiment Created', `Successfully initialized experiment "${name}".`);
        return;
      } catch (err: any) {
        toast.error('Sync Error', err.message || 'Failed to register experiment on server.');
      }
    }
    // Simulation
    const mockId = `exp_${Math.random().toString(36).substring(2, 9)}`;
    const newExp: Experiment = {
      id: mockId,
      name,
      description,
      createdAt: new Date().toISOString(),
      runs: []
    };
    set((state) => ({ experiments: [...state.experiments, newExp] }));
    toast.success('Local Experiment', `Scaffolded experiment "${name}" in offline sandbox.`);
  },

  toggleRunSelection: (runId) => set((state) => {
    const isSelected = state.selectedCompareRunIds.includes(runId);
    let nextIds = [];
    if (isSelected) {
      nextIds = state.selectedCompareRunIds.filter(id => id !== runId);
    } else {
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
    const online = get().isOnline;
    if (online) {
      try {
        await graphqlRequest(PROMOTE_MODEL_VERSION, { versionId, status: 'production' });
      } catch (err: any) {
        toast.error('Rollback Error', err.message || 'Server failed to restore version state.');
        return;
      }
    }
    // Update local state
    set((state) => ({
      modelVersions: state.modelVersions.map(v => ({
        ...v,
        isActive: v.id === versionId
      }))
    }));
  }
}));
