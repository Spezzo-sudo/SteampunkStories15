import { instantiateUnit, UNIT_LIBRARY } from '@/constants/units';
import type { RegionData } from '@/types/map';
import type { Unit } from '@/types/convoy';

const UNIT_PREFIX = 'unit-';

/**
 * Generates unit instances for the provided region based on tile annotations.
 */
export const createRegionUnits = (region: RegionData): Unit[] => {
  const roster: Unit[] = [];
  region.tiles.forEach((tile) => {
    tile.units?.forEach((id) => {
      if (!id.startsWith(UNIT_PREFIX)) {
        return;
      }
      const templateId = id.slice(UNIT_PREFIX.length).split('-')[0] as keyof typeof UNIT_LIBRARY;
      if (!templateId) {
        return;
      }
      roster.push(
        instantiateUnit(templateId, id, {
          RQ: region.RQ,
          RR: region.RR,
          q: tile.q,
          r: tile.r,
        }),
      );
    });
  });
  return roster;
};
