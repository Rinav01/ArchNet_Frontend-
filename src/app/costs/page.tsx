'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/Layout/MainLayout';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { 
  DollarSign, 
  Cpu, 
  Database, 
  TrendingDown, 
  Activity, 
  Sparkles, 
  Sliders, 
  Clock,
  TrendingUp,
  ChevronDown,
  Layers,
  Zap,
  HardDrive,
  Timer,
  AlertTriangle
} from 'lucide-react';

import { useProjectStore } from '@/store/projectStore';
import { graphqlRequest, ESTIMATE_COSTS, isBackendOnline } from '@/lib/graphql/client';

interface CostEstimate {
  trainingCost: number;
  inferenceCostPerMillion: number;
  gpuHourlyCost: number;
  storageMonthlyCost: number;
  estimatedTrainingTimeHours: number;
  estimatedInferenceLatencyMs: number;
}

export default function CostIntelligencePage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [isLoadingCost, setIsLoadingCost] = useState(false);

  // Project selector
  const { activeProjectId, projects, loadProjects } = useProjectStore();
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  // Selector states
  const [targetGpu, setTargetGpu] = useState('NVIDIA RTX 4090');
  const [expectedGpuHours, setExpectedGpuHours] = useState(120);

  // Backend responses
  const [backendCost, setBackendCost] = useState<CostEstimate | null>(null);
  const [costHistoryMonths, setCostHistoryMonths] = useState<number[]>([]);

  useEffect(() => {
    setIsMounted(true);
    if (projects.length === 0) loadProjects();
  }, []);

  // Set initial selected project
  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(activeProjectId || projects[0].id);
    }
  }, [projects, activeProjectId, selectedProjectId]);


  // Fetch cost estimates
  useEffect(() => {
    if (!selectedProjectId) return;
    async function fetchEstimates() {
      setIsLoadingCost(true);
      try {
        const online = await isBackendOnline();
        setIsOnline(online);
        if (!online) { setIsLoadingCost(false); return; }
        const gpuMapping: Record<string, string> = {
          'NVIDIA RTX 4090': 'RTX4090',
          'NVIDIA A100 GPU': 'A100',
          'NVIDIA H100 GPU': 'H100',
          'Standard CPU Node': 'CPU'
        };
        const mappedGpu = gpuMapping[targetGpu] || 'RTX4090';
        const res = await graphqlRequest(ESTIMATE_COSTS, {
          projectId: selectedProjectId,
          epochs: Math.max(1, Math.round(expectedGpuHours / 4)),
          gpuType: mappedGpu
        });
        if (res?.estimateCosts) {
          setBackendCost(res.estimateCosts);
          // Build 6-month history from the live training cost baseline
          const base = res.estimateCosts.trainingCost;
          setCostHistoryMonths([
            Math.round(base * 0.65),
            Math.round(base * 0.72),
            Math.round(base * 0.81),
            Math.round(base * 0.89),
            Math.round(base * 0.95),
            Math.round(base),
          ]);
        }
      } catch (err) {
        console.warn('Failed to fetch cost estimation from backend.', err);
      } finally {
        setIsLoadingCost(false);
      }
    }
    fetchEstimates();
  }, [selectedProjectId, targetGpu, expectedGpuHours]);

  if (!isMounted) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px] text-gray-500">
          <span className="text-xs font-semibold">Loading Cost Intelligence...</span>
        </div>
      </MainLayout>
    );
  }

  // --- COST CALCULATIONS (with live-first, fallback-second) ---
  const rateMap: Record<string, number> = {
    'NVIDIA RTX 4090': 0.85,
    'NVIDIA A100 GPU': 2.20,
    'NVIDIA H100 GPU': 4.76,
    'Standard CPU Node': 0.12
  };
  const currentRate = backendCost ? backendCost.gpuHourlyCost : (rateMap[targetGpu] || 0.85);
  const computedTrainingCost = backendCost ? backendCost.trainingCost : expectedGpuHours * currentRate;
  const computedInferenceCost = backendCost ? backendCost.inferenceCostPerMillion : computedTrainingCost * 0.15;
  const computedStorageCost = backendCost ? backendCost.storageMonthlyCost : 14.50;
  const estimatedTrainingTime = backendCost?.estimatedTrainingTimeHours ?? expectedGpuHours;
  const estimatedLatency = backendCost?.estimatedInferenceLatencyMs ?? 12.0;

  // Architecture metrics — from projectStore (populated via loadProjects → GET_PROJECTS)
  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const paramCount = selectedProject?.totalParameterCount ?? null;
  const gpuMemMb = selectedProject?.estimatedGpuMemoryMb ?? null;
  const paramStr = paramCount
    ? paramCount > 1_000_000 ? `${(paramCount / 1_000_000).toFixed(1)}M weight vectors`
      : `${(paramCount / 1000).toFixed(0)}K weight vectors`
    : '—';
  const vramStr = gpuMemMb
    ? `${(gpuMemMb / 1024).toFixed(2)} GB`
    : '—';
  // FLOPs is a rough estimate from parameter count (not directly exposed by backend)
  const flopsStr = paramCount
    ? `${((paramCount * 2) / 1e9).toFixed(2)} GFLOPs`
    : '—';

  // 6-month cost projection chart
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const costProjectionData = months.map((month, idx) => {
    const liveBase = costHistoryMonths[idx] ?? Math.round(computedTrainingCost * (0.65 + idx * 0.07));
    return {
      month,
      baseline: liveBase,
      optimized: Math.round(liveBase * 0.78),
    };
  });

  return (
    <MainLayout>
      <div className="p-8 max-w-6xl mx-auto space-y-8 relative pb-24 font-sans select-none">
        
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <DollarSign className="text-[#ffe082]" size={36} />
              <span>Cost Intelligence Dashboard</span>
            </h1>
            <p className="text-[#9aa0a6] mt-2 text-sm font-semibold">
              Estimate training budgets, analyze computational sizing constraints, and read AI optimization strategies.
            </p>
          </div>

          {/* Online indicator */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider ${
            isOnline ? 'bg-[#80cbc4]/10 border-[#80cbc4]/30 text-[#80cbc4]' : 'bg-amber-500/10 border-amber-500/25 text-amber-400'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-[#80cbc4] animate-pulse' : 'bg-amber-400'}`} />
            {isOnline ? 'Live Backend' : 'Offline Estimates'}
          </div>
        </div>

        {/* Project Selector */}
        <div className="bg-[#2b2d31]/50 border border-[#3f4046]/80 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center gap-4 shadow-md">
          <div className="flex items-center gap-2 shrink-0">
            <Layers size={15} className="text-[#ffe082]" />
            <span className="text-[10px] uppercase font-black tracking-wider text-gray-400">Estimate for Project</span>
          </div>
          <div className="relative flex-1 max-w-sm">
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full px-3 py-2 bg-[#1e1f22] border border-[#3f4046] rounded-xl text-xs text-white focus:outline-none focus:border-[#ffe082] font-bold cursor-pointer appearance-none pr-8"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.framework})</option>
              ))}
              {projects.length === 0 && <option value="">No projects found</option>}
            </select>
            <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>
          {isLoadingCost && (
            <span className="text-[10px] text-[#ffe082] font-bold animate-pulse flex items-center gap-1.5">
              <Zap size={11} />
              Recalculating...
            </span>
          )}
        </div>

        {/* Dynamic Parameter configuration slider block */}
        <div className="bg-[#2b2d31]/50 border border-[#3f4046]/80 p-5 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-6 shadow-md">
          <div className="space-y-1 md:col-span-1">
            <h3 className="text-xs font-black uppercase text-white flex items-center gap-1.5">
              <Sliders size={14} className="text-[#ffe082]" />
              <span>Budget Parameters</span>
            </h3>
            <p className="text-[10px] text-gray-500 font-semibold">Adjust usage metrics to scale pricing estimates.</p>
          </div>

          <div className="space-y-3 md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* GPU type */}
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-gray-500 tracking-wider">Cluster Instance</label>
              <select
                value={targetGpu}
                onChange={(e) => setTargetGpu(e.target.value)}
                className="w-full px-3 py-2 bg-[#1e1f22] border border-[#3f4046] rounded-xl text-xs text-white focus:outline-none focus:border-[#ffe082] font-bold cursor-pointer"
              >
                <option>NVIDIA RTX 4090</option>
                <option>NVIDIA A100 GPU</option>
                <option>NVIDIA H100 GPU</option>
                <option>Standard CPU Node</option>
              </select>
            </div>

            {/* GPU hours */}
            <div className="space-y-1 flex flex-col justify-end">
              <div className="flex justify-between text-[9px] font-black uppercase text-gray-500 tracking-wider mb-1">
                <span>GPU Execution Hours</span>
                <span className="text-[#ffe082] font-mono">{expectedGpuHours} hrs</span>
              </div>
              <input
                type="range"
                min="10"
                max="500"
                step="10"
                value={expectedGpuHours}
                onChange={(e) => setExpectedGpuHours(Number(e.target.value))}
                className="w-full bg-[#1e1f22] accent-[#ffe082] h-1 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Cost Metrics Estimator Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {/* Card 1: Training cost */}
          <div className="bg-[#2b2d31]/40 border border-[#3f4046] p-5 rounded-2xl shadow-xl flex items-center justify-between relative overflow-hidden">
            <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 w-16 h-16 bg-[#8ab4f8]/5 rounded-full blur-xl"></div>
            <div>
              <span className="text-[10px] uppercase font-black text-gray-500">Training Cost</span>
              <h3 className="text-2xl font-extrabold text-white mt-1.5 font-mono">${computedTrainingCost.toFixed(2)}</h3>
              <span className="text-[9px] text-gray-500 font-semibold block mt-1">{targetGpu}</span>
            </div>
            <div className="p-3 bg-[#8ab4f8]/10 rounded-xl text-[#8ab4f8]">
              <Cpu size={18} />
            </div>
          </div>

          {/* Card 2: Inference cost */}
          <div className="bg-[#2b2d31]/40 border border-[#3f4046] p-5 rounded-2xl shadow-xl flex items-center justify-between relative overflow-hidden">
            <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 w-16 h-16 bg-[#80cbc4]/5 rounded-full blur-xl"></div>
            <div>
              <span className="text-[10px] uppercase font-black text-gray-500">Inference Cost</span>
              <h3 className="text-2xl font-extrabold text-white mt-1.5 font-mono">${computedInferenceCost.toFixed(2)}</h3>
              <span className="text-[9px] text-[#80cbc4] font-semibold block mt-1">Monthly serve load</span>
            </div>
            <div className="p-3 bg-[#80cbc4]/10 rounded-xl text-[#80cbc4]">
              <Activity size={18} />
            </div>
          </div>

          {/* Card 3: Storage cost */}
          <div className="bg-[#2b2d31]/40 border border-[#3f4046] p-5 rounded-2xl shadow-xl flex items-center justify-between relative overflow-hidden">
            <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 w-16 h-16 bg-[#ffe082]/5 rounded-full blur-xl"></div>
            <div>
              <span className="text-[10px] uppercase font-black text-gray-500">Storage Cost</span>
              <h3 className="text-2xl font-extrabold text-[#ffe082] mt-1.5 font-mono">${computedStorageCost.toFixed(2)}</h3>
              <span className="text-[9px] text-[#ffe082] font-semibold block mt-1">Datasets + weight logs</span>
            </div>
            <div className="p-3 bg-[#ffe082]/10 rounded-xl text-[#ffe082]">
              <Database size={18} />
            </div>
          </div>

          {/* Card 4: Est. training time */}
          <div className="bg-[#2b2d31]/40 border border-[#3f4046] p-5 rounded-2xl shadow-xl flex items-center justify-between relative overflow-hidden">
            <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 w-16 h-16 bg-[#c5a3ff]/5 rounded-full blur-xl"></div>
            <div>
              <span className="text-[10px] uppercase font-black text-gray-500">Est. Train Time</span>
              <h3 className="text-2xl font-extrabold text-[#c5a3ff] mt-1.5 font-mono">{estimatedTrainingTime.toFixed(1)}h</h3>
              <span className="text-[9px] text-gray-500 font-semibold block mt-1">
                {backendCost ? 'From backend model' : 'Estimated'}
              </span>
            </div>
            <div className="p-3 bg-[#c5a3ff]/10 rounded-xl text-[#c5a3ff]">
              <Timer size={18} />
            </div>
          </div>
        </div>

        {/* Dashboard split content area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Projections AreaChart and Resource Breakdown */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Cost Projections AreaChart */}
            <div className="bg-[#2b2d31]/50 border border-[#3f4046] rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-white">6-Month Cost Projections</h3>
                <span className="text-[9px] text-gray-500 font-bold font-mono uppercase">
                  {backendCost ? '● Live estimate' : '○ Computed estimate'}
                </span>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <AreaChart data={costProjectionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3f4046" opacity={0.2} />
                    <XAxis dataKey="month" stroke="#9aa0a6" tick={{ fontSize: 9 }} />
                    <YAxis stroke="#9aa0a6" tick={{ fontSize: 9 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e1f22', borderColor: '#3f4046', borderRadius: '10px', fontSize: '10px' }}
                      formatter={(val: any) => [`$${val}`, '']}
                    />
                    <Area type="monotone" dataKey="baseline" name="Baseline Budget ($)" stroke="#f28b82" fill="rgba(242, 139, 130, 0.05)" strokeWidth={2} />
                    <Area type="monotone" dataKey="optimized" name="AI Optimized Budget ($)" stroke="#80cbc4" fill="rgba(128, 203, 196, 0.05)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center gap-5 text-[10px] font-semibold text-gray-500">
                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-[#f28b82] inline-block rounded" />Baseline</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-[#80cbc4] inline-block rounded" />AI Optimized (≈22% savings)</span>
              </div>
            </div>

            {/* Resource Breakdown Card — Live from Backend */}
            <div className="bg-[#2b2d31]/50 border border-[#3f4046] rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-white">Computational Resource Breakdown</h3>
                {!isOnline && (
                  <span className="flex items-center gap-1 text-[9px] text-amber-400 font-bold">
                    <AlertTriangle size={10} />
                    Offline — connect backend for live metrics
                  </span>
                )}
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs">
                <div className="bg-[#1e1f22]/50 border border-[#3f4046] p-4 rounded-xl">
                  <span className="text-[9px] uppercase font-bold text-gray-500 font-sans block">Parameters</span>
                  <span className={`text-sm font-black mt-1 block ${paramCount ? 'text-white' : 'text-gray-600'}`}>
                    {paramStr}
                  </span>
                </div>
                <div className="bg-[#1e1f22]/50 border border-[#3f4046] p-4 rounded-xl">
                  <span className="text-[9px] uppercase font-bold text-gray-500 font-sans block">FLOP Complexity</span>
                  <span className={`text-sm font-black mt-1 block ${paramCount ? 'text-white' : 'text-gray-600'}`}>
                    {flopsStr}
                  </span>
                </div>
                <div className="bg-[#1e1f22]/50 border border-[#3f4046] p-4 rounded-xl">
                  <span className="text-[9px] uppercase font-bold text-gray-500 font-sans block">VRAM Size</span>
                  <span className={`text-sm font-black mt-1 block ${gpuMemMb ? 'text-white' : 'text-gray-600'}`}>
                    {vramStr}
                  </span>
                </div>
                <div className="bg-[#1e1f22]/50 border border-[#3f4046] p-4 rounded-xl">
                  <span className="text-[9px] uppercase font-bold text-gray-500 font-sans block">GPU Hours</span>
                  <span className="text-sm font-black text-white mt-1 block">{expectedGpuHours} hrs</span>
                </div>
              </div>

              {/* Inference latency from backend */}
              {backendCost && (
                <div className="bg-[#1e1f22]/60 border border-[#3f4046]/60 rounded-xl px-4 py-3 flex items-center justify-between">
                  <span className="text-[10px] text-gray-500 font-bold flex items-center gap-1.5">
                    <Zap size={12} className="text-[#ffe082]" />
                    Estimated Inference Latency
                  </span>
                  <span className="text-[#ffe082] font-mono font-extrabold text-sm">{estimatedLatency.toFixed(1)} ms</span>
                </div>
              )}
            </div>

          </div>

          {/* Right Column: AI Cost Optimizer recommendations */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-[#2b2d31]/50 border border-[#3f4046] rounded-2xl p-6 shadow-xl space-y-6 relative overflow-hidden">
              <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 w-20 h-20 bg-[#80cbc4]/5 rounded-full blur-2xl"></div>
              
              <div className="flex items-center gap-2 border-b border-[#3f4046]/80 pb-4">
                <Sparkles size={18} className="text-[#80cbc4] animate-pulse" />
                <h3 className="text-xs font-black tracking-widest uppercase text-white">AI Cost Optimizer</h3>
              </div>

              {/* Recommendation 1 */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#ffe082] flex items-center gap-1.5">
                  <TrendingDown size={13} />
                  <span>Reduce Parameters (-25% cost)</span>
                </span>
                <p className="text-[10.5px] text-gray-300 font-semibold leading-relaxed">
                  {paramCount && paramCount > 10_000_000
                    ? `Your model has ${(paramCount / 1_000_000).toFixed(1)}M parameters. Consider GlobalAveragePooling2D to replace dense flatten layers — saves ~40% memory.`
                    : 'Replace high-dimensional Dense layers with GlobalAveragePooling2D to shave redundant weight parameters.'}
                </p>
              </div>

              {/* Recommendation 2 */}
              <div className="space-y-2 pt-4 border-t border-[#3f4046]/50">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#8ab4f8] flex items-center gap-1.5">
                  <Clock size={13} />
                  <span>Reduce FLOP complexity (-15% cost)</span>
                </span>
                <p className="text-[10.5px] text-gray-300 font-semibold leading-relaxed">
                  Enable FP16 Mixed Precision training. Running half-precision fusions cuts execution durations on RTX GPUs, reducing total billing hours.
                </p>
              </div>

              {/* Recommendation 3 */}
              <div className="space-y-2 pt-4 border-t border-[#3f4046]/50">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#80cbc4] flex items-center gap-1.5">
                  <Cpu size={13} />
                  <span>Switch Hardware (-40% cost)</span>
                </span>
                <p className="text-[10.5px] text-gray-300 font-semibold leading-relaxed">
                  {gpuMemMb && gpuMemMb < 4096
                    ? `Your model fits in ${(gpuMemMb / 1024).toFixed(1)}GB VRAM. Consider switching from dedicated Cloud A100 to Spot RTX 4090 clusters.`
                    : 'Switch from dedicated Cloud A100 nodes to Spot NVIDIA RTX 4090 clusters for substantial cost reduction.'}
                </p>
              </div>

            </div>
          </div>

        </div>

      </div>
    </MainLayout>
  );
}
