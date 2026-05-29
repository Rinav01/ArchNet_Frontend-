import { create } from 'zustand';

export interface Toast {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  message: string;
  description?: string;
  duration?: number;
}

interface NotificationState {
  toasts: Toast[];
  addToast: (type: Toast['type'], message: string, description?: string, duration?: number) => void;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  toasts: [],
  addToast: (type, message, description, duration = 4000) => {
    const id = `toast_${Math.random().toString(36).substring(2, 9)}`;
    set((state) => ({
      toasts: [...state.toasts, { id, type, message, description, duration }],
    }));
  },
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
  clearAll: () => set({ toasts: [] }),
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
