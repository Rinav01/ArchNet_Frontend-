'use client';

import React, { useRef, useEffect } from 'react';
import { useCanvasStore } from '@/store/canvasStore';
import { Terminal, Trash2 } from 'lucide-react';

export default function ValidationPanel() {
  const { logs, clearLogs } = useCanvasStore();
  const consoleBottomRef = useRef<HTMLDivElement>(null);

  // Auto scroll bottom when new logs arrive
  useEffect(() => {
    if (consoleBottomRef.current) {
      consoleBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  return (
    <div className="h-44 glass-panel border-t border-white/5 bg-[#090a0f] flex flex-col z-20 relative select-none w-full">
      {/* Console Header */}
      <div className="flex items-center justify-between px-6 py-2.5 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-gray-400" />
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Console Monitor</span>
          <div className="flex items-center gap-1.5 ml-3">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">Live</span>
          </div>
        </div>

        <button
          onClick={clearLogs}
          className="p-1 hover:bg-white/5 text-gray-500 hover:text-white rounded transition-all"
          title="Clear Console"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Terminal log items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1.5 font-mono text-[11px] leading-relaxed">
        {logs.map((log) => {
          const typeColor = 
            log.type === 'success' ? 'text-emerald-400 font-bold' :
            log.type === 'warning' ? 'text-amber-400 font-bold' :
            log.type === 'error' ? 'text-rose-500 font-extrabold glow-rose' :
            'text-purple-400 font-semibold';

          return (
            <div key={log.id} className="flex gap-3 items-start select-text hover:bg-white/5 px-2 py-0.5 rounded transition-all">
              <span className="text-gray-600">[{log.timestamp}]</span>
              <span className={`uppercase tracking-wide ${typeColor}`}>{log.type}:</span>
              <span className="text-gray-300 font-medium">{log.text}</span>
            </div>
          );
        })}
        {/* Scroll Anchor */}
        <div ref={consoleBottomRef}></div>
      </div>
    </div>
  );
}
