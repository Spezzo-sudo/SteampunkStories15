import React, { useMemo } from 'react';
import { MICRO_HEX_SIZE, REGION_RADIUS } from '@/constants/map';
import { axialToPixel } from '@/lib/hex';
import type { RegionData } from '@/types/map';

interface RegionViewProps {
  region: RegionData;
}

/**
 * Visualises the micro-level region layout with exactly 19 tiles.
 */
const RegionViewComponent: React.FC<RegionViewProps> = ({ region }) => {
  const tiles = useMemo(() => region.tiles.slice().sort((a, b) => a.r - b.r || a.q - b.q), [region.tiles]);

  return (
    <svg role="presentation" className="h-full w-full" viewBox="-120 -120 240 240">
      <defs>
        <radialGradient id="region-center" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(14,116,144,0.4)" />
          <stop offset="100%" stopColor="rgba(8,47,73,0)" />
        </radialGradient>
      </defs>
      <circle cx={0} cy={0} r={REGION_RADIUS * MICRO_HEX_SIZE * 1.25} fill="url(#region-center)" />
      {tiles.map((tile) => {
        const { x, y } = axialToPixel({ q: tile.q, r: tile.r }, MICRO_HEX_SIZE);
        return (
          <g key={`${tile.q}_${tile.r}`}>
            <HexPolygon cx={x} cy={y} size={MICRO_HEX_SIZE} stroke="#1e293b" fill={biomeFill(tile.biome)} />
            {tile.poi?.length ? (
              <text x={x} y={y + 4} textAnchor="middle" fontSize={8} fill="#f8fafc">
                {tile.poi.join(', ')}
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
