'use client';

import React, { useState } from 'react';
import { X, Copy, Check, Download, FileCode, Columns, Grid, Layers, GitCompare } from 'lucide-react';
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
type ViewMode = 'single' | 'split' | 'quad' | 'diff';

export default function CodePreviewModal({ isOpen, onClose, nodes, edges }: CodePreviewModalProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('single');
  const [activeFramework, setActiveFramework] = useState<Framework>('PyTorch');
  
  // Split pane compare state
  const [leftFramework, setLeftFramework] = useState<Framework>('PyTorch');
  const [rightFramework, setRightFramework] = useState<Framework>('TensorFlow');

  // Copy success animations
  const [copiedSingle, setCopiedSingle] = useState(false);
  const [copiedLeft, setCopiedLeft] = useState(false);
  const [copiedRight, setCopiedRight] = useState(false);
  const [copiedQuad, setCopiedQuad] = useState<Record<Framework, boolean>>({
    PyTorch: false,
    TensorFlow: false,
    JAX: false,
    ONNX: false
  });
  const [copiedCell, setCopiedCell] = useState<{ nodeId: string; fw: Framework } | null>(null);

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

  const handleCopyQuad = async (fw: Framework) => {
    try {
      const code = getCompiledCode(fw);
      await navigator.clipboard.writeText(code);
      setCopiedQuad(prev => ({ ...prev, [fw]: true }));
      setTimeout(() => {
        setCopiedQuad(prev => ({ ...prev, [fw]: false }));
      }, 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyCell = async (nodeId: string, fw: Framework, code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCell({ nodeId, fw });
      setTimeout(() => setCopiedCell(null), 1500);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownload = (fw: Framework) => {
    const code = getCompiledCode(fw);
    const element = document.createElement("a");
    const file = new Blob([code], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    
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

  const getFrameworkBadge = (fw: Framework) => {
    switch (fw) {
      case 'PyTorch': return '🔥 PyTorch';
      case 'TensorFlow': return '🍊 TensorFlow';
      case 'JAX': return '⚡ JAX (Flax)';
      case 'ONNX': return '💎 ONNX Graph';
    }
  };

  // Topological sorting for the structural diff mapping table
  const getTopologicalOrder = (): CanvasNode[] => {
    const adj = new Map<string, string[]>();
    const inDegree = new Map<string, number>();
    
    nodes.forEach(n => {
      adj.set(n.id, []);
      inDegree.set(n.id, 0);
    });
    
    edges.forEach(e => {
      if (adj.has(e.source) && adj.has(e.target)) {
        adj.get(e.source)!.push(e.target);
        inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
      }
    });
    
    const queue: string[] = [];
    inDegree.forEach((deg, id) => {
      if (deg === 0) queue.push(id);
    });
    
    const order: string[] = [];
    while (queue.length > 0) {
      const u = queue.shift()!;
      order.push(u);
      
      const neighbors = adj.get(u) || [];
      neighbors.forEach(v => {
        inDegree.set(v, inDegree.get(v)! - 1);
        if (inDegree.get(v) === 0) {
          queue.push(v);
        }
      });
    }
    
    return order.map(id => nodes.find(n => n.id === id)!).filter(Boolean);
  };

  const getParents = (nodeId: string): string[] => {
    const incomingEdges = edges.filter(e => e.target === nodeId);
    return incomingEdges.map(e => {
      const srcNode = nodes.find(n => n.id === e.source);
      return srcNode ? (srcNode.name || srcNode.type).toLowerCase().replace(/[^a-z0-9_]/g, '_') : 'x';
    });
  };

  const getNodeSnippets = (node: CanvasNode, parents: string[]): Record<Framework, string> => {
    const varName = (node.name || node.type || 'layer').toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const config = node.config;
    
    let inputVarPyTorch = 'x';
    let inputVarTF = 'x';
    let inputVarJAX = 'x';
    let inputVarONNX = 'x';

    if (parents.length === 1) {
      inputVarPyTorch = parents[0];
      inputVarTF = parents[0];
      inputVarJAX = parents[0];
      inputVarONNX = parents[0];
    } else if (parents.length > 1) {
      inputVarPyTorch = `torch.cat([${parents.join(', ')}], dim=1)`;
      inputVarTF = `layers.Concatenate(axis=-1)([${parents.join(', ')}])`;
      inputVarJAX = `jnp.concatenate([${parents.join(', ')}], axis=-1)`;
      inputVarONNX = `concat_${varName}`;
    }

    const snippets: Record<Framework, string> = {
      PyTorch: '',
      TensorFlow: '',
      JAX: '',
      ONNX: ''
    };

    if (node.type === 'Input') {
      const dims = config.dim || [224, 224, 3];
      snippets.PyTorch = `# Input: [Batch, ${dims[2]}, ${dims[0]}, ${dims[1]}]\n${varName} = x`;
      snippets.TensorFlow = `# Input: [Batch, ${dims[0]}, ${dims[1]}, ${dims[2]}]\n${varName} = x`;
      snippets.JAX = `# Input: [Batch, ${dims[0]}, ${dims[1]}, ${dims[2]}]\n${varName} = x`;
      snippets.ONNX = `# Input: [Batch, ${dims[2]}, ${dims[0]}, ${dims[1]}]\n# ONNX Input Graph Node`;
    } 
    
    else if (node.type === 'Conv2D') {
      const filters = config.filters || 64;
      const kernelSize = config.kernelSize || 3;
      const stride = config.stride || 1;
      const paddingVal = config.padding === 'same' ? Math.floor(kernelSize / 2) : 0;
      const paddingTF = config.padding || 'same';
      const activation = config.activation || 'ReLU';

      let inChannels = 3;
      if (node.inputShape.length === 3) {
        inChannels = node.inputShape[2];
      }

      snippets.PyTorch = `self.${varName} = nn.Conv2d(${inChannels}, ${filters}, ${kernelSize}, stride=${stride}, padding=${paddingVal})\n` +
        (activation !== 'None' ? `self.${varName}_act = nn.${activation}()\n${varName} = self.${varName}_act(self.${varName}(${inputVarPyTorch}))` : `${varName} = self.${varName}(${inputVarPyTorch})`);

      const actTF = activation !== 'None' ? `'${activation.toLowerCase()}'` : 'None';
      snippets.TensorFlow = `self.${varName} = layers.Conv2D(${filters}, (${kernelSize}, ${kernelSize}), strides=${stride}, padding='${paddingTF}', activation=${actTF})\n${varName} = self.${varName}(${inputVarTF})`;

      const actJAX = activation !== 'None' ? `, activation=nn.${activation.toLowerCase()}` : '';
      snippets.JAX = `${varName} = nn.Conv(features=${filters}, kernel_size=(${kernelSize}, ${kernelSize}), strides=(${stride}, ${stride}), padding='${paddingTF.toUpperCase()}'${actJAX})(${inputVarJAX})`;

      snippets.ONNX = `node_${varName} = helper.make_node("Conv", inputs=["${inputVarONNX}", "W_${varName}"], outputs=["conv_out_${varName}"], kernel_shape=[${kernelSize}, ${kernelSize}], strides=[${stride}, ${stride}], pads=[${paddingVal},${paddingVal},${paddingVal},${paddingVal}])\n` +
        (activation !== 'None' ? `node_act_${varName} = helper.make_node("${activation}", inputs=["conv_out_${varName}"], outputs=["${varName}"])` : `node_act_${varName} = helper.make_node("Identity", inputs=["conv_out_${varName}"], outputs=["${varName}"])`);
    } 
    
    else if (node.type === 'MaxPool2D') {
      const poolSize = config.poolSize || 2;
      const stride = config.stride || 2;

      snippets.PyTorch = `self.${varName} = nn.MaxPool2d(${poolSize}, stride=${stride})\n${varName} = self.${varName}(${inputVarPyTorch})`;
      snippets.TensorFlow = `self.${varName} = layers.MaxPooling2D((${poolSize}, ${poolSize}), strides=${stride})\n${varName} = self.${varName}(${inputVarTF})`;
      snippets.JAX = `${varName} = nn.max_pool(${inputVarJAX}, (${poolSize}, ${poolSize}), strides=(${stride}, ${stride}))`;
      snippets.ONNX = `node_${varName} = helper.make_node("MaxPool", inputs=["${inputVarONNX}"], outputs=["${varName}"], kernel_shape=[${poolSize}, ${poolSize}], strides=[${stride}, ${stride}])`;
    } 
    
    else if (node.type === 'Flatten') {
      snippets.PyTorch = `self.${varName} = nn.Flatten()\n${varName} = self.${varName}(${inputVarPyTorch})`;
      snippets.TensorFlow = `self.${varName} = layers.Flatten()\n${varName} = self.${varName}(${inputVarTF})`;
      snippets.JAX = `${varName} = ${inputVarJAX}.reshape((${inputVarJAX}.shape[0], -1))`;
      snippets.ONNX = `node_${varName} = helper.make_node("Flatten", inputs=["${inputVarONNX}"], outputs=["${varName}"], axis=1)`;
    } 
    
    else if (node.type === 'Dense') {
      const units = config.units || 10;
      let inFeatures = 100;
      if (node.inputShape.length > 0) {
        inFeatures = node.inputShape.reduce((a, b) => a * b, 1);
      }

      snippets.PyTorch = `self.${varName} = nn.Linear(${inFeatures}, ${units})\n${varName} = self.${varName}(${inputVarPyTorch})`;
      snippets.TensorFlow = `self.${varName} = layers.Dense(${units})\n${varName} = self.${varName}(${inputVarTF})`;
      snippets.JAX = `${varName} = nn.Dense(${units})(${inputVarJAX})`;
      snippets.ONNX = `node_${varName} = helper.make_node("Gemm", inputs=["${inputVarONNX}", "W_${varName}"], outputs=["${varName}"], transB=1)`;
    }
    
    else if (node.type === 'BatchNorm2D') {
      let numFeatures = 3;
      if (node.inputShape.length === 3) {
        numFeatures = node.inputShape[2];
      }

      snippets.PyTorch = `self.${varName} = nn.BatchNorm2d(${numFeatures})\n${varName} = self.${varName}(${inputVarPyTorch})`;
      snippets.TensorFlow = `self.${varName} = layers.BatchNormalization()\n${varName} = self.${varName}(${inputVarTF})`;
      snippets.JAX = `${varName} = nn.BatchNorm()(${inputVarJAX})`;
      snippets.ONNX = `node_${varName} = helper.make_node("BatchNormalization", inputs=["${inputVarONNX}", "scale_${varName}", "bias_${varName}", "mean_${varName}", "var_${varName}"], outputs=["${varName}"])`;
    }
    
    else if (node.type === 'Dropout') {
      const rate = config.rate !== undefined ? config.rate : 0.5;

      snippets.PyTorch = `self.${varName} = nn.Dropout(p=${rate})\n${varName} = self.${varName}(${inputVarPyTorch})`;
      snippets.TensorFlow = `self.${varName} = layers.Dropout(rate=${rate})\n${varName} = self.${varName}(${inputVarTF})`;
      snippets.JAX = `${varName} = nn.Dropout(rate=${rate}, deterministic=True)(${inputVarJAX})`;
      snippets.ONNX = `node_${varName} = helper.make_node("Dropout", inputs=["${inputVarONNX}"], outputs=["${varName}"], ratio=${rate})`;
    }

    return snippets;
  };

  const orderedNodes = getTopologicalOrder();

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-7xl glass-panel rounded-2xl border border-white/10 flex flex-col h-[90vh] shadow-2xl relative overflow-hidden bg-[#16171a]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-8 py-4 border-b border-white/5 bg-[#1e1f22]/60 backdrop-blur-md">
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
              <p className="text-[11px] text-[#9aa0a6] mt-0.5 font-semibold">Compile topologies dynamically to PyTorch, TensorFlow, JAX, or ONNX.</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-[#2b2d31]/50 border border-[#3f4046]/80 p-1 rounded-xl">
            {/* View Mode switchers */}
            <button
              onClick={() => setViewMode('single')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black tracking-wide uppercase transition-all duration-200 cursor-pointer ${
                viewMode === 'single'
                  ? 'bg-[#8ab4f8]/10 border border-[#8ab4f8]/30 text-[#8ab4f8]'
                  : 'bg-transparent border border-transparent text-[#9aa0a6] hover:text-white'
              }`}
            >
              <FileCode size={12} />
              <span>Single</span>
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black tracking-wide uppercase transition-all duration-200 cursor-pointer ${
                viewMode === 'split'
                  ? 'bg-[#8ab4f8]/10 border border-[#8ab4f8]/30 text-[#8ab4f8]'
                  : 'bg-transparent border border-transparent text-[#9aa0a6] hover:text-white'
              }`}
            >
              <Columns size={12} />
              <span>Split</span>
            </button>
            <button
              onClick={() => setViewMode('quad')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black tracking-wide uppercase transition-all duration-200 cursor-pointer ${
                viewMode === 'quad'
                  ? 'bg-[#8ab4f8]/10 border border-[#8ab4f8]/30 text-[#8ab4f8]'
                  : 'bg-transparent border border-transparent text-[#9aa0a6] hover:text-white'
              }`}
            >
              <Grid size={12} />
              <span>Quad Grid</span>
            </button>
            <button
              onClick={() => setViewMode('diff')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black tracking-wide uppercase transition-all duration-200 cursor-pointer ${
                viewMode === 'diff'
                  ? 'bg-[#8ab4f8]/10 border border-[#8ab4f8]/30 text-[#8ab4f8]'
                  : 'bg-transparent border border-transparent text-[#9aa0a6] hover:text-white'
              }`}
            >
              <GitCompare size={12} />
              <span>Structural Diff</span>
            </button>
          </div>

          <button 
            onClick={onClose}
            className="p-2 hover:bg-[#2b2d31] rounded-lg text-[#9aa0a6] hover:text-white transition-all cursor-pointer border border-transparent hover:border-[#3f4046]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Main Content Workspace */}
        <div className="flex-1 flex flex-col min-h-0 bg-[#0c0d10]">
          
          {viewMode === 'single' && (
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
                      className={`px-4 py-1.5 rounded-xl text-xs font-bold border transition-all duration-150 cursor-pointer ${
                        isActive
                          ? 'bg-[#8ab4f8]/10 border-[#8ab4f8]/40 text-[#8ab4f8] shadow-md shadow-black/5 scale-[1.02]'
                          : 'bg-transparent border-transparent text-[#9aa0a6] hover:text-[#e3e3e3] hover:bg-[#2b2d31]/40'
                      }`}
                    >
                      {getFrameworkBadge(fw)}
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
          )}

          {viewMode === 'split' && (
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

                <div className="flex-1 overflow-auto p-6 font-mono text-[10.5px] leading-relaxed text-[#c5cbd3] selection:bg-[#8ab4f8]/20 custom-scrollbar bg-[#07080b]">
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

                <div className="flex-1 overflow-auto p-6 font-mono text-[10.5px] leading-relaxed text-[#c5cbd3] selection:bg-[#8ab4f8]/20 custom-scrollbar bg-[#08090d]">
                  <pre className="whitespace-pre">{getCompiledCode(rightFramework)}</pre>
                </div>
              </div>

            </div>
          )}

          {viewMode === 'quad' && (
            /* --- QUAD GRID VIEW SHOWING ALL 4 FRAMEWORKS --- */
            <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-3 p-4 bg-[#0a0b0d] overflow-hidden min-h-0">
              {(['PyTorch', 'TensorFlow', 'JAX', 'ONNX'] as Framework[]).map((fw) => (
                <div key={fw} className="border border-white/5 rounded-xl bg-[#111215] flex flex-col min-h-0 overflow-hidden shadow-inner">
                  {/* Pane Header */}
                  <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-black/10 select-none">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-black uppercase tracking-wider ${getFrameworkColor(fw)}`}>
                        {getFrameworkBadge(fw)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleCopyQuad(fw)}
                        className="p-1.5 hover:bg-[#2b2d31] text-[#9aa0a6] hover:text-white rounded-lg transition-all cursor-pointer border-none bg-transparent"
                        title={`Copy ${fw} Code`}
                      >
                        {copiedQuad[fw] ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      </button>
                      <button
                        onClick={() => handleDownload(fw)}
                        className="p-1.5 hover:bg-[#2b2d31] text-[#9aa0a6] hover:text-white rounded-lg transition-all cursor-pointer border-none bg-transparent"
                        title={`Download ${fw} Script`}
                      >
                        <Download size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Mono Panel content */}
                  <div className="flex-1 overflow-auto p-4 font-mono text-[9px] leading-normal text-[#c5cbd3] selection:bg-[#8ab4f8]/20 bg-[#07080a] custom-scrollbar">
                    <pre className="whitespace-pre">{getCompiledCode(fw)}</pre>
                  </div>
                </div>
              ))}
            </div>
          )}

          {viewMode === 'diff' && (
            /* --- STRUCTURAL DIFF VIEW (Translation Table) --- */
            <div className="flex-1 overflow-auto p-4 bg-[#0a0b0d] custom-scrollbar">
              <table className="w-full text-left border-collapse border border-white/5 rounded-xl overflow-hidden shadow-lg bg-[#111215]">
                <thead>
                  <tr className="border-b border-white/10 bg-[#1e1f22]">
                    <th className="p-4 text-xs font-black text-[#9aa0a6] uppercase tracking-wider w-[180px] border-r border-white/5">Layer / Block</th>
                    <th className="p-4 text-xs font-black text-[#ff6633] uppercase tracking-wider w-1/4 border-r border-white/5">🔥 PyTorch</th>
                    <th className="p-4 text-xs font-black text-[#ff9000] uppercase tracking-wider w-1/4 border-r border-white/5">🍊 TensorFlow</th>
                    <th className="p-4 text-xs font-black text-[#8ab4f8] uppercase tracking-wider w-1/4 border-r border-white/5">⚡ JAX (Flax)</th>
                    <th className="p-4 text-xs font-black text-[#c5a3ff] uppercase tracking-wider w-1/4">💎 ONNX</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {orderedNodes.map((node) => {
                    const parents = getParents(node.id);
                    const snippets = getNodeSnippets(node, parents);

                    return (
                      <tr key={node.id} className="hover:bg-white/5 transition-all">
                        {/* Layer Title */}
                        <td className="p-4 border-r border-white/5 align-top">
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-bold text-white tracking-wide">
                              {node.name}
                            </span>
                            <span className="text-[9px] px-2 py-0.5 rounded-full border bg-white/5 text-[#9aa0a6] border-white/10 w-fit font-semibold">
                              {node.type}
                            </span>
                            {node.inputShape.length > 0 && (
                              <span className="text-[8.5px] text-[#9aa0a6] font-semibold mt-1">
                                In: [{node.inputShape.join(', ')}]
                              </span>
                            )}
                            {node.outputShape.length > 0 && (
                              <span className="text-[8.5px] text-[#81c784] font-semibold">
                                Out: [{node.outputShape.join(', ')}]
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Framework Snippet Columns */}
                        {(['PyTorch', 'TensorFlow', 'JAX', 'ONNX'] as Framework[]).map((fw) => {
                          const code = snippets[fw];
                          const isCopied = copiedCell?.nodeId === node.id && copiedCell?.fw === fw;

                          return (
                            <td key={fw} className="p-3 border-r border-white/5 align-top font-mono text-[9px] relative group hover:bg-black/20">
                              <pre className="whitespace-pre-wrap leading-normal text-[#c5cbd3]">{code}</pre>
                              
                              {/* Overlay copy cell icon */}
                              {code && (
                                <button
                                  onClick={() => handleCopyCell(node.id, fw, code)}
                                  className="absolute top-2 right-2 p-1 rounded-md bg-[#2b2d31]/80 hover:bg-[#3f4046] border border-[#3f4046] text-[#9aa0a6] hover:text-white transition-all duration-150 opacity-0 group-hover:opacity-100 cursor-pointer"
                                  title="Copy block snippet"
                                >
                                  {isCopied ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                                </button>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
