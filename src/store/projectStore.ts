import { create } from 'zustand';
import { Project } from '@/types/canvas';

interface ProjectState {
  projects: Project[];
  activeProjectId: string | null;
  gpuLoad: number;
  gpuCluster: string;
  addProject: (project: Omit<Project, 'id' | 'updatedAt' | 'layersCount'>) => void;
  setActiveProjectId: (id: string | null) => void;
  updateProjectStats: (id: string, updates: Partial<Project>) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [
    {
      id: 'resnet-mini',
      name: 'ResNet-Mini',
      framework: 'PyTorch',
      status: 'Production Ready',
      layersCount: 4,
      parameters: '1.2M',
      latency: '14ms',
      updatedAt: '2h ago',
    },
    {
      id: 'transformers-base',
      name: 'Transformers-Base',
      framework: 'TensorFlow',
      status: 'Training',
      layersCount: 12,
      learningRate: '2e-5',
      loss: '0.042',
      updatedAt: '14m ago',
    },
    {
      id: 'custom-cnn',
      name: 'Custom-CNN',
      framework: 'JAX',
      status: 'Draft',
      layersCount: 8,
      updatedAt: '3d ago',
      notes: 'Graph structure pending...',
    },
  ],
  activeProjectId: null,
  gpuLoad: 82,
  gpuCluster: 'RTX 4090 Global Cluster',
  
  addProject: (projectData) => set((state) => {
    const newProject: Project = {
      ...projectData,
      id: projectData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      layersCount: 1,
      updatedAt: 'Just now',
    };
    return { projects: [newProject, ...state.projects] };
  }),
  
  setActiveProjectId: (id) => set({ activeProjectId: id }),
  
  updateProjectStats: (id, updates) => set((state) => ({
    projects: state.projects.map((p) => p.id === id ? { ...p, ...updates, updatedAt: 'Just now' } : p)
  })),
}));
