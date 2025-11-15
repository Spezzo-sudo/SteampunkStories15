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

### Running Single Tests
```bash
npm run test -- src/lib/__tests__/buildQueue.test.ts     # Run specific test file
npm run test -- --grep "resource production"             # Run tests matching pattern
npm run test:watch -- src/lib/__tests__/               # Watch specific directory
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

### Project Structure
```
src/
├── components/        # React components organized by feature
│   ├── layout/       # App shell (LayoutSwitch, LeftNav, TopBar)
│   ├── views/        # Main page views (GalaxyView, BuildingsView, etc.)
│   ├── galaxy/       # Galaxy map system (HexMap, tiles, modals)
│   ├── alliance/     # Alliance UI
│   ├── messaging/    # Chat & messaging
│   ├── auth/         # Login screen
│   ├── directory/    # Player/alliance directory
│   ├── ui/           # Reusable UI components (Button, Card, etc.)
│   └── overlays/     # Debug FAB, legend overlay
├── store/            # Zustand stores (gameStore, mapStore, etc.)
├── hooks/            # Custom React hooks (useGameTick, useSmoothPanZoom)
├── lib/              # Core game logic & utilities
│   ├── hexgrid/      # Hexagon math & coordinate systems
│   ├── api/          # Supabase API wrappers
│   ├── movement/     # Fleet pathfinding & movement
│   └── *.ts          # Economy, missions, progression, etc.
├── services/         # Supabase integration layer
├── data/             # Game data & types (units, factions)
├── constants/        # Game configuration & balancing
├── config/           # Environment & platform config
├── types/            # TypeScript type definitions
└── styles/           # Design tokens

public/
├── assets/           # Game images and icons
├── maps/             # Tiled map exports (.tmj)
└── fonts/            # Web fonts
```

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

**Key hex math functions** in [src/lib/hexgrid/hex.ts](src/lib/hexgrid/hex.ts):
- `axialToPx()` - Convert axial coords to pixel position (pointy-top orientation)
- `hexDist()` - Calculate Manhattan distance between hexes
- `disk()` - Generate hex disk of given radius
- `DIRS` - Six direction vectors for neighbor calculation
- `hexPath()` - Generate Path2D for drawing hexagons

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

**11 Core Stores** (all in `src/store/`):
- `gameStore.ts` - Resources, buildings, research, build queue, game tick
- `mapStore.ts` - World/region/tile selection, viewport, region caching
- `sessionStore.ts` - Supabase auth, player profile lifecycle
- `directoryStore.ts` - Galaxy systems, players, alliances, planets
- `missionStore.ts` - Fleet mission planning & execution timeline
- `allianceStore.ts` - Alliance membership, pacts, messaging rooms
- `messageStore.ts` - Direct & alliance chat
- `shipyardStore.ts` - Ship blueprints & construction queues
- `settlementStore.ts` - Settlement-specific data
- `uiStore.ts` - Toast notifications
- `buildingStore.ts` - Building upgrade management

**Cross-store communication**: Stores can read from others via `.getState()` and subscribe to changes. Keep dependencies minimal to avoid circular references.

### Game Loop & Resource Production

The game tick runs every 1000ms via [src/hooks/useGameTick.ts](src/hooks/useGameTick.ts):

```typescript
gameTick() called every 1000ms:
  ├─ mapStore.loadRegion() - fetch current region tiles
  ├─ partitionBuildQueue() - complete finished builds
  ├─ calculateKesseldruck() - update energy (steam pressure)
  └─ calculateResourceProductionPerTick() - increase resources

advanceMissions(now) called every tick:
  ├─ Planned → Enroute (at launchAt)
  ├─ Enroute → Completed (at arrivalAt)
  └─ Update settlement ownership if conquest/colonization
```

**Key constants** in [src/constants.ts](src/constants.ts):
- `TICK_INTERVAL` - Game tick frequency (default 1000ms)
- `MISSION_PREPARATION_TIME` - Time before fleet launches (default 60s)
- `MISSION_TRAVEL_TIME_PER_HEX` - Travel duration per mission type

### Component Architecture

**Layout Hierarchy** ([src/components/layout/](src/components/layout/)):
```
App.tsx
├─ LoginScreen (if not authenticated)
└─ LayoutSwitch (responsive dispatcher)
   ├─ Desktop: LeftNav + TopBar + MainView
   └─ Mobile: TopBar + MainView + MobileNav
```

**Main Views** ([src/components/views/](src/components/views/)):
- `OverviewView.tsx` - Dashboard with resources & player stats
- `GalaxyView.tsx` - Star systems, planets & map exploration
- `BuildingsView.tsx` - Settlement construction & production buildings
- `ResearchView.tsx` - Tech tree & research progression
- `AllianceView.tsx` - Alliance management & diplomacy
- `WerftView.tsx` - Shipyard and fleet construction

**Galaxy Map System** ([src/components/galaxy/](src/components/galaxy/)):

The `HexMap.tsx` component is the core rendering engine:
- Uses **spatial bucketing** (256px buckets) for viewport culling
- Renders 3000+ systems efficiently with React memoization
- SVG-based tile rendering with Canvas terrain overlay from Tiled maps
- Supports pan/zoom, system filtering, alliance color highlighting

Performance optimizations:
1. **Spatial bucketing** - Only renders visible hexes + padding
2. **Region caching** - Fetched regions cached in mapStore with invalidation
3. **Memoization** - `React.memo` on HexTile, useMemo for expensive calculations
4. **Canvas terrain** - Terrain drawn on canvas instead of SVG paths for better perf

### Supabase Database Architecture

**Core Tables**:
- `auth.users` - Supabase auth users (handled by Supabase)
- `public.players` - Player profiles with stats (id, name, resources, etc.)
- `public.regions` - 19 macro-level regions (RQ, RR coords, allianceId)
- `public.tiles` - Tiles within regions (q, r coords, biome, settlementId)
- `public.settlements` - Settlement data (owner, buildings, resources)
- `public.buildings` - Building definitions & configuration
- `public.convoys` - Fleet movements & mission execution
- `public.alliances` - Alliance data & metadata
- `public.alliance_members` - Membership tracking
- `public.messages` - Chat messages (type: global/alliance/dm)

**Row-Level Security**: All tables have RLS policies restricting access based on auth status and ownership. Check Supabase dashboard → Authentication → Policies for current rules.

**API Integration** ([src/services/supabase/](src/services/supabase/)):
- `auth.ts` - Login/logout with Supabase auth
- `playerApi.ts` - Player profile queries & mutations
- `worldData.ts` - Region/tile fetching
- `gameApi.ts` - Game state operations
- `settlementApi.ts` - Settlement management
- `buildingApi.ts` - Building construction

### Authentication Flow

- **Method**: Email/Password via Supabase Auth
- **Session persistence**: LocalStorage via Supabase
- **Auto-refresh**: Tokens automatically refreshed before expiry

Login flow:
```
sessionStore.login(email, password)
  ↓
Supabase Auth.signInWithPassword()
  ↓
sessionStore.initialize() → observeAuth() listener
  ↓
User authenticated → loadProfile() fetches PlayerProfile
  ↓
App.tsx renders MainView (not LoginScreen)
```

### Mission System

Mission lifecycle managed by [src/store/missionStore.ts](src/store/missionStore.ts):

```typescript
planMission(type, origin, target):
  ├─ Resolve origin & target settlements
  ├─ Compute hex distance
  ├─ Calculate travel duration based on missionType
  ├─ Set launchAt = now + MISSION_PREPARATION_TIME (60s)
  ├─ Set arrivalAt = launchAt + travelDuration
  └─ Persist to Supabase convoys table

advanceMissions() called each tick:
  ├─ Planned → Enroute (at launchAt)
  ├─ Enroute → Completed (at arrivalAt)
  └─ For attack/colonize: update settlement ownership
```

Travel times in [src/constants.ts](src/constants.ts):
```typescript
MISSION_TRAVEL_TIME_PER_HEX = {
  Angriff: 5000,           // Attack mission (ms per hex)
  Transport: 8000,         // Transport mission
  Spionage: 3000,          // Scouting/espionage
  Stationierung: 6000,     // Garrison/stationing
  Kolonisierung: 10000,    // Colonization
}
```

## Key Libraries & Patterns

### Hex Grid System ([src/lib/hexgrid/](src/lib/hexgrid/))

Core modules:
- `hex.ts` - Axial coordinate math, distance, direction vectors
- `macroWorld.ts` - 19-region macro grid generation
- `microRegion.ts` - 37-tile micro grid with biome assignment
- `viewport.ts` - Camera transform (pan/zoom/fit)
- `patterns.ts` - Biome visual patterns

**Deterministic generation**: Uses seeded RNG ([src/lib/rng.ts](src/lib/rng.ts)) to ensure consistency across client/server.

### Game Logic ([src/lib/](src/lib/))

- `economy.ts` - Resource production, Kesseldruck (energy) calculation
- `progression.ts` - Building/research upgrade costs & timing
- `buildQueue.ts` - Queue slot timing, capacity validation
- `missions.ts` - Mission travel duration by type & distance
- `pathfinding.ts` - A* pathfinding for convoys
- `combat.ts` - Battle resolution logic
- `biomeStyle.ts` - Biome visual theming

### Tiled Map Integration

Hex terrain loaded from Tiled map editor exports (`.tmj` files):

1. **Assets**: PNG tiles (256×256px) in `public/assets/tiles256/`
2. **Tileset**: External collection in `public/assets/tiles256/biomes.tsx`
3. **Export**: Tiled map as `.tmj` to `public/maps/`
4. **Loader**: [src/lib/tiled.ts](src/lib/tiled.ts) parses TMJ and extracts GIDs
5. **Rendering**: `HexTerrainCanvas.tsx` draws on canvas overlay

See README section "Hex-Map aus Tiled integrieren" for full asset pipeline details.

## Important Conventions

### Naming
- **German game terminology**: Kesseldruck (steam pressure), Äthernetzwerk (aether network), Werft (shipyard)
- **Store names**: `use{Entity}Store` (Zustand convention)
- **Component folders**: Group by feature (`galaxy/`, `alliance/`, etc.)
- **API modules**: One module per table (e.g., `playerApi.ts`, `settlementApi.ts`)

### Documentation
Every exported function must have JSDoc:
```typescript
/**
 * Calculates the travel duration for a mission based on hex distance.
 * @param distance - Manhattan distance in hexes
 * @param missionType - Type of mission (affects speed)
 * @returns Duration in milliseconds
 */
export const calculateMissionTravelDuration = (distance: number, missionType: MissionType) => ...
```

### Code Style
- **2-space indentation**
- **Single quotes** for strings
- **Pure functions** - Keep functions side-effect free unless explicitly mutating store state
- **Extract helpers** - Gameplay logic goes in `src/lib/` modules, not components
- **Type safety** - Avoid `any` type; use discriminated unions for game states

### Path Aliases
The `@` alias maps to `src/` directory:
```typescript
import { axialToPx } from '@/lib/hexgrid/hex';
import { useGameStore } from '@/store/gameStore';
import type { Settlement } from '@/data/types';
```

### Before Committing
Always run:
```bash
npm run typecheck   # Ensure no TS errors
npm run lint        # Check code style
npm run test        # Run test suite
npm run build       # Verify production build succeeds
```

## Environment Variables

Required in `.env.local` (copy from `.env.example`):
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_WORLD_ID=playtest-world
```

The app validates these on startup. See [src/config/supabaseConfig.ts](src/config/supabaseConfig.ts) for validation logic.

## Troubleshooting

### Supabase not initialized
- Copy `.env.example` to `.env.local` and add credentials from your Supabase project settings
- Verify credentials by checking Supabase dashboard → Settings → API

### Permission denied errors
- Check Row-Level Security (RLS) policies in Supabase dashboard → Tables → [table name] → RLS
- Ensure user is authenticated (`sessionStore.user` should be set)
- Verify RLS policies allow the operation for the user's role

### Map not rendering regions
- Run `npm run seed:supabase` to initialize database with regions and tiles
- Verify in Supabase dashboard: Table Editor → regions table should show 19 entries
- Check browser console for 403/404 errors indicating RLS or data issues

### TypeScript errors
- Run `npm run typecheck` to see full error list with line numbers
- Check that stores properly type their state and actions
- Ensure imports use the `@` alias correctly

### Tiles not loading correctly
- Verify tile images exist in `public/assets/tiles256/`
- Check `public/assets/tiles256/biomes.tsx` has correct image references
- Run `npm run build` to ensure all assets are bundled
- Clear browser cache (Ctrl+Shift+Delete) and reload

## Testing

Tests are organized alongside source files in `__tests__` directories:
- `src/lib/__tests__/` - Unit tests for game logic
- `src/store/__tests__/` - Store behavior tests
- `src/components/galaxy/__tests__/` - Component tests

Use `happy-dom` environment for fast DOM testing. Mocking:
```typescript
vi.mock('@/services/supabase', () => ({
  getSupabaseClient: vi.fn(() => ({
    from: vi.fn(/* ... */),
  })),
}));
```

## Common Development Tasks

### Adding a new building type
1. Add type to `src/types.ts` (Building interface)
2. Add configuration to `src/constants.ts` (BUILDINGS object)
3. Add icon/image to `public/assets/illustrations/buildings/`
4. Component will auto-render via existing UI loops

### Adding a new settlement building
1. Define config in `src/constants/buildings.ts` (BuildingConfig)
2. Create upgrade cost formulas in `src/lib/progression.ts`
3. Add to `src/data/buildings.ts` reference data
4. Test via `src/lib/__tests__/progression.test.ts`

### Making a Supabase query
1. Create API wrapper in appropriate module under `src/services/supabase/`
2. Use `getSupabaseClient().from('table_name').select(...)` pattern
3. Handle RLS errors gracefully (403 = permission denied)
4. Add error toast via `useUiStore().showToast()`

### Adding a new game view
1. Create component in `src/components/views/YourView.tsx`
2. Add View enum variant to `src/types.ts`
3. Import and add case to `MainView.tsx` switch statement
4. Add navigation button to `LeftNav.tsx` or `MobileNav.tsx`

## Project Status & Next Steps

See [README.md](README.md) for current implementation status and open tasks.

Key areas for future work:
- Galaxy and messaging performance optimization under high load
- Connect alliance and chat flows to real backend endpoints
- Expand gameplay effects (research, missions) and UI feedback layers
- Implement advanced pathfinding for multi-leg convoy missions
