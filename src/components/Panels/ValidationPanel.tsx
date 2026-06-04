'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useCanvasStore } from '@/store/canvasStore';
import { useLayoutStore } from '@/store/layoutStore';
import { useProjectStore } from '@/store/projectStore';
import { CanvasNode, CanvasEdge } from '@/types/canvas';
import { 
  Terminal, 
  Trash2, 
  Play, 
  XCircle, 
  CheckCircle, 
  AlertTriangle, 
  Activity, 
  Database, 
  Cpu, 
  FileText,
  Zap,
  Pause,
  Square,
  Sliders,
  Globe,
  Server,
  BarChart2,
  TrendingUp,
  Gauge,
  Settings,
  Clock,
  Network,
  RotateCw
} from 'lucide-react';

export default function ValidationPanel() {
  const { 
    logs, 
    clearLogs, 
    compilationResult, 
    isValidating, 
    validationErrors,
    nodes,
    edges,
    selectedNodeId,
    setSelectedNodeId,
    trainingJob,
    trainingProvider,
    trainingEpochs,
    datasets,
    setTrainingProvider,
    setTrainingEpochs,
    loadDatasets,
    startTraining,
    pauseTraining,
    stopTraining,
    clusterPriority,
    gpuThrottleLimit,
    setClusterPriority,
    setGpuThrottleLimit,
    trainingBatchSize,
    trainingLearningRate,
    trainingOptimizer,
    trainingScheduler,
    setTrainingBatchSize,
    setTrainingLearningRate,
    setTrainingOptimizer,
    setTrainingScheduler,
    restartTraining
  } = useCanvasStore();

  const isOnline = useProjectStore((state) => state.isOnline);
  const userRole = useProjectStore((state) => state.userRole);
  const activeTab = useLayoutStore((state) => state.activeConsoleTab) as any;
  const setActiveTab = useLayoutStore((state) => state.setActiveConsoleTab);
  const consoleBottomRef = useRef<HTMLDivElement>(null);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('ds_cifar10');
  
  // Real-time infrastructure observability stats fluctuations
  const [obsMetrics, setObsMetrics] = useState({
    apiLatency: 12,
    apiCpu: 4.2,
    wsLatency: 6,
    redisOps: 482,
    celeryLoad: 8.5
  });

  useEffect(() => {
    if (activeTab !== 'infra') return;
    const obsInterval = setInterval(() => {
      setObsMetrics({
        apiLatency: Math.round(10 + Math.random() * 5),
        apiCpu: Number((3.5 + Math.random() * 2).toFixed(1)),
        wsLatency: Math.round(4 + Math.random() * 4),
        redisOps: Math.round(470 + Math.random() * 25),
        celeryLoad: Number((7.8 + Math.random() * 1.5).toFixed(1))
      });
    }, 1200);
    return () => clearInterval(obsInterval);
  }, [activeTab]);

  // Load datasets on mount
  useEffect(() => {
    loadDatasets();
  }, [loadDatasets]);

  // Listen to external triggers (like Command Palette) to switch active tabs
  useEffect(() => {
    const handleSetTab = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setActiveTab(customEvent.detail);
      }
    };
    window.addEventListener('set-console-tab', handleSetTab);
    return () => window.removeEventListener('set-console-tab', handleSetTab);
  }, []);

  // Automatically scroll console down when logs or compile state changes
  useEffect(() => {
    if (consoleBottomRef.current) {
      consoleBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, compilationResult, activeTab]);

  // Estimate learnable parameters and weights footprint
  const calculateModelSummary = () => {
    let totalParams = 0;
    
    nodes.forEach(node => {
      if (node.type === 'Dense') {
        const inputFeatures = node.inputShape.length > 0 ? node.inputShape[0] : 0;
        const outputUnits = node.config.units || 10;
        if (inputFeatures > 0) {
          totalParams += (inputFeatures * outputUnits) + outputUnits; // Weights + Biases
        }
      } else if (node.type === 'Conv2D') {
        const inputChannels = node.inputShape.length >= 3 ? node.inputShape[2] : 3;
        const outputFilters = node.config.filters || 64;
        const kernel = node.config.kernelSize || 3;
        totalParams += (inputChannels * kernel * kernel * outputFilters) + outputFilters; // Weights + Biases
      }
    });

    const memoryBytes = totalParams * 4; // Float32 weights
    const formatMemory = (bytes: number) => {
      if (bytes === 0) return '0.00 B';
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    };

    const formatParams = (params: number) => {
      if (params === 0) return '0';
      if (params < 1000) return params.toLocaleString();
      if (params < 1000000) return `${(params / 1000).toFixed(1)} K`;
      return `${(params / 1000000).toFixed(2)} M`;
    };

    return {
      totalParams: formatParams(totalParams),
      memoryFootprint: formatMemory(memoryBytes),
      layersCount: nodes.length,
      connectionsCount: edges.length
    };
  };

  const summary = calculateModelSummary();

  // Benchmark and performance metrics calculators
  const calculateBenchmarks = () => {
    let totalFlops = 0;
    let modelParams = 0;
    const layersFlops: { name: string; flops: number; percentage: number }[] = [];

    nodes.forEach(node => {
      let layerFlops = 0;

      if (node.type === 'Conv2D') {
        const inputChannels = node.inputShape.length >= 3 ? node.inputShape[2] : 3;
        const outputFilters = node.config.filters || 64;
        const kernel = node.config.kernelSize || 3;
        const outH = node.outputShape.length >= 2 ? node.outputShape[0] : 224;
        const outW = node.outputShape.length >= 2 ? node.outputShape[1] : 224;

        layerFlops = 2 * kernel * kernel * inputChannels * outputFilters * outH * outW;
        totalFlops += layerFlops;
        modelParams += (inputChannels * kernel * kernel + 1) * outputFilters;
      } else if (node.type === 'Dense') {
        const inputFeatures = node.inputShape.length > 0 ? node.inputShape[0] : 0;
        const outputUnits = node.config.units || 10;

        if (inputFeatures > 0) {
          layerFlops = 2 * inputFeatures * outputUnits;
          totalFlops += layerFlops;
          modelParams += (inputFeatures + 1) * outputUnits;
        }
      }

      if (layerFlops > 0) {
        layersFlops.push({
          name: node.name,
          flops: layerFlops,
          percentage: 0
        });
      }
    });

    if (totalFlops > 0) {
      layersFlops.forEach(item => {
        item.percentage = parseFloat(((item.flops / totalFlops) * 100).toFixed(1));
      });
    }

    const formatFlops = (flops: number) => {
      if (flops === 0) return '0 FLOPs';
      if (flops < 1e3) return `${flops.toFixed(0)} FLOPs`;
      if (flops < 1e6) return `${(flops / 1e3).toFixed(1)} KFLOPs`;
      if (flops < 1e9) return `${(flops / 1e6).toFixed(1)} MFLOPs`;
      return `${(flops / 1e9).toFixed(2)} GFLOPs`;
    };

    const BATCH_SIZE = 32;
    const weightsMemory = modelParams * 4;

    let totalActivationElements = 0;
    nodes.forEach(node => {
      if (node.outputShape.length > 0) {
        totalActivationElements += node.outputShape.reduce((a, b) => a * b, 1);
      }
    });
    const activationMemory = totalActivationElements * BATCH_SIZE * 4;
    const optimizerMemory = modelParams * 2 * 4;
    const totalVRAM = weightsMemory + activationMemory + optimizerMemory;

    const formatMemoryMB = (bytes: number) => {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    };

    const baseGpulatency = (totalFlops / 1.5e11) * 1000 + 0.8;
    const baseCpulatency = (totalFlops / 2.0e9) * 1000 + 10.5;

    return {
      totalFlops: formatFlops(totalFlops),
      totalFlopsRaw: totalFlops,
      layersFlops: layersFlops.sort((a, b) => b.flops - a.flops).slice(0, 5),
      weightsMemory: formatMemoryMB(weightsMemory),
      weightsMemoryRaw: weightsMemory,
      activationMemory: formatMemoryMB(activationMemory),
      activationMemoryRaw: activationMemory,
      optimizerMemory: formatMemoryMB(optimizerMemory),
      optimizerMemoryRaw: optimizerMemory,
      totalVRAM: formatMemoryMB(totalVRAM),
      totalVRAMRaw: totalVRAM,
      gpuLatency: `${baseGpulatency.toFixed(2)} ms`,
      cpuLatency: `${baseCpulatency.toFixed(2)} ms`
    };
  };

  const benchmarks = calculateBenchmarks();

  // Determine Sandbox Verification Status and color badges
  const getSandboxStatus = () => {
    if (isValidating) {
      return {
        label: 'COMPILING...',
        color: 'bg-[#ffe082] text-[#ffe082] border-[#ffe082]/25',
        dot: 'bg-[#ffe082]'
      };
    }
    
    if (!isOnline) {
      return {
        label: 'LOCAL STANDBY',
        color: 'bg-[#ffe082]/20 text-[#ffe082] border-transparent',
        dot: 'bg-[#ffe082]'
      };
    }

    if (compilationResult) {
      if (compilationResult.success) {
        return {
          label: 'VERIFIED SUCCESS',
          color: 'bg-[#81c784]/10 text-[#81c784] border-[#81c784]/25',
          dot: 'bg-[#81c784]'
        };
      } else {
        if (compilationResult.compilationErrors.length > 0) {
          return {
            label: 'EXECUTION CRASHED',
            color: 'bg-[#f28b82]/10 text-[#f28b82] border-[#f28b82]/25',
            dot: 'bg-[#f28b82]'
          };
        } else {
          return {
            label: 'SEMANTIC WARNINGS',
            color: 'bg-[#ffe082]/10 text-[#ffe082] border-[#ffe082]/25',
            dot: 'bg-[#ffe082]'
          };
        }
      }
    }

    return {
      label: 'STANDBY',
      color: 'bg-gray-500/10 text-gray-400 border-gray-500/25',
      dot: 'bg-gray-500'
    };
  };

  const status = getSandboxStatus();
  const activeErrorsCount = validationErrors.length + (compilationResult?.compilationErrors.length || 0);

  return (
    <div className="h-64 bg-[#141517] border-t border-[#3f4046] flex flex-col z-20 relative select-none w-full shadow-2xl">
      
      {/* Console Header Bar */}
      <div className="flex items-center justify-between px-6 py-2 bg-[#1e1f22] border-b border-[#3f4046] select-none h-11 shrink-0">
        
        {/* Left Side: Console Title & Tabs */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Terminal size={14} className="text-[#9aa0a6]" />
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#9aa0a6] font-mono">Terminal Console</span>
          </div>

          {/* Interactive Navigation Tabs */}
          <div className="flex items-center gap-1.5 text-[10.5px] font-bold">
            <button
              onClick={() => setActiveTab('activity')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${
                activeTab === 'activity'
                  ? 'bg-[#2b2d31] text-[#8ab4f8]'
                  : 'text-[#9aa0a6] hover:text-white hover:bg-[#2b2d31]/50'
              }`}
            >
              <Activity size={12} />
              <span>Activity ({logs.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('sandbox')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${
                activeTab === 'sandbox'
                  ? 'bg-[#2b2d31] text-[#8ab4f8]'
                  : 'text-[#9aa0a6] hover:text-white hover:bg-[#2b2d31]/50'
              }`}
            >
              <Cpu size={12} />
              <span>Sandbox Logs</span>
            </button>

            <button
              onClick={() => setActiveTab('errors')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${
                activeTab === 'errors'
                  ? 'bg-[#2b2d31] text-[#8ab4f8]'
                  : 'text-[#9aa0a6] hover:text-white hover:bg-[#2b2d31]/50'
              }`}
            >
              <XCircle size={12} className={activeErrorsCount > 0 ? 'text-[#f28b82]' : ''} />
              <span>AST & Compile Errors ({activeErrorsCount})</span>
            </button>

            <button
              onClick={() => setActiveTab('summary')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${
                activeTab === 'summary'
                  ? 'bg-[#2b2d31] text-[#8ab4f8]'
                  : 'text-[#9aa0a6] hover:text-white hover:bg-[#2b2d31]/50'
              }`}
            >
              <Database size={12} />
              <span>Model Summary</span>
            </button>

            <button
              onClick={() => setActiveTab('training')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer ${
                activeTab === 'training'
                  ? 'bg-[#2b2d31] text-[#8ab4f8]'
                  : 'text-[#9aa0a6] hover:text-white hover:bg-[#2b2d31]/50'
              }`}
            >
              <Zap size={12} className={trainingJob?.status === 'RUNNING' ? 'text-[#81c784] animate-pulse' : ''} />
              <span>Training Telemetry</span>
            </button>

            <button
              onClick={() => setActiveTab('benchmark')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer ${
                activeTab === 'benchmark'
                  ? 'bg-[#2b2d31] text-[#8ab4f8]'
                  : 'text-[#9aa0a6] hover:text-white hover:bg-[#2b2d31]/50'
              }`}
            >
              <BarChart2 size={12} />
              <span>Benchmark Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('timeline')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer ${
                activeTab === 'timeline'
                  ? 'bg-[#2b2d31] text-[#8ab4f8]'
                  : 'text-[#9aa0a6] hover:text-white hover:bg-[#2b2d31]/50'
              }`}
            >
              <Clock size={12} />
              <span>Timeline Profile</span>
            </button>

            <button
              onClick={() => setActiveTab('infra')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer ${
                activeTab === 'infra'
                  ? 'bg-[#2b2d31] text-[#8ab4f8]'
                  : 'text-[#9aa0a6] hover:text-white hover:bg-[#2b2d31]/50'
              }`}
            >
              <Network size={12} />
              <span>Infra & Observability</span>
            </button>
          </div>
        </div>

        {/* Right Side: Sandbox Status Pill & Clear Console */}
        <div className="flex items-center gap-4">
          
          {/* Sandbox Status badge */}
          <div className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full border text-[9px] font-extrabold uppercase font-mono shadow-sm ${status.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${status.dot} ${isValidating || status.label.includes('COMPILING') ? 'animate-ping' : ''}`}></span>
            <span>Sandbox: {status.label}</span>
          </div>

          <div className="w-[1px] h-4 bg-[#3f4046]"></div>

          <button
            onClick={clearLogs}
            className="p-1 hover:bg-[#2b2d31] text-[#5f6368] hover:text-white rounded transition-all"
            title="Clear Console Activity"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Console Tab Content Area */}
      <div className="flex-1 overflow-y-auto p-5 font-mono text-[11px] leading-relaxed bg-[#101113] select-text select-all selection:bg-[#8ab4f8]/20">
        
        {/* Tab 1: Console Activity Logs */}
        {activeTab === 'activity' && (
          <div className="space-y-1.5">
            {logs.length === 0 ? (
              <div className="text-gray-500 font-semibold text-center py-10 font-sans">
                Console activity is currently empty. Perform design mutations to populate logs.
              </div>
            ) : (
              logs.map((log) => {
                const typeColor = 
                  log.type === 'success' ? 'text-[#81c784] font-bold' :
                  log.type === 'warning' ? 'text-[#ffe082] font-bold' :
                  log.type === 'error' ? 'text-[#f28b82] font-extrabold' :
                  'text-[#8ab4f8] font-bold';

                return (
                  <div key={log.id} className="flex gap-3 items-start hover:bg-[#2b2d31]/30 px-2 py-0.5 rounded transition-all">
                    <span className="text-[#5f6368] select-none">[{log.timestamp}]</span>
                    <span className={`uppercase tracking-wide text-[10px] select-none ${typeColor}`}>{log.type}:</span>
                    <span className="text-gray-300 font-semibold">{log.text}</span>
                  </div>
                );
              })
            )}
            <div ref={consoleBottomRef}></div>
          </div>
        )}

        {/* Tab 2: Python Sandbox Execution Logs */}
        {activeTab === 'sandbox' && (
          <div className="space-y-3 font-mono text-[10.5px]">
            {!isOnline ? (
              <div className="text-[#ffe082] font-semibold flex flex-col gap-1.5 max-w-lg leading-relaxed font-sans">
                <span className="font-mono text-[11px] text-purple-400">$ python -m mlbuilder.compiler --verify</span>
                <span className="text-gray-400 mt-1">
                  Offline Local Sandbox fallback is active. Python compiler sandbox cannot run executions while FastAPI is disconnected. AST verification is simulated locally on structural layer blocks.
                </span>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <span className="text-purple-400 select-none font-bold">$ python -m mlbuilder.sandbox --project-id={useProjectStore.getState().activeProjectId || 'root'}</span>
                  <span className="text-gray-500 block select-none">&gt; Initializing Docker-less isolated execution environment...</span>
                  <span className="text-gray-500 block select-none">&gt; Injecting PyTorch graph representations... verified.</span>
                  <span className="text-gray-500 block select-none">&gt; Sandboxed Execution started.</span>
                </div>

                {isValidating ? (
                  <div className="text-[#8ab4f8] font-bold animate-pulse flex items-center gap-2 font-sans py-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#8ab4f8] animate-ping"></span>
                    <span>&gt; Python executing model forward pass in sandbox...</span>
                  </div>
                ) : compilationResult ? (
                  <div className="space-y-3">
                    <div className="bg-[#18191c] border border-[#2b2d31] p-4 rounded-xl space-y-2">
                      <div className="flex justify-between items-center text-gray-500 text-[9.5px] font-sans border-b border-[#2b2d31] pb-2 mb-2 select-none font-extrabold uppercase">
                        <span>Python Sandbox Output Logs (Stdout)</span>
                        <span className={compilationResult.success ? 'text-[#81c784]' : 'text-[#f28b82]'}>
                          {compilationResult.success ? '✓ SUCCESSFUL EXIT' : '✗ EXIT CODE 1'}
                        </span>
                      </div>
                      <pre className="text-gray-300 whitespace-pre-wrap font-mono leading-tight leading-relaxed max-h-36 overflow-y-auto">
                        {compilationResult.executionLogs || 'No console outputs printed by sandboxed code.'}
                      </pre>
                    </div>

                    {/* Quick code script length indicator */}
                    {compilationResult.generatedCode && (
                      <div className="flex items-center gap-1.5 text-gray-500 text-[10px] select-none font-semibold">
                        <FileText size={12} />
                        <span>Synthesized script file scale: {compilationResult.generatedCode.split('\n').length} compiled script lines.</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-gray-500 font-semibold font-sans py-6">
                    &gt; Recalculation pending. Drag blocks or update hyperparameters to trigger execution.
                  </div>
                )}
              </div>
            )}
            <div ref={consoleBottomRef}></div>
          </div>
        )}

        {/* Tab 3: AST & Compile Error Highlights and parsed traceback */}
        {activeTab === 'errors' && (
          <div className="space-y-3">
            {activeErrorsCount === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 font-sans">
                <CheckCircle size={28} className="text-[#81c784] mb-2 animate-pulse" />
                <h4 className="text-xs font-bold text-gray-300 uppercase">Verification Perfect</h4>
                <p className="text-[10px] text-gray-500 mt-1 max-w-sm text-center font-semibold leading-relaxed">
                  Sandbox compilation completed without a single syntax crash, cycles, or broadcasting warnings.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* 1. Show Backend Raw python exceptions / traceback */}
                {compilationResult && !compilationResult.success && compilationResult.compilationErrors.map((err, idx) => {
                  const errorParts = err.split(':');
                  const errorType = errorParts[0] || 'CompileError';
                  const errorMsg = errorParts.slice(1).join(':') || err;

                  return (
                    <div key={`comp-${idx}`} className="border border-[#f28b82]/30 bg-[#f28b82]/5 p-4 rounded-xl space-y-3">
                      <div className="flex items-center gap-2 border-b border-[#f28b82]/20 pb-2 mb-1">
                        <XCircle size={14} className="text-[#f28b82]" />
                        <span className="text-[10px] font-extrabold uppercase bg-[#f28b82]/10 text-[#f28b82] px-2 py-0.5 rounded font-mono select-none tracking-wide">
                          {errorType.trim()}
                        </span>
                        <span className="text-[11px] font-extrabold text-[#f28b82] font-mono leading-tight truncate">
                          {errorMsg.trim()}
                        </span>
                      </div>
                      
                      {/* Formatted Exception Traceback visualizer */}
                      <div className="space-y-1.5 font-mono text-[10px]">
                        <span className="text-gray-500 uppercase tracking-widest font-sans font-bold select-none text-[8.5px]">Python Traceback Exception Trails</span>
                        <pre className="p-3 bg-black/40 text-rose-300 border border-rose-950 rounded-lg whitespace-pre-wrap leading-relaxed select-text font-mono text-[9.5px]">
                          {compilationResult.executionLogs && compilationResult.executionLogs.includes('Traceback')
                            ? compilationResult.executionLogs.substring(compilationResult.executionLogs.indexOf('Traceback'))
                            : err}
                        </pre>
                      </div>
                    </div>
                  );
                })}

                {/* 2. Show Semantic Architecture Mismatch logs */}
                {validationErrors.map((err, idx) => {
                  const isError = err.type === 'error';
                  const levelClass = isError ? 'border-rose-500/25 bg-rose-500/5 text-rose-300' : 'border-amber-500/25 bg-amber-500/5 text-amber-300';
                  const icon = isError ? <XCircle size={13} className="text-[#f28b82] mt-0.5" /> : <AlertTriangle size={13} className="text-[#ffe082] mt-0.5" />;

                  return (
                    <div key={`sem-${idx}`} className={`border p-3.5 rounded-xl flex items-start gap-2.5 transition-all select-text hover:border-white/10 ${levelClass}`}>
                      {icon}
                      <div className="space-y-1">
                        <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded tracking-wide font-mono ${
                          isError ? 'bg-[#f28b82]/10 text-[#f28b82]' : 'bg-[#ffe082]/10 text-[#ffe082]'
                        }`}>
                          {isError ? 'Semantic Error' : 'Validation Warning'} ({err.category})
                        </span>
                        <p className="text-[11px] font-semibold leading-relaxed mt-1">
                          {err.message}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Model Execution Summary Dashboard */}
        {activeTab === 'summary' && (
          <div className="space-y-4">
            <div className="text-[10px] font-extrabold text-[#9aa0a6] uppercase tracking-widest border-b border-[#2b2d31] pb-2 select-none">
              Neural Network Architecture Statistics
            </div>

            {nodes.length === 0 ? (
              <div className="text-center text-gray-500 py-10 font-sans">
                Neural graph contains no structural layers. Drop layers onto the canvas to view summaries.
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-sans select-none">
                
                {/* Metric Card 1: Total Layers */}
                <div className="bg-[#1e1f22]/50 border border-[#2b2d31] p-4 rounded-2xl flex flex-col gap-1.5 shadow-sm">
                  <span className="text-[9px] font-extrabold tracking-widest text-[#9aa0a6] uppercase">Active Layers</span>
                  <span className="text-3xl font-black text-white leading-tight font-mono">{summary.layersCount}</span>
                  <span className="text-[10px] text-gray-500 font-bold uppercase mt-1 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#8ab4f8]"></span>
                    <span>Topological graph depth</span>
                  </span>
                </div>

                {/* Metric Card 2: Links */}
                <div className="bg-[#1e1f22]/50 border border-[#2b2d31] p-4 rounded-2xl flex flex-col gap-1.5 shadow-sm">
                  <span className="text-[9px] font-extrabold tracking-widest text-[#9aa0a6] uppercase">Active Connections</span>
                  <span className="text-3xl font-black text-white leading-tight font-mono">{summary.connectionsCount}</span>
                  <span className="text-[10px] text-gray-500 font-bold uppercase mt-1 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#8ab4f8]"></span>
                    <span>Graph channel links</span>
                  </span>
                </div>

                {/* Metric Card 3: Learnable Weights */}
                <div className="bg-[#1e1f22]/50 border border-[#2b2d31] p-4 rounded-2xl flex flex-col gap-1.5 shadow-sm">
                  <span className="text-[9px] font-extrabold tracking-widest text-[#9aa0a6] uppercase">Learnable Weights</span>
                  <span className="text-3xl font-black text-[#81c784] leading-tight font-mono">{summary.totalParams}</span>
                  <span className="text-[10px] text-gray-500 font-bold uppercase mt-1 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#81c784]"></span>
                    <span>Total model parameters</span>
                  </span>
                </div>

                {/* Metric Card 4: Memory footprint */}
                <div className="bg-[#1e1f22]/50 border border-[#2b2d31] p-4 rounded-2xl flex flex-col gap-1.5 shadow-sm">
                  <span className="text-[9px] font-extrabold tracking-widest text-[#9aa0a6] uppercase">Parameters Sizing</span>
                  <span className="text-3xl font-black text-[#8ab4f8] leading-tight font-mono">{summary.memoryFootprint}</span>
                  <span className="text-[10px] text-gray-500 font-bold uppercase mt-1 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#8ab4f8]"></span>
                    <span>Virtual Float32 Weight size</span>
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Training Telemetry Dashboard */}
        {activeTab === 'training' && (
          <div className="space-y-4 h-full flex flex-col font-sans select-none">
            {nodes.length === 0 ? (
              <div className="text-center text-gray-500 py-10 font-sans">
                Neural graph contains no layers. Add layers to start training.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch h-full">
                
                {/* Column 1: Controls & Setup (Span 4) */}
                <div className="lg:col-span-4 bg-[#1e1f22]/40 border border-[#2b2d31] p-4 rounded-2xl flex flex-col justify-between shadow-sm relative">
                  <div className="space-y-3.5">
                    <div className="flex justify-between items-center select-none">
                      <span className="text-[10px] font-extrabold tracking-widest text-[#9aa0a6] uppercase flex items-center gap-1.5">
                        <Sliders size={12} className="text-[#8ab4f8]" />
                        <span>Training Setup</span>
                      </span>
                      {/* Status Pill */}
                      <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full font-mono border ${
                        trainingJob?.status === 'RUNNING' ? 'bg-[#81c784]/15 text-[#81c784] border-[#81c784]/30 animate-pulse' :
                        trainingJob?.status === 'PAUSED' ? 'bg-[#ffe082]/15 text-[#ffe082] border-[#ffe082]/30' :
                        trainingJob?.status === 'COMPLETED' ? 'bg-[#81c784]/15 text-[#81c784] border-[#81c784]/30' :
                        trainingJob?.status === 'FAILED' ? 'bg-[#f28b82]/15 text-[#f28b82] border-[#f28b82]/30' :
                        'bg-gray-500/10 text-gray-400 border-gray-500/25'
                      }`}>
                        {trainingJob?.status || 'IDLE'}
                      </span>
                    </div>

                    {/* Dataset selection */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9.5px] font-extrabold text-[#9aa0a6] uppercase tracking-wider">Active Training Dataset</label>
                      <select
                        value={selectedDatasetId}
                        onChange={(e) => setSelectedDatasetId(e.target.value)}
                        disabled={trainingJob?.status === 'RUNNING' || trainingJob?.status === 'PAUSED'}
                        className="bg-[#2b2d31] border border-[#3f4046] rounded-xl px-3 py-1.5 text-xs text-[#e3e3e3] focus:outline-none focus:border-[#8ab4f8] focus:ring-1 focus:ring-[#8ab4f8]/20 transition-all font-medium disabled:opacity-50 cursor-pointer"
                      >
                        {datasets.map((ds: any) => (
                          <option key={ds.id} value={ds.id}>
                            {ds.name} ({ds.numRecords.toLocaleString()} samples)
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Providers Selection */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9.5px] font-extrabold text-[#9aa0a6] uppercase tracking-wider">Compute Architecture Host</label>
                      <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#101113] border border-[#2b2d31] rounded-xl">
                        <button
                          onClick={() => setTrainingProvider('local')}
                          disabled={trainingJob?.status === 'RUNNING' || trainingJob?.status === 'PAUSED'}
                          className={`flex items-center justify-center gap-1.5 py-1 px-3 rounded-lg text-xs font-bold transition-all ${
                            trainingProvider === 'local'
                              ? 'bg-[#2b2d31] text-[#8ab4f8]'
                              : 'text-gray-400 hover:text-white disabled:opacity-50'
                          }`}
                        >
                          <Server size={11} />
                          <span>Local Worker</span>
                        </button>
                        <button
                          onClick={() => setTrainingProvider('vertex')}
                          disabled={trainingJob?.status === 'RUNNING' || trainingJob?.status === 'PAUSED'}
                          className={`flex items-center justify-center gap-1.5 py-1 px-3 rounded-lg text-xs font-bold transition-all ${
                            trainingProvider === 'vertex'
                              ? 'bg-[#2b2d31] text-[#8ab4f8]'
                              : 'text-gray-400 hover:text-white disabled:opacity-50'
                          }`}
                        >
                          <Globe size={11} />
                          <span>Vertex AI (GPU)</span>
                        </button>
                      </div>
                    </div>

                    {/* Epochs Setup */}
                    <div className="space-y-1.5 font-mono">
                      <div className="flex justify-between text-[9.5px] font-extrabold text-[#9aa0a6] uppercase tracking-wider">
                        <span>Training Epoch Cycle Capacity</span>
                        <span className="font-mono text-xs text-white">{trainingEpochs} Epochs</span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="50"
                        step="5"
                        value={trainingEpochs}
                        onChange={(e) => setTrainingEpochs(Number(e.target.value))}
                        disabled={trainingJob?.status === 'RUNNING' || trainingJob?.status === 'PAUSED'}
                        className="w-full accent-[#8ab4f8] bg-[#2b2d31] h-1 rounded-full cursor-pointer disabled:opacity-50"
                      />
                    </div>

                    {/* Live Tuning Playground Section */}
                    <div className="mt-3 pt-3 border-t border-[#2b2d31] space-y-3 select-none">
                      <span className="text-[9.5px] font-extrabold tracking-widest text-[#9aa0a6] uppercase flex items-center gap-1.5">
                        <Sliders size={11} className="text-amber-400" />
                        <span>Live Tuning Playground</span>
                      </span>

                      {/* 2x2 Grid of Tuning Options */}
                      <div className="grid grid-cols-2 gap-x-3.5 gap-y-2">
                        {/* Learning Rate Slider */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[8px] font-extrabold text-[#9aa0a6] uppercase tracking-wider">
                            <span>LR (Rate)</span>
                            <span className="font-mono text-white text-[9px]">{trainingLearningRate}</span>
                          </div>
                          <input
                            type="range"
                            min="0.0001"
                            max="0.01"
                            step="0.0005"
                            value={trainingLearningRate}
                            onChange={(e) => setTrainingLearningRate(Number(e.target.value))}
                            className="w-full accent-amber-400 bg-[#2b2d31] h-1 rounded-full cursor-pointer"
                          />
                        </div>

                        {/* Batch Size Selection */}
                        <div className="space-y-1 flex flex-col justify-between">
                          <label className="text-[8px] font-extrabold text-[#9aa0a6] uppercase tracking-wider">Batch Size</label>
                          <select
                            value={trainingBatchSize}
                            onChange={(e) => setTrainingBatchSize(Number(e.target.value))}
                            className="w-full bg-[#2b2d31] border border-[#3f4046] rounded-lg px-2 py-0.5 text-[10px] text-[#e3e3e3] focus:outline-none focus:border-[#8ab4f8] transition-all font-medium cursor-pointer"
                          >
                            <option value={16}>16 samples</option>
                            <option value={32}>32 samples</option>
                            <option value={64}>64 batch</option>
                            <option value={128}>128 batch</option>
                            <option value={256}>256 batch</option>
                          </select>
                        </div>

                        {/* Optimizer Selection */}
                        <div className="space-y-1 flex flex-col justify-between">
                          <label className="text-[8px] font-extrabold text-[#9aa0a6] uppercase tracking-wider">Optimizer</label>
                          <select
                            value={trainingOptimizer}
                            onChange={(e) => setTrainingOptimizer(e.target.value as any)}
                            className="w-full bg-[#2b2d31] border border-[#3f4046] rounded-lg px-2 py-0.5 text-[10px] text-[#e3e3e3] focus:outline-none focus:border-[#8ab4f8] transition-all font-medium cursor-pointer"
                          >
                            <option value="Adam">Adam</option>
                            <option value="SGD">SGD</option>
                            <option value="RMSprop">RMSprop</option>
                            <option value="AdamW">AdamW</option>
                          </select>
                        </div>

                        {/* Scheduler Selection */}
                        <div className="space-y-1 flex flex-col justify-between">
                          <label className="text-[8px] font-extrabold text-[#9aa0a6] uppercase tracking-wider">Scheduler</label>
                          <select
                            value={trainingScheduler}
                            onChange={(e) => setTrainingScheduler(e.target.value as any)}
                            className="w-full bg-[#2b2d31] border border-[#3f4046] rounded-lg px-2 py-0.5 text-[10px] text-[#e3e3e3] focus:outline-none focus:border-[#8ab4f8] transition-all font-medium cursor-pointer"
                          >
                            <option value="None">None</option>
                            <option value="StepLR">StepLR</option>
                            <option value="CosineAnnealing">Cosine</option>
                            <option value="ReduceLROnPlateau">ReduceLROn</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Start/Pause/Abort Controls */}
                  <div className="flex items-center gap-2 mt-4 select-none">
                    {trainingJob?.status === 'RUNNING' ? (
                      <>
                        <button
                          onClick={pauseTraining}
                          className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-[#ffe082]/10 border border-[#ffe082]/20 hover:bg-[#ffe082]/20 text-[#ffe082] rounded-xl text-xs font-bold transition-all cursor-pointer"
                          title="Pause training run"
                        >
                          <Pause size={12} />
                          <span>Pause</span>
                        </button>
                        <button
                          onClick={stopTraining}
                          className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-[#f28b82]/10 border border-[#f28b82]/20 hover:bg-[#f28b82]/20 text-[#f28b82] rounded-xl text-xs font-bold transition-all cursor-pointer"
                          title="Abort current training pipeline"
                        >
                          <Square size={12} />
                          <span>Abort</span>
                        </button>
                        <button
                          onClick={() => restartTraining(selectedDatasetId)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 text-amber-500 rounded-xl text-xs font-bold transition-all cursor-pointer"
                          title="Restart training from Epoch 0"
                        >
                          <RotateCw size={12} />
                          <span>Restart</span>
                        </button>
                      </>
                    ) : trainingJob?.status === 'PAUSED' ? (
                      <>
                        <button
                          onClick={() => startTraining(selectedDatasetId)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-[#81c784]/15 border border-[#81c784]/30 hover:bg-[#81c784]/25 text-[#81c784] rounded-xl text-xs font-bold transition-all cursor-pointer"
                          title="Resume training"
                        >
                          <Play size={12} />
                          <span>Resume</span>
                        </button>
                        <button
                          onClick={stopTraining}
                          className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-[#f28b82]/10 border border-[#f28b82]/20 hover:bg-[#f28b82]/20 text-[#f28b82] rounded-xl text-xs font-bold transition-all cursor-pointer"
                          title="Abort current training pipeline"
                        >
                          <Square size={12} />
                          <span>Abort</span>
                        </button>
                        <button
                          onClick={() => restartTraining(selectedDatasetId)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 text-amber-500 rounded-xl text-xs font-bold transition-all cursor-pointer"
                          title="Restart training from Epoch 0"
                        >
                          <RotateCw size={12} />
                          <span>Restart</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startTraining(selectedDatasetId)}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#8ab4f8] hover:bg-[#a8c7fa] text-[#1e1f22] rounded-xl text-xs font-extrabold shadow-sm transition-all cursor-pointer border-none"
                        >
                          <Play size={12} className="fill-current" />
                          <span>Launch Pipeline Run</span>
                        </button>
                        {(trainingJob?.status === 'COMPLETED' || trainingJob?.status === 'STOPPED' || trainingJob?.status === 'FAILED') && (
                          <button
                            onClick={() => restartTraining(selectedDatasetId)}
                            className="px-3 py-2 bg-[#2b2d31] hover:bg-[#313338] border border-[#3f4046] text-[#9aa0a6] hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                            title="Restart pipeline run from scratch"
                          >
                            <RotateCw size={12} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Column 2: Visual curves & Progress Telemetry (Span 5) */}
                <div className="lg:col-span-5 bg-[#1e1f22]/40 border border-[#2b2d31] p-4 rounded-2xl flex flex-col justify-between shadow-sm">
                  {trainingJob && (trainingJob.status !== 'PENDING' || trainingJob.lossHistory.length > 0) ? (
                    <div className="flex-1 flex flex-col justify-between h-full space-y-3">
                      
                      {/* Metric curves */}
                      <div className="grid grid-cols-2 gap-4 flex-1 items-stretch">
                        
                        {/* Curve 1: Loss SVG */}
                        <div className="bg-[#101113] border border-[#2b2d31] p-3 rounded-xl flex flex-col justify-between h-28 relative">
                          <span className="text-[8.5px] font-extrabold text-[#9aa0a6] uppercase tracking-widest border-b border-[#2b2d31]/80 pb-1 mb-1 flex justify-between items-center">
                            <span>Downstream Loss</span>
                            <span className="font-mono text-white text-[9.5px] font-black">
                              {trainingJob.lossHistory.length > 0 ? trainingJob.lossHistory[trainingJob.lossHistory.length - 1].toFixed(4) : '0.0000'}
                            </span>
                          </span>
                          
                          {/* Live SVG Loss Curve */}
                          <div className="flex-1 w-full h-full relative">
                            {trainingJob.lossHistory.length > 1 ? (
                              <svg className="w-full h-full" viewBox="0 0 200 70" preserveAspectRatio="none">
                                {/* Grid lines */}
                                <line x1="0" y1="17.5" x2="200" y2="17.5" stroke="#2b2d31" strokeDasharray="2 2" strokeWidth="0.75" />
                                <line x1="0" y1="35" x2="200" y2="35" stroke="#2b2d31" strokeDasharray="2 2" strokeWidth="0.75" />
                                <line x1="0" y1="52.5" x2="200" y2="52.5" stroke="#2b2d31" strokeDasharray="2 2" strokeWidth="0.75" />
                                
                                {/* Polyline path */}
                                <polyline
                                  fill="none"
                                  stroke="#f28b82"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  points={trainingJob.lossHistory.map((loss, idx) => {
                                    const x = (idx / (trainingJob.epochs - 1)) * 200;
                                    // Map loss 0.0 -> 1.0 to y 65 -> 5
                                    const y = 65 - Math.min(60, (loss / 1.0) * 60);
                                    return `${x},${y}`;
                                  }).join(' ')}
                                />
                              </svg>
                            ) : (
                              <div className="flex items-center justify-center h-full text-[#9aa0a6] text-[9px] font-bold">
                                Waiting for data...
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Curve 2: Accuracy SVG */}
                        <div className="bg-[#101113] border border-[#2b2d31] p-3 rounded-xl flex flex-col justify-between h-28 relative">
                          <span className="text-[8.5px] font-extrabold text-[#9aa0a6] uppercase tracking-widest border-b border-[#2b2d31]/80 pb-1 mb-1 flex justify-between items-center">
                            <span>Validation Accuracy</span>
                            <span className="font-mono text-white text-[9.5px] font-black">
                              {trainingJob.accuracyHistory.length > 0 ? `${(trainingJob.accuracyHistory[trainingJob.accuracyHistory.length - 1] * 100).toFixed(2)}%` : '0.00%'}
                            </span>
                          </span>
                          
                          {/* Live SVG Accuracy Curve */}
                          <div className="flex-1 w-full h-full relative">
                            {trainingJob.accuracyHistory.length > 1 ? (
                              <svg className="w-full h-full" viewBox="0 0 200 70" preserveAspectRatio="none">
                                {/* Grid lines */}
                                <line x1="0" y1="17.5" x2="200" y2="17.5" stroke="#2b2d31" strokeDasharray="2 2" strokeWidth="0.75" />
                                <line x1="0" y1="35" x2="200" y2="35" stroke="#2b2d31" strokeDasharray="2 2" strokeWidth="0.75" />
                                <line x1="0" y1="52.5" x2="200" y2="52.5" stroke="#2b2d31" strokeDasharray="2 2" strokeWidth="0.75" />
                                
                                {/* Polyline path */}
                                <polyline
                                  fill="none"
                                  stroke="#81c784"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  points={trainingJob.accuracyHistory.map((acc, idx) => {
                                    const x = (idx / (trainingJob.epochs - 1)) * 200;
                                    // Map accuracy 0.0 -> 1.0 to y 65 -> 5
                                    const y = 65 - (acc * 60);
                                    return `${x},${y}`;
                                  }).join(' ')}
                                />
                              </svg>
                            ) : (
                              <div className="flex items-center justify-center h-full text-[#9aa0a6] text-[9px] font-bold">
                                Waiting for data...
                              </div>
                            )}
                          </div>
                        </div>

                      </div>

                      {/* Progress bar container */}
                      <div className="bg-[#101113]/60 border border-[#2b2d31] p-3 rounded-xl space-y-1.5">
                        <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 select-none">
                          <span className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#8ab4f8] animate-pulse"></span>
                            <span>Epoch Cycle: {trainingJob.currentEpoch} / {trainingJob.epochs}</span>
                          </span>
                          <span className="font-mono text-white">
                            {Math.round((trainingJob.currentEpoch / trainingJob.epochs) * 100)}%
                          </span>
                        </div>
                        {/* Progress Bar Track */}
                        <div className="w-full h-1.5 bg-[#2b2d31] rounded-full overflow-hidden border border-[#3f4046]/45">
                          <div 
                            className="h-full bg-gradient-to-r from-[#8ab4f8] to-[#81c784] rounded-full transition-all duration-300 relative"
                            style={{ width: `${(trainingJob.currentEpoch / trainingJob.epochs) * 100}%` }}
                          >
                            <span className="absolute top-0 right-0 w-1.5 h-full bg-white opacity-40 animate-ping"></span>
                          </div>
                        </div>
                        <div className="flex justify-between text-[8px] font-extrabold text-gray-500 uppercase tracking-widest font-mono select-none">
                          <span>Speed: {trainingProvider === 'vertex' ? '245 ms/step' : '1.0 s/epoch'}</span>
                          <span>ETA: {trainingJob.status === 'COMPLETED' ? 'FINISHED' : trainingJob.status === 'RUNNING' ? `${Math.max(0, trainingJob.epochs - trainingJob.currentEpoch)}s` : 'PAUSED'}</span>
                        </div>
                      </div>

                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col justify-center items-center py-10 text-center select-none">
                      <Zap size={32} className="text-[#9aa0a6] opacity-35 mb-2.5 animate-pulse" />
                      <h4 className="text-xs font-bold text-[#e3e3e3] uppercase">No Active Pipeline Session</h4>
                      <p className="text-[10px] text-gray-500 mt-1.5 max-w-xs leading-relaxed font-semibold">
                        Configure parameters, select a compute architecture host, and click launch to stream real-time training telemetries.
                      </p>
                    </div>
                  )}
                </div>

                {/* Column 3: Hardware Monitor Metrics (Span 3) */}
                <div className="lg:col-span-3 bg-[#1e1f22]/40 border border-[#2b2d31] p-4 rounded-2xl flex flex-col justify-between shadow-sm select-none text-[10.5px]">
                  
                  <div className="space-y-4">
                    <span className="text-[10px] font-extrabold tracking-widest text-[#9aa0a6] uppercase flex items-center gap-1.5">
                      <Cpu size={12} className="text-[#81c784]" />
                      <span>Cluster Monitor</span>
                    </span>

                    {/* Stat items list */}
                    <div className="space-y-3.5">
                      
                      {/* Host */}
                      <div className="flex flex-col gap-0.5 border-b border-[#2b2d31] pb-2">
                        <span className="text-[8.5px] font-extrabold text-[#9aa0a6] uppercase tracking-wider">Host Provider</span>
                        <span className="text-xs font-extrabold text-white truncate">
                          {trainingProvider === 'vertex' ? 'GCP Vertex AI managed' : 'Local System Worker'}
                        </span>
                      </div>

                      {/* Device spec */}
                      <div className="flex flex-col gap-0.5 border-b border-[#2b2d31] pb-2">
                        <span className="text-[8.5px] font-extrabold text-[#9aa0a6] uppercase tracking-wider">Hardware Accelerator</span>
                        <span className="text-xs font-extrabold text-white truncate">
                          {trainingProvider === 'vertex' ? 'NVIDIA Tesla T4 GPU' : 'Intel Xeon CPU Worker'}
                        </span>
                      </div>

                      {/* Temperature flashing gauge */}
                      <div className="flex items-center justify-between border-b border-[#2b2d31] pb-2">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[8.5px] font-extrabold text-[#9aa0a6] uppercase tracking-wider">Core Thermal</span>
                          <span className="text-xs font-black text-white font-mono">
                            {trainingJob?.status === 'RUNNING' || trainingJob?.status === 'PAUSED'
                              ? `${trainingJob.metricsMetadata?.temperature || 68}°C`
                              : trainingProvider === 'vertex' ? '34°C (Idle)' : '28°C (Idle)'}
                          </span>
                        </div>
                        <span className={`w-2.5 h-2.5 rounded-full ${
                          trainingJob?.status === 'RUNNING' 
                            ? (trainingJob.metricsMetadata?.temperature || 68) > 75 ? 'bg-red-500 animate-ping' : 'bg-amber-500 animate-pulse'
                            : 'bg-[#5f6368]'
                        }`}></span>
                      </div>

                      {/* Memory load flasher */}
                      <div className="flex items-center justify-between border-b border-[#2b2d31] pb-2">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[8.5px] font-extrabold text-[#9aa0a6] uppercase tracking-wider">Memory Allocation</span>
                          <span className="text-xs font-black text-white font-mono">
                            {trainingJob?.status === 'RUNNING' || trainingJob?.status === 'PAUSED'
                              ? trainingProvider === 'vertex'
                                ? `${((trainingJob.metricsMetadata?.memory_used_mb || 11200) / 1024).toFixed(1)} GB / 16.0 GB`
                                : `${trainingJob.metricsMetadata?.memory_used_mb || 420} MB`
                              : '0.0 GB (Standby)'}
                          </span>
                        </div>
                        <div className="w-12 h-1.5 bg-[#2b2d31] rounded-full overflow-hidden border border-[#3f4046]/45">
                          <div 
                            className="h-full bg-[#8ab4f8] rounded-full transition-all duration-500"
                            style={{ 
                              width: trainingJob?.status === 'RUNNING' || trainingJob?.status === 'PAUSED'
                                ? trainingProvider === 'vertex'
                                  ? `${((trainingJob.metricsMetadata?.memory_used_mb || 11200) / 16384) * 100}%`
                                  : '40%'
                                : '0%' 
                            }}
                          ></div>
                        </div>
                      </div>

                      {/* System Load */}
                      <div className="flex items-center justify-between pb-1">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[8.5px] font-extrabold text-[#9aa0a6] uppercase tracking-wider">Active Host Load</span>
                          <span className="text-xs font-black text-white font-mono">
                            {trainingJob?.status === 'RUNNING' || trainingJob?.status === 'PAUSED'
                              ? `${trainingJob.metricsMetadata?.system_load || 85}%`
                              : '2% (Idle)'}
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 rounded font-mono text-[9px] font-black uppercase ${
                          trainingJob?.status === 'RUNNING'
                            ? (trainingJob.metricsMetadata?.system_load || 85) > 90 ? 'bg-red-500/10 text-red-400' : 'bg-[#81c784]/15 text-[#81c784] border-[#81c784]/20'
                            : 'bg-[#2b2d31] text-[#9aa0a6]'
                        }`}>
                          {trainingJob?.status === 'RUNNING' ? 'Busy' : 'Idle'}
                        </span>
                      </div>

                    </div>
                  </div>

                  {/* Footprint params logs details */}
                  <div className="mt-4 pt-3.5 border-t border-[#2b2d31] text-[8.5px] text-[#5f6368] font-mono leading-relaxed truncate">
                    &gt; Logs: {trainingJob?.metricsMetadata?.logs || 'Waiting for operational launch.'}
                  </div>

                </div>

              </div>
            )}
          </div>
        )}

        {/* Tab 6: Benchmark Dashboard */}
        {activeTab === 'benchmark' && (
          <div className="p-5 flex flex-col h-full overflow-y-auto select-none no-scrollbar">
            {nodes.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                <BarChart2 size={36} className="text-[#9aa0a6] opacity-35 mb-2.5" />
                <h4 className="text-xs font-bold text-[#e3e3e3] uppercase">No Benchmarking Nodes Available</h4>
                <p className="text-[10px] text-gray-500 mt-1 max-w-xs leading-relaxed font-semibold">
                  Add layers (Conv2D or Dense) to your visual design graph to calculate FLOP scales, vRAM sizing, and throughput latencies.
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 text-[10.5px]">
                
                {/* 1. Column left: FLOPs bar chart (Span 4) */}
                <div className="lg:col-span-4 bg-[#1e1f22]/40 border border-[#2b2d31] p-4 rounded-2xl flex flex-col justify-between shadow-sm">
                  <div className="space-y-4">
                    <span className="text-[10px] font-extrabold tracking-widest text-[#9aa0a6] uppercase flex items-center gap-1.5">
                      <TrendingUp size={11} className="text-[#8ab4f8]" />
                      <span>FLOPs Performance Sweep</span>
                    </span>

                    <div className="flex flex-col gap-1 border-b border-[#2b2d31] pb-3 mb-2">
                      <span className="text-[8.5px] font-extrabold text-[#9aa0a6] uppercase tracking-wider">Total Est. Computational Complexity</span>
                      <span className="text-xl font-black text-[#8ab4f8] font-mono tracking-wide">{benchmarks.totalFlops}</span>
                    </div>

                    <div className="space-y-3">
                      <span className="text-[8.5px] font-extrabold text-[#9aa0a6] uppercase tracking-wider block">Top Compute Bottlenecks</span>
                      {benchmarks.layersFlops.length === 0 ? (
                        <p className="text-[9.5px] text-gray-500 font-mono leading-none py-2">No heavy compute layers present.</p>
                      ) : (
                        benchmarks.layersFlops.map((item, idx) => (
                          <div key={idx} className="space-y-1">
                            <div className="flex justify-between text-[9.5px] font-bold">
                              <span className="text-gray-300 font-mono">{item.name}</span>
                              <span className="text-[#8ab4f8] font-mono">{item.percentage}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-[#2b2d31] rounded-full overflow-hidden border border-[#3f4046]/45">
                              <div 
                                className="h-full bg-gradient-to-r from-[#8ab4f8] to-[#81c784] rounded-full transition-all duration-500"
                                style={{ width: `${item.percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Column middle: Memory Sizing stacked bar (Span 4) */}
                <div className="lg:col-span-4 bg-[#1e1f22]/40 border border-[#2b2d31] p-4 rounded-2xl flex flex-col justify-between shadow-sm">
                  <div className="space-y-4">
                    <span className="text-[10px] font-extrabold tracking-widest text-[#9aa0a6] uppercase flex items-center gap-1.5">
                      <Database size={11} className="text-[#81c784]" />
                      <span>vRAM Memory Allocation</span>
                    </span>

                    <div className="flex flex-col gap-1 border-b border-[#2b2d31] pb-3 mb-2">
                      <span className="text-[8.5px] font-extrabold text-[#9aa0a6] uppercase tracking-wider">Est. vRAM footprint (Batch 32)</span>
                      <span className="text-xl font-black text-[#81c784] font-mono tracking-wide">{benchmarks.totalVRAM}</span>
                    </div>

                    {/* Stacked Memory Progress Bar */}
                    <div className="space-y-3">
                      <span className="text-[8.5px] font-extrabold text-[#9aa0a6] uppercase tracking-wider block">Allocation Breakdown</span>
                      {(() => {
                        const total = benchmarks.totalVRAMRaw;
                        if (total === 0) return null;
                        const wPct = (benchmarks.weightsMemoryRaw / total) * 100;
                        const aPct = (benchmarks.activationMemoryRaw / total) * 100;
                        const oPct = (benchmarks.optimizerMemoryRaw / total) * 100;

                        return (
                          <div className="space-y-3">
                            <div className="w-full h-3 bg-[#2b2d31] rounded-full overflow-hidden border border-[#3f4046]/45 flex">
                              <div className="h-full bg-[#8ab4f8] transition-all duration-550" style={{ width: `${wPct}%` }} title="Model Weights"></div>
                              <div className="h-full bg-[#81c784] transition-all duration-550" style={{ width: `${aPct}%` }} title="Activations"></div>
                              <div className="h-full bg-amber-500 transition-all duration-550" style={{ width: `${oPct}%` }} title="Optimizer States"></div>
                            </div>

                            <div className="space-y-1.5 font-mono text-[9px]">
                              <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1 text-gray-300">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#8ab4f8]"></span>
                                  <span>Weights Memory:</span>
                                </span>
                                <span className="text-white font-bold">{benchmarks.weightsMemory}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1 text-gray-300">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#81c784]"></span>
                                  <span>Activations Memory:</span>
                                </span>
                                <span className="text-white font-bold">{benchmarks.activationMemory}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1 text-gray-300">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                  <span>Optimizer States:</span>
                                </span>
                                <span className="text-white font-bold">{benchmarks.optimizerMemory}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* 3. Column right: Latency Analyser & Throughput Comparison (Span 4) */}
                <div className="lg:col-span-4 bg-[#1e1f22]/40 border border-[#2b2d31] p-4 rounded-2xl flex flex-col justify-between shadow-sm">
                  <div className="space-y-4">
                    <span className="text-[10px] font-extrabold tracking-widest text-[#9aa0a6] uppercase flex items-center gap-1.5">
                      <Gauge size={11} className="text-amber-500" />
                      <span>Latency & Throughput Solvers</span>
                    </span>

                    {/* Latency CPU vs GPU */}
                    <div className="grid grid-cols-2 gap-3 border-b border-[#2b2d31] pb-3 mb-2 font-mono">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[8px] font-extrabold text-[#9aa0a6] uppercase tracking-wider">GPU Forward Pass</span>
                        <span className="text-sm font-black text-amber-400">{benchmarks.gpuLatency}</span>
                      </div>
                      <div className="flex flex-col gap-0.5 border-l border-[#2b2d31] pl-3">
                        <span className="text-[8px] font-extrabold text-[#9aa0a6] uppercase tracking-wider">CPU Forward Pass</span>
                        <span className="text-sm font-black text-gray-400">{benchmarks.cpuLatency}</span>
                      </div>
                    </div>

                    {/* Hardware Throughput comparison */}
                    <div className="space-y-2">
                      <span className="text-[8.5px] font-extrabold text-[#9aa0a6] uppercase tracking-wider block">Throughput Samples / Sec</span>
                      {(() => {
                        const flops = benchmarks.totalFlopsRaw || 1000;
                        const t_cpu = Math.round(Math.min(120, 2e9 / flops));
                        const t_rtx = Math.round(Math.min(2800, 1.5e11 / flops));
                        const t_tpu = Math.round(Math.min(9400, 5e11 / flops));
                        const t_h100 = Math.round(Math.min(24000, 1e12 / flops));

                        const maxVal = Math.max(t_cpu, t_rtx, t_tpu, t_h100);

                        return (
                          <div className="space-y-2 font-mono text-[9px]">
                            <div className="space-y-0.5">
                              <div className="flex justify-between font-bold text-gray-300">
                                <span>Intel Core i7 CPU</span>
                                <span>{t_cpu} samples/s</span>
                              </div>
                              <div className="w-full h-1 bg-[#2b2d31] rounded-full overflow-hidden">
                                <div className="h-full bg-gray-400" style={{ width: `${(t_cpu / maxVal) * 100}%` }}></div>
                              </div>
                            </div>
                            <div className="space-y-0.5">
                              <div className="flex justify-between font-bold text-gray-300">
                                <span>NVIDIA RTX 4090 GPU</span>
                                <span>{t_rtx} samples/s</span>
                              </div>
                              <div className="w-full h-1 bg-[#2b2d31] rounded-full overflow-hidden">
                                <div className="h-full bg-[#8ab4f8]" style={{ width: `${(t_rtx / maxVal) * 100}%` }}></div>
                              </div>
                            </div>
                            <div className="space-y-0.5">
                              <div className="flex justify-between font-bold text-gray-300">
                                <span>Google TPU v4 Host</span>
                                <span>{t_tpu} samples/s</span>
                              </div>
                              <div className="w-full h-1 bg-[#2b2d31] rounded-full overflow-hidden">
                                <div className="h-full bg-[#81c784]" style={{ width: `${(t_tpu / maxVal) * 100}%` }}></div>
                              </div>
                            </div>
                            <div className="space-y-0.5">
                              <div className="flex justify-between font-bold text-gray-300">
                                <span>NVIDIA H100 GPU</span>
                                <span>{t_h100} samples/s</span>
                              </div>
                              <div className="w-full h-1 bg-[#2b2d31] rounded-full overflow-hidden">
                                <div className="h-full bg-[#c5a3ff]" style={{ width: `${(t_h100 / maxVal) * 100}%` }}></div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>

              </div>

              {/* Admin-Only Control Widget: System Allocations */}
              {userRole === 'Admin' && (
                <div className="mt-5 bg-[#1e1f22]/70 border border-[#b388ff]/30 p-5 rounded-2xl shadow-xl shadow-[#b388ff]/5 flex flex-col gap-4 animate-in fade-in duration-300 relative overflow-hidden">
                  {/* Glowing ambient background purple accent */}
                  <div className="absolute right-[-100px] top-[-100px] w-64 h-64 rounded-full bg-[#b388ff]/10 blur-[80px] pointer-events-none"></div>
                  
                  <div className="flex items-center justify-between border-b border-[#2b2d31] pb-3.5 text-left">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-[#b388ff]/10 border border-[#b388ff]/20 text-[#b388ff] rounded-xl">
                        <Settings size={14} className="animate-spin duration-3000" />
                      </div>
                      <div>
                        <span className="text-[10px] font-extrabold tracking-widest text-[#b388ff] uppercase block">Admin Control Deck</span>
                        <h4 className="text-xs font-black text-white mt-0.5">⚙️ Cluster System Allocations</h4>
                      </div>
                    </div>
                    <span className="bg-[#b388ff]/15 border border-[#b388ff]/30 px-3 py-1 rounded-full text-[9px] font-black text-[#b388ff] uppercase tracking-wider animate-pulse shadow-sm">
                      🛡️ Secure Root Active
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center text-left">
                    {/* Left: GPU Throttling slider */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-[9.5px] font-bold">
                        <span className="text-[#9aa0a6] uppercase tracking-wider">GPU Memory Throttling Limit</span>
                        <span className="text-[#b388ff] font-mono font-black">{gpuThrottleLimit}% Cap</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min="10"
                          max="100"
                          step="5"
                          value={gpuThrottleLimit}
                          onChange={(e) => setGpuThrottleLimit(parseInt(e.target.value))}
                          className="flex-1 cursor-pointer accent-[#b388ff] h-1.5 rounded-full"
                        />
                        <span className="text-[8.5px] text-[#9aa0a6] font-mono min-w-[32px] text-right font-bold">
                          {gpuThrottleLimit < 50 ? 'Eco Mode' : gpuThrottleLimit < 85 ? 'Optimized' : 'Max-Power'}
                        </span>
                      </div>
                      <p className="text-[8.5px] text-[#9aa0a6] leading-relaxed font-semibold">
                        Caps the maximum available vRAM allocation limit for the sandbox compilation runtime to throttle multi-tenant host cluster wear.
                      </p>
                    </div>

                    {/* Right: Cluster Priority dropdown */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-[9.5px] font-bold">
                        <span className="text-[#9aa0a6] uppercase tracking-wider">Host Node Cluster Priority</span>
                        <span className="text-[#b388ff] font-bold">
                          {clusterPriority === 'High' ? '🔴 Production Peak' : clusterPriority === 'Medium' ? '🟡 Shared Priority' : '🟢 Best Effort (Low)'}
                        </span>
                      </div>
                      <div className="relative">
                        <select
                          value={clusterPriority}
                          onChange={(e) => setClusterPriority(e.target.value as any)}
                          className="w-full bg-[#2b2d31] border border-[#b388ff]/25 rounded-xl px-4 py-2.5 text-xs text-white cursor-pointer focus:outline-none focus:border-[#b388ff] transition-all font-bold"
                        >
                          <option value="High">🔴 High Priority (Immediate Preemption Safeguards)</option>
                          <option value="Medium">🟡 Medium Priority (Weighted Round-Robin Scheduling)</option>
                          <option value="Low">🟢 Low Priority / Best Effort (Spike Preemptible Pools)</option>
                        </select>
                      </div>
                      <p className="text-[8.5px] text-[#9aa0a6] leading-relaxed font-semibold">
                        Assigns runtime prioritization metrics for Kubernetes pods spawning compiler test instances on Google Kubernetes Engine.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          </div>
        )}

        {/* Tab 7: Execution Timeline Profile View */}
        {activeTab === 'timeline' && (() => {
          // 1. Sort nodes topologically
          const order = (() => {
            const list: CanvasNode[] = [];
            const visited = new Set<string>();
            const visit = (nodeId: string) => {
              if (visited.has(nodeId)) return;
              visited.add(nodeId);
              edges.filter(e => e.source === nodeId).forEach(e => {
                const targetNode = nodes.find(n => n.id === e.target);
                if (targetNode) visit(targetNode.id);
              });
              const node = nodes.find(n => n.id === nodeId);
              if (node) list.unshift(node);
            };
            const incomingSources = new Set(edges.map(e => e.target));
            nodes.filter(n => !incomingSources.has(n.id)).forEach(n => visit(n.id));
            nodes.forEach(n => visit(n.id));
            return list;
          })();

          // 2. Calculate mock durations
          const layerLatencies = order.map(node => {
            let duration = 0.05; // Base input/flatten latency in ms
            if (node.type === 'Conv2D') {
              const inputChannels = node.inputShape.length >= 3 ? node.inputShape[2] : 3;
              const outputFilters = node.config.filters || 64;
              const kernel = node.config.kernelSize || 3;
              const outH = node.outputShape.length >= 2 ? node.outputShape[0] : 224;
              const outW = node.outputShape.length >= 2 ? node.outputShape[1] : 224;
              const flops = 2 * kernel * kernel * inputChannels * outputFilters * outH * outW;
              duration = flops / 1.2e7 + 0.3; // estimated duration in ms
            } else if (node.type === 'Dense') {
              const inputFeatures = node.inputShape.length > 0 ? node.inputShape[0] : 0;
              const outputUnits = node.config.units || 10;
              if (inputFeatures > 0) {
                const flops = 2 * inputFeatures * outputUnits;
                duration = flops / 5e5 + 0.1;
              }
            } else if (node.type === 'MaxPool2D') {
              duration = 0.25;
            }
            return {
              id: node.id,
              name: node.name,
              type: node.type,
              duration: parseFloat(duration.toFixed(2))
            };
          });

          const totalLatency = parseFloat(layerLatencies.reduce((a, b) => a + b.duration, 0).toFixed(2));
          
          // Find bottleneck (layer taking > 30% of total time)
          const bottleneck = layerLatencies.find(l => (l.duration / (totalLatency || 1)) * 100 > 30);

          return (
            <div className="p-5 flex flex-col h-full overflow-y-auto select-none no-scrollbar text-[#e3e3e3]">
              {nodes.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                  <Clock size={36} className="text-[#9aa0a6] opacity-35 mb-2.5" />
                  <h4 className="text-xs font-bold text-[#e3e3e3] uppercase">No Execution Trace Available</h4>
                  <p className="text-[10px] text-gray-500 mt-1 max-w-xs leading-relaxed font-semibold">
                    Visualise forward-pass execution Gantt charts by adding neural layers (Input, Conv2D, MaxPool2D, Dense) to your visual design workspace.
                  </p>
                </div>
              ) : (
                <div className="space-y-5 text-left text-xs">
                  {/* Timeline Header Summary & Warnings */}
                  <div className="flex flex-col md:flex-row justify-between gap-4 bg-[#2b2d31]/40 border border-[#3f4046]/30 rounded-2xl p-4">
                    <div>
                      <h4 className="text-xs font-black text-white">⏳ Neural Forward Pass Profiler</h4>
                      <p className="text-[9px] text-[#9aa0a6] font-semibold mt-0.5 leading-relaxed">
                        Calculates execution latency estimates across active layers based on theoretical FLOPS computational complexity and memory throughput sizing.
                      </p>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <span className="text-[9px] font-extrabold text-[#9aa0a6] uppercase tracking-wider block">Total pass delay</span>
                        <span className="text-sm font-black text-[#8ab4f8] font-mono">{totalLatency} ms</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] font-extrabold text-[#9aa0a6] uppercase tracking-wider block">Bottleneck layer</span>
                        <span className={`text-xs font-black ${bottleneck ? 'text-[#f28b82]' : 'text-[#81c784]'}`}>
                          {bottleneck ? bottleneck.name : 'None'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {bottleneck && (
                    <div className="flex items-start gap-3 bg-red-500/5 border border-red-500/20 rounded-xl p-3 text-[10px] text-red-300 leading-relaxed font-semibold">
                      <AlertTriangle size={14} className="text-red-400 mt-0.5 shrink-0" />
                      <div>
                        <span className="font-bold text-white uppercase block mb-0.5">Computational Bottleneck Identified</span>
                        Layer <strong className="text-white">'{bottleneck.name}'</strong> takes <strong className="text-white">{((bottleneck.duration / totalLatency) * 100).toFixed(1)}%</strong> of total computation time. Consider inserting a <strong className="text-white">MaxPool2D</strong> downsampling layer earlier, reducing Conv2D filters, or shrinking Dense units to optimize forward-pass hardware latency.
                      </div>
                    </div>
                  )}

                  {/* Gantt-style Timeline List */}
                  <div className="space-y-3.5 bg-[#202124] border border-[#2b2d31] rounded-2xl p-4">
                    {/* Time Ruler */}
                    <div className="flex items-center border-b border-[#2b2d31] pb-2 text-[8.5px] text-[#5f6368] font-bold uppercase tracking-widest">
                      <div className="w-44">Layer (Click to Locate)</div>
                      <div className="flex-1 flex justify-between px-2 font-mono">
                        <span>0 ms</span>
                        <span>{(totalLatency * 0.25).toFixed(1)} ms</span>
                        <span>{(totalLatency * 0.5).toFixed(1)} ms</span>
                        <span>{(totalLatency * 0.75).toFixed(1)} ms</span>
                        <span>{totalLatency} ms</span>
                      </div>
                      <div className="w-16 text-right">Delay</div>
                    </div>

                    <div className="space-y-2">
                      {layerLatencies.map((layer) => {
                        const pct = (layer.duration / (totalLatency || 1)) * 100;
                        const isBottleneck = bottleneck && bottleneck.id === layer.id;
                        const isSelected = selectedNodeId === layer.id;
                        
                        return (
                          <div 
                            key={layer.id}
                            onClick={() => setSelectedNodeId(layer.id)}
                            className={`flex items-center group py-1 px-1.5 rounded-lg transition-all cursor-pointer ${
                              isSelected ? 'bg-[#8ab4f8]/5 border border-[#8ab4f8]/20' : 'hover:bg-[#2b2d31]/40 border border-transparent'
                            }`}
                          >
                            {/* Layer tag */}
                            <div className="w-40 flex items-center justify-between pr-2.5">
                              <span className="font-bold text-white truncate group-hover:text-[#8ab4f8] transition-colors">{layer.name}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[7.5px] font-black uppercase font-mono tracking-wider ${
                                layer.type === 'Conv2D' ? 'bg-[#8ab4f8]/10 text-[#8ab4f8]' :
                                layer.type === 'Dense' ? 'bg-[#ffe082]/10 text-[#ffe082]' :
                                layer.type === 'MaxPool2D' ? 'bg-[#80cbc4]/10 text-[#80cbc4]' :
                                'bg-[#2b2d31] text-[#9aa0a6]'
                              }`}>
                                {layer.type}
                              </span>
                            </div>

                            {/* Relative Gantt Bar */}
                            <div className="flex-1 px-2">
                              <div className="h-4 bg-[#1b1c1e] rounded overflow-hidden relative flex items-center">
                                <div 
                                  className={`h-full rounded transition-all duration-500 ${
                                    isBottleneck ? 'bg-gradient-to-r from-red-500 to-red-400 shadow-md shadow-red-500/20' :
                                    pct > 20 ? 'bg-gradient-to-r from-amber-500 to-amber-400' :
                                    'bg-gradient-to-r from-blue-500 to-blue-400'
                                  }`}
                                  style={{ width: `${pct}%` }}
                                ></div>
                              </div>
                            </div>

                            {/* Delay value */}
                            <div className="w-16 text-right font-mono font-bold text-gray-400">
                              {layer.duration} ms
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Tab 8: Observability & Infrastructure UI */}
        {activeTab === 'infra' && (() => {
          // Initialize or get simulated metrics
          const metrics = obsMetrics || {
            apiLatency: 12,
            apiCpu: 4.2,
            wsLatency: 6,
            redisOps: 482,
            celeryLoad: 8.5
          };

          return (
            <div className="p-5 flex flex-col h-full overflow-y-auto select-none no-scrollbar text-[#e3e3e3]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 text-left">
                {/* 1. FastAPI Backend Health */}
                <div className="bg-[#202124] border border-[#2b2d31] rounded-2xl p-4.5 space-y-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-green-500/5 blur-xl pointer-events-none"></div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-extrabold text-[#9aa0a6] uppercase tracking-widest block">API Microservice</span>
                    <span className="bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded text-[8px] font-black text-green-400 uppercase tracking-wider animate-pulse">
                      🟢 Healthy
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">FastAPI Backend</h4>
                    <span className="text-[8px] text-gray-500 font-mono font-bold">Uptime: 14h 23m | Version 1.4.2</span>
                  </div>
                  
                  <div className="space-y-2 pt-1 border-t border-[#2b2d31]">
                    <div className="flex justify-between items-center text-[9px] font-bold">
                      <span className="text-[#9aa0a6] uppercase">API Ping RTT</span>
                      <span className="font-mono text-[#81c784]">{metrics.apiLatency} ms</span>
                    </div>
                    <div className="flex justify-between items-center text-[9px] font-bold">
                      <span className="text-[#9aa0a6] uppercase">CPU Thread Load</span>
                      <span className="font-mono text-white">{metrics.apiCpu}%</span>
                    </div>
                    <div className="flex justify-between items-center text-[9px] font-bold">
                      <span className="text-[#9aa0a6] uppercase">Host RAM footprint</span>
                      <span className="font-mono text-white">248.4 MB</span>
                    </div>
                  </div>
                </div>

                {/* 2. WebSocket Collaboration Channel */}
                <div className="bg-[#202124] border border-[#2b2d31] rounded-2xl p-4.5 space-y-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-blue-500/5 blur-xl pointer-events-none"></div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-extrabold text-[#9aa0a6] uppercase tracking-widest block">Sync Stream</span>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                      isOnline ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-amber-500/10 border border-amber-500/20 text-amber-400 animate-pulse'
                    }`}>
                      {isOnline ? '🟢 Connected' : '🟡 Offline Sandbox'}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">WebSocket Session</h4>
                    <span className="text-[8px] text-gray-500 font-mono font-bold truncate block">Room: mlbuilder_collaboration</span>
                  </div>
                  
                  <div className="space-y-2 pt-1 border-t border-[#2b2d31]">
                    <div className="flex justify-between items-center text-[9px] font-bold">
                      <span className="text-[#9aa0a6] uppercase">WS Sync Ping RTT</span>
                      <span className="font-mono text-[#8ab4f8]">{metrics.wsLatency} ms</span>
                    </div>
                    <div className="flex justify-between items-center text-[9px] font-bold">
                      <span className="text-[#9aa0a6] uppercase">Queue Buffer size</span>
                      <span className="font-mono text-white">0 B (Clean)</span>
                    </div>
                    <div className="flex justify-between items-center text-[9px] font-bold">
                      <span className="text-[#9aa0a6] uppercase">Heartbeats Ping</span>
                      <span className="font-mono text-[#81c784]">Active (20s)</span>
                    </div>
                  </div>
                </div>

                {/* 3. Redis In-Memory Cache & Pub/Sub */}
                <div className="bg-[#202124] border border-[#2b2d31] rounded-2xl p-4.5 space-y-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-purple-500/5 blur-xl pointer-events-none"></div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-extrabold text-[#9aa0a6] uppercase tracking-widest block">Event Broker</span>
                    <span className="bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded text-[8px] font-black text-green-400 uppercase tracking-wider">
                      🟢 Active
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">Redis Cache Broker</h4>
                    <span className="text-[8px] text-gray-500 font-mono font-bold">Role: Redis Pub/Sub Cluster</span>
                  </div>
                  
                  <div className="space-y-2 pt-1 border-t border-[#2b2d31]">
                    <div className="flex justify-between items-center text-[9px] font-bold">
                      <span className="text-[#9aa0a6] uppercase">Active Channels</span>
                      <span className="font-mono text-[#c5a3ff]">3 Channels</span>
                    </div>
                    <div className="flex justify-between items-center text-[9px] font-bold">
                      <span className="text-[#9aa0a6] uppercase">Operations speed</span>
                      <span className="font-mono text-white">{metrics.redisOps} ops/s</span>
                    </div>
                    <div className="flex justify-between items-center text-[9px] font-bold">
                      <span className="text-[#9aa0a6] uppercase">Memory Allocated</span>
                      <span className="font-mono text-white">1.45 MB</span>
                    </div>
                  </div>
                </div>

                {/* 4. Celery Queue & Pipelines */}
                <div className="bg-[#202124] border border-[#2b2d31] rounded-2xl p-4.5 space-y-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-yellow-500/5 blur-xl pointer-events-none"></div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-extrabold text-[#9aa0a6] uppercase tracking-widest block">Distributed Queue</span>
                    <span className="bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded text-[8px] font-black text-green-400 uppercase tracking-wider">
                      🟢 Ready
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">Celery Task Workers</h4>
                    <span className="text-[8px] text-gray-500 font-mono font-bold">Backend pools: Redis Broker Queue</span>
                  </div>
                  
                  <div className="space-y-2 pt-1 border-t border-[#2b2d31]">
                    <div className="flex justify-between items-center text-[9px] font-bold">
                      <span className="text-[#9aa0a6] uppercase">Active Threads Pool</span>
                      <span className="font-mono text-[#ffe082]">4 Threads</span>
                    </div>
                    <div className="flex justify-between items-center text-[9px] font-bold">
                      <span className="text-[#9aa0a6] uppercase">Thread pool load</span>
                      <span className="font-mono text-white">{metrics.celeryLoad}%</span>
                    </div>
                    <div className="flex justify-between items-center text-[9px] font-bold">
                      <span className="text-[#9aa0a6] uppercase">Pipeline success rate</span>
                      <span className="font-mono text-white">99.6%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Server cluster visual dashboard diagram (M3 grid dark) */}
              <div className="mt-5 p-4.5 bg-[#202124] border border-[#2b2d31] rounded-2xl text-left">
                <h4 className="text-xs font-black text-white uppercase tracking-wider mb-2.5">🧬 Microservices Topology Pipeline</h4>
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-[9px] font-bold font-mono py-2">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-[#2b2d31]/50 border border-[#3f4046]/40 rounded-xl">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="text-[#81c784]">Front-End UI (Next.js)</span>
                  </div>
                  <div className="text-gray-500 font-bold">&gt;&gt; WS Sync API &gt;&gt;</div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-[#2b2d31]/50 border border-[#3f4046]/40 rounded-xl">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    <span className="text-[#8ab4f8]">Gateway (FastAPI)</span>
                  </div>
                  <div className="text-gray-500 font-bold">&gt;&gt; Pub/Sub Events &gt;&gt;</div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-[#2b2d31]/50 border border-[#3f4046]/40 rounded-xl">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    <span className="text-[#c5a3ff]">Broker (Redis Pub/Sub)</span>
                  </div>
                  <div className="text-gray-500 font-bold">&gt;&gt; Worker Queue &gt;&gt;</div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-[#2b2d31]/50 border border-[#3f4046]/40 rounded-xl">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="text-[#ffe082]">Worker (Celery Worker Pool)</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
