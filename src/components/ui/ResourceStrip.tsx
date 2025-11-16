import React from 'react';
import { ResourceType } from '@/types';
import { useGameStore } from '@/store/gameStore';
import ProgressBar from '@/components/ui/ProgressBar';
import { formatRelativeSyncTime, formatResourceAmount } from '@/lib/ui/formatting';

const RESOURCE_ORDER: ResourceType[] = [
  ResourceType.Orichalkum,
  ResourceType.Fokuskristalle,
  ResourceType.Vitriol,
];

interface ResourceStripProps {
  /** Toggles the kesseldruck card at the end of the strip. */
  showKesseldruck?: boolean;
  /** Shows the sync button and status badge when provided. */
  showSyncButton?: boolean;
  /** Called when the sync button is pressed. */
  onRefresh?: () => void | Promise<void>;
  /** Marks the sync button as loading. */
  isSyncing?: boolean;
  /** Timestamp stored in the game store for last sync. */
  lastSyncTime?: number | null;
}

/**
 * Shared resource header that mirrors the top bar layout so every production
 * view reuses the same visual language.
 *
 * @param props - Visual toggles for kesseldruck and sync button.
 */
const ResourceStrip: React.FC<ResourceStripProps> = ({
  showKesseldruck = true,
  showSyncButton = false,
  onRefresh,
  isSyncing = false,
  lastSyncTime = null,
}) => {
  const resources = useGameStore((state) => state.resources);
  const storage = useGameStore((state) => state.storage);
  const kesseldruck = useGameStore((state) => state.kesseldruck);

  return (
    <div className="flex flex-wrap items-stretch justify-center gap-3">
      {RESOURCE_ORDER.map((resource) => {
        const capacity = storage[resource];
        const current = resources[resource];
        const fillPercent = capacity > 0 ? Math.min(100, (current / capacity) * 100) : 0;
        const isNearlyFull = capacity > 0 && current >= capacity * 0.95;
        const textColor = isNearlyFull ? 'text-red-400' : 'text-yellow-200';
        return (
          <article
            key={resource}
            className="flex min-w-[200px] flex-1 flex-col gap-1 rounded-lg bg-black/30 p-3 shadow-sm"
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[clamp(0.9rem,0.8vw+0.8rem,1.1rem)] font-cinzel uppercase tracking-wide">
                {resource}
              </span>
              <span className={`text-sm font-semibold ${textColor}`}>
                {formatResourceAmount(current)} / {formatResourceAmount(capacity)}
              </span>
            </div>
            <ProgressBar progress={fillPercent} />
            <div className="flex items-center justify-between text-xs text-gray-300">
              <span>Lager</span>
              <span>{fillPercent.toFixed(0)}%</span>
            </div>
          </article>
        );
      })}

      {showKesseldruck && (
        <article className="flex min-w-[220px] flex-1 flex-col gap-1 rounded-lg bg-black/30 p-3 shadow-sm">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[clamp(0.9rem,0.8vw+0.8rem,1.1rem)] font-cinzel uppercase tracking-wide">
              Kesseldruck
            </span>
            <span className="text-sm text-yellow-200">
              {formatResourceAmount(kesseldruck.consumption)} / {formatResourceAmount(kesseldruck.capacity)}
            </span>
          </div>
          <ProgressBar
            progress={
              kesseldruck.capacity > 0
                ? Math.min(100, Math.max(0, (kesseldruck.consumption / kesseldruck.capacity) * 100))
                : 0
            }
          />
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-300">
            <span className={kesseldruck.net >= 0 ? 'text-emerald-300' : 'text-red-400'}>
              {kesseldruck.net >= 0
                ? `Überschuss ${formatResourceAmount(kesseldruck.net)}`
                : `Defizit ${formatResourceAmount(Math.abs(kesseldruck.net))}`}
            </span>
            <span>Effizienz {Math.round(Math.min(1, Math.max(0, kesseldruck.efficiency)) * 100)}%</span>
          </div>
        </article>
      )}

      {showSyncButton && (
        <article className="flex flex-col gap-1 rounded-lg bg-black/30 p-3 shadow-sm">
          <button
            type="button"
            onClick={onRefresh}
            disabled={isSyncing}
            className={`flex items-center gap-2 rounded-lg px-3 py-1 text-xs font-semibold uppercase tracking-wide transition ${
              isSyncing
                ? 'cursor-wait bg-amber-900/30 text-amber-600'
                : 'bg-amber-700/40 text-amber-300 hover:bg-amber-600/50 hover:text-amber-100'
            }`}
          >
            {isSyncing ? 'Synchronisiere …' : 'Synchronisieren'}
          </button>
          <div className="text-[10px] text-gray-400">{formatRelativeSyncTime(lastSyncTime)}</div>
        </article>
      )}
    </div>
  );
};

export default ResourceStrip;
