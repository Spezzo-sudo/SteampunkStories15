import { create } from 'zustand';
import type { Region, Tile, HomeSelection } from '@/data/types';
import { immer } from 'zustand/middleware/immer';

interface MapState {
  view: 'macro' | 'micro';
  worldId: string | null;
  selectedRegionId: string | null;
  selectedTileForPopup: Tile | null;
  buildMenuTile: Tile | null;
  region: Region | null;
  home: HomeSelection | null;
}

interface MapActions {
  init: (home: HomeSelection) => void;
  setWorldId: (worldId: string) => void;
  handleTileClick: (tile: Tile) => void;
  openActionPopup: (tile: Tile) => void;
  closeActionPopup: () => void;
  openBuildMenu: (tile: Tile) => void;
  closeBuildMenu: () => void;
  backToMacro: () => void;
  selectRegion: (region: Region) => void;
  setRegion: (region: Region) => void;
}

export const useMapStore = create(immer<MapState & MapActions>((set, get) => ({
  // State
  view: 'macro',
  worldId: null,
  selectedRegionId: null,
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

  setWorldId: (worldId) => {
    if (worldId !== get().worldId) {
      set({ worldId });
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

  selectRegion: (region) => {
    if (get().selectedRegionId !== region.id) {
      set({
        view: 'micro',
        selectedRegionId: region.id,
        region: region,
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
