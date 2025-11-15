import type { Ax } from '@/data/types';

/** Square root of three reused in axial coordinate math. */
export const SQRT3 = Math.sqrt(3);

/** Direction vectors for the six axial neighbors (flat-top orientation). */
export const DIRS: Ax[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

/** Formats an axial coordinate key for maps and sets. */
export const key = (q: number, r: number) => `${q},${r}`;

/** Converts axial coordinates into pointy-top pixel coordinates for the given hex size. */
export const axialToPx = (q: number, r: number, size: number) => ({
  x: size * (SQRT3 * (q + r / 2)),
  y: size * (1.5 * r),
});

/**
 * Returns the corner position for the given hex corner index.
 * The pointy-top orientation starts at 30° (vertex pointing up).
 */
export const hexCorner = (cx: number, cy: number, size: number, index: number) => {
  const angle = ((60 * index - 30) * Math.PI) / 180;
  return {
    x: cx + Math.cos(angle) * size,
    y: cy + Math.sin(angle) * size,
  };
};

/**
 * Builds a reusable Path2D describing a hexagon with the provided radius.
 * The generated path matches the pointy-top axial layout.
 */
export const hexPath = (radius: number) => {
  const path = new Path2D();
  for (let i = 0; i < 6; i += 1) {
    const angle = ((60 * i - 30) * Math.PI) / 180;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) {
      path.moveTo(x, y);
    } else {
      path.lineTo(x, y);
    }
  }
  path.closePath();
  return path;
};

/** Calculates the axial distance between two coordinates. */
export const hexDist = (a: Ax, b: Ax) => {
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  const ds = -a.q - a.r - (-b.q - b.r);
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(ds)) / 2;
};

/** Generates an axial disk of radius R around the provided center coordinate. */
export const disk = (center: Ax, R: number) => {
  const points: Ax[] = [];
  for (let q = -R; q <= R; q += 1) {
    const rMin = Math.max(-R, -q - R);
    const rMax = Math.min(R, -q + R);
    for (let r = rMin; r <= rMax; r += 1) {
      points.push({ q: center.q + q, r: center.r + r });
    }
  }
  return points;
};
