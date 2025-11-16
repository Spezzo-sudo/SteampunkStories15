import { useEffect } from 'react';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { useSettlementStore } from '@/store/settlementStore';
import { useSessionStore } from '@/store/sessionStore';
import { useUiStore, ToastVariant } from '@/store/uiStore';

interface ConvoyRow {
  id: string;
  player_id: string;
  origin_settlement_id: string;
  target_tile_id: string;
  ship_ids: string[];
  mission_type: 'scout' | 'attack' | 'transport' | 'station' | 'colonize';
  status: 'preparing' | 'en_route' | 'arrived' | 'completed' | 'cancelled';
  cargo: Record<string, number> | null;
  preparation_ends_at: string | null;
  departure_time: string | null;
  arrival_time: string | null;
  created_at: string;
}

/**
 * Hook that subscribes to Realtime convoy updates and provides notifications.
 *
 * Listens for:
 * - INSERT: New convoy launched (by any player)
 * - UPDATE: Convoy status changes (preparing → en_route → arrived)
 * - DELETE: Convoy cancelled
 *
 * Provides notifications for:
 * - Incoming convoys targeting player's settlements
 * - Own convoy arrivals
 *
 * @param enabled - Whether to enable the subscription (default: true)
 */
export function useConvoyRealtimeSync(enabled = true) {
  const currentPlayerId = useSessionStore((state) => state.profile?.playerId);
  const { pushToast } = useUiStore();
  const settlements = useSettlementStore((state) => state.settlements);

  useRealtimeSubscription<ConvoyRow>({
    table: 'convoys',
    event: '*',
    debug: true,

    onInsert: (payload) => {
      const convoy = payload.new;
      console.log('[useConvoyRealtimeSync] New convoy detected:', convoy);

      // Check if convoy is targeting one of our settlements
      const targetedSettlement = settlements.find(
        (s) => s.tileId === convoy.target_tile_id && s.playerId === currentPlayerId
      );

      if (targetedSettlement && convoy.player_id !== currentPlayerId) {
        // Incoming hostile convoy!
        const missionTypeLabel = getMissionTypeLabel(convoy.mission_type);
        pushToast({
          title: '⚠️ Eingehende Flotte!',
          description: `${missionTypeLabel} zielt auf ${targetedSettlement.name}`,
          variant: ToastVariant.Warning,
        });
      }
    },

    onUpdate: (payload) => {
      const convoy = payload.new;
      const oldStatus = payload.old.status;
      const newStatus = convoy.status;

      console.log('[useConvoyRealtimeSync] Convoy updated:', {
        id: convoy.id,
        oldStatus,
        newStatus,
      });

      // Only notify on status transitions
      if (oldStatus === newStatus) return;

      // Notify if it's our convoy
      if (convoy.player_id === currentPlayerId) {
        if (newStatus === 'en_route' && oldStatus === 'preparing') {
          pushToast({
            title: 'Flotte gestartet',
            description: `Deine ${getMissionTypeLabel(convoy.mission_type)}-Mission ist unterwegs.`,
            variant: ToastVariant.Info,
          });
        }

        if (newStatus === 'arrived' && oldStatus === 'en_route') {
          pushToast({
            title: '✅ Flotte angekommen',
            description: `Deine ${getMissionTypeLabel(convoy.mission_type)}-Mission hat ihr Ziel erreicht.`,
            variant: ToastVariant.Success,
          });
        }
      }

      // Notify if it's targeting us
      const targetedSettlement = settlements.find(
        (s) => s.tileId === convoy.target_tile_id && s.playerId === currentPlayerId
      );

      if (targetedSettlement && convoy.player_id !== currentPlayerId) {
        if (newStatus === 'arrived' && oldStatus === 'en_route') {
          pushToast({
            title: '🚨 Feindliche Flotte eingetroffen!',
            description: `${getMissionTypeLabel(convoy.mission_type)} bei ${targetedSettlement.name}`,
            variant: ToastVariant.Error,
          });
        }
      }
    },

    onDelete: (payload) => {
      const convoy = payload.old;
      console.log('[useConvoyRealtimeSync] Convoy deleted/cancelled:', convoy);

      // Notify if it was our convoy
      if (convoy.player_id === currentPlayerId) {
        pushToast({
          title: 'Mission abgebrochen',
          description: `Die ${getMissionTypeLabel(convoy.mission_type)}-Mission wurde abgebrochen.`,
          variant: ToastVariant.Info,
        });
      }
    },
  });

  useEffect(() => {
    if (enabled) {
      console.log('[useConvoyRealtimeSync] Convoy Realtime sync enabled');
      console.log('[useConvoyRealtimeSync] Watching settlements:', settlements.length);
    } else {
      console.log('[useConvoyRealtimeSync] Convoy Realtime sync disabled');
    }
  }, [enabled, settlements.length]);
}

/**
 * Helper to get localized mission type labels
 */
function getMissionTypeLabel(missionType: string): string {
  const labels: Record<string, string> = {
    scout: 'Aufklärung',
    attack: 'Angriff',
    transport: 'Transport',
    station: 'Stationierung',
    colonize: 'Kolonisierung',
  };
  return labels[missionType] || missionType;
}
