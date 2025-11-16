import { useEffect, useRef } from 'react';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/services/supabase';

/**
 * Payload types for different Realtime events
 */
export type RealtimeInsertPayload<T> = RealtimePostgresChangesPayload<{
  [key: string]: unknown;
}> & {
  new: T;
  eventType: 'INSERT';
};

export type RealtimeUpdatePayload<T> = RealtimePostgresChangesPayload<{
  [key: string]: unknown;
}> & {
  old: Partial<T>;
  new: T;
  eventType: 'UPDATE';
};

export type RealtimeDeletePayload<T> = RealtimePostgresChangesPayload<{
  [key: string]: unknown;
}> & {
  old: T;
  eventType: 'DELETE';
};

/**
 * Configuration for Realtime subscription
 */
export interface RealtimeSubscriptionConfig<T> {
  /** The table name to subscribe to */
  table: string;
  /** Optional event filter (e.g., 'INSERT', 'UPDATE', 'DELETE') */
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  /** Optional filter for specific rows (e.g., 'owner_id=eq.123') */
  filter?: string;
  /** Callback for INSERT events */
  onInsert?: (payload: RealtimeInsertPayload<T>) => void;
  /** Callback for UPDATE events */
  onUpdate?: (payload: RealtimeUpdatePayload<T>) => void;
  /** Callback for DELETE events */
  onDelete?: (payload: RealtimeDeletePayload<T>) => void;
  /** Callback for any change (fallback if specific handlers not provided) */
  onChange?: (payload: RealtimePostgresChangesPayload<{ [key: string]: unknown }>) => void;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * React hook for subscribing to Supabase Realtime events.
 *
 * Automatically manages subscription lifecycle (subscribe on mount, unsubscribe on unmount).
 * Supports granular event handlers (onInsert, onUpdate, onDelete) or a generic onChange handler.
 *
 * @example
 * ```tsx
 * // Subscribe to all tile changes
 * useRealtimeSubscription({
 *   table: 'tiles',
 *   event: '*',
 *   onUpdate: (payload) => {
 *     console.log('Tile updated:', payload.new);
 *     // Update local state
 *   }
 * });
 *
 * // Subscribe to messages in a specific room
 * useRealtimeSubscription({
 *   table: 'messages',
 *   event: 'INSERT',
 *   filter: `room_id=eq.${roomId}`,
 *   onInsert: (payload) => {
 *     addMessageToState(payload.new);
 *   }
 * });
 * ```
 */
export function useRealtimeSubscription<T = Record<string, unknown>>(
  config: RealtimeSubscriptionConfig<T>
) {
  const { table, event = '*', filter, onInsert, onUpdate, onDelete, onChange, debug = false } = config;
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();

    // Create unique channel name
    const channelName = `realtime:${table}:${event}:${filter || 'all'}`;

    if (debug) {
      console.log(`[useRealtimeSubscription] Subscribing to ${channelName}`);
    }

    // Create channel
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event,
          schema: 'public',
          table,
          ...(filter ? { filter } : {}),
        },
        (payload) => {
          if (debug) {
            console.log(`[useRealtimeSubscription] Event received:`, payload);
          }

          // Type-safe event routing
          switch (payload.eventType) {
            case 'INSERT':
              if (onInsert) {
                onInsert(payload as RealtimeInsertPayload<T>);
              } else if (onChange) {
                onChange(payload);
              }
              break;
            case 'UPDATE':
              if (onUpdate) {
                onUpdate(payload as RealtimeUpdatePayload<T>);
              } else if (onChange) {
                onChange(payload);
              }
              break;
            case 'DELETE':
              if (onDelete) {
                onDelete(payload as RealtimeDeletePayload<T>);
              } else if (onChange) {
                onChange(payload);
              }
              break;
            default:
              if (onChange) {
                onChange(payload);
              }
          }
        }
      )
      .subscribe((status) => {
        if (debug) {
          console.log(`[useRealtimeSubscription] Status: ${status}`);
        }
      });

    channelRef.current = channel;

    // Cleanup on unmount
    return () => {
      if (debug) {
        console.log(`[useRealtimeSubscription] Unsubscribing from ${channelName}`);
      }
      channel.unsubscribe();
    };
  }, [table, event, filter, onInsert, onUpdate, onDelete, onChange, debug]);

  return channelRef;
}
