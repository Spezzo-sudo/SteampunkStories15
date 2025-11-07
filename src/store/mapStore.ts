import { create } from 'zustand';
import { generateRegion } from '@/lib/regionGen';
import { hash32 } from '@/lib/rng';
import { axialDisk } from '@/lib/hex';
import type { RegionData, RegionMeta } from '@/types/map';

interface WorldPayload {
  regions: RegionMeta[];
  lanes?: LaneEdge[];
}

/** Map modes supported by the galaxy view. */
export type MapMode = 'macro' | 'micro';

/** Union of biome identifiers rendered inside a micro region. */
export type Biome = 'IG' | 'CL' | 'GL' | 'HE' | 'DK' | 'EO' | 'BR' | 'NE';

/** Camera transform state shared between the macro and micro canvases. */
export interface CameraState {
  scale: number;
  tx: number;
  ty: number;
  minScale: number;
  maxScale: number;
}

/** Tracks researched upgrades that can alter map interaction affordances. */
export interface ResearchState {
  aetherNav: boolean;
}

/** Weights applied to travel time and cost calculations across lanes and hex steps. */
export interface TravelPrefs {
  laneWeight: number;
  hexStepCost: number;
  secondsPerStep: number;
}

/** Macro level node description used for layouting the world map. */
export interface RegionNode {
  id: string;
  RQ: number;
  RR: number;
  name: string;
}

/** Bidirectional lane connection linking two region nodes together. */
export interface LaneEdge {
  from: string;
  to: string;
  distance: number;
  blocked?: boolean;
}

interface PrefetchState {
  [regionId: string]: Promise<RegionData> | undefined;
}

interface MapCache {
  [regionId: string]: RegionData | undefined;
}

/**
 * Global map store orchestrating macro ↔ micro navigation, camera transforms and route calculations.
 */
export interface MapStore {
  mode: MapMode;
  rawMode: boolean;
  camera: CameraState;
  research: ResearchState;
  travel: TravelPrefs;
  regions: Record<string, RegionNode>;
  lanes: LaneEdge[];
  activeRegion: RegionData | null;
  regionCache: MapCache;
  loadingWorld: boolean;
  worldError: string | null;

  loadWorld: () => Promise<void>;
  openRegion: (RQ: number, RR: number, seed?: number) => Promise<void>;
  prefetchRegion: (RQ: number, RR: number, seed?: number) => Promise<void>;
  backToMacro: () => void;

  fitRegionToViewport: (vw: number, vh: number, regionRadius: number) => void;
  zoomAt: (point: { x: number; y: number }, nextScale: number) => void;
  panBy: (dx: number, dy: number) => void;

  setRawMode: (enabled: boolean) => void;
  setResearch: <K extends keyof ResearchState>(key: K, value: ResearchState[K]) => void;

  computeLaneRoute: (fromId: string, toId: string) => {
    nodes: string[];
    cost: number;
    eta: number;
  } | null;
  computeLocalCost: (startHex: { q: number; r: number }, endHex: { q: number; r: number }) => number;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const DEFAULT_CAMERA: CameraState = {
  scale: 1,
  tx: 0,
  ty: 0,
  minScale: 0.6,
  maxScale: 6,
};

const DEFAULT_TRAVEL: TravelPrefs = {
  laneWeight: 1,
  hexStepCost: 1,
  secondsPerStep: 12,
};

const DEFAULT_LANES: LaneEdge[] = [
  { from: '0_0', to: '1_-1', distance: 4 },
  { from: '0_0', to: '-1_2', distance: 6 },
  { from: '1_-1', to: '-1_2', distance: 5 },
];

const prefetchInFlight: PrefetchState = {};

/**
 * Zustand store exposing shared galaxy map state.
 */
export const useMapStore = create<MapStore>((set, get) => ({
  mode: 'macro',
  rawMode: true,
  camera: DEFAULT_CAMERA,
  research: { aetherNav: false },
  travel: DEFAULT_TRAVEL,
  regions: {},
  lanes: DEFAULT_LANES,
  activeRegion: null,
  regionCache: {},
  loadingWorld: false,
  worldError: null,

  async loadWorld() {
    const current = get();
    if (current.loadingWorld) {
      return;
    }

    set({ loadingWorld: true, worldError: null });

    try {
      const response = await fetch('/maps/world.json');
      if (!response.ok) {
        throw new Error(`Failed to load world.json: ${response.status}`);
      }

      const payload = (await response.json()) as WorldPayload;
      const nextRegions: Record<string, RegionNode> = {};
      payload.regions?.forEach((meta) => {
        nextRegions[meta.id] = {
          id: meta.id,
          RQ: meta.RQ,
          RR: meta.RR,
          name: meta.name ?? meta.id,
        };
      });

      set(() => ({
        mode: 'macro',
        loadingWorld: false,
        regions: nextRegions,
        lanes: payload.lanes?.length ? payload.lanes : DEFAULT_LANES,
        worldError: null,
      }));
    } catch (error) {
      console.error('Failed to load macro world data', error);
      const message =
        error instanceof Error
          ? error.message
          : 'Unbekannter Fehler beim Laden der Weltkarte.';
      set({ loadingWorld: false, regions: {}, worldError: message });
    }
  },

  async openRegion(RQ, RR, seed) {
    const regionId = `${RQ}_${RR}`;
    const { regionCache } = get();
    const cached = regionCache[regionId];
    if (cached) {
      set({
        mode: 'micro',
        activeRegion: cached,
      });
      return;
    }

    const deterministicSeed = seed ?? hash32(RQ, RR, 0);

    try {
      const response = await fetch(`/maps/regions/${regionId}.json`);
      if (response.ok) {
        const region = (await response.json()) as RegionData;
        set((state) => ({
          mode: 'micro',
          activeRegion: region,
          regionCache: { ...state.regionCache, [regionId]: region },
        }));
        return;
      }
    } catch (error) {
      console.warn('Falling back to procedural region generation', error);
    }

    const region = generateRegion(RQ, RR, deterministicSeed);
    set((state) => ({
      mode: 'micro',
      activeRegion: region,
      regionCache: { ...state.regionCache, [regionId]: region },
    }));
  },

  async prefetchRegion(RQ, RR, seed) {
    const regionId = `${RQ}_${RR}`;
    const { regionCache } = get();
    if (regionCache[regionId]) {
      return;
    }

    if (prefetchInFlight[regionId]) {
      await prefetchInFlight[regionId];
      return;
    }

    const deterministicSeed = seed ?? hash32(RQ, RR, 0);

    const request = (async () => {
      try {
        const response = await fetch(`/maps/regions/${regionId}.json`);
        if (response.ok) {
          const region = (await response.json()) as RegionData;
          set((state) => ({
            regionCache: { ...state.regionCache, [regionId]: region },
          }));
          return region;
        }
      } catch (error) {
        console.warn('Region prefetch failed, falling back to procedural data', error);
      }

      const generated = generateRegion(RQ, RR, deterministicSeed);
      set((state) => ({
        regionCache: { ...state.regionCache, [regionId]: generated },
      }));
      return generated;
    })();

    prefetchInFlight[regionId] = request;
    try {
      await request;
    } finally {
      delete prefetchInFlight[regionId];
    }
  },

  backToMacro() {
    set({ mode: 'macro', activeRegion: null });
  },

  fitRegionToViewport(vw, vh, regionRadius) {
    const pad = 24;
    const targetW = vw - pad * 2;
    const targetH = vh - pad * 2;
    const hexCols = regionRadius * 2 + 1 + regionRadius;
    const hexRows = regionRadius * 2 + 1 + regionRadius;
    const sizeByW = (targetW / (hexCols * 1.5 + 0.5)) * 2;
    const sizeByH = (targetH / ((hexRows + 0.5) * Math.sqrt(3))) * 2;
    const baseHexSize = Math.floor(Math.min(sizeByW, sizeByH));
    const desired = clamp(baseHexSize / 28, 2, 5);

    set((state) => ({
      camera: {
        ...state.camera,
        scale: desired,
        tx: vw / 2,
        ty: vh / 2,
        minScale: desired * 0.6,
        maxScale: desired * 5,
      },
    }));
  },

  zoomAt(point, nextScale) {
    const cam = get().camera;
    const scale = clamp(nextScale, cam.minScale, cam.maxScale);
    const factor = scale / cam.scale;
    set({
      camera: {
        ...cam,
        scale,
        tx: point.x - factor * (point.x - cam.tx),
        ty: point.y - factor * (point.y - cam.ty),
      },
    });
  },

  panBy(dx, dy) {
    set((state) => ({
      camera: {
        ...state.camera,
        tx: state.camera.tx + dx,
        ty: state.camera.ty + dy,
      },
    }));
  },

  setRawMode(enabled) {
    set({ rawMode: Boolean(enabled) });
  },

  setResearch(key, value) {
    set((state) => ({
      research: { ...state.research, [key]: value },
    }));
  },

  computeLaneRoute(fromId, toId) {
    const { lanes, travel, regions } = get();
    if (fromId === toId) {
      return { nodes: [fromId], cost: 0, eta: 0 };
    }

    const adjacency: Record<string, LaneEdge[]> = {};
    lanes.forEach((lane) => {
      if (lane.blocked) {
        return;
      }

      (adjacency[lane.from] ||= []).push(lane);
      (adjacency[lane.to] ||= []).push({
        from: lane.to,
        to: lane.from,
        distance: lane.distance,
        blocked: false,
      });
    });

    const dist: Record<string, number> = {};
    const prev: Record<string, string | null> = {};
    Object.keys(regions).forEach((id) => {
      dist[id] = Number.POSITIVE_INFINITY;
      prev[id] = null;
    });
    dist[fromId] = 0;

    const unvisited = new Set(Object.keys(regions));
    while (unvisited.size) {
      let u: string | null = null;
      for (const candidate of unvisited) {
        if (u === null || dist[candidate] < dist[u]) {
          u = candidate;
        }
      }

      if (u === null) {
        break;
      }

      unvisited.delete(u);
      if (u === toId) {
        break;
      }

      for (const edge of adjacency[u] ?? []) {
        const weight = edge.distance * travel.laneWeight;
        const alt = dist[u] + weight;
        if (alt < dist[edge.to]) {
          dist[edge.to] = alt;
          prev[edge.to] = u;
        }
      }
    }

    if (dist[toId] === Number.POSITIVE_INFINITY) {
      return null;
    }

    const path: string[] = [];
    let current: string | null = toId;
    while (current) {
      path.unshift(current);
      current = prev[current];
    }

    const cost = dist[toId];
    const eta = Math.round(cost * get().travel.secondsPerStep);
    return { nodes: path, cost, eta };
  },

  computeLocalCost(startHex, endHex) {
    const dq = startHex.q - endHex.q;
    const dr = startHex.r - endHex.r;
    const ds = -startHex.q - startHex.r - (-endHex.q - endHex.r);
    const steps = (Math.abs(dq) + Math.abs(dr) + Math.abs(ds)) / 2;
    return steps * get().travel.hexStepCost;
  },
}));

/**
 * Utility to derive deterministic lane nodes for procedural regions without explicit metadata.
 */
export const deriveLaneAnchors = (radius: number) => axialDisk(radius);
