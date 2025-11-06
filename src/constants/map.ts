/**
 * Radius for micro-region hex disks (produces 19 tiles).
 */
export const REGION_RADIUS = 2;

/**
 * Expected tile count for a radius-2 hex disk.
 */
export const REGION_TILE_COUNT = 19;

/**
 * Visual hex size for macro-level region tiles.
 */
export const MACRO_HEX_SIZE = 64;

/**
 * Visual hex size for micro-level tiles inside a region.
 */
export const MICRO_HEX_SIZE = 12;

/**
 * Declares that all hex math operates in pointy-top orientation.
 */
export const ORIENTATION = 'pointy' as const;
