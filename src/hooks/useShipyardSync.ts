import { useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useShipyardStore } from '@/store/shipyardStore';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { ShipyardQueueRow } from '@/services/supabase/shipyardApi';

/**
 * Hooks the shipyard store into Supabase: initial load + realtime updates.
 */
export const useShipyardSync = (debug = false) => {
  const playerId = useGameStore((state) => state.playerId);
  const loadRemoteQueue = useShipyardStore((state) => state.loadRemoteQueue);
  const upsertRemoteOrder = useShipyardStore((state) => state.upsertRemoteOrder);
  const removeRemoteOrder = useShipyardStore((state) => state.removeRemoteOrder);

  useEffect(() => {
    if (!playerId) {
      return;
    }
    loadRemoteQueue(playerId);
  }, [playerId, loadRemoteQueue]);

  useRealtimeSubscription<ShipyardQueueRow>({
    table: 'shipyard_queue',
    event: '*',
    filter: playerId ? `player_id=eq.${playerId}` : 'player_id=eq.__none__',
    onInsert: (payload) => upsertRemoteOrder(payload.new),
    onUpdate: (payload) => upsertRemoteOrder(payload.new),
    onDelete: (payload) => {
      const orderId = (payload.old as ShipyardQueueRow | undefined)?.id;
      if (orderId) {
        removeRemoteOrder(orderId);
      }
    },
    debug,
  });
};
