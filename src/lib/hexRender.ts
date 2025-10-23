import type { HexBiome } from '@/types/biome';

export interface TileStyle {
  fill: string;
  stroke: string;
  accent: string;
  decals?: string[];
}

/**
 * Übersetzt die Biome-Palette in ein Rendering-Style-Objekt für die HexMap.
 */
export const biomeToTileStyle = (biome: HexBiome): TileStyle => ({
  fill: biome.palette.base,
  stroke: biome.palette.edge,
  accent: biome.palette.accent,
  decals: biome.decals,
});
