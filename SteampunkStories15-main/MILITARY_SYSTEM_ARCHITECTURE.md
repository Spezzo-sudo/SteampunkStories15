# MILITÄRSYSTEM ARCHITEKTUR - FINAL VERSION
## Mit Multi-Settlement & Dezentraler Truppenverwaltung

---

## 1. KERNKONZEPT: REGIONALISIERTE FLOTTENVERWALTUNG

### Problem mit originalem Plan:
❌ Behandelt Truppen als "globale Spieler-Flotte"
❌ Ignores multiple Siedlungen & deren Autonomie
❌ Keine Logistik zwischen Basen

### Corrected Architecture:
✅ **Jede Siedlung** hat eigene:
- Flotte (stationed und verfügbar)
- Ressourcen (lokale Lagerung)
- Defensive Strukturen
- Bauqueues

✅ **Spieler** fungiert als:
- Kommandant über mehrere Basen
- Kann Truppen zwischen Basen koordinieren
- Muss strategisch entscheiden welche Base welche Operation durchführt

---

## 2. DATENBANK-ARCHITEKTUR (REVIDIERT)

### Tiles → Settlements Mapping
```sql
-- Ein Tile kann eine Siedlung haben
ALTER TABLE tiles ADD COLUMN settlement_id UUID REFERENCES settlements(id);
ALTER TABLE tiles ADD COLUMN is_settlement BOOLEAN DEFAULT FALSE;

-- Zentrale Settlements Tabelle
CREATE TABLE settlements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  tile_id TEXT NOT NULL REFERENCES tiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  settlement_level INTEGER DEFAULT 1,

  -- Lokale Ressourcen-Speicherung
  orichalkum INTEGER DEFAULT 0,
  orichalkum_capacity INTEGER DEFAULT 1000,
  fokuskristalle INTEGER DEFAULT 0,
  fokuskristalle_capacity INTEGER DEFAULT 1000,
  vitriol INTEGER DEFAULT 0,
  vitriol_capacity INTEGER DEFAULT 1000,

  -- Energie
  energy_production INTEGER DEFAULT 0,
  energy_consumption INTEGER DEFAULT 0,

  -- Verwaltung
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_harvested TIMESTAMPTZ
);

-- Flotten sind IMMER an Settlements gebunden
ALTER TABLE ships ADD COLUMN settlement_id UUID REFERENCES settlements(id);
ALTER TABLE ships ADD COLUMN current_tile_id TEXT REFERENCES tiles(id);

-- Convoys kennen Start + End Settlement
ALTER TABLE convoys ADD COLUMN origin_settlement_id UUID REFERENCES settlements(id);
ALTER TABLE convoys ADD COLUMN target_tile_id TEXT REFERENCES tiles(id);
ALTER TABLE convoys ADD COLUMN ship_ids UUID[];

-- Defensive Strukturen pro Tile
CREATE TABLE defenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  settlement_id UUID NOT NULL REFERENCES settlements(id) ON DELETE CASCADE,
  tile_id TEXT NOT NULL REFERENCES tiles(id) ON DELETE CASCADE,
  defense_type TEXT NOT NULL,
  level INTEGER DEFAULT 1,
  hull_integrity INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scout Reports (spieler-zentral, aber mit Origin-Settlement)
CREATE TABLE scout_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  origin_settlement_id UUID NOT NULL REFERENCES settlements(id),
  target_tile_id TEXT NOT NULL REFERENCES tiles(id),
  intel_level INTEGER NOT NULL CHECK (intel_level >= 1 AND intel_level <= 5),
  report_data JSONB NOT NULL,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Battle Reports
CREATE TABLE battles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attacker_id UUID NOT NULL REFERENCES players(id),
  attacker_settlement_id UUID REFERENCES settlements(id),
  defender_id UUID NOT NULL REFERENCES players(id),
  defender_settlement_id UUID REFERENCES settlements(id),
  tile_id TEXT NOT NULL REFERENCES tiles(id),
  convoy_id UUID REFERENCES convoys(id),

  status TEXT NOT NULL DEFAULT 'ongoing',

  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,

  -- Kampf-Details
  attacker_ships JSONB,
  defender_ships JSONB,
  defenses_involved JSONB,

  battle_report JSONB,
  resources_plundered JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 3. SETTLEMENT-ZENTRISCHE SPIELLOGIK

### Settlement als Operationsbasis:

```
SETTLEMENT FUNCTIONS:
├─ Hub für lokale Truppen
├─ Ressourcen-Lager
├─ Defensive Strukturen
├─ Production & Building Queues
├─ Navy Yard für Schiffbau
├─ Refuel/Repair Station
└─ Command Center für Operationen
```

### Truppenbewegung zwischen Settlements:

**Szenario: Spieler hat 2 Siedlungen**

```
Settlement A (Rußklippen)        Settlement B (Kupferdamm)
├─ 3 Korvetten                   ├─ 5 Fregatten
├─ 2 Frachter                    ├─ 1 Späherdrohne
└─ Verteidigung: 2 Tesla         └─ Verteidigung: 4 Tesla

PLAYER DECISION:
"Attackiere Feind-Tile mit:
 - 2 Korvetten von Settlement A
 - 2 Fregatten von Settlement B"

IMPLICATIONS:
1. Beide Flotten starten zur gleichen Zeit
2. Unterschiedliche Reisezeiten (verschiedene Entfernungen)
3. Konvoi könnte aufgesplittet ankommen → verschiedene Battle-Waves
4. Oder: Koordination = später ankommen zusammen
```

---

## 4. ARCHITEKTUR-LAYER (REVIDIERT)

### A. DATA LAYER (Supabase)

```typescript
// src/data/types.ts - UPDATED

interface Settlement {
  id: string;
  playerId: string;
  tileId: string;
  name: string;
  level: number;

  // Lokale Ressourcen
  resources: {
    orichalkum: number;
    fokuskristalle: number;
    vitriol: number;
  };
  capacities: {
    orichalkum: number;
    fokuskristalle: number;
    vitriol: number;
  };

  // Energie
  energy: {
    production: number;
    consumption: number;
    current: number;
  };

  // Flotte (diese Settlement)
  baseShipIds: string[]; // Ships stationed here

  // Defenses (auf diesem Tile)
  defenseIds: string[];
}

interface Ship {
  id: string;
  playerId: string;
  settlementId: string; // HOME BASE
  blueprintId: string;
  name: string;

  // Status
  status: 'stationed' | 'preparing' | 'en_route' | 'in_combat' | 'damaged';
  currentTileId?: string; // Wo ist das Schiff gerade?
  convoyId?: string; // Falls in Konvoi unterwegs

  // Health
  hullIntegrity: number; // 0-100

  // Stats
  attack: number;
  defense: number;
  speed: number;
  cargoCapacity: number;
  currentCargo: Resources;
}

interface Convoy {
  id: string;
  playerId: string;
  originSettlementId: string;
  targetTileId: string;

  // Schiffe in diesem Konvoi
  shipIds: string[];

  missionType: 'scout' | 'attack' | 'transport' | 'station' | 'colonize';

  // Zeitliche Ablauf
  status: 'preparing' | 'en_route' | 'arrived' | 'completed' | 'cancelled';
  preparationEndsAt: Date;
  departureTime: Date;
  arrivalTime: Date;

  // Cargo (für Transport)
  cargo: Resources;

  // Path (optional, für animation)
  path: Hex[];
  pathIndex: number;
}

interface Battle {
  id: string;
  attackerId: string;
  attackerSettlementId: string;
  defenderId: string;
  defenderSettlementId: string;

  tileId: string;
  convoyId: string;

  status: 'ongoing' | 'attacker_won' | 'defender_won' | 'stalemate';

  forces: {
    attackerShips: Ship[];
    defenderShips: Ship[];
    defenses: Defense[];
  };

  battleReport: BattleReport;
}
```

### B. STORE LAYER (Zustand)

```typescript
// src/store/settlementStore.ts - NEUE STORE

interface SettlementState {
  // Settlement Management
  settlements: Settlement[];
  selectedSettlementId: string | null;

  // Settlement-basierte Flotten
  shipsBySettlement: Map<string, Ship[]>;

  // Convoys (settlement-centric view)
  outgoingConvoys: Convoy[]; // Von meinen Settlements
  incomingConvoys: Convoy[]; // Zu meinen Settlements

  // Combat
  activeBattles: Battle[];
  battleReports: BattleReport[];

  // Scout Intelligence
  scoutReports: ScoutReport[];
}

interface SettlementActions {
  // Settlement Selection & Management
  selectSettlement: (settlementId: string) => void;
  loadSettlements: (playerId: string) => Promise<void>;

  // Fleet Management - SETTLEMENT AWARE
  getAvailableShips: (settlementId: string) => Ship[];

  // Mission Planning - FROM SPECIFIC SETTLEMENT
  planScoutMission: (
    originSettlementId: string,
    shipIds: string[],
    targetTileId: string
  ) => void;

  planAttackMission: (
    originSettlementId: string,
    shipIds: string[],
    targetTileId: string
  ) => void;

  planStationMission: (
    originSettlementId: string,
    shipIds: string[],
    targetTileId: string
  ) => void;

  // Multi-Settlement Operations
  planCoordinatedAttack: (
    attackPlan: {
      settlementId: string;
      shipIds: string[];
      targetTileId: string;
      delaySeconds?: number;
    }[]
  ) => void;

  // Execute & Manage
  executeConvoy: (convoyId: string) => Promise<void>;
  cancelConvoy: (convoyId: string) => Promise<void>;

  // Realtime Updates
  subscribeToMilitaryEvents: () => void;
}

// src/store/militaryStore.ts - ERGÄNZT FÜR MULTI-BASE

interface MilitaryStore {
  // Dezentrale Flotten-Verwaltung
  shipsPerSettlement: Map<settlementId, Ship[]>;

  // Mission Planning
  activeMissions: Map<settlementId, Convoy[]>;

  // Intelligence Network
  scoutNetworks: ScoutReport[];

  // Strategic View
  territoryControl: Map<tileId, { owner: string; defendedBy?: string }>;
}
```

### C. API LAYER (Supabase Services)

```typescript
// src/services/supabase/militaryApi.ts - REVIDIERT

export const militaryApi = {
  // Scout - von einer Settlement aus
  async scoutFromSettlement(
    playerId: string,
    settlementId: string,
    shipIds: string[],
    targetTileId: string
  ): Promise<Convoy> {
    return supabase.from('convoys').insert({
      player_id: playerId,
      origin_settlement_id: settlementId,
      target_tile_id: targetTileId,
      ship_ids: shipIds,
      mission_type: 'espionage',
      status: 'preparing',
      preparation_ends_at: new Date(Date.now() + 5 * 60 * 1000),
    });
  },

  // Attack - mit Unterstützung für Multi-Base Operations
  async attackFromSettlement(
    playerId: string,
    settlementId: string,
    shipIds: string[],
    targetTileId: string
  ): Promise<Convoy> {
    // Validate ships belong to settlement
    const ships = await supabase
      .from('ships')
      .select('*')
      .eq('settlement_id', settlementId)
      .in('id', shipIds);

    // Create convoy
    return supabase.from('convoys').insert({
      player_id: playerId,
      origin_settlement_id: settlementId,
      target_tile_id: targetTileId,
      ship_ids: shipIds,
      mission_type: 'attack',
      status: 'preparing',
    });
  },

  // Station - Flotte defensiv auf Tile platzieren
  async stationFromSettlement(
    playerId: string,
    settlementId: string,
    shipIds: string[],
    targetTileId: string
  ): Promise<Convoy> {
    return supabase.from('convoys').insert({
      player_id: playerId,
      origin_settlement_id: settlementId,
      target_tile_id: targetTileId,
      ship_ids: shipIds,
      mission_type: 'station',
      status: 'preparing',
    });
  },

  // Multi-Settlement Attack (koordinierte Angriffe)
  async coordinateMultiSettlementAttack(
    playerId: string,
    attacks: {
      settlementId: string;
      shipIds: string[];
      targetTileId: string;
      delaySeconds?: number;
    }[]
  ): Promise<Convoy[]> {
    const convoys = attacks.map(attack => ({
      player_id: playerId,
      origin_settlement_id: attack.settlementId,
      target_tile_id: attack.targetTileId,
      ship_ids: attack.shipIds,
      mission_type: 'attack',
      status: 'preparing',
      preparation_ends_at: new Date(
        Date.now() + 5 * 60 * 1000 + (attack.delaySeconds || 0) * 1000
      ),
    }));

    return supabase.from('convoys').insert(convoys);
  },

  // Get available ships for a settlement
  async getSettlementShips(
    playerId: string,
    settlementId: string
  ): Promise<Ship[]> {
    return supabase
      .from('ships')
      .select('*')
      .eq('player_id', playerId)
      .eq('settlement_id', settlementId)
      .eq('status', 'stationed');
  },

  // Get all settlements for a player
  async getPlayerSettlements(playerId: string): Promise<Settlement[]> {
    return supabase
      .from('settlements')
      .select('*')
      .eq('player_id', playerId);
  },
};
```

### D. UI COMPONENTS (Settlement-centric)

```typescript
// src/components/galaxy/SettlementHUD.tsx - NEUE KOMPONENTE

/**
 * Settlement Command Center
 * Shows:
 * - List of all player settlements
 * - Available ships per settlement
 * - Outgoing & incoming missions
 * - Settlement resources & status
 */

// src/components/galaxy/FleetSelector.tsx - UPDATED

interface Props {
  originSettlementId: string; // KRITISCH: Welche Base?
  targetTileId: string;
  availableShips: Ship[]; // Ships von dieser Settlement
  onConfirm: (shipIds: string[]) => void;
}

// Shows only ships from selected settlement
// Displays: Name, Type, Attack/Defense, Status
// Can select multiple (checkbox list)

// src/components/galaxy/MilitaryOperationsPanel.tsx - NEUE KOMPONENTE

/**
 * Multi-Settlement Operation Planner
 *
 * Shows:
 * - Map of all friendly settlements
 * - Ability to select multiple settlements
 * - Ships available from each
 * - Coordinate simultaneous/delayed attacks
 * - Preview combined fleet power
 * - Show ETA from each settlement
 */

// src/components/galaxy/popups/TileActionPopup.tsx - UPDATED

// Wenn man auf einen Tile klickt:
// 1. Show tile owner & defenses
// 2. If enemy tile:
//    - Show which settlements can attack
//    - Show travel time from each settlement
//    - Let player choose "Scout from A", "Attack from B", etc.
```

---

## 5. GAMEPLAY FLOW - MULTI-SETTLEMENT EXAMPLE

### Szenario: Spieler mit 3 Siedlungen plant Angriff

```
PLAYER HAS:
- Settlement A (Rußklippen): 5 Korvetten, 2 Frachter
- Settlement B (Kupferdamm): 3 Fregatten, 1 Äthergoliath
- Settlement C (Dampfwiesen): 2 Sturmkreuzer, 1 Aufklärer

TARGET: Enemy tile at (2, -1) in region

PLAYER STRATEGY:
"Send coordinated attack from A & B, delayed so they arrive together"

UI FLOW:
1. Click enemy tile
   └─> TileActionPopup shows:
       - Owner: "Player X"
       - Defenses: "3x Tesla, 2x Dampfkanone"
       - Scouted?: "Yes (Intel Level 3)"

2. Click "Attack"
   └─> MilitaryOperationsPanel opens
       - Map shows all 3 settlements
       - Settlement A: "5 Korvetten available" (200 units to target)
       - Settlement B: "3 Fregatten + Äthergoliath" (150 units to target)
       - Settlement C: "Too far, would arrive too late"

3. Player selects:
   - Settlement A: Select 3 Korvetten + 2 Frachter
   - Settlement B: Select 3 Fregatten + Äthergoliath
   - Delays: A departs immediately, B departs 2 min later
   - Result: Both arrive in 5 minutes with coordinated strike

4. Click "Execute"
   └─> Create 2 Convoys:
       - Convoy 1: A → Target (5 ships, 0s delay)
       - Convoy 2: B → Target (4 ships, 2min delay)
   └─> Resource deduction from each settlement's reserves
   └─> Toast notifications for each settlement

5. Game tick advances:
   - Convoy 1 status: "preparing" (remaining: 4:55)
   - Convoy 2 status: "preparing" (remaining: 2:55 before departure)
   - Can cancel either convoy independently

6. Convoy 1 arrives (5 min):
   - Battle starts: 5 attacker ships vs defenses + stationed defenders
   - Convoy 2 en route still (will arrive in 2 min)

7. Convoy 2 arrives (7 min):
   - Reinforcements! Join ongoing battle
   - Combined force defeats enemy
   - Territory ownership transfers
   - Resources plundered distributed to both settlements

RESULT:
- Settlement A: Lost 3 ships, gained 200 orichalkum
- Settlement B: Lost 1 ship, gained 300 orichalkum
- Tile now owned by player
- Can place defense or settle with one of the settlements
```

---

## 6. IMPLEMENTATION ROADMAP (REVISED)

### Phase 1: Settlement Foundation (3-4 Tage)
**Aufbau der regionalen Architektur**

```
1. Database:
   - CREATE settlements table
   - ALTER ships (add settlement_id)
   - ALTER convoys (add origin_settlement_id)
   - CREATE defenses table
   - CREATE scout_reports table

2. Data Layer:
   - Create settlementStore.ts
   - Update types.ts (Settlement, Ship, Convoy interfaces)
   - Create settlementApi.ts

3. UI:
   - Create SettlementHUD.tsx (shows all settlements + ships)
   - Update TileActionPopup to show settlement options
   - Create SettlementSelector component

4. Logic:
   - Load settlements on game start
   - Display available ships per settlement
   - Track convoy origins
```

### Phase 2: Scout System (2-3 Tage)
**Dezentralisierte Ausspäh-Missionen**

```
1. UI:
   - Update FleetSelector (only show settlement's ships)
   - Create ScoutReport component
   - Add "Scout" action to TileActionPopup

2. API:
   - militaryApi.scoutFromSettlement()
   - militaryApi.getSettlementShips()

3. Logic:
   - Scout convoy execution
   - Intel level calculation
   - Scout report generation

4. Game Logic:
   - Handle scout mission completion in advanceMissions()
```

### Phase 3: Stationing (2 Tage)
**Regionale Flotten-Stationierung**

```
1. UI:
   - Add "Station Fleet" action
   - StationedFleetView component
   - Show stationed fleets on map

2. API:
   - militaryApi.stationFromSettlement()
   - Ships update to "stationed" on target tile

3. Game Logic:
   - Track stationed ships per tile
   - Remove from settlement inventory
   - Available for defense
```

### Phase 4: Combat System (4-5 Tage)
**Multi-Settlement Kampf-Auflösung**

```
1. Database:
   - CREATE battles table
   - Defenses implementation

2. UI:
   - MilitaryOperationsPanel (multi-settlement planning)
   - BattleReport component
   - Defense builder

3. API:
   - militaryApi.attackFromSettlement()
   - militaryApi.coordinateMultiSettlementAttack()

4. Edge Functions:
   - resolve-convoy (handles scout/station/attack)
   - combat-tick (ongoing battles)
   - Send battle notifications

5. Game Logic:
   - Combat calculation
   - Territory transfer
   - Plunder distribution per settlement
```

### Phase 5: Advanced Features (ongoing)
```
- Alliance coordinated attacks
- Naval blockades
- Supply lines between settlements
- War declarations
- Peace treaties
- Refugee mechanics
```

---

## 7. KRITISCHE DESIGNENTSCHEIDUNGEN

### A. Ship Location Management

**Decision: Ships haben IMMER einen "home settlement"**
- Schiffe sind an Settlement gebunden
- Wenn im Konvoi, haben sie zusätzlich current_tile_id
- Nach Mission kehren zum home settlement zurück (oder neuen Standort)

### B. Resource Management

**Decision: Jede Settlement hat eigene Ressourcen-Speicher**
- Verhindert "pooling" aller Ressourcen
- Macht Logistik-Entscheidungen strategisch interessant
- Ermöglicht Blockade-Mechaniken später

### C. Combat Between Multiple Settlements

**Decision: Alle beteiligten Ships in einer Battle**
- Wenn 2 Convoys gleichzeitig ankommen → Combined Battle
- Wenn versetzt → Sequentielle Battles oder Verstärkungen
- Defender kann Verstärkungen von anderen Settlements senden (later)

### D. Travel Time Calculation

**Decision: Kürzester Weg von Settlement → Target**
- Nicht von aktueller Schiff-Position
- Berücksichtigt Fleet Speed (slowstes Schiff bestimmt)
- Optional: Multi-settlement delays für Synchronisation

---

## 8. CODE ORGANIZATION (Final)

```
src/
├─ store/
│  ├─ settlementStore.ts ★ NEW - Settlement Management Hub
│  ├─ militaryStore.ts ★ UPDATED - Multi-settlement operations
│  └─ mapStore.ts (UPDATED - settlement-aware tile selection)
│
├─ services/supabase/
│  ├─ settlementApi.ts ★ NEW
│  └─ militaryApi.ts ★ UPDATED - settlement-centric
│
├─ components/galaxy/
│  ├─ SettlementHUD.tsx ★ NEW - Settlement overview
│  ├─ SettlementSelector.tsx ★ NEW - Choose base for operation
│  ├─ MilitaryOperationsPanel.tsx ★ NEW - Multi-base planner
│  ├─ FleetSelector.tsx ★ UPDATED - Settlement-aware
│  └─ popups/
│     └─ TileActionPopup.tsx (UPDATED - settlement options)
│
├─ lib/
│  ├─ combat.ts ★ NEW
│  ├─ scouting.ts ★ UPDATED
│  └─ settlement.ts ★ NEW - Settlement logic
│
└─ data/types.ts (UPDATED - Settlement, Ship, Convoy)
```

---

## 9. NEXT IMMEDIATE ACTIONS

**Session 1 (JETZT):**
1. ✅ Plan erstellen (DONE)
2. Remove debug logs from current code
3. Commit changes

**Session 2 (NÄCHSTE):**
1. Create settlementStore.ts (multi-settlement foundation)
2. Update data types (Settlement interface)
3. Create database migrations
4. Build SettlementHUD component
5. Update TileActionPopup to show settlement choices

**Session 3:**
1. Create settlementApi.ts
2. Implement scoutFromSettlement flow
3. Create ScoutReport component
4. Test end-to-end scout mission

---

## KEY POINT

**Dies ist NICHT nur ein "Add Scout/Attack buttons" Projekt.**

**Dies ist eine NEUE GAME ARCHITECTURE:**
- Von "Spieler hat eine globale Flotte"
- Zu "Spieler kommandiert regionale Militär-Basen"

Das macht das Spiel:
✅ Strategisch interessanter (Ressourcen Management)
✅ Logistisch komplexer (Flotten-Disposition)
✅ Multiplayer-tauglich (asymmetrische Basen)
✅ Skalierbar (hunderte Spieler mit vielen Basen)

**Jede Entscheidung ab jetzt muss diese dezentrale Architektur respektieren.**

---

Viel Erfolg, bleib sauber - eine echte 1A Architektur! 🎯⚔️
