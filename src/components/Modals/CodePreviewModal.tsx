'use client';

import React, { useState } from 'react';
import { X, Copy, Check, Download, FileCode, Columns, Grid, Layers, GitCompare, Maximize2, Minimize2, Database, Cpu, Flame, Table, Activity } from 'lucide-react';
import { CanvasNode, CanvasEdge } from '@/types/canvas';
import { compileToPyTorch } from '@/lib/canvas/pytorchCompiler';
import { compileToTensorFlow } from '@/lib/canvas/tensorflowCompiler';
import { compileToJAX } from '@/lib/canvas/jaxCompiler';
import { compileToONNX } from '@/lib/canvas/onnxCompiler';
import { 
  getNodeMetrics, 
  getGraphMetrics, 
  formatMetricNumber, 
  formatMetricBytes 
} from '@/lib/canvas/metricsHelper';

interface CodePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  onOpenCompare?: () => void;
}

type Framework = 'PyTorch' | 'TensorFlow' | 'JAX' | 'ONNX';
type ViewMode = 'side-by-side' | 'single' | 'split' | 'quad' | 'diff';

export default function CodePreviewModal({ isOpen, onClose, nodes, edges, onOpenCompare }: CodePreviewModalProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('side-by-side');
  const [activeFramework, setActiveFramework] = useState<Framework>('PyTorch');
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Split pane compare state
  const [leftFramework, setLeftFramework] = useState<Framework>('PyTorch');
  const [rightFramework, setRightFramework] = useState<Framework>('TensorFlow');

  // Copy success animations
  const [copiedSingle, setCopiedSingle] = useState(false);
  const [copiedLeft, setCopiedLeft] = useState(false);
  const [copiedRight, setCopiedRight] = useState(false);
  const [copiedThree, setCopiedThree] = useState<Record<string, boolean>>({
    PyTorch: false,
    TensorFlow: false,
    JAX: false
  });
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

  const handleCopyThree = async (fw: 'PyTorch' | 'TensorFlow' | 'JAX') => {
    try {
      const code = getCompiledCode(fw);
      await navigator.clipboard.writeText(code);
      setCopiedThree(prev => ({ ...prev, [fw]: true }));
      setTimeout(() => {
        setCopiedThree(prev => ({ ...prev, [fw]: false }));
      }, 2000);
    } catch (err) {
      console.error(err);
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

    element.download = `archnet_${label}${ext}`;
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

    else if (node.type === 'Embedding') {
      const vocabSize = config.vocab_size || 10000;
      const embedDim = config.embedding_dim || 128;
      snippets.PyTorch = `self.${varName} = nn.Embedding(${vocabSize}, ${embedDim})\n${varName} = self.${varName}(${inputVarPyTorch})`;
      snippets.TensorFlow = `self.${varName} = layers.Embedding(${vocabSize}, ${embedDim})\n${varName} = self.${varName}(${inputVarTF})`;
      snippets.JAX = `${varName} = nn.Embed(num_embeddings=${vocabSize}, features=${embedDim})(${inputVarJAX})`;
      snippets.ONNX = `node_${varName} = helper.make_node("Gather", inputs=["W_${varName}", "${inputVarONNX}"], outputs=["${varName}"], axis=0)`;
    }

    else if (node.type === 'PositionalEncoding') {
      const embedDim = config.embed_dim || config.embedding_dim || 128;
      const maxLen = config.max_len || 5000;
      snippets.PyTorch = `self.${varName} = PositionalEncoding(${embedDim}, max_len=${maxLen})\n${varName} = self.${varName}(${inputVarPyTorch})`;
      snippets.TensorFlow = `self.${varName} = PositionalEncoding(${embedDim}, max_len=${maxLen})\n${varName} = self.${varName}(${inputVarTF})`;
      snippets.JAX = `${varName} = PositionalEncoding(max_len=${maxLen})(${inputVarJAX})`;
      snippets.ONNX = `node_${varName} = helper.make_node("Add", inputs=["${inputVarONNX}", "pos_${varName}"], outputs=["${varName}"])`;
    }

    else if (node.type === 'LayerNorm') {
      snippets.PyTorch = `self.${varName} = nn.LayerNorm(${inputVarPyTorch}.shape[-1])\n${varName} = self.${varName}(${inputVarPyTorch})`;
      snippets.TensorFlow = `self.${varName} = layers.LayerNormalization()\n${varName} = self.${varName}(${inputVarTF})`;
      snippets.JAX = `${varName} = nn.LayerNorm()(${inputVarJAX})`;
      snippets.ONNX = `node_${varName} = helper.make_node("MeanVarianceNormalization", inputs=["${inputVarONNX}"], outputs=["${varName}"])`;
    }

    else if (node.type === 'Attention' || node.type === 'MultiHeadAttention') {
      const numHeads = config.num_heads || 8;
      const embedDim = config.embed_dim || config.embedding_dim || 128;
      snippets.PyTorch = `self.${varName} = nn.MultiheadAttention(embed_dim=${embedDim}, num_heads=${numHeads})\n${varName}, _ = self.${varName}(${inputVarPyTorch}, ${inputVarPyTorch}, ${inputVarPyTorch})`;
      snippets.TensorFlow = `self.${varName} = layers.MultiHeadAttention(num_heads=${numHeads}, key_dim=${embedDim})\n${varName} = self.${varName}(${inputVarTF}, ${inputVarTF})`;
      snippets.JAX = `${varName} = nn.MultiHeadDotProductAttention(num_heads=${numHeads}, qk_features=${embedDim}, v_features=${embedDim})(${inputVarJAX}, ${inputVarJAX})`;
      snippets.ONNX = `node_${varName} = helper.make_node("Attention", inputs=["${inputVarONNX}", "${inputVarONNX}", "${inputVarONNX}"], outputs=["${varName}"])`;
    }

    else if (node.type === 'ResidualAdd') {
      const inputsList = parents.length > 0 ? parents : ['x1', 'x2'];
      snippets.PyTorch = `${varName} = ${inputsList.join(' + ')}`;
      snippets.TensorFlow = `${varName} = layers.add([${inputsList.join(', ')}])`;
      snippets.JAX = `${varName} = ${inputsList.join(' + ')}`;
      snippets.ONNX = `node_${varName} = helper.make_node("Add", inputs=["${inputsList[0]}", "${inputsList[1]}"], outputs=["${varName}"])`;
    }

    else if (node.type === 'TransformerBlock' || node.type === 'EncoderBlock' || node.type === 'DecoderBlock') {
      const numHeads = config.num_heads || 8;
      const embedDim = config.embed_dim || config.embedding_dim || 128;
      const hiddenSize = config.hidden_size || 512;
      const isDecoder = node.type === 'DecoderBlock';
      
      if (isDecoder) {
        snippets.PyTorch = `self.${varName} = nn.TransformerDecoderLayer(d_model=${embedDim}, nhead=${numHeads}, dim_feedforward=${hiddenSize})\n${varName} = self.${varName}(${inputVarPyTorch}, memory)`;
        snippets.TensorFlow = `self.${varName} = TransformerDecoderBlock(embed_dim=${embedDim}, num_heads=${numHeads}, ff_dim=${hiddenSize})\n${varName} = self.${varName}(${inputVarTF}, memory)`;
        snippets.JAX = `${varName} = TransformerDecoderBlock(num_heads=${numHeads}, embed_dim=${embedDim}, ff_dim=${hiddenSize})(${inputVarJAX}, memory)`;
        snippets.ONNX = `node_${varName} = helper.make_node("TransformerDecoderLayer", inputs=["${inputVarONNX}", "memory"], outputs=["${varName}"])`;
      } else {
        snippets.PyTorch = `self.${varName} = nn.TransformerEncoderLayer(d_model=${embedDim}, nhead=${numHeads}, dim_feedforward=${hiddenSize})\n${varName} = self.${varName}(${inputVarPyTorch})`;
        snippets.TensorFlow = `self.${varName} = TransformerEncoderBlock(embed_dim=${embedDim}, num_heads=${numHeads}, ff_dim=${hiddenSize})\n${varName} = self.${varName}(${inputVarTF})`;
        snippets.JAX = `${varName} = TransformerEncoderBlock(num_heads=${numHeads}, embed_dim=${embedDim}, ff_dim=${hiddenSize})(${inputVarJAX})`;
        snippets.ONNX = `node_${varName} = helper.make_node("TransformerEncoderLayer", inputs=["${inputVarONNX}"], outputs=["${varName}"])`;
      }
    }

    else if (node.type === 'LSTM' || node.type === 'GRU' || node.type === 'BiLSTM') {
      const hiddenSize = config.hidden_size || 128;
      const returnSeqs = config.return_sequences !== undefined ? config.return_sequences : true;
      const isBi = node.type === 'BiLSTM';
      const rnnType = isBi ? 'LSTM' : node.type;

      if (isBi) {
        snippets.PyTorch = `self.${varName} = nn.LSTM(input_size=${inputVarPyTorch}.shape[-1], hidden_size=${hiddenSize}, batch_first=True, bidirectional=True)\n` +
          (returnSeqs ? `${varName}, _ = self.${varName}(${inputVarPyTorch})` : `_, (hn, _) = self.${varName}(${inputVarPyTorch})\n${varName} = torch.cat([hn[-2], hn[-1]], dim=-1)`);
        snippets.TensorFlow = `self.${varName} = layers.Bidirectional(layers.LSTM(${hiddenSize}, return_sequences=${returnSeqs ? 'True' : 'False'}))\n${varName} = self.${varName}(${inputVarTF})`;
        snippets.JAX = `${varName} = Bidirectional(nn.LSTMCell(features=${hiddenSize}))(${inputVarJAX})`;
        snippets.ONNX = `node_${varName} = helper.make_node("BiLSTM", inputs=["${inputVarONNX}"], outputs=["${varName}"], hidden_size=${hiddenSize})`;
      } else {
        snippets.PyTorch = `self.${varName} = nn.${rnnType}(input_size=${inputVarPyTorch}.shape[-1], hidden_size=${hiddenSize}, batch_first=True)\n` +
          (returnSeqs ? `${varName}, _ = self.${varName}(${inputVarPyTorch})` : `_, (hn, _) = self.${varName}(${inputVarPyTorch})\n${varName} = hn[-1]`);
        snippets.TensorFlow = `self.${varName} = layers.${rnnType}(${hiddenSize}, return_sequences=${returnSeqs ? 'True' : 'False'})\n${varName} = self.${varName}(${inputVarTF})`;
        snippets.JAX = `${varName} = nn.${rnnType}Cell(features=${hiddenSize})(${inputVarJAX})`;
        snippets.ONNX = `node_${varName} = helper.make_node("${rnnType}", inputs=["${inputVarONNX}"], outputs=["${varName}"], hidden_size=${hiddenSize})`;
      }
    }

    else if (node.type === 'GCN' || node.type === 'GraphSAGE' || node.type === 'GAT') {
      const outFeatures = config.out_features || 64;
      const convName = node.type === 'GCN' ? 'GCNConv' : node.type === 'GraphSAGE' ? 'SAGEConv' : 'GATConv';

      snippets.PyTorch = `self.${varName} = ${convName}(in_channels=node_features.shape[-1], out_channels=${outFeatures})\n${varName} = self.${varName}(node_features, edge_index)`;
      snippets.TensorFlow = `self.${varName} = ${convName}(${outFeatures})\n${varName} = self.${varName}([node_features, edge_index])`;
      snippets.JAX = `${varName} = ${convName}(features=${outFeatures})(node_features, edge_index)`;
      snippets.ONNX = `node_${varName} = helper.make_node("GNNConv", inputs=["node_features", "edge_index"], outputs=["${varName}"], type="${node.type}")`;
    }

    return snippets;
  };

  const orderedNodes = getTopologicalOrder();
  const graphMetrics = getGraphMetrics(nodes);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-0 md:p-4">
      <div className={`w-full glass-panel border border-white/10 flex flex-col shadow-2xl relative overflow-hidden bg-[#16171a] transition-all duration-300 ${
        isExpanded 
          ? 'max-w-none h-screen rounded-none border-none p-0' 
          : 'max-w-[95vw] h-[90vh] rounded-2xl'
      }`}>
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-8 py-4 border-b border-white/5 bg-[#1e1f22]/60 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#8ab4f8]/10 border border-[#8ab4f8]/20 rounded-xl text-[#8ab4f8]">
              <FileCode size={20} className="animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white tracking-wide flex items-center gap-2">
                <span>Advanced Compiler Center</span>
                <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded text-emerald-400 font-extrabold uppercase select-none font-mono">
                  Online
                </span>
              </h3>
              <p className="text-[11px] text-[#9aa0a6] mt-0.5 font-semibold">Compile topologies dynamically to PyTorch, TensorFlow, or JAX alongside detailed metrics.</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-[#2b2d31]/50 border border-[#3f4046]/80 p-1 rounded-xl">
            {/* View Mode switchers */}
            <button
              onClick={() => setViewMode('side-by-side')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black tracking-wide uppercase transition-all duration-200 cursor-pointer ${
                viewMode === 'side-by-side'
                  ? 'bg-[#8ab4f8]/10 border border-[#8ab4f8]/30 text-[#8ab4f8]'
                  : 'bg-transparent border border-transparent text-[#9aa0a6] hover:text-white'
              }`}
            >
              <Columns size={12} />
              <span>Side-By-Side</span>
            </button>
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
              <span>Split Pane</span>
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
              <span>Diff Table</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Expand Button */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 hover:bg-[#2b2d31] rounded-lg text-[#9aa0a6] hover:text-white transition-all cursor-pointer border border-transparent hover:border-[#3f4046]"
            >
              {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-[#2b2d31] rounded-lg text-[#9aa0a6] hover:text-white transition-all cursor-pointer border border-transparent hover:border-[#3f4046]"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Modal Main Content Workspace (Split Columns: Left 30% Analytics, Right 70% Code Preview) */}
        <div className="flex-1 flex min-h-0 bg-[#0c0d10] divide-x divide-white/5">
          
          {/* ================= LEFT 30% ANALYTICS SIDEBAR ================= */}
          <div className="w-[30%] flex flex-col min-h-0 bg-[#141517] overflow-y-auto custom-scrollbar p-6 space-y-6">
            
            {/* Compiler Analytics Header */}
            <div className="space-y-3 shrink-0">
              <h4 className="text-[10px] font-extrabold uppercase text-[#9aa0a6] tracking-wider select-none">Compiler Analytics</h4>
              
              <div className="grid grid-cols-1 gap-2.5 font-sans">
                {/* Param Count */}
                <div className="bg-[#1b1c21]/80 border border-[#2b2d31] p-3 rounded-xl flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-[#81c784]/10 rounded-lg text-[#81c784]">
                      <Database size={13} />
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-500 font-extrabold uppercase block leading-none">Parameters</span>
                      <span className="text-xs font-black text-white mt-1 font-mono leading-none block">
                        {formatMetricNumber(graphMetrics.totalParams, 'Params')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Estimated VRAM */}
                <div className="bg-[#1b1c21]/80 border border-[#2b2d31] p-3 rounded-xl flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-[#ffe082]/10 rounded-lg text-[#ffe082]">
                      <Flame size={13} />
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-500 font-extrabold uppercase block leading-none">Estimated VRAM</span>
                      <span className="text-xs font-black text-white mt-1 font-mono leading-none block">
                        {formatMetricBytes(graphMetrics.totalVram)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Total FLOPs */}
                <div className="bg-[#1b1c21]/80 border border-[#2b2d31] p-3 rounded-xl flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-[#8ab4f8]/10 rounded-lg text-[#8ab4f8]">
                      <Cpu size={13} />
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-500 font-extrabold uppercase block leading-none">Total FLOPs</span>
                      <span className="text-xs font-black text-white mt-1 font-mono leading-none block">
                        {formatMetricNumber(graphMetrics.totalFlops, 'FLOPs')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Model Summary Table */}
            <div className="flex-1 flex flex-col min-h-0 space-y-3">
              <div className="flex items-center gap-2 text-[10px] font-extrabold text-[#9aa0a6] uppercase tracking-wider select-none shrink-0 border-b border-[#3f4046]/30 pb-2">
                <Table size={13} className="text-[#8ab4f8]" />
                <span>Model Summary</span>
              </div>

              {orderedNodes.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-center text-[10px] text-gray-500 py-12 font-sans font-semibold">
                  Graph contains no layers.
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto custom-scrollbar border border-[#2b2d31] rounded-xl bg-[#101113]">
                  <table className="w-full text-left border-collapse text-[9.5px]">
                    <thead>
                      <tr className="bg-[#18191c] border-b border-[#2b2d31] text-gray-400 font-bold uppercase select-none">
                        <th className="p-2 font-bold select-none">Layer</th>
                        <th className="p-2 font-bold select-none">Shape</th>
                        <th className="p-2 font-bold select-none">Params</th>
                        <th className="p-2 font-bold select-none text-right">FLOPs</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2b2d31]/40 font-mono text-gray-300">
                      {orderedNodes.map((n) => {
                        const { params, flops } = getNodeMetrics(n);
                        return (
                          <tr key={n.id} className="hover:bg-white/5 transition-all">
                            <td className="p-2 align-top max-w-[80px] truncate" title={n.name}>
                              <span className="font-bold block text-white truncate">{n.name}</span>
                              <span className="text-[7.5px] text-gray-500 truncate block mt-0.5">{n.type}</span>
                            </td>
                            <td className="p-2 align-top text-gray-400 whitespace-nowrap">
                              [{n.outputShape.join(',')}]
                            </td>
                            <td className="p-2 align-top text-emerald-400">
                              {params > 0 ? formatMetricNumber(params, '').split(' ')[0] : '0'}
                            </td>
                            <td className="p-2 align-top text-right text-[#8ab4f8]">
                              {flops > 0 ? formatMetricNumber(flops, '').split(' ')[0] : '0'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>

          {/* ================= RIGHT 70% CODE VIEWPORT ================= */}
          <div className="w-[70%] flex flex-col min-h-0 bg-[#07080b]">
            
            {/* View Mode 1: Three-Way Side-by-Side (Default) */}
            {viewMode === 'side-by-side' && (
              <div className="flex-1 flex min-h-0 divide-x divide-white/5 overflow-hidden">
                
                {/* Column 1: PyTorch */}
                <div className="flex-1 flex flex-col min-h-0 bg-[#07080b]">
                  <div className="flex items-center justify-between px-5 py-2.5 bg-[#1e1f22]/40 border-b border-white/5 select-none">
                    <span className="text-[10px] font-black uppercase text-[#ff6633] tracking-wide flex items-center gap-1.5">
                      <span>🔥</span>
                      <span>PyTorch</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleCopyThree('PyTorch')}
                        className="p-1 hover:bg-[#2b2d31] rounded text-gray-400 hover:text-white transition-all cursor-pointer border-none bg-transparent"
                      >
                        {copiedThree.PyTorch ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                      </button>
                      <button
                        onClick={() => handleDownload('PyTorch')}
                        className="p-1 hover:bg-[#2b2d31] rounded text-gray-400 hover:text-white transition-all cursor-pointer border-none bg-transparent"
                      >
                        <Download size={11} />
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-auto p-5 font-mono text-[9.5px] leading-relaxed text-[#c5cbd3] selection:bg-[#8ab4f8]/20 bg-[#07080a] custom-scrollbar">
                    <pre className="whitespace-pre">{getCompiledCode('PyTorch')}</pre>
                  </div>
                </div>

                {/* Column 2: TensorFlow */}
                <div className="flex-1 flex flex-col min-h-0 bg-[#08090d]">
                  <div className="flex items-center justify-between px-5 py-2.5 bg-[#1e1f22]/40 border-b border-white/5 select-none">
                    <span className="text-[10px] font-black uppercase text-[#ff9000] tracking-wide flex items-center gap-1.5">
                      <span>🍊</span>
                      <span>TensorFlow</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleCopyThree('TensorFlow')}
                        className="p-1 hover:bg-[#2b2d31] rounded text-gray-400 hover:text-white transition-all cursor-pointer border-none bg-transparent"
                      >
                        {copiedThree.TensorFlow ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                      </button>
                      <button
                        onClick={() => handleDownload('TensorFlow')}
                        className="p-1 hover:bg-[#2b2d31] rounded text-gray-400 hover:text-white transition-all cursor-pointer border-none bg-transparent"
                      >
                        <Download size={11} />
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-auto p-5 font-mono text-[9.5px] leading-relaxed text-[#c5cbd3] selection:bg-[#8ab4f8]/20 bg-[#07080a] custom-scrollbar">
                    <pre className="whitespace-pre">{getCompiledCode('TensorFlow')}</pre>
                  </div>
                </div>

                {/* Column 3: JAX */}
                <div className="flex-1 flex flex-col min-h-0 bg-[#07080b]">
                  <div className="flex items-center justify-between px-5 py-2.5 bg-[#1e1f22]/40 border-b border-white/5 select-none">
                    <span className="text-[10px] font-black uppercase text-[#8ab4f8] tracking-wide flex items-center gap-1.5">
                      <span>⚡</span>
                      <span>JAX (Flax)</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleCopyThree('JAX')}
                        className="p-1 hover:bg-[#2b2d31] rounded text-gray-400 hover:text-white transition-all cursor-pointer border-none bg-transparent"
                      >
                        {copiedThree.JAX ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                      </button>
                      <button
                        onClick={() => handleDownload('JAX')}
                        className="p-1 hover:bg-[#2b2d31] rounded text-gray-400 hover:text-white transition-all cursor-pointer border-none bg-transparent"
                      >
                        <Download size={11} />
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-auto p-5 font-mono text-[9.5px] leading-relaxed text-[#c5cbd3] selection:bg-[#8ab4f8]/20 bg-[#07080a] custom-scrollbar">
                    <pre className="whitespace-pre">{getCompiledCode('JAX')}</pre>
                  </div>
                </div>

              </div>
            )}

            {/* View Mode 2: Single Frame Tabbed Viewer */}
            {viewMode === 'single' && (
              <>
                {/* Segmented active framework switcher tabs */}
                <div className="flex items-center gap-2 px-8 py-3 bg-[#1e1f22]/30 border-b border-white/5 select-none shrink-0">
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

                {/* Code Header Toolbar */}
                <div className="flex justify-between items-center px-8 py-3 bg-[#111215] border-b border-white/5 select-none shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-[#ffe082]">class GeneratedModel:</span>
                    <span className="text-[10px] text-gray-500 font-mono italic"># compiled target module</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Copy Button */}
                    <button
                      onClick={() => handleCopy(activeFramework, setCopiedSingle)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2b2d31]/50 border border-[#3f4046] hover:bg-[#2b2d31] text-[10px] font-bold text-[#e3e3e3] hover:text-white rounded-lg transition-all cursor-pointer border-none bg-transparent"
                    >
                      {copiedSingle ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                      <span>{copiedSingle ? 'Copied' : 'Copy'}</span>
                    </button>

                    {/* Download Button */}
                    <button
                      onClick={() => handleDownload(activeFramework)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2b2d31]/50 border border-[#3f4046] hover:bg-[#2b2d31] text-[10px] font-bold text-[#e3e3e3] hover:text-white rounded-lg transition-all cursor-pointer border-none bg-transparent"
                    >
                      <Download size={11} />
                      <span>Download</span>
                    </button>
                  </div>
                </div>

                {/* Monospace Code Editor Area */}
                <div className="flex-1 overflow-auto p-8 font-mono text-[11px] leading-relaxed text-[#c5cbd3] selection:bg-[#8ab4f8]/20 bg-[#07080b] custom-scrollbar">
                  <pre className="whitespace-pre">{getCompiledCode(activeFramework)}</pre>
                </div>
              </>
            )}

            {/* View Mode 3: Split Pane Comparison */}
            {viewMode === 'split' && (
              <div className="flex-1 flex min-h-0 divide-x divide-white/5 overflow-hidden">
                
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

            {/* View Mode 4: Quad Grid View */}
            {viewMode === 'quad' && (
              <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-3 p-4 bg-[#0a0b0d] overflow-hidden min-h-0">
                {(['PyTorch', 'TensorFlow', 'JAX', 'ONNX'] as Framework[]).map((fw) => (
                  <div key={fw} className="border border-white/5 rounded-xl bg-[#111215] flex flex-col min-h-0 overflow-hidden shadow-inner">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-black/10 select-none">
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-black uppercase tracking-wider ${getFrameworkColor(fw)}`}>
                        {getFrameworkBadge(fw)}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleCopyQuad(fw)}
                          className="p-1.5 hover:bg-[#2b2d31] text-[#9aa0a6] hover:text-white rounded-lg transition-all cursor-pointer border-none bg-transparent"
                        >
                          {copiedQuad[fw] ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        </button>
                        <button
                          onClick={() => handleDownload(fw)}
                          className="p-1.5 hover:bg-[#2b2d31] text-[#9aa0a6] hover:text-white rounded-lg transition-all cursor-pointer border-none bg-transparent"
                        >
                          <Download size={12} />
                        </button>
                      </div>
                    </div>
                    <div className="flex-1 overflow-auto p-4 font-mono text-[9px] leading-normal text-[#c5cbd3] selection:bg-[#8ab4f8]/20 bg-[#07080a] custom-scrollbar">
                      <pre className="whitespace-pre">{getCompiledCode(fw)}</pre>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* View Mode 5: Diff Table View */}
            {viewMode === 'diff' && (
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
                          <td className="p-4 border-r border-white/5 align-top">
                            <div className="flex flex-col gap-1">
                              <span className="text-xs font-bold text-white tracking-wide">{node.name}</span>
                              <span className="text-[9px] px-2 py-0.5 rounded-full border bg-white/5 text-[#9aa0a6] border-white/10 w-fit font-semibold">{node.type}</span>
                              {node.inputShape.length > 0 && <span className="text-[8.5px] text-[#9aa0a6] font-semibold mt-1">In: [{node.inputShape.join(', ')}]</span>}
                              {node.outputShape.length > 0 && <span className="text-[8.5px] text-[#81c784] font-semibold">Out: [{node.outputShape.join(', ')}]</span>}
                            </div>
                          </td>

                          {(['PyTorch', 'TensorFlow', 'JAX', 'ONNX'] as Framework[]).map((fw) => {
                            const code = snippets[fw];
                            const isCopied = copiedCell?.nodeId === node.id && copiedCell?.fw === fw;

                            return (
                              <td key={fw} className="p-3 border-r border-white/5 align-top font-mono text-[9px] relative group hover:bg-black/20">
                                <pre className="whitespace-pre-wrap leading-normal text-[#c5cbd3]">{code}</pre>
                                {code && (
                                  <button
                                    onClick={() => handleCopyCell(node.id, fw, code)}
                                    className="absolute top-2 right-2 p-1 rounded-md bg-[#2b2d31]/80 hover:bg-[#3f4046] border border-[#3f4046] text-[#9aa0a6] hover:text-white transition-all duration-150 opacity-0 group-hover:opacity-100 cursor-pointer"
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
    </div>
  );
}
