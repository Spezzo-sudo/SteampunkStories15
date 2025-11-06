import React, { useEffect, useMemo, useRef, useState } from 'react';
import { axialToPixel } from '@/lib/hex';
import type { TerrainTile } from '@/components/galaxy/terrain/HexTerrainCanvas.types';

export interface TerrainTile {
  q: number;
  r: number;
  sprite: string;
}

type HexTerrainCanvasProps = {
  tiles: TerrainTile[];
  width: number;
  height: number;
  zoom: number;
  offset: { x: number; y: number };
  size: number;
};

const SPRITE_CACHE: Record<string, HTMLImageElement> = {};

const HexTerrainCanvas: React.FC<HexTerrainCanvasProps> = ({ tiles, width, height, zoom, offset, size }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [readySprites, setReadySprites] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const uniqueSources = Array.from(new Set(tiles.map((tile) => tile.sprite)));

    const loadSprite = (src: string) =>
      new Promise<void>((resolve, reject) => {
        if (SPRITE_CACHE[src]?.complete) {
          resolve();
          return;
        }
        const img = new Image();
        img.onload = () => {
          SPRITE_CACHE[src] = img;
          resolve();
        };
        img.onerror = () => reject(new Error(`Failed to load sprite ${src}`));
        img.src = src;
      });

    Promise.all(uniqueSources.map(loadSprite))
      .then(() => {
        if (!cancelled) {
          setReadySprites(true);
        }
      })
      .catch((error) => {
        console.error(error);
      });

    return () => {
      cancelled = true;
    };
  }, [tiles]);

  const preparedTiles = useMemo(
    () =>
      tiles.map((tile) => {
        const { x, y } = axialToPixel({ q: tile.q, r: tile.r }, size);
        return { ...tile, x, y };
      }),
    [size, tiles],
  );

  useEffect(() => {
    if (!readySprites) {
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }
    ctx.clearRect(0, 0, width, height);

    const worldWidth = width / Math.max(zoom, 0.0001);
    const worldHeight = height / Math.max(zoom, 0.0001);
    const minX = -offset.x - size * 4;
    const minY = -offset.y - size * 4;
    const maxX = minX + worldWidth + size * 8;
    const maxY = minY + worldHeight + size * 8;

    const spriteWidth = size * Math.sqrt(3);
    const spriteHeight = size * 2;

    preparedTiles.forEach((tile) => {
      if (tile.x < minX || tile.x > maxX || tile.y < minY || tile.y > maxY) {
        return;
      }
      const sprite = SPRITE_CACHE[tile.sprite];
      if (!sprite) {
        return;
      }
      ctx.drawImage(sprite, tile.x - spriteWidth / 2, tile.y - spriteHeight / 2, spriteWidth, spriteHeight);
    });
  }, [preparedTiles, height, offset.x, offset.y, readySprites, size, width, zoom]);

  return <canvas ref={canvasRef} width={width} height={height} className="block" />;
};

export default React.memo(HexTerrainCanvas);
