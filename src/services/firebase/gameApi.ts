import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { getDb } from './db';
import type { Region, Tile } from '@/data/types';

/**
 * Fetches a region and its tiles.
 * @param worldId The ID of the world.
 * @param regionId The ID of the region.
 * @returns The region with its tiles.
 */
export const fetchRegion = async (worldId: string, regionId: string): Promise<Region | null> => {
  if (!worldId || !regionId) {
    console.error('fetchRegion was called with an undefined worldId or regionId');
    return null;
  }

  try {
    const db = getDb();
    const regionDocRef = doc(db, 'worlds', worldId, 'regions', regionId);
    const regionSnapshot = await getDoc(regionDocRef);

    if (!regionSnapshot.exists()) {
      console.warn(`Region ${regionId} not found in world ${worldId}.`);
      return null;
    }

    const regionData = regionSnapshot.data() as Partial<Region>;
    const region: Region = {
      ...regionData,
      id: regionSnapshot.id,
      tiles: regionData.tiles ?? [],
    } as Region;

    const tilesRef = collection(regionDocRef, 'tiles');
    const tilesSnapshot = await getDocs(tilesRef);
    region.tiles = tilesSnapshot.docs.map((tileDoc) => tileDoc.data() as Tile);

    return region;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('Firebase has not been initialized')) {
      console.warn('Firestore unavailable while fetching region; returning null.');
      return null;
    }
    throw error;
  }
};
