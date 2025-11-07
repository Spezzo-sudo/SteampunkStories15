import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CONFIG } from '@/config/mapConfig';
import { drawMacro, fitMacroView, regionAxToPx } from '@/lib/hexgrid/macroWorld';
import { resizeCanvas, type Camera } from '@/lib/hexgrid/viewport';
import { useMapStore } from '@/store/mapStore';

interface NodeButtonPlacement {
  id: string;
  x: number;
  y: number;
  label: string;
}

interface RenderEnv {
  ctx: CanvasRenderingContext2D;
  dpr: number;
  width: number;
  height: number;
  cssWidth: number;
  cssHeight: number;
}

const DEFAULT_CAMERA: Camera = { tx: 0, ty: 0, scale: 1, minScale: 0.5, maxScale: 5 };

/**
 * Macro map canvas rendering the 19-region layout and exposing alliance filtering controls.
 */
const MacroMapComponent: React.FC = () => {
  const world = useMapStore((state) => state.world);
  const allianceFilterOn = world?.allianceFilterOn ?? false;
  const selectRegion = useMapStore((state) => state.selectRegion);
  const toggleAllianceFilter = useMapStore((state) => state.toggleAllianceFilter);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cameraRef = useRef<Camera>({ ...DEFAULT_CAMERA });
  const envRef = useRef<RenderEnv | null>(null);
  const worldRef = useRef(world);
  const [buttons, setButtons] = useState<NodeButtonPlacement[]>([]);

  const updateButtons = useCallback(() => {
    const env = envRef.current;
    const currentWorld = worldRef.current;
    if (!env || !currentWorld) {
      setButtons([]);
      return;
    }
    const placements = currentWorld.regions.map((region) => {
      const center = regionAxToPx(region.RQ, region.RR, CONFIG.macroHexRadiusPx);
      const x = (cameraRef.current.tx + center.x * cameraRef.current.scale) / env.dpr;
      const y = (cameraRef.current.ty + center.y * cameraRef.current.scale) / env.dpr;
      return { id: region.id, x, y, label: region.name } satisfies NodeButtonPlacement;
    });
    setButtons(placements);
  }, []);

  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    const currentWorld = worldRef.current;
    if (!canvas || !currentWorld) {
      return;
    }
    const result = resizeCanvas(canvas);
    if (!result.ctx) {
      envRef.current = null;
      return;
    }
    envRef.current = {
      ctx: result.ctx,
      dpr: result.dpr,
      width: result.width,
      height: result.height,
      cssWidth: result.cssWidth,
      cssHeight: result.cssHeight,
    };
    fitMacroView(cameraRef.current, currentWorld, result.width, result.height);
    updateButtons();
  }, [updateButtons]);

  useEffect(() => {
    worldRef.current = world ?? null;
    const env = envRef.current;
    if (world && env) {
      fitMacroView(cameraRef.current, world, env.width, env.height);
      updateButtons();
    }
  }, [world, updateButtons]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return undefined;
    }
    handleResize();
    const observer = new ResizeObserver(handleResize);
    observer.observe(container);
    const viewport = window.visualViewport;
    const viewportHandler = () => handleResize();
    viewport?.addEventListener('resize', viewportHandler);
    return () => {
      observer.disconnect();
      viewport?.removeEventListener('resize', viewportHandler);
    };
  }, [handleResize]);

  useEffect(() => {
    let raf: number;
    const render = (time: number) => {
      const env = envRef.current;
      const currentWorld = worldRef.current;
      if (env?.ctx && currentWorld) {
        drawMacro(env.ctx, cameraRef.current, env.dpr, currentWorld, time);
      }
      raf = window.requestAnimationFrame(render);
    };
    raf = window.requestAnimationFrame(render);
    return () => window.cancelAnimationFrame(raf);
  }, []);

  const handleSelect = useCallback(
    (regionId: string) => {
      selectRegion(regionId);
    },
    [selectRegion],
  );

  return (
    <div ref={containerRef} className="relative h-full w-full">
      <canvas ref={canvasRef} className="h-full w-full" role="img" aria-label="Makrokarte" />
      <div className="pointer-events-none absolute inset-0">
        {buttons.map((button) => (
          <button
            key={button.id}
            type="button"
            className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-700/50 bg-slate-900/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-100 shadow-lg backdrop-blur"
            style={{ left: `${button.x}px`, top: `${button.y}px` }}
            onClick={() => handleSelect(button.id)}
          >
            {button.label}
          </button>
        ))}
      </div>
      <div className="pointer-events-none absolute left-4 top-4 flex flex-col gap-2">
        <button
          type="button"
          className="pointer-events-auto rounded-full border border-slate-600/60 bg-slate-900/80 px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-slate-100 shadow-lg"
          onClick={toggleAllianceFilter}
        >
          {allianceFilterOn ? 'Allianzen: EIN' : 'Allianzen: AUS'}
        </button>
      </div>
    </div>
  );
};

export const MacroMap = React.memo(MacroMapComponent);
MacroMap.displayName = 'MacroMap';
