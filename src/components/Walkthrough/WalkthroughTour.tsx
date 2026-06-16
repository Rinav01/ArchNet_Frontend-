import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import './driver-theme.css';

export const startWalkthroughTour = () => {
  const driverObj = driver({
    showProgress: true,
    animate: true,
    popoverClass: 'archnet-theme',
    steps: [
      {
        popover: {
          title: 'Welcome to the ArchNet Canvas Editor',
          description: 'This is the core workspace where you can visually design ML models. Let’s take a quick tour of its features!',
        }
      },
      {
        element: '#tour-zone-1',
        popover: {
          title: 'Project Identity (Zone 1)',
          description: 'Here you can see the project name (double-click to rename), the compiled framework badge (PyTorch, TensorFlow, etc.), and the current status.',
          side: "bottom",
          align: 'start'
        }
      },
      {
        element: '#tour-sync-badge',
        popover: {
          title: 'Real-time Collaboration',
          description: 'When synced, see where collaborators are working on the canvas. Cursors and selections are broadcast in real time via WebSockets.',
          side: "bottom",
          align: 'start'
        }
      },
      {
        element: '#tour-zone-2',
        popover: {
          title: 'Workspace Toolstrip (Zone 2)',
          description: 'Access core tools here: Undo/Redo operations, run simulated forward passes, open the blocks guide, or launch the code compiler.',
          side: "bottom",
          align: 'center'
        }
      },
      {
        element: '#tour-history-btn',
        popover: {
          title: 'Version History',
          description: 'Save named milestones or restore previous snapshots of your model graph. The auto-save draft badge nearby ensures you never lose work.',
          side: "bottom",
          align: 'center'
        }
      },
      {
        element: '#tour-workspace-btn',
        popover: {
          title: 'Workspace Panels & Presets',
          description: 'Toggle individual side panels (like Inspector, AI Copilot, or Console) or apply layout presets (e.g., Architecture Mode, Training Mode).',
          side: "bottom",
          align: 'center'
        }
      },
      {
        element: '#tour-zone-3',
        popover: {
          title: 'Actions & User (Zone 3)',
          description: 'Switch between Editor, Reviewer, or Viewer roles, and access your profile or workspace view modes (Training, Deploy, Inference).',
          side: "bottom",
          align: 'end'
        }
      },
      {
        element: '#tour-layer-library',
        popover: {
          title: 'Layer Library',
          description: 'Contains Standard, Sequence, Transformer, and Graph layers. You can also save custom blocks or load complete prebuilt architectures here. Click a card to add it to the canvas.',
          side: "right",
          align: 'start'
        }
      },
      {
        element: '#tour-canvas',
        popover: {
          title: 'The Canvas Node Graph',
          description: 'Your hardware-accelerated workspace. Pan, zoom, drag nodes, and connect sockets to build your graph. It automatically propagates tensor shapes and validates connections.',
          side: "top",
          align: 'center'
        }
      },
      {
        element: '#tour-minimap',
        popover: {
          title: 'Workspace Minimap',
          description: 'Navigate large graphs instantly. The blue frame shows your current viewport, and you can see color-coded nodes and collaborator positions.',
          side: "left",
          align: 'start'
        }
      },
      {
        popover: {
          title: 'Keyboard Shortcuts',
          description: 'Use Ctrl+Z/Y for Undo/Redo, Shift+Drag to marquee select multiple nodes, and Alt+Drag to move nodes without snapping to the grid. Happy building!',
        }
      }
    ]
  });

  driverObj.drive();
};
