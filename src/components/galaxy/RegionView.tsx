import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CONFIG } from '@/config/mapConfig';
import type { Region, Tile } from '@/data/types';
import { drawRegion, pickTileAt, regionHull } from '@/lib/hexgrid/microRegion';
import { resizeCanvas, type Camera, fitToBounds } from '@/lib/hexgrid/viewport';
import { useMapStore } from '@/store/mapStore';

interface RenderEnv {
  ctx: CanvasRenderingContext2D;
  dpr: number;
  width: number;
  height: number;
  cssWidth: number;
  cssHeight: number;
}

const DEFAULT_CAMERA: Camera = { tx: 0, ty: 0, scale: 1, minScale: 0.6, maxScale: 6 };

interface RegionViewProps {
  region: Region;
}

/**
 * Micro map canvas rendering the 19-hex tile cluster for the selected region.
 */
const RegionViewComponent: React.FC<RegionViewProps> = ({ region }) => {
  const backToMacro = useMapStore((state) => state.backToMacro);
  const allianceFilterOn = useMapStore((state) => state.world?.allianceFilterOn ?? false);
  const toggleAllianceFilter = useMapStore((state) => state.toggleAllianceFilter);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cameraRef = useRef<Camera>({ ...DEFAULT_CAMERA });
  const envRef = useRef<RenderEnv | null>(null);
  const regionRef = useRef<Region | null>(region);
  const selectedRef = useRef<Tile | null>(null);
  const [selectedTile, setSelectedTile] = useState<Tile | null>(null);

  const render = useCallback(
    (time: number) => {
      const env = envRef.current;
      const currentRegion = regionRef.current;
      if (env?.ctx && currentRegion) {
        drawRegion(env.ctx, cameraRef.current, env.dpr, currentRegion, CONFIG.microHexSizePx, time, {
          selected: selectedRef.current,
          showAlliances: allianceFilterOn,
        });
      }
    },
    [allianceFilterOn],
  );

  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    const currentRegion = regionRef.current;
    if (!canvas || !currentRegion) {
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
    const { bounds } = regionHull(currentRegion, CONFIG.microHexSizePx);
    fitToBounds(cameraRef.current, bounds, result.width, result.height, CONFIG.paddingPx);
    render(performance.now());
  }, [render]);

  useEffect(() => {
    regionRef.current = region;
    selectedRef.current = null;
    setSelectedTile(null);
    const env = envRef.current;
    if (env) {
      const { bounds } = regionHull(region, CONFIG.microHexSizePx);
      fitToBounds(cameraRef.current, bounds, env.width, env.height, CONFIG.paddingPx);
      render(performance.now());
    }
  }, [region, render]);

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
    render(performance.now());
  }, [allianceFilterOn, render]);

  useEffect(() => {
    selectedRef.current = selectedTile;
    render(performance.now());
  }, [selectedTile, render]);

  const getTileFromEvent = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const env = envRef.current;
    const currentRegion = regionRef.current;
    const canvas = canvasRef.current;
    if (!env || !currentRegion || !canvas) {
      return null;
    }
    const rect = canvas.getBoundingClientRect();
    const px = (event.clientX - rect.left) * env.dpr;
    const py = (event.clientY - rect.top) * env.dpr;
    const worldX = (px - cameraRef.current.tx) / cameraRef.current.scale;
    const worldY = (py - cameraRef.current.ty) / cameraRef.current.scale;
    return pickTileAt(currentRegion, { x: worldX, y: worldY }, CONFIG.microHexSizePx);
  }, []);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const tile = getTileFromEvent(event);
      if (tile) {
        setSelectedTile(tile);
      }
    },
    [getTileFromEvent],
  );

  return (
    <div ref={containerRef} className="relative h-full w-full">
      <canvas
        ref={canvasRef}
        className="h-full w-full"
        role="img"
        aria-label={`Region ${region.name}`}
        onPointerDown={handlePointerDown}
      />
      <div className="pointer-events-none absolute left-4 top-4 flex flex-col gap-2">
        <button
          type="button"
          className="pointer-events-auto rounded-full border border-slate-600/60 bg-slate-900/80 px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-slate-100 shadow-lg"
          onClick={backToMacro}
        >
          Zur Übersicht
        </button>
        <button
          type="button"
          className="pointer-events-auto rounded-full border border-slate-600/60 bg-slate-900/80 px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-slate-100 shadow-lg"
          onClick={toggleAllianceFilter}
        >
          {allianceFilterOn ? 'Allianzen: EIN' : 'Allianzen: AUS'}
        </button>
      </div>
      {selectedTile && (
        <div className="pointer-events-none absolute right-4 bottom-4 w-64 rounded-2xl border border-slate-600/50 bg-slate-900/85 p-4 text-xs text-slate-100 shadow-xl backdrop-blur">
          <p className="mb-1 font-semibold uppercase tracking-[0.3em]">Hex {selectedTile.q},{selectedTile.r}</p>
          <p className="text-[0.7rem] text-slate-200">Biome: {selectedTile.biome}</p>
          {selectedTile.allianceId && <p className="text-[0.7rem] text-slate-200">Bande: {selectedTile.allianceId}</p>}
          {selectedTile.hasSettlement ? (
            <p className="text-[0.7rem] text-amber-200">Siedlung: {selectedTile.hasSettlement.icon}</p>
          ) : (
            <p className="text-[0.7rem] text-slate-400">Unbesiedelt</p>
          )}
        </div>
      )}
    </div>
  );
};

export const RegionView = React.memo(RegionViewComponent);
RegionView.displayName = 'RegionView';
