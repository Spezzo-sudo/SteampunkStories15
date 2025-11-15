import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import type { Ship } from '@/types';

interface FleetSelectorProps {
  ships: Ship[];
  selectedShips?: string[];
  onShipsChange?: (shipIds: string[]) => void;
  onConfirm: (selectedShipIds: string[]) => void;
  onCancel: () => void;
  title?: string;
  minShips?: number;
}

/**
 * Fleet Selection Modal
 * Allows player to select ships for a mission
 *
 * Can be used in two ways:
 * 1. Controlled: Pass selectedShips and onShipsChange
 * 2. Uncontrolled: Let component manage internal state
 */
export const FleetSelector: React.FC<FleetSelectorProps> = ({
  ships,
  selectedShips: externalSelectedShips,
  onShipsChange,
  onConfirm,
  onCancel,
  title = 'Schiffe wählen',
  minShips = 1,
}) => {
  const [internalSelectedIds, setInternalSelectedIds] = useState<string[]>([]);

  // Use external state if provided, otherwise use internal state
  const selectedIds = externalSelectedShips !== undefined ? externalSelectedShips : internalSelectedIds;

  const toggleShip = (shipId: string) => {
    const newSelectedIds = selectedIds.includes(shipId)
      ? selectedIds.filter((id) => id !== shipId)
      : [...selectedIds, shipId];

    if (onShipsChange) {
      onShipsChange(newSelectedIds);
    } else {
      setInternalSelectedIds(newSelectedIds);
    }
  };

  const selectedShips = ships.filter((s) => selectedIds.includes(s.id));
  const totalAttack = selectedShips.reduce((sum, s) => sum + s.attack, 0);
  const totalDefense = selectedShips.reduce((sum, s) => sum + s.defense, 0);
  const totalCargo = selectedShips.reduce((sum, s) => sum + s.cargoCapacity, 0);

  const isValid = selectedIds.length >= minShips;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-lg w-96 max-h-96 flex flex-col shadow-xl">
        {/* Header */}
        <div className="bg-slate-800 px-4 py-3 border-b border-slate-700">
          <h2 className="text-lg font-bold text-slate-100">{title}</h2>
        </div>

        {/* Ship List */}
        <div className="overflow-y-auto flex-1 p-3 space-y-2">
          {ships.length === 0 ? (
            <div className="text-slate-400 text-center py-4">Keine Schiffe verfügbar</div>
          ) : (
            ships.map((ship) => (
              <label
                key={ship.id}
                className="flex items-center p-2 rounded cursor-pointer hover:bg-slate-800 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(ship.id)}
                  onChange={() => toggleShip(ship.id)}
                  className="w-4 h-4 rounded border-slate-600"
                />
                <div className="flex-1 ml-3">
                  <div className="text-sm font-semibold text-slate-100">{ship.name}</div>
                  <div className="text-xs text-slate-400">
                    Angriff: {ship.attack} | Verteidigung: {ship.defense} | Geschwindigkeit: {ship.speed}
                  </div>
                </div>
                <div className="text-xs text-slate-500">Hülle {ship.hullIntegrity}%</div>
              </label>
            ))
          )}
        </div>

        {/* Stats */}
        {selectedIds.length > 0 && (
          <div className="border-t border-slate-700 px-4 py-2 bg-slate-800">
            <div className="text-xs text-slate-300 space-y-0.5">
              <div className="flex justify-between">
                <span>Schiffe:</span>
                <span className="text-blue-400">{selectedIds.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Gesamt Angriff:</span>
                <span className="text-red-400">{totalAttack}</span>
              </div>
              <div className="flex justify-between">
                <span>Gesamt Verteidigung:</span>
                <span className="text-green-400">{totalDefense}</span>
              </div>
              <div className="flex justify-between">
                <span>Frachtraum:</span>
                <span className="text-yellow-400">{totalCargo}</span>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="border-t border-slate-700 px-4 py-3 flex gap-2 justify-end bg-slate-800">
          <Button size="sm" variant="secondary" onClick={onCancel}>
            Abbrechen
          </Button>
          <Button size="sm" disabled={!isValid} onClick={() => onConfirm(selectedIds)}>
            Bestätigen ({selectedIds.length})
          </Button>
        </div>
      </div>
    </div>
  );
};
