'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import MainLayout from '@/components/Layout/MainLayout';
import { useProjectStore } from '@/store/projectStore';
import { useExperimentStore, ExperimentRun, ModelVersion } from '@/store/experimentStore';
import { useDeploymentStore } from '@/store/deploymentStore';
import { 
  GitBranch, 
  GitCompare, 
  History, 
  Cpu, 
  Database, 
  FileCode, 
  Server, 
  Check, 
  ArrowRight, 
  TrendingUp, 
  Activity, 
  Clock, 
  Zap, 
  AlertTriangle,
  RotateCw,
  GitCommit,
  CheckCircle,
  Copy,
  LayoutGrid
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

export default function ExperimentsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const projects = useProjectStore((state) => state.projects);
  const currentProject = projects.find((p) => p.id === projectId);

  const {
    experiments,
    selectedCompareRunIds,
    modelVersions,
    toggleRunSelection,
    rollbackVersion,
    clearSelection
  } = useExperimentStore();

  const { deployments } = useDeploymentStore();
  const activeDeployment = deployments[projectId];

  const [activeTab, setActiveTab] = useState<'lineage' | 'compare' | 'history'>('lineage');
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [rollbackProgress, setRollbackProgress] = useState('');
  const [diffViewVersion, setDiffViewVersion] = useState<ModelVersion | null>(null);

  // Active Experiment runs
  const activeExperiment = experiments[0]; // Study baseline
  const runs = activeExperiment?.runs || [];

  // Selected runs for comparison
  const selectedRuns = runs.filter(run => selectedCompareRunIds.includes(run.id));

  // Handle Rollback
  const handleRollback = async (version: ModelVersion) => {
    if (version.isActive) return;
    if (window.confirm(`Confirm rollback of active REST endpoint to ${version.versionTag} (${version.commitHash.slice(0, 10)})?`)) {
      setIsRollingBack(true);
      setRollbackProgress('Stopping ingress controller replicas...');
      
      setTimeout(() => {
        setRollbackProgress('Deploying container image matching git ref...');
      }, 500);

      setTimeout(() => {
        setRollbackProgress('Verifying weight checksum compliance...');
      }, 1000);

      setTimeout(async () => {
        await rollbackVersion(version.id);
        setIsRollingBack(false);
        setRollbackProgress('');
        alert(`Successfully rolled back and checked out endpoint to ${version.versionTag}!`);
      }, 1500);
    }
  };

  // Prepare comparison data for Recharts
  const chartData = selectedRuns.map(run => ({
    name: run.name,
    Accuracy: parseFloat((run.accuracy * 100).toFixed(1)),
    Loss: run.loss,
    Latency: run.latencyMs,
    Memory: run.memoryMb
  }));

  // Style helper for best metrics
  const isBestRunValue = (run: ExperimentRun, metric: 'accuracy' | 'loss' | 'latencyMs' | 'memoryMb') => {
    if (selectedRuns.length < 2) return false;
    const values = selectedRuns.map(r => r[metric]);
    if (metric === 'accuracy') {
      return run.accuracy === Math.max(...values);
    } else {
      return run[metric] === Math.min(...values);
    }
  };

  return (
    <MainLayout>
      <div className="p-8 max-w-6xl mx-auto space-y-8 relative pb-16">
        
        {/* Title Block */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <GitBranch className="text-[#8ab4f8]" size={34} />
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white">
                Experiment Registry & Lineage
              </h1>
              <p className="text-[#9aa0a6] text-xs font-semibold">
                Audit visual layer lineages, perform side-by-side run evaluations, and manage Git-style model version checkouts.
              </p>
            </div>
          </div>
          
          <button
            onClick={() => router.push(`/editor/${projectId}`)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#2b2d31] hover:bg-[#313338] text-xs font-bold text-white rounded-xl border border-[#3f4046] transition-all cursor-pointer self-end md:self-auto"
          >
            <span>Back to Editor</span>
            <ArrowRight size={12} />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-[#3f4046]">
          <button
            onClick={() => setActiveTab('lineage')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'lineage' 
                ? 'text-[#8ab4f8] border-[#8ab4f8]' 
                : 'text-[#9aa0a6] border-transparent hover:text-white'
            }`}
          >
            <LayoutGrid size={15} />
            <span>Lineage Explorer</span>
          </button>
          <button
            onClick={() => setActiveTab('compare')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'compare' 
                ? 'text-[#80cbc4] border-[#80cbc4]' 
                : 'text-[#9aa0a6] border-transparent hover:text-white'
            }`}
          >
            <GitCompare size={15} />
            <span>Compare Trials ({selectedCompareRunIds.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'history' 
                ? 'text-[#c5a3ff] border-[#c5a3ff]' 
                : 'text-[#9aa0a6] border-transparent hover:text-white'
            }`}
          >
            <History size={15} />
            <span>Version Timeline</span>
          </button>
        </div>

        {/* Rolling back modal overlay */}
        {isRollingBack && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-[#1e1f22] border border-[#3f4046] p-8 rounded-2xl max-w-sm w-full text-center space-y-4 shadow-2xl animate-in zoom-in duration-200">
              <RotateCw size={40} className="text-[#c5a3ff] animate-spin mx-auto" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">Performing Git Checkout Rollback...</h4>
                <p className="text-[10px] text-gray-500 font-mono tracking-wider font-semibold uppercase">{rollbackProgress}</p>
              </div>
            </div>
          </div>
        )}

        {/* ─────────── TAB 1: LINEAGE EXPLORER ─────────── */}
        {activeTab === 'lineage' && (
          <div className="space-y-8">
            <div className="bg-[#2b2d31]/30 border border-[#3f4046]/80 p-5 rounded-2xl">
              <h3 className="text-sm font-bold text-white">End-to-End Asset Lineage Visual DAG</h3>
              <p className="text-xs text-gray-500 mt-1 font-semibold">
                Programmatic audit trail tracing data sources, training parameters, compiled code structures, and running deployments.
              </p>
            </div>

            {/* Tree Flow (Vertical Stack with Beziers) */}
            <div className="flex flex-col items-center relative py-4 space-y-12">
              
              {/* NODE 1: DATASET */}
              <div className="bg-[#2b2d31]/80 border border-[#3f4046] rounded-2xl w-full max-w-md p-5 shadow-lg relative overflow-hidden z-10 transition-all hover:border-[#8ab4f8]">
                <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-[#8ab4f8]"></div>
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-[#8ab4f8]/10 border border-[#8ab4f8]/20 rounded-xl text-[#8ab4f8] shrink-0">
                    <Database size={20} />
                  </div>
                  <div className="space-y-3 flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] uppercase font-black tracking-wider text-gray-500">Asset 1: Dataset Version</span>
                      <span className="text-[10px] font-mono font-bold bg-[#8ab4f8]/10 text-[#8ab4f8] px-2 py-0.5 rounded border border-[#8ab4f8]/20">v1.1.0</span>
                    </div>
                    <div>
                      <h4 className="text-base font-extrabold text-white">CIFAR-100 Standard Data</h4>
                      <p className="text-[10px] text-gray-400 font-medium truncate mt-0.5">s3://archnet-ml-datasets/cifar100-v1.1.0/</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[9px] font-mono text-gray-400 border-t border-[#3f4046]/40 pt-2.5">
                      <div>
                        <span className="block text-gray-500 font-bold">RECORDS</span>
                        <span className="font-extrabold text-white">50,000</span>
                      </div>
                      <div>
                        <span className="block text-gray-500 font-bold">CHANNELS</span>
                        <span className="font-extrabold text-white">[3, 32, 32]</span>
                      </div>
                      <div>
                        <span className="block text-gray-500 font-bold">DATA SIZE</span>
                        <span className="font-extrabold text-white">163 MB</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Connector Arrow 1 */}
              <div className="absolute top-[120px] bottom-[260px] w-0.5 bg-gradient-to-b from-[#8ab4f8] to-[#ffe082] opacity-40 z-0">
                <div className="w-1.5 h-1.5 bg-[#ffe082] rounded-full absolute bottom-0 -left-[2.5px] animate-pulse"></div>
              </div>

              {/* NODE 2: TRAINING RUN */}
              <div className="bg-[#2b2d31]/80 border border-[#3f4046] rounded-2xl w-full max-w-md p-5 shadow-lg relative overflow-hidden z-10 transition-all hover:border-[#ffe082]">
                <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-[#ffe082]"></div>
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-[#ffe082]/10 border border-[#ffe082]/20 rounded-xl text-[#ffe082] shrink-0">
                    <Cpu size={20} />
                  </div>
                  <div className="space-y-3 flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] uppercase font-black tracking-wider text-gray-500">Asset 2: Training Trial</span>
                      <span className="text-[10px] font-mono font-bold bg-[#ffe082]/10 text-[#ffe082] px-2 py-0.5 rounded border border-[#ffe082]/20">Run #3</span>
                    </div>
                    <div>
                      <h4 className="text-base font-extrabold text-white">AdamW Optimizer Decay</h4>
                      <p className="text-[10px] text-gray-400 font-medium mt-0.5">Hyperparameters: lr=1e-3, batch=64, epochs=20</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[9px] font-mono text-gray-400 border-t border-[#3f4046]/40 pt-2.5">
                      <div>
                        <span className="block text-gray-500 font-bold">ACCURACY</span>
                        <span className="font-extrabold text-[#80cbc4]">94.82%</span>
                      </div>
                      <div>
                        <span className="block text-gray-500 font-bold">LOSS</span>
                        <span className="font-extrabold text-red-400">0.0824</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Connector Arrow 2 */}
              <div className="absolute top-[340px] bottom-[100px] w-0.5 bg-gradient-to-b from-[#ffe082] to-[#c5a3ff] opacity-40 z-0">
                <div className="w-1.5 h-1.5 bg-[#c5a3ff] rounded-full absolute bottom-0 -left-[2.5px] animate-pulse"></div>
              </div>

              {/* NODE 3: ARTIFACT */}
              <div className="bg-[#2b2d31]/80 border border-[#3f4046] rounded-2xl w-full max-w-md p-5 shadow-lg relative overflow-hidden z-10 transition-all hover:border-[#c5a3ff]">
                <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-[#c5a3ff]"></div>
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-[#c5a3ff]/10 border border-[#c5a3ff]/20 rounded-xl text-[#c5a3ff] shrink-0">
                    <FileCode size={20} />
                  </div>
                  <div className="space-y-3 flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] uppercase font-black tracking-wider text-gray-500">Asset 3: Compiled Code Artifact</span>
                      <span className="text-[10px] font-mono font-bold bg-[#c5a3ff]/10 text-[#c5a3ff] px-2 py-0.5 rounded border border-[#c5a3ff]/20">Model v3</span>
                    </div>
                    <div>
                      <h4 className="text-base font-extrabold text-white">cifar100-resnet.pt</h4>
                      <p className="text-[10px] text-gray-400 font-mono truncate mt-0.5">sha256:9af8c2b71d4ec2b6507851cd653b</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[9px] font-mono text-gray-400 border-t border-[#3f4046]/40 pt-2.5">
                      <div>
                        <span className="block text-gray-500 font-bold">FRAMEWORK</span>
                        <span className="font-extrabold text-white">PyTorch nn.Module</span>
                      </div>
                      <div>
                        <span className="block text-gray-500 font-bold">PARAMS</span>
                        <span className="font-extrabold text-white">25.6M weights</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Connector Arrow 3 */}
              <div className="absolute top-[560px] bottom-[20px] w-0.5 bg-gradient-to-b from-[#c5a3ff] to-[#80cbc4] opacity-40 z-0">
                <div className="w-1.5 h-1.5 bg-[#80cbc4] rounded-full absolute bottom-0 -left-[2.5px] animate-pulse"></div>
              </div>

              {/* NODE 4: DEPLOYMENT */}
              <div className="bg-[#2b2d31]/80 border border-[#3f4046] rounded-2xl w-full max-w-md p-5 shadow-lg relative overflow-hidden z-10 transition-all hover:border-[#80cbc4]">
                <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-[#80cbc4]"></div>
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-[#80cbc4]/10 border border-[#80cbc4]/20 rounded-xl text-[#80cbc4] shrink-0">
                    <Server size={20} />
                  </div>
                  <div className="space-y-3 flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] uppercase font-black tracking-wider text-gray-500">Asset 4: Deploy Endpoints</span>
                      <span className="text-[10px] font-mono font-bold bg-[#80cbc4]/15 text-[#80cbc4] px-2 py-0.5 rounded border border-[#80cbc4]/20 flex items-center gap-1 animate-pulse">
                        <span className="w-1 h-1 rounded-full bg-[#80cbc4]"></span>
                        ACTIVE
                      </span>
                    </div>
                    <div>
                      <h4 className="text-base font-extrabold text-white">REST API Endpoint Router</h4>
                      <p className="text-[10px] font-mono text-[#8ab4f8] truncate mt-0.5">https://inference.archnet.ai/v1/predict</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[9px] font-mono text-gray-400 border-t border-[#3f4046]/40 pt-2.5">
                      <div>
                        <span className="block text-gray-500 font-bold">LATENCY</span>
                        <span className="font-extrabold text-[#ffe082]">12.42ms avg</span>
                      </div>
                      <div>
                        <span className="block text-gray-500 font-bold">SUCCESS RATE</span>
                        <span className="font-extrabold text-[#80cbc4]">100.00%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ─────────── TAB 2: COMPARE EXPERIMENTS ─────────── */}
        {activeTab === 'compare' && (
          <div className="space-y-6">
            
            {/* Setup instructions */}
            <div className="bg-[#2b2d31]/30 border border-[#3f4046]/80 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-white">Side-by-Side Trial Benchmarks</h3>
                <p className="text-xs text-gray-500 mt-1 font-semibold">
                  Select up to 3 experiment runs below to compare accuracy, loss, and inference characteristics.
                </p>
              </div>
              <button 
                onClick={clearSelection} 
                disabled={selectedCompareRunIds.length === 0}
                className="px-3 py-1.5 bg-[#2b2d31] hover:bg-[#313338] border border-[#3f4046] text-xs font-bold text-gray-400 hover:text-white rounded-xl transition-all cursor-pointer"
              >
                Clear Selection
              </button>
            </div>

            {/* Run Selection checklist grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {runs.map((run) => {
                const isSelected = selectedCompareRunIds.includes(run.id);
                return (
                  <div
                    key={run.id}
                    onClick={() => toggleRunSelection(run.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer select-none relative overflow-hidden ${
                      isSelected
                        ? 'bg-[#80cbc4]/5 border-[#80cbc4] shadow-md'
                        : 'bg-[#2b2d31]/40 border-[#3f4046] hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[9px] font-mono text-gray-500 font-black uppercase">{run.framework}</span>
                      <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${
                        isSelected ? 'bg-[#80cbc4] border-[#80cbc4]' : 'border-gray-500'
                      }`}>
                        {isSelected && <Check size={10} className="text-[#1e1f22] font-black" />}
                      </div>
                    </div>

                    <h4 className="text-xs font-extrabold text-white mt-2 truncate">{run.name}</h4>
                    <div className="mt-3 grid grid-cols-2 gap-1 text-[9px] font-mono text-gray-400">
                      <div>
                        <span className="block text-[8px] text-gray-500 font-bold">ACC</span>
                        <span className="font-extrabold text-white">{(run.accuracy * 100).toFixed(1)}%</span>
                      </div>
                      <div>
                        <span className="block text-[8px] text-gray-500 font-bold">LOSS</span>
                        <span className="font-extrabold text-white">{run.loss.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Comparison Dashboard (rendered only when runs are selected) */}
            {selectedRuns.length === 0 ? (
              <div className="bg-[#2b2d31]/20 border border-[#3f4046] rounded-2xl h-64 flex flex-col items-center justify-center text-center p-8 space-y-3">
                <GitCompare size={36} className="text-gray-600" />
                <h4 className="text-sm font-bold text-white">No Trials Selected</h4>
                <p className="text-xs text-gray-500 max-w-xs font-semibold">
                  Select at least two experiment card baselines from the checklist above to load comparison parameters.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* 1. Comparison Matrix Table */}
                <div className="bg-[#2b2d31]/50 border border-[#3f4046] rounded-2xl shadow-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-[#3f4046]/80 bg-[#1e1f22]/50 text-gray-400 font-extrabold uppercase tracking-wider text-[9px]">
                          <th className="py-3 px-5">Trial Run Details</th>
                          {selectedRuns.map(run => (
                            <th key={run.id} className="py-3 px-5 border-l border-[#3f4046]/50">
                              {run.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#3f4046]/50 font-semibold">
                        {/* Accuracy Row */}
                        <tr className="hover:bg-[#2b2d31]/20 transition-all">
                          <td className="py-3.5 px-5 text-gray-400 font-bold">Validation Accuracy</td>
                          {selectedRuns.map(run => {
                            const best = isBestRunValue(run, 'accuracy');
                            return (
                              <td key={run.id} className={`py-3.5 px-5 border-l border-[#3f4046]/50 font-mono ${best ? 'text-[#80cbc4] font-black' : 'text-white'}`}>
                                {(run.accuracy * 100).toFixed(2)}% {best && '🏆 (Best)'}
                              </td>
                            );
                          })}
                        </tr>
                        {/* Loss Row */}
                        <tr className="hover:bg-[#2b2d31]/20 transition-all">
                          <td className="py-3.5 px-5 text-gray-400 font-bold">Training Loss</td>
                          {selectedRuns.map(run => {
                            const best = isBestRunValue(run, 'loss');
                            return (
                              <td key={run.id} className={`py-3.5 px-5 border-l border-[#3f4046]/50 font-mono ${best ? 'text-[#80cbc4] font-black' : 'text-white'}`}>
                                {run.loss.toFixed(4)} {best && '🟢'}
                              </td>
                            );
                          })}
                        </tr>
                        {/* Latency Row */}
                        <tr className="hover:bg-[#2b2d31]/20 transition-all">
                          <td className="py-3.5 px-5 text-gray-400 font-bold">Avg Inference Latency</td>
                          {selectedRuns.map(run => {
                            const best = isBestRunValue(run, 'latencyMs');
                            return (
                              <td key={run.id} className={`py-3.5 px-5 border-l border-[#3f4046]/50 font-mono ${best ? 'text-[#ffe082] font-black' : 'text-white'}`}>
                                {run.latencyMs.toFixed(1)} ms {best && '⚡ (Fastest)'}
                              </td>
                            );
                          })}
                        </tr>
                        {/* Memory Row */}
                        <tr className="hover:bg-[#2b2d31]/20 transition-all">
                          <td className="py-3.5 px-5 text-gray-400 font-bold">Memory Allocation Footprint</td>
                          {selectedRuns.map(run => {
                            const best = isBestRunValue(run, 'memoryMb');
                            return (
                              <td key={run.id} className={`py-3.5 px-5 border-l border-[#3f4046]/50 font-mono ${best ? 'text-[#c5a3ff] font-black' : 'text-white'}`}>
                                {run.memoryMb} MB {best && '💾 (Sleekest)'}
                              </td>
                            );
                          })}
                        </tr>
                        {/* Dataset Source */}
                        <tr className="hover:bg-[#2b2d31]/20 transition-all">
                          <td className="py-3.5 px-5 text-gray-400 font-bold">Dataset Version</td>
                          {selectedRuns.map(run => (
                            <td key={run.id} className="py-3.5 px-5 border-l border-[#3f4046]/50 font-mono text-gray-300">
                              {run.datasetName} ({run.datasetVersion})
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 2. Recharts Bar Chart Matrix (2x2 Grid) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Chart 1: Accuracy */}
                  <div className="bg-[#2b2d31]/40 border border-[#3f4046] p-5 rounded-2xl space-y-3 shadow-md">
                    <span className="text-[10px] uppercase font-black tracking-wider text-gray-500">Validation Accuracy (%) - Higher is Better</span>
                    <div className="h-[200px] w-full text-[10px] font-mono">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#2b2d31" />
                          <XAxis dataKey="name" stroke="#5f6368" />
                          <YAxis stroke="#5f6368" domain={[0, 100]} />
                          <Tooltip contentStyle={{ backgroundColor: '#1e1f22', borderColor: '#3f4046', color: '#e3e3e3', fontSize: '10px' }} />
                          <Bar dataKey="Accuracy" fill="#80cbc4" radius={[4, 4, 0, 0]} barSize={40} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Chart 2: Loss */}
                  <div className="bg-[#2b2d31]/40 border border-[#3f4046] p-5 rounded-2xl space-y-3 shadow-md">
                    <span className="text-[10px] uppercase font-black tracking-wider text-gray-500">Training Loss (Cross Entropy) - Lower is Better</span>
                    <div className="h-[200px] w-full text-[10px] font-mono">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#2b2d31" />
                          <XAxis dataKey="name" stroke="#5f6368" />
                          <YAxis stroke="#5f6368" />
                          <Tooltip contentStyle={{ backgroundColor: '#1e1f22', borderColor: '#3f4046', color: '#e3e3e3', fontSize: '10px' }} />
                          <Bar dataKey="Loss" fill="#f28b82" radius={[4, 4, 0, 0]} barSize={40} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Chart 3: Latency */}
                  <div className="bg-[#2b2d31]/40 border border-[#3f4046] p-5 rounded-2xl space-y-3 shadow-md">
                    <span className="text-[10px] uppercase font-black tracking-wider text-gray-500">Latency (milliseconds) - Lower is Better</span>
                    <div className="h-[200px] w-full text-[10px] font-mono">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#2b2d31" />
                          <XAxis dataKey="name" stroke="#5f6368" />
                          <YAxis stroke="#5f6368" />
                          <Tooltip contentStyle={{ backgroundColor: '#1e1f22', borderColor: '#3f4046', color: '#e3e3e3', fontSize: '10px' }} />
                          <Bar dataKey="Latency" fill="#ffe082" radius={[4, 4, 0, 0]} barSize={40} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Chart 4: Memory */}
                  <div className="bg-[#2b2d31]/40 border border-[#3f4046] p-5 rounded-2xl space-y-3 shadow-md">
                    <span className="text-[10px] uppercase font-black tracking-wider text-gray-500">Memory Allocation (MB) - Lower is Better</span>
                    <div className="h-[200px] w-full text-[10px] font-mono">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#2b2d31" />
                          <XAxis dataKey="name" stroke="#5f6368" />
                          <YAxis stroke="#5f6368" />
                          <Tooltip contentStyle={{ backgroundColor: '#1e1f22', borderColor: '#3f4046', color: '#e3e3e3', fontSize: '10px' }} />
                          <Bar dataKey="Memory" fill="#c5a3ff" radius={[4, 4, 0, 0]} barSize={40} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                </div>

              </div>
            )}
          </div>
        )}

        {/* ─────────── TAB 3: VERSION TIMELINE ─────────── */}
        {activeTab === 'history' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Version timeline tree */}
            <div className="lg:col-span-8 space-y-6">
              <div className="bg-[#2b2d31]/30 border border-[#3f4046]/80 p-5 rounded-2xl">
                <h3 className="text-sm font-bold text-white">Git-Style Model Registry Revisions</h3>
                <p className="text-xs text-gray-500 mt-1 font-semibold">
                  Track full architecture baselines, checkout draft versions, or trigger hot rolling-rollbacks on active endpoints.
                </p>
              </div>

              {/* Revision history timeline */}
              <div className="relative pl-6 border-l border-[#3f4046]/70 ml-4 space-y-6">
                {modelVersions.map((version) => (
                  <div key={version.id} className="relative">
                    {/* Timeline Node Point */}
                    <div className={`absolute -left-[31px] w-[11px] h-[11px] rounded-full border-2 bg-[#1e1f22] ${
                      version.isActive ? 'border-[#80cbc4]' : 'border-[#3f4046]'
                    }`}>
                      {version.isActive && (
                        <div className="w-1.5 h-1.5 bg-[#80cbc4] rounded-full m-auto absolute inset-0 animate-ping"></div>
                      )}
                    </div>

                    <div className={`bg-[#2b2d31]/50 border rounded-2xl p-5 shadow-lg space-y-4 ${
                      version.isActive ? 'border-[#80cbc4]/40 bg-[#80cbc4]/5' : 'border-[#3f4046]'
                    }`}>
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <h4 className="text-base font-extrabold text-white">{version.versionTag}</h4>
                            {version.isActive && (
                              <span className="text-[9px] uppercase font-black bg-[#80cbc4]/15 border border-[#80cbc4]/25 text-[#80cbc4] px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                                <span className="w-1 h-1 rounded-full bg-[#80cbc4]"></span>
                                Active Endpoint
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-gray-400 font-semibold font-mono flex items-center gap-2">
                            <span className="text-[#8ab4f8]">{version.commitHash}</span>
                            <span className="text-gray-500">•</span>
                            <span>{version.timestamp}</span>
                            <span className="text-gray-500">•</span>
                            <span>By: {version.author}</span>
                          </p>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          <button
                            onClick={() => setDiffViewVersion(version)}
                            className="px-3 py-1.5 bg-[#2b2d31] hover:bg-[#3f4046] border border-[#3f4046] text-[#e3e3e3] hover:text-white text-[10px] font-black rounded-lg transition-all cursor-pointer"
                          >
                            Structure Diff
                          </button>
                          
                          {!version.isActive && (
                            <button
                              onClick={() => handleRollback(version)}
                              className="px-3 py-1.5 bg-[#c5a3ff] hover:bg-[#d4beff] text-[#1e1f22] text-[10px] font-black rounded-lg transition-all cursor-pointer shadow-md"
                            >
                              Checkout Endpoint
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-[9px] font-mono text-gray-400 border-t border-[#3f4046]/45 pt-3">
                        <div>
                          <span className="block text-gray-500 font-bold">VALIDATION ACCURACY</span>
                          <span className="font-extrabold text-white">{(version.accuracy * 100).toFixed(2)}%</span>
                        </div>
                        <div>
                          <span className="block text-gray-500 font-bold">COMPILATION TARGET</span>
                          <span className="font-extrabold text-white">{version.framework}</span>
                        </div>
                        <div>
                          <span className="block text-gray-500 font-bold">TRAINING LOSS</span>
                          <span className="font-extrabold text-white">{version.loss.toFixed(4)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Git Diff Side Panel (visible once selected) */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-[#2b2d31]/50 border border-[#3f4046] p-5 rounded-2xl shadow-xl space-y-4">
                <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <GitCommit size={14} className="text-[#c5a3ff]" />
                  <span>Architecture Commit Diff</span>
                </h4>

                {diffViewVersion ? (
                  <div className="space-y-4">
                    <div className="space-y-1.5 bg-[#1e1f22] border border-[#3f4046]/70 p-3 rounded-xl font-mono text-[9px] text-[#ffe082]">
                      <div className="flex justify-between py-0.5 border-b border-[#3f4046]/35 text-gray-500">
                        <span>Commit Ref</span>
                        <span className="text-[#8ab4f8] font-bold">{diffViewVersion.commitHash.slice(0, 14)}</span>
                      </div>
                      <div className="flex justify-between py-0.5 border-b border-[#3f4046]/35 text-gray-500">
                        <span>Compare Version</span>
                        <span className="text-white font-bold">{diffViewVersion.versionTag} vs. Active v3</span>
                      </div>
                      <div className="flex justify-between py-0.5 text-gray-500">
                        <span>Compiled framework</span>
                        <span className="text-white font-bold">{diffViewVersion.framework}</span>
                      </div>
                    </div>

                    <div className="font-mono text-[9px] bg-[#1e1f22] border border-[#3f4046] p-3 rounded-xl space-y-2 h-44 overflow-y-auto custom-scrollbar">
                      {diffViewVersion.versionTag === 'Model v2' ? (
                        <>
                          <div className="text-gray-500 font-bold">// Model Graph changes:</div>
                          <div className="text-red-400 font-bold">- "layers.0": Conv2D (filters: 32, stride: 2)</div>
                          <div className="text-green-400 font-bold">+ "layers.0": Conv2D (filters: 64, stride: 1)</div>
                          <div className="text-green-400 font-bold">+ "layers.1": BatchNorm2D (features: 64)</div>
                          <div className="text-gray-500 font-bold">// Optimizer updates:</div>
                          <div className="text-red-400 font-bold">- optimizer = SGD (lr: 0.01)</div>
                          <div className="text-green-400 font-bold">+ optimizer = AdamW (lr: 0.001)</div>
                        </>
                      ) : diffViewVersion.versionTag === 'Model v1' ? (
                        <>
                          <div className="text-gray-500 font-bold">// Graph structural changes:</div>
                          <div className="text-red-400 font-bold">- "layers.2": MaxPool2D (poolSize: 2)</div>
                          <div className="text-red-400 font-bold">- "layers.5": Dense (units: 256)</div>
                          <div className="text-green-400 font-bold">+ "layers.5": Dense (units: 1024)</div>
                          <div className="text-green-400 font-bold">+ "layers.6": Dropout (rate: 0.3)</div>
                          <div className="text-gray-500 font-bold">// Accuracy metrics:</div>
                          <div className="text-[#80cbc4] font-bold">Accuracy delta: +6.4% improvement</div>
                        </>
                      ) : (
                        <div className="text-gray-500 italic h-full flex items-center justify-center font-sans font-semibold">
                          Selected version is active. No diff differences.
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => setDiffViewVersion(null)}
                      className="w-full py-2 bg-[#2b2d31] hover:bg-[#3f4046] border border-[#3f4046] text-xs font-bold text-white rounded-xl transition-all cursor-pointer text-center"
                    >
                      Clear Diff View
                    </button>
                  </div>
                ) : (
                  <div className="text-gray-500 text-xs italic text-center py-12 font-semibold">
                    Click "Structure Diff" on any revision card to output code compilation differences.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </MainLayout>
  );
}
