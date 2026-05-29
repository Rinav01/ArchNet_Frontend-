'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/Layout/MainLayout';
import { useProjectStore } from '@/store/projectStore';
import { useCanvasStore } from '@/store/canvasStore';
import { 
  Plus, 
  ArrowRight, 
  Layers, 
  Clock, 
  Cpu, 
  TrendingUp, 
  CodeXml, 
  X,
  Sparkles,
  CloudLightning,
  Wifi
} from 'lucide-react';
import { Project } from '@/types/canvas';

export default function Dashboard() {
  const router = useRouter();
  const { projects, gpuLoad, gpuCluster, addProject, setActiveProjectId, loadProjects, isOnline } = useProjectStore();
  const clearLogs = useCanvasStore((state) => state.clearLogs);
  const addLog = useCanvasStore((state) => state.addLog);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [newProjFramework, setNewProjFramework] = useState<'PyTorch' | 'TensorFlow' | 'JAX'>('PyTorch');
  const [newProjStatus, setNewProjStatus] = useState<'Production Ready' | 'Training' | 'Draft'>('Draft');

  const handleOpenCanvas = (projectId: string) => {
    setActiveProjectId(projectId);
    clearLogs();
    
    if (projectId === 'resnet-mini') {
      addLog('info', 'Loaded ResNet-Mini architecture from cloud repository.');
      addLog('success', 'DAG Validation: Successful (1.2M Parameters)');
    } else if (projectId === 'transformers-base') {
      addLog('info', 'Loaded Transformers-Base active training session.');
      addLog('warning', 'Notice: Hyperparameters are locked during active training run.');
    } else {
      addLog('info', 'Initialized fresh blank draft. Ready to build.');
    }

    router.push(`/editor/${projectId}`);
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim()) return;

    addProject({
      name: newProjName,
      framework: newProjFramework,
      status: newProjStatus,
    });

    setNewProjName('');
    setIsModalOpen(false);
  };

  return (
    <MainLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-8 relative pb-16">
        
        {/* Top Title & Action Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-4">
              <h1 className="text-4xl font-extrabold tracking-tight text-white">
                Model Workspace
              </h1>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide border transition-all ${
                isOnline 
                  ? 'bg-[#81c784]/10 text-[#81c784] border-[#81c784]/25 shadow-lg shadow-[#81c784]/5' 
                  : 'bg-[#3f4046]/30 text-[#9aa0a6] border-[#3f4046]/45'
              }`}>
                {isOnline ? (
                  <>
                    <Wifi size={12} className="text-[#81c784]" />
                    <span>Cloud Sync Active</span>
                  </>
                ) : (
                  <>
                    <CloudLightning size={12} />
                    <span>Local Sandbox</span>
                  </>
                )}
              </span>
            </div>
            <p className="text-[#9aa0a6] mt-2 text-sm font-semibold max-w-xl">
              Manage your computational graphs and neural architectures with high-precision visualization.
            </p>
          </div>
          
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#8ab4f8] hover:bg-[#a8c7fa] text-[#1e1f22] rounded-full text-sm font-bold shadow-md shadow-black/10 transition-all duration-200"
          >
            <Plus size={18} />
            <span>Create Project</span>
          </button>
        </div>

        {/* Project Grid / Offline Overlay */}
        {!isOnline ? (
          <div className="glass-panel rounded-2xl p-8 border border-[#f28b82]/15 bg-[#f28b82]/5 shadow-2xl relative overflow-hidden">
            <div className="absolute -right-16 -top-16 w-32 h-32 bg-[#f28b82]/5 rounded-full blur-2xl"></div>
            
            <div className="flex flex-col md:flex-row items-start gap-6">
              <div className="p-4 bg-[#f28b82]/10 border border-[#f28b82]/25 rounded-2xl text-[#f28b82] shadow-inner">
                <CloudLightning size={32} />
              </div>
              <div className="space-y-3 flex-1">
                <h3 className="text-xl font-bold text-white tracking-wide">Strawberry GraphQL API Sync Offline</h3>
                <p className="text-sm text-[#9aa0a6] leading-relaxed max-w-2xl font-semibold">
                  MLBuilder is running in strict live-sync mode. A running instance of the FastAPI backend database is required to load neural topologies, configure layers, and compile models.
                </p>
                <div className="pt-2 space-y-2">
                  <span className="text-xs font-bold text-[#9aa0a6] uppercase tracking-wider block">Diagnostics:</span>
                  <ul className="list-disc list-inside text-xs text-[#9aa0a6] space-y-1.5 ml-1 font-semibold leading-relaxed">
                    <li>Launch the backend API server by running <code className="px-1.5 py-0.5 bg-black/40 rounded font-mono text-[10px] text-[#f28b82]">uvicorn app.main:app --reload</code> inside <code className="px-1.5 py-0.5 bg-black/40 rounded font-mono text-[10px] text-gray-300">D:\Coding\new_project</code>.</li>
                    <li>Ensure the environment endpoint matches the configured port in your <code className="px-1.5 py-0.5 bg-black/40 rounded font-mono text-[10px] text-gray-300">.env</code> file.</li>
                    <li>Check that the server's database binds are correctly established.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ) : projects.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center border border-[#3f4046] bg-[#2b2d31] shadow-xl relative overflow-hidden flex flex-col items-center justify-center min-h-[250px]">
            <div className="absolute inset-0 dot-grid opacity-10 pointer-events-none"></div>
            <div className="p-4 bg-[#8ab4f8]/10 border border-[#8ab4f8]/20 rounded-2xl text-[#8ab4f8] mb-4 animate-pulse">
              <Cpu size={24} />
            </div>
            <h4 className="text-sm font-bold text-white">No Projects Found</h4>
            <p className="text-xs text-[#9aa0a6] mt-1.5 max-w-[280px] font-semibold mx-auto">
              Your database is currently empty. Click the "Create Project" button above to initialize your first visual deep learning canvas.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {projects.map((project) => {
              const statusColor = 
                project.status === 'Production Ready' ? 'bg-[#81c784]/10 text-[#81c784] border-[#81c784]/25' :
                project.status === 'Training' ? 'bg-[#ffe082]/10 text-[#ffe082] border-[#ffe082]/25' :
                'bg-[#80cbc4]/10 text-[#80cbc4] border-[#80cbc4]/25';

              const frameworkColor =
                project.framework === 'PyTorch' ? 'bg-[#8ab4f8]/10 text-[#8ab4f8]' :
                project.framework === 'TensorFlow' ? 'bg-[#ffe082]/10 text-[#ffe082]' :
                'bg-[#80cbc4]/10 text-[#80cbc4]';

              return (
                <div 
                  key={project.id}
                  className="glass-card rounded-2xl p-6 flex flex-col justify-between min-h-[350px] relative overflow-hidden"
                >
                  <div className="absolute -right-16 -top-16 w-32 h-32 bg-[#8ab4f8]/5 rounded-full blur-2xl"></div>
                  
                  {/* Card Header Info */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] uppercase font-extrabold tracking-wider px-2.5 py-1 rounded-full border ${statusColor}`}>
                        {project.status}
                      </span>
                      <span className={`text-[11px] font-extrabold px-3 py-1 rounded-lg ${frameworkColor}`}>
                        {project.framework}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-2xl font-bold text-white tracking-wide">{project.name}</h3>
                      <p className="text-xs text-[#9aa0a6] mt-1 flex items-center gap-1">
                        <Clock size={12} />
                        Updated {project.updatedAt}
                      </p>
                    </div>

                    {/* Micro Visual Neural Architecture representation */}
                    <div className="h-28 bg-[#1e1f22] rounded-xl border border-[#3f4046] flex items-center justify-center p-4 relative overflow-hidden">
                      <div className="absolute inset-0 dot-grid pointer-events-none opacity-20"></div>
                      
                      {project.id === 'resnet-mini' && (
                        <div className="flex items-center gap-4 text-[10px] text-[#9aa0a6] font-mono relative z-10 w-full justify-center">
                          <div className="flex flex-col items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#9aa0a6]"></span>
                            <span>Input</span>
                          </div>
                          <div className="w-8 h-[2px] bg-[#3f4046] relative">
                            <div className="absolute w-1.5 h-1.5 rounded-full bg-[#8ab4f8] -top-[3px] left-1/2 -translate-x-1/2"></div>
                          </div>
                          <div className="px-3 py-1.5 bg-[#8ab4f8]/10 border border-[#8ab4f8]/20 text-[#8ab4f8] rounded-lg font-bold">
                            Conv2D (64)
                          </div>
                          <div className="w-8 h-[2px] bg-[#3f4046] relative"></div>
                          <div className="flex flex-col items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#ffe082]"></span>
                            <span>Output</span>
                          </div>
                        </div>
                      )}

                      {project.id === 'transformers-base' && (
                        <div className="flex items-center gap-3 relative z-10">
                          <div className="px-4 py-2 bg-[#ffe082]/5 border border-[#ffe082]/20 text-[#ffe082] rounded-lg font-bold text-xs flex flex-col items-center gap-1 shadow-lg shadow-[#ffe082]/5">
                            <div className="flex gap-1">
                              <span className="w-4 h-1 bg-[#ffe082]/40 rounded"></span>
                              <span className="w-4 h-1 bg-[#ffe082]/40 rounded"></span>
                              <span className="w-4 h-1 bg-[#ffe082]/40 rounded"></span>
                            </div>
                            <span className="font-mono text-[10px]">Attention_x12</span>
                          </div>
                        </div>
                      )}

                      {project.id !== 'resnet-mini' && project.id !== 'transformers-base' && (
                        <div className="flex flex-col items-center gap-2 text-[#9aa0a6] text-xs font-semibold relative z-10">
                          <CodeXml size={22} className="text-[#3f4046]" />
                          <span>{project.notes || 'Graph structure pending...'}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Parameters & Action Footer */}
                  <div className="mt-6 pt-4 border-t border-[#3f4046] flex items-center justify-between">
                    <div className="grid grid-cols-2 gap-4">
                      {project.parameters && (
                        <div>
                          <span className="text-[10px] text-[#9aa0a6] uppercase tracking-wider block font-bold">Parameters</span>
                          <span className="text-sm font-bold text-gray-300 font-mono">{project.parameters}</span>
                        </div>
                      )}
                      {project.latency && (
                        <div>
                          <span className="text-[10px] text-[#9aa0a6] uppercase tracking-wider block font-bold">Latency</span>
                          <span className="text-sm font-bold text-gray-300 font-mono">{project.latency}</span>
                        </div>
                      )}
                      {project.learningRate && (
                        <div>
                          <span className="text-[10px] text-[#9aa0a6] uppercase tracking-wider block font-bold">Learning Rate</span>
                          <span className="text-sm font-bold text-gray-300 font-mono">{project.learningRate}</span>
                        </div>
                      )}
                      {project.loss && (
                        <div>
                          <span className="text-[10px] text-[#9aa0a6] uppercase tracking-wider block font-bold">Loss</span>
                          <span className="text-sm font-bold text-gray-300 font-mono">{project.loss}</span>
                        </div>
                      )}
                      {!project.parameters && !project.learningRate && (
                        <div>
                          <span className="text-[10px] text-[#9aa0a6] uppercase tracking-wider block font-bold">Layers</span>
                          <span className="text-sm font-bold text-gray-300 font-mono">{project.layersCount} Units</span>
                        </div>
                      )}
                      {!project.latency && !project.loss && (
                        <div>
                          <span className="text-[10px] text-[#9aa0a6] uppercase tracking-wider block font-bold">Status</span>
                          <span className="text-sm font-bold text-gray-300 font-mono">{project.status === 'Draft' ? 'Incomplete' : 'Complete'}</span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleOpenCanvas(project.id)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-[#1e1f22] hover:bg-[#8ab4f8]/10 text-xs font-bold text-[#8ab4f8] rounded-full border border-[#3f4046] hover:border-[#8ab4f8]/30 transition-all"
                    >
                      <span>Open Canvas</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Lower Section: Analytics & Infrastructure Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Inference Distribution Chart */}
          <div className="lg:col-span-2 glass-card rounded-2xl p-6 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#3f4046] pb-4 mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <TrendingUp size={18} className="text-[#8ab4f8]" />
                <span>Inference Distribution</span>
              </h3>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-[#9aa0a6]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#8ab4f8]"></span>
                  PyTorch Cluster
                </span>
                <span className="flex items-center gap-1.5 text-[#9aa0a6]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ffe082]"></span>
                  Global Edge
                </span>
              </div>
            </div>

            {/* Custom SVG Bar Chart */}
            <div className="h-48 flex items-end justify-between gap-3 pt-6 px-2">
              {[
                { height: 'h-12', color: 'bg-[#8ab4f8]/20 border-[#8ab4f8]/35' },
                { height: 'h-24', color: 'bg-[#8ab4f8]/35 border-[#8ab4f8]/50' },
                { height: 'h-32', color: 'bg-[#8ab4f8]/50 border-[#8ab4f8]/65' },
                { height: 'h-40', color: 'bg-[#8ab4f8]/70 border-[#8ab4f8]/85 shadow-lg shadow-[#8ab4f8]/10' },
                { height: 'h-28', color: 'bg-[#8ab4f8]/50 border-[#8ab4f8]/65' },
                { height: 'h-16', color: 'bg-[#ffe082]/20 border-[#ffe082]/35' },
                { height: 'h-36', color: 'bg-[#ffe082]/50 border-[#ffe082]/65' },
                { height: 'h-44', color: 'bg-[#ffe082]/70 border-[#ffe082]/85 shadow-lg shadow-[#ffe082]/10' },
                { height: 'h-20', color: 'bg-[#8ab4f8]/35 border-[#8ab4f8]/50' },
                { height: 'h-30', color: 'bg-[#8ab4f8]/50 border-[#8ab4f8]/65' },
              ].map((bar, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <div className={`w-full ${bar.height} ${bar.color} rounded-t-lg border-t border-x transition-all duration-500 hover:scale-x-105`}></div>
                  <span className="text-[10px] text-[#9aa0a6] font-mono">M{i+1}</span>
                </div>
              ))}
            </div>
          </div>

          {/* GPU Hardware Load Metric */}
          <div className="glass-card rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute -right-12 -bottom-12 w-28 h-28 bg-[#8ab4f8]/5 rounded-full blur-2xl"></div>
            
            <div className="space-y-3">
              <span className="text-[10px] font-extrabold text-[#9aa0a6] uppercase tracking-widest block">GPU Load</span>
              <h2 className="text-6xl font-black text-white tracking-tighter flex items-baseline gap-1">
                <span>{gpuLoad}%</span>
                <span className="text-xs text-[#8ab4f8] font-extrabold uppercase animate-pulse">Online</span>
              </h2>
            </div>

            <div className="space-y-4">
              <div className="w-full h-2 bg-[#3f4046] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#8ab4f8] to-[#c5a3ff] rounded-full shadow-lg shadow-[#8ab4f8]/30"
                  style={{ width: `${gpuLoad}%` }}
                ></div>
              </div>

              <div className="flex items-center justify-between text-xs text-[#9aa0a6] font-semibold">
                <span>{gpuCluster}</span>
                <span className="font-mono text-[10px] text-[#8ab4f8]/80">48GB VRAM</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#2b2d31] rounded-2xl border border-[#3f4046] p-8 shadow-2xl relative overflow-hidden">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-6 p-2 hover:bg-[#1e1f22] rounded-lg text-[#9aa0a6] hover:text-white transition-all"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-[#8ab4f8]/10 border border-[#8ab4f8]/25 rounded-xl text-[#8ab4f8] shadow-inner">
                <Sparkles size={20} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Create New Model</h3>
                <p className="text-xs text-[#9aa0a6] mt-0.5 font-semibold">Scaffold a premium deep learning project structure.</p>
              </div>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-6">
              {/* Project Name Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#9aa0a6] uppercase tracking-wider block">Project Name</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. MobileNet-V4"
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                  className="w-full px-4 py-3 bg-[#1e1f22] border border-[#3f4046] rounded-xl text-sm text-white placeholder-[#5f6368] focus:outline-none focus:border-[#8ab4f8] focus:ring-1 focus:ring-[#8ab4f8]/20 transition-all font-semibold"
                />
              </div>

              {/* Framework Choice */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#9aa0a6] uppercase tracking-wider block">Target Framework</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['PyTorch', 'TensorFlow', 'JAX'] as const).map((fw) => (
                    <button
                      key={fw}
                      type="button"
                      onClick={() => setNewProjFramework(fw)}
                      className={`py-2.5 rounded-full border text-xs font-bold tracking-wide transition-all ${
                        newProjFramework === fw
                          ? 'bg-[#8ab4f8]/10 border-[#8ab4f8]/50 text-[#8ab4f8]'
                          : 'bg-[#1e1f22] border-[#3f4046] text-[#9aa0a6] hover:bg-[#2b2d31] hover:text-white'
                      }`}
                    >
                      {fw}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#9aa0a6] uppercase tracking-wider block">Starting Stage</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['Production Ready', 'Training', 'Draft'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setNewProjStatus(st)}
                      className={`py-2.5 rounded-full border text-xs font-bold tracking-wide transition-all ${
                        newProjStatus === st
                          ? 'bg-[#8ab4f8]/10 border-[#8ab4f8]/50 text-[#8ab4f8]'
                          : 'bg-[#1e1f22] border-[#3f4046] text-[#9aa0a6] hover:bg-[#2b2d31] hover:text-white'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2 bg-[#1e1f22] hover:bg-[#2b2d31] border border-[#3f4046] text-xs font-bold text-[#9aa0a6] hover:text-white rounded-full transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#8ab4f8] hover:bg-[#a8c7fa] text-[#1e1f22] font-bold rounded-full text-xs shadow-md shadow-black/10 transition-all duration-200"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
