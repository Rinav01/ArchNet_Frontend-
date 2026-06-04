import { create } from 'zustand';
import { Project } from '@/types/canvas';
import { isBackendOnline, graphqlRequest, GET_PROJECTS, CREATE_PROJECT, DELETE_PROJECT } from '@/lib/graphql/client';
import { toast } from './notificationStore';

interface ProjectState {
  projects: Project[];
  activeProjectId: string | null;
  gpuLoad: number;
  gpuCluster: string;
  isOnline: boolean;
  userRole: 'Admin' | 'Editor' | 'Viewer';
  
  // Actions
  checkBackendStatus: () => Promise<boolean>;
  loadProjects: () => Promise<void>;
  addProject: (project: Omit<Project, 'id' | 'updatedAt' | 'layersCount'>) => Promise<string | undefined>;
  setActiveProjectId: (id: string | null) => void;
  updateProjectStats: (id: string, updates: Partial<Project>) => void;
  setUserRole: (role: 'Admin' | 'Editor' | 'Viewer') => void;
  setIsOnline: (online: boolean) => void;
  deleteProject: (id: string) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  activeProjectId: null,
  gpuLoad: 82,
  gpuCluster: 'RTX 4090 Global Cluster',
  isOnline: false,
  userRole: 'Admin',

  setIsOnline: (online: boolean) => set({ isOnline: online }),

  checkBackendStatus: async () => {
    const online = await isBackendOnline();
    set({ isOnline: online });
    return online;
  },

  loadProjects: async () => {
    const online = await get().checkBackendStatus();
    if (online) {
      try {
        const data = await graphqlRequest(GET_PROJECTS);
        if (data && data.projects) {
          const formatted: Project[] = data.projects.map((p: any) => {
            const isValStatus = ['Production Ready', 'Training', 'Draft'].includes(p.description);
            const activeStatus = isValStatus ? p.description as 'Production Ready' | 'Training' | 'Draft' : 'Draft';
            return {
              id: p.id,
              name: p.name,
              framework: p.framework || 'PyTorch',
              status: activeStatus,
              layersCount: 4,
              updatedAt: new Date(p.updatedAt).toLocaleDateString() || 'Synced',
              notes: isValStatus ? `Milestone: ${p.description}` : (p.description || 'Live cloud model'),
              totalParameterCount: p.totalParameterCount || 0,
              estimatedGpuMemoryMb: p.estimatedGpuMemoryMb || 0,
            };
          });
          set({ projects: formatted });
          return;
        }
      } catch (err) {
        console.warn('Failed to load projects from GraphQL API.', err);
      }
    }
    // Set empty when offline
    set({ projects: [] });
  },

  addProject: async (projectData) => {
    const online = get().isOnline;
    if (!online) {
      alert('Cannot create project: Backend server is offline.');
      return undefined;
    }

    try {
      const data = await graphqlRequest(CREATE_PROJECT, {
        name: projectData.name,
        framework: projectData.framework,
        description: projectData.status,
      });
      if (data && data.createProject) {
        const p = data.createProject;
        const isValStatus = ['Production Ready', 'Training', 'Draft'].includes(p.description);
        const activeStatus = isValStatus ? p.description as 'Production Ready' | 'Training' | 'Draft' : 'Draft';
        const newProject: Project = {
          id: p.id,
          name: p.name,
          framework: p.framework || 'PyTorch',
          status: activeStatus,
          layersCount: 1,
          updatedAt: 'Just now',
          notes: isValStatus ? `Milestone: ${p.description}` : (p.description || ''),
        };
        set((state) => ({ projects: [newProject, ...state.projects] }));
        return p.id;
      }
    } catch (err: any) {
      alert(`Failed to create project in backend: ${err.message || err}`);
    }
    return undefined;
  },

  setActiveProjectId: (id) => set({ activeProjectId: id }),

  updateProjectStats: (id, updates) => set((state) => ({
    projects: state.projects.map((p) => p.id === id ? { ...p, ...updates, updatedAt: 'Just now' } : p)
  })),

  setUserRole: (role) => set({ userRole: role }),

  deleteProject: async (id) => {
    const online = get().isOnline;
    const project = get().projects.find((p) => p.id === id);
    
    if (online) {
      try {
        await graphqlRequest(DELETE_PROJECT, { id });
      } catch (err: any) {
        toast.error('Sync Error', `Failed to delete project from database: ${err.message || err}`);
        return;
      }
    }

    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      activeProjectId: state.activeProjectId === id ? null : state.activeProjectId
    }));
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`mlbuilder_project_draft_${id}`);
      localStorage.removeItem(`mlbuilder_project_checkpoints_${id}`);
    }
    
    toast.success('Project Deleted', `Successfully removed project "${project?.name || id}" and cleared all local caches.`);
  },
}));
