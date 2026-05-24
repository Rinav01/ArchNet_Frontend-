'use client';

import React from 'react';
import { useCanvasStore } from '@/store/canvasStore';
import { Info, Trash2, Sliders, Hash, Zap } from 'lucide-react';

export default function ConfigPanel() {
  const {
    nodes,
    selectedNodeId,
    updateNodeConfig,
    updateNodeName,
    removeNode,
  } = useCanvasStore();

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  if (!selectedNode) {
    return (
      <div className="w-80 border-l border-white/5 bg-[#090a0f] flex flex-col h-full items-center justify-center p-6 text-center select-none z-15 relative">
        <div className="absolute inset-0 dot-grid opacity-20 pointer-events-none"></div>
        <div className="p-3 bg-white/5 border border-white/5 rounded-2xl text-gray-500 mb-4">
          <Info size={24} />
        </div>
        <h4 className="text-sm font-bold text-gray-300">No Block Selected</h4>
        <p className="text-xs text-gray-500 mt-1 max-w-[200px]">
          Click any canvas block to inspect its hyperparameter profile.
        </p>
      </div>
    );
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateNodeName(selectedNode.id, e.target.value);
  };

  const handleConfigChange = (key: string, value: any) => {
    updateNodeConfig(selectedNode.id, { [key]: value });
  };

  // Render hyperparameter controls dynamically based on the layer type
  const renderHyperparameters = () => {
    const config = selectedNode.config;

    switch (selectedNode.type) {
      case 'Input':
        return (
          <div className="space-y-4">
            <h4 className="text-[10px] font-extrabold uppercase text-gray-500 tracking-wider flex items-center gap-1.5 mb-2">
              <Hash size={12} />
              <span>Input Shape Configuration</span>
            </h4>
            <div className="grid grid-cols-3 gap-2">
              {['H', 'W', 'C'].map((dimName, idx) => {
                const currentDim = config.dim || [224, 224, 3];
                return (
                  <div key={dimName} className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">{dimName}</label>
                    <input
                      type="number"
                      value={currentDim[idx] || 0}
                      onChange={(e) => {
                        const newDim = [...currentDim];
                        newDim[idx] = Math.max(1, parseInt(e.target.value) || 1);
                        handleConfigChange('dim', newDim);
                      }}
                      className="w-full text-center px-2 py-2 bg-white/5 border border-white/5 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500/35"
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
            <h4 className="text-[10px] font-extrabold uppercase text-gray-500 tracking-wider flex items-center gap-1.5 mb-2">
              <Sliders size={12} />
              <span>Convolution Parameters</span>
            </h4>
            
            {/* Filters Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-gray-400">
                <span>FILTERS</span>
                <span className="text-purple-400 font-mono">{config.filters || 64}</span>
              </div>
              <input
                type="range"
                min="8"
                max="256"
                step="8"
                value={config.filters || 64}
                onChange={(e) => handleConfigChange('filters', parseInt(e.target.value))}
                className="w-full cursor-pointer accent-purple-500"
              />
            </div>

            {/* Kernel Size Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-gray-400">
                <span>KERNEL SIZE</span>
                <span className="text-purple-400 font-mono">{config.kernelSize || 3}x{config.kernelSize || 3}</span>
              </div>
              <input
                type="range"
                min="1"
                max="11"
                step="2"
                value={config.kernelSize || 3}
                onChange={(e) => handleConfigChange('kernelSize', parseInt(e.target.value))}
                className="w-full cursor-pointer accent-purple-500"
              />
            </div>

            {/* Stride Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-gray-400">
                <span>STRIDE</span>
                <span className="text-purple-400 font-mono">{config.stride || 1}</span>
              </div>
              <input
                type="range"
                min="1"
                max="4"
                step="1"
                value={config.stride || 1}
                onChange={(e) => handleConfigChange('stride', parseInt(e.target.value))}
                className="w-full cursor-pointer accent-purple-500"
              />
            </div>

            {/* Padding Field */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-gray-400 uppercase">PADDING</span>
              <div className="grid grid-cols-2 gap-2">
                {['same', 'valid'].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handleConfigChange('padding', p)}
                    className={`py-2 rounded-lg border text-xs font-bold capitalize transition-all ${
                      config.padding === p
                        ? 'bg-purple-600/10 border-purple-500/40 text-purple-400'
                        : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Activation Field */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-gray-400 uppercase">ACTIVATION</span>
              <select
                value={config.activation || 'ReLU'}
                onChange={(e) => handleConfigChange('activation', e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/5 rounded-xl text-xs text-gray-300 focus:outline-none focus:border-purple-500/35"
              >
                {['ReLU', 'Sigmoid', 'Tanh', 'Softmax', 'None'].map((act) => (
                  <option key={act} value={act} className="bg-[#11121d] text-white">
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
            <h4 className="text-[10px] font-extrabold uppercase text-gray-500 tracking-wider flex items-center gap-1.5 mb-2">
              <Sliders size={12} />
              <span>Pooling Parameters</span>
            </h4>

            {/* Pool Size */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-gray-400">
                <span>POOL SIZE</span>
                <span className="text-purple-400 font-mono">{config.poolSize || 2}x{config.poolSize || 2}</span>
              </div>
              <input
                type="range"
                min="2"
                max="8"
                step="1"
                value={config.poolSize || 2}
                onChange={(e) => handleConfigChange('poolSize', parseInt(e.target.value))}
                className="w-full cursor-pointer accent-purple-500"
              />
            </div>

            {/* Stride */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-gray-400">
                <span>STRIDE</span>
                <span className="text-purple-400 font-mono">{config.stride || 2}</span>
              </div>
              <input
                type="range"
                min="1"
                max="8"
                step="1"
                value={config.stride || 2}
                onChange={(e) => handleConfigChange('stride', parseInt(e.target.value))}
                className="w-full cursor-pointer accent-purple-500"
              />
            </div>
          </div>
        );

      case 'Dense':
        return (
          <div className="space-y-6">
            <h4 className="text-[10px] font-extrabold uppercase text-gray-500 tracking-wider flex items-center gap-1.5 mb-2">
              <Sliders size={12} />
              <span>Projection Parameters</span>
            </h4>

            {/* Units */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-gray-400">
                <span>PROJECTION UNITS</span>
                <span className="text-purple-400 font-mono">{config.units || 10}</span>
              </div>
              <input
                type="range"
                min="2"
                max="512"
                step="2"
                value={config.units || 10}
                onChange={(e) => handleConfigChange('units', parseInt(e.target.value))}
                className="w-full cursor-pointer accent-purple-500"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-80 border-l border-white/5 bg-[#090a0f] flex flex-col h-full select-none z-15 relative">
      
      {/* Header Info */}
      <div className="p-6 border-b border-white/5">
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-500 block">Properties</span>
        <h3 className="text-xl font-black text-white mt-1 flex items-center gap-2">
          <Info size={18} className="text-purple-400" />
          <span>Inspector</span>
        </h3>
      </div>

      {/* Main Configuration Panel body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* 1. IDENTITY SECTION */}
        <div className="space-y-3">
          <span className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider block">Identity</span>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase block">Layer Name</label>
            <input
              type="text"
              value={selectedNode.name}
              onChange={handleNameChange}
              className="w-full px-4 py-2.5 bg-[#11121d] border border-white/5 rounded-xl text-sm font-semibold text-white tracking-wide uppercase focus:outline-none focus:border-purple-500/35"
            />
          </div>
        </div>

        <div className="w-full h-[1px] bg-white/5"></div>

        {/* 2. DYNAMIC HYPERPARAMETERS SECTION */}
        {renderHyperparameters()}

        <div className="w-full h-[1px] bg-white/5"></div>

        {/* 3. TENSOR SHAPE PROPAGATION INFO */}
        <div className="space-y-4">
          <h4 className="text-[10px] font-extrabold uppercase text-gray-500 tracking-wider flex items-center gap-1.5">
            <Zap size={12} />
            <span>Tensor Flow State</span>
          </h4>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-[#11121d] border border-white/5 rounded-xl">
              <span className="text-[9px] text-gray-500 uppercase block">Input Tensor</span>
              <span className="text-xs font-bold text-gray-300 font-mono mt-1 block">
                {selectedNode.inputShape.length > 0 ? `[${selectedNode.inputShape.join(', ')}]` : 'None (Root)'}
              </span>
            </div>
            <div className="p-3 bg-[#11121d] border border-white/5 rounded-xl">
              <span className="text-[9px] text-gray-500 uppercase block">Output Tensor</span>
              <span className="text-xs font-bold text-gray-300 font-mono mt-1 block">
                {selectedNode.outputShape.length > 0 ? `[${selectedNode.outputShape.join(', ')}]` : 'Calculating...'}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Footer delete action */}
      <div className="p-4 border-t border-white/5 bg-black/10">
        <button
          onClick={() => removeNode(selectedNode.id)}
          className="w-full flex items-center justify-center gap-2 py-3 bg-rose-600/10 hover:bg-rose-600/20 border border-rose-500/20 text-rose-400 rounded-xl text-sm font-bold transition-all duration-200"
        >
          <Trash2 size={15} />
          <span>Delete Visual Block</span>
        </button>
      </div>

    </div>
  );
}
