import { collection, getDocs } from 'firebase/firestore';
import { db } from './config'; // Corrected import path
import type { Region } from '@/data/types';

const WORLD_ID = 'playtest-world';

/**
 * Lists all regions in the world by fetching them from Firestore.
 * @returns An array of regions.
 */
export const listRegions = async (): Promise<Region[]> => {
  const regionsCol = collection(db, 'worlds', WORLD_ID, 'regions');
  const regionSnapshot = await getDocs(regionsCol);
  
  if (regionSnapshot.empty) {
    console.warn(`No regions found for world '${WORLD_ID}'. Falling back to an empty array.`);
    return [];
  }

  const regions: Region[] = regionSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      ...data,
      id: doc.id, // This is the crucial fix!
    } as Region;
  });

  return regions;
};
