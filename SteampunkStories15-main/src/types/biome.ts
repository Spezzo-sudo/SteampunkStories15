/**
 * Gemeinsame Typen für Hex-Biome im Äther-Imperium.
 * Gameplay-spezifische Logik sollte in lib/-Hilfsfunktionen gekapselt werden.
 */
export type ResourceId =
  | 'aether'
  | 'coal'
  | 'ore'
  | 'food'
  | 'luxury'
  | 'research'
  | 'influence'
  | 'fuel';

export type HazardId =
  | 'storm'
  | 'piracy'
  | 'radiation'
  | 'heat'
  | 'corrosion'
  | 'gravity'
  | 'anomaly'
  | 'quarantine';

export interface HexBiome {
  /** Stabile, maschinenlesbare ID (snake_case). */
  id: string;
  /** Anzeigename in der UI. */
  name: string;
  /** Kurze, UI-taugliche Beschreibung. */
  blurb: string;
  /** Kategorien/Schlagworte für Content-Heuristiken. */
  tags: string[];
  /** Basis-Erträge pro Tick (werden zentral skaliert). */
  baseYield: Partial<Record<ResourceId, number>>;
  /** Bewegungskosten pro Schiffsrolle (1 = Standard). */
  moveCost: {
    airship: number;
    frigate: number;
    dreadnought: number;
  };
  /** Gefahrenstufen (0–3), beeinflussen Ereignisse und Wartung. */
  hazards: Partial<Record<HazardId, 0 | 1 | 2 | 3>>;
  /** Erlaubte und gesperrte Bauten für dieses Hex. */
  build: {
    allowed: string[];
    banned?: string[];
  };
  /** Präferenzen oder Konflikte für Nachbar-Biome. */
  adjacency?: {
    prefers?: string[];
    avoids?: string[];
  };
  /** Farb-Palette für die Hex-Visualisierung. */
  palette: {
    base: string;
    edge: string;
    accent: string;
  };
  /** Symbolische Marker für die Darstellung. */
  decals?: string[];
}
