'use client';

import React, { useState, useEffect } from 'react';
import { X, Layers, Cpu, Code, ArrowRight, Zap, Info, Plus, Minus, CheckCircle } from 'lucide-react';

interface BlockGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type BlockType = 'Conv2D' | 'MaxPool2D' | 'Flatten' | 'Dense' | 'BatchNorm' | 'Dropout';

export default function BlockGuideModal({ isOpen, onClose }: BlockGuideModalProps) {
  const [activeTab, setActiveTab] = useState<BlockType>('Conv2D');

  // Math Sandbox State
  const [inputSize, setInputSize] = useState(28);
  const [kernelSize, setKernelSize] = useState(3);
  const [stride, setStride] = useState(1);
  const [padding, setPadding] = useState(1);

  // Conv2D grid animation frame ticker
  const [convStep, setConvStep] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setConvStep((prev) => (prev + 1) % 9); // 3x3 positions
    }, 1500);
    return () => clearInterval(interval);
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  // Output dimension calculation formula
  const calculatedOutputSize = Math.floor((inputSize - kernelSize + 2 * padding) / stride) + 1;

  // Block definitions details
  const blockDetails: Record<BlockType, {
    title: string;
    badgeColor: string;
    description: string;
    mathFormula: string;
    pytorchSnippet: string;
    kerasSnippet: string;
    params: { name: string; description: string }[];
  }> = {
    Conv2D: {
      title: '2D Convolutional Layer',
      badgeColor: 'text-[#8ab4f8] border-[#8ab4f8]/25 bg-[#8ab4f8]/5',
      description: 'Applies a 2D convolution over an input signal composed of several input planes. By sliding a weight-kernel matrix over spatial dimensions, it extracts high-frequency features (edges, textures, shapes) while preserving coordinates mapping relationships.',
      mathFormula: 'Out(N_i, C_{out}) = Bias(C_{out}) + \\sum_{k=0}^{C_{in}-1} Weight(C_{out}, k) \\star Input(N_i, k)',
      pytorchSnippet: 'nn.Conv2d(in_channels=3, out_channels=64, kernel_size=3, stride=1, padding=1)',
      kerasSnippet: 'layers.Conv2D(filters=64, kernel_size=(3, 3), strides=(1, 1), padding="same")',
      params: [
        { name: 'in_channels', description: 'Number of channels in the input image (e.g. 3 for RGB).' },
        { name: 'out_channels', description: 'Number of channels produced by the convolution (number of feature filter arrays).' },
        { name: 'kernel_size', description: 'Size of the convolving kernel grid (e.g. 3x3 or 5x5).' },
        { name: 'stride', description: 'Stride rate of the kernel slide step (default is 1).' },
        { name: 'padding', description: 'Zero-padding added to both sides of the input height/width bounds.' }
      ]
    },
    MaxPool2D: {
      title: '2D Maximum Pooling Layer',
      badgeColor: 'text-[#c5a3ff] border-[#c5a3ff]/25 bg-[#c5a3ff]/5',
      description: 'Applies a 2D max pooling over an input signal. By partitioning spatial regions into grid quadrants and extracting only the maximum scalar value from each window, it reduces dimension sizes, downsamples features, and builds translation invariant structures.',
      mathFormula: 'Out(N_i, C, h, w) = \\max_{m=0}^{K-1} \\max_{n=0}^{K-1} Input(N_i, C, h \\cdot S + m, w \\cdot S + n)',
      pytorchSnippet: 'nn.MaxPool2d(kernel_size=2, stride=2, padding=0)',
      kerasSnippet: 'layers.MaxPooling2D(pool_size=(2, 2), strides=(2, 2))',
      params: [
        { name: 'kernel_size', description: 'The size of the window to take a max over.' },
        { name: 'stride', description: 'The stride of the window step (defaults to kernel_size).' },
        { name: 'padding', description: 'Implicit zero padding to be added on both sides.' }
      ]
    },
    Flatten: {
      title: 'Dimension Flattening Layer',
      badgeColor: 'text-[#ffe082] border-[#ffe082]/25 bg-[#ffe082]/5',
      description: 'Flattens a contiguous range of dimensions into a single flat vector. This is essential to bridge spatial grid features output by convolutional/pooling structures into dense classification projections.',
      mathFormula: 'Out(N, C \\cdot H \\cdot W) = Reshape(Input, [N, -1])',
      pytorchSnippet: 'nn.Flatten(start_dim=1, end_dim=-1)',
      kerasSnippet: 'layers.Flatten()',
      params: [
        { name: 'start_dim', description: 'First dimension to flatten (usually 1, leaving batch intact).' },
        { name: 'end_dim', description: 'Last dimension to flatten (usually -1, the end of the dimensions).' }
      ]
    },
    Dense: {
      title: 'Fully Connected Dense Layer',
      badgeColor: 'text-[#81c784] border-[#81c784]/25 bg-[#81c784]/5',
      description: 'Applies a linear transformation to the incoming vector. Every single input node connects to every output feature circle through individual trainable weight parameters, projecting dimensions to classification output logits.',
      mathFormula: 'Out = Input \\cdot Weight^T + Bias',
      pytorchSnippet: 'nn.Linear(in_features=512, out_features=10)',
      kerasSnippet: 'layers.Dense(units=10, activation="softmax")',
      params: [
        { name: 'in_features', description: 'Size of each input sample vector (units connecting from previous block).' },
        { name: 'out_features', description: 'Size of each output sample vector (classification projection categories count).' }
      ]
    },
    BatchNorm: {
      title: '2D Batch Normalization',
      badgeColor: 'text-[#4db6ac] border-[#4db6ac]/25 bg-[#4db6ac]/5',
      description: 'Applies Batch Normalization over a 4D tensor (a mini-batch of 2D inputs with additional channel dimension) to accelerate training. Standardizes activations inside each channel slice, stabilizing training passes.',
      mathFormula: 'Out = \\frac{Input - \\mathrm{E}[Input]}{\\sqrt{\\mathrm{Var}[Input] + \\epsilon}} \\cdot \\gamma + \\beta',
      pytorchSnippet: 'nn.BatchNorm2d(num_features=64)',
      kerasSnippet: 'layers.BatchNormalization()',
      params: [
        { name: 'num_features', description: 'Number of channels produced by the preceding convolution layer.' },
        { name: 'eps', description: 'A value added to the denominator for numerical stability (default 1e-5).' }
      ]
    },
    Dropout: {
      title: 'Random Dropout Layer',
      badgeColor: 'text-[#e57373] border-[#e57373]/25 bg-[#e57373]/5',
      description: 'During training, randomly zeroes some of the elements of the input tensor with probability p using samples from a Bernoulli distribution. Prevents co-adaptation of features, serving as an effective regularization mechanism.',
      mathFormula: 'Out = Input \\cdot Bernoulli(1 - p) \\cdot \\frac{1}{1-p}',
      pytorchSnippet: 'nn.Dropout(p=0.5)',
      kerasSnippet: 'layers.Dropout(rate=0.5)',
      params: [
        { name: 'p', description: 'Probability of an element to be zeroed (default is 0.5).' }
      ]
    }
  };

  // Helper to draw visual grids based on active block tabs
  const renderVisualIllustration = () => {
    switch (activeTab) {
      case 'Conv2D':
        // Calculate kernel coordinates inside 5x5 grid based on step
        const row = Math.floor(convStep / 3);
        const col = convStep % 3;

        return (
          <div className="flex flex-col items-center gap-6 py-4">
            <div className="flex items-center gap-8">
              {/* Input Grid (5x5) */}
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-wider mb-2">Input Grid (5x5)</span>
                <div className="grid grid-cols-5 gap-1.5 p-2 bg-[#202128] rounded-xl border border-[#3f4046]/45 relative">
                  {Array.from({ length: 25 }).map((_, idx) => {
                    const cellRow = Math.floor(idx / 5);
                    const cellCol = idx % 5;
                    const inKernel = cellRow >= row && cellRow < row + 3 && cellCol >= col && cellCol < col + 3;

                    return (
                      <div
                        key={idx}
                        className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold transition-all duration-300 ${
                          inKernel 
                            ? 'bg-[#8ab4f8]/20 border border-[#8ab4f8] text-[#8ab4f8] scale-[1.05] shadow-lg shadow-[#8ab4f8]/10' 
                            : 'bg-[#2b2d31] border border-[#3f4046]/35 text-[#5f6368]'
                        }`}
                      >
                        {inKernel ? Math.floor(Math.sin(idx) * 9 + 10) : '0'}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Convolving Filter Arrow */}
              <div className="flex flex-col items-center text-[#8ab4f8] animate-pulse">
                <span className="text-[9px] font-extrabold uppercase mb-1">3x3 Filter</span>
                <ArrowRight size={20} />
                <span className="text-[9px] font-mono text-[#9aa0a6] mt-1 font-bold">Stride=1</span>
              </div>

              {/* Output Grid (3x3) */}
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-wider mb-2">Feature Map (3x3)</span>
                <div className="grid grid-cols-3 gap-1.5 p-2 bg-[#202128] rounded-xl border border-[#3f4046]/45">
                  {Array.from({ length: 9 }).map((_, idx) => {
                    const cellRow = Math.floor(idx / 3);
                    const cellCol = idx % 3;
                    const isComputed = idx <= convStep;
                    const isActive = idx === convStep;

                    return (
                      <div
                        key={idx}
                        className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-mono font-black transition-all duration-300 ${
                          isActive
                            ? 'bg-[#81c784] border border-[#81c784] text-[#1e1f22] scale-110 shadow-lg'
                            : isComputed
                              ? 'bg-[#81c784]/20 border border-[#81c784]/40 text-[#81c784]'
                              : 'bg-[#2b2d31] border border-[#3f4046]/35 text-[#5f6368]'
                        }`}
                      >
                        {isComputed ? '64' : ''}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <p className="text-[10.5px] text-[#9aa0a6] leading-relaxed max-w-sm text-center font-medium">
              The 3x3 filter slides across the input. The dot-product is computed inside the highlight window to formulate a single output feature scalar.
            </p>
          </div>
        );

      case 'MaxPool2D':
        const poolActive = convStep % 4; // 4 quadrants
        const qRow = Math.floor(poolActive / 2) * 2;
        const qCol = (poolActive % 2) * 2;

        return (
          <div className="flex flex-col items-center gap-6 py-4">
            <div className="flex items-center gap-8">
              {/* Input grid (4x4) */}
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-wider mb-2">Input Grid (4x4)</span>
                <div className="grid grid-cols-4 gap-1.5 p-2 bg-[#202128] rounded-xl border border-[#3f4046]/45">
                  {Array.from({ length: 16 }).map((_, idx) => {
                    const cellRow = Math.floor(idx / 4);
                    const cellCol = idx % 4;
                    const inPool = cellRow >= qRow && cellRow < qRow + 2 && cellCol >= qCol && cellCol < qCol + 2;

                    // Hardcode some grid values to make max pooling clear
                    const values = [
                      12, 20, 8, 14,
                      9, 15, 17, 3,
                      5, 2, 9, 24,
                      18, 11, 6, 13
                    ];
                    const isMax = idx === 1 && poolActive === 0 || 
                                  idx === 6 && poolActive === 1 || 
                                  idx === 12 && poolActive === 2 || 
                                  idx === 11 && poolActive === 3;

                    return (
                      <div
                        key={idx}
                        className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold transition-all duration-300 ${
                          isMax && inPool
                            ? 'bg-[#c5a3ff] border border-[#c5a3ff] text-[#1e1f22] scale-105 shadow-md'
                            : inPool
                              ? 'bg-[#c5a3ff]/20 border border-[#c5a3ff]/40 text-[#c5a3ff]'
                              : 'bg-[#2b2d31] border border-[#3f4046]/35 text-[#5f6368]'
                        }`}
                      >
                        {values[idx]}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pool Arrow */}
              <div className="flex flex-col items-center text-[#c5a3ff] animate-pulse">
                <span className="text-[9px] font-extrabold uppercase mb-1">Max Pool (2x2)</span>
                <ArrowRight size={20} />
                <span className="text-[9px] font-mono text-[#9aa0a6] mt-1 font-bold">Stride=2</span>
              </div>

              {/* Output grid (2x2) */}
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-wider mb-2">Downsampled (2x2)</span>
                <div className="grid grid-cols-2 gap-1.5 p-2 bg-[#202128] rounded-xl border border-[#3f4046]/45">
                  {[20, 17, 18, 24].map((val, idx) => {
                    const isComputed = idx <= poolActive;
                    const isActive = idx === poolActive;

                    return (
                      <div
                        key={idx}
                        className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-mono font-black transition-all duration-300 ${
                          isActive
                            ? 'bg-[#c5a3ff] border border-[#c5a3ff] text-[#1e1f22] scale-110 shadow-lg'
                            : isComputed
                              ? 'bg-[#c5a3ff]/20 border border-[#c5a3ff]/40 text-[#c5a3ff]'
                              : 'bg-[#2b2d31] border border-[#3f4046]/35 text-[#5f6368]'
                        }`}
                      >
                        {isComputed ? val : ''}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <p className="text-[10.5px] text-[#9aa0a6] leading-relaxed max-w-sm text-center font-medium">
              The max pool sweeps 2x2 blocks independently without overlap. It selects only the **maximum numerical value** inside each block to downsample.
            </p>
          </div>
        );

      case 'Flatten':
        const activeFlatRow = convStep % 3;

        return (
          <div className="flex flex-col items-center gap-6 py-4">
            <div className="flex items-center gap-12">
              {/* Input matrix 3x3 */}
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-wider mb-2">3D Feature Grid (3x3)</span>
                <div className="grid grid-cols-3 gap-1.5 p-2 bg-[#202128] rounded-xl border border-[#3f4046]/45">
                  {Array.from({ length: 9 }).map((_, idx) => {
                    const cellRow = Math.floor(idx / 3);
                    const isRowActive = cellRow === activeFlatRow;

                    return (
                      <div
                        key={idx}
                        className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-mono font-bold transition-all duration-300 ${
                          isRowActive 
                            ? 'bg-[#ffe082]/20 border border-[#ffe082] text-[#ffe082] scale-[1.03]' 
                            : 'bg-[#2b2d31] border border-[#3f4046]/35 text-[#5f6368]'
                        }`}
                      >
                        {`F${idx + 1}`}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Reshape Arrow */}
              <div className="flex flex-col items-center text-[#ffe082] animate-pulse">
                <span className="text-[9px] font-extrabold uppercase mb-1">Unroll Vector</span>
                <ArrowRight size={20} />
              </div>

              {/* Output vector 9x1 */}
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-wider mb-2">1D Flat Output</span>
                <div className="flex flex-col gap-1 p-1.5 bg-[#202128] rounded-lg border border-[#3f4046]/45 max-h-32 overflow-y-auto">
                  {Array.from({ length: 9 }).map((_, idx) => {
                    const cellRow = Math.floor(idx / 3);
                    const isCellComp = cellRow <= activeFlatRow;

                    return (
                      <div
                        key={idx}
                        className={`w-16 h-4 rounded text-[9px] font-mono font-bold flex items-center justify-center transition-all duration-300 ${
                          isCellComp 
                            ? 'bg-[#ffe082]/10 border border-[#ffe082]/30 text-[#ffe082]' 
                            : 'bg-[#2b2d31] border border-[#3f4046]/20 text-[#5f6368]'
                        }`}
                      >
                        {isCellComp ? `F${idx + 1}` : ''}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <p className="text-[10.5px] text-[#9aa0a6] leading-relaxed max-w-sm text-center font-medium">
              Flattens spatial multi-channel tensor matrices down into a continuous linear vector, creating a flat 1D matrix layer context.
            </p>
          </div>
        );

      case 'Dense':
        const pulseOffset = convStep % 3;

        return (
          <div className="flex flex-col items-center gap-6 py-4">
            <div className="flex items-center gap-16 relative py-4 px-2">
              {/* Input Nodes */}
              <div className="flex flex-col gap-4">
                {[1, 2, 3].map((val) => (
                  <div 
                    key={val} 
                    className="w-5 h-5 rounded-full border border-[#81c784]/40 bg-[#81c784]/15 flex items-center justify-center text-[9px] font-bold text-[#81c784]"
                  >
                    {`X${val}`}
                  </div>
                ))}
              </div>

              {/* Connecting Weights illustration lines with dynamic pulsing highlights */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <svg className="w-full h-full stroke-[#3f4046]/40" strokeWidth="1">
                  <line x1="20" y1="20" x2="160" y2="30" />
                  <line x1="20" y1="20" x2="160" y2="70" />
                  
                  <line x1="20" y1="60" x2="160" y2="30" stroke={pulseOffset === 1 ? '#81c784' : '#3f4046/40'} strokeWidth={pulseOffset === 1 ? '2' : '1'} className="transition-all duration-300" />
                  <line x1="20" y1="60" x2="160" y2="70" />
                  
                  <line x1="20" y1="100" x2="160" y2="30" />
                  <line x1="20" y1="100" x2="160" y2="70" stroke={pulseOffset === 2 ? '#81c784' : '#3f4046/40'} strokeWidth={pulseOffset === 2 ? '2' : '1'} className="transition-all duration-300" />
                </svg>
              </div>

              {/* Output Nodes */}
              <div className="flex flex-col gap-6 pl-24">
                {[1, 2].map((val) => (
                  <div 
                    key={val} 
                    className={`w-6 h-6 rounded-full border flex items-center justify-center text-[10px] font-bold transition-all duration-500 ${
                      pulseOffset === val 
                        ? 'bg-[#81c784] border-[#81c784] text-[#1e1f22] scale-105 shadow-md shadow-[#81c784]/25' 
                        : 'bg-[#2b2d31] border-[#3f4046]/35 text-[#9aa0a6]'
                    }`}
                  >
                    {`Y${val}`}
                  </div>
                ))}
              </div>
            </div>
            <p className="text-[10.5px] text-[#9aa0a6] leading-relaxed max-w-sm text-center font-medium">
              Every input node connects to every output feature block. Calculations multiply weights and bias values to project incoming nodes to classification probabilities.
            </p>
          </div>
        );

      case 'BatchNorm':
        return (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="flex items-center gap-6 bg-[#202128] border border-[#3f4046]/45 p-4 rounded-2xl max-w-md">
              <div className="space-y-1">
                <span className="text-[9px] font-extrabold text-red-400 uppercase">Input Activations</span>
                <div className="p-2 bg-[#2b2d31] rounded-lg text-xs font-mono font-semibold text-red-300">
                  Mean = 3.82<br />Var = 14.50
                </div>
              </div>
              <div className="text-[#4db6ac] animate-pulse">
                <Zap size={18} />
                <span className="text-[9px] font-mono block mt-1 font-bold">Standardize</span>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] font-extrabold text-green-400 uppercase">Normalized (Scale & Shift)</span>
                <div className="p-2 bg-[#2b2d31] rounded-lg text-xs font-mono font-semibold text-green-300">
                  Mean = 0.00<br />Var = 1.00
                </div>
              </div>
            </div>
            <p className="text-[10.5px] text-[#9aa0a6] leading-relaxed max-w-sm font-medium">
              Applies standard normal scaling to channel values. Ensures that every layer in deep graphs trains on features with stable distributions, accelerating convergence.
            </p>
          </div>
        );

      case 'Dropout':
        const drop1 = convStep % 3 === 0;
        const drop2 = convStep % 3 === 1;
        const drop3 = convStep % 3 === 2;

        return (
          <div className="flex flex-col items-center gap-6 py-4">
            <div className="flex items-center gap-8 text-center">
              <div className="flex flex-col gap-3">
                <span className="text-[9px] font-extrabold text-[#9aa0a6] uppercase">In Layers</span>
                <div className="w-5 h-5 rounded-full bg-[#e57373]/20 border border-[#e57373]/40 flex items-center justify-center text-[9px] font-bold text-[#e57373]">1.2</div>
                <div className="w-5 h-5 rounded-full bg-[#e57373]/20 border border-[#e57373]/40 flex items-center justify-center text-[9px] font-bold text-[#e57373]">-0.5</div>
                <div className="w-5 h-5 rounded-full bg-[#e57373]/20 border border-[#e57373]/40 flex items-center justify-center text-[9px] font-bold text-[#e57373]">2.4</div>
              </div>
              
              <div className="text-[#e57373] animate-pulse">
                <Zap size={18} />
                <span className="text-[9px] font-mono block mt-1 font-bold">p = 0.33</span>
              </div>

              <div className="flex flex-col gap-3">
                <span className="text-[9px] font-extrabold text-[#9aa0a6] uppercase">Out Vector</span>
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center text-[9px] font-bold transition-all duration-300 ${
                  drop1 
                    ? 'bg-[#1a1b20]/50 border-red-500/25 text-red-500/50 line-through' 
                    : 'bg-[#e57373]/20 border-[#e57373] text-[#e57373]'
                }`}>
                  {drop1 ? '0.0' : '1.8'}
                </div>
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center text-[9px] font-bold transition-all duration-300 ${
                  drop2 
                    ? 'bg-[#1a1b20]/50 border-red-500/25 text-red-500/50 line-through' 
                    : 'bg-[#e57373]/20 border-[#e57373] text-[#e57373]'
                }`}>
                  {drop2 ? '0.0' : '-0.7'}
                </div>
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center text-[9px] font-bold transition-all duration-300 ${
                  drop3 
                    ? 'bg-[#1a1b20]/50 border-red-500/25 text-red-500/50 line-through' 
                    : 'bg-[#e57373]/20 border-[#e57373] text-[#e57373]'
                }`}>
                  {drop3 ? '0.0' : '3.6'}
                </div>
              </div>
            </div>
            <p className="text-[10.5px] text-[#9aa0a6] leading-relaxed max-w-sm font-medium">
              Randomly sets input units to 0 with probability `p` during training forward passes. Injects standard regularization noise to block path dependencies.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none">
      {/* Modal Main Panel Box */}
      <div className="w-full max-w-5xl rounded-3xl border border-[#3f4046]/45 flex flex-col h-[85vh] shadow-2xl relative overflow-hidden bg-[#16171a] font-sans">
        
        {/* Glowing border top accent */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#8ab4f8]/40 to-transparent"></div>

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#202128] border-b border-[#3f4046]/45 relative">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#8ab4f8]/10 border border-[#8ab4f8]/20 rounded-xl text-[#8ab4f8]">
              <Layers size={18} />
            </div>
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-wider">Visual Block Reference Guide</h2>
              <p className="text-[10px] text-[#9aa0a6] font-bold">Illustrative behavior, parameters, and dimension formulas for core layers</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-[#2b2d31] rounded-xl text-[#9aa0a6] hover:text-white transition-all cursor-pointer border-none bg-transparent"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Content Split Screen */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Block Selection Sidebar */}
          <aside className="w-60 bg-[#14151a] border-r border-[#3f4046]/45 p-4 flex flex-col gap-2 shrink-0 overflow-y-auto">
            <span className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-widest pl-2 mb-2">Layer Types</span>
            {(Object.keys(blockDetails) as BlockType[]).map((type) => {
              const isActive = activeTab === type;
              const details = blockDetails[type];

              return (
                <button
                  key={type}
                  onClick={() => setActiveTab(type)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold text-left transition-all border-none bg-transparent cursor-pointer ${
                    isActive 
                      ? 'bg-[#8ab4f8]/10 text-[#8ab4f8] shadow-sm' 
                      : 'text-[#9aa0a6] hover:bg-[#202128] hover:text-[#e3e3e3]'
                  }`}
                >
                  <span>{type}</span>
                  <span className={`text-[8.5px] px-1.5 py-0.5 rounded-md font-mono border font-extrabold uppercase ${details.badgeColor}`}>
                    Core
                  </span>
                </button>
              );
            })}
          </aside>

          {/* Right Illustrative Work Panel */}
          <main className="flex-1 overflow-y-auto p-8 flex flex-col gap-6">
            {/* Layer Meta Info */}
            <div className="space-y-2 text-left">
              <h3 className="text-lg font-black text-white flex items-center gap-2.5">
                {blockDetails[activeTab].title}
              </h3>
              <p className="text-xs text-[#9aa0a6] leading-relaxed">
                {blockDetails[activeTab].description}
              </p>
            </div>

            {/* Illustration Canvas Display Card */}
            <div className="border border-[#3f4046]/35 bg-[#1b1c22]/50 p-6 rounded-3xl backdrop-blur-xl relative overflow-hidden flex flex-col items-center">
              <div className="absolute top-3 left-4 flex items-center gap-1.5 text-[9px] text-[#9aa0a6] font-bold uppercase tracking-wider">
                <Info size={11} className="text-[#8ab4f8]" />
                <span>Live Interactive Simulation Map</span>
              </div>
              {renderVisualIllustration()}
            </div>

            {/* Downstream Mathematics / Dimensions Calculator Sandbox */}
            {(activeTab === 'Conv2D' || activeTab === 'MaxPool2D') && (
              <div className="border border-[#3f4046]/35 p-6 rounded-3xl bg-[#202128]/45 relative text-left">
                <h4 className="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-1.5">
                  <Cpu size={14} className="text-[#8ab4f8]" />
                  Downstream Spatial Calculator Sandbox
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div className="p-3 bg-[#1b1c22] border border-[#3f4046]/35 rounded-xl space-y-1.5">
                    <span className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-wider block">Input Dimension (I)</span>
                    <div className="flex items-center justify-between">
                      <button 
                        onClick={() => setInputSize(prev => Math.max(8, prev - 1))}
                        className="p-1 hover:bg-[#2b2d31] rounded-lg text-white border-none bg-transparent cursor-pointer"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="text-sm font-black text-[#8ab4f8] font-mono">{inputSize}</span>
                      <button 
                        onClick={() => setInputSize(prev => Math.min(128, prev + 1))}
                        className="p-1 hover:bg-[#2b2d31] rounded-lg text-white border-none bg-transparent cursor-pointer"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-[#1b1c22] border border-[#3f4046]/35 rounded-xl space-y-1.5">
                    <span className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-wider block">Kernel size (K)</span>
                    <div className="flex items-center justify-between">
                      <button 
                        onClick={() => setKernelSize(prev => Math.max(1, prev - 2))}
                        className="p-1 hover:bg-[#2b2d31] rounded-lg text-white border-none bg-transparent cursor-pointer"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="text-sm font-black text-[#c5a3ff] font-mono">{kernelSize}</span>
                      <button 
                        onClick={() => setKernelSize(prev => Math.min(11, prev + 2))}
                        className="p-1 hover:bg-[#2b2d31] rounded-lg text-white border-none bg-transparent cursor-pointer"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-[#1b1c22] border border-[#3f4046]/35 rounded-xl space-y-1.5">
                    <span className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-wider block">Stride (S)</span>
                    <div className="flex items-center justify-between">
                      <button 
                        onClick={() => setStride(prev => Math.max(1, prev - 1))}
                        className="p-1 hover:bg-[#2b2d31] rounded-lg text-white border-none bg-transparent cursor-pointer"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="text-sm font-black text-[#ffe082] font-mono">{stride}</span>
                      <button 
                        onClick={() => setStride(prev => Math.min(8, prev + 1))}
                        className="p-1 hover:bg-[#2b2d31] rounded-lg text-white border-none bg-transparent cursor-pointer"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-[#1b1c22] border border-[#3f4046]/35 rounded-xl space-y-1.5">
                    <span className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-wider block">Padding (P)</span>
                    <div className="flex items-center justify-between">
                      <button 
                        onClick={() => setPadding(prev => Math.max(0, prev - 1))}
                        className="p-1 hover:bg-[#2b2d31] rounded-lg text-white border-none bg-transparent cursor-pointer"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="text-sm font-black text-[#81c784] font-mono">{padding}</span>
                      <button 
                        onClick={() => setPadding(prev => Math.min(8, prev + 1))}
                        className="p-1 hover:bg-[#2b2d31] rounded-lg text-white border-none bg-transparent cursor-pointer"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-[#1b1c22]/80 border border-[#3f4046]/35 rounded-xl flex items-center justify-between flex-wrap gap-4">
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-extrabold text-[#9aa0a6] uppercase tracking-wider">Arithmetic Resolution Formula</span>
                    <div className="text-xs font-mono text-white font-bold">
                      O = ⌊(I - K + 2P)/S⌋ + 1 
                      <span className="text-[#8ab4f8] ml-2">
                        → ⌊({inputSize} - {kernelSize} + 2({padding}))/{stride}⌋ + 1
                      </span>
                    </div>
                  </div>
                  <div className="px-4 py-2 bg-[#81c784]/15 border border-[#81c784]/20 rounded-xl text-center">
                    <span className="text-[8.5px] font-extrabold text-[#81c784] uppercase tracking-widest block">Output size (O)</span>
                    <span className="text-lg font-black text-[#81c784] font-mono">{calculatedOutputSize} px</span>
                  </div>
                </div>
              </div>
            )}

            {/* Detailed Parameters Fields */}
            <div className="border border-[#3f4046]/35 rounded-3xl overflow-hidden text-left bg-[#1e1f26] flex flex-col max-h-[180px]">
              <div className="px-4 py-2.5 bg-[#202128] border-b border-[#3f4046]/45 text-[10px] uppercase font-black tracking-wider text-[#9aa0a6] shrink-0">
                Hyperparameter Config Definitions
              </div>
              <div className="divide-y divide-[#3f4046]/35 text-xs font-medium text-[#e3e3e3] overflow-y-auto flex-1">
                {blockDetails[activeTab].params.map((param) => (
                  <div key={param.name} className="p-4 flex gap-4 items-start">
                    <span className="font-mono text-[#8ab4f8] font-bold bg-[#8ab4f8]/5 border border-[#8ab4f8]/15 px-2 py-0.5 rounded-lg shrink-0 select-text">
                      {param.name}
                    </span>
                    <span className="text-[#9aa0a6] leading-relaxed">
                      {param.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Code snippets */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-[#3f4046]/35 bg-[#17181c] overflow-hidden text-left shadow-xl">
                <div className="px-4 py-2 bg-[#202128] border-b border-[#3f4046]/45 text-[9px] uppercase font-black tracking-wider text-[#ff6633] flex items-center justify-between">
                  <span>PyTorch Compilation Translation</span>
                  <CheckCircle size={10} className="text-[#ff6633]" />
                </div>
                <pre className="p-4 overflow-x-auto text-[10.5px] font-mono text-[#e3e3e3] leading-relaxed bg-[#17181c]/80 select-text">
                  <code>{blockDetails[activeTab].pytorchSnippet}</code>
                </pre>
              </div>

              <div className="rounded-2xl border border-[#3f4046]/35 bg-[#17181c] overflow-hidden text-left shadow-xl">
                <div className="px-4 py-2 bg-[#202128] border-b border-[#3f4046]/45 text-[9px] uppercase font-black tracking-wider text-[#ff9000] flex items-center justify-between">
                  <span>Keras TensorFlow Translation</span>
                  <CheckCircle size={10} className="text-[#ff9000]" />
                </div>
                <pre className="p-4 overflow-x-auto text-[10.5px] font-mono text-[#e3e3e3] leading-relaxed bg-[#17181c]/80 select-text">
                  <code>{blockDetails[activeTab].kerasSnippet}</code>
                </pre>
              </div>
            </div>

          </main>
        </div>
      </div>
    </div>
  );
}
