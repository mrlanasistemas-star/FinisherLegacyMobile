import { create } from 'zustand';

export type ToastTone = 'default' | 'success' | 'destructive';

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastState {
  toast: ToastItem | null;
  show: (message: string, tone?: ToastTone) => void;
  dismiss: () => void;
}

let nextId = 1;

/**
 * One toast at a time, imperative API so it can be called from mutation
 * callbacks/anywhere without hook constraints (AGENTS.md §114 — elegant,
 * non-intrusive feedback instead of a modal for every success).
 */
export const useToastStore = create<ToastState>((set) => ({
  toast: null,
  show: (message, tone = 'default') => set({ toast: { id: nextId++, message, tone } }),
  dismiss: () => set({ toast: null }),
}));

export function showToast(message: string, tone: ToastTone = 'default') {
  useToastStore.getState().show(message, tone);
}
