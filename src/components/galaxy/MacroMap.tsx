import React, { useMemo } from 'react';
import { MACRO_HEX_SIZE } from '@/constants/map';
import { axialDisk, axialToPixel } from '@/lib/hex';
import { useMapStore } from '@/store/mapStore';
import type { RegionMeta } from '@/types/map';

interface MacroMapProps {
  regions: RegionMeta[];
}

interface RegionLayout {
  id: string;
  name: string | null;
  x: number;
  y: number;
  color: string;
  stroke: string;
  region: RegionMeta;
}

interface BackgroundHex {
  x: number;
  y: number;
  parity: number;
}

interface HexPolygonProps {
  cx: number;
  cy: number;
  size: number;
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
}

/**
 * Renders the macro-level world map with one clickable hex per region.
 */
const MacroMapComponent: React.FC<MacroMapProps> = ({ regions }) => {
  const openRegion = useMapStore((state) => state.openRegion);

  const layout = useMemo(() => {
    if (regions.length === 0) {
      return {
        viewBox: '-320 -320 640 640',
        tiles: [] as RegionLayout[],
        background: [] as BackgroundHex[],
      };
    }

    const placements: RegionLayout[] = [];
    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    let minQ = Number.POSITIVE_INFINITY;
    let maxQ = Number.NEGATIVE_INFINITY;
    let minR = Number.POSITIVE_INFINITY;
    let maxR = Number.NEGATIVE_INFINITY;

    regions.forEach((region, index) => {
      const { x, y } = axialToPixel({ q: region.RQ, r: region.RR }, MACRO_HEX_SIZE);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      minQ = Math.min(minQ, region.RQ);
      maxQ = Math.max(maxQ, region.RQ);
      minR = Math.min(minR, region.RR);
      maxR = Math.max(maxR, region.RR);
      placements.push({
        id: region.id,
        name: region.name ?? null,
        x,
        y,
        color: pickRegionColor(index),
        stroke: pickRegionStroke(index),
        region,
      });
    });

    const padding = MACRO_HEX_SIZE * 2.75;
    const width = maxX - minX + padding * 2;
    const height = maxY - minY + padding * 2;
    const viewBox = `${minX - padding} ${minY - padding} ${width || 640} ${height || 640}`;

    const axialRadius = Math.max(
      3,
      Math.max(Math.abs(minQ), Math.abs(maxQ), Math.abs(minR), Math.abs(maxR)) + 3,
    );
    const background: BackgroundHex[] = axialDisk(axialRadius).map((coord) => {
      const { x, y } = axialToPixel(coord, MACRO_HEX_SIZE);
      return {
        x,
        y,
        parity: (coord.q + coord.r) & 1,
      };
    });

    return {
      viewBox,
      tiles: placements,
      background,
    };
  }, [regions]);

  return (
    <svg role="presentation" className="h-full w-full" viewBox={layout.viewBox} preserveAspectRatio="xMidYMid meet">
      <defs>
        <radialGradient id="macro-map-glow" cx="50%" cy="45%" r="65%">
          <stop offset="0%" stopColor="rgba(190,242,100,0.25)" />
          <stop offset="100%" stopColor="rgba(15,23,42,0)" />
        </radialGradient>
        <filter id="macro-hex-shadow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="rgba(15,23,42,0.75)" floodOpacity="0.65" />
        </filter>
      </defs>
      <rect x="-4000" y="-4000" width="8000" height="8000" fill="#0f172a" />
      <circle cx={0} cy={0} r={MACRO_HEX_SIZE * 14} fill="url(#macro-map-glow)" />
      {layout.background.map((tile) => (
        <HexPolygon
          key={`bg-${tile.x}-${tile.y}`}
          cx={tile.x}
          cy={tile.y}
          size={MACRO_HEX_SIZE}
          fill={tile.parity === 0 ? 'rgba(30,41,59,0.45)' : 'rgba(15,23,42,0.35)'}
          stroke="rgba(148,163,184,0.12)"
          strokeWidth={1}
        />
      ))}
      {layout.tiles.map((tile) => (
        <g
          key={tile.id}
          onClick={() => openRegion(tile.region.RQ, tile.region.RR, tile.region.seed)}
          filter="url(#macro-hex-shadow)"
          className="transition-colors hover:[&>polygon]:fill-yellow-500/20"
          style={{ cursor: 'pointer' }}
        >
          <HexPolygon cx={tile.x} cy={tile.y} size={MACRO_HEX_SIZE} stroke={tile.stroke} fill={tile.color} strokeWidth={2.5} />
          {tile.name ? (
            <text
              x={tile.x}
              y={tile.y + 6}
              textAnchor="middle"
              fill="#f8fafc"
              fontSize={13}
              fontFamily="Cinzel"
              style={{ textShadow: '0 2px 6px rgba(15,23,42,0.85)' }}
            >
              {tile.name}
            </text>
          ) : null}
        </g>
      ))}
    </svg>
  );
};

const HexPolygon: React.FC<HexPolygonProps> = React.memo(
  ({ cx, cy, size, stroke = '#64748b', strokeWidth = 2, fill = 'transparent' }) => {
    const points = useMemo(() => {
      const vertices: string[] = [];
      for (let index = 0; index < 6; index += 1) {
        const angle = ((60 * index - 30) * Math.PI) / 180;
        const px = cx + size * Math.cos(angle);
        const py = cy + size * Math.sin(angle);
        vertices.push(`${px},${py}`);
      }
      return vertices.join(' ');
    }, [cx, cy, size]);

    return <polygon points={points} stroke={stroke} fill={fill} strokeWidth={strokeWidth} />;
  },
);
HexPolygon.displayName = 'HexPolygon';

const PALETTE = ['#1d4ed8', '#f97316', '#a855f7', '#10b981', '#facc15', '#22d3ee', '#ef4444'];

const pickRegionColor = (index: number) => {
  const base = PALETTE[index % PALETTE.length];
  return `${base}AA`;
};

const pickRegionStroke = (index: number) => {
  const base = PALETTE[index % PALETTE.length];
  return base;
};

/** Memoized wrapper for the macro map component. */
export const MacroMap = React.memo(MacroMapComponent);
MacroMap.displayName = 'MacroMap';
