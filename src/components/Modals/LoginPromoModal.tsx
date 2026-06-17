'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { X, Lock, Cpu, CloudLightning, ShieldCheck, Download, Code, ArrowRight } from 'lucide-react';

interface LoginPromoModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  reason?: string;
}

export default function LoginPromoModal({ 
  isOpen, 
  onClose, 
  title = "Unlock Cloud-Scale AI Design", 
  reason = "This premium feature is restricted in local sandbox mode." 
}: LoginPromoModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const handleRegisterRedirect = () => {
    onClose();
    router.push('/login');
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      {/* Backdrop Close Click */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg bg-[#1a1b20]/95 border border-[#3f4046]/80 shadow-2xl rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col select-none text-[#e3e3e3] z-10">
        
        {/* Top Decorative Pulse Gradient */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#8ab4f8] via-[#c5a3ff] to-[#81c784]" />

        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 p-1.5 hover:bg-[#2b2d31] rounded-lg text-[#9aa0a6] hover:text-white transition-all cursor-pointer border-none bg-transparent"
        >
          <X size={18} />
        </button>

        <div className="p-8 space-y-6">
          {/* Header Title with animated Lock Shield */}
          <div className="flex flex-col items-center text-center space-y-3 pt-2">
            <div className="p-4 bg-gradient-to-tr from-[#8ab4f8]/10 to-[#c5a3ff]/10 border border-[#8ab4f8]/30 text-[#8ab4f8] rounded-2xl shadow-inner animate-pulse">
              <Lock size={28} />
            </div>
            <h3 className="text-xl font-black text-white tracking-tight">{title}</h3>
            <p className="text-xs text-[#9aa0a6] font-semibold max-w-sm leading-relaxed">
              {reason}
            </p>
          </div>

          {/* Premium Value Props Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-2">
            <div className="flex items-start gap-3 p-3.5 bg-[#2b2d31]/30 border border-[#3f4046]/40 rounded-xl hover:border-white/10 transition-colors">
              <CloudLightning size={16} className="text-[#8ab4f8] shrink-0 mt-0.5" />
              <div>
                <h5 className="text-xs font-bold text-white">Full persistence</h5>
                <p className="text-[10px] text-[#9aa0a6] mt-0.5 leading-relaxed font-semibold">Save models and checkpoints securely in the cloud.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 bg-[#2b2d31]/30 border border-[#3f4046]/40 rounded-xl hover:border-white/10 transition-colors">
              <Cpu size={16} className="text-[#ffe082] shrink-0 mt-0.5" />
              <div>
                <h5 className="text-xs font-bold text-white">Vertex AI GPU training</h5>
                <p className="text-[10px] text-[#9aa0a6] mt-0.5 leading-relaxed font-semibold">Deploy real epoch pipelines on high-spec cloud nodes.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 bg-[#2b2d31]/30 border border-[#3f4046]/40 rounded-xl hover:border-white/10 transition-colors">
              <Code size={16} className="text-[#81c784] shrink-0 mt-0.5" />
              <div>
                <h5 className="text-xs font-bold text-white">Script downloading</h5>
                <p className="text-[10px] text-[#9aa0a6] mt-0.5 leading-relaxed font-semibold">Instantly download compiled PyTorch/TensorRT/ONNX assets.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 bg-[#2b2d31]/30 border border-[#3f4046]/40 rounded-xl hover:border-white/10 transition-colors">
              <ShieldCheck size={16} className="text-[#c5a3ff] shrink-0 mt-0.5" />
              <div>
                <h5 className="text-xs font-bold text-white">Cloud Collaboration</h5>
                <p className="text-[10px] text-[#9aa0a6] mt-0.5 leading-relaxed font-semibold">Synchronize canvas, code, and cursors with teammates live.</p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[#3f4046]/40">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 border border-[#3f4046] hover:bg-[#2b2d31]/50 text-xs font-bold text-[#9aa0a6] hover:text-white rounded-xl transition-all cursor-pointer bg-transparent"
            >
              Keep exploring local
            </button>
            <button
              onClick={handleRegisterRedirect}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-white hover:bg-gray-100 text-[#0a0b10] text-xs font-black rounded-xl transition-all active:scale-95 shadow-md shadow-white/5 cursor-pointer border-none"
            >
              <span>Get Free Cloud Account</span>
              <ArrowRight size={14} className="text-[#0a0b10]" />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
