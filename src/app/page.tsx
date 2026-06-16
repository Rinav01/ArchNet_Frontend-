'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useProjectStore } from '@/store/projectStore';
import { Loader2 } from 'lucide-react';
import './landing.css';

// ─── Animated Floating Node Component ──────────────────────────────────────────
const FloatingNode = ({
  x, y, label, color, delay,
}: {
  x: number; y: number; label: string; color: string; delay: number;
}) => (
  <div
    className="landing-floating-node"
    style={{
      left: `${x}%`,
      top: `${y}%`,
      animationDelay: `${delay}s`,
      '--node-color': color,
    } as React.CSSProperties}
  >
    <span className="landing-node-label">{label}</span>
  </div>
);

// ─── Animated SVG Connection Line ───────────────────────────────────────────────
const NodeConnection = ({
  x1, y1, x2, y2, color, delay,
}: {
  x1: number; y1: number; x2: number; y2: number; color: string; delay: number;
}) => (
  <line
    x1={`${x1}%`} y1={`${y1}%`}
    x2={`${x2}%`} y2={`${y2}%`}
    stroke={color}
    strokeWidth="1"
    strokeDasharray="6 4"
    opacity="0.25"
    style={{ animation: `landing-dash 2s linear ${delay}s infinite` }}
  />
);

// ─── Feature Card ───────────────────────────────────────────────────────────────
const FeatureCard = ({
  icon, title, description, accent, delay,
}: {
  icon: React.ReactNode; title: string; description: string; accent: string; delay: number;
}) => (
  <div className="landing-feature-card" style={{ animationDelay: `${delay}s`, '--accent': accent } as React.CSSProperties}>
    <div className="landing-feature-icon" style={{ color: accent, borderColor: `${accent}30`, background: `${accent}12` }}>
      {icon}
    </div>
    <h3 className="landing-feature-title">{title}</h3>
    <p className="landing-feature-desc">{description}</p>
    <div className="landing-feature-line" style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }} />
  </div>
);

// ─── Stat Counter ───────────────────────────────────────────────────────────────
const StatCounter = ({ value, label, accent }: { value: string; label: string; accent: string }) => (
  <div className="landing-stat">
    <span className="landing-stat-value" style={{ color: accent }}>{value}</span>
    <span className="landing-stat-label">{label}</span>
  </div>
);

// ─── Framework Badge ────────────────────────────────────────────────────────────
const FrameworkBadge = ({ name, color, icon }: { name: string; color: string; icon: string }) => (
  <div className="landing-fw-badge" style={{ borderColor: `${color}30`, background: `${color}10` }}>
    <span style={{ fontSize: 20 }}>{icon}</span>
    <span style={{ color, fontWeight: 700, fontSize: 13 }}>{name}</span>
  </div>
);

// ─── Mini Canvas Preview ─────────────────────────────────────────────────────────
const MiniCanvas = () => {
  const nodes = [
    { id: 'input', x: 8, y: 44, label: 'Input\n[224,224,3]', color: '#9aa0a6' },
    { id: 'conv1', x: 28, y: 20, label: 'Conv2D\n(64)', color: '#8ab4f8' },
    { id: 'pool1', x: 28, y: 68, label: 'MaxPool\n2×2', color: '#80cbc4' },
    { id: 'bn',    x: 50, y: 44, label: 'BatchNorm', color: '#c5a3ff' },
    { id: 'conv2', x: 70, y: 20, label: 'Conv2D\n(128)', color: '#8ab4f8' },
    { id: 'drop',  x: 70, y: 68, label: 'Dropout\n0.3', color: '#ffe082' },
    { id: 'flat',  x: 88, y: 44, label: 'Dense\n(10)', color: '#f28b82' },
  ];
  const edges = [
    { from: 'input', to: 'conv1', color: '#8ab4f8' },
    { from: 'input', to: 'pool1', color: '#80cbc4' },
    { from: 'conv1', to: 'bn', color: '#8ab4f8' },
    { from: 'pool1', to: 'bn', color: '#80cbc4' },
    { from: 'bn', to: 'conv2', color: '#c5a3ff' },
    { from: 'bn', to: 'drop', color: '#c5a3ff' },
    { from: 'conv2', to: 'flat', color: '#8ab4f8' },
    { from: 'drop', to: 'flat', color: '#ffe082' },
  ];
  const getNode = (id: string) => nodes.find(n => n.id === id)!;

  return (
    <div className="mini-canvas">
      <div className="mini-canvas-toolbar">
        <span className="mini-canvas-dot" style={{ background: '#f28b82' }} />
        <span className="mini-canvas-dot" style={{ background: '#ffe082' }} />
        <span className="mini-canvas-dot" style={{ background: '#81c784' }} />
        <span style={{ color: '#5f6368', fontSize: 11, marginLeft: 8, fontFamily: 'monospace' }}>
          MLBuilder — ResNet-Mini.mlb
        </span>
      </div>
      <div className="mini-canvas-body">
        <svg className="mini-canvas-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <radialGradient id="gridGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#8ab4f8" stopOpacity="0.03" />
              <stop offset="100%" stopColor="#8ab4f8" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="100" height="100" fill="url(#gridGlow)" />
          {/* grid dots */}
          {Array.from({ length: 8 }).map((_, i) =>
            Array.from({ length: 6 }).map((_, j) => (
              <circle key={`${i}-${j}`} cx={i * 14.5 + 2} cy={j * 20 + 2} r="0.5" fill="rgba(255,255,255,0.06)" />
            ))
          )}
          {/* edges */}
          {edges.map((e, i) => {
            const from = getNode(e.from);
            const to = getNode(e.to);
            const mx = (from.x + to.x) / 2;
            return (
              <path
                key={i}
                d={`M ${from.x} ${from.y} C ${mx} ${from.y}, ${mx} ${to.y}, ${to.x} ${to.y}`}
                stroke={e.color}
                strokeWidth="0.8"
                fill="none"
                opacity="0.45"
                strokeDasharray="3 2"
                style={{ animation: `landing-dash ${1.5 + i * 0.2}s linear infinite` }}
              />
            );
          })}
        </svg>
        {/* nodes */}
        {nodes.map((node) => (
          <div
            key={node.id}
            className="mini-canvas-node"
            style={{
              left: `${node.x}%`,
              top: `${node.y}%`,
              borderColor: `${node.color}50`,
              background: `${node.color}12`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            {node.label.split('\n').map((l, i) => (
              <span key={i} style={{ color: i === 0 ? node.color : '#9aa0a6', fontWeight: i === 0 ? 700 : 500 }}>
                {l}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Code Preview Panel ──────────────────────────────────────────────────────────
const CodePreview = () => {
  const lines = [
    { text: 'class GeneratedModel(nn.Module):', color: '#c5a3ff' },
    { text: '    def __init__(self):', color: '#e3e3e3' },
    { text: '        super().__init__()', color: '#9aa0a6' },
    { text: '        self.conv1 = nn.Conv2d(3, 64, 3)', color: '#8ab4f8' },
    { text: '        self.bn1   = nn.BatchNorm2d(64)', color: '#80cbc4' },
    { text: '        self.pool  = nn.MaxPool2d(2, 2)', color: '#80cbc4' },
    { text: '        self.conv2 = nn.Conv2d(64, 128, 3)', color: '#8ab4f8' },
    { text: '        self.drop  = nn.Dropout(0.3)', color: '#ffe082' },
    { text: '        self.fc    = nn.Linear(128, 10)', color: '#f28b82' },
    { text: '', color: '' },
    { text: '    def forward(self, x):', color: '#e3e3e3' },
    { text: '        x = F.relu(self.bn1(self.conv1(x)))', color: '#9aa0a6' },
    { text: '        x = self.pool(x)', color: '#9aa0a6' },
    { text: '        x = F.relu(self.conv2(x))', color: '#9aa0a6' },
    { text: '        x = self.drop(x)', color: '#9aa0a6' },
    { text: '        return self.fc(x)', color: '#81c784' },
  ];

  return (
    <div className="code-preview">
      <div className="code-preview-header">
        <span className="code-tag">PyTorch</span>
        <span className="code-tag" style={{ color: '#80cbc4', borderColor: '#80cbc430', background: '#80cbc410' }}>TensorFlow</span>
        <span className="code-tag" style={{ color: '#c5a3ff', borderColor: '#c5a3ff30', background: '#c5a3ff10' }}>JAX/Flax</span>
        <span className="code-tag" style={{ color: '#ffe082', borderColor: '#ffe08230', background: '#ffe08210' }}>ONNX</span>
      </div>
      <div className="code-preview-body">
        {lines.map((line, i) => (
          <div key={i} className="code-line">
            <span className="code-lineno">{i + 1}</span>
            <span style={{ color: line.color || 'transparent', fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre' }}>
              {line.text || ' '}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Telemetry Chart ─────────────────────────────────────────────────────────────
const TelemetryChart = () => {
  const [epoch, setEpoch] = useState(0);
  const lossData = [0.92, 0.76, 0.61, 0.49, 0.41, 0.35, 0.29, 0.24, 0.20, 0.17, 0.14, 0.12, 0.10, 0.09, 0.08, 0.07, 0.065, 0.06, 0.055, 0.052];
  const accData  = [0.41, 0.58, 0.67, 0.74, 0.79, 0.83, 0.86, 0.88, 0.90, 0.91, 0.92, 0.93, 0.935, 0.94, 0.943, 0.947, 0.95, 0.952, 0.954, 0.956];

  useEffect(() => {
    const id = setInterval(() => setEpoch(e => (e + 1) % 20), 700);
    return () => clearInterval(id);
  }, []);

  const W = 260, H = 90;
  const toX = (i: number) => (i / 19) * W;
  const lossPath = lossData.slice(0, epoch + 1).map((v, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${H - v * H * 0.9}`).join(' ');
  const accPath  = accData.slice(0, epoch + 1).map((v, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${H - v * H * 0.9}`).join(' ');

  return (
    <div className="telemetry-card">
      <div className="telemetry-header">
        <div>
          <div className="telemetry-title">Training Monitor</div>
          <div className="telemetry-subtitle">Epoch {epoch + 1} / 20 — Live WebSocket</div>
        </div>
        <div className="telemetry-live">
          <span className="telemetry-dot" />
          LIVE
        </div>
      </div>
      <svg width={W} height={H} style={{ overflow: 'visible' }}>
        {/* grid lines */}
        {[0.25, 0.5, 0.75, 1].map(v => (
          <line key={v} x1={0} y1={H - v * H * 0.9} x2={W} y2={H - v * H * 0.9} stroke="#3f4046" strokeWidth="0.5" />
        ))}
        {epoch > 0 && (
          <>
            <path d={lossPath} fill="none" stroke="#f28b82" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d={accPath} fill="none" stroke="#81c784" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}
        {epoch > 0 && (
          <>
            <circle cx={toX(epoch)} cy={H - lossData[epoch] * H * 0.9} r={3} fill="#f28b82" />
            <circle cx={toX(epoch)} cy={H - accData[epoch] * H * 0.9} r={3} fill="#81c784" />
          </>
        )}
      </svg>
      <div className="telemetry-legend">
        <span style={{ color: '#f28b82' }}>● Loss: {lossData[epoch].toFixed(3)}</span>
        <span style={{ color: '#81c784' }}>● Acc: {(accData[epoch] * 100).toFixed(1)}%</span>
      </div>
    </div>
  );
};

// ─── Main Landing Page ──────────────────────────────────────────────────────────
export default function LandingPage() {
  const router = useRouter();
  const { loadProjects } = useProjectStore();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  const heroRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('mlbuilder_token') : null;
    if (token) {
      setIsAuthenticated(true);
      
      const handleRedirect = async () => {
        await loadProjects();
        const latestProjects = useProjectStore.getState().projects;

        if (latestProjects.length === 0) {
          router.replace('/onboarding');
          return;
        }

        const lastVisitedProjectId = localStorage.getItem('lastVisitedProjectId');
        const lastVisitedPage = localStorage.getItem('lastVisitedPage');

        // Check if lastVisitedProjectId exists and is still valid
        const projectExists = latestProjects.some(p => p.id === lastVisitedProjectId);

        if (lastVisitedProjectId && projectExists) {
          router.replace(`/editor/${lastVisitedProjectId}`);
        } else if (lastVisitedPage && lastVisitedPage !== '/' && lastVisitedPage !== '/login') {
          router.replace(lastVisitedPage);
        } else {
          router.replace('/dashboard');
        }
      };

      handleRedirect();
    } else {
      setIsAuthenticated(false);
      
      const onScroll = () => setScrollY(window.scrollY);
      window.addEventListener('scroll', onScroll, { passive: true });
      setTimeout(() => setVisible(true), 100);
      return () => window.removeEventListener('scroll', onScroll);
    }
  }, [loadProjects, router]);

  // Render a minimal premium loader if redirecting
  if (isAuthenticated === null || isAuthenticated === true) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#0a0b10] text-[#e3e3e3] font-sans">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-[#8ab4f8] animate-spin" />
          <span className="text-xs font-semibold text-[#9aa0a6] tracking-wider uppercase">Restoring Session Handshake...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="landing-root">

      {/* ── NAV ───────────────────────────────────────────────────────────────── */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-logo">
            <div className="landing-logo-icon">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="3" r="2.2" fill="#8ab4f8" />
                <circle cx="3" cy="14" r="2.2" fill="#c5a3ff" />
                <circle cx="17" cy="14" r="2.2" fill="#80cbc4" />
                <line x1="10" y1="5" x2="3" y2="12" stroke="#8ab4f8" strokeWidth="1.2" opacity="0.6" />
                <line x1="10" y1="5" x2="17" y2="12" stroke="#8ab4f8" strokeWidth="1.2" opacity="0.6" />
                <line x1="3" y1="14" x2="17" y2="14" stroke="#3f4046" strokeWidth="1.2" opacity="0.5" />
              </svg>
            </div>
            <span className="landing-logo-text">ML<span style={{ color: '#8ab4f8' }}>Builder</span></span>
          </div>
          <div className="landing-nav-links">
            <a href="#features">Features</a>
            <a href="#frameworks">Frameworks</a>
            <a href="#demo">Demo</a>
            <a href="#telemetry">Telemetry</a>
          </div>
          <div className="landing-nav-actions">
            <Link href="/login" className="landing-btn-ghost">Sign In</Link>
            <Link href="/dashboard" className="landing-btn-primary">Launch App →</Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ──────────────────────────────────────────────────────────────── */}
      <section className="landing-hero" ref={heroRef}>
        {/* Background animated node graph */}
        <div className="hero-bg-canvas" style={{ transform: `translateY(${scrollY * 0.15}px)` }}>
          <svg className="hero-bg-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
            <NodeConnection x1={12} y1={20} x2={35} y2={40} color="#8ab4f8" delay={0} />
            <NodeConnection x1={35} y1={40} x2={60} y2={25} color="#c5a3ff" delay={0.3} />
            <NodeConnection x1={60} y1={25} x2={82} y2={50} color="#80cbc4" delay={0.6} />
            <NodeConnection x1={20} y1={70} x2={50} y2={55} color="#ffe082" delay={0.9} />
            <NodeConnection x1={50} y1={55} x2={75} y2={75} color="#f28b82" delay={1.2} />
            <NodeConnection x1={35} y1={40} x2={50} y2={55} color="#8ab4f8" delay={0.4} />
            <NodeConnection x1={60} y1={25} x2={50} y2={55} color="#c5a3ff" delay={0.7} />
          </svg>
          <FloatingNode x={10} y={18} label="Input" color="#9aa0a6" delay={0} />
          <FloatingNode x={33} y={38} label="Conv2D" color="#8ab4f8" delay={0.2} />
          <FloatingNode x={58} y={22} label="BatchNorm" color="#c5a3ff" delay={0.5} />
          <FloatingNode x={80} y={48} label="Dense" color="#80cbc4" delay={0.8} />
          <FloatingNode x={18} y={68} label="Dropout" color="#ffe082" delay={1.0} />
          <FloatingNode x={48} y={53} label="MaxPool" color="#f28b82" delay={0.3} />
          <FloatingNode x={73} y={73} label="Softmax" color="#81c784" delay={0.6} />
        </div>

        {/* Gradient overlay */}
        <div className="hero-overlay" />

        {/* Hero Content */}
        <div className={`hero-content ${visible ? 'hero-visible' : ''}`}>
          <div className="hero-badge">
            <span className="hero-badge-dot" />
            Enterprise Neural Architecture Platform
          </div>
          <h1 className="hero-title">
            Design Deep Learning<br />
            <span className="hero-title-accent">Architectures Visually</span>
          </h1>
          <p className="hero-subtitle">
            MLBuilder is the industry-grade visual workspace for designing, validating, and compiling
            neural networks to <strong>PyTorch</strong>, <strong>TensorFlow</strong>, <strong>JAX</strong>, and <strong>ONNX</strong> —
            with real-time tensor shape solving and live training telemetry.
          </p>
          <div className="hero-actions">
            <Link href="/dashboard" id="hero-launch-btn" className="landing-btn-primary landing-btn-lg">
              Open Workspace →
            </Link>
            <a href="#demo" className="landing-btn-ghost landing-btn-lg">
              See Demo
            </a>
          </div>

          {/* Stats row */}
          <div className="hero-stats">
            <StatCounter value="4+" label="Frameworks" accent="#8ab4f8" />
            <div className="hero-stat-divider" />
            <StatCounter value="∞" label="Param Layers" accent="#c5a3ff" />
            <div className="hero-stat-divider" />
            <StatCounter value="Real-time" label="Tensor Solver" accent="#80cbc4" />
            <div className="hero-stat-divider" />
            <StatCounter value="WebSocket" label="Live Training" accent="#81c784" />
          </div>
        </div>
      </section>

      {/* ── CANVAS DEMO ───────────────────────────────────────────────────────── */}
      <section id="demo" className="landing-section">
        <div className="landing-section-inner">
          <div className="section-label">Interactive Canvas</div>
          <h2 className="section-title">
            Node-based Architecture<br />
            <span style={{ color: '#8ab4f8' }}>Design & Compilation</span>
          </h2>
          <p className="section-subtitle">
            Drag-and-drop layers, connect ports with bezier linkages, and watch tensor shapes propagate downstream
            in real-time. Compile any graph to production-ready Python in one click.
          </p>
          <div className="demo-split">
            <div className="demo-left">
              <MiniCanvas />
              <div className="demo-canvas-tags">
                <span className="demo-tag" style={{ color: '#8ab4f8', borderColor: '#8ab4f815', background: '#8ab4f808' }}>Bezier Connections</span>
                <span className="demo-tag" style={{ color: '#c5a3ff', borderColor: '#c5a3ff15', background: '#c5a3ff08' }}>Multi-select</span>
                <span className="demo-tag" style={{ color: '#80cbc4', borderColor: '#80cbc415', background: '#80cbc408' }}>Drag & Drop</span>
                <span className="demo-tag" style={{ color: '#ffe082', borderColor: '#ffe08215', background: '#ffe08208' }}>Zoom & Pan</span>
              </div>
            </div>
            <div className="demo-right">
              <div className="demo-info-title">Topological Shape Solver</div>
              <p className="demo-info-desc">
                Every connection automatically validates tensor rank compatibility and propagates output shapes
                downstream from your input parameters — no manual calculation needed.
              </p>
              <div className="demo-shape-cards">
                {[
                  { layer: 'Input', shape: '[224, 224, 3]', color: '#9aa0a6' },
                  { layer: 'Conv2D (64, k=3)', shape: '[224, 224, 64]', color: '#8ab4f8' },
                  { layer: 'MaxPool2D (2)', shape: '[112, 112, 64]', color: '#80cbc4' },
                  { layer: 'Flatten', shape: '[802,816]', color: '#c5a3ff' },
                  { layer: 'Dense (10)', shape: '[10]', color: '#f28b82' },
                ].map((s, i) => (
                  <div key={i} className="shape-card" style={{ borderColor: `${s.color}25` }}>
                    <span style={{ color: s.color, fontWeight: 700, fontSize: 12 }}>{s.layer}</span>
                    <span className="shape-arrow">→</span>
                    <code style={{ color: '#e3e3e3', fontFamily: 'monospace', fontSize: 11, background: '#1e1f22', padding: '2px 8px', borderRadius: 6 }}>
                      {s.shape}
                    </code>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────────────────────── */}
      <section id="features" className="landing-section landing-section-alt">
        <div className="landing-section-inner">
          <div className="section-label">Core Capabilities</div>
          <h2 className="section-title">
            Everything you need to build<br />
            <span style={{ color: '#c5a3ff' }}>production ML systems</span>
          </h2>
          <div className="features-grid">
            <FeatureCard
              icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><line x1="7" y1="7" x2="14" y2="14"/><line x1="17" y1="7" x2="14" y2="14"/></svg>}
              title="Visual Node Editor"
              description="High-performance Konva.js canvas with drag, drop, multi-select, bezier linkages, and group operations for complex multi-branch architectures."
              accent="#8ab4f8"
              delay={0}
            />
            <FeatureCard
              icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/></svg>}
              title="AutoML Copilot"
              description="AST-level diagnostic scanner that detects cycle loops, disconnected nodes, rank conflicts, and anti-patterns — with auto-fix capabilities."
              accent="#ffe082"
              delay={0.1}
            />
            <FeatureCard
              icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>}
              title="Multi-Framework Compiler"
              description="One-click compilation to clean production-grade Python classes for PyTorch, TensorFlow, Flax/JAX, and ONNX binary export."
              accent="#80cbc4"
              delay={0.2}
            />
            <FeatureCard
              icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>}
              title="Live Training Telemetry"
              description="WebSocket-connected real-time training monitor plotting loss and accuracy curves per epoch with full experiment history tracking."
              accent="#81c784"
              delay={0.3}
            />
            <FeatureCard
              icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>}
              title="Shape Propagation Engine"
              description="Topological sort solver that automatically computes and validates tensor shapes downstream from any input configuration in real-time."
              accent="#c5a3ff"
              delay={0.4}
            />
            <FeatureCard
              icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>}
              title="Dataset Manager"
              description="Drag-and-drop CSV/ZIP ingestion with tabular preview, Celery async processing, and database status tracking for training pipelines."
              accent="#f28b82"
              delay={0.5}
            />
          </div>
        </div>
      </section>

      {/* ── CODE COMPILER SECTION ─────────────────────────────────────────────── */}
      <section className="landing-section">
        <div className="landing-section-inner">
          <div className="section-label">Code Generation</div>
          <h2 className="section-title">
            Canvas to Code —<br />
            <span style={{ color: '#80cbc4' }}>Instantly Compiled</span>
          </h2>
          <p className="section-subtitle">
            Every architectural decision you make on the visual canvas is instantly reflected as
            clean, type-checked Python. Export to any major ML framework without writing a single line of boilerplate.
          </p>
          <div className="compiler-split">
            <div className="compiler-left">
              <CodePreview />
            </div>
            <div className="compiler-right">
              <div className="compiler-info-title">Production-Grade Output</div>
              <p className="compiler-info-desc">
                Generated code follows framework conventions — subclassing <code>nn.Module</code>, 
                correctly calling <code>super().__init__()</code>, and organizing layers exactly
                as experienced ML engineers would write them.
              </p>
              <div className="compiler-checks">
                {[
                  { label: 'PyTorch nn.Module standard', color: '#8ab4f8' },
                  { label: 'TensorFlow Keras Model API', color: '#ffe082' },
                  { label: 'JAX/Flax Linen module', color: '#80cbc4' },
                  { label: 'ONNX binary export format', color: '#c5a3ff' },
                  { label: 'Type annotations included', color: '#81c784' },
                  { label: 'Zero boilerplate required', color: '#f28b82' },
                ].map((c, i) => (
                  <div key={i} className="compiler-check">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <circle cx="7" cy="7" r="6.5" fill={`${c.color}18`} stroke={`${c.color}50`} />
                      <path d="M4 7l2 2 4-4" stroke={c.color} strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    <span style={{ color: '#9aa0a6', fontSize: 13 }}>{c.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FRAMEWORKS ────────────────────────────────────────────────────────── */}
      <section id="frameworks" className="landing-section landing-section-alt">
        <div className="landing-section-inner" style={{ textAlign: 'center' }}>
          <div className="section-label">Supported Frameworks</div>
          <h2 className="section-title">
            Compile Once,<br />
            <span style={{ color: '#ffe082' }}>Deploy Anywhere</span>
          </h2>
          <p className="section-subtitle" style={{ maxWidth: 540, margin: '0 auto 48px' }}>
            MLBuilder's compiler targets all major production ML frameworks,
            giving you the freedom to switch runtimes without redesigning your architecture.
          </p>
          <div className="frameworks-row">
            <FrameworkBadge name="PyTorch" color="#8ab4f8" icon="🔥" />
            <FrameworkBadge name="TensorFlow" color="#ffe082" icon="🌊" />
            <FrameworkBadge name="JAX / Flax" color="#80cbc4" icon="⚡" />
            <FrameworkBadge name="ONNX" color="#c5a3ff" icon="🔗" />
          </div>
        </div>
      </section>

      {/* ── TELEMETRY ─────────────────────────────────────────────────────────── */}
      <section id="telemetry" className="landing-section">
        <div className="landing-section-inner">
          <div className="section-label">Training Monitor</div>
          <h2 className="section-title">
            Real-Time Telemetry<br />
            <span style={{ color: '#81c784' }}>via WebSockets</span>
          </h2>
          <p className="section-subtitle">
            Connect to a live training run and watch loss curves and accuracy metrics update in real-time.
            Track every epoch, compare experiments, and diagnose training anomalies instantly.
          </p>
          <div className="telemetry-split">
            <div>
              <TelemetryChart />
            </div>
            <div className="telemetry-info">
              <div className="telemetry-info-item">
                <div className="telemetry-info-dot" style={{ background: '#81c784' }} />
                <div>
                  <div className="telemetry-info-label">Validation Accuracy</div>
                  <div className="telemetry-info-value">Real-time per-epoch update</div>
                </div>
              </div>
              <div className="telemetry-info-item">
                <div className="telemetry-info-dot" style={{ background: '#f28b82' }} />
                <div>
                  <div className="telemetry-info-label">Training Loss</div>
                  <div className="telemetry-info-value">Cross-entropy curve tracking</div>
                </div>
              </div>
              <div className="telemetry-info-item">
                <div className="telemetry-info-dot" style={{ background: '#8ab4f8' }} />
                <div>
                  <div className="telemetry-info-label">WebSocket Protocol</div>
                  <div className="telemetry-info-value">FastAPI + Celery integration</div>
                </div>
              </div>
              <div className="telemetry-info-item">
                <div className="telemetry-info-dot" style={{ background: '#c5a3ff' }} />
                <div>
                  <div className="telemetry-info-label">Experiment History</div>
                  <div className="telemetry-info-value">Full run comparison &amp; archiving</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── DIAGNOSTIC CENTER ─────────────────────────────────────────────────── */}
      <section className="landing-section landing-section-alt">
        <div className="landing-section-inner">
          <div className="section-label">Diagnostic Center</div>
          <h2 className="section-title">
            AutoML Copilot that<br />
            <span style={{ color: '#ffe082' }}>catches every bug</span>
          </h2>
          <div className="diagnostics-grid">
            {[
              { type: 'Error', label: 'Loop Cycle Detected', desc: 'DFS-based cycle detection with auto edge removal', color: '#f28b82', icon: '🔄' },
              { type: 'Warning', label: 'Disconnected Layer', desc: 'Reachability trace with smart auto-reconnection', color: '#ffe082', icon: '⚠️' },
              { type: 'Error', label: 'Rank Conflict', desc: 'Auto-inserts Flatten node between incompatible layers', color: '#f28b82', icon: '📐' },
              { type: 'Suggestion', label: 'Missing Activation', desc: 'Detects Conv2D without activation, auto-applies ReLU', color: '#8ab4f8', icon: '⚡' },
              { type: 'Info', label: 'Non-Standard Input', desc: 'Suggests standard 224×224×3 image input dimensions', color: '#80cbc4', icon: 'ℹ️' },
              { type: 'Suggestion', label: 'Parameter Explosion', desc: 'Flags >500K dense parameters and suggests reduction', color: '#c5a3ff', icon: '💡' },
            ].map((d, i) => (
              <div key={i} className="diagnostic-card" style={{ animationDelay: `${i * 0.08}s` }}>
                <div className="diag-header">
                  <span className="diag-type" style={{ color: d.color, borderColor: `${d.color}30`, background: `${d.color}12` }}>
                    {d.type}
                  </span>
                  <span style={{ fontSize: 18 }}>{d.icon}</span>
                </div>
                <div className="diag-label">{d.label}</div>
                <div className="diag-desc">{d.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────────── */}
      <section className="landing-cta">
        <div className="cta-glow-left" />
        <div className="cta-glow-right" />
        <div className="cta-content">
          <div className="section-label" style={{ marginBottom: 20 }}>Get Started Today</div>
          <h2 className="cta-title">
            Build your first neural<br />architecture in minutes
          </h2>
          <p className="cta-subtitle">
            No code required to start. Design visually, validate automatically, compile instantly.
            The full power of deep learning, without the boilerplate.
          </p>
          <div className="hero-actions" style={{ marginTop: 40 }}>
            <Link href="/dashboard" id="cta-launch-btn" className="landing-btn-primary landing-btn-xl">
              Open MLBuilder →
            </Link>
            <Link href="/docs" className="landing-btn-ghost landing-btn-lg">
              Read the Docs
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────────────── */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-logo">
            <div className="landing-logo-icon">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="3" r="2.2" fill="#8ab4f8" />
                <circle cx="3" cy="14" r="2.2" fill="#c5a3ff" />
                <circle cx="17" cy="14" r="2.2" fill="#80cbc4" />
                <line x1="10" y1="5" x2="3" y2="12" stroke="#8ab4f8" strokeWidth="1.2" opacity="0.6" />
                <line x1="10" y1="5" x2="17" y2="12" stroke="#8ab4f8" strokeWidth="1.2" opacity="0.6" />
              </svg>
            </div>
            <span style={{ color: '#5f6368', fontSize: 13 }}>MLBuilder © 2026 — Enterprise Neural Architecture Platform</span>
          </div>
          <div className="footer-links">
            <Link href="/dashboard">App</Link>
            <Link href="/docs">Docs</Link>
            <Link href="/datasets">Datasets</Link>
            <Link href="/settings">Settings</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
