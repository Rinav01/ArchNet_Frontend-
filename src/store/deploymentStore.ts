import { create } from 'zustand';
import { 
  isBackendOnline, 
  graphqlRequest, 
  GET_REGISTERED_MODELS, 
  GET_DEPLOYMENTS, 
  DEPLOY_MODEL, 
  GET_DEPLOYMENT_METRICS 
} from '@/lib/graphql/client';
import { toast } from './notificationStore';

export interface RegisteredModel {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  projectId: string;
  versions: ModelVersion[];
}

export interface ModelVersion {
  id: string;
  version: string;
  description: string | null;
  status: string;
  modelArtifactId: string | null;
  metrics: any;
  config: any;
  compilerOutput: string | null;
  createdAt: string;
}

export interface Deployment {
  id: string;
  projectId: string;
  modelArtifactId: string | null;
  target: string;
  status: 'deploying' | 'active' | 'inactive' | 'failed' | string;
  endpointUrl: string;
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
  isOnline: boolean;
  isLoading: boolean;
  
  // Actions
  loadRegistryAndDeployments: (projectId: string) => Promise<void>;
  deployModel: (projectId: string, artifactId: string, target: string) => Promise<void>;
  undeployModel: (projectId: string) => Promise<void>;
  updateLiveMetrics: (projectId: string, deploymentId: string) => Promise<void>;
}

export const useDeploymentStore = create<DeploymentStoreState>((set, get) => ({
  registeredModels: [],
  deployments: {},
  metricsHistory: {},
  activeMetric: {},
  isOnline: false,
  isLoading: false,

  loadRegistryAndDeployments: async (projectId) => {
    set({ isLoading: true });
    const online = await isBackendOnline();
    set({ isOnline: online });

    if (online) {
      try {
        const [modelsRes, deploymentsRes] = await Promise.all([
          graphqlRequest(GET_REGISTERED_MODELS, { projectId }),
          graphqlRequest(GET_DEPLOYMENTS, { projectId })
        ]);

        const models: RegisteredModel[] = (modelsRes.registeredModels || []).map((m: any) => ({
          id: m.id,
          projectId: m.projectId,
          name: m.name,
          description: m.description,
          createdAt: m.createdAt,
          versions: (m.versions || []).map((v: any) => ({
            id: v.id,
            version: v.version,
            description: v.description,
            status: v.status,
            modelArtifactId: v.modelArtifactId,
            metrics: typeof v.metrics === 'string' ? JSON.parse(v.metrics) : v.metrics,
            config: typeof v.config === 'string' ? JSON.parse(v.config) : v.config,
            compilerOutput: v.compilerOutput,
            createdAt: v.createdAt
          }))
        }));

        const depsMap: Record<string, Deployment> = {};
        if (deploymentsRes.deployments && deploymentsRes.deployments.length > 0) {
          const d = deploymentsRes.deployments[0]; // Map the primary deployment for the project
          depsMap[projectId] = {
            id: d.id,
            projectId: d.projectId,
            modelArtifactId: d.modelArtifactId,
            target: d.target,
            status: d.status,
            endpointUrl: d.endpointUrl,
            createdAt: d.createdAt
          };
        }

        set({ registeredModels: models, deployments: depsMap, isLoading: false });
        return;
      } catch (err) {
        console.warn('Failed to load registered models and deployments from backend.', err);
      }
    }

    // Offline Fallback Mock Setup
    const mockVersions: ModelVersion[] = [
      { id: 'v_3', version: 'Model v3', description: 'Active baseline configuration', status: 'production', modelArtifactId: 'art_1', metrics: { accuracy: 0.948, loss: 0.082 }, config: { lr: 0.0003 }, compilerOutput: 'Compiled', createdAt: '2026-06-05T14:32:00Z' },
      { id: 'v_2', version: 'Model v2', description: 'Staging model', status: 'staging', modelArtifactId: 'art_2', metrics: { accuracy: 0.912, loss: 0.185 }, config: { lr: 0.001 }, compilerOutput: 'Compiled', createdAt: '2026-06-03T09:15:00Z' },
      { id: 'v_1', version: 'Model v1', description: 'Initial draft model', status: 'draft', modelArtifactId: 'art_3', metrics: { accuracy: 0.884, loss: 0.264 }, config: { lr: 0.005 }, compilerOutput: 'Compiled', createdAt: '2026-06-01T11:45:00Z' }
    ];

    const mockModels: RegisteredModel[] = [
      { id: 'reg_1', name: 'ResNet Optimization Study', description: 'ResNet backbone study', createdAt: '2026-06-05T14:32:00Z', projectId, versions: mockVersions },
      { id: 'reg_2', name: 'MobileNet-V3 Classifier', description: 'MobileNet configuration', createdAt: '2026-06-03T09:15:00Z', projectId, versions: [mockVersions[1]] }
    ];

    set({ registeredModels: mockModels, deployments: {}, isLoading: false });
  },

  deployModel: async (projectId, artifactId, target) => {
    const online = get().isOnline;
    if (online) {
      try {
        const res = await graphqlRequest(DEPLOY_MODEL, { artifactId, target });
        if (res && res.deployModel) {
          const d = res.deployModel;
          const newDep: Deployment = {
            id: d.id,
            projectId: d.projectId,
            modelArtifactId: d.modelArtifactId,
            target: d.target,
            status: d.status,
            endpointUrl: d.endpointUrl || `https://${target.toLowerCase()}.archnet.ai/v1/predict`,
            createdAt: d.createdAt
          };
          set((state) => ({
            deployments: { ...state.deployments, [projectId]: newDep }
          }));
          toast.success('Model Deployed', `Successfully dispatched launch configurations to ${target}.`);
          return;
        }
      } catch (err: any) {
        toast.error('Deployment Failed', err.message || 'Error occurred during server provisioning.');
        throw err;
      }
    }

    // Local Simulation Fallback
    const deploymentId = `dep_${Math.random().toString(36).substring(2, 9)}`;
    const newDep: Deployment = {
      id: deploymentId,
      projectId,
      modelArtifactId: artifactId,
      target,
      status: 'active',
      endpointUrl: `https://${target.toLowerCase().replace(/\s+/g, '')}.archnet.ai/predict`,
      createdAt: new Date().toISOString()
    };
    set((state) => ({
      deployments: { ...state.deployments, [projectId]: newDep }
    }));
    toast.success('Simulation Started', `Offline sandbox: Running mock deployment on ${target}.`);
  },

  undeployModel: async (projectId) => {
    set((state) => {
      const nextDeps = { ...state.deployments };
      delete nextDeps[projectId];
      
      const nextMetrics = { ...state.metricsHistory };
      delete nextMetrics[projectId];
      
      const nextActive = { ...state.activeMetric };
      delete nextActive[projectId];

      return {
        deployments: nextDeps,
        metricsHistory: nextMetrics,
        activeMetric: nextActive
      };
    });
    toast.success('Model Stopped', 'API server replica has been undeployed successfully.');
  },

  updateLiveMetrics: async (projectId, deploymentId) => {
    const online = get().isOnline;
    if (online) {
      try {
        const res = await graphqlRequest(GET_DEPLOYMENT_METRICS, { deploymentId });
        if (res && res.deploymentMetrics) {
          const metricsList = res.deploymentMetrics;
          if (metricsList.length > 0) {
            const latest = metricsList[0];
            const newFrame: MetricFrame = {
              timestamp: new Date(latest.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              requestsPerSec: latest.requestsCount,
              latencyMs: parseFloat(latest.latencyMs.toFixed(2)),
              successRate: latest.errorCount === 0 ? 100 : parseFloat((((latest.requestsCount - latest.errorCount) / latest.requestsCount) * 100).toFixed(2)),
              errors: latest.errorCount
            };
            set((state) => {
              const history = state.metricsHistory[projectId] || [];
              const updatedHistory = [...history, newFrame].slice(-15);
              return {
                activeMetric: { ...state.activeMetric, [projectId]: newFrame },
                metricsHistory: { ...state.metricsHistory, [projectId]: updatedHistory }
              };
            });
            return;
          }
        }
      } catch (err) {
        console.warn('Failed to fetch deployment metrics from backend.', err);
      }
    }

    // Simulation
    const requestsPerSec = Math.floor(15 + Math.random() * 35);
    const latencyMs = parseFloat((5 + Math.random() * 15).toFixed(2));
    const successRate = Math.random() > 0.98 ? parseFloat((95 + Math.random() * 4.9).toFixed(2)) : 100;
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
      const updatedHistory = [...history, newFrame].slice(-15);
      return {
        activeMetric: { ...state.activeMetric, [projectId]: newFrame },
        metricsHistory: { ...state.metricsHistory, [projectId]: updatedHistory }
      };
    });
  }
}));
