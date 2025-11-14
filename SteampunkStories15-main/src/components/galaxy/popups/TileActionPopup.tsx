
import React, { useState, useMemo } from 'react';
import { useMapStore } from '@/store/mapStore';
import { useSessionStore } from '@/store/sessionStore';
import { useSettlementStore } from '@/store/settlementStore';
import { Button } from '@/components/ui/Button';
import { FleetSelector } from '@/components/galaxy/FleetSelector';
import { calculateScoutTravelTime } from '@/lib/scouting';
import type { Tile } from '@/data/types';

type TileActionPopupProps = {
  tile: Tile;
  onClose: () => void;
};

/**
 * A popup that displays information about a selected tile and offers actions.
 * It receives tile data and a close handler as props to avoid render loops.
 *
 * Actions:
 * - Build: If player owns the tile
 * - Scout: Gather intelligence on enemy/neutral tiles
 * - Transport: Move resources between settlements
 */
export const TileActionPopup: React.FC<TileActionPopupProps> = ({ tile, onClose }) => {
  // Store selectors
  const openBuildMenu = useMapStore((state) => state.openBuildMenu);
  const user = useSessionStore((state) => state.user);
  const {
    settlements,
    shipsBySettlement,
    getAvailableShips,
    planScoutMission,
    getScoutReportsForTile,
  } = useSettlementStore();

  // Scout modal state
  const [showScoutModal, setShowScoutModal] = useState(false);
  const [selectedScoutShips, setSelectedScoutShips] = useState<string[]>([]);
  const [selectedSettlementForScout, setSelectedSettlementForScout] = useState<string | null>(null);
  const [scoutReports, setScoutReports] = useState(getScoutReportsForTile(tile.id));

  if (!tile) {
    return null;
  }

  const { q, r, biome, hasSettlement } = tile;
  const isOwnedByPlayer = hasSettlement?.playerId === user?.id;

  // Get available settlements with ships for scouting
  const availableSettlements = useMemo(() => {
    return settlements
      .filter((s) => s.playerId === user?.id)
      .map((settlement) => ({
        settlement,
        availableShips: getAvailableShips(settlement.id),
      }))
      .filter(({ availableShips }) => availableShips.length > 0);
  }, [settlements, user?.id, getAvailableShips]);

  const handleBuildClick = () => {
    openBuildMenu(tile);
  };

  const handleScoutClick = () => {
    if (availableSettlements.length > 0) {
      // Auto-select first settlement with ships
      setSelectedSettlementForScout(availableSettlements[0].settlement.id);
      setShowScoutModal(true);
      setSelectedScoutShips([]);
    }
  };

  const handleConfirmScout = () => {
    if (!selectedSettlementForScout || selectedScoutShips.length === 0) return;

    const settlement = settlements.find((s) => s.id === selectedSettlementForScout);
    if (!settlement) return;

    const selectedShips = shipsBySettlement[selectedSettlementForScout]?.filter((s) =>
      selectedScoutShips.includes(s.id)
    ) || [];

    // Plan the scout mission
    const convoyId = planScoutMission(selectedSettlementForScout, selectedScoutShips, tile.id);

    if (convoyId) {
      // Calculate travel time for display
      const travelTime = calculateScoutTravelTime(5, selectedShips); // 5 hex estimate
      console.log(`Scout mission planned: ${convoyId} (ETA: ${travelTime.toFixed(1)}s)`);

      // Close modal and show confirmation
      setShowScoutModal(false);
      setSelectedScoutShips([]);
      setSelectedSettlementForScout(null);

      // Refresh scout reports
      setScoutReports(getScoutReportsForTile(tile.id));
    }
  };

  const selectedSettlementShips = selectedSettlementForScout
    ? getAvailableShips(selectedSettlementForScout)
    : [];

  return (
    <>
      <div className="absolute bottom-4 right-4 z-20 w-72 rounded-lg border border-slate-700 bg-slate-900/90 p-4 shadow-lg backdrop-blur-sm max-h-96 overflow-y-auto">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-cinzel text-lg text-yellow-200">
              Feld {q},{r}
            </h3>
            <p className="text-sm text-slate-300">Biome: {biome}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            &times;
          </button>
        </div>

        <div className="mt-4">
          {hasSettlement && (
            <p className="text-xs text-green-400">
              Siedlung: {isOwnedByPlayer ? 'Deine' : hasSettlement.playerId} ({hasSettlement.icon})
            </p>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-2">
          {isOwnedByPlayer && (
            <Button onClick={handleBuildClick} variant="primary">
              Bauen
            </Button>
          )}
          {!isOwnedByPlayer && availableSettlements.length > 0 && (
            <Button onClick={handleScoutClick} variant="secondary">
              Auskundschaften
            </Button>
          )}
          <Button onClick={() => console.log('Transport initiated')} variant="secondary">
            Transport
          </Button>
        </div>

        {/* Scout Reports Section */}
        {scoutReports.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-700">
            <p className="text-xs font-semibold text-slate-300 mb-2">Intelligenzberichte:</p>
            <div className="space-y-2">
              {scoutReports.map((report) => (
                <div
                  key={report.id}
                  className="text-xs bg-slate-800 p-2 rounded border border-slate-600"
                >
                  <div className="flex justify-between">
                    <span>Level {report.intelLevel}/5</span>
                    <span className="text-slate-400">
                      {new Date(report.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {report.reportData.owner && (
                    <div className="text-slate-300 mt-1">👑 {report.reportData.owner}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Scout Modal */}
      {showScoutModal && selectedSettlementForScout && (
        <FleetSelector
          ships={selectedSettlementShips}
          selectedShips={selectedScoutShips}
          onShipsChange={setSelectedScoutShips}
          onConfirm={handleConfirmScout}
          onCancel={() => {
            setShowScoutModal(false);
            setSelectedScoutShips([]);
            setSelectedSettlementForScout(null);
          }}
          title="Auskundschafter wählen"
          minShips={1}
        />
      )}
    </>
  );
};
