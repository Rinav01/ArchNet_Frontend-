'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import MainLayout from '@/components/Layout/MainLayout';
import LayerLibrary from '@/components/Panels/LayerLibrary';
import ConfigPanel from '@/components/Panels/ConfigPanel';
import ValidationPanel from '@/components/Panels/ValidationPanel';
import CanvasWrapper from '@/components/Canvas/CanvasWrapper';
import CodePreviewModal from '@/components/Modals/CodePreviewModal';
import { useCanvasStore } from '@/store/canvasStore';
import { useProjectStore } from '@/store/projectStore';
import { compileToPyTorch } from '@/lib/canvas/pytorchCompiler';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Play, 
  Plus, 
  Cpu
} from 'lucide-react';

export default function EditorPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  
  const { nodes, edges, zoom, setZoom, setPan, runForwardPass, isPlayingAnimation, addNode } = useCanvasStore();
  const setActiveProjectId = useProjectStore((state) => state.setActiveProjectId);

  // Modals state
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);

  // Set active project context on load
  useEffect(() => {
    if (projectId) {
      setActiveProjectId(projectId);
    }
  }, [projectId, setActiveProjectId]);

  const handleZoomIn = () => setZoom(z => z + 0.1);
  const handleZoomOut = () => setZoom(z => z - 0.1);
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleFloatingAdd = () => {
    // Quickly spawn a new Conv2D node
    addNode('Conv2D', 300, 200);
  };

  const generatedCode = compileToPyTorch(nodes, edges);

  return (
    <MainLayout onGenerateCode={() => setIsCodeModalOpen(true)}>
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden relative z-10 select-none">
        
        {/* Left inner Sidebar: Layer Library */}
        <LayerLibrary />

        {/* Middle Area: Canvas + Toolbar + Bottom Console Monitor */}
        <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-[#090a0f]">
          
          {/* Main Visual interactive canvas wrapper */}
          <div className="flex-1 relative w-full h-full overflow-hidden">
            <CanvasWrapper />

            {/* Float Floating Zoom Panel overlays at bottom middle */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 px-5 py-3 bg-[#11121d]/85 backdrop-blur-xl border border-white/5 shadow-2xl rounded-2xl z-30 select-none">
              <button 
                onClick={handleZoomIn}
                className="p-2 hover:bg-white/5 text-gray-400 hover:text-white rounded-lg transition-all" 
                title="Zoom In"
              >
                <ZoomIn size={16} />
              </button>
              <button 
                onClick={handleZoomOut}
                className="p-2 hover:bg-white/5 text-gray-400 hover:text-white rounded-lg transition-all" 
                title="Zoom Out"
              >
                <ZoomOut size={16} />
              </button>
              
              <div className="w-[1px] h-4 bg-white/10 mx-1"></div>

              <button 
                onClick={handleResetView}
                className="p-2 hover:bg-white/5 text-gray-400 hover:text-white rounded-lg transition-all" 
                title="Fit to Screen"
              >
                <Maximize2 size={15} />
              </button>
              <button 
                onClick={runForwardPass}
                disabled={isPlayingAnimation}
                className={`p-2 rounded-lg transition-all ${
                  isPlayingAnimation 
                    ? 'bg-purple-600/20 text-purple-400 cursor-not-allowed'
                    : 'hover:bg-purple-600/10 text-purple-400 hover:text-purple-300'
                }`}
                title="Run Forward Pass"
              >
                <Play size={15} className={isPlayingAnimation ? 'animate-pulse' : ''} />
              </button>
            </div>

            {/* Float floating Quick-Add Button overlays at bottom right */}
            <button
              onClick={handleFloatingAdd}
              className="absolute bottom-6 right-6 w-12 h-12 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-purple-500/25 border border-purple-500/25 hover:scale-105 active:scale-95 transition-all z-30"
              title="Quick Add Conv2D"
            >
              <Plus size={22} />
            </button>
          </div>

          {/* Bottom Console Monitor Panel */}
          <ValidationPanel />
        </div>

        {/* Right side Panel: Hyperparameters Config Inspector */}
        <ConfigPanel />

        {/* Floating PyTorch Code Preview Modal */}
        <CodePreviewModal
          isOpen={isCodeModalOpen}
          onClose={() => setIsCodeModalOpen(false)}
          codeString={generatedCode}
        />

      </div>
    </MainLayout>
  );
}
