'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/Layout/MainLayout';
import { useProjectStore } from '@/store/projectStore';
import { useCanvasStore } from '@/store/canvasStore';
import { toast } from '@/store/notificationStore';
import { 
  Cpu, 
  ArrowRight, 
  Sparkles, 
  Layers, 
  Zap, 
  HardDrive, 
  Activity, 
  Terminal,
  RefreshCw,
  Code
} from 'lucide-react';

interface SimulatedLayer {
  name: string;
  type: 'Input' | 'Conv2D' | 'BatchNorm2D' | 'MaxPool2D' | 'Flatten' | 'Dense' | 'MultiHeadAttention' | 'LayerNorm';
  shape: string;
  params: string;
}

export default function AIArchitectureGeneratePage() {
  const router = useRouter();
  const addProject = useProjectStore((state) => state.addProject);
  const setActiveProjectId = useProjectStore((state) => state.setActiveProjectId);
  const loadGraph = useCanvasStore((state) => state.loadGraph);

  // Form states
  const [task, setTask] = useState('Image Classification');
  const [dataset, setDataset] = useState('CIFAR10');
  const [framework, setFramework] = useState('PyTorch');
  const [device, setDevice] = useState('NVIDIA RTX 4090');
  const [customPrompt, setCustomPrompt] = useState('');

  // Generation states
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationPhase, setGenerationPhase] = useState('');
  const [hasGenerated, setHasGenerated] = useState(true); // default template loaded on start

  // Simulated metrics
  const [metrics, setMetrics] = useState({
    params: '11.8M',
    flops: '1.24 GFLOPs',
    vram: '412 MB',
    layersCount: 7
  });

  const [layers, setLayers] = useState<SimulatedLayer[]>([
    { name: 'INPUT_IMAGE', type: 'Input', shape: '32 x 32 x 3', params: '0' },
    { name: 'CONV_STEM', type: 'Conv2D', shape: '32 x 32 x 64', params: '1,792' },
    { name: 'BN_STEM', type: 'BatchNorm2D', shape: '32 x 32 x 64', params: '128' },
    { name: 'POOL_STEM', type: 'MaxPool2D', shape: '16 x 16 x 64', params: '0' },
    { name: 'CONV_B1', type: 'Conv2D', shape: '16 x 16 x 128', params: '73,856' },
    { name: 'FLATTEN_HEAD', type: 'Flatten', shape: '32768', params: '0' },
    { name: 'DENSE_CLASSIFIER', type: 'Dense', shape: '10', params: '327,690' }
  ]);

  const handleGenerate = () => {
    setIsGenerating(true);
    setHasGenerated(false);
    
    const phases = [
      'Initializing architecture mapping...',
      'Scaling tensor dimensions...',
      'Computing parameter profiles...',
      'Optimizing layers for target hardware...',
      'Done!'
    ];

    let currentPhase = 0;
    setGenerationPhase(phases[0]);

    const interval = setInterval(() => {
      currentPhase++;
      if (currentPhase >= phases.length) {
        clearInterval(interval);
        
        // Update metrics based on selections
        if (task === 'NLP Translation' || dataset === 'IMDB Text') {
          setMetrics({
            params: '44.2M',
            flops: '8.10 GFLOPs',
            vram: '1.45 GB',
            layersCount: 8
          });
          setLayers([
            { name: 'INPUT_TEXT', type: 'Input', shape: '128 (SeqLen)', params: '0' },
            { name: 'EMBEDDING_SRC', type: 'Input', shape: '128 x 256', params: '2,560,000' },
            { name: 'POS_ENCODING', type: 'Input', shape: '128 x 256', params: '0' },
            { name: 'ATTN_BLOCK_1', type: 'MultiHeadAttention', shape: '128 x 256', params: '263,168' },
            { name: 'LN_1', type: 'LayerNorm', shape: '128 x 256', params: '512' },
            { name: 'ATTN_BLOCK_2', type: 'MultiHeadAttention', shape: '128 x 256', params: '263,168' },
            { name: 'LN_2', type: 'LayerNorm', shape: '128 x 256', params: '512' },
            { name: 'DENSE_VOCAB', type: 'Dense', shape: '10000', params: '2,570,000' }
          ]);
        } else {
          // Default Image metrics
          const isRTX = device.includes('4090');
          setMetrics({
            params: '14.2M',
            flops: '1.85 GFLOPs',
            vram: isRTX ? '520 MB' : '310 MB',
            layersCount: 7
          });
          setLayers([
            { name: 'INPUT_IMAGE', type: 'Input', shape: '224 x 224 x 3', params: '0' },
            { name: 'CONV_STEM', type: 'Conv2D', shape: '112 x 112 x 64', params: '9,408' },
            { name: 'BN_STEM', type: 'BatchNorm2D', shape: '112 x 112 x 64', params: '128' },
            { name: 'POOL_STEM', type: 'MaxPool2D', shape: '56 x 56 x 64', params: '0' },
            { name: 'CONV_B1', type: 'Conv2D', shape: '56 x 56 x 128', params: '73,856' },
            { name: 'FLATTEN_HEAD', type: 'Flatten', shape: '401408', params: '0' },
            { name: 'DENSE_CLASSIFIER', type: 'Dense', shape: '100', params: '40,140,900' }
          ]);
        }
        
        setIsGenerating(false);
        setHasGenerated(true);
        toast.success('Architecture Generated', 'Neural network design compiled successfully.');
      } else {
        setGenerationPhase(phases[currentPhase]);
      }
    }, 450);
  };

  const handleImportToCanvas = async () => {
    toast.info('Importing', 'Creating project workspace and importing generated architecture...');

    const projectUuid = await addProject({
      name: `${task} - ${dataset}`,
      framework: framework as any,
      status: 'Draft',
    });

    if (projectUuid) {
      setActiveProjectId(projectUuid);
      
      // Store custom nodes in localStorage under the draft key so when the canvas loads,
      // it retrieves this generated configuration! This is a robust self-healing path.
      if (typeof window !== 'undefined') {
        const generatedNodes = layers.map((layer, idx) => {
          let type = layer.type;
          let config: any = {};
          
          if (type === 'Input') {
            config = { dim: [224, 224, 3] };
          } else if (type === 'Conv2D') {
            config = { filters: layer.name.includes('STEM') ? 64 : 128, kernelSize: 3, stride: 1, padding: 'same' };
          } else if (type === 'Dense') {
            config = { units: layer.name.includes('VOCAB') ? 10000 : 100 };
          } else if (type === 'MultiHeadAttention') {
            config = { num_heads: 8, embed_dim: 256 };
          }

          return {
            id: `node_${idx}`,
            type: type as any,
            name: layer.name,
            x: 150 + idx * 180,
            y: 300,
            inputShape: [],
            outputShape: [],
            config
          };
        });

        const generatedEdges = layers.slice(0, -1).map((_, idx) => ({
          id: `edge_${idx}`,
          source: `node_${idx}`,
          target: `node_${idx + 1}`
        }));

        const draftData = {
          nodes: generatedNodes,
          edges: generatedEdges,
          nodeGroups: [
            { id: 'g_stem', name: 'Stem Layers', color: '#8ab4f8', nodeIds: ['node_0', 'node_1', 'node_2'] },
            { id: 'g_head', name: 'Classifier Head', color: '#c5a3ff', nodeIds: [`node_${layers.length - 2}`, `node_${layers.length - 1}`] }
          ]
        };

        localStorage.setItem(`mlbuilder_project_draft_${projectUuid}`, JSON.stringify(draftData));
      }

      router.push(`/editor/${projectUuid}`);
    }
  };

  return (
    <MainLayout>
      <div className="p-8 max-w-6xl mx-auto space-y-8 relative pb-24 font-sans select-none">
        
        {/* Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <Sparkles className="text-[#c5a3ff] animate-pulse" size={32} />
              <span>AI Architecture Generator</span>
            </h1>
            <p className="text-[#9aa0a6] mt-2 text-sm font-semibold">
              Generate fully customized layers optimized for specific compute devices and dataset targets.
            </p>
          </div>
          <button
            onClick={() => router.push('/models/registry')}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#2b2d31] hover:bg-[#313338] text-xs font-bold text-[#e3e3e3] rounded-xl border border-[#3f4046] transition-all cursor-pointer self-start md:self-auto"
          >
            <span>Model Registry</span>
            <ArrowRight size={12} />
          </button>
        </div>

        {/* Tab switcher design */}
        <div className="flex border-b border-[#3f4046]">
          <button
            onClick={() => router.push('/models/registry')}
            className="px-6 py-3 text-sm font-bold text-[#9aa0a6] hover:text-white transition-all cursor-pointer border-b-2 border-transparent"
          >
            Model Registry
          </button>
          <button
            className="px-6 py-3 text-sm font-bold text-[#c5a3ff] border-b-2 border-[#c5a3ff] transition-all cursor-pointer"
          >
            AI Generator
          </button>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column - Prompt Builder */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-[#2b2d31]/50 border border-[#3f4046] rounded-2xl p-6 space-y-5 shadow-xl">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Code className="text-[#8ab4f8]" size={18} />
                <span>Prompt Builder Specs</span>
              </h2>

              {/* Task */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Target Task</label>
                <select
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#1e1f22] border border-[#3f4046] rounded-xl text-xs text-white focus:outline-none focus:border-[#8ab4f8] font-bold cursor-pointer"
                >
                  <option>Image Classification</option>
                  <option>Object Detection</option>
                  <option>NLP Translation</option>
                  <option>Semantic Segmentation</option>
                  <option>Time-Series Forecasting</option>
                </select>
              </div>

              {/* Dataset */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Dataset Context</label>
                <select
                  value={dataset}
                  onChange={(e) => setDataset(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#1e1f22] border border-[#3f4046] rounded-xl text-xs text-white focus:outline-none focus:border-[#8ab4f8] font-bold cursor-pointer"
                >
                  <option>CIFAR10</option>
                  <option>ImageNet</option>
                  <option>COCO Animals</option>
                  <option>IMDB Text</option>
                  <option>Boston Housing</option>
                </select>
              </div>

              {/* Framework */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Code Framework</label>
                <div className="grid grid-cols-3 gap-2">
                  {['PyTorch', 'TensorFlow', 'JAX'].map((fw) => (
                    <button
                      key={fw}
                      type="button"
                      onClick={() => setFramework(fw)}
                      className={`py-2 text-[10px] font-black tracking-wider rounded-xl transition-all border cursor-pointer ${
                        framework === fw 
                          ? 'bg-[#8ab4f8]/10 border-[#8ab4f8] text-[#8ab4f8]' 
                          : 'bg-[#1e1f22] border-[#3f4046] text-gray-400 hover:text-white'
                      }`}
                    >
                      {fw}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Device */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Deployment hardware</label>
                <select
                  value={device}
                  onChange={(e) => setDevice(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#1e1f22] border border-[#3f4046] rounded-xl text-xs text-white focus:outline-none focus:border-[#8ab4f8] font-bold cursor-pointer"
                >
                  <option>NVIDIA RTX 4090</option>
                  <option>NVIDIA Jetson Nano (Edge)</option>
                  <option>Apple M3 Max</option>
                  <option>Intel Xeon CPU</option>
                  <option>Google TPU v4</option>
                </select>
              </div>

              {/* Custom Prompt */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Additional Prompt instructions</label>
                <textarea
                  placeholder="e.g. Include residual skip links after conv blocks, add dropouts, make it lightweight..."
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-[#1e1f22] border border-[#3f4046] rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#8ab4f8] font-semibold resize-none"
                />
              </div>

              {/* Action Button */}
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full py-3 bg-gradient-to-tr from-[#8ab4f8] to-[#c5a3ff] text-[#1e1f22] font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg hover:shadow-[#8ab4f8]/10 cursor-pointer flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="animate-spin" size={14} />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Zap size={14} />
                    <span>Generate Architecture ⚡</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column - Preview & Stats */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Loading Cover state */}
            {isGenerating && (
              <div className="bg-[#2b2d31]/30 border border-[#3f4046] rounded-2xl p-12 flex flex-col items-center justify-center min-h-[420px] space-y-4">
                <RefreshCw size={36} className="text-[#c5a3ff] animate-spin" />
                <div className="text-center space-y-1">
                  <p className="text-sm font-extrabold text-white">Synthesizing Layers</p>
                  <p className="text-[11px] text-[#9aa0a6] font-semibold animate-pulse">{generationPhase}</p>
                </div>
              </div>
            )}

            {/* Generated Architecture details */}
            {!isGenerating && hasGenerated && (
              <div className="space-y-6 animate-fade-in">
                
                {/* Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  
                  {/* Metric: Layers */}
                  <div className="bg-[#2b2d31]/40 border border-[#3f4046] p-4 rounded-xl flex items-center gap-3">
                    <div className="p-2 bg-[#8ab4f8]/10 rounded-lg text-[#8ab4f8]">
                      <Layers size={16} />
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-gray-500">Layers</span>
                      <span className="block text-sm font-extrabold text-white mt-0.5">{metrics.layersCount} Blocks</span>
                    </div>
                  </div>

                  {/* Metric: Parameters */}
                  <div className="bg-[#2b2d31]/40 border border-[#3f4046] p-4 rounded-xl flex items-center gap-3">
                    <div className="p-2 bg-[#ffe082]/10 rounded-lg text-[#ffe082]">
                      <Cpu size={16} />
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-gray-500">Parameters</span>
                      <span className="block text-sm font-extrabold text-white mt-0.5">{metrics.params}</span>
                    </div>
                  </div>

                  {/* Metric: FLOPs */}
                  <div className="bg-[#2b2d31]/40 border border-[#3f4046] p-4 rounded-xl flex items-center gap-3">
                    <div className="p-2 bg-[#c5a3ff]/10 rounded-lg text-[#c5a3ff]">
                      <Activity size={16} />
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-gray-500">FLOPs</span>
                      <span className="block text-sm font-extrabold text-white mt-0.5">{metrics.flops}</span>
                    </div>
                  </div>

                  {/* Metric: VRAM */}
                  <div className="bg-[#2b2d31]/40 border border-[#3f4046] p-4 rounded-xl flex items-center gap-3">
                    <div className="p-2 bg-[#80cbc4]/10 rounded-lg text-[#80cbc4]">
                      <HardDrive size={16} />
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-gray-500">VRAM Sizing</span>
                      <span className="block text-sm font-extrabold text-white mt-0.5">{metrics.vram}</span>
                    </div>
                  </div>
                </div>

                {/* Layer Hierarchy Table */}
                <div className="bg-[#2b2d31]/50 border border-[#3f4046] rounded-2xl shadow-xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-[#3f4046]/80 bg-[#1e1f22]/50 flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider text-white">Generated Layers Sequence</h3>
                    <span className="text-[10px] text-gray-500 font-bold font-mono">Device: {device}</span>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-[#3f4046]/40 text-gray-400 font-extrabold uppercase tracking-wider text-[9px] bg-[#1e1f22]/20">
                          <th className="py-3 px-5">Layer Name</th>
                          <th className="py-3 px-4">Layer Type</th>
                          <th className="py-3 px-4">Output Dimensions</th>
                          <th className="py-3 px-5 text-right">Trainable Params</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#3f4046]/30 font-semibold font-mono">
                        {layers.map((layer, idx) => (
                          <tr key={idx} className="hover:bg-[#2b2d31]/30">
                            <td className="py-3.5 px-5 text-white">{layer.name}</td>
                            <td className="py-3.5 px-4 text-[#8ab4f8]">{layer.type}</td>
                            <td className="py-3.5 px-4 text-gray-400">{layer.shape}</td>
                            <td className="py-3.5 px-5 text-right text-gray-300">{layer.params}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Footer CTAs */}
                  <div className="p-4 bg-[#1e1f22]/50 border-t border-[#3f4046] flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-gray-500">
                      <Terminal size={12} className="text-[#8ab4f8]" />
                      <span>Ready for canvas translation.</span>
                    </div>
                    
                    <button
                      onClick={handleImportToCanvas}
                      className="flex items-center gap-1.5 px-5 py-2.5 bg-[#8ab4f8] hover:bg-[#a8c7fa] text-[#1e1f22] text-[11px] font-black uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer"
                    >
                      <span>Import into Canvas</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                </div>

                {/* Flow preview graph diagram */}
                <div className="bg-[#2b2d31]/30 border border-[#3f4046] p-5 rounded-2xl space-y-4">
                  <span className="text-[10px] uppercase font-black tracking-widest text-gray-500 block">Flow Topology Preview</span>
                  <div className="flex flex-wrap items-center justify-start gap-2.5 overflow-x-auto py-2">
                    {layers.map((layer, idx) => (
                      <React.Fragment key={idx}>
                        <div className="bg-[#1e1f22] border border-[#3f4046] px-3.5 py-2.5 rounded-xl flex flex-col items-center justify-center shadow-md shrink-0">
                          <span className="text-[10px] font-extrabold text-white font-sans">{layer.name}</span>
                          <span className="text-[8px] font-black text-[#8ab4f8] tracking-widest uppercase mt-0.5">{layer.type}</span>
                          <span className="text-[8px] font-bold text-gray-600 font-mono mt-1">{layer.shape}</span>
                        </div>
                        {idx < layers.length - 1 && (
                          <div className="h-0.5 w-6 bg-[#3f4046] flex items-center justify-center shrink-0">
                            <ArrowRight size={10} className="text-gray-600" />
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>

      </div>
    </MainLayout>
  );
}
