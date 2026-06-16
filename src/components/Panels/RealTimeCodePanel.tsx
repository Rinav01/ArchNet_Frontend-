'use client';

import React, { useState } from 'react';
import { useCanvasStore } from '@/store/canvasStore';
import DockablePanel from '../Common/DockablePanel';
import { compileToPyTorch } from '@/lib/canvas/pytorchCompiler';
// We could also import other compilers here if we want a dropdown, 
// but for the Real-Time Preview, PyTorch is our primary demo standard.
import { Copy, Check, Download, FileCode } from 'lucide-react';

export default function RealTimeCodePanel() {
  const nodes = useCanvasStore((state) => state.nodes);
  const edges = useCanvasStore((state) => state.edges);
  const [copied, setCopied] = useState(false);

  const code = compileToPyTorch(nodes, edges);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([code], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = 'generated_model.py';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <DockablePanel id="codePreview">
      <div className="flex flex-col h-full bg-[#07080b]">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#1e1f22]/40 border-b border-white/5 select-none shrink-0">
          <span className="text-[10px] font-black uppercase text-[#ff6633] tracking-wide flex items-center gap-1.5">
            <span>🔥</span>
            <span>PyTorch Auto-Gen</span>
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopy}
              className="p-1 hover:bg-[#2b2d31] rounded text-gray-400 hover:text-white transition-all cursor-pointer border-none bg-transparent flex items-center gap-1 text-[10px] uppercase font-bold"
            >
              {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="p-1 hover:bg-[#2b2d31] rounded text-gray-400 hover:text-white transition-all cursor-pointer border-none bg-transparent flex items-center gap-1 text-[10px] uppercase font-bold"
            >
              <Download size={11} />
              <span>Save</span>
            </button>
          </div>
        </div>

        {/* Code View */}
        <div className="flex-1 overflow-auto p-4 font-mono text-[10.5px] leading-relaxed text-[#c5cbd3] selection:bg-[#8ab4f8]/20 bg-[#07080b] custom-scrollbar">
          <pre className="whitespace-pre">{code}</pre>
        </div>
      </div>
    </DockablePanel>
  );
}
