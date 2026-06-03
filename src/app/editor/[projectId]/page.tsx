'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import MainLayout from '@/components/Layout/MainLayout';
import LayerLibrary from '@/components/Panels/LayerLibrary';
import ConfigPanel from '@/components/Panels/ConfigPanel';
import ValidationPanel from '@/components/Panels/ValidationPanel';
import ValidationSidebar from '@/components/Panels/ValidationSidebar';
import CanvasWrapper from '@/components/Canvas/CanvasWrapper';
import CodePreviewModal from '@/components/Modals/CodePreviewModal';
import ErrorBoundary from '@/components/Common/ErrorBoundary';
import CommandPalette from '@/components/Modals/CommandPalette';
import GraphSearch from '@/components/Modals/GraphSearch';
import { useCanvasStore } from '@/store/canvasStore';
import { useProjectStore } from '@/store/projectStore';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Play, 
  Plus, 
  Cpu,
  AlignLeft, 
  AlignVerticalJustifyStart, 
  Columns, 
  Rows, 
  FolderPlus, 
  Sparkles, 
  BarChart2,
  Save
} from 'lucide-react';

export default function EditorPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  
  const { 
    nodes, 
    edges, 
    zoom, 
    setZoom, 
    setPan, 
    runForwardPass, 
    isPlayingAnimation, 
    addNode, 
    loadGraph,
    undo,
    redo,
    connectCollaboration,
    disconnectCollaboration,
    selectedNodeIds,
    alignSelectedNodes,
    addNodeGroup,
    triggerAutoLayout,
    showStatsOverlay,
    toggleStatsOverlay,
    saveCustomBlock,
    loadCustomBlocks,
  } = useCanvasStore();
  const setActiveProjectId = useProjectStore((state) => state.setActiveProjectId);
  const loadProjects = useProjectStore((state) => state.loadProjects);
  const userRole = useProjectStore((state) => state.userRole);

  // Modals state
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isGraphSearchOpen, setIsGraphSearchOpen] = useState(false);

  // Keyboard shortcut listener for Undo / Redo and Modals (Command Palette / Graph Search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.shiftKey && e.key.toLowerCase() === 'p') {
          e.preventDefault();
          setIsCommandPaletteOpen(prev => !prev);
          return;
        } else if (e.key.toLowerCase() === 'k') {
          e.preventDefault();
          setIsGraphSearchOpen(prev => !prev);
          return;
        }
      }

      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.hasAttribute('contenteditable')
      ) {
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        if (e.key.toLowerCase() === 'z') {
          e.preventDefault();
          undo();
        } else if (e.key.toLowerCase() === 'y') {
          e.preventDefault();
          redo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [undo, redo]);

  // Set active project context on load
  useEffect(() => {
    if (projectId) {
      setActiveProjectId(projectId);
      loadProjects();
      loadGraph(projectId);
      connectCollaboration(projectId);
      loadCustomBlocks();
    }
    return () => {
      disconnectCollaboration();
    };
  }, [projectId, setActiveProjectId, loadProjects, loadGraph, connectCollaboration, disconnectCollaboration, loadCustomBlocks]);

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

  return (
    <MainLayout onGenerateCode={() => setIsCodeModalOpen(true)}>
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden relative z-10 select-none">
        
        {/* Left inner Sidebar: Layer Library */}
        <ErrorBoundary name="Layer Library Sidebar">
          <LayerLibrary />
        </ErrorBoundary>

        {/* Middle Area: Canvas + Toolbar + Bottom Console Monitor */}
        <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-[#090a0f]">
          
          {/* Main Visual interactive canvas wrapper */}
          <div className="flex-1 relative w-full h-full overflow-hidden">
            <ErrorBoundary name="Visual Canvas Stage">
              <CanvasWrapper />
            </ErrorBoundary>

            {/* Consolidated Dynamic Bottom Dock (always centered and responsive) */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-wrap items-center justify-center gap-3.5 z-30 select-none w-max max-w-[90vw]">
              
              {/* Alignment & Design Pill */}
              <div className="flex items-center gap-2.5 px-5 py-2 bg-[#2b2d31]/95 border border-[#3f4046] shadow-xl rounded-full">
                <span className="text-[9px] font-extrabold text-[#9aa0a6] uppercase tracking-wider pr-2.5 border-r border-[#3f4046]">Align</span>
                
                <button
                  onClick={() => {
                    if (userRole === 'Viewer') return;
                    alignSelectedNodes('left');
                  }}
                  disabled={selectedNodeIds.length < 2 || userRole === 'Viewer'}
                  className={`p-1.5 rounded-full transition-all ${
                    selectedNodeIds.length < 2 || userRole === 'Viewer'
                      ? 'text-[#5f6368] cursor-not-allowed opacity-50'
                      : 'text-[#9aa0a6] hover:text-white hover:bg-[#1e1f22] cursor-pointer'
                  }`}
                  title={userRole === 'Viewer' ? "Align Restricted" : "Align Left"}
                >
                  <AlignLeft size={14} />
                </button>
                <button
                  onClick={() => {
                    if (userRole === 'Viewer') return;
                    alignSelectedNodes('top');
                  }}
                  disabled={selectedNodeIds.length < 2 || userRole === 'Viewer'}
                  className={`p-1.5 rounded-full transition-all ${
                    selectedNodeIds.length < 2 || userRole === 'Viewer'
                      ? 'text-[#5f6368] cursor-not-allowed opacity-50'
                      : 'text-[#9aa0a6] hover:text-white hover:bg-[#1e1f22] cursor-pointer'
                  }`}
                  title={userRole === 'Viewer' ? "Align Restricted" : "Align Top"}
                >
                  <AlignVerticalJustifyStart size={14} />
                </button>
                <button
                  onClick={() => {
                    if (userRole === 'Viewer') return;
                    alignSelectedNodes('distribute-h');
                  }}
                  disabled={selectedNodeIds.length < 3 || userRole === 'Viewer'}
                  className={`p-1.5 rounded-full transition-all ${
                    selectedNodeIds.length < 3 || userRole === 'Viewer'
                      ? 'text-[#5f6368] cursor-not-allowed opacity-50'
                      : 'text-[#9aa0a6] hover:text-white hover:bg-[#1e1f22] cursor-pointer'
                  }`}
                  title={userRole === 'Viewer' ? "Distribute Restricted" : "Distribute Horizontally"}
                >
                  <Columns size={14} />
                </button>
                <button
                  onClick={() => {
                    if (userRole === 'Viewer') return;
                    alignSelectedNodes('distribute-v');
                  }}
                  disabled={selectedNodeIds.length < 3 || userRole === 'Viewer'}
                  className={`p-1.5 rounded-full transition-all ${
                    selectedNodeIds.length < 3 || userRole === 'Viewer'
                      ? 'text-[#5f6368] cursor-not-allowed opacity-50'
                      : 'text-[#9aa0a6] hover:text-white hover:bg-[#1e1f22] cursor-pointer'
                  }`}
                  title={userRole === 'Viewer' ? "Distribute Restricted" : "Distribute Vertically"}
                >
                  <Rows size={14} />
                </button>

                {/* Group Node folders creator */}
                <div className="w-[1px] h-4 bg-[#3f4046] mx-1"></div>
                
                <button
                  onClick={() => {
                    if (userRole === 'Viewer') return;
                    const name = window.prompt("Enter visual group name:", "ResNet Block");
                    if (name && name.trim()) {
                      addNodeGroup(name, selectedNodeIds);
                    }
                  }}
                  disabled={selectedNodeIds.length < 2 || userRole === 'Viewer'}
                  className={`flex items-center gap-1.5 px-3 py-1 border rounded-full text-[10px] font-bold transition-all ${
                    selectedNodeIds.length < 2 || userRole === 'Viewer'
                      ? 'text-[#5f6368] bg-[#2b2d31]/20 border-[#3f4046]/40 cursor-not-allowed opacity-40'
                      : 'text-[#8ab4f8] bg-[#8ab4f8]/10 hover:bg-[#8ab4f8]/20 border border-[#8ab4f8]/20 cursor-pointer'
                  }`}
                  title={userRole === 'Viewer' ? "Grouping Restricted" : "Group Selected Layers"}
                >
                  <FolderPlus size={12} />
                  <span>Group</span>
                </button>

                <button
                  onClick={() => {
                    if (userRole === 'Viewer') return;
                    const name = window.prompt("Enter Custom Block name:", "Custom Transformer Block");
                    if (name && name.trim()) {
                      saveCustomBlock(name, selectedNodeIds);
                    }
                  }}
                  disabled={selectedNodeIds.length === 0 || userRole === 'Viewer'}
                  className={`flex items-center gap-1.5 px-3 py-1 border rounded-full text-[10px] font-bold transition-all ${
                    selectedNodeIds.length === 0 || userRole === 'Viewer'
                      ? 'text-[#5f6368] bg-[#2b2d31]/20 border-[#3f4046]/40 cursor-not-allowed opacity-40'
                      : 'text-[#81c784] bg-[#81c784]/10 hover:bg-[#81c784]/20 border border-[#81c784]/20 cursor-pointer'
                  }`}
                  title={userRole === 'Viewer' ? "Saving Blocks Restricted" : "Save Selected Layers as Custom Reusable Block"}
                >
                  <Save size={12} />
                  <span>Save Block</span>
                </button>

                {/* Topological Auto-Layout Trigger */}
                <div className="w-[1px] h-4 bg-[#3f4046] mx-1"></div>
                
                <button
                  onClick={() => {
                    if (userRole === 'Viewer') return;
                    triggerAutoLayout();
                  }}
                  disabled={userRole === 'Viewer'}
                  className={`flex items-center gap-1.5 px-3 py-1 border rounded-full text-[10px] font-bold transition-all ${
                    userRole === 'Viewer'
                      ? 'text-[#5f6368] bg-[#2b2d31]/20 border-[#3f4046]/40 cursor-not-allowed opacity-40'
                      : 'bg-[#81c784]/15 hover:bg-[#81c784]/25 border border-[#81c784]/30 text-[#81c784] cursor-pointer'
                  }`}
                  title={userRole === 'Viewer' ? "Auto Layout Restricted" : "Auto Layout Graph"}
                >
                  <Sparkles size={12} />
                  <span>Auto Layout</span>
                </button>

                {/* Toggle Node Stats Overlay */}
                <div className="w-[1px] h-4 bg-[#3f4046] mx-1"></div>
                
                <button
                  onClick={() => toggleStatsOverlay()}
                  className={`flex items-center gap-1.5 px-3 py-1 border rounded-full text-[10px] font-bold transition-all ${
                    showStatsOverlay
                      ? 'bg-[#c5a3ff]/15 hover:bg-[#c5a3ff]/25 border-[#c5a3ff]/30 text-[#c5a3ff] cursor-pointer'
                      : 'bg-[#2b2d31]/20 hover:bg-[#1e1f22] border-[#3f4046] text-[#9aa0a6] cursor-pointer'
                  }`}
                  title="Toggle Layer Statistics Overlay"
                >
                  <BarChart2 size={12} />
                  <span>Stats</span>
                </button>
              </div>

              {/* Viewport Control & Play Action Pill */}
              <div className="flex items-center gap-4 px-6 py-2.5 bg-[#2b2d31]/95 border border-[#3f4046] shadow-xl rounded-full">
                <button 
                  onClick={handleZoomIn}
                  className="p-1.5 hover:bg-[#1e1f22] text-[#9aa0a6] hover:text-white rounded-full transition-all" 
                  title="Zoom In"
                >
                  <ZoomIn size={16} />
                </button>
                <button 
                  onClick={handleZoomOut}
                  className="p-1.5 hover:bg-[#1e1f22] text-[#9aa0a6] hover:text-white rounded-full transition-all" 
                  title="Zoom Out"
                >
                  <ZoomOut size={16} />
                </button>
                
                <div className="w-[1px] h-4 bg-[#3f4046] mx-1"></div>

                <button 
                  onClick={handleResetView}
                  className="p-1.5 hover:bg-[#1e1f22] text-[#9aa0a6] hover:text-white rounded-full transition-all" 
                  title="Fit to Screen"
                >
                  <Maximize2 size={15} />
                </button>
                <button 
                  onClick={runForwardPass}
                  disabled={isPlayingAnimation}
                  className={`p-1.5 rounded-full transition-all ${
                    isPlayingAnimation 
                      ? 'bg-[#8ab4f8]/10 text-[#8ab4f8] cursor-not-allowed'
                      : 'hover:bg-[#8ab4f8]/10 text-[#8ab4f8] hover:text-[#a8c7fa]'
                  }`}
                  title="Run Forward Pass"
                >
                  <Play size={15} className={isPlayingAnimation ? 'animate-pulse' : ''} />
                </button>
              </div>
              
            </div>

            {/* Float floating Quick-Add Button overlays at bottom right */}
            <button
              onClick={handleFloatingAdd}
              className="absolute bottom-6 right-6 w-12 h-12 rounded-full bg-[#8ab4f8] hover:bg-[#a8c7fa] text-[#1e1f22] flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all z-30 border-none cursor-pointer"
              title="Quick Add Conv2D"
            >
              <Plus size={22} />
            </button>
          </div>

          {/* Bottom Console Monitor Panel */}
          <ErrorBoundary name="IDE Console Panel">
            <ValidationPanel />
          </ErrorBoundary>
        </div>

        {/* Right side Panel: Hyperparameters Config Inspector */}
        <ErrorBoundary name="Inspector Config Panel">
          <ConfigPanel />
        </ErrorBoundary>

        {/* Validation & Compilation Sandbox Sidebar */}
        <ErrorBoundary name="Diagnostics Sidebar">
          <ValidationSidebar />
        </ErrorBoundary>

        {/* Floating Code Preview Modal */}
        <CodePreviewModal
          isOpen={isCodeModalOpen}
          onClose={() => setIsCodeModalOpen(false)}
          nodes={nodes}
          edges={edges}
        />

        {/* Global Command Palette dialog */}
        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          onGenerateCode={() => setIsCodeModalOpen(true)}
        />

        {/* Jump-to-node search dialog */}
        <GraphSearch
          isOpen={isGraphSearchOpen}
          onClose={() => setIsGraphSearchOpen(false)}
        />

      </div>
    </MainLayout>
  );
}
