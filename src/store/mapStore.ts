import { create } from 'zustand';
import type { Region, Settlement, World } from '@/data/types';
import { makeWorld } from '@/lib/hexgrid/macroWorld';
import { CONFIG } from '@/config/mapConfig';
import { ensureRegionCentroid } from '@/lib/hexgrid/microRegion';

/** Map modes supported by the galaxy view. */
export type MapMode = 'macro' | 'micro';

/** Store describing the macro ↔ micro navigation state. */
export interface MapStore {
  /** Current rendering mode. */
  mode: MapMode;
  /** Generated world containing macro and micro data. */
  world: World | null;
  /** Currently active region in micro mode. */
  activeRegion: Region | null;
  /** Loading indicator for the world bootstrap. */
  loadingWorld: boolean;
  /** Optional load error message. */
  worldError: string | null;

  /** Bootstraps the world layout. */
  loadWorld: () => Promise<void>;
  /** Switches to the micro view for the provided region. */
  selectRegion: (regionId: string) => void;
  /** Returns to the macro overview. */
  backToMacro: () => void;
  /** Toggles the alliance highlight overlay. */
  toggleAllianceFilter: () => void;
  /** Explicitly sets the alliance highlight overlay state. */
  setAllianceFilter: (value: boolean) => void;
  /** Updates a settlement badge on a specific tile. */
  setSettlement: (regionId: string, tileKey: string, settlement?: Settlement) => void;
}

/** Zustand store orchestrating the macro and micro map experience. */
export const useMapStore = create<MapStore>((set, get) => ({
  mode: 'macro',
  world: null,
  activeRegion: null,
  loadingWorld: false,
  worldError: null,

  loadWorld: async () => {
    set({ loadingWorld: true, worldError: null });
    try {
      const world = makeWorld();
      world.regions.forEach((region) => ensureRegionCentroid(region, CONFIG.microHexSizePx));
      set({ world, loadingWorld: false, worldError: null });
    } catch (error) {
      set({ loadingWorld: false, worldError: error instanceof Error ? error.message : 'Unbekannter Fehler' });
    }
  },

  selectRegion: (regionId) => {
    const world = get().world;
    if (!world) {
      return;
    }
    const region = world.regions.find((entry) => entry.id === regionId);
    if (!region) {
      return;
    }
    const nextWorld: World = { ...world, selectedRegionId: regionId };
    set({ mode: 'micro', world: nextWorld, activeRegion: region });
  },

  backToMacro: () => {
    const world = get().world;
    if (!world) {
      return;
    }
    const nextWorld: World = { ...world, selectedRegionId: undefined };
    set({ mode: 'macro', world: nextWorld, activeRegion: null });
  },

  toggleAllianceFilter: () => {
    const world = get().world;
    if (!world) {
      return;
    }
    const nextWorld: World = { ...world, allianceFilterOn: !world.allianceFilterOn };
    set({ world: nextWorld });
  },

  setAllianceFilter: (value) => {
    const world = get().world;
    if (!world) {
      return;
    }
    if (world.allianceFilterOn === value) {
      return;
    }
    const nextWorld: World = { ...world, allianceFilterOn: value };
    set({ world: nextWorld });
  },

  setSettlement: (regionId, tileKey, settlement) => {
    const world = get().world;
    if (!world) {
      return;
    }
    const regions = world.regions.map((region) => {
      if (region.id !== regionId) {
        return region;
      }
      const tiles = region.tiles.map((tile) => {
        if (`${tile.q},${tile.r}` !== tileKey) {
          return tile;
        }
        return { ...tile, hasSettlement: settlement };
      });
      return { ...region, tiles };
    });
    const nextWorld: World = { ...world, regions };
    const activeRegion = nextWorld.selectedRegionId
      ? regions.find((region) => region.id === nextWorld.selectedRegionId) ?? null
      : get().activeRegion;
    set({ world: nextWorld, activeRegion });
  },
}));
