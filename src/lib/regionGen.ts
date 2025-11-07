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
  const tiles: TileData[] = axialDisk(REGION_RADIUS).map(({ q, r }) => {
    const roll = hash32(seed, q, r);
    const biome = pickBiome(seed, q, r);
    const settleable = roll % 100 > 20;
    const allianceId =
      roll % 100 < 45 ? FALLBACK_REGION_ALLIANCES[roll % FALLBACK_REGION_ALLIANCES.length] : undefined;
    const units = (() => {
      if (q === 0 && r === 0) {
        return ['unit-korvette-1', 'unit-fregatte-1', 'unit-frachter-1'];
      }
      if (!settleable) {
        return undefined;
      }
      if (roll % 97 === 0) {
        return ['unit-aufklaerer-' + Math.abs(roll % 5)];
      }
      return undefined;
    })();
    return {
      q,
      r,
      biome,
      settleable,
      allianceId,
      units,
      regionId: `${RQ}_${RR}`,
    } satisfies TileData;
  });

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
