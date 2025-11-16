import React, { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { ResourceType } from '@/types';
import ProgressBar from '@/components/ui/ProgressBar';
import { useSessionStore } from '@/store/sessionStore';
import { RefreshCw } from 'lucide-react';
import { getPlayerSettlements } from '@/services/supabase/settlementApi';
import { useUiStore, ToastVariant } from '@/store/uiStore';

const formatNumber = (num: number) => Math.floor(num).toLocaleString('de-DE');

interface ResourceDisplayProps {
  type: ResourceType;
  current: number;
  capacity: number;
}

/**
 * Eine Komponente zur Anzeige einer einzelnen Ressource mit ihrem aktuellen Wert,
 * ihrer Kapazität und einem Fortschrittsbalken.
 */
const ResourceDisplay: React.FC<ResourceDisplayProps> = ({ type, current, capacity }) => {
  const fillPercent = capacity > 0 ? Math.min(100, (current / capacity) * 100) : 0;
  const isNearlyFull = capacity > 0 && current >= capacity * 0.95;
  const textColor = isNearlyFull ? 'text-red-400' : 'text-yellow-200';

  return (
    <div className="flex min-w-[200px] flex-1 flex-col gap-1 rounded-lg bg-black/30 p-3 shadow-sm">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[clamp(0.9rem,0.8vw+0.8rem,1.1rem)] font-cinzel uppercase tracking-wide">
          {type}
        </span>
        <span className={`text-sm font-semibold ${textColor}`}>
          {formatNumber(current)} / {formatNumber(capacity)}
        </span>
      </div>
      <ProgressBar progress={fillPercent} />
      <div className="flex items-center justify-between text-xs text-gray-300">
        <span>Lager</span>
        <span>{fillPercent.toFixed(0)}%</span>
      </div>
    </div>
  );
};

const KesseldruckDisplay: React.FC = () => {
  const { capacity, consumption, net, efficiency } = useGameStore((state) => state.kesseldruck);
  const demandRatio = capacity > 0 ? (consumption / capacity) * 100 : 0;
  const statusColor = net >= 0 ? 'text-emerald-300' : 'text-red-400';
  const gaugePercent = Math.min(100, Math.max(0, demandRatio));
  const tooltip =
    'Kesseldruck beschreibt die verfügbare Energie. Überschuss steigert die Produktions-Effizienz, Defizit drosselt Anlagen.';

  return (
    <div className="flex min-w-[220px] flex-1 flex-col gap-1 rounded-lg bg-black/30 p-3 shadow-sm" title={tooltip}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="flex items-center gap-2 text-[clamp(0.9rem,0.8vw+0.8rem,1.1rem)] font-cinzel uppercase tracking-wide">
          <span role="img" aria-label="Kesseldruck">
            ⎈
          </span>
          Kesseldruck (bar)
        </span>
        <span className="text-sm text-yellow-200">
          {formatNumber(consumption)} / {formatNumber(capacity)}
        </span>
      </div>
      <ProgressBar progress={gaugePercent} />
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-300">
        <span className={statusColor}>{net >= 0 ? `Überschuss ${formatNumber(net)}` : `Defizit ${formatNumber(Math.abs(net))}`}</span>
        <span>Effizienz {Math.round(Math.min(1, Math.max(0, efficiency)) * 100)}%</span>
      </div>
    </div>
  );
};

/**
 * Die obere Leiste der Benutzeroberfläche.
 * Zeigt die aktuellen Ressourcen des Spielers und den Kesseldruck an.
 */
const TopBar: React.FC = () => {
  const resources = useGameStore((state) => state.resources);
  const storage = useGameStore((state) => state.storage);
  const lastSyncTime = useGameStore((state) => state.lastSyncTime);
  const isSyncing = useGameStore((state) => state.isSyncing);
  const refreshResourcesFromDB = useGameStore((state) => state.refreshResourcesFromDB);
  const sessionUser = useSessionStore((state) => state.user);
  const profile = useSessionStore((state) => state.profile);
  const logout = useSessionStore((state) => state.logout);
  const { pushToast } = useUiStore();

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout fehlgeschlagen', error);
    }
  };

  /**
   * Manually refresh resources from the server.
   * Uses the store's refreshResourcesFromDB action which handles all logic.
   */
  const handleRefreshResources = async () => {
    await refreshResourcesFromDB();
  };

  /**
   * Format the last sync time in a human-readable way.
   */
  const formatLastSync = () => {
    if (!lastSyncTime) return 'Noch nie synchronisiert';
    const secondsAgo = Math.floor((Date.now() - lastSyncTime) / 1000);
    if (secondsAgo < 60) return `Vor ${secondsAgo}s`;
    if (secondsAgo < 3600) return `Vor ${Math.floor(secondsAgo / 60)}m`;
    return `Vor ${Math.floor(secondsAgo / 3600)}h`;
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <div className="flex flex-1 flex-wrap justify-center gap-3">
        <ResourceDisplay
          type={ResourceType.Orichalkum}
          current={resources[ResourceType.Orichalkum]}
          capacity={storage[ResourceType.Orichalkum]}
        />
        <ResourceDisplay
          type={ResourceType.Fokuskristalle}
          current={resources[ResourceType.Fokuskristalle]}
          capacity={storage[ResourceType.Fokuskristalle]}
        />
        <ResourceDisplay
          type={ResourceType.Vitriol}
          current={resources[ResourceType.Vitriol]}
          capacity={storage[ResourceType.Vitriol]}
        />
        <KesseldruckDisplay />
        <div className="flex flex-col gap-1 rounded-lg bg-black/30 p-3 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleRefreshResources}
              disabled={isSyncing}
              title={formatLastSync()}
              className={`flex items-center gap-2 rounded-lg px-3 py-1 text-xs font-semibold uppercase tracking-wide transition ${
                isSyncing
                  ? 'cursor-wait bg-amber-900/30 text-amber-600'
                  : 'bg-amber-700/40 text-amber-300 hover:bg-amber-600/50 hover:text-amber-100'
              }`}
            >
              <span className={isSyncing ? 'animate-spin' : ''}>🔄</span>
              Synchronisieren
            </button>
          </div>
          <div className="text-[10px] text-gray-400">{formatLastSync()}</div>
        </div>
      </div>

      {/* Manual Refresh Button */}
      <button
        type="button"
        onClick={handleRefreshResources}
        disabled={isRefreshing}
        title="Ressourcen vom Server aktualisieren"
        className="group flex items-center gap-2 rounded-xl border border-cyan-500/60 bg-black/40 px-4 py-2 text-sm font-semibold text-cyan-300 transition hover:border-cyan-400 hover:bg-cyan-900/20 hover:text-cyan-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <RefreshCw
          className={`h-4 w-4 transition-transform ${isRefreshing ? 'animate-spin' : 'group-hover:rotate-180'}`}
        />
        <span className="hidden sm:inline">Aktualisieren</span>
      </button>

      {sessionUser && (
        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-xs uppercase tracking-wide text-gray-200">
          <span className="font-semibold text-amber-300">{sessionUser.email ?? 'Commander'}</span>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg border border-amber-400/60 px-3 py-1 font-semibold text-amber-300 transition hover:border-amber-200 hover:text-amber-100"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
};

export default TopBar;
