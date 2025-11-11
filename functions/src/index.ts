import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as express from 'express';
import * as cors from 'cors';

admin.initializeApp();
const db = admin.firestore();

const app = express();
app.use(cors({ origin: true }));

interface Axial {
  q: number;
  r: number;
}

const DIRS: Axial[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

const key = (q: number, r: number) => `${q},${r}`;

const dist = (a: Axial, b: Axial) =>
  (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;

const BIOME_FACTOR: Record<string, number> = {
  Steppe: 1,
  Wald: 1.1,
  Hochland: 1.3,
  Ödland: 1.8,
  Moor: 2.2,
};

const biomeFactor = (biome?: string) => BIOME_FACTOR[biome ?? 'Steppe'] ?? 1.5;

const loadFactor = (count: number) => 1 + 0.08 * Math.max(0, count - 1);

const convoySpeed = (units: admin.firestore.DocumentData[]) =>
  Math.max(0.1, Math.min(...units.map((unit) => Number(unit.speed ?? 1))));

const etaMs = (pathLen: number, units: admin.firestore.DocumentData[], roundTrip: boolean) => {
  const baseMs = 280;
  const speed = convoySpeed(units);
  const legs = roundTrip ? pathLen * 2 : pathLen;
  return Math.round(legs * (baseMs / speed));
};

const pathCost = (
  path: Axial[],
  tiles: Map<string, admin.firestore.DocumentData>,
  units: admin.firestore.DocumentData[],
  roundTrip: boolean,
) => {
  const shipAvg =
    units.reduce((sum, unit) => sum + Number(unit.shipFactor ?? 1), 0) / Math.max(1, units.length);
  let total = 0;
  for (const step of path) {
    const tile = tiles.get(key(step.q, step.r));
    if (!tile || tile.settleable === false) {
      return Number.POSITIVE_INFINITY;
    }
    total += biomeFactor(tile.biome) * loadFactor(units.length) * shipAvg;
  }
  return roundTrip ? total * 2 : total;
};

const aStar = (
  start: Axial,
  goal: Axial,
  tiles: Map<string, admin.firestore.DocumentData>,
): Axial[] | null => {
  const open = new Set<string>([key(start.q, start.r)]);
  const cameFrom = new Map<string, string>();
  const gScore = new Map<string, number>([[key(start.q, start.r), 0]]);
  const fScore = new Map<string, number>([[key(start.q, start.r), dist(start, goal)]]);

  const lowestF = () => {
    let bestKey: string | null = null;
    let bestValue = Number.POSITIVE_INFINITY;
    for (const node of open) {
      const value = fScore.get(node) ?? Number.POSITIVE_INFINITY;
      if (value < bestValue) {
        bestValue = value;
        bestKey = node;
      }
    }
    return bestKey;
  };

  while (open.size > 0) {
    const currentKey = lowestF();
    if (!currentKey) {
      break;
    }
    const [cq, cr] = currentKey.split(',').map(Number);
    if (cq === goal.q && cr === goal.r) {
      const path: Axial[] = [{ q: cq, r: cr }];
      let keyPointer = currentKey;
      while (cameFrom.has(keyPointer)) {
        const prevKey = cameFrom.get(keyPointer)!;
        const [pq, pr] = prevKey.split(',').map(Number);
        path.push({ q: pq, r: pr });
        keyPointer = prevKey;
      }
      return path.reverse();
    }
    open.delete(currentKey);
    for (const direction of DIRS) {
      const nq = cq + direction.q;
      const nr = cr + direction.r;
      const neighborKey = key(nq, nr);
      const tile = tiles.get(neighborKey);
      if (!tile || tile.settleable === false) {
        continue;
      }
      const tentativeG = (gScore.get(currentKey) ?? Number.POSITIVE_INFINITY) + biomeFactor(tile.biome);
      if (tentativeG < (gScore.get(neighborKey) ?? Number.POSITIVE_INFINITY)) {
        cameFrom.set(neighborKey, currentKey);
        gScore.set(neighborKey, tentativeG);
        fScore.set(neighborKey, tentativeG + dist({ q: nq, r: nr }, goal));
        open.add(neighborKey);
      }
    }
  }
  return null;
};

const fetchTiles = async (worldId: string, regionId: string) => {
  const snapshot = await db.collection('worlds').doc(worldId).collection('regions').doc(regionId).collection('tiles').get();
  return new Map(snapshot.docs.map((doc) => [doc.id, doc.data()]));
};

const fetchUnits = async (worldId: string, unitIds: string[]) => {
  if (unitIds.length === 0) {
    return [] as admin.firestore.QueryDocumentSnapshot[];
  }
  const snapshot = await db
    .collection('worlds')
    .doc(worldId)
    .collection('units')
    .where(admin.firestore.FieldPath.documentId(), 'in', unitIds)
    .get();
  return snapshot.docs;
};

interface CreateConvoyInput {
  worldId: string;
  regionId: string;
  origin: { q: number; r: number };
  target: { q: number; r: number };
  unitIds: string[];
  action: string;
}

app.post('/createConvoy', async (req, res) => {
  const data: CreateConvoyInput = req.body;
  const context = { auth: { uid: req.header('uid') } };

  if (!context.auth.uid) {
    res.status(401).send({ error: 'Login erforderlich.' });
    return;
  }
  const ownerId = context.auth.uid;
  const { worldId, regionId, origin, target, unitIds, action } = data;
  if (!worldId || !regionId || !origin || !target || !Array.isArray(unitIds)) {
    res.status(400).send({ error: 'Eingaben unvollständig.' });
    return;
  }

  const tiles = await fetchTiles(worldId, regionId);
  const unitsSnap = await fetchUnits(worldId, unitIds);
  if (unitsSnap.length !== unitIds.length) {
    res.status(400).send({ error: 'Einheiten konnten nicht geladen werden.' });
    return;
  }
  const units = unitsSnap.map((snap) => ({ id: snap.id, ...snap.data() }));
  if (units.some((unit) => unit.ownerId !== ownerId)) {
    res.status(403).send({ error: 'Fremde Einheiten dürfen nicht verwendet werden.' });
    return;
  }

  const path = aStar(origin, target, tiles);
  if (!path) {
    res.status(400).send({ error: 'Kein Pfad gefunden.' });
    return;
  }

  const roundTrip = action !== 'COLONIZE' && action !== 'MOVE';
  const cost = pathCost(path, tiles, units, roundTrip);
  const capacity = units.reduce((sum, unit) => sum + Number(unit.pressureTankMax ?? unit.pressureCapacity ?? 0), 0);
  if (!Number.isFinite(cost) || cost > capacity) {
    res.status(400).send({ error: 'Druckkapazität reicht nicht aus.' });
    return;
  }

  const eta = Date.now() + etaMs(path.length - 1, units, roundTrip);
  const convoyDoc = await db.collection('worlds').doc(worldId).collection('convoys').add({
    ownerId,
    regionId,
    origin,
    target,
    unitIds,
    action,
    path,
    roundTrip,
    cost,
    capacity,
    eta,
    state: 'movingOut',
    createdAt: Date.now(),
  });

  res.send({ convoyId: convoyDoc.id, accepted: true });
});

const advanceColonization = async (
  worldId: string,
  regionId: string,
  target: { q: number; r: number },
  ownerId: string,
) => {
  await db
    .collection('worlds')
    .doc(worldId)
    .collection('regions')
    .doc(regionId)
    .collection('tiles')
    .doc(key(target.q, target.r))
    .set({
      settlement: { ownerId, type: 'OUTPOST' },
      ownerId,
    }, { merge: true });
};

const returnEta = (convoy: admin.firestore.DocumentData) =>
  Date.now() + etaMs((convoy.path?.length ?? 1) - 1, [], false);

export const api = functions.https.onRequest(app);

/**
 * Scheduled job that progresses convoy states once their ETA is reached.
 */
export const convoyTick = functions.pubsub.schedule('every 1 minutes').onRun(async () => {
  const worlds = await db.collection('worlds').get();
  const now = Date.now();
  for (const world of worlds.docs) {
    const worldId = world.id;
    const convoysSnap = await world.ref
      .collection('convoys')
      .where('state', 'in', ['movingOut', 'resolving', 'returning'])
      .get();
    for (const convoyDoc of convoysSnap.docs) {
      const convoy = convoyDoc.data();
      if (now < Number(convoy.eta)) {
        continue;
      }
      if (convoy.state === 'movingOut') {
        if (convoy.action === 'COLONIZE') {
          await advanceColonization(worldId, convoy.regionId, convoy.target, convoy.ownerId);
        }
        if (convoy.roundTrip) {
          await convoyDoc.ref.update({
            state: 'returning',
            eta: returnEta(convoy),
          });
        } else {
          await convoyDoc.ref.update({ state: 'done', eta: now });
        }
      } else if (convoy.state === 'returning') {
        await convoyDoc.ref.update({ state: 'done', eta: now });
      }
    }
  }
  return null;
});
