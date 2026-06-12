'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/Layout/MainLayout';
import { useDeploymentStore } from '@/store/deploymentStore';
import { useProjectStore } from '@/store/projectStore';
import { toast } from '@/store/notificationStore';
import { 
  CloudLightning, 
  ArrowRight, 
  Layers, 
  Server, 
  ArrowLeft,
  RefreshCw,
  Globe,
  GitBranch,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity,
  Zap,
  PowerOff,
  Plus,
  ChevronDown
} from 'lucide-react';

interface FlatDeployment {
  id: string;
  name: string;
  version: string;
  projectId: string;
  target: string;
  status: 'Running' | 'Failed' | 'Pending' | 'Completed';
  replicas: string;
  url: string;
  latencyMs: number;
  createdAt: string;
}

export default function DeploymentCenterPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [isLoadingAll, setIsLoadingAll] = useState(false);

  // Wizard state
  const [wizardStep, setWizardStep] = useState(1);
  const [selectedVersion, setSelectedVersion] = useState('');
  const [selectedTarget, setSelectedTarget] = useState<'FastAPI' | 'Docker' | 'Vertex AI' | 'SageMaker' | 'HuggingFace' | 'Kubernetes'>('Kubernetes');
  const [replicasCount, setReplicasCount] = useState(3);
  const [hardwareTier, setHardwareTier] = useState('NVIDIA T4 GPU');
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployPercent, setDeployPercent] = useState(0);

  // Project filter for wizard
  const [wizardProjectId, setWizardProjectId] = useState('');

  const { activeProjectId, projects, loadProjects } = useProjectStore();

  const { 
    registeredModels, 
    deployments: storeDeployments,
    isLoading,
    loadRegistryAndDeployments, 
    deployModel, 
    undeployModel,
    updateLiveMetrics,
    activeMetric
  } = useDeploymentStore();

  useEffect(() => {
    setIsMounted(true);
    if (projects.length === 0) loadProjects();
  }, []);

  // Set wizard project once projects load
  useEffect(() => {
    if (!wizardProjectId && projects.length > 0) {
      setWizardProjectId(activeProjectId || projects[0].id);
    }
  }, [projects, activeProjectId, wizardProjectId]);

  // Fan-out: load deployments for ALL user projects
  const loadAllDeployments = useCallback(async () => {
    if (projects.length === 0) return;
    setIsLoadingAll(true);
    try {
      await Promise.all(projects.map(p => loadRegistryAndDeployments(p.id)));
    } finally {
      setIsLoadingAll(false);
    }
  }, [projects, loadRegistryAndDeployments]);

  useEffect(() => {
    if (isMounted && projects.length > 0) {
      loadAllDeployments();
    }
  }, [isMounted, projects.length]);

  // Live metrics poll for all active deployments
  useEffect(() => {
    if (!isMounted) return;
    const activeEntries = Object.entries(storeDeployments).filter(([, d]) => d.status === 'active');
    if (activeEntries.length === 0) return;

    const timer = setInterval(() => {
      activeEntries.forEach(([projId, dep]) => {
        updateLiveMetrics(projId, dep.id);
      });
    }, 4000);
    return () => clearInterval(timer);
  }, [isMounted, storeDeployments, updateLiveMetrics]);

  if (!isMounted) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px] text-gray-500">
          <span className="text-xs font-semibold">Loading Deployment Center...</span>
        </div>
      </MainLayout>
    );
  }

  // Build flat deployment list from store (all projects)
  const flatDeployments: FlatDeployment[] = Object.entries(storeDeployments).map(([projId, dep]) => {
    const proj = projects.find(p => p.id === projId);
    const model = registeredModels.find(m => m.projectId === projId);
    const latency = activeMetric[projId]?.latencyMs ?? 0;
    
    const statusMap: Record<string, FlatDeployment['status']> = {
      active: 'Running',
      deploying: 'Pending',
      failed: 'Failed',
      inactive: 'Completed'
    };

    return {
      id: dep.id,
      name: model?.name || proj?.name || 'Visual Model Canvas',
      version: 'Active Release',
      projectId: projId,
      target: dep.target,
      status: (statusMap[dep.status] ?? 'Completed') as FlatDeployment['status'],
      replicas: dep.status === 'active' ? '1/1' : '0/1',
      url: dep.endpointUrl,
      latencyMs: latency,
      createdAt: dep.createdAt
    };
  });

  // Wizard: available model versions for selected wizard project
  const wizardModels = registeredModels.filter(m => m.projectId === wizardProjectId);
  const wizardVersions = wizardModels.flatMap(m =>
    m.versions.map(v => ({
      id: v.id,
      versionTag: v.version,
      accuracy: (v.metrics?.accuracy ?? 0.9) as number,
      loss: (v.metrics?.loss ?? 0.1) as number,
      framework: m.name,
      modelArtifactId: v.modelArtifactId
    }))
  );
  // Fallback if no registered models
  const fallbackVersions = [
    { id: 'v_mock_3', versionTag: 'Model v3 (Mock)', accuracy: 0.948, loss: 0.082, framework: 'PyTorch', modelArtifactId: null },
    { id: 'v_mock_2', versionTag: 'Model v2 (Mock)', accuracy: 0.912, loss: 0.185, framework: 'ONNX', modelArtifactId: null },
  ];
  const displayVersions = wizardVersions.length > 0 ? wizardVersions : fallbackVersions;

  // Aggregate perf stats across all active deployments
  const activeMetrics = Object.values(activeMetric);
  const avgLatency = activeMetrics.length > 0
    ? (activeMetrics.reduce((acc, m) => acc + m.latencyMs, 0) / activeMetrics.length).toFixed(1)
    : null;
  const totalRps = activeMetrics.length > 0
    ? activeMetrics.reduce((acc, m) => acc + m.requestsPerSec, 0).toFixed(1)
    : null;

  const handleStartDeploy = async () => {
    if (!wizardProjectId) return;
    setIsDeploying(true);
    setDeployPercent(0);

    const targetVer = displayVersions.find(v => v.versionTag === selectedVersion) ?? displayVersions[0];
    const artifactId = targetVer?.modelArtifactId || 'mock_artifact_id';

    const interval = setInterval(() => {
      setDeployPercent(prev => {
        if (prev >= 90) { clearInterval(interval); return 90; }
        return prev + 10;
      });
    }, 150);

    try {
      await deployModel(wizardProjectId, artifactId, selectedTarget);
      setDeployPercent(100);
      setTimeout(() => {
        setIsDeploying(false);
        setWizardStep(1);
      }, 400);
    } catch (err) {
      clearInterval(interval);
      setIsDeploying(false);
    }
  };

  const handleTerminate = (dep: FlatDeployment) => {
    if (confirm(`Are you sure you want to terminate the deployment for "${dep.name}"?`)) {
      undeployModel(dep.projectId);
    }
  };

  const getStatusBadge = (status: FlatDeployment['status']) => {
    switch (status) {
      case 'Running':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-[#80cbc4]/35 bg-[#80cbc4]/10 text-[#80cbc4] text-[9px] font-black uppercase tracking-wider">
            <span className="h-1.5 w-1.5 rounded-full bg-[#80cbc4] animate-pulse"></span>
            Running
          </span>
        );
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-[#8ab4f8]/35 bg-[#8ab4f8]/10 text-[#8ab4f8] text-[9px] font-black uppercase tracking-wider">
            <CheckCircle size={9} />
            Completed
          </span>
        );
      case 'Pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-[#ffe082]/35 bg-[#ffe082]/10 text-[#ffe082] text-[9px] font-black uppercase tracking-wider animate-pulse">
            <Clock size={9} />
            Pending
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-rose-500/35 bg-rose-500/10 text-rose-400 text-[9px] font-black uppercase tracking-wider">
            <AlertTriangle size={9} />
            Failed
          </span>
        );
    }
  };

  return (
    <MainLayout>
      <div className="p-8 max-w-6xl mx-auto space-y-8 relative pb-24 font-sans select-none">
        
        {/* Header Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <CloudLightning className="text-[#80cbc4] animate-pulse" size={32} />
              <span>Deployment Center</span>
            </h1>
            <p className="text-[#9aa0a6] mt-2 text-sm font-semibold">
              Package models into optimized Docker instances or serve live endpoints via Vertex AI, Kubernetes, and FastAPI.
            </p>
          </div>
          <button
            onClick={loadAllDeployments}
            disabled={isLoadingAll}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#2b2d31] hover:bg-[#313338] border border-[#3f4046] text-xs font-bold text-white rounded-xl transition-all cursor-pointer"
          >
            <RefreshCw size={13} className={isLoadingAll ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Dynamic Wizard & Status Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left: Wizard Panel */}
          <div className="lg:col-span-5 bg-[#2b2d31]/50 border border-[#3f4046] rounded-2xl p-6 shadow-xl space-y-5">
            <h2 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2 border-b border-[#3f4046]/80 pb-4">
              <Server className="text-[#80cbc4]" size={16} />
              <span>Launch Wizard</span>
            </h2>

            {/* Loading Cover state */}
            {isDeploying ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-4">
                <RefreshCw size={28} className="text-[#80cbc4] animate-spin" />
                <div className="text-center w-full space-y-2.5">
                  <p className="text-xs font-bold text-white">Serving {selectedTarget} Cluster Nodes</p>
                  <div className="h-1.5 w-full bg-[#1e1f22] rounded-full overflow-hidden border border-[#3f4046] max-w-[200px] mx-auto">
                    <div className="h-full bg-[#80cbc4] transition-all duration-300" style={{ width: `${deployPercent}%` }}></div>
                  </div>
                  <span className="text-[10px] text-gray-500 font-bold font-mono">{deployPercent}% packages aligned</span>
                </div>
              </div>
            ) : (
              <>
                {/* Project selector for wizard */}
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-black tracking-wider text-gray-500">Target Project</label>
                  <div className="relative">
                    <select
                      value={wizardProjectId}
                      onChange={(e) => { setWizardProjectId(e.target.value); setSelectedVersion(''); }}
                      className="w-full px-3 py-2 bg-[#1e1f22] border border-[#3f4046] rounded-xl text-xs text-white focus:outline-none focus:border-[#80cbc4] font-bold cursor-pointer appearance-none pr-8"
                    >
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                  </div>
                </div>

                {/* Step 1: Version Selector */}
                {wizardStep === 1 && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase font-black tracking-wider text-gray-500 block">Step 1: Select Model Release</span>
                      <p className="text-[10px] text-gray-400 font-medium">Choose from verified audit versions registered in the store.</p>
                    </div>

                    <div className="space-y-2 max-h-52 overflow-y-auto custom-scrollbar pr-1">
                      {displayVersions.map(v => (
                        <div
                          key={v.id}
                          onClick={() => setSelectedVersion(v.versionTag)}
                          className={`p-3 border rounded-xl cursor-pointer transition-all flex items-center justify-between text-xs font-semibold ${
                            selectedVersion === v.versionTag
                              ? 'bg-[#80cbc4]/10 border-[#80cbc4] text-white'
                              : 'bg-[#1e1f22] border-[#3f4046] text-gray-400 hover:border-gray-500'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <GitBranch size={13} className="text-gray-500" />
                            <span>{v.versionTag} ({v.framework})</span>
                          </div>
                          <span className="font-mono text-[10px]">Acc: {(v.accuracy * 100).toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => setWizardStep(2)}
                      disabled={!selectedVersion && displayVersions.length > 0}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-[#80cbc4] hover:bg-[#a7ffeb] disabled:opacity-50 disabled:cursor-not-allowed text-[#1e1f22] text-[11px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer mt-2"
                    >
                      <span>Next Step</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                )}

                {/* Step 2: Target Selector */}
                {wizardStep === 2 && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase font-black tracking-wider text-gray-500 block">Step 2: Choose Target Platform</span>
                      <p className="text-[10px] text-gray-400 font-medium">Select target infrastructure context.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      {(['FastAPI', 'Docker', 'Vertex AI', 'SageMaker', 'HuggingFace', 'Kubernetes'] as const).map(tgt => (
                        <div
                          key={tgt}
                          onClick={() => setSelectedTarget(tgt)}
                          className={`p-3 border rounded-xl cursor-pointer transition-all flex flex-col justify-between h-20 text-xs font-semibold ${
                            selectedTarget === tgt
                              ? 'bg-[#80cbc4]/10 border-[#80cbc4] text-white'
                              : 'bg-[#1e1f22] border-[#3f4046] text-gray-400 hover:border-gray-500'
                          }`}
                        >
                          <span className="font-bold">{tgt}</span>
                          <span className="text-[8px] text-gray-500 font-bold uppercase block mt-1">
                            {tgt === 'Docker' || tgt === 'FastAPI' ? 'Local serve' : 'Cloud server'}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => setWizardStep(1)}
                        className="w-1/3 flex items-center justify-center gap-1 py-2.5 bg-[#2b2d31] hover:bg-[#313338] border border-[#3f4046] text-xs font-bold text-white rounded-xl transition-all cursor-pointer"
                      >
                        <ArrowLeft size={12} />
                        <span>Back</span>
                      </button>
                      <button
                        onClick={() => setWizardStep(3)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-[#80cbc4] hover:bg-[#a7ffeb] text-[#1e1f22] text-[11px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                      >
                        <span>Next Step</span>
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 3: Server Configurations */}
                {wizardStep === 3 && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase font-black tracking-wider text-gray-500 block">Step 3: Server Configurations</span>
                      <p className="text-[10px] text-gray-400 font-medium">Fine-tune deployment execution resources.</p>
                    </div>

                    <div className="space-y-3">
                      {/* Replicas count */}
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-gray-500 tracking-wider">Replica Instances</label>
                        <div className="flex items-center justify-between bg-[#1e1f22] border border-[#3f4046] px-3 py-1.5 rounded-xl text-xs font-bold text-white">
                          <span>{replicasCount} replicas</span>
                          <div className="flex gap-2">
                            <button 
                              type="button" 
                              onClick={() => setReplicasCount(prev => Math.max(1, prev - 1))}
                              className="px-2 py-0.5 bg-[#2b2d31] rounded text-[#80cbc4] cursor-pointer"
                            >
                              -
                            </button>
                            <button 
                              type="button" 
                              onClick={() => setReplicasCount(prev => Math.min(10, prev + 1))}
                              className="px-2 py-0.5 bg-[#2b2d31] rounded text-[#80cbc4] cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Hardware tier */}
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-gray-500 tracking-wider">Hardware Accelerator</label>
                        <select
                          value={hardwareTier}
                          onChange={(e) => setHardwareTier(e.target.value)}
                          className="w-full px-3 py-2 bg-[#1e1f22] border border-[#3f4046] rounded-xl text-xs text-white focus:outline-none focus:border-[#80cbc4] font-bold cursor-pointer"
                        >
                          <option>NVIDIA T4 GPU (Spot)</option>
                          <option>NVIDIA RTX A6000</option>
                          <option>Standard CPU Nodes</option>
                          <option>NVIDIA H100 Tensor Core</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => setWizardStep(2)}
                        className="w-1/3 flex items-center justify-center gap-1 py-2.5 bg-[#2b2d31] hover:bg-[#313338] border border-[#3f4046] text-xs font-bold text-white rounded-xl transition-all cursor-pointer"
                      >
                        <ArrowLeft size={12} />
                        <span>Back</span>
                      </button>
                      <button
                        onClick={handleStartDeploy}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-gradient-to-tr from-[#80cbc4] to-[#8ab4f8] text-[#1e1f22] text-[11px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg"
                      >
                        <span>Deploy Stack ⚡</span>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right: Endpoints Dashboard */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Serving Endpoints Table */}
            <div className="bg-[#2b2d31]/50 border border-[#3f4046] rounded-2xl shadow-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[#3f4046]/80 bg-[#1e1f22]/50 flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-white">Live Serving Endpoints</h3>
                <span className="text-[10px] text-gray-500 font-bold font-mono">
                  {flatDeployments.filter(d => d.status === 'Running').length} active
                  {' / '}{flatDeployments.length} total
                </span>
              </div>
              
              {isLoading || isLoadingAll ? (
                <div className="p-12 flex items-center justify-center text-gray-500 gap-2">
                  <RefreshCw size={16} className="animate-spin" />
                  <span className="text-xs font-semibold">Fetching deployments across all projects...</span>
                </div>
              ) : flatDeployments.length === 0 ? (
                <div className="p-12 flex flex-col items-center justify-center text-center gap-3">
                  <CloudLightning size={36} className="text-[#3f4046]" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white">No Active Deployments</h4>
                    <p className="text-xs text-gray-500 max-w-xs font-semibold">
                      Use the Launch Wizard to deploy a model version to a serving endpoint.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#3f4046]/40 text-gray-400 font-extrabold uppercase tracking-wider text-[9px] bg-[#1e1f22]/20">
                        <th className="py-3 px-5">Endpoint Model</th>
                        <th className="py-3 px-4">Target Server</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-center">Latency</th>
                        <th className="py-3 px-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#3f4046]/30 font-semibold font-mono">
                      {flatDeployments.map(dep => (
                        <tr key={dep.id} className="hover:bg-[#2b2d31]/30 transition-all">
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-2">
                              <span className="text-white font-sans font-bold block truncate max-w-[140px]" title={dep.name}>
                                {dep.name}
                              </span>
                              <span className="text-[9px] text-[#8ab4f8] font-bold">({dep.version})</span>
                            </div>
                            <span className="text-[8px] text-gray-500 block select-text mt-0.5 truncate max-w-[190px]" title={dep.url}>
                              {dep.url}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-gray-300 font-bold font-sans">
                            {dep.target}
                            <span className="block text-[8px] text-gray-500 font-mono mt-0.5">{dep.replicas} replicas</span>
                          </td>
                          <td className="py-3.5 px-4 text-center">{getStatusBadge(dep.status)}</td>
                          <td className="py-3.5 px-4 text-center text-gray-400">
                            {dep.latencyMs > 0 ? `${dep.latencyMs.toFixed(1)} ms` : '—'}
                          </td>
                          <td className="py-3.5 px-5 text-right">
                            <button
                              onClick={() => handleTerminate(dep)}
                              className="px-2.5 py-1 bg-transparent hover:bg-rose-500/10 border border-[#3f4046] hover:border-rose-500/35 text-gray-500 hover:text-rose-400 text-[9px] font-bold rounded-lg transition-all cursor-pointer inline-flex items-center gap-1"
                            >
                              <PowerOff size={10} />
                              Terminate
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Live Aggregate Performance Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-[#2b2d31]/40 border border-[#3f4046] p-5 rounded-xl space-y-1 relative overflow-hidden">
                <div className="absolute right-2 top-2 p-2 bg-[#80cbc4]/10 rounded-lg text-[#80cbc4]">
                  <Activity size={14} className="animate-pulse" />
                </div>
                <span className="text-[10px] uppercase font-bold text-gray-500">Total Request Throughput</span>
                {totalRps !== null ? (
                  <>
                    <h4 className="text-xl font-extrabold text-white">{totalRps} <span className="text-xs text-gray-500 font-semibold">req/sec</span></h4>
                    <span className="text-[9px] text-[#80cbc4] font-bold">Aggregated across {activeMetrics.length} live deployment(s)</span>
                  </>
                ) : (
                  <>
                    <h4 className="text-xl font-extrabold text-gray-600">— req/sec</h4>
                    <span className="text-[9px] text-gray-600 font-bold">No active deployments</span>
                  </>
                )}
              </div>
              <div className="bg-[#2b2d31]/40 border border-[#3f4046] p-5 rounded-xl space-y-1 relative overflow-hidden">
                <div className="absolute right-2 top-2 p-2 bg-[#ffe082]/10 rounded-lg text-[#ffe082]">
                  <Zap size={14} />
                </div>
                <span className="text-[10px] uppercase font-bold text-gray-500">Avg Serving Latency</span>
                {avgLatency !== null ? (
                  <>
                    <h4 className="text-xl font-extrabold text-[#80cbc4]">{avgLatency} <span className="text-xs text-gray-500 font-semibold">ms</span></h4>
                    <span className="text-[9px] text-[#ffe082] font-bold">Live average from active endpoints</span>
                  </>
                ) : (
                  <>
                    <h4 className="text-xl font-extrabold text-gray-600">— ms</h4>
                    <span className="text-[9px] text-gray-600 font-bold">No active deployments</span>
                  </>
                )}
              </div>
            </div>

          </div>

        </div>

      </div>
    </MainLayout>
  );
}
