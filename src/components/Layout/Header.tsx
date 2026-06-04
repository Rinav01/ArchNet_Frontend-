'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Search, Bell, Settings, ArrowLeft, Play, Cpu, Code, Undo, Redo, Zap, Clock, Save, Check, RotateCw, AlertTriangle, Trash2, LogOut, Layers, Sliders, Terminal, Activity, LayoutGrid, ChevronDown, GitCompare } from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import BlockGuideModal from '@/components/Modals/BlockGuideModal';
import { useCanvasStore } from '@/store/canvasStore';
import { useLayoutStore } from '@/store/layoutStore';

interface HeaderProps {
  onGenerateCode?: () => void;
  onCompareVersions?: () => void;
}

export default function Header({ onGenerateCode, onCompareVersions }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const activeProjectId = useProjectStore((state) => state.activeProjectId);
  const projects = useProjectStore((state) => state.projects);
  const userRole = useProjectStore((state) => state.userRole);
  const setUserRole = useProjectStore((state) => state.setUserRole);
  const isPlayingAnimation = useCanvasStore((state) => state.isPlayingAnimation);
  const runForwardPass = useCanvasStore((state) => state.runForwardPass);
  const undo = useCanvasStore((state) => state.undo);
  const redo = useCanvasStore((state) => state.redo);
  const undoStack = useCanvasStore((state) => state.undoStack);
  const redoStack = useCanvasStore((state) => state.redoStack);
  
  const syncStatus = useCanvasStore((state) => state.syncStatus);
  const collaborators = useCanvasStore((state) => state.collaborators);

  const panels = useLayoutStore((state) => state.panels);
  const togglePanel = useLayoutStore((state) => state.togglePanel);
  const resetLayout = useLayoutStore((state) => state.resetLayout);
  const activePreset = useLayoutStore((state) => state.activePreset);
  const applyPreset = useLayoutStore((state) => state.applyPreset);

  // Model Versioning & Auto-saving State Selections
  const draftSavedStatus = useCanvasStore((state) => state.draftSavedStatus);
  const checkpoints = useCanvasStore((state) => state.checkpoints);
  const saveCheckpoint = useCanvasStore((state) => state.saveCheckpoint);
  const restoreCheckpoint = useCanvasStore((state) => state.restoreCheckpoint);
  const deleteCheckpoint = useCanvasStore((state) => state.deleteCheckpoint);

  const [isHistoryOpen, setIsHistoryOpen] = React.useState(false);
  const [isBlockGuideOpen, setIsBlockGuideOpen] = React.useState(false);
  const [username, setUsername] = React.useState('SandboxArchitect');
  const [isProfileOpen, setIsProfileOpen] = React.useState(false);
  const [isPanelsDropdownOpen, setIsPanelsDropdownOpen] = React.useState(false);
  const [isPresetsDropdownOpen, setIsPresetsDropdownOpen] = React.useState(false);
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = React.useState(false);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('mlbuilder_username');
      if (stored) {
        setUsername(stored);
      }
    }
  }, []);

  // Close all dropdowns when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => {
      // This is handled per-dropdown with their own overlays
    };
    return () => {};
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('mlbuilder_token');
    localStorage.removeItem('mlbuilder_username');
    router.push('/login');
  };

  const initials = username
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const isEditor = pathname.startsWith('/editor');
  const currentProject = projects.find(p => p.id === activeProjectId);

  const handleBackToDashboard = () => {
    router.push('/');
  };

  // Close all open dropdowns
  const closeAllDropdowns = () => {
    setIsHistoryOpen(false);
    setIsPanelsDropdownOpen(false);
    setIsPresetsDropdownOpen(false);
    setIsProfileOpen(false);
    setIsWorkspaceMenuOpen(false);
  };

  // Helper to toggle a single dropdown while closing all others (prevents state update races)
  const toggleDropdown = (dropdown: 'history' | 'panels' | 'presets' | 'profile') => {
    setIsHistoryOpen(dropdown === 'history' ? !isHistoryOpen : false);
    setIsPanelsDropdownOpen(dropdown === 'panels' ? !isPanelsDropdownOpen : false);
    setIsPresetsDropdownOpen(dropdown === 'presets' ? !isPresetsDropdownOpen : false);
    setIsProfileOpen(dropdown === 'profile' ? !isProfileOpen : false);
  };

  // ─── Sync Status Badge (compact) ───
  const SyncBadge = () => {
    if (syncStatus === 'connected') {
      return (
        <div className="flex items-center gap-1 bg-[#81c784]/10 border border-[#81c784]/20 px-1.5 py-0.5 rounded-full text-[10px] font-bold text-[#81c784] select-none" title="Room Synced">
          <span className="w-1.5 h-1.5 rounded-full bg-[#81c784] animate-pulse shrink-0"></span>
          <span className="hidden 2xl:inline">Synced</span>
        </div>
      );
    }
    if (syncStatus === 'connecting') {
      return (
        <div className="flex items-center gap-1 bg-[#ffe082]/10 border border-[#ffe082]/20 px-1.5 py-0.5 rounded-full text-[10px] font-bold text-[#ffe082] select-none" title="Syncing...">
          <span className="w-1.5 h-1.5 rounded-full bg-[#ffe082] animate-pulse shrink-0"></span>
          <span className="hidden 2xl:inline">Syncing</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1 bg-[#f28b82]/10 border border-[#f28b82]/20 px-1.5 py-0.5 rounded-full text-[10px] font-bold text-[#f28b82] select-none" title="Local Sandbox">
        <span className="w-1.5 h-1.5 rounded-full bg-[#f28b82] shrink-0"></span>
        <span className="hidden 2xl:inline">Local</span>
      </div>
    );
  };

  // ─── Draft Status Badge (compact) ───
  const DraftBadge = () => {
    if (draftSavedStatus === 'saving') {
      return (
        <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full text-[10px] font-bold text-amber-500 select-none" title="Saving draft...">
          <RotateCw size={9} className="animate-spin shrink-0" />
        </div>
      );
    }
    if (draftSavedStatus === 'saved') {
      return (
        <div className="flex items-center gap-1 bg-[#81c784]/15 border border-[#81c784]/30 px-1.5 py-0.5 rounded-full text-[10px] font-bold text-[#81c784] select-none" title="Saved">
          <Check size={9} className="shrink-0" />
        </div>
      );
    }
    if (draftSavedStatus === 'error') {
      return (
        <div className="flex items-center gap-1 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded-full text-[10px] font-bold text-red-400 select-none" title="Save failed">
          <AlertTriangle size={9} className="shrink-0" />
        </div>
      );
    }
    return null;
  };

  // ─────────────────────────────────────────
  // NON-EDITOR HEADER (Dashboard view)
  // ─────────────────────────────────────────
  if (!isEditor) {
    return (
      <header className="h-14 border-b border-[#3f4046] bg-[#1e1f22] flex items-center justify-between px-4 xl:px-6 sticky top-0 z-30 w-full select-none">
        <div className="flex items-center gap-3">
          <Cpu className="text-[#8ab4f8]" size={22} />
          <span className="font-bold text-lg text-white">Model Workspace</span>
        </div>

        <div className="flex-1 max-w-md mx-8">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa0a6]" />
            <input 
              type="text"
              placeholder="Search projects..."
              className="w-full pl-10 pr-4 py-2 bg-[#2b2d31] border border-[#3f4046] rounded-xl text-sm text-[#e3e3e3] placeholder-[#9aa0a6] focus:outline-none focus:border-[#8ab4f8] focus:ring-1 focus:ring-[#8ab4f8]/20 transition-all font-medium"
            />
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button className="p-2 hover:bg-[#2b2d31] text-[#9aa0a6] hover:text-white rounded-lg transition-all relative">
            <Bell size={18} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-[#8ab4f8] rounded-full"></span>
          </button>
          <button className="p-2 hover:bg-[#2b2d31] text-[#9aa0a6] hover:text-white rounded-lg transition-all">
            <Settings size={18} />
          </button>
          <div className="relative">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="w-8 h-8 rounded-full border border-[#8ab4f8]/30 bg-[#8ab4f8]/10 flex items-center justify-center cursor-pointer shadow-md overflow-hidden hover:ring-2 hover:ring-[#8ab4f8]/40 transition-all focus:outline-none"
            >
              <span className="text-xs font-bold text-[#8ab4f8]">{initials}</span>
            </button>
            {isProfileOpen && (
              <>
                <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsProfileOpen(false)} />
                <div className="absolute right-0 mt-2 w-56 bg-[#1e1f26] border border-[#3f4046]/50 shadow-2xl rounded-2xl p-2 z-50 text-left backdrop-blur-xl animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="px-3 py-2 border-b border-[#3f4046]/45 mb-1.5">
                    <div className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-wider">Active User</div>
                    <div className="text-xs font-extrabold text-white truncate mt-0.5">{username}</div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-red-500/10 text-red-400 hover:text-red-300 rounded-xl text-xs font-bold transition-all border-none bg-transparent cursor-pointer text-left"
                  >
                    <LogOut size={14} className="shrink-0" />
                    <span>Log Out of Workspace</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>
    );
  }

  // ─────────────────────────────────────────
  // EDITOR HEADER — 3-zone layout
  // Zone 1 (left): Back + Project Info + Status (shrinkable, truncates)
  // Zone 2 (center): Workspace Tools (dropdowns, stays compact)
  // Zone 3 (right): Action buttons + User (fixed width)
  // ─────────────────────────────────────────
  return (
    <>
      <header className="h-14 border-b border-[#3f4046] bg-[#1e1f22] grid grid-cols-[auto_1fr_auto] items-center px-2 xl:px-4 sticky top-0 z-30 w-full select-none gap-1">
        
        {/* ═══════════════════════════════════════════ */}
        {/* ZONE 1: Left — Back + Project Identity     */}
        {/* ═══════════════════════════════════════════ */}
        <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
          {/* Back Button */}
          <button 
            onClick={handleBackToDashboard}
            className="p-1.5 hover:bg-[#2b2d31] rounded-lg text-[#9aa0a6] hover:text-white transition-all shrink-0"
            title="Back to Dashboard"
          >
            <ArrowLeft size={16} />
          </button>

          {/* Project Name */}
          <span className="text-xs font-bold text-[#8ab4f8] tracking-wide bg-[#8ab4f8]/10 px-2.5 py-0.5 rounded-full border border-[#8ab4f8]/20 truncate max-w-[120px] shrink-0">
            {currentProject?.name || 'ResNet-Mini'}
          </span>

          {/* Framework Tag */}
          {currentProject?.framework && (
            <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-md bg-[#8ab4f8]/10 text-[#8ab4f8] border border-[#8ab4f8]/25 shrink-0 hidden sm:inline-flex">
              {currentProject.framework}
            </span>
          )}

          {/* Status Dot */}
          {currentProject?.status && (
            <span className={`text-[9px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full border items-center gap-1 shrink-0 hidden lg:inline-flex ${
              currentProject.status === 'Production Ready' ? 'bg-[#81c784]/10 text-[#81c784] border-[#81c784]/25' :
              currentProject.status === 'Training' ? 'bg-[#ffe082]/10 text-[#ffe082] border-[#ffe082]/25 animate-pulse' :
              'bg-[#80cbc4]/10 text-[#80cbc4] border-[#80cbc4]/25'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                currentProject.status === 'Production Ready' ? 'bg-[#81c784]' :
                currentProject.status === 'Training' ? 'bg-[#ffe082]' :
                'bg-[#80cbc4]'
              }`}></span>
              <span className="hidden xl:inline">{currentProject.status}</span>
            </span>
          )}

          {/* Compact Status Indicators (Sync + Draft) */}
          <div className="hidden md:flex items-center gap-1 shrink-0">
            <SyncBadge />
            <DraftBadge />
          </div>
        </div>

        {/* ═══════════════════════════════════════════ */}
        {/* ZONE 2: Center — Workspace Toolstrip       */}
        {/* ═══════════════════════════════════════════ */}
        <div className="flex items-center justify-center gap-1 min-w-0">
          
          {/* Undo / Redo Group */}
          <div className="flex items-center bg-[#2b2d31]/50 border border-[#3f4046] px-1 py-0.5 rounded-full shrink-0">
            <button
              onClick={undo}
              disabled={undoStack.length === 0 || userRole === 'Viewer'}
              className={`p-1 rounded-full transition-all ${
                undoStack.length === 0 || userRole === 'Viewer'
                  ? 'text-[#5f6368] cursor-not-allowed opacity-50'
                  : 'text-[#9aa0a6] hover:text-white hover:bg-[#2b2d31] cursor-pointer'
              }`}
              title={userRole === 'Viewer' ? "Undo Restricted" : "Undo (Ctrl+Z)"}
            >
              <Undo size={13} />
            </button>
            <button
              onClick={redo}
              disabled={redoStack.length === 0 || userRole === 'Viewer'}
              className={`p-1 rounded-full transition-all ${
                redoStack.length === 0 || userRole === 'Viewer'
                  ? 'text-[#5f6368] cursor-not-allowed opacity-50'
                  : 'text-[#9aa0a6] hover:text-white hover:bg-[#2b2d31] cursor-pointer'
              }`}
              title={userRole === 'Viewer' ? "Redo Restricted" : "Redo (Ctrl+Y)"}
            >
              <Redo size={13} />
            </button>
          </div>

          {/* Separator */}
          <div className="w-px h-5 bg-[#3f4046]/60 shrink-0 hidden sm:block"></div>

          {/* Version History Button */}
          <div className="relative shrink-0">
            <button
              onClick={() => toggleDropdown('history')}
              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                isHistoryOpen 
                  ? 'bg-[#8ab4f8]/10 border-[#8ab4f8]/30 text-[#8ab4f8]' 
                  : 'bg-transparent border-transparent text-[#9aa0a6] hover:text-white hover:bg-[#2b2d31]'
              }`}
              title="Version History"
            >
              <Clock size={13} />
            </button>

            {/* Version History Dropdown */}
            {isHistoryOpen && (
              <>
                <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsHistoryOpen(false)} />
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-80 bg-[#1e1f22]/95 backdrop-blur-md border border-[#3f4046] shadow-2xl rounded-2xl p-4 z-50 text-[#e3e3e3] select-none animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between border-b border-[#3f4046] pb-2 mb-3 gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#9aa0a6] shrink-0">Snapshots</span>
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        onClick={() => {
                          closeAllDropdowns();
                          if (onCompareVersions) onCompareVersions();
                        }}
                        className="flex items-center gap-1 px-2 py-1 text-[10px] font-extrabold border border-[#3f4046] hover:bg-[#2b2d31] text-[#e3e3e3] rounded-lg transition-all cursor-pointer bg-transparent"
                        title="Compare Snapshot Versions"
                      >
                        <GitCompare size={10} />
                        <span>Compare</span>
                      </button>
                      <button
                        onClick={() => {
                          if (userRole === 'Viewer') return;
                          const name = window.prompt("Enter milestone checkpoint name:", `Milestone - ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`);
                          if (name && name.trim()) {
                            saveCheckpoint(name);
                          }
                        }}
                        disabled={userRole === 'Viewer'}
                        className={`flex items-center gap-1 px-2.5 py-1 text-[10px] font-extrabold shadow-sm transition-all rounded-lg ${
                          userRole === 'Viewer'
                            ? 'bg-[#8ab4f8]/20 text-[#9aa0a6] cursor-not-allowed'
                            : 'bg-[#8ab4f8] hover:bg-[#a8c7fa] text-[#1e1f22] cursor-pointer'
                        }`}
                      >
                        <Save size={10} />
                        <span>Snapshot</span>
                      </button>
                    </div>
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {checkpoints.length === 0 ? (
                      <div className="text-center py-6 text-xs text-[#9aa0a6]">
                        <Clock size={20} className="mx-auto mb-2 text-[#5f6368] opacity-60" />
                        <p className="font-semibold">No baseline snapshots yet</p>
                        <p className="text-[10px] mt-0.5 text-[#5f6368]">Save named milestones to go back to previous graph iterations.</p>
                      </div>
                    ) : (
                      checkpoints.map((cp) => (
                        <div 
                          key={cp.id} 
                          className="flex items-center justify-between bg-[#2b2d31]/50 border border-[#3f4046]/55 p-2.5 rounded-xl hover:bg-[#2b2d31]/80 hover:border-[#8ab4f8]/20 transition-all group"
                        >
                          <div className="flex-1 min-w-0 mr-2">
                            <p className="text-xs font-bold truncate text-[#e3e3e3] group-hover:text-[#8ab4f8] transition-colors">{cp.name}</p>
                            <p className="text-[9px] text-[#9aa0a6] mt-0.5 flex items-center gap-2">
                              <span>{cp.timestamp}</span>
                              <span className="w-1 h-1 rounded-full bg-[#5f6368]"></span>
                              <span>{cp.nodes.length} nodes</span>
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => {
                                if (userRole === 'Viewer') return;
                                if (window.confirm(`Restore this checkpoint: "${cp.name}"? Current canvas will be snapshot in the undo history.`)) {
                                  restoreCheckpoint(cp.id);
                                  setIsHistoryOpen(false);
                                }
                              }}
                              disabled={userRole === 'Viewer'}
                              className={`px-2 py-0.5 border text-[9px] font-bold transition-all rounded ${
                                userRole === 'Viewer'
                                  ? 'bg-[#81c784]/5 border-[#81c784]/10 text-[#81c784]/30 cursor-not-allowed'
                                  : 'bg-[#81c784]/15 hover:bg-[#81c784]/25 border-[#81c784]/20 text-[#81c784] cursor-pointer'
                              }`}
                            >
                              Restore
                            </button>
                            <button
                              onClick={() => {
                                if (userRole === 'Viewer') return;
                                deleteCheckpoint(cp.id);
                              }}
                              disabled={userRole === 'Viewer'}
                              className={`p-1 rounded transition-all ${
                                userRole === 'Viewer'
                                  ? 'text-[#5f6368] opacity-30 cursor-not-allowed'
                                  : 'hover:bg-red-500/10 text-[#9aa0a6] hover:text-red-400 cursor-pointer'
                              }`}
                              title="Delete checkpoint"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Separator */}
          <div className="w-px h-5 bg-[#3f4046]/60 shrink-0 hidden sm:block"></div>

          {/* Panels Dropdown */}
          <div className="relative shrink-0">
            <button
              onClick={() => toggleDropdown('panels')}
              className={`flex items-center gap-1 px-2 py-1 border transition-all cursor-pointer rounded-lg text-[11px] font-bold ${
                isPanelsDropdownOpen 
                  ? 'bg-[#8ab4f8]/10 border-[#8ab4f8]/30 text-[#8ab4f8]' 
                  : 'bg-transparent border-transparent text-[#9aa0a6] hover:text-white hover:bg-[#2b2d31]'
              }`}
              title="Toggle Workspace Panels"
            >
              <LayoutGrid size={12} />
              <span className="hidden lg:inline">Panels</span>
              <ChevronDown size={10} className={`transition-transform duration-200 ${isPanelsDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isPanelsDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40 bg-transparent cursor-default" onClick={() => setIsPanelsDropdownOpen(false)} />
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 bg-[#1e1f22]/95 backdrop-blur-md border border-[#3f4046] shadow-2xl rounded-2xl p-2 z-50 text-[#e3e3e3] select-none animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-2.5 py-1.5 border-b border-[#3f4046]/50 mb-1 flex items-center justify-between text-[10px] font-black text-[#9aa0a6] uppercase tracking-wider">
                    <span>Toggle Windows</span>
                  </div>

                  <div className="space-y-0.5">
                    {/* Layer Library */}
                    <button
                      onClick={() => togglePanel('library')}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-left transition-all border-none bg-transparent cursor-pointer ${
                        panels.library?.isOpen 
                          ? 'text-white bg-[#8ab4f8]/10' 
                          : 'text-[#9aa0a6] hover:text-white hover:bg-[#2b2d31]/50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Layers size={14} className={panels.library?.isOpen ? 'text-[#8ab4f8]' : 'text-[#9aa0a6]'} />
                        <span>Layer Library</span>
                      </div>
                      {panels.library?.isOpen && (
                        <Check size={14} className="text-[#8ab4f8]" />
                      )}
                    </button>

                    {/* Hyperparameter Inspector */}
                    <button
                      onClick={() => togglePanel('inspector')}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-left transition-all border-none bg-transparent cursor-pointer ${
                        panels.inspector?.isOpen 
                          ? 'text-white bg-[#8ab4f8]/10' 
                          : 'text-[#9aa0a6] hover:text-white hover:bg-[#2b2d31]/50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Sliders size={14} className={panels.inspector?.isOpen ? 'text-[#8ab4f8]' : 'text-[#9aa0a6]'} />
                        <span>Inspector Config</span>
                      </div>
                      {panels.inspector?.isOpen && (
                        <Check size={14} className="text-[#8ab4f8]" />
                      )}
                    </button>

                    {/* IDE Terminal Console */}
                    <button
                      onClick={() => togglePanel('console')}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-left transition-all border-none bg-transparent cursor-pointer ${
                        panels.console?.isOpen 
                          ? 'text-white bg-[#8ab4f8]/10' 
                          : 'text-[#9aa0a6] hover:text-white hover:bg-[#2b2d31]/50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Terminal size={14} className={panels.console?.isOpen ? 'text-[#8ab4f8]' : 'text-[#9aa0a6]'} />
                        <span>IDE Terminal Console</span>
                      </div>
                      {panels.console?.isOpen && (
                        <Check size={14} className="text-[#8ab4f8]" />
                      )}
                    </button>

                    {/* Diagnostics & AutoML */}
                    <button
                      onClick={() => togglePanel('diagnostics')}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-left transition-all border-none bg-transparent cursor-pointer ${
                        panels.diagnostics?.isOpen 
                          ? 'text-white bg-[#8ab4f8]/10' 
                          : 'text-[#9aa0a6] hover:text-white hover:bg-[#2b2d31]/50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Activity size={14} className={panels.diagnostics?.isOpen ? 'text-[#8ab4f8]' : 'text-[#9aa0a6]'} />
                        <span>Diagnostics & AutoML</span>
                      </div>
                      {panels.diagnostics?.isOpen && (
                        <Check size={14} className="text-[#8ab4f8]" />
                      )}
                    </button>
                  </div>

                  <div className="border-t border-[#3f4046]/45 mt-1.5 pt-1.5 px-1 pb-0.5">
                    <button
                      onClick={() => {
                        resetLayout();
                        setIsPanelsDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-1.5 hover:bg-[#2b2d31] text-xs font-bold text-gray-400 hover:text-white rounded-xl transition-all border-none bg-transparent cursor-pointer text-left"
                    >
                      <RotateCw size={13} className="shrink-0" />
                      <span>Reset Workspace Layout</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Presets Dropdown */}
          <div className="relative shrink-0">
            <button
              onClick={() => toggleDropdown('presets')}
              className={`flex items-center gap-1 px-2 py-1 border transition-all cursor-pointer rounded-lg text-[11px] font-bold ${
                isPresetsDropdownOpen 
                  ? 'bg-[#8ab4f8]/10 border-[#8ab4f8]/30 text-[#8ab4f8]' 
                  : 'bg-transparent border-transparent text-[#9aa0a6] hover:text-white hover:bg-[#2b2d31]'
              }`}
              title="Workspace Layout Presets"
            >
              <LayoutGrid size={12} className="text-[#8ab4f8]" />
              <span className="hidden lg:inline truncate max-w-[100px]">{activePreset}</span>
              <ChevronDown size={10} className={`transition-transform duration-200 ${isPresetsDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isPresetsDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40 bg-transparent cursor-default" onClick={() => setIsPresetsDropdownOpen(false)} />
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 bg-[#1e1f22]/95 backdrop-blur-md border border-[#3f4046] shadow-2xl rounded-2xl p-2 z-50 text-[#e3e3e3] select-none animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-2.5 py-1.5 border-b border-[#3f4046]/50 mb-1 flex items-center justify-between text-[10px] font-black text-[#9aa0a6] uppercase tracking-wider">
                    <span>Layout Modes</span>
                  </div>

                  <div className="space-y-0.5">
                    {[
                      'Architecture Mode',
                      'Canvas Focus',
                      'Training Mode',
                      'Metrics Focus',
                      'Benchmark Mode',
                      'Profiler Focus'
                    ].map((preset) => (
                      <button
                        key={preset}
                        onClick={() => {
                          applyPreset(preset);
                          // Auto-trigger appropriate heatmap visualizations and stats overlay for profiling/benchmarking/training modes
                          if (preset === 'Benchmark Mode') {
                            useCanvasStore.getState().setHeatmapMode('flops');
                            if (!useCanvasStore.getState().showStatsOverlay) {
                              useCanvasStore.getState().toggleStatsOverlay();
                            }
                          } else if (preset === 'Profiler Focus') {
                            useCanvasStore.getState().setHeatmapMode('latency');
                            if (!useCanvasStore.getState().showStatsOverlay) {
                              useCanvasStore.getState().toggleStatsOverlay();
                            }
                          } else if (preset === 'Training Mode' || preset === 'Metrics Focus') {
                            useCanvasStore.getState().setHeatmapMode('memory');
                            if (!useCanvasStore.getState().showStatsOverlay) {
                              useCanvasStore.getState().toggleStatsOverlay();
                            }
                          } else {
                            useCanvasStore.getState().setHeatmapMode('none');
                          }
                          setIsPresetsDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-left transition-all border-none bg-transparent cursor-pointer ${
                          activePreset === preset 
                            ? 'text-white bg-[#8ab4f8]/10' 
                            : 'text-[#9aa0a6] hover:text-white hover:bg-[#2b2d31]/50'
                        }`}
                      >
                        <span>{preset}</span>
                        {activePreset === preset && (
                          <Check size={14} className="text-[#8ab4f8]" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Separator */}
          <div className="w-px h-5 bg-[#3f4046]/60 shrink-0 hidden sm:block"></div>

          {/* Run Forward Pass */}
          <button
            onClick={runForwardPass}
            disabled={isPlayingAnimation || userRole === 'Viewer'}
            className={`flex items-center gap-1 px-2.5 py-1 border rounded-lg text-[11px] font-bold transition-all shrink-0 ${
              isPlayingAnimation || userRole === 'Viewer'
                ? 'bg-transparent border-[#3f4046]/40 text-[#5f6368] cursor-not-allowed opacity-50'
                : 'bg-transparent border-[#3f4046] hover:bg-[#2b2d31] text-[#8ab4f8] hover:text-white cursor-pointer'
            }`}
            title={isPlayingAnimation ? 'Running...' : userRole === 'Viewer' ? 'Viewer Locked' : 'Run Graph'}
          >
            <Play size={12} className={isPlayingAnimation ? 'animate-pulse text-[#8ab4f8]' : ''} />
            <span className="hidden xl:inline">
              {isPlayingAnimation ? 'Running...' : 'Run'}
            </span>
          </button>

          {/* Block Reference */}
          <button
            onClick={() => setIsBlockGuideOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 border border-transparent hover:border-[#3f4046] hover:bg-[#2b2d31] text-[#9aa0a6] hover:text-white rounded-lg text-[11px] font-bold transition-all cursor-pointer bg-transparent shrink-0"
            title="Block Guide"
          >
            <Layers size={12} className="text-[#8ab4f8]" />
            <span className="hidden xl:inline">Blocks</span>
          </button>

          {/* Generate Code */}
          <button
            onClick={onGenerateCode}
            disabled={userRole === 'Viewer'}
            className={`flex items-center gap-1 px-3 py-1 rounded-lg text-[11px] font-bold shadow-sm transition-all shrink-0 ${
              userRole === 'Viewer'
                ? 'bg-[#8ab4f8]/20 text-[#9aa0a6] cursor-not-allowed'
                : 'bg-[#8ab4f8] hover:bg-[#a8c7fa] text-[#1e1f22] cursor-pointer'
            }`}
            title="Generate Framework Target Code"
          >
            <Code size={12} />
            <span className="hidden xl:inline">Generate</span>
          </button>
        </div>

        {/* ═══════════════════════════════════════════ */}
        {/* ZONE 3: Right — Role + Collab + User       */}
        {/* ═══════════════════════════════════════════ */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Enterprise Role Selector */}
          <select
            value={userRole}
            onChange={(e) => setUserRole(e.target.value as any)}
            className="bg-[#2b2d31] border border-[#3f4046] rounded-lg px-1.5 py-0.5 text-[10px] font-extrabold text-[#e3e3e3] cursor-pointer focus:outline-none focus:border-[#8ab4f8] transition-all shrink-0 hidden lg:block"
            title="Simulate Enterprise Role Access"
          >
            <option value="Admin">🛡️ Admin</option>
            <option value="Editor">✍️ Editor</option>
            <option value="Viewer">🔒 Viewer</option>
          </select>

          {/* Real-time Presence Avatars */}
          {syncStatus === 'connected' && Object.keys(collaborators).length > 0 && (
            <div className="flex items-center -space-x-1.5 select-none">
              {Object.values(collaborators)
                .filter((c, idx, arr) => arr.findIndex((x) => x.username === c.username) === idx)
                .slice(0, 3)
                .map((c) => {
                  const collabInitials = c.username
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);
                  return (
                    <div
                      key={c.clientId}
                      className="w-6 h-6 rounded-full border-2 border-[#1e1f22] flex items-center justify-center cursor-pointer font-bold text-[9px] shadow-md transition-transform hover:scale-110 hover:z-30 relative group"
                      style={{ backgroundColor: c.color, color: '#1e1f22' }}
                      title={`${c.username} (Active)`}
                    >
                      <span>{collabInitials}</span>
                      <span className="absolute bottom-[-28px] left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 transition-all duration-150 bg-[#2b2d31] border border-[#3f4046] text-[#e3e3e3] text-[9px] px-2 py-0.5 rounded shadow-lg whitespace-nowrap z-50 pointer-events-none font-medium">
                        {c.username}
                      </span>
                    </div>
                  );
                })}
              {Object.values(collaborators).filter((c, idx, arr) => arr.findIndex((x) => x.username === c.username) === idx).length > 3 && (
                <div className="w-6 h-6 rounded-full border-2 border-[#1e1f22] bg-[#3f4046] flex items-center justify-center text-[9px] font-bold text-[#9aa0a6]">
                  +{Object.values(collaborators).filter((c, idx, arr) => arr.findIndex((x) => x.username === c.username) === idx).length - 3}
                </div>
              )}
            </div>
          )}

          {/* Separator */}
          <div className="w-px h-5 bg-[#3f4046] shrink-0"></div>

          {/* Notifications */}
          <button className="p-1.5 hover:bg-[#2b2d31] text-[#9aa0a6] hover:text-white rounded-lg transition-all relative shrink-0">
            <Bell size={15} />
            <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-[#8ab4f8] rounded-full"></span>
          </button>

          {/* Settings */}
          <button className="p-1.5 hover:bg-[#2b2d31] text-[#9aa0a6] hover:text-white rounded-lg transition-all shrink-0">
            <Settings size={15} />
          </button>

          {/* User Profile Avatar */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown('profile')}
              className="w-7 h-7 rounded-full border border-[#8ab4f8]/30 bg-[#8ab4f8]/10 flex items-center justify-center cursor-pointer shadow-md overflow-hidden hover:ring-2 hover:ring-[#8ab4f8]/40 transition-all focus:outline-none"
            >
              <span className="text-[10px] font-bold text-[#8ab4f8]">{initials}</span>
            </button>

            {isProfileOpen && (
              <>
                <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsProfileOpen(false)} />
                <div className="absolute right-0 mt-2 w-56 bg-[#1e1f26] border border-[#3f4046]/50 shadow-2xl rounded-2xl p-2 z-50 text-left backdrop-blur-xl animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="px-3 py-2 border-b border-[#3f4046]/45 mb-1.5">
                    <div className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-wider">Active User</div>
                    <div className="text-xs font-extrabold text-white truncate mt-0.5">{username}</div>
                    <div className="text-[9px] text-[#8ab4f8] font-bold mt-1 bg-[#8ab4f8]/5 border border-[#8ab4f8]/15 rounded-md px-1.5 py-0.5 inline-block">
                      {userRole} Mode
                    </div>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-red-500/10 text-red-400 hover:text-red-300 rounded-xl text-xs font-bold transition-all border-none bg-transparent cursor-pointer text-left"
                  >
                    <LogOut size={14} className="shrink-0" />
                    <span>Log Out of Workspace</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <BlockGuideModal 
        isOpen={isBlockGuideOpen} 
        onClose={() => setIsBlockGuideOpen(false)} 
      />
    </>
  );
}
