'use client';

import React, { useState } from 'react';
import MainLayout from '@/components/Layout/MainLayout';
import { BookOpen, Play, FileCode } from 'lucide-react';

export default function NotebookPage() {
  const [codeCell, setCodeCell] = useState(
`# Instantiate visual network and compile graph shapes
import torch
from mlbuilder_module import MLBuilderModule

model = MLBuilderModule()
x = torch.randn(1, 3, 224, 224)
output = model(x)
print("Output tensor shape:", output.shape)`
  );

  const [isRunning, setIsRunning] = useState(false);
  const [outputs, setOutputs] = useState<string[]>([]);

  const handleRunCell = () => {
    setIsRunning(true);
    setOutputs(['Initializing Python runtime kernel...']);
    
    setTimeout(() => {
      setOutputs(prev => [
        ...prev,
        'Importing PyTorch CUDA module...',
        'Compiling computational trace...',
        'Success! Forward pass output: torch.Size([1, 64, 224, 224])'
      ]);
      setIsRunning(false);
    }, 1200);
  };

  return (
    <MainLayout>
      <div className="p-8 max-w-5xl mx-auto space-y-8 relative pb-16">
        
        {/* Title */}
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <BookOpen className="text-[#8ab4f8]" size={32} />
            <span>Interactive Notebook</span>
          </h1>
          <p className="text-[#9aa0a6] mt-2 text-sm font-semibold">
            Execute experimental training loops, script activations, and debug model parameters in real-time.
          </p>
        </div>

        {/* Notebook layout */}
        <div className="bg-[#2b2d31] border border-[#3f4046] rounded-2xl flex flex-col overflow-hidden shadow-xl">
          
          {/* Notebook Header */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-[#3f4046] bg-black/10">
            <div className="flex items-center gap-2">
              <FileCode size={16} className="text-[#8ab4f8]" />
              <span className="text-xs font-bold text-[#9aa0a6] font-mono">sandbox_experiment.ipynb</span>
            </div>

            <button
              onClick={handleRunCell}
              disabled={isRunning}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-[#8ab4f8] hover:bg-[#a8c7fa] text-[#1e1f22] rounded-full text-xs font-bold shadow-md transition-all"
            >
              <Play size={12} className={isRunning ? 'animate-pulse' : ''} />
              <span>{isRunning ? 'Running...' : 'Run Cell'}</span>
            </button>
          </div>

          {/* Cell Code Editor */}
          <div className="p-6 bg-[#05060b] font-mono text-xs text-gray-300 leading-relaxed min-h-[160px] relative border-b border-[#3f4046]">
            <div className="absolute left-2 top-6 text-gray-600 text-right w-8 select-none">
              In [1]:
            </div>
            <textarea
              value={codeCell}
              onChange={(e) => setCodeCell(e.target.value)}
              className="w-full pl-12 bg-transparent text-gray-200 focus:outline-none resize-none font-mono text-xs leading-relaxed min-h-[140px]"
            />
          </div>

          {/* Cell Output Panel */}
          <div className="p-6 bg-[#1e1f22] font-mono text-[11px] leading-relaxed min-h-[100px]">
            <div className="absolute left-2 text-[#5f6368] text-right w-8 select-none">
              Out [1]:
            </div>
            <div className="pl-12 space-y-1">
              {outputs.length === 0 ? (
                <span className="text-[#5f6368] italic">No output logged yet. Run cell to compile script.</span>
              ) : (
                outputs.map((line, idx) => (
                  <div key={idx} className={line.startsWith('Success') ? 'text-[#81c784] font-bold' : 'text-[#9aa0a6]'}>
                    {line}
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>
    </MainLayout>
  );
}
