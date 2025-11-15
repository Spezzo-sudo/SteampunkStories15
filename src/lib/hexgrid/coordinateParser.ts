/**
 * Parses coordinate strings of the form "RQ,RR;q,r" or "RQ,RR" into axial components.
 */
export interface RegionCoordinate {
  /** Macro axial coordinate Q component. */
  RQ: number;
  /** Macro axial coordinate R component. */
  RR: number;
}

/** Result of parsing a coordinate string for region and optional tile targets. */
export interface ParsedCoordinate {
  /** Macro region coordinate resolved from the input string. */
  region: RegionCoordinate;
  /** Optional tile coordinate if the input included a semicolon pair. */
  hex?: { q: number; r: number };
}

/**
 * Attempts to parse an axial coordinate string and returns the structured components if successful.
 */
export const parseCoordinate = (value: string): ParsedCoordinate | null => {
  const match = value
    .trim()
    .match(/^\s*(-?\d+)\s*,\s*(-?\d+)(?:\s*;\s*(-?\d+)\s*,\s*(-?\d+))?\s*$/);
  if (!match) {
    return null;
  }
  const [, rq, rr, q, r] = match;
  const region = { RQ: Number(rq), RR: Number(rr) } satisfies RegionCoordinate;
  return {
    region,
    hex: q !== undefined ? { q: Number(q), r: Number(r) } : undefined,
  } satisfies ParsedCoordinate;
};
