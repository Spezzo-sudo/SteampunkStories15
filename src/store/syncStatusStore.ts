import { create } from 'zustand';

interface SyncStatusState {
  lastSyncedAt: number | null;
  isSyncing: boolean;
  syncError: string | null;
  setLastSynced: () => void;
  setSyncing: (syncing: boolean) => void;
  setSyncError: (error: string | null) => void;
}

/**
 * Store for tracking resource sync status.
 * Used by TopBar to show when resources were last synced to server.
 */
export const useSyncStatusStore = create<SyncStatusState>((set) => ({
  lastSyncedAt: null,
  isSyncing: false,
  syncError: null,

  setLastSynced: () => set({ lastSyncedAt: Date.now(), isSyncing: false, syncError: null }),

  setSyncing: (syncing) => set({ isSyncing: syncing }),

  setSyncError: (error) => set({ syncError: error, isSyncing: false }),
}));

/**
 * Format time since last sync for display
 */
export function formatTimeSinceSync(lastSyncedAt: number | null): string {
  if (!lastSyncedAt) return 'Nie synchronisiert';

  const seconds = Math.floor((Date.now() - lastSyncedAt) / 1000);

  if (seconds < 5) return 'Gerade eben';
  if (seconds < 60) return `vor ${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `vor ${minutes}m`;

  const hours = Math.floor(minutes / 60);
  return `vor ${hours}h`;
}
