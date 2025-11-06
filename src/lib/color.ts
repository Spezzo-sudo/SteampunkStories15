/**
 * Applies an alpha channel to a color string, returning an rgba representation.
 * Supports #RGB, #RRGGBB and #RRGGBBAA formats with graceful fallbacks for other inputs.
 */
export const applyAlpha = (color: string, alpha: number): string => {
  const clamped = Math.min(Math.max(alpha, 0), 1);
  if (typeof color !== 'string' || color.length === 0) {
    return color;
  }

  if (color.startsWith('#')) {
    let hex = color.slice(1);
    if (hex.length === 3) {
      hex = hex
        .split('')
        .map((char) => char + char)
        .join('');
    }

    if (hex.length === 8) {
      hex = hex.slice(0, 6);
    }

    if (hex.length === 6) {
      const red = parseInt(hex.slice(0, 2), 16);
      const green = parseInt(hex.slice(2, 4), 16);
      const blue = parseInt(hex.slice(4, 6), 16);
      return `rgba(${red}, ${green}, ${blue}, ${clamped})`;
    }
  }

  if (color.startsWith('rgb')) {
    const channels = color
      .replace(/[rgba()\s]/g, '')
      .split(',')
      .filter(Boolean)
      .map(Number);
    if (channels.length >= 3) {
      const [red, green, blue] = channels;
      return `rgba(${red}, ${green}, ${blue}, ${clamped})`;
    }
  }

  return color;
};

/**
 * Parses a hex string into RGB channel values. Returns null for unsupported inputs.
 */
export const hexToRgb = (value: string): { red: number; green: number; blue: number } | null => {
  if (!value.startsWith('#')) {
    return null;
  }

  let hex = value.slice(1);
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((char) => char + char)
      .join('');
  }

  if (hex.length !== 6) {
    return null;
  }

  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);

  if ([red, green, blue].some((channel) => Number.isNaN(channel))) {
    return null;
  }

  return { red, green, blue };
};

/**
 * Converts RGB channel values into a six-digit hex string.
 */
export const rgbToHex = (red: number, green: number, blue: number): string => {
  const clampChannel = (channel: number) => Math.max(0, Math.min(255, Math.round(channel)));
  const toHex = (channel: number) => clampChannel(channel).toString(16).padStart(2, '0');
  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
};

/**
 * Applies the provided alpha to a color string, falling back to {@link applyAlpha}.
 */
export const withAlpha = (color: string, alpha: number): string => applyAlpha(color, alpha);

/**
 * Lightens or darkens a hex color by the given ratio.
 */
export const adjustColor = (color: string, ratio: number): string => {
  const rgb = hexToRgb(color);
  if (!rgb) {
    return color;
  }
  const factor = Math.max(-1, Math.min(1, ratio));
  const adjustChannel = (channel: number) => channel + (factor >= 0 ? (255 - channel) * factor : channel * factor);
  return rgbToHex(adjustChannel(rgb.red), adjustChannel(rgb.green), adjustChannel(rgb.blue));
};

/**
 * Blends two colors together using the provided weight (0..1).
 */
export const mixColors = (colorA: string, colorB: string, weight: number): string => {
  const clampedWeight = Math.min(Math.max(weight, 0), 1);
  const rgbA = hexToRgb(colorA);
  const rgbB = hexToRgb(colorB);
  if (!rgbA || !rgbB) {
    return clampedWeight <= 0.5 ? colorA : colorB;
  }

  const blend = (channelA: number, channelB: number) => channelA * (1 - clampedWeight) + channelB * clampedWeight;
  return rgbToHex(blend(rgbA.red, rgbB.red), blend(rgbA.green, rgbB.green), blend(rgbA.blue, rgbB.blue));
};
