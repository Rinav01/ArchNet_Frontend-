'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import MainLayout from '@/components/Layout/MainLayout';
import { useProjectStore } from '@/store/projectStore';
import { useTrainingStore } from '@/store/trainingStore';
import { useDeploymentStore } from '@/store/deploymentStore';
import { 
  CloudLightning, 
  Cpu, 
  GitBranch, 
  CheckCircle, 
  Play, 
  TrendingUp, 
  Activity, 
  Zap, 
  Server, 
  AlertTriangle,
  Loader2,
  Terminal,
  RefreshCw,
  PowerOff
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

export default function DeployPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const projects = useProjectStore((state) => state.projects);
  const currentProject = projects.find((p) => p.id === projectId);
  
  const trainingHistory = useTrainingStore((state) => state.history);
  
  const { 
    deployments, 
    deployModel, 
    undeployModel, 
    activeMetric, 
    metricsHistory, 
    updateLiveMetrics 
  } = useDeploymentStore();

  const deployment = deployments[projectId];
  const currentMetric = activeMetric[projectId];
  const historyData = metricsHistory[projectId] || [];

  const [selectedRun, setSelectedRun] = useState<string>('');
  const [selectedFramework, setSelectedFramework] = useState<'PyTorch' | 'TensorFlow' | 'JAX' | 'ONNX'>('PyTorch');
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployStep, setDeployStep] = useState(0);
  const [deployLogs, setDeployLogs] = useState<string[]>([]);
  const [simulatedLogs, setSimulatedLogs] = useState<string[]>([]);

  // Default mock runs if training history is empty
  const defaultRuns = [
    { id: 'run_1', name: 'Run #1 - Baseline', accuracy: 0.912 },
    { id: 'run_2', name: 'Run #2 - High LR tuning', accuracy: 0.884 },
    { id: 'run_3', name: 'Run #3 - Augmented dataset (Best)', accuracy: 0.948 },
  ];
  
  const availableRuns = trainingHistory.length > 0 
    ? trainingHistory.map((run) => ({
        id: run.id,
        name: `${run.name} - Accuracy: ${(run.accuracy * 100).toFixed(1)}%`,
        accuracy: run.accuracy,
      }))
    : defaultRuns;

  useEffect(() => {
    if (availableRuns.length > 0 && !selectedRun) {
      setSelectedRun(availableRuns[availableRuns.length - 1].id);
    }
  }, [availableRuns, selectedRun]);

  useEffect(() => {
    if (currentProject) {
      setSelectedFramework(currentProject.framework);
    }
  }, [currentProject]);

  // Deployment simulator trigger
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (deployment && deployment.status === 'active') {
      interval = setInterval(() => {
        updateLiveMetrics(projectId, deployment.id);
        
        // Append a random request access log
        const paths = ['/predict', '/healthz', '/metrics', '/predict'];
        const path = paths[Math.floor(Math.random() * paths.length)];
        const isOk = Math.random() > 0.03;
        const status = isOk ? '200 OK' : '500 Internal Server Error';
        const ms = (5 + Math.random() * 15).toFixed(1);
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const log = `[${time}] ${isOk ? '🟢' : '🔴'} POST ${path} - ${status} (${ms}ms)`;
        
        setSimulatedLogs(prev => [log, ...prev].slice(0, 8));
      }, 1500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [deployment, projectId, updateLiveMetrics]);

  const handleDeploy = async () => {
    if (!selectedRun) return;
    setIsDeploying(true);
    setDeployStep(1);
    setDeployLogs(['[SYS] Starting deployment orchestration pipeline...']);

    const runName = availableRuns.find(r => r.id === selectedRun)?.name || 'Custom Run';
    const projName = currentProject?.name || 'ResNet-Model';

    setTimeout(() => {
      setDeployStep(2);
      setDeployLogs(prev => [...prev, `[SYS] Freezing computation graph for framework ${selectedFramework}...`, `[SYS] Extracted layer weights from run artifact database.`]);
    }, 700);

    setTimeout(() => {
      setDeployStep(3);
      setDeployLogs(prev => [...prev, '[SYS] Compiling optimization graph using TensorRT container runtime...', '[SYS] Building Docker runtime image: arch-registry/predict-node:latest']);
    }, 1400);

    setTimeout(() => {
      setDeployStep(4);
      setDeployLogs(prev => [...prev, '[SYS] Deploying Kubernetes replica pod nodes (RTX 4090 cluster)...', '[SYS] Exposing ingress controller at prediction endpoints.']);
    }, 2100);

    setTimeout(async () => {
      await deployModel(projectId, selectedRun, selectedFramework);
      setIsDeploying(false);
      setDeployStep(0);
      setDeployLogs([]);
      setSimulatedLogs([`[SYS] Deployment active. Live API endpoint listening at https://inference.archnet.ai/v1/models/${projName.toLowerCase().replace(/\s+/g, '-')}/predict`]);
    }, 2800);
  };

  const handleUndeploy = () => {
    if (window.confirm('Are you sure you want to stop this server and undeploy the API node?')) {
      undeployModel(projectId);
      setSimulatedLogs([]);
    }
  };

  const steps = [
    'Idle',
    'Freezing Weights',
    'Compiling AST Graph',
    'Containerizing Replica Nodes',
    'Configuring API Ingress'
  ];

  return (
    <MainLayout>
      <div className="p-8 max-w-6xl mx-auto space-y-8 relative pb-16">
        
        {/* Title / Identity */}
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <CloudLightning className="text-[#80cbc4]" size={36} />
            <span>Deployment Center</span>
          </h1>
          <p className="text-[#9aa0a6] mt-2 text-sm font-semibold">
            Deploy your visual neural networks instantly to an isolated microservice container and monitor load parameters.
          </p>
        </div>

        {/* Outer Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Side: Controls & Logs */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Deploy Setup Panel */}
            <div className="bg-[#2b2d31]/50 border border-[#3f4046] p-6 rounded-2xl space-y-6 shadow-xl">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Server size={18} className="text-[#8ab4f8]" />
                <span>API Deployment Configuration</span>
              </h3>

              {isDeploying ? (
                <div className="py-8 space-y-6 flex flex-col items-center text-center">
                  <Loader2 size={40} className="text-[#80cbc4] animate-spin" />
                  <div className="space-y-2">
                    <h4 className="text-sm font-bold text-white">Deploying Container Replica...</h4>
                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
                      Step {deployStep} of 4: {steps[deployStep]}
                    </p>
                  </div>
                  <div className="w-full bg-[#1e1f22] rounded-full h-2 overflow-hidden border border-[#3f4046]">
                    <div 
                      className="bg-[#80cbc4] h-full transition-all duration-300"
                      style={{ width: `${(deployStep / 4) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ) : deployment && deployment.status === 'active' ? (
                <div className="space-y-4">
                  <div className="bg-[#81c784]/10 border border-[#81c784]/20 p-4 rounded-xl flex items-center gap-3">
                    <CheckCircle className="text-[#81c784] shrink-0" size={24} />
                    <div>
                      <h4 className="text-sm font-extrabold text-[#81c784]">Deployment Active</h4>
                      <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Pod Cluster ID: {deployment.id}</p>
                    </div>
                  </div>

                  <div className="space-y-1.5 font-mono text-[10px] bg-[#1e1f22] border border-[#3f4046]/70 p-3 rounded-xl">
                    <div className="flex justify-between py-1 border-b border-[#3f4046]/35">
                      <span className="text-gray-500">Framework</span>
                      <span className="text-[#8ab4f8] font-bold">{deployment.target}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#3f4046]/35">
                      <span className="text-gray-500">Base Run</span>
                      <span className="text-white truncate max-w-[150px] font-bold">Run #{deployment.modelArtifactId}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-gray-500">Deployed At</span>
                      <span className="text-white font-bold">{new Date(deployment.createdAt).toLocaleTimeString()}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-black text-gray-500 tracking-wider">REST Endpoint API</span>
                    <div className="flex items-center gap-2 bg-[#1e1f22] border border-[#3f4046] px-3 py-2 rounded-xl">
                      <input 
                        type="text" 
                        readOnly 
                        value={deployment.endpointUrl} 
                        className="bg-transparent border-none text-[10px] font-mono text-[#8ab4f8] focus:outline-none w-full truncate font-bold"
                      />
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(deployment.endpointUrl);
                          alert('REST API Endpoint URL copied to clipboard!');
                        }}
                        className="text-[9px] px-2 py-0.5 bg-[#2b2d31] hover:bg-[#3f4046] text-white rounded border border-[#3f4046] cursor-pointer font-bold"
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  <div className="pt-4 flex gap-2">
                    <button
                      onClick={() => router.push(`/editor/${projectId}/inference`)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#8ab4f8] hover:bg-[#a8c7fa] text-[#1e1f22] text-xs font-black rounded-xl transition-all cursor-pointer shadow-md"
                    >
                      <Play size={12} />
                      <span>Test Playground</span>
                    </button>
                    
                    <button
                      onClick={handleUndeploy}
                      className="flex items-center justify-center p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 rounded-xl transition-all cursor-pointer"
                      title="Undeploy model server"
                    >
                      <PowerOff size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Select Run */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-black tracking-wider text-gray-500">1. Select Target Run</label>
                    <select
                      value={selectedRun}
                      onChange={(e) => setSelectedRun(e.target.value)}
                      className="w-full bg-[#1e1f22] border border-[#3f4046] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#8ab4f8] transition-all font-semibold"
                    >
                      {availableRuns.map((run) => (
                        <option key={run.id} value={run.id}>
                          {run.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Select Framework */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-black tracking-wider text-gray-500">2. Select Compiler Target</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['PyTorch', 'TensorFlow', 'JAX', 'ONNX'] as const).map((fw) => (
                        <button
                          key={fw}
                          type="button"
                          onClick={() => setSelectedFramework(fw)}
                          className={`px-3 py-2.5 text-xs font-black tracking-wider border rounded-xl transition-all cursor-pointer ${
                            selectedFramework === fw
                              ? 'bg-[#8ab4f8]/10 border-[#8ab4f8] text-[#8ab4f8]'
                              : 'bg-[#1e1f22] border-[#3f4046] text-gray-400 hover:text-white hover:border-gray-500'
                          }`}
                        >
                          {fw}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleDeploy}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#80cbc4] hover:bg-[#a2e3db] text-[#1e1f22] text-xs font-black rounded-xl border-none transition-all cursor-pointer shadow-lg mt-4"
                  >
                    <CloudLightning size={14} />
                    <span>Deploy API Node</span>
                  </button>
                </div>
              )}
            </div>

            {/* Orchestration & Request Logs Panel */}
            <div className="bg-[#2b2d31]/50 border border-[#3f4046] p-5 rounded-2xl space-y-3 shadow-xl">
              <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Terminal size={14} className="text-[#8ab4f8]" />
                <span>Ingress Request Logs Stream</span>
              </h4>
              
              <div className="bg-[#1e1f22] border border-[#3f4046]/70 rounded-xl p-3 h-48 overflow-y-auto font-mono text-[9px] text-[#80cbc4] space-y-1.5 custom-scrollbar">
                {isDeploying ? (
                  deployLogs.map((log, i) => (
                    <div key={i} className="text-[#ffe082]">{log}</div>
                  ))
                ) : simulatedLogs.length === 0 ? (
                  <div className="text-gray-500 h-full flex items-center justify-center font-sans font-semibold">
                    System idle. Deploy a node to listen to API requests.
                  </div>
                ) : (
                  simulatedLogs.map((log, i) => (
                    <div key={i} className={log.includes('🔴') ? 'text-red-400' : 'text-[#80cbc4] font-bold'}>{log}</div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Side: Metrics Dashboard */}
          <div className="lg:col-span-7 space-y-6">
            {deployment && deployment.status === 'active' ? (
              <div className="space-y-6">
                
                {/* 4 Performance Metric Cards */}
                <div className="grid grid-cols-2 gap-4">
                  
                  {/* Card 1: Requests/Sec */}
                  <div className="bg-[#2b2d31]/50 border border-[#3f4046] p-4 rounded-xl flex items-center justify-between shadow-md relative overflow-hidden">
                    <div>
                      <span className="text-[9px] uppercase font-black tracking-wider text-gray-500">API Load</span>
                      <h4 className="text-2xl font-extrabold text-white mt-1">
                        {currentMetric?.requestsPerSec || 0} <span className="text-xs font-bold text-gray-400">req/s</span>
                      </h4>
                    </div>
                    <div className="p-2.5 bg-[#8ab4f8]/10 border border-[#8ab4f8]/20 rounded-lg text-[#8ab4f8]">
                      <Activity size={16} className="animate-pulse" />
                    </div>
                  </div>

                  {/* Card 2: Latency */}
                  <div className="bg-[#2b2d31]/50 border border-[#3f4046] p-4 rounded-xl flex items-center justify-between shadow-md relative overflow-hidden">
                    <div>
                      <span className="text-[9px] uppercase font-black tracking-wider text-gray-500">Avg Latency</span>
                      <h4 className="text-2xl font-extrabold text-[#ffe082] mt-1">
                        {currentMetric?.latencyMs || 0} <span className="text-xs font-bold text-gray-400">ms</span>
                      </h4>
                    </div>
                    <div className="p-2.5 bg-[#ffe082]/10 border border-[#ffe082]/20 rounded-lg text-[#ffe082]">
                      <Zap size={16} />
                    </div>
                  </div>

                  {/* Card 3: Success Rate */}
                  <div className="bg-[#2b2d31]/50 border border-[#3f4046] p-4 rounded-xl flex items-center justify-between shadow-md relative overflow-hidden">
                    <div>
                      <span className="text-[9px] uppercase font-black tracking-wider text-gray-500">Success Rate</span>
                      <h4 className="text-2xl font-extrabold text-[#80cbc4] mt-1">
                        {currentMetric?.successRate || 100}%
                      </h4>
                    </div>
                    <div className="p-2.5 bg-[#80cbc4]/10 border border-[#80cbc4]/20 rounded-lg text-[#80cbc4]">
                      <CheckCircle size={16} />
                    </div>
                  </div>

                  {/* Card 4: Error Count */}
                  <div className="bg-[#2b2d31]/50 border border-[#3f4046] p-4 rounded-xl flex items-center justify-between shadow-md relative overflow-hidden">
                    <div>
                      <span className="text-[9px] uppercase font-black tracking-wider text-gray-500">Active Errors</span>
                      <h4 className={`text-2xl font-extrabold mt-1 ${currentMetric?.errors && currentMetric.errors > 0 ? 'text-red-400' : 'text-white'}`}>
                        {currentMetric?.errors || 0}
                      </h4>
                    </div>
                    <div className={`p-2.5 rounded-lg border ${
                      currentMetric?.errors && currentMetric.errors > 0
                        ? 'bg-red-500/10 border-red-500/20 text-red-400 animate-bounce'
                        : 'bg-gray-500/10 border-gray-500/20 text-gray-400'
                    }`}>
                      <AlertTriangle size={16} />
                    </div>
                  </div>
                </div>

                {/* Real-time Telemetry Charts */}
                <div className="bg-[#2b2d31]/50 border border-[#3f4046] p-6 rounded-2xl space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-[#3f4046]/45 pb-3">
                    <div>
                      <h4 className="text-xs font-black text-white uppercase tracking-wider">Kubernetes Pod performance curves</h4>
                      <span className="text-[9px] text-gray-500 font-semibold block mt-0.5">Real-time load statistics (last 15 seconds)</span>
                    </div>
                    <div className="flex items-center gap-1 bg-[#1e1f22] px-2 py-0.5 rounded border border-[#3f4046]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#80cbc4] animate-pulse"></span>
                      <span className="text-[8px] font-mono text-gray-400 font-bold uppercase">LIVE</span>
                    </div>
                  </div>

                   <div className="h-[250px] w-full text-[10px] font-mono">
                    {mounted ? (
                      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <AreaChart data={historyData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                          <defs>
                            <linearGradient id="colorRps" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#80cbc4" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#80cbc4" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#ffe082" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#ffe082" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#2b2d31" />
                          <XAxis dataKey="timestamp" stroke="#5f6368" />
                          <YAxis stroke="#5f6368" />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#1e1f22', 
                              borderColor: '#3f4046', 
                              borderRadius: '12px',
                              color: '#e3e3e3',
                              fontSize: '10px'
                            }} 
                          />
                          <Area
                            name="Requests/sec"
                            type="monotone"
                            dataKey="requestsPerSec"
                            stroke="#80cbc4"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorRps)"
                          />
                          <Area
                            name="Latency (ms)"
                            type="monotone"
                            dataKey="latencyMs"
                            stroke="#ffe082"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorLatency)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-gray-500 font-sans font-semibold">
                        Initializing performance curves chart...
                      </div>
                    )}
                  </div>
                </div>

              </div>
            ) : (
              <div className="bg-[#2b2d31]/30 border border-[#3f4046] rounded-2xl h-[420px] flex flex-col items-center justify-center text-center p-8 space-y-4 shadow-xl">
                <CloudLightning size={48} className="text-[#3f4046]" />
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-white">Live Dashboard Offline</h3>
                  <p className="text-xs text-gray-500 max-w-sm font-semibold">
                    No active deployment found. Select a training run baseline and framework compilation target on the left to deploy the endpoint.
                  </p>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </MainLayout>
  );
}
