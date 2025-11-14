/**
 * Axial coordinate representation for a pointy-top hex grid.
 */
export interface Axial {
  q: number;
  r: number;
}

/**
 * Stable identifier for a macro-region expressed via axial coordinates.
 */
export type RegionId = string;

/**
 * Stable identifier for a tile inside a region, derived from region and local axial coordinates.
 */
export type TileId = string;

/**
 * Metadata describing a macro-level region on the world map.
 */
export interface RegionMeta {
  id: RegionId;
  RQ: number;
  RR: number;
  name?: string;
  seed?: number;
  biomeHint?: string;
}

/**
 * Tile payload for a micro-level region view.
 */
export interface TileData {
  q: number;
  r: number;
  biome: string;
  settleable: boolean;
  allianceId?: string;
  poi?: string[];
  units?: string[];
  /** Identifier of the region this tile belongs to. */
  regionId?: RegionId;
}

/**
 * Full micro-region dataset including the deterministic radius layout and all tile payloads.
 */
export interface RegionData {
  regionId: RegionId;
  RQ: number;
  RR: number;
  radius: number;
  tiles: TileData[];
  /** Cached boundary outline of the region for fast canvas rendering. */
  hull?: Path2D | null;
  /** Closed boundary loops describing the region hull (first entry is the outer loop). */
  loops?: RegionLoop[];
  /** Centroid of the largest loop used for placing the region label. */
  centroid?: { x: number; y: number };
  /** Pre-computed viewport bounds that tightly wrap the region hull. */
  bounds?: RegionBounds;
  /** Gate descriptors positioned on the outer hull for macro lane transitions. */
  gates?: RegionGate[];
}

/**
 * Sequence of 2D points describing a closed boundary loop of a region.
 */
export interface RegionLoop {
  pts: { x: number; y: number }[];
}

/**
 * Bounding box information for an outlined region in canvas space.
 */
export interface RegionBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

/**
 * Connection point on the region hull that links to a neighboring macro region.
 */
export interface RegionGate {
  at: { x: number; y: number };
  toRegionId: RegionId;
  edgeDir: number;
}
