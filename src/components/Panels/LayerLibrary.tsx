'use client';

import React from 'react';
import { useCanvasStore } from '@/store/canvasStore';
import { NodeType } from '@/types/canvas';
import { Layers, Move, Sparkles } from 'lucide-react';

export default function LayerLibrary() {
  const addNode = useCanvasStore((state) => state.addNode);

  const blockTypes: { type: NodeType; desc: string; color: string }[] = [
    { type: 'Input', desc: 'Starting tensor shape', color: 'bg-emerald-500 shadow-emerald-500/30' },
    { type: 'Conv2D', desc: 'Spatial convolution layer', color: 'bg-purple-500 shadow-purple-500/30' },
    { type: 'MaxPool2D', desc: 'Spatial downsampling grid', color: 'bg-blue-500 shadow-blue-500/30' },
    { type: 'Flatten', desc: 'Reshape spatial to vector', color: 'bg-pink-500 shadow-pink-500/30' },
    { type: 'Dense', desc: 'Fully connected projection', color: 'bg-amber-500 shadow-amber-500/30' },
  ];

  const handleBlockClick = (type: NodeType) => {
    // Add node at random centered coordinates in Konva viewport
    const x = 200 + Math.floor(Math.random() * 100);
    const y = 150 + Math.floor(Math.random() * 100);
    addNode(type, x, y);
  };

  return (
    <div className="w-80 border-r border-white/5 bg-[#090a0f] flex flex-col h-full select-none z-15 relative">
      
      {/* Title block */}
      <div className="p-6 border-b border-white/5">
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-500 block">ML Blocks</span>
        <h3 className="text-xl font-black text-white mt-1 flex items-center gap-2">
          <Layers size={18} className="text-purple-400" />
          <span>Layer Library</span>
        </h3>
        <p className="text-xs text-gray-500 mt-2 font-medium">Click any visual blocks to add them to your model topology.</p>
      </div>

      {/* Layer Options List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {blockTypes.map((block) => (
          <div
            key={block.type}
            onClick={() => handleBlockClick(block.type)}
            className="group px-4 py-3 bg-[#11121d] border border-white/5 hover:border-purple-500/25 rounded-2xl cursor-pointer transition-all duration-200 flex items-center justify-between shadow-lg shadow-black/10 hover:shadow-purple-500/5 hover:-translate-y-[1px]"
          >
            <div className="flex items-center gap-3">
              {/* Left Color Dot */}
              <div className={`w-3 h-3 rounded-full ${block.color} shadow-lg shadow-offset`}></div>
              
              <div>
                <span className="text-sm font-bold text-gray-200 tracking-wide block group-hover:text-white transition-colors">
                  {block.type}
                </span>
                <span className="text-[10px] text-gray-500 font-medium">
                  {block.desc}
                </span>
              </div>
            </div>

            {/* Quick action button */}
            <div className="p-1.5 bg-white/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity text-purple-400">
              <Sparkles size={12} />
            </div>
          </div>
        ))}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-white/5 bg-black/10">
        <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
          <Move size={14} className="text-gray-600" />
          <span>Drag nodes on canvas to reposition.</span>
        </div>
      </div>

    </div>
  );
}
