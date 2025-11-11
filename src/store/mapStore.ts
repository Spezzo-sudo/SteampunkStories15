import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { HomeSelection, Region, Settlement, Tile, World } from '@/data/types';
import { CONFIG } from '@/config/mapConfig';
import { ensureRegionCentroid, generateRegionTiles } from '@/lib/hexgrid/microRegion';
import { bootstrapWorld } from '@/services/firebase/worldData';
import { observeRegionTiles, setWorldHome } from '@/services/firebase/gameApi';
import { useSessionStore } from './sessionStore';
import { updatePlayerProfile } from '@/services/firebase/playerApi';

export type MapMode = 'macro' | 'micro';

export interface TransportState {
  regionId: string;
  tileKey: string;
}

export interface MapStore {
  mode: MapMode;
  world: World | null;
  activeRegion: Region | null;
  home: HomeSelection | null;
  worldId: string;
  loadingWorld: boolean;
  worldError: string | null;
  regionUnsubscribe: (() => void) | null;
  transportOrigin: TransportState | null;
  selectedTileForPopup: Tile | null;
  buildMenuTile: Tile | null;

  loadWorld: (worldId?: string) => Promise<void>;
  selectRegion: (regionId: string) => void;
  setHoveredRegion: (regionId?: string) => void;
  backToMacro: () => void;
  toggleAllianceFilter: () => void;
  setAllianceFilter: (value: boolean) => void;
  setSettlement: (regionId: string, tileKey: string, settlement?: Settlement) => void;
  setHomeOnce: (regionId: string, q: number, r: number) => Promise<boolean>;
  settleTile: (regionId: string, tileKey: string) => void;
  initiateTransport: (regionId: string, tileKey: string) => void;
  cancelTransport: () => void;
  openActionPopup: (tile: Tile) => void;
  closeActionPopup: () => void;
  openBuildMenu: (tile: Tile) => void;
  closeBuildMenu: () => void;
  handleTileClick: (tile: Tile) => void;
  canBuild: () => boolean;
  setWorldId: (worldId: string) => void;
  setActiveRegion: (region: Region) => void; // New action
}

export const useMapStore = create<MapStore>()(
  immer((set, get) => ({
    mode: 'macro',
    world: null,
    activeRegion: null,
    home: null,
    worldId: 'playtest-world',
    loadingWorld: false,
    worldError: null,
    regionUnsubscribe: null,
    transportOrigin: null,
    selectedTileForPopup: null,
    buildMenuTile: null,

    loadWorld: async (worldIdParam) => {
      const effectiveWorldId = worldIdParam ?? get().worldId;
      get().regionUnsubscribe?.();
      set((state) => {
        state.loadingWorld = true;
        state.worldError = null;
        state.regionUnsubscribe = null;
      });
      try {
        const world = await bootstrapWorld(effectiveWorldId);
        world.regions.forEach((region) => ensureRegionCentroid(region, CONFIG.microHexSizePx));

        // Ensure home is hydrated immutably.
        const hydratedHome = world.home ? { ...world.home, setAt: world.home.setAt ?? Date.now() } : null;
        const nextWorld = hydratedHome ? { ...world, home: hydratedHome } : world;

        set((state) => {
          state.world = nextWorld;
          state.loadingWorld = false;
          state.worldError = null;
          state.home = hydratedHome;
          state.worldId = effectiveWorldId;
        });
      } catch (error) {
        set((state) => {
          state.loadingWorld = false;
          state.worldError = error instanceof Error ? error.message : 'Unbekannter Fehler';
        });
      }
    },

    selectRegion: (regionId) => {
      const { activeRegion, world } = get();

      // If the selected region is already active, do nothing to prevent re-render loops.
      if (activeRegion?.id === regionId) {
        return;
      }

      if (!world) return;
      const region = world.regions.find((entry) => entry.id === regionId);
      if (!region) return;

      get().setActiveRegion(region);
    },

    setActiveRegion: (region) => {
      get().regionUnsubscribe?.();

      let nextRegion = { ...region };
      if (!nextRegion.tiles || nextRegion.tiles.length === 0) {
        const placeholderTiles = generateRegionTiles(nextRegion.id, nextRegion.allianceId);
        nextRegion.tiles = placeholderTiles;
      }

      set((state) => {
        if (state.world) {
          const regionIndex = state.world.regions.findIndex((r) => r.id === nextRegion.id);
          if (regionIndex !== -1) {
            state.world.regions[regionIndex] = nextRegion;
          }
          state.world.selectedRegionId = nextRegion.id;
        }
        state.mode = 'micro';
        state.activeRegion = nextRegion;
        state.transportOrigin = null;
      });

      const { worldId } = get();
      const unsubscribe = observeRegionTiles(worldId, nextRegion.id, (tiles) => {
        if (!tiles.length) return;
        set((state) => {
          if (!state.world || !state.activeRegion) return;
          const regionIndex = state.world.regions.findIndex((r) => r.id === nextRegion.id);
          if (regionIndex === -1) return;

          const updatedRegion: Region = { ...state.activeRegion, tiles };
          ensureRegionCentroid(updatedRegion, CONFIG.microHexSizePx);

          state.world.regions[regionIndex] = updatedRegion;
          state.activeRegion = updatedRegion;
        });
      });
      set((state) => {
        state.regionUnsubscribe = unsubscribe;
      });
    },

    setHoveredRegion: (regionId) => {
      set((state) => {
        if (state.world) state.world.hoveredRegionId = regionId;
      });
    },

    backToMacro: () => {
      get().regionUnsubscribe?.();
      set((state) => {
        state.regionUnsubscribe = null;
        state.transportOrigin = null;
        state.selectedTileForPopup = null;
        state.buildMenuTile = null;
        state.mode = 'macro';
        state.activeRegion = null;
        if (state.world) {
          state.world.selectedRegionId = undefined;
        }
      });
    },

    toggleAllianceFilter: () => {
      set((state) => {
        if (state.world) state.world.allianceFilterOn = !state.world.allianceFilterOn;
      });
    },

    setAllianceFilter: (value) => {
      set((state) => {
        if (state.world && state.world.allianceFilterOn !== value) {
          state.world.allianceFilterOn = value;
        }
      });
    },

    setSettlement: (regionId, tileKey, settlement) => {
      set((state) => {
        if (!state.world) return;
        const regionIndex = state.world.regions.findIndex((r) => r.id === regionId);
        if (regionIndex === -1) return;

        const region = state.world.regions[regionIndex];
        const tileIndex = region.tiles.findIndex((t) => `${t.q},${t.r}` === tileKey);
        if (tileIndex === -1) return;

        region.tiles[tileIndex].hasSettlement = settlement;

        if (state.activeRegion?.id === regionId) {
          state.activeRegion.tiles[tileIndex].hasSettlement = settlement;
        }
      });
    },

    setHomeOnce: async (regionId, q, r) => {
      const { user, profile } = useSessionStore.getState();
      const { worldId, home, world } = get();

      if (home || profile?.hasPlacedHome || !world || !user) return false;

      const tileKey = `${q},${r}`;
      const nextHome: HomeSelection = { regionId, tileKey, setAt: Date.now() };

      try {
        await setWorldHome(worldId, nextHome);
        await updatePlayerProfile(user.uid, { hasPlacedHome: true });

        set((state) => {
          if (state.world) state.world.home = nextHome;
          state.home = nextHome;
        });

        get().setSettlement(regionId, tileKey, { playerId: user.uid, icon: 'TOWN' });
        useSessionStore.setState({ profile: { ...profile!, hasPlacedHome: true } });

        return true;
      } catch (error) {
        console.error("Failed to set home base:", error);
        return false;
      }
    },

    settleTile: (regionId, tileKey) => {
      if (!get().canBuild()) return;
      const region = get().world?.regions.find((r) => r.id === regionId);
      const tile = region?.tiles.find((t) => `${t.q},${t.r}` === tileKey);
      if (tile?.hasSettlement) return;
      get().setSettlement(regionId, tileKey, { playerId: 'player-home', icon: 'OUTPOST' });
    },

    initiateTransport: (regionId, tileKey) => {
      set((state) => {
        state.transportOrigin = { regionId, tileKey };
        state.selectedTileForPopup = null;
      });
    },

    cancelTransport: () => {
      set((state) => {
        state.transportOrigin = null;
      });
    },

    openActionPopup: (tile) => {
      set((state) => {
        state.selectedTileForPopup = tile;
        state.transportOrigin = null;
        state.buildMenuTile = null;
      });
    },

    closeActionPopup: () => {
      set((state) => {
        state.selectedTileForPopup = null;
      });
    },

    openBuildMenu: (tile) => {
      set((state) => {
        state.buildMenuTile = tile;
        state.selectedTileForPopup = null;
      });
    },

    closeBuildMenu: () => {
      set((state) => {
        state.buildMenuTile = null;
      });
    },

    handleTileClick: (tile) => {
      const { transportOrigin, setHomeOnce, mode, openActionPopup, buildMenuTile } = get();
      const { profile } = useSessionStore.getState();

      if (buildMenuTile) return;

      if (mode === 'micro' && profile && !profile.hasPlacedHome) {
        void setHomeOnce(tile.regionId, tile.q, tile.r);
        return;
      }

      if (transportOrigin) {
        const from = transportOrigin.tileKey;
        const to = `${tile.q},${tile.r}`;
        console.log(`Executing transport from ${from} to ${to}`);
        get().cancelTransport();
      } else {
        openActionPopup(tile);
      }
    },

    canBuild: () => {
      const home = get().home ?? get().world?.home;
      return Boolean(home?.regionId && home?.tileKey);
    },

    setWorldId: (worldId) => {
      set((state) => {
        state.worldId = worldId;
      });
    },
  })),
);
