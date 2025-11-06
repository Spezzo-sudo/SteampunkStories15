import { create } from 'zustand';

export enum ToastVariant {
  Success = 'success',
  Info = 'info',
  Warning = 'warning',
}

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  createdAt: number;
}

export type LayoutPreference = 'auto' | 'mobile' | 'desktop';

interface UiState {
  toasts: ToastMessage[];
  layoutPref: LayoutPreference;
}

interface UiActions {
  pushToast: (toast: Omit<ToastMessage, 'id' | 'createdAt'>) => void;
  dismissToast: (id: string) => void;
  clearToasts: () => void;
  setLayoutPref: (preference: LayoutPreference) => void;
}

/**
 * Global UI state store that keeps ephemeral interface feedback such as toast messages and layout preferences.
 * It enables non-component modules (stores, actions) to surface notifications to the player.
 */
export const useUiStore = create<UiState & UiActions>((set) => ({
  toasts: [],
  layoutPref: 'auto',
  pushToast: (toast) => {
    set((state) => ({
      toasts: [
        ...state.toasts,
        {
          ...toast,
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          createdAt: Date.now(),
        },
      ],
    }));
  },
  dismissToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    }));
  },
  clearToasts: () => set({ toasts: [] }),
  setLayoutPref: (preference) => set({ layoutPref: preference }),
}));
