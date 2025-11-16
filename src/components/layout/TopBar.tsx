import React from 'react';
import { RefreshCw } from 'lucide-react';
import ResourceStrip from '@/components/ui/ResourceStrip';
import { useGameStore } from '@/store/gameStore';
import { useSessionStore } from '@/store/sessionStore';

/**
 * Die obere Leiste der Benutzeroberfläche.
 * Bindet die geteilte Ressourcenleiste ein und ergänzt Account-Kontrollen.
 */
const TopBar: React.FC = () => {
  const lastSyncTime = useGameStore((state) => state.lastSyncTime);
  const isSyncing = useGameStore((state) => state.isSyncing);
  const refreshResourcesFromDB = useGameStore((state) => state.refreshResourcesFromDB);
  const sessionUser = useSessionStore((state) => state.user);
  const logout = useSessionStore((state) => state.logout);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout fehlgeschlagen', error);
    }
  };

  const handleRefreshResources = async () => {
    await refreshResourcesFromDB();
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <ResourceStrip
        showKesseldruck
        showSyncButton
        onRefresh={handleRefreshResources}
        isSyncing={isSyncing}
        lastSyncTime={lastSyncTime}
      />

      <button
        type="button"
        onClick={handleRefreshResources}
        disabled={isSyncing}
        title="Ressourcen vom Server aktualisieren"
        className="group flex items-center gap-2 rounded-xl border border-cyan-500/60 bg-black/40 px-4 py-2 text-sm font-semibold text-cyan-300 transition hover:border-cyan-400 hover:bg-cyan-900/20 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <RefreshCw
          className={`h-4 w-4 transition-transform ${isSyncing ? 'animate-spin' : 'group-hover:rotate-180'}`}
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
