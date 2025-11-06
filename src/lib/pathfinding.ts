import type { Axial, RegionData, TileData } from '@/types/map';
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
 * Describes why a path could not be constructed inside the region.
 */
export type PathFailureReason =
  | 'start-outside'
  | 'start-blocked'
  | 'goal-outside'
  | 'goal-blocked'
  | 'unreachable';

/** Result payload for a successful pathfinding run. */
export interface PathfindingSuccess {
  status: 'success';
  path: Axial[];
  cost: number;
}

/** Result payload for a failed pathfinding run. */
export interface PathfindingFailure {
  status: 'failure';
  reason: PathFailureReason;
}

/** Union describing the possible pathfinding outcomes. */
export type PathfindingResult = PathfindingSuccess | PathfindingFailure;

const computePathCost = (
  path: Axial[],
  tiles: Map<string, TileData>,
  costEvaluator: (tile: TileData) => number,
) => {
  let total = 0;
  for (let index = 1; index < path.length; index += 1) {
    const step = path[index];
    const tile = tiles.get(coordinateKey(step));
    if (!tile) {
      continue;
    }
    const cost = costEvaluator(tile);
    if (!Number.isFinite(cost)) {
      continue;
    }
    total += cost;
  }
  return total;
};

/**
 * Calculates the least-cost path between two axial coordinates using the A* algorithm
 * and returns metadata describing the outcome.
 */
export const findRegionPath = (
  region: RegionData,
  start: Axial,
  goal: Axial,
  costEvaluator: (tile: TileData) => number = defaultCost,
): PathfindingResult => {
  if (start.q === goal.q && start.r === goal.r) {
    return { status: 'success', path: [start], cost: 0 };
  }

  const tilesByKey = getTileLookup(region.tiles);
  const startKey = coordinateKey(start);
  const goalKey = coordinateKey(goal);

  const startTile = tilesByKey.get(startKey);
  if (!startTile) {
    return { status: 'failure', reason: 'start-outside' };
  }
  if (!Number.isFinite(costEvaluator(startTile))) {
    return { status: 'failure', reason: 'start-blocked' };
  }

  const goalTile = tilesByKey.get(goalKey);
  if (!goalTile) {
    return { status: 'failure', reason: 'goal-outside' };
  }
  if (!Number.isFinite(costEvaluator(goalTile))) {
    return { status: 'failure', reason: 'goal-blocked' };
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
      const path = reconstructPath(currentKey, cameFrom);
      return {
        status: 'success',
        path,
        cost: computePathCost(path, tilesByKey, costEvaluator),
      };
    }

    open.delete(currentKey);
    const [currentQ, currentR] = currentKey.split(',').map(Number);

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

  return { status: 'failure', reason: 'unreachable' };
};

/**
 * Calculates the least-cost path between two axial coordinates using the A* algorithm.
 *
 * @deprecated Prefer {@link findRegionPath} to access cost and failure reasons.
 */
export const aStarPath = (
  region: RegionData,
  start: Axial,
  goal: Axial,
  costEvaluator: (tile: TileData) => number = defaultCost,
) => {
  const result = findRegionPath(region, start, goal, costEvaluator);
  return result.status === 'success' ? result.path : null;
};
