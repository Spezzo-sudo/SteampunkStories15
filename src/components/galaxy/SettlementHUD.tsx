import React, { useEffect } from 'react';
import { useSettlementStore } from '@/store/settlementStore';
import { Button } from '@/components/ui/Button';
import type { MilitarySettlement, Ship } from '@/types';

interface SettlementHUDProps {
  playerId: string;
  isVisible: boolean;
}

/**
 * Settlement Command Center HUD
 *
 * Displays:
 * - List of player's settlements
 * - Available ships per settlement
 * - Settlement selection
 * - Resource overview
 */
export const SettlementHUD: React.FC<SettlementHUDProps> = ({ playerId, isVisible }) => {
  const {
    settlements,
    selectedSettlementId,
    shipsBySettlement,
    loadSettlements,
    selectSettlement,
    getAvailableShips,
  } = useSettlementStore();

  // Load settlements on mount
  useEffect(() => {
    if (playerId) {
      loadSettlements(playerId);
    }
  }, [playerId, loadSettlements]);

  if (!isVisible || settlements.length === 0) {
    return null;
  }

  const selectedSettlement = settlements.find((s) => s.id === selectedSettlementId);
  const selectedSettlementShips = selectedSettlement
    ? getAvailableShips(selectedSettlement.id)
    : [];

  return (
    <div className="fixed right-4 top-4 w-80 max-h-96 bg-slate-900 border border-slate-700 rounded-lg shadow-lg overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-slate-800 px-4 py-3 border-b border-slate-700">
        <h2 className="text-lg font-bold text-slate-100">Siedlungen ({settlements.length})</h2>
      </div>

      {/* Settlements List */}
      <div className="overflow-y-auto flex-1">
        <div className="space-y-2 p-3">
          {settlements.map((settlement) => (
            <SettlementCard
              key={settlement.id}
              settlement={settlement}
              isSelected={selectedSettlementId === settlement.id}
              onSelect={() => selectSettlement(settlement.id)}
              shipCount={shipsBySettlement[settlement.id]?.length || 0}
            />
          ))}
        </div>
      </div>

      {/* Settlement Details */}
      {selectedSettlement && (
        <div className="border-t border-slate-700 bg-slate-800 p-3 space-y-2">
          <div className="text-xs text-slate-300">
            <div className="font-semibold text-slate-100 mb-1">{selectedSettlement.name}</div>

            {/* Resources */}
            <div className="space-y-0.5 text-slate-400">
              <div className="flex justify-between">
                <span>Orichalkum:</span>
                <span className="text-yellow-400">
                  {selectedSettlement.resources.Orichalkum} / {selectedSettlement.capacities.orichalkum}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Fokuskristalle:</span>
                <span className="text-purple-400">
                  {selectedSettlement.resources.Fokuskristalle} / {selectedSettlement.capacities.fokuskristalle}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Vitriol:</span>
                <span className="text-green-400">
                  {selectedSettlement.resources.Vitriol} / {selectedSettlement.capacities.vitriol}
                </span>
              </div>
            </div>

            {/* Ships */}
            <div className="mt-2 pt-2 border-t border-slate-700">
              <div className="font-semibold text-slate-100 mb-1">
                Flotte ({selectedSettlementShips.length})
              </div>
              {selectedSettlementShips.length > 0 ? (
                <div className="space-y-0.5">
                  {selectedSettlementShips.map((ship) => (
                    <div key={ship.id} className="flex justify-between text-slate-400">
                      <span>{ship.name}</span>
                      <span className="text-slate-500">Hülle {ship.hullIntegrity}%</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-slate-500 italic">Keine Schiffe</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// Settlement Card Component
// ============================================

interface SettlementCardProps {
  settlement: MilitarySettlement;
  isSelected: boolean;
  onSelect: () => void;
  shipCount: number;
}

const SettlementCard: React.FC<SettlementCardProps> = ({
  settlement,
  isSelected,
  onSelect,
  shipCount,
}) => {
  const totalResources =
    settlement.resources.Orichalkum +
    settlement.resources.Fokuskristalle +
    settlement.resources.Vitriol;

  return (
    <button
      onClick={onSelect}
      className={`w-full p-2 rounded text-left text-xs transition-colors ${
        isSelected
          ? 'bg-blue-700 border border-blue-500 text-slate-100'
          : 'bg-slate-700 border border-slate-600 text-slate-300 hover:bg-slate-600'
      }`}
    >
      <div className="flex justify-between items-start mb-1">
        <span className="font-semibold">{settlement.name}</span>
        <span className="text-slate-400">Lv {settlement.level}</span>
      </div>
      <div className="flex justify-between text-slate-400 text-xs">
        <span>⚓ {shipCount} Schiffe</span>
        <span>📦 {totalResources} Ressourcen</span>
      </div>
    </button>
  );
};
