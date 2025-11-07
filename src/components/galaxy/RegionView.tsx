import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { axialToPixel, pixelToAxial } from '@/lib/hex';
import { buildRegionHull } from '@/lib/regionGeometry';
import {
  BIOME_STYLE,
  EDGE_ALPHA_RAW,
  EDGE_ALPHA_STYLED,
  PATTERN_ALPHA_RAW,
  PATTERN_ALPHA_STYLED,
  createBiomePattern,
} from '@/lib/biomeStyle';
import LegendOverlay from '@/components/overlays/LegendOverlay';
import DebugFab from '@/components/overlays/DebugFab';
import { useMapStore, type Biome } from '@/store/mapStore';
import type { RegionData, TileData } from '@/types/map';

const BASE_HEX_SIZE = 28;
const SHOW_LABEL_ZOOM = 1.1;
interface RegionViewProps {
  region: RegionData;
}

interface LaneGateDescriptor {
  id: string;
  x: number;
  y: number;
  label: string;
  edgeDir: number;
}

const fallbackBiome: Biome = 'NE';
const GATE_ARROWS = ['→', '↗', '↖', '←', '↙', '↘'];

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const resizeCanvas = (
  canvas: HTMLCanvasElement,
  container: HTMLDivElement,
): { width: number; height: number } => {
  const rect = container.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  const ctx = canvas.getContext('2d');
  ctx?.setTransform(1, 0, 0, 1, 0, 0);
  return { width: rect.width, height: rect.height };
};

const roundAxial = (value: { q: number; r: number }) => {
  const q = value.q;
  const r = value.r;
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  let rs = Math.round(s);

  const qDiff = Math.abs(rq - q);
  const rDiff = Math.abs(rr - r);
  const sDiff = Math.abs(rs - s);

  if (qDiff > rDiff && qDiff > sDiff) {
    rq = -rr - rs;
  } else if (rDiff > sDiff) {
    rr = -rq - rs;
  }

  return { q: rq, r: rr };
};

const buildHexPath = (ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) => {
  ctx.beginPath();
  for (let index = 0; index < 6; index += 1) {
    const angle = ((60 * index - 30) * Math.PI) / 180;
    const px = cx + size * Math.cos(angle);
    const py = cy + size * Math.sin(angle);
    if (index === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.closePath();
};

/**
 * Fullscreen region renderer highlighting biome colors, procedural patterns and a premium selection glow.
 */
const RegionViewComponent: React.FC<RegionViewProps> = ({ region }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pointerRef = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null);
  const [viewport, setViewport] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const rawMode = useMapStore((state) => state.rawMode);
  const setRawMode = useMapStore((state) => state.setRawMode);
  const camera = useMapStore((state) => state.camera);
  const panBy = useMapStore((state) => state.panBy);
  const zoomAt = useMapStore((state) => state.zoomAt);
  const fitRegionToViewport = useMapStore((state) => state.fitRegionToViewport);
  const regions = useMapStore((state) => state.regions);
  const backToMacro = useMapStore((state) => state.backToMacro);
  const showGrid = useMapStore((state) => state.showGrid);

  const tiles = useMemo(() => region.tiles.slice().sort((a, b) => a.r - b.r || a.q - b.q), [region.tiles]);

  const tileLookup = useMemo(() => {
    const map = new Map<string, TileData>();
    tiles.forEach((tile) => {
      map.set(`${tile.q}_${tile.r}`, tile);
    });
    return map;
  }, [tiles]);

  const tileCenters = useMemo(() => {
    return tiles.map((tile) => ({
      tile,
      key: `${tile.q}_${tile.r}`,
      ...axialToPixel({ q: tile.q, r: tile.r }, BASE_HEX_SIZE),
    }));
  }, [tiles]);

  const regionLabel = useMemo(
    () => regions[region.regionId]?.name ?? region.regionId,
    [region.regionId, regions],
  );

  const derivedGeometry = useMemo(() => {
    if (region.hull && region.centroid) {
      return { hull: region.hull, centroid: region.centroid };
    }
    const result = buildRegionHull(region, BASE_HEX_SIZE);
    return { hull: result.hull, centroid: result.centroid };
  }, [region]);

  const selectedTile = useMemo(() => (selectedTileId ? tileLookup.get(selectedTileId) ?? null : null), [selectedTileId, tileLookup]);

  useEffect(() => {
    setSelectedTileId(null);
  }, [region.regionId]);

  const lanesForRegion = useMemo(() => {
    if (!region.gates?.length) {
      return [] as LaneGateDescriptor[];
    }

    return region.gates.map((gate, index) => {
      const target = regions[gate.toRegionId];
      return {
        id: `${region.regionId}->${gate.toRegionId}-${index}`,
        x: gate.at.x,
        y: gate.at.y,
        label: target ? target.name : gate.toRegionId,
        edgeDir: gate.edgeDir,
      } satisfies LaneGateDescriptor;
    });
  }, [region.gates, region.regionId, regions]);

  const drawScene = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0b1220';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const vignette = ctx.createRadialGradient(
      canvas.width * 0.5,
      canvas.height * 0.45,
      0,
      canvas.width * 0.5,
      canvas.height * 0.45,
      Math.max(canvas.width, canvas.height) * 0.65,
    );
    vignette.addColorStop(0, 'rgba(125,211,252,0.08)');
    vignette.addColorStop(1, 'rgba(15,23,42,0)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.translate(camera.tx * dpr, camera.ty * dpr);
    ctx.scale(camera.scale * dpr, camera.scale * dpr);

    const patternCache = new Map<string, CanvasPattern>();
    const highlightKey = selectedTile ? `${selectedTile.q}_${selectedTile.r}` : null;
    const basePatternAlpha = rawMode ? PATTERN_ALPHA_RAW : PATTERN_ALPHA_STYLED;

    tileCenters.forEach(({ tile, key, x, y }) => {
      const biomeKey = (tile.biome as Biome) in BIOME_STYLE ? (tile.biome as Biome) : fallbackBiome;
      const style = BIOME_STYLE[biomeKey];
      ctx.save();
      ctx.translate(x, y);

      buildHexPath(ctx, 0, 0, BASE_HEX_SIZE - 1);
      ctx.fillStyle = style.fill;
      ctx.globalAlpha = rawMode ? 0.92 : 0.78;
      ctx.fill();

      const patternKey = `${biomeKey}-${rawMode ? 'raw' : 'styled'}`;
      if (!patternCache.has(patternKey)) {
        patternCache.set(
          patternKey,
          createBiomePattern(ctx, style.pattern, style.edge, style.fill, dpr, basePatternAlpha),
        );
      }
      const pattern = patternCache.get(patternKey);
      if (pattern) {
        const zoomMod = Math.min(1, Math.max(0.75, camera.scale));
        ctx.globalAlpha = basePatternAlpha * zoomMod;
        ctx.fillStyle = pattern;
        buildHexPath(ctx, 0, 0, BASE_HEX_SIZE - 1.5);
        ctx.fill();
      }

      if (showGrid) {
        ctx.save();
        ctx.globalAlpha = rawMode ? 0.22 : 0.14;
        ctx.lineWidth = 0.75 / (camera.scale * dpr);
        ctx.strokeStyle = rawMode ? 'rgba(226,232,240,0.6)' : 'rgba(148,163,184,0.6)';
        buildHexPath(ctx, 0, 0, BASE_HEX_SIZE - 2.5);
        ctx.stroke();
        ctx.restore();
      }

      ctx.globalAlpha = rawMode ? EDGE_ALPHA_RAW : EDGE_ALPHA_STYLED;
      ctx.lineWidth = 1 / (camera.scale * dpr);
      ctx.strokeStyle = style.edge;
      buildHexPath(ctx, 0, 0, BASE_HEX_SIZE - 1.25);
      ctx.stroke();
      ctx.globalAlpha = 1;

      const label = tile.poi?.[0];
      if (!rawMode && label && camera.scale >= SHOW_LABEL_ZOOM) {
        const fontSize = 12 / dpr;
        ctx.font = `${fontSize}px 'Inter', system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 3 / (camera.scale * dpr);
        ctx.strokeStyle = 'rgba(15,23,42,0.65)';
        ctx.fillStyle = '#f8fafc';
        ctx.strokeText(label, 0, 0);
        ctx.fillText(label, 0, 0);
      }

      if (key === highlightKey) {
        ctx.save();
        buildHexPath(ctx, 0, 0, BASE_HEX_SIZE - 1);
        ctx.shadowColor = 'rgba(34,211,238,0.85)';
        ctx.shadowBlur = 22;
        ctx.lineWidth = 2 / (camera.scale * dpr);
        ctx.strokeStyle = 'rgba(165,243,252,0.95)';
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.lineWidth = 1 / (camera.scale * dpr);
        ctx.strokeStyle = 'rgba(224,242,254,0.8)';
        buildHexPath(ctx, 0, 0, BASE_HEX_SIZE - 4.5);
        ctx.stroke();
        ctx.restore();
      }

      ctx.restore();
    });

    if (derivedGeometry.hull) {
      ctx.save();
      ctx.globalAlpha = 0.06;
      ctx.fillStyle = '#ffffff';
      ctx.fill(derivedGeometry.hull);
      ctx.restore();

      ctx.save();
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.shadowColor = 'rgba(30,41,59,0.45)';
      ctx.shadowBlur = 8 / (camera.scale * dpr);
      ctx.strokeStyle = 'rgba(191,219,254,0.85)';
      ctx.lineWidth = 6 / (camera.scale * dpr);
      ctx.stroke(derivedGeometry.hull);
      ctx.restore();

      ctx.save();
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(30,41,59,0.82)';
      ctx.lineWidth = 2 / (camera.scale * dpr);
      ctx.stroke(derivedGeometry.hull);
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = 0.1;
      ctx.shadowColor = 'rgba(15,23,42,0.45)';
      ctx.shadowBlur = 14 / (camera.scale * dpr);
      ctx.strokeStyle = 'rgba(15,23,42,0.2)';
      ctx.lineWidth = 3 / (camera.scale * dpr);
      ctx.stroke(derivedGeometry.hull);
      ctx.restore();
    }

    if (!rawMode && derivedGeometry.centroid && regionLabel) {
      ctx.save();
      const fontSize = 18 / dpr;
      ctx.font = `${fontSize}px 'Cinzel', serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 6 / (camera.scale * dpr);
      ctx.strokeStyle = 'rgba(15,23,42,0.75)';
      ctx.fillStyle = '#f8fafc';
      ctx.shadowColor = 'rgba(15,23,42,0.35)';
      ctx.shadowBlur = 12 / (camera.scale * dpr);
      ctx.strokeText(regionLabel, derivedGeometry.centroid.x, derivedGeometry.centroid.y);
      ctx.fillText(regionLabel, derivedGeometry.centroid.x, derivedGeometry.centroid.y);
      ctx.restore();
    }

    ctx.restore();
  }, [camera.scale, camera.tx, camera.ty, derivedGeometry.centroid, derivedGeometry.hull, rawMode, regionLabel, selectedTile, showGrid, tileCenters]);

  useEffect(() => {
    drawScene();
  }, [drawScene]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) {
      return;
    }

    const handleResize = () => {
      const { width, height } = resizeCanvas(canvas, container);
      setViewport({ width, height });
      fitRegionToViewport(width, height, region.radius);
    };

    handleResize();
    const observer = new ResizeObserver(handleResize);
    observer.observe(container);
    const viewportApi = window.visualViewport;
    viewportApi?.addEventListener('resize', handleResize);
    viewportApi?.addEventListener('scroll', handleResize);

    return () => {
      observer.disconnect();
      viewportApi?.removeEventListener('resize', handleResize);
      viewportApi?.removeEventListener('scroll', handleResize);
    };
  }, [fitRegionToViewport, region.radius]);

  const handleWheel: React.WheelEventHandler<HTMLCanvasElement> = (event) => {
    event.preventDefault();
    const direction = event.deltaY < 0 ? 1.1 : 0.9;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    zoomAt({ x, y }, camera.scale * direction);
  };

  const animateZoom = useCallback(
    (focus: { x: number; y: number }, targetScale: number) => {
      const start = performance.now();
      const initial = camera.scale;
      const clampedTarget = clamp(targetScale, camera.minScale, camera.maxScale);
      const duration = 200;
      const ease = (t: number) => 1 - (1 - t) ** 3;

      const step = (timestamp: number) => {
        const progress = Math.min(1, (timestamp - start) / duration);
        const eased = ease(progress);
        const nextScale = initial + (clampedTarget - initial) * eased;
        zoomAt(focus, nextScale);
        if (progress < 1) {
          requestAnimationFrame(step);
        }
      };

      requestAnimationFrame(step);
    },
    [camera.maxScale, camera.minScale, camera.scale, zoomAt],
  );

  const handleDoubleClick: React.MouseEventHandler<HTMLCanvasElement> = (event) => {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    animateZoom({ x, y }, camera.scale * 1.2);
  };

  const handlePointerDown: React.PointerEventHandler<HTMLCanvasElement> = (event) => {
    pointerRef.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove: React.PointerEventHandler<HTMLCanvasElement> = (event) => {
    const state = pointerRef.current;
    if (!state) {
      return;
    }

    const dx = event.clientX - state.x;
    const dy = event.clientY - state.y;
    if (!state.moved && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) {
      state.moved = true;
    }
    state.x = event.clientX;
    state.y = event.clientY;
    panBy(dx, dy);
  };

  const handlePointerUp: React.PointerEventHandler<HTMLCanvasElement> = (event) => {
    const state = pointerRef.current;
    pointerRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
    if (!state) {
      return;
    }

    if (state.moved) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const px = event.clientX - rect.left;
    const py = event.clientY - rect.top;
    const worldX = (px - camera.tx) / camera.scale;
    const worldY = (py - camera.ty) / camera.scale;
    const axial = roundAxial(pixelToAxial(worldX, worldY, BASE_HEX_SIZE));
    const key = `${axial.q}_${axial.r}`;
    if (tileLookup.has(key)) {
      setSelectedTileId((prev) => (prev === key ? null : key));
    }
  };

  return (
    <div ref={containerRef} className="relative h-full w-full">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        style={{ touchAction: 'pan-x pan-y pinch-zoom' }}
      />
      <div className="pointer-events-auto absolute left-4 top-4 z-30 flex flex-wrap items-center gap-2">
        <div className="pointer-events-auto rounded-full border border-cyan-400/40 bg-slate-900/80 px-4 py-2 text-xs uppercase tracking-[0.2em] text-cyan-200">
          {regionLabel}
        </div>
        <button
          type="button"
          onClick={backToMacro}
          className="pointer-events-auto rounded-full border border-slate-600/60 bg-black/60 px-3 py-1 text-[0.7rem] uppercase tracking-[0.3em] text-slate-100 transition hover:border-cyan-400/70 hover:bg-cyan-500/20"
        >
          Zur Makrokarte
        </button>
        <button
          type="button"
          onClick={() => setRawMode(!rawMode)}
          className="pointer-events-auto rounded-full border border-slate-700/60 bg-black/50 px-3 py-1 text-[0.65rem] uppercase tracking-[0.3em] text-slate-200 transition hover:border-amber-400/70 hover:bg-amber-500/10"
        >
          RAW: {rawMode ? 'AN' : 'AUS'}
        </button>
      </div>
      {lanesForRegion.map((gate) => {
        const screenX = camera.tx + gate.x * camera.scale;
        const screenY = camera.ty + gate.y * camera.scale;
        const arrow = GATE_ARROWS[gate.edgeDir] ?? '↠';
        return (
          <div
            key={gate.id}
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2"
            style={{ transform: `translate(${screenX}px, ${screenY}px)` }}
          >
            <div className="pointer-events-auto rounded-full border border-cyan-300/60 bg-cyan-900/80 px-3 py-1 text-[0.65rem] uppercase tracking-wide text-cyan-100 shadow-lg">
              Gate {arrow} {gate.label}
            </div>
          </div>
        );
      })}
      <aside
        className={`pointer-events-none absolute inset-y-4 right-4 z-30 w-72 max-w-full transition-all duration-300 ${
          selectedTile ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
        }`}
      >
        <div className="pointer-events-auto h-full rounded-3xl border border-slate-700/70 bg-slate-950/85 p-4 shadow-2xl">
          <header className="flex items-center justify-between">
            <div>
              <p className="text-[0.6rem] uppercase tracking-[0.3em] text-slate-400">Hex</p>
              <h2 className="font-cinzel text-lg text-cyan-200">
                {selectedTile ? `${selectedTile.q}, ${selectedTile.r}` : ''}
              </h2>
            </div>
            <button
              type="button"
              className="rounded-full border border-slate-600/60 px-2 py-1 text-xs uppercase tracking-[0.3em] text-slate-200 transition hover:border-rose-400/60 hover:bg-rose-500/10"
              onClick={() => setSelectedTileId(null)}
            >
              Schließen
            </button>
          </header>
          {selectedTile ? (
            <dl className="mt-4 space-y-3 text-sm text-slate-200">
              <div>
                <dt className="text-[0.65rem] uppercase tracking-[0.3em] text-slate-400">Biome</dt>
                <dd className="font-mono text-cyan-100">{selectedTile.biome}</dd>
              </div>
              <div>
                <dt className="text-[0.65rem] uppercase tracking-[0.3em] text-slate-400">Siedelbar</dt>
                <dd>{selectedTile.settleable ? 'Ja' : 'Nein'}</dd>
              </div>
              {selectedTile.poi?.length ? (
                <div>
                  <dt className="text-[0.65rem] uppercase tracking-[0.3em] text-slate-400">POI</dt>
                  <dd>{selectedTile.poi.join(', ')}</dd>
                </div>
              ) : null}
              {selectedTile.units?.length ? (
                <div>
                  <dt className="text-[0.65rem] uppercase tracking-[0.3em] text-slate-400">Einheiten</dt>
                  <dd>{selectedTile.units.join(', ')}</dd>
                </div>
              ) : null}
            </dl>
          ) : (
            <p className="mt-8 text-sm text-slate-400">
              Wähle ein Hex aus, um Details einzublenden.
            </p>
          )}
        </div>
      </aside>
      <LegendOverlay />
      <DebugFab mode="micro" />
      <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center pb-[env(safe-area-inset-bottom,0px)]">
        <div className="rounded-full border border-slate-700/50 bg-slate-900/70 px-4 py-2 text-[0.65rem] uppercase tracking-[0.3em] text-slate-200">
          Viewport {Math.round(viewport.width)} × {Math.round(viewport.height)} • Zoom {camera.scale.toFixed(2)}x
        </div>
      </div>
    </div>
  );
};

/** Memoized region view to avoid unnecessary re-renders on unrelated state changes. */
export const RegionView = React.memo(RegionViewComponent);
RegionView.displayName = 'RegionView';
