import { getSupabaseClient } from '../supabase';
import { ResourceType, Resources } from '@/types';

export interface ShipyardQueueRow {
  id: string;
  player_id: string;
  ship_type: string;
  ship_quantity: number;
  cost_orichalkum: number;
  cost_fokuskristalle: number;
  cost_vitriol: number;
  started_at: string;
  duration_seconds: number;
  completed_at: string | null;
  status: 'queued' | 'building' | 'completed' | 'cancelled';
}

export interface ShipyardOrderPayload {
  id: string;
  playerId: string;
  blueprintId: string;
  quantity: number;
  cost: Resources;
  startTime: number;
  durationSeconds: number;
}

/**
 * Loads the current shipyard queue for the supplied player.
 *
 * @param playerId - Owner of the shipyard queue.
 */
export const fetchShipyardQueue = async (playerId: string): Promise<ShipyardQueueRow[]> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('shipyard_queue')
    .select('*')
    .eq('player_id', playerId)
    .order('started_at', { ascending: true });

  if (error) {
    console.error('[shipyardApi] Failed to fetch shipyard queue', error);
    return [];
  }
  return data as ShipyardQueueRow[];
};

/**
 * Persists a new shipyard order row so Realtime + persistence stay in sync.
 *
 * @param payload - Order data mirrored from the shipyard store.
 */
export const createShipyardOrder = async (payload: ShipyardOrderPayload): Promise<void> => {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('shipyard_queue').insert({
    id: payload.id,
    player_id: payload.playerId,
    ship_type: payload.blueprintId,
    ship_quantity: payload.quantity,
    cost_orichalkum: Math.floor(payload.cost[ResourceType.Orichalkum]),
    cost_fokuskristalle: Math.floor(payload.cost[ResourceType.Fokuskristalle]),
    cost_vitriol: Math.floor(payload.cost[ResourceType.Vitriol]),
    started_at: new Date(payload.startTime).toISOString(),
    duration_seconds: Math.max(1, Math.round(payload.durationSeconds)),
    status: 'queued',
  });

  if (error) {
    throw error;
  }
};

/**
 * Updates the status of a shipyard order (completed/cancelled).
 *
 * @param orderId - Identifier shared with the local store entry.
 * @param status - New status string.
 */
export const updateShipyardOrderStatus = async (
  orderId: string,
  status: ShipyardQueueRow['status']
): Promise<void> => {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('shipyard_queue')
    .update({
      status,
      completed_at: status === 'completed' ? new Date().toISOString() : null,
    })
    .eq('id', orderId);

  if (error) {
    console.error('[shipyardApi] Failed to update order status', error);
  }
};
