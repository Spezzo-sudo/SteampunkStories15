/**
 * Firestore Setup Script
 *
 * Dieses Script initialisiert die notwendige Firestore-Struktur für das Spiel.
 *
 * USAGE:
 *   npx tsx scripts/setupFirestore.ts
 *
 * PREREQUISITES:
 *   npm install -D tsx
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, writeBatch, getDocs } from 'firebase/firestore';
import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';

// .env Datei manuell laden (Node.js lädt sie nicht automatisch wie Vite)
function loadEnv() {
  const envPath = path.join(process.cwd(), '.env');

  if (!fs.existsSync(envPath)) {
    console.error('❌ Fehler: .env Datei nicht gefunden!');
    console.error('Erstelle .env aus .env.example:');
    console.error('  cp .env.example .env');
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf-8');
  const lines = envContent.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const [key, ...valueParts] = trimmed.split('=');
    const value = valueParts.join('=').trim();

    if (key && value) {
      process.env[key] = value;
    }
  }
}

// Lade .env
loadEnv();

// Firebase Config aus .env lesen
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

// Validierung
if (!firebaseConfig.projectId) {
  console.error('❌ Fehler: Firebase Config nicht gefunden!');
  console.error('Stelle sicher, dass .env existiert und VITE_FIREBASE_* Variablen gesetzt sind.');
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const WORLD_ID = 'playtest-world';

// Biome-Typen
type Biome = 'PLAINS' | 'FOREST' | 'HILLS' | 'MOUNTAIN' | 'DESERT' | 'SWAMP' | 'LAKE' | 'TUNDRA';

/**
 * Erstellt eine Standard-Region mit Hex-Tiles
 */
function generateRegion(regionId: string, name: string, RQ: number, RR: number) {
  const tiles: Array<{ q: number; r: number; biome: Biome; settleable: boolean }> = [];

  // Generiere 7-Hex Cluster (Zentrum + 6 Nachbarn)
  const hexRing = [
    { q: 0, r: 0 },
    { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
    { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 },
  ];

  for (const { q, r } of hexRing) {
    const biome: Biome = Math.random() > 0.7 ? 'FOREST' : Math.random() > 0.5 ? 'HILLS' : 'PLAINS';
    tiles.push({
      q,
      r,
      biome,
      settleable: biome !== 'MOUNTAIN' && biome !== 'LAKE',
    });
  }

  return {
    id: regionId,
    name,
    RQ,
    RR,
    tiles,
  };
}

/**
 * Initialisiert die Worlds-Collection
 */
async function setupWorlds() {
  console.log('\n📦 Erstelle World-Dokument...');

  const worldRef = doc(db, 'worlds', WORLD_ID);

  await setDoc(worldRef, {
    name: 'Playtest World',
    createdAt: Date.now(),
  }, { merge: true });

  console.log('✅ World-Dokument erstellt: worlds/' + WORLD_ID);
}

/**
 * Erstellt die Regions-Subcollection mit Test-Regionen
 */
async function setupRegions() {
  console.log('\n🗺️  Erstelle Regions...');

  // 19 Regions in Hex-Layout (flache Spitze)
  const regionLayout = [
    // Center
    { id: 'reg-0-0', name: 'Zentrum', RQ: 0, RR: 0 },
    // Ring 1
    { id: 'reg-1-0', name: 'Nord', RQ: 1, RR: 0 },
    { id: 'reg-1--1', name: 'Nordost', RQ: 1, RR: -1 },
    { id: 'reg-0--1', name: 'Ost', RQ: 0, RR: -1 },
    { id: 'reg--1-0', name: 'Süd', RQ: -1, RR: 0 },
    { id: 'reg--1-1', name: 'Südwest', RQ: -1, RR: 1 },
    { id: 'reg-0-1', name: 'West', RQ: 0, RR: 1 },
    // Ring 2 (12 mehr für insgesamt 19)
    { id: 'reg-2-0', name: 'Ferner Norden', RQ: 2, RR: 0 },
    { id: 'reg-2--1', name: 'Nordöstliche Grenze', RQ: 2, RR: -1 },
    { id: 'reg-2--2', name: 'Äußerster Osten', RQ: 2, RR: -2 },
    { id: 'reg-1--2', name: 'Östliche Peripherie', RQ: 1, RR: -2 },
    { id: 'reg-0--2', name: 'Südöstliche Marke', RQ: 0, RR: -2 },
    { id: 'reg--1--1', name: 'Südöstlicher Rand', RQ: -1, RR: -1 },
    { id: 'reg--2-0', name: 'Ferner Süden', RQ: -2, RR: 0 },
    { id: 'reg--2-1', name: 'Südwestliche Grenze', RQ: -2, RR: 1 },
    { id: 'reg--2-2', name: 'Äußerster Westen', RQ: -2, RR: 2 },
    { id: 'reg--1-2', name: 'Westliche Peripherie', RQ: -1, RR: 2 },
    { id: 'reg-0-2', name: 'Nordwestliche Marke', RQ: 0, RR: 2 },
    { id: 'reg-1-1', name: 'Nordwestlicher Rand', RQ: 1, RR: 1 },
  ];

  const batch = writeBatch(db);
  let batchCount = 0;

  for (const region of regionLayout) {
    const regionData = generateRegion(region.id, region.name, region.RQ, region.RR);
    const regionRef = doc(db, 'worlds', WORLD_ID, 'regions', region.id);

    batch.set(regionRef, {
      name: regionData.name,
      RQ: regionData.RQ,
      RR: regionData.RR,
    });

    batchCount++;

    // Firestore Batch Limit = 500
    if (batchCount >= 400) {
      await batch.commit();
      console.log(`  ✓ Batch committed (${batchCount} ops)`);
      batchCount = 0;
    }

    // Tiles als Sub-Collection
    for (const tile of regionData.tiles) {
      const tileId = `${tile.q}_${tile.r}`;
      const tileRef = doc(db, 'worlds', WORLD_ID, 'regions', region.id, 'tiles', tileId);

      batch.set(tileRef, {
        q: tile.q,
        r: tile.r,
        biome: tile.biome,
        settleable: tile.settleable,
      });

      batchCount++;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
    console.log(`  ✓ Final batch committed (${batchCount} ops)`);
  }

  console.log(`✅ ${regionLayout.length} Regions mit Tiles erstellt`);
}

/**
 * Erstellt Test-Player-Dokumente (optional)
 */
async function setupTestPlayers() {
  console.log('\n👤 Erstelle Test-Player...');

  // Check ob admin-user existiert
  const adminRef = doc(db, 'players', 'admin-test-uid');

  await setDoc(adminRef, {
    uid: 'admin-test-uid',
    name: 'Admin Spieler',
    hasPlacedHome: false,
  });

  console.log('✅ Test-Player erstellt: players/admin-test-uid');
  console.log('   (Echte Player werden automatisch beim Login angelegt)');
}

/**
 * Prüft, ob bereits Daten existieren
 */
async function checkExistingData(): Promise<boolean> {
  const regionsRef = collection(db, 'worlds', WORLD_ID, 'regions');
  const snapshot = await getDocs(regionsRef);

  return !snapshot.empty;
}

/**
 * Interaktive Bestätigung
 */
function askConfirmation(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question + ' (y/n): ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * Main Setup Function
 */
async function main() {
  console.log('🚀 Firestore Setup für Steampunk Stories');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 Firebase Project: ${firebaseConfig.projectId}`);
  console.log(`🌍 World ID: ${WORLD_ID}`);

  try {
    // Check ob Daten existieren
    const hasData = await checkExistingData();

    if (hasData) {
      console.log('\n⚠️  WARNUNG: Es existieren bereits Regions in der Datenbank!');
      const proceed = await askConfirmation('Möchtest du trotzdem fortfahren? (überschreibt keine Daten, fügt nur hinzu)');

      if (!proceed) {
        console.log('❌ Setup abgebrochen.');
        process.exit(0);
      }
    }

    // Setup durchführen
    await setupWorlds();
    await setupRegions();
    await setupTestPlayers();

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Firestore Setup erfolgreich abgeschlossen!');
    console.log('\n📝 Nächste Schritte:');
    console.log('   1. npm run dev');
    console.log('   2. Login mit admin / admin');
    console.log('   3. Galaxy-Ansicht öffnen');
    console.log('\n💡 Tipp: Die Firestore-Daten kannst du in der Firebase Console ansehen:');
    console.log(`   https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore`);

  } catch (error) {
    console.error('\n❌ Fehler beim Setup:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Script ausführen
main();
