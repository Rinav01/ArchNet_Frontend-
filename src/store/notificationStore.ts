import { create } from 'zustand';

export interface Toast {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  message: string;
  description?: string;
  duration?: number;
}

export interface AppNotification extends Toast {
  timestamp: number;
  read: boolean;
}

interface NotificationState {
  toasts: Toast[];
  history: AppNotification[];
  addToast: (type: Toast['type'], message: string, description?: string, duration?: number) => void;
  removeToast: (id: string) => void;
  clearAll: () => void;
  markAllAsRead: () => void;
  clearHistory: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  toasts: [],
  history: [],
  addToast: (type, message, description, duration = 4000) => {
    const id = `toast_${Math.random().toString(36).substring(2, 9)}`;
    const newNotification: AppNotification = {
      id,
      type,
      message,
      description,
      duration,
      timestamp: Date.now(),
      read: false,
    };
    
    set((state) => ({
      toasts: [...state.toasts, { id, type, message, description, duration }],
      history: [newNotification, ...state.history],
    }));
  },
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
  clearAll: () => set({ toasts: [] }),
  markAllAsRead: () => set((state) => ({
    history: state.history.map(n => ({ ...n, read: true }))
  })),
  clearHistory: () => set({ history: [] })
}));

export const toast = {
  success: (message: string, description?: string, duration?: number) =>
    useNotificationStore.getState().addToast('success', message, description, duration),
  error: (message: string, description?: string, duration?: number) =>
    useNotificationStore.getState().addToast('error', message, description, duration),
  warning: (message: string, description?: string, duration?: number) =>
    useNotificationStore.getState().addToast('warning', message, description, duration),
  info: (message: string, description?: string, duration?: number) =>
    useNotificationStore.getState().addToast('info', message, description, duration),
};
