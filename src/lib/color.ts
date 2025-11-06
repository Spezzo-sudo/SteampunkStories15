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
