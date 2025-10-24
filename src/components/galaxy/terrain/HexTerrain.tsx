import React, { useMemo } from 'react';
import { axialToPixel, pixelToAxial, hexPoints, pointsToAttribute } from '@/lib/hexMath';

type HexTerrainProps = {
  width: number;
  height: number;
  zoom: number;
  offset: { x: number; y: number };
  size: number;
};

const OVERDRAW = 2;

const pickColors = (q: number, r: number) => {
  let h = (q * 73856093) ^ (r * 19349663);
  h ^= h << 13;
  h ^= h >>> 17;
  h ^= h << 5;
  const t = ((h >>> 0) % 1000) / 1000;
  if (t < 0.2) return { fill: '#2a3b24', stroke: '#3a4b34' };
  if (t < 0.4) return { fill: '#445b2b', stroke: '#556c3a' };
  if (t < 0.6) return { fill: '#5d4a1f', stroke: '#6d5b2d' };
  if (t < 0.8) return { fill: '#333846', stroke: '#465065' };
  return { fill: '#3b2e3f', stroke: '#5b4760' };
};

/**
 * Terrain layer that fills every visible hex with a subtle color patch.
 * Pointer events are disabled so system tiles keep handling interaction.
 */
const HexTerrain: React.FC<HexTerrainProps> = ({ width, height, zoom, offset, size }) => {
  const tiles = useMemo(() => {
    const worldW = width / Math.max(zoom, 0.0001);
    const worldH = height / Math.max(zoom, 0.0001);
    const minX = -offset.x;
    const minY = -offset.y;
    const maxX = minX + worldW;
    const maxY = minY + worldH;

    const corners = [
      pixelToAxial(minX, minY, size),
      pixelToAxial(maxX, minY, size),
      pixelToAxial(minX, maxY, size),
      pixelToAxial(maxX, maxY, size),
    ];
    const qMin = Math.floor(Math.min(...corners.map((c) => c.q))) - OVERDRAW;
    const qMax = Math.ceil(Math.max(...corners.map((c) => c.q))) + OVERDRAW;
    const rMin = Math.floor(Math.min(...corners.map((c) => c.r))) - OVERDRAW;
    const rMax = Math.ceil(Math.max(...corners.map((c) => c.r))) + OVERDRAW;

    const buffer = size * 2;
    const out: Array<{ x: number; y: number; q: number; r: number }> = [];
    for (let r = rMin; r <= rMax; r += 1) {
      for (let q = qMin; q <= qMax; q += 1) {
        const { x, y } = axialToPixel(q, r, size);
        if (x < minX - buffer || x > maxX + buffer || y < minY - buffer || y > maxY + buffer) continue;
        out.push({ x, y, q, r });
      }
    }
    return out;
  }, [height, offset.x, offset.y, size, width, zoom]);

  const polygon = useMemo(() => pointsToAttribute(hexPoints(Math.max(2, size - 1))), [size]);

  return (
    <g aria-label="hex-terrain" pointerEvents="none" shapeRendering="crispEdges">
      {tiles.map(({ x, y, q, r }) => {
        const { fill, stroke } = pickColors(q, r);
        return (
          <polygon
            key={`${q}:${r}`}
            transform={`translate(${x},${y})`}
            points={polygon}
            fill={fill}
            stroke={stroke}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
            opacity={0.88}
          />
        );
      })}
    </g>
  );
};

export default React.memo(HexTerrain);
