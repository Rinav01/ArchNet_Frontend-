'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useCanvasStore } from '@/store/canvasStore';
import { useProjectStore } from '@/store/projectStore';
import { Search, Sparkles, Play, Code, Cpu, Shield, HelpCircle, ZoomIn, Undo, Redo, Layers, BarChart2, Activity } from 'lucide-react';

interface CommandOption {
  id: string;
  name: string;
  category: string;
  shortcut?: string;
  icon: React.ComponentType<any>;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerateCode: () => void;
}

export default function CommandPalette({ isOpen, onClose, onGenerateCode }: CommandPaletteProps) {
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const {
    runForwardPass,
    triggerAutoLayout,
    setZoom,
    setPan,
    addNode,
    undo,
    redo,
    toggleStatsOverlay,
    startTraining,
  } = useCanvasStore();

  const userRole = useProjectStore((state) => state.userRole);

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Focus action coordinates for spawning nodes near center
  const spawnX = 350;
  const spawnY = 220;

  const commands: CommandOption[] = [
    {
      id: 'run-forward',
      name: 'Run Forward Pass & Compile',
      category: 'Compiler',
      shortcut: 'F5',
      icon: Play,
      action: () => {
        runForwardPass();
      },
    },
    {
      id: 'generate-pytorch',
      name: 'Generate Framework Target Code',
      category: 'Compiler',
      shortcut: 'Ctrl + G',
      icon: Code,
      action: () => {
        onGenerateCode();
      },
    },
    {
      id: 'auto-layout',
      name: 'Auto Layout Visual DAG',
      category: 'Graph Actions',
      shortcut: 'Ctrl + L',
      icon: Sparkles,
      action: () => {
        if (userRole === 'Viewer') return;
        triggerAutoLayout();
      },
    },
    {
      id: 'fit-view',
      name: 'Fit Viewport / Zoom Reset',
      category: 'Canvas View',
      shortcut: 'Ctrl + 0',
      icon: ZoomIn,
      action: () => {
        setZoom(1);
        setPan({ x: 0, y: 0 });
      },
    },
    {
      id: 'toggle-stats',
      name: 'Toggle Layer Statistics Overlay',
      category: 'Canvas View',
      icon: BarChart2,
      action: () => {
        toggleStatsOverlay();
      },
    },
    {
      id: 'undo',
      name: 'Undo Last Action',
      category: 'History',
      shortcut: 'Ctrl + Z',
      icon: Undo,
      action: () => {
        if (userRole === 'Viewer') return;
        undo();
      },
    },
    {
      id: 'redo',
      name: 'Redo Action',
      category: 'History',
      shortcut: 'Ctrl + Y',
      icon: Redo,
      action: () => {
        if (userRole === 'Viewer') return;
        redo();
      },
    },
    // Node creation shortcuts
    {
      id: 'create-conv2d',
      name: 'Create Layer: Conv2D',
      category: 'Layers Addition',
      icon: Layers,
      action: () => {
        if (userRole === 'Viewer') return;
        addNode('Conv2D', spawnX, spawnY);
      },
    },
    {
      id: 'create-dense',
      name: 'Create Layer: Dense (Linear Projection)',
      category: 'Layers Addition',
      icon: Layers,
      action: () => {
        if (userRole === 'Viewer') return;
        addNode('Dense', spawnX, spawnY);
      },
    },
    {
      id: 'create-maxpool',
      name: 'Create Layer: MaxPool2D',
      category: 'Layers Addition',
      icon: Layers,
      action: () => {
        if (userRole === 'Viewer') return;
        addNode('MaxPool2D', spawnX, spawnY);
      },
    },
    {
      id: 'create-batchnorm',
      name: 'Create Layer: BatchNorm2D',
      category: 'Layers Addition',
      icon: Layers,
      action: () => {
        if (userRole === 'Viewer') return;
        addNode('BatchNorm2D', spawnX, spawnY);
      },
    },
    {
      id: 'create-dropout',
      name: 'Create Layer: Dropout',
      category: 'Layers Addition',
      icon: Layers,
      action: () => {
        if (userRole === 'Viewer') return;
        addNode('Dropout', spawnX, spawnY);
      },
    },
    {
      id: 'create-flatten',
      name: 'Create Layer: Flatten',
      category: 'Layers Addition',
      icon: Layers,
      action: () => {
        if (userRole === 'Viewer') return;
        addNode('Flatten', spawnX, spawnY);
      },
    },
    {
      id: 'create-input',
      name: 'Create Layer: Input (Starting Tensors)',
      category: 'Layers Addition',
      icon: Layers,
      action: () => {
        if (userRole === 'Viewer') return;
        addNode('Input', spawnX, spawnY);
      },
    },
    // Console tab switches
    {
      id: 'tab-training',
      name: 'Open console: Training & Telemetry Monitor',
      category: 'Bottom IDE Console',
      icon: Cpu,
      action: () => {
        window.dispatchEvent(new CustomEvent('set-console-tab', { detail: 'training' }));
      },
    },
    {
      id: 'tab-benchmark',
      name: 'Open console: Performance Benchmark Dashboard',
      category: 'Bottom IDE Console',
      icon: BarChart2,
      action: () => {
        window.dispatchEvent(new CustomEvent('set-console-tab', { detail: 'benchmark' }));
      },
    },
    {
      id: 'tab-timeline',
      name: 'Open console: Bottleneck Latency Timeline Profiler',
      category: 'Bottom IDE Console',
      icon: Cpu,
      action: () => {
        window.dispatchEvent(new CustomEvent('set-console-tab', { detail: 'timeline' }));
      },
    },
    {
      id: 'tab-infra',
      name: 'Open console: Infrastructure Observability Dashboard',
      category: 'Bottom IDE Console',
      icon: Activity,
      action: () => {
        window.dispatchEvent(new CustomEvent('set-console-tab', { detail: 'infra' }));
      },
    },
  ];

  // Filtering
  const filtered = commands.filter((cmd) =>
    cmd.name.toLowerCase().includes(search.toLowerCase()) ||
    cmd.category.toLowerCase().includes(search.toLowerCase())
  );

  // Keyboard navigation inside the palette
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
          filtered[activeIndex].action();
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

  // Adjust scroll lock coordinates dynamically
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

      {/* Main Glassmorphic Command Box */}
      <div className="relative w-full max-w-lg bg-[#1e1f22]/95 border border-[#3f4046] shadow-2xl rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200 flex flex-col max-h-[420px]">
        {/* Search header container */}
        <div className="flex items-center gap-3 px-4 border-b border-[#3f4046]/50 h-14 shrink-0">
          <Search size={16} className="text-[#9aa0a6]" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search action..."
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
              <span>No matching command actions found.</span>
            </div>
          ) : (
            filtered.map((cmd, idx) => {
              const Icon = cmd.icon;
              const isActive = idx === activeIndex;
              return (
                <button
                  key={cmd.id}
                  onClick={() => {
                    cmd.action();
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all border-none bg-transparent cursor-pointer ${
                    isActive 
                      ? 'bg-[#8ab4f8]/10 text-white border-l-2 border-[#8ab4f8]' 
                      : 'text-[#9aa0a6] hover:text-white hover:bg-[#2b2d31]/55'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon size={14} className={isActive ? 'text-[#8ab4f8]' : 'text-gray-500'} />
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">{cmd.name}</p>
                      <p className="text-[9px] uppercase tracking-wider text-gray-500 font-extrabold mt-0.5">{cmd.category}</p>
                    </div>
                  </div>
                  {cmd.shortcut && (
                    <kbd className={`px-1.5 py-0.5 rounded text-[8px] font-mono border shrink-0 ${
                      isActive 
                        ? 'bg-[#8ab4f8]/20 border-[#8ab4f8]/30 text-[#8ab4f8]' 
                        : 'bg-[#2b2d31]/50 border-[#3f4046] text-gray-500'
                    }`}>
                      {cmd.shortcut}
                    </kbd>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer info tag */}
        <div className="h-8 border-t border-[#3f4046]/40 bg-[#18191c]/50 px-4 flex items-center justify-between text-[9px] text-[#5f6368] font-semibold tracking-wide uppercase shrink-0 select-none">
          <span>Navigate with arrows</span>
          <span>Press enter to trigger</span>
        </div>
      </div>
    </div>
  );
}
