'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/Layout/MainLayout';
import { useDeploymentStore } from '@/store/deploymentStore';
import { useProjectStore } from '@/store/projectStore';
import { 
  Cpu, 
  ArrowRight, 
  Search, 
  Plus, 
  Layers, 
  ShieldCheck, 
  Percent, 
  Calendar, 
  GitBranch, 
  Play, 
  Settings, 
  CloudLightning,
  Filter
} from 'lucide-react';

export default function ModelRegistryPage() {
  const router = useRouter();
  const registeredModels = useDeploymentStore((state) => state.registeredModels);
  const projects = useProjectStore((state) => state.projects);
  const setActiveProjectId = useProjectStore((state) => state.setActiveProjectId);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFramework, setSelectedFramework] = useState<string>('ALL');

  // Filter models
  const filteredModels = registeredModels.filter((model) => {
    const matchesSearch = model.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          model.version.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFramework = selectedFramework === 'ALL' || model.framework === selectedFramework;
    return matchesSearch && matchesFramework;
  });

  // Framework style mapping
  const frameworkBadges: Record<string, { bg: string; text: string; border: string; emoji: string }> = {
    PyTorch: { bg: 'bg-[#ff6633]/10', text: 'text-[#ff6633]', border: 'border-[#ff6633]/25', emoji: '🔥' },
    TensorFlow: { bg: 'bg-[#ff9000]/10', text: 'text-[#ff9000]', border: 'border-[#ff9000]/25', emoji: '🍊' },
    JAX: { bg: 'bg-[#8ab4f8]/10', text: 'text-[#8ab4f8]', border: 'border-[#8ab4f8]/25', emoji: '⚡' },
    ONNX: { bg: 'bg-[#c5a3ff]/10', text: 'text-[#c5a3ff]', border: 'border-[#c5a3ff]/25', emoji: '💎' },
  };

  // Find top accuracy
  const topAccuracy = Math.max(...registeredModels.map(m => m.accuracy), 0) * 100;

  // Handle routing to project editor or deploy page
  const handleDeployClick = (projectId: string) => {
    // If the projectId is from our prebuilts or mock, set active and route
    setActiveProjectId(projectId);
    router.push(`/editor/${projectId}/deploy`);
  };

  return (
    <MainLayout>
      <div className="p-8 max-w-6xl mx-auto space-y-8 relative pb-16">
        
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <ShieldCheck className="text-[#80cbc4]" size={36} />
              <span>Model Registry</span>
            </h1>
            <p className="text-[#9aa0a6] mt-2 text-sm font-semibold">
              Enterprise versioned repository for audited deep learning artifacts and deployments.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/models')}
              className="flex items-center gap-2 px-4 py-2 bg-[#2b2d31] hover:bg-[#313338] text-xs font-bold text-white rounded-xl border border-[#3f4046] transition-all cursor-pointer"
            >
              <Plus size={14} />
              <span>Import Templates</span>
            </button>
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#8ab4f8]/10 hover:bg-[#8ab4f8]/20 text-xs font-bold text-[#8ab4f8] hover:text-[#a8c7fa] rounded-xl border border-[#8ab4f8]/20 transition-all cursor-pointer"
            >
              <span>Project Dashboard</span>
              <ArrowRight size={12} />
            </button>
          </div>
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
            className="px-6 py-3 text-sm font-bold text-[#80cbc4] border-b-2 border-[#80cbc4] transition-all cursor-pointer"
          >
            Model Registry
          </button>
        </div>

        {/* Analytics Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Total Models */}
          <div className="bg-[#2b2d31]/50 border border-[#3f4046] p-5 rounded-2xl flex items-center justify-between shadow-lg relative overflow-hidden">
            <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 w-16 h-16 bg-[#80cbc4]/5 rounded-full blur-xl"></div>
            <div>
              <span className="text-[10px] uppercase font-black tracking-wider text-gray-500">Registered Models</span>
              <h3 className="text-3xl font-extrabold text-white mt-1">{registeredModels.length}</h3>
              <span className="text-[9px] text-[#80cbc4] font-semibold block mt-1">Ready for production</span>
            </div>
            <div className="p-3 bg-[#80cbc4]/10 border border-[#80cbc4]/20 rounded-xl text-[#80cbc4]">
              <Cpu size={20} />
            </div>
          </div>

          {/* Card 2: Highest Accuracy */}
          <div className="bg-[#2b2d31]/50 border border-[#3f4046] p-5 rounded-2xl flex items-center justify-between shadow-lg relative overflow-hidden">
            <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 w-16 h-16 bg-[#ffe082]/5 rounded-full blur-xl"></div>
            <div>
              <span className="text-[10px] uppercase font-black tracking-wider text-gray-500">Peak Register Accuracy</span>
              <h3 className="text-3xl font-extrabold text-[#ffe082] mt-1">{topAccuracy.toFixed(1)}%</h3>
              <span className="text-[9px] text-[#ffe082] font-semibold block mt-1">Benchmark baseline model</span>
            </div>
            <div className="p-3 bg-[#ffe082]/10 border border-[#ffe082]/20 rounded-xl text-[#ffe082]">
              <Percent size={20} />
            </div>
          </div>

          {/* Card 3: Framework distribution */}
          <div className="bg-[#2b2d31]/50 border border-[#3f4046] p-5 rounded-2xl flex items-center justify-between shadow-lg relative overflow-hidden">
            <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 w-16 h-16 bg-[#c5a3ff]/5 rounded-full blur-xl"></div>
            <div>
              <span className="text-[10px] uppercase font-black tracking-wider text-gray-500">Active Frameworks</span>
              <h3 className="text-3xl font-extrabold text-white mt-1">4 Modes</h3>
              <span className="text-[9px] text-[#c5a3ff] font-semibold block mt-1">PyTorch / TF / JAX / ONNX</span>
            </div>
            <div className="p-3 bg-[#c5a3ff]/10 border border-[#c5a3ff]/20 rounded-xl text-[#c5a3ff]">
              <GitBranch size={20} />
            </div>
          </div>

          {/* Card 4: Deployment Status */}
          <div className="bg-[#2b2d31]/50 border border-[#3f4046] p-5 rounded-2xl flex items-center justify-between shadow-lg relative overflow-hidden">
            <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 w-16 h-16 bg-[#8ab4f8]/5 rounded-full blur-xl"></div>
            <div>
              <span className="text-[10px] uppercase font-black tracking-wider text-gray-500">K8s Deployment Nodes</span>
              <h3 className="text-3xl font-extrabold text-white mt-1">Live Endpoint</h3>
              <span className="text-[9px] text-[#8ab4f8] font-semibold block mt-1">Simulated load balancer</span>
            </div>
            <div className="p-3 bg-[#8ab4f8]/10 border border-[#8ab4f8]/20 rounded-xl text-[#8ab4f8]">
              <CloudLightning size={20} />
            </div>
          </div>
        </div>

        {/* Filter controls and Search Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-[#2b2d31]/30 border border-[#3f4046]/80 p-4 rounded-2xl">
          <div className="relative w-full md:w-80">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search registry by model or version..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#1e1f22] border border-[#3f4046] rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#8ab4f8] focus:ring-1 focus:ring-[#8ab4f8]/20 transition-all font-semibold"
            />
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            <div className="p-2 bg-[#1e1f22] border border-[#3f4046] rounded-xl text-gray-500">
              <Filter size={14} />
            </div>
            <div className="flex gap-1.5 bg-[#1e1f22] border border-[#3f4046] p-1 rounded-xl">
              {['ALL', 'PyTorch', 'TensorFlow', 'JAX', 'ONNX'].map((fw) => (
                <button
                  key={fw}
                  onClick={() => setSelectedFramework(fw)}
                  className={`px-3 py-1.5 text-[10px] font-black tracking-wide rounded-lg transition-all cursor-pointer ${
                    selectedFramework === fw
                      ? 'bg-[#8ab4f8] text-[#1e1f22]'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {fw}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Table for Registered Models */}
        <div className="bg-[#2b2d31]/50 border border-[#3f4046] rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#3f4046]/80 bg-[#1e1f22]/50 text-gray-400 font-extrabold uppercase tracking-wider text-[10px]">
                  <th className="py-4 px-6">Model</th>
                  <th className="py-4 px-4">Version</th>
                  <th className="py-4 px-4">Framework</th>
                  <th className="py-4 px-4 text-center">Accuracy</th>
                  <th className="py-4 px-4">Created</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#3f4046]/50">
                {filteredModels.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-500 font-semibold text-sm">
                      <Cpu size={32} className="mx-auto mb-3 text-[#3f4046]" />
                      No registered models found matching the search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredModels.map((model) => {
                    const badge = frameworkBadges[model.framework] || { bg: 'bg-[#2b2d31]', text: 'text-white', border: 'border-[#3f4046]', emoji: '🧠' };
                    return (
                      <tr 
                        key={model.id} 
                        className="hover:bg-[#2b2d31]/30 transition-all font-semibold"
                      >
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-[#8ab4f8]/10 border border-[#8ab4f8]/20 rounded-lg text-[#8ab4f8] shrink-0">
                              <Cpu size={16} />
                            </div>
                            <div>
                              <p className="font-extrabold text-white text-sm tracking-wide">{model.name}</p>
                              <p className="text-[10px] text-gray-500 font-mono mt-0.5">ID: {model.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-gray-300 font-mono">
                          <span className="flex items-center gap-1.5">
                            <GitBranch size={12} className="text-[#8ab4f8]" />
                            {model.version}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-black tracking-wide ${badge.bg} ${badge.text} ${badge.border}`}>
                            <span>{badge.emoji}</span>
                            <span>{model.framework}</span>
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center font-mono">
                          <span className="text-white font-extrabold">{(model.accuracy * 100).toFixed(2)}%</span>
                        </td>
                        <td className="py-4 px-4 text-gray-400 font-medium">
                          <span className="flex items-center gap-1.5">
                            <Calendar size={12} className="text-gray-500" />
                            {new Date(model.createdAt).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleDeployClick(model.projectId)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-[#8ab4f8] hover:bg-[#a8c7fa] text-[#1e1f22] text-[10px] font-black rounded-lg transition-all cursor-pointer"
                              title="Go to Deployment Center"
                            >
                              <CloudLightning size={12} />
                              <span>Deploy Center</span>
                            </button>
                            <button
                              onClick={() => {
                                setActiveProjectId(model.projectId);
                                router.push(`/editor/${model.projectId}/inference`);
                              }}
                              className="flex items-center gap-1 px-3 py-1.5 bg-[#2b2d31] hover:bg-[#313338] border border-[#3f4046] text-[#e3e3e3] text-[10px] font-bold rounded-lg transition-all cursor-pointer"
                              title="Test model on playground"
                            >
                              <Play size={10} className="text-[#80cbc4]" />
                              <span>Playground</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </MainLayout>
  );
}
