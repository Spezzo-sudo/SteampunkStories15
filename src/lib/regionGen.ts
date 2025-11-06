import { REGION_RADIUS, REGION_TILE_COUNT } from '@/constants/map';
import { axialDisk } from './hex';
import { pickBiome } from './biomePicker';
import type { RegionData, TileData } from '@/types/map';

/**
 * Generates a deterministic micro-region using the shared biome picker and radius disk helpers.
 */
export const generateRegion = (RQ: number, RR: number, seed: number): RegionData => {
  const tiles: TileData[] = axialDisk(REGION_RADIUS).map(({ q, r }) => ({
    q,
    r,
    biome: pickBiome(seed, q, r),
    settleable: true,
  }));

  if (tiles.length !== REGION_TILE_COUNT) {
    throw new Error('Region must have 19 tiles');
  }

  return {
    regionId: `${RQ}_${RR}`,
    RQ,
    RR,
    radius: REGION_RADIUS,
    tiles,
  };
};
