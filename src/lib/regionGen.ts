import { REGION_RADIUS, REGION_TILE_COUNT } from '@/constants/map';
import { axialDisk } from './hex';
import { pickBiome } from './biomePicker';
import { hash32 } from './rng';
import type { RegionData, TileData } from '@/types/map';

const FALLBACK_REGION_ALLIANCES = ['alliance-1', 'alliance-2', 'alliance-3', 'alliance-4'];

/**
 * Generates a deterministic micro-region using the shared biome picker and radius disk helpers.
 */
export const generateRegion = (RQ: number, RR: number, seed: number): RegionData => {
  const tiles: TileData[] = axialDisk(REGION_RADIUS).map(({ q, r }) => ({
    q,
    r,
    biome: pickBiome(seed, q, r),
    settleable: true,
    allianceId:
      (() => {
        const roll = hash32(seed, q, r);
        if (roll % 100 < 45) {
          return FALLBACK_REGION_ALLIANCES[roll % FALLBACK_REGION_ALLIANCES.length];
        }
        return undefined;
      })(),
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
