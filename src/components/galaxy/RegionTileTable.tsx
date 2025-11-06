import React from 'react';
import type { TileData } from '@/types/map';
import { applyAlpha } from '@/lib/color';

interface RegionTileTableProps {
  tiles: TileData[];
  selectedTileId: string | null;
  startTileId: string | null;
  targetTileId: string | null;
  onInspect: (tile: TileData) => void;
  onAssignStart: (tile: TileData) => void;
  onAssignTarget: (tile: TileData) => void;
  alliances: Map<string, { tag: string; color: string; name?: string }>;
  filterLabel: string;
  totalTiles: number;
  isFilterActive: boolean;
  onClearFilter: () => void;
}

const badgeClass =
  'inline-flex items-center justify-center rounded-full border border-yellow-500/40 px-2 py-0.5 text-[0.6rem] uppercase tracking-wide';

const actionButtonClass =
  'rounded-md border border-yellow-500/40 bg-slate-900/60 px-2 py-1 text-xs text-yellow-100 transition hover:border-yellow-400/60 hover:bg-yellow-500/10';

const rowClass =
  'grid grid-cols-[90px_minmax(0,1fr)_90px_120px_132px] items-center gap-3 border-b border-yellow-500/10 px-3 py-2 text-left text-sm text-slate-100 last:border-b-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70';

const headerClass =
  'grid grid-cols-[90px_minmax(0,1fr)_90px_120px_132px] items-center gap-3 border-b border-yellow-500/30 bg-black/60 px-3 py-2 text-[0.6rem] uppercase tracking-wide text-yellow-200';

const formatCoordinate = (tile: TileData) => `${tile.q}, ${tile.r}`;

const describeTile = (tile: TileData, allianceLabel: string) => {
  const poi = tile.poi?.length ? ` – POI: ${tile.poi.join(', ')}` : '';
  const settleable = tile.settleable ? 'Besiedelbar' : 'Unbewohnbar';
  return `Hex ${tile.q},${tile.r}: ${tile.biome}, ${settleable} – ${allianceLabel}${poi}`;
};

/**
 * Compact table view of region tiles to keep the tabular data discoverable inside the game UI.
 */
const RegionTileTableComponent: React.FC<RegionTileTableProps> = ({
  tiles,
  selectedTileId,
  startTileId,
  targetTileId,
  onInspect,
  onAssignStart,
  onAssignTarget,
  alliances,
  filterLabel,
  totalTiles,
  isFilterActive,
  onClearFilter,
}) => (
  <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-yellow-800/40 bg-black/50">
    <div className="flex items-center justify-between border-b border-yellow-500/20 bg-black/40 px-3 py-2 text-xs uppercase tracking-wide text-yellow-200">
      <div className="flex flex-col leading-tight text-[0.65rem] text-yellow-100">
        <span>{filterLabel}</span>
        <span className="text-[0.6rem] text-yellow-200/70">{totalTiles} Einträge</span>
      </div>
      {isFilterActive ? (
        <button
          type="button"
          onClick={onClearFilter}
          className="rounded-full border border-yellow-500/40 px-3 py-1 text-[0.6rem] uppercase tracking-wide text-yellow-100 transition hover:border-yellow-400/60 hover:bg-yellow-500/10"
        >
          Filter zurücksetzen
        </button>
      ) : null}
    </div>
    <div className={headerClass}>
      <span>Koordinate</span>
      <span>Biom</span>
      <span>Status</span>
      <span>Bande</span>
      <span className="text-right">Aktionen</span>
    </div>
    <div className="flex-1 overflow-y-auto" data-scrollable="true">
      <ul className="divide-y divide-yellow-500/10">
        {tiles.map((tile) => {
          const key = `${tile.q}_${tile.r}`;
          const isSelected = selectedTileId === key;
          const isStart = startTileId === key;
          const isTarget = targetTileId === key;
          const allianceMeta = tile.allianceId ? alliances.get(tile.allianceId) : undefined;
          const allianceLabel = allianceMeta?.tag ?? (tile.allianceId ? tile.allianceId : 'Neutral');
          const allianceColor = allianceMeta?.color ?? '#475569';
          return (
            <li key={key}>
              <button
                type="button"
                className={`${rowClass} ${
                  isSelected ? 'bg-yellow-900/30 text-yellow-100' : 'hover:bg-yellow-800/20'
                }`}
                onClick={() => onInspect(tile)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onInspect(tile);
                  }
                }}
                aria-pressed={isSelected}
                aria-label={describeTile(tile, allianceLabel)}
              >
                <span className="font-cinzel text-base">{formatCoordinate(tile)}</span>
                <span className="truncate text-sm">
                  {tile.biome}
                  {tile.poi?.length ? (
                    <span className="ml-2 text-xs text-cyan-200">{tile.poi.join(', ')}</span>
                  ) : null}
                </span>
                <span>
                  <span
                    className={`${badgeClass} ${
                      tile.settleable
                        ? 'border-emerald-500/50 text-emerald-200'
                        : 'border-rose-500/50 text-rose-200'
                    }`}
                  >
                    {tile.settleable ? 'Besiedelbar' : 'Unbewohnbar'}
                  </span>
                </span>
                <span>
                  <span
                    className="inline-flex items-center gap-2 rounded-full border px-2 py-0.5 text-[0.6rem] uppercase tracking-wide"
                    style={{
                      backgroundColor: applyAlpha(allianceColor, 0.18),
                      borderColor: applyAlpha(allianceColor, 0.6),
                    }}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: allianceColor }}
                      aria-hidden="true"
                    />
                    {allianceLabel}
                  </span>
                </span>
                <span className="flex justify-end gap-2">
                  <button
                    type="button"
                    className={`${actionButtonClass} ${isStart ? 'border-cyan-300/60 text-cyan-100' : ''}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onAssignStart(tile);
                    }}
                  >
                    {isStart ? 'Start •' : 'Start'}
                  </button>
                  <button
                    type="button"
                    className={`${actionButtonClass} ${isTarget ? 'border-amber-300/60 text-amber-100' : ''}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onAssignTarget(tile);
                    }}
                  >
                    {isTarget ? 'Ziel •' : 'Ziel'}
                  </button>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  </div>
);

RegionTileTableComponent.displayName = 'RegionTileTable';

/** Memoized wrapper for the region tile table. */
export const RegionTileTable = React.memo(RegionTileTableComponent);

