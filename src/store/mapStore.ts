import { create } from 'zustand';
import type { Region, Tile, HomeSelection } from '@/data/types';
import { immer } from 'zustand/middleware/immer';
import { listRegions } from '@/services/firebase/worldData';
import { fetchRegion } from '@/services/firebase/gameApi';

// The World object containing all static regions.
export interface World {
  regions: Region[];
}

interface MapState {
  view: 'macro' | 'micro';
  worldId: string | null;
  world: World | null;
  loadingWorld: boolean;
  worldError: string | null;
  selectedRegionId: string | null;
  hoveredRegion: Region | null;
  selectedTileForPopup: Tile | null;
  buildMenuTile: Tile | null;
  region: Region | null;
  home: HomeSelection | null;
}

interface MapActions {
  init: (home: HomeSelection) => void;
  loadWorld: () => Promise<void>;
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
}

export const useMapStore = create(immer<MapState & MapActions>((set, get) => ({
  // State
  view: 'macro',
  worldId: null,
  world: null,
  loadingWorld: false,
  worldError: null,
  selectedRegionId: null,
  hoveredRegion: null,
  selectedTileForPopup: null,
  buildMenuTile: null,
  region: null,
  home: null,

  // Actions
  init: (home) => {
    if (JSON.stringify(home) !== JSON.stringify(get().home)) {
      set({ home });
    }
  },

  loadWorld: async () => {
    if (get().world || get().loadingWorld) return;

    set({ loadingWorld: true, worldError: null });
    try {
      const regions = await listRegions();
      const world = { regions };
      set({ world: world, loadingWorld: false });
    } catch (error) {
      console.error('Failed to load world:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      set({ worldError: errorMessage, loadingWorld: false });
    }
  },

  setWorldId: (worldId) => {
    if (worldId !== get().worldId) {
      set({ worldId });
    }
  },

  setHoveredRegion: (region) => {
    if (get().hoveredRegion?.id !== region?.id) {
      set({ hoveredRegion: region });
    }
  },

  handleTileClick: (tile) => {
    if (get().buildMenuTile) return; // Don't do anything if build menu is open

    if (get().selectedTileForPopup?.q === tile.q && get().selectedTileForPopup?.r === tile.r) {
      // Clicked the same tile again, close the popup.
      get().closeActionPopup();
    } else {
      // Clicked a new tile, open the popup for it.
      get().openActionPopup(tile);
    }
  },

  openActionPopup: (tile) => {
    if (JSON.stringify(tile) !== JSON.stringify(get().selectedTileForPopup)) {
      set((state) => {
        state.selectedTileForPopup = tile;
        state.buildMenuTile = null; // Close build menu if it was open
      });
    }
  },

  closeActionPopup: () => {
    if (get().selectedTileForPopup !== null) {
      set({ selectedTileForPopup: null });
    }
  },

  openBuildMenu: (tile) => {
    if (JSON.stringify(tile) !== JSON.stringify(get().buildMenuTile)) {
      set((state) => {
        state.buildMenuTile = tile;
        state.selectedTileForPopup = null; // Close action popup
      });
    }
  },

  closeBuildMenu: () => {
    if (get().buildMenuTile !== null) {
      set({ buildMenuTile: null });
    }
  },

  backToMacro: () => {
    if (get().view !== 'macro') {
      set({
        view: 'macro',
        selectedRegionId: null,
        region: null,
        selectedTileForPopup: null,
        buildMenuTile: null,
      });
    }
  },

  selectRegion: async (region) => {
    if (get().selectedRegionId !== region.id) {
      const worldId = get().worldId;
      if (!worldId) {
        console.error('World ID not set');
        return;
      }
      const fullRegion = await fetchRegion(worldId, region.id);
      set({
        view: 'micro',
        selectedRegionId: region.id,
        region: fullRegion,
        selectedTileForPopup: null,
        buildMenuTile: null,
      });
    }
  },

  setRegion: (region) => {
    if (JSON.stringify(region) !== JSON.stringify(get().region)) {
      set({ region: region });
    }
  },
})));
