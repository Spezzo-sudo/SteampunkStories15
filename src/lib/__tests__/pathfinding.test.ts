import { describe, expect, it } from 'vitest';
import { axialDisk } from '@/lib/hex';
import { REGION_RADIUS } from '@/constants/map';
import type { RegionData, TileData } from '@/types/map';
import { aStarPath, alliancePenalty, defaultCost } from '@/lib/pathfinding';

const buildRegion = (overrides: Record<string, Partial<TileData>> = {}): RegionData => {
  const tiles: TileData[] = axialDisk(REGION_RADIUS).map(({ q, r }) => ({
    q,
    r,
    biome: 'Steppe',
    settleable: true,
  }));

  tiles.forEach((tile, index) => {
    const key = `${tile.q},${tile.r}`;
    if (overrides[key]) {
      tiles[index] = { ...tile, ...overrides[key] };
    }
  });

  return {
    regionId: 'test-region',
    RQ: 0,
    RR: 0,
    radius: REGION_RADIUS,
    tiles,
  };
};

describe('aStarPath', () => {
  it('returns the origin when start and goal match', () => {
    const region = buildRegion();
    const result = aStarPath(region, { q: 0, r: 0 }, { q: 0, r: 0 });
    expect(result).toEqual([{ q: 0, r: 0 }]);
  });

  it('finds a route avoiding uninhabitable tiles', () => {
    const region = buildRegion({ '0,-1': { settleable: false } });
    const path = aStarPath(region, { q: 0, r: 0 }, { q: 0, r: -2 });
    expect(path).not.toBeNull();
    expect(path?.length).toBeGreaterThan(0);
    expect(path).not.toContainEqual({ q: 0, r: -1 });
  });

  it('favours allied territory when multiple equal paths exist', () => {
    const region = buildRegion({
      '1,-1': { allianceId: 'enemy' },
      '0,-1': { allianceId: 'ally' },
    });
    const neutralPath = aStarPath(region, { q: 0, r: 0 }, { q: 1, r: -2 }, defaultCost);
    const alliancePath = aStarPath(region, { q: 0, r: 0 }, { q: 1, r: -2 }, alliancePenalty('ally'));
    expect(neutralPath).not.toBeNull();
    expect(alliancePath).not.toBeNull();
    expect(neutralPath?.length).toBe(3);
    expect(alliancePath).toEqual([
      { q: 0, r: 0 },
      { q: 0, r: -1 },
      { q: 1, r: -2 },
    ]);
    expect(neutralPath).not.toEqual(alliancePath);
  });

  it('returns null when no path exists', () => {
    const region = buildRegion({
      '0,1': { settleable: false },
      '1,0': { settleable: false },
      '1,-1': { settleable: false },
      '0,-1': { settleable: false },
      '-1,0': { settleable: false },
      '-1,1': { settleable: false },
    });
    const result = aStarPath(region, { q: 0, r: 0 }, { q: 1, r: -1 });
    expect(result).toBeNull();
  });
});
