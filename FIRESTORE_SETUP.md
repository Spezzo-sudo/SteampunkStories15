# 🔥 Firestore Setup Anleitung

Diese Anleitung erklärt, wie du die Firestore-Datenbank für dein Steampunk Stories Spiel einrichtest.

---

## 📋 Voraussetzungen

✅ Firebase-Projekt existiert (game-a86c9)
✅ `.env` Datei mit Firebase-Credentials vorhanden
✅ Node.js 18+ installiert

---

## 🚀 Schnellstart (Automatisch)

### 1. Dependencies installieren

```bash
npm install
```

Dies installiert `tsx` (TypeScript Executor) für das Setup-Script.

### 2. Setup-Script ausführen

```bash
npm run setup:firestore
```

Das Script erstellt automatisch:
- ✅ World-Dokument: `worlds/playtest-world`
- ✅ 19 Regions mit je ~7 Hex-Tiles
- ✅ Test-Player-Dokument

**WICHTIG:** Wenn bereits Daten existieren, fragt das Script nach Bestätigung!

### 3. Security Rules deployen

```bash
firebase deploy --only firestore:rules
```

Dies aktiviert die aktualisierten Zugriffsrechte in Firestore.

### 4. Fertig!

```bash
npm run dev
```

Login mit `admin / admin` → Galaxy-Ansicht öffnen → Map sollte nun die 19 Regions anzeigen!

---

## 🛠️ Manuelle Einrichtung (Alternative)

Falls das automatische Script nicht funktioniert, kannst du die Struktur manuell in der Firebase Console erstellen:

### Schritt 1: World-Dokument erstellen

1. Öffne Firebase Console: https://console.firebase.google.com/
2. Navigiere zu: **Firestore Database** → **Daten**
3. Collection `worlds` existiert bereits
4. Klicke auf `worlds` → Dokument `playtest-world`
5. Überprüfe, dass es ein Feld `name = "Playtest World"` hat

### Schritt 2: Regions-Subcollection erstellen

1. Im Dokument `playtest-world` nach unten scrollen
2. Klick auf **Sammlung erstellen**
3. Sammlung-ID: `regions`
4. Erstes Dokument erstellen:
   - **Dokument-ID:** `reg-0-0`
   - **Felder:**
     ```
     name: "Zentrum" (string)
     RQ: 0 (number)
     RR: 0 (number)
     ```

### Schritt 3: Tiles-Subcollection erstellen

1. In der Region `reg-0-0` nach unten scrollen
2. Klick auf **Sammlung erstellen**
3. Sammlung-ID: `tiles`
4. Erstes Tile erstellen:
   - **Dokument-ID:** `0_0`
   - **Felder:**
     ```
     q: 0 (number)
     r: 0 (number)
     biome: "PLAINS" (string)
     settleable: true (boolean)
     ```

### Schritt 4: Weitere Regions hinzufügen (optional)

Wiederhole Schritt 2 für mehr Regions. Empfohlene Layout (Hex-Grid):

**Ring 1 (um Zentrum):**
- `reg-1-0`: name="Nord", RQ=1, RR=0
- `reg-0--1`: name="Ost", RQ=0, RR=-1
- `reg--1-0`: name="Süd", RQ=-1, RR=0
- `reg-0-1`: name="West", RQ=0, RR=1
- `reg-1--1`: name="Nordost", RQ=1, RR=-1
- `reg--1-1`: name="Südwest", RQ=-1, RR=1

**Ring 2 (äußerer Ring):**
- `reg-2-0`, `reg-2--1`, `reg-2--2`, `reg-1--2`, `reg-0--2`, `reg--1--1`
- `reg--2-0`, `reg--2-1`, `reg--2-2`, `reg--1-2`, `reg-0-2`, `reg-1-1`

---

## 🔒 Security Rules

Die aktualisierten Rules in `firestore.rules` bieten:

### Player Profiles
- ✅ Alle authentifizierten User können Profile lesen
- ✅ Jeder kann nur sein eigenes Profil bearbeiten
- ❌ Keine Löschung erlaubt

### Worlds & Regions
- ✅ Alle können World-Daten lesen
- ❌ Nur Server/Admin kann schreiben
- ✅ Tiles können von authentifizierten Usern modifiziert werden (für Settlement-Placement)

### Units & Convoys
- ✅ Jeder kann alle Units sehen
- ✅ Nur Owner kann eigene Units erstellen/modifizieren
- ✅ Convoys nur durch Owner erstellbar, Updates nur via Cloud Functions

**Rules deployen:**
```bash
firebase deploy --only firestore:rules
```

---

## 📊 Firestore-Struktur (Übersicht)

```
firestore/
├── players/
│   └── {userId}
│       ├── uid: string
│       ├── name: string
│       └── hasPlacedHome: boolean
│
└── worlds/
    └── playtest-world/
        ├── name: string
        ├── regions/
        │   └── {regionId}
        │       ├── name: string
        │       ├── RQ: number
        │       ├── RR: number
        │       └── tiles/
        │           └── {q}_{r}
        │               ├── q: number
        │               ├── r: number
        │               ├── biome: string
        │               ├── settleable: boolean
        │               ├── ownerId?: string
        │               └── allianceId?: string
        │
        ├── units/
        │   └── {unitId}
        │       ├── ownerId: string
        │       ├── speed: number
        │       └── ...
        │
        └── convoys/
            └── {convoyId}
                ├── ownerId: string
                ├── origin: Ax
                ├── target: Ax
                └── ...
```

---

## ⚠️ Wichtige Hinweise

### .env Datei ist NICHT in Git!

**KRITISCH:** Deine `.env` Datei enthält sensible Firebase API Keys und sollte **NIEMALS** ins Git committed werden!

```bash
# Falls .env bereits im Git ist, entfernen:
git rm --cached .env

# .env ist jetzt in .gitignore
```

Für andere Entwickler: Kopiere `.env.example` zu `.env` und füge deine Credentials ein.

### Firebase API Key rotieren (Sicherheit)

Falls deine API Keys versehentlich öffentlich wurden:

1. Firebase Console → **Projekteinstellungen** → **Allgemein**
2. Unter **Ihre Apps** → **Web-App** → **Firebase SDK snippet**
3. Klick auf "Regenerate" (falls verfügbar) ODER:
4. Firebase Console → **Authentifizierung** → **Einstellungen** → **Autorisierte Domains** prüfen

**Wichtig:** Firebase Web-API-Keys sind öffentlich, ABER durch Firestore Security Rules geschützt!

---

## 🧪 Daten validieren

### In der Firebase Console:

1. https://console.firebase.google.com/project/game-a86c9/firestore
2. Navigiere zu: `worlds` → `playtest-world` → `regions`
3. Du solltest Dokumente sehen: `reg-0-0`, `reg-1-0`, etc.
4. Klicke auf eine Region → `tiles` → Du solltest Tiles sehen: `0_0`, `1_0`, etc.

### Im Spiel:

1. `npm run dev`
2. Login mit `admin / admin`
3. Navigiere zur **Galaxy-Ansicht**
4. Die Macro-Map sollte 19 Hex-Regions anzeigen
5. Klicke auf eine Region → Die Micro-Map sollte die Tiles anzeigen

---

## 🐛 Troubleshooting

### "Firebase has not been initialized"

**Problem:** `.env` Datei fehlt oder Variablen sind falsch.

**Lösung:**
```bash
# Kopiere .env.example
cp .env.example .env

# Füge deine Firebase Credentials ein (in .env)
```

### "Permission denied" beim Firestore-Zugriff

**Problem:** Security Rules wurden noch nicht deployed.

**Lösung:**
```bash
firebase deploy --only firestore:rules
```

### Setup-Script schlägt fehl

**Problem:** `tsx` ist nicht installiert.

**Lösung:**
```bash
npm install -D tsx
npm run setup:firestore
```

### Regions werden nicht in der Map angezeigt

**Problem:** Firestore-Daten nicht korrekt strukturiert.

**Lösung:**
1. Überprüfe in Firebase Console: `worlds/playtest-world/regions/reg-0-0`
2. Felder müssen exakt sein: `RQ` (number), `RR` (number), `name` (string)
3. Tiles müssen als Subcollection existieren: `regions/reg-0-0/tiles/0_0`

---

## 📝 Nächste Schritte

Nach erfolgreichem Setup:

1. ✅ **Player-Game-State implementieren**
   - Ressourcen, Gebäude, Forschung ins Firestore verschieben
   - Game-Tick als Cloud Function

2. ✅ **Real-Time Sync aktivieren**
   - Zustand mit `onSnapshot()` statt Polling synchronisieren

3. ✅ **Multiplayer-Features**
   - Alliance-System mit Backend
   - Chat mit Firestore Messages-Collection
   - Leaderboards

4. ✅ **Security verbessern**
   - Validierung von Settlement-Placement in Rules
   - Rate-Limiting für API-Calls

---

## 💡 Support

Bei Problemen:
1. Überprüfe Firebase Console Logs: https://console.firebase.google.com/project/game-a86c9/functions/logs
2. Browser Developer Console (F12) auf Fehler prüfen
3. Script mit Debug-Logging ausführen: `DEBUG=* npm run setup:firestore`

---

**Viel Erfolg! 🚀**
