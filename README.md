`# MLBuilder Visual Neural Network Designer

A high-fidelity, high-performance visual deep learning architecture workspace frontend. MLBuilder empowers machine learning engineers to design model graphs, configure layer hyperparameters, validate topologies, observe animated tensor flows, and compile production-ready PyTorch modules via an intuitive, 60fps drag-and-drop workspace.

---

## 🚀 Key Features

* **Visual Graph Engine**: Powered by **Konva.js** for custom web graphics, supporting nodes, input/output socket ports, and bezier path connections.
* **Topological Shape Solver**: Automatically propagates and calculates tensor sizes downstream from root input parameters in real-time.
* **DAG Logic & Verification**: Built-in topological sorting validating graph loops, cyclic configurations, and network structures.
* **Animated Forward-Pass Simulation**: Executes a visual forward-pass, flashing nodes and tracing edges in order of calculation.
* **PyTorch Compiler**: Translates visual topologies into production-ready PyTorch `nn.Module` classes, including initialization arguments and forward tracing functions.
* **Premium Dark Theme**: Developer-focused UI featuring Outfits, HSL gradients, customizable slide metrics, and CSS glassmorphic layers.

---

## 🛠️ Technology Stack

* **Framework**: Next.js 16 (App Router)
* **Core Runtime**: React 19 & TypeScript 5
* **Canvas Engine**: Konva.js & `react-konva` (loaded dynamically with `ssr: false` to avoid SSR window errors)
* **State Engine**: Zustand 5
* **Motion Graphics**: Framer Motion 12
* **Styling**: Tailwind CSS v4 (using CSS custom variables and theme controls in `globals.css`)

---

## 📁 Repository Structure

```text
frontend/
├── src/
│   ├── app/                    # Next.js App Router Page View Controllers
│   │   ├── page.tsx            # Main Model Workspace landing dashboard
│   │   ├── layout.tsx          # General page template controller
│   │   ├── globals.css         # Custom background animations, scrolls and dark variables
│   │   │
│   │   ├── datasets/           # Dataset Drag-and-Drop repository page
│   │   ├── editor/[projectId]/ # Dynamic interactive Canvas Node Editor workspace
│   │   ├── models/             # Base visual templates importer panel
│   │   │   notebook/           # Jupyter-style script sandbox cell
│   │   └── settings/           # API credentials and sync setups
│   │
│   ├── components/             # Reusable Visual Custom Modules
│   │   ├── Layout/             # Universal Layout Containers (Header, Sidebar, MainLayout)
│   │   ├── Canvas/             # Interactive Canvas modules (NodeGraph, CanvasWrapper)
│   │   ├── Panels/             # Workspace panels (LayerLibrary, ConfigPanel, ValidationPanel)
│   │   └── Modals/             # Popup panels (CodePreviewModal)
│   │
│   ├── store/                  # Unified State Managers
│   │   ├── projectStore.ts     # Project details, deployment logs, and cluster metrics
│   │   └── canvasStore.ts      # Active canvas nodes, links, and calculation rules
│   │
│   ├── lib/                    # Core compilation algorithms
│   │   └── canvas/             
│   │       └── pytorchCompiler.ts # Formats canvas nodes into PyTorch python modules
│   │
│   └── types/                  
│       └── canvas.ts           # Types for Nodes, Links, Projects, and Logs
│
├── tsconfig.json               # TypeScript setup
├── package.json                # Project dependencies
└── next.config.ts              # Next.js bundler setup
```

---

## 💻 Installation & Quickstart

Ensure you have [Node.js](https://nodejs.org/) installed on your machine.

### 1. Initialize Codebase & Install Dependencies
Clone the repository and install all required modules:
```bash
npm install
```

### 2. Run the Development Server
Execute the Next.js dev compiler locally:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Generate Production Optimizations
Verify type check compliance and create optimized production static bundles:
```bash
npm run build
```

---

## 🧠 Architectural Overview

### 1. State Flow Architecture

```text
  [ User Actions ] (Drag Block, Move Node, Change Filter Slider)
        │
        ▼
  [ Zustand Store ] (canvasStore.ts)
        │
        ├─► [ Shape Propagation Solver ] (Computes downstream dimensions)
        ├─► [ Graph Loop DFS Validator ] (Verifies acyclic DAG constraints)
        │
        ▼
  [ Canvas View Layer ] (NodeGraph.tsx using react-konva / Stage)
```

### 2. Downstream Shape Solving Formulas
* **Convolution (Conv2D)**:
  * With `padding='same'`: output matches spatial input `[H, W, Filters]`.
  * With `padding='valid'`: output calculated as:
    $$H_{out} = \lfloor \frac{H - \text{kernelSize}}{\text{stride}} \rfloor + 1$$
    $$W_{out} = \lfloor \frac{W - \text{kernelSize}}{\text{stride}} \rfloor + 1$$
* **Max Pooling (MaxPool2D)**:
  $$H_{out} = \lfloor \frac{H}{\text{poolSize}} \rfloor, \quad W_{out} = \lfloor \frac{W}{\text{poolSize}} \rfloor$$
* **Flattening (Flatten)**:
  $$\text{VectorSize} = H \times W \times C$$

---

## 🤝 Contribution Guidelines

1. **Keep Canvas Modules Client-Side**: All `react-konva` nodes rely on window coordinates. Ensure they are loaded dynamically via `CanvasWrapper.tsx` and labeled `'use client'`.
2. **Support Downstream recalculations**: When creating a new node type in `src/types/canvas.ts`, add its custom shape evaluation rules under `computeNodeOutputShape` inside `src/store/canvasStore.ts`.
3. **Preserve PyTorch Class Tracing**: Keep layer name variable identifiers valid and uniform (`self.var_name`) in the PyTorch generator (`src/lib/canvas/pytorchCompiler.ts`) to ensure compilation success.
