# Äther-Imperium: Chroniken des Dampfs

Ein Vite + React Prototyp für die Steampunk-Raiders Verwaltungssimulation.

## Voraussetzungen

- Node.js 18+
- npm 9+

## Lokale Entwicklung

0. Setup-Skript ausführen (legt `.env.local` an und installiert Dependencies, wenn nötig):
   ```bash
   ./scripts/setup.sh
   ```
1. Abhängigkeiten installieren:
   ```bash
   npm install
   ```
2. Entwicklungsserver starten:
   ```bash
   npm run dev
   ```
3. Production-Build prüfen:
   ```bash
   npm run build
   ```
4. Typprüfung ausführen:
   ```bash
   npm run typecheck
   ```
5. Linting anstoßen:
   ```bash
   npm run lint
   ```
6. Testsuite starten:
   ```bash
   npm run test
   ```

### Schnellstart-Skript f�r VS Code

Im integrierten VS Code Terminal gen�gt:

```powershell
powershell -ExecutionPolicy Bypass -File .\start-game.ps1
```

- Installiert fehlende Abhängigkeiten automatisch (abschaltbar mit `-SkipInstall`).
- Startet den Vite-Dev-Server mit geöffnetem Browser-Tab auf `http://localhost:5173/`.

## Projektstruktur

```
.
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── src/
    ├── App.tsx
    ├── components/
    ├── constants.ts
    ├── hooks/
    ├── lib/
    ├── main.tsx
    ├── store/
    └── types.ts
```

- `src/` enthält den kompletten Anwendungscode.
- Der `@`-Alias verweist auf `src/` und verhindert tiefe Relative-Imports.
- Jede exportierte Funktion besitzt eine kurze JSDoc-Beschreibung.

## Umgebungsvariablen

Die Anwendung erwartet folgende Variablen in `.env.local`:

```
VITE_BASE_URL=/<optional Subpfad>
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_WORLD_ID=playtest-world
```

Ohne Firebase-Konfiguration läuft der Client im Offline-Demomodus, unterstützt aber Login und Karteninteraktion nur mit Mock-Daten.

## Projektstatus

## Firebase Backend

### Authentifizierung & Standardzugang

- Die Login-Maske verwendet Benutzername/Passwort. Der Benutzername wird intern zu `@steampunk.local` ergänzt, damit Firebase mit E-Mail/Passwort arbeiten kann.
- Beim ersten Start versucht der Client automatisch, den Zugang `admin / admin` anzulegen (`ensureDefaultAdmin`). Das funktioniert nur, wenn im Firebase-Projekt "E-Mail/Passwort" aktiviert ist.
- Ohne Firebase-Konfiguration akzeptiert der Client weiterhin `admin / admin1` im Offline-Modus.

### Firestore-Struktur

- `worlds/{worldId}` – Metadaten zum Spieluniversum.
- `worlds/{worldId}/regions/{regionId}` – Hex-Cluster (RQ/RR) mit Tile-Unterkollektion.
- `worlds/{worldId}/regions/{regionId}/tiles/{q_r}` – Tile-Biome inkl. optionaler Siedlung (`settlement`).
- `worlds/{worldId}/units/{unitId}` – Einheiten mit `ownerId`, Tempo, Druckkapazität usw.
- `worlds/{worldId}/convoys/{convoyId}` – Serverseitige Missionsaufträge (State-Maschine).

### Cloud Functions

- `functions/src/index.ts` stellt `createConvoy` (callable) und `convoyTick` (Pub/Sub Cron) bereit.
- Build: `cd functions && npm run build` (nutzt `tsup`, Ziel: Node 20 CommonJS).
- Deployment: `firebase deploy --only functions` (Service-Account via GitHub Actions `FIREBASE_SERVICE_ACCOUNT`).

### Hosting & Staging

- `firebase.json` enthält SPA-Rewrite-Regeln für Vite.
- `./.github/workflows/deploy.yml` (neu erstellen) kann Firebase Hosting automatisieren – Secrets erforderlich: `FIREBASE_SERVICE_ACCOUNT`.
- Für lokale Previews `firebase emulators:start --only hosting,functions,firestore` nutzen (nach `npm run build`).

### Erledigt
- Vollständige Mock-Galaxie mit ~3 000 Systemen, Spielern und Allianzen generiert (`src/lib/mockFactory.ts`).
- Galaxy-Ansicht auf Version 3 gehoben: virtualisierte Tabelle, aggregierte Hex-Karte, System-Modal und Deep-Linking.
- Clientseitige Banden-/Allianz-Verwaltung, Spieler-Verzeichnis und Messaging-Sidebar eingeführt.
- UX- und Mobile-Pass umgesetzt (Sticky-Topbar-Schatten, konsistente Cards, Mobile-Toolbar, Fokusmarkierungen).
- Qualitätssicherung (Linting, Tests, Typecheck, Build) in npm-Skripten verankert.

### Offen
- Galaxy- und Messaging-Leistung unter hoher Interaktion weiter beobachten und bei Bedarf optimieren.
- Allianz- und Chat-Flows perspektivisch mit echten Backend-Endpunkten verbinden.
- Erweiterte Gameplay-Effekte (Forschung, Missionen) und zusätzliche UI-Feedback-Schichten ausarbeiten.

## Hex-Map aus Tiled integrieren

Diese Checkliste fasst alle Schritte zusammen, die notwendig sind, um neue Hex-Terrain-Assets aus dem Tiled Map Editor einzubinden.

### 1. Grafik-Assets vorbereiten
- **Format:** Einzelne PNG-Dateien mit 256 × 256 px, transparenter Hintergrund empfohlen.
- **Ablageort:** `public/assets/tiles256/`. Keine zusätzlichen Unterordner oder ZIP-Archive im Repository belassen.
- **Benennung:** Konsistentes Schema (`<biome>_biom.png`), damit Tileset-IDs vorhersagbar bleiben.
- **Style-Hinweis:** Sprites als flache Top-Down-Illustrationen liefern; Schlagschatten und Glanz übernimmt das SVG-Rendering der `HexTile`-Komponente.

### 2. Tileset in Tiled konfigurieren
- In Tiled ein externes Tileset vom Typ "Bildsammlung" anlegen und `public/assets/tiles256/biomes.tsx` als Speicherort verwenden.
- Jedes neue PNG im Tileset registrieren. Tiled vergibt die Tile-IDs automatisch; sie landen später als `gid` im `.tmj`-Export.
- Falls weitere Tilesets nötig sind, zusätzliche `.tsx`-Dateien im gleichen Ordner ablegen und im Map-File referenzieren.

### 3. Karte exportieren
- Kartenformat: Hex (staggered), pointy top, Odd-R Layout. Tile-Größe auf 256 px setzen, damit die GIDs mit den Canvas-Berechnungen korrespondieren.
- Exportziel: `public/maps/<name>.tmj`. Pfadangaben im Map-File bleiben relativ und zeigen auf die `.tsx`-Tilesets.
- Vor dem Commit sicherstellen, dass keine Layer leer exportiert werden; der Loader verarbeitet nur `tilelayer`-Einträge.

### 4. Projektkonfiguration aktualisieren
- `public/assets/tiles256/biomes.tsx`: Neue `<tile>`-Einträge erhalten automatisch die passenden Bildpfade. Prüfen, dass `source="<png-name>"` stimmt.
- `src/constants.ts` (bzw. die betroffene Biome-Konfiguration): Neues Biome mit Sprite-URL und Hex-Farbthema registrieren.
- `src/lib/tiled.ts`: Falls neue Tilesets verwendet werden, dort die GID-Offsets ergänzen. Der Loader liest aktuell das erste Tileset (`tilesets[0]`).
- `src/components/galaxy/HexMap.tsx`: Falls eine alternative Map geladen werden soll, den Pfad in `loadTerrainFromTiled('/maps/…')` anpassen.

### 5. Validierung
- Entwicklungsserver starten und zur Galaxy-Ansicht navigieren; prüfen, ob neue Hexes erscheinen und korrekt schattiert werden.
- Auf Fehlermeldungen in der Browser-Konsole achten (z. B. 404 für fehlende Sprites oder Tilesets).
- Vor dem Commit `npm run build` ausführen, damit TSC sicherstellt, dass alle Loader-Änderungen typisiert sind.

### 6. Bekannter Wartungspunkt
- Der Terrain-Loader importiert `TerrainTile` derzeit aus `@/components/galaxy/terrain/HexTerrain`. Sobald neue Assets integriert werden, den Import auf `@/components/galaxy/terrain/HexTerrainCanvas.types` korrigieren, um Typsicherheitswarnungen zu vermeiden.
