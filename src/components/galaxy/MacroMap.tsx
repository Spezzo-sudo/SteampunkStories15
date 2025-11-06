import React, { useMemo } from 'react';
import { MACRO_HEX_SIZE } from '@/constants/map';
import { axialToPixel } from '@/lib/hex';
import { useMapStore } from '@/store/mapStore';
import type { RegionMeta } from '@/types/map';

interface MacroMapProps {
  regions: RegionMeta[];
}

/**
 * Renders the macro-level world map with one clickable hex per region.
 */
const MacroMapComponent: React.FC<MacroMapProps> = ({ regions }) => {
  const openRegion = useMapStore((state) => state.openRegion);

  const regionNodes = useMemo(
    () =>
      regions.map((region) => {
        const { x, y } = axialToPixel({ q: region.RQ, r: region.RR }, MACRO_HEX_SIZE);
        return (
          <g
            key={region.id}
            onClick={() => openRegion(region.RQ, region.RR, region.seed)}
            className="transition-colors hover:[&>polygon]:fill-yellow-500/20"
            style={{ cursor: 'pointer' }}
          >
            <HexPolygon cx={x} cy={y} size={MACRO_HEX_SIZE} stroke="#8b5cf6" fill="rgba(15,23,42,0.4)" />
            {region.name ? (
              <text x={x} y={y + 4} textAnchor="middle" fill="#f8fafc" fontSize={12} fontFamily="Cinzel">
                {region.name}
              </text>
            ) : null}
          </g>
        );
      }),
    [openRegion, regions],
  );

  return (
    <svg role="presentation" className="h-full w-full" viewBox="-400 -400 800 800">
      {regionNodes}
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

const HexPolygon: React.FC<HexPolygonProps> = React.memo(({ cx, cy, size, stroke = '#64748b', fill = 'transparent' }) => {
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

  return <polygon points={points} stroke={stroke} fill={fill} strokeWidth={2} />;
});
HexPolygon.displayName = 'HexPolygon';

export const MacroMap = React.memo(MacroMapComponent);
MacroMap.displayName = 'MacroMap';
