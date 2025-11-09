import React, { useCallback, useEffect, useRef } from 'react';
import { CONFIG } from '@/config/mapConfig';
import { drawMicro, fitMicroView, pickTileAt } from '@/lib/hexgrid/microRegion';
import { resizeCanvas, type Camera } from '@/lib/hexgrid/viewport';
import { useMapStore } from '@/store/mapStore';
import type { Region, Tile } from '@/data/types';
import { Button } from '@/components/ui/Button';
import { TileActionPopup } from './popups/TileActionPopup';
import { BuildMenu } from './popups/BuildMenu';

interface RenderEnv {
  ctx: CanvasRenderingContext2D;
  dpr: number;
  width: number;
  height: number;
  cssWidth: number;
  cssHeight: number;
}

const DEFAULT_CAMERA: Camera = { tx: 0, ty: 0, scale: 1, minScale: 0.1, maxScale: 2 };

const RegionViewComponent: React.FC<{ region: Region }> = ({ region }) => {
  const {
    backToMacro,
    home,
    handleTileClick,
    selectedTileForPopup,
  } = useMapStore((state) => ({
    backToMacro: state.backToMacro,
    home: state.home,
    handleTileClick: state.handleTileClick,
    selectedTileForPopup: state.selectedTileForPopup,
  }));

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cameraRef = useRef<Camera>({ ...DEFAULT_CAMERA });
  const envRef = useRef<RenderEnv | null>(null);

  const getTileFromEvent = useCallback(
    (evt: React.MouseEvent): Tile | null => {
      const env = envRef.current;
      const canvas = canvasRef.current;
      const cam = cameraRef.current;
      if (!env || !canvas || !region) {
        return null;
      }
      const rect = canvas.getBoundingClientRect();
      const canvasX = (evt.clientX - rect.left) * env.dpr;
      const canvasY = (evt.clientY - rect.top) * env.dpr;

      const worldX = (canvasX - cam.tx) / cam.scale;
      const worldY = (canvasY - cam.ty) / cam.scale;

      return pickTileAt(region, { x: worldX, y: worldY }, CONFIG.microHexSizePx);
    },
    [region],
  );

  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !region) {
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
    fitMicroView(cameraRef.current, region, result.width, result.height);
  }, [region]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    handleResize();
    const observer = new ResizeObserver(handleResize);
    observer.observe(container);
    return () => observer.disconnect();
  }, [handleResize]);

  useEffect(() => {
    let raf: number;
    const render = (time: number) => {
      const env = envRef.current;
      if (env?.ctx && region) {
        drawMicro(env.ctx, cameraRef.current, env.dpr, region, home, selectedTileForPopup, time);
      }
      raf = window.requestAnimationFrame(render);
    };
    raf = window.requestAnimationFrame(render);
    return () => window.cancelAnimationFrame(raf);
  }, [region, home, selectedTileForPopup]);

  const handleClick = (evt: React.MouseEvent) => {
    const tile = getTileFromEvent(evt);
    if (tile) {
      handleTileClick(tile);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full outline-none"
      onClick={handleClick}
      tabIndex={0} // Make div focusable
    >
      <div className="absolute left-4 top-4 z-10">
        <Button
          size="sm"
          variant="secondary"
          onClick={(e) => {
            e.stopPropagation();
            backToMacro();
          }}
        >
          Zurück zur Weltkarte
        </Button>
      </div>
      <canvas ref={canvasRef} className="h-full w-full" />
      <div onClick={(e) => e.stopPropagation()}>
        <TileActionPopup />
        <BuildMenu />
      </div>
    </div>
  );
};

export const RegionView = React.memo(RegionViewComponent);
RegionView.displayName = 'RegionView';
