import React from 'react';
import type { Tile } from '@/data/types';

interface RegionSummaryTableProps {
  /** Tiles rendered in the current region view. */
  tiles: Tile[];
  /** Optional tile currently inspected in the UI. */
  selectedTileKey?: string | null;
  /** Invoked when the user clicks a row to inspect a tile. */
  onInspect: (tile: Tile) => void;
}

const headerClass =
  'grid grid-cols-[88px_minmax(0,1fr)_120px_120px] items-center gap-3 border-b border-slate-700/60 bg-slate-900/70 px-4 py-2 text-[0.6rem] uppercase tracking-widest text-slate-300';
const rowClass =
  'grid grid-cols-[88px_minmax(0,1fr)_120px_120px] items-center gap-3 border-b border-slate-800/50 px-4 py-2 text-left text-xs text-slate-200 transition hover:bg-slate-800/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70';

/** Scrollable summary table for the currently opened region tiles. */
export const RegionSummaryTable: React.FC<RegionSummaryTableProps> = ({ tiles, selectedTileKey, onInspect }) => (
  <div className="flex h-full flex-col">
    <div className={headerClass}>
      <span>Koordinate</span>
      <span>Biom</span>
      <span>Allianz</span>
      <span>Siedlung</span>
    </div>
    <div className="flex-1 overflow-y-auto">
      <ul>
        {tiles.map((tile) => {
          const key = `${tile.q},${tile.r}`;
          const isSelected = key === selectedTileKey;
          return (
            <li key={key}>
              <button
                type="button"
                className={`${rowClass} ${isSelected ? 'bg-emerald-900/30 text-emerald-100' : ''}`}
                onClick={() => onInspect(tile)}
                aria-pressed={isSelected}
              >
                <span className="font-cinzel text-base">{key}</span>
                <span className="truncate text-[0.7rem]">{tile.biome}</span>
                <span className="text-[0.65rem] uppercase tracking-wide text-slate-300">
                  {tile.allianceId ?? 'Neutral'}
                </span>
                <span className="text-[0.65rem] text-slate-300">
                  {tile.hasSettlement ? tile.hasSettlement.icon : '—'}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  </div>
);

RegionSummaryTable.displayName = 'RegionSummaryTable';
