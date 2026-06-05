'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import MainLayout from '@/components/Layout/MainLayout';
import TrainingStatusCard from '@/components/Training/TrainingStatusCard';
import LossChart from '@/components/Training/LossChart';
import AccuracyChart from '@/components/Training/AccuracyChart';
import MetricsSummary from '@/components/Training/MetricsSummary';
import TrainingHistoryPanel from '@/components/Training/TrainingHistoryPanel';
import { useTrainingStore } from '@/store/trainingStore';
import { useCanvasStore } from '@/store/canvasStore';
import { Play, Square, RefreshCw, Cpu, AlertTriangle } from 'lucide-react';

export default function TrainingPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const {
    status,
    epoch,
    metrics,
    history,
    startTraining,
    stopTraining,
    disconnectSocket,
  } = useTrainingStore();

  const nodes = useCanvasStore((state) => state.nodes);
  const loadGraph = useCanvasStore((state) => state.loadGraph);
  const [isLoadingGraph, setIsLoadingGraph] = useState(true);

  // 1. Load the model graph/nodes on mount to know if it's empty
  useEffect(() => {
    if (projectId) {
      setIsLoadingGraph(true);
      loadGraph(projectId).finally(() => {
        setIsLoadingGraph(false);
      });
    }
  }, [projectId, loadGraph]);

  // 2. Only trigger active training simulation/socket if graph is NOT empty
  useEffect(() => {
    if (!isLoadingGraph && nodes.length > 0 && projectId) {
      startTraining(projectId);
    }
    return () => {
      disconnectSocket();
    };
  }, [projectId, isLoadingGraph, nodes.length, startTraining, disconnectSocket]);

  const handleRestart = () => {
    if (projectId && nodes.length > 0) {
      startTraining(projectId);
    }
  };

  if (isLoadingGraph) {
    return (
      <MainLayout>
        <div className="min-h-[70vh] w-full flex items-center justify-center bg-[#1e1f22] text-[#e3e3e3]">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 text-[#ffe082] animate-spin border-4 border-solid border-current border-r-transparent rounded-full" />
            <span className="text-xs font-semibold text-[#9aa0a6]">Analyzing Model Architecture...</span>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (nodes.length === 0) {
    return (
      <MainLayout>
        <div className="min-h-[75vh] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#1e1f22]/50 border border-[#3f4046] rounded-2xl p-8 text-center space-y-6 shadow-2xl relative overflow-hidden backdrop-blur-sm">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-amber-500/50"></div>
            
            <div className="mx-auto w-16 h-16 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center justify-center text-amber-400">
              <AlertTriangle size={32} />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-black text-white">Empty Architecture Canvas</h3>
              <p className="text-xs text-[#9aa0a6] font-semibold leading-relaxed">
                We detected that your canvas is empty. Please construct a neural network architecture with layers (e.g., Input, Dense, Conv2D) before initializing a training session.
              </p>
            </div>
            
            <div className="pt-2">
              <button
                onClick={() => router.push(`/editor/${projectId}`)}
                className="w-full py-2.5 px-4 bg-[#8ab4f8] hover:bg-[#a8c7fa] text-[#1e1f22] text-xs font-bold rounded-xl transition-all shadow-md active:scale-[0.98] border-none cursor-pointer"
              >
                Go to Canvas Editor
              </button>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6 relative pb-16">
        
        {/* Header toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Cpu className="text-[#ffe082]" size={30} />
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white">
                Workspace Real-Time Training Monitor
              </h1>
              <p className="text-[#9aa0a6] text-xs font-semibold">
                Observe learning curves, validation metrics, and baseline accuracies computed on active pipelines.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {status === 'RUNNING' ? (
              <button
                onClick={stopTraining}
                className="flex items-center gap-1.5 px-4 py-2 bg-rose-600/15 border border-rose-500/20 hover:bg-rose-600/25 text-rose-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                <Square size={13} />
                <span>Halt Session</span>
              </button>
            ) : (
              <button
                onClick={handleRestart}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#ffe082] hover:bg-[#ffebad] text-[#1e1f22] text-xs font-bold rounded-xl transition-all shadow-md active:scale-95 cursor-pointer border-none"
              >
                <Play size={13} fill="#1e1f22" />
                <span>Start Training</span>
              </button>
            )}

            {status !== 'RUNNING' && (
              <button
                onClick={handleRestart}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#2b2d31]/50 border border-[#3f4046] hover:bg-[#2b2d31] text-[#9aa0a6] hover:text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                title="Restart simulation"
              >
                <RefreshCw size={13} />
                <span>Reset Run</span>
              </button>
            )}
          </div>
        </div>

        {/* 1. Status Card Widget */}
        <TrainingStatusCard status={status} epoch={epoch} totalEpochs={20} />

        {/* 2. Middle Row: Loss Chart and Accuracy Chart */}
        <div className="flex flex-col lg:flex-row gap-5 items-stretch">
          <LossChart metrics={metrics} />
          <AccuracyChart metrics={metrics} />
        </div>

        {/* 3. Bottom Row: Metrics Summary & Experiment History */}
        <div className="flex flex-col md:flex-row gap-5 items-stretch">
          <MetricsSummary status={status} metrics={metrics} />
          <TrainingHistoryPanel history={history} />
        </div>

      </div>
    </MainLayout>
  );
}
