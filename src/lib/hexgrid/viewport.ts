/** Camera transform used by the macro and micro canvas renderers. */
export interface Camera {
  /** Translation in device pixels along the X axis. */
  tx: number;
  /** Translation in device pixels along the Y axis. */
  ty: number;
  /** Scale factor applied to world coordinates. */
  scale: number;
  /** Minimum scale permitted when interacting. */
  minScale: number;
  /** Maximum scale permitted when interacting. */
  maxScale: number;
}

/** Resizes the canvas for HiDPI displays and returns the 2D context with metadata. */
export const resizeCanvas = (canvas: HTMLCanvasElement) => {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;
  const ctx = canvas.getContext('2d');
  ctx?.setTransform(1, 0, 0, 1, 0, 0);
  return { ctx: ctx ?? null, dpr, width: canvas.width, height: canvas.height, cssWidth: rect.width, cssHeight: rect.height };
};

/** Converts a screen-space stroke width in pixels to world units. */
export const strokePx = (px: number, cam: Camera, dpr: number) => Math.max(1, px) / (cam.scale * dpr);

/** Computes a camera transform that fits the provided bounds with padding. */
export const fitToBounds = (
  cam: Camera,
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  width: number,
  height: number,
  padding: number,
) => {
  const availableWidth = Math.max(1, width - padding * 2);
  const availableHeight = Math.max(1, height - padding * 2);
  const w = Math.max(1, bounds.maxX - bounds.minX);
  const h = Math.max(1, bounds.maxY - bounds.minY);
  const rawScale = Math.min(availableWidth / w, availableHeight / h);
  const scale = Number.isFinite(rawScale) && rawScale > 0 ? rawScale : 1;

  cam.scale = scale;
  cam.tx = width / 2 - (bounds.minX + w / 2) * scale;
  cam.ty = height / 2 - (bounds.minY + h / 2) * scale;
  cam.minScale = scale * 0.9;
  cam.maxScale = scale * 5;
};

/** Computes axis-aligned bounds for the provided point list. */
export const boundsOf = (points: Array<{ x: number; y: number }>) => {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  points.forEach((point) => {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  });
  return { minX, minY, maxX, maxY };
};
