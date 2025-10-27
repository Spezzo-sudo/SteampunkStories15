import type { TerrainTile } from '@/components/galaxy/terrain/HexTerrainCanvas.types';

const resolveUrl = (relativePath: string, basePath: string) => {
  const base = new URL(basePath, window.location.origin);
  return new URL(relativePath, base).toString();
};

const gidToAxial = (col: number, row: number) => ({
  q: col - Math.floor((row - (row & 1)) / 2),
  r: row,
});

interface TiledMapLayer {
  type: string;
  data: number[];
}

interface TiledMapTileset {
  firstgid: number;
  source: string;
}

interface TiledMap {
  width: number;
  height: number;
  layers: TiledMapLayer[];
  tilesets: TiledMapTileset[];
}

/**
 * Loads terrain tile definitions from a Tiled map and resolves their sprite sources.
 *
 * @param mapUrl - The URL to the `.tmj` map exported from Tiled.
 * @returns A promise resolving to terrain tiles ready for rendering on the canvas layer.
 */
export const loadTerrainFromTiled = async (mapUrl: string): Promise<TerrainTile[]> => {
  const response = await fetch(mapUrl);
  if (!response.ok) {
    throw new Error(`Failed to load map ${mapUrl}`);
  }
  const mapData = (await response.json()) as TiledMap;
  const baseLayer = mapData.layers.find((layer) => layer.type === 'tilelayer');
  if (!baseLayer) {
    return [];
  }

  if (!mapData.tilesets || mapData.tilesets.length === 0) {
    return [];
  }

  const gidToSprite = new Map<number, string>();
  for (const tilesetInfo of mapData.tilesets) {
    const tilesetUrl = resolveUrl(tilesetInfo.source, mapUrl);
    try {
      const tilesetResponse = await fetch(tilesetUrl);
      if (!tilesetResponse.ok) {
        console.error(`Failed to load tileset ${tilesetInfo.source}`);
        continue;
      }
      const tilesetText = await tilesetResponse.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(tilesetText, 'application/xml');
      const tileNodes = Array.from(doc.getElementsByTagName('tile'));
      tileNodes.forEach((node) => {
        const id = Number(node.getAttribute('id')) || 0;
        const imageNode = node.getElementsByTagName('image')[0];
        const src = imageNode?.getAttribute('source');
        if (!src) {
          return;
        }
        const spriteUrl = new URL(src, tilesetUrl).toString();
        gidToSprite.set(tilesetInfo.firstgid + id, spriteUrl);
      });
    } catch (error) {
      console.error(`Failed to parse tileset ${tilesetInfo.source}`, error);
    }
  }

  const tiles: TerrainTile[] = [];
  baseLayer.data.forEach((gid, index) => {
    if (!gid) {
      return;
    }
    const sprite = gidToSprite.get(gid);
    if (!sprite) {
      return;
    }
    const col = index % mapData.width;
    const row = Math.floor(index / mapData.width);
    const axial = gidToAxial(col, row);
    tiles.push({ q: axial.q, r: axial.r, sprite });
  });

  return tiles;
};
