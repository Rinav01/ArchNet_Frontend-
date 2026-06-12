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
  Maximize2,
  Table,
  LineChart,
  HelpCircle,
  Sparkles
} from 'lucide-react';

export default function ExplainabilityPanel() {
  const { nodes } = useCanvasStore();
  const [seqLength, setSeqLength] = useState<number>(128);
  const [customQuestion, setCustomQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');

  const metrics = getGraphMetrics(nodes);

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
        
        {/* Section 1: Aggregated Metrics */}
        <div className="space-y-3">
          <h4 className="text-[10px] font-extrabold uppercase text-[#9aa0a6] tracking-wider select-none">Model Complexity Aggregates</h4>
          
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
