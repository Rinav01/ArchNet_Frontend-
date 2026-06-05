'use client';

import React from 'react';
import { Award, Zap, ShieldAlert, Cpu } from 'lucide-react';
import { MetricPoint } from '@/store/trainingStore';

interface MetricsSummaryProps {
  status: 'IDLE' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  metrics: MetricPoint[];
}

export default function MetricsSummary({ status, metrics }: MetricsSummaryProps) {
  const latestPoint = metrics.length > 0 ? metrics[metrics.length - 1] : null;

  // Retrieve val_accuracy or accuracy
  const currentAccuracy = latestPoint ? `${(latestPoint.val_accuracy * 100).toFixed(1)}%` : 'N/A';
  const currentLoss = latestPoint ? latestPoint.loss.toFixed(4) : 'N/A';
  const valLoss = latestPoint ? latestPoint.val_loss.toFixed(4) : 'N/A';

  return (
    <div className="bg-[#1e1f22]/50 border border-[#3f4046] rounded-2xl p-6 space-y-4 shadow-md select-none font-sans flex-1">
      <div className="border-b border-[#3f4046]/35 pb-3">
        <h4 className="text-xs font-black text-white uppercase tracking-wider">Metrics Summary</h4>
        <span className="text-[10px] text-gray-500 font-semibold block mt-0.5">Statistical outputs recorded from parameters execution</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Metric 1: Final/Current Accuracy */}
        <div className="bg-[#101113]/55 border border-[#2b2d31] p-4 rounded-xl flex flex-col justify-between h-[110px] relative overflow-hidden">
          <span className="text-[9px] font-extrabold text-[#9aa0a6] uppercase tracking-wider block">Final Accuracy</span>
          <div>
            <span className="text-2xl font-black text-[#81c784] block font-mono">
              {currentAccuracy}
            </span>
            <span className="text-[9px] text-gray-500 font-semibold uppercase mt-1 block">
              Validation Accuracy
            </span>
          </div>
          <Award size={16} className="absolute right-3.5 bottom-3.5 text-[#81c784]/20" />
        </div>

        {/* Metric 2: Final Loss */}
        <div className="bg-[#101113]/55 border border-[#2b2d31] p-4 rounded-xl flex flex-col justify-between h-[110px] relative overflow-hidden">
          <span className="text-[9px] font-extrabold text-[#9aa0a6] uppercase tracking-wider block">Training Loss</span>
          <div>
            <span className="text-2xl font-black text-[#8ab4f8] block font-mono">
              {currentLoss}
            </span>
            <span className="text-[9px] text-gray-500 font-semibold uppercase mt-1 block">
              Objective Value
            </span>
          </div>
          <Zap size={16} className="absolute right-3.5 bottom-3.5 text-[#8ab4f8]/20" />
        </div>

        {/* Metric 3: Validation Loss */}
        <div className="bg-[#101113]/55 border border-[#2b2d31] p-4 rounded-xl flex flex-col justify-between h-[110px] relative overflow-hidden">
          <span className="text-[9px] font-extrabold text-[#9aa0a6] uppercase tracking-wider block">Validation Loss</span>
          <div>
            <span className="text-2xl font-black text-[#c5a3ff] block font-mono">
              {valLoss}
            </span>
            <span className="text-[9px] text-gray-500 font-semibold uppercase mt-1 block">
              Generalization Error
            </span>
          </div>
          <ShieldAlert size={16} className="absolute right-3.5 bottom-3.5 text-[#c5a3ff]/20" />
        </div>

        {/* Metric 4: Hardware Profiler */}
        <div className="bg-[#101113]/55 border border-[#2b2d31] p-4 rounded-xl flex flex-col justify-between h-[110px] relative overflow-hidden">
          <span className="text-[9px] font-extrabold text-[#9aa0a6] uppercase tracking-wider block">Device Throughput</span>
          <div>
            <span className="text-sm font-black text-white block font-mono mt-2">
              {status === 'RUNNING' ? '245 ms/step' : '0.0 ms (Idle)'}
            </span>
            <span className="text-[9px] text-gray-500 font-semibold uppercase mt-1 block">
              RTX 4090 Cluster
            </span>
          </div>
          <Cpu size={16} className="absolute right-3.5 bottom-3.5 text-white/10" />
        </div>
      </div>
    </div>
  );
}
