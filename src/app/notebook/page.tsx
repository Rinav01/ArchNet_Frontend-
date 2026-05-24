'use client';

import React, { useState } from 'react';
import MainLayout from '@/components/Layout/MainLayout';
import { BookOpen, Play, CheckCircle2, AlertCircle, FileCode } from 'lucide-react';

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
            <BookOpen className="text-purple-500" size={32} />
            <span>Interactive Notebook</span>
          </h1>
          <p className="text-gray-400 mt-2 text-sm font-medium">
            Execute experimental training loops, script activations, and debug model parameters in real-time.
          </p>
        </div>

        {/* Notebook layout */}
        <div className="glass-panel border border-white/5 rounded-2xl flex flex-col overflow-hidden">
          
          {/* Notebook Header */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-white/5 bg-black/10">
            <div className="flex items-center gap-2">
              <FileCode size={16} className="text-purple-400" />
              <span className="text-xs font-bold text-gray-400 font-mono">sandbox_experiment.ipynb</span>
            </div>

            <button
              onClick={handleRunCell}
              disabled={isRunning}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-extrabold border border-purple-500/25 transition-all shadow-lg shadow-purple-600/10"
            >
              <Play size={12} className={isRunning ? 'animate-pulse' : ''} />
              <span>{isRunning ? 'Running...' : 'Run Cell'}</span>
            </button>
          </div>

          {/* Cell Code Editor input */}
          <div className="p-6 bg-[#05060b] font-mono text-xs text-gray-300 leading-relaxed min-h-[160px] relative border-b border-white/5">
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
          <div className="p-6 bg-[#090a0f] font-mono text-[11px] leading-relaxed min-h-[100px]">
            <div className="absolute left-2 text-gray-600 text-right w-8 select-none">
              Out [1]:
            </div>
            <div className="pl-12 space-y-1">
              {outputs.length === 0 ? (
                <span className="text-gray-600 italic">No output logged yet. Run cell to compile script.</span>
              ) : (
                outputs.map((line, idx) => (
                  <div key={idx} className={line.startsWith('Success') ? 'text-emerald-400 font-bold' : 'text-gray-400'}>
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
