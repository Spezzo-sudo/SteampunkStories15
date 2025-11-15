
import React, { useState, useMemo } from 'react';
import { useMapStore } from '@/store/mapStore';
import { useSessionStore } from '@/store/sessionStore';
import { useSettlementStore } from '@/store/settlementStore';
import { fetchRegion } from '@/services/supabase/gameApi';
import { updatePlayerProfile } from '@/services/supabase/playerApi';
import { Button } from '@/components/ui/Button';
import { FleetSelector } from '@/components/galaxy/FleetSelector';
import { StationingSelector } from '@/components/galaxy/StationingSelector';
import { AttackSelector } from '@/components/galaxy/AttackSelector';
import { ScoutSelector } from '@/components/galaxy/ScoutSelector';
import { BattleReport } from '@/components/galaxy/BattleReport';
import { SettlementNamePrompt } from '@/components/galaxy/SettlementNamePrompt';
import { calculateScoutTravelTime } from '@/lib/scouting';
import { createSettlement } from '@/services/supabase/settlementApi';
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
  const profile = useSessionStore((state) => state.profile);
  const {
    settlements,
    shipsBySettlement,
    getAvailableShips,
    planScoutMission,
    getScoutReportsForTile,
    planStationingMission,
    getStationedShipsAtTile,
    planAttackMission,
    getBattlesByTile,
  } = useSettlementStore();

  // Scout modal state
  const [showScoutModal, setShowScoutModal] = useState(false);
  const [selectedScoutShips, setSelectedScoutShips] = useState<string[]>([]);
  const [selectedSettlementForScout, setSelectedSettlementForScout] = useState<string | null>(null);
  const [scoutReports, setScoutReports] = useState(getScoutReportsForTile(tile.id));

  // Stationing modal state
  const [showStationingModal, setShowStationingModal] = useState(false);
  const [selectedStationingShips, setSelectedStationingShips] = useState<string[]>([]);
  const [selectedSettlementForStationing, setSelectedSettlementForStationing] = useState<string | null>(null);
  const [stationedShips, setStationedShips] = useState(getStationedShipsAtTile(tile.id));

  // Attack modal state
  const [showAttackModal, setShowAttackModal] = useState(false);
  const [selectedAttackShips, setSelectedAttackShips] = useState<string[]>([]);
  const [selectedSettlementForAttack, setSelectedSettlementForAttack] = useState<string | null>(null);

  // Settlement creation modal state
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [isCreatingSettlement, setIsCreatingSettlement] = useState(false);
  const [settlementError, setSettlementError] = useState<string | null>(null);

  // Battle report state
  const [activeBattle, setActiveBattle] = useState(getBattlesByTile(tile.id)[0] || null);

  if (!tile) {
    return null;
  }

  const { q, r, biome, hasSettlement } = tile;
  const isOwnedByPlayer = hasSettlement?.playerId === user?.id;

  // Get available settlements with ships for scouting
  const availableSettlements = useMemo(() => {
    return settlements
      .filter((s) => s.playerId === profile?.playerId)
      .map((settlement) => ({
        settlement,
        availableShips: getAvailableShips(settlement.id),
      }))
      .filter(({ availableShips }) => availableShips.length > 0);
  }, [settlements, profile?.playerId, getAvailableShips]);

  // Check if player has a Kolonistenschiff (colonial ship) for settlement
  const hasColonialShip = useMemo(() => {
    return availableSettlements.some((s) =>
      s.availableShips.some((ship) => ship.blueprintId === 'kolonistenschiff')
    );
  }, [availableSettlements]);

  const handleSettleClick = () => {
    if (!hasColonialShip) {
      setSettlementError('Benötigt: Kolonistenschiff in einer deiner Siedlungen');
      return;
    }
    setShowSettlementModal(true);
  };

  const handleConfirmSettlement = async (settlementName: string) => {
    if (!profile?.playerId || !settlementName.trim()) {
      setSettlementError('Fehler: Nutzerdaten oder Siedlungsname fehlen');
      return;
    }

    // Use tile.id, fallback to composite key if not present
    const tileId = tile.id ?? `${tile.regionId}:${tile.q},${tile.r}`;

    setIsCreatingSettlement(true);
    setSettlementError(null);
    try {
      console.log('[TileActionPopup] Creating settlement with playerId:', profile.playerId, 'tileId:', tileId);
      const newSettlement = await createSettlement(profile.playerId, tileId, settlementName.trim());
      if (newSettlement) {
        console.log(`Settlement created: ${newSettlement.name} (${newSettlement.id})`);
        // Close modal and refresh settlements
        setShowSettlementModal(false);
        setSettlementError(null);

        // Mark home planet as placed (first settlement)
        if (!profile.hasPlacedHome) {
          console.log('[TileActionPopup] Marking home planet as placed');
          try {
            await updatePlayerProfile(profile.uid, { hasPlacedHome: true });
          } catch (updateError) {
            console.error('[TileActionPopup] Error updating player profile:', updateError);
          }
        }

        // Reload settlements in store
        const { loadSettlements } = useSettlementStore.getState?.() || {};
        if (loadSettlements) {
          await loadSettlements(profile.playerId);
        }

        // Invalidate and reload region cache to show settlement on map
        const { invalidateRegionCache, worldId } = useMapStore.getState();
        console.log('[TileActionPopup] Invalidating region cache for region:', tile.regionId);
        invalidateRegionCache(tile.regionId);

        // Reload the region with updated tile data
        try {
          if (worldId) {
            const updatedRegion = await fetchRegion(worldId, tile.regionId);
            if (updatedRegion) {
              const { setRegion } = useMapStore.getState();
              setRegion(updatedRegion);
              console.log('[TileActionPopup] Region reloaded with settlement data');
            }
          }
        } catch (regionError) {
          console.error('[TileActionPopup] Error reloading region:', regionError);
          // Continue anyway - settlement was created
        }

        onClose(); // Close tile popup to reflect changes
      } else {
        setSettlementError('Siedlung konnte nicht erstellt werden (leere Antwort)');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unbekannter Fehler';
      console.error('Error creating settlement:', err);
      setSettlementError(`Verbindungsfehler: ${errorMsg}`);
    } finally {
      setIsCreatingSettlement(false);
    }
  };

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

  const handleStationingClick = () => {
    if (availableSettlements.length > 0) {
      // Auto-select first settlement with ships
      setSelectedSettlementForStationing(availableSettlements[0].settlement.id);
      setShowStationingModal(true);
      setSelectedStationingShips([]);
    }
  };

  const handleConfirmStationing = () => {
    if (!selectedSettlementForStationing || selectedStationingShips.length === 0) return;

    const settlement = settlements.find((s) => s.id === selectedSettlementForStationing);
    if (!settlement) return;

    // Plan the stationing mission
    const convoyId = planStationingMission(selectedSettlementForStationing, selectedStationingShips, tile.id);

    if (convoyId) {
      console.log(`Stationing mission planned: ${convoyId}`);

      // Close modal and show confirmation
      setShowStationingModal(false);
      setSelectedStationingShips([]);
      setSelectedSettlementForStationing(null);

      // Refresh stationed ships
      setStationedShips(getStationedShipsAtTile(tile.id));
    }
  };

  const selectedSettlementStationingShips = selectedSettlementForStationing
    ? getAvailableShips(selectedSettlementForStationing)
    : [];

  const handleAttackClick = () => {
    if (availableSettlements.length > 0) {
      // Auto-select first settlement with ships
      setSelectedSettlementForAttack(availableSettlements[0].settlement.id);
      setShowAttackModal(true);
      setSelectedAttackShips([]);
    }
  };

  const handleConfirmAttack = () => {
    if (!selectedSettlementForAttack || selectedAttackShips.length === 0) return;

    const settlement = settlements.find((s) => s.id === selectedSettlementForAttack);
    if (!settlement) return;

    // Plan the attack mission
    const convoyId = planAttackMission(selectedSettlementForAttack, selectedAttackShips, tile.id);

    if (convoyId) {
      console.log(`Attack mission planned: ${convoyId}`);

      // Close modal and show confirmation
      setShowAttackModal(false);
      setSelectedAttackShips([]);
      setSelectedSettlementForAttack(null);
    }
  };

  const selectedSettlementAttackShips = selectedSettlementForAttack
    ? getAvailableShips(selectedSettlementForAttack)
    : [];

  const handleTransportClick = () => {
    // TODO: Phase C - Transport missions not yet implemented
    console.log('Transport feature coming soon in Phase C');
  };

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
          {!hasSettlement && profile?.playerId && (
            <Button
              onClick={handleSettleClick}
              variant={hasColonialShip ? 'primary' : 'secondary'}
              disabled={!hasColonialShip}
              title={!hasColonialShip ? 'Benötigt: Kolonistenschiff' : 'Neue Siedlung gründen'}
            >
              {hasColonialShip ? 'Siedeln' : 'Siedeln (Kolonistenschiff benötigt)'}
            </Button>
          )}
          {isOwnedByPlayer && (
            <>
              <Button onClick={handleBuildClick} variant="primary">
                Bauen
              </Button>
              {availableSettlements.length > 0 && (
                <Button onClick={handleStationingClick} variant="secondary">
                  Stationieren
                </Button>
              )}
            </>
          )}
          {!isOwnedByPlayer && availableSettlements.length > 0 && (
            <>
              <Button onClick={handleScoutClick} variant="secondary">
                Auskundschaften
              </Button>
              <Button onClick={handleAttackClick} variant="secondary">
                Angriff
              </Button>
            </>
          )}
          <Button onClick={handleTransportClick} variant="secondary">
            Transport
          </Button>
        </div>

        {/* Stationed Ships Section */}
        {stationedShips.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-700">
            <p className="text-xs font-semibold text-slate-300 mb-2">⚓ Stationierte Flotte ({stationedShips.length}):</p>
            <div className="space-y-1">
              {stationedShips.map((ship) => (
                <div key={ship.id} className="text-xs text-slate-400">
                  • {ship.name} (Hülle: {ship.hullIntegrity}%, Angriff: {ship.attack})
                </div>
              ))}
            </div>
          </div>
        )}

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
        <ScoutSelector
          ships={selectedSettlementShips}
          selectedShips={selectedScoutShips}
          onShipsChange={setSelectedScoutShips}
          onConfirm={handleConfirmScout}
          onCancel={() => {
            setShowScoutModal(false);
            setSelectedScoutShips([]);
            setSelectedSettlementForScout(null);
          }}
          title="Aufklärungsschiff wählen"
        />
      )}

      {/* Stationing Modal */}
      {showStationingModal && selectedSettlementForStationing && (
        <StationingSelector
          ships={selectedSettlementStationingShips}
          selectedShips={selectedStationingShips}
          onShipsChange={setSelectedStationingShips}
          onConfirm={handleConfirmStationing}
          onCancel={() => {
            setShowStationingModal(false);
            setSelectedStationingShips([]);
            setSelectedSettlementForStationing(null);
          }}
          title="Schiffe stationieren"
          minShips={1}
        />
      )}

      {/* Attack Modal */}
      {showAttackModal && selectedSettlementForAttack && (
        <AttackSelector
          ships={selectedSettlementAttackShips}
          selectedShips={selectedAttackShips}
          onShipsChange={setSelectedAttackShips}
          onConfirm={handleConfirmAttack}
          onCancel={() => {
            setShowAttackModal(false);
            setSelectedAttackShips([]);
            setSelectedSettlementForAttack(null);
          }}
          title="Schiffe zum Angriff wählen"
          minShips={1}
        />
      )}

      {/* Battle Report Modal */}
      {activeBattle && (
        <BattleReport
          battle={activeBattle}
          onClose={() => setActiveBattle(null)}
        />
      )}

      {/* Settlement Creation Modal */}
      {showSettlementModal && (
        <SettlementNamePrompt
          onConfirm={handleConfirmSettlement}
          onCancel={() => {
            setShowSettlementModal(false);
            setSettlementError(null);
          }}
          isLoading={isCreatingSettlement}
          tileCoordinates={`${tile.q},${tile.r}`}
          error={settlementError}
        />
      )}
    </>
  );
};
