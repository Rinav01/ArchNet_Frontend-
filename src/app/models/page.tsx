'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/Layout/MainLayout';
import { Cpu, ArrowRight, Star } from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';

interface PrebuiltModel {
  name: string;
  category: string;
  parameters: string;
  description: string;
  popularity: string;
}

export default function ModelsPage() {
  const router = useRouter();
  const addProject = useProjectStore((state) => state.addProject);
  const setActiveProjectId = useProjectStore((state) => state.setActiveProjectId);

  const prebuiltModels: PrebuiltModel[] = [
    { name: 'ResNet-50', category: 'Computer Vision', parameters: '25.6M', description: 'Deep residual network with bottleneck connections, perfect for high-accuracy image categorization.', popularity: '98%' },
    { name: 'MobileNet-V3', category: 'Edge Computing', parameters: '5.4M', description: 'Hardware-aware architecture using depthwise convolutions and squeeze-and-excitation layers.', popularity: '94%' },
    { name: 'Self-Attention Block', category: 'NLP / Transformers', parameters: '12.2M', description: 'Multi-head scaled dot-product attention block tracing tensor relations downstream.', popularity: '96%' },
    { name: 'U-Net Decoder', category: 'Image Segmentation', parameters: '31.0M', description: 'Symmetric encoder-decoder topology with feature map skip-connections for spatial precision.', popularity: '91%' },
  ];

  const handleImportModel = (model: PrebuiltModel) => {
    const newProjId = model.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    addProject({
      name: model.name,
      framework: 'PyTorch',
      status: 'Draft',
    });
    
    setActiveProjectId(newProjId);
    router.push(`/editor/${newProjId}`);
  };

  return (
    <MainLayout>
      <div className="p-8 max-w-5xl mx-auto space-y-8 relative pb-16">
        
        {/* Title */}
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <Cpu className="text-[#8ab4f8]" size={32} />
            <span>Architecture Hub</span>
          </h1>
          <p className="text-[#9aa0a6] mt-2 text-sm font-semibold">
            Import production-grade deep learning base templates directly onto your workspace canvas.
          </p>
        </div>

        {/* Model cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {prebuiltModels.map((model, idx) => (
            <div 
              key={idx} 
              className="bg-[#2b2d31] border border-[#3f4046] rounded-2xl p-6 flex flex-col justify-between min-h-[220px] relative overflow-hidden shadow-lg transition-all"
            >
              <div className="absolute -right-12 -top-12 w-24 h-24 bg-[#8ab4f8]/5 rounded-full blur-xl"></div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-md border border-[#8ab4f8]/20 bg-[#8ab4f8]/10 text-[#8ab4f8]">
                    {model.category}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-bold text-[#ffe082]">
                    <Star size={12} className="fill-[#ffe082] text-[#ffe082]" />
                    {model.popularity} popularity
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-white tracking-wide">{model.name}</h3>
                  <span className="text-[10px] text-[#9aa0a6] font-mono block mt-0.5">Parameters: {model.parameters}</span>
                </div>

                <p className="text-xs text-[#9aa0a6] font-semibold leading-relaxed">
                  {model.description}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-[#3f4046] flex items-center justify-end">
                <button
                  onClick={() => handleImportModel(model)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#8ab4f8]/10 hover:bg-[#8ab4f8]/20 text-xs font-bold text-[#8ab4f8] hover:text-[#a8c7fa] rounded-full border border-[#8ab4f8]/20 transition-all cursor-pointer"
                >
                  <span>Import Template</span>
                  <ArrowRight size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </MainLayout>
  );
}
