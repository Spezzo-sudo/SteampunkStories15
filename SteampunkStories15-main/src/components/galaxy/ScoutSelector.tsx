import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import type { Ship } from '@/types';

interface ScoutSelectorProps {
  ships: Ship[];
  selectedShips?: string[];
  onShipsChange?: (shipIds: string[]) => void;
  onConfirm: (selectedShipIds: string[]) => void;
  onCancel: () => void;
  title?: string;
}

/**
 * Scout Fleet Selector Modal
 * Allows player to select a single ship for reconnaissance missions
 *
 * Scout missions require exactly 1 ship and focus on speed & detection capabilities
 */
export const ScoutSelector: React.FC<ScoutSelectorProps> = ({
  ships,
  selectedShips: externalSelectedShips,
  onShipsChange,
  onConfirm,
  onCancel,
  title = 'Auskundschafter wählen',
}) => {
  const [internalSelectedIds, setInternalSelectedIds] = useState<string[]>([]);
  const [intelLevel, setIntelLevel] = useState<number>(3); // Default to level 3

  // Use external state if provided, otherwise use internal state
  const selectedIds = externalSelectedShips !== undefined ? externalSelectedShips : internalSelectedIds;

  // Scout missions: select exactly 1 ship
  const toggleShip = (shipId: string) => {
    const newSelectedIds = selectedIds.includes(shipId) ? [] : [shipId];

    if (onShipsChange) {
      onShipsChange(newSelectedIds);
    } else {
      setInternalSelectedIds(newSelectedIds);
    }
  };

  const selectedShipsData = ships.filter((s) => selectedIds.includes(s.id));
  const scoutShip = selectedShipsData.length > 0 ? selectedShipsData[0] : null;

  // Calculate estimated mission duration based on speed
  const estimatedMissionTime = scoutShip ? Math.max(5, 30 - scoutShip.speed) : 0;

  const isValid = selectedIds.length === 1;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-lg w-96 max-h-screen flex flex-col shadow-xl">
        {/* Header */}
        <div className="bg-slate-800 px-4 py-3 border-b border-slate-700">
          <h2 className="text-lg font-bold text-slate-100">{title}</h2>
          <p className="text-xs text-blue-400 mt-1">
            🔍 Wähle genau 1 Schiff für die Aufklärung
          </p>
        </div>

        {/* Ship List */}
        <div className="overflow-y-auto flex-1 p-3 space-y-2">
          {ships.length === 0 ? (
            <div className="text-slate-400 text-center py-4">Keine Schiffe verfügbar</div>
          ) : (
            ships.map((ship) => (
              <label
                key={ship.id}
                className={`flex items-center p-2 rounded cursor-pointer transition-colors ${
                  selectedIds.includes(ship.id)
                    ? 'bg-blue-900 border border-blue-600'
                    : 'hover:bg-slate-800 border border-slate-600'
                }`}
              >
                <input
                  type="radio"
                  name="scout-ship"
                  checked={selectedIds.includes(ship.id)}
                  onChange={() => toggleShip(ship.id)}
                  className="mr-3 cursor-pointer"
                />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-slate-100">{ship.name}</div>
                  <div className="text-xs text-slate-400">
                    Hülle: {ship.hullIntegrity}% | Geschwindigkeit: {ship.speed} | Angriff: {ship.attack}
                  </div>
                </div>
              </label>
            ))
          )}
        </div>

        {/* Scout Statistics */}
        {scoutShip && (
          <div className="border-t border-slate-700 p-3 bg-slate-800/50 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                📡 Aufklärungsstufe: {intelLevel}/5
              </label>
              <input
                type="range"
                min="1"
                max="5"
                value={intelLevel}
                onChange={(e) => setIntelLevel(parseInt(e.target.value))}
                className="w-full"
              />
              <p className="text-xs text-slate-400 mt-1">
                {intelLevel === 1 && '🔴 Minimal: Nur Siedlung/Besitzer'}
                {intelLevel === 2 && '🟠 Gering: + Verteidigungszahl'}
                {intelLevel === 3 && '🟡 Mittel: + Schiffstypen (Standard)'}
                {intelLevel === 4 && '🟢 Hoch: + Schiffszahl und Details'}
                {intelLevel === 5 && '🔵 Maximal: + Vollständige Schiffsdaten'}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-slate-900 p-2 rounded border border-slate-600">
                <div className="text-slate-400">Geschwindigkeit</div>
                <div className="text-yellow-400 font-semibold">{scoutShip.speed}</div>
              </div>
              <div className="bg-slate-900 p-2 rounded border border-slate-600">
                <div className="text-slate-400">Hülle</div>
                <div className="text-green-400 font-semibold">{scoutShip.hullIntegrity}%</div>
              </div>
              <div className="bg-slate-900 p-2 rounded border border-slate-600">
                <div className="text-slate-400">Dauer (est.)</div>
                <div className="text-blue-400 font-semibold">{estimatedMissionTime}s</div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-slate-700 px-4 py-3 bg-slate-800 flex gap-3">
          <Button onClick={onCancel} variant="secondary" className="flex-1">
            Abbrechen
          </Button>
          <Button
            onClick={() => onConfirm(selectedIds)}
            variant="primary"
            disabled={!isValid}
            className="flex-1"
          >
            ✓ Ausspähen
          </Button>
        </div>
      </div>
    </div>
  );
};
