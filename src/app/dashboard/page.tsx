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
  Wifi,
  Trash2
} from 'lucide-react';
import { Project } from '@/types/canvas';

export default function Dashboard() {
  const router = useRouter();
  const { projects, gpuLoad, gpuCluster, addProject, setActiveProjectId, loadProjects, isOnline, deleteProject, userRole } = useProjectStore();
  const clearLogs = useCanvasStore((state) => state.clearLogs);
  const addLog = useCanvasStore((state) => state.addLog);

  useEffect(() => {
    const initDashboard = async () => {
      await loadProjects();
      const hasCompletedOnboarding = localStorage.getItem('hasCompletedOnboarding');
      if (!hasCompletedOnboarding && useProjectStore.getState().projects.length === 0) {
        router.replace('/onboarding');
      }
    };
    initDashboard();
  }, [loadProjects, router]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [newProjFramework, setNewProjFramework] = useState<'PyTorch' | 'TensorFlow' | 'JAX'>('PyTorch');
  const [newProjStatus, setNewProjStatus] = useState<'Production Ready' | 'Training' | 'Draft'>('Draft');

  // Live Telemetry Analytics & Hardware Simulation State
  const [currentGpuCluster, setCurrentGpuCluster] = useState<'RTX 4090 Global Cluster' | 'NVIDIA A100 Cluster' | 'NVIDIA H100 Tensor Core'>('RTX 4090 Global Cluster');
  const [activeChartTab, setActiveChartTab] = useState<'traffic' | 'complexity' | 'benchmarks'>('traffic');
  const [ticker, setTicker] = useState(0);

  // Trigger re-render to ripple the live traffic bars dynamically
  useEffect(() => {
    const timer = setInterval(() => {
      setTicker((t) => t + 1);
    }, 1500);
    return () => clearInterval(timer);
  }, []);

  // Baseline load/VRAM mapping per cluster profile
  const getClusterConfig = (clusterName: string) => {
    switch (clusterName) {
      case 'NVIDIA A100 Cluster':
        return { totalVramMb: 81920, idleVramMb: 2048, label: '80GB HBM2' };
      case 'NVIDIA H100 Tensor Core':
        return { totalVramMb: 81920, idleVramMb: 3072, label: '80GB HBM3' };
      default:
        return { totalVramMb: 24576, idleVramMb: 1280, label: '24GB GDDR6X' };
    }
  };

  const { totalVramMb, idleVramMb, label: vramLabel } = getClusterConfig(currentGpuCluster);

  // Sum up estimated memory of all projects in workspace
  const workspaceAllocatedMemory = projects.reduce((sum, p) => sum + (p.estimatedGpuMemoryMb || 0), 0);
  const activeGpuMemoryUse = idleVramMb + workspaceAllocatedMemory;
  const calculatedGpuLoadPercent = Math.min(99.5, Math.round((activeGpuMemoryUse / totalVramMb) * 100 * 10) / 10);

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
                  ArchNet is running in strict live-sync mode. A running instance of the FastAPI backend database is required to load neural topologies, configure layers, and compile models.
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

                    <div className="flex items-center gap-2">
                      {userRole !== 'Viewer' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Are you sure you want to delete the project "${project.name}"?`)) {
                              deleteProject(project.id);
                            }
                          }}
                          className="p-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-red-400 hover:text-red-300 rounded-full transition-all cursor-pointer"
                          title="Delete Project"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}

                      <button
                        onClick={() => handleOpenCanvas(project.id)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#1e1f22] hover:bg-[#8ab4f8]/10 text-xs font-bold text-[#8ab4f8] rounded-full border border-[#3f4046] hover:border-[#8ab4f8]/30 transition-all"
                      >
                        <span>Open Canvas</span>
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Lower Section: Analytics & Infrastructure Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Inference Distribution Chart */}
          <div className="lg:col-span-2 glass-card rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#3f4046] pb-4 mb-4 gap-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <TrendingUp size={18} className="text-[#8ab4f8]" />
                <span>Analytics Monitor</span>
              </h3>
              
              {/* Tab Toggles */}
              <div className="flex items-center bg-[#1e1f22] p-1 rounded-full border border-[#3f4046] select-none text-[10px] font-bold">
                {[
                  { id: 'traffic', label: 'Live Traffic' },
                  { id: 'complexity', label: 'Complexity Map' },
                  { id: 'benchmarks', label: 'Benchmarks' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveChartTab(tab.id as any)}
                    className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                      activeChartTab === tab.id
                        ? 'bg-[#8ab4f8] text-[#1e1f22]'
                        : 'text-[#9aa0a6] hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Dynamic SVG Bar Chart */}
            {projects.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-center select-none gap-2">
                <TrendingUp size={24} className="text-[#3f4046]" />
                <span className="text-xs text-[#9aa0a6] font-semibold">No project metrics loaded.</span>
                <span className="text-[10px] text-[#5f6368] font-medium max-w-[280px]">Create a neural network project above to compile and view active hardware distribution analytics.</span>
              </div>
            ) : (
              <div className="h-48 flex items-end justify-start gap-4 pt-6 px-2 overflow-x-auto min-w-full scrollbar-none">
                {projects.map((project, idx) => {
                  let valueLabel = '';
                  let percentHeight = 20;

                  if (activeChartTab === 'complexity') {
                    const paramsM = (project.totalParameterCount || 0) / 1_000_000;
                    valueLabel = `${paramsM.toFixed(2)}M Params`;
                    const maxParams = Math.max(...projects.map(p => p.totalParameterCount || 0), 1_000_000);
                    percentHeight = Math.round(((project.totalParameterCount || 0) / maxParams) * 75 + 20);
                  } else if (activeChartTab === 'benchmarks') {
                    valueLabel = `${(project.estimatedGpuMemoryMb || 0).toFixed(1)} MB VRAM`;
                    const maxMem = Math.max(...projects.map(p => p.estimatedGpuMemoryMb || 0), 10);
                    percentHeight = Math.round(((project.estimatedGpuMemoryMb || 0) / maxMem) * 75 + 20);
                  } else {
                    // 'traffic' tab: Live throughput simulated from model complexity (smaller models = faster throughput!)
                    const complexityScale = Math.max(1, (project.totalParameterCount || 0) / 100_000);
                    const baseThroughput = Math.max(50, 1200 / complexityScale);
                    const liveRipple = 1 + (Math.sin(ticker / 2 + idx) * 0.05); // slight live organic ripple using ticker
                    const activeThroughput = Math.round(baseThroughput * liveRipple);
                    valueLabel = `${activeThroughput} req/s`;
                    percentHeight = Math.round(Math.min(95, Math.max(15, (activeThroughput / 1200) * 80 + 15)));
                  }

                  const barColor = 
                    project.framework === 'PyTorch' ? 'bg-[#8ab4f8]/20 border-[#8ab4f8]/35 shadow-[0_0_15px_rgba(138,180,248,0.03)] hover:bg-[#8ab4f8]/30 hover:border-[#8ab4f8]/50' :
                    project.framework === 'TensorFlow' ? 'bg-[#ffe082]/15 border-[#ffe082]/30 hover:bg-[#ffe082]/25 hover:border-[#ffe082]/45' :
                    'bg-[#80cbc4]/15 border-[#80cbc4]/30 hover:bg-[#80cbc4]/25 hover:border-[#80cbc4]/45';

                  return (
                    <div key={project.id} className="flex-1 min-w-[90px] max-w-[120px] flex flex-col items-center gap-2 h-full justify-end group/bar relative">
                      {/* Hover Value Tooltip Card */}
                      <div className="absolute top-0 opacity-0 group-hover/bar:opacity-100 transition-opacity bg-[#1e1f22] border border-[#3f4046] rounded-xl p-3 text-[9px] font-mono text-[#e3e3e3] whitespace-nowrap shadow-2xl z-20 pointer-events-none -translate-y-8 flex flex-col gap-0.5">
                        <div className="font-extrabold text-white text-[10.5px] truncate max-w-[100px]">{project.name}</div>
                        <div className="text-[#8ab4f8] font-bold text-[10px]">{valueLabel}</div>
                      </div>

                      <div 
                        className={`w-full ${barColor} rounded-t-xl border-t border-x transition-all duration-700 ease-out hover:scale-x-105 cursor-pointer relative flex items-end justify-center pb-2.5`}
                        style={{ height: `${percentHeight}%` }}
                      >
                        {/* Sub-label inside bar */}
                        <span className="text-[8px] font-extrabold text-white/30 tracking-wider truncate max-w-[90%] uppercase">{project.framework}</span>
                      </div>
                      <span className="text-[10px] text-[#9aa0a6] font-extrabold truncate max-w-full" title={project.name}>{project.name}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* GPU Hardware Load Metric */}
          <div className="glass-card rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute -right-12 -bottom-12 w-28 h-28 bg-[#8ab4f8]/5 rounded-full blur-2xl"></div>
            
            <div className="space-y-3">
              <span className="text-[10px] font-extrabold text-[#9aa0a6] uppercase tracking-widest block">Workspace GPU Allocation</span>
              <h2 className="text-6xl font-black text-white tracking-tighter flex items-baseline gap-1.5">
                <span className="transition-all duration-300 select-all font-mono tabular-nums">{calculatedGpuLoadPercent}%</span>
                <span className="text-xs text-[#8ab4f8] font-extrabold uppercase animate-pulse">Online</span>
              </h2>
            </div>

            <div className="space-y-4">
              <div className="w-full h-2 bg-[#3f4046] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#8ab4f8] to-[#c5a3ff] rounded-full shadow-lg shadow-[#8ab4f8]/30 transition-all duration-700 ease-out"
                  style={{ width: `${calculatedGpuLoadPercent}%` }}
                ></div>
              </div>

              {/* Click to Cycle/Select Hardware Profiles */}
              <div 
                onClick={() => {
                  setCurrentGpuCluster(prev => 
                    prev === 'RTX 4090 Global Cluster' ? 'NVIDIA A100 Cluster' :
                    prev === 'NVIDIA A100 Cluster' ? 'NVIDIA H100 Tensor Core' :
                    'RTX 4090 Global Cluster'
                  );
                }}
                className="flex items-center justify-between text-xs text-[#9aa0a6] font-semibold bg-[#1e1f22]/60 hover:bg-[#1e1f22]/90 border border-[#3f4046]/40 px-3.5 py-2 rounded-xl cursor-pointer transition-all hover:border-[#8ab4f8]/30 shadow-inner group"
                title="Click to cycle active hardware cluster profiles"
              >
                <span className="group-hover:text-white transition-colors">{currentGpuCluster}</span>
                <span className="font-mono text-[10px] text-[#8ab4f8]/80 bg-[#8ab4f8]/10 px-2 py-0.5 rounded border border-[#8ab4f8]/20">
                  {workspaceAllocatedMemory > 0 
                    ? `${workspaceAllocatedMemory.toFixed(1)}MB / ${(totalVramMb / 1024).toFixed(0)}GB` 
                    : vramLabel}
                </span>
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
