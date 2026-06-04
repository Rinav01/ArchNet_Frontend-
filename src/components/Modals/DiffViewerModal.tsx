'use client';

import React, { useState, useMemo } from 'react';
import { useCanvasStore } from '@/store/canvasStore';
import { X, GitCompare, Plus, Minus, ArrowRight, CheckCircle, Sliders, AlertTriangle } from 'lucide-react';
import { CanvasNode, ModelCheckpoint } from '@/types/canvas';

interface DiffViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DiffViewerModal({ isOpen, onClose }: DiffViewerModalProps) {
  const { nodes: currentNodes, checkpoints } = useCanvasStore();

  const [versionA, setVersionA] = useState<string>('current');
  const [versionB, setVersionB] = useState<string>(
    checkpoints.length > 0 ? checkpoints[checkpoints.length - 1].id : 'current'
  );

  // Helper to resolve a version identifier to a nodes array
  const resolveNodes = (versionId: string): { name: string; nodes: CanvasNode[] } => {
    if (versionId === 'current') {
      return { name: 'Active Draft Canvas', nodes: currentNodes };
    }
    const cp = checkpoints.find((c) => c.id === versionId);
    return { name: cp ? cp.name : 'Unknown Snapshot', nodes: cp ? cp.nodes : [] };
  };

  // Helper to compare configs and return differences
  const getParamDiffs = (nodeA: CanvasNode, nodeB: CanvasNode) => {
    const diffs: { key: string; valA: any; valB: any }[] = [];
    const configA = nodeA.config || {};
    const configB = nodeB.config || {};
    const keys = new Set([...Object.keys(configA), ...Object.keys(configB)]);

    keys.forEach((key) => {
      if (key.startsWith('_')) return; // Ignore internal state flags

      const valA = (configA as any)[key];
      const valB = (configB as any)[key];

      const isDiff = Array.isArray(valA) && Array.isArray(valB)
        ? JSON.stringify(valA) !== JSON.stringify(valB)
        : valA !== valB;

      if (isDiff) {
        diffs.push({
          key,
          valA: valA === undefined ? 'N/A' : typeof valA === 'object' ? JSON.stringify(valA) : valA,
          valB: valB === undefined ? 'N/A' : typeof valB === 'object' ? JSON.stringify(valB) : valB
        });
      }
    });

    return diffs;
  };

  // Compute Diffs
  const diffResult = useMemo(() => {
    const { name: nameA, nodes: nodesA } = resolveNodes(versionA);
    const { name: nameB, nodes: nodesB } = resolveNodes(versionB);

    const mapA = new Map<string, CanvasNode>();
    nodesA.forEach((n) => mapA.set(n.id, n));

    const mapB = new Map<string, CanvasNode>();
    nodesB.forEach((n) => mapB.set(n.id, n));

    const added: CanvasNode[] = [];
    const removed: CanvasNode[] = [];
    const modified: { node: CanvasNode; diffs: { key: string; valA: any; valB: any }[] }[] = [];

    // Find added and modified
    nodesB.forEach((nodeB) => {
      const nodeA = mapA.get(nodeB.id);
      if (!nodeA) {
        added.push(nodeB);
      } else {
        const paramDiffs = getParamDiffs(nodeA, nodeB);
        if (paramDiffs.length > 0 || nodeA.type !== nodeB.type || nodeA.name !== nodeB.name) {
          // If type or name changed, treat it as a parameter diff as well
          const diffs = [...paramDiffs];
          if (nodeA.type !== nodeB.type) {
            diffs.unshift({ key: 'Type', valA: nodeA.type, valB: nodeB.type });
          }
          if (nodeA.name !== nodeB.name) {
            diffs.unshift({ key: 'Name', valA: nodeA.name, valB: nodeB.name });
          }
          modified.push({ node: nodeB, diffs });
        }
      }
    });

    // Find removed
    nodesA.forEach((nodeA) => {
      if (!mapB.has(nodeA.id)) {
        removed.push(nodeA);
      }
    });

    return {
      nameA,
      nameB,
      added,
      removed,
      modified,
      isIdentical: added.length === 0 && removed.length === 0 && modified.length === 0
    };
  }, [versionA, versionB, currentNodes, checkpoints]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-[#090a0f]/60 backdrop-blur-md transition-opacity" 
        onClick={onClose}
      />

      {/* Diff Viewer Card */}
      <div className="relative w-full max-w-2xl bg-[#1e1f22]/95 border border-[#3f4046] shadow-2xl rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200 flex flex-col max-h-[520px] select-none text-[#e3e3e3]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 border-b border-[#3f4046]/50 h-14 shrink-0">
          <div className="flex items-center gap-2 text-sm font-bold">
            <GitCompare size={18} className="text-[#8ab4f8]" />
            <span>Architecture Diff Viewer</span>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 hover:bg-[#2b2d31] rounded-lg text-[#9aa0a6] hover:text-white transition-all cursor-pointer border-none bg-transparent"
          >
            <X size={16} />
          </button>
        </div>

        {/* Top bar version selectors */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#2b2d31]/30 border-b border-[#3f4046]/30 gap-4 shrink-0">
          {/* Version A Selector */}
          <div className="flex-1 flex flex-col gap-1 min-w-0">
            <label className="text-[8.5px] font-black text-gray-500 uppercase tracking-widest">Version A (Baseline)</label>
            <select
              value={versionA}
              onChange={(e) => setVersionA(e.target.value)}
              className="bg-[#2b2d31] border border-[#3f4046] rounded-xl px-2.5 py-1 text-xs text-[#e3e3e3] focus:outline-none focus:border-[#8ab4f8] transition-all font-medium cursor-pointer max-w-full"
            >
              <option value="current">Current Canvas Draft</option>
              {checkpoints.map((cp) => (
                <option key={cp.id} value={cp.id}>
                  {cp.name} ({cp.timestamp})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-center pt-4 text-gray-500 shrink-0">
            <ArrowRight size={16} />
          </div>

          {/* Version B Selector */}
          <div className="flex-1 flex flex-col gap-1 min-w-0">
            <label className="text-[8.5px] font-black text-gray-500 uppercase tracking-widest">Version B (Comparison)</label>
            <select
              value={versionB}
              onChange={(e) => setVersionB(e.target.value)}
              className="bg-[#2b2d31] border border-[#3f4046] rounded-xl px-2.5 py-1 text-xs text-[#e3e3e3] focus:outline-none focus:border-[#8ab4f8] transition-all font-medium cursor-pointer max-w-full"
            >
              <option value="current">Current Canvas Draft</option>
              {checkpoints.map((cp) => (
                <option key={cp.id} value={cp.id}>
                  {cp.name} ({cp.timestamp})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Diff Result List Viewport */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
          
          {diffResult.isIdentical ? (
            <div className="flex flex-col items-center justify-center text-center py-16 text-[#9aa0a6]">
              <CheckCircle size={32} className="text-[#81c784] opacity-80 mb-2 animate-pulse" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">No Architecture Differences</h4>
              <p className="text-[10px] text-gray-500 mt-1 max-w-xs leading-relaxed font-semibold">
                Baseline and comparison models are identical. No added/removed layers or parameter alterations detected.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* 1. Added Nodes Section */}
              {diffResult.added.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[9px] font-extrabold tracking-widest text-[#81c784] uppercase flex items-center gap-1.5">
                    <Plus size={11} className="bg-[#81c784]/15 p-0.5 rounded-full" />
                    <span>Added Layers ({diffResult.added.length})</span>
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {diffResult.added.map((node) => (
                      <div 
                        key={node.id}
                        className="bg-[#81c784]/5 border border-[#81c784]/20 p-2.5 rounded-xl flex items-center justify-between text-xs"
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-[#e3e3e3] truncate">{node.name}</p>
                          <p className="text-[9px] text-[#81c784] uppercase font-black tracking-wider mt-0.5">{node.type}</p>
                        </div>
                        <span className="text-[9px] font-mono bg-[#81c784]/15 text-[#81c784] px-1.5 py-0.5 rounded-md font-bold shrink-0">
                          {node.outputShape.length > 0 ? `[${node.outputShape.join(', ')}]` : 'N/A'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. Removed Nodes Section */}
              {diffResult.removed.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[9px] font-extrabold tracking-widest text-[#f28b82] uppercase flex items-center gap-1.5">
                    <Minus size={11} className="bg-[#f28b82]/15 p-0.5 rounded-full" />
                    <span>Removed Layers ({diffResult.removed.length})</span>
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {diffResult.removed.map((node) => (
                      <div 
                        key={node.id}
                        className="bg-[#f28b82]/5 border border-[#f28b82]/20 p-2.5 rounded-xl flex items-center justify-between text-xs"
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-[#e3e3e3] truncate">{node.name}</p>
                          <p className="text-[9px] text-[#f28b82] uppercase font-black tracking-wider mt-0.5">{node.type}</p>
                        </div>
                        <span className="text-[9px] font-mono bg-[#f28b82]/15 text-[#f28b82] px-1.5 py-0.5 rounded-md font-bold shrink-0">
                          {node.outputShape.length > 0 ? `[${node.outputShape.join(', ')}]` : 'N/A'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Parameter Changes Section */}
              {diffResult.modified.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[9px] font-extrabold tracking-widest text-amber-400 uppercase flex items-center gap-1.5">
                    <Sliders size={11} className="bg-amber-500/15 p-0.5 rounded-full" />
                    <span>Parameter Alterations ({diffResult.modified.length})</span>
                  </span>
                  <div className="space-y-2">
                    {diffResult.modified.map(({ node, diffs }) => (
                      <div 
                        key={node.id}
                        className="bg-amber-500/5 border border-amber-500/15 p-3.5 rounded-xl space-y-2"
                      >
                        <div className="flex justify-between items-center border-b border-[#3f4046]/30 pb-1.5">
                          <div>
                            <span className="text-xs font-bold text-[#e3e3e3]">{node.name}</span>
                            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-2">{node.type}</span>
                          </div>
                        </div>

                        {/* Parameter list */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10.5px]">
                          {diffs.map((diff, dIdx) => (
                            <div key={dIdx} className="flex justify-between items-center bg-[#1e1f22]/50 border border-[#3f4046]/45 px-2.5 py-1 rounded-lg">
                              <span className="text-[#9aa0a6] font-bold capitalize">{diff.key}:</span>
                              <div className="flex items-center gap-1.5 font-mono text-[10px]">
                                <span className="text-[#f28b82] line-through font-medium">{diff.valA}</span>
                                <ArrowRight size={10} className="text-gray-500" />
                                <span className="text-[#81c784] font-bold">{diff.valB}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

        {/* Footer */}
        <div className="h-10 border-t border-[#3f4046]/40 bg-[#18191c]/50 px-4 flex items-center justify-between text-[9px] text-[#5f6368] font-bold tracking-wide uppercase shrink-0">
          <span>Comparing: A ({diffResult.nameA}) vs B ({diffResult.nameB})</span>
          <span>Press ESC to exit</span>
        </div>
      </div>
    </div>
  );
}
