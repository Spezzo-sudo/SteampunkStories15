import type { User } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { getDb } from './db';
import type { PlayerProfile } from '@/data/types';

/**
 * Fetches a player's profile from Firestore, creating a default one if it doesn't exist.
 * This is the primary entry point for syncing player-specific game data.
 *
 * @param user The authenticated Firebase user object.
 * @returns A promise that resolves to the player's profile data.
 */
export const fetchOrCreatePlayerProfile = async (user: User): Promise<PlayerProfile> => {
  const db = getDb();
  const profileRef = doc(db, 'players', user.uid);
  const profileSnap = await getDoc(profileRef);

  if (profileSnap.exists()) {
    return profileSnap.data() as PlayerProfile;
  }

  const newProfile: PlayerProfile = {
    uid: user.uid,
    name: user.displayName || user.email || 'Anonymous',
    hasPlacedHome: false,
  };

  await setDoc(profileRef, newProfile);
  return newProfile;
};

/**
 * Updates a player's profile in Firestore.
 *
 * @param uid The unique identifier of the player to update.
 * @param data A partial `PlayerProfile` object with the fields to update.
 * @returns A promise that resolves when the update is complete.
 */
export const updatePlayerProfile = async (uid: string, data: Partial<PlayerProfile>): Promise<void> => {
  const db = getDb();
  const profileRef = doc(db, 'players', uid);
  await updateDoc(profileRef, data);
};
