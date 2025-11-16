import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import { observeAuth, signIn, signOut, ensureDefaultAdmin } from '@/services/supabase/auth';
import { DEFAULT_ADMIN_CREDENTIALS } from '@/config/authConfig';
import { fetchOrCreatePlayerProfile } from '@/services/supabase/playerApi';
import { loadPlayerResources } from '@/services/supabase/resourceSync';
import { useGameStore } from '@/store/gameStore';
import type { PlayerProfile } from '@/data/types';
import { createHomeSettlement, getPlayerSettlements } from '@/services/supabase/settlementApi';

const defaultWorldId = import.meta.env.VITE_WORLD_ID ?? 'playtest-world';

/**
 * Reads the referral code from URL parameters (?ref=playerId).
 * Returns the referrer player ID if present, otherwise null.
 */
const getReferralCode = (): string | null => {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get('ref');
};

interface SessionState {
  user: User | null;
  profile: PlayerProfile | null;
  initializing: boolean;
  loadingProfile: boolean;
  error: string | null;
  profileError: string | null;
  worldId: string;
  authUnsubscribe: (() => void) | null;
  initialize: () => Promise<void>;
  loadProfile: (user: User) => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setWorldId: (worldId: string) => void;
}

/** Zustand store maintaining Supabase authentication and player profile state. */
export const useSessionStore = create<SessionState>((set, get) => ({
  user: null,
  profile: null,
  initializing: true,
  loadingProfile: false,
  error: null,
  profileError: null,
  worldId: defaultWorldId,
  authUnsubscribe: null,

  initialize: async () => {
    const existing = get().authUnsubscribe;
    existing?.();
    set({ initializing: true, error: null, profile: null });

    // Try to ensure default admin, but don't block if it fails
    try {
      await ensureDefaultAdmin(DEFAULT_ADMIN_CREDENTIALS.username, DEFAULT_ADMIN_CREDENTIALS.password);
    } catch (error) {
      console.warn('[sessionStore] Failed to ensure default admin:', error);
    }

    const unsubscribe = observeAuth(async (user) => {
      set({ user, initializing: false });
      if (user) {
        await get().loadProfile(user);
      } else {
        // Clear profile when user logs out
        set({ profile: null });
      }
    });
    set({ authUnsubscribe: unsubscribe });
  },

  loadProfile: async (user) => {
    set({ loadingProfile: true, profileError: null });
    try {
      const profile = await fetchOrCreatePlayerProfile(user);

      // Set playerId in gameStore for resource sync
      useGameStore.getState().setPlayerId(profile.playerId);

      // Load resources from database for local state synchronization
      const resources = await loadPlayerResources(profile.playerId);
      if (resources) {
        useGameStore.setState({ resources });
      }

      // Check if player has any settlements
      const settlements = await getPlayerSettlements(profile.playerId);
      if (settlements.length === 0) {
        console.log('[sessionStore] No settlements found, creating home settlement...');

        // Check for referral code in URL
        const referrerId = getReferralCode();
        if (referrerId) {
          console.log(`[sessionStore] Referral code detected: ${referrerId}`);
        }

        // Create home settlement (near referrer if code provided)
        const homeSettlement = await createHomeSettlement(
          profile.playerId,
          profile.name,
          referrerId || undefined
        );

        if (homeSettlement) {
          console.log('[sessionStore] Home settlement created successfully');
        } else {
          console.error('[sessionStore] Failed to create home settlement');
        }
      }

      set({ profile, loadingProfile: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load profile';
      console.error('[sessionStore] Failed to load profile:', errorMessage, error);
      set({ loadingProfile: false, profileError: errorMessage });
      throw error;
    }
  },

  login: async (username, password) => {
    set({ error: null });
    try {
      await signIn(username, password);
      // Profile will be loaded by the `observeAuth` callback in `initialize`
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown login error' });
      throw error;
    }
  },

  logout: async () => {
    await signOut();
    // User and profile state will be cleared by the `observeAuth` callback
  },

  setWorldId: (worldId) => set({ worldId }),
}));
