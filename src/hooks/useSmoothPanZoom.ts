import { useCallback, useEffect, useRef, useState } from 'react';

export interface SmoothPanZoomState {
  x: number;
  y: number;
  z: number;
}

interface ZoomAnchor {
  cursorX: number;
  cursorY: number;
  worldX: number;
  worldY: number;
}

interface SmoothPanZoomOptions {
  minZoom: number;
  maxZoom: number;
  onChange?: (state: SmoothPanZoomState) => void;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const nearlyEqual = (a: number, b: number, epsilon = 0.0001) => Math.abs(a - b) <= epsilon;

type PendingAction = {
  panX: number;
  panY: number;
  zoomDelta: number;
  anchor: ZoomAnchor | null;
};

/**
 * Aggregates pan and zoom gestures via requestAnimationFrame to ensure smooth rendering.
 */
export const useSmoothPanZoom = (
  initial: SmoothPanZoomState,
  options: SmoothPanZoomOptions,
) => {
  const [state, setState] = useState<SmoothPanZoomState>(initial);
  const pendingRef = useRef<PendingAction>({ panX: 0, panY: 0, zoomDelta: 0, anchor: null });
  const rafRef = useRef<number | null>(null);

  const applyFrame = useCallback(() => {
    rafRef.current = null;
    setState((previous) => {
      const pending = pendingRef.current;
      pendingRef.current = { panX: 0, panY: 0, zoomDelta: 0, anchor: null };

      let nextZoom = previous.z;
      if (pending.zoomDelta !== 0) {
        nextZoom = clamp(previous.z + pending.zoomDelta, options.minZoom, options.maxZoom);
      }

      let nextX = previous.x;
      let nextY = previous.y;

      if (pending.anchor && pending.zoomDelta !== 0) {
        const { cursorX, cursorY, worldX, worldY } = pending.anchor;
        nextX = cursorX / nextZoom - worldX;
        nextY = cursorY / nextZoom - worldY;
      }

      if (pending.panX !== 0 || pending.panY !== 0) {
        nextX += pending.panX / nextZoom;
        nextY += pending.panY / nextZoom;
      }

      if (
        nearlyEqual(previous.x, nextX) &&
        nearlyEqual(previous.y, nextY) &&
        nearlyEqual(previous.z, nextZoom)
      ) {
        return previous;
      }

      const next = { x: nextX, y: nextY, z: nextZoom };
      options.onChange?.(next);
      return next;
    });
  }, [options]);

  const schedule = useCallback(() => {
    if (rafRef.current == null) {
      rafRef.current = requestAnimationFrame(applyFrame);
    }
  }, [applyFrame]);

  const queuePan = useCallback(
    (dx: number, dy: number) => {
      pendingRef.current.panX += dx;
      pendingRef.current.panY += dy;
      schedule();
    },
    [schedule],
  );

  const queueZoom = useCallback(
    (delta: number, anchor: ZoomAnchor) => {
      pendingRef.current.zoomDelta += delta;
      pendingRef.current.anchor = anchor;
      schedule();
    },
    [schedule],
  );

  const setImmediate = useCallback(
    (next: SmoothPanZoomState) => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      pendingRef.current = { panX: 0, panY: 0, zoomDelta: 0, anchor: null };
      setState((previous) => {
        if (
          nearlyEqual(previous.x, next.x) &&
          nearlyEqual(previous.y, next.y) &&
          nearlyEqual(previous.z, next.z)
        ) {
          return previous;
        }
        options.onChange?.(next);
        return next;
      });
    },
    [options],
  );

  const sync = useCallback((next: SmoothPanZoomState) => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    pendingRef.current = { panX: 0, panY: 0, zoomDelta: 0, anchor: null };
    setState((previous) => {
      if (
        nearlyEqual(previous.x, next.x) &&
        nearlyEqual(previous.y, next.y) &&
        nearlyEqual(previous.z, next.z)
      ) {
        return previous;
      }
      return next;
    });
  }, []);

  useEffect(() => () => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
    }
  }, []);

  useEffect(() => {
    const initialSync = { ...initial };
    sync(initialSync);
    // The hook intentionally performs this sync only once on mount to align with the initial ref state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    state,
    queuePan,
    queueZoom,
    setImmediate,
    sync,
  };
};
