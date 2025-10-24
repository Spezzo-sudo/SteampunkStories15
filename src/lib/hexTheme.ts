import type { TileStyle } from '@/lib/hexRender';
import { adjustColor, mixColors } from '@/lib/color';

/**
 * Visual properties required to render a stylised, extruded hex tile.
 */
export interface TileTheme {
  topBase: string;
  topHighlight: string;
  sideLight: string;
  sideShadow: string;
  edge: string;
  accent: string;
  ambientOcclusion: string;
}

/**
 * Generates a {@link TileTheme} from the simpler {@link TileStyle} palette definition.
 */
export const createTileTheme = (style: TileStyle): TileTheme => {
  const base = style.fill;
  return {
    topBase: base,
    topHighlight: adjustColor(base, 0.18),
    sideLight: adjustColor(base, -0.08),
    sideShadow: adjustColor(base, -0.22),
    edge: style.stroke,
    accent: style.accent,
    ambientOcclusion: mixColors('#000000', base, 0.35),
  };
};
