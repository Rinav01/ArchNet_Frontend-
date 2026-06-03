'use client';

import React, { useState } from 'react';
import { useCanvasStore } from '@/store/canvasStore';
import { useProjectStore } from '@/store/projectStore';
import { NodeType } from '@/types/canvas';
import { Layers, Move, Sparkles, Lock, ChevronLeft, ChevronRight, Trash2, Box, ChevronDown, ChevronUp } from 'lucide-react';

export default function LayerLibrary() {
  const [isOpen, setIsOpen] = useState(true);
  const [isCustomExpanded, setIsCustomExpanded] = useState(true);
  const addNode = useCanvasStore((state) => state.addNode);
  const userRole = useProjectStore((state) => state.userRole);

  const customBlocks = useCanvasStore((state) => state.customBlocks);
  const spawnCustomBlock = useCanvasStore((state) => state.spawnCustomBlock);
  const deleteCustomBlock = useCanvasStore((state) => state.deleteCustomBlock);
  const pan = useCanvasStore((state) => state.pan);
  const zoom = useCanvasStore((state) => state.zoom);

  const blockTypes: { type: NodeType; desc: string; color: string }[] = [
    { type: 'Input', desc: 'Starting tensor shape', color: 'bg-[#81c784]' },
    { type: 'Conv2D', desc: 'Spatial convolution layer', color: 'bg-[#8ab4f8]' },
    { type: 'BatchNorm2D', desc: 'Batch normalization layer', color: 'bg-[#f48fb1]' },
    { type: 'MaxPool2D', desc: 'Spatial downsampling grid', color: 'bg-[#80cbc4]' },
    { type: 'Dropout', desc: 'Regularize using activation drop', color: 'bg-[#ffab91]' },
    { type: 'Flatten', desc: 'Reshape spatial to vector', color: 'bg-[#c5a3ff]' },
    { type: 'Dense', desc: 'Fully connected projection', color: 'bg-[#ffe082]' },
  ];

  const handleBlockClick = (type: NodeType) => {
    if (userRole === 'Viewer') return;
    const x = 200 + Math.floor(Math.random() * 100);
    const y = 150 + Math.floor(Math.random() * 100);
    addNode(type, x, y);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="absolute top-1/2 left-0 -translate-y-1/2 bg-[#2b2d31] border-r border-y border-[#3f4046] hover:bg-[#313338] text-white p-2 rounded-r-2xl z-40 shadow-xl transition-all cursor-pointer"
        title="Open Layer Library"
      >
        <ChevronRight size={18} className="animate-pulse text-[#8ab4f8]" />
      </button>
    );
  }

  return (
    <div className="w-80 border-r border-[#3f4046] bg-[#1e1f22] flex flex-col h-full select-none z-15 relative transition-all duration-300">
      {/* Collapse Toggle Handle */}
      <button
        onClick={() => setIsOpen(false)}
        className="absolute top-1/2 -right-3.5 -translate-y-1/2 bg-[#1e1f22] border border-[#3f4046] hover:bg-[#2b2d31] text-[#9aa0a6] hover:text-white p-0.5 rounded-full z-30 shadow-md transition-all cursor-pointer"
      >
        <ChevronLeft size={14} />
      </button>
      {/* Glass lock overlay for Viewers */}
      {userRole === 'Viewer' && (
        <div className="absolute inset-0 bg-[#1e1f22]/80 backdrop-blur-[3px] z-50 flex flex-col items-center justify-center p-6 text-center select-none animate-in fade-in duration-200">
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-full mb-3 text-red-400 shadow-lg shadow-black/10">
            <Lock size={24} className="animate-pulse" />
          </div>
          <h4 className="text-sm font-bold text-white tracking-wide">Editing Restricted</h4>
          <p className="text-[11px] text-[#9aa0a6] mt-2 max-w-[200px] leading-relaxed font-semibold">
            Read-only Viewer Mode is active. Library actions are locked.
          </p>
        </div>
      )}
      
      {/* Title block */}
      <div className="p-6 border-b border-[#3f4046]">
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#9aa0a6] block">ML Blocks</span>
        <h3 className="text-xl font-black text-white mt-1 flex items-center gap-2">
          <Layers size={18} className="text-[#8ab4f8]" />
          <span>Layer Library</span>
        </h3>
        <p className="text-xs text-[#9aa0a6] mt-2 font-semibold">Click any visual blocks to add them to your model topology.</p>
      </div>

      {/* Layer Options List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {/* Standard Blocks Group */}
        <div className="space-y-2.5">
          <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#9aa0a6] block mb-1">Standard Layers</span>
          {blockTypes.map((block) => (
            <div
              key={block.type}
              onClick={() => handleBlockClick(block.type)}
              className="group px-4 py-3 bg-[#2b2d31] border border-[#3f4046] hover:border-[#8ab4f8]/30 rounded-2xl cursor-pointer transition-all duration-200 flex items-center justify-between shadow-md hover:shadow-lg hover:-translate-y-[1px]"
            >
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${block.color}`}></div>
                <div>
                  <span className="text-sm font-bold text-[#e3e3e3] tracking-wide block group-hover:text-[#8ab4f8] transition-colors">
                    {block.type}
                  </span>
                  <span className="text-[10px] text-[#9aa0a6] font-semibold">
                    {block.desc}
                  </span>
                </div>
              </div>

              <div className="p-1.5 bg-white/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity text-[#8ab4f8]">
                <Sparkles size={12} />
              </div>
            </div>
          ))}
        </div>

        {/* Separator rule */}
        <div className="border-t border-[#3f4046]/50 my-4" />

        {/* Custom Reusable Blocks Group */}
        <div className="space-y-2.5">
          <button
            onClick={() => setIsCustomExpanded(!isCustomExpanded)}
            className="w-full flex items-center justify-between text-[9px] font-extrabold uppercase tracking-widest text-[#9aa0a6] mb-1 cursor-pointer bg-transparent border-none p-0 outline-none hover:text-white transition-colors"
          >
            <span>Custom Blocks ({customBlocks.length})</span>
            {isCustomExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>

          {isCustomExpanded && (
            <div className="space-y-2.5">
              {customBlocks.length === 0 ? (
                <div className="px-4 py-6 border border-dashed border-[#3f4046] rounded-2xl text-center text-xs text-[#9aa0a6] font-semibold bg-[#2b2d31]/10">
                  <Box size={24} className="mx-auto mb-2 text-[#5f6368] opacity-50" />
                  <p>No custom blocks saved yet.</p>
                  <p className="text-[10px] text-[#5f6368] mt-1">Select layers and click "Save Block" in the bottom dock.</p>
                </div>
              ) : (
                customBlocks.map((block) => (
                  <div
                    key={block.id}
                    onClick={() => {
                      if (userRole === 'Viewer') return;
                      // Calculate center coordinates of current viewport to spawn centered
                      const targetX = (window.innerWidth / 2 - pan.x) / zoom;
                      const targetY = (window.innerHeight / 2 - pan.y) / zoom;
                      spawnCustomBlock(block.id, targetX, targetY);
                    }}
                    className="group px-4 py-3 bg-[#2b2d31] border border-[#3f4046] hover:border-[#81c784]/30 rounded-2xl cursor-pointer transition-all duration-200 flex items-center justify-between shadow-md hover:shadow-lg hover:-translate-y-[1px]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 bg-[#81c784]/10 rounded-xl text-[#81c784]">
                        <Box size={14} />
                      </div>
                      <div className="min-w-0">
                        <span className="text-sm font-bold text-[#e3e3e3] tracking-wide block truncate group-hover:text-[#81c784] transition-colors">
                          {block.name}
                        </span>
                        <span className="text-[10px] text-[#9aa0a6] font-semibold">
                          {block.nodes.length} layers • {block.edges.length} connections
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Delete custom block "${block.name}"?`)) {
                          deleteCustomBlock(block.id);
                        }
                      }}
                      className="p-1.5 hover:bg-red-500/10 text-[#5f6368] hover:text-red-400 rounded-lg transition-all opacity-0 group-hover:opacity-100 cursor-pointer border-none bg-transparent"
                      title="Delete Custom Block"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-[#3f4046] bg-black/10">
        <div className="flex items-center gap-2 text-xs text-[#9aa0a6] font-semibold">
          <Move size={14} className="text-[#5f6368]" />
          <span>Drag nodes on canvas to reposition.</span>
        </div>
      </div>

    </div>
  );
}
