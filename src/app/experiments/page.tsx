'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/Layout/MainLayout';
import { useExperimentStore, ExperimentRun } from '@/store/experimentStore';
import { toast } from '@/store/notificationStore';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend
} from 'recharts';
import { 
  TrendingUp, 
  ArrowRight, 
  Sparkles, 
  AlertTriangle, 
  Plus, 
  Check, 
  Gauge, 
  Cpu, 
  Database,
  RefreshCw,
  LineChart as LucideLineChart
} from 'lucide-react';

export default function ExperimentsPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  // Zustand Store
  const experiments = useExperimentStore((state) => state.experiments);
  const selectedCompareRunIds = useExperimentStore((state) => state.selectedCompareRunIds);
  const toggleRunSelection = useExperimentStore((state) => state.toggleRunSelection);
  const clearSelection = useExperimentStore((state) => state.clearSelection);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px] text-gray-500">
          <span className="text-xs font-semibold">Loading Experiment Analytics...</span>
        </div>
      </MainLayout>
    );
  }

  // Retrieve flat list of all runs
  const allRuns = experiments.flatMap(exp => exp.runs);

  // Selected runs for detailed side-by-side comparison
  const selectedRuns = allRuns.filter(run => selectedCompareRunIds.includes(run.id));

  // --- MOCK TRAINING HISTORY FOR RECHARTS ---
  const chartHistoryData = [
    { epoch: 1, trainLoss: 0.82, valLoss: 0.88, accuracy: 0.62, lr: 0.001, gpu: 82, ram: 42 },
    { epoch: 2, trainLoss: 0.64, valLoss: 0.71, accuracy: 0.71, lr: 0.001, gpu: 85, ram: 43 },
    { epoch: 3, trainLoss: 0.51, valLoss: 0.59, accuracy: 0.78, lr: 0.001, gpu: 88, ram: 43 },
    { epoch: 4, trainLoss: 0.42, valLoss: 0.48, accuracy: 0.82, lr: 0.001, gpu: 84, ram: 44 },
    { epoch: 5, trainLoss: 0.35, valLoss: 0.41, accuracy: 0.85, lr: 0.0008, gpu: 89, ram: 44 },
    { epoch: 6, trainLoss: 0.28, valLoss: 0.35, accuracy: 0.88, lr: 0.0006, gpu: 87, ram: 45 },
    { epoch: 7, trainLoss: 0.22, valLoss: 0.29, accuracy: 0.90, lr: 0.0004, gpu: 86, ram: 45 },
    { epoch: 8, trainLoss: 0.18, valLoss: 0.24, accuracy: 0.92, lr: 0.0002, gpu: 88, ram: 45 },
    { epoch: 9, trainLoss: 0.14, valLoss: 0.19, accuracy: 0.93, lr: 0.0001, gpu: 85, ram: 46 },
    { epoch: 10, trainLoss: 0.11, valLoss: 0.16, accuracy: 0.94, lr: 0.00005, gpu: 83, ram: 46 },
  ];

  // Helper mappings for runs parameter calculations
  const getFlops = (runId: string) => {
    if (runId === 'run_1') return '1.24 GFLOPs';
    if (runId === 'run_2') return '1.45 GFLOPs';
    if (runId === 'run_3') return '0.82 GFLOPs';
    return '1.10 GFLOPs';
  };

  const getVram = (runId: string) => {
    if (runId === 'run_1') return '1.2 GB';
    if (runId === 'run_2') return '1.5 GB';
    if (runId === 'run_3') return '0.6 GB';
    return '1.0 GB';
  };

  const getEpochs = (runId: string) => {
    if (runId === 'run_1') return 50;
    if (runId === 'run_2') return 30;
    if (runId === 'run_3') return 20;
    return 15;
  };

  return (
    <MainLayout>
      <div className="p-8 max-w-6xl mx-auto space-y-8 relative pb-24 font-sans select-none">
        
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <LucideLineChart className="text-[#8ab4f8]" size={36} />
              <span>Experiment Intelligence</span>
            </h1>
            <p className="text-[#9aa0a6] mt-2 text-sm font-semibold">
              Cross-compare training metrics, hyperparameter epochs, hardware utilization, and execute AI diagnostics.
            </p>
          </div>

          <div className="flex gap-2.5">
            <button
              onClick={() => router.push('/models/registry')}
              className="flex items-center gap-1.5 px-4.5 py-2.5 bg-[#2b2d31] hover:bg-[#313338] border border-[#3f4046] text-xs font-bold text-white rounded-xl transition-all cursor-pointer"
            >
              <span>Go to Registry</span>
              <ArrowRight size={12} />
            </button>
          </div>
        </div>

        {/* Runs Selection Catalog Bar */}
        <div className="bg-[#2b2d31]/40 border border-[#3f4046]/80 rounded-2xl p-5 space-y-4 shadow-lg">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-white">Select Runs to Compare (Up to 3)</h3>
            {selectedCompareRunIds.length > 0 && (
              <button 
                onClick={clearSelection}
                className="text-[10px] font-bold text-[#f28b82] hover:text-rose-300 transition-all cursor-pointer bg-transparent border-none"
              >
                Clear Selection
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {allRuns.map(run => {
              const isSelected = selectedCompareRunIds.includes(run.id);
              return (
                <div 
                  key={run.id}
                  onClick={() => toggleRunSelection(run.id)}
                  className={`border rounded-xl p-3.5 cursor-pointer transition-all flex flex-col justify-between h-28 ${
                    isSelected 
                      ? 'bg-[#8ab4f8]/10 border-[#8ab4f8] shadow-md' 
                      : 'bg-[#1e1f22]/50 border-[#3f4046]/80 hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-[10px] text-gray-500 font-mono font-bold uppercase">{run.framework} • {run.id}</span>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      isSelected ? 'bg-[#8ab4f8] border-[#8ab4f8] text-[#1e1f22]' : 'border-gray-600'
                    }`}>
                      {isSelected && <Check size={10} strokeWidth={4} />}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-xs font-extrabold text-white truncate w-full" title={run.name}>{run.name}</h4>
                    <div className="flex items-center justify-between text-[10px] text-gray-400 mt-2 font-mono font-bold">
                      <span>Acc: {(run.accuracy * 100).toFixed(1)}%</span>
                      <span>Loss: {run.loss.toFixed(3)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Grid: Comparison Table and AI Diagnostics */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left: Comparison Table & Recharts */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Run Comparison Table Card */}
            <div className="bg-[#2b2d31]/50 border border-[#3f4046] rounded-2xl shadow-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[#3f4046]/80 bg-[#1e1f22]/50 flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-white">Metrics Comparison Grid</h3>
                <span className="text-[10px] text-gray-500 font-extrabold">{selectedRuns.length} selected runs</span>
              </div>
              
              <div className="overflow-x-auto">
                {selectedRuns.length === 0 ? (
                  <div className="p-12 text-center text-gray-500 text-xs font-semibold">
                    <Gauge size={28} className="mx-auto mb-2.5 text-gray-600" />
                    No runs selected. Choose runs in the catalog bar above to initiate comparison.
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#3f4046]/40 text-gray-400 font-extrabold uppercase tracking-wider text-[9px] bg-[#1e1f22]/20">
                        <th className="py-3 px-5">Metric Label</th>
                        {selectedRuns.map(run => (
                          <th key={run.id} className="py-3 px-4 text-center font-mono text-[#8ab4f8]">{run.name}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#3f4046]/30 font-semibold">
                      {/* Accuracy row */}
                      <tr className="hover:bg-[#2b2d31]/30">
                        <td className="py-3.5 px-5 text-white">Peak Test Accuracy</td>
                        {selectedRuns.map(run => (
                          <td key={run.id} className="py-3.5 px-4 text-center text-white font-mono font-extrabold">{(run.accuracy * 100).toFixed(2)}%</td>
                        ))}
                      </tr>

                      {/* Loss row */}
                      <tr className="hover:bg-[#2b2d31]/30">
                        <td className="py-3.5 px-5 text-white">Final Loss Value</td>
                        {selectedRuns.map(run => (
                          <td key={run.id} className="py-3.5 px-4 text-center text-white font-mono">{run.loss.toFixed(4)}</td>
                        ))}
                      </tr>

                      {/* FLOPs row */}
                      <tr className="hover:bg-[#2b2d31]/30">
                        <td className="py-3.5 px-5 text-white">Estimated FLOPs</td>
                        {selectedRuns.map(run => (
                          <td key={run.id} className="py-3.5 px-4 text-center text-gray-400 font-mono">{getFlops(run.id)}</td>
                        ))}
                      </tr>

                      {/* VRAM row */}
                      <tr className="hover:bg-[#2b2d31]/30">
                        <td className="py-3.5 px-5 text-white">VRAM footprint</td>
                        {selectedRuns.map(run => (
                          <td key={run.id} className="py-3.5 px-4 text-center text-gray-400 font-mono">{getVram(run.id)}</td>
                        ))}
                      </tr>

                      {/* Epochs row */}
                      <tr className="hover:bg-[#2b2d31]/30">
                        <td className="py-3.5 px-5 text-white">Training Epochs</td>
                        {selectedRuns.map(run => (
                          <td key={run.id} className="py-3.5 px-4 text-center text-gray-300 font-mono">{getEpochs(run.id)}</td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Recharts Analytics curve graphs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Chart 1: Loss curves */}
              <div className="bg-[#2b2d31]/50 border border-[#3f4046] rounded-2xl p-5 shadow-xl">
                <h3 className="text-xs font-bold text-white mb-4">Train vs. Validation Loss</h3>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartHistoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#3f4046" opacity={0.2} />
                      <XAxis dataKey="epoch" stroke="#9aa0a6" tick={{ fontSize: 9 }} />
                      <YAxis stroke="#9aa0a6" tick={{ fontSize: 9 }} />
                      <Tooltip />
                      <Legend verticalAlign="top" height={24} iconSize={10} wrapperStyle={{ fontSize: 10 }} />
                      <Line type="monotone" dataKey="trainLoss" name="Train Loss" stroke="#8ab4f8" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="valLoss" name="Val Loss" stroke="#f28b82" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 2: Accuracy curve */}
              <div className="bg-[#2b2d31]/50 border border-[#3f4046] rounded-2xl p-5 shadow-xl">
                <h3 className="text-xs font-bold text-white mb-4">Accuracy Optimization curve</h3>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartHistoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#3f4046" opacity={0.2} />
                      <XAxis dataKey="epoch" stroke="#9aa0a6" tick={{ fontSize: 9 }} />
                      <YAxis stroke="#9aa0a6" tick={{ fontSize: 9 }} />
                      <Tooltip />
                      <Area type="monotone" dataKey="accuracy" name="Test Accuracy" stroke="#80cbc4" fill="rgba(128, 203, 196, 0.05)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 3: Learning Rate */}
              <div className="bg-[#2b2d31]/50 border border-[#3f4046] rounded-2xl p-5 shadow-xl">
                <h3 className="text-xs font-bold text-white mb-4">Learning Rate (Decay Schedule)</h3>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartHistoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#3f4046" opacity={0.2} />
                      <XAxis dataKey="epoch" stroke="#9aa0a6" tick={{ fontSize: 9 }} />
                      <YAxis stroke="#9aa0a6" tick={{ fontSize: 9 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="lr" name="Learning Rate" stroke="#ffe082" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 4: Hardware load */}
              <div className="bg-[#2b2d31]/50 border border-[#3f4046] rounded-2xl p-5 shadow-xl">
                <h3 className="text-xs font-bold text-white mb-4">GPU & RAM Utilization Sizing</h3>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartHistoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#3f4046" opacity={0.2} />
                      <XAxis dataKey="epoch" stroke="#9aa0a6" tick={{ fontSize: 9 }} />
                      <YAxis stroke="#9aa0a6" tick={{ fontSize: 9 }} />
                      <Tooltip />
                      <Legend verticalAlign="top" height={24} iconSize={10} wrapperStyle={{ fontSize: 10 }} />
                      <Area type="monotone" dataKey="gpu" name="GPU load (%)" stroke="#c5a3ff" fill="rgba(197, 163, 255, 0.05)" strokeWidth={1.5} />
                      <Area type="monotone" dataKey="ram" name="RAM Sizing (GB)" stroke="#80cbc4" fill="rgba(128, 203, 196, 0.05)" strokeWidth={1.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column - AI Analysis Widget */}
          <div className="lg:col-span-4 space-y-6">
            
            <div className="bg-[#2b2d31]/50 border border-[#3f4046] rounded-2xl p-6 shadow-xl space-y-6 relative overflow-hidden">
              <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 w-20 h-20 bg-[#ffe082]/5 rounded-full blur-2xl"></div>
              
              <div className="flex items-center gap-2 border-b border-[#3f4046]/80 pb-4">
                <Sparkles size={18} className="text-[#ffe082] animate-pulse" />
                <h3 className="text-xs font-black tracking-widest uppercase text-white">AI Diagnostics Engine</h3>
              </div>

              {/* Box 1: Why accuracy dropped */}
              <div className="space-y-2.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#f28b82] flex items-center gap-1.5">
                  <AlertTriangle size={13} />
                  <span>Why accuracy dropped</span>
                </span>
                <p className="text-[10.5px] text-gray-300 font-semibold leading-relaxed">
                  In run <code className="text-[#f28b82] font-mono font-bold">run_4 (Heavy Dropout)</code>, test accuracy decayed to 89.5% because the 0.5 dropout rate is too restrictive for shallow Conv layers. Useful activation features were discarded before reaching dense heads.
                </p>
              </div>

              {/* Box 2: Why training stalled */}
              <div className="space-y-2.5 pt-4 border-t border-[#3f4046]/50">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#ffe082] flex items-center gap-1.5">
                  <RefreshCw className="animate-spin" size={13} />
                  <span>Why training stalled</span>
                </span>
                <p className="text-[10.5px] text-gray-300 font-semibold leading-relaxed">
                  Loss curves between Epochs 6 and 10 flatline. The baseline run is suffering from vanishing gradients during backprop. A small learning rate (1e-3) without schedule decay causes parameter update steps to oscillate near local minima.
                </p>
              </div>

              {/* Box 3: Suggested improvements */}
              <div className="space-y-2.5 pt-4 border-t border-[#3f4046]/50">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#80cbc4] flex items-center gap-1.5">
                  <TrendingUp size={13} />
                  <span>Suggested improvements</span>
                </span>
                <ul className="space-y-2 text-[10px] text-gray-400 font-semibold list-disc pl-4 leading-relaxed">
                  <li>Replace Dropout (0.5) with a lighter rate (0.15) to maintain layer capacity.</li>
                  <li>Enable <code className="text-[#8ab4f8] font-mono">BatchNorm2D</code> blocks after convolutional steps to normalize activations.</li>
                  <li>Configure Cosine Annealing learning rate schedules to dynamically adapt update speeds.</li>
                </ul>
              </div>

            </div>
          </div>

        </div>

      </div>
    </MainLayout>
  );
}
