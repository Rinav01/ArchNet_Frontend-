'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/Layout/MainLayout';
import { useProjectStore } from '@/store/projectStore';
import { 
  Cpu, 
  ArrowRight, 
  Search, 
  Sparkles, 
  Layers, 
  Activity, 
  Database,
  Info,
  Network,
  TrendingUp,
  Workflow
} from 'lucide-react';

interface ResearchTemplate {
  id: string;
  name: string;
  templateKey: string;
  category: string;
  subcategory: string;
  params: string;
  flops: string;
  vram: string;
  description: string;
  color: string;
  nodes: { label: string; type: string; color: string }[];
  connections: { from: number; to: number }[];
}

export default function ResearchPlaygroundPage() {
  const router = useRouter();
  const addProject = useProjectStore((state) => state.addProject);
  const setActiveProjectId = useProjectStore((state) => state.setActiveProjectId);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  const templates: ResearchTemplate[] = [
    {
      id: 'bert',
      name: 'BERT (Bidirectional Encoder)',
      templateKey: 'Mini-BERT',
      category: 'Transformers',
      subcategory: 'NLP / Transformers',
      params: '110M',
      flops: '12.5 GFLOPs',
      vram: '440 MB',
      description: 'Standard bidirectional transformer encoder stack utilizing parallel self-attention. Highly optimized for extracting rich semantic representations from sequence contexts.',
      color: '#c5a3ff',
      nodes: [
        { label: 'Token Input', type: 'Input', color: '#8ab4f8' },
        { label: 'Word Embedding', type: 'Embedding', color: '#c5a3ff' },
        { label: 'Positional Encoding', type: 'PositionalEncoding', color: '#c5a3ff' },
        { label: 'LayerNorm', type: 'LayerNorm', color: '#80cbc4' },
        { label: 'Transformer Encoder 1', type: 'TransformerBlock', color: '#c5a3ff' },
        { label: 'Transformer Encoder 2', type: 'TransformerBlock', color: '#c5a3ff' },
        { label: 'Projection Head', type: 'Dense', color: '#ffe082' }
      ],
      connections: [
        { from: 0, to: 1 },
        { from: 1, to: 2 },
        { from: 2, to: 3 },
        { from: 3, to: 4 },
        { from: 4, to: 5 },
        { from: 5, to: 6 }
      ]
    },
    {
      id: 'gpt',
      name: 'GPT (Autoregressive Decoder)',
      templateKey: 'Mini-GPT',
      category: 'Transformers',
      subcategory: 'NLP / Transformers',
      params: '125M',
      flops: '15.0 GFLOPs',
      vram: '500 MB',
      description: 'Causal auto-regressive decoder-only transformer block layout. Equipped with masked self-attention to predict subsequent tokens recursively given leftward context.',
      color: '#ffe082',
      nodes: [
        { label: 'Context Input', type: 'Input', color: '#8ab4f8' },
        { label: 'Token Embedding', type: 'Embedding', color: '#c5a3ff' },
        { label: 'Positional Signatures', type: 'PositionalEncoding', color: '#c5a3ff' },
        { label: 'Transformer Decoder 1', type: 'TransformerBlock', color: '#ffe082' },
        { label: 'Transformer Decoder 2', type: 'TransformerBlock', color: '#ffe082' },
        { label: 'Next-Token Classifier', type: 'Dense', color: '#ffe082' }
      ],
      connections: [
        { from: 0, to: 1 },
        { from: 1, to: 2 },
        { from: 2, to: 3 },
        { from: 3, to: 4 },
        { from: 4, to: 5 }
      ]
    },
    {
      id: 'vit',
      name: 'Vision Transformer (ViT)',
      templateKey: 'ViT',
      category: 'Transformers',
      subcategory: 'Computer Vision',
      params: '86M',
      flops: '18.2 GFLOPs',
      vram: '344 MB',
      description: 'Applies transformer block layers directly to flattened, projected image patches. Replaces standard convolution structures with patch projection and self-attention mechanisms.',
      color: '#8ab4f8',
      nodes: [
        { label: 'Input Image', type: 'Input', color: '#8ab4f8' },
        { label: 'Patch Projection Conv', type: 'Conv2D', color: '#ff6633' },
        { label: 'BatchNorm Stem', type: 'BatchNorm2D', color: '#80cbc4' },
        { label: 'Attention QKV', type: 'Conv2D', color: '#ff6633' },
        { label: 'Attention Out', type: 'Conv2D', color: '#ff6633' },
        { label: 'MLP Hidden Projection', type: 'Conv2D', color: '#ff6633' },
        { label: 'Classification Head', type: 'Dense', color: '#ffe082' }
      ],
      connections: [
        { from: 0, to: 1 },
        { from: 1, to: 2 },
        { from: 2, to: 3 },
        { from: 3, to: 4 },
        { from: 4, to: 5 },
        { from: 5, to: 6 }
      ]
    },
    {
      id: 'unet',
      name: 'U-Net Decoder',
      templateKey: 'UNet',
      category: 'CNN',
      subcategory: 'Image Segmentation',
      params: '31M',
      flops: '120.4 GFLOPs',
      vram: '124 MB',
      description: 'Symmetric Encoder-Decoder CNN framework designed for high-resolution semantic segmentation. Combines successive downsampling blocks with feature map skip-connections.',
      color: '#ff6633',
      nodes: [
        { label: 'Input Image', type: 'Input', color: '#8ab4f8' },
        { label: 'Encoder Conv Stage 1', type: 'Conv2D', color: '#ff6633' },
        { label: 'Encoder MaxPool 1', type: 'MaxPool2D', color: '#ff9000' },
        { label: 'Encoder Conv Stage 2', type: 'Conv2D', color: '#ff6633' },
        { label: 'Bottleneck Conv', type: 'Conv2D', color: '#ff6633' },
        { label: 'Decoder Stage 2 Up', type: 'Conv2D', color: '#ff6633' },
        { label: 'Decoder Stage 1 Up', type: 'Conv2D', color: '#ff6633' },
        { label: 'Segmentation Mask Out', type: 'Conv2D', color: '#ff6633' }
      ],
      connections: [
        { from: 0, to: 1 },
        { from: 1, to: 2 },
        { from: 2, to: 3 },
        { from: 3, to: 4 },
        { from: 4, to: 5 },
        { from: 5, to: 6 },
        { from: 6, to: 7 }
      ]
    },
    {
      id: 'graphsage',
      name: 'GraphSAGE',
      templateKey: 'GraphSAGE',
      category: 'Graph Learning',
      subcategory: 'Representation Learning',
      params: '1.2M',
      flops: '0.15 GFLOPs',
      vram: '5 MB',
      description: 'Inductive representation learning algorithm for large-scale graphs. Leverages node neighborhood feature aggregation and sampling to generalize to unseen topological structures.',
      color: '#81c784',
      nodes: [
        { label: 'Node Features Input', type: 'Input', color: '#8ab4f8' },
        { label: 'Edge Index Input', type: 'Input', color: '#8ab4f8' },
        { label: 'SAGE Conv Layer 1', type: 'GraphSAGE', color: '#81c784' },
        { label: 'SAGE Conv Layer 2', type: 'GraphSAGE', color: '#81c784' }
      ],
      connections: [
        { from: 0, to: 2 },
        { from: 1, to: 2 },
        { from: 2, to: 3 },
        { from: 1, to: 3 }
      ]
    }
  ];

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('bert');
  const activeTemplate = templates.find(t => t.id === selectedTemplateId) || templates[0];

  const handleImportModel = async (template: ResearchTemplate) => {
    const projectUuid = await addProject({
      name: `Research - ${template.name.split(' (')[0]}`,
      framework: 'PyTorch',
      status: 'Draft',
    });
    
    if (projectUuid) {
      setActiveProjectId(projectUuid);
      router.push(`/editor/${projectUuid}?template=${template.templateKey}`);
    }
  };

  const categories = ['All', 'CNN', 'NLP', 'Transformers', 'Graph Learning'];

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || t.category === selectedCategory || 
                            (selectedCategory === 'NLP' && t.subcategory.includes('NLP'));
    return matchesSearch && matchesCategory;
  });

  return (
    <MainLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-8 relative pb-16 min-h-screen">
        
        {/* Title */}
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <Sparkles className="text-[#c5a3ff]" size={32} />
            <span>Research Playground</span>
          </h1>
          <p className="text-[#9aa0a6] mt-2 text-sm font-semibold">
            Explore and deploy SOTA transformer block topologies and graph learning networks instantly on your workspace canvas.
          </p>
        </div>

        {/* Tab switcher design */}
        <div className="flex border-b border-[#3f4046]">
          <button
            onClick={() => router.push('/models')}
            className="px-6 py-3 text-sm font-bold text-[#9aa0a6] hover:text-white transition-all cursor-pointer border-b-2 border-transparent"
          >
            Templates Catalog
          </button>
          <button
            onClick={() => router.push('/models/registry')}
            className="px-6 py-3 text-sm font-bold text-[#9aa0a6] hover:text-white transition-all cursor-pointer border-b-2 border-transparent"
          >
            Model Registry
          </button>
          <button
            className="px-6 py-3 text-sm font-bold text-[#c5a3ff] border-b-2 border-[#c5a3ff] transition-all cursor-pointer"
          >
            Research Playground
          </button>
        </div>

        {/* Filters and Search toolbar */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#c5a3ff]/10 border-[#c5a3ff]/40 text-[#c5a3ff]'
                    : 'bg-[#2b2d31]/50 border-[#3f4046] text-[#9aa0a6] hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={15} />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#1e2024] border border-[#3f4046] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#c5a3ff] transition-all"
            />
          </div>
        </div>

        {/* 2-Column Split Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Template Cards List (7 columns) */}
          <div className="lg:col-span-7 space-y-4">
            {filteredTemplates.length === 0 ? (
              <div className="bg-[#2b2d31]/30 border border-[#3f4046] rounded-2xl p-12 text-center text-[#9aa0a6]">
                No templates matched your filtering criteria.
              </div>
            ) : (
              filteredTemplates.map((template) => {
                const isSelected = selectedTemplateId === template.id;
                return (
                  <div
                    key={template.id}
                    onClick={() => setSelectedTemplateId(template.id)}
                    className={`bg-[#2b2d31]/40 border rounded-2xl p-5 flex flex-col justify-between gap-4 cursor-pointer transition-all relative overflow-hidden ${
                      isSelected 
                        ? 'border-[#c5a3ff]/60 bg-[#c5a3ff]/5 shadow-lg' 
                        : 'border-[#3f4046] hover:border-white/20'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-md border border-[#c5a3ff]/20 bg-[#c5a3ff]/10 text-[#c5a3ff]">
                            {template.subcategory}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-white mt-1">{template.name}</h3>
                      </div>
                      
                      <div className="flex items-center gap-1.5 font-mono text-xs">
                        <span className="text-gray-500">Params:</span>
                        <span className="text-white font-extrabold">{template.params}</span>
                      </div>
                    </div>

                    <p className="text-xs text-[#9aa0a6] leading-relaxed line-clamp-2">
                      {template.description}
                    </p>

                    <div className="flex justify-between items-center pt-3 border-t border-[#3f4046]/40 text-[10px] text-gray-500 font-mono">
                      <div className="flex gap-4">
                        <span>FLOPs: <b className="text-gray-300">{template.flops}</b></span>
                        <span>VRAM: <b className="text-gray-300">{template.vram}</b></span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleImportModel(template);
                        }}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#c5a3ff] hover:bg-[#d8c3ff] text-[#1e1f22] text-xs font-black tracking-wide rounded-full transition-all cursor-pointer shadow-md shadow-[#c5a3ff]/10"
                      >
                        <span>Insert Into Canvas</span>
                        <ArrowRight size={11} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Column: Live Interactive Flowchart Visualizer (5 columns) */}
          <div className="lg:col-span-5 bg-[#1e2024]/60 border border-[#3f4046] rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[580px] sticky top-8">
            
            {/* Visualizer Header */}
            <div className="px-6 py-4 border-b border-[#3f4046] bg-[#1e2024]/90 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Workflow className="text-[#c5a3ff]" size={16} />
                <span className="text-xs font-bold uppercase tracking-wider text-white">Architecture Flow Preview</span>
              </div>
              <span className="text-[10px] font-mono text-[#c5a3ff] uppercase font-black">
                {activeTemplate.name.split(' (')[0]}
              </span>
            </div>

            {/* Interactive Flowchart Diagram Canvas area */}
            <div className="flex-1 bg-[#0f1012] p-6 relative overflow-y-auto custom-scrollbar flex flex-col items-center justify-center gap-4">
              <div className="w-full max-w-sm space-y-3 py-4">
                {activeTemplate.nodes.map((node, index) => {
                  return (
                    <div key={index} className="flex flex-col items-center w-full relative">
                      {/* Node block */}
                      <div 
                        style={{ borderLeftColor: node.color }}
                        className="w-full bg-[#1b1c21] border-l-4 border border-[#3f4046] rounded-xl px-4 py-3 shadow-md transition-all hover:scale-[1.02] flex items-center justify-between"
                      >
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-white tracking-wide">{node.label}</span>
                          <span className="text-[9px] text-gray-500 font-mono">{node.type}</span>
                        </div>
                        <div 
                          style={{ backgroundColor: `${node.color}15`, borderColor: `${node.color}40`, color: node.color }}
                          className="text-[8px] font-mono font-black uppercase px-2 py-0.5 rounded border"
                        >
                          {node.type.substring(0, 8)}
                        </div>
                      </div>

                      {/* Connection arrow to next node */}
                      {index < activeTemplate.nodes.length - 1 && (
                        <div className="h-6 w-[1px] bg-gradient-to-b from-[#3f4046] to-[#555] flex items-center justify-center relative my-0.5">
                          <div className="w-1.5 h-1.5 border-r border-b border-gray-400 rotate-45 transform translate-y-1"></div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Technical Analytics Details and Action Panel */}
            <div className="p-6 border-t border-[#3f4046] bg-[#1a1b1f] space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-[#101113] p-3 rounded-xl border border-[#2b2d31]">
                  <div className="text-[9px] uppercase tracking-wider text-gray-500 font-semibold flex justify-center items-center gap-1">
                    <Database size={9} />
                    <span>Parameters</span>
                  </div>
                  <div className="text-sm font-black text-white mt-1 font-mono">{activeTemplate.params}</div>
                </div>

                <div className="bg-[#101113] p-3 rounded-xl border border-[#2b2d31]">
                  <div className="text-[9px] uppercase tracking-wider text-gray-500 font-semibold flex justify-center items-center gap-1">
                    <Activity size={9} />
                    <span>Compute</span>
                  </div>
                  <div className="text-sm font-black text-[#8ab4f8] mt-1 font-mono">{activeTemplate.flops}</div>
                </div>

                <div className="bg-[#101113] p-3 rounded-xl border border-[#2b2d31]">
                  <div className="text-[9px] uppercase tracking-wider text-gray-500 font-semibold flex justify-center items-center gap-1">
                    <TrendingUp size={9} />
                    <span>Memory</span>
                  </div>
                  <div className="text-sm font-black text-[#81c784] mt-1 font-mono">{activeTemplate.vram}</div>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="p-2 bg-amber-400/5 border border-amber-400/10 rounded-xl text-amber-400 shrink-0">
                  <Info size={14} className="mt-0.5" />
                </div>
                <p className="text-[10px] text-gray-400 leading-relaxed font-semibold">
                  Clicking deploy creates a draft project workspace. All prebuilt models compile natively into PyTorch/Keras scripts on the visual canvas.
                </p>
              </div>

              <button
                onClick={() => handleImportModel(activeTemplate)}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#c5a3ff] hover:bg-[#d8c3ff] text-[#1e1f22] rounded-xl text-xs font-black tracking-wider shadow-lg shadow-[#c5a3ff]/10 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
              >
                <span>INSERT TEMPLATE INTO CANVAS</span>
                <ArrowRight size={13} />
              </button>
            </div>

          </div>

        </div>

      </div>
    </MainLayout>
  );
}
