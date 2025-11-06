import type { Axial, RegionData, TileData } from '@/types/map';
import type { Unit } from '@/types/convoy';

/**
 * Tunable biome cost modifiers that influence pressure consumption per step.
 */
export const BIOME_FACTOR: Record<string, number> = {
  Steppe: 1,
  Wald: 1.1,
  Hochland: 1.3,
  Ödland: 1.8,
  Moor: 2.2,
};

/**
 * Resolves the configured biome factor and falls back to a neutral baseline.
 */
export const biomeFactor = (biome?: string) => BIOME_FACTOR[biome ?? 'Steppe'] ?? 1.5;

/**
 * Returns the load multiplier for a convoy based on the number of participating units.
 */
export const convoyLoadFactor = (unitCount: number) => 1 + 0.08 * Math.max(0, unitCount - 1);

/**
 * Calculates the pressure cost for traversing a single tile with the provided units.
 */
export const stepCost = (tile: TileData, units: Unit[]): number => {
  if (!tile.settleable) {
    return Number.POSITIVE_INFINITY;
  }
  if (units.length === 0) {
    return 0;
  }
  const shipAvg = units.reduce((sum, unit) => sum + unit.shipFactor, 0) / units.length;
  return biomeFactor(tile.biome) * convoyLoadFactor(units.length) * shipAvg;
};

/**
 * Computes the total pressure cost for the proposed path and optionally doubles it for round trips.
 */
export const pathCost = (
  path: Axial[],
  region: RegionData,
  units: Unit[],
  roundTrip: boolean,
): number => {
  const byKey = new Map(region.tiles.map((tile) => [`${tile.q},${tile.r}`, tile] as const));
  let sum = 0;
  for (const axial of path) {
    const tile = byKey.get(`${axial.q},${axial.r}`);
    if (!tile) {
      continue;
    }
    const cost = stepCost(tile, units);
    if (!Number.isFinite(cost)) {
      return cost;
    }
    sum += cost;
  }
  return roundTrip ? sum * 2 : sum;
};

/**
 * Determines the effective convoy speed by taking the minimum of all participant speeds.
 */
export const convoySpeed = (units: Unit[]): number => {
  if (units.length === 0) {
    return 0;
  }
  return Math.min(...units.map((unit) => unit.speed));
};

/**
 * Estimates the travel time in milliseconds for the convoy including optional return legs.
 */
export const etaMs = (
  pathLen: number,
  units: Unit[],
  roundTrip: boolean,
  actionMs: number,
  msPerHexBase = 280,
): number => {
  if (pathLen <= 0) {
    return actionMs;
  }
  const velocity = Math.max(0.1, convoySpeed(units));
  const legs = roundTrip ? pathLen * 2 : pathLen;
  const perLeg = msPerHexBase / velocity;
  return Math.round(legs * perLeg + actionMs);
};
