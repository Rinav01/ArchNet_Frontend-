'use client';

import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Cpu, 
  Layers, 
  Settings, 
  Sparkles, 
  Code, 
  Undo, 
  Play, 
  Terminal, 
  Search, 
  ArrowUpRight, 
  Check, 
  Copy, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  GitBranch, 
  Activity, 
  Zap, 
  ShieldAlert, 
  Database,
  CloudLightning,
  ChevronRight
} from 'lucide-react';

interface DocSection {
  id: string;
  category: 'getting-started' | 'features' | 'layers' | 'compilers' | 'infrastructure';
  title: string;
  icon: any;
  content: React.ReactNode;
}

export default function DocsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSection, setActiveSection] = useState('overview');
  const [copiedTextId, setCopiedTextId] = useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTextId(id);
    setTimeout(() => setCopiedTextId(null), 2000);
  };

  // Scroll active section into view or update hash
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash) {
        setActiveSection(hash);
        const element = document.getElementById(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    // Initial check
    if (window.location.hash) {
      handleHashChange();
    }
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const sections: DocSection[] = [
    {
      id: 'overview',
      category: 'getting-started',
      title: 'ArchNet Workspace Overview',
      icon: BookOpen,
      content: (
        <div className="space-y-4">
          <p className="text-sm text-[#9aa0a6] leading-relaxed">
            ArchNet is a state-of-the-art **Visual Deep Learning IDE** that allows machine learning developers to construct, validate, profile, and compile neural network architectures inside an intuitive, collaborative graphical stage.
          </p>
          <div className="p-4 bg-[#8ab4f8]/5 border border-[#8ab4f8]/15 rounded-2xl flex gap-3.5 items-start">
            <Sparkles className="text-[#8ab4f8] shrink-0 mt-0.5" size={18} />
            <div className="text-xs text-[#8ab4f8] font-medium leading-relaxed">
              <strong>Core Paradigm:</strong> Every project compiles into a **Directed Acyclic Graph (DAG)**. Modifications inside the visual stage trigger dynamic downstream tensor dimension sweeps and local validation checks instantly.
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 bg-[#2b2d31]/40 border border-[#3f4046]/45 rounded-2xl">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Layers size={14} className="text-[#8ab4f8]" />
                Visual DAG Editor
              </h4>
              <p className="text-[11px] text-[#9aa0a6] leading-relaxed">
                Connect convolutional filters, activation nodes, and linear layers using bezier curves. Features multi-selection, Snapping coordinates, and topological cycles checking.
              </p>
            </div>
            <div className="p-4 bg-[#2b2d31]/40 border border-[#3f4046]/45 rounded-2xl">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Code size={14} className="text-[#c5a3ff]" />
                Multi-Framework Code output
              </h4>
              <p className="text-[11px] text-[#9aa0a6] leading-relaxed">
                Translate graphical representations immediately to executable **PyTorch nn.Modules**, **Flax JAX Modules**, **Keras TensorFlow models**, or static **ONNX graphs** with zero runtime overhead.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'model-management',
      category: 'features',
      title: 'Model Registry & AI Generation',
      icon: Cpu,
      content: (
        <div className="space-y-4">
          <p className="text-sm text-[#9aa0a6] leading-relaxed">
            ArchNet provides a robust model lifecycle workflow, combining automated **AI Architecture Generation** with enterprise-grade **Model Registry Auditing** and SOTA **Research Playground** templates.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 bg-[#2b2d31]/40 border border-[#3f4046]/45 rounded-2xl space-y-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={14} className="text-[#c5a3ff]" />
                AI Generator
              </h4>
              <p className="text-[11px] text-[#9aa0a6] leading-relaxed">
                Generate tailored topologies using prompt guidelines. Automatically tunes layers for target hardware like **RTX 4090**, **Jetson Nano**, and **Google TPUs** before compiling directly onto the canvas.
              </p>
            </div>
            <div className="p-4 bg-[#2b2d31]/40 border border-[#3f4046]/45 rounded-2xl space-y-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Database size={14} className="text-[#80cbc4]" />
                Model Registry
              </h4>
              <p className="text-[11px] text-[#9aa0a6] leading-relaxed">
                Version control system for tracking model runs. Audits parameters, loss, and accuracy metrics. Facilitates single-click rollbacks to deploy historic model checkpoints.
              </p>
            </div>
            <div className="p-4 bg-[#2b2d31]/40 border border-[#3f4046]/45 rounded-2xl space-y-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <GitBranch size={14} className="text-[#8ab4f8]" />
                Research Playground
              </h4>
              <p className="text-[11px] text-[#9aa0a6] leading-relaxed">
                Test and insert pre-validated state-of-the-art transformer blocks (**BERT**, **GPT**, **ViT**) and graph models (**GraphSAGE**) to accelerate complex neural design workloads.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'canvas-controls',
      category: 'features',
      title: 'Canvas Navigation & Editing',
      icon: Play,
      content: (
        <div className="space-y-4">
          <p className="text-sm text-[#9aa0a6] leading-relaxed">
            The graphical visualizer uses high-performance HTML5 Canvas rasterizer mapping, ensuring 60FPS interaction parameters even on complex, multi-branch graphs with hundreds of nodes.
          </p>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="w-5 h-5 rounded bg-[#3f4046]/80 flex items-center justify-center text-[10px] text-white shrink-0 font-bold font-mono">1</span>
              <div>
                <h5 className="text-xs font-bold text-white">Coordinate Snapping & Grid Alignment</h5>
                <p className="text-[11px] text-[#9aa0a6] mt-0.5 leading-relaxed">Drags snap dynamically onto a 20px grid layout, ensuring crisp layout cleanliness. Align layouts automatically with horizontal and vertical tools inside the bottom toolbar.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-5 h-5 rounded bg-[#3f4046]/80 flex items-center justify-center text-[10px] text-white shrink-0 font-bold font-mono">2</span>
              <div>
                <h5 className="text-xs font-bold text-white">Topological Auto Layout</h5>
                <p className="text-[11px] text-[#9aa0a6] mt-0.5 leading-relaxed">Click the **Auto Layout Sparkle** button to trigger a mathematical topological solver that formats node placements cleanly from inputs to outputs, arranging branches into beautiful parallel lines.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-5 h-5 rounded bg-[#3f4046]/80 flex items-center justify-center text-[10px] text-white shrink-0 font-bold font-mono">3</span>
              <div>
                <h5 className="text-xs font-bold text-white">Checkpoints & Auto-Saving</h5>
                <p className="text-[11px] text-[#9aa0a6] mt-0.5 leading-relaxed">Every structural action is backed up locally. Save custom checkpoints inside the version dropdown, or restore previous node snapshots instantly using the clocked interface.</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'layer-library',
      category: 'layers',
      title: 'Neural Layer Library Reference',
      icon: Layers,
      content: (
        <div className="space-y-4">
          <p className="text-sm text-[#9aa0a6] leading-relaxed">
            Drag-and-drop or select block layers from the left panel to insert them into your current network graph.
          </p>
          <div className="border border-[#3f4046]/45 rounded-2xl overflow-hidden text-left bg-[#1e1f26]">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-[#2b2d31]/50 border-b border-[#3f4046]/45 text-[#9aa0a6] font-bold">
                  <th className="p-3 text-left">Layer Type</th>
                  <th className="p-3 text-left">Primary Parameters</th>
                  <th className="p-3 text-left">Downstream Tensor Formula</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#3f4046]/35 font-medium text-[#e3e3e3]">
                <tr>
                  <td className="p-3 font-mono text-[#8ab4f8] font-bold">Input</td>
                  <td className="p-3">Batch Size, Channels, Height, Width</td>
                  <td className="p-3 text-[#9aa0a6]">Outputs exact dimensions. Starting anchor block.</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono text-[#8ab4f8] font-bold">Conv2D</td>
                  <td className="p-3">Out Channels, Kernel, Stride, Padding</td>
                  <td className="p-3 font-mono text-[#ffe082]">O = ⌊(I - K + 2P)/S⌋ + 1</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono text-[#8ab4f8] font-bold">MaxPool2D</td>
                  <td className="p-3">Kernel Size, Stride, Padding</td>
                  <td className="p-3 font-mono text-[#ffe082]">O = ⌊(I - K + 2P)/S⌋ + 1</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono text-[#8ab4f8] font-bold">Flatten</td>
                  <td className="p-3">None</td>
                  <td className="p-3 font-mono text-[#ffe082]">[C, H, W] → [C × H × W]</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono text-[#8ab4f8] font-bold">Dense (Linear)</td>
                  <td className="p-3">Out Features, Activation Function</td>
                  <td className="p-3 font-mono text-[#ffe082]">[Batch, In] → [Batch, Out]</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )
    },
    {
      id: 'validation-engine',
      category: 'features',
      title: 'Topological & Local Validation',
      icon: ShieldAlert,
      content: (
        <div className="space-y-4">
          <p className="text-sm text-[#9aa0a6] leading-relaxed">
            The workspace houses a high-precision **Local Validation Engine** that executes structural assertion checks across the computational graph in real time, preventing compilation crashes.
          </p>
          <div className="space-y-3.5">
            <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-2xl flex items-start gap-3">
              <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={16} />
              <div>
                <h5 className="text-xs font-bold text-red-300">Dimension Rank Mismatch Error</h5>
                <p className="text-[11px] text-[#9aa0a6] mt-1 leading-relaxed">
                  Convolutional operations (`Conv2D`, `MaxPool2D`) require a 3D input tensor format `[Channels, Height, Width]`. Feeding a 1D vector (e.g. directly after a `Dense` layer without reshaping) generates a flashing red edge line and node validation badge.
                </p>
              </div>
            </div>
            <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex items-start gap-3">
              <AlertCircle className="text-amber-400 shrink-0 mt-0.5" size={16} />
              <div>
                <h5 className="text-xs font-bold text-amber-300">Broadcasting Incompatibility</h5>
                <p className="text-[11px] text-[#9aa0a6] mt-1 leading-relaxed">
                  When merging multi-parent branches (like `Add` or `Concatenate` blocks in residual nets), tensor shapes must align according to NumPy/PyTorch broadcasting conventions. Offending edges glow in dashed orange with detail tooltips.
                </p>
              </div>
            </div>
            <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl flex items-start gap-3">
              <AlertCircle className="text-blue-400 shrink-0 mt-0.5" size={16} />
              <div>
                <h5 className="text-xs font-bold text-blue-300">Topological Cycles</h5>
                <p className="text-[11px] text-[#9aa0a6] mt-1 leading-relaxed">
                  Feedback loops are prohibited in standard feedforward DAG compilation pipelines. Creating a connection that loops back into a preceding layer generates a compile-block alert and immediately halts shape propagation.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'compilers-reference',
      category: 'compilers',
      title: 'Multi-Framework Code Generation',
      icon: Code,
      content: (
        <div className="space-y-4 text-left">
          <p className="text-sm text-[#9aa0a6] leading-relaxed">
            The workspace translates your visual coordinates into high-fidelity, production-ready code blocks across four frameworks.
          </p>
          
          <div className="rounded-2xl border border-[#3f4046]/45 bg-[#17181c] overflow-hidden text-left shadow-xl relative">
            <div className="flex items-center justify-between px-4 py-2 bg-[#202128] border-b border-[#3f4046]/45 text-[10px] uppercase font-black tracking-wider text-[#9aa0a6]">
              <span>PyTorch nn.Module Compilation</span>
              <button 
                onClick={() => handleCopy('torch', samplePyTorchCode)}
                className="flex items-center gap-1 hover:text-white bg-transparent border-none cursor-pointer"
              >
                {copiedTextId === 'torch' ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
                <span>{copiedTextId === 'torch' ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
            <pre className="p-4 overflow-x-auto text-[10.5px] font-mono text-[#e3e3e3] leading-relaxed max-h-56 bg-[#17181c]/80">
              <code>{samplePyTorchCode}</code>
            </pre>
          </div>
        </div>
      )
    },
    {
      id: 'collaboration',
      category: 'infrastructure',
      title: 'Real-Time Sync & Collaboration',
      icon: Activity,
      content: (
        <div className="space-y-4">
          <p className="text-sm text-[#9aa0a6] leading-relaxed">
            Work with other developers in the same editor room instantly. Active synchronization utilizes dedicated WebSocket stream nodes and Redis Pub/Sub channels to sync state without layout latency.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-[#2b2d31]/40 border border-[#3f4046]/45 rounded-2xl text-center">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500 mx-auto mb-2 animate-ping"></div>
              <h5 className="text-[11px] font-bold text-white uppercase tracking-wider">Sync Connected</h5>
              <p className="text-[10px] text-[#9aa0a6] mt-1">Live WebSocket pipeline actively synchronized with collaborators.</p>
            </div>
            <div className="p-4 bg-[#2b2d31]/40 border border-[#3f4046]/45 rounded-2xl text-center">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500 mx-auto mb-2"></div>
              <h5 className="text-[11px] font-bold text-white uppercase tracking-wider">Syncing Reconnect</h5>
              <p className="text-[10px] text-[#9aa0a6] mt-1">Dials back with automatic exponential delay intervals if dropped.</p>
            </div>
            <div className="p-4 bg-[#2b2d31]/40 border border-[#3f4046]/45 rounded-2xl text-center">
              <div className="w-2.5 h-2.5 rounded-full bg-[#9aa0a6] mx-auto mb-2"></div>
              <h5 className="text-[11px] font-bold text-white uppercase tracking-wider">Offline Sandbox</h5>
              <p className="text-[10px] text-[#9aa0a6] mt-1">Local draft buffer coordinates store actions, syncing later when online.</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'timeline-profiler',
      category: 'features',
      title: 'Execution Gantt Profiling',
      icon: Terminal,
      content: (
        <div className="space-y-4">
          <p className="text-sm text-[#9aa0a6] leading-relaxed">
            The **Timeline Tab** inside the bottom console uses FLOP formulas to schedule step propagation in order, giving developers deep latency and bandwidth optimization insights.
          </p>
          <div className="p-4 bg-[#ffe082]/5 border border-[#ffe082]/15 rounded-2xl flex gap-3 items-start">
            <Zap className="text-[#ffe082] shrink-0 mt-0.5 animate-pulse" size={16} />
            <div className="text-xs text-[#ffe082] font-semibold leading-relaxed">
              <strong>Latency Bottleneck Alert:</strong> High-complexity projection weights exceeding **30% of total pass times** (like oversized kernels or Dense features) are flagged in high-visibility Red.
            </div>
          </div>
          <p className="text-xs text-[#9aa0a6] leading-relaxed">
            Hovering over latency bars outlines corresponding nodes in the canvas stage directly, locating hardware bottlenecks immediately.
          </p>
        </div>
      )
    },
    {
      id: 'support',
      category: 'infrastructure',
      title: 'Help Desk & Support Channels',
      icon: ChevronRight,
      content: (
        <div className="space-y-4">
          <p className="text-sm text-[#9aa0a6] leading-relaxed">
            Running into server handshakes failure or need custom workspace capabilities? The ArchNet Support desk is open.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-[#2b2d31]/40 border border-[#3f4046]/45 rounded-2xl">
              <h5 className="text-xs font-bold text-white uppercase tracking-wider mb-1">Developer Slack Channel</h5>
              <p className="text-[10.5px] text-[#9aa0a6] leading-relaxed">Join the conversation on visual deep learning blocks at `#archnet-builders`.</p>
              <a href="#" className="text-xs font-bold text-[#8ab4f8] mt-2 inline-flex items-center gap-1 hover:underline">
                Join Slack Workspace <ArrowUpRight size={12} />
              </a>
            </div>
            <div className="p-4 bg-[#2b2d31]/40 border border-[#3f4046]/45 rounded-2xl">
              <h5 className="text-xs font-bold text-white uppercase tracking-wider mb-1">Github Repository issues</h5>
              <p className="text-[10.5px] text-[#9aa0a6] leading-relaxed">File bugs about PyTorch compiling output or WebSocket collaboration drops.</p>
              <a href="#" className="text-xs font-bold text-[#8ab4f8] mt-2 inline-flex items-center gap-1 hover:underline">
                Open GitHub Issues <ArrowUpRight size={12} />
              </a>
            </div>
          </div>
        </div>
      )
    }
  ];

  const categories = [
    { id: 'getting-started', label: 'Getting Started' },
    { id: 'features', label: 'Platform Features' },
    { id: 'layers', label: 'Layer References' },
    { id: 'compilers', label: 'Model Compilers' },
    { id: 'infrastructure', label: 'Infrastructure & Support' }
  ];

  const filteredSections = sections.filter(sec => 
    sec.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sec.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0a0b10] text-[#e3e3e3] flex font-sans select-none overflow-hidden relative">
      {/* Dynamic ambient grid background */}
      <div className="absolute inset-0 dot-grid opacity-20 z-0 pointer-events-none"></div>
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-[#8ab4f8]/5 blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-[#c5a3ff]/5 blur-[120px] pointer-events-none z-0"></div>

      {/* Docs Left Navigation Sidebar */}
      <aside className="w-72 bg-[#14151a] border-r border-[#3f4046]/45 flex flex-col h-screen z-10 shrink-0">
        <div className="p-6 border-b border-[#3f4046]/45 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#8ab4f8] to-[#c5a3ff] flex items-center justify-center shadow-lg shadow-black/25 flex-shrink-0">
            <span className="font-bold text-[#1e1f22] text-md">M</span>
          </div>
          <div>
            <h1 className="text-md font-black text-white tracking-wide leading-none">ArchNet</h1>
            <span className="text-[9px] font-extrabold text-[#8ab4f8] uppercase tracking-wider">Docs Center</span>
          </div>
        </div>

        {/* Search Panel */}
        <div className="p-4 border-b border-[#3f4046]/35">
          <div className="relative flex items-center">
            <Search size={14} className="absolute left-3 text-[#9aa0a6]" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#1b1c22] border border-[#3f4046]/45 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#8ab4f8] transition-colors"
            />
          </div>
        </div>

        {/* Sidebar Nav anchors */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-4">
          {categories.map(cat => {
            const catSections = filteredSections.filter(sec => sec.category === cat.id);
            if (catSections.length === 0) return null;

            return (
              <div key={cat.id} className="space-y-1">
                <h3 className="text-[10px] font-black text-[#9aa0a6] uppercase tracking-widest pl-2 mb-1.5">{cat.label}</h3>
                {catSections.map(sec => {
                  const Icon = sec.icon;
                  const isActive = activeSection === sec.id;

                  return (
                    <button
                      key={sec.id}
                      onClick={() => {
                        setActiveSection(sec.id);
                        document.getElementById(sec.id)?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-bold transition-all border-none bg-transparent cursor-pointer ${
                        isActive 
                          ? 'bg-[#8ab4f8]/10 text-[#8ab4f8] shadow-sm' 
                          : 'text-[#9aa0a6] hover:bg-[#202128] hover:text-[#e3e3e3]'
                      }`}
                    >
                      <Icon size={14} className={isActive ? 'text-[#8ab4f8]' : 'text-[#9aa0a6]'} />
                      <span className="truncate">{sec.title}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>
      </aside>

      {/* Main Docs Body Container */}
      <main className="flex-1 h-screen overflow-y-auto z-10 flex flex-col items-center">
        {/* Floating Mini Header */}
        <header className="w-full max-w-4xl h-16 border-b border-[#3f4046]/25 flex items-center justify-between px-8 bg-[#0a0b10]/80 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-2 text-xs font-bold text-[#9aa0a6]">
            <span>Guides</span>
            <ChevronRight size={12} />
            <span className="text-[#8ab4f8]">Documentation Reference</span>
          </div>
          <div className="flex items-center gap-4 text-xs font-bold text-[#9aa0a6]">
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-1">
              <span>GitHub</span>
              <ArrowUpRight size={11} />
            </a>
          </div>
        </header>

        {/* Content body wrapper */}
        <div className="w-full max-w-4xl px-8 py-10 space-y-12">
          {filteredSections.map(sec => {
            const Icon = sec.icon;
            
            return (
              <section 
                key={sec.id} 
                id={sec.id}
                className="p-8 bg-[#1e1f26]/40 border border-[#3f4046]/35 rounded-3xl backdrop-blur-xl relative space-y-4 hover:border-[#8ab4f8]/25 transition-all duration-300"
              >
                {/* Visual Accent top border line */}
                <div className="absolute top-0 left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-[#8ab4f8]/20 to-transparent"></div>
                
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-[#8ab4f8]/10 border border-[#8ab4f8]/20 rounded-xl text-[#8ab4f8]">
                    <Icon size={18} />
                  </div>
                  <h2 className="text-lg font-black text-white">{sec.title}</h2>
                </div>

                <div className="border-t border-[#3f4046]/25 pt-4">
                  {sec.content}
                </div>
              </section>
            );
          })}

          {filteredSections.length === 0 && (
            <div className="p-12 text-center bg-[#1e1f26]/30 border border-[#3f4046]/35 rounded-3xl backdrop-blur-xl max-w-md mx-auto mt-16 space-y-3">
              <AlertCircle size={32} className="text-[#ffe082] mx-auto animate-bounce" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">No Documentation Matches</h3>
              <p className="text-xs text-[#9aa0a6] leading-relaxed">
                Could not find any guides matching your search terms. Try searching for **"Conv2D"**, **"Validation"**, or **"Compilation"**.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

const samplePyTorchCode = `import torch
import torch.nn as nn

class ArchNetDAGModel(nn.Module):
    def __init__(self):
        super(ArchNetDAGModel, self).__init__()
        
        # Standard Visual Graph layers
        self.conv1 = nn.Conv2d(in_channels=3, out_channels=32, kernel_size=3, stride=1, padding=1)
        self.relu1 = nn.ReLU()
        self.pool1 = nn.MaxPool2d(kernel_size=2, stride=2)
        
        self.flatten = nn.Flatten()
        self.dense1 = nn.Linear(in_features=32 * 14 * 14, out_features=10)
        self.softmax = nn.LogSoftmax(dim=1)

    def forward(self, x):
        # Topological Sort Forward Pass trace
        x = self.conv1(x)
        x = self.relu1(x)
        x = self.pool1(x)
        x = self.flatten(x)
        x = self.dense1(x)
        x = self.softmax(x)
        return x
`;
