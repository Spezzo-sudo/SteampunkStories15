import type { Biome } from '@/data/types';

/** Palette and pattern configuration for each biome. */
export const BIOME_STYLE: Record<Biome, { base: string; edge: string; pattern: PatternKind }> = {
  DESERT: { base: '#e9c46a', edge: '#fff2c2', pattern: 'waves' },
  FOREST: { base: '#2a9d8f', edge: '#c8f5ee', pattern: 'dots' },
  HILLS: { base: '#d989b5', edge: '#ffe2f0', pattern: 'raute' },
  PLAINS: { base: '#90be6d', edge: '#e5f5d8', pattern: 'diag' },
  SWAMP: { base: '#577590', edge: '#dce9f6', pattern: 'noise' },
  LAKE: { base: '#4d8bfe', edge: '#cfe1ff', pattern: 'dots' },
  MOUNTAIN: { base: '#8d99ae', edge: '#e9edf5', pattern: 'raute' },
  TUNDRA: { base: '#b8d0eb', edge: '#ffffff', pattern: 'diag' },
  // Legacy biome codes for backward compatibility
  MOUNTAINS: { base: '#8d99ae', edge: '#e9edf5', pattern: 'raute' }, // alias for MOUNTAIN
  OCEAN: { base: '#4d8bfe', edge: '#cfe1ff', pattern: 'dots' }, // alias for LAKE
};

/** Pattern kinds supported by the biome fill renderer. */
export type PatternKind = 'dots' | 'diag' | 'raute' | 'waves' | 'noise';

/** Creates a repeating canvas pattern for the requested biome pattern kind. */
export const makePattern = (
  ctx: CanvasRenderingContext2D,
  kind: PatternKind,
  color: string,
  bg: string,
  alpha = 0.08,
) => {
  const dpr = window.devicePixelRatio || 1;
  const size = 32 * dpr;
  const canvas = 'OffscreenCanvas' in window ? new OffscreenCanvas(size, size) : document.createElement('canvas');
  if (!(canvas instanceof OffscreenCanvas)) {
    canvas.width = size;
    canvas.height = size;
  }
  const g = canvas.getContext('2d');
  if (!g) {
    return null;
  }
  g.fillStyle = bg;
  g.fillRect(0, 0, size, size);
  g.globalAlpha = alpha;
  g.strokeStyle = color;
  g.fillStyle = color;
  if (kind === 'dots') {
    for (let y = 4 * dpr; y < size; y += 6 * dpr) {
      for (let x = 4 * dpr; x < size; x += 6 * dpr) {
        g.beginPath();
        g.arc(x, y, 1.6 * dpr, 0, Math.PI * 2);
        g.fill();
      }
    }
  }
  if (kind === 'diag') {
    g.lineWidth = 2 * dpr;
    for (let i = -size; i < size * 2; i += 8 * dpr) {
      g.beginPath();
      g.moveTo(i, 0);
      g.lineTo(i + size, size);
      g.stroke();
    }
  }
  if (kind === 'raute') {
    g.lineWidth = 1.5 * dpr;
    for (let i = -size; i < size * 2; i += 10 * dpr) {
      g.beginPath();
      g.moveTo(i, 0);
      g.lineTo(i + size, size);
      g.moveTo(i + size, 0);
      g.lineTo(i, size);
      g.stroke();
    }
  }
  if (kind === 'waves') {
    g.lineWidth = 1.5 * dpr;
    for (let y = 8 * dpr; y < size; y += 8 * dpr) {
      g.beginPath();
      for (let x = 0; x <= size; x += 4 * dpr) {
        g.lineTo(x, y + Math.sin(x / 6) * 1.8 * dpr);
      }
      g.stroke();
    }
  }
  if (kind === 'noise') {
    for (let i = 0; i < 180; i += 1) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      g.globalAlpha = 0.12;
      g.fillRect(x, y, 1.2 * dpr, 1.2 * dpr);
    }
  }
  const patternSource =
    canvas instanceof OffscreenCanvas && 'transferToImageBitmap' in canvas
      ? canvas.transferToImageBitmap()
      : (canvas as HTMLCanvasElement);
  return ctx.createPattern(patternSource, 'repeat');
};
