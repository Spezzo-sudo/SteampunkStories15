import React, { useMemo } from 'react';
import { axialToPixel } from '@/lib/hexMath';

export interface TerrainTile {
  q: number;
  r: number;
  sprite: string;
}

type HexTerrainProps = {
  tiles: TerrainTile[];
  width: number;
  height: number;
  zoom: number;
  offset: { x: number; y: number };
  size: number;
};

const SQRT3 = Math.sqrt(3);

const HexTerrain: React.FC<HexTerrainProps> = ({ tiles, width, height, zoom, offset, size }) => {
  const prepared = useMemo(
    () =>
      tiles.map((tile) => {
        const { x, y } = axialToPixel({ q: tile.q, r: tile.r }, size);
        return { ...tile, x, y };
      }),
    [size, tiles],
  );

  const visibleTiles = useMemo(() => {
    const worldWidth = width / Math.max(zoom, 0.0001);
    const worldHeight = height / Math.max(zoom, 0.0001);
    const minX = -offset.x - size * 4;
    const minY = -offset.y - size * 4;
    const maxX = minX + worldWidth + size * 8;
    const maxY = minY + worldHeight + size * 8;
    return prepared.filter((tile) => tile.x >= minX && tile.x <= maxX && tile.y >= minY && tile.y <= maxY);
  }, [height, offset.x, offset.y, prepared, size, width, zoom]);

  const spriteWidth = size * SQRT3;
  const spriteHeight = size * 2;

  if (visibleTiles.length === 0) {
    return null;
  }

  return (
    <g aria-label="hex-terrain" pointerEvents="none">
      {visibleTiles.map((tile) => (
        <image
          key={`${tile.q}:${tile.r}`}
          href={tile.sprite}
          x={tile.x - spriteWidth / 2}
          y={tile.y - spriteHeight / 2}
          width={spriteWidth}
          height={spriteHeight}
          preserveAspectRatio="xMidYMid slice"
        />
      ))}
    </g>
  );
};

export default React.memo(HexTerrain);
