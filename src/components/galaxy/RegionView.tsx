import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { MICRO_HEX_SIZE, REGION_RADIUS } from '@/constants/map';
import { axialDisk, axialLine, axialToPixel } from '@/lib/hex';
import { RegionTileTable } from '@/components/galaxy/RegionTileTable';
import type { RegionData, TileData } from '@/types/map';
import { useAllianceStore } from '@/store/allianceStore';
import { applyAlpha } from '@/lib/color';

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
  const [selectedTile, setSelectedTile] = useState<TileData | null>(null);
  const [startTile, setStartTile] = useState<TileData | null>(null);
  const [targetTile, setTargetTile] = useState<TileData | null>(null);
  const [mode, setMode] = useState<SelectionMode>('inspect');
  const [activeAllianceFilter, setActiveAllianceFilter] = useState<AllianceFilter>('all');
  const alliances = useAllianceStore((state) => state.alliances);
  const initializeAlliances = useAllianceStore((state) => state.initialize);

  useEffect(() => {
    void initializeAlliances();
  }, [initializeAlliances]);

  useEffect(() => {
    setSelectedTile(null);
    setStartTile(null);
    setTargetTile(null);
    setMode('inspect');
  }, [region.regionId]);

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

  const assignStart = useCallback((tile: TileData) => {
    setStartTile(tile);
    setSelectedTile(tile);
    setMode('inspect');
  }, []);

  const assignTarget = useCallback((tile: TileData) => {
    setTargetTile(tile);
    setSelectedTile(tile);
    setMode('inspect');
  }, []);

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

  const path = useMemo(() => {
    if (!startTile || !targetTile) {
      return [] as TileData[];
    }
    const coordinates = axialLine({ q: startTile.q, r: startTile.r }, { q: targetTile.q, r: targetTile.r });
    return coordinates.map((coord) => tiles.find((tile) => tile.q === coord.q && tile.r === coord.r)).filter(Boolean) as TileData[];
  }, [startTile, targetTile, tiles]);

  const pathPointString = useMemo(() => {
    if (!startTile || !targetTile) {
      return '';
    }
    const coordinates = axialLine({ q: startTile.q, r: startTile.r }, { q: targetTile.q, r: targetTile.r });
    return coordinates
      .map((coord) => {
        const { x, y } = axialToPixel({ q: coord.q, r: coord.r }, MICRO_HEX_SIZE);
        return `${x},${y}`;
      })
      .join(' ');
  }, [startTile, targetTile]);

  const pathKeySet = useMemo(() => new Set(path.map((tile) => `${tile.q}_${tile.r}`)), [path]);

  const selectedTileId = selectedTile ? `${selectedTile.q}_${selectedTile.r}` : null;
  const startTileId = startTile ? `${startTile.q}_${startTile.r}` : null;
  const targetTileId = targetTile ? `${targetTile.q}_${targetTile.r}` : null;

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

  const selectedAlliance = selectedTile?.allianceId ? alliancesById.get(selectedTile.allianceId) : undefined;

  return (
    <div className="flex h-full flex-col gap-4 p-4 md:flex-row">
      <div className="flex flex-1 flex-col gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
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
                setMode('inspect');
              }}
            >
              Pfad zurücksetzen
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={`${filterButtonClass} ${!filterIsActive ? 'border-yellow-400/60 text-yellow-100' : ''}`}
              onClick={() => setActiveAllianceFilter('all')}
              aria-pressed={!filterIsActive}
            >
              Alle Banden
            </button>
            {allianceOptions.map((option) => {
              const isActive = activeAllianceFilter === option.id;
              const indicatorColor = option.color ?? '#cbd5f5';
              return (
                <button
                  key={option.id}
                  type="button"
                  className={`${filterButtonClass} ${isActive ? 'border-yellow-400/70 text-yellow-100' : ''}`}
                  style={{
                    borderColor: applyAlpha(indicatorColor, isActive ? 0.75 : 0.35),
                    background: isActive ? applyAlpha(indicatorColor, 0.18) : undefined,
                  }}
                  onClick={() => handleAllianceFilterChange(option.id)}
                  aria-pressed={isActive}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: indicatorColor }}
                      aria-hidden="true"
                    />
                    <span>{option.label}</span>
                    <span className="ml-1 rounded bg-black/40 px-1 py-[1px] text-[0.6rem] text-yellow-100/80">
                      {option.count}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex-1 overflow-hidden rounded-3xl border border-slate-700/60 bg-slate-900/60 shadow-inner">
          <svg role="presentation" className="h-full w-full" viewBox="-140 -140 280 280" preserveAspectRatio="xMidYMid meet">
            <defs>
              <radialGradient id="region-center" cx="50%" cy="48%" r="60%">
                <stop offset="0%" stopColor="rgba(34,211,238,0.55)" />
                <stop offset="65%" stopColor="rgba(56,189,248,0.15)" />
                <stop offset="100%" stopColor="rgba(15,23,42,0)" />
              </radialGradient>
              <filter id="region-hex-shadow" x="-30%" y="-30%" width="160%" height="160%">
                <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="rgba(15,23,42,0.8)" floodOpacity="0.5" />
              </filter>
            </defs>
            <rect x="-600" y="-600" width="1200" height="1200" fill="#020617" />
            <circle cx={0} cy={0} r={REGION_RADIUS * MICRO_HEX_SIZE * 2.8} fill="url(#region-center)" />
            {pathPointString ? (
              <polyline
                points={pathPointString}
                fill="none"
                stroke="rgba(56,189,248,0.85)"
                strokeWidth={3}
                strokeDasharray="8 6"
                strokeLinecap="round"
              />
            ) : null}
            {backgroundTiles.map(({ q, r }) => {
              const { x, y } = axialToPixel({ q, r }, MICRO_HEX_SIZE * 1.05);
              return (
                <HexPolygon
                  key={`bg-${q}-${r}`}
                  cx={x}
                  cy={y}
                  size={MICRO_HEX_SIZE * 1.05}
                  stroke="rgba(148,163,184,0.08)"
                  fill={((q + r) & 1) === 0 ? 'rgba(15,23,42,0.25)' : 'rgba(15,23,42,0.18)'}
                  strokeWidth={0.75}
                />
              );
            })}
            {tiles.map((tile) => {
              const { x, y } = axialToPixel({ q: tile.q, r: tile.r }, MICRO_HEX_SIZE);
              const key = `${tile.q}_${tile.r}`;
              const isSelected = selectedTileId === key;
              const isStart = startTileId === key;
              const isTarget = targetTileId === key;
              const isPath = pathKeySet.has(key);
              const matchesFilter = matchesAllianceFilter(tile);
              const isDimmed = filterIsActive && !matchesFilter;
              const allianceMeta = tile.allianceId ? alliancesById.get(tile.allianceId) : undefined;
              const overlayFill = allianceMeta
                ? applyAlpha(allianceMeta.color, matchesFilter ? 0.28 : 0.12)
                : undefined;
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
                  tabIndex={0}
                  role="button"
                  aria-label={describeTile(tile)}
                  aria-pressed={isSelected}
                  style={{ cursor: 'pointer', opacity: isDimmed ? 0.32 : 1 }}
                >
                  <HexPolygon
                    cx={x}
                    cy={y}
                    size={MICRO_HEX_SIZE}
                    stroke={isSelected ? '#fbbf24' : '#1e293b'}
                    fill={biomeFill(tile.biome)}
                    strokeWidth={isSelected ? 3 : 1.75}
                  />
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
                  {isPath ? (
                    <HexPolygon
                      cx={x}
                      cy={y}
                      size={MICRO_HEX_SIZE * 0.85}
                      stroke="rgba(56,189,248,0.35)"
                      fill="rgba(56,189,248,0.15)"
                      strokeWidth={1.5}
                    />
                  ) : null}
                  {tile.poi?.length ? (
                    <circle cx={x} cy={y} r={6} fill="rgba(148,163,184,0.35)" stroke="#38bdf8" strokeWidth={1.5} />
                  ) : null}
                  {!tile.settleable ? (
                    <line x1={x - 12} y1={y - 12} x2={x + 12} y2={y + 12} stroke="rgba(248,113,113,0.85)" strokeWidth={2} />
                  ) : null}
                  {!tile.settleable ? (
                    <line x1={x + 12} y1={y - 12} x2={x - 12} y2={y + 12} stroke="rgba(248,113,113,0.85)" strokeWidth={2} />
                  ) : null}
                  {isStart ? (
                    <text
                      x={x}
                      y={y - 16}
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
                      y={y + 18}
                      textAnchor="middle"
                      fontSize={8}
                      fill="#facc15"
                      fontFamily="Cinzel"
                    >
                      Ziel
                    </text>
                  ) : null}
                  {allianceMeta ? (
                    <text
                      x={x}
                      y={y + 4}
                      textAnchor="middle"
                      fontSize={7}
                      fill="#fefce8"
                      fontFamily="Cinzel"
                      style={{ pointerEvents: 'none' }}
                      opacity={isDimmed ? 0.58 : 0.95}
                    >
                      {allianceMeta.tag}
                    </text>
                  ) : null}
                  <title>{describeTile(tile)}</title>
                </g>
              );
            })}
          </svg>
        </div>
        {selectedTile ? (
          <div className="rounded-2xl border border-yellow-800/30 bg-black/40 p-4 text-sm text-slate-100">
            <h2 className="text-lg font-cinzel text-yellow-200">Hex {selectedTile.q}, {selectedTile.r}</h2>
            <dl className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-400">Biom</dt>
                <dd>{selectedTile.biome}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Status</dt>
                <dd>{selectedTile.settleable ? 'Besiedelbar' : 'Unbewohnbar'}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-400">Kontrolle</dt>
                <dd className="flex items-center gap-2">
                  {selectedAlliance ? (
                    <>
                      <span
                        className="inline-flex h-3 w-3 rounded-full"
                        style={{ backgroundColor: selectedAlliance.color }}
                        aria-hidden="true"
                      />
                      <span>{selectedAlliance.tag}</span>
                    </>
                  ) : (
                    <span>Neutral</span>
                  )}
                </dd>
              </div>
              {selectedTile.poi?.length ? (
                <div className="flex justify-between">
                  <dt className="text-slate-400">Besonderheiten</dt>
                  <dd className="text-right text-cyan-200">{selectedTile.poi.join(', ')}</dd>
                </div>
              ) : null}
            </dl>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-800/40 bg-slate-950/60 p-4 text-sm text-slate-300">
            Wähle ein Hexfeld oder einen Tabelleneintrag, um Details einzublenden.
          </div>
        )}
      </div>
      <aside className="flex h-full min-h-[260px] flex-1 flex-col gap-3 md:max-w-md">
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
          totalTiles={filteredTiles.length}
          isFilterActive={filterIsActive}
          onClearFilter={() => setActiveAllianceFilter('all')}
        />
      </aside>
    </div>
  );
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
