'use client';

import React, { useState } from 'react';
import { X, Copy, Check, Download, FileCode } from 'lucide-react';

interface CodePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  codeString: string;
}

export default function CodePreviewModal({ isOpen, onClose, codeString }: CodePreviewModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([codeString], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = "mlbuilder_module.py";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl glass-panel rounded-2xl border border-white/10 flex flex-col h-[80vh] shadow-2xl relative overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-white/5 bg-black/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-600/10 border border-purple-500/20 rounded-xl text-purple-400">
              <FileCode size={20} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white tracking-wide">Generated PyTorch Architecture Code</h3>
              <p className="text-xs text-gray-500 mt-0.5 font-medium">Production-ready, compiled directly from visual topology.</p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body: Styled Code Preview */}
        <div className="flex-1 overflow-auto bg-[#05060b] p-6 relative font-mono text-xs leading-relaxed text-gray-300 select-text selection:bg-purple-600/30">
          <pre className="whitespace-pre">{codeString}</pre>
        </div>

        {/* Modal Actions Footer */}
        <div className="px-8 py-4 border-t border-white/5 bg-black/15 flex items-center justify-between">
          <span className="text-xs text-gray-500 font-medium">
            Format: Python Module (.py) | Targets CPU & CUDA clusters
          </span>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 text-xs font-bold text-gray-300 hover:text-white rounded-xl border border-white/5 transition-all duration-200"
            >
              {copied ? (
                <>
                  <Check size={14} className="text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={14} />
                  <span>Copy Code</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-600/10 border border-purple-500/25 transition-all duration-200"
            >
              <Download size={14} />
              <span>Download Script</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
