import React, { useMemo } from 'react';
import { MICRO_HEX_SIZE, REGION_RADIUS } from '@/constants/map';
import { axialDisk, axialToPixel } from '@/lib/hex';
import type { RegionData } from '@/types/map';

interface RegionViewProps {
  region: RegionData;
}

/**
 * Visualises the micro-level region layout with exactly 19 tiles.
 */
const RegionViewComponent: React.FC<RegionViewProps> = ({ region }) => {
  const tiles = useMemo(() => region.tiles.slice().sort((a, b) => a.r - b.r || a.q - b.q), [region.tiles]);
  const backgroundTiles = useMemo(() => axialDisk(REGION_RADIUS + 2), []);

  return (
    <svg role="presentation" className="h-full w-full" viewBox="-140 -140 280 280" preserveAspectRatio="xMidYMid meet">
      <defs>
        <radialGradient id="region-center" cx="50%" cy="48%" r="60%">
          <stop offset="0%" stopColor="rgba(34,211,238,0.55)" />
          <stop offset="65%" stopColor="rgba(56,189,248,0.15)" />
          <stop offset="100%" stopColor="rgba(15,23,42,0)" />
        </radialGradient>
        <filter id="region-hex-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="rgba(15,23,42,0.8)" floodOpacity="0.5" />
        </filter>
      </defs>
      <rect x="-600" y="-600" width="1200" height="1200" fill="#020617" />
      <circle cx={0} cy={0} r={REGION_RADIUS * MICRO_HEX_SIZE * 2.8} fill="url(#region-center)" />
      {backgroundTiles.map(({ q, r }) => {
        const { x, y } = axialToPixel({ q, r }, MICRO_HEX_SIZE * 1.05);
        return (
          <HexPolygon
            key={`bg-${q}-${r}`}
            cx={x}
            cy={y}
            size={MICRO_HEX_SIZE * 1.05}
            stroke="rgba(148,163,184,0.08)"
            fill={((q + r) & 1) === 0 ? 'rgba(15,23,42,0.25)' : 'rgba(15,23,42,0.18)'}
            strokeWidth={0.75}
          />
        );
      })}
      {tiles.map((tile) => {
        const { x, y } = axialToPixel({ q: tile.q, r: tile.r }, MICRO_HEX_SIZE);
        return (
          <g key={`${tile.q}_${tile.r}`} filter="url(#region-hex-shadow)">
            <HexPolygon cx={x} cy={y} size={MICRO_HEX_SIZE} stroke="#1e293b" fill={biomeFill(tile.biome)} strokeWidth={1.75} />
            {tile.poi?.length ? (
              <text x={x} y={y + 5} textAnchor="middle" fontSize={8} fill="#f1f5f9">
                {tile.poi.join(', ')}
              </text>
            ) : null}
            {!tile.settleable ? (
              <text x={x} y={y - 8} textAnchor="middle" fontSize={7} fill="rgba(248,113,113,0.95)">
                Unbewohnbar
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
};

interface HexPolygonProps {
  cx: number;
  cy: number;
  size: number;
  stroke?: string;
  fill?: string;
}

const HexPolygon: React.FC<HexPolygonProps> = React.memo(({ cx, cy, size, stroke = '#1f2937', fill = '#94a3b8' }) => {
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

  return <polygon points={points} stroke={stroke} fill={fill} strokeWidth={1.5} />;
});
HexPolygon.displayName = 'RegionHex';

const biomeFill = (biome: string) => {
  switch (biome) {
    case 'Steppe':
      return '#9ca948';
    case 'Wald':
      return '#2f7d4d';
    case 'Hochland':
      return '#657d93';
    case 'Moor':
      return '#3b4a34';
    case 'Ödland':
      return '#71553a';
    case 'Dampfwiese':
      return '#5aa0a8';
    case 'Kristallufer':
      return '#75b3d1';
    case 'Rußklippen':
      return '#4b3b32';
    default:
      return '#64748b';
  }
};

export const RegionView = React.memo(RegionViewComponent);
RegionView.displayName = 'RegionView';
