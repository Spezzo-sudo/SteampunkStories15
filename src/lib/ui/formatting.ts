/**
 * Utility helpers for formatting UI texts and durations in a consistent way.
 */

/**
 * Formats a resource amount using German locale grouping.
 *
 * @param amount - Raw numeric value that should be shown to the player.
 * @returns Human readable string such as "1.250".
 */
export const formatResourceAmount = (amount: number): string => {
  return Math.floor(amount).toLocaleString('de-DE');
};

/**
 * Formats a timestamp delta to "vor 3m" style strings used in sync badges.
 *
 * @param lastSync - Milliseconds since epoch of the last sync.
 * @returns Localized relative time string.
 */
export const formatRelativeSyncTime = (lastSync: number | null): string => {
  if (!lastSync) {
    return 'Noch nie synchronisiert';
  }
  const diffSeconds = Math.max(0, Math.floor((Date.now() - lastSync) / 1000));
  if (diffSeconds < 60) {
    return `Vor ${diffSeconds}s`;
  }
  if (diffSeconds < 3600) {
    return `Vor ${Math.floor(diffSeconds / 60)}m`;
  }
  return `Vor ${Math.floor(diffSeconds / 3600)}h`;
};

/**
 * Formats a duration that is provided in seconds into mm:ss or hh:mm:ss.
 *
 * @param seconds - Duration value in seconds.
 * @returns Formatted clock string.
 */
export const formatDuration = (seconds: number): string => {
  if (seconds < 0) {
    return '00:00';
  }
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60)
    .toString()
    .padStart(2, '0');
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0');
  if (hrs > 0) {
    return `${hrs}:${mins}:${secs}`;
  }
  return `${mins}:${secs}`;
};
