'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Search, Bell, Settings, ArrowLeft, Play, Cpu, Code, Undo, Redo, Zap, Clock, Save, Check, RotateCw, AlertTriangle, Trash2, LogOut } from 'lucide-react';
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

  // Model Versioning & Auto-saving State Selections
  const draftSavedStatus = useCanvasStore((state) => state.draftSavedStatus);
  const checkpoints = useCanvasStore((state) => state.checkpoints);
  const saveCheckpoint = useCanvasStore((state) => state.saveCheckpoint);
  const restoreCheckpoint = useCanvasStore((state) => state.restoreCheckpoint);
  const deleteCheckpoint = useCanvasStore((state) => state.deleteCheckpoint);

  const [isHistoryOpen, setIsHistoryOpen] = React.useState(false);
  const [username, setUsername] = React.useState('SandboxArchitect');
  const [isProfileOpen, setIsProfileOpen] = React.useState(false);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('mlbuilder_username');
      if (stored) {
        setUsername(stored);
      }
    }
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

  return (
    <header className="h-16 border-b border-[#3f4046] bg-[#1e1f22] flex items-center justify-between px-8 sticky top-0 z-30 w-full select-none">
      {/* Left side: Context details */}
      <div className="flex items-center gap-4">
        {isEditor ? (
          <>
            <button 
              onClick={handleBackToDashboard}
              className="p-2 hover:bg-[#2b2d31] rounded-lg text-[#9aa0a6] hover:text-white transition-all"
              title="Back to Dashboard"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[#9aa0a6]">Project:</span>
              <span className="text-sm font-bold text-[#8ab4f8] tracking-wide bg-[#8ab4f8]/10 px-3 py-1 rounded-full border border-[#8ab4f8]/20">
                {currentProject?.name || 'ResNet-Mini'}
              </span>
            </div>
            
            {/* Live System Status Badges Block */}
            <div className="flex items-center gap-2 bg-[#2b2d31]/40 border border-[#3f4046]/50 px-2 py-0.5 rounded-xl">
              {/* WebSocket Sync Status Indicator */}
              <div className="flex items-center gap-2">
                {syncStatus === 'connected' && (
                  <div className="flex items-center gap-1.5 bg-[#81c784]/10 border border-[#81c784]/20 px-2.5 py-0.5 rounded-full text-[11px] font-bold text-[#81c784] shadow-sm select-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#81c784] animate-pulse"></span>
                    <span>Room Synced</span>
                  </div>
                )}
                {syncStatus === 'connecting' && (
                  <div className="flex items-center gap-1.5 bg-[#ffe082]/10 border border-[#ffe082]/20 px-2.5 py-0.5 rounded-full text-[11px] font-bold text-[#ffe082] shadow-sm select-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ffe082] animate-pulse"></span>
                    <span>Syncing...</span>
                  </div>
                )}
                {syncStatus === 'disconnected' && (
                  <div className="flex items-center gap-1.5 bg-[#f28b82]/10 border border-[#f28b82]/20 px-2.5 py-0.5 rounded-full text-[11px] font-bold text-[#f28b82] shadow-sm select-none" title="Using local-first offline fallback">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#f28b82]"></span>
                    <span>Local Sandbox</span>
                  </div>
                )}
              </div>

              {/* Model Draft Saving Status Badge */}
              <div className="flex items-center gap-2">
                {draftSavedStatus === 'saving' && (
                  <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full text-[11px] font-bold text-amber-500 shadow-sm select-none">
                    <RotateCw size={11} className="animate-spin text-amber-500" />
                    <span>Saving...</span>
                  </div>
                )}
                {draftSavedStatus === 'saved' && (
                  <div className="flex items-center gap-1.5 bg-[#81c784]/15 border border-[#81c784]/30 px-2.5 py-0.5 rounded-full text-[11px] font-bold text-[#81c784] shadow-sm select-none" title="All edits saved locally">
                    <Check size={11} className="text-[#81c784]" />
                    <span>Saved Draft</span>
                  </div>
                )}
                {draftSavedStatus === 'error' && (
                  <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 px-2.5 py-0.5 rounded-full text-[11px] font-bold text-red-400 shadow-sm select-none">
                    <AlertTriangle size={11} className="text-red-400" />
                    <span>Save Failed</span>
                  </div>
                )}
              </div>
            </div>

            {/* Version History Dropdown Container */}
            <div className="relative flex items-center">
              {/* Version History Dropdown Toggle */}
              <button
                onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                className={`p-1.5 rounded-full border transition-all cursor-pointer ${
                  isHistoryOpen 
                    ? 'bg-[#8ab4f8]/10 border-[#8ab4f8]/30 text-[#8ab4f8]' 
                    : 'bg-transparent border-[#3f4046] text-[#9aa0a6] hover:text-white hover:bg-[#2b2d31]'
                }`}
                title="Version History / Checkpoints"
              >
                <Clock size={12} />
              </button>

              {/* Glassmorphism Version History Dropdown */}
              {isHistoryOpen && (
                <div className="absolute top-8 left-0 mt-2 w-80 bg-[#1e1f22]/95 backdrop-blur-md border border-[#3f4046] shadow-2xl rounded-2xl p-4 z-50 text-[#e3e3e3] select-none animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between border-b border-[#3f4046] pb-2 mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#9aa0a6]">Draft Snapshots</span>
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
              )}
            </div>

            {/* Enterprise Role Selector Dropdown & Badging */}
            <div className="flex items-center gap-2 border-l border-[#3f4046] pl-4 ml-1">
              <select
                value={userRole}
                onChange={(e) => setUserRole(e.target.value as any)}
                className="bg-[#2b2d31] border border-[#3f4046] rounded-lg px-2.5 py-1 text-[11px] font-extrabold text-[#e3e3e3] cursor-pointer focus:outline-none focus:border-[#8ab4f8] transition-all"
                title="Simulate Enterprise Role Access"
              >
                <option value="Admin">🛡️ Admin Mode</option>
                <option value="Editor">✍️ Editor Mode</option>
                <option value="Viewer">🔒 Viewer Mode</option>
              </select>

              {userRole === 'Admin' && (
                <span className="bg-[#b388ff]/10 border border-[#b388ff]/30 px-2 py-0.5 rounded text-[9px] font-black text-[#b388ff] uppercase tracking-wider select-none animate-pulse">
                  Admin Controller
                </span>
              )}
              {userRole === 'Editor' && (
                <span className="bg-[#8ab4f8]/10 border border-[#8ab4f8]/20 px-2 py-0.5 rounded text-[9px] font-black text-[#8ab4f8] uppercase tracking-wider select-none">
                  Standard Editor
                </span>
              )}
              {userRole === 'Viewer' && (
                <span className="bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded text-[9px] font-black text-red-400 uppercase tracking-wider select-none">
                  Viewer Lock
                </span>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <Cpu className="text-[#8ab4f8]" size={22} />
            <span className="font-bold text-lg text-white">Model Workspace</span>
          </div>
        )}
      </div>

      {/* Center side: Context Search Bar */}
      {!isEditor && (
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
      )}

      {/* Right side: Actions, Notification, Settings, Avatar */}
      <div className="flex items-center gap-4">
        {/* Forward Pass & Deploy/Code Buttons */}
        {isEditor ? (
          <>
            <div className="flex items-center gap-1.5 bg-[#2b2d31]/50 border border-[#3f4046] px-2 py-1 rounded-full">
              <button
                onClick={undo}
                disabled={undoStack.length === 0 || userRole === 'Viewer'}
                className={`p-1.5 rounded-full transition-all ${
                  undoStack.length === 0 || userRole === 'Viewer'
                    ? 'text-[#5f6368] cursor-not-allowed opacity-50'
                    : 'text-[#9aa0a6] hover:text-white hover:bg-[#2b2d31] cursor-pointer'
                }`}
                title={userRole === 'Viewer' ? "Undo Restricted" : "Undo (Ctrl+Z)"}
              >
                <Undo size={14} />
              </button>
              <button
                onClick={redo}
                disabled={redoStack.length === 0 || userRole === 'Viewer'}
                className={`p-1.5 rounded-full transition-all ${
                  redoStack.length === 0 || userRole === 'Viewer'
                    ? 'text-[#5f6368] cursor-not-allowed opacity-50'
                    : 'text-[#9aa0a6] hover:text-white hover:bg-[#2b2d31] cursor-pointer'
                }`}
                title={userRole === 'Viewer' ? "Redo Restricted" : "Redo (Ctrl+Y)"}
              >
                <Redo size={14} />
              </button>
            </div>


            <button
              onClick={runForwardPass}
              disabled={isPlayingAnimation || userRole === 'Viewer'}
              className={`flex items-center gap-2 px-4 py-2 border rounded-full text-xs font-bold transition-all ${
                isPlayingAnimation || userRole === 'Viewer'
                  ? 'bg-transparent border-[#3f4046]/40 text-[#5f6368] cursor-not-allowed opacity-50'
                  : 'bg-transparent border-[#3f4046] hover:bg-[#2b2d31] text-[#8ab4f8] hover:text-white cursor-pointer'
              }`}
            >
              <Play size={14} className={isPlayingAnimation ? 'animate-pulse text-[#8ab4f8]' : ''} />
              <span>{isPlayingAnimation ? 'Running...' : userRole === 'Viewer' ? 'Viewer Locked' : 'Run Graph'}</span>
            </button>
            <button
              onClick={onGenerateCode}
              disabled={userRole === 'Viewer'}
              className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold shadow-md shadow-black/10 transition-all duration-200 ${
                userRole === 'Viewer'
                  ? 'bg-[#8ab4f8]/20 text-[#9aa0a6] cursor-not-allowed'
                  : 'bg-[#8ab4f8] hover:bg-[#a8c7fa] text-[#1e1f22] cursor-pointer'
              }`}
            >
              <Code size={14} />
              <span>Generate PyTorch Code</span>
            </button>

            {/* Real-time Overlapping Presence Avatars Group */}
            {syncStatus === 'connected' && Object.keys(collaborators).length > 0 && (
              <div className="flex items-center -space-x-2 select-none ml-2">
                {Object.values(collaborators).map((c) => {
                  const initials = c.username
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);
                  return (
                    <div
                      key={c.clientId}
                      className="w-8 h-8 rounded-full border-2 border-[#1e1f22] flex items-center justify-center cursor-pointer font-bold text-xs shadow-md transition-transform hover:scale-110 hover:z-30 relative group"
                      style={{ backgroundColor: c.color, color: '#1e1f22' }}
                      title={`${c.username} (Active)`}
                    >
                      <span>{initials}</span>
                      
                      {/* Tooltip */}
                      <span className="absolute bottom-[-28px] left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 transition-all duration-150 bg-[#2b2d31] border border-[#3f4046] text-[#e3e3e3] text-[9px] px-2 py-0.5 rounded shadow-lg whitespace-nowrap z-50 pointer-events-none font-medium">
                        {c.username}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <button className="flex items-center gap-2 px-5 py-2.5 bg-transparent border border-[#3f4046] hover:bg-[#2b2d31] text-[#8ab4f8] rounded-full text-xs font-bold shadow-md shadow-black/5 transition-all">
            <span>Deploy Model</span>
          </button>
        )}

        <div className="w-[1px] h-6 bg-[#3f4046] mx-1"></div>

        {/* Notifications & Settings */}
        <button className="p-2 hover:bg-[#2b2d31] text-[#9aa0a6] hover:text-white rounded-lg transition-all relative">
          <Bell size={18} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-[#8ab4f8] rounded-full"></span>
        </button>
        <button className="p-2 hover:bg-[#2b2d31] text-[#9aa0a6] hover:text-white rounded-lg transition-all">
          <Settings size={18} />
        </button>

        {/* User Profile Avatar with dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="w-8 h-8 rounded-full border border-[#8ab4f8]/30 bg-[#8ab4f8]/10 flex items-center justify-center cursor-pointer shadow-md overflow-hidden hover:ring-2 hover:ring-[#8ab4f8]/40 transition-all focus:outline-none"
          >
            <span className="text-xs font-bold text-[#8ab4f8]">{initials}</span>
          </button>

          {isProfileOpen && (
            <>
              {/* Overlay background for click away */}
              <div 
                className="fixed inset-0 z-40 bg-transparent" 
                onClick={() => setIsProfileOpen(false)}
              />
              
              {/* Dropdown panel */}
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
  );
}
