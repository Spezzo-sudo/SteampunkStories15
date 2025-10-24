/**
 * RGB color channel tuple.
 */
export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

/**
 * Converts a hex color string into an RGB tuple.
 */
export const hexToRgb = (value: string): RgbColor => {
  const normalized = value.replace('#', '');
  if (normalized.length === 3) {
    const [r, g, b] = normalized.split('');
    return hexToRgb(`#${r}${r}${g}${g}${b}${b}`);
  }
  const parsed = normalized.padEnd(6, '0').slice(0, 6);
  return {
    r: parseInt(parsed.slice(0, 2), 16) || 0,
    g: parseInt(parsed.slice(2, 4), 16) || 0,
    b: parseInt(parsed.slice(4, 6), 16) || 0,
  };
};

/**
 * Converts an RGB tuple into a hex color string.
 */
export const rgbToHex = ({ r, g, b }: RgbColor): string => {
  const clamp = (channel: number) => Math.max(0, Math.min(255, Math.round(channel)));
  return `#${clamp(r).toString(16).padStart(2, '0')}${clamp(g).toString(16).padStart(2, '0')}${clamp(b)
    .toString(16)
    .padStart(2, '0')}`;
};

/**
 * Creates a new hex color by linearly mixing two hex colors.
 */
export const mixColors = (from: string, to: string, ratio: number): string => {
  const clampRatio = Math.max(0, Math.min(1, ratio));
  const start = hexToRgb(from);
  const end = hexToRgb(to);
  return rgbToHex({
    r: start.r + (end.r - start.r) * clampRatio,
    g: start.g + (end.g - start.g) * clampRatio,
    b: start.b + (end.b - start.b) * clampRatio,
  });
};

/**
 * Adjusts a hex color's lightness by the provided delta in the range [-1, 1].
 */
export const adjustColor = (value: string, delta: number): string => {
  const { r, g, b } = hexToRgb(value);
  const { h, s, l } = rgbToHsl(r, g, b);
  const lightness = Math.max(0, Math.min(1, l + delta));
  return rgbToHex(hslToRgb(h, s, lightness));
};

/**
 * Appends an alpha component (0-1) to a hex color.
 */
export const withAlpha = (value: string, alpha: number): string => {
  const normalized = Math.max(0, Math.min(1, alpha));
  return `${value.replace('#', '')}${Math.round(normalized * 255)
    .toString(16)
    .padStart(2, '0')}`;
};

interface HslColor {
  h: number;
  s: number;
  l: number;
}

const rgbToHsl = (r: number, g: number, b: number): HslColor => {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    switch (max) {
      case rn:
        h = ((gn - bn) / delta + (gn < bn ? 6 : 0)) % 6;
        break;
      case gn:
        h = (bn - rn) / delta + 2;
        break;
      default:
        h = (rn - gn) / delta + 4;
        break;
    }
    h /= 6;
  }

  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  return { h, s, l };
};

const hslToRgb = (h: number, s: number, l: number): RgbColor => {
  const hueToRgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) {
      tt += 1;
    }
    if (tt > 1) {
      tt -= 1;
    }
    if (tt < 1 / 6) {
      return p + (q - p) * 6 * tt;
    }
    if (tt < 1 / 2) {
      return q;
    }
    if (tt < 2 / 3) {
      return p + (q - p) * (2 / 3 - tt) * 6;
    }
    return p;
  };

  if (s === 0) {
    const value = Math.round(l * 255);
    return { r: value, g: value, b: value };
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: Math.round(hueToRgb(p, q, h + 1 / 3) * 255),
    g: Math.round(hueToRgb(p, q, h) * 255),
    b: Math.round(hueToRgb(p, q, h - 1 / 3) * 255),
  };
};
