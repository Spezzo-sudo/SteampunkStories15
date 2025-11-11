import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './config';
import type { Region } from '@/data/types';

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

  const regionRef = collection(db, 'worlds', worldId, 'regions');
  const q = query(regionRef, where('id', '==', regionId));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  const regionDoc = snapshot.docs[0];
  const region = { ...regionDoc.data(), id: regionDoc.id } as Region;

  const tilesRef = collection(db, 'worlds', worldId, 'regions', regionId, 'tiles');
  const tilesSnapshot = await getDocs(tilesRef);
  region.tiles = tilesSnapshot.docs.map((doc) => doc.data());

  return region;
};
