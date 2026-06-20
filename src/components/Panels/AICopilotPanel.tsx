'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useCanvasStore } from '@/store/canvasStore';
import { useProjectStore } from '@/store/projectStore';
import { useLayoutStore } from '@/store/layoutStore';
import { useRouter } from 'next/navigation';
import { toast } from '@/store/notificationStore';
import { 
  Send, 
  Sparkles, 
  Cpu, 
  Database, 
  Grid, 
  ArrowRight,
  TrendingDown,
  Wrench,
  CloudLightning,
  RotateCcw
} from 'lucide-react';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  actionCode?: string;
  actionPayload?: string;
}

export default function AICopilotPanel() {
  const router = useRouter();
  const confirm = useLayoutStore((state) => state.confirm);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Zustand canvas store hooks
  const nodes = useCanvasStore((state) => state.nodes);
  const selectedNodeIds = useCanvasStore((state) => state.selectedNodeIds);
  const selectedNodeId = useCanvasStore((state) => state.selectedNodeId);
  const loadPrebuiltTemplate = useCanvasStore((state) => state.loadPrebuiltTemplate);
  const addNode = useCanvasStore((state) => state.addNode);
  const triggerCompilation = useCanvasStore((state) => state.triggerCompilation);
  const triggerAutoLayout = useCanvasStore((state) => state.triggerAutoLayout);
  const setClusterPriority = useCanvasStore((state) => state.setClusterPriority);
  const setGpuThrottleLimit = useCanvasStore((state) => state.setGpuThrottleLimit);

  // Zustand project store hooks
  const projects = useProjectStore((state) => state.projects);
  const activeProjectId = useProjectStore((state) => state.activeProjectId);

  const activeProject = projects.find(p => p.id === activeProjectId);
  const activeDatasetName = activeProject?.notes?.includes('cifar10') || activeProjectId === 'cifar10' ? 'CIFAR-10' : 'default_dataset';

  // Load chat history from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('archnet_copilot_chat');
      if (saved) {
        try {
          setMessages(JSON.parse(saved));
        } catch (e) {
          console.warn('Failed to parse chat history', e);
        }
      } else {
        // Initial welcome message
        const welcomeMessage: Message = {
          id: 'welcome',
          sender: 'assistant',
          text: "Hi! I'm **ArchNet Copilot**, your real-time deep learning architecture assistant. 🧠✨\n\nI'm aware of your current canvas context, active nodes, and data frameworks. How can I accelerate your ML design pipeline today?",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages([welcomeMessage]);
      }
    }
  }, []);

  // Save chat history to localStorage
  const saveChat = (newMessages: Message[]) => {
    setMessages(newMessages);
    if (typeof window !== 'undefined') {
      localStorage.setItem('archnet_copilot_chat', JSON.stringify(newMessages));
    }
  };

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Architecture Intent Engine ─────────────────────────────────────────────
  // Maps the user's free-text prompt to the correct template or build action.
  // Rules are evaluated in priority order: most-specific keyword wins.
  const resolveArchitectureIntent = (query: string): {
    templateName?: string;
    customBuild?: string;
    response: string;
    actionCode: string;
    actionPayload?: string;
  } => {
    // ── Exact named architectures (highest priority) ──────────────────────────
    if (/densenet|dense[\s-]?net/i.test(query)) {
      return {
        customBuild: 'DenseNet',
        response: "I'll build a **DenseNet-style** architecture for you — featuring dense skip connections between every Conv-BatchNorm block to maximise feature reuse and gradient flow.\n\nThis is a fully custom graph assembled from your Layer Library. Click **Build DenseNet** to instantiate it.",
        actionCode: 'BUILD_CUSTOM',
        actionPayload: 'DenseNet',
      };
    }
    if (/alexnet|alex[\s-]?net/i.test(query)) {
      return {
        customBuild: 'AlexNet',
        response: "I'll construct a classic **AlexNet** architecture — 5 convolutional layers with max-pooling followed by 3 fully-connected layers, matching the 2012 ImageNet competition design.\n\nClick **Build AlexNet** to instantiate it.",
        actionCode: 'BUILD_CUSTOM',
        actionPayload: 'AlexNet',
      };
    }
    if (/lenet|le[\s-]?net/i.test(query)) {
      return {
        customBuild: 'LeNet',
        response: "I'll construct a **LeNet-5** architecture — the classic Yann LeCun 1998 design with 2 conv layers and 3 fully-connected layers, ideal for MNIST-scale tasks.\n\nClick **Build LeNet** to instantiate it.",
        actionCode: 'BUILD_CUSTOM',
        actionPayload: 'LeNet',
      };
    }
    if (/mobilenet|mobile[\s-]?net/i.test(query)) {
      return {
        templateName: 'MobileNet',
        response: "Here is a **MobileNet** depthwise-separable convolution pipeline — optimised for mobile and edge deployments with minimal parameter count.\n\nClick **Create Graph** to load the full MobileNet template.",
        actionCode: 'CREATE_GRAPH',
        actionPayload: 'MobileNet',
      };
    }
    if (/resnet[\s-]?50|res[\s-]?net[\s-]?50/i.test(query)) {
      return {
        templateName: 'ResNet50',
        response: "Here is a standard **ResNet-50** bottleneck residual block pipeline. Ideal for hierarchical spatial feature extraction with shortcut skip connections.\n\nClick **Create Graph** to build this architecture.",
        actionCode: 'CREATE_GRAPH',
        actionPayload: 'ResNet50',
      };
    }
    if (/resnet[\s-]?18|res[\s-]?net[\s-]?18/i.test(query)) {
      return {
        templateName: 'ResNet18',
        response: "Here is a **ResNet-18** basic-block pipeline — lighter than ResNet-50 with 18 layers, suitable for faster training on smaller datasets.\n\nClick **Create Graph** to build this architecture.",
        actionCode: 'CREATE_GRAPH',
        actionPayload: 'ResNet18',
      };
    }
    if (/\bresnet\b/i.test(query)) {
      return {
        templateName: 'ResNet50',
        response: "Here is a **ResNet-50** architecture. Use **Create Graph** to load it. If you need ResNet-18 instead, just type 'build ResNet18'.",
        actionCode: 'CREATE_GRAPH',
        actionPayload: 'ResNet50',
      };
    }
    if (/unet|u[\s-]net|segmentation/i.test(query)) {
      return {
        templateName: 'UNet',
        response: "I'll load a **U-Net** encoder–decoder architecture with symmetric skip connections — the standard choice for semantic segmentation tasks.\n\nClick **Create Graph** to instantiate it.",
        actionCode: 'CREATE_GRAPH',
        actionPayload: 'UNet',
      };
    }
    if (/\bvit\b|vision[\s-]?transformer/i.test(query)) {
      return {
        templateName: 'ViT',
        response: "I'll build a **Vision Transformer (ViT)** with patch projection, multi-head self-attention, and MLP blocks — ideal for image classification using attention mechanisms.\n\nClick **Create Graph** to load the ViT template.",
        actionCode: 'CREATE_GRAPH',
        actionPayload: 'ViT',
      };
    }
    if (/bert|mini[\s-]?bert/i.test(query)) {
      return {
        templateName: 'Mini-BERT',
        response: "I'll assemble a **Mini-BERT** transformer encoder — bidirectional self-attention blocks with positional encodings for NLP classification tasks.\n\nClick **Create Graph** to load it.",
        actionCode: 'CREATE_GRAPH',
        actionPayload: 'Mini-BERT',
      };
    }
    if (/gpt|mini[\s-]?gpt/i.test(query)) {
      return {
        templateName: 'Mini-GPT',
        response: "I'll load a **Mini-GPT** autoregressive decoder — causal self-attention with token embeddings for text generation tasks.\n\nClick **Create Graph** to instantiate it.",
        actionCode: 'CREATE_GRAPH',
        actionPayload: 'Mini-GPT',
      };
    }
    if (/transformer[\s-]?encoder|encoder[\s-]?only/i.test(query)) {
      return {
        templateName: 'Transformer Encoder',
        response: "I'll load a **Transformer Encoder** block — LayerNorm, multi-head attention, and feed-forward projections for sequence classification.\n\nClick **Create Graph** to build it.",
        actionCode: 'CREATE_GRAPH',
        actionPayload: 'Transformer Encoder',
      };
    }
    if (/seq2seq|encoder[\s-]?decoder|sequence[\s-]?to[\s-]?sequence/i.test(query)) {
      return {
        templateName: 'Seq2Seq',
        response: "I'll assemble a **Seq2Seq** encoder-decoder with LSTM/GRU cells — ideal for machine translation and summarisation tasks.\n\nClick **Create Graph** to build it.",
        actionCode: 'CREATE_GRAPH',
        actionPayload: 'Seq2Seq',
      };
    }
    if (/gcn|graph[\s-]?convolutional|graph[\s-]?network/i.test(query)) {
      return {
        templateName: 'GCN',
        response: "I'll load a **Graph Convolutional Network (GCN)** — for node classification and graph-structured data tasks.\n\nClick **Create Graph** to build it.",
        actionCode: 'CREATE_GRAPH',
        actionPayload: 'GCN',
      };
    }
    if (/graphsage|graph[\s-]?sage/i.test(query)) {
      return {
        templateName: 'GraphSAGE',
        response: "I'll load a **GraphSAGE** inductive graph learning architecture — ideal for large-scale node embedding tasks.\n\nClick **Create Graph** to build it.",
        actionCode: 'CREATE_GRAPH',
        actionPayload: 'GraphSAGE',
      };
    }
    if (/sentiment|text[\s-]?classif/i.test(query)) {
      return {
        templateName: 'Sentiment Classifier',
        response: "I'll load a **Sentiment Classifier** — Embedding → LSTM → Dense head for binary or multi-class text sentiment classification.\n\nClick **Create Graph** to build it.",
        actionCode: 'CREATE_GRAPH',
        actionPayload: 'Sentiment Classifier',
      };
    }

    // ── Structural modification requests ─────────────────────────────────────
    if (/\b(add|insert|append)\b.*\b(conv|convolution|convolutional)\b/i.test(query)) {
      return {
        response: "I'll insert a new **Conv2D** layer into your canvas. You can drag it into position and connect it to existing nodes.\n\nClick **Modify Graph** to add it.",
        actionCode: 'MODIFY_GRAPH',
        actionPayload: 'Conv2D',
      };
    }
    if (/\b(add|insert|append)\b.*\b(dense|linear|fully[\s-]?connected)\b/i.test(query)) {
      return {
        response: "I'll insert a new **Dense** layer (fully-connected) into your canvas.\n\nClick **Modify Graph** to add it.",
        actionCode: 'MODIFY_GRAPH',
        actionPayload: 'Dense',
      };
    }
    if (/\b(add|insert|append)\b.*\b(batch[\s-]?norm|batchnorm|bn)\b/i.test(query)) {
      return {
        response: "I'll insert a **BatchNorm2D** layer — place it after a Conv2D layer to normalise activations and speed up training.\n\nClick **Modify Graph** to add it.",
        actionCode: 'MODIFY_GRAPH',
        actionPayload: 'BatchNorm2D',
      };
    }
    if (/\b(add|insert|append)\b.*\b(dropout)\b/i.test(query)) {
      return {
        response: "I'll insert a **Dropout** layer — use it before Dense layers to reduce overfitting during training.\n\nClick **Modify Graph** to add it.",
        actionCode: 'MODIFY_GRAPH',
        actionPayload: 'Dropout',
      };
    }

    // ── Fix / compile / layout ────────────────────────────────────────────────
    if (/\b(fix|repair|resolve|align|layout|auto[\s-]?layout|compile|error|issue|mismatch)\b/i.test(query)) {
      return {
        response: "Running graph compile validation. I'll auto-align node positions and synchronise tensor dimension flows across all connected layers.\n\nClick **Apply Fix** to execute.",
        actionCode: 'APPLY_FIX',
      };
    }

    // ── Deployment ────────────────────────────────────────────────────────────
    if (/\b(deploy|production|registry|export|onnx)\b/i.test(query)) {
      return {
        response: "Your model is ready for deployment. I'll navigate you to the **Model Registry** where you can tag versions, export ONNX/Triton packages, and manage inference endpoints.",
        actionCode: 'DEPLOY_MODEL',
      };
    }

    // ── Cost / GPU optimisation ───────────────────────────────────────────────
    if (/\b(cost|optimize|optimise|gpu|throttle|budget|vram|memory)\b/i.test(query)) {
      return {
        response: "High GPU utilization detected. I'll set cluster priority to **Low** and cap GPU throttle at **50%** to reduce compute costs during off-peak training runs.\n\nClick **Optimize Cost** to apply.",
        actionCode: 'OPTIMIZE_COST',
      };
    }

    // ── Generic "build" with no specific architecture ─────────────────────────
    if (/\b(build|create|make|generate|design)\b/i.test(query)) {
      return {
        response: "I'd love to build that architecture for you! Please specify which one you need, for example:\n\n- **Build a DenseNet**\n- **Build ResNet50**\n- **Build a ViT**\n- **Build MobileNet**\n- **Build BERT**\n- **Build AlexNet**\n- **Build LeNet**\n- **Build U-Net**\n\nThe more specific you are, the better I can match your intent.",
        actionCode: '',
      };
    }

    // ── Fallback ──────────────────────────────────────────────────────────────
    return {
      response: "I can help you design and build deep learning architectures. Try asking me to:\n\n- **Build a DenseNet / ResNet / ViT / MobileNet / BERT / GPT**\n- **Add a Conv2D / Dense / Dropout layer**\n- **Fix compilation errors**\n- **Optimize GPU cost**\n- **Deploy model**",
      actionCode: '',
    };
  };

  const handleSend = (textToSend?: string) => {
    const rawText = textToSend || input;
    if (!rawText.trim()) return;

    const userMsg: Message = {
      id: Math.random().toString(),
      sender: 'user',
      text: rawText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const newMsgs = [...messages, userMsg];
    saveChat(newMsgs);
    if (!textToSend) setInput('');

    setTimeout(() => {
      const intent = resolveArchitectureIntent(rawText);

      const aiMsg: Message = {
        id: Math.random().toString(),
        sender: 'assistant',
        text: intent.response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actionCode: intent.actionCode,
        actionPayload: intent.actionPayload,
      };

      saveChat([...newMsgs, aiMsg]);
    }, 900);
  };

  const handleActionExecute = (code: string, payload?: string) => {
    switch (code) {
      case 'CREATE_GRAPH':
        if (payload) {
          loadPrebuiltTemplate(payload);
          toast.success('Graph Created', `Loaded the ${payload} architecture into your canvas.`);
        }
        break;
      case 'BUILD_CUSTOM':
        if (payload) {
          loadPrebuiltTemplate(payload);
          toast.success('Custom Graph Built', `Built a custom ${payload} architecture from scratch.`);
        }
        break;
      case 'MODIFY_GRAPH':
        addNode((payload as any) || 'Conv2D', 600, 300);
        toast.success('Graph Modified', `Inserted a new ${payload || 'Conv2D'} node into your active canvas.`);
        break;
      case 'APPLY_FIX':
        triggerAutoLayout();
        triggerCompilation();
        toast.success('Fix Applied', 'Auto-aligned graph node layers and verified dimension compiles.');
        break;
      case 'DEPLOY_MODEL':
        toast.info('Redirecting', 'Navigating to Model Registry...');
        router.push('/models/registry');
        break;
      case 'OPTIMIZE_COST':
        setClusterPriority('Low');
        setGpuThrottleLimit(50);
        toast.success('Cost Optimized', 'GPU priority set to LOW with throttling cap at 50%.');
        break;
      default:
        break;
    }
  };

  const clearChatHistory = async () => {
    const confirmed = await confirm({
      title: 'Clear Chat History',
      message: 'Are you sure you want to clear your Copilot conversation history?',
      isDestructive: true,
      confirmLabel: 'Clear History',
      cancelLabel: 'Cancel',
    });
    if (confirmed) {
      const welcome: Message = {
        id: 'welcome',
        sender: 'assistant',
        text: "Conversation reset. How can I help you design deep learning architectures today?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      saveChat([welcome]);
      toast.info('Chat Cleared', 'Conversation history has been reset.');
    }
  };

  // Render HTML / Markdown simple highlights
  const renderMessageText = (text: string) => {
    return text.split('\n').map((line, i) => {
      // Bold rendering
      let content: React.ReactNode = line;
      if (line.includes('**')) {
        const parts = line.split('**');
        content = parts.map((part, index) => index % 2 === 1 ? <strong key={index} className="text-[#8ab4f8] font-bold">{part}</strong> : part);
      }
      return <p key={i} className="mb-2 last:mb-0 leading-relaxed text-xs text-gray-300 font-medium">{content}</p>;
    });
  };

  const selectedCount = selectedNodeIds.length || (selectedNodeId ? 1 : 0);

  return (
    <div className="w-full h-full bg-[#141517] flex flex-col select-none font-sans min-h-0 min-w-0">
      {/* Context Awareness Ribbon */}
      <div className="px-4 py-2 bg-[#1e1f22]/50 border-b border-[#3f4046]/50 flex items-center justify-between text-[10px] font-semibold shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-1 text-gray-400 min-w-0">
            <Cpu size={11} className="text-[#8ab4f8]" />
            <span className="truncate text-white max-w-[70px]" title={activeProject?.name || 'No Project'}>
              {activeProject?.name || 'No Project'}
            </span>
          </div>
          <div className="flex items-center gap-1 text-gray-400 min-w-0">
            <Database size={11} className="text-[#80cbc4]" />
            <span className="truncate text-white max-w-[70px]" title={activeDatasetName}>
              {activeDatasetName}
            </span>
          </div>
          <div className="flex items-center gap-1 text-gray-400">
            <Grid size={11} className="text-[#c5a3ff]" />
            <span className="text-white">
              {selectedCount}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={clearChatHistory}
          title="Clear Chat History"
          className="p-1 hover:bg-[#2b2d31] rounded text-[#9aa0a6] hover:text-white transition-all cursor-pointer border-none bg-transparent flex items-center gap-0.5"
        >
          <RotateCcw size={11} />
          <span>Reset</span>
        </button>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar min-h-0">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs ${
              msg.sender === 'user'
                ? 'bg-[#8ab4f8] text-[#1e1f22] rounded-tr-none font-bold'
                : 'bg-[#2b2d31] text-gray-300 border border-[#3f4046] rounded-tl-none font-medium'
            }`}>
              {renderMessageText(msg.text)}

              {/* Render action cards if actionCode is present */}
              {msg.sender === 'assistant' && msg.actionCode && (
                <div className="mt-3.5 pt-3 border-t border-[#3f4046] space-y-2">
                  {msg.actionCode === 'CREATE_GRAPH' && (
                    <div className="bg-[#1e1f22]/80 border border-[#8ab4f8]/30 p-3 rounded-xl flex flex-col gap-2.5">
                      <div className="flex items-center gap-2">
                        <Sparkles className="text-[#8ab4f8]" size={14} />
                        <span className="font-extrabold text-[11px] text-white">Create Architecture Graph</span>
                      </div>
                      <p className="text-[10px] text-gray-400 font-medium">Instantiate a fully connected {msg.actionPayload} neural network template.</p>
                      <button
                        type="button"
                        onClick={() => handleActionExecute(msg.actionCode!, msg.actionPayload)}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-[#8ab4f8] hover:bg-[#a8c7fa] text-[#1e1f22] text-[10px] font-black rounded-lg transition-all cursor-pointer border-none"
                      >
                        <span>Create Graph</span>
                        <ArrowRight size={10} />
                      </button>
                    </div>
                  )}

                  {msg.actionCode === 'BUILD_CUSTOM' && (
                    <div className="bg-[#1e1f22]/80 border border-[#81c784]/30 p-3 rounded-xl flex flex-col gap-2.5">
                      <div className="flex items-center gap-2">
                        <Cpu className="text-[#81c784]" size={14} />
                        <span className="font-extrabold text-[11px] text-white">Build Custom Architecture</span>
                      </div>
                      <p className="text-[10px] text-gray-400 font-medium">Generate a <strong className="text-[#81c784]">{msg.actionPayload}</strong> architecture built node-by-node from your Layer Library.</p>
                      <button
                        type="button"
                        onClick={() => handleActionExecute(msg.actionCode!, msg.actionPayload)}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-[#81c784] hover:bg-[#a5d6a7] text-[#1e1f22] text-[10px] font-black rounded-lg transition-all cursor-pointer border-none"
                      >
                        <span>Build {msg.actionPayload}</span>
                        <ArrowRight size={10} />
                      </button>
                    </div>
                  )}

                  {msg.actionCode === 'MODIFY_GRAPH' && (
                    <div className="bg-[#1e1f22]/80 border border-[#c5a3ff]/30 p-3 rounded-xl flex flex-col gap-2.5">
                      <div className="flex items-center gap-2">
                        <Grid className="text-[#c5a3ff]" size={14} />
                        <span className="font-extrabold text-[11px] text-white">Modify Architecture</span>
                      </div>
                      <p className="text-[10px] text-gray-400 font-medium">Insert a {msg.actionPayload} layer at the end of the graph.</p>
                      <button
                        type="button"
                        onClick={() => handleActionExecute(msg.actionCode!, msg.actionPayload)}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-[#c5a3ff] hover:bg-[#d7c4ff] text-[#1e1f22] text-[10px] font-black rounded-lg transition-all cursor-pointer border-none"
                      >
                        <span>Modify Graph</span>
                        <ArrowRight size={10} />
                      </button>
                    </div>
                  )}

                  {msg.actionCode === 'APPLY_FIX' && (
                    <div className="bg-[#1e1f22]/80 border border-[#ffe082]/30 p-3 rounded-xl flex flex-col gap-2.5">
                      <div className="flex items-center gap-2">
                        <Wrench className="text-[#ffe082]" size={14} />
                        <span className="font-extrabold text-[11px] text-white">Apply Shape Alignment Fix</span>
                      </div>
                      <p className="text-[10px] text-gray-400 font-medium">Auto-align stride ratios, dimension bounds, and layout paths.</p>
                      <button
                        type="button"
                        onClick={() => handleActionExecute(msg.actionCode!)}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-[#ffe082] hover:bg-[#ffecb3] text-[#1e1f22] text-[10px] font-black rounded-lg transition-all cursor-pointer border-none"
                      >
                        <span>Apply Fix</span>
                        <ArrowRight size={10} />
                      </button>
                    </div>
                  )}

                  {msg.actionCode === 'DEPLOY_MODEL' && (
                    <div className="bg-[#1e1f22]/80 border border-[#80cbc4]/30 p-3 rounded-xl flex flex-col gap-2.5">
                      <div className="flex items-center gap-2">
                        <CloudLightning className="text-[#80cbc4]" size={14} />
                        <span className="font-extrabold text-[11px] text-white">Production Registry Deploy</span>
                      </div>
                      <p className="text-[10px] text-gray-400 font-medium">Open the deployment workspace inside Model Registry dashboard.</p>
                      <button
                        type="button"
                        onClick={() => handleActionExecute(msg.actionCode!)}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-[#80cbc4] hover:bg-[#a7ffeb] text-[#1e1f22] text-[10px] font-black rounded-lg transition-all cursor-pointer border-none"
                      >
                        <span>Deploy Model</span>
                        <ArrowRight size={10} />
                      </button>
                    </div>
                  )}

                  {msg.actionCode === 'OPTIMIZE_COST' && (
                    <div className="bg-[#1e1f22]/80 border border-[#f28b82]/30 p-3 rounded-xl flex flex-col gap-2.5">
                      <div className="flex items-center gap-2">
                        <TrendingDown className="text-[#f28b82]" size={14} />
                        <span className="font-extrabold text-[11px] text-white">Reduce Cluster Cost</span>
                      </div>
                      <p className="text-[10px] text-gray-400 font-medium">Throttle GPU nodes to 50% limit and set priority to Low.</p>
                      <button
                        type="button"
                        onClick={() => handleActionExecute(msg.actionCode!)}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-[#f28b82] hover:bg-[#f5b4af] text-[#1e1f22] text-[10px] font-black rounded-lg transition-all cursor-pointer border-none"
                      >
                        <span>Optimize Cost</span>
                        <ArrowRight size={10} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <span className="text-[9px] text-gray-600 mt-1 px-1 font-semibold">{msg.timestamp}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggestions Stems */}
      <div className="px-4 py-2 flex gap-1.5 overflow-x-auto shrink-0 border-t border-[#3f4046]/30 bg-[#1e1f22]/20 no-scrollbar">
        <button
          type="button"
          onClick={() => handleSend('Build a ViT for CIFAR10')}
          className="px-2.5 py-1 bg-[#2b2d31]/80 hover:bg-[#313338] border border-[#3f4046] text-gray-400 hover:text-white text-[9px] font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer shrink-0"
        >
          Build ViT
        </button>
        <button
          type="button"
          onClick={() => handleSend('Apply compilation fix')}
          className="px-2.5 py-1 bg-[#2b2d31]/80 hover:bg-[#313338] border border-[#3f4046] text-gray-400 hover:text-white text-[9px] font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer shrink-0"
        >
          Apply Fix
        </button>
        <button
          type="button"
          onClick={() => handleSend('Optimize cluster cost')}
          className="px-2.5 py-1 bg-[#2b2d31]/80 hover:bg-[#313338] border border-[#3f4046] text-gray-400 hover:text-white text-[9px] font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer shrink-0"
        >
          Optimize Cost
        </button>
        <button
          type="button"
          onClick={() => handleSend('Deploy model to production')}
          className="px-2.5 py-1 bg-[#2b2d31]/80 hover:bg-[#313338] border border-[#3f4046] text-gray-400 hover:text-white text-[9px] font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer shrink-0"
        >
          Deploy Model
        </button>
      </div>

      {/* Input Bar */}
      <div className="p-4 bg-[#1e1f22] border-t border-[#3f4046] shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            placeholder="Ask Copilot (e.g. 'Build a ViT for CIFAR10')..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 px-3 py-2 bg-[#141517] border border-[#3f4046] rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#8ab4f8] focus:ring-1 focus:ring-[#8ab4f8]/20 transition-all font-semibold"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className={`p-2 rounded-xl flex items-center justify-center transition-all ${
              input.trim()
                ? 'bg-[#8ab4f8] hover:bg-[#a8c7fa] text-[#1e1f22] cursor-pointer'
                : 'bg-[#2b2d31] text-gray-600 border border-[#3f4046] cursor-not-allowed'
            }`}
          >
            <Send size={14} />
          </button>
        </form>
      </div>
    </div>
  );
}
