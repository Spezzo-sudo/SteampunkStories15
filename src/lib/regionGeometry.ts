import { AXIAL_DIRECTIONS, axialToPixel, getHexVertices } from '@/lib/hex';
import type { RegionBounds, RegionData, RegionGate, RegionLoop } from '@/types/map';

interface Point {
  x: number;
  y: number;
}

const EPSILON = 1e-6;
const pointKey = (point: Point) => `${point.x.toFixed(4)},${point.y.toFixed(4)}`;
const cellKey = (q: number, r: number) => `${q},${r}`;

const samePoint = (a: Point, b: Point) => Math.abs(a.x - b.x) < EPSILON && Math.abs(a.y - b.y) < EPSILON;

const accumulatePolygonArea = (loop: RegionLoop) => {
  let area = 0;
  for (let index = 0; index < loop.pts.length - 1; index += 1) {
    const current = loop.pts[index];
    const next = loop.pts[index + 1];
    area += current.x * next.y - next.x * current.y;
  }
  return area / 2;
};

const computeCentroid = (loop: RegionLoop) => {
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let index = 0; index < loop.pts.length - 1; index += 1) {
    const current = loop.pts[index];
    const next = loop.pts[index + 1];
    const cross = current.x * next.y - next.x * current.y;
    area += cross;
    cx += (current.x + next.x) * cross;
    cy += (current.y + next.y) * cross;
  }
  const finalArea = area || 1;
  return { x: cx / (3 * finalArea), y: cy / (3 * finalArea) };
};

const computeLoopBounds = (loop: RegionLoop): RegionBounds => {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  loop.pts.forEach((point) => {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  });
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
};

/**
 * Builds the closed hull of a region by connecting all exposed hex edges.
 */
export const buildRegionHull = (region: RegionData, hexSize: number): {
  hull: Path2D | null;
  loops: RegionLoop[];
  centroid: Point;
  bounds: RegionBounds;
} => {
  const cells = new Set(region.tiles.map((tile) => cellKey(tile.q, tile.r)));
  const edges: Array<{ a: Point; b: Point }> = [];

  region.tiles.forEach((tile) => {
    const { x, y } = axialToPixel({ q: tile.q, r: tile.r }, hexSize);
    const vertices = getHexVertices(x, y, hexSize);
    AXIAL_DIRECTIONS.forEach((direction, index) => {
      const neighborKey = cellKey(tile.q + direction.q, tile.r + direction.r);
      if (cells.has(neighborKey)) {
        return;
      }
      const start = vertices[index];
      const end = vertices[(index + 1) % vertices.length];
      edges.push({ a: { x: start.x, y: start.y }, b: { x: end.x, y: end.y } });
    });
  });

  const loops: RegionLoop[] = [];
  const unused = edges.slice();
  while (unused.length) {
    const loop: RegionLoop = { pts: [] };
    const edge = unused.pop();
    if (!edge) {
      break;
    }
    loop.pts.push(edge.a, edge.b);
    let tail = edge.b;
    while (loop.pts.length < 1024) {
      const idx = unused.findIndex((candidate) => samePoint(candidate.a, tail) || samePoint(candidate.b, tail));
      if (idx === -1) {
        break;
      }
      const next = unused.splice(idx, 1)[0];
      if (samePoint(next.a, tail)) {
        tail = next.b;
        loop.pts.push(next.b);
      } else {
        tail = next.a;
        loop.pts.push(next.a);
      }
      if (samePoint(loop.pts[0], tail)) {
        break;
      }
    }
    if (!samePoint(loop.pts[0], loop.pts[loop.pts.length - 1])) {
      loop.pts.push(loop.pts[0]);
    }
    loops.push(loop);
  }

  if (loops.length === 0) {
    return {
      hull: null,
      loops: [],
      centroid: { x: 0, y: 0 },
      bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 },
    };
  }

  let primary = loops[0];
  let largestArea = Number.NEGATIVE_INFINITY;
  loops.forEach((loop) => {
    const area = Math.abs(accumulatePolygonArea(loop));
    if (area > largestArea) {
      largestArea = area;
      primary = loop;
    }
  });

  const centroid = computeCentroid(primary);
  let bounds = computeLoopBounds(primary);
  loops.slice(1).forEach((loop) => {
    const local = computeLoopBounds(loop);
    const minX = Math.min(bounds.minX, local.minX);
    const minY = Math.min(bounds.minY, local.minY);
    const maxX = Math.max(bounds.maxX, local.maxX);
    const maxY = Math.max(bounds.maxY, local.maxY);
    bounds = { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
  });

  const path = typeof Path2D === 'function' ? new Path2D() : null;
  if (path) {
    loops.forEach((loop) => {
      if (!loop.pts.length) {
        return;
      }
      path.moveTo(loop.pts[0].x, loop.pts[0].y);
      for (let index = 1; index < loop.pts.length; index += 1) {
        const point = loop.pts[index];
        path.lineTo(point.x, point.y);
      }
      path.closePath();
    });
  }

  return { hull: path, loops, centroid, bounds };
};

/**
 * Builds an axial lookup for fast membership tests of region cells.
 */
export const createRegionCellIndex = (region: Pick<RegionData, 'regionId' | 'tiles'>) => {
  const index = new Map<string, string>();
  region.tiles.forEach((tile) => {
    index.set(cellKey(tile.q, tile.r), region.regionId);
  });
  return index;
};

/**
 * Computes gate locations on the outer hull based on neighboring region assignments.
 */
export const computeRegionGates = (
  region: RegionData,
  indexByCell: Map<string, string>,
  hexSize: number,
): RegionGate[] => {
  const gates: RegionGate[] = [];
  const seen = new Set<string>();

  region.tiles.forEach((tile) => {
    const { x, y } = axialToPixel({ q: tile.q, r: tile.r }, hexSize);
    const vertices = getHexVertices(x, y, hexSize);
    AXIAL_DIRECTIONS.forEach((direction, dirIndex) => {
      const neighborKey = cellKey(tile.q + direction.q, tile.r + direction.r);
      const neighborRegionId = indexByCell.get(neighborKey);
      if (!neighborRegionId || neighborRegionId === region.regionId) {
        return;
      }
      const start = vertices[dirIndex];
      const end = vertices[(dirIndex + 1) % vertices.length];
      const midpoint = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
      const signature = `${neighborRegionId}:${pointKey(midpoint)}`;
      if (seen.has(signature)) {
        return;
      }
      seen.add(signature);
      gates.push({ at: midpoint, toRegionId: neighborRegionId, edgeDir: dirIndex });
    });
  });

  return gates;
};

/**
 * Assigns the owning region identifier to all tiles in-place.
 */
export const normalizeRegionTiles = (region: RegionData) =>
  region.tiles.map((tile) => ({ ...tile, regionId: tile.regionId ?? region.regionId }));
