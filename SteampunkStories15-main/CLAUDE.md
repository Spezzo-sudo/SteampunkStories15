# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Äther-Imperium: Chroniken des Dampfs** is a browser-based steampunk MMO strategy game built with React 19, TypeScript, and Supabase. The game features a hexagonal grid-based galaxy map with 3000+ systems, resource management, fleet missions, and alliance mechanics.

## Development Commands

### Essential Commands
```bash
npm install              # Install dependencies
npm run dev             # Start Vite dev server (http://localhost:5173)
npm run build           # Production build (must pass before committing)
npm run typecheck       # Run TypeScript type checking
npm run lint            # Run ESLint
npm run test            # Run Vitest test suite
npm run test:watch      # Run tests in watch mode
npm run seed:supabase   # Seed Supabase database with regions and tiles
```

### PowerShell Quick Start (Windows)
```powershell
powershell -ExecutionPolicy Bypass -File .\start-game.ps1
```
Automatically installs dependencies and opens browser.

## Architecture Overview

### Technology Stack
- **Frontend**: React 19 + TypeScript 5.8 + Vite 5
- **State Management**: Zustand 5 with Immer middleware
- **Styling**: Tailwind CSS 4 + PostCSS
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **UI Components**: Radix UI, Lucide React icons
- **Testing**: Vitest + Happy DOM

### Coordinate System Architecture

The game uses a **two-level hexagonal grid system** with axial coordinates:

1. **Macro Level** (19 regions in radius-2 disk)
   - Regions positioned at `(RQ, RR)` axial coordinates
   - Centered at `(0, 0)`
   - Renders at ~40px hex radius

2. **Micro Level** (37 tiles per region in radius-3 disk)
   - Tiles positioned at `(q, r)` axial coordinates within region
   - Each tile has biome, optional settlement, ownership
   - Renders at ~48px hex radius

**Key hex math functions** in `src/lib/hexgrid/hex.ts`:
- `axialToPx()` - Convert axial coords to pixel position (flat-top orientation)
- `hexDist()` - Calculate Manhattan distance between hexes
- `disk()` - Generate hex disk of given radius
- `DIRS` - Six direction vectors for neighbor calculation

### State Management Pattern

All stores use **Zustand with Immer** allowing direct mutation syntax:

```typescript
const useGameStore = create<State & Actions>()(
  immer((set, get) => ({
    resources: { Orichalkum: 500, ... },

    // Immer transforms direct mutations into immutable updates
    spendResources: (cost) => set((state) => {
      state.resources[ResourceType.Orichalkum] -= cost[ResourceType.Orichalkum];
    }),
  }))
);
```

**10 Core Stores** (all in `src/store/`):
- `gameStore.ts` - Resources, buildings, research, build queue, game tick
- `mapStore.ts` - World/region/tile selection, viewport, region caching
- `sessionStore.ts` - Supabase auth, player profile lifecycle
- `directoryStore.ts` - Galaxy systems, players, alliances, planets
- `missionStore.ts` - Fleet mission planning & execution timeline
- `allianceStore.ts` - Alliance membership, pacts, messaging rooms
- `messageStore.ts` - Direct & alliance chat
- `shipyardStore.ts` - Ship blueprints & construction queues
- `uiStore.ts` - Toast notifications
- `missionStore.ts` - Mission advancement logic

**Cross-store communication**: Stores can read from others via `.getState()` and subscribe to changes.

### Game Loop & Resource Production

The game tick runs every 1000ms via `useGameTick()` hook:

```typescript
gameTick() called every 1000ms:
  ├─ mapStore.loadRegion() - fetch current region tiles
  ├─ partitionBuildQueue() - complete finished builds
  ├─ calculateKesseldruck() - update energy (steam pressure)
  └─ calculateResourceProductionPerTick() - increase resources

advanceMissions(now) called every tick:
  ├─ Planned → Enroute (at launchAt)
  ├─ Enroute → Completed (at arrivalAt)
  └─ Update planet ownership if conquest/colonization
```

### Component Architecture

**Layout Hierarchy** (`src/components/layout/`):
```
App.tsx
├─ LoginScreen (if not authenticated)
└─ LayoutSwitch (responsive dispatcher)
   ├─ Desktop: LeftNav + TopBar + MainView
   └─ Mobile: TopBar + MainView + MobileNav
```

**Main Views** (`src/components/views/`):
- `OverviewView.tsx` - Dashboard with resources
- `GalaxyView.tsx` - Star systems & planets
- `BuildingsView.tsx` - Construction & production
- `ResearchView.tsx` - Tech tree
- `AllianceView.tsx` - Alliance management

**Galaxy Map System** (`src/components/galaxy/`):

The `HexMap.tsx` component is the core rendering engine:
- Uses **spatial bucketing** (256px buckets) for viewport culling
- Renders 3000+ systems efficiently with virtualization
- SVG-based with Canvas terrain overlay from Tiled maps
- Supports pan/zoom, system filtering, alliance highlighting

Performance optimizations:
1. **Spatial bucketing** - Only renders visible hexes + padding
2. **Memoization** - `useMemo()` for buildLayout, `React.memo` on HexMap
3. **Region caching** - Fetched regions cached in mapStore
4. **Canvas terrain** - foreignObject with canvas instead of SVG paths

### Firebase Data Structure

```
worlds/
├── {worldId}
│   ├── regions/ (subcollection)
│   │   ├── {regionId}
│   │   │   ├── RQ, RR (axial macro coords)
│   │   │   ├── name, allianceId
│   │   │   └── tiles/ (subcollection)
│   │   │       └── {q_r}
│   │   │           ├── q, r (axial micro coords)
│   │   │           ├── biome
│   │   │           └── settlement? { playerId, icon }
│   ├── units/ (subcollection)
│   │   └── {unitId}: { ownerId, speed, shipFactor, ... }
│   └── convoys/ (subcollection)
│       └── {convoyId}: state machine for fleet movements

UserProfiles/
└── {uid}
    ├── name
    ├── hasPlacedHome
    └── planets[] (summaries)
```

### Authentication Flow

- **Method**: Email/Password via Firebase Auth
- **Transformation**: Username → `username@steampunk.local` (client-side)
- **Default credentials**: `admin / admin` (created on first init)

Login flow:
```
sessionStore.login(username, password)
  ↓
Firebase Auth with email = username@steampunk.local
  ↓
sessionStore.initialize() → observeAuth() listener
  ↓
User logged in → loadProfile() fetches/creates PlayerProfile
  ↓
App.tsx renders MainView (not LoginScreen)
```

### Mission System

Mission lifecycle managed by `missionStore.ts`:

```typescript
planMission(type, origin, target):
  ├─ Resolve origin & target planets
  ├─ Compute hex distance
  ├─ Calculate travel duration based on missionType
  ├─ Set launchAt = now + MISSION_PREPARATION_TIME (60s)
  ├─ Set arrivalAt = launchAt + travelDuration
  └─ Store in missions[]

advanceMissions() called each tick:
  ├─ Planned → Enroute (at launchAt)
  ├─ Enroute → Completed (at arrivalAt)
  └─ For attack/colonize: update planet ownership
```

Travel times in `src/constants.ts`:
```typescript
MISSION_TRAVEL_TIME_PER_HEX = {
  Angriff: 5000,
  Transport: 8000,
  Spionage: 3000,
  Stationierung: 6000,
  Kolonisierung: 10000,
}
```

### Backend Architecture

The backend uses **Supabase** with PostgreSQL database and Row-Level Security (RLS) policies.

**Database Tables**:
- `players` - Player profiles with resources, energy, hangar capacity
- `buildings` - Player buildings with levels
- `build_queue` - Construction queue with timing
- `research` - Tech tree progress
- `ships` - Player fleet with stats and location
- `shipyard_queue` - Ship construction queue
- `regions` - 19 macro-level regions (hex grid)
- `tiles` - Tiles within regions (37 per region)
- `convoys` - Mission/fleet movements
- `alliances` - Alliance data
- `alliance_members` - Membership tracking
- `alliance_pacts` - Inter-alliance relationships
- `messages` - Chat messages (alliance/DM/global)
- `game_ticks` - Game loop tracking

**Row-Level Security**: All tables have RLS policies to restrict access based on ownership and visibility rules.

## Key Libraries & Patterns

### Hex Grid System (`src/lib/hexgrid/`)

Core modules:
- `hex.ts` - Axial coordinate math, distance, direction vectors
- `macroWorld.ts` - 19-region macro grid generation
- `microRegion.ts` - 37-tile micro grid with biome assignment
- `viewport.ts` - Camera transform (pan/zoom/fit)
- `patterns.ts` - Biome visual patterns

**Deterministic generation**: Uses seeded RNG (`src/lib/rng.ts`) to ensure consistency across client/server.

### Game Logic (`src/lib/`)

- `economy.ts` - Resource production, Kesseldruck (energy) calculation
- `progression.ts` - Building/research upgrade costs & timing
- `buildQueue.ts` - Queue slot timing, capacity validation
- `missions.ts` - Mission travel duration by type & distance
- `pathfinding.ts` - A* pathfinding for convoys
- `mockFactory.ts` - 3000-system mock galaxy generator (for offline dev)

### Tiled Map Integration

Hex terrain loaded from Tiled map editor exports (`.tmj` files):

1. **Assets**: PNG tiles (256×256px) in `public/assets/tiles256/`
2. **Tileset**: External collection in `public/assets/tiles256/biomes.tsx`
3. **Export**: Tiled map as `.tmj` to `public/maps/`
4. **Loader**: `src/lib/tiled.ts` parses TMJ and extracts GIDs
5. **Rendering**: `HexTerrainCanvas.tsx` draws on canvas overlay

See README section "Hex-Map aus Tiled integrieren" for full asset pipeline.

## Important Conventions

### Naming
- **German game terminology**: Kesseldruck (steam pressure), Äthernetzwerk (aether network)
- **Store names**: `use{Entity}Store` (Zustand convention)
- **Component folders**: Group by feature (`galaxy/`, `alliance/`, etc.)

### Documentation
Every exported function must have JSDoc:
```typescript
/**
 * Calculates the travel duration for a mission based on hex distance.
 */
export const calculateMissionTravelDuration = ...
```

### Code Style
- **2-space indentation**
- **Single quotes** for strings
- **Pure functions** - Keep functions side-effect free unless mutating store state
- **Extract helpers** - Gameplay logic goes in `src/lib/` modules

### Path Aliases
The `@` alias maps to `src/` directory:
```typescript
import { axialToPx } from '@/lib/hexgrid/hex';
```

### Before Committing
Always run `npm run build` to ensure TypeScript compilation passes.

## Environment Variables

Required in `.env.local`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_WORLD_ID=playtest-world
```

## Troubleshooting

### Supabase not initialized
- Copy `.env.example` to `.env.local` and add credentials from your Supabase project settings

### Permission denied in database
- Check Row-Level Security (RLS) policies in Supabase dashboard
- Ensure user is authenticated before accessing protected tables

### Map not rendering regions
- Run `npm run seed:supabase` to initialize database with regions and tiles
- Verify in Supabase dashboard: Table Editor → regions table should show 19 entries

### TypeScript errors
- Run `npm run typecheck` to see full error list
- Check that all stores properly type their state and actions

## Project Status & Next Steps

See [README.md](README.md) for current implementation status and open tasks.

Key areas for future work:
- Galaxy and messaging performance optimization under high load
- Connect alliance and chat flows to real backend endpoints
- Expand gameplay effects (research, missions) and UI feedback layers
