import { TerrainTile } from '@/components/galaxy/terrain/HexTerrain';

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

  const tilesetInfo = mapData.tilesets[0];
  if (!tilesetInfo) {
    return [];
  }

  const tilesetUrl = resolveUrl(tilesetInfo.source, mapUrl);
  const tilesetResponse = await fetch(tilesetUrl);
  if (!tilesetResponse.ok) {
    throw new Error(`Failed to load tileset ${tilesetInfo.source}`);
  }
  const tilesetText = await tilesetResponse.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(tilesetText, 'application/xml');
  const tileNodes = Array.from(doc.getElementsByTagName('tile'));

  const gidToSprite = new Map<number, string>();
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
