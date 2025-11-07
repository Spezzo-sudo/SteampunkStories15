import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { axialToPixel, pixelToAxial } from '@/lib/hex';
import { BIOME_STYLE, createBiomePattern } from '@/lib/biomeStyle';
import { useMapStore, type Biome } from '@/store/mapStore';
import type { RegionData, TileData } from '@/types/map';

const BASE_HEX_SIZE = 28;
const AXIAL_DIRECTIONS = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

interface RegionViewProps {
  region: RegionData;
}

interface LaneGateDescriptor {
  id: string;
  tile: TileData;
  x: number;
  y: number;
  label: string;
}

const fallbackBiome: Biome = 'NE';

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

const distance = (a: { q: number; r: number }, b: { q: number; r: number }) => {
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  const ds = -a.q - a.r - (-b.q - b.r);
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(ds)) / 2;
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
  const lanes = useMapStore((state) => state.lanes);
  const regions = useMapStore((state) => state.regions);
  const backToMacro = useMapStore((state) => state.backToMacro);

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

  const selectedTile = useMemo(() => (selectedTileId ? tileLookup.get(selectedTileId) ?? null : null), [selectedTileId, tileLookup]);

  useEffect(() => {
    setSelectedTileId(null);
  }, [region.regionId]);

  const lanesForRegion = useMemo(() => {
    const node = regions[region.regionId];
    if (!node) {
      return [] as LaneGateDescriptor[];
    }

    return lanes
      .map((lane) => {
        const isSource = lane.from === node.id || lane.to === node.id;
        if (!isSource) {
          return null;
        }

        const targetId = lane.from === node.id ? lane.to : lane.from;
        const target = regions[targetId];
        if (!target) {
          return null;
        }

        const directionVector = { q: target.RQ - node.RQ, r: target.RR - node.RR };
        const targetPixel = axialToPixel(directionVector, 1);
        let bestDirection = AXIAL_DIRECTIONS[0];
        let bestScore = Number.NEGATIVE_INFINITY;
        AXIAL_DIRECTIONS.forEach((direction) => {
          const pixel = axialToPixel(direction, 1);
          const dot = pixel.x * targetPixel.x + pixel.y * targetPixel.y;
          const magnitude = Math.hypot(pixel.x, pixel.y) * Math.hypot(targetPixel.x, targetPixel.y);
          const score = magnitude === 0 ? dot : dot / magnitude;
          if (score > bestScore) {
            bestScore = score;
            bestDirection = direction;
          }
        });

        const desired = { q: bestDirection.q * region.radius, r: bestDirection.r * region.radius };
        let gateTile = tileLookup.get(`${desired.q}_${desired.r}`);
        if (!gateTile) {
          let closest: TileData | null = null;
          let closestDist = Number.POSITIVE_INFINITY;
          tiles.forEach((tile) => {
            const d = distance(tile, desired);
            if (d < closestDist) {
              closest = tile;
              closestDist = d;
            }
          });
          gateTile = closest ?? null;
        }

        if (!gateTile) {
          return null;
        }

        const { x, y } = axialToPixel({ q: gateTile.q, r: gateTile.r }, BASE_HEX_SIZE);
        return {
          id: `${node.id}->${target.id}`,
          tile: gateTile,
          x,
          y,
          label: target.name,
        } satisfies LaneGateDescriptor;
      })
      .filter((value): value is LaneGateDescriptor => Boolean(value));
  }, [lanes, region.radius, region.regionId, regions, tileLookup, tiles]);

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
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.translate(camera.tx * dpr, camera.ty * dpr);
    ctx.scale(camera.scale * dpr, camera.scale * dpr);

    const patternCache = new Map<Biome, CanvasPattern>();
    const highlightKey = selectedTile ? `${selectedTile.q}_${selectedTile.r}` : null;

    tileCenters.forEach(({ tile, key, x, y }) => {
      const biomeKey = (tile.biome as Biome) in BIOME_STYLE ? (tile.biome as Biome) : fallbackBiome;
      const style = BIOME_STYLE[biomeKey];
      ctx.save();
      ctx.translate(x, y);

      buildHexPath(ctx, 0, 0, BASE_HEX_SIZE - 1);
      ctx.fillStyle = style.fill;
      ctx.globalAlpha = rawMode ? 0.94 : 0.78;
      ctx.fill();

      if (!patternCache.has(biomeKey)) {
        patternCache.set(biomeKey, createBiomePattern(ctx, style.pattern, style.edge, style.fill, dpr));
      }
      const pattern = patternCache.get(biomeKey);
      if (pattern) {
        ctx.globalAlpha = 0.38;
        ctx.fillStyle = pattern;
        buildHexPath(ctx, 0, 0, BASE_HEX_SIZE - 1.5);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      ctx.lineWidth = 1 / (camera.scale * dpr);
      ctx.strokeStyle = style.edge;
      buildHexPath(ctx, 0, 0, BASE_HEX_SIZE - 1.25);
      ctx.stroke();

      const label = tile.poi?.[0];
      if (label) {
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
        ctx.shadowColor = 'rgba(34,211,238,.85)';
        ctx.shadowBlur = 18;
        ctx.lineWidth = 2 / (camera.scale * dpr);
        ctx.strokeStyle = 'rgba(34,211,238,.9)';
        ctx.stroke();
        ctx.restore();

        ctx.save();
        buildHexPath(ctx, 0, 0, BASE_HEX_SIZE - 5);
        ctx.setLineDash([3 / (camera.scale * dpr), 2 / (camera.scale * dpr)]);
        ctx.lineWidth = 1.25 / (camera.scale * dpr);
        ctx.strokeStyle = 'rgba(255,255,255,.85)';
        ctx.stroke();
        ctx.restore();
      }

      ctx.restore();
    });

    ctx.restore();
  }, [camera.scale, camera.tx, camera.ty, rawMode, selectedTile, tileCenters]);

  useEffect(() => {
    drawScene();
  }, [drawScene]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) {
      return;
    }

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      setViewport({ width: rect.width, height: rect.height });
      fitRegionToViewport(rect.width, rect.height, region.radius);
      drawScene();
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    return () => observer.disconnect();
  }, [drawScene, fitRegionToViewport, region.radius]);

  const handleWheel: React.WheelEventHandler<HTMLCanvasElement> = (event) => {
    event.preventDefault();
    const direction = event.deltaY < 0 ? 1.1 : 0.9;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    zoomAt({ x, y }, camera.scale * direction);
  };

  const handleDoubleClick: React.MouseEventHandler<HTMLCanvasElement> = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    zoomAt({ x, y }, camera.scale * 1.6);
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

  const activeNode = regions[region.regionId];

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
      <div className="pointer-events-none absolute left-4 top-4 z-20 flex flex-wrap items-center gap-2">
        <div className="pointer-events-auto rounded-full border border-cyan-400/40 bg-slate-900/80 px-4 py-2 text-xs uppercase tracking-[0.2em] text-cyan-200">
          {activeNode ? activeNode.name : region.regionId}
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
          RAW: {rawMode ? 'An' : 'Aus'}
        </button>
      </div>
      {lanesForRegion.map((gate) => {
        const screenX = camera.tx + gate.x * camera.scale;
        const screenY = camera.ty + gate.y * camera.scale;
        return (
          <div
            key={gate.id}
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2"
            style={{ transform: `translate(${screenX}px, ${screenY}px)` }}
          >
            <div className="pointer-events-auto rounded-full border border-cyan-300/60 bg-cyan-900/80 px-3 py-1 text-[0.65rem] uppercase tracking-wide text-cyan-100 shadow-lg">
              Gate ▸ {gate.label}
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
      <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
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
