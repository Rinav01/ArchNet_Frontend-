import { create } from 'zustand';

export interface PanelState {
  id: string;
  title: string;
  isOpen: boolean;
  isFloating: boolean;
  dockPosition: 'left' | 'right' | 'bottom' | null;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
}

interface LayoutState {
  panels: Record<string, PanelState>;
  dockPreview: 'left' | 'right' | 'bottom' | null;
  maxZIndex: number;
  activePreset: string;
  activeConsoleTab: string;
  
  // Actions
  togglePanel: (id: string) => void;
  undockPanel: (id: string, x: number, y: number) => void;
  dockPanel: (id: string, position: 'left' | 'right' | 'bottom') => void;
  updateFloatingPosition: (id: string, x: number, y: number) => void;
  updatePanelSize: (id: string, width: number, height: number) => void;
  bringToFront: (id: string) => void;
  setDockPreview: (position: 'left' | 'right' | 'bottom' | null) => void;
  resetLayout: () => void;
  applyPreset: (presetName: string) => void;
  setActiveConsoleTab: (tab: string) => void;
}

const DEFAULT_PANELS: Record<string, PanelState> = {
  library: {
    id: 'library',
    title: 'Layer Library',
    isOpen: true,
    isFloating: false,
    dockPosition: 'left',
    x: 80,
    y: 100,
    width: 320,
    height: 550,
    zIndex: 10,
  },
  inspector: {
    id: 'inspector',
    title: 'Hyperparameter Inspector',
    isOpen: true,
    isFloating: false,
    dockPosition: 'right',
    x: 900,
    y: 100,
    width: 350,
    height: 550,
    zIndex: 11,
  },
  console: {
    id: 'console',
    title: 'IDE Terminal Console',
    isOpen: true,
    isFloating: false,
    dockPosition: 'bottom',
    x: 200,
    y: 450,
    width: 800,
    height: 256,
    zIndex: 12,
  },
  diagnostics: {
    id: 'diagnostics',
    title: 'Diagnostics & AutoML',
    isOpen: false,
    isFloating: false,
    dockPosition: 'right',
    x: 850,
    y: 120,
    width: 340,
    height: 500,
    zIndex: 13,
  },
  explainability: {
    id: 'explainability',
    title: 'Explainability & Analytics',
    isOpen: false,
    isFloating: false,
    dockPosition: 'right',
    x: 850,
    y: 120,
    width: 340,
    height: 550,
    zIndex: 14,
  },
};

export const useLayoutStore = create<LayoutState>((set, get) => ({
  panels: DEFAULT_PANELS,
  dockPreview: null,
  maxZIndex: 20,
  activePreset: 'Architecture Mode',
  activeConsoleTab: 'activity',

  togglePanel: (id) => {
    set((state) => {
      const panel = state.panels[id];
      if (!panel) return {};
      
      const newOpen = !panel.isOpen;
      
      // If we are opening a panel and it's floating, bring it to front
      let newZ = panel.zIndex;
      let newMaxZ = state.maxZIndex;
      if (newOpen && panel.isFloating) {
        newMaxZ = state.maxZIndex + 1;
        newZ = newMaxZ;
      }

      return {
        panels: {
          ...state.panels,
          [id]: {
            ...panel,
            isOpen: newOpen,
            zIndex: newZ,
          },
        },
        maxZIndex: newMaxZ,
      };
    });
  },

  undockPanel: (id, x, y) => {
    set((state) => {
      const panel = state.panels[id];
      if (!panel) return {};

      const newMaxZ = state.maxZIndex + 1;

      return {
        panels: {
          ...state.panels,
          [id]: {
            ...panel,
            isFloating: true,
            dockPosition: null,
            x,
            y,
            zIndex: newMaxZ,
          },
        },
        maxZIndex: newMaxZ,
      };
    });
  },

  dockPanel: (id, position) => {
    set((state) => {
      const panel = state.panels[id];
      if (!panel) return {};

      // Retrieve default dimensions for docking
      const defaultWidth = id === 'console' ? 800 : id === 'inspector' ? 350 : id === 'explainability' ? 340 : 320;
      const defaultHeight = id === 'console' ? 256 : 550;

      return {
        panels: {
          ...state.panels,
          [id]: {
            ...panel,
            isFloating: false,
            dockPosition: position,
            width: defaultWidth,
            height: defaultHeight,
          },
        },
      };
    });
  },

  updateFloatingPosition: (id, x, y) => {
    set((state) => {
      const panel = state.panels[id];
      if (!panel) return {};
      return {
        panels: {
          ...state.panels,
          [id]: {
            ...panel,
            x,
            y,
          },
        },
      };
    });
  },

  updatePanelSize: (id, width, height) => {
    set((state) => {
      const panel = state.panels[id];
      if (!panel) return {};
      return {
        panels: {
          ...state.panels,
          [id]: {
            ...panel,
            width,
            height,
          },
        },
      };
    });
  },

  bringToFront: (id) => {
    set((state) => {
      const panel = state.panels[id];
      if (!panel || !panel.isFloating) return {};
      
      const newMaxZ = state.maxZIndex + 1;
      return {
        panels: {
          ...state.panels,
          [id]: {
            ...panel,
            zIndex: newMaxZ,
          },
        },
        maxZIndex: newMaxZ,
      };
    });
  },

  setDockPreview: (position) => {
    set({ dockPreview: position });
  },

  resetLayout: () => {
    set({
      panels: DEFAULT_PANELS,
      dockPreview: null,
      maxZIndex: 20,
      activePreset: 'Architecture Mode',
      activeConsoleTab: 'activity',
    });
  },

  applyPreset: (presetName) => {
    set((state) => {
      const updatedPanels = { ...state.panels };
      let consoleTab = state.activeConsoleTab;
      
      switch (presetName) {
        case 'Architecture Mode':
          updatedPanels.library = { ...updatedPanels.library, isOpen: true, isFloating: false, dockPosition: 'left' };
          updatedPanels.inspector = { ...updatedPanels.inspector, isOpen: true, isFloating: false, dockPosition: 'right' };
          updatedPanels.console = { ...updatedPanels.console, isOpen: false };
          updatedPanels.diagnostics = { ...updatedPanels.diagnostics, isOpen: false };
          consoleTab = 'activity';
          break;
        case 'Canvas Focus':
          updatedPanels.library = { ...updatedPanels.library, isOpen: false };
          updatedPanels.inspector = { ...updatedPanels.inspector, isOpen: false };
          updatedPanels.console = { ...updatedPanels.console, isOpen: false };
          updatedPanels.diagnostics = { ...updatedPanels.diagnostics, isOpen: false };
          break;
        case 'Training Mode':
          updatedPanels.library = { ...updatedPanels.library, isOpen: false };
          updatedPanels.inspector = { ...updatedPanels.inspector, isOpen: false };
          updatedPanels.console = { ...updatedPanels.console, isOpen: true, isFloating: false, dockPosition: 'bottom', height: 280 };
          updatedPanels.diagnostics = { ...updatedPanels.diagnostics, isOpen: false };
          consoleTab = 'training';
          break;
        case 'Metrics Focus':
          updatedPanels.library = { ...updatedPanels.library, isOpen: false };
          updatedPanels.inspector = { ...updatedPanels.inspector, isOpen: false };
          updatedPanels.console = { ...updatedPanels.console, isOpen: true, isFloating: false, dockPosition: 'bottom', height: 280 };
          updatedPanels.diagnostics = { ...updatedPanels.diagnostics, isOpen: true, isFloating: false, dockPosition: 'right', width: 340 };
          consoleTab = 'training';
          break;
        case 'Benchmark Mode':
          updatedPanels.library = { ...updatedPanels.library, isOpen: false };
          updatedPanels.inspector = { ...updatedPanels.inspector, isOpen: true, isFloating: false, dockPosition: 'right', width: 350 };
          updatedPanels.console = { ...updatedPanels.console, isOpen: true, isFloating: false, dockPosition: 'bottom', height: 280 };
          updatedPanels.diagnostics = { ...updatedPanels.diagnostics, isOpen: false };
          consoleTab = 'benchmark';
          break;
        case 'Profiler Focus':
          updatedPanels.library = { ...updatedPanels.library, isOpen: false };
          updatedPanels.inspector = { ...updatedPanels.inspector, isOpen: false };
          updatedPanels.console = { ...updatedPanels.console, isOpen: true, isFloating: false, dockPosition: 'bottom', height: 280 };
          updatedPanels.diagnostics = { ...updatedPanels.diagnostics, isOpen: true, isFloating: false, dockPosition: 'right', width: 340 };
          consoleTab = 'timeline';
          break;
        default:
          break;
      }
      
      return {
        panels: updatedPanels,
        activePreset: presetName,
        activeConsoleTab: consoleTab
      };
    });
  },

  setActiveConsoleTab: (tab) => set({ activeConsoleTab: tab }),
}));
