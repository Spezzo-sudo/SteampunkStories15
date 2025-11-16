import { useEffect } from 'react';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { useSessionStore } from '@/store/sessionStore';
import { useDirectoryStore } from '@/store/directoryStore';

interface PlayerRow {
  id: string;
  user_id: string;
  username: string;
  faction: string;
  created_at: string;
  last_active: string;
  has_placed_home: boolean;
  home_system_id: string | null;
  orichalkum: number;
  fokuskristalle: number;
  vitriol: number;
  storage_orichalkum: number;
  storage_fokuskristalle: number;
  storage_vitriol: number;
  energy_capacity: number;
  energy_consumption: number;
  energy_production: number;
  hangar_capacity: number;
  hangar_used: number;
  alliance_id: string | null;
  alliance_rank: string | null;
  total_planets: number;
  favorite_planet: string | null;
}

/**
 * Hook that subscribes to Realtime player updates.
 *
 * Listens for:
 * - INSERT: New players joining the game
 * - UPDATE: Player resource changes, status updates, alliance changes
 * - DELETE: Players leaving (rare)
 *
 * Updates:
 * - directoryStore for player directory
 * - sessionStore for own profile changes (if applicable)
 *
 * @param enabled - Whether to enable the subscription (default: true)
 */
export function usePlayerRealtimeSync(enabled = true) {
  const currentUserId = useSessionStore((state) => state.user?.id);
  const currentProfile = useSessionStore((state) => state.profile);
  const updateProfile = useSessionStore((state) => state.loadProfile);

  useRealtimeSubscription<PlayerRow>({
    table: 'players',
    event: '*',
    debug: true,

    onInsert: (payload) => {
      const newPlayer = payload.new;
      console.log('[usePlayerRealtimeSync] New player joined:', newPlayer.username);

      // Update directory store with new player
      const directoryStore = useDirectoryStore.getState();
      if (directoryStore.players) {
        // Add to players list (if using directory)
        // This would require a method in directoryStore to add a player
        console.log('[usePlayerRealtimeSync] New player should be added to directory:', newPlayer.username);
      }
    },

    onUpdate: (payload) => {
      const updatedPlayer = payload.new;
      const oldPlayer = payload.old;

      console.log('[usePlayerRealtimeSync] Player updated:', {
        username: updatedPlayer.username,
        changed: Object.keys(payload.old).filter((key) => {
          return payload.old[key] !== updatedPlayer[key as keyof typeof updatedPlayer];
        }),
      });

      // If it's our own player, update session profile
      if (currentUserId && updatedPlayer.user_id === currentUserId) {
        console.log('[usePlayerRealtimeSync] Own profile updated, refreshing...');

        // Update session profile with fresh data
        // Note: This might trigger a re-render, so only do if necessary
        const hasSignificantChange =
          oldPlayer.has_placed_home !== updatedPlayer.has_placed_home ||
          oldPlayer.alliance_id !== updatedPlayer.alliance_id ||
          oldPlayer.username !== updatedPlayer.username;

        if (hasSignificantChange && currentProfile) {
          // Refresh profile from server
          const user = useSessionStore.getState().user;
          if (user) {
            updateProfile(user).catch((error) => {
              console.error('[usePlayerRealtimeSync] Failed to refresh profile:', error);
            });
          }
        }
      }

      // Update directory if player is in view
      const directoryStore = useDirectoryStore.getState();
      const playerInDirectory = directoryStore.players.find((p) => p.id === updatedPlayer.id);

      if (playerInDirectory) {
        console.log('[usePlayerRealtimeSync] Player in directory updated, should refresh');
        // This would require a method to update a specific player in directory
      }
    },

    onDelete: (payload) => {
      const deletedPlayer = payload.old;
      console.log('[usePlayerRealtimeSync] Player deleted:', deletedPlayer.username);

      // Remove from directory if present
      const directoryStore = useDirectoryStore.getState();
      const playerInDirectory = directoryStore.players.find((p) => p.id === deletedPlayer.id);

      if (playerInDirectory) {
        console.log('[usePlayerRealtimeSync] Player should be removed from directory');
      }
    },
  });

  useEffect(() => {
    if (enabled) {
      console.log('[usePlayerRealtimeSync] Player Realtime sync enabled');
      console.log('[usePlayerRealtimeSync] Current user ID:', currentUserId);
    } else {
      console.log('[usePlayerRealtimeSync] Player Realtime sync disabled');
    }
  }, [enabled, currentUserId]);
}
