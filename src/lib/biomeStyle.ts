import type { Biome } from '@/store/mapStore';

export type BiomePattern = 'dots' | 'diag' | 'raute' | 'noise';

/** Alpha applied to biome patterns while in RAW mode. */
export const PATTERN_ALPHA_RAW = 0.26;

/** Alpha applied to biome patterns while in the styled presentation mode. */
export const PATTERN_ALPHA_STYLED = 0.38;

/** Edge opacity used when displaying RAW biome borders. */
export const EDGE_ALPHA_RAW = 0.65;

/** Edge opacity used for styled biome borders. */
export const EDGE_ALPHA_STYLED = 0.95;

export interface BiomeVisualStyle {
  fill: string;
  edge: string;
  pattern: BiomePattern;
}

/** Map of biome codes to their visual styling (fill, edge and procedural pattern). */
export const BIOME_STYLE: Record<Biome, BiomeVisualStyle> = {
  IG: { fill: '#E08A3A', edge: '#F8D6B6', pattern: 'diag' },
  CL: { fill: '#8B5CF6', edge: '#DEC7FF', pattern: 'dots' },
  GL: { fill: '#6D28D9', edge: '#D9C4FF', pattern: 'raute' },
  HE: { fill: '#E58CA4', edge: '#FFE0E9', pattern: 'noise' },
  DK: { fill: '#78A65B', edge: '#DCF0C9', pattern: 'dots' },
  EO: { fill: '#7BAA6D', edge: '#E1F3D2', pattern: 'diag' },
  BR: { fill: '#E4C045', edge: '#FFF2B0', pattern: 'raute' },
  NE: { fill: '#B56F74', edge: '#FFD2D6', pattern: 'noise' },
};

/**
 * Creates a repeating canvas pattern for biome shading, falling back to inline canvases when OffscreenCanvas is unavailable.
 */
export const createBiomePattern = (
  ctx: CanvasRenderingContext2D,
  type: BiomePattern,
  color: string,
  bg: string,
  dpr: number = window.devicePixelRatio || 1,
  alpha: number = 0.3,
): CanvasPattern => {
  const size = 32 * dpr;
  const source = typeof OffscreenCanvas !== 'undefined'
    ? new OffscreenCanvas(size, size)
    : (() => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        return canvas;
      })();

  const patternCtx = source.getContext('2d');
  if (!patternCtx) {
    return ctx.createPattern(ctx.canvas, 'repeat')!;
  }

  patternCtx.clearRect(0, 0, size, size);
  patternCtx.fillStyle = bg;
  patternCtx.fillRect(0, 0, size, size);
  patternCtx.strokeStyle = color;
  patternCtx.fillStyle = color;
  patternCtx.globalAlpha = alpha;

  if (type === 'diag') {
    patternCtx.lineWidth = 2 * dpr;
    for (let x = -size; x < size * 2; x += 8 * dpr) {
      patternCtx.beginPath();
      patternCtx.moveTo(x, 0);
      patternCtx.lineTo(x + size, size);
      patternCtx.stroke();
    }
  } else if (type === 'dots') {
    for (let y = 4 * dpr; y < size; y += 6 * dpr) {
      for (let x = 4 * dpr; x < size; x += 6 * dpr) {
        patternCtx.beginPath();
        patternCtx.arc(x, y, 1.6 * dpr, 0, Math.PI * 2);
        patternCtx.fill();
      }
    }
  } else if (type === 'raute') {
    patternCtx.lineWidth = 1.5 * dpr;
    for (let i = -size; i < size * 2; i += 10 * dpr) {
      patternCtx.beginPath();
      patternCtx.moveTo(i, 0);
      patternCtx.lineTo(i + size, size);
      patternCtx.moveTo(i + size, 0);
      patternCtx.lineTo(i, size);
      patternCtx.stroke();
    }
  } else if (type === 'noise') {
    patternCtx.globalAlpha = 0.12;
    for (let i = 0; i < 180; i += 1) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      patternCtx.fillRect(x, y, 1.2 * dpr, 1.2 * dpr);
    }
  }

  if ('transferToImageBitmap' in source) {
    return ctx.createPattern((source as OffscreenCanvas).transferToImageBitmap(), 'repeat')!;
  }

  return ctx.createPattern(source as HTMLCanvasElement, 'repeat')!;
};
