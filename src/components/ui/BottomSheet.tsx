import React, { useEffect, useMemo, useRef, useState } from 'react';

type SnapPoint = 'peek' | 'half' | 'full';

type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  snaps?: SnapPoint[];
  initialSnap?: SnapPoint;
  ariaLabel?: string;
  children: React.ReactNode;
};

const SNAP_HEIGHT = {
  peek: 0.2,
  half: 0.55,
  full: 0.94,
} as const satisfies Record<SnapPoint, number>;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/**
 * Mobile friendly bottom sheet with drag-to-expand snaps for system details.
 */
const BottomSheet: React.FC<BottomSheetProps> = ({
  open,
  onClose,
  snaps = ['peek', 'half', 'full'],
  initialSnap = 'half',
  ariaLabel,
  children,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeSnap, setActiveSnap] = useState<SnapPoint>(initialSnap);
  const [dragDelta, setDragDelta] = useState<number | null>(null);
  const [startY, setStartY] = useState<number | null>(null);
  const [viewportHeight, setViewportHeight] = useState<number>(() =>
    typeof window === 'undefined' ? 0 : window.innerHeight,
  );

  useEffect(() => {
    if (!open) {
      setActiveSnap(initialSnap);
      setDragDelta(null);
      setStartY(null);
    }
  }, [open, initialSnap]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }
    const handleResize = () => setViewportHeight(window.innerHeight);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const targetHeight = useMemo(() => {
    const ratio = SNAP_HEIGHT[activeSnap] ?? SNAP_HEIGHT.half;
    return Math.round(viewportHeight * ratio);
  }, [activeSnap, viewportHeight]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) {
      return undefined;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if ((event.target as HTMLElement).closest('[data-scrollable="true"]')) {
        return;
      }
      node.setPointerCapture(event.pointerId);
      setStartY(event.clientY);
      setDragDelta(0);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (startY == null) {
        return;
      }
      setDragDelta(event.clientY - startY);
    };

    const completeGesture = (event: PointerEvent) => {
      if (startY == null) {
        return;
      }
      const delta = event.clientY - startY;
      setStartY(null);
      setDragDelta(null);

      if (delta > 120) {
        const index = snaps.indexOf(activeSnap);
        if (index > 0) {
          setActiveSnap(snaps[index - 1]);
        } else {
          onClose();
        }
      } else if (delta < -120) {
        const index = snaps.indexOf(activeSnap);
        if (index < snaps.length - 1) {
          setActiveSnap(snaps[index + 1]);
        }
      }
    };

    node.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', completeGesture);
    window.addEventListener('pointercancel', completeGesture);
    return () => {
      node.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', completeGesture);
      window.removeEventListener('pointercancel', completeGesture);
    };
  }, [activeSnap, onClose, snaps, startY]);

  const translateY = useMemo(() => {
    if (!open) {
      return targetHeight + 80;
    }
    const delta = dragDelta ?? 0;
    return clamp(delta, targetHeight * -0.5, targetHeight);
  }, [dragDelta, open, targetHeight]);

  return (
    <div
      role="dialog"
      aria-label={ariaLabel}
      aria-hidden={!open}
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div
        ref={containerRef}
        className="pointer-events-auto mx-auto w-full max-w-[720px] rounded-t-2xl border border-yellow-800/40 bg-black/85 p-2 shadow-2xl backdrop-blur transition-transform"
        style={{
          height: targetHeight,
          transform: `translateY(${translateY}px)`,
          touchAction: 'none',
        }}
      >
        <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-white/30" />
        <div className="h-[calc(100%-16px)] overflow-y-auto" data-scrollable="true">
          {children}
        </div>
      </div>
    </div>
  );
};

export default React.memo(BottomSheet);
