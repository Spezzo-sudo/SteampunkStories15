import React, { useMemo } from 'react';

type HexBackgroundProps = {
  width: number;
  height: number;
  zoom: number;
  offset: { x: number; y: number };
  hexSize: number;
  gap?: number;
  colors?: {
    a: string;
    b: string;
    stroke: string;
  };
};

const SQRT3 = Math.sqrt(3);

const DEFAULT_COLORS = {
  a: '#1e2633',
  b: '#17202b',
  stroke: 'rgba(0,0,0,0.55)',
};

const DEFAULT_GAP = 2;

const axialToPixel = (q: number, r: number, size: number) => ({
  x: size * SQRT3 * (q + r / 2),
  y: size * 1.5 * r,
});

const pixelToAxial = (x: number, y: number, size: number) => ({
  q: (SQRT3 / 3) * (x / size) - (1 / 3) * (y / size),
  r: (2 / 3) * (y / size),
});

const buildHexPoints = (radius: number) => {
  const points: string[] = [];
  for (let i = 0; i < 6; i += 1) {
    const angle = ((60 * i - 30) * Math.PI) / 180;
    points.push(`${Math.cos(angle) * radius},${Math.sin(angle) * radius}`);
  }
  return points.join(' ');
};

/**
 * Hex background that covers the current viewport without stretching artefacts.
 */
const HexBackground: React.FC<HexBackgroundProps> = ({
  width,
  height,
  zoom,
  offset,
  hexSize,
  gap = DEFAULT_GAP,
  colors = DEFAULT_COLORS,
}) => {
  const view = useMemo(() => {
    const worldWidth = width / Math.max(zoom, 0.0001);
    const worldHeight = height / Math.max(zoom, 0.0001);
    const minX = -offset.x;
    const minY = -offset.y;
    const maxX = minX + worldWidth;
    const maxY = minY + worldHeight;

    const corners = [
      pixelToAxial(minX, minY, hexSize),
      pixelToAxial(maxX, minY, hexSize),
      pixelToAxial(minX, maxY, hexSize),
      pixelToAxial(maxX, maxY, hexSize),
    ];

    const qMin = Math.floor(Math.min(...corners.map((corner) => corner.q))) - 2;
    const qMax = Math.ceil(Math.max(...corners.map((corner) => corner.q))) + 2;
    const rMin = Math.floor(Math.min(...corners.map((corner) => corner.r))) - 2;
    const rMax = Math.ceil(Math.max(...corners.map((corner) => corner.r))) + 2;

    const clipMinX = minX - hexSize * 2;
    const clipMaxX = maxX + hexSize * 2;
    const clipMinY = minY - hexSize * 2;
    const clipMaxY = maxY + hexSize * 2;

    const tiles: Array<{ q: number; r: number; x: number; y: number }> = [];
    for (let r = rMin; r <= rMax; r += 1) {
      for (let q = qMin; q <= qMax; q += 1) {
        const { x, y } = axialToPixel(q, r, hexSize);
        if (x < clipMinX || x > clipMaxX || y < clipMinY || y > clipMaxY) {
          continue;
        }
        tiles.push({ q, r, x, y });
      }
    }
    return tiles;
  }, [height, hexSize, offset.x, offset.y, width, zoom]);

  const radius = Math.max(2, hexSize - gap);
  const points = useMemo(() => buildHexPoints(radius), [radius]);

  return (
    <g aria-label="hex-background" pointerEvents="none">
      {view.map(({ q, r, x, y }) => {
        const fill = ((q + r) & 1) === 0 ? colors.a : colors.b;
        return (
          <polygon
            key={`${q}:${r}`}
            transform={`translate(${x},${y})`}
            points={points}
            fill={fill}
            stroke={colors.stroke}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
            shapeRendering="geometricPrecision"
          />
        );
      })}
    </g>
  );
};

export default HexBackground;
