'use client';

import React from 'react';
import { useCanvasStore } from '@/store/canvasStore';
import { useProjectStore } from '@/store/projectStore';
import { Info, Trash2, Sliders, Hash, Zap, Lock } from 'lucide-react';

export default function ConfigPanel() {
  const {
    nodes,
    selectedNodeId,
    updateNodeConfig,
    updateNodeName,
    removeNode,
  } = useCanvasStore();

  const userRole = useProjectStore((state) => state.userRole);

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  if (!selectedNode) {
    return null;
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (userRole === 'Viewer') return;
    updateNodeName(selectedNode.id, e.target.value);
  };

  const handleConfigChange = (key: string, value: any) => {
    if (userRole === 'Viewer') return;
    updateNodeConfig(selectedNode.id, { [key]: value });
  };

  const renderHyperparameters = () => {
    const config = selectedNode.config;

    switch (selectedNode.type) {
      case 'Input':
        return (
          <div className="space-y-4">
            <h4 className="text-[10px] font-extrabold uppercase text-[#9aa0a6] tracking-wider flex items-center gap-1.5 mb-2">
              <Hash size={12} />
              <span>Input Shape Configuration</span>
            </h4>
            <div className="grid grid-cols-3 gap-2">
              {['H', 'W', 'C'].map((dimName, idx) => {
                const currentDim = config.dim || [224, 224, 3];
                return (
                  <div key={dimName} className="space-y-1.5">
                    <label className="text-[10px] font-bold text-[#9aa0a6] uppercase">{dimName}</label>
                    <input
                      type="number"
                      value={currentDim[idx] || 0}
                      onChange={(e) => {
                        const newDim = [...currentDim];
                        newDim[idx] = Math.max(1, parseInt(e.target.value) || 1);
                        const [h, w, c] = newDim;
                        updateNodeConfig(selectedNode.id, {
                          dim: newDim,
                          shape: [null, c, h, w]
                        });
                      }}
                      className="w-full text-center px-2 py-2 bg-[#2b2d31] border border-[#3f4046] rounded-lg text-sm text-white focus:outline-none focus:border-[#8ab4f8]"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'Conv2D':
        return (
          <div className="space-y-6">
            <h4 className="text-[10px] font-extrabold uppercase text-[#9aa0a6] tracking-wider flex items-center gap-1.5 mb-2">
              <Sliders size={12} />
              <span>Convolution Parameters</span>
            </h4>
            
            {/* Filters Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-[#9aa0a6]">
                <span>FILTERS</span>
                <span className="text-[#8ab4f8] font-mono">{config.filters || 64}</span>
              </div>
              <input
                type="range"
                min="8"
                max="256"
                step="8"
                value={config.filters || 64}
                onChange={(e) => handleConfigChange('filters', parseInt(e.target.value))}
                className="w-full cursor-pointer accent-[#8ab4f8]"
              />
            </div>

            {/* Kernel Size Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-[#9aa0a6]">
                <span>KERNEL SIZE</span>
                <span className="text-[#8ab4f8] font-mono">{config.kernelSize || 3}x{config.kernelSize || 3}</span>
              </div>
              <input
                type="range"
                min="1"
                max="11"
                step="2"
                value={config.kernelSize || 3}
                onChange={(e) => handleConfigChange('kernelSize', parseInt(e.target.value))}
                className="w-full cursor-pointer accent-[#8ab4f8]"
              />
            </div>

            {/* Stride Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-[#9aa0a6]">
                <span>STRIDE</span>
                <span className="text-[#8ab4f8] font-mono">{config.stride || 1}</span>
              </div>
              <input
                type="range"
                min="1"
                max="4"
                step="1"
                value={config.stride || 1}
                onChange={(e) => handleConfigChange('stride', parseInt(e.target.value))}
                className="w-full cursor-pointer accent-[#8ab4f8]"
              />
            </div>

            {/* Padding Field */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-[#9aa0a6] uppercase">PADDING</span>
              <div className="grid grid-cols-2 gap-2">
                {['same', 'valid'].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handleConfigChange('padding', p)}
                    className={`py-2 rounded-full border text-xs font-bold capitalize transition-all ${
                      config.padding === p
                        ? 'bg-[#8ab4f8]/10 border-[#8ab4f8]/50 text-[#8ab4f8]'
                        : 'bg-[#2b2d31] border-[#3f4046] text-[#9aa0a6] hover:bg-[#313338] hover:text-white'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Activation Field */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-[#9aa0a6] uppercase">ACTIVATION</span>
              <select
                value={config.activation || 'ReLU'}
                onChange={(e) => handleConfigChange('activation', e.target.value)}
                className="w-full px-3 py-2 bg-[#2b2d31] border border-[#3f4046] rounded-xl text-xs text-gray-300 focus:outline-none focus:border-[#8ab4f8]"
              >
                {['ReLU', 'Sigmoid', 'Tanh', 'Softmax', 'None'].map((act) => (
                  <option key={act} value={act} className="bg-[#2b2d31] text-white">
                    {act}
                  </option>
                ))}
              </select>
            </div>
          </div>
        );

      case 'MaxPool2D':
        return (
          <div className="space-y-6">
            <h4 className="text-[10px] font-extrabold uppercase text-[#9aa0a6] tracking-wider flex items-center gap-1.5 mb-2">
              <Sliders size={12} />
              <span>Pooling Parameters</span>
            </h4>

            {/* Pool Size */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-[#9aa0a6]">
                <span>POOL SIZE</span>
                <span className="text-[#8ab4f8] font-mono">{config.poolSize || 2}x{config.poolSize || 2}</span>
              </div>
              <input
                type="range"
                min="2"
                max="8"
                step="1"
                value={config.poolSize || 2}
                onChange={(e) => handleConfigChange('poolSize', parseInt(e.target.value))}
                className="w-full cursor-pointer accent-[#8ab4f8]"
              />
            </div>

            {/* Stride */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-[#9aa0a6]">
                <span>STRIDE</span>
                <span className="text-[#8ab4f8] font-mono">{config.stride || 2}</span>
              </div>
              <input
                type="range"
                min="1"
                max="8"
                step="1"
                value={config.stride || 2}
                onChange={(e) => handleConfigChange('stride', parseInt(e.target.value))}
                className="w-full cursor-pointer accent-[#8ab4f8]"
              />
            </div>
          </div>
        );

      case 'Dense':
        return (
          <div className="space-y-6">
            <h4 className="text-[10px] font-extrabold uppercase text-[#9aa0a6] tracking-wider flex items-center gap-1.5 mb-2">
              <Sliders size={12} />
              <span>Projection Parameters</span>
            </h4>

            {/* Units */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-[#9aa0a6]">
                <span>PROJECTION UNITS</span>
                <span className="text-[#8ab4f8] font-mono">{config.units || 10}</span>
              </div>
              <input
                type="range"
                min="2"
                max="512"
                step="2"
                value={config.units || 10}
                onChange={(e) => handleConfigChange('units', parseInt(e.target.value))}
                className="w-full cursor-pointer accent-[#8ab4f8]"
              />
            </div>
          </div>
        );

      case 'BatchNorm2D':
        return (
          <div className="space-y-4">
            <h4 className="text-[10px] font-extrabold uppercase text-[#9aa0a6] tracking-wider flex items-center gap-1.5 mb-2">
              <Sliders size={12} />
              <span>Normalization Parameters</span>
            </h4>
            <div className="p-3.5 bg-[#2b2d31] border border-[#3f4046] rounded-xl text-center">
              <p className="text-xs text-white font-bold">Standard 2D Batch Normalization</p>
              <p className="text-[10px] text-[#9aa0a6] mt-1.5 leading-relaxed font-semibold">
                Normalizes features across the channel dimension. Learns scale and bias parameters automatically.
              </p>
            </div>
          </div>
        );

      case 'Dropout':
        return (
          <div className="space-y-6">
            <h4 className="text-[10px] font-extrabold uppercase text-[#9aa0a6] tracking-wider flex items-center gap-1.5 mb-2">
              <Sliders size={12} />
              <span>Regularization Parameters</span>
            </h4>
            
            {/* Rate Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-[#9aa0a6]">
                <span>DROPOUT RATE</span>
                <span className="text-[#8ab4f8] font-mono">{config.rate !== undefined ? config.rate : 0.5}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="0.9"
                step="0.05"
                value={config.rate !== undefined ? config.rate : 0.5}
                onChange={(e) => handleConfigChange('rate', parseFloat(e.target.value))}
                className="w-full cursor-pointer accent-[#8ab4f8]"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-80 border-l border-[#3f4046] bg-[#1e1f22] flex flex-col h-full select-none z-15 relative">
      {/* Glass lock overlay for Viewers */}
      {userRole === 'Viewer' && (
        <div className="absolute inset-0 bg-[#1e1f22]/80 backdrop-blur-[3px] z-50 flex flex-col items-center justify-center p-6 text-center select-none animate-in fade-in duration-200">
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-full mb-3 text-red-400 shadow-lg shadow-black/10">
            <Lock size={24} className="animate-pulse" />
          </div>
          <h4 className="text-sm font-bold text-white tracking-wide">Inspector Restricted</h4>
          <p className="text-[11px] text-[#9aa0a6] mt-2 max-w-[200px] leading-relaxed font-semibold">
            Read-only Viewer Mode is active. Parameters modification is locked.
          </p>
        </div>
      )}

      {/* Header Info */}
      <div className="p-6 border-b border-[#3f4046]">
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#9aa0a6] block">Properties</span>
        <h3 className="text-xl font-black text-white mt-1 flex items-center gap-2">
          <Info size={18} className="text-[#8ab4f8]" />
          <span>Inspector</span>
        </h3>
      </div>

      {/* Main Configuration Panel body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* 1. IDENTITY SECTION */}
        <div className="space-y-3">
          <span className="text-[10px] font-extrabold text-[#9aa0a6] uppercase tracking-wider block font-semibold">Identity</span>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[#9aa0a6] uppercase block">Layer Name</label>
            <input
              type="text"
              disabled={userRole === 'Viewer'}
              value={selectedNode.name}
              onChange={handleNameChange}
              className={`w-full px-4 py-2.5 bg-[#2b2d31] border border-[#3f4046] rounded-xl text-sm font-bold text-white tracking-wide uppercase focus:outline-none focus:border-[#8ab4f8] ${
                userRole === 'Viewer' ? 'opacity-40 cursor-not-allowed' : ''
              }`}
            />
          </div>
        </div>

        <div className="w-full h-[1px] bg-[#3f4046]"></div>

        {/* 2. DYNAMIC HYPERPARAMETERS SECTION */}
        <div className={userRole === 'Viewer' ? 'opacity-40 pointer-events-none' : ''}>
          {renderHyperparameters()}
        </div>

        <div className="w-full h-[1px] bg-[#3f4046]"></div>

        {/* 3. TENSOR SHAPE PROPAGATION INFO */}
        <div className="space-y-4">
          <h4 className="text-[10px] font-extrabold uppercase text-[#9aa0a6] tracking-wider flex items-center gap-1.5">
            <Zap size={12} />
            <span>Tensor Flow State</span>
          </h4>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-[#2b2d31] border border-[#3f4046] rounded-xl">
              <span className="text-[9px] text-[#9aa0a6] uppercase block font-semibold">Input Tensor</span>
              <span className="text-xs font-bold text-gray-300 font-mono mt-1 block">
                {selectedNode.inputShape.length > 0 ? `[${selectedNode.inputShape.join(', ')}]` : 'None (Root)'}
              </span>
            </div>
            <div className="p-3 bg-[#2b2d31] border border-[#3f4046] rounded-xl">
              <span className="text-[9px] text-[#9aa0a6] uppercase block font-semibold">Output Tensor</span>
              <span className="text-xs font-bold text-gray-300 font-mono mt-1 block">
                {selectedNode.outputShape.length > 0 ? `[${selectedNode.outputShape.join(', ')}]` : 'Calculating...'}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Footer delete action */}
      <div className="p-4 border-t border-[#3f4046] bg-black/10">
        <button
          onClick={() => {
            if (userRole === 'Viewer') return;
            removeNode(selectedNode.id);
          }}
          disabled={userRole === 'Viewer'}
          className={`w-full flex items-center justify-center gap-2 py-2.5 border rounded-full text-sm font-bold transition-all duration-200 ${
            userRole === 'Viewer'
              ? 'bg-rose-600/5 border-rose-500/10 text-rose-400/40 cursor-not-allowed opacity-40'
              : 'bg-rose-600/10 hover:bg-rose-600/20 border border-rose-500/20 text-rose-400 cursor-pointer'
          }`}
        >
          <Trash2 size={15} />
          <span>Delete Visual Block</span>
        </button>
      </div>

    </div>
  );
}
