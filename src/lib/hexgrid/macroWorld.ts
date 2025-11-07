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
  const outer = strokePx(6, cam, dpr);
  const inner = strokePx(2, cam, dpr);

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
    const baseStroke = world.allianceFilterOn && alliance ? alliance.color : 'rgba(200,210,220,.85)';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = baseStroke;
    ctx.lineWidth = outer;
    ctx.stroke(hexPath(CONFIG.macroHexRadiusPx));

    ctx.strokeStyle = 'rgba(255,255,255,.78)';
    ctx.lineWidth = inner;
    ctx.stroke(hexPath(CONFIG.macroHexRadiusPx));

    const isSelected = world.selectedRegionId === region.id;
    const isHome = world.home?.regionId === region.id;

    if (isSelected) {
      ctx.strokeStyle = 'rgba(34,211,238,0.9)';
      ctx.lineWidth = strokePx(8, cam, dpr);
      ctx.globalAlpha = 0.8;
      ctx.stroke(hexPath(CONFIG.macroHexRadiusPx + 2));
      ctx.globalAlpha = 1;
    }

    if (isHome) {
      ctx.lineWidth = strokePx(4, cam, dpr);
      ctx.strokeStyle = 'rgba(251,191,36,0.95)';
      ctx.globalAlpha = 0.9;
      ctx.stroke(hexPath(CONFIG.macroHexRadiusPx - 6));
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = 'rgba(253,224,71,0.25)';
      ctx.fill(hexPath(CONFIG.macroHexRadiusPx - 10));
      ctx.globalAlpha = 1;

      ctx.font = `${16 / dpr}px 'Cinzel', serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fde68a';
      ctx.fillText('★', 0, -CONFIG.macroHexRadiusPx * 0.45);
    }

    ctx.font = `${14 / dpr}px 'Cinzel', serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = strokePx(3, cam, dpr);
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.fillStyle = '#f8fafc';
    ctx.strokeText(region.name, 0, 0);
    ctx.fillText(region.name, 0, 0);

    if (world.allianceFilterOn && alliance) {
      ctx.font = `${11 / dpr}px 'Inter', sans-serif`;
      ctx.textBaseline = 'top';
      ctx.fillStyle = alliance.color;
      ctx.fillText(alliance.tag, 0, CONFIG.macroHexRadiusPx * 0.3);
    }

    ctx.restore();
  });

  ctx.restore();
};
