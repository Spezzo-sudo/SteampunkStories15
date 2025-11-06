import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MICRO_HEX_SIZE, REGION_RADIUS } from '@/constants/map';
import { axialDisk, axialToPixel } from '@/lib/hex';
import { RegionTileTable } from '@/components/galaxy/RegionTileTable';
import type { Axial, RegionData, TileData } from '@/types/map';
import { useAllianceStore } from '@/store/allianceStore';
import { applyAlpha } from '@/lib/color';
import {
  alliancePenalty,
  findRegionPath,
  type PathFailureReason,
  type PathfindingResult,
} from '@/lib/pathfinding';
import { ConvoyActionModal } from '@/components/galaxy/ConvoyActionModal';
import type { Convoy, Unit } from '@/types/convoy';
import { ActionType } from '@/types/convoy';
import { createRegionUnits } from '@/lib/mockUnits';
import { runConvoy } from '@/lib/movement/runner';
import { stepCost } from '@/lib/movement/costs';

interface RegionViewProps {
  region: RegionData;
}

interface HexPolygonProps {
  cx: number;
  cy: number;
  size: number;
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
}

type SelectionMode = 'inspect' | 'start' | 'target';
type AllianceFilter = 'all' | 'neutral' | string;

type BannerTone = 'info' | 'success' | 'warning' | 'danger';

interface BannerState {
  tone: BannerTone;
  message: string;
}

interface PositionedAxial extends Axial {
  x: number;
  y: number;
}

interface RegionStaticLayer {
  href: string;
  width: number;
  height: number;
  origin: { x: number; y: number };
}

const neighborOffsets: Axial[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

const failureMessages: Record<PathFailureReason, string> = {
  'start-outside': 'Startpunkt liegt außerhalb der Region.',
  'start-blocked': 'Startpunkt ist blockiert.',
  'goal-outside': 'Ziel liegt außerhalb der Region.',
  'goal-blocked': 'Ziel ist blockiert.',
  unreachable: 'Kein Pfad – der Weg ist versperrt.',
};

const actionLabels: Record<ActionType, string> = {
  [ActionType.MOVE]: 'Bewegen',
  [ActionType.COLONIZE]: 'Kolonisieren',
  [ActionType.SCOUT]: 'Spähen',
  [ActionType.ATTACK]: 'Angreifen',
};

const failureTones: Record<PathFailureReason, BannerTone> = {
  'start-outside': 'warning',
  'start-blocked': 'danger',
  'goal-outside': 'warning',
  'goal-blocked': 'danger',
  unreachable: 'warning',
};

const toneClasses: Record<BannerTone, string> = {
  info: 'border-cyan-500/40 bg-cyan-900/30 text-cyan-100',
  success: 'border-emerald-500/40 bg-emerald-900/30 text-emerald-100',
  warning: 'border-amber-500/40 bg-amber-900/30 text-amber-100',
  danger: 'border-rose-500/40 bg-rose-900/30 text-rose-100',
};

const selectionButtonClass =
  'rounded-lg border border-yellow-600/40 bg-slate-900/60 px-3 py-1.5 text-xs uppercase tracking-wide text-yellow-100 transition hover:border-yellow-400/50 hover:bg-yellow-500/10';

const filterButtonClass =
  'rounded-full border border-slate-700/60 bg-black/50 px-3 py-1 text-[0.7rem] uppercase tracking-wide text-slate-200 transition hover:border-yellow-500/40 hover:bg-yellow-900/30';

/**
 * Visualises the micro-level region layout and keeps the tabular data discoverable with lightweight controls.
 */
const RegionViewComponent: React.FC<RegionViewProps> = ({ region }) => {
  const tiles = useMemo(
    () => region.tiles.slice().sort((a, b) => a.r - b.r || a.q - b.q || a.biome.localeCompare(b.biome)),
    [region.tiles],
  );
  const backgroundTiles = useMemo(() => axialDisk(REGION_RADIUS + 2), []);
  const [staticLayer, setStaticLayer] = useState<RegionStaticLayer | null>(null);
  const [selectedTile, setSelectedTile] = useState<TileData | null>(null);
  const [startTile, setStartTile] = useState<TileData | null>(null);
  const [targetTile, setTargetTile] = useState<TileData | null>(null);
  const [mode, setMode] = useState<SelectionMode>('inspect');
  const [activeAllianceFilter, setActiveAllianceFilter] = useState<AllianceFilter>('all');
  const [banner, setBanner] = useState<BannerState | null>(null);
  const [units, setUnits] = useState<Unit[]>(() => createRegionUnits(region));
  const [convoys, setConvoys] = useState<Convoy[]>([]);
  const runningConvoys = useRef<Set<string>>(new Set());
  const [pendingConvoy, setPendingConvoy] = useState<{ start: TileData; target: TileData } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTableOpen, setIsTableOpen] = useState(true);
  const [mapZoom, setMapZoom] = useState(1.1);
  const [toasts, setToasts] = useState<{ id: string; tone: BannerTone; message: string }[]>([]);
  const [homeTile, setHomeTile] = useState<TileData | null>(null);
  const [hoveredTileId, setHoveredTileId] = useState<string | null>(null);
  const [convoyPressure, setConvoyPressure] = useState<Record<string, number>>({});
  const alliances = useAllianceStore((state) => state.alliances);
  const initializeAlliances = useAllianceStore((state) => state.initialize);
  const myAllianceId = useAllianceStore((state) => state.myAllianceId);
  const traversalCost = useMemo(() => alliancePenalty(myAllianceId), [myAllianceId]);
  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat('de-DE', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }),
    [],
  );

  useEffect(() => {
    void initializeAlliances();
  }, [initializeAlliances]);

  useEffect(() => {
    setSelectedTile(null);
    setStartTile(null);
    setTargetTile(null);
    setMode('inspect');
    setBanner(null);
    const roster = createRegionUnits(region);
    setUnits(roster);
    setConvoys([]);
    runningConvoys.current.clear();
    setPendingConvoy(null);
    setToasts([]);
    setConvoyPressure({});
    setIsTableOpen(true);
    setMapZoom(1.1);
    const defaultHome =
      region.tiles.find((tile) => tile.units?.some((id) => id.includes('frachter'))) ??
      region.tiles.find((tile) => tile.units?.length) ??
      region.tiles.find((tile) => tile.settleable) ??
      null;
    setHomeTile(defaultHome);
  }, [region]);

  const tilePixelEntries = useMemo<PositionedAxial[]>(
    () =>
      tiles.map((tile) => {
        const { x, y } = axialToPixel({ q: tile.q, r: tile.r }, MICRO_HEX_SIZE);
        return { q: tile.q, r: tile.r, x, y };
      }),
    [tiles],
  );

  const unitsByTile = useMemo(() => {
    const map = new Map<string, Unit[]>();
    units.forEach((unit) => {
      const key = `${unit.location.q}_${unit.location.r}`;
      const bucket = map.get(key);
      if (bucket) {
        bucket.push(unit);
      } else {
        map.set(key, [unit]);
      }
    });
    return map;
  }, [units]);

  useEffect(() => {
    if (!pendingConvoy) {
      setIsModalOpen(false);
      return;
    }
    const available = unitsByTile.get(`${pendingConvoy.start.q}_${pendingConvoy.start.r}`) ?? [];
    if (available.length === 0) {
      setBanner({ tone: 'warning', message: 'Keine Einheiten am Startpunkt verfügbar.' });
      setPendingConvoy(null);
      return;
    }
    setIsModalOpen(true);
  }, [pendingConvoy, unitsByTile]);

  useEffect(() => {
    convoys.forEach((convoy) => {
      if (convoy.state !== 'queued' || runningConvoys.current.has(convoy.id)) {
        return;
      }
      const convoyUnits = units.filter((unit) => convoy.unitIds.includes(unit.id));
      if (convoyUnits.length === 0) {
        setConvoys((previous) =>
          previous.map((entry) => (entry.id === convoy.id ? { ...entry, state: 'failed' } : entry)),
        );
        setConvoyPressure((previous) => {
          const next = { ...previous };
          delete next[convoy.id];
          return next;
        });
        return;
      }
      runningConvoys.current.add(convoy.id);
      void runConvoy(
        convoy,
        convoyUnits,
        (axial) => axialToPixel(axial, MICRO_HEX_SIZE),
        (axial) => {
          setUnits((previous) =>
            previous.map((unit) =>
              convoy.unitIds.includes(unit.id)
                ? {
                    ...unit,
                    location: { ...unit.location, q: axial.q, r: axial.r },
                  }
                : unit,
            ),
          );
          const tile = tileLookup.get(`${axial.q}_${axial.r}`);
          if (tile) {
            const cost = stepCost(tile, convoyUnits);
            if (Number.isFinite(cost)) {
              setConvoyPressure((previous) => ({
                ...previous,
                [convoy.id]: Math.max(0, (previous[convoy.id] ?? convoy.pressureTankMax) - cost),
              }));
            }
          }
        },
        (state) => {
          setConvoys((previous) =>
            previous.map((entry) => (entry.id === convoy.id ? { ...entry, state } : entry)),
          );
        },
        (ok) => {
          runningConvoys.current.delete(convoy.id);
          setConvoys((previous) =>
            previous.map((entry) =>
              entry.id === convoy.id ? { ...entry, state: ok ? 'done' : 'failed' } : entry,
            ),
          );
          setConvoyPressure((previous) => {
            const next = { ...previous };
            delete next[convoy.id];
            return next;
          });
          const tone: BannerTone = ok ? 'success' : 'danger';
          const message = ok
            ? `${actionLabels[convoy.action]} abgeschlossen – Hex (${convoy.target.q}, ${convoy.target.r}).`
            : `Konvoi fehlgeschlagen – Hex (${convoy.target.q}, ${convoy.target.r}).`;
          setToasts((previous) => [...previous, { id: `${convoy.id}-${Date.now()}`, tone, message }]);
        },
      );
    });
  }, [convoys, tileLookup, units]);

  useEffect(() => {
    if (toasts.length === 0) {
      return;
    }
    const timer = setTimeout(() => {
      setToasts((previous) => previous.slice(1));
    }, 5000);
    return () => clearTimeout(timer);
  }, [toasts]);

  const tilePositionLookup = useMemo(() => {
    const lookup = new Map<string, PositionedAxial>();
    tilePixelEntries.forEach((entry) => {
      lookup.set(`${entry.q}_${entry.r}`, entry);
    });
    return lookup;
  }, [tilePixelEntries]);

  const backgroundPixelEntries = useMemo<PositionedAxial[]>(
    () =>
      backgroundTiles.map((coord) => {
        const { x, y } = axialToPixel({ q: coord.q, r: coord.r }, MICRO_HEX_SIZE * 1.05);
        return { q: coord.q, r: coord.r, x, y };
      }),
    [backgroundTiles],
  );

  const staticBounds = useMemo(() => {
    const combined = [...tilePixelEntries, ...backgroundPixelEntries];
    if (combined.length === 0) {
      return null;
    }
    const padding = MICRO_HEX_SIZE * 2.4;
    const initial = combined[0];
    const bounds = combined.reduce(
      (acc, coord) => ({
        minX: Math.min(acc.minX, coord.x),
        maxX: Math.max(acc.maxX, coord.x),
        minY: Math.min(acc.minY, coord.y),
        maxY: Math.max(acc.maxY, coord.y),
      }),
      {
        minX: initial.x,
        maxX: initial.x,
        minY: initial.y,
        maxY: initial.y,
      },
    );
    const minX = bounds.minX - padding;
    const maxX = bounds.maxX + padding;
    const minY = bounds.minY - padding;
    const maxY = bounds.maxY + padding;
    return {
      minX,
      maxX,
      minY,
      maxY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }, [backgroundPixelEntries, tilePixelEntries]);

  useEffect(() => {
    if (!staticBounds) {
      setStaticLayer(null);
      return;
    }
    if (typeof window === 'undefined') {
      return;
    }

    let cancelled = false;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.ceil(staticBounds.width));
    canvas.height = Math.max(1, Math.ceil(staticBounds.height));
    const context = canvas.getContext('2d');
    if (!context) {
      setStaticLayer(null);
      return;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#020617';
    context.fillRect(0, 0, canvas.width, canvas.height);

    const project = (coord: PositionedAxial) => ({
      x: coord.x - staticBounds.minX,
      y: coord.y - staticBounds.minY,
    });

    backgroundPixelEntries.forEach((coord) => {
      const projected = project(coord);
      drawBackgroundHex(context, projected.x, projected.y, MICRO_HEX_SIZE * 1.05, ((coord.q + coord.r) & 1) === 0);
    });

    tiles.forEach((tile) => {
      const position = tilePositionLookup.get(`${tile.q}_${tile.r}`);
      if (!position) {
        return;
      }
      const projected = project(position);
      drawRegionHex(context, projected.x, projected.y, tile, MICRO_HEX_SIZE);
    });

    const href = canvas.toDataURL('image/png');
    if (!cancelled) {
      setStaticLayer({
        href,
        width: staticBounds.width,
        height: staticBounds.height,
        origin: { x: staticBounds.minX, y: staticBounds.minY },
      });
    }

    return () => {
      cancelled = true;
    };
  }, [backgroundPixelEntries, staticBounds, tilePositionLookup, tiles]);

  const alliancesById = useMemo(
    () =>
      new Map(
        alliances.map((alliance) => [alliance.id, { tag: alliance.tag, color: alliance.color, name: alliance.name }]),
      ),
    [alliances],
  );

  const alliancePresence = useMemo(() => {
    const counts = new Map<string, number>();
    let neutralCount = 0;
    tiles.forEach((tile) => {
      if (tile.allianceId) {
        counts.set(tile.allianceId, (counts.get(tile.allianceId) ?? 0) + 1);
      } else {
        neutralCount += 1;
      }
    });
    return { counts, neutralCount };
  }, [tiles]);

  const allianceOptions = useMemo(
    () => {
      const options: { id: AllianceFilter; label: string; color?: string; count: number }[] = [];
      if (alliancePresence.neutralCount > 0) {
        options.push({ id: 'neutral', label: 'Neutral', color: '#94a3b8', count: alliancePresence.neutralCount });
      }
      alliancePresence.counts.forEach((count, id) => {
        const meta = alliancesById.get(id);
        options.push({ id, label: meta?.tag ?? id, color: meta?.color, count });
      });
      return options.sort((a, b) => b.count - a.count);
    },
    [alliancePresence, alliancesById],
  );

  const matchesAllianceFilter = useCallback(
    (tile: TileData) => {
      if (activeAllianceFilter === 'all') {
        return true;
      }
      if (activeAllianceFilter === 'neutral') {
        return !tile.allianceId;
      }
      return tile.allianceId === activeAllianceFilter;
    },
    [activeAllianceFilter],
  );

  const filteredTiles = useMemo(() => tiles.filter((tile) => matchesAllianceFilter(tile)), [matchesAllianceFilter, tiles]);

  const tileLookup = useMemo(() => {
    const map = new Map<string, TileData>();
    tiles.forEach((tile) => map.set(`${tile.q}_${tile.r}`, tile));
    return map;
  }, [tiles]);

  const filterLabel = useMemo(() => {
    if (activeAllianceFilter === 'all') {
      return 'Alle Hexfelder';
    }
    if (activeAllianceFilter === 'neutral') {
      return 'Neutrale Sektoren';
    }
    const meta = alliancesById.get(activeAllianceFilter);
    return meta ? `Bande ${meta.tag}` : `Bande ${activeAllianceFilter}`;
  }, [activeAllianceFilter, alliancesById]);

  const handleAllianceFilterChange = useCallback((nextFilter: AllianceFilter) => {
    setActiveAllianceFilter((previous) => (previous === nextFilter ? 'all' : nextFilter));
  }, []);

  const filterIsActive = activeAllianceFilter !== 'all';

  const handleInspect = useCallback((tile: TileData) => {
    setSelectedTile(tile);
  }, []);

  const findReachableNeighbor = useCallback(
    (tile: TileData, start: TileData | null) => {
      const options: { candidate: TileData; cost: number }[] = [];
      neighborOffsets.forEach((offset) => {
        const candidate = tileLookup.get(`${tile.q + offset.q}_${tile.r + offset.r}`);
        if (candidate?.settleable) {
          const cost = traversalCost(candidate);
          if (Number.isFinite(cost)) {
            options.push({ candidate, cost });
          }
        }
      });
      if (options.length === 0) {
        return null;
      }
      options.sort((a, b) => a.cost - b.cost);
      if (!start) {
        return options[0].candidate;
      }
      for (const option of options) {
        const candidateResult = findRegionPath(
          region,
          { q: start.q, r: start.r },
          { q: option.candidate.q, r: option.candidate.r },
          traversalCost,
        );
        if (candidateResult.status === 'success') {
          return option.candidate;
        }
      }
      return null;
    },
    [region, tileLookup, traversalCost],
  );

  const assignStart = useCallback(
    (tile: TileData) => {
      setStartTile(tile);
      setSelectedTile(tile);
      setMode('inspect');
      setBanner({ tone: 'info', message: `Startpunkt gesetzt: (${tile.q}, ${tile.r}).` });
      if (targetTile) {
        setPendingConvoy({ start: tile, target: targetTile });
      }
    },
    [targetTile],
  );

  const assignTarget = useCallback(
    (tile: TileData) => {
      if (!tile.settleable) {
        const fallback = findReachableNeighbor(tile, startTile);
        if (fallback) {
          setTargetTile(fallback);
          setSelectedTile(fallback);
          setBanner({
            tone: 'warning',
            message: `Ziel (${tile.q}, ${tile.r}) ist blockiert – vorgeschlagenes Ausweichhex (${fallback.q}, ${fallback.r}).`,
          });
        } else {
          setTargetTile(null);
          setSelectedTile(tile);
          setBanner({
            tone: 'danger',
            message: `Ziel (${tile.q}, ${tile.r}) ist blockiert und hat keine erreichbare Nachbarzelle.`,
          });
        }
        setMode('inspect');
        return;
      }
      setTargetTile(tile);
      setSelectedTile(tile);
      setMode('inspect');
      setBanner({ tone: 'success', message: `Ziel gesetzt: (${tile.q}, ${tile.r}).` });
      if (startTile) {
        setPendingConvoy({ start: startTile, target: tile });
      }
    },
    [findReachableNeighbor, startTile],
  );

  const handleTileInteraction = useCallback(
    (tile: TileData) => {
      if (mode === 'start') {
        assignStart(tile);
        return;
      }
      if (mode === 'target') {
        assignTarget(tile);
        return;
      }
      handleInspect(tile);
    },
    [assignStart, assignTarget, handleInspect, mode],
  );

  const handleConvoyConfirm = useCallback(
    (convoy: Convoy, convoyUnits: Unit[]) => {
      setConvoys((previous) => [...previous, convoy]);
      setConvoyPressure((previous) => ({ ...previous, [convoy.id]: convoy.pressureTankMax }));
      setPendingConvoy(null);
      setIsModalOpen(false);
      setBanner({
        tone: 'success',
        message: `Konvoi gestartet – ${actionLabels[convoy.action]} mit ${convoyUnits.length} Einheiten.`,
      });
    },
    [],
  );

  const handleHomeFocus = useCallback(() => {
    if (!homeTile) {
      return;
    }
    setSelectedTile(homeTile);
    setStartTile(homeTile);
    setMode('inspect');
    setBanner({ tone: 'info', message: `Heimathafen fokussiert (${homeTile.q}, ${homeTile.r}).` });
  }, [homeTile]);

  const pathResult = useMemo<PathfindingResult | null>(() => {
    if (!startTile || !targetTile) {
      return null;
    }
    return findRegionPath(
      region,
      { q: startTile.q, r: startTile.r },
      { q: targetTile.q, r: targetTile.r },
      traversalCost,
    );
  }, [region, startTile, targetTile, traversalCost]);

  const pathCoordinates = useMemo(
    () => (pathResult?.status === 'success' ? pathResult.path : []),
    [pathResult],
  );

  const pathPointString = useMemo(
    () =>
      pathCoordinates
        .map((coord) => {
          const cached = tilePositionLookup.get(`${coord.q}_${coord.r}`);
          const { x, y } = cached ?? axialToPixel({ q: coord.q, r: coord.r }, MICRO_HEX_SIZE);
          return `${x},${y}`;
        })
        .join(' '),
    [pathCoordinates, tilePositionLookup],
  );

  const convoyPathPolylines = useMemo(
    () =>
      convoys.map((convoy) => ({
        id: convoy.id,
        state: convoy.state,
        points: convoy.path
          .map((coord) => {
            const cached = tilePositionLookup.get(`${coord.q}_${coord.r}`);
            const { x, y } = cached ?? axialToPixel({ q: coord.q, r: coord.r }, MICRO_HEX_SIZE);
            return `${x},${y}`;
          })
          .join(' '),
      })),
    [convoys, tilePositionLookup],
  );

  const pathKeySet = useMemo(() => new Set(pathCoordinates.map((coord) => `${coord.q}_${coord.r}`)), [pathCoordinates]);

  const selectedTileId = selectedTile ? `${selectedTile.q}_${selectedTile.r}` : null;
  const startTileId = startTile ? `${startTile.q}_${startTile.r}` : null;
  const targetTileId = targetTile ? `${targetTile.q}_${targetTile.r}` : null;

  const modalUnits = useMemo(() => {
    if (!pendingConvoy) {
      return [] as Unit[];
    }
    return unitsByTile.get(`${pendingConvoy.start.q}_${pendingConvoy.start.r}`) ?? [];
  }, [pendingConvoy, unitsByTile]);

  const modeHint = useMemo(() => {
    if (mode === 'start') {
      return 'Modus: Startpunkt setzen – klicke ein Hex oder nutze Enter.';
    }
    if (mode === 'target') {
      return 'Modus: Ziel setzen – klicke ein Hex oder nutze Enter.';
    }
    if (startTile && targetTile) {
      return 'Pfad angezeigt – klicke ein Hex für Details.';
    }
    if (startTile) {
      return 'Startpunkt fixiert – wähle ein Zielhex.';
    }
    if (targetTile) {
      return 'Ziel ist gewählt – setze noch einen Startpunkt.';
    }
    return 'Erkunden – lege Start- und Zielhex fest, um einen Pfad zu berechnen.';
  }, [mode, startTile, targetTile]);

  const pathStatus = useMemo(() => {
    if (!startTile && !targetTile) {
      return { tone: 'info' as BannerTone, message: 'Wähle einen Startpunkt, um die Route zu planen.' };
    }
    if (startTile && !targetTile) {
      return { tone: 'info' as BannerTone, message: 'Startpunkt fixiert – Zielhex auswählen.' };
    }
    if (!startTile && targetTile) {
      return { tone: 'warning' as BannerTone, message: 'Ziel gewählt – setze zuerst einen Startpunkt.' };
    }
    if (!pathResult) {
      return null;
    }
    if (pathResult.status === 'success') {
      const steps = Math.max(pathResult.path.length - 1, 0);
      const formattedCost = numberFormatter.format(pathResult.cost);
      const stepLabel = steps === 1 ? 'Sprung' : 'Sprünge';
      return {
        tone: 'success' as BannerTone,
        message: `Pfad gefunden – ${steps} ${stepLabel} • Gesamtkosten ${formattedCost}`,
      };
    }
    return {
      tone: failureTones[pathResult.reason],
      message: failureMessages[pathResult.reason],
    };
  }, [numberFormatter, pathResult, startTile, targetTile]);

  const describeTile = useCallback(
    (tile: TileData) => {
      const base = `${tile.biome} (${tile.q},${tile.r})`;
      const details: string[] = [tile.settleable ? 'Besiedelbar' : 'Unbewohnbar'];
      if (tile.poi?.length) {
        details.push(`POI: ${tile.poi.join(', ')}`);
      }
      if (tile.allianceId) {
        const meta = alliancesById.get(tile.allianceId);
        details.push(`Bande: ${meta?.tag ?? tile.allianceId}`);
      } else {
        details.push('Neutral');
      }
      return `${base} – ${details.join(' • ')}`;
    },
    [alliancesById],
  );

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-slate-950/80">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-yellow-500/20 bg-black/40 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={`${selectionButtonClass} ${mode === 'start' ? 'border-cyan-300/70 text-cyan-100' : ''}`}
            onClick={() => setMode(mode === 'start' ? 'inspect' : 'start')}
            aria-pressed={mode === 'start'}
          >
            {mode === 'start' ? 'Startpunkt setzen …' : 'Startpunkt wählen'}
          </button>
          <button
            type="button"
            className={`${selectionButtonClass} ${mode === 'target' ? 'border-amber-300/70 text-amber-100' : ''}`}
            onClick={() => setMode(mode === 'target' ? 'inspect' : 'target')}
            aria-pressed={mode === 'target'}
          >
            {mode === 'target' ? 'Ziel setzen …' : 'Ziel wählen'}
          </button>
          <button
            type="button"
            className={`${selectionButtonClass} border-rose-500/40 text-rose-100 hover:border-rose-400/60 hover:bg-rose-500/10`}
            onClick={() => {
              setStartTile(null);
              setTargetTile(null);
              setSelectedTile(null);
              setPendingConvoy(null);
              setBanner({ tone: 'info', message: 'Pfadplanung zurückgesetzt.' });
            }}
          >
            Zurücksetzen
          </button>
          {allianceOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`${filterButtonClass} ${
                activeAllianceFilter === option.id ? 'border-yellow-400/60 bg-yellow-500/10 text-yellow-100' : ''
              }`}
              onClick={() => handleAllianceFilterChange(option.id)}
              style={{
                borderColor: option.color ? applyAlpha(option.color, 0.6) : undefined,
                backgroundColor: option.color ? applyAlpha(option.color, 0.12) : undefined,
              }}
            >
              {option.label}
              <span className="ml-1 text-[0.6rem] text-yellow-100/70">({option.count})</span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-[0.65rem] uppercase tracking-wide text-yellow-200">
            Zoom
            <input
              type="range"
              min="0.8"
              max="1.6"
              step="0.05"
              value={mapZoom}
              onChange={(event) => setMapZoom(Number(event.target.value))}
              className="h-1 w-32 accent-yellow-400"
            />
          </label>
          <button
            type="button"
            className={`${selectionButtonClass} border-cyan-400/60 text-cyan-100`}
            onClick={handleHomeFocus}
          >
            Zu Heimat
          </button>
          <button
            type="button"
            className={`${selectionButtonClass} border-yellow-500/40 text-yellow-100`}
            onClick={() => setIsTableOpen((previous) => !previous)}
          >
            {isTableOpen ? 'Liste ausblenden' : 'Liste einblenden'}
          </button>
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="relative flex-[3] overflow-hidden">
          <div className="absolute inset-0">
            <svg
              viewBox="-380 -380 760 760"
              className="h-full w-full"
              role="presentation"
              aria-hidden="true"
            >
              <defs>
                <radialGradient id="region-center" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(248,250,252,0.1)" />
                  <stop offset="100%" stopColor="rgba(15,23,42,0.1)" />
                </radialGradient>
                <filter id="region-hex-shadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="rgba(15,23,42,0.75)" />
                </filter>
                <pattern
                  id="region-unsettleable-hatch"
                  width="6"
                  height="6"
                  patternUnits="userSpaceOnUse"
                  patternTransform="rotate(45)"
                >
                  <rect width="6" height="6" fill="rgba(127,29,29,0.12)" />
                  <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(248,113,113,0.55)" strokeWidth="2" />
                </pattern>
              </defs>
              <g style={{ transform: `scale(${mapZoom})`, transformOrigin: 'center' }}>
                <rect x="-600" y="-600" width="1200" height="1200" fill="#020617" />
                <circle cx={0} cy={0} r={REGION_RADIUS * MICRO_HEX_SIZE * 2.8} fill="url(#region-center)" />
                {staticLayer ? (
                  <image
                    href={staticLayer.href}
                    x={staticLayer.origin.x}
                    y={staticLayer.origin.y}
                    width={staticLayer.width}
                    height={staticLayer.height}
                    preserveAspectRatio="none"
                    style={{ imageRendering: 'auto' }}
                  />
                ) : (
                  <>
                    {backgroundPixelEntries.map(({ q, r, x, y }) => (
                      <HexPolygon
                        key={`bg-${q}-${r}`}
                        cx={x}
                        cy={y}
                        size={MICRO_HEX_SIZE * 1.05}
                        stroke="rgba(148,163,184,0.08)"
                        fill={((q + r) & 1) === 0 ? 'rgba(15,23,42,0.25)' : 'rgba(15,23,42,0.18)'}
                        strokeWidth={0.75}
                      />
                    ))}
                  </>
                )}
                {convoyPathPolylines.map((polyline) => (
                  <polyline
                    key={polyline.id}
                    points={polyline.points}
                    fill="none"
                    stroke={polyline.state === 'failed' ? 'rgba(248,113,113,0.75)' : 'rgba(14,165,233,0.6)'}
                    strokeWidth={polyline.state === 'returning' ? 2 : 3}
                    strokeDasharray={polyline.state === 'returning' ? '3 5' : '8 6'}
                    strokeLinecap="round"
                  />
                ))}
                {pathPointString ? (
                  <polyline
                    points={pathPointString}
                    fill="none"
                    stroke="rgba(253,224,71,0.8)"
                    strokeWidth={3}
                    strokeDasharray="10 5"
                    strokeLinecap="round"
                  />
                ) : null}
                {tiles.map((tile) => {
                  const position = tilePositionLookup.get(`${tile.q}_${tile.r}`);
                  if (!position) {
                    return null;
                  }
                  const { x, y } = position;
                  const key = `${tile.q}_${tile.r}`;
                  const isSelected = selectedTileId === key;
                  const isStart = startTileId === key;
                  const isTarget = targetTileId === key;
                  const isPath = pathKeySet.has(key);
                  const matchesFilter = matchesAllianceFilter(tile);
                  const isDimmed = filterIsActive && !matchesFilter;
                  const allianceMeta = tile.allianceId ? alliancesById.get(tile.allianceId) : undefined;
                  const defaultStroke = tile.settleable ? '#1e293b' : 'rgba(248,113,113,0.7)';
                  const baseStrokeWidth = tile.settleable ? 1.75 : 2.1;
                  const pointerFill = staticLayer
                    ? 'rgba(255,255,255,0.0001)'
                    : tile.settleable
                      ? biomeFill(tile.biome)
                      : 'url(#region-unsettleable-hatch)';
                  const pointerStroke = staticLayer ? 'rgba(0,0,0,0)' : isSelected ? '#fbbf24' : defaultStroke;
                  const pointerStrokeWidth = staticLayer ? 0.001 : isSelected ? 3 : baseStrokeWidth;
                  const overlayFill = allianceMeta
                    ? applyAlpha(allianceMeta.color, matchesFilter ? 0.28 : 0.12)
                    : undefined;
                  const unitsHere = unitsByTile.get(key) ?? [];
                  const isHome = homeTile && homeTile.q === tile.q && homeTile.r === tile.r;
                  const crestLabel = allianceMeta ? allianceMeta.tag.slice(0, 2) : 'NE';
                  const showLabel = mapZoom >= 1.35 || (mapZoom >= 1 && (isSelected || hoveredTileId === key));
                  const showCrest = mapZoom >= 0.85;
                  return (
                    <g
                      key={key}
                      filter="url(#region-hex-shadow)"
                      onClick={() => handleTileInteraction(tile)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          handleTileInteraction(tile);
                        }
                      }}
                      onMouseEnter={() => setHoveredTileId(key)}
                      onMouseLeave={() => setHoveredTileId((previous) => (previous === key ? null : previous))}
                      tabIndex={0}
                      role="button"
                      aria-label={describeTile(tile)}
                      aria-pressed={isSelected}
                      style={{ cursor: 'pointer', opacity: isDimmed ? 0.32 : 1, transition: 'opacity 180ms ease' }}
                    >
                      <HexPolygon
                        cx={x}
                        cy={y}
                        size={MICRO_HEX_SIZE}
                        stroke={pointerStroke}
                        fill={pointerFill}
                        strokeWidth={pointerStrokeWidth}
                      />
                      {isPath ? (
                        <HexPolygon
                          cx={x}
                          cy={y}
                          size={MICRO_HEX_SIZE * 0.85}
                          stroke="rgba(56,189,248,0.45)"
                          fill="rgba(56,189,248,0.18)"
                          strokeWidth={1.5}
                        />
                      ) : null}
                      {overlayFill ? (
                        <HexPolygon
                          cx={x}
                          cy={y}
                          size={MICRO_HEX_SIZE * 0.92}
                          stroke={applyAlpha(allianceMeta?.color ?? '#facc15', matchesFilter ? 0.85 : 0.45)}
                          fill={overlayFill}
                          strokeWidth={1.4}
                        />
                      ) : null}
                      {isHome ? (
                        <HexPolygon
                          cx={x}
                          cy={y}
                          size={MICRO_HEX_SIZE * 1.05}
                          stroke="#fcd34d"
                          fill="none"
                          strokeWidth={2.2}
                          className="animate-pulse"
                        />
                      ) : null}
                      {showCrest ? (
                        <text
                          x={x}
                          y={y + (showLabel ? -2 : 2)}
                          textAnchor="middle"
                          fontSize={showLabel ? 9 : 7}
                          fill="#fefce8"
                          fontFamily="Cinzel"
                          style={{ pointerEvents: 'none' }}
                          opacity={isDimmed ? 0.58 : 0.95}
                        >
                          {crestLabel}
                        </text>
                      ) : null}
                      {showLabel ? (
                        <text
                          x={x}
                          y={y + 10}
                          textAnchor="middle"
                          fontSize={7}
                          fill="#e2e8f0"
                          fontFamily="Cinzel"
                          style={{ pointerEvents: 'none' }}
                        >
                          {tile.biome}
                        </text>
                      ) : null}
                      {isStart ? (
                        <text
                          x={x}
                          y={y - 18}
                          textAnchor="middle"
                          fontSize={8}
                          fill="#38bdf8"
                          fontFamily="Cinzel"
                        >
                          Start
                        </text>
                      ) : null}
                      {isTarget ? (
                        <text
                          x={x}
                          y={y + 20}
                          textAnchor="middle"
                          fontSize={8}
                          fill="#facc15"
                          fontFamily="Cinzel"
                        >
                          Ziel
                        </text>
                      ) : null}
                      {unitsHere.length ? (
                        <g transform={`translate(${x - 10},${y - 18})`}>
                          <rect width="20" height="8" rx="4" fill="rgba(15,23,42,0.7)" stroke="rgba(248,250,252,0.4)" strokeWidth={0.6} />
                          <text
                            x={10}
                            y={5.5}
                            textAnchor="middle"
                            fontSize={6}
                            fill="#f8fafc"
                            fontFamily="Cinzel"
                          >
                            {unitsHere.length}×
                          </text>
                        </g>
                      ) : null}
                      <title>{describeTile(tile)}</title>
                    </g>
                  );
                })}
                {convoys.map((convoy) => {
                  if (convoy.state === 'done' || convoy.state === 'failed') {
                    return null;
                  }
                  const lead = units.find((unit) => convoy.unitIds.includes(unit.id));
                  if (!lead) {
                    return null;
                  }
                  const position = tilePositionLookup.get(`${lead.location.q}_${lead.location.r}`);
                  if (!position) {
                    return null;
                  }
                  const remaining = convoyPressure[convoy.id] ?? convoy.pressureTankMax;
                  const fraction = convoy.pressureTankMax > 0 ? remaining / convoy.pressureTankMax : 0;
                  return (
                    <g key={`convoy-${convoy.id}`} transform={`translate(${position.x - 12},${position.y - 30})`}>
                      <rect width="24" height="6" rx="3" fill="rgba(15,23,42,0.9)" stroke="rgba(250,204,21,0.7)" strokeWidth={0.8} />
                      <rect
                        x="1"
                        y="1"
                        width={22 * fraction}
                        height="4"
                        rx="2"
                        fill={fraction > 0.4 ? 'rgba(74,222,128,0.8)' : 'rgba(248,113,113,0.8)'}
                      />
                    </g>
                  );
                })}
              </g>
            </svg>
            {pathStatus ? (
              <div
                className={`pointer-events-none absolute left-4 top-4 flex max-w-xs rounded-full border px-4 py-1.5 text-[0.65rem] uppercase tracking-wide ${toneClasses[pathStatus.tone]}`}
              >
                {pathStatus.message}
              </div>
            ) : null}
            <div className="pointer-events-none absolute left-4 bottom-4 flex flex-col gap-2 text-[0.65rem] uppercase tracking-wide text-slate-200">
              <div className="rounded-full border border-slate-700/60 bg-black/40 px-3 py-1 text-slate-200">{modeHint}</div>
            </div>
          </div>
        </div>
        <div
          className={`relative flex w-full max-w-md flex-col border-l border-yellow-500/20 bg-slate-950/80 transition-transform duration-300 ${
            isTableOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between border-b border-yellow-500/20 px-4 py-3 text-xs uppercase tracking-wide text-yellow-200">
            <span>Regionstabelle</span>
            <button
              type="button"
              className="rounded-full border border-yellow-500/40 px-3 py-1 text-[0.6rem] uppercase tracking-wide text-yellow-100"
              onClick={() => setIsTableOpen(false)}
            >
              Ausblenden
            </button>
          </div>
          <div className="flex-1 overflow-hidden p-3">
            <RegionTileTable
              tiles={filteredTiles}
              selectedTileId={selectedTileId}
              startTileId={startTileId}
              targetTileId={targetTileId}
              onInspect={handleInspect}
              onAssignStart={assignStart}
              onAssignTarget={assignTarget}
              alliances={alliancesById}
              filterLabel={filterLabel}
              totalTiles={tiles.length}
              isFilterActive={filterIsActive}
              onClearFilter={() => setActiveAllianceFilter('all')}
              unitsByTile={unitsByTile}
            />
          </div>
        </div>
      </div>
      {selectedTile ? (
        <div className="border-t border-yellow-500/20 bg-black/40 px-4 py-3 text-xs uppercase tracking-wide text-yellow-200">
          <span>
            Hex {selectedTile.q}, {selectedTile.r} – {selectedTile.biome} • {selectedTile.settleable ? 'Besiedelbar' : 'Unbewohnbar'}
          </span>
        </div>
      ) : null}
      {banner ? (
        <div
          className={`fixed bottom-8 left-1/2 z-20 -translate-x-1/2 rounded-full border px-6 py-2 text-xs uppercase tracking-wide shadow-2xl ${toneClasses[banner.tone]}`}
        >
          {banner.message}
        </div>
      ) : null}
      <div className="pointer-events-none absolute right-6 top-24 z-30 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`rounded-full border px-4 py-1.5 text-[0.65rem] uppercase tracking-wide ${toneClasses[toast.tone]}`}
          >
            {toast.message}
          </div>
        ))}
      </div>
      {isModalOpen && pendingConvoy ? (
        <ConvoyActionModal
          region={region}
          start={pendingConvoy.start}
          target={pendingConvoy.target}
          availableUnits={modalUnits}
          onClose={() => {
            setIsModalOpen(false);
            setPendingConvoy(null);
          }}
          onConfirm={handleConvoyConfirm}
        />
      ) : null}
    </div>
  );
};

const traceHexPath = (context: CanvasRenderingContext2D, cx: number, cy: number, size: number) => {
  context.beginPath();
  for (let index = 0; index < 6; index += 1) {
    const angle = ((60 * index - 30) * Math.PI) / 180;
    const px = cx + size * Math.cos(angle);
    const py = cy + size * Math.sin(angle);
    if (index === 0) {
      context.moveTo(px, py);
    } else {
      context.lineTo(px, py);
    }
  }
  context.closePath();
};

const drawBackgroundHex = (
  context: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  even: boolean,
) => {
  traceHexPath(context, cx, cy, size);
  context.fillStyle = even ? 'rgba(15,23,42,0.25)' : 'rgba(15,23,42,0.18)';
  context.fill();
  traceHexPath(context, cx, cy, size);
  context.lineWidth = 0.75;
  context.strokeStyle = 'rgba(148,163,184,0.08)';
  context.stroke();
};

const drawRegionHex = (
  context: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  tile: TileData,
  size: number,
) => {
  traceHexPath(context, cx, cy, size);
  if (tile.settleable) {
    context.fillStyle = biomeFill(tile.biome);
    context.fill();
  } else {
    context.fillStyle = 'rgba(127,29,29,0.12)';
    context.fill();
    context.save();
    traceHexPath(context, cx, cy, size);
    context.clip();
    context.save();
    context.translate(cx, cy);
    context.rotate(Math.PI / 4);
    const extent = size * 3;
    context.fillStyle = 'rgba(127,29,29,0.12)';
    context.fillRect(-extent, -extent, extent * 2, extent * 2);
    context.strokeStyle = 'rgba(248,113,113,0.55)';
    context.lineWidth = 2;
    for (let offset = -extent * 2; offset <= extent * 2; offset += 6) {
      context.beginPath();
      context.moveTo(offset, -extent * 2);
      context.lineTo(offset, extent * 2);
      context.stroke();
    }
    context.restore();
    context.restore();
  }
  traceHexPath(context, cx, cy, size);
  context.lineWidth = tile.settleable ? 1.75 : 2.1;
  context.strokeStyle = tile.settleable ? '#1e293b' : 'rgba(248,113,113,0.7)';
  context.stroke();
};

const HexPolygon: React.FC<HexPolygonProps> = React.memo(
  ({ cx, cy, size, stroke = '#1f2937', strokeWidth = 1.5, fill = '#94a3b8' }) => {
    const points = useMemo(() => {
      const vertices: string[] = [];
      for (let index = 0; index < 6; index += 1) {
        const angle = ((60 * index - 30) * Math.PI) / 180;
        const px = cx + size * Math.cos(angle);
        const py = cy + size * Math.sin(angle);
        vertices.push(`${px},${py}`);
      }
      return vertices.join(' ');
    }, [cx, cy, size]);

    return <polygon points={points} stroke={stroke} fill={fill} strokeWidth={strokeWidth} />;
  },
);
HexPolygon.displayName = 'RegionHex';

const biomeFill = (biome: string) => {
  switch (biome) {
    case 'Steppe':
      return '#9ca948';
    case 'Wald':
      return '#2f7d4d';
    case 'Hochland':
      return '#657d93';
    case 'Moor':
      return '#3b4a34';
    case 'Ödland':
      return '#71553a';
    case 'Dampfwiese':
      return '#5aa0a8';
    case 'Kristallufer':
      return '#75b3d1';
    case 'Rußklippen':
      return '#4b3b32';
    default:
      return '#64748b';
  }
};

/** Memoized wrapper for the 19-tile region renderer. */
export const RegionView = React.memo(RegionViewComponent);
RegionView.displayName = 'RegionView';
