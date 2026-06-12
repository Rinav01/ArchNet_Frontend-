'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/Layout/MainLayout';
import { toast } from '@/store/notificationStore';
import { useProjectStore } from '@/store/projectStore';
import { graphqlRequest, GET_WORKFLOWS, CREATE_WORKFLOW, DELETE_WORKFLOW } from '@/lib/graphql/client';
import { 
  GitBranch, 
  ArrowRight, 
  Play, 
  Plus, 
  Trash2, 
  Sparkles, 
  Database, 
  Cpu, 
  ShieldCheck, 
  CloudLightning,
  Bell,
  Sliders,
  CheckCircle,
  HelpCircle,
  Activity
} from 'lucide-react';

interface WorkflowNode {
  id: string;
  type: 'trigger' | 'action';
  label: 'Dataset Uploaded' | 'Training Started' | 'Training Finished' | 'Model Registered' | 'Deployment Completed' | 'Analyze Dataset' | 'Compare Runs' | 'Deploy Model' | 'Send Notification' | string;
  config: Record<string, string>;
  x: number;
  y: number;
}

interface WorkflowConnection {
  id: string;
  source: string;
  target: string;
}

export default function WorkflowsPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  // States
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [connections, setConnections] = useState<WorkflowConnection[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [activeSignal, setActiveSignal] = useState<string | null>(null);

  const { activeProjectId, projects, isOnline } = useProjectStore();
  const targetProject = activeProjectId || (projects[0]?.id);

  // Load workflows effect
  const loadWorkflows = useCallback(async () => {
    if (!isOnline || !targetProject) return;
    try {
      const res = await graphqlRequest(GET_WORKFLOWS, { projectId: targetProject });
      if (res && res.workflows) {
        const backendWorkflows = res.workflows;
        const spawnedNodes: WorkflowNode[] = [];
        const spawnedConns: WorkflowConnection[] = [];

        backendWorkflows.forEach((w: any, idx: number) => {
          const trigId = `trig_${w.id}`;
          const actId = `act_${w.id}`;
          const yPos = 120 + (idx * 110) % 280;

          // Parse configs
          const config = typeof w.config === 'string' ? JSON.parse(w.config) : (w.config || {});

          spawnedNodes.push({
            id: trigId,
            type: 'trigger',
            label: w.triggerEvent,
            config: config.trigger || { target: 'Default Target' },
            x: 100,
            y: yPos
          });

          spawnedNodes.push({
            id: actId,
            type: 'action',
            label: w.actionType,
            config: config.action || { webhook: 'Slack Channel' },
            x: 340,
            y: yPos
          });

          spawnedConns.push({
            id: `conn_${w.id}`,
            source: trigId,
            target: actId
          });
        });

        // Only override state if we have backend workflows
        if (spawnedNodes.length > 0) {
          setNodes(spawnedNodes);
          setConnections(spawnedConns);
        }
      }
    } catch (err) {
      console.warn('Failed to load workflows from backend.', err);
    }
  }, [targetProject, isOnline]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted) {
      loadWorkflows();
    }
  }, [isMounted, loadWorkflows]);

  if (!isMounted) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px] text-gray-500">
          <span className="text-xs font-semibold">Loading Automation Builder...</span>
        </div>
      </MainLayout>
    );
  }

  // Node triggers & actions inventory
  const triggerTypes = [
    'Dataset Uploaded',
    'Training Started',
    'Training Finished',
    'Model Registered',
    'Deployment Completed'
  ];

  const actionTypes = [
    'Analyze Dataset',
    'Compare Runs',
    'Deploy Model',
    'Send Notification'
  ];

  const handleAddNode = (type: 'trigger' | 'action', label: string) => {
    const newId = `node_${Math.random().toString(36).substring(2, 9)}`;
    const yPos = 150 + (nodes.length * 60) % 280;
    const newNode: WorkflowNode = {
      id: newId,
      type,
      label,
      config: type === 'action' && label === 'Send Notification' ? { webhook: 'Slack Channel' } : {},
      x: type === 'trigger' ? 100 : 340,
      y: yPos
    };

    setNodes(prev => [...prev, newNode]);
    setSelectedNodeId(newId);
    toast.success('Node Added', `Added workflow ${type} node "${label}".`);
  };

  const handleDeleteNode = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Extract workflow UUID if node ID maps to an S3/DB object
    const workflowId = id.replace('trig_', '').replace('act_', '');
    const isBackendNode = workflowId.length > 8 && workflowId.includes('-');

    if (isOnline && isBackendNode) {
      try {
        await graphqlRequest(DELETE_WORKFLOW, { workflowId });
        toast.info('Workflow Deleted', 'Removed workflow from backend database.');
        loadWorkflows();
        return;
      } catch (err: any) {
        toast.error('Delete Error', err.message || 'Failed to remove workflow.');
      }
    }

    setNodes(prev => prev.filter(n => n.id !== id));
    setConnections(prev => prev.filter(c => c.source !== id && c.target !== id));
    if (selectedNodeId === id) setSelectedNodeId(null);
    toast.info('Node Removed', 'Removed node and its connections locally.');
  };

  const handleConnect = async (sourceId: string, targetId: string) => {
    const sourceNode = nodes.find(n => n.id === sourceId);
    const targetNode = nodes.find(n => n.id === targetId);
    if (!sourceNode || !targetNode) return;
 
    // Check if connection already exists
    const exists = connections.some(c => c.source === sourceId && c.target === targetId);
    if (exists) return;
 
    if (isOnline && targetProject) {
      try {
        const configJson = {
          trigger: sourceNode.config,
          action: targetNode.config
        };
        await graphqlRequest(CREATE_WORKFLOW, {
          projectId: targetProject,
          name: `${sourceNode.label} -> ${targetNode.label}`,
          triggerEvent: sourceNode.label,
          actionType: targetNode.label,
          config: configJson
        });
        toast.success('Workflow Saved', `Successfully persisted automation on backend.`);
        loadWorkflows();
        return;
      } catch (err: any) {
        toast.error('Sync Error', err.message || 'Failed to save workflow.');
      }
    }

    const newConn = {
      id: `conn_${Math.random().toString(36).substring(2, 9)}`,
      source: sourceId,
      target: targetId
    };
    setConnections(prev => [...prev, newConn]);
    toast.success('Nodes Connected', 'Established automation execution link.');
  };

  const triggerTestSimulation = () => {
    setActiveSignal('conn_2');
    toast.info('Simulating workflow', 'Triggering execution path for Training Finished...');
    setTimeout(() => {
      setActiveSignal('conn_3');
      setTimeout(() => {
        setActiveSignal(null);
        toast.success('Workflow Succeeded', 'All triggered automation actions executed successfully.');
      }, 1000);
    }, 1000);
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  const getNodeIcon = (label: string) => {
    switch (label) {
      case 'Dataset Uploaded':
      case 'Analyze Dataset':
        return <Database size={14} className="text-[#8ab4f8]" />;
      case 'Training Started':
      case 'Training Finished':
      case 'Compare Runs':
        return <Cpu size={14} className="text-[#c5a3ff]" />;
      case 'Model Registered':
        return <ShieldCheck size={14} className="text-[#80cbc4]" />;
      case 'Deployment Completed':
      case 'Deploy Model':
        return <CloudLightning size={14} className="text-[#ffe082]" />;
      default:
        return <Bell size={14} className="text-gray-400" />;
    }
  };

  return (
    <MainLayout>
      <div className="p-8 max-w-6xl mx-auto space-y-8 relative pb-24 font-sans select-none">
        
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <GitBranch className="text-[#c5a3ff] rotate-90" size={32} />
              <span>Workflow Automation Builder</span>
            </h1>
            <p className="text-[#9aa0a6] mt-2 text-sm font-semibold">
              Orchestrate pipeline automations. Connect triggers like training milestones directly to deploy actions.
            </p>
          </div>

          <button
            onClick={triggerTestSimulation}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-[#80cbc4] hover:bg-[#a7ffeb] text-[#1e1f22] text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md self-start md:self-auto"
          >
            <Play size={12} className="fill-[#1e1f22]" />
            <span>Simulate Workflow</span>
          </button>
        </div>

        {/* 3-Panel Workflow Builder Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Node Library Catalog */}
          <div className="lg:col-span-3 space-y-5 bg-[#2b2d31]/50 border border-[#3f4046] rounded-2xl p-5 shadow-xl">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-white">Automation Library</h3>
              <p className="text-[10px] text-gray-500 font-semibold mt-0.5">Click items to spawn nodes.</p>
            </div>

            {/* Triggers Group */}
            <div className="space-y-2.5">
              <span className="text-[9px] uppercase font-black tracking-wider text-gray-500 block">Trigger Events</span>
              <div className="space-y-1.5">
                {triggerTypes.map(tgt => (
                  <button
                    key={tgt}
                    onClick={() => handleAddNode('trigger', tgt)}
                    className="w-full flex items-center gap-2 p-2.5 bg-[#1e1f22]/60 hover:bg-[#1e1f22] border border-[#3f4046]/80 hover:border-gray-500 text-[10.5px] font-bold text-gray-300 rounded-xl transition-all cursor-pointer text-left"
                  >
                    <div className="w-2 h-2 rounded-full bg-[#f28b82]"></div>
                    {tgt}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions Group */}
            <div className="space-y-2.5 pt-4 border-t border-[#3f4046]/40">
              <span className="text-[9px] uppercase font-black tracking-wider text-gray-500 block">Automation Actions</span>
              <div className="space-y-1.5">
                {actionTypes.map(act => (
                  <button
                    key={act}
                    onClick={() => handleAddNode('action', act)}
                    className="w-full flex items-center gap-2 p-2.5 bg-[#1e1f22]/60 hover:bg-[#1e1f22] border border-[#3f4046]/80 hover:border-gray-500 text-[10.5px] font-bold text-gray-300 rounded-xl transition-all cursor-pointer text-left"
                  >
                    <div className="w-2 h-2 rounded-full bg-[#8ab4f8]"></div>
                    {act}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Middle Column: Builder Canvas */}
          <div className="lg:col-span-6 bg-[#141517] border border-[#3f4046] rounded-2xl h-[450px] relative overflow-hidden shadow-2xl dot-grid">
            <div className="absolute top-4 left-4 p-2 bg-[#1e1f22]/80 border border-[#3f4046] rounded-xl text-[10px] text-gray-500 font-extrabold select-none z-10">
              Flow Workspace Canvas
            </div>

            {/* Render lines between nodes */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 2 L 10 5 L 0 8 z" fill="#3f4046" />
                </marker>
              </defs>

              {connections.map(conn => {
                const src = nodes.find(n => n.id === conn.source);
                const tgt = nodes.find(n => n.id === conn.target);
                if (!src || !tgt) return null;

                const startX = src.x + 160;
                const startY = src.y + 20;
                const endX = tgt.x;
                const endY = tgt.y + 20;

                const isSignalActive = activeSignal === conn.id;

                return (
                  <g key={conn.id}>
                    {/* Background Link path */}
                    <path
                      d={`M ${startX} ${startY} C ${(startX + endX) / 2} ${startY}, ${(startX + endX) / 2} ${endY}, ${endX} ${endY}`}
                      fill="none"
                      stroke={isSignalActive ? '#80cbc4' : '#3f4046'}
                      strokeWidth={isSignalActive ? 3 : 1.5}
                      className={isSignalActive ? 'animated-edge' : ''}
                      markerEnd="url(#arrow)"
                    />
                  </g>
                );
              })}
            </svg>

            {/* Render Flow Nodes */}
            <div className="absolute inset-0 overflow-y-auto p-6 z-10 space-y-1">
              
              {/* Trigger nodes column */}
              <div className="absolute left-6 top-10 bottom-10 flex flex-col justify-around">
                {nodes.filter(n => n.type === 'trigger').map(node => (
                  <div
                    key={node.id}
                    onClick={() => setSelectedNodeId(node.id)}
                    className={`w-40 bg-[#1e1f22]/90 border p-3 rounded-xl flex items-center justify-between shadow-lg cursor-pointer transition-all ${
                      selectedNodeId === node.id 
                        ? 'border-[#f28b82] glow-node' 
                        : 'border-[#3f4046]'
                    }`}
                    style={{ transform: `translateY(${node.y - 120}px)` }}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      {getNodeIcon(node.label)}
                      <div className="overflow-hidden">
                        <span className="text-[10px] font-extrabold text-white block truncate">{node.label}</span>
                        <span className="text-[8px] text-gray-500 font-bold uppercase block mt-0.5">Trigger</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteNode(node.id, e)}
                      className="p-1 hover:bg-[#2b2d31] rounded-lg text-gray-600 hover:text-rose-400 transition-all cursor-pointer shrink-0 border-none bg-transparent"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Action nodes column */}
              <div className="absolute right-6 top-10 bottom-10 flex flex-col justify-around">
                {nodes.filter(n => n.type === 'action').map(node => (
                  <div
                    key={node.id}
                    onClick={() => setSelectedNodeId(node.id)}
                    className={`w-40 bg-[#1e1f22]/90 border p-3 rounded-xl flex items-center justify-between shadow-lg cursor-pointer transition-all ${
                      selectedNodeId === node.id 
                        ? 'border-[#8ab4f8] glow-node' 
                        : 'border-[#3f4046]'
                    }`}
                    style={{ transform: `translateY(${node.y - 120}px)` }}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      {getNodeIcon(node.label)}
                      <div className="overflow-hidden">
                        <span className="text-[10px] font-extrabold text-white block truncate">{node.label}</span>
                        <span className="text-[8px] text-gray-500 font-bold uppercase block mt-0.5">Action</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteNode(node.id, e)}
                      className="p-1 hover:bg-[#2b2d31] rounded-lg text-gray-600 hover:text-rose-400 transition-all cursor-pointer shrink-0 border-none bg-transparent"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                ))}
              </div>

            </div>
          </div>

          {/* Right Column: Node Config Inspector Panel */}
          <div className="lg:col-span-3 space-y-5 bg-[#2b2d31]/50 border border-[#3f4046] rounded-2xl p-5 shadow-xl min-h-[350px]">
            {selectedNode ? (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <span className="text-[9px] uppercase font-black tracking-wider text-gray-500">Node Properties</span>
                  <h3 className="text-xs font-black text-white mt-0.5">{selectedNode.label}</h3>
                  <span className="text-[8px] text-gray-500 font-bold uppercase block mt-0.5">ID: {selectedNode.id}</span>
                </div>

                <div className="border-t border-[#3f4046]/40 pt-4 space-y-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-gray-500 tracking-wider">Parameters config</label>
                    <input
                      type="text"
                      value={selectedNode.config.target || selectedNode.config.criteria || selectedNode.config.webhook || selectedNode.config.pipeline || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNodes(prev => prev.map(n => {
                          if (n.id === selectedNode.id) {
                            const firstKey = Object.keys(n.config)[0] || 'target';
                            return { ...n, config: { ...n.config, [firstKey]: val } };
                          }
                          return n;
                        }));
                      }}
                      className="w-full px-2.5 py-1.5 bg-[#1e1f22] border border-[#3f4046] rounded-lg text-[10px] text-white focus:outline-none focus:border-[#8ab4f8] font-bold"
                    />
                  </div>

                  {/* Connection helper if Trigger node */}
                  {selectedNode.type === 'trigger' && (
                    <div className="space-y-2 pt-2">
                      <label className="text-[9px] font-black uppercase text-gray-500 tracking-wider">Link to Action node</label>
                      <div className="space-y-1">
                        {nodes.filter(n => n.type === 'action').map(actionNode => (
                          <button
                            key={actionNode.id}
                            onClick={() => handleConnect(selectedNode.id, actionNode.id)}
                            className="w-full py-1.5 px-2 bg-[#1e1f22] hover:bg-[#2b2d31] border border-[#3f4046] text-gray-400 hover:text-white text-[9px] font-bold rounded-lg transition-all text-left cursor-pointer flex justify-between items-center"
                          >
                            <span>{actionNode.label}</span>
                            <Plus size={10} className="text-[#8ab4f8]" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-gray-500 text-xs font-semibold">
                <Sliders size={20} className="mx-auto mb-2 text-gray-600" />
                Select a node on the builder canvas to inspect its properties.
              </div>
            )}
          </div>

        </div>

      </div>
    </MainLayout>
  );
}
