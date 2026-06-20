import { CanvasNode, CanvasEdge } from '@/types/canvas';

export interface NodeMetrics {
  params: number;
  flops: number;
  vram: number; // in bytes
}

export interface GraphMetrics {
  totalParams: number;
  totalFlops: number;
  totalVram: number; // in bytes
}

export const getNodeMetrics = (node: CanvasNode): NodeMetrics => {
  let params = 0;
  let flops = 0;
  
  const type = node.type;
  const config = (node.config || {}) as any;
  const outputShape = node.outputShape || [];
  const inputShape = node.inputShape || [];

  if (type === 'Conv2D') {
    const inputChannels = inputShape.length >= 3 ? inputShape[2] : 3;
    const outputFilters = config.filters || 64;
    const kernel = config.kernelSize || 3;
    const outH = outputShape.length >= 2 ? outputShape[0] : 224;
    const outW = outputShape.length >= 2 ? outputShape[1] : 224;

    params = (inputChannels * kernel * kernel + 1) * outputFilters;
    flops = 2 * kernel * kernel * inputChannels * outputFilters * outH * outW;
  } else if (type === 'Dense') {
    const inputFeatures = inputShape.length > 0 ? inputShape.reduce((a, b) => a * b, 1) : 0;
    const units = config.units || 10;
    
    if (inputFeatures > 0) {
      params = (inputFeatures + 1) * units;
      flops = 2 * inputFeatures * units;
    }
  } else if (type === 'Embedding') {
    const vocabSize = config.vocab_size || 30522;
    const embedDim = config.embed_dim || config.embedding_dim || 768;
    
    params = vocabSize * embedDim;
    const seqLen = outputShape.length >= 2 ? outputShape[0] : 128;
    flops = seqLen * embedDim;
  } else if (['RNN', 'LSTM', 'GRU', 'BiLSTM'].includes(type)) {
    const inputDim = inputShape.length > 0 ? inputShape[inputShape.length - 1] : 768;
    const hiddenDim = config.hidden_size || 768;
    const isBi = type === 'BiLSTM' || config.bidirectional === true;
    
    let gateMultiplier = 1;
    if (type.includes('LSTM')) gateMultiplier = 4;
    else if (type.includes('GRU')) gateMultiplier = 3;
    
    const dirMultiplier = isBi ? 2 : 1;
    
    params = dirMultiplier * gateMultiplier * (hiddenDim * (inputDim + hiddenDim) + hiddenDim);
    const seqLen = outputShape.length >= 2 ? outputShape[0] : 128;
    flops = 2 * seqLen * params;
  } else if (['Attention', 'MultiHeadAttention'].includes(type)) {
    const embedDim = config.embed_dim || config.embedding_dim || 768;
    params = 4 * embedDim * embedDim;
    
    const seqLen = outputShape.length >= 2 ? outputShape[0] : 128;
    // Projection + Attention Matrix (Q K^T + A V)
    flops = 8 * seqLen * embedDim * embedDim + 4 * seqLen * seqLen * embedDim;
  } else if (['TransformerBlock', 'EncoderBlock', 'DecoderBlock'].includes(type)) {
    const embedDim = config.embed_dim || config.embedding_dim || 768;
    const hiddenSize = config.hidden_size || 2048;
    const isDecoder = type === 'DecoderBlock';
    
    // MHA + MLP + LNs
    params = 4 * embedDim * embedDim + 2 * embedDim * hiddenSize + 4 * embedDim;
    if (isDecoder) {
      // Cross attention + LN
      params += 4 * embedDim * embedDim + 2 * embedDim;
    }
    
    const seqLen = outputShape.length >= 2 ? outputShape[0] : 128;
    const attnFlops = 8 * seqLen * embedDim * embedDim + 4 * seqLen * seqLen * embedDim;
    const mlpFlops = 4 * seqLen * embedDim * hiddenSize;
    
    flops = attnFlops + mlpFlops;
    if (isDecoder) {
      flops += attnFlops;
    }
  } else if (type === 'LayerNorm') {
    const embedDim = inputShape.length > 0 ? inputShape[inputShape.length - 1] : 768;
    params = 2 * embedDim;
    
    const seqLen = outputShape.length >= 2 ? outputShape[0] : 128;
    flops = 10 * seqLen * embedDim;
  } else if (['GCN', 'GraphSAGE', 'GAT'].includes(type)) {
    const inFeatures = config.in_features || 128;
    const outFeatures = config.out_features || 128;
    const heads = config.num_heads || 8;
    const numNodes = 1000;
    const numEdges = 5000;
    
    if (type === 'GCN') {
      params = inFeatures * outFeatures;
      flops = 2 * numEdges * outFeatures + 2 * numNodes * inFeatures * outFeatures;
    } else if (type === 'GraphSAGE') {
      params = 2 * inFeatures * outFeatures;
      flops = 4 * numNodes * inFeatures * outFeatures;
    } else if (type === 'GAT') {
      params = inFeatures * outFeatures * heads + heads * outFeatures;
      flops = 2 * numNodes * inFeatures * outFeatures * heads + 2 * numEdges * outFeatures * heads;
    }
  }

  // VRAM calculation
  const BATCH_SIZE = 32;
  const weightsMemory = params * 4;
  let activationElements = 0;
  if (outputShape && outputShape.length > 0) {
    activationElements = outputShape.reduce((a, b) => {
      // Ignore symbolic strings if any
      const val = typeof b === 'number' ? b : parseInt(String(b), 10);
      return isNaN(val) ? a : a * val;
    }, 1);
  }
  const activationMemory = activationElements * BATCH_SIZE * 4;
  const optimizerMemory = params * 2 * 4; // Adam states
  const vram = weightsMemory + activationMemory + optimizerMemory;

  return { params, flops, vram };
};

export const getGraphMetrics = (nodes: CanvasNode[]): GraphMetrics => {
  let totalParams = 0;
  let totalFlops = 0;
  let totalVram = 0;

  nodes.forEach(node => {
    const { params, flops, vram } = getNodeMetrics(node);
    totalParams += params;
    totalFlops += flops;
    totalVram += vram;
  });

  return {
    totalParams,
    totalFlops,
    totalVram
  };
};

export const formatMetricNumber = (num: number, label: string): string => {
  if (num === 0) return `0 ${label}`;
  if (num < 1000) return `${num.toFixed(0)} ${label}`;
  if (num < 1000000) return `${(num / 1000).toFixed(1)}K ${label}`;
  if (num < 1000000000) return `${(num / 1000000).toFixed(1)}M ${label}`;
  return `${(num / 1000000000).toFixed(2)}B ${label}`;
};

export const formatMetricBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

export const generateVerificationHeader = (
  framework: string,
  nodes: CanvasNode[],
  edges: CanvasEdge[],
  isValid: boolean
): string => {
  const { totalParams } = getGraphMetrics(nodes);
  const formattedParams = formatMetricNumber(totalParams, '').trim() + (totalParams >= 1000 ? '' : ' Params');

  const inputNode = nodes.find(n => n.type === 'Input');
  let inputShapeStr = 'Unknown';
  if (inputNode) {
    const dims = inputNode.config.dim || [224, 224, 3];
    const hasEmbedding = nodes.some(n => n.type === 'Embedding');
    if (hasEmbedding) {
      inputShapeStr = `[${dims[0] || 128}]`; // Sequence length
    } else {
      if (framework === 'PyTorch' || framework === 'ONNX') {
        inputShapeStr = `[${dims[2] || 3}, ${dims[0] || 224}, ${dims[1] || 224}]`;
      } else {
        inputShapeStr = `[${dims[0] || 224}, ${dims[1] || 224}, ${dims[2] || 3}]`;
      }
    }
  }

  const outgoingCount = new Map<string, number>();
  nodes.forEach(n => outgoingCount.set(n.id, 0));
  edges.forEach(e => {
    outgoingCount.set(e.source, (outgoingCount.get(e.source) || 0) + 1);
  });
  const finalLeaves = nodes.filter(n => outgoingCount.get(n.id) === 0);
  
  let outputShapeStr = 'Unknown';
  if (finalLeaves.length === 1) {
    const shape = finalLeaves[0].outputShape || [];
    outputShapeStr = `[${shape.join(', ')}]`;
  } else if (finalLeaves.length > 1) {
    outputShapeStr = `[${finalLeaves.map(l => `[${(l.outputShape || []).join(', ')}]`).join(', ')}]`;
  }

  return `"""
Generated by ArchNet

Verification Metadata
---------------------
Framework: ${framework}
Input Shape: ${inputShapeStr}
Output Shape: ${outputShapeStr}
Parameters: ${formattedParams}
Compiler Version: 1.0.0
Verification Status: ${isValid ? 'Passed' : 'Failed'}
"""
`;
};

