import { create } from 'zustand';
import type { User } from 'firebase/auth';
import { observeAuth, signIn, signOut, ensureDefaultAdmin } from '@/services/firebase/auth';

const defaultWorldId = import.meta.env.VITE_WORLD_ID ?? 'playtest-world';

interface SessionState {
  user: User | null;
  initializing: boolean;
  error: string | null;
  worldId: string;
  authUnsubscribe: (() => void) | null;
  initialize: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setWorldId: (worldId: string) => void;
}

/** Zustand store maintaining Firebase authentication state. */
export const useSessionStore = create<SessionState>((set, get) => ({
  user: null,
  initializing: true,
  error: null,
  worldId: defaultWorldId,
  authUnsubscribe: null,

  initialize: async () => {
    const existing = get().authUnsubscribe;
    existing?.();
    set({ initializing: true, error: null });
    await ensureDefaultAdmin('admin', 'admin');
    const unsubscribe = observeAuth((user) => {
      set({ user, initializing: false });
    });
    set({ authUnsubscribe: unsubscribe });
  },

  login: async (username, password) => {
    set({ error: null });
    try {
      await signIn(username, password);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unbekannter Fehler' });
      throw error;
    }
  },

  logout: async () => {
    await signOut();
    set({ user: null });
  },

  setWorldId: (worldId) => set({ worldId }),
}));
