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
}
