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
  HelpCircle,
  Clock,
  ArrowRight,
  TrendingUp
} from 'lucide-react';

export default function CostIntelligencePage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  // Selector states
  const [targetGpu, setTargetGpu] = useState('NVIDIA RTX 4090');
  const [expectedGpuHours, setExpectedGpuHours] = useState(120);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px] text-gray-500">
          <span className="text-xs font-semibold">Loading Cost Intelligence...</span>
        </div>
      </MainLayout>
    );
  }

  // --- COST CALCULATIONS ---
  // Simple hardware hour rates
  const rateMap: Record<string, number> = {
    'NVIDIA RTX 4090': 0.85,
    'NVIDIA A100 GPU': 2.20,
    'NVIDIA H100 GPU': 4.76,
    'Standard CPU Node': 0.12
  };

  const currentRate = rateMap[targetGpu] || 0.85;
  const computedTrainingCost = expectedGpuHours * currentRate;
  const computedInferenceCost = computedTrainingCost * 0.15; // mock projection
  const computedStorageCost = 14.50; // flat rate

  // Mock cost history projection data
  const costProjectionData = [
    { month: 'Jan', baseline: 120, optimized: 120 },
    { month: 'Feb', baseline: 180, optimized: 140 },
    { month: 'Mar', baseline: 260, optimized: 180 },
    { month: 'Apr', baseline: 340, optimized: 210 },
    { month: 'May', baseline: 490, optimized: 260 },
    { month: 'Jun', baseline: 620, optimized: 310 },
  ];

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Training cost */}
          <div className="bg-[#2b2d31]/40 border border-[#3f4046] p-5 rounded-2xl shadow-xl flex items-center justify-between relative overflow-hidden">
            <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 w-16 h-16 bg-[#8ab4f8]/5 rounded-full blur-xl"></div>
            <div>
              <span className="text-[10px] uppercase font-black text-gray-500">Projected Training Cost</span>
              <h3 className="text-3xl font-extrabold text-white mt-1.5 font-mono">${computedTrainingCost.toFixed(2)}</h3>
              <span className="text-[9px] text-gray-500 font-semibold block mt-1">Based on {targetGpu} rates</span>
            </div>
            <div className="p-3 bg-[#8ab4f8]/10 rounded-xl text-[#8ab4f8]">
              <Cpu size={20} />
            </div>
          </div>

          {/* Card 2: Inference cost */}
          <div className="bg-[#2b2d31]/40 border border-[#3f4046] p-5 rounded-2xl shadow-xl flex items-center justify-between relative overflow-hidden">
            <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 w-16 h-16 bg-[#80cbc4]/5 rounded-full blur-xl"></div>
            <div>
              <span className="text-[10px] uppercase font-black text-gray-500">Projected Inference Cost</span>
              <h3 className="text-3xl font-extrabold text-white mt-1.5 font-mono">${computedInferenceCost.toFixed(2)}</h3>
              <span className="text-[9px] text-[#80cbc4] font-semibold block mt-1">Estimated monthly serve load</span>
            </div>
            <div className="p-3 bg-[#80cbc4]/10 rounded-xl text-[#80cbc4]">
              <Activity size={20} />
            </div>
          </div>

          {/* Card 3: Storage cost */}
          <div className="bg-[#2b2d31]/40 border border-[#3f4046] p-5 rounded-2xl shadow-xl flex items-center justify-between relative overflow-hidden">
            <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 w-16 h-16 bg-[#ffe082]/5 rounded-full blur-xl"></div>
            <div>
              <span className="text-[10px] uppercase font-black text-gray-500">Data Storage Cost</span>
              <h3 className="text-3xl font-extrabold text-[#ffe082] mt-1.5 font-mono">${computedStorageCost.toFixed(2)}</h3>
              <span className="text-[9px] text-[#ffe082] font-semibold block mt-1">Fixed datasets and weight logs</span>
            </div>
            <div className="p-3 bg-[#ffe082]/10 rounded-xl text-[#ffe082]">
              <Database size={20} />
            </div>
          </div>
        </div>

        {/* Dashboard split content area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Projections AreaChart and Resource Breakdown */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Cost Projections AreaChart */}
            <div className="bg-[#2b2d31]/50 border border-[#3f4046] rounded-2xl p-6 shadow-xl space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-white">6-Month Cost Projections</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={costProjectionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3f4046" opacity={0.2} />
                    <XAxis dataKey="month" stroke="#9aa0a6" tick={{ fontSize: 9 }} />
                    <YAxis stroke="#9aa0a6" tick={{ fontSize: 9 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="baseline" name="Baseline Budget ($)" stroke="#f28b82" fill="rgba(242, 139, 130, 0.05)" strokeWidth={2} />
                    <Area type="monotone" dataKey="optimized" name="AI Optimized Budget ($)" stroke="#80cbc4" fill="rgba(128, 203, 196, 0.05)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Resource Breakdown Card */}
            <div className="bg-[#2b2d31]/50 border border-[#3f4046] rounded-2xl p-6 shadow-xl space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-white">Computational Resource Breakdown</h3>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs">
                <div className="bg-[#1e1f22]/50 border border-[#3f4046] p-4 rounded-xl">
                  <span className="text-[9px] uppercase font-bold text-gray-500 font-sans block">Parameters</span>
                  <span className="text-sm font-black text-white mt-1 block">85.4M weight vectors</span>
                </div>
                <div className="bg-[#1e1f22]/50 border border-[#3f4046] p-4 rounded-xl">
                  <span className="text-[9px] uppercase font-bold text-gray-500 font-sans block">FLOP complexity</span>
                  <span className="text-sm font-black text-white mt-1 block">4.2 GFLOPs</span>
                </div>
                <div className="bg-[#1e1f22]/50 border border-[#3f4046] p-4 rounded-xl">
                  <span className="text-[9px] uppercase font-bold text-gray-500 font-sans block">VRAM Size</span>
                  <span className="text-sm font-black text-white mt-1 block">2.3 GB</span>
                </div>
                <div className="bg-[#1e1f22]/50 border border-[#3f4046] p-4 rounded-xl">
                  <span className="text-[9px] uppercase font-bold text-gray-500 font-sans block">GPU Hours</span>
                  <span className="text-sm font-black text-white mt-1 block">{expectedGpuHours} total hours</span>
                </div>
              </div>
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

              {/* Box 1: Reduce Parameters */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#ffe082] flex items-center gap-1.5">
                  <TrendingDown size={13} />
                  <span>Reduce Parameters (-25% cost)</span>
                </span>
                <p className="text-[10.5px] text-gray-300 font-semibold leading-relaxed">
                  Your classification head maps high flatten dimensions into Dense units. Replace with <code className="text-[#8ab4f8] font-mono">GlobalAveragePooling2D</code> to shave 42M redundant weight parameters.
                </p>
              </div>

              {/* Box 2: Reduce FLOPs */}
              <div className="space-y-2 pt-4 border-t border-[#3f4046]/50">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#8ab4f8] flex items-center gap-1.5">
                  <Clock size={13} />
                  <span>Reduce FLOP complexity (-15% cost)</span>
                </span>
                <p className="text-[10.5px] text-gray-300 font-semibold leading-relaxed">
                  Enable FP16 Mixed Precision training logs. Running with half-precision fusions cuts execution durations on RTX GPUs, reducing total hours billing.
                </p>
              </div>

              {/* Box 3: Switch Hardware */}
              <div className="space-y-2 pt-4 border-t border-[#3f4046]/50">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#80cbc4] flex items-center gap-1.5">
                  <Cpu size={13} />
                  <span>Switch Hardware (-40% cost)</span>
                </span>
                <p className="text-[10.5px] text-gray-300 font-semibold leading-relaxed">
                  The model size is under 3GB VRAM. We recommend switching target run instance types from dedicated Cloud A100 nodes to Spot <code className="text-[#80cbc4] font-mono">NVIDIA RTX 4090</code> clusters.
                </p>
              </div>

            </div>
          </div>

        </div>

      </div>
    </MainLayout>
  );
}
