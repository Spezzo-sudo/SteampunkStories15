import { useEffect, useRef } from 'react';
import { getSupabaseClient } from '@/services/supabase';
import { useSessionStore } from '@/store/sessionStore';

/**
 * Interval in milliseconds between heartbeat updates (30 seconds)
 */
const HEARTBEAT_INTERVAL = 30_000;

/**
 * A player is considered online if their last_active timestamp is within this threshold (5 minutes)
 */
export const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;

/**
 * Hook that sends periodic "heartbeat" updates to mark the player as active.
 *
 * Updates the `last_active` timestamp in the players table every 30 seconds.
 * This allows other players to see who is currently online.
 *
 * The heartbeat runs as long as the component using this hook is mounted.
 *
 * @param enabled - Whether to enable the heartbeat (default: true)
 */
export function useActivityHeartbeat(enabled = true) {
  const profile = useSessionStore((state) => state.profile);
  const user = useSessionStore((state) => state.user);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled || !user || !profile) {
      return;
    }

    /**
     * Updates the last_active timestamp for the current player
     */
    const sendHeartbeat = async () => {
      try {
        const supabase = getSupabaseClient();

        const { error } = await supabase
          .from('players')
          .update({
            last_active: new Date().toISOString(),
          })
          .eq('user_id', user.id);

        if (error) {
          console.error('[useActivityHeartbeat] Failed to update last_active:', error);
        } else {
          console.log('[useActivityHeartbeat] Heartbeat sent');
        }
      } catch (error) {
        console.error('[useActivityHeartbeat] Error sending heartbeat:', error);
      }
    };

    // Send initial heartbeat immediately
    sendHeartbeat();

    // Start periodic heartbeat
    intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

    console.log('[useActivityHeartbeat] Heartbeat started (interval:', HEARTBEAT_INTERVAL, 'ms)');

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        console.log('[useActivityHeartbeat] Heartbeat stopped');
      }
    };
  }, [enabled, user, profile]);
}

/**
 * Helper function to check if a player is currently online
 * based on their last_active timestamp
 */
export function isPlayerOnline(lastActive: string | Date | null): boolean {
  if (!lastActive) return false;

  const lastActiveDate = typeof lastActive === 'string' ? new Date(lastActive) : lastActive;
  const now = Date.now();
  const diff = now - lastActiveDate.getTime();

  return diff <= ONLINE_THRESHOLD_MS;
}

/**
 * Helper function to format last seen time
 */
export function formatLastSeen(lastActive: string | Date | null): string {
  if (!lastActive) return 'Nie gesehen';

  const lastActiveDate = typeof lastActive === 'string' ? new Date(lastActive) : lastActive;
  const now = Date.now();
  const diff = now - lastActiveDate.getTime();

  if (diff <= ONLINE_THRESHOLD_MS) {
    return 'Online';
  }

  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `Vor ${days} Tag${days === 1 ? '' : 'en'}`;
  }
  if (hours > 0) {
    return `Vor ${hours} Stunde${hours === 1 ? '' : 'n'}`;
  }
  if (minutes > 0) {
    return `Vor ${minutes} Minute${minutes === 1 ? '' : 'n'}`;
  }
  return 'Gerade eben';
}
