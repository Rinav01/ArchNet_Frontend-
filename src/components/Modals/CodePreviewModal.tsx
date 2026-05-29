'use client';

import React, { useState } from 'react';
import { X, Copy, Check, Download, FileCode, Columns } from 'lucide-react';
import { CanvasNode, CanvasEdge } from '@/types/canvas';
import { compileToPyTorch } from '@/lib/canvas/pytorchCompiler';
import { compileToTensorFlow } from '@/lib/canvas/tensorflowCompiler';
import { compileToJAX } from '@/lib/canvas/jaxCompiler';
import { compileToONNX } from '@/lib/canvas/onnxCompiler';

interface CodePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

type Framework = 'PyTorch' | 'TensorFlow' | 'JAX' | 'ONNX';

export default function CodePreviewModal({ isOpen, onClose, nodes, edges }: CodePreviewModalProps) {
  // Local active framework selection for single tabbed view
  const [activeFramework, setActiveFramework] = useState<Framework>('PyTorch');
  
  // Split pane compare state
  const [isSplitCompare, setIsSplitCompare] = useState(false);
  const [leftFramework, setLeftFramework] = useState<Framework>('PyTorch');
  const [rightFramework, setRightFramework] = useState<Framework>('TensorFlow');

  // Copy success animations
  const [copiedLeft, setCopiedLeft] = useState(false);
  const [copiedRight, setCopiedRight] = useState(false);
  const [copiedSingle, setCopiedSingle] = useState(false);

  if (!isOpen) return null;

  // Compile helper maps
  const getCompiledCode = (fw: Framework): string => {
    switch (fw) {
      case 'PyTorch':
        return compileToPyTorch(nodes, edges);
      case 'TensorFlow':
        return compileToTensorFlow(nodes, edges);
      case 'JAX':
        return compileToJAX(nodes, edges);
      case 'ONNX':
        return compileToONNX(nodes, edges);
    }
  };

  const handleCopy = async (fw: Framework, setCopiedState: React.Dispatch<React.SetStateAction<boolean>>) => {
    try {
      const code = getCompiledCode(fw);
      await navigator.clipboard.writeText(code);
      setCopiedState(true);
      setTimeout(() => setCopiedState(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleDownload = (fw: Framework) => {
    const code = getCompiledCode(fw);
    const element = document.createElement("a");
    const file = new Blob([code], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    
    // Choose appropriate file name extensions
    let ext = '.py';
    let label = 'module';
    if (fw === 'ONNX') {
      label = 'onnx_graph_builder';
    } else if (fw === 'TensorFlow') {
      label = 'keras_model';
    } else if (fw === 'JAX') {
      label = 'jax_flax_module';
    } else {
      label = 'pytorch_module';
    }

    element.download = `mlbuilder_${label}${ext}`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Styled colors for framework indicator badges
  const getFrameworkColor = (fw: Framework) => {
    switch (fw) {
      case 'PyTorch': return 'text-[#ff6633] border-[#ff6633]/25 bg-[#ff6633]/5';
      case 'TensorFlow': return 'text-[#ff9000] border-[#ff9000]/25 bg-[#ff9000]/5';
      case 'JAX': return 'text-[#8ab4f8] border-[#8ab4f8]/25 bg-[#8ab4f8]/5';
      case 'ONNX': return 'text-[#c5a3ff] border-[#c5a3ff]/25 bg-[#c5a3ff]/5';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl glass-panel rounded-2xl border border-white/10 flex flex-col h-[85vh] shadow-2xl relative overflow-hidden bg-[#16171a]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-white/5 bg-[#1e1f22]/60 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#8ab4f8]/10 border border-[#8ab4f8]/20 rounded-xl text-[#8ab4f8]">
              <FileCode size={20} className="animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white tracking-wide flex items-center gap-2">
                <span>Multi-Framework Compiler Console</span>
                <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded text-emerald-400 font-extrabold uppercase select-none">
                  Online
                </span>
              </h3>
              <p className="text-[11px] text-[#9aa0a6] mt-0.5 font-semibold">Compile topologies dynamically to TensorFlow, JAX, ONNX, or standard PyTorch subclasses.</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            {/* Split Screen Compare Mode Trigger Button */}
            <button
              onClick={() => setIsSplitCompare(!isSplitCompare)}
              className={`flex items-center gap-2 px-3.5 py-1.5 border rounded-full text-[11px] font-black tracking-wide uppercase transition-all duration-200 cursor-pointer ${
                isSplitCompare 
                  ? 'bg-[#b388ff]/10 border-[#b388ff]/40 text-[#b388ff] shadow-lg shadow-[#b388ff]/5 scale-105' 
                  : 'bg-transparent border-[#3f4046] text-[#9aa0a6] hover:text-white hover:bg-[#2b2d31]'
              }`}
              title="Toggle Split Dual-Pane Compare Mode"
            >
              <Columns size={12} />
              <span>{isSplitCompare ? 'Single View' : 'Split Compare'}</span>
            </button>

            <button 
              onClick={onClose}
              className="p-2 hover:bg-[#2b2d31] rounded-lg text-[#9aa0a6] hover:text-white transition-all cursor-pointer border border-transparent hover:border-[#3f4046]"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Modal Main Content Workspace */}
        <div className="flex-1 flex flex-col min-h-0 bg-[#0c0d10]">
          
          {!isSplitCompare ? (
            /* --- SINGLE PLAYGROUND PREVIEW (Tabbed Switcher Layout) --- */
            <>
              {/* Segmented active framework switcher tabs */}
              <div className="flex items-center gap-2 px-8 py-3 bg-[#1e1f22]/30 border-b border-white/5 select-none">
                <span className="text-[10px] font-black uppercase text-[#9aa0a6] tracking-wider pr-3 border-r border-[#3f4046] mr-1">Compiler Target</span>
                {(['PyTorch', 'TensorFlow', 'JAX', 'ONNX'] as Framework[]).map((fw) => {
                  const isActive = activeFramework === fw;
                  return (
                    <button
                      key={fw}
                      onClick={() => setActiveFramework(fw)}
                      className={`px-4.5 py-1.5 rounded-xl text-xs font-bold border transition-all duration-150 cursor-pointer ${
                        isActive
                          ? 'bg-[#8ab4f8]/10 border-[#8ab4f8]/40 text-[#8ab4f8] shadow-md shadow-black/5 scale-[1.02]'
                          : 'bg-transparent border-transparent text-[#9aa0a6] hover:text-[#e3e3e3] hover:bg-[#2b2d31]/40'
                      }`}
                    >
                      {fw === 'PyTorch' && '🔥 PyTorch'}
                      {fw === 'TensorFlow' && '🍊 TensorFlow'}
                      {fw === 'JAX' && '⚡ JAX (Flax)'}
                      {fw === 'ONNX' && '💎 ONNX Graph'}
                    </button>
                  );
                })}
              </div>

              {/* Monospace Code Editor Area */}
              <div className="flex-1 overflow-auto p-8 font-mono text-[11px] leading-relaxed text-[#c5cbd3] selection:bg-[#8ab4f8]/20 bg-[#07080b] custom-scrollbar">
                <pre className="whitespace-pre">{getCompiledCode(activeFramework)}</pre>
              </div>

              {/* Single View Actions Footer */}
              <div className="px-8 py-4 border-t border-white/5 bg-[#1e1f22]/40 backdrop-blur-md flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-black uppercase tracking-wider select-none ${getFrameworkColor(activeFramework)}`}>
                    {activeFramework} Compiled
                  </span>
                  <span className="text-[10.5px] text-[#9aa0a6] font-semibold">
                    {activeFramework === 'ONNX' 
                      ? 'Format: Python direct graph helper | Outputs serializable binary .onnx files' 
                      : 'Format: Python Subclass Module | Validated sandbox topology safe'}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleCopy(activeFramework, setCopiedSingle)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#2b2d31]/60 hover:bg-[#2b2d31] text-xs font-bold text-[#e3e3e3] hover:text-white rounded-xl border border-[#3f4046] transition-all duration-150 cursor-pointer"
                  >
                    {copiedSingle ? (
                      <>
                        <Check size={14} className="text-emerald-400" />
                        <span className="text-emerald-400 font-extrabold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleDownload(activeFramework)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#8ab4f8] hover:bg-[#a8c7fa] text-[#1e1f22] rounded-xl text-xs font-black tracking-wide shadow-lg shadow-[#8ab4f8]/10 transition-all duration-150 cursor-pointer"
                  >
                    <Download size={14} />
                    <span>Download Script</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* --- DUAL SPLIT-SCREEN PLAYGROUND COMPARE --- */
            <div className="flex-1 flex min-h-0 divide-x divide-white/5">
              
              {/* Left Code Column Panel */}
              <div className="flex-1 flex flex-col min-h-0 bg-[#07080b]">
                <div className="flex items-center justify-between px-6 py-2.5 bg-[#1e1f22]/40 border-b border-white/5 select-none">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[9.5px] font-black uppercase text-[#9aa0a6] tracking-wider">Pane Left</span>
                    <select
                      value={leftFramework}
                      onChange={(e) => setLeftFramework(e.target.value as Framework)}
                      className="bg-[#2b2d31] border border-[#3f4046] rounded-lg px-2.5 py-1 text-[11px] font-bold text-white cursor-pointer focus:outline-none focus:border-[#8ab4f8]"
                    >
                      <option value="PyTorch">🔥 PyTorch</option>
                      <option value="TensorFlow">🍊 TensorFlow</option>
                      <option value="JAX">⚡ JAX (Flax)</option>
                      <option value="ONNX">💎 ONNX Graph</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopy(leftFramework, setCopiedLeft)}
                      className="p-1.5 bg-[#2b2d31]/50 border border-[#3f4046] hover:bg-[#2b2d31] text-[#9aa0a6] hover:text-white rounded-lg transition-all cursor-pointer"
                      title="Copy Left Code"
                    >
                      {copiedLeft ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    </button>
                    <button
                      onClick={() => handleDownload(leftFramework)}
                      className="p-1.5 bg-[#2b2d31]/50 border border-[#3f4046] hover:bg-[#2b2d31] text-[#9aa0a6] hover:text-white rounded-lg transition-all cursor-pointer"
                      title="Download Left Script"
                    >
                      <Download size={12} />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-auto p-6 font-mono text-[10.5px] leading-relaxed text-[#c5cbd3] selection:bg-[#8ab4f8]/20 custom-scrollbar">
                  <pre className="whitespace-pre">{getCompiledCode(leftFramework)}</pre>
                </div>
              </div>

              {/* Right Code Column Panel */}
              <div className="flex-1 flex flex-col min-h-0 bg-[#08090d]">
                <div className="flex items-center justify-between px-6 py-2.5 bg-[#1e1f22]/40 border-b border-white/5 select-none">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[9.5px] font-black uppercase text-[#9aa0a6] tracking-wider">Pane Right</span>
                    <select
                      value={rightFramework}
                      onChange={(e) => setRightFramework(e.target.value as Framework)}
                      className="bg-[#2b2d31] border border-[#3f4046] rounded-lg px-2.5 py-1 text-[11px] font-bold text-white cursor-pointer focus:outline-none focus:border-[#8ab4f8]"
                    >
                      <option value="PyTorch">🔥 PyTorch</option>
                      <option value="TensorFlow">🍊 TensorFlow</option>
                      <option value="JAX">⚡ JAX (Flax)</option>
                      <option value="ONNX">💎 ONNX Graph</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopy(rightFramework, setCopiedRight)}
                      className="p-1.5 bg-[#2b2d31]/50 border border-[#3f4046] hover:bg-[#2b2d31] text-[#9aa0a6] hover:text-white rounded-lg transition-all cursor-pointer"
                      title="Copy Right Code"
                    >
                      {copiedRight ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    </button>
                    <button
                      onClick={() => handleDownload(rightFramework)}
                      className="p-1.5 bg-[#2b2d31]/50 border border-[#3f4046] hover:bg-[#2b2d31] text-[#9aa0a6] hover:text-white rounded-lg transition-all cursor-pointer"
                      title="Download Right Script"
                    >
                      <Download size={12} />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-auto p-6 font-mono text-[10.5px] leading-relaxed text-[#c5cbd3] selection:bg-[#8ab4f8]/20 custom-scrollbar">
                  <pre className="whitespace-pre">{getCompiledCode(rightFramework)}</pre>
                </div>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}
