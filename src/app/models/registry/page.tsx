'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/Layout/MainLayout';
import { useDeploymentStore } from '@/store/deploymentStore';
import { useProjectStore } from '@/store/projectStore';
import { useExperimentStore, ModelVersion } from '@/store/experimentStore';
import { toast } from '@/store/notificationStore';
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
  Filter,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  FileText,
  Activity,
  Terminal,
  FileCode,
  Copy,
  Check
} from 'lucide-react';

interface ExplorerNode {
  id: string;
  name: string;
  type: 'project' | 'experiment' | 'run' | 'version';
  children?: ExplorerNode[];
  metadata?: any;
}

export default function ModelRegistryPage() {
  const router = useRouter();
  
  // Zustand Stores
  const registeredModels = useDeploymentStore((state) => state.registeredModels);
  const loadRegistryAndDeployments = useDeploymentStore((state) => state.loadRegistryAndDeployments);
  
  const projects = useProjectStore((state) => state.projects);
  const activeProjectId = useProjectStore((state) => state.activeProjectId);
  const loadProjects = useProjectStore((state) => state.loadProjects);
  const setActiveProjectId = useProjectStore((state) => state.setActiveProjectId);
  
  const experiments = useExperimentStore((state) => state.experiments);
  const modelVersions = useExperimentStore((state) => state.modelVersions);
  const loadExperimentsAndVersions = useExperimentStore((state) => state.loadExperimentsAndVersions);
  const rollbackVersion = useExperimentStore((state) => state.rollbackVersion);

  // UI state
  const [selectedVersion, setSelectedVersion] = useState<ModelVersion | null>(null);
  const [activeTab, setActiveTab] = useState<'metrics' | 'configs' | 'weights' | 'compiler'>('metrics');
  const [copied, setCopied] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (projects.length === 0) {
      loadProjects();
    }
  }, []);

  useEffect(() => {
    if (!activeProjectId && projects.length > 0) {
      setActiveProjectId(projects[0].id);
    }
  }, [projects, activeProjectId]);

  useEffect(() => {
    if (activeProjectId) {
      loadExperimentsAndVersions(activeProjectId);
      loadRegistryAndDeployments(activeProjectId);
    }
  }, [activeProjectId]);

  useEffect(() => {
    if (modelVersions.length > 0) {
      if (selectedVersion) {
        const found = modelVersions.find(v => v.id === selectedVersion.id);
        if (found) {
          setSelectedVersion(found);
          return;
        }
      }
      setSelectedVersion(modelVersions[0]);
    } else {
      setSelectedVersion(null);
    }
  }, [modelVersions]);

  useEffect(() => {
    if (projects.length > 0) {
      setExpandedNodes(prev => {
        const next = { ...prev };
        projects.forEach(p => {
          if (next[p.id] === undefined) {
            next[p.id] = true;
          }
        });
        return next;
      });
    } else {
      setExpandedNodes(prev => ({
        ...prev,
        'proj_mock': true,
        'exp_1': true,
        'run_1': true
      }));
    }
  }, [projects]);

  // Hierarchical Explorer structure representation
  const explorerTree: ExplorerNode[] = projects.length > 0 
    ? projects.map(proj => {
        const isMainProject = proj.id === activeProjectId;
        const projectExps = isMainProject ? experiments : [];
        return {
          id: proj.id,
          name: proj.name,
          type: 'project' as const,
          children: projectExps.map(exp => ({
            id: exp.id,
            name: exp.name,
            type: 'experiment' as const,
            children: exp.runs.map(run => {
              const versionMeta = modelVersions.find(v => v.id === run.id);
              const versionNode: ExplorerNode = {
                id: run.id,
                name: versionMeta ? `${versionMeta.versionTag}${versionMeta.isActive ? ' (Active)' : ''}` : `Model v${run.id.substring(0, 3)}`,
                type: 'version' as const,
                metadata: versionMeta || {
                  id: run.id,
                  versionTag: `Model v${run.id.substring(0, 3)}`,
                  commitHash: `sha256:${run.id.replace(/-/g, '').substring(0, 12)}`,
                  accuracy: run.accuracy,
                  loss: run.loss,
                  framework: run.framework,
                  author: 'SandboxArchitect',
                  timestamp: new Date(run.createdAt).toLocaleDateString(),
                  isActive: false
                }
              };
              return {
                id: `run_${run.id}`,
                name: run.name,
                type: 'run' as const,
                children: [versionNode]
              };
            })
          }))
        };
      })
    : [
        {
          id: 'proj_mock',
          name: 'Offline Sandbox Project',
          type: 'project' as const,
          children: experiments.map(exp => ({
            id: exp.id,
            name: exp.name,
            type: 'experiment' as const,
            children: exp.runs.map(run => {
              const versionMeta = modelVersions.find(v => v.id === run.id);
              const versionNode: ExplorerNode = {
                id: run.id,
                name: versionMeta ? `${versionMeta.versionTag}${versionMeta.isActive ? ' (Active)' : ''}` : `Model v${run.id.substring(0, 3)}`,
                type: 'version' as const,
                metadata: versionMeta || {
                  id: run.id,
                  versionTag: `Model v${run.id.substring(0, 3)}`,
                  commitHash: `sha256:${run.id.replace(/-/g, '').substring(0, 12)}`,
                  accuracy: run.accuracy,
                  loss: run.loss,
                  framework: run.framework,
                  author: 'SandboxArchitect',
                  timestamp: new Date(run.createdAt).toLocaleDateString(),
                  isActive: false
                }
              };
              return {
                id: `run_${run.id}`,
                name: run.name,
                type: 'run' as const,
                children: [versionNode]
              };
            })
          }))
        }
      ];

  // Helper toggle explorer node
  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  const handleSelectVersion = (version: ModelVersion) => {
    setSelectedVersion(version);
    toast.info('Model Selected', `Displaying artifacts for ${version.versionTag}`);
  };

  const handleRollback = async (versionId: string) => {
    toast.info('Rollback Initiated', `Rolling back active environment to target version...`);
    await rollbackVersion(versionId);
    // Find version
    const updated = modelVersions.find(v => v.id === versionId);
    if (updated) {
      setSelectedVersion({ ...updated, isActive: true });
    }
    toast.success('Rollback Complete', `Target model version is now set to ACTIVE.`);
  };

  const handleCopyConfig = () => {
    const configStr = JSON.stringify({
      model_type: "ResNet",
      epochs: 50,
      batch_size: 64,
      optimizer: "AdamW",
      learning_rate: 0.0003,
      loss: "CrossEntropyLoss",
      framework: selectedVersion?.framework || 'PyTorch'
    }, null, 2);
    
    navigator.clipboard.writeText(configStr);
    setCopied(true);
    toast.success('Config Copied', 'JSON hyperparameter configuration copied.');
    setTimeout(() => setCopied(false), 2000);
  };

  // Find top accuracy
  const topAccuracy = Math.max(
    ...registeredModels.flatMap(m => m.versions || []).map(v => v.metrics?.accuracy || 0),
    0
  ) * 100;

  // Render recursive explorer nodes
  const renderExplorerNode = (node: ExplorerNode, depth = 0) => {
    const isExpanded = expandedNodes[node.id];
    const hasChildren = node.children && node.children.length > 0;
    
    return (
      <div key={node.id} className="space-y-1 font-sans select-none">
        <div 
          onClick={() => {
            if (hasChildren) {
              toggleNode(node.id);
            } else if (node.type === 'version' && node.metadata) {
              handleSelectVersion(node.metadata);
            }
          }}
          className={`flex items-center gap-2 py-2 px-3 rounded-lg text-xs cursor-pointer transition-all ${
            node.type === 'version' && selectedVersion?.id === node.id
              ? 'bg-[#8ab4f8]/10 text-[#8ab4f8] border-l-2 border-[#8ab4f8]'
              : 'text-gray-400 hover:bg-[#2b2d31]/50 hover:text-white'
          }`}
          style={{ paddingLeft: `${depth * 14 + 12}px` }}
        >
          {hasChildren && (
            <span>
              {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </span>
          )}
          {!hasChildren && <span className="w-3"></span>}

          {node.type === 'project' && <FolderOpen size={13} className="text-[#8ab4f8]" />}
          {node.type === 'experiment' && <Folder size={13} className="text-[#c5a3ff]" />}
          {node.type === 'run' && <Layers size={13} className="text-[#80cbc4]" />}
          {node.type === 'version' && <GitBranch size={13} className="text-gray-500" />}

          <span className="font-semibold truncate max-w-[190px]" title={node.name}>{node.name}</span>
        </div>

        {hasChildren && isExpanded && (
          <div className="space-y-1">
            {node.children!.map(child => renderExplorerNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
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
              Enterprise audited deep learning artifacts catalog, configuration versions, and Triton output streams.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/models/generate')}
              className="flex items-center gap-2 px-4 py-2 bg-[#2b2d31] hover:bg-[#313338] text-xs font-bold text-white rounded-xl border border-[#3f4046] transition-all cursor-pointer"
            >
              <Plus size={14} />
              <span>AI Architecture Generator</span>
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
          <button
            onClick={() => router.push('/models/research')}
            className="px-6 py-3 text-sm font-bold text-[#9aa0a6] hover:text-white transition-all cursor-pointer border-b-2 border-transparent"
          >
            Research Playground
          </button>
        </div>

        {/* 2-Column Registry Panel Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Model Explorer (Tree View) */}
          <div className="lg:col-span-4 bg-[#2b2d31]/50 border border-[#3f4046] rounded-2xl shadow-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#3f4046]/80 bg-[#1e1f22]/50 flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-white">Model Explorer</h3>
            </div>
            
            <div className="p-4 space-y-2 max-h-[500px] overflow-y-auto">
              {explorerTree.map(node => renderExplorerNode(node))}
            </div>
          </div>

          {/* Right Column: Version Timeline & Artifact Viewer */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* 1. Version Timeline Block */}
            {selectedVersion && (
              <div className="bg-[#2b2d31]/50 border border-[#3f4046] rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">Version Release Timeline</h3>
                  <span className="text-[10px] text-gray-400 font-bold font-mono">Commit: {selectedVersion.commitHash.slice(0, 15)}</span>
                </div>
                
                {/* Horizontal Timeline Track */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3 relative">
                  
                  {modelVersions.map((v, idx) => {
                    const isCurrent = v.id === selectedVersion.id;
                    const isActive = v.isActive;
                    return (
                      <div 
                        key={v.id} 
                        onClick={() => handleSelectVersion(v)}
                        className={`flex-1 p-3.5 border rounded-xl cursor-pointer transition-all flex flex-col justify-between h-22 relative ${
                          isCurrent 
                            ? 'bg-[#8ab4f8]/10 border-[#8ab4f8]' 
                            : 'bg-[#1e1f22]/50 border-[#3f4046] hover:border-gray-500'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-white font-mono">{v.versionTag}</span>
                          {isActive && (
                            <span className="px-1.5 py-0.5 bg-[#80cbc4]/15 border border-[#80cbc4]/35 text-[#80cbc4] text-[8px] font-black uppercase tracking-wider rounded">
                              Active Env
                            </span>
                          )}
                        </div>
                        
                        <div className="text-[9px] text-gray-400 mt-2 font-semibold">
                          <p>Author: {v.author}</p>
                          <p className="text-gray-500 mt-0.5">Acc: {(v.accuracy * 100).toFixed(1)}% • {v.timestamp}</p>
                        </div>
                      </div>
                    );
                  })}
                  
                </div>

                {/* Rollback Trigger CTA */}
                {!selectedVersion.isActive && (
                  <div className="pt-2 border-t border-[#3f4046]/40 flex items-center justify-between">
                    <span className="text-[10px] text-gray-500 font-bold">This version is offline. Rollback deployment to sync active routes.</span>
                    <button
                      onClick={() => handleRollback(selectedVersion.id)}
                      className="px-3.5 py-1.5 bg-[#ffe082] hover:bg-[#ffecb3] text-[#1e1f22] text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer"
                    >
                      Restore Version
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 2. Tabbed Artifact Viewer */}
            <div className="bg-[#2b2d31]/50 border border-[#3f4046] rounded-2xl shadow-xl overflow-hidden">
              
              {/* Tabs list */}
              <div className="flex border-b border-[#3f4046]/80 bg-[#1e1f22]/50 text-xs">
                {(['metrics', 'configs', 'weights', 'compiler'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-5 py-3.5 font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
                      activeTab === tab
                        ? 'border-[#8ab4f8] text-[#8ab4f8]'
                        : 'border-transparent text-gray-500 hover:text-white'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Tab Contents */}
              <div className="p-6 min-h-[260px]">
                
                {/* Metrics tab */}
                {activeTab === 'metrics' && selectedVersion && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-fade-in font-sans">
                    <div className="bg-[#1e1f22]/50 border border-[#3f4046] p-4 rounded-xl space-y-1">
                      <span className="text-[9px] uppercase font-bold text-gray-500">Audit Accuracy</span>
                      <h4 className="text-xl font-extrabold text-white">{(selectedVersion.accuracy * 100).toFixed(2)}%</h4>
                    </div>
                    <div className="bg-[#1e1f22]/50 border border-[#3f4046] p-4 rounded-xl space-y-1">
                      <span className="text-[9px] uppercase font-bold text-gray-500">Loss Entropy</span>
                      <h4 className="text-xl font-extrabold text-[#f28b82]">{selectedVersion.loss.toFixed(4)}</h4>
                    </div>
                    <div className="bg-[#1e1f22]/50 border border-[#3f4046] p-4 rounded-xl space-y-1">
                      <span className="text-[9px] uppercase font-bold text-gray-500">Compilation</span>
                      <h4 className="text-xl font-extrabold text-[#80cbc4]">Passed</h4>
                    </div>
                    <div className="bg-[#1e1f22]/50 border border-[#3f4046] p-4 rounded-xl space-y-1">
                      <span className="text-[9px] uppercase font-bold text-gray-500">Framework tag</span>
                      <h4 className="text-xl font-extrabold text-[#c5a3ff]">{selectedVersion.framework}</h4>
                    </div>
                  </div>
                )}

                {/* Configs tab */}
                {activeTab === 'configs' && (
                  <div className="relative animate-fade-in">
                    <button
                      onClick={handleCopyConfig}
                      className="absolute right-2 top-2 p-1.5 bg-[#2b2d31] hover:bg-[#313338] border border-[#3f4046] rounded-lg text-gray-400 hover:text-white transition-all cursor-pointer"
                      title="Copy Config JSON"
                    >
                      {copied ? <Check size={14} className="text-[#80cbc4]" /> : <Copy size={14} />}
                    </button>
                    <pre className="p-4 bg-[#141517] border border-[#3f4046] rounded-xl text-[10px] text-[#ffe082] font-mono leading-relaxed overflow-x-auto select-text">
{`{
  "model_type": "ResNet",
  "epochs": 50,
  "batch_size": 64,
  "optimizer": "AdamW",
  "learning_rate": 0.0003,
  "loss": "CrossEntropyLoss",
  "framework": "${selectedVersion?.framework || 'PyTorch'}"
}`}
                    </pre>
                  </div>
                )}

                {/* Weights tab */}
                {activeTab === 'weights' && (
                  <div className="space-y-3 font-mono text-[10px] text-gray-400 animate-fade-in select-none">
                    <div className="p-3 bg-[#141517] border border-[#3f4046] rounded-xl space-y-2">
                      <div className="flex justify-between border-b border-[#3f4046]/40 pb-1.5">
                        <span className="text-white">model.backbone.stem.weight</span>
                        <span>[64, 3, 7, 7] • float32</span>
                      </div>
                      <div className="flex justify-between border-b border-[#3f4046]/40 pb-1.5">
                        <span className="text-white">model.backbone.layer1.0.conv1.weight</span>
                        <span>[64, 64, 3, 3] • float16</span>
                      </div>
                      <div className="flex justify-between border-b border-[#3f4046]/40 pb-1.5">
                        <span className="text-white">model.backbone.layer1.0.bn1.running_mean</span>
                        <span>[64] • float32</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white">model.classifier.weight</span>
                        <span>[10, 512] • float32</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Compiler output tab */}
                {activeTab === 'compiler' && (
                  <div className="bg-[#141517] border border-[#3f4046] rounded-xl p-4 font-mono text-[9px] text-[#80cbc4] leading-relaxed max-h-56 overflow-y-auto space-y-1 select-text">
                    <p className="text-gray-500">[2026-06-10 18:22:10] Initializing Triton GPU compilation pathway...</p>
                    <p className="text-gray-500">[2026-06-10 18:22:11] Optimizing 14 subgraph kernels on tensor layout.</p>
                    <p className="text-white">[INFO] Fusing Conv2D and BatchNorm kernels to speed up forward passes.</p>
                    <p className="text-white">[INFO] Auto-generated TRT compilation cache file: /cache/resnet_fp16.engine</p>
                    <p className="text-[#8ab4f8]">[SUCCESS] Layer parameter optimizations completed successfully.</p>
                    <p className="text-[#ffe082]">[WARN] CUDA block size set to default auto-distribution mapping.</p>
                    <p className="text-[#80cbc4]">[SUCCESS] Engine ready. Target inference latency: 2.14 ms.</p>
                  </div>
                )}

              </div>
            </div>

          </div>

        </div>

      </div>
    </MainLayout>
  );
}
