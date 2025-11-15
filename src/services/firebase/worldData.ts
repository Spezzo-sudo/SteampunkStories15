import { collection, getDocs } from 'firebase/firestore';
import { getDb } from './db';
import type { Region } from '@/data/types';

/**
 * Lists all regions of the provided world.
 * Falls back to an empty result when Firestore is unavailable so offline play remains possible.
 */
export const listRegions = async (worldId: string): Promise<Region[]> => {
  try {
    const db = getDb();
    const regionsCol = collection(db, 'worlds', worldId, 'regions');
    const regionSnapshot = await getDocs(regionsCol);

    if (regionSnapshot.empty) {
      console.warn(`No regions found for world '${worldId}'. Falling back to an empty array.`);
      return [];
    }

    return regionSnapshot.docs.map((doc) => {
      const data = doc.data() as Partial<Region>;
      return {
        ...data,
        id: doc.id,
        tiles: data.tiles ?? [],
      } as Region;
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('Firebase has not been initialized')) {
      console.warn('Firestore unavailable while listing regions; returning mock empty result.');
      return [];
    }
    throw error;
  }
};
