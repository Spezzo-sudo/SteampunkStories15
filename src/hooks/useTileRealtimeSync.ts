import { useEffect } from 'react';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { useMapStore } from '@/store/mapStore';
import type { Tile } from '@/data/types';

/**
 * Hook that subscribes to Realtime tile updates and syncs them with the mapStore.
 *
 * Listens for:
 * - INSERT: New tiles (settlements placed)
 * - UPDATE: Tile ownership changes, settlement updates
 * - DELETE: Tile removal (rare, but handled)
 *
 * When a tile changes, it invalidates the region cache so that the next render
 * fetches fresh data from the server.
 *
 * @param enabled - Whether to enable the subscription (default: true)
 */
export function useTileRealtimeSync(enabled = true) {
  const invalidateRegionCache = useMapStore((state) => state.invalidateRegionCache);
  const currentRegionId = useMapStore((state) => state.world?.selectedRegionId);

  useRealtimeSubscription<Tile>({
    table: 'tiles',
    event: '*',
    debug: true,
    onUpdate: (payload) => {
      const updatedTile = payload.new;
      console.log('[useTileRealtimeSync] Tile updated:', updatedTile);

      // Invalidate region cache to force refresh
      if (updatedTile.regionId) {
        invalidateRegionCache(updatedTile.regionId);
      }

      // If this tile is in the currently viewed region, reload the region
      if (currentRegionId && updatedTile.regionId === currentRegionId) {
        console.log('[useTileRealtimeSync] Reloading current region due to tile update');
        useMapStore.getState().loadRegion();
      }
    },
    onInsert: (payload) => {
      const newTile = payload.new;
      console.log('[useTileRealtimeSync] New tile inserted:', newTile);

      if (newTile.regionId) {
        invalidateRegionCache(newTile.regionId);
      }

      if (currentRegionId && newTile.regionId === currentRegionId) {
        console.log('[useTileRealtimeSync] Reloading current region due to new tile');
        useMapStore.getState().loadRegion();
      }
    },
    onDelete: (payload) => {
      const deletedTile = payload.old;
      console.log('[useTileRealtimeSync] Tile deleted:', deletedTile);

      if (deletedTile.regionId) {
        invalidateRegionCache(deletedTile.regionId);
      }

      if (currentRegionId && deletedTile.regionId === currentRegionId) {
        console.log('[useTileRealtimeSync] Reloading current region due to tile deletion');
        useMapStore.getState().loadRegion();
      }
    },
  });

  // Log when subscription is enabled/disabled
  useEffect(() => {
    if (enabled) {
      console.log('[useTileRealtimeSync] Tile Realtime sync enabled');
    } else {
      console.log('[useTileRealtimeSync] Tile Realtime sync disabled');
    }
  }, [enabled]);
}
