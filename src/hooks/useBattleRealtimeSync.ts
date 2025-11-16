import { useEffect } from 'react';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { useSessionStore } from '@/store/sessionStore';
import { useSettlementStore } from '@/store/settlementStore';
import { useUiStore, ToastVariant } from '@/store/uiStore';

interface BattleRow {
  id: string;
  attacker_id: string;
  attacker_settlement_id: string | null;
  defender_id: string;
  defender_settlement_id: string | null;
  tile_id: string;
  convoy_id: string | null;
  status: 'ongoing' | 'attacker_won' | 'defender_won' | 'stalemate';
  attacker_ships: Record<string, unknown> | null;
  defender_ships: Record<string, unknown> | null;
  defenses_involved: Record<string, unknown> | null;
  battle_report: Record<string, unknown> | null;
  resources_plundered: Record<string, unknown> | null;
  started_at: string;
  ended_at: string | null;
  created_at: string;
}

/**
 * Hook that subscribes to Realtime battle events and provides notifications.
 *
 * Listens for:
 * - INSERT: New battle started
 * - UPDATE: Battle status changes (ongoing → won/lost/stalemate)
 * - DELETE: Battle cancelled/removed
 *
 * Provides notifications for:
 * - You're being attacked!
 * - Battle won/lost
 * - Resources plundered
 *
 * @param enabled - Whether to enable the subscription (default: true)
 */
export function useBattleRealtimeSync(enabled = true) {
  const currentPlayerId = useSessionStore((state) => state.profile?.playerId);
  const { pushToast } = useUiStore();
  const settlements = useSettlementStore((state) => state.settlements);

  useRealtimeSubscription<BattleRow>({
    table: 'battles',
    event: '*',
    debug: true,

    onInsert: (payload) => {
      const battle = payload.new;
      console.log('[useBattleRealtimeSync] New battle started:', battle);

      // Check if we're the defender
      if (battle.defender_id === currentPlayerId) {
        const settlement = settlements.find((s) => s.id === battle.defender_settlement_id);
        const settlementName = settlement?.name || 'Unbekannte Siedlung';

        pushToast({
          title: '⚔️ Du wirst angegriffen!',
          description: `Kampf bei ${settlementName} hat begonnen!`,
          variant: ToastVariant.Error,
        });
      }

      // Check if we're the attacker
      if (battle.attacker_id === currentPlayerId) {
        pushToast({
          title: '⚔️ Kampf begonnen',
          description: 'Deine Flotte greift an!',
          variant: ToastVariant.Warning,
        });
      }
    },

    onUpdate: (payload) => {
      const battle = payload.new;
      const oldStatus = payload.old.status;
      const newStatus = battle.status;

      console.log('[useBattleRealtimeSync] Battle updated:', {
        id: battle.id,
        oldStatus,
        newStatus,
      });

      // Only notify on status transitions
      if (oldStatus === newStatus || oldStatus !== 'ongoing') {
        return;
      }

      // Battle ended - check results
      const isAttacker = battle.attacker_id === currentPlayerId;
      const isDefender = battle.defender_id === currentPlayerId;

      if (!isAttacker && !isDefender) {
        return; // Not our battle
      }

      const settlement = isDefender
        ? settlements.find((s) => s.id === battle.defender_settlement_id)
        : settlements.find((s) => s.id === battle.attacker_settlement_id);

      const settlementName = settlement?.name || 'Unbekannte Siedlung';

      // Determine outcome
      if (newStatus === 'attacker_won') {
        if (isAttacker) {
          // We won as attacker
          pushToast({
            title: '🎉 Sieg!',
            description: `Du hast ${settlementName} erobert!`,
            variant: ToastVariant.Success,
          });

          // Show plundered resources if available
          if (battle.resources_plundered) {
            const plundered = battle.resources_plundered as Record<string, number>;
            const resourceText = Object.entries(plundered)
              .map(([resource, amount]) => `${amount} ${resource}`)
              .join(', ');

            if (resourceText) {
              pushToast({
                title: '💰 Beute',
                description: `Erbeutet: ${resourceText}`,
                variant: ToastVariant.Info,
              });
            }
          }
        } else {
          // We lost as defender
          pushToast({
            title: '💀 Niederlage',
            description: `${settlementName} wurde erobert!`,
            variant: ToastVariant.Error,
          });
        }
      } else if (newStatus === 'defender_won') {
        if (isDefender) {
          // We won as defender
          pushToast({
            title: '🛡️ Verteidigt!',
            description: `${settlementName} erfolgreich verteidigt!`,
            variant: ToastVariant.Success,
          });
        } else {
          // We lost as attacker
          pushToast({
            title: '💀 Angriff abgewehrt',
            description: `Deine Flotte wurde zurückgeschlagen!`,
            variant: ToastVariant.Error,
          });
        }
      } else if (newStatus === 'stalemate') {
        pushToast({
          title: '⚖️ Unentschieden',
          description: `Kampf bei ${settlementName} endete unentschieden.`,
          variant: ToastVariant.Warning,
        });
      }
    },

    onDelete: (payload) => {
      const battle = payload.old;
      console.log('[useBattleRealtimeSync] Battle deleted/cancelled:', battle.id);

      // Only notify if battle was ongoing and we were involved
      if (battle.status === 'ongoing') {
        const isInvolved =
          battle.attacker_id === currentPlayerId || battle.defender_id === currentPlayerId;

        if (isInvolved) {
          pushToast({
            title: 'Kampf abgebrochen',
            description: 'Der Kampf wurde beendet.',
            variant: ToastVariant.Info,
          });
        }
      }
    },
  });

  useEffect(() => {
    if (enabled) {
      console.log('[useBattleRealtimeSync] Battle Realtime sync enabled');
      console.log('[useBattleRealtimeSync] Watching settlements:', settlements.length);
    } else {
      console.log('[useBattleRealtimeSync] Battle Realtime sync disabled');
    }
  }, [enabled, settlements.length]);
}
