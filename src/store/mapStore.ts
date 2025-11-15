import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { HomeSelection, Region, Tile } from '@/data/types';
import { listRegions } from '@/services/supabase/worldData';
import { fetchRegion } from '@/services/supabase/gameApi';

export interface World {
  regions: Region[];
  selectedRegionId: string | null;
  hoveredRegionId: string | null;
  allianceFilterOn: boolean;
  home: HomeSelection | null;
}

interface MapState {
  view: 'macro' | 'micro';
  worldId: string | null;
  world: World | null;
  loadingWorld: boolean;
  worldError: string | null;
  selectedTileForPopup: Tile | null;
  buildMenuTile: Tile | null;
  region: Region | null;
  home: HomeSelection | null;
}

interface MapActions {
  init: (home: HomeSelection) => void;
  loadWorld: () => Promise<void>;
  loadRegion: () => Promise<void>;
  setWorldId: (worldId: string) => void;
  setHoveredRegion: (region: Region | null) => void;
  handleTileClick: (tile: Tile) => void;
  openActionPopup: (tile: Tile) => void;
  closeActionPopup: () => void;
  openBuildMenu: (tile: Tile) => void;
  closeBuildMenu: () => void;
  backToMacro: () => void;
  selectRegion: (region: Region) => Promise<void>;
  setRegion: (region: Region) => void;
  toggleAllianceFilter: () => void;
  invalidateRegionCache: (regionId: string) => void;
}

const regionCache = new Map<string, Region | null>();
const pendingRegionLoads = new Map<string, Promise<Region | null>>();

const tilesEqual = (a: Tile | null, b: Tile | null) => !!a && !!b && a.q === b.q && a.r === b.r;

const ensureWorldShell = (state: MapState & MapActions) => {
  if (!state.world) {
    state.world = {
      regions: [],
      selectedRegionId: null,
      hoveredRegionId: null,
      allianceFilterOn: false,
      home: state.home,
    };
  } else {
    state.world.home = state.home;
  }
};

/**
 * Zustand store orchestrating macro and micro map state, including cached region lookups.
 */
export const useMapStore = create(
  immer<MapState & MapActions>((set, get) => ({
    view: 'macro',
    worldId: null,
    world: null,
    loadingWorld: false,
    worldError: null,
    selectedTileForPopup: null,
    buildMenuTile: null,
    region: null,
    home: null,

    init: (home) => {
      set((state) => {
        const current = state.home;
        if (current?.regionId === home.regionId && current?.tileKey === home.tileKey) {
          return;
        }
        state.home = home;
        if (state.world) {
          state.world.home = home;
        }
      });
    },

    loadWorld: async () => {
      const { worldId, loadingWorld } = get();
      if (loadingWorld) {
        console.log('[mapStore] loadWorld already in progress, skipping');
        return;
      }
      if (!worldId) {
        console.error('[mapStore] loadWorld: No worldId available');
        set({ worldError: 'Keine Welt-ID verfügbar.' });
        return;
      }
      console.log('[mapStore] loadWorld: Starting to fetch regions for worldId:', worldId);
      set({ loadingWorld: true, worldError: null });
      try {
        const startTime = performance.now();
        const regions = await listRegions(worldId);
        const endTime = performance.now();
        console.log(`[mapStore] loadWorld: Fetched ${regions.length} regions in ${(endTime - startTime).toFixed(2)}ms`);
        set((state) => {
          const allianceFilterOn = state.world?.allianceFilterOn ?? false;
          const selectedRegionId = state.world?.selectedRegionId ?? null;
          const hoveredRegionId = state.world?.hoveredRegionId ?? null;
          state.world = {
            regions,
            allianceFilterOn,
            selectedRegionId,
            hoveredRegionId,
            home: state.home,
          };
          state.loadingWorld = false;
          console.log('[mapStore] loadWorld: World state updated, loadingWorld set to false');
        });
      } catch (error) {
        console.error('[mapStore] Failed to load world:', error);
        const message =
          error instanceof Error ? error.message : 'Regionen konnten nicht geladen werden.';
        set({ worldError: message, loadingWorld: false, world: null });
      }
    },

    loadRegion: async () => {
      const { worldId } = get();
      const selectedRegionId = get().world?.selectedRegionId;
      if (!worldId || !selectedRegionId) {
        return;
      }

      const cached = regionCache.get(selectedRegionId);
      if (cached !== undefined) {
        if (cached && get().region !== cached) {
          set({ region: cached });
        }
        if (cached === null && get().region !== null) {
          set({ region: null });
        }
        return;
      }

      const pending = pendingRegionLoads.get(selectedRegionId);
      if (pending) {
        await pending;
        return;
      }

      const loadPromise = (async () => {
        try {
          const region = await fetchRegion(worldId, selectedRegionId);
          return region ?? null;
        } catch (error) {
          console.error('Failed to load region:', error);
          return null;
        }
      })();

      pendingRegionLoads.set(selectedRegionId, loadPromise);

      const region = await loadPromise;
      regionCache.set(selectedRegionId, region);
      pendingRegionLoads.delete(selectedRegionId);

      if (region) {
        set({ region });
      } else if (get().region !== null) {
        set({ region: null });
      }
    },

    setWorldId: (worldId) => {
      if (worldId === get().worldId) {
        return;
      }
      regionCache.clear();
      pendingRegionLoads.clear();
      set({
        worldId,
        world: null,
        worldError: null,
        view: 'macro',
        region: null,
        selectedTileForPopup: null,
        buildMenuTile: null,
      });
    },

    setHoveredRegion: (region) => {
      set((state) => {
        if (!state.world) {
          return;
        }
        const nextId = region?.id ?? null;
        if (state.world.hoveredRegionId === nextId) {
          return;
        }
        state.world.hoveredRegionId = nextId;
      });
    },

    handleTileClick: (tile) => {
      if (get().buildMenuTile) return;

      if (tilesEqual(get().selectedTileForPopup, tile)) {
        get().closeActionPopup();
      } else {
        get().openActionPopup(tile);
      }
    },

    openActionPopup: (tile) => {
      set((state) => {
        if (tilesEqual(state.selectedTileForPopup, tile)) {
          return;
        }
        state.selectedTileForPopup = tile;
        state.buildMenuTile = null;
      });
    },

    closeActionPopup: () => {
      if (get().selectedTileForPopup !== null) {
        set({ selectedTileForPopup: null });
      }
    },

    openBuildMenu: (tile) => {
      set((state) => {
        if (tilesEqual(state.buildMenuTile, tile)) {
          return;
        }
        state.buildMenuTile = tile;
        state.selectedTileForPopup = null;
      });
    },

    closeBuildMenu: () => {
      if (get().buildMenuTile !== null) {
        set({ buildMenuTile: null });
      }
    },

    backToMacro: () => {
      set((state) => {
        if (state.view === 'macro') {
          return;
        }
        state.view = 'macro';
        state.region = null;
        state.selectedTileForPopup = null;
        state.buildMenuTile = null;
        ensureWorldShell(state);
        state.world!.selectedRegionId = null;
      });
    },

    selectRegion: async (region) => {
      const worldId = get().worldId;
      if (!worldId || !region.id) {
        console.error('selectRegion called with invalid world or region ID', {
          worldId,
          regionId: region.id,
        });
        return;
      }

      set((state) => {
        state.view = 'micro';
        state.selectedTileForPopup = null;
        state.buildMenuTile = null;
        ensureWorldShell(state);
        state.world!.selectedRegionId = region.id;
        state.world!.hoveredRegionId = region.id;
      });

      const cached = regionCache.get(region.id);
      if (cached !== undefined) {
        if (cached && get().region !== cached) {
          set({ region: cached });
        }
        if (cached === null && get().region !== null) {
          set({ region: null });
        }
        return;
      }

      const pending = pendingRegionLoads.get(region.id);
      if (pending) {
        const result = await pending;
        if (result) {
          set({ region: result });
        } else if (get().region !== null) {
          set({ region: null });
        }
        return;
      }

      try {
        const fetchPromise = (async () => {
          try {
            const result = await fetchRegion(worldId, region.id);
            return result ?? null;
          } catch (error) {
            console.error('Failed to fetch region:', error);
            return null;
          }
        })();

        pendingRegionLoads.set(region.id, fetchPromise);

        const fullRegion = await fetchPromise;
        regionCache.set(region.id, fullRegion);
        pendingRegionLoads.delete(region.id);

        if (fullRegion) {
          set({ region: fullRegion });
        } else if (get().region !== null) {
          set({ region: null });
        }
      } catch (error) {
        console.error('Failed to fetch region:', error);
        regionCache.set(region.id, null);
        pendingRegionLoads.delete(region.id);
      }
    },

    setRegion: (region) => {
      set((state) => {
        state.region = region;
        if (region?.id) {
          regionCache.set(region.id, region);
          ensureWorldShell(state);
          state.world!.selectedRegionId = region.id;
        }
      });
    },

    toggleAllianceFilter: () => {
      set((state) => {
        ensureWorldShell(state);
        state.world!.allianceFilterOn = !state.world!.allianceFilterOn;
      });
    },

    invalidateRegionCache: (regionId) => {
      console.log('[mapStore] Invalidating cache for region:', regionId);
      regionCache.delete(regionId);
      pendingRegionLoads.delete(regionId);
    },
  })),
);
