import { collection, doc, getDoc, getDocs, type QueryDocumentSnapshot, type DocumentData } from 'firebase/firestore';
import { getDb } from './db';
import type { World, Region, Tile } from '@/data/types';
import { makeWorld } from '@/lib/hexgrid/macroWorld';
import { ensureRegionCentroid } from '@/lib/hexgrid/microRegion';
import { CONFIG } from '@/config/mapConfig';

const tileFromFirestore = (regionId: string, data: any): Tile => ({
  q: data.q,
  r: data.r,
  biome: data.biome,
  regionId,
  allianceId: data.ownerId ?? data.allianceId,
  hasSettlement: data.settlement
    ? { playerId: data.settlement.ownerId, icon: data.settlement.type }
    : undefined,
});

const regionFromFirestore = async (
  worldId: string,
  regionDoc: QueryDocumentSnapshot<DocumentData>,
): Promise<Region> => {
  const db = getDb();
  if (!db) {
    throw new Error('Firestore connection lost during Region fetch.');
  }
  const regionId = regionDoc.id;
  const regionData = regionDoc.data();
  const tilesSnap = await getDocs(collection(db, 'worlds', worldId, 'regions', regionId, 'tiles'));
  const tiles = tilesSnap.docs.map((tile) => tileFromFirestore(regionId, tile.data()));
  const region: Region = {
    id: regionId,
    name: regionData.name ?? regionId,
    RQ: regionData.RQ ?? regionData.q ?? 0,
    RR: regionData.RR ?? regionData.r ?? 0,
    allianceId: regionData.allianceId,
    tiles,
  };
  ensureRegionCentroid(region, CONFIG.microHexSizePx);
  return region;
};

/**
 * Loads the world definition from Firestore or falls back to the deterministic generator.
 */
export const bootstrapWorld = async (worldId: string): Promise<World> => {
  const db = getDb();
  if (!db) {
    const fallback = makeWorld();
    fallback.regions.forEach((region) => ensureRegionCentroid(region, CONFIG.microHexSizePx));
    return fallback;
  }
  const docRef = doc(db, 'worlds', worldId);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) {
    throw new Error(`World ${worldId} wurde nicht gefunden.`);
  }
  const regionsSnap = await getDocs(collection(db, 'worlds', worldId, 'regions'));
  const regions: Region[] = [];
  for (const regionDoc of regionsSnap.docs) {
    const region = await regionFromFirestore(worldId, regionDoc as any);
    regions.push(region);
  }
  const worldData = snapshot.data();
  const world: World = {
    regions,
    selectedRegionId: undefined,
    allianceFilterOn: false,
    home: worldData.home
      ? {
          regionId: worldData.home.regionId,
          tileKey: worldData.home.tileKey,
          setAt: worldData.home.setAt ?? Date.now(),
        }
      : undefined,
  };
  return world;
};
