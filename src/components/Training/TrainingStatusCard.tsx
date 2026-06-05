'use client';

import React from 'react';
import { Loader2, CheckCircle2, AlertCircle, Play } from 'lucide-react';

interface TrainingStatusCardProps {
  status: 'IDLE' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  epoch: number;
  totalEpochs: number;
}

export default function TrainingStatusCard({ status, epoch, totalEpochs }: TrainingStatusCardProps) {
  const percent = totalEpochs > 0 ? Math.min(100, Math.round((epoch / totalEpochs) * 100)) : 0;

  const getStatusBadge = () => {
    switch (status) {
      case 'RUNNING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#81c784]/30 bg-[#81c784]/10 text-[#81c784] text-xs font-mono font-extrabold shadow-sm animate-pulse">
            <Loader2 size={12} className="animate-spin text-[#81c784]" />
            <span>Running</span>
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#81c784]/30 bg-[#81c784]/15 text-[#81c784] text-xs font-mono font-extrabold shadow-sm">
            <CheckCircle2 size={12} className="text-[#81c784]" />
            <span>Completed</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-rose-500/30 bg-rose-500/15 text-rose-300 text-xs font-mono font-extrabold shadow-sm">
            <AlertCircle size={12} className="text-rose-400" />
            <span>Crashed</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-gray-500/30 bg-gray-500/15 text-gray-400 text-xs font-mono font-extrabold shadow-sm">
            <Play size={12} className="text-gray-400" />
            <span>Standby (Idle)</span>
          </span>
        );
    }
  };

  return (
    <div className="bg-[#1e1f22]/50 border border-[#3f4046] rounded-2xl p-6 space-y-4 shadow-lg relative overflow-hidden select-none">
      <div className="absolute inset-0 dot-grid opacity-15 pointer-events-none"></div>

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[10px] font-extrabold uppercase text-[#9aa0a6] tracking-widest block font-sans">
            Job Telemetry Monitor
          </span>
          <h2 className="text-xl font-black text-white flex items-center gap-2 font-sans">
            <span>Model In-Training Execution Loop</span>
          </h2>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          {getStatusBadge()}
        </div>
      </div>

      {/* Progress Info */}
      <div className="relative z-10 space-y-2.5">
        <div className="flex justify-between items-center text-xs font-bold font-mono">
          <span className="text-gray-400 uppercase tracking-wider">Epoch Progress Cycle</span>
          <span className="text-white bg-[#2b2d31] border border-[#3f4046] px-2 py-0.5 rounded-md text-[11px]">
            Epoch {epoch} / {totalEpochs}
          </span>
        </div>

        {/* Progress bar track */}
        <div className="w-full h-3 bg-[#141517] rounded-full overflow-hidden border border-[#3f4046]/45 p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              status === 'RUNNING'
                ? 'bg-gradient-to-r from-[#8ab4f8] via-[#c5a3ff] to-[#81c784] animate-shimmer'
                : status === 'COMPLETED'
                ? 'bg-[#81c784]'
                : status === 'FAILED'
                ? 'bg-rose-500'
                : 'bg-[#3f4046]'
            }`}
            style={{ width: `${percent}%` }}
          ></div>
        </div>

        <div className="flex justify-between text-[9px] font-extrabold text-gray-500 tracking-wider uppercase">
          <span>0% INITIALIZED</span>
          <span className="font-mono">{percent}% COMPLETE</span>
          <span>100% EXHAUSTED</span>
        </div>
      </div>
    </div>
  );
}
