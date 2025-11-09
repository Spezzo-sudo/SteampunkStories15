import React, { useCallback, useEffect, useRef } from 'react';
import { CONFIG } from '@/config/mapConfig';
import { drawMacro, fitMacroView } from '@/lib/hexgrid/macroWorld';
import { resizeCanvas, type Camera } from '@/lib/hexgrid/viewport';
import { useMapStore } from '@/store/mapStore';
import { regionAxToPx } from '@/lib/hexgrid/macroWorld';

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
  const setHoveredRegion = useMapStore((state) => state.setHoveredRegion);
  const selectRegion = useMapStore((state) => state.selectRegion);
  const toggleAllianceFilter = useMapStore((state) => state.toggleAllianceFilter);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cameraRef = useRef<Camera>({ ...DEFAULT_CAMERA });
  const envRef = useRef<RenderEnv | null>(null);
  const worldRef = useRef(world);

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
  }, []);

  useEffect(() => {
    worldRef.current = world ?? null;
    const env = envRef.current;
    if (world && env) {
      fitMacroView(cameraRef.current, world, env.width, env.height);
    }
  }, [world]);

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

  const getRegionFromMouseEvent = (evt: React.MouseEvent<HTMLDivElement>) => {
    if (!world?.regions) {
      return undefined;
    }
    const env = envRef.current;
    const cam = cameraRef.current;
    if (!env || !canvasRef.current) {
      return undefined;
    }
    const rect = canvasRef.current.getBoundingClientRect();
    const worldX = (evt.clientX - rect.left - cam.tx) / cam.scale;
    const worldY = (evt.clientY - rect.top - cam.ty) / cam.scale;
    
    let closest = { dist: Infinity, id: '' };
    for (const region of world.regions) {
        const center = regionAxToPx(region.RQ, region.RR, CONFIG.macroHexRadiusPx)
        const dist = Math.hypot(center.x - worldX, center.y - worldY);
        if (dist < closest.dist) {
            closest = { dist, id: region.id };
        }
    }
    
    if (closest.dist < CONFIG.macroHexRadiusPx * 0.9) {
        return closest.id;
    }
    return undefined;
  };

  const handleMouseMove = (evt: React.MouseEvent<HTMLDivElement>) => {
    const regionId = getRegionFromMouseEvent(evt);
    setHoveredRegion(regionId);
  };

  const handleMouseLeave = () => {
    setHoveredRegion(undefined);
  };

  const handleClick = (evt: React.MouseEvent<HTMLDivElement>) => {
    const regionId = getRegionFromMouseEvent(evt);
    if (regionId) {
        selectRegion(regionId);
    }
  };

  return (
    <div 
        ref={containerRef} 
        className="relative h-full w-full cursor-pointer" 
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
    >
      <canvas ref={canvasRef} className="h-full w-full" role="img" aria-label="Macro-level galaxy map" />
      <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center">
        <button
          type="button"
          className="pointer-events-auto rounded-full border border-slate-600/60 bg-slate-900/80 px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-slate-100 shadow-lg"
          onClick={(evt) => {
            evt.stopPropagation();
            toggleAllianceFilter();
          }}
        >
          {world?.allianceFilterOn ? 'Alliances: ON' : 'Alliances: OFF'}
        </button>
      </div>
    </div>
  );
};

export const MacroMap = React.memo(MacroMapComponent);
MacroMap.displayName = 'MacroMap';
