'use client';

import React from 'react';
import { useLayoutStore } from '@/store/layoutStore';
import { AlertTriangle, Trash2 } from 'lucide-react';

export default function ConfirmModal() {
  const confirmDialog = useLayoutStore((state) => state.confirmDialog);
  const closeConfirm = useLayoutStore((state) => state.closeConfirm);

  if (!confirmDialog || !confirmDialog.isOpen) return null;

  const { title, message, confirmLabel, cancelLabel, isDestructive } = confirmDialog;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[110] flex items-center justify-center p-4">
      {/* Backdrop click (acts as cancel) */}
      <div className="fixed inset-0" onClick={() => closeConfirm(false)} />

      {/* Modal Card */}
      <div className="relative w-full max-w-md bg-[#1a1b20]/95 border border-[#3f4046]/80 shadow-2xl rounded-2xl p-6 animate-in fade-in zoom-in-95 duration-200 flex flex-col select-none text-[#e3e3e3] z-10 gap-4">
        
        {/* Header Icon & Title */}
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl border ${
            isDestructive 
              ? 'bg-red-500/10 border-red-500/20 text-red-400' 
              : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
          }`}>
            {isDestructive ? <Trash2 size={20} /> : <AlertTriangle size={20} />}
          </div>
          <div>
            <h4 className="text-sm font-black text-white">{title}</h4>
            <p className="text-[10px] text-[#9aa0a6] font-semibold mt-0.5">Confirmation Required</p>
          </div>
        </div>

        {/* Message */}
        <p className="text-xs text-gray-300 leading-relaxed font-medium">
          {message}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-2.5 mt-2">
          <button
            type="button"
            onClick={() => closeConfirm(false)}
            className="flex-1 py-2.5 bg-[#2b2d31] hover:bg-[#313338] border border-[#3f4046] text-gray-300 text-xs font-bold rounded-xl transition-all cursor-pointer bg-transparent"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => closeConfirm(true)}
            className={`flex-1 py-2.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer border-none shadow-lg ${
              isDestructive 
                ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/10' 
                : 'bg-[#8ab4f8] hover:bg-[#a8c7fa] text-[#1e1f22] shadow-[#8ab4f8]/10'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
