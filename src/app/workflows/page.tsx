'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/Layout/MainLayout';
import { toast } from '@/store/notificationStore';
import { useProjectStore } from '@/store/projectStore';
import { 
  graphqlRequest, 
  GET_WORKFLOWS, 
  CREATE_WORKFLOW, 
  DELETE_WORKFLOW,
  GET_WORKFLOW_RUNS,
  TRIGGER_WORKFLOW
} from '@/lib/graphql/client';
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
  Activity,
  Terminal,
  Loader2
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

interface WorkflowRun {
  id: string;
  workflowId: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | string;
  triggerEvent: string;
  triggeredByResourceId: string | null;
  executionLogs: string | null;
  createdAt: string;
  updatedAt: string;
}

// Mappings between UI labels and backend constants
const TRIGGER_MAP_TO_BACKEND: Record<string, string> = {
  'Dataset Uploaded': 'DATASET_UPLOADED',
  'Training Started': 'TRAINING_STARTED',
  'Training Finished': 'TRAINING_FINISHED',
  'Model Registered': 'MODEL_REGISTERED',
  'Deployment Completed': 'DEPLOYMENT_COMPLETED',
};

const TRIGGER_MAP_FROM_BACKEND: Record<string, string> = {
  'DATASET_UPLOADED': 'Dataset Uploaded',
  'TRAINING_STARTED': 'Training Started',
  'TRAINING_FINISHED': 'Training Finished',
  'MODEL_REGISTERED': 'Model Registered',
  'DEPLOYMENT_COMPLETED': 'Deployment Completed',
};

const ACTION_MAP_TO_BACKEND: Record<string, string> = {
  'Analyze Dataset': 'ANALYZE_DATASET',
  'Compare Runs': 'COMPARE_RUNS',
  'Deploy Model': 'DEPLOY_MODEL',
  'Send Notification': 'SEND_ALERTS',
};

const ACTION_MAP_FROM_BACKEND: Record<string, string> = {
  'ANALYZE_DATASET': 'Analyze Dataset',
  'COMPARE_RUNS': 'Compare Runs',
  'DEPLOY_MODEL': 'Deploy Model',
  'SEND_ALERTS': 'Send Notification',
};

export default function WorkflowsPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // States
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [connections, setConnections] = useState<WorkflowConnection[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [activeSignal, setActiveSignal] = useState<string | null>(null);

  // Execution History & Terminal Console States
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<WorkflowRun | null>(null);
  const [isLoadingRuns, setIsLoadingRuns] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'runs'>('config');

  // Offline Simulation State Database
  const [localRuns, setLocalRuns] = useState<Record<string, WorkflowRun[]>>({});

  const { activeProjectId, projects, isOnline } = useProjectStore();
  const targetProject = activeProjectId || (projects[0]?.id);

  // Extract workflow UUID if node ID maps to an S3/DB object
  const getSelectedWorkflowId = useCallback(() => {
    if (!selectedNodeId) return null;
    const workflowId = selectedNodeId.replace('trig_', '').replace('act_', '');
    const isBackendNode = workflowId.length > 8 && workflowId.includes('-');
    return isBackendNode ? workflowId : null;
  }, [selectedNodeId]);

  const selectedWorkflowId = getSelectedWorkflowId();

  // Load execution history
  const loadWorkflowRuns = useCallback(async (workflowId: string) => {
    if (!isOnline) {
      // Offline fallback: load from local simulation state
      const localWfRuns = localRuns[workflowId] || [];
      setRuns(localWfRuns);
      if (localWfRuns.length > 0) {
        setSelectedRun(prev => {
          if (!prev) return localWfRuns[0];
          const updated = localWfRuns.find(r => r.id === prev.id);
          return updated || localWfRuns[0];
        });
      } else {
        setSelectedRun(null);
      }
      return;
    }

    setIsLoadingRuns(true);
    try {
      const res = await graphqlRequest(GET_WORKFLOW_RUNS, { workflowId });
      if (res && res.workflowRuns) {
        setRuns(res.workflowRuns);
        if (res.workflowRuns.length > 0) {
          setSelectedRun(prev => {
            if (!prev) return res.workflowRuns[0];
            const updated = res.workflowRuns.find((r: any) => r.id === prev.id);
            return updated || res.workflowRuns[0];
          });
        } else {
          setSelectedRun(null);
        }
      }
    } catch (err) {
      console.warn('Failed to load workflow runs.', err);
    } finally {
      setIsLoadingRuns(false);
    }
  }, [isOnline, localRuns]);

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

          const trigLabel = TRIGGER_MAP_FROM_BACKEND[w.triggerEvent] || w.triggerEvent;
          const actLabel = ACTION_MAP_FROM_BACKEND[w.actionType] || w.actionType;

          spawnedNodes.push({
            id: trigId,
            type: 'trigger',
            label: trigLabel,
            config: config.trigger || { target: 'Default Target' },
            x: 100,
            y: yPos
          });

          spawnedNodes.push({
            id: actId,
            type: 'action',
            label: actLabel,
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

  // Load runs automatically when a node is selected
  useEffect(() => {
    if (selectedWorkflowId) {
      loadWorkflowRuns(selectedWorkflowId);
    } else {
      setRuns([]);
      setSelectedRun(null);
    }
  }, [selectedNodeId, selectedWorkflowId, loadWorkflowRuns]);

  // Auto-scroll logs terminal
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedRun?.executionLogs]);

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
    setActiveTab('config');
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
        setSelectedNodeId(null);
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

        const triggerConst = TRIGGER_MAP_TO_BACKEND[sourceNode.label] || sourceNode.label;
        const actionConst = ACTION_MAP_TO_BACKEND[targetNode.label] || targetNode.label;

        await graphqlRequest(CREATE_WORKFLOW, {
          projectId: targetProject,
          name: `${sourceNode.label} -> ${targetNode.label}`,
          triggerEvent: triggerConst,
          actionType: actionConst,
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

  // On-demand manual trigger execution
  const triggerWorkflowExecution = async () => {
    const workflowId = getSelectedWorkflowId();
    if (!workflowId) return;

    if (!isOnline) {
      // Local simulated execution path
      setIsTriggering(true);
      setActiveTab('runs');
      toast.info('Simulating workflow', 'Triggering local simulated workflow execution path...');
      
      const newRunId = `mock_run_${Math.random().toString(36).substring(2, 9)}`;
      const wfNode = nodes.find(n => n.id === `trig_${workflowId}`);
      const actNode = nodes.find(n => n.id === `act_${workflowId}`);
      const triggerLabel = wfNode ? wfNode.label : 'Manual';
      const actionLabel = actNode ? actNode.label : 'Execute Action';

      const initialRun: WorkflowRun = {
        id: newRunId,
        workflowId,
        status: 'PENDING',
        triggerEvent: TRIGGER_MAP_TO_BACKEND[triggerLabel] || triggerLabel,
        triggeredByResourceId: 'LOCAL_USER',
        executionLogs: `[INFO] ${new Date().toISOString()} - Initializing manual simulation...\n[INFO] Starting local execution for workflow: '${triggerLabel} -> ${actionLabel}'\n[INFO] Action: ${ACTION_MAP_TO_BACKEND[actionLabel] || actionLabel}\n[PENDING] Queued manual workflow execution run...`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Add to local state database
      setLocalRuns(prev => {
        const existing = prev[workflowId] || [];
        return { ...prev, [workflowId]: [initialRun, ...existing] };
      });

      setRuns(prev => [initialRun, ...prev]);
      setSelectedRun(initialRun);

      const connId = `conn_${workflowId}`;
      setActiveSignal(connId);

      // Phase 2: RUNNING state simulation
      setTimeout(() => {
        const runningLogs = `\n[RUNNING] ${new Date().toISOString()} - Local worker executing...\n[RUNNING] Active trigger event: ${initialRun.triggerEvent}\n[RUNNING] Target Action: ${ACTION_MAP_TO_BACKEND[actionLabel] || actionLabel}\n[RUNNING] Executing action logic...`;
        
        setRuns(prev => prev.map(r => {
          if (r.id === newRunId) {
            const updated = {
              ...r,
              status: 'RUNNING',
              executionLogs: r.executionLogs + runningLogs
            };
            setSelectedRun(updated);
            return updated;
          }
          return r;
        }));

        // Phase 3: COMPLETED simulation
        setTimeout(() => {
          let actionSpecificLogs = '';
          const actionConst = ACTION_MAP_TO_BACKEND[actionLabel] || actionLabel;
          if (actionConst === 'ANALYZE_DATASET') {
            actionSpecificLogs = `\n[RUNNING] Simulating dataset schema profile analysis...\n[RUNNING] Scanning features, checking missing values and target data drift...\n[SUCCESS] Profile completed. 5 features processed. Target drift: 0.02 (stable).`;
          } else if (actionConst === 'COMPARE_RUNS') {
            actionSpecificLogs = `\n[RUNNING] Loading training runs for active project...\n[RUNNING] Comparing accuracy curves between run v1 and run v2...\n[SUCCESS] Model v2 shows +2.4% validation accuracy improvement. Fit type: Stable convergence.`;
          } else if (actionConst === 'DEPLOY_MODEL') {
            actionSpecificLogs = `\n[RUNNING] Compiling project neural network architecture into PyTorch IR...\n[RUNNING] Building deployment package for local FastAPI target...\n[SUCCESS] Model deployed successfully. Endpoint active at: http://127.0.0.1:8000/api/deployments/mock_${newRunId.slice(0,6)}/predict`;
          } else {
            actionSpecificLogs = `\n[RUNNING] Dispatching automated webhook payload...\n[SUCCESS] Alerts sent to admin@mlbuilder.com via Slack channel webhook.`;
          }

          const completionLogs = actionSpecificLogs + `\n[SUCCESS] ${new Date().toISOString()} - Workflow run finished successfully.\n[INFO] Local simulation completed.`;

          setRuns(prev => prev.map(r => {
            if (r.id === newRunId) {
              const updated = {
                ...r,
                status: 'COMPLETED',
                executionLogs: r.executionLogs + completionLogs
              };
              setSelectedRun(updated);
              return updated;
            }
            return r;
          }));

          // Persist back to localRuns map
          setLocalRuns(prev => {
            const existing = prev[workflowId] || [];
            return {
              ...prev,
              [workflowId]: existing.map(r => {
                if (r.id === newRunId) {
                  return { ...r, status: 'COMPLETED', executionLogs: r.executionLogs + completionLogs };
                }
                return r;
              })
            };
          });

          setActiveSignal(null);
          setIsTriggering(false);
          toast.success('Simulation Succeeded', 'Simulated workflow action executed successfully.');
        }, 1000);

      }, 800);

      return;
    }

    setIsTriggering(true);
    setActiveTab('runs');
    try {
      const res = await graphqlRequest(TRIGGER_WORKFLOW, { workflowId });
      if (res && res.triggerWorkflow) {
        toast.success('Workflow Started', 'Triggered execution run on backend successfully.');
        loadWorkflowRuns(workflowId);
      }
    } catch (err: any) {
      toast.error('Execution Error', err.message || 'Failed to trigger workflow.');
    } finally {
      setIsTriggering(false);
    }
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

  const formatLogLines = (logsText: string | null) => {
    if (!logsText) return <span className="text-gray-600 italic">No logs generated.</span>;
    return logsText.split('\n').map((line, idx) => {
      let colorClass = 'text-gray-300';
      if (line.includes('[SUCCESS]') || line.includes('successfully') || line.includes('completed')) {
        colorClass = 'text-emerald-400 font-semibold';
      } else if (line.includes('[ERROR]') || line.includes('failed') || line.includes('ValueError')) {
        colorClass = 'text-rose-400 font-semibold';
      } else if (line.includes('[PENDING]') || line.includes('Queued')) {
        colorClass = 'text-amber-300';
      } else if (line.includes('[RUNNING]') || line.includes('Simulating') || line.includes('Executing')) {
        colorClass = 'text-sky-300';
      } else if (line.includes('[INFO]')) {
        colorClass = 'text-gray-400';
      }
      return (
        <div key={idx} className={`${colorClass} py-0.5 leading-relaxed font-mono break-all text-[11px]`}>
          {line}
        </div>
      );
    });
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
            <span>Simulate Connection</span>
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

          {/* Right Column Container (Canvas + Bottom Execution Console) */}
          <div className="lg:col-span-9 space-y-6">
            
            {/* Middle Column: Builder Canvas */}
            <div className="bg-[#141517] border border-[#3f4046] rounded-2xl h-[400px] relative overflow-hidden shadow-2xl dot-grid">
              <div className="absolute top-4 left-4 p-2 bg-[#1e1f22]/80 border border-[#3f4046] rounded-xl text-[10px] text-gray-500 font-extrabold select-none z-10">
                Flow Workspace Canvas
              </div>

              <div className="w-full h-full relative z-10 flex items-center justify-center">
                <div className="w-[520px] h-full relative">
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

                      const startX = src.x + 160; // 160 is w-40 (node width)
                      const startY = src.y + 24;  // 24 is half node height
                      const endX = tgt.x;
                      const endY = tgt.y + 24;

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
                  <div className="absolute inset-0 overflow-y-auto p-6 z-10 custom-scrollbar">
                    {nodes.map(node => (
                      <div
                        key={node.id}
                        onClick={() => setSelectedNodeId(node.id)}
                        className={`w-40 bg-[#1e1f22]/90 border p-3 rounded-xl flex items-center justify-between shadow-lg cursor-pointer transition-all absolute ${
                          selectedNodeId === node.id 
                            ? (node.type === 'trigger' ? 'border-[#f28b82] glow-node' : 'border-[#8ab4f8] glow-node')
                            : 'border-[#3f4046]'
                        }`}
                        style={{ 
                          left: `${node.x}px`, 
                          top: `${node.y}px` 
                        }}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          {getNodeIcon(node.label)}
                          <div className="overflow-hidden">
                            <span className="text-[10px] font-extrabold text-white block truncate">{node.label}</span>
                            <span className="text-[8px] text-gray-500 font-bold uppercase block mt-0.5">{node.type}</span>
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
            </div>

            {/* Bottom Console Panel (Inspector + Execution History) */}
            <div className="bg-[#2b2d31]/50 border border-[#3f4046] rounded-2xl p-6 shadow-xl min-h-[300px] flex flex-col justify-between">
              {selectedNode ? (
                <div className="space-y-4 animate-fade-in flex-1 flex flex-col">
                  {/* Console Tabs */}
                  <div className="flex items-center justify-between border-b border-[#3f4046]/60 pb-3">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => setActiveTab('config')}
                        className={`flex items-center gap-2 pb-1 text-xs font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
                          activeTab === 'config' 
                            ? 'text-white border-[#8ab4f8]' 
                            : 'text-gray-500 border-transparent hover:text-white'
                        }`}
                      >
                        <Sliders size={12} />
                        <span>Configuration</span>
                      </button>
                      <button
                        onClick={() => setActiveTab('runs')}
                        className={`flex items-center gap-2 pb-1 text-xs font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer relative ${
                          activeTab === 'runs' 
                            ? 'text-white border-[#80cbc4]' 
                            : 'text-gray-500 border-transparent hover:text-white'
                        }`}
                      >
                        <Activity size={12} />
                        <span>Execution History</span>
                        {selectedWorkflowId && runs.length > 0 && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-[#80cbc4]/20 border border-[#80cbc4]/40 text-[#80cbc4] rounded-full font-bold ml-1">
                            {runs.length}
                          </span>
                        )}
                      </button>
                    </div>

                    <div className="text-[10px] text-gray-500 font-bold uppercase">
                      Selected Node: <span className="text-[#8ab4f8]">{selectedNode.label}</span> ({selectedNode.type})
                    </div>
                  </div>

                  {/* Tab Contents */}
                  {activeTab === 'config' && (
                    <div className="space-y-4 pt-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <div>
                            <span className="text-[9px] uppercase font-black tracking-wider text-gray-500">Properties</span>
                            <h3 className="text-xs font-black text-white mt-0.5">{selectedNode.label}</h3>
                            <span className="text-[8px] text-gray-500 font-mono uppercase block mt-0.5">Node ID: {selectedNode.id}</span>
                          </div>

                          <div className="space-y-1.5 pt-2">
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
                        </div>

                        <div>
                          {/* Connection helper if Trigger node */}
                          {selectedNode.type === 'trigger' && (
                            <div className="space-y-2">
                              <label className="text-[9px] font-black uppercase text-gray-500 tracking-wider">Link to Action node</label>
                              <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar pr-2">
                                {nodes.filter(n => n.type === 'action').length === 0 ? (
                                  <div className="text-[10px] text-gray-600 italic">No action nodes available. Spawn one from the library.</div>
                                ) : (
                                  nodes.filter(n => n.type === 'action').map(actionNode => (
                                    <button
                                      key={actionNode.id}
                                      onClick={() => handleConnect(selectedNode.id, actionNode.id)}
                                      className="w-full py-2 px-3 bg-[#1e1f22] hover:bg-[#2b2d31] border border-[#3f4046] text-gray-400 hover:text-white text-[10px] font-bold rounded-lg transition-all text-left cursor-pointer flex justify-between items-center"
                                    >
                                      <span>{actionNode.label}</span>
                                      <Plus size={10} className="text-[#8ab4f8]" />
                                    </button>
                                  ))
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'runs' && (
                    <div className="flex-1 flex flex-col min-h-[220px]">
                      {!selectedWorkflowId ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-gray-500">
                          <HelpCircle size={24} className="text-gray-600 mb-2" />
                          <p className="text-[10.5px] font-semibold">Local Draft Node</p>
                          <p className="text-[9.5px] text-gray-600 mt-1 max-w-sm">
                            Connect this node to an action node on the canvas to save this workflow in the database and activate execution tracking.
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 flex-1 items-stretch">
                          {/* Runs List (col-span-4) */}
                          <div className="md:col-span-4 border-r border-[#3f4046]/40 pr-6 flex flex-col justify-between">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] font-black uppercase text-gray-500 tracking-wider">Executions History</span>
                                <span className="text-[9px] text-[#80cbc4] font-black uppercase tracking-wider">
                                  {isOnline ? 'Online DB' : 'Local Sandbox'}
                                </span>
                              </div>

                              <div className="space-y-1.5 max-h-[180px] overflow-y-auto custom-scrollbar pr-2">
                                {isLoadingRuns ? (
                                  <div className="flex items-center justify-center py-8 text-gray-500 text-[10px] gap-2">
                                    <Loader2 size={12} className="animate-spin text-[#80cbc4]" />
                                    <span>Retrieving database run logs...</span>
                                  </div>
                                ) : runs.length === 0 ? (
                                  <div className="text-[10px] text-gray-600 italic py-6 text-center">
                                    No runs found. Click below to trigger this workflow.
                                  </div>
                                ) : (
                                  runs.map(run => {
                                    const isSelected = selectedRun?.id === run.id;
                                    let statusColor = 'bg-gray-500/10 border-gray-500/20 text-gray-400';
                                    if (run.status === 'COMPLETED') statusColor = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
                                    else if (run.status === 'FAILED') statusColor = 'bg-rose-500/10 border-rose-500/30 text-rose-400';
                                    else if (run.status === 'RUNNING' || run.status === 'PENDING') statusColor = 'bg-amber-500/10 border-amber-500/30 text-amber-400 animate-pulse';

                                    return (
                                      <div
                                        key={run.id}
                                        onClick={() => setSelectedRun(run)}
                                        className={`p-2 bg-[#1e1f22]/60 hover:bg-[#1e1f22] border rounded-lg cursor-pointer transition-all flex flex-col gap-1 ${
                                          isSelected ? 'border-[#80cbc4]' : 'border-transparent'
                                        }`}
                                      >
                                        <div className="flex items-center justify-between">
                                          <span className="text-[9.5px] font-mono text-gray-400 font-bold truncate max-w-[80px]">
                                            #{run.id.slice(0, 8)}
                                          </span>
                                          <span className={`text-[8.5px] px-1.5 py-0.5 rounded font-black border uppercase ${statusColor}`}>
                                            {run.status}
                                          </span>
                                        </div>
                                        <div className="flex items-center justify-between text-[8px] text-gray-500 font-bold">
                                          <span>Event: {run.triggerEvent}</span>
                                          <span>{new Date(run.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}</span>
                                        </div>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            </div>

                            <button
                              onClick={triggerWorkflowExecution}
                              disabled={isTriggering}
                              className="w-full flex items-center justify-center gap-1.5 py-2 px-4 bg-[#80cbc4] hover:bg-[#a7ffeb] disabled:bg-[#3f4046]/40 text-[#1e1f22] disabled:text-gray-500 text-[10.5px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md mt-4"
                            >
                              {isTriggering ? (
                                <>
                                  <Loader2 size={11} className="animate-spin text-[#1e1f22]" />
                                  <span>Executing Run...</span>
                                </>
                              ) : (
                                <>
                                  <Play size={10} className="fill-[#1e1f22]" />
                                  <span>Run Workflow Now</span>
                                </>
                              )}
                            </button>
                          </div>

                          {/* Logs Terminal (col-span-8) */}
                          <div className="md:col-span-8 flex flex-col">
                            <div className="flex items-center gap-2 pb-2 text-[9px] font-black uppercase text-gray-500 tracking-wider">
                              <Terminal size={10} />
                              <span>Live Log Terminal {selectedRun ? `(#${selectedRun.id.slice(0,8)})` : ''}</span>
                            </div>

                            <div className="flex-1 bg-[#0c0d0e] border border-[#3f4046]/80 rounded-xl p-4 min-h-[180px] max-h-[220px] overflow-y-auto custom-scrollbar flex flex-col justify-between shadow-inner">
                              <div className="space-y-0.5">
                                {selectedRun ? (
                                  <>
                                    {formatLogLines(selectedRun.executionLogs)}
                                    {selectedRun.status === 'RUNNING' && (
                                      <div className="flex items-center gap-2 text-sky-300 font-mono text-[11px] py-1">
                                        <Loader2 size={10} className="animate-spin" />
                                        <span>Local process compiling pipeline nodes...</span>
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <div className="text-gray-600 italic font-mono text-[10px]">
                                    Select a run from the history log to inspect the execution standard outputs.
                                  </div>
                                )}
                              </div>
                              <div ref={logsEndRef} />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-12 text-center text-gray-500 text-xs font-semibold flex-1 flex flex-col items-center justify-center">
                  <Sliders size={24} className="mb-2 text-gray-600" />
                  Select any node on the builder canvas to inspect its parameters configuration or execution runs console.
                </div>
              )}
            </div>

          </div>

        </div>

      </div>
    </MainLayout>
  );
}
