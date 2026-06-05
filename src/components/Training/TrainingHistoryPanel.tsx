'use client';

import React from 'react';
import { History, Award, CheckCircle2 } from 'lucide-react';
import { TrainingRun } from '@/store/trainingStore';

interface TrainingHistoryPanelProps {
  history: TrainingRun[];
}

export default function TrainingHistoryPanel({ history }: TrainingHistoryPanelProps) {
  return (
    <div className="bg-[#1e1f22]/50 border border-[#3f4046] rounded-2xl p-5 space-y-4 shadow-md select-none w-full md:w-80 flex flex-col shrink-0">
      <div className="flex items-center gap-2 border-b border-[#3f4046]/35 pb-3">
        <div className="p-1.5 bg-[#ffe082]/15 border border-[#ffe082]/20 rounded-lg text-[#ffe082]">
          <History size={14} />
        </div>
        <div>
          <h4 className="text-xs font-black text-white uppercase tracking-wider">Experiment History</h4>
          <span className="text-[10px] text-gray-500 font-semibold block mt-0.5">Recorded metrics baseline snapshots</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[220px] custom-scrollbar pr-1">
        {history.length === 0 ? (
          <div className="text-center text-gray-500 py-10 text-xs font-semibold">
            No historical runs recorded.
          </div>
        ) : (
          history.map((run) => (
            <div
              key={run.id}
              className="flex items-center justify-between p-3 bg-[#101113]/70 border border-[#2b2d31] rounded-xl hover:border-white/10 transition-all"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 size={12} className="text-[#81c784]" />
                <span className="text-xs font-bold text-gray-300">{run.name}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10.5px] font-mono font-black text-[#81c784] bg-[#81c784]/15 border border-[#81c784]/25 px-2 py-0.5 rounded-md">
                  Accuracy: {Math.round(run.accuracy * 100)}%
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
