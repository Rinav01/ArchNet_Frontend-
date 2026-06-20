'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line
} from 'recharts';
import { 
  ArrowLeft, 
  Cpu, 
  Database, 
  Download, 
  Flame, 
  TrendingUp, 
  ExternalLink,
  Info,
  CheckCircle,
  FileCode,
  Sparkles
} from 'lucide-react';
import { useCanvasStore } from '@/store/canvasStore';
import { getGraphMetrics } from '@/lib/canvas/metricsHelper';

interface BenchmarkItem {
  model: string;
  pytorch_latency: number;
  tensorflow_latency: number;
  jax_latency: number;
  pytorch_vram: number;
  tensorflow_vram: number;
  jax_vram: number;
}

interface SotaModel {
  name: string;
  description: string;
  parameters: string;
  dataset: string;
  epochs: number;
  final_accuracy: string;
  download_url: string;
  curves: {
    epochs: number[];
    train_loss: number[];
    val_accuracy: number[];
  };
  telemetry: {
    gpu: string;
    average_latency: string;
    vram_footprint: string;
  };
}

export default function BenchmarkPage() {
  const { projectId } = useParams() as { projectId: string };
  const { nodes } = useCanvasStore();
  const currentMetrics = getGraphMetrics(nodes);

  const [benchmarkData, setBenchmarkData] = useState<BenchmarkItem[]>([]);
  const [sotaMetadata, setSotaMetadata] = useState<Record<string, SotaModel>>({});
  const [selectedSota, setSelectedSota] = useState<string>('resnet');
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Load benchmark data and SOTA metadata
  useEffect(() => {
    fetch('/artifacts/benchmark_data.json')
      .then(res => res.json())
      .then(data => setBenchmarkData(data))
      .catch(err => console.error('Failed to load benchmark data:', err));

    fetch('/artifacts/sota_metadata.json')
      .then(res => res.json())
      .then(data => setSotaMetadata(data))
      .catch(err => console.error('Failed to load SOTA metadata:', err));
  }, []);

  const sotaModel = sotaMetadata[selectedSota];

  // Map curves data for Recharts line chart
  const curvesChartData = sotaModel ? sotaModel.curves.epochs.map((epoch, idx) => ({
    epoch,
    loss: sotaModel.curves.train_loss[idx],
    accuracy: sotaModel.curves.val_accuracy[idx]
  })) : [];

  const handleCopy = (key: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(key);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0a0b10] text-[#e3e3e3] p-8 font-sans relative overflow-x-hidden select-none">
      {/* Ambient background grids */}
      <div className="absolute inset-0 dot-grid opacity-15 z-0 pointer-events-none"></div>
      <div className="absolute top-[-10%] left-[-15%] w-[50vw] h-[50vw] rounded-full bg-[#8ab4f8]/5 blur-[130px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-10%] right-[-15%] w-[50vw] h-[50vw] rounded-full bg-[#c5a3ff]/5 blur-[130px] pointer-events-none z-0"></div>

      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
        
        {/* Navigation Header */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#3f4046]/35 pb-6">
          <div className="flex items-center gap-4">
            <Link 
              href={`/editor/${projectId}`}
              className="p-2.5 bg-[#1b1c22] hover:bg-[#202128] border border-[#3f4046]/45 rounded-xl text-gray-400 hover:text-white transition-all flex items-center justify-center cursor-pointer decoration-none"
            >
              <ArrowLeft size={16} />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-white tracking-wide">Model Benchmarking Suite</h1>
                <span className="px-2 py-0.5 bg-[#8ab4f8]/10 rounded border border-[#8ab4f8]/20 text-[8.5px] text-[#8ab4f8] font-bold">
                  VERIFIED METRICS
                </span>
              </div>
              <p className="text-xs text-[#9aa0a6] mt-1 font-medium">
                Real-time latency profiles and VRAM allocation summaries comparing compiled frameworks.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-3 bg-[#1e1f26]/40 border border-[#3f4046]/45 rounded-2xl flex items-center gap-3">
              <Cpu className="text-[#8ab4f8]" size={16} />
              <div>
                <span className="text-[8px] uppercase tracking-wider font-extrabold text-gray-500 block leading-none">Canvas Params</span>
                <span className="text-xs font-bold text-white mt-1 block leading-none font-mono">
                  {currentMetrics.totalParams > 0 ? (currentMetrics.totalParams / 1e6).toFixed(2) + 'M' : '0.00M'}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Section 1: Framework Comparison Charts */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Latency Comparison Chart */}
          <div className="p-6 bg-[#1b1c22]/40 border border-[#3f4046]/35 rounded-3xl backdrop-blur-xl space-y-4">
            <div>
              <h3 className="text-xs font-black uppercase text-white tracking-widest flex items-center gap-2">
                <Cpu className="text-[#ffe082]" size={14} />
                <span>Execution Latency (Lower is Better)</span>
              </h3>
              <p className="text-[10px] text-gray-500 mt-1 font-semibold">Average forward pass latency per batch in milliseconds on RTX 4090 GPU.</p>
            </div>

            <div className="h-64 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={benchmarkData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2b2d31" />
                  <XAxis dataKey="model" stroke="#9aa0a6" fontSize={9} tickLine={false} />
                  <YAxis stroke="#9aa0a6" fontSize={9} tickLine={false} label={{ value: 'ms/batch', angle: -90, position: 'insideLeft', style: { fill: '#9aa0a6', fontSize: 9 } }} />
                  <Tooltip contentStyle={{ backgroundColor: '#14151a', borderColor: '#3f4046', borderRadius: '8px', fontSize: 10 }} />
                  <Legend wrapperStyle={{ fontSize: 9, paddingTop: 10 }} />
                  <Bar dataKey="pytorch_latency" name="PyTorch" fill="#ff6633" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="tensorflow_latency" name="TensorFlow" fill="#ffb74d" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="jax_latency" name="JAX / Flax" fill="#80cbc4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* VRAM Comparison Chart */}
          <div className="p-6 bg-[#1b1c22]/40 border border-[#3f4046]/35 rounded-3xl backdrop-blur-xl space-y-4">
            <div>
              <h3 className="text-xs font-black uppercase text-white tracking-widest flex items-center gap-2">
                <Flame className="text-[#ff5252]" size={14} />
                <span>Peak VRAM Footprint (Lower is Better)</span>
              </h3>
              <p className="text-[10px] text-gray-500 mt-1 font-semibold">Peak GPU memory allocations during forward pass in Gigabytes (FP32).</p>
            </div>

            <div className="h-64 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={benchmarkData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2b2d31" />
                  <XAxis dataKey="model" stroke="#9aa0a6" fontSize={9} tickLine={false} />
                  <YAxis stroke="#9aa0a6" fontSize={9} tickLine={false} label={{ value: 'VRAM (GB)', angle: -90, position: 'insideLeft', style: { fill: '#9aa0a6', fontSize: 9 } }} />
                  <Tooltip contentStyle={{ backgroundColor: '#14151a', borderColor: '#3f4046', borderRadius: '8px', fontSize: 10 }} />
                  <Legend wrapperStyle={{ fontSize: 9, paddingTop: 10 }} />
                  <Bar dataKey="pytorch_vram" name="PyTorch" fill="#ff6633" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="tensorflow_vram" name="TensorFlow" fill="#ffb74d" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="jax_vram" name="JAX / Flax" fill="#80cbc4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Section 2: Model Gallery & pre-run artifacts */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* SOTA Model Selection Sidebar */}
          <div className="lg:col-span-1 p-6 bg-[#1b1c22]/40 border border-[#3f4046]/35 rounded-3xl backdrop-blur-xl flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-black uppercase text-white tracking-widest flex items-center gap-1.5">
                  <Database size={14} className="text-[#8ab4f8]" />
                  <span>SOTA Weights & Artifacts</span>
                </h3>
                <p className="text-[10px] text-gray-500 mt-1 font-semibold">Select pre-compiled benchmark models to inspect curves and fetch weights.</p>
              </div>

              <div className="space-y-2">
                {Object.keys(sotaMetadata).map(key => (
                  <button
                    key={key}
                    onClick={() => setSelectedSota(key)}
                    className={`w-full text-left px-4 py-3 rounded-2xl border text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                      selectedSota === key
                        ? 'bg-[#8ab4f8]/10 border-[#8ab4f8] text-white shadow-md'
                        : 'bg-[#1b1c21]/30 border-[#3f4046]/30 text-gray-400 hover:bg-[#202128]/50 hover:text-white'
                    }`}
                  >
                    <span>{sotaMetadata[key].name}</span>
                    <span className="text-[9px] font-mono opacity-80">{sotaMetadata[key].parameters} params</span>
                  </button>
                ))}
              </div>
            </div>

            {sotaModel && (
              <div className="pt-6 border-t border-[#3f4046]/35 space-y-4 mt-6">
                <div className="space-y-1 text-xs">
                  <span className="text-[9px] font-black uppercase text-gray-500 block">Weights Host (Hugging Face)</span>
                  <a 
                    href={sotaModel.download_url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-[#8ab4f8] hover:underline flex items-center gap-1 leading-normal font-semibold truncate"
                  >
                    <ExternalLink size={12} className="shrink-0" />
                    <span className="truncate">{sotaModel.download_url}</span>
                  </a>
                </div>

                <div className="flex gap-2">
                  <a
                    href={sotaModel.download_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2.5 bg-[#8ab4f8] hover:bg-[#8ab4f8]/90 text-[#121318] text-[10px] font-black rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer decoration-none shadow-lg shadow-[#8ab4f8]/10"
                  >
                    <Download size={13} />
                    <span>FETCH WEIGHTS</span>
                  </a>
                  <button
                    onClick={() => handleCopy(selectedSota, sotaModel.download_url)}
                    className="px-3 py-2.5 bg-[#1b1c22] hover:bg-[#202128] border border-[#3f4046]/45 rounded-xl text-gray-400 hover:text-white text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center"
                  >
                    {copiedLink === selectedSota ? <CheckCircle size={13} className="text-emerald-400" /> : 'Copy Link'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* SOTA Model Details & Training curves */}
          <div className="lg:col-span-2 p-6 bg-[#1b1c22]/40 border border-[#3f4046]/35 rounded-3xl backdrop-blur-xl space-y-6">
            {sotaModel ? (
              <>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-[#3f4046]/35 pb-4">
                  <div>
                    <h3 className="text-sm font-black text-white">{sotaModel.name}</h3>
                    <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed font-semibold">{sotaModel.description}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <div className="px-2.5 py-1 bg-[#101113] rounded border border-[#3f4046]/40 text-[9px] font-bold text-gray-400 font-mono">
                      Acc: {sotaModel.final_accuracy}
                    </div>
                    <div className="px-2.5 py-1 bg-[#101113] rounded border border-[#3f4046]/40 text-[9px] font-bold text-gray-400 font-mono">
                      Dataset: {sotaModel.dataset}
                    </div>
                  </div>
                </div>

                {/* Telemetry data */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3 bg-[#101113] border border-[#3f4046]/20 rounded-xl">
                    <span className="text-[8px] uppercase tracking-wider font-extrabold text-gray-500 block">Training Hardware</span>
                    <span className="text-xs font-bold text-white mt-1 block font-mono">{sotaModel.telemetry.gpu}</span>
                  </div>
                  <div className="p-3 bg-[#101113] border border-[#3f4046]/20 rounded-xl">
                    <span className="text-[8px] uppercase tracking-wider font-extrabold text-gray-500 block">Average Latency</span>
                    <span className="text-xs font-bold text-[#ffe082] mt-1 block font-mono">{sotaModel.telemetry.average_latency}</span>
                  </div>
                  <div className="p-3 bg-[#101113] border border-[#3f4046]/20 rounded-xl">
                    <span className="text-[8px] uppercase tracking-wider font-extrabold text-gray-500 block">Peak VRAM Footprint</span>
                    <span className="text-xs font-bold text-[#ff7b7b] mt-1 block font-mono">{sotaModel.telemetry.vram_footprint}</span>
                  </div>
                </div>

                {/* Training curves line chart */}
                <div className="space-y-3">
                  <span className="text-[9px] uppercase tracking-wider text-gray-500 font-extrabold flex items-center gap-1.5 select-none">
                    <TrendingUp size={12} className="text-[#81c784]" />
                    <span>Training Curve Telemetry</span>
                  </span>

                  <div className="h-56 pt-2 bg-[#101113]/70 rounded-2xl border border-[#3f4046]/25 p-3">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsLineChart data={curvesChartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2025" />
                        <XAxis dataKey="epoch" stroke="#9aa0a6" fontSize={8.5} tickLine={false} label={{ value: 'Epoch', position: 'insideBottom', offset: -5, style: { fill: '#9aa0a6', fontSize: 8.5 } }} />
                        <YAxis stroke="#9aa0a6" fontSize={8.5} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#14151a', borderColor: '#3f4046', borderRadius: '8px', fontSize: 10 }} />
                        <Legend wrapperStyle={{ fontSize: 9 }} />
                        <Line type="monotone" dataKey="loss" name="Train Loss" stroke="#ff7b7b" strokeWidth={1.8} activeDot={{ r: 4 }} />
                        <Line type="monotone" dataKey="accuracy" name="Val Accuracy (%)" stroke="#81c784" strokeWidth={1.8} />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 text-xs">
                Select a model from the list to display pre-run training curves and accuracy telemetry.
              </div>
            )}
          </div>
        </section>

        {/* Section 3: Credibility notice */}
        <footer className="p-4 bg-[#8ab4f8]/5 border border-[#8ab4f8]/15 rounded-2xl flex gap-3 items-start select-text">
          <Info className="text-[#8ab4f8] shrink-0 mt-0.5" size={16} />
          <div className="text-[10px] text-[#8ab4f8] font-medium leading-relaxed">
            <strong>Authenticity & Replication Note:</strong> All SOTA models shown above are compiled directly using ArchNet compiler emitters. Training passes are executed using our verified Celery/Redis backend runtime. Pre-trained weights files (`.pth` / `.bin`) are hosted externally on Hugging Face repositories for fast, lightweight client-side downloads.
          </div>
        </footer>

      </div>
    </div>
  );
}
