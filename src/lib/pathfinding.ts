import type { Axial } from '@/types/map';
import type { RegionData, TileData } from '@/types/map';
import { computeHexDistance } from '@/lib/hex';

const NEIGHBOR_OFFSETS: Axial[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

const coordinateKey = (axial: Axial) => `${axial.q},${axial.r}`;

const getTileLookup = (tiles: TileData[]) => {
  const lookup = new Map<string, TileData>();
  tiles.forEach((tile) => lookup.set(coordinateKey(tile), tile));
  return lookup;
};

const reconstructPath = (
  currentKey: string,
  cameFrom: Map<string, string>,
): Axial[] => {
  const out: Axial[] = [];
  let key = currentKey;
  while (cameFrom.has(key)) {
    const [q, r] = key.split(',').map(Number);
    out.push({ q, r });
    key = cameFrom.get(key)!;
  }
  const [startQ, startR] = key.split(',').map(Number);
  out.push({ q: startQ, r: startR });
  return out.reverse();
};

/**
 * Returns a default terrain traversal cost for a tile and blocks paths on uninhabitable fields.
 */
export const defaultCost = (tile: TileData) => {
  if (!tile.settleable) {
    return Number.POSITIVE_INFINITY;
  }
  switch (tile.biome) {
    case 'Steppe':
      return 1;
    case 'Wald':
      return 1.1;
    case 'Dampfwiese':
      return 1.2;
    case 'Hochland':
      return 1.3;
    case 'Kristallufer':
      return 1.4;
    case 'Ödland':
      return 1.8;
    case 'Rußklippen':
      return 2;
    case 'Moor':
      return 2.5;
    default:
      return 1.5;
  }
};

/**
 * Produces a traversal cost function that favours the provided alliance and penalises hostile zones.
 */
export const alliancePenalty = (myAllianceId?: string) => {
  if (!myAllianceId) {
    return defaultCost;
  }
  return (tile: TileData) => {
    const base = defaultCost(tile);
    if (!Number.isFinite(base)) {
      return base;
    }
    if (!tile.allianceId) {
      return base * 1.05;
    }
    if (tile.allianceId === myAllianceId) {
      return base * 0.9;
    }
    return base * 1.15;
  };
};

/**
 * Calculates the least-cost path between two axial coordinates using the A* algorithm.
 */
export const aStarPath = (
  region: RegionData,
  start: Axial,
  goal: Axial,
  costEvaluator: (tile: TileData) => number = defaultCost,
) => {
  if (start.q === goal.q && start.r === goal.r) {
    return [start];
  }

  const tilesByKey = getTileLookup(region.tiles);
  const startKey = coordinateKey(start);
  const goalKey = coordinateKey(goal);

  if (!tilesByKey.has(goalKey) || !tilesByKey.has(startKey)) {
    return null;
  }

  const open = new Set<string>([startKey]);
  const cameFrom = new Map<string, string>();
  const gScore = new Map<string, number>([[startKey, 0]]);
  const fScore = new Map<string, number>([[startKey, computeHexDistance(start, goal)]]);

  const getLowestScoreKey = () => {
    let bestKey: string | null = null;
    let bestScore = Number.POSITIVE_INFINITY;
    open.forEach((key) => {
      const value = fScore.get(key) ?? Number.POSITIVE_INFINITY;
      if (value < bestScore) {
        bestScore = value;
        bestKey = key;
      }
    });
    return bestKey;
  };

  while (open.size > 0) {
    const currentKey = getLowestScoreKey();
    if (!currentKey) {
      break;
    }
    if (currentKey === goalKey) {
      return reconstructPath(currentKey, cameFrom);
    }

    open.delete(currentKey);
    const [currentQ, currentR] = currentKey.split(',').map(Number);
    const currentTile = tilesByKey.get(currentKey);
    if (!currentTile) {
      continue;
    }

    NEIGHBOR_OFFSETS.forEach((offset) => {
      const nextQ = currentQ + offset.q;
      const nextR = currentR + offset.r;
      const nextKey = `${nextQ},${nextR}`;
      const neighborTile = tilesByKey.get(nextKey);
      if (!neighborTile) {
        return;
      }

      const traversalCost = costEvaluator(neighborTile);
      if (!Number.isFinite(traversalCost)) {
        return;
      }

      const currentScore = gScore.get(currentKey) ?? Number.POSITIVE_INFINITY;
      const tentativeG = currentScore + traversalCost;

      if (tentativeG < (gScore.get(nextKey) ?? Number.POSITIVE_INFINITY)) {
        cameFrom.set(nextKey, currentKey);
        gScore.set(nextKey, tentativeG);
        fScore.set(nextKey, tentativeG + computeHexDistance({ q: nextQ, r: nextR }, goal));
        open.add(nextKey);
      }
    });
  }

  return null;
};
