'use client';

import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLayoutStore } from '@/store/layoutStore';
import { useProjectStore } from '@/store/projectStore';
import { Minimize2, Maximize2, X, Move, Box } from 'lucide-react';

interface DockablePanelProps {
  id: string;
  children: React.ReactNode;
}

export default function DockablePanel({ id, children }: DockablePanelProps) {
  const panel = useLayoutStore((state) => state.panels[id]);
  const undockPanel = useLayoutStore((state) => state.undockPanel);
  const dockPanel = useLayoutStore((state) => state.dockPanel);
  const updateFloatingPosition = useLayoutStore((state) => state.updateFloatingPosition);
  const updatePanelSize = useLayoutStore((state) => state.updatePanelSize);
  const bringToFront = useLayoutStore((state) => state.bringToFront);
  const setDockPreview = useLayoutStore((state) => state.setDockPreview);
  const togglePanel = useLayoutStore((state) => state.togglePanel);
  
  const userRole = useProjectStore((state) => state.userRole);

  const containerRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  if (!panel || !panel.isOpen) return null;

  // Header Title Bar Pointer Drag undocking / moving
  const handleHeaderPointerDown = (e: React.PointerEvent) => {
    // Prevent dragging if clicking control buttons
    if ((e.target as HTMLElement).closest('.panel-control-btn')) return;
    
    // Disable interaction if read-only user tries to do structural moves (allow it, it is just layout UX, but let's check roles if needed. Layout editing is generally allowed for all roles as it doesn't affect the model DB graph)
    
    e.preventDefault();
    bringToFront(id);
    setIsDragging(true);

    const startX = e.clientX;
    const startY = e.clientY;
    const isOriginallyFloating = panel.isFloating;
    const originalDock = panel.dockPosition;
    
    const startPanelX = panel.x;
    const startPanelY = panel.y;
    const startWidth = panel.width;
    const startHeight = panel.height;
    
    let hasDetached = false;
    let currentX = startPanelX;
    let currentY = startPanelY;

    const handlePointerMove = (moveEvt: PointerEvent) => {
      const dx = moveEvt.clientX - startX;
      const dy = moveEvt.clientY - startY;

      // 1. Undock threshold trigger
      if (!isOriginallyFloating && !hasDetached) {
        if (Math.abs(dx) > 15 || Math.abs(dy) > 15) {
          hasDetached = true;
          // Float panel and center title bar under user's cursor
          const floatX = moveEvt.clientX - startWidth / 2;
          const floatY = moveEvt.clientY - 18;
          undockPanel(id, floatX, floatY);
          return;
        }
      }

      // 2. Drag floating panel
      if (isOriginallyFloating || hasDetached) {
        // If hasDetached is true, panel coordinates are updated. Let's recalculate or update delta relative to spawn
        const nextX = hasDetached ? moveEvt.clientX - startWidth / 2 : startPanelX + dx;
        const nextY = hasDetached ? moveEvt.clientY - 18 : startPanelY + dy;
        
        currentX = Math.max(0, Math.min(window.innerWidth - 100, nextX));
        currentY = Math.max(0, Math.min(window.innerHeight - 50, nextY));

        updateFloatingPosition(id, currentX, currentY);

        // 3. Detect edge proximity for visual Dock Preview Overlay
        if (moveEvt.clientX < 100) {
          setDockPreview('left');
        } else if (moveEvt.clientX > window.innerWidth - 100) {
          setDockPreview('right');
        } else if (moveEvt.clientY > window.innerHeight - 100) {
          setDockPreview('bottom');
        } else {
          setDockPreview(null);
        }
      }
    };

    const handlePointerUp = (upEvt: PointerEvent) => {
      setIsDragging(false);
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);

      // 4. Handle docking drop
      if (isOriginallyFloating || hasDetached) {
        if (upEvt.clientX < 100) {
          dockPanel(id, 'left');
        } else if (upEvt.clientX > window.innerWidth - 100) {
          dockPanel(id, 'right');
        } else if (upEvt.clientY > window.innerHeight - 100) {
          dockPanel(id, 'bottom');
        }
        setDockPreview(null);
      }
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  };

  // Border & Corner Resize triggers
  const handleResizePointerDown = (e: React.PointerEvent, direction: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = panel.width;
    const startHeight = panel.height;
    const startPanelX = panel.x;
    const startPanelY = panel.y;

    const handlePointerMove = (moveEvt: PointerEvent) => {
      const dx = moveEvt.clientX - startX;
      const dy = moveEvt.clientY - startY;

      let newWidth = startWidth;
      let newHeight = startHeight;
      let newX = startPanelX;
      let newY = startPanelY;

      // Horizontal resize
      if (direction.includes('e')) {
        newWidth = Math.max(240, startWidth + dx);
      } else if (direction.includes('w')) {
        const potentialWidth = startWidth - dx;
        if (potentialWidth >= 240) {
          newWidth = potentialWidth;
          newX = startPanelX + dx;
        }
      }

      // Vertical resize
      if (direction.includes('s')) {
        newHeight = Math.max(160, startHeight + dy);
      } else if (direction.includes('n')) {
        const potentialHeight = startHeight - dy;
        if (potentialHeight >= 160) {
          newHeight = potentialHeight;
          newY = startPanelY + dy;
        }
      }

      updatePanelSize(id, newWidth, newHeight);
      if (panel.isFloating && (direction.includes('w') || direction.includes('n'))) {
        updateFloatingPosition(id, newX, newY);
      }
    };

    const handlePointerUp = () => {
      setIsResizing(false);
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  };

  // Render resizers depending on states (floating vs docked edges)
  const renderResizers = () => {
    if (panel.isFloating) {
      // Return 8 direction resizers for floating cards
      const directions = ['n', 's', 'e', 'w', 'nw', 'ne', 'sw', 'se'];
      return directions.map((dir) => {
        let style = '';
        if (dir === 'n') style = 'top-0 left-2 right-2 h-1.5 cursor-ns-resize';
        else if (dir === 's') style = 'bottom-0 left-2 right-2 h-1.5 cursor-ns-resize';
        else if (dir === 'e') style = 'right-0 top-2 bottom-2 w-1.5 cursor-ew-resize';
        else if (dir === 'w') style = 'left-0 top-2 bottom-2 w-1.5 cursor-ew-resize';
        else if (dir === 'nw') style = 'top-0 left-0 w-2.5 h-2.5 cursor-nwse-resize z-50';
        else if (dir === 'ne') style = 'top-0 right-0 w-2.5 h-2.5 cursor-nesw-resize z-50';
        else if (dir === 'sw') style = 'bottom-0 left-0 w-2.5 h-2.5 cursor-nesw-resize z-50';
        else if (dir === 'se') style = 'bottom-0 right-0 w-2.5 h-2.5 cursor-nwse-resize z-50';

        return (
          <div
            key={dir}
            className={`absolute ${style} hover:bg-[#8ab4f8]/30 transition-colors select-none`}
            onPointerDown={(e) => handleResizePointerDown(e, dir)}
          />
        );
      });
    }

    // Docked edge resizers
    if (panel.dockPosition === 'left') {
      return (
        <div
          className="absolute top-0 right-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-[#8ab4f8]/30 transition-colors z-30"
          onPointerDown={(e) => handleResizePointerDown(e, 'e')}
        />
      );
    }
    if (panel.dockPosition === 'right') {
      return (
        <div
          className="absolute top-0 left-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-[#8ab4f8]/30 transition-colors z-30"
          onPointerDown={(e) => handleResizePointerDown(e, 'w')}
        />
      );
    }
    if (panel.dockPosition === 'bottom') {
      return (
        <div
          className="absolute top-0 left-0 right-0 h-1.5 cursor-ns-resize hover:bg-[#8ab4f8]/30 transition-colors z-30"
          onPointerDown={(e) => handleResizePointerDown(e, 'n')}
        />
      );
    }

    return null;
  };

  const style: React.CSSProperties = panel.isFloating
    ? {
        position: 'fixed',
        left: panel.x,
        top: panel.y,
        width: panel.width,
        height: panel.height,
        zIndex: panel.zIndex,
      }
    : {
        width: panel.dockPosition !== 'bottom' ? panel.width : '100%',
        height: panel.dockPosition === 'bottom' ? panel.height : '100%',
      };

  return (
    <motion.div
      id={id}
      ref={containerRef}
      style={style}
      onClick={() => panel.isFloating && bringToFront(id)}
      initial={panel.isFloating ? { scale: 0.95, opacity: 0 } : false}
      animate={panel.isFloating ? { scale: 1, opacity: 1 } : false}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={`flex flex-col bg-[#1e1f22]/95 border border-[#3f4046] shadow-xl overflow-hidden select-none relative ${
        panel.isFloating 
          ? 'rounded-2xl border-t border-t-[#8ab4f8]/40 shadow-2xl backdrop-blur-md' 
          : 'h-full border-none'
      } ${isDragging ? 'opacity-85 scale-[0.99] border-dashed border-[#8ab4f8]' : ''}`}
    >
      {/* 1. Header Drag Bar Title */}
      <div
        onPointerDown={handleHeaderPointerDown}
        className={`h-9 px-3.5 bg-[#18191c]/95 border-b border-[#3f4046]/40 flex items-center justify-between cursor-grab active:cursor-grabbing text-xs font-sans font-bold select-none shrink-0 ${
          panel.isFloating ? 'bg-[#18191c]/80 text-[#8ab4f8]' : 'text-[#9aa0a6]'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Move size={12} className={panel.isFloating ? 'text-[#8ab4f8]' : 'text-gray-500'} />
          <span className="truncate text-[10.5px] uppercase tracking-wide">{panel.title}</span>
        </div>
        
        {/* Panel controls */}
        <div className="flex items-center gap-1 shrink-0">
          {panel.isFloating ? (
            <button
              onClick={() => dockPanel(id, id === 'console' ? 'bottom' : id === 'library' ? 'left' : 'right')}
              className="panel-control-btn p-1 hover:bg-[#2b2d31] rounded text-gray-500 hover:text-white transition-all hover:scale-115 active:scale-90 duration-200 cursor-pointer border-none bg-transparent"
              title="Dock Window"
            >
              <Minimize2 size={12} />
            </button>
          ) : (
            <button
              onClick={() => undockPanel(id, 200 + Math.random() * 200, 150 + Math.random() * 150)}
              className="panel-control-btn p-1 hover:bg-[#2b2d31] rounded text-gray-500 hover:text-white transition-all hover:scale-115 active:scale-90 duration-200 cursor-pointer border-none bg-transparent"
              title="Float Window"
            >
              <Maximize2 size={12} />
            </button>
          )}
          <button
            onClick={() => togglePanel(id)}
            className="panel-control-btn p-1 hover:bg-red-500/10 rounded text-gray-500 hover:text-red-400 transition-all hover:scale-115 active:scale-90 duration-200 cursor-pointer border-none bg-transparent"
            title="Close Panel"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* 2. Panel Inner Children */}
      <div className="flex-1 overflow-hidden relative min-h-0 min-w-0 flex flex-col bg-[#1e1f22]">
        {children}
      </div>

      {/* 3. Dynamic Resize Handles */}
      {renderResizers()}
    </motion.div>
  );
}
