'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Search, Bell, Settings, ArrowLeft, Play, Cpu, Code } from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import { useCanvasStore } from '@/store/canvasStore';

interface HeaderProps {
  onGenerateCode?: () => void;
}

export default function Header({ onGenerateCode }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const activeProjectId = useProjectStore((state) => state.activeProjectId);
  const projects = useProjectStore((state) => state.projects);
  const isPlayingAnimation = useCanvasStore((state) => state.isPlayingAnimation);
  const runForwardPass = useCanvasStore((state) => state.runForwardPass);

  const isEditor = pathname.startsWith('/editor');
  const currentProject = projects.find(p => p.id === activeProjectId) || projects[0];

  const handleBackToDashboard = () => {
    router.push('/');
  };

  return (
    <header className="h-16 border-b border-white/5 bg-[#090a0f]/80 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-35 w-full">
      {/* Left side: Context details */}
      <div className="flex items-center gap-4">
        {isEditor ? (
          <>
            <button 
              onClick={handleBackToDashboard}
              className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-all"
              title="Back to Dashboard"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-500">Project:</span>
              <span className="text-sm font-bold text-white tracking-wide bg-purple-500/10 text-purple-400 px-3 py-1 rounded-full border border-purple-500/15">
                {currentProject?.name || 'ResNet-Mini'}
              </span>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <Cpu className="text-purple-500" size={22} />
            <span className="font-bold text-lg text-white">Model Workspace</span>
          </div>
        )}
      </div>

      {/* Center side: Context Search Bar */}
      <div className="flex-1 max-w-md mx-8">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input 
            type="text"
            placeholder={isEditor ? "Search layers or config..." : "Search projects..."}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/5 rounded-xl text-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:border-purple-500/35 focus:ring-1 focus:ring-purple-500/20 transition-all font-medium"
          />
        </div>
      </div>

      {/* Right side: Actions, Notification, Settings, Avatar */}
      <div className="flex items-center gap-4">
        {/* Forward Pass & Deploy/Code Buttons */}
        {isEditor ? (
          <>
            <button
              onClick={runForwardPass}
              disabled={isPlayingAnimation}
              className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-sm font-semibold transition-all ${
                isPlayingAnimation 
                  ? 'bg-purple-900/20 border-purple-500/20 text-purple-400 cursor-not-allowed'
                  : 'bg-white/5 border-white/5 hover:bg-white/10 text-gray-300 hover:text-white'
              }`}
            >
              <Play size={14} className={isPlayingAnimation ? 'animate-pulse text-purple-400' : ''} />
              <span>{isPlayingAnimation ? 'Running...' : 'Run Graph'}</span>
            </button>
            <button
              onClick={onGenerateCode}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-purple-600/15 border border-purple-500/20 transition-all duration-200"
            >
              <Code size={14} />
              <span>Generate PyTorch Code</span>
            </button>
          </>
        ) : (
          <button className="flex items-center gap-2 px-5 py-2 bg-purple-600/15 hover:bg-purple-600/25 border border-purple-500/35 text-purple-400 rounded-xl text-sm font-bold shadow-lg shadow-purple-600/5 transition-all">
            <span>Deploy Model</span>
          </button>
        )}

        <div className="w-[1px] h-6 bg-white/10 mx-1"></div>

        {/* Notifications & Settings */}
        <button className="p-2 hover:bg-white/5 text-gray-400 hover:text-white rounded-lg transition-all relative">
          <Bell size={18} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-purple-500 rounded-full"></span>
        </button>
        <button className="p-2 hover:bg-white/5 text-gray-400 hover:text-white rounded-lg transition-all">
          <Settings size={18} />
        </button>

        {/* User Profile Avatar */}
        <div className="relative group">
          <div className="w-8 h-8 rounded-full border border-purple-500/35 bg-purple-500/10 flex items-center justify-center cursor-pointer shadow-lg overflow-hidden">
            <span className="text-xs font-bold text-purple-400">AB</span>
          </div>
        </div>
      </div>
    </header>
  );
}
