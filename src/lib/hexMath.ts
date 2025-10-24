const SQRT3 = Math.sqrt(3);

export interface FractionalAxial {
  q: number;
  r: number;
}

/**
 * Provides commonly used geometric helpers for pointy-top hex grids.
 */
export const HEX_MATH = {
  SQRT3,
};

/**
 * Converts an axial coordinate into pixel space for a pointy-top layout.
 */
export const axialToPixel = (q: number, r: number, radius: number) => ({
  x: radius * (SQRT3 * q + (SQRT3 / 2) * r),
  y: radius * ((3 / 2) * r),
});

/**
 * Converts a pixel position into fractional axial coordinates for a pointy-top layout.
 */
export const pixelToAxial = (x: number, y: number, radius: number): FractionalAxial => ({
  q: (SQRT3 / 3 * x - y / 3) / radius,
  r: (2 / 3 * y) / radius,
});

/**
 * Generates the six vertex points of a hex polygon with the given radius.
 */
export const buildHexPolygon = (radius: number): [number, number][] =>
  Array.from({ length: 6 }, (_, index) => {
    const angle = ((60 * index - 30) * Math.PI) / 180;
    return [Math.cos(angle) * radius, Math.sin(angle) * radius];
  });
