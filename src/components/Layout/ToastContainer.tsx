'use client';

import React, { useEffect, useRef } from 'react';
import { useNotificationStore, Toast } from '@/store/notificationStore';
import { CheckCircle, AlertOctagon, AlertTriangle, Info, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export default function ToastContainer() {
  const toasts = useNotificationStore((state) => state.toasts);
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none select-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastCard({ toast }: { toast: Toast }) {
  const removeToast = useNotificationStore((state) => state.removeToast);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const remainingTimeRef = useRef<number>(toast.duration || 4000);
  const startTimeRef = useRef<number>(Date.now());

  const startTimer = () => {
    startTimeRef.current = Date.now();
    hoverTimerRef.current = setTimeout(() => {
      removeToast(toast.id);
    }, remainingTimeRef.current);
  };

  const pauseTimer = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      const elapsed = Date.now() - startTimeRef.current;
      remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed);
    }
  };

  useEffect(() => {
    startTimer();
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, [toast.id]);

  const configMap = {
    success: {
      border: 'border-green-500/20 bg-green-500/5',
      glow: 'shadow-[0_0_15px_-3px_rgba(129,199,132,0.15)]',
      icon: <CheckCircle size={18} className="text-[#81c784]" />,
      accent: 'bg-[#81c784]',
    },
    error: {
      border: 'border-rose-500/20 bg-rose-500/5',
      glow: 'shadow-[0_0_15px_-3px_rgba(242,139,130,0.15)]',
      icon: <AlertOctagon size={18} className="text-[#f28b82]" />,
      accent: 'bg-[#f28b82]',
    },
    warning: {
      border: 'border-amber-500/20 bg-amber-500/5',
      glow: 'shadow-[0_0_15px_-3px_rgba(255,224,130,0.15)]',
      icon: <AlertTriangle size={18} className="text-[#ffe082]" />,
      accent: 'bg-[#ffe082]',
    },
    info: {
      border: 'border-blue-500/20 bg-blue-500/5',
      glow: 'shadow-[0_0_15px_-3px_rgba(138,180,248,0.15)]',
      icon: <Info size={18} className="text-[#8ab4f8]" />,
      accent: 'bg-[#8ab4f8]',
    },
  };

  const cfg = configMap[toast.type];

  return (
    <motion.div
      initial={{ opacity: 0, x: 50, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 50, scale: 0.95, transition: { duration: 0.2 } }}
      onMouseEnter={pauseTimer}
      onMouseLeave={startTimer}
      className={`pointer-events-auto flex items-start gap-3.5 p-4 rounded-2xl border backdrop-blur-md relative overflow-hidden select-text group transition-all duration-200 ${cfg.border} ${cfg.glow}`}
    >
      {/* Accent strip */}
      <div className={`absolute top-0 left-0 bottom-0 w-1 ${cfg.accent} opacity-80`}></div>

      {/* Icon */}
      <div className="mt-0.5 shrink-0 select-none">
        {cfg.icon}
      </div>

      {/* Contents */}
      <div className="flex-1 space-y-1">
        <h4 className="text-xs font-black text-white leading-normal tracking-wide uppercase">
          {toast.message}
        </h4>
        {toast.description && (
          <p className="text-[10.5px] text-[#9aa0a6] font-semibold leading-relaxed">
            {toast.description}
          </p>
        )}
      </div>

      {/* Close button */}
      <button
        onClick={() => removeToast(toast.id)}
        className="text-[#9aa0a6] hover:text-white shrink-0 p-0.5 hover:bg-white/5 rounded-lg transition-colors cursor-pointer select-none"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
}
