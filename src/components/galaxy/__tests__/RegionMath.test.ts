import { describe, expect, it } from 'vitest';
import { REGION_RADIUS, REGION_TILE_COUNT } from '@/constants/map';
import { axialDisk, inDisk } from '@/lib/hex';

describe('region hex math', () => {
  it('produces 19 axial coordinates for radius 2', () => {
    const disk = axialDisk(REGION_RADIUS);
    const uniqueKeys = new Set(disk.map(({ q, r }) => `${q},${r}`));
    expect(disk).toHaveLength(REGION_TILE_COUNT);
    expect(uniqueKeys.size).toBe(REGION_TILE_COUNT);
    expect(disk).toContainEqual({ q: 0, r: 0 });
  });

  it('validates whether coordinates lie inside the disk', () => {
    expect(inDisk(2, 0, REGION_RADIUS)).toBe(true);
    expect(inDisk(2, -2, REGION_RADIUS)).toBe(true);
    expect(inDisk(3, 0, REGION_RADIUS)).toBe(false);
    expect(inDisk(0, 3, REGION_RADIUS)).toBe(false);
    expect(inDisk(2, 1, REGION_RADIUS)).toBe(false);
  });
});
