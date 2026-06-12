'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/Layout/MainLayout';
import { useDeploymentStore } from '@/store/deploymentStore';
import { useExperimentStore } from '@/store/experimentStore';
import { toast } from '@/store/notificationStore';
import { 
  CloudLightning, 
  ArrowRight, 
  Cpu, 
  Layers, 
  CheckCircle, 
  AlertTriangle, 
  Server, 
  Database,
  ArrowLeft,
  RefreshCw,
  Terminal,
  Settings,
  Globe,
  Sliders,
  GitBranch
} from 'lucide-react';

interface DeploymentItem {
  id: string;
  name: string;
  version: string;
  target: 'FastAPI' | 'Docker' | 'Vertex AI' | 'SageMaker' | 'HuggingFace' | 'Kubernetes';
  status: 'Running' | 'Failed' | 'Pending' | 'Completed';
  replicas: string;
  url: string;
  latencyMs: number;
}

export default function DeploymentCenterPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  // Wizard state
  const [wizardStep, setWizardStep] = useState(1);
  const [selectedVersion, setSelectedVersion] = useState('v3');
  const [selectedTarget, setSelectedTarget] = useState<'FastAPI' | 'Docker' | 'Vertex AI' | 'SageMaker' | 'HuggingFace' | 'Kubernetes'>('Kubernetes');
  const [replicasCount, setReplicasCount] = useState(3);
  const [hardwareTier, setHardwareTier] = useState('NVIDIA T4 GPU');
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployPercent, setDeployPercent] = useState(0);

  // Mock deployments list state
  const [deployments, setDeployments] = useState<DeploymentItem[]>([
    { id: 'dep_1', name: 'ResNet Optimization Study', version: 'v3', target: 'Kubernetes', status: 'Running', replicas: '3/3', url: 'https://k8s.mlbuilder.org/endpoints/resnet-v3', latencyMs: 14 },
    { id: 'dep_2', name: 'MobileNet-V3 Classifier', version: 'v1.1', target: 'FastAPI', status: 'Completed', replicas: '1/1', url: 'https://fastapi.mlbuilder.org/classify', latencyMs: 38 },
    { id: 'dep_3', name: 'UNet Lung Segmenter', version: 'v2.0', target: 'Vertex AI', status: 'Failed', replicas: '0/2', url: 'https://vertex.googleapis.com/v1/projects/unet', latencyMs: 0 },
    { id: 'dep_4', name: 'GPT2 Attention Block', version: 'v1.0', target: 'HuggingFace', status: 'Pending', replicas: '0/1', url: 'https://huggingface.co/spaces/gpt2-block', latencyMs: 0 },
  ]);

  const modelVersions = useExperimentStore((state) => state.modelVersions);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px] text-gray-500">
          <span className="text-xs font-semibold">Loading Deployment Center...</span>
        </div>
      </MainLayout>
    );
  }

  const handleStartDeploy = () => {
    setIsDeploying(true);
    setDeployPercent(0);

    const interval = setInterval(() => {
      setDeployPercent(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            // Add to list
            const newDep: DeploymentItem = {
              id: `dep_${Math.random().toString(36).substring(2, 9)}`,
              name: 'ResNet Optimization Study',
              version: selectedVersion,
              target: selectedTarget,
              status: 'Running',
              replicas: `${replicasCount}/${replicasCount}`,
              url: `https://${selectedTarget.toLowerCase().replace(' ', '')}.mlbuilder.org/resnet-${selectedVersion}`,
              latencyMs: 12
            };
            setDeployments(prevList => [newDep, ...prevList]);
            setIsDeploying(false);
            setWizardStep(1);
            toast.success('Model Deployed', `Successfully packaged and launched endpoint on ${selectedTarget}.`);
          }, 400);
          return 100;
        }
        return prev + 10;
      });
    }, 150);
  };

  const terminateDeployment = (depId: string) => {
    if (confirm('Are you sure you want to terminate this deployment endpoint?')) {
      setDeployments(prev => prev.filter(d => d.id !== depId));
      toast.info('Endpoint Terminated', 'Successfully removed deployment stack.');
    }
  };

  const getStatusBadge = (status: DeploymentItem['status']) => {
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
            Completed
          </span>
        );
      case 'Pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-[#ffe082]/35 bg-[#ffe082]/10 text-[#ffe082] text-[9px] font-black uppercase tracking-wider animate-pulse">
            Pending
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-rose-500/35 bg-rose-500/10 text-rose-400 text-[9px] font-black uppercase tracking-wider">
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
                    <div className="h-full bg-[#80cbc4]" style={{ width: `${deployPercent}%` }}></div>
                  </div>
                  <span className="text-[10px] text-gray-500 font-bold font-mono">{deployPercent}% packages aligned</span>
                </div>
              </div>
            ) : (
              <>
                {/* Step 1: Version Selector */}
                {wizardStep === 1 && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase font-black tracking-wider text-gray-500 block">Step 1: Select Model Release</span>
                      <p className="text-[10px] text-gray-400 font-medium">Choose from verified audit versions registered in the store.</p>
                    </div>

                    <div className="space-y-2">
                      {modelVersions.map(v => (
                        <div
                          key={v.id}
                          onClick={() => setSelectedVersion(v.versionTag)}
                          className={`p-3 border rounded-xl cursor-pointer transition-all flex items-center justify-between text-xs font-semibold ${
                            selectedVersion === v.versionTag
                              ? 'bg-[#80cbc4]/10 border-[#80cbc4] text-white'
                              : 'bg-[#1e1f22] border-[#3f4046] text-gray-400'
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
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-[#80cbc4] hover:bg-[#a7ffeb] text-[#1e1f22] text-[11px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer mt-4"
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
                      {['FastAPI', 'Docker', 'Vertex AI', 'SageMaker', 'HuggingFace', 'Kubernetes'].map(tgt => (
                        <div
                          key={tgt}
                          onClick={() => setSelectedTarget(tgt as any)}
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
                <h3 className="text-xs font-black uppercase tracking-wider text-white">Serving Endpoints Dashboard</h3>
                <span className="text-[10px] text-gray-500 font-bold font-mono">Replicas active</span>
              </div>
              
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
                    {deployments.map(dep => (
                      <tr key={dep.id} className="hover:bg-[#2b2d31]/30">
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-sans font-bold block truncate max-w-[150px]" title={dep.name}>
                              {dep.name}
                            </span>
                            <span className="text-[9px] text-[#8ab4f8] font-bold">({dep.version})</span>
                          </div>
                          <span className="text-[8px] text-gray-500 block select-text mt-0.5 truncate max-w-[200px]" title={dep.url}>{dep.url}</span>
                        </td>
                        <td className="py-3.5 px-4 text-gray-300 font-bold font-sans">
                          {dep.target}
                          <span className="block text-[8px] text-gray-500 font-mono mt-0.5">Scale: {dep.replicas}</span>
                        </td>
                        <td className="py-3.5 px-4 text-center">{getStatusBadge(dep.status)}</td>
                        <td className="py-3.5 px-4 text-center text-gray-400">
                          {dep.latencyMs > 0 ? `${dep.latencyMs} ms` : '—'}
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <button
                            onClick={() => terminateDeployment(dep.id)}
                            className="px-2.5 py-1 bg-transparent hover:bg-rose-500/10 border border-[#3f4046] hover:border-rose-500/35 text-gray-500 hover:text-rose-400 text-[9px] font-bold rounded-lg transition-all cursor-pointer"
                          >
                            Terminate
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Serving Performance highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-[#2b2d31]/40 border border-[#3f4046] p-4.5 rounded-xl space-y-1">
                <span className="text-[10px] uppercase font-bold text-gray-500">Serving Request throughput</span>
                <h4 className="text-xl font-extrabold text-white">142.4 req/sec</h4>
              </div>
              <div className="bg-[#2b2d31]/40 border border-[#3f4046] p-4.5 rounded-xl space-y-1">
                <span className="text-[10px] uppercase font-bold text-gray-500">Avg Serving Latency</span>
                <h4 className="text-xl font-extrabold text-white text-[#80cbc4]">24.2 ms</h4>
              </div>
            </div>

          </div>

        </div>

      </div>
    </MainLayout>
  );
}
