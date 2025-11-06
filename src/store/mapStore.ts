import { create } from 'zustand';
import { generateRegion } from '@/lib/regionGen';
import { hash32 } from '@/lib/rng';
import type { RegionData, RegionMeta } from '@/types/map';

interface WorldPayload {
  regions: RegionMeta[];
}

type MapMode = 'idle' | 'macro' | 'micro';

interface MapStoreState {
  mode: MapMode;
  regions: RegionMeta[];
  activeRegion: RegionData | null;
  cache: Record<string, RegionData>;
  loadWorld: () => Promise<void>;
  openRegion: (RQ: number, RR: number, seed?: number) => Promise<void>;
  backToMacro: () => void;
}

/**
 * Global map store that orchestrates macro ↔ micro navigation and caches region payloads.
 */
export const useMapStore = create<MapStoreState>((set, get) => ({
  mode: 'idle',
  regions: [],
  activeRegion: null,
  cache: {},
  loadWorld: async () => {
    if (get().regions.length > 0) {
      set({ mode: 'macro' });
      return;
    }

    try {
      const response = await fetch('/maps/world.json');
      if (!response.ok) {
        throw new Error(`Failed to load world.json: ${response.status}`);
      }
      const world = (await response.json()) as WorldPayload;
      set({ mode: 'macro', regions: world.regions ?? [] });
    } catch (error) {
      console.error(error);
      set({ mode: 'macro', regions: [] });
    }
  },
  openRegion: async (RQ, RR, seed) => {
    const id = `${RQ}_${RR}`;
    const { cache } = get();
    const cached = cache[id];
    if (cached) {
      set({ mode: 'micro', activeRegion: cached });
      return;
    }

    try {
      const response = await fetch(`/maps/regions/${id}.json`);
      if (response.ok) {
        const region = (await response.json()) as RegionData;
        set((state) => ({
          mode: 'micro',
          activeRegion: region,
          cache: { ...state.cache, [id]: region },
        }));
        return;
      }
    } catch (error) {
      console.warn('Falling back to procedural region generation', error);
    }

    const deterministicSeed = seed ?? hash32(RQ, RR, 0);
    const region = generateRegion(RQ, RR, deterministicSeed);
    set((state) => ({
      mode: 'micro',
      activeRegion: region,
      cache: { ...state.cache, [id]: region },
    }));
  },
  backToMacro: () => {
    set({ mode: 'macro', activeRegion: null });
  },
}));
