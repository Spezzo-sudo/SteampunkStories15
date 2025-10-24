import React, { useMemo } from 'react';
import { buildHexPolygon } from '@/lib/hexMath';

type BackgroundTile = {
  x: number;
  y: number;
  parity: number;
};

type HexBackgroundProps = {
  tiles: BackgroundTile[];
  hexSize: number;
};

/**
 * Lightweight renderer for the precomputed background hex tiles.
 */
const HexBackground: React.FC<HexBackgroundProps> = ({ tiles, hexSize }) => {
  const polygon = useMemo(
    () => buildHexPolygon(Math.max(2, hexSize - 1)).map(([x, y]) => `${x},${y}`).join(' '),
    [hexSize],
  );

  return (
    <g aria-label="background-hexes" pointerEvents="none">
      {tiles.map((tile, index) => (
        <polygon
          key={`${tile.x}-${tile.y}-${index}`}
          transform={`translate(${tile.x},${tile.y})`}
          points={polygon}
          fill={tile.parity === 0 ? '#151827' : '#101421'}
          opacity={0.32}
        />
      ))}
    </g>
  );
};

export type { BackgroundTile };
export default HexBackground;
