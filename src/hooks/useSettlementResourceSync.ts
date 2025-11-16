import { useEffect, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useSessionStore } from '@/store/sessionStore';
import { useSettlementStore } from '@/store/settlementStore';
import { useSyncStatusStore } from '@/store/syncStatusStore';
import { getPlayerSettlements, updateSettlement } from '@/services/supabase/settlementApi';
import { ResourceType } from '@/types';

/**
 * Interval in milliseconds between resource sync to server (60 seconds)
 * This prevents excessive writes while keeping data relatively fresh
 */
const RESOURCE_SYNC_INTERVAL = 60_000;

/**
 * Hook that synchronizes settlement resources with gameStore.
 *
 * Flow:
 * 1. On mount: Load settlement resources from DB → gameStore
 * 2. Periodically (60s): Push gameStore resources → DB
 * 3. On unmount: Final push to DB
 *
 * This creates a "settlement as source of truth" system where:
 * - Client-side simulation runs in gameStore
 * - Periodically synced to database
 * - Other players can see your resources via DB
 *
 * @param enabled - Whether to enable sync (default: true)
 */
export function useSettlementResourceSync(enabled = true) {
  const profile = useSessionStore((state) => state.profile);
  const resources = useGameStore((state) => state.resources);
  const storage = useGameStore((state) => state.storage);
  const buildings = useGameStore((state) => state.buildings);
  const kesseldruck = useGameStore((state) => state.kesseldruck);

  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mainSettlementIdRef = useRef<string | null>(null);
  const hasLoadedInitialRef = useRef(false);

  /**
   * Load settlement resources from database and update gameStore
   */
  const loadFromSettlement = async () => {
    if (!profile?.playerId) {
      console.log('[useSettlementResourceSync] No profile, skipping load');
      return;
    }

    try {
      console.log('[useSettlementResourceSync] Loading resources from settlement...');
      const settlements = await getPlayerSettlements(profile.playerId);

      if (settlements.length === 0) {
        console.log('[useSettlementResourceSync] No settlements found');
        return;
      }

      // Use first settlement as main base
      const mainSettlement = settlements[0];
      mainSettlementIdRef.current = mainSettlement.id;

      console.log('[useSettlementResourceSync] Main settlement:', mainSettlement.name);

      // Update gameStore with settlement data
      if (mainSettlement.resources) {
        useGameStore.setState({
          resources: {
            [ResourceType.Orichalkum]: mainSettlement.resources.Orichalkum || 0,
            [ResourceType.Fokuskristalle]: mainSettlement.resources.Fokuskristalle || 0,
            [ResourceType.Vitriol]: mainSettlement.resources.Vitriol || 0,
          },
        });
        console.log('[useSettlementResourceSync] Resources loaded from DB');
      }

      // Update storage capacities if available
      if (mainSettlement.capacities) {
        useGameStore.setState({
          storage: {
            [ResourceType.Orichalkum]: mainSettlement.capacities.orichalkum || 10000,
            [ResourceType.Fokuskristalle]: mainSettlement.capacities.fokuskristalle || 10000,
            [ResourceType.Vitriol]: mainSettlement.capacities.vitriol || 5000,
          },
        });
        console.log('[useSettlementResourceSync] Storage capacities loaded from DB');
      }

      // Update energy (Kesseldruck) if available
      if (mainSettlement.energy) {
        // Note: gameStore calculates energy dynamically from buildings
        // We don't override calculated values, but log for comparison
        console.log('[useSettlementResourceSync] Settlement energy:', mainSettlement.energy);
        console.log('[useSettlementResourceSync] Calculated energy:', kesseldruck);
      }

      hasLoadedInitialRef.current = true;
    } catch (error) {
      console.error('[useSettlementResourceSync] Failed to load from settlement:', error);
    }
  };

  /**
   * Save current gameStore resources to database
   */
  const saveToSettlement = async () => {
    if (!mainSettlementIdRef.current) {
      console.log('[useSettlementResourceSync] No settlement ID, skipping save');
      return;
    }

    try {
      console.log('[useSettlementResourceSync] Saving resources to settlement...');
      useSyncStatusStore.getState().setSyncing(true);

      await updateSettlement(mainSettlementIdRef.current, {
        resources: {
          Orichalkum: resources[ResourceType.Orichalkum],
          Fokuskristalle: resources[ResourceType.Fokuskristalle],
          Vitriol: resources[ResourceType.Vitriol],
        },
        capacities: {
          orichalkum: storage[ResourceType.Orichalkum],
          fokuskristalle: storage[ResourceType.Fokuskristalle],
          vitriol: storage[ResourceType.Vitriol],
        },
        energy: {
          production: kesseldruck.capacity,
          consumption: kesseldruck.consumption,
          current: kesseldruck.net,
        },
      });

      console.log('[useSettlementResourceSync] Resources saved to DB');
      useSyncStatusStore.getState().setLastSynced();
    } catch (error) {
      console.error('[useSettlementResourceSync] Failed to save to settlement:', error);
      useSyncStatusStore.getState().setSyncError(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  // Effect: Load initial resources from settlement
  useEffect(() => {
    if (!enabled || !profile?.playerId || hasLoadedInitialRef.current) {
      return;
    }

    console.log('[useSettlementResourceSync] Initial load triggered');
    loadFromSettlement();
  }, [enabled, profile?.playerId]);

  // Effect: Periodic save to settlement
  useEffect(() => {
    if (!enabled || !profile?.playerId || !hasLoadedInitialRef.current) {
      return;
    }

    console.log('[useSettlementResourceSync] Starting periodic sync (interval:', RESOURCE_SYNC_INTERVAL, 'ms)');

    // Start periodic save
    syncIntervalRef.current = setInterval(() => {
      saveToSettlement();
    }, RESOURCE_SYNC_INTERVAL);

    // Cleanup
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
        console.log('[useSettlementResourceSync] Periodic sync stopped');

        // Final save on unmount
        console.log('[useSettlementResourceSync] Performing final save...');
        saveToSettlement();
      }
    };
  }, [enabled, profile?.playerId, hasLoadedInitialRef.current]);

  // Return utility functions for manual control
  return {
    loadFromSettlement,
    saveToSettlement,
    mainSettlementId: mainSettlementIdRef.current,
  };
}
