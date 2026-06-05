'use client';

import React, { useState, useEffect } from 'react';
import { useTrainingConfigStore } from '@/store/trainingConfigStore';
import { useCanvasStore } from '@/store/canvasStore';
import { toast } from '@/store/notificationStore';
import { X, Sliders, Play, RotateCcw, Check, Sparkles, Cpu } from 'lucide-react';

interface TrainingConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TrainingConfigModal({ isOpen, onClose }: TrainingConfigModalProps) {
  const { trainingConfig, setTrainingConfig, resetTrainingConfig } = useTrainingConfigStore();
  
  // Also get the canvas store setters so they sync up in real-time
  const setCanvasEpochs = useCanvasStore((state) => state.setTrainingEpochs);
  const setCanvasBatchSize = useCanvasStore((state) => state.setTrainingBatchSize);
  const setCanvasLearningRate = useCanvasStore((state) => state.setTrainingLearningRate);
  const setCanvasOptimizer = useCanvasStore((state) => state.setTrainingOptimizer);

  // Local state for the form fields
  const [epochs, setEpochs] = useState<number>(20);
  const [batchSize, setBatchSize] = useState<number>(32);
  const [learningRate, setLearningRate] = useState<number>(0.001);
  const [optimizer, setOptimizer] = useState<string>('Adam');

  // Load store config when modal opens
  useEffect(() => {
    if (isOpen) {
      setEpochs(trainingConfig.epochs);
      setBatchSize(trainingConfig.batchSize);
      setLearningRate(trainingConfig.learningRate);
      setOptimizer(trainingConfig.optimizer);
    }
  }, [isOpen, trainingConfig]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (epochs <= 0 || !Number.isInteger(epochs)) {
      toast.error('Validation Error', 'Epochs must be a positive integer.');
      return;
    }
    if (learningRate <= 0 || learningRate > 1) {
      toast.error('Validation Error', 'Learning Rate must be a float between 0 and 1.');
      return;
    }

    // Save to TrainingConfigStore
    setTrainingConfig({
      epochs,
      batchSize,
      learningRate,
      optimizer,
    });

    // Sync to CanvasStore
    setCanvasEpochs(epochs);
    setCanvasBatchSize(batchSize);
    setCanvasLearningRate(learningRate);
    if (['Adam', 'SGD', 'RMSprop', 'AdamW'].includes(optimizer)) {
      setCanvasOptimizer(optimizer as any);
    }

    toast.success('Configuration Saved', 'Training parameters updated globally across the workspace.');
    onClose();
  };

  const handleReset = () => {
    resetTrainingConfig();
    
    // Sync canvas store reset
    setCanvasEpochs(20);
    setCanvasBatchSize(32);
    setCanvasLearningRate(0.001);
    setCanvasOptimizer('Adam');

    setEpochs(20);
    setBatchSize(32);
    setLearningRate(0.001);
    setOptimizer('Adam');

    toast.info('Defaults Restored', 'Training configurations reset to factory standard parameters.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-[#090a0f]/60 backdrop-blur-md transition-opacity" 
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md bg-[#1e1f22]/95 border border-[#3f4046] shadow-2xl rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200 flex flex-col select-none text-[#e3e3e3]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 border-b border-[#3f4046]/50 h-14 shrink-0 bg-[#1e1f22]">
          <div className="flex items-center gap-2.5 text-sm font-bold text-white">
            <Sliders size={18} className="text-[#ffe082]" />
            <span>Training Configuration Settings</span>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 hover:bg-[#2b2d31] rounded-lg text-[#9aa0a6] hover:text-white transition-all cursor-pointer border-none bg-transparent"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="flex-1 flex flex-col">
          <div className="p-6 space-y-5">
            {/* Context Info Banner */}
            <div className="bg-[#ffe082]/10 border border-[#ffe082]/20 p-4 rounded-xl flex items-start gap-3">
              <Cpu size={16} className="text-[#ffe082] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="text-[10px] font-black text-[#ffe082] uppercase tracking-wider block">ML Optimization Hyperparameters</span>
                <p className="text-[11px] text-gray-300 font-semibold leading-relaxed">
                  These global parameters apply to active pipeline runs, SGD learning profiles, and model gradient descents.
                </p>
              </div>
            </div>

            {/* Epochs */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-bold text-[#9aa0a6]">
                <label className="uppercase tracking-wider">Epochs</label>
                <span className="text-white font-mono">{epochs}</span>
              </div>
              <input
                type="range"
                min="1"
                max="200"
                step="1"
                value={epochs}
                onChange={(e) => setEpochs(parseInt(e.target.value))}
                className="w-full cursor-pointer accent-[#ffe082]"
              />
              <div className="flex justify-between text-[9px] font-extrabold text-gray-500 font-mono select-none">
                <span>1 EPOCH</span>
                <span>200 MAX</span>
              </div>
            </div>

            {/* Batch Size */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#9aa0a6] uppercase tracking-wider block">Batch Size</label>
              <select
                value={batchSize}
                onChange={(e) => setBatchSize(parseInt(e.target.value))}
                className="w-full bg-[#2b2d31] border border-[#3f4046] rounded-xl px-3 py-2 text-sm text-[#e3e3e3] focus:outline-none focus:border-[#ffe082] transition-all font-medium cursor-pointer"
              >
                {[16, 32, 64, 128, 256].map((size) => (
                  <option key={size} value={size}>
                    {size} samples per step
                  </option>
                ))}
              </select>
            </div>

            {/* Learning Rate */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-bold text-[#9aa0a6]">
                <label className="uppercase tracking-wider">Learning Rate</label>
                <span className="text-white font-mono">{learningRate}</span>
              </div>
              <input
                type="range"
                min="0.0001"
                max="0.1"
                step="0.0005"
                value={learningRate}
                onChange={(e) => setLearningRate(parseFloat(e.target.value))}
                className="w-full cursor-pointer accent-[#ffe082]"
              />
              <div className="flex justify-between text-[9px] font-extrabold text-gray-500 font-mono select-none">
                <span>0.0001 (Slow)</span>
                <span>0.1 (Fast)</span>
              </div>
            </div>

            {/* Optimizer */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#9aa0a6] uppercase tracking-wider block">Optimizer Algorithm</label>
              <select
                value={optimizer}
                onChange={(e) => setOptimizer(e.target.value)}
                className="w-full bg-[#2b2d31] border border-[#3f4046] rounded-xl px-3 py-2 text-sm text-[#e3e3e3] focus:outline-none focus:border-[#ffe082] transition-all font-medium cursor-pointer"
              >
                {['Adam', 'SGD', 'RMSprop', 'AdamW'].map((optName) => (
                  <option key={optName} value={optName}>
                    {optName}
                  </option>
                ))}
              </select>
            </div>

            {/* Config Live Preview Indicator Card */}
            <div className="bg-[#101113] border border-[#2b2d31] p-3.5 rounded-xl space-y-2 select-none">
              <div className="flex items-center gap-1.5 text-[9px] font-extrabold text-[#9aa0a6] uppercase tracking-widest border-b border-[#2b2d31] pb-1.5">
                <Sparkles size={11} className="text-[#ffe082]" />
                <span>Active Model Parameter Block</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono font-semibold text-gray-400">
                <div className="flex justify-between">
                  <span>Epochs:</span>
                  <span className="text-white font-bold">{epochs}</span>
                </div>
                <div className="flex justify-between">
                  <span>Batch Size:</span>
                  <span className="text-white font-bold">{batchSize}</span>
                </div>
                <div className="flex justify-between">
                  <span>LR:</span>
                  <span className="text-white font-bold">{learningRate}</span>
                </div>
                <div className="flex justify-between">
                  <span>Optimizer:</span>
                  <span className="text-[#ffe082] font-bold">{optimizer}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 bg-[#1e1f22] border-t border-[#3f4046]/50 flex items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-2 hover:bg-[#2b2d31] text-xs font-bold text-gray-400 hover:text-white rounded-xl transition-all border-none bg-transparent cursor-pointer"
            >
              <RotateCcw size={13} />
              <span>Defaults</span>
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-[#3f4046] hover:bg-[#2b2d31] text-xs font-bold text-[#9aa0a6] hover:text-white rounded-xl transition-all cursor-pointer bg-transparent"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 bg-[#ffe082] hover:bg-[#ffebad] text-[#1e1f22] text-xs font-bold rounded-xl transition-all shadow-md active:scale-95 cursor-pointer border-none"
              >
                <Check size={14} />
                <span>Apply Settings</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
