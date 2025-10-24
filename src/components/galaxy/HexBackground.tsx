import React, { useMemo } from 'react';
import { axialToPixel, pixelToAxial, hexPoints, pointsToAttribute } from '@/lib/hexMath';

type HexBackgroundProps = {
  width: number;
  height: number;
  zoom: number;
  offset: { x: number; y: number };
  size: number;
};

const OVERDRAW = 2;
const FILL_PRIMARY = '#23304c';
const FILL_SECONDARY = '#1b253a';
const EDGE_COLOR = 'rgba(255,255,255,0.08)';

/**
 * Lightweight background layer that renders visible hex tiles with subtle edges.
 */
const HexBackground: React.FC<HexBackgroundProps> = ({ width, height, zoom, offset, size }) => {
  const tiles = useMemo(() => {
    const worldWidth = width / Math.max(zoom, 0.0001);
    const worldHeight = height / Math.max(zoom, 0.0001);
    const minX = -offset.x;
    const minY = -offset.y;
    const maxX = minX + worldWidth;
    const maxY = minY + worldHeight;

    const corners = [
      pixelToAxial(minX, minY, size),
      pixelToAxial(maxX, minY, size),
      pixelToAxial(minX, maxY, size),
      pixelToAxial(maxX, maxY, size),
    ];

    const qMin = Math.floor(Math.min(...corners.map((corner) => corner.q))) - OVERDRAW;
    const qMax = Math.ceil(Math.max(...corners.map((corner) => corner.q))) + OVERDRAW;
    const rMin = Math.floor(Math.min(...corners.map((corner) => corner.r))) - OVERDRAW;
    const rMax = Math.ceil(Math.max(...corners.map((corner) => corner.r))) + OVERDRAW;

    const buffer = size * 2;
    const visible: Array<{ x: number; y: number; parity: number }> = [];

    for (let r = rMin; r <= rMax; r += 1) {
      for (let q = qMin; q <= qMax; q += 1) {
        const { x, y } = axialToPixel(q, r, size);
        if (x < minX - buffer || x > maxX + buffer || y < minY - buffer || y > maxY + buffer) {
          continue;
        }
        visible.push({ x, y, parity: (q + r) & 1 });
      }
    }

    return visible;
  }, [height, offset.x, offset.y, size, width, zoom]);

  const polygon = useMemo(() => pointsToAttribute(hexPoints(Math.max(2, size - 1))), [size]);

  return (
    <g aria-label="hex-background" pointerEvents="none">
      {tiles.map(({ x, y, parity }, index) => (
        <polygon
          key={`${x}-${y}-${index}`}
          transform={`translate(${x},${y})`}
          points={polygon}
          fill={parity === 0 ? FILL_PRIMARY : FILL_SECONDARY}
          stroke={EDGE_COLOR}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
          opacity={0.45}
        />
      ))}
    </g>
  );
};

export default HexBackground;
