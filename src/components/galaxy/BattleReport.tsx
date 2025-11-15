import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import type { Battle } from '@/types';

interface BattleReportProps {
  battle: Battle;
  onClose: () => void;
}

/**
 * Battle Report Display Component
 * Shows detailed combat results including casualties, survivors, and plunder
 *
 * Displays:
 * - Victory/Defeat/Stalemate outcome
 * - Attacker and Defender losses
 * - Round progression (simplified)
 * - Surviving ships with updated status
 * - Plunder information (if attacker victory)
 */
export const BattleReport: React.FC<BattleReportProps> = ({ battle, onClose }) => {
  const [expanded, setExpanded] = useState(false);

  const isAttackerVictory = battle.status === 'attacker_won';
  const isDefenderVictory = battle.status === 'defender_won';
  const isStalemate = battle.status === 'stalemate';

  const getOutcomeColor = () => {
    if (isAttackerVictory) return 'text-green-400';
    if (isDefenderVictory) return 'text-red-400';
    return 'text-yellow-400';
  };

  const getOutcomeLabel = () => {
    if (isAttackerVictory) return '🎖️ Sieg für Angreifer';
    if (isDefenderVictory) return '⚔️ Sieg für Verteidiger';
    return '⚔️ Stalemate';
  };

  const attackerDestroyedCount = battle.forces.attackerShips.filter((s) => s.hullIntegrity === 0).length;
  const defenderDestroyedCount = battle.forces.defenderShips.filter((s) => s.hullIntegrity === 0).length;
  const attackerDamagedCount = battle.forces.attackerShips.filter(
    (s) => s.hullIntegrity > 0 && s.hullIntegrity < 100
  ).length;
  const defenderDamagedCount = battle.forces.defenderShips.filter(
    (s) => s.hullIntegrity > 0 && s.hullIntegrity < 100
  ).length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-lg w-full max-w-2xl max-h-96 flex flex-col shadow-xl">
        {/* Header */}
        <div className="bg-slate-800 px-4 py-3 border-b border-slate-700 flex justify-between items-center">
          <div>
            <h2 className={`text-lg font-bold ${getOutcomeColor()}`}>{getOutcomeLabel()}</h2>
            <p className="text-xs text-slate-400 mt-1">
              Tile {battle.tileId.split(',').join(',')}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-4">
          {/* Outcome Summary */}
          <div className="mb-4 p-3 bg-slate-800 rounded border border-slate-700">
            <div className="grid grid-cols-2 gap-4">
              {/* Attacker */}
              <div>
                <h3 className="text-sm font-semibold text-blue-400 mb-2">⚔️ Angreifer</h3>
                <div className="text-xs space-y-1 text-slate-300">
                  <div className="flex justify-between">
                    <span>Flottengröße:</span>
                    <span>{battle.forces.attackerShips.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Zerstört:</span>
                    <span className="text-red-400">{attackerDestroyedCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Beschädigt:</span>
                    <span className="text-yellow-400">{attackerDamagedCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Überlebend:</span>
                    <span className="text-green-400">
                      {battle.forces.attackerShips.length - attackerDestroyedCount}
                    </span>
                  </div>
                </div>
              </div>

              {/* Defender */}
              <div>
                <h3 className="text-sm font-semibold text-purple-400 mb-2">🛡️ Verteidiger</h3>
                <div className="text-xs space-y-1 text-slate-300">
                  <div className="flex justify-between">
                    <span>Flottengröße:</span>
                    <span>{battle.forces.defenderShips.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Zerstört:</span>
                    <span className="text-red-400">{defenderDestroyedCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Beschädigt:</span>
                    <span className="text-yellow-400">{defenderDamagedCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Überlebend:</span>
                    <span className="text-green-400">
                      {battle.forces.defenderShips.length - defenderDestroyedCount}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Plunder Information (if attacker victory) */}
          {isAttackerVictory && battle.battleReport?.plunder && (
            <div className="mb-4 p-3 bg-yellow-900/20 rounded border border-yellow-700">
              <h3 className="text-sm font-semibold text-yellow-400 mb-2">💰 Beute</h3>
              <div className="text-xs space-y-1 text-slate-300">
                {Object.entries(battle.battleReport.plunder).map(([resource, amount]) => (
                  <div key={resource} className="flex justify-between">
                    <span>{resource}:</span>
                    <span className="text-yellow-400">{amount}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ship Details (Expandable) */}
          <div className="mb-4">
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-sm font-semibold text-slate-300 hover:text-white transition-colors flex items-center gap-2"
            >
              {expanded ? '▼' : '▶'} Schiff-Details
            </button>

            {expanded && (
              <div className="mt-2 space-y-3">
                {/* Attacking Ships */}
                <div className="p-2 bg-slate-800 rounded border border-slate-700">
                  <h4 className="text-xs font-semibold text-blue-400 mb-2">Angreifer Schiffe</h4>
                  <div className="space-y-1">
                    {battle.forces.attackerShips.map((ship) => (
                      <div key={ship.id} className="text-xs text-slate-400 flex justify-between">
                        <span>{ship.name}</span>
                        <span className="text-right">
                          Hülle: {ship.hullIntegrity}%{' '}
                          {ship.hullIntegrity === 0 && <span className="text-red-400">❌</span>}
                          {ship.hullIntegrity > 0 && ship.hullIntegrity < 30 && (
                            <span className="text-red-400">⚠️</span>
                          )}
                          {ship.hullIntegrity >= 30 && <span className="text-green-400">✓</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Defending Ships */}
                {battle.forces.defenderShips.length > 0 && (
                  <div className="p-2 bg-slate-800 rounded border border-slate-700">
                    <h4 className="text-xs font-semibold text-purple-400 mb-2">Verteidiger Schiffe</h4>
                    <div className="space-y-1">
                      {battle.forces.defenderShips.map((ship) => (
                        <div key={ship.id} className="text-xs text-slate-400 flex justify-between">
                          <span>{ship.name}</span>
                          <span className="text-right">
                            Hülle: {ship.hullIntegrity}%{' '}
                            {ship.hullIntegrity === 0 && <span className="text-red-400">❌</span>}
                            {ship.hullIntegrity > 0 && ship.hullIntegrity < 30 && (
                              <span className="text-red-400">⚠️</span>
                            )}
                            {ship.hullIntegrity >= 30 && <span className="text-green-400">✓</span>}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-700 px-4 py-3 bg-slate-800">
          <Button size="sm" variant="primary" onClick={onClose} className="w-full">
            Bestätigen
          </Button>
        </div>
      </div>
    </div>
  );
};
