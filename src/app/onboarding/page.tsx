'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useProjectStore } from '@/store/projectStore';
import { toast } from '@/store/notificationStore';
import { 
  Cpu, 
  Database, 
  CloudLightning, 
  ChevronRight, 
  Check, 
  Play, 
  Loader2, 
  HardDrive,
  CheckCircle2, 
  Sparkles,
  ArrowRight,
  Terminal,
  Shield
} from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();
  const { addProject, loadProjects, isOnline, checkBackendStatus } = useProjectStore();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);

  // Step 1: Project creation state
  const [projectName, setProjectName] = useState('My First Network');
  const [projectFramework, setProjectFramework] = useState<'PyTorch' | 'TensorFlow' | 'JAX'>('PyTorch');

  // Step 2: Dataset Ingest State
  const [selectedDataset, setSelectedDataset] = useState<'mnist' | 'imdb' | 'csv'>('mnist');
  const [ingestProgress, setIngestProgress] = useState(0);
  const [ingestState, setIngestState] = useState<'idle' | 'running' | 'success'>('idle');

  // Step 3: Storage State
  const [storageType, setStorageType] = useState<'local' | 's3' | 'gcp'>('local');
  const [bucketName, setBucketName] = useState('archnet-weights-bucket');
  const [storageState, setStorageState] = useState<'idle' | 'success'>('idle');

  // Step 4: Pipeline Execution Logs
  const [pipelineLogs, setPipelineLogs] = useState<string[]>([]);
  const [pipelineState, setPipelineState] = useState<'idle' | 'running' | 'success'>('idle');

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('archnet_token') : null;
    if (!token) {
      router.push('/login');
    } else {
      checkBackendStatus();
    }
  }, [router, checkBackendStatus]);

  // Step 1 handler: Create project in backend
  const handleCreateProject = async () => {
    if (!projectName.trim()) {
      toast.error('Validation Error', 'Project name is required');
      return;
    }
    setLoading(true);

    try {
      const pId = await addProject({
        name: projectName,
        framework: projectFramework,
        status: 'Draft'
      });

      if (pId) {
        setCreatedProjectId(pId);
        localStorage.setItem('lastVisitedProjectId', pId);
        toast.success('Project Created', `Initialized project "${projectName}" in database.`);
        setStep(2);
      } else {
        // Safe sandbox fallback
        const mockId = `sandbox-${Date.now()}`;
        setCreatedProjectId(mockId);
        localStorage.setItem('lastVisitedProjectId', mockId);
        toast.success('Sandbox Project Created', `Initialized local project "${projectName}".`);
        setStep(2);
      }
    } catch (e: any) {
      toast.error('Initialization Error', e.message || 'Could not connect to database.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2 handler: Ingest dataset simulation
  const handleIngestDataset = () => {
    setIngestState('running');
    setIngestProgress(0);

    const interval = setInterval(() => {
      setIngestProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIngestState('success');
          toast.success('Ingestion Successful', 'Tabular tensors cached in training buffers.');
          setTimeout(() => setStep(3), 800);
          return 100;
        }
        return prev + 10;
      });
    }, 150);
  };

  // Step 3 handler: Establish cloud handshake
  const handleConnectStorage = () => {
    setLoading(true);
    setTimeout(() => {
      setStorageState('success');
      setLoading(false);
      toast.success('Storage Mounted', 'Read/Write socket pipelines established.');
      setTimeout(() => setStep(4), 800);
    }, 1000);
  };

  // Step 4 handler: Simulated worker logs
  const handleRunPipeline = () => {
    setPipelineState('running');
    setPipelineLogs([]);

    const logLines = [
      '[INFO] Connecting to RabbitMQ Celery Broker at 127.0.0.1:5672',
      '[INFO] Initializing dataset worker thread pool (4 workers)',
      '[SUCCESS] Mounted MNIST dataset: 60,000 training images, 10,000 test images',
      '[INFO] Compiling visual graph to target framework module class...',
      '[SUCCESS] Compilation complete. Total parameters: 1,204,580',
      '[INFO] Starting training pipeline run...',
      '[INFO] Epoch 1/5: Loss=0.45, Accuracy=88.2%',
      '[INFO] Epoch 2/5: Loss=0.21, Accuracy=93.6%',
      '[INFO] Epoch 3/5: Loss=0.12, Accuracy=96.1%',
      '[INFO] Epoch 4/5: Loss=0.08, Accuracy=97.5%',
      '[INFO] Epoch 5/5: Loss=0.05, Accuracy=98.4%',
      '[SUCCESS] Pipeline completed successfully. Tensors serialized.'
    ];

    let currentLineIndex = 0;
    const interval = setInterval(() => {
      if (currentLineIndex < logLines.length) {
        const nextLine = logLines[currentLineIndex];
        setPipelineLogs((prev) => [...prev, nextLine]);
        currentLineIndex++;
      } else {
        clearInterval(interval);
        setPipelineState('success');
        toast.success('Onboarding Completed', 'Ready to enter workspace dashboard.');
      }
    }, 400);
  };

  const handleFinishOnboarding = () => {
    localStorage.setItem('hasCompletedOnboarding', 'true');
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0a0b10] relative select-none overflow-hidden font-sans text-[#e3e3e3]">
      {/* Background aesthetics */}
      <div className="absolute inset-0 dot-grid opacity-20 z-0"></div>
      <div className="absolute top-[-20%] left-[-15%] w-[60vw] h-[60vw] rounded-full bg-[#8ab4f8]/5 blur-[150px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-20%] right-[-15%] w-[60vw] h-[60vw] rounded-full bg-[#c5a3ff]/5 blur-[150px] pointer-events-none z-0"></div>

      <div className="w-full max-w-[640px] bg-[#1e1f26]/85 border border-[#3f4046]/45 shadow-2xl rounded-3xl backdrop-blur-xl p-8 z-10 flex flex-col relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#8ab4f8]/40 to-transparent"></div>

        {/* Step Indicator Header */}
        <div className="flex items-center justify-between border-b border-[#3f4046]/40 pb-5 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#8ab4f8]/10 text-[#8ab4f8] rounded-xl">
              <Cpu size={22} className="animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-wide">ArchNet Onboarding</h2>
              <p className="text-[10px] font-extrabold uppercase text-[#9aa0a6] tracking-widest mt-0.5">
                Builder Workspace Setup
              </p>
            </div>
          </div>
          
          {/* Progress badges */}
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step === s 
                    ? 'bg-[#8ab4f8] text-[#1e1f22] font-black' 
                    : step > s 
                    ? 'bg-[#81c784]/20 text-[#81c784] border border-[#81c784]/30' 
                    : 'bg-[#2b2d31]/80 text-[#9aa0a6] border border-[#3f4046]/40'
                }`}
              >
                {step > s ? <Check size={12} /> : s}
              </div>
            ))}
          </div>
        </div>

        {/* STEP 1: CREATE PROJECT */}
        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-white">1. Configure Workspace Project</h3>
              <p className="text-xs text-[#9aa0a6] font-semibold">
                Setup your initial deep learning topology model canvas.
              </p>
            </div>

            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-[#9aa0a6] uppercase tracking-wider block">
                  Project Name
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. ResNet-50-Alpha"
                  className="w-full bg-[#1b1c22] border border-[#3f4046]/40 rounded-xl py-3 px-4 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#8ab4f8] transition-colors font-semibold"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-extrabold text-[#9aa0a6] uppercase tracking-wider block">
                  Framework Target
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['PyTorch', 'TensorFlow', 'JAX'] as const).map((fw) => (
                    <button
                      key={fw}
                      type="button"
                      onClick={() => setProjectFramework(fw)}
                      className={`py-3 rounded-xl border text-xs font-bold tracking-wide transition-all ${
                        projectFramework === fw
                          ? 'bg-[#8ab4f8]/10 border-[#8ab4f8]/50 text-[#8ab4f8] shadow-lg shadow-[#8ab4f8]/5'
                          : 'bg-[#1b1c22] border-[#3f4046]/40 text-[#9aa0a6] hover:bg-[#2b2d36] hover:text-white'
                      }`}
                    >
                      {fw}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-[#3f4046]/30 flex justify-end">
              <button
                onClick={handleCreateProject}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-[#8ab4f8] hover:bg-[#a8c7fa] text-[#1e1f22] font-black rounded-xl text-xs hover:scale-[1.01] active:scale-[0.99] transition-transform duration-150 border-none disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Scaffolding Canvas...</span>
                  </>
                ) : (
                  <>
                    <span>Initialize Project</span>
                    <ChevronRight size={14} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: INGEST DATASET */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-white">2. Ingest Sample Training Dataset</h3>
              <p className="text-xs text-[#9aa0a6] font-semibold">
                Import standard tensors into your workspace data cache.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'mnist', label: 'MNIST Digits', desc: '60K image tensors' },
                  { id: 'imdb', label: 'IMDB Reviews', desc: '25K NLP sequences' },
                  { id: 'csv', label: 'Tabular CSV', desc: 'Mock classification' }
                ].map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setSelectedDataset(d.id as any)}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between h-24 transition-all ${
                      selectedDataset === d.id
                        ? 'bg-[#ffe082]/5 border-[#ffe082]/50 text-[#ffe082] shadow-lg shadow-[#ffe082]/5'
                        : 'bg-[#1b1c22] border-[#3f4046]/40 text-[#9aa0a6] hover:bg-[#2b2d36] hover:text-white'
                    }`}
                  >
                    <span className="text-xs font-black">{d.label}</span>
                    <span className="text-[9px] opacity-80 font-mono">{d.desc}</span>
                  </button>
                ))}
              </div>

              {/* Upload dropzone visual */}
              <div className="bg-[#1b1c22] border border-dashed border-[#3f4046] rounded-2xl p-6 text-center space-y-4 relative overflow-hidden flex flex-col items-center justify-center min-h-[140px]">
                {ingestState === 'idle' && (
                  <>
                    <Database size={24} className="text-[#ffe082]" />
                    <div>
                      <p className="text-xs font-bold text-white">Ready for local sync</p>
                      <p className="text-[10px] text-[#9aa0a6] mt-0.5">Click ingest to cache training tensors</p>
                    </div>
                  </>
                )}

                {ingestState === 'running' && (
                  <>
                    <Loader2 size={24} className="text-[#ffe082] animate-spin" />
                    <div className="w-full max-w-[200px] space-y-1.5">
                      <div className="h-1.5 bg-[#3f4046] rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-[#ffe082] transition-all duration-150"
                          style={{ width: `${ingestProgress}%` }}
                        ></div>
                      </div>
                      <p className="text-[10px] font-mono text-[#ffe082] font-semibold">{ingestProgress}% Syncing...</p>
                    </div>
                  </>
                )}

                {ingestState === 'success' && (
                  <>
                    <CheckCircle2 size={24} className="text-[#81c784]" />
                    <div>
                      <p className="text-xs font-bold text-[#81c784]">Dataset cached successfully</p>
                      <p className="text-[10px] text-[#9aa0a6] mt-0.5">Tensors binded: 60,000 files</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="pt-6 border-t border-[#3f4046]/30 flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="px-5 py-3 bg-transparent border border-[#3f4046] text-xs font-bold text-[#9aa0a6] hover:text-white rounded-xl transition-all"
              >
                Back
              </button>
              {ingestState !== 'success' ? (
                <button
                  onClick={handleIngestDataset}
                  className="flex items-center gap-2 px-6 py-3 bg-[#ffe082] hover:bg-[#fff0b3] text-[#1e1f22] font-black rounded-xl text-xs hover:scale-[1.01] active:scale-[0.99] transition-transform duration-150 border-none"
                >
                  <Database size={13} />
                  <span>Start Dataset Ingestion</span>
                </button>
              ) : (
                <button
                  onClick={() => setStep(3)}
                  className="flex items-center gap-2 px-6 py-3 bg-[#8ab4f8] hover:bg-[#a8c7fa] text-[#1e1f22] font-black rounded-xl text-xs hover:scale-[1.01] active:scale-[0.99] transition-transform duration-150 border-none"
                >
                  <span>Continue</span>
                  <ChevronRight size={14} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: CONNECT STORAGE */}
        {step === 3 && (
          <div className="space-y-6 animate-fade-in">
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-white">3. Connect Cloud Weight Storage</h3>
              <p className="text-xs text-[#9aa0a6] font-semibold">
                Setup read/write buckets to sync model weights and pipeline run checkpoints.
              </p>
            </div>

            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'local', label: 'Local Dev', desc: 'Mock Sandboxed' },
                  { id: 's3', label: 'AWS S3', desc: 'Production S3' },
                  { id: 'gcp', label: 'GCP Bucket', desc: 'Cloud storage' }
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStorageType(s.id as any)}
                    className={`py-3 rounded-xl border text-xs font-bold tracking-wide transition-all ${
                      storageType === s.id
                        ? 'bg-[#c5a3ff]/10 border-[#c5a3ff]/50 text-[#c5a3ff] shadow-lg shadow-[#c5a3ff]/5'
                        : 'bg-[#1b1c22] border-[#3f4046]/40 text-[#9aa0a6] hover:bg-[#2b2d36] hover:text-white'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {storageType !== 'local' ? (
                <div className="space-y-3 p-4 bg-[#1b1c22] rounded-2xl border border-[#3f4046]/40 animate-fade-in">
                  <div className="space-y-1">
                    <label className="text-[9px] font-extrabold text-[#9aa0a6] uppercase tracking-wider block">
                      Storage Bucket URI / Name
                    </label>
                    <input
                      type="text"
                      value={bucketName}
                      onChange={(e) => setBucketName(e.target.value)}
                      className="w-full bg-[#14151a] border border-[#3f4046]/40 rounded-xl py-2 px-3.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#c5a3ff] transition-colors font-mono"
                    />
                  </div>
                  <p className="text-[10px] text-[#9aa0a6]">
                    ArchNet compiles endpoints securely. Read permissions must allow standard AWS signature v4 actions.
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-[#1b1c22]/50 border border-[#3f4046]/40 rounded-2xl flex items-start gap-3">
                  <HardDrive size={18} className="text-[#c5a3ff] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-white">Local Sandboxed Endpoint</h4>
                    <p className="text-[10px] text-[#9aa0a6] mt-0.5 leading-relaxed">
                      Weight serialization will be stored locally inside the project environment metadata checkpoints file. Best for demoing.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-[#3f4046]/30 flex justify-between">
              <button
                onClick={() => setStep(2)}
                className="px-5 py-3 bg-transparent border border-[#3f4046] text-xs font-bold text-[#9aa0a6] hover:text-white rounded-xl transition-all"
              >
                Back
              </button>
              {storageState !== 'success' ? (
                <button
                  onClick={handleConnectStorage}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-3 bg-[#c5a3ff] hover:bg-[#d8c4ff] text-[#1e1f22] font-black rounded-xl text-xs hover:scale-[1.01] active:scale-[0.99] transition-transform duration-150 border-none disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <CloudLightning size={13} />
                  )}
                  <span>Establish Storage Link</span>
                </button>
              ) : (
                <button
                  onClick={() => setStep(4)}
                  className="flex items-center gap-2 px-6 py-3 bg-[#8ab4f8] hover:bg-[#a8c7fa] text-[#1e1f22] font-black rounded-xl text-xs hover:scale-[1.01] active:scale-[0.99] transition-transform duration-150 border-none"
                >
                  <span>Continue</span>
                  <ChevronRight size={14} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* STEP 4: SIMULATE RUN */}
        {step === 4 && (
          <div className="space-y-6 animate-fade-in">
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-white">4. Run First Training Pipeline</h3>
              <p className="text-xs text-[#9aa0a6] font-semibold">
                Boot up a Celery task queue run to compile the canvas and verify tensor flow calculations.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <div className="h-44 bg-[#0c0d12] border border-[#3f4046]/60 rounded-2xl p-4 overflow-y-auto font-mono text-[10px] text-gray-300 space-y-1 scrollbar-thin scrollbar-thumb-gray-800">
                {pipelineLogs.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-[#5f6368] select-none gap-1.5">
                    <Terminal size={18} />
                    <span>Terminal console ready. Click "Execute Run" below.</span>
                  </div>
                ) : (
                  pipelineLogs.map((log, i) => {
                    const isSuccess = log.includes('[SUCCESS]');
                    const color = isSuccess ? 'text-[#81c784]' : log.includes('[INFO]') ? 'text-[#8ab4f8]' : 'text-gray-300';
                    return (
                      <div key={i} className={`leading-relaxed ${color}`}>
                        {log}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="pt-6 border-t border-[#3f4046]/30 flex justify-between">
              <button
                onClick={() => setStep(3)}
                className="px-5 py-3 bg-transparent border border-[#3f4046] text-xs font-bold text-[#9aa0a6] hover:text-white rounded-xl transition-all"
              >
                Back
              </button>
              {pipelineState !== 'success' ? (
                <button
                  onClick={handleRunPipeline}
                  disabled={pipelineState === 'running'}
                  className="flex items-center gap-2 px-6 py-3 bg-[#81c784] hover:bg-[#9edfa0] text-[#1e1f22] font-black rounded-xl text-xs hover:scale-[1.01] active:scale-[0.99] transition-transform duration-150 border-none disabled:opacity-50"
                >
                  <Play size={13} />
                  <span>Execute Validation Run</span>
                </button>
              ) : (
                <button
                  onClick={handleFinishOnboarding}
                  className="flex items-center gap-2 px-6 py-3 bg-[#8ab4f8] hover:bg-[#a8c7fa] text-[#1e1f22] font-black rounded-xl text-xs hover:scale-[1.01] active:scale-[0.99] transition-transform duration-150 border-none shadow-lg shadow-[#8ab4f8]/10"
                >
                  <span>Launch Workspace Dashboard</span>
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
