import { AxialCoordinates, GalaxyCoordinates } from '@/types';

/**
 * Square root of three, reused across the hex math helpers.
 */
export const SQRT3 = Math.sqrt(3);

const HEX_HEIGHT = SQRT3;

/**
 * Converts screen pixel coordinates back into fractional axial coordinates for a pointy-top layout.
 */
export const pixelToAxial = (x: number, y: number, size: number) => ({
  q: (SQRT3 / 3 * x - y / 3) / size,
  r: ((2 / 3) * y) / size,
});

/**
 * Generates all axial coordinates inside a radius-N disk including the origin.
 */
export const axialDisk = (radius: number) => {
  const points: AxialCoordinates[] = [];
  for (let q = -radius; q <= radius; q += 1) {
    const rMin = Math.max(-radius, -q - radius);
    const rMax = Math.min(radius, -q + radius);
    for (let r = rMin; r <= rMax; r += 1) {
      points.push({ q, r });
    }
  }
  return points;
};

/**
 * Checks whether the provided axial coordinate lies inside a radius-N disk.
 */
export const inDisk = (q: number, r: number, radius: number) =>
  Math.abs(q) <= radius && Math.abs(r) <= radius && Math.abs(q + r) <= radius;

/**
 * Converts axial coordinates into pixel positions for a pointy-top hex layout.
 */
export const axialToPixel = (axial: AxialCoordinates, size: number) => ({
  x: size * (SQRT3 * axial.q + (SQRT3 / 2) * axial.r),
  y: size * ((3 / 2) * axial.r),
});

/**
 * Generates the SVG path command for a hex tile around the given pixel origin.
 */
export const buildHexPath = (x: number, y: number, size: number) => {
  const points = Array.from({ length: 6 }, (_, index) => {
    const angle = Math.PI / 6 + (index * Math.PI) / 3;
    return {
      x: x + size * Math.cos(angle),
      y: y + size * Math.sin(angle),
    };
  });
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`).join(' ') + ' Z';
};

/**
 * Calculates a bounding box of visible axial coordinates based on scroll and viewport size.
 */
export const computeVisibleAxialBounds = (
  center: AxialCoordinates,
  radius: number,
): { minQ: number; maxQ: number; minR: number; maxR: number } => ({
  minQ: center.q - radius,
  maxQ: center.q + radius,
  minR: center.r - radius,
  maxR: center.r + radius,
});

/**
 * Formats a system coordinate triplet for bookmarks or clipboard sharing.
 */
export const formatSystemCoordinate = (coordinate: GalaxyCoordinates) =>
  `${coordinate.sectorQ},${coordinate.sectorR},${coordinate.sysIndex}`;

/**
 * Parses a coordinate string from the deep-link query parameter.
 */
export const parseSystemCoordinate = (value: string): GalaxyCoordinates | null => {
  const [sectorQ, sectorR, sysIndex] = value.split(',').map((part) => Number.parseInt(part, 10));
  if ([sectorQ, sectorR, sysIndex].some((part) => Number.isNaN(part))) {
    return null;
  }
  const q = sectorQ * 10 + sysIndex;
  const r = sectorR * 10 + sysIndex * -1;
  return {
    sectorQ,
    sectorR,
    sysIndex,
    axial: { q, r },
  };
};

/**
 * Ensures the provided array of systems only includes those inside the bounding box.
 */
export const filterSystemsByBounds = <T extends GalaxyCoordinates>(
  systems: T[],
  bounds: { minQ: number; maxQ: number; minR: number; maxR: number },
) =>
  systems.filter(
    (system) =>
      system.axial.q >= bounds.minQ &&
      system.axial.q <= bounds.maxQ &&
      system.axial.r >= bounds.minR &&
      system.axial.r <= bounds.maxR,
  );

/**
 * Generates an accessible label describing a galaxy coordinate.
 */
export const describeCoordinate = (coordinate: GalaxyCoordinates) =>
  `Sektor ${coordinate.sectorQ}:${coordinate.sectorR}, System ${coordinate.sysIndex}`;

/**
 * Returns an axial coordinate for the given sector and index in a simple deterministic layout.
 */
export const deriveAxialFromIndex = (sectorQ: number, sectorR: number, sysIndex: number): AxialCoordinates => ({
  q: sectorQ * 5 + sysIndex,
  r: sectorR * 5 - sysIndex,
});

/**
 * Calculates the grid distance between two axial coordinates using hex metrics.
 */
export const computeHexDistance = (a: AxialCoordinates, b: AxialCoordinates) => {
  const dq = Math.abs(a.q - b.q);
  const dr = Math.abs(a.r - b.r);
  const ds = Math.abs(-a.q - a.r + b.q + b.r);
  return (dq + dr + ds) / 2;
};

/**
 * Generates the straight-line path between two axial coordinates using hex interpolation.
 */
export const axialLine = (start: AxialCoordinates, end: AxialCoordinates) => {
  const steps = computeHexDistance(start, end);
  if (steps === 0) {
    return [start];
  }

  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const roundAxial = (value: { q: number; r: number; s: number }) => {
    let { q, r, s } = value;
    let rq = Math.round(q);
    let rr = Math.round(r);
    let rs = Math.round(s);

    const qDiff = Math.abs(rq - q);
    const rDiff = Math.abs(rr - r);
    const sDiff = Math.abs(rs - s);

    if (qDiff > rDiff && qDiff > sDiff) {
      rq = -rr - rs;
    } else if (rDiff > sDiff) {
      rr = -rq - rs;
    } else {
      rs = -rq - rr;
    }

    return { q: rq, r: rr };
  };

  const result: AxialCoordinates[] = [];
  for (let index = 0; index <= steps; index += 1) {
    const t = steps === 0 ? 0 : index / steps;
    const q = lerp(start.q, end.q, t);
    const r = lerp(start.r, end.r, t);
    const s = lerp(-start.q - start.r, -end.q - end.r, t);
    result.push(roundAxial({ q, r, s }));
  }
  return result;
};

/**
 * Utility to create a coordinate object with derived axial fields for mocks.
 */
export const createGalaxyCoordinate = (
  sectorQ: number,
  sectorR: number,
  sysIndex: number,
): GalaxyCoordinates => ({
  sectorQ,
  sectorR,
  sysIndex,
  axial: deriveAxialFromIndex(sectorQ, sectorR, sysIndex),
});

/**
 * Approximates the hex height for a given radius to help define SVG viewport dimensions.
 */
export const getHexHeight = (size: number) => size * HEX_HEIGHT;
