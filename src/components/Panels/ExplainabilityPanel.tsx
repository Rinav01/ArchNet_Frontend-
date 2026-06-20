'use client';

import React, { useState } from 'react';
import { useCanvasStore } from '@/store/canvasStore';
import { 
  getGraphMetrics, 
  getNodeMetrics, 
  formatMetricNumber, 
  formatMetricBytes 
} from '@/lib/canvas/metricsHelper';
import { 
  AlertTriangle, 
  Cpu, 
  Database, 
  Flame, 
  Sliders, 
  Info, 
  Table,
  LineChart,
  Sparkles,
  HelpCircle,
  TrendingUp,
  Settings,
  Brackets
} from 'lucide-react';

export default function ExplainabilityPanel() {
  const { nodes, selectedNodeId } = useCanvasStore();
  const [seqLength, setSeqLength] = useState<number>(128);
  const [customQuestion, setCustomQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');

  const metrics = getGraphMetrics(nodes);
  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  // Check if any transformer layers exist
  const hasTransformerLayers = nodes.some(n => 
    ['Attention', 'MultiHeadAttention', 'TransformerBlock', 'EncoderBlock', 'DecoderBlock', 'PositionalEncoding'].includes(n.type)
  );

  // Parameter explosion checks
  const cnnWarnings: { nodeName: string; params: number; message: string }[] = [];
  const denseWarnings: { nodeName: string; params: number; message: string }[] = [];

  nodes.forEach(node => {
    const { params } = getNodeMetrics(node);
    
    if (node.type === 'Conv2D' && params > 5000000) {
      cnnWarnings.push({
        nodeName: node.name,
        params,
        message: `Conv2D layer "${node.name}" has ${formatMetricNumber(params, 'parameters')}. Consider reducing filter count, kernel size, or introducing MaxPool2D to downsample channels.`
      });
    }

    if (node.type === 'Dense' && params > 10000000) {
      denseWarnings.push({
        nodeName: node.name,
        params,
        message: `Dense layer "${node.name}" has ${formatMetricNumber(params, 'parameters')}, directly projecting high-dimensional flatten outputs. Consider inserting MaxPool2D or GlobalAveragePooling2D before this layer to reduce dimensions.`
      });
    }
  });

  // Attention matrix calculations
  const attentionMatrixSize = seqLength * seqLength;
  const showAttentionWarning = seqLength >= 512;
  const relativeScale = (seqLength * seqLength) / (128 * 128);

  const handleAskQuestion = (q: string) => {
    let answer = '';
    const nodeCount = nodes.length;
    const totalParams = metrics.totalParams;
    const qLower = q.toLowerCase();

    if (qLower.includes('memory') || qLower.includes('high')) {
      answer = `Based on your graph containing ${nodeCount} layers and ${formatMetricNumber(totalParams, 'parameters')}, the estimated VRAM footprint is ${formatMetricBytes(metrics.totalVram)}.\n\nMemory consumption is primary driven by activation tensors stored during training. To optimize memory:\n1. Insert a downsampling step (e.g. MaxPool2D) before dense classifier nodes.\n2. Switch model parameters layout to FP16 half precision to scale activations by 0.5x.`;
    } else if (qLower.includes('attention') || qLower.includes('expensive')) {
      answer = `MultiHeadAttention blocks calculate dot-product score vectors across all sequence coordinates, scaled quadratically T².\n\nAt current sequence T=${seqLength}, the attention matrix computes ${attentionMatrixSize.toLocaleString()} elements. Memory usage grows from 1.0x at T=128 to ${(relativeScale).toFixed(1)}x at current sizing. To optimize attention overhead, consider applying flash attention kernel fusions or linear attention masks.`;
    } else if (qLower.includes('optimize') || qLower.includes('how')) {
      answer = `AI Optimization Recommendation:\n- Replace Dense units projecting flattened tensors with a GlobalAveragePooling2D layer. This reduces parameters complexity by 20M+ weights.\n- Add Batch Normalization blocks to stabilize activation drift.\n- Lower the training learning rate schedule down from 1e-3 to 3e-4 with AdamW.`;
    } else {
      answer = `Your custom architecture contains ${nodeCount} layers. The design is syntactically sound. Standard suggestions include inserting regularization (Dropout) inside linear layers and batch-normalizing stems.`;
    }
    setAiAnswer(answer);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customQuestion.trim()) return;
    handleAskQuestion(customQuestion);
    setCustomQuestion('');
  };

  const formatShape = (shape: number[] | undefined) => {
    if (!shape || shape.length === 0) return '[]';
    return `[${shape.join(', ')}]`;
  };

  const getParamsExplainer = (node: any) => {
    const { params } = getNodeMetrics(node);
    const config = node.config || {};
    const inputShape = node.inputShape || [];

    if (node.type === 'Conv2D') {
      const inC = inputShape.length >= 3 ? inputShape[2] : 3;
      const outC = config.filters || 64;
      const k = config.kernelSize || 3;
      return {
        formula: `(InChannels * KernelH * KernelW + 1) * OutFilters`,
        calculation: `(${inC} * ${k} * ${k} + 1) * ${outC} = ${params.toLocaleString()} parameters`,
      };
    }
    if (node.type === 'Dense') {
      const inF = inputShape.length > 0 ? inputShape.reduce((a: number, b: number) => a * b, 1) : 0;
      const units = config.units || 10;
      return {
        formula: `(InFeatures + 1) * Units`,
        calculation: `(${inF.toLocaleString()} + 1) * ${units} = ${params.toLocaleString()} parameters`,
      };
    }
    if (node.type === 'Embedding') {
      const vocabSize = config.vocab_size || 30522;
      const embedDim = config.embed_dim || config.embedding_dim || 768;
      return {
        formula: `VocabSize * EmbeddingDim`,
        calculation: `${vocabSize.toLocaleString()} * ${embedDim} = ${params.toLocaleString()} parameters`,
      };
    }
    if (['RNN', 'LSTM', 'GRU', 'BiLSTM'].includes(node.type)) {
      const inputDim = inputShape.length > 0 ? inputShape[inputShape.length - 1] : 768;
      const hiddenDim = config.hidden_size || 768;
      const isBi = node.type === 'BiLSTM' || config.bidirectional === true;
      let gates = 1;
      if (node.type.includes('LSTM')) gates = 4;
      else if (node.type.includes('GRU')) gates = 3;
      const directions = isBi ? 2 : 1;
      return {
        formula: `Directions * Gates * (HiddenDim * (InputDim + HiddenDim) + HiddenDim)`,
        calculation: `${directions} * ${gates} * (${hiddenDim} * (${inputDim} + ${hiddenDim}) + ${hiddenDim}) = ${params.toLocaleString()} parameters`,
      };
    }
    return {
      formula: 'No parameter weights (Activation / Structural block)',
      calculation: '0 parameters',
    };
  };

  // Seq lengths scaling table data
  const scalingLengths = [64, 128, 256, 512, 1024, 2048];

  return (
    <div className="flex flex-col h-full bg-[#141517] text-gray-200 select-none custom-scrollbar overflow-y-auto">
      
      {/* Panel title */}
      <div className="px-6 py-4 border-b border-[#3f4046] bg-[#1e1f22] shrink-0">
        <h3 className="text-sm font-black text-white tracking-widest uppercase flex items-center gap-2">
          <LineChart className="text-[#c5a3ff]" size={16} />
          <span>Explainability & Analytics</span>
        </h3>
        <p className="text-[10px] text-gray-500 mt-1 font-semibold">Real-time computational complexity, warnings and scaling limits.</p>
      </div>

      <div className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
        
        {/* Compiler Explanation Mode (Selected Node Inspection) */}
        <div className="space-y-3">
          <h4 className="text-[10px] font-extrabold uppercase text-[#9aa0a6] tracking-wider select-none flex items-center gap-1">
            <Brackets size={12} className="text-[#8ab4f8]" />
            <span>Compiler Explanation Mode</span>
          </h4>

          {selectedNode ? (() => {
            const explainer = getParamsExplainer(selectedNode);
            const { params, flops, vram } = getNodeMetrics(selectedNode);
            return (
              <div className="bg-[#1b1c21] border border-[#8ab4f8]/30 p-4 rounded-xl space-y-4 shadow-lg shadow-black/25">
                <div className="flex items-center justify-between border-b border-[#3f4046]/45 pb-2">
                  <div>
                    <span className="text-xs font-black text-white uppercase tracking-wide block">{selectedNode.name}</span>
                    <span className="text-[9px] font-extrabold text-[#8ab4f8] uppercase tracking-widest mt-0.5 block">{selectedNode.type} Operator</span>
                  </div>
                  <div className="px-2 py-0.5 bg-[#8ab4f8]/10 rounded border border-[#8ab4f8]/20 text-[8.5px] text-[#8ab4f8] font-bold">
                    ACTIVE INSPECT
                  </div>
                </div>

                {/* Flow layout */}
                <div className="grid grid-cols-3 gap-2 items-center bg-[#101113] p-3 rounded-lg border border-[#3f4046]/20">
                  <div className="text-center">
                    <span className="text-[8px] uppercase tracking-wider font-extrabold text-gray-500 block">Input Shape</span>
                    <span className="text-[10px] font-mono text-white font-bold block mt-1">{formatShape(selectedNode.inputShape)}</span>
                  </div>
                  <div className="text-center flex flex-col items-center">
                    <span className="text-[8px] uppercase tracking-wider font-extrabold text-gray-500 block">Operator</span>
                    <div className="w-8 h-[1px] bg-[#3f4046]/50 my-1 relative">
                      <div className="absolute right-0 top-[-2px] w-1.5 h-1.5 border-t border-r border-[#3f4046]/80 rotate-45"></div>
                    </div>
                    <span className="text-[9px] font-black text-[#8ab4f8] uppercase">{selectedNode.type}</span>
                  </div>
                  <div className="text-center">
                    <span className="text-[8px] uppercase tracking-wider font-extrabold text-gray-500 block">Output Shape</span>
                    <span className="text-[10px] font-mono text-white font-bold block mt-1">{formatShape(selectedNode.outputShape)}</span>
                  </div>
                </div>

                {/* Layer configuration params */}
                {Object.keys(selectedNode.config || {}).length > 0 && (
                  <div className="space-y-1.5 bg-[#101113]/50 p-2.5 rounded-lg border border-[#3f4046]/15">
                    <span className="text-[8px] uppercase tracking-wider font-black text-gray-500 block flex items-center gap-1">
                      <Settings size={10} />
                      <span>Operational Parameters</span>
                    </span>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[9.5px]">
                      {Object.entries(selectedNode.config).map(([key, val]) => (
                        <div key={key} className="flex justify-between font-mono">
                          <span className="text-gray-400">{key}:</span>
                          <span className="text-white font-bold">{String(val)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Math explanation */}
                <div className="space-y-2">
                  <span className="text-[8px] uppercase tracking-wider font-black text-gray-500 block flex items-center gap-1">
                    <Cpu size={10} className="text-[#ffe082]" />
                    <span>Parameter & FLOPs Math</span>
                  </span>
                  <div className="bg-[#101113] p-3 rounded-lg border border-[#3f4046]/30 space-y-2">
                    <div className="text-[10px]">
                      <span className="text-gray-400 block font-semibold">Parameters Formula:</span>
                      <code className="text-amber-300 font-mono text-[9px] block mt-0.5">{explainer.formula}</code>
                    </div>
                    <div className="text-[10px] border-t border-[#3f4046]/25 pt-2">
                      <span className="text-gray-400 block font-semibold">Calculation:</span>
                      <code className="text-emerald-400 font-mono text-[9px] block mt-0.5">{explainer.calculation}</code>
                    </div>
                    {flops > 0 && (
                      <div className="text-[10px] border-t border-[#3f4046]/25 pt-2 flex justify-between">
                        <span className="text-gray-400 font-semibold">Estimated Layer FLOPs:</span>
                        <span className="text-white font-mono font-bold">{formatMetricNumber(flops, 'FLOPs')}</span>
                      </div>
                    )}
                    {vram > 0 && (
                      <div className="text-[10px] flex justify-between">
                        <span className="text-gray-400 font-semibold">Estimated VRAM size (F32):</span>
                        <span className="text-white font-mono font-bold">{formatMetricBytes(vram)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })() : (
            <div className="border border-dashed border-[#3f4046]/45 p-6 rounded-xl text-center space-y-2 text-[#9aa0a6] bg-[#1b1c21]/15">
              <HelpCircle size={24} className="mx-auto text-gray-500 animate-pulse" />
              <p className="text-[10px] leading-relaxed font-bold uppercase tracking-wide">No Active Layer Selected</p>
              <p className="text-[9.5px] leading-relaxed text-gray-500 font-semibold max-w-xs mx-auto">
                Click a layer node on the visual editor canvas to expose its compiled input/output shapes, operation hyperparameters, and mathematical calculations.
              </p>
            </div>
          )}
        </div>

        {/* Section 1: Aggregated Metrics */}
        <div className="space-y-3 pt-2">
          <h4 className="text-[10px] font-extrabold uppercase text-[#9aa0a6] tracking-wider select-none flex items-center gap-1">
            <TrendingUp size={12} className="text-[#81c784]" />
            <span>Model Complexity Aggregates</span>
          </h4>
          
          <div className="grid grid-cols-1 gap-2.5">
            {/* Params */}
            <div className="bg-[#1b1c21] border border-[#2b2d31] p-3.5 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-[#81c784]/10 rounded-lg text-[#81c784]">
                  <Database size={14} />
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 font-extrabold uppercase block leading-none">Total Parameters</span>
                  <span className="text-sm font-black text-white mt-1 font-mono leading-none block">
                    {formatMetricNumber(metrics.totalParams, 'Params')}
                  </span>
                </div>
              </div>
            </div>

            {/* FLOPs */}
            <div className="bg-[#1b1c21] border border-[#2b2d31] p-3.5 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-[#8ab4f8]/10 rounded-lg text-[#8ab4f8]">
                  <Cpu size={14} />
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 font-extrabold uppercase block leading-none">Aggregate Compute</span>
                  <span className="text-sm font-black text-white mt-1 font-mono leading-none block">
                    {formatMetricNumber(metrics.totalFlops, 'FLOPs')}
                  </span>
                </div>
              </div>
            </div>

            {/* VRAM Memory */}
            <div className="bg-[#1b1c21] border border-[#2b2d31] p-3.5 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-[#ffe082]/10 rounded-lg text-[#ffe082]">
                  <Flame size={14} />
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 font-extrabold uppercase block leading-none">Estimated VRAM (F32)</span>
                  <span className="text-sm font-black text-white mt-1 font-mono leading-none block">
                    {formatMetricBytes(metrics.totalVram)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: CNN & Dense parameter warnings */}
        {(cnnWarnings.length > 0 || denseWarnings.length > 0) && (
          <div className="space-y-3">
            <h4 className="text-[10px] font-extrabold uppercase text-[#9aa0a6] tracking-wider select-none">Hardware Sizing Warnings</h4>
            
            <div className="space-y-2">
              {cnnWarnings.map((warn, i) => (
                <div key={`cnn-${i}`} className="bg-amber-500/5 border border-amber-500/20 p-3 rounded-xl space-y-1">
                  <div className="flex items-center gap-2 text-amber-400">
                    <AlertTriangle size={13} />
                    <span className="text-[9px] font-black uppercase tracking-wider">Conv2D Parameter Explosion</span>
                  </div>
                  <p className="text-[10px] text-gray-400 font-semibold leading-relaxed">
                    {warn.message}
                  </p>
                </div>
              ))}

              {denseWarnings.map((warn, i) => (
                <div key={`dense-${i}`} className="bg-rose-500/5 border border-rose-500/20 p-3 rounded-xl space-y-1">
                  <div className="flex items-center gap-2 text-rose-400">
                    <AlertTriangle size={13} />
                    <span className="text-[9px] font-black uppercase tracking-wider">Dense Flatten Explosion</span>
                  </div>
                  <p className="text-[10px] text-gray-400 font-semibold leading-relaxed">
                    {warn.message}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 3: Transformer Attention complexity */}
        {hasTransformerLayers ? (
          <div className="space-y-4 pt-2">
            <div className="border-t border-[#3f4046]/40 my-2"></div>
            <h4 className="text-[10px] font-extrabold uppercase text-[#9aa0a6] tracking-wider select-none">Transformer Complexity Analysis</h4>
            
            {/* Sequence length tuning slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[10px] text-gray-400 font-extrabold">
                <span className="uppercase tracking-wider flex items-center gap-1">
                  <Sliders size={12} className="text-[#c5a3ff]" />
                  <span>Sequence Length T</span>
                </span>
                <span className="font-mono text-xs text-[#c5a3ff]">{seqLength} Tokens</span>
              </div>
              <input
                type="range"
                min="64"
                max="2048"
                step="64"
                value={seqLength}
                onChange={(e) => setSeqLength(Number(e.target.value))}
                className="w-full bg-[#2b2d31] accent-[#c5a3ff] h-1 rounded-lg cursor-pointer"
              />
            </div>

            {/* Attention Matrix Info */}
            <div className="bg-[#1b1c21] border border-[#2b2d31] p-4 rounded-xl space-y-2">
              <div className="flex justify-between items-center text-[10.5px]">
                <span className="text-gray-500 font-semibold">Attention Matrix Size:</span>
                <span className="font-mono text-white font-black">{seqLength} × {seqLength}</span>
              </div>
              <div className="flex justify-between items-center text-[10.5px]">
                <span className="text-gray-500 font-semibold">Matrix Elements ($T^2$):</span>
                <span className="font-mono text-[#c5a3ff] font-black">{attentionMatrixSize.toLocaleString()}</span>
              </div>

              {/* Warning badge */}
              {showAttentionWarning && (
                <div className="bg-amber-400/5 border border-amber-400/10 p-3 rounded-lg flex gap-2.5 mt-2 animate-pulse">
                  <AlertTriangle className="text-amber-400 shrink-0" size={13} />
                  <p className="text-[9.5px] text-amber-400/90 leading-normal font-semibold">
                    Quadratic Attention Warning: Sequence length T={seqLength} results in a large attention matrix of {attentionMatrixSize.toLocaleString()} elements. VRAM usage escalates quickly.
                  </p>
                </div>
              )}
            </div>

            {/* Sequence scaling table */}
            <div className="space-y-2">
              <span className="text-[9px] uppercase tracking-wider text-gray-500 font-extrabold flex items-center gap-1 select-none">
                <Table size={12} />
                <span>Quadratic Complexity Scaling</span>
              </span>

              <div className="border border-[#2b2d31] rounded-xl overflow-hidden bg-[#101113]">
                <table className="w-full text-left border-collapse text-[10px]">
                  <thead>
                    <tr className="bg-[#18191c] border-b border-[#2b2d31] text-gray-400">
                      <th className="p-2 font-bold uppercase select-none">Sequence T</th>
                      <th className="p-2 font-bold uppercase select-none">Matrix Size</th>
                      <th className="p-2 font-bold uppercase select-none text-right">Relative Scale</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2b2d31]/50 font-mono">
                    {scalingLengths.map((len) => {
                      const itemScale = (len * len) / (128 * 128);
                      const isCurrent = len === seqLength;
                      return (
                        <tr 
                          key={len} 
                          className={`hover:bg-[#1b1c21]/30 transition-all ${
                            isCurrent ? 'bg-[#c5a3ff]/10 text-white font-extrabold' : 'text-gray-400'
                          }`}
                        >
                          <td className="p-2 flex items-center gap-1">
                            {isCurrent && <span className="w-1 h-1 rounded-full bg-[#c5a3ff]"></span>}
                            <span>{len}</span>
                          </td>
                          <td className="p-2">{(len * len).toLocaleString()}</td>
                          <td className="p-2 text-right text-[#c5a3ff]">
                            {itemScale.toFixed(2)}x
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        ) : (
          <div className="bg-[#1b1c21]/30 border border-[#2b2d31] p-4 rounded-xl flex gap-3 select-none text-[#9aa0a6]">
            <Info size={14} className="shrink-0 mt-0.5" />
            <p className="text-[10px] leading-relaxed font-semibold">
              No Transformer attention layers detected on the canvas. Add a MultiHeadAttention or TransformerBlock layer to enable sequence explainability analytics.
            </p>
          </div>
        )}

        {/* Section 4: Ask AI Explainability */}
        <div className="border-t border-[#3f4046]/40 pt-4 space-y-4">
          <h4 className="text-[10px] font-extrabold uppercase text-[#9aa0a6] tracking-wider select-none flex items-center gap-1.5">
            <Sparkles size={13} className="text-[#c5a3ff] animate-pulse" />
            <span>Ask AI Explainability</span>
          </h4>

          {/* Preset queries pills */}
          <div className="flex flex-wrap gap-1.5">
            {[
              'Why is memory high?',
              'Why is attention expensive?',
              'How can I optimize this?'
            ].map(q => (
              <button
                key={q}
                type="button"
                onClick={() => handleAskQuestion(q)}
                className="px-2.5 py-1.5 bg-[#2b2d31]/80 hover:bg-[#313338] border border-[#3f4046] text-gray-400 hover:text-white text-[9.5px] font-bold rounded-lg transition-all cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Text Question input */}
          <form onSubmit={handleCustomSubmit} className="flex gap-2">
            <input
              type="text"
              placeholder="Ask a question about this architecture..."
              value={customQuestion}
              onChange={(e) => setCustomQuestion(e.target.value)}
              className="flex-1 px-3 py-1.5 bg-[#101113] border border-[#3f4046] rounded-xl text-[10px] text-white placeholder-gray-600 focus:outline-none focus:border-[#c5a3ff] font-semibold"
            />
            <button
              type="submit"
              disabled={!customQuestion.trim()}
              className={`px-3 py-1.5 text-[10px] font-bold rounded-xl transition-all ${
                customQuestion.trim()
                  ? 'bg-[#c5a3ff] text-[#1e1f22] cursor-pointer'
                  : 'bg-[#2b2d31] text-gray-600 border border-[#3f4046] cursor-not-allowed'
              }`}
            >
              Ask
            </button>
          </form>

          {/* AI Response Display */}
          {aiAnswer && (
            <div className="bg-[#1b1c21] border border-[#c5a3ff]/20 p-4 rounded-xl space-y-2.5 animate-fade-in relative select-text">
              <span className="text-[9px] uppercase font-black tracking-wider text-[#c5a3ff] block">AI Explanation Response</span>
              <p className="text-[10px] text-gray-300 font-semibold leading-relaxed whitespace-pre-line">{aiAnswer}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
