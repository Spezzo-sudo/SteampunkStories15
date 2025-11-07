/**
 * Shared configuration for the macro and micro hex maps.
 */
export const CONFIG = {
  /** Radius (in axial steps) for the macro region layout disk. */
  macroRegionRadius: 2,
  /** Radius (in axial steps) for each micro region tile cluster. */
  microRegionRadius: 2,
  /** Visual radius in pixels for the macro region hexes before scaling. */
  macroHexRadiusPx: 92,
  /** Base hex size in pixels for tiles on the micro map. */
  microHexSizePx: 28,
  /** Padding in screen pixels reserved when fitting to bounds. */
  paddingPx: 64,
} as const;
