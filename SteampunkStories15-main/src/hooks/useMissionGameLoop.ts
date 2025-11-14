import { useEffect } from 'react';
import { useSettlementStore } from '@/store/settlementStore';
import { useSessionStore } from '@/store/sessionStore';

/**
 * Game Loop Hook for Military Missions
 *
 * Periodically updates mission states:
 * - Scout missions: Check for arrivals, generate reports
 * - Stationing missions: Check for arrivals, move ships to stationed
 *
 * Runs every 2 seconds to keep missions synced
 */
export const useMissionGameLoop = () => {
  const playerId = useSessionStore((state) => state.user?.id);
  const { progressScoutMissions, progressStationingMissions } = useSettlementStore();

  useEffect(() => {
    if (!playerId) return;

    // Set up interval to check mission progress every 2 seconds
    const interval = setInterval(() => {
      // Progress scout missions
      progressScoutMissions(playerId);

      // Progress stationing missions
      progressStationingMissions(playerId);
    }, 2000);

    // Clean up interval on unmount or playerId change
    return () => clearInterval(interval);
  }, [playerId, progressScoutMissions, progressStationingMissions]);
};
