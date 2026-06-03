'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useCanvasStore } from '@/store/canvasStore';
import { Search, Hash, HelpCircle, CornerDownLeft } from 'lucide-react';
import { toast } from '@/store/notificationStore';

interface GraphSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GraphSearch({ isOpen, onClose }: GraphSearchProps) {
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const {
    nodes,
    zoom,
    setPan,
    setHighlightedNodeId,
    setSelectedNodeIds,
  } = useCanvasStore();

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Filter nodes matching label, type, or custom config
  const filtered = nodes.filter((node) => {
    const query = search.toLowerCase();
    const typeMatch = node.type.toLowerCase().includes(query);
    const labelMatch = (node.name || '').toLowerCase().includes(query);
    const idMatch = node.id.toLowerCase().includes(query);
    return typeMatch || labelMatch || idMatch;
  });

  // Center node in the viewport
  const handleJumpToNode = (node: any) => {
    // Stage center points
    const stageWidth = window.innerWidth;
    const stageHeight = window.innerHeight;

    // Node bounds dimensions (standard NODE_WIDTH: 220, NODE_HEIGHT: 80)
    const nodeCenterX = node.x + 110;
    const nodeCenterY = node.y + 40;

    // Center panning formula
    const targetX = (stageWidth / 2) - nodeCenterX * zoom;
    const targetY = (stageHeight / 2) - nodeCenterY * zoom;

    // Set pan and select the node
    setPan({ x: targetX, y: targetY });
    setSelectedNodeIds([node.id]);

    // Trigger visual pulsing highlight for 1.5 seconds
    setHighlightedNodeId(node.id);
    toast.info('Viewport Centered', `Jumped to layer: ${node.name || node.type}`);

    setTimeout(() => {
      // Clear highlight if it hasn't changed
      if (useCanvasStore.getState().highlightedNodeId === node.id) {
        setHighlightedNodeId(null);
      }
    }, 1500);
  };

  // Keyboard controls
  useEffect(() => {
    if (!isOpen) return;

    const handleKeys = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[activeIndex]) {
          handleJumpToNode(filtered[activeIndex]);
          onClose();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, [isOpen, filtered, activeIndex, onClose]);

  // Adjust scroll position dynamically
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const activeEl = list.children[activeIndex] as HTMLElement;
    if (!activeEl) return;

    const listHeight = list.clientHeight;
    const activeTop = activeEl.offsetTop;
    const activeHeight = activeEl.clientHeight;

    if (activeTop + activeHeight > list.scrollTop + listHeight) {
      list.scrollTop = activeTop + activeHeight - listHeight;
    } else if (activeTop < list.scrollTop) {
      list.scrollTop = activeTop;
    }
  }, [activeIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 select-none px-4">
      {/* Absolute Backdrop Glass Cover */}
      <div 
        className="fixed inset-0 bg-[#090a0f]/60 backdrop-blur-md transition-opacity" 
        onClick={onClose}
      />

      {/* Main Glassmorphic Search Box */}
      <div className="relative w-full max-w-lg bg-[#1e1f22]/95 border border-[#3f4046] shadow-2xl rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200 flex flex-col max-h-[380px]">
        {/* Search header container */}
        <div className="flex items-center gap-3 px-4 border-b border-[#3f4046]/50 h-14 shrink-0">
          <Search size={16} className="text-[#9aa0a6]" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search layers by type, name, or shape..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setActiveIndex(0);
            }}
            className="flex-1 bg-transparent border-none outline-none text-sm text-[#e3e3e3] placeholder-[#9aa0a6] h-full"
          />
          <kbd className="px-2 py-0.5 bg-[#2b2d31] border border-[#3f4046] rounded text-[10px] font-sans text-gray-500 font-bold shrink-0 shadow-sm">ESC</kbd>
        </div>

        {/* Option items list scroll viewport */}
        <div 
          ref={listRef}
          className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-0.5"
        >
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-xs text-[#9aa0a6]">
              <HelpCircle size={20} className="mx-auto mb-2 text-[#5f6368] opacity-50" />
              <span>No nodes found matching search query.</span>
            </div>
          ) : (
            filtered.map((node, idx) => {
              const isActive = idx === activeIndex;
              const inputShapeStr = node.inputShape && node.inputShape.length > 0 ? `[${node.inputShape.join(', ')}]` : '';
              const outputShapeStr = node.outputShape && node.outputShape.length > 0 ? `[${node.outputShape.join(', ')}]` : '';
              
              return (
                <button
                  key={node.id}
                  onClick={() => {
                    handleJumpToNode(node);
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all border-none bg-transparent cursor-pointer ${
                    isActive 
                      ? 'bg-[#8ab4f8]/10 text-white border-l-2 border-[#8ab4f8]' 
                      : 'text-[#9aa0a6] hover:text-white hover:bg-[#2b2d31]/55'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Hash size={14} className={isActive ? 'text-[#8ab4f8]' : 'text-gray-500'} />
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate text-[#e3e3e3]">{node.name || node.type}</p>
                      <p className="text-[9px] uppercase tracking-wider text-gray-500 font-extrabold mt-0.5">
                        {node.type} {inputShapeStr ? `• In: ${inputShapeStr}` : ''} {outputShapeStr ? `• Out: ${outputShapeStr}` : ''}
                      </p>
                    </div>
                  </div>
                  {isActive && (
                    <span className="flex items-center gap-1 text-[9px] text-[#8ab4f8] font-bold shrink-0 uppercase tracking-widest bg-[#8ab4f8]/10 px-2 py-0.5 rounded-md border border-[#8ab4f8]/20 animate-pulse">
                      <span>Jump</span>
                      <CornerDownLeft size={10} />
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer info tag */}
        <div className="h-8 border-t border-[#3f4046]/40 bg-[#18191c]/50 px-4 flex items-center justify-between text-[9px] text-[#5f6368] font-semibold tracking-wide uppercase shrink-0 select-none">
          <span>{filtered.length} nodes found</span>
          <span>Press enter to jump</span>
        </div>
      </div>
    </div>
  );
}
