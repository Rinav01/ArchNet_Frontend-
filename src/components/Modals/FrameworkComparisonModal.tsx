'use client';

import React, { useRef, useState } from 'react';
import { X, Copy, Check, FileCode, Columns } from 'lucide-react';
import { CanvasNode, CanvasEdge, Project } from '@/types/canvas';
import { compileToPyTorch } from '@/lib/canvas/pytorchCompiler';
import { compileToTensorFlow } from '@/lib/canvas/tensorflowCompiler';
import { compileToJAX } from '@/lib/canvas/jaxCompiler';

interface FrameworkComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  project: Project | undefined;
}

type Framework = 'PyTorch' | 'TensorFlow' | 'JAX';

export default function FrameworkComparisonModal({ isOpen, onClose, nodes, edges, project }: FrameworkComparisonModalProps) {
  const [copiedStates, setCopiedStates] = useState<Record<Framework, boolean>>({
    PyTorch: false,
    TensorFlow: false,
    JAX: false
  });

  // Refs for scroll synchronization
  const refPyTorch = useRef<HTMLDivElement>(null);
  const refTensorFlow = useRef<HTMLDivElement>(null);
  const refJAX = useRef<HTMLDivElement>(null);

  const [activeScrollIdx, setActiveScrollIdx] = useState<number | null>(null);

  if (!isOpen) return null;

  const codePyTorch = compileToPyTorch(nodes, edges);
  const codeTensorFlow = compileToTensorFlow(nodes, edges);
  const codeJAX = compileToJAX(nodes, edges);

  const getCode = (fw: Framework) => {
    if (fw === 'PyTorch') return codePyTorch;
    if (fw === 'TensorFlow') return codeTensorFlow;
    return codeJAX;
  };

  const handleCopy = async (fw: Framework) => {
    try {
      await navigator.clipboard.writeText(getCode(fw));
      setCopiedStates(prev => ({ ...prev, [fw]: true }));
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [fw]: false }));
      }, 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  // Sync scroll positions
  const refs = [refPyTorch, refTensorFlow, refJAX];
  
  const handleScroll = (scrolledIdx: number) => {
    if (activeScrollIdx !== scrolledIdx) return;
    const sourceEl = refs[scrolledIdx].current;
    if (!sourceEl) return;
    
    const scrollTop = sourceEl.scrollTop;
    refs.forEach((ref, idx) => {
      if (idx !== scrolledIdx && ref.current) {
        ref.current.scrollTop = scrollTop;
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[60] flex items-center justify-center p-0 md:p-6 select-none">
      <div className="w-full h-full max-w-7xl md:h-[92vh] glass-panel border border-white/10 flex flex-col shadow-2xl relative overflow-hidden bg-[#16171a] md:rounded-2xl transition-all duration-300">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-8 py-4 border-b border-white/5 bg-[#1e1f22]/60 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#8ab4f8]/10 border border-[#8ab4f8]/20 rounded-xl text-[#8ab4f8]">
              <Columns size={20} className="animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <span>Cross-Framework Architectural Compare</span>
                <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded text-emerald-400 font-extrabold uppercase">
                  Synchronized
                </span>
              </h3>
              <p className="text-[10px] text-[#9aa0a6] font-semibold mt-0.5">Simultaneous compilation of visual topology graphs into mainstream python packages.</p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-2 hover:bg-[#2b2d31] rounded-lg text-[#9aa0a6] hover:text-white transition-all cursor-pointer border border-transparent hover:border-[#3f4046]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Main Grid Columns */}
        <div className="flex-1 flex min-h-0 divide-x divide-white/5 bg-[#0c0d10]">
          
          {/* 1. PyTorch Column */}
          <div className="flex-1 flex flex-col min-h-0 bg-[#07080b]">
            <div className="flex items-center justify-between px-6 py-3 border-b border-[#ff6633]/15 bg-gradient-to-r from-transparent to-[#ff6633]/5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-2.5 py-0.5 rounded-full border font-black uppercase tracking-wider text-[#ff6633] border-[#ff6633]/25 bg-[#ff6633]/5">
                  🔥 PyTorch
                </span>
              </div>
              <button
                onClick={() => handleCopy('PyTorch')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2b2d31]/50 hover:bg-[#ff6633]/10 border border-[#3f4046] hover:border-[#ff6633]/30 text-[9px] font-black uppercase text-[#e3e3e3] hover:text-[#ff6633] rounded-lg transition-all cursor-pointer"
              >
                {copiedStates.PyTorch ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                <span>{copiedStates.PyTorch ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div 
              ref={refPyTorch}
              onMouseEnter={() => setActiveScrollIdx(0)}
              onScroll={() => handleScroll(0)}
              className="flex-1 overflow-auto p-6 font-mono text-[10.5px] leading-relaxed text-[#c5cbd3] selection:bg-[#ff6633]/20 custom-scrollbar bg-[#060709]"
            >
              <pre className="whitespace-pre">{codePyTorch}</pre>
            </div>
          </div>

          {/* 2. TensorFlow Column */}
          <div className="flex-1 flex flex-col min-h-0 bg-[#08090d]">
            <div className="flex items-center justify-between px-6 py-3 border-b border-[#ff9000]/15 bg-gradient-to-r from-transparent to-[#ff9000]/5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-2.5 py-0.5 rounded-full border font-black uppercase tracking-wider text-[#ff9000] border-[#ff9000]/25 bg-[#ff9000]/5">
                  🍊 TensorFlow (Keras)
                </span>
              </div>
              <button
                onClick={() => handleCopy('TensorFlow')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2b2d31]/50 hover:bg-[#ff9000]/10 border border-[#3f4046] hover:border-[#ff9000]/30 text-[9px] font-black uppercase text-[#e3e3e3] hover:text-[#ff9000] rounded-lg transition-all cursor-pointer"
              >
                {copiedStates.TensorFlow ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                <span>{copiedStates.TensorFlow ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div 
              ref={refTensorFlow}
              onMouseEnter={() => setActiveScrollIdx(1)}
              onScroll={() => handleScroll(1)}
              className="flex-1 overflow-auto p-6 font-mono text-[10.5px] leading-relaxed text-[#c5cbd3] selection:bg-[#ff9000]/20 custom-scrollbar bg-[#07080b]"
            >
              <pre className="whitespace-pre">{codeTensorFlow}</pre>
            </div>
          </div>

          {/* 3. JAX Column */}
          <div className="flex-1 flex flex-col min-h-0 bg-[#090a0f]">
            <div className="flex items-center justify-between px-6 py-3 border-b border-[#8ab4f8]/15 bg-gradient-to-r from-transparent to-[#8ab4f8]/5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-2.5 py-0.5 rounded-full border font-black uppercase tracking-wider text-[#8ab4f8] border-[#8ab4f8]/25 bg-[#8ab4f8]/5">
                  ⚡ JAX (Flax)
                </span>
              </div>
              <button
                onClick={() => handleCopy('JAX')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2b2d31]/50 hover:bg-[#8ab4f8]/10 border border-[#3f4046] hover:border-[#8ab4f8]/30 text-[9px] font-black uppercase text-[#e3e3e3] hover:text-[#8ab4f8] rounded-lg transition-all cursor-pointer"
              >
                {copiedStates.JAX ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                <span>{copiedStates.JAX ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div 
              ref={refJAX}
              onMouseEnter={() => setActiveScrollIdx(2)}
              onScroll={() => handleScroll(2)}
              className="flex-1 overflow-auto p-6 font-mono text-[10.5px] leading-relaxed text-[#c5cbd3] selection:bg-[#8ab4f8]/20 custom-scrollbar bg-[#08090d]"
            >
              <pre className="whitespace-pre">{codeJAX}</pre>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-8 py-3 border-t border-white/5 bg-[#1e1f22]/60 flex items-center justify-between">
          <p className="text-[9.5px] text-[#9aa0a6] font-semibold">
            * Drag scroll inside any panel; all other panes will synchronize scroll alignment automatically.
          </p>
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-5 py-2 bg-[#2b2d31] hover:bg-[#3f4046] text-xs font-bold text-white rounded-xl border border-[#3f4046] transition-all duration-150 cursor-pointer"
          >
            Close View
          </button>
        </div>

      </div>
    </div>
  );
}
