# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Äther-Imperium: Chroniken des Dampfs** is a browser-based steampunk MMO strategy game built with React 19, TypeScript, and Supabase. The game features a hexagonal grid-based galaxy map with 3000+ systems, resource management, fleet missions, and alliance mechanics.

## Development Commands

### Essential Commands
```bash
npm install              # Install dependencies
npm run dev             # Start Vite dev server (http://localhost:3000)
npm run build           # Production build (must pass before committing)
npm run typecheck       # Run TypeScript type checking
npm run lint            # Run ESLint
npm run test            # Run Vitest test suite
npm run test:watch      # Run tests in watch mode
npm run seed:supabase   # Seed Supabase database with regions and tiles
npm run reset:world     # Reset world data in Supabase (caution: destructive)
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

### Database Migrations
```bash
supabase db push                # Apply pending migrations to local Supabase
supabase db pull                # Pull schema changes from remote Supabase
```
Migrations are stored in `supabase/migrations/`. Always run `supabase db push` after adding new tables or columns.

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
│   │   ├── terrain/  # Terrain rendering (HexTerrainCanvas)
│   │   ├── tiles/    # Tile-specific components
│   │   └── popups/   # Tile action popups and modals
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
│   └── *.ts          # Economy, missions, progression, requirements, etc.
├── services/         # Supabase integration layer
│   └── supabase/     # Supabase API modules
├── data/             # Game data & types (units, factions)
├── constants/        # Game configuration & balancing
│   ├── units.ts      # Unit definitions
│   ├── biomes.ts     # Biome configurations
│   ├── techTree.ts   # Technology tree
│   ├── map.ts        # Map settings
│   └── missions.ts   # Mission configurations
├── config/           # Environment & platform config
│   ├── supabaseConfig.ts  # Supabase client configuration
│   ├── authConfig.ts      # Authentication settings
│   └── mapConfig.ts       # Map rendering settings
├── types/            # TypeScript type definitions
│   ├── biome.ts      # Biome-related types
│   ├── convoy.ts     # Convoy/fleet types
│   └── map.ts        # Map-related types
├── pages/            # API routes (for backend integration)
│   └── api/          # API endpoint implementations
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
- `public.shipyard_queue` - Ship construction queue with realtime sync (new in Phase 2)

**Row-Level Security**: All tables have RLS policies restricting access based on auth status and ownership. Check Supabase dashboard → Authentication → Policies for current rules.

### Realtime & Multiplayer Features

The game uses **Supabase Realtime subscriptions** (PostgreSQL NOTIFY/LISTEN) for live updates across players:

**Shipyard Queue Synchronization** ([src/hooks/useShipyardSync.ts](src/hooks/useShipyardSync.ts)):
- Realtime channel: `realtime:public:shipyard_queue:{settlementId}`
- Subscribes to INSERT/UPDATE/DELETE events on player's queues
- Updates `shipyardStore` instantly when other sessions change build orders
- Handles disconnections with fallback polling every 5s

**Realtime Subscription Pattern**:
```typescript
const channel = supabase.channel(`realtime:public:table:${filter}`);
channel.on('postgres_changes', { event: '*', schema: 'public', table: 'shipyard_queue' }, (payload) => {
  // Update store with new data
});
channel.subscribe();
```

**Settlement Data Sync** ([src/services/supabase/settlementApi.ts](src/services/supabase/settlementApi.ts)):
- Real-time updates to settlement ownership, buildings, resources
- Used by both single-player and multiplayer game loops
- Fallback: `mapStore.loadRegion()` fetches complete region state if subscription fails

**Key Realtime Tables**:
- `shipyard_queue` - Ship construction (per settlement)
- `settlements` - Ownership & resource changes
- `convoys` - Fleet mission state transitions
- `messages` - Chat messages (for messaging sync)

**API Integration** ([src/services/supabase/](src/services/supabase/)):
- `auth.ts` - Login/logout with Supabase auth
- `playerApi.ts` - Player profile queries & mutations
- `worldData.ts` - Region/tile fetching
- `gameApi.ts` - Game state operations
- `settlementApi.ts` - Settlement management
- `buildingApi.ts` - Building construction

**Additional API Modules** ([src/lib/api/](src/lib/api/)):
- `client.ts` - HTTP client wrapper for API calls
- `alliances.ts` - Alliance-related API endpoints
- `directory.ts` - Player/alliance directory queries

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
- `requirements.ts` - Tech tree requirement validation system for buildings, research, ships
- `scouting.ts` - Scouting and reconnaissance mechanics
- `regionGen.ts` - Procedural region generation
- `color.ts` - Color utilities for UI theming
- `utils.ts` - General utility functions

### Tiled Map Integration

Hex terrain loaded from Tiled map editor exports (`.tmj` files):

1. **Assets**: PNG tiles (256×256px) in `public/assets/tiles256/`
2. **Tileset**: External collection in `public/assets/tiles256/biomes.tsx`
3. **Export**: Tiled map as `.tmj` to `public/maps/`
4. **Loader**: [src/lib/tiled.ts](src/lib/tiled.ts) parses TMJ and extracts GIDs
5. **Rendering**: `HexTerrainCanvas.tsx` draws on canvas overlay

See README section "Hex-Map aus Tiled integrieren" for full asset pipeline details.

## Requirements System

The game includes a centralized requirement validation system in [src/lib/requirements.ts](src/lib/requirements.ts) that checks prerequisites for:

- **Buildings** - Validates building level requirements, research prerequisites, and energy constraints
- **Research** - Ensures required buildings and prior research are completed
- **Ships** - Checks Werft level and required technologies
- **Missions** - Validates mission-specific requirements

**Key Functions**:
```typescript
canResearch(researchId, currentResearch, currentBuildings): ValidationResult
canBuild(buildingId, currentBuildings, currentResearch, energy): ValidationResult
canBuildShip(shipId, werftLevel, currentResearch): ValidationResult
canLaunchMission(missionType, currentResearch): ValidationResult
```

**Validation Result Format**:
```typescript
interface ValidationResult {
  canDo: boolean;        // Whether action is possible
  missing: string[];     // List of missing requirements
  energyBlocked?: boolean; // If blocked due to insufficient energy
}
```

This system powers the UI feedback in:
- `RequirementBadge.tsx` - Visual indicators for locked/unlocked features
- `GameObjectCard.tsx` - Building/research cards with requirement display
- `CollapsibleCard.tsx` - Expandable cards with nested requirement trees

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

## Debugging & Testing

### Debug Console Logging
The app uses several debug prefixes for identifying issues:
- `[useShipyardSync]` - Realtime shipyard subscription/polling events
- `[mapStore]` - Region loading and caching
- `[gameStore]` - Resource/building updates
- Use browser DevTools → Console tab to filter by prefix

### Testing Realtime Features

**Multi-Session Shipyard Testing**:
1. Open app in Window A and Window B (same user account)
2. Navigate both to same settlement's Werft (Shipyard)
3. Queue a ship in Window A
4. Observe: Window B updates within 1s without manual refresh
5. Check console: Both windows should log `[useShipyardSync] received UPDATE` events

**Testing Fallback Polling**:
1. Open DevTools → Network tab
2. Enable "Offline" mode to simulate disconnection
3. Try to queue a ship (will fail realtime subscription)
4. Disable offline mode
5. App should auto-sync within 5s via polling (check logs)

**Simulating RLS Failures**:
1. Create test account with restricted RLS policies
2. Try to access another player's settlement → should get 403 Forbidden
3. Check that error is caught gracefully (no console crashes)

### Troubleshooting

#### Supabase not initialized
- Copy `.env.example` to `.env.local` and add credentials from your Supabase project settings
- Verify credentials by checking Supabase dashboard → Settings → API
- Run `npm run seed:supabase` to initialize regions and tiles

#### Shipyard queue not syncing
- Verify `shipyard_queue` table exists: Supabase dashboard → Table Editor
- Check RLS policies on `shipyard_queue` table allow INSERT/UPDATE for authenticated users
- Ensure migration was applied: `supabase db push`
- Check browser console for `[useShipyardSync]` errors
- Verify player owns the settlement (check `settlements.ownerId`)

#### Permission denied (403) errors
- Check Row-Level Security (RLS) policies in Supabase dashboard → Tables → [table name] → RLS
- Ensure user is authenticated (`sessionStore.user` should be set)
- Verify RLS policies allow the operation for the user's role
- For shipyard: settlement must be owned by current user to write to queues

#### Realtime subscription not connecting
- Check Supabase Realtime is enabled: Dashboard → Project Settings → Realtime
- Verify JWT token hasn't expired (tokens refresh automatically in auth flow)
- Check network tab for WebSocket connection to `wss://<project>.supabase.co/realtime/v1`
- If disabled, app falls back to 5s polling automatically

#### Map not rendering regions
- Run `npm run seed:supabase` to initialize database with regions and tiles
- Verify in Supabase dashboard: Table Editor → regions table should show 19 entries
- Check browser console for 403/404 errors indicating RLS or data issues

#### TypeScript errors
- Run `npm run typecheck` to see full error list with line numbers
- Check that stores properly type their state and actions
- Ensure imports use the `@` alias correctly

#### Tiles not loading correctly
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

### Adding a ship type to the shipyard
1. Define ship config in `src/data/ships.ts` with id, name, cost, buildTime, requirements
2. Add to `SHIPS` constant mapping in game data
3. Add icon to `src/lib/ui/iconMap.ts` for UI rendering
4. Update `shipyardStore.ts` if new queue logic needed
5. Test via `WerftView.tsx` with `useShipyardSync` hook

### Subscribing to realtime shipyard updates
1. Import `useShipyardSync` hook in your component: `import { useShipyardSync } from '@/hooks/useShipyardSync'`
2. Call at component level: `useShipyardSync(settlementId)`
3. Store updates automatically when `shipyard_queue` table changes
4. Access data via `shipyardStore.queues[settlementId]`

### Making a Supabase realtime subscription
1. Create API wrapper in `src/services/supabase/` module
2. Define channel: `supabase.channel('realtime:public:table_name:filter')`
3. Subscribe to postgres_changes events
4. Implement cleanup: `channel.unsubscribe()` on component unmount
5. Add fallback polling if subscription fails (check `useShipyardSync` for pattern)

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

## Utility Scripts

Scripts are located in the `scripts/` directory:

- `seedSupabase.ts` - Seeds Supabase with initial regions and tiles data
- `clearSupabase.ts` - Clears all data from Supabase (use with caution!)
- `checkBiomes.ts` - Validates biome data integrity
- `fixBiomeCodes.ts` - Repairs biome code mismatches
- `setup.sh` - Initial setup script (creates `.env.local`, installs deps)
- `seed.sql` - SQL seed data for direct database import

Run TypeScript scripts with:
```bash
tsx scripts/scriptName.ts
```

## UI Component Library

The project uses a custom UI library built on Radix UI primitives:

**Core Components** ([src/components/ui/](src/components/ui/)):
- `Button.tsx` - Primary action buttons with variants
- `GameCard.tsx` - Card component for game objects (buildings, research)
- `GameObjectCard.tsx` - Enhanced card with requirement validation and actions
- `CollapsibleCard.tsx` - Expandable/collapsible card for nested content
- `RequirementBadge.tsx` - Visual badge showing requirement status (locked/unlocked)
- `ProgressBar.tsx` - Progress indicator for builds/research
- `ResourceStrip.tsx` - Resource display bar (extracted for reuse across views)
- `ToastViewport.tsx` - Toast notification system
- `BottomSheet.tsx` - Mobile bottom sheet for modals
- `LoadingOverlay.tsx` - Full-screen loading indicator
- `StickyTopbarShadow.tsx` - Shadow effect for sticky headers

**Layout Components** ([src/components/views/common/](src/components/views/common/)):
- `ProductionBoard.tsx` - Shared layout for BuildingsView, ResearchView, WerftView (resources, map, sidebar)

**UI Utility Functions** ([src/lib/ui/](src/lib/ui/)):
- `formatting.ts` - Number formatting (thousands, durations), progress percentages
  - `formatNumber()` - Display 1000000 as "1.0M"
  - `formatDuration()` - Convert ms to "2d 3h 45m"
  - `getProgressPercent()` - Calculate build completion percentage
- `iconMap.ts` - Icon exports for ships, buildings, missions
  - Maps game IDs to Lucide React icons
  - Used by card components and UI lists

**Design Principles**:
- Steampunk aesthetic with brass/copper color palette
- Card-based layout for consistent spacing
- Responsive design with mobile-first approach
- Accessible components following ARIA guidelines

## Project Status & Next Steps

See [README.md](README.md) for current implementation status and open tasks.

**Recent Updates (Phase 2 - Multiplayer & Realtime)**:
- ✅ Shipyard queue with Supabase realtime sync (`shipyard_queue` table)
- ✅ `useShipyardSync` hook for automatic multi-session updates
- ✅ Extracted `ResourceStrip` component for consistent resource display across views
- ✅ Refactored `ProductionBoard` layout (shared by BuildingsView, ResearchView, WerftView)
- ✅ Added utility functions: `formatting.ts` (number/duration formatting), `iconMap.ts` (UI icons)
- ✅ Enhanced `shipyardStore` with queue management and cost calculations
- ✅ Settlement data sync via realtime subscriptions with fallback polling

**Phase 1 Completed**:
- ✅ WerftView activated with full store integration
- ✅ Redesigned UI to card-based format with Steampunk flavor
- ✅ Integrated requirements system with UI components
- ✅ Added CollapsibleCard and RequirementBadge components
- ✅ Fixed energy calculation multiplier bug

**Key areas for future work**:
- Galaxy and messaging performance optimization under high load
- Connect alliance and chat flows to real backend endpoints
- Expand gameplay effects (research, missions) and UI feedback layers
- Implement advanced pathfinding for multi-leg convoy missions
- Add combat resolution UI and battle reports
- Implement alliance diplomacy features (pacts, wars)
- Scale realtime architecture to multiple tables (convoys, settlements, buildings)
- Add conflict resolution for concurrent edits (e.g., two clients queuing ships simultaneously)

**Testing Realtime Features**:
- Open same settlement in 2+ browser windows
- Queue a ship in one window → should appear in other windows within 1s
- Check browser console for `[useShipyardSync]` debug logs
- Verify fallback polling kicks in if realtime subscription disconnects
