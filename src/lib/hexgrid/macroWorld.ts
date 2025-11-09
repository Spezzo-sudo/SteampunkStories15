import { CONFIG } from '@/config/mapConfig';
import type { Region, World } from '@/data/types';
import { ALLIANCES, buildAllianceMap } from '@/data/factions';
import { axialToPx, disk, hexPath } from './hex';
import type { Camera } from './viewport';
import { boundsOf, fitToBounds, strokePx } from './viewport';
import { generateRegionTiles, ensureRegionCentroid } from './microRegion';

const REGION_NAMES = [
  'Russklippen',
  'Kupferdamm',
  'Dampfwiesen',
  'Nordgrat',
  'Scherbenfeld',
  'Bernquell',
  'Falkennebel',
  'Seidensteppe',
  'Glasstrom',
  'Vulkanruh',
  'Tauglanz',
  'Rauchforst',
  'Ätherkamm',
  'Windtrutz',
  'Goldhafen',
  'Eisernacht',
  'Morgenwall',
  'Schieferlicht',
  'Nebelruh',
];

/** Converts macro axial coordinates into pixel space. */
export const regionAxToPx = (RQ: number, RR: number, radius: number) => axialToPx(RQ, RR, radius);

/** Generates the default world layout with 19 regions arranged in a radius-2 disk. */
export const makeWorld = () => {
  const centers = disk({ q: 0, r: 0 }, CONFIG.macroRegionRadius);
  const allianceCount = ALLIANCES.length;
  const regions: Region[] = centers.map((ax, index) => {
    const alliance = ALLIANCES[index % allianceCount];
    const id = `R${index + 1}`;
    const region: Region = {
      id,
      name: REGION_NAMES[index] ?? `Region ${index + 1}`,
      RQ: ax.q,
      RR: ax.r,
      allianceId: alliance.id,
      tiles: generateRegionTiles(id, alliance.id),
    };
    ensureRegionCentroid(region, CONFIG.microHexSizePx);
    return region;
  });
  return { regions, allianceFilterOn: false } satisfies World;
};

/** Fits the camera to encompass all macro regions with padding. */
export const fitMacroView = (cam: Camera, world: World, width: number, height: number) => {
  const centers = world.regions.map((region) => regionAxToPx(region.RQ, region.RR, CONFIG.macroHexRadiusPx));
  const bounds = boundsOf(centers);
  fitToBounds(cam, bounds, width, height, CONFIG.paddingPx);
};

/** Draws the macro world map including alliance-aware borders and labels. */
export const drawMacro = (
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  dpr: number,
  world: World,
  _timeMs: number,
) => {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.fillStyle = '#060b16';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  ctx.translate(cam.tx, cam.ty);
  ctx.scale(cam.scale, cam.scale);

  const alliances = buildAllianceMap();
  const outer = strokePx(4, cam, dpr);
  const contour = strokePx(2, cam, dpr);

  world.regions.forEach((region) => {
    const center = regionAxToPx(region.RQ, region.RR, CONFIG.macroHexRadiusPx);
    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.shadowColor = 'rgba(0,0,0,.35)';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#1f3d76';
    ctx.globalAlpha = 0.92;
    ctx.fill(hexPath(CONFIG.macroHexRadiusPx - 1));
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    const alliance = region.allianceId ? alliances.get(region.allianceId) : undefined;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(148,163,184,0.6)';
    ctx.lineWidth = outer;
    ctx.stroke(hexPath(CONFIG.macroHexRadiusPx));

    if (world.allianceFilterOn && alliance) {
      ctx.strokeStyle = alliance.color;
      ctx.lineWidth = contour;
      ctx.globalAlpha = 0.95;
      ctx.stroke(hexPath(CONFIG.macroHexRadiusPx - 4));
      ctx.globalAlpha = 1;
    }

    const isSelected = world.selectedRegionId === region.id;
    const isHovered = world.hoveredRegionId === region.id;
    const isHome = world.home?.regionId === region.id;
    
    if (isHovered && !isSelected) {
      ctx.strokeStyle = 'rgba(107, 114, 128, 0.7)';
      ctx.lineWidth = strokePx(6, cam, dpr);
      ctx.stroke(hexPath(CONFIG.macroHexRadiusPx));
    }

    if (isSelected) {
      ctx.strokeStyle = 'rgba(34,211,238,0.9)';
      ctx.lineWidth = strokePx(8, cam, dpr);
      ctx.globalAlpha = 0.8;
      ctx.stroke(hexPath(CONFIG.macroHexRadiusPx + 2));
      ctx.globalAlpha = 1;
    }

    if (isHome) {
      ctx.lineWidth = strokePx(3, cam, dpr);
      ctx.strokeStyle = 'rgba(253,224,71,0.85)';
      ctx.globalAlpha = 0.85;
      ctx.stroke(hexPath(CONFIG.macroHexRadiusPx - 6));
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = 'rgba(253,224,71,0.18)';
      ctx.fill(hexPath(CONFIG.macroHexRadiusPx - 10));
      ctx.globalAlpha = 1;
    }
    
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'black';
    ctx.shadowBlur = 4;
    ctx.font = `bold ${CONFIG.macroHexRadiusPx / 4.5}px "Cinzel"`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText(region.name, 0, 2);

    ctx.restore();
  });

  ctx.restore();
};
