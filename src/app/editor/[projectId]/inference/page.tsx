'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import MainLayout from '@/components/Layout/MainLayout';
import { useProjectStore } from '@/store/projectStore';
import { useDeploymentStore } from '@/store/deploymentStore';
import { 
  Play, 
  Send, 
  Terminal, 
  Cpu, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Zap, 
  Database,
  RefreshCw,
  Copy,
  ChevronRight
} from 'lucide-react';

export default function InferencePlaygroundPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const projects = useProjectStore((state) => state.projects);
  const currentProject = projects.find((p) => p.id === projectId);
  
  const { deployments, updateLiveMetrics } = useDeploymentStore();
  const deployment = deployments[projectId];

  // Raw editable JSON input
  const defaultInput = `{\n  "age": 25,\n  "salary": 40000\n}`;
  const [jsonInput, setJsonInput] = useState(defaultInput);
  const [jsonOutput, setJsonOutput] = useState('{\n  "prediction": 1\n}');
  const [isValidJson, setIsValidJson] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'tabular' | 'nlp' | 'custom'>('tabular');
  const [requestHeaders, setRequestHeaders] = useState<string>('');

  useEffect(() => {
    if (deployment) {
      const projSlug = currentProject?.name.toLowerCase().replace(/\s+/g, '-') || 'model';
      setRequestHeaders(
        `POST /v1/models/${projSlug}/predict HTTP/1.1\nHost: inference.archnet.ai\nContent-Type: application/json\nAuthorization: Bearer mlbuilder_token_abc123`
      );
    } else {
      setRequestHeaders(
        `POST /v1/models/sandbox/predict HTTP/1.1\nHost: localhost:8000\nContent-Type: application/json`
      );
    }
  }, [deployment, currentProject]);

  const handleJsonChange = (val: string) => {
    setJsonInput(val);
    try {
      JSON.parse(val);
      setIsValidJson(true);
    } catch (e) {
      setIsValidJson(false);
    }
  };

  const handleRunInference = () => {
    if (!isValidJson) return;
    setIsLoading(true);
    setLatency(null);

    // Simulate API round-trip delay (200ms - 500ms)
    const mockLatency = Math.floor(12 + Math.random() * 28);
    
    setTimeout(() => {
      try {
        const parsed = JSON.parse(jsonInput);
        
        // Dynamic mock classifier logic
        let prediction = 1;
        if (parsed.age !== undefined && parsed.salary !== undefined) {
          // Rule: If age < 30 and salary < 50000, predict 1, else 0
          prediction = (parsed.age < 30 && parsed.salary < 50000) ? 1 : 0;
        } else if (parsed.text !== undefined) {
          // Sentiment prediction: positive 1, negative 0
          prediction = parsed.text.toLowerCase().includes('good') || 
                       parsed.text.toLowerCase().includes('great') || 
                       parsed.text.toLowerCase().includes('amazing') ? 1 : 0;
        } else {
          prediction = Math.random() > 0.5 ? 1 : 0;
        }

        setJsonOutput(JSON.stringify({ prediction }, null, 2));
        setLatency(mockLatency);
        
        // Push a live metrics tick to the deploy store to show load activity!
        updateLiveMetrics(projectId, deployment?.id || 'simulation');
      } catch (err) {
        setJsonOutput(JSON.stringify({ error: 'Inference pipeline failure execution' }, null, 2));
      } finally {
        setIsLoading(false);
      }
    }, 400);
  };

  const loadPreset = (preset: 'tabular' | 'nlp' | 'custom') => {
    setActiveTab(preset);
    if (preset === 'tabular') {
      setJsonInput(`{\n  "age": 25,\n  "salary": 40000\n}`);
    } else if (preset === 'nlp') {
      setJsonInput(`{\n  "text": "This neural architecture performs extremely fast."\n}`);
    } else {
      setJsonInput(`{\n  "input_tensor": [1, 28, 28, 3],\n  "channels": 3,\n  "batch_size": 1\n}`);
    }
    setIsValidJson(true);
  };

  return (
    <MainLayout>
      <div className="p-8 max-w-6xl mx-auto space-y-8 relative pb-16">
        
        {/* Title */}
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <Play className="text-[#c5a3ff]" size={36} />
            <span>Inference Playground</span>
          </h1>
          <p className="text-[#9aa0a6] mt-2 text-sm font-semibold">
            Evaluate compiled models interactively by pushing REST payload queries directly into the inference pipeline.
          </p>
        </div>

        {/* Status Warning Pill */}
        {!deployment || deployment.status !== 'active' ? (
          <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-amber-500 shrink-0" size={24} />
              <div>
                <h4 className="text-sm font-bold text-white">Active Endpoint Offline</h4>
                <p className="text-xs text-gray-500 font-semibold">
                  The container microservice is offline. Currently running in <span className="text-[#c5a3ff] font-bold">Local Sandbox Mocking Mode</span>.
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push(`/editor/${projectId}/deploy`)}
              className="px-4 py-2 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/25 hover:border-amber-500/40 text-xs font-bold text-amber-500 rounded-xl transition-all cursor-pointer text-center"
            >
              Go to Deploy Center
            </button>
          </div>
        ) : (
          <div className="bg-[#81c784]/10 border border-[#81c784]/20 p-4 rounded-2xl flex items-center gap-3">
            <CheckCircle className="text-[#81c784] shrink-0" size={24} />
            <div>
              <h4 className="text-sm font-bold text-[#81c784]">Container Ingress Active</h4>
              <p className="text-xs text-gray-400 font-semibold">
                Routing payloads directly to cluster instance at <span className="font-mono text-[#8ab4f8] font-bold">{deployment.endpointUrl}</span>
              </p>
            </div>
          </div>
        )}

        {/* Playground Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left: Input Console */}
          <div className="lg:col-span-6 space-y-4">
            
            {/* Header with Tabs */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-black text-gray-500 tracking-wider">Payload Input JSON</span>
              <div className="flex bg-[#2b2d31] p-1 border border-[#3f4046] rounded-xl text-[10px] font-bold">
                <button
                  onClick={() => loadPreset('tabular')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    activeTab === 'tabular' ? 'bg-[#3f4046] text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Tabular
                </button>
                <button
                  onClick={() => loadPreset('nlp')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    activeTab === 'nlp' ? 'bg-[#3f4046] text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  NLP
                </button>
                <button
                  onClick={() => loadPreset('custom')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    activeTab === 'custom' ? 'bg-[#3f4046] text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Custom Tensor
                </button>
              </div>
            </div>

            {/* Codearea box */}
            <div className="bg-[#1e1f22] border border-[#3f4046] rounded-2xl overflow-hidden shadow-xl flex flex-col h-96 relative">
              <div className="bg-[#2b2d31]/50 px-4 py-2 border-b border-[#3f4046]/70 flex items-center justify-between text-[10px] font-mono text-gray-500">
                <div className="flex items-center gap-1.5 font-bold">
                  <Database size={12} className="text-[#c5a3ff]" />
                  <span>inference_payload.json</span>
                </div>
                {!isValidJson && (
                  <span className="text-red-400 font-extrabold flex items-center gap-1">
                    <AlertTriangle size={10} />
                    Invalid JSON
                  </span>
                )}
              </div>
              <textarea
                value={jsonInput}
                onChange={(e) => handleJsonChange(e.target.value)}
                className="flex-1 p-4 bg-transparent border-none focus:outline-none text-xs font-mono text-white resize-none custom-scrollbar leading-relaxed"
                spellCheck="false"
              />
              
              <div className="p-3 border-t border-[#3f4046]/50 flex justify-end bg-[#2b2d31]/10">
                <button
                  onClick={handleRunInference}
                  disabled={isLoading || !isValidJson}
                  className={`flex items-center gap-1.5 px-5 py-2 text-xs font-black rounded-xl transition-all shadow-md cursor-pointer ${
                    !isValidJson
                      ? 'bg-[#3f4046] text-gray-600 cursor-not-allowed border-none'
                      : 'bg-[#c5a3ff] hover:bg-[#d4beff] text-[#1e1f22] border-none'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <RefreshCw size={12} className="animate-spin" />
                      <span>Requesting...</span>
                    </>
                  ) : (
                    <>
                      <Send size={12} />
                      <span>Send API Request</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Mock HTTP details */}
            <div className="bg-[#2b2d31]/20 border border-[#3f4046]/80 p-4 rounded-2xl space-y-2">
              <span className="text-[9px] uppercase font-black text-gray-500 tracking-wider">REST Request Header Preview</span>
              <pre className="text-[9px] font-mono text-[#8ab4f8] bg-[#1e1f22] p-3 rounded-xl border border-[#3f4046]/50 whitespace-pre-wrap leading-relaxed">
                {requestHeaders}
              </pre>
            </div>
          </div>

          {/* Right: Output Console */}
          <div className="lg:col-span-6 space-y-4">
            
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-black text-gray-500 tracking-wider">Endpoint Response JSON</span>
              
              {latency !== null && (
                <div className="flex items-center gap-3 font-mono text-[10px]">
                  <span className="text-gray-500 flex items-center gap-1 font-bold">
                    <Clock size={11} />
                    RTT:
                  </span>
                  <span className="text-[#ffe082] font-black">{latency}ms</span>
                </div>
              )}
            </div>

            {/* Codearea output */}
            <div className="bg-[#1e1f22] border border-[#3f4046] rounded-2xl overflow-hidden shadow-xl flex flex-col h-96">
              <div className="bg-[#2b2d31]/50 px-4 py-2 border-b border-[#3f4046]/70 flex items-center justify-between text-[10px] font-mono text-gray-500">
                <div className="flex items-center gap-1.5 font-bold">
                  <Terminal size={12} className="text-[#80cbc4]" />
                  <span>response_body.json</span>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(jsonOutput);
                    alert('Response copied to clipboard!');
                  }}
                  className="hover:text-white transition-colors cursor-pointer"
                  title="Copy response JSON"
                >
                  <Copy size={12} />
                </button>
              </div>
              <pre className="flex-1 p-4 text-xs font-mono text-[#80cbc4] overflow-y-auto custom-scrollbar leading-relaxed whitespace-pre-wrap">
                {isLoading ? (
                  <span className="text-gray-500 italic flex items-center gap-2">
                    <RefreshCw size={14} className="animate-spin" />
                    Querying model layers topologies downstream...
                  </span>
                ) : (
                  jsonOutput
                )}
              </pre>
              
              <div className="p-3 border-t border-[#3f4046]/50 bg-[#2b2d31]/10 text-[9px] font-mono text-gray-500 flex items-center justify-between">
                <span>STATUS: {isLoading ? 'PENDING' : '200 OK'}</span>
                <span className="flex items-center gap-0.5">
                  Power: Kubernetes RTX Pod
                  <ChevronRight size={10} />
                </span>
              </div>
            </div>

            {/* Inference helper guide */}
            <div className="bg-[#2b2d31]/50 border border-[#3f4046] p-5 rounded-2xl space-y-3 shadow-xl">
              <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Zap size={14} className="text-[#c5a3ff]" />
                <span>Quick API Sandboxing Reference</span>
              </h4>
              <p className="text-xs text-gray-400 font-semibold leading-relaxed">
                Send request objects containing features defined by your input layer. Tabular models predict classification values (e.g. `1` or `0`). NLP modules perform sequence evaluation.
              </p>
            </div>

          </div>

        </div>

      </div>
    </MainLayout>
  );
}
