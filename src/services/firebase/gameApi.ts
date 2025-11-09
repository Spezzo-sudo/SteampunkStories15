import {
  collection,
  onSnapshot,
  query,
  where,
  type DocumentData,
  type FirestoreDataConverter,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import type { Unsubscribe } from 'firebase/auth';
import { getDb } from './db';
import { ensureFirebaseApp } from './initFirebase';
import type { Tile } from '@/data/types';
import type { Convoy, Unit } from '@/types/convoy';

/**
 * Minimal representation of a convoy document fetched from Firestore.
 */
export interface ConvoyDoc {
  id: string;
  ownerId: string;
  regionId: string;
  origin: { q: number; r: number };
  target: { q: number; r: number };
  path: { q: number; r: number }[];
  action: string;
  roundTrip: boolean;
  state: string;
  cost: number;
  capacity: number;
  eta: number;
  unitIds: string[];
}

const tileConverter: FirestoreDataConverter<Tile> = {
  toFirestore(tile: Tile): DocumentData {
    return tile as DocumentData;
  },
  fromFirestore(snapshot) {
    const data = snapshot.data();
    return {
      q: data.q,
      r: data.r,
      regionId: data.regionId,
      biome: data.biome,
      allianceId: data.allianceId,
      hasSettlement: data.settlement
        ? { playerId: data.settlement.ownerId, icon: data.settlement.type }
        : undefined,
    } satisfies Tile;
  },
};

const convoyConverter: FirestoreDataConverter<ConvoyDoc> = {
  toFirestore(value: ConvoyDoc): DocumentData {
    return value as DocumentData;
  },
  fromFirestore(snapshot) {
    const data = snapshot.data();
    return {
      id: snapshot.id,
      ownerId: data.ownerId,
      regionId: data.regionId,
      origin: data.origin,
      target: data.target,
      path: data.path,
      action: data.action,
      roundTrip: data.roundTrip,
      state: data.state,
      cost: data.cost,
      capacity: data.capacity,
      eta: data.eta,
      unitIds: data.unitIds ?? [],
    } satisfies ConvoyDoc;
  },
};

/**
 * Observes tile data for a specific region and forwards snapshots to the callback.
 */
export const observeRegionTiles = (
  worldId: string,
  regionId: string,
  onChange: (tiles: Tile[]) => void,
): Unsubscribe => {
  const db = getDb();
  if (!db) {
    onChange([]);
    return () => undefined;
  }
  const ref = collection(db, 'worlds', worldId, 'regions', regionId, 'tiles').withConverter(tileConverter);
  return onSnapshot(ref, (snapshot) => {
    onChange(snapshot.docs.map((doc) => doc.data()));
  });
};

/**
 * Observes all unit documents owned by the current user in a world.
 */
export const observeUnits = (
  worldId: string,
  ownerId: string,
  onChange: (units: Unit[]) => void,
): Unsubscribe => {
  const db = getDb();
  if (!db) {
    onChange([]);
    return () => undefined;
  }
  const ref = collection(db, 'worlds', worldId, 'units');
  const q = query(ref, where('ownerId', '==', ownerId));
  return onSnapshot(q, (snapshot) => {
    const mapped = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Unit[];
    onChange(mapped);
  });
};

/**
 * Observes convoy missions owned by the current user.
 */
export const observeConvoys = (
  worldId: string,
  ownerId: string,
  onChange: (convoys: ConvoyDoc[]) => void,
): Unsubscribe => {
  const db = getDb();
  if (!db) {
    onChange([]);
    return () => undefined;
  }
  const ref = collection(db, 'worlds', worldId, 'convoys').withConverter(convoyConverter);
  const q = query(ref, where('ownerId', '==', ownerId));
  return onSnapshot(q, (snapshot) => {
    onChange(snapshot.docs.map((doc) => doc.data()));
  });
};

/**
 * Requests the creation of a convoy via the Cloud Function.
 */
export const requestConvoy = async (payload: {
  worldId: string;
  regionId: string;
  origin: { q: number; r: number };
  target: { q: number; r: number };
  unitIds: string[];
  action: Convoy['action'];
}): Promise<{ convoyId: string }> => {
  const app = ensureFirebaseApp();
  if (!app) {
    throw new Error('Firebase ist nicht konfiguriert.');
  }
  const functions = getFunctions(app);
  const callable = httpsCallable(functions, 'createConvoy');
  const result = await callable(payload);
  const data = result.data as { convoyId: string };
  return data;
};
