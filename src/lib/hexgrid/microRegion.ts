import type { HomeSelection, Region, Tile } from '@/data/types';
import { buildAllianceMap } from '@/data/factions';
import { CONFIG } from '@/config/mapConfig';
import { traceTextureEvent } from '@/lib/debug/textureTracer';
import { DIRS, axialToPx, disk, hexCorner, hexPath, key } from './hex';
import type { Camera } from './viewport';
import { boundsOf, fitToBounds, strokePx } from './viewport';
import { BIOME_STYLE, makePattern } from './patterns';

const BIOMES = Object.keys(BIOME_STYLE) as Array<keyof typeof BIOME_STYLE>;

const imageCache = new Map<string, HTMLImageElement>();

const loadTexture = (url: string) => {
  let img = imageCache.get(url);
  if (img) {
    if (img.complete) {
      traceTextureEvent(url, 'cached');
    }
    return img;
  }
  img = new Image();
  traceTextureEvent(url, 'requested');
  img.onload = () => {
    traceTextureEvent(url, 'loaded');
  };
  img.onerror = () => {
    console.warn(`[microRegion] Failed to load texture: ${url}`);
    traceTextureEvent(url, 'failed');
  };
  img.src = url;
  imageCache.set(url, img);
  return img;
};

const drawHomeEmblem = (
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  dpr: number,
  size: number,
  glowStrength: number,
) => {
  const ringStroke = strokePx(1.8, cam, dpr);
  const glowAlpha = 0.35 + glowStrength * 0.45;
  ctx.save();
  ctx.lineWidth = ringStroke;
  ctx.strokeStyle = `rgba(253,224,71,${0.65 + glowStrength * 0.25})`;
  if (glowStrength > 0) {
    ctx.shadowColor = `rgba(253,224,71,${glowAlpha})`;
    ctx.shadowBlur = 24 * glowStrength;
  }
  ctx.stroke(hexPath(size - 2.4));
  ctx.shadowBlur = 0;
  const crestHeight = size * 0.55;
  const crestWidth = crestHeight * 0.65;
  ctx.translate(0, -size * 0.05);
  ctx.beginPath();
  ctx.moveTo(0, -crestHeight * 0.55);
  ctx.lineTo(crestWidth * 0.55, -crestHeight * 0.12);
  ctx.lineTo(crestWidth * 0.35, crestHeight * 0.55);
  ctx.lineTo(-crestWidth * 0.35, crestHeight * 0.55);
  ctx.lineTo(-crestWidth * 0.55, -crestHeight * 0.12);
  ctx.closePath();
  const fill = ctx.createLinearGradient(0, -crestHeight * 0.55, 0, crestHeight * 0.55);
  fill.addColorStop(0, `rgba(254,249,195,${0.92})`);
  fill.addColorStop(1, `rgba(202,138,4,${0.85})`);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = strokePx(1.2, cam, dpr);
  ctx.strokeStyle = 'rgba(120,53,15,0.9)';
  ctx.stroke();
  ctx.restore();
};

export const generateRegionTiles = (regionId: string, allianceId?: string) => {
  const coords = disk({ q: 0, r: 0 }, CONFIG.microRegionRadius);
  const baseHash = regionId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return coords.map((ax) => {
    const seed = Math.abs(baseHash + ax.q * 31 + ax.r * 17);
    const biome = BIOMES[seed % BIOMES.length];
    const settlement = seed % 7 === 0 ? { playerId: `player-${regionId}-${seed}`, icon: seed % 2 === 0 ? 'TOWN' : 'OUTPOST' } : undefined;
    const tileAlliance = allianceId && seed % 5 !== 1 ? allianceId : undefined;
    return {
      q: ax.q,
      r: ax.r,
      biome,
      regionId,
      allianceId: tileAlliance,
      hasSettlement: settlement,
    } satisfies Tile;
  });
};

export const regionHull = (region: Region, size: number) => {
  type Edge = { a: { x: number; y: number }; b: { x: number; y: number } };
  const edges: Edge[] = [];
  region.tiles.forEach((tile) => {
    const center = axialToPx(tile.q, tile.r, size);
    for (let i = 0; i < 6; i += 1) {
      const neighbor = key(tile.q + DIRS[i].q, tile.r + DIRS[i].r);
      if (region.tiles.find((t) => key(t.q, t.r) === neighbor)) {
        continue;
      }
      const a = hexCorner(center.x, center.y, size, i);
      const b = hexCorner(center.x, center.y, size, (i + 1) % 6);
      edges.push({ a, b });
    }
  });
  const loops: Array<{ pts: Array<{ x: number; y: number }> }> = [];
  const eq = (p: { x: number; y: number }, q: { x: number; y: number }) => Math.abs(p.x - q.x) < 1e-6 && Math.abs(p.y - q.y) < 1e-6;
  const pointKey = (p: { x: number; y: number }) => `${p.x.toFixed(4)},${p.y.toFixed(4)}`;
  const adjacency = new Map<string, Array<{ edge: Edge; to: { x: number; y: number } }>>();
  const register = (from: { x: number; y: number }, to: { x: number; y: number }, edge: Edge) => {
    const keyPoint = pointKey(from);
    const existing = adjacency.get(keyPoint);
    if (existing) {
      existing.push({ edge, to });
      return;
    }
    adjacency.set(keyPoint, [{ edge, to }]);
  };
  edges.forEach((edge) => {
    register(edge.a, edge.b, edge);
    register(edge.b, edge.a, edge);
  });

  const used = new Set<Edge>();
  const nextUnused = () => edges.find((candidate) => !used.has(candidate));
  for (let start = nextUnused(); start; start = nextUnused()) {
    const loop = { pts: [start.a, start.b] };
    used.add(start);
    let tail = start.b;
    const maxSteps = edges.length + 1;
    for (let step = 0; step < maxSteps; step += 1) {
      if (eq(loop.pts[0], tail)) {
        break;
      }
      const tailKey = pointKey(tail);
      const candidates = adjacency.get(tailKey);
      if (!candidates || candidates.length === 0) {
        break;
      }
      const candidate = candidates.find((entry) => !used.has(entry.edge));
      if (!candidate) {
        break;
      }
      used.add(candidate.edge);
      loop.pts.push(candidate.to);
      tail = candidate.to;
    }
    if (!eq(loop.pts[0], loop.pts[loop.pts.length - 1])) {
      loop.pts.push(loop.pts[0]);
    }
    loops.push(loop);
  }
  const path = new Path2D();
  const hullPoints: Array<{ x: number; y: number }> = [];
  loops.forEach((loop) => {
    const first = loop.pts[0];
    path.moveTo(first.x, first.y);
    for (let i = 1; i < loop.pts.length; i += 1) {
      path.lineTo(loop.pts[i].x, loop.pts[i].y);
    }
    path.closePath();
    hullPoints.push(...loop.pts);
  });
  const bounds = boundsOf(hullPoints);
  return { path, bounds };
};

export const fitMicroView = (cam: Camera, region: Region, width: number, height: number) => {
  const { bounds } = regionHull(region, CONFIG.microHexSizePx);
  fitToBounds(cam, bounds, width, height, CONFIG.paddingPx * 2);
};

const drawRegion = (
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  dpr: number,
  region: Region,
  size: number,
  timeMs: number,
  options: { selected?: Tile | null; showAlliances: boolean; homeTileKey?: string | null; homeGlow?: boolean },
) => {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.fillStyle = '#0b1220';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  ctx.translate(cam.tx, cam.ty);
  ctx.scale(cam.scale, cam.scale);

  const gridStroke = strokePx(1, cam, dpr);
  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = '#2b3242';
  ctx.lineWidth = gridStroke;
  region.tiles.forEach((tile) => {
    const p = axialToPx(tile.q, tile.r, size);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.stroke(hexPath(size - 0.5));
    ctx.restore();
  });
  ctx.globalAlpha = 1;

  const innerEdge = strokePx(1, cam, dpr);
  const allianceStroke = strokePx(2, cam, dpr);
  const alliances = buildAllianceMap();
  const glowStrength = options.homeGlow ? (Math.sin(timeMs / 900) + 1) / 2 : 0;

  const byBiome = new Map<string, Tile[]>();
  region.tiles.forEach((tile) => {
    const list = byBiome.get(tile.biome) ?? [];
    list.push(tile);
    byBiome.set(tile.biome, list);
  });

  const patternCache = new Map<string, CanvasPattern | null>();

  byBiome.forEach((tiles, biome) => {
    const style = BIOME_STYLE[biome as keyof typeof BIOME_STYLE];
    let pattern = patternCache.get(biome);
    if (pattern === undefined) {
      pattern = makePattern(ctx, style.pattern, style.edge, style.base, 0.08);
      patternCache.set(biome, pattern);
    }
    tiles.forEach((tile) => {
      const p = axialToPx(tile.q, tile.r, size);
      ctx.save();
      ctx.translate(p.x, p.y);

      ctx.fillStyle = style.base;
      ctx.globalAlpha = 1;
      ctx.fill(hexPath(size - 1.2));

      const textureUrl = style.texture;
      if (textureUrl) {
        const texture = loadTexture(textureUrl);
        if (texture && texture.complete) {
          ctx.globalAlpha = 0.4;
          ctx.drawImage(texture, -size, -size, size * 2, size * 2);
        }
      }

      if (pattern) {
        ctx.globalAlpha = 0.12;
        ctx.fillStyle = pattern;
        ctx.fill(hexPath(size - 1.6));
      }

      const bevel = ctx.createLinearGradient(0, -size, 0, size);
      bevel.addColorStop(0, 'rgba(255,255,255,0.16)');
      bevel.addColorStop(0.55, 'rgba(255,255,255,0)');
      bevel.addColorStop(1, 'rgba(15,23,42,0.32)');
      ctx.globalAlpha = 1;
      ctx.fillStyle = bevel;
      ctx.fill(hexPath(size - 1.4));

      ctx.globalAlpha = 1;
      ctx.strokeStyle = style.edge;
      ctx.lineWidth = innerEdge;
      ctx.stroke(hexPath(size - 1));

      if (options.showAlliances && tile.allianceId) {
        const alliance = alliances.get(tile.allianceId);
        if (alliance) {
          ctx.strokeStyle = alliance.color;
          ctx.globalAlpha = 0.85;
          ctx.lineWidth = allianceStroke;
          ctx.stroke(hexPath(size - 0.2));
          ctx.globalAlpha = 1;
        }
      }

      if (tile.hasSettlement) {
        ctx.save();
        ctx.translate(0, -size * 0.24);
        ctx.shadowColor = 'rgba(15,23,42,0.65)';
        ctx.shadowBlur = 10;
        const badgeRadius = 4.6;
        const badgeGradient = ctx.createRadialGradient(0, 0, badgeRadius * 0.2, 0, 0, badgeRadius);
        badgeGradient.addColorStop(0, 'rgba(255,251,235,0.95)');
        badgeGradient.addColorStop(1, 'rgba(253,224,120,0.85)');
        ctx.fillStyle = badgeGradient;
        ctx.beginPath();
        ctx.arc(0, 0, badgeRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        const alliance = tile.allianceId ? alliances.get(tile.allianceId) : undefined;
        if (alliance) {
          ctx.strokeStyle = alliance.color;
          ctx.lineWidth = strokePx(1.6, cam, dpr);
          ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(15,23,42,0.95)';
        ctx.lineWidth = strokePx(1.2, cam, dpr);
        ctx.stroke();
        ctx.fillStyle = 'rgba(30,41,59,0.95)';
        ctx.font = `${7.5 / dpr}px 'Cinzel', serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(tile.hasSettlement.icon === 'TOWN' ? '⌂' : '△', 0, 0);
        ctx.restore();
      }

      if (options.homeTileKey && `${tile.q},${tile.r}` === options.homeTileKey) {
        drawHomeEmblem(ctx, cam, dpr, size, glowStrength);
      }
      ctx.restore();
    });
  });

  if (options.selected) {
    const p = axialToPx(options.selected.q, options.selected.r, size);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.shadowColor = 'rgba(34,211,238,.75)';
    ctx.shadowBlur = 18;
    ctx.lineWidth = strokePx(3, cam, dpr);
    ctx.strokeStyle = 'rgba(34,211,238,.95)';
    ctx.stroke(hexPath(size - 0.5));
    ctx.shadowBlur = 0;
    ctx.setLineDash([3, 2]);
    ctx.lineWidth = strokePx(1.4, cam, dpr);
    ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.stroke(hexPath(size - 5));
    ctx.setLineDash([]);
    ctx.restore();
  }

  const { path } = regionHull(region, size);
  ctx.globalAlpha = 0.75;
  ctx.lineWidth = strokePx(2.5, cam, dpr);
  ctx.strokeStyle = 'rgba(148,163,184,0.65)';
  ctx.stroke(path);
  ctx.globalAlpha = 1;

  ctx.restore();
};

export const drawMicro = (
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  dpr: number,
  region: Region,
  home: HomeSelection | null,
  hovered: { q: number; r: number } | null,
  timeMs: number,
) => {
  const homeTileKey = home?.regionId === region.id ? home.tileKey : null;
  const selectedTile = hovered ? region.tiles.find((t) => t.q === hovered.q && t.r === hovered.r) : null;

  drawRegion(ctx, cam, dpr, region, CONFIG.microHexSizePx, timeMs, {
    selected: selectedTile,
    showAlliances: true,
    homeTileKey: homeTileKey,
    homeGlow: true,
  });
};

export const pickTileAt = (region: Region, point: { x: number; y: number }, size: number) => {
  let best: { tile: Tile; dist: number } | null = null;
  region.tiles.forEach((tile) => {
    const p = axialToPx(tile.q, tile.r, size);
    const dist = Math.hypot(point.x - p.x, point.y - p.y);
    if (!best || dist < best.dist) {
      best = { tile, dist };
    }
  });
  return best?.tile ?? null;
};

export const ensureRegionCentroid = (region: Region, size: number): Region => {
  if (region.centroid) {
    return region;
  }
  const sum = region.tiles.reduce(
    (acc, tile) => {
      const p = axialToPx(tile.q, tile.r, size);
      acc.x += p.x;
      acc.y += p.y;
      return acc;
    },
    { x: 0, y: 0 },
  );
  const count = region.tiles.length || 1;
  return { ...region, centroid: { x: sum.x / count, y: sum.y / count } };
};
