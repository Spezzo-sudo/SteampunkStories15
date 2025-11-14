/** Axial coordinate in a flat-top hex grid. */
export type Ax = { q: number; r: number };

/** Supported biome identifiers rendered on both macro and micro maps. */
export type Biome =
  | 'DESERT'
  | 'FOREST'
  | 'HILLS'
  | 'PLAINS'
  | 'SWAMP'
  | 'LAKE'
  | 'MOUNTAIN'
  | 'TUNDRA'
  | 'MOUNTAINS' // Legacy alias for MOUNTAIN
  | 'OCEAN'; // Legacy alias for LAKE

/** User profile tracking game-specific state. */
export interface PlayerProfile {
  /** Unique user identifier matching the auth record. */
  uid: string;
  /** Player display name. */
  name: string;
  /** True if the player has placed their first home settlement. */
  hasPlacedHome: boolean;
}

/** Descriptor for a player settlement marker rendered on a tile. */
export interface Settlement {
  /** Owning player identifier. */
  playerId: string;
  /** Icon variant applied to the badge. */
  icon: 'TOWN' | 'OUTPOST';
}

/** Tile metadata for the micro region map. */
export type Tile = Ax & {
  /** Biome code displayed for the tile. */
  biome: Biome;
  /** Parent region identifier. */
  regionId: string;
  /** Optional faction identifier for alliance highlighting. */
  allianceId?: string;
  /** Optional settlement marker data. */
  hasSettlement?: Settlement;
};

/** Region metadata shared between macro and micro maps. */
export interface Region {
  /** Stable identifier displayed in UI and used for lookups. */
  id: string;
  /** Display name rendered inside the macro hex. */
  name: string;
  /** Macro axial coordinate Q component. */
  RQ: number;
  /** Macro axial coordinate R component. */
  RR: number;
  /** Optional alliance identifier controlling filter overlays. */
  allianceId?: string;
  /** Tile list for the micro region map. */
  tiles: Tile[];
  /** Cached hull shape for the micro map rendering. */
  hull?: Path2D;
  /** Cached centroid used for label placement. */
  centroid?: { x: number; y: number };
}

/** Persistent home-world selection enabling build actions. */
export interface HomeSelection {
  /** Region identifier that hosts the player's home. */
  regionId: string;
  /** Tile key inside the region expressed as "q,r". */
  tileKey: string;
  /** Timestamp recorded when the home was confirmed. */
  setAt: number;
}

/** Combined world structure feeding both the macro and micro renderers. */
export interface World {
  /** All available regions laid out on the macro map. */
  regions: Region[];
  /** Active region identifier when the micro view is open. */
  selectedRegionId?: string;
  /** Whether alliance highlighting should be rendered. */
  allianceFilterOn: boolean;
  /** Optional home selection that unlocks building actions. */
  home?: HomeSelection;
}
