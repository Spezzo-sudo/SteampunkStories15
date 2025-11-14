import React, { useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import type { ScoutReport } from '@/types';
import { createScoutReportMessage } from '@/lib/scouting';

interface ScoutReportProps {
  report: ScoutReport;
  onClose: () => void;
}

/**
 * Scout Report Display Component
 * Shows intelligence gathered from scout mission
 */
export const ScoutReportDisplay: React.FC<ScoutReportProps> = ({ report, onClose }) => {
  const message = useMemo(() => createScoutReportMessage(report), [report]);

  const expiryDate = new Date(report.expiresAt);
  const isExpired = Date.now() > report.expiresAt;

  const intelDescriptions = {
    1: 'Grundlegende Informationen',
    2: 'Defensive Strukturen erkannt',
    3: 'Defensive Details verfügbar',
    4: 'Stationierte Flotte gezählt',
    5: 'Vollständige Flottenkomposition',
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-lg w-full max-w-lg shadow-xl">
        {/* Header */}
        <div className="bg-slate-800 px-4 py-3 border-b border-slate-700">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-lg font-bold text-slate-100">Scout Report</h2>
              <p className="text-xs text-slate-400">
                Intel Level {report.intelLevel}/5 - {intelDescriptions[report.intelLevel as keyof typeof intelDescriptions]}
              </p>
            </div>
            {isExpired && (
              <div className="text-xs bg-red-900 text-red-200 px-2 py-1 rounded">Abgelaufen</div>
            )}
          </div>
        </div>

        {/* Report Content */}
        <div className="p-4 space-y-3">
          {/* Intel Level Indicator */}
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((level) => (
              <div
                key={level}
                className={`h-2 flex-1 rounded ${
                  level <= report.intelLevel ? 'bg-blue-500' : 'bg-slate-700'
                }`}
              />
            ))}
          </div>

          {/* Report Data */}
          <div className="bg-slate-800 rounded p-3 text-sm text-slate-300 space-y-2">
            {report.reportData.owner && (
              <div className="flex justify-between">
                <span className="text-slate-400">👑 Besitzer:</span>
                <span className="text-slate-100">{report.reportData.owner}</span>
              </div>
            )}

            {report.reportData.defenseCount !== undefined && (
              <div className="flex justify-between">
                <span className="text-slate-400">🛡️ Defensive Strukturen:</span>
                <span className="text-yellow-400">{report.reportData.defenseCount}</span>
              </div>
            )}

            {report.reportData.defenseTypes && report.reportData.defenseTypes.length > 0 && (
              <div className="space-y-1">
                <div className="text-slate-400">Defensive Typen:</div>
                <div className="ml-2 space-y-0.5">
                  {report.reportData.defenseTypes.map((type, idx) => (
                    <div key={idx} className="text-slate-400">
                      • {type}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {report.reportData.stationedShipCount !== undefined && (
              <div className="flex justify-between">
                <span className="text-slate-400">⚓ Stationierte Schiffe:</span>
                <span className="text-blue-400">{report.reportData.stationedShipCount}</span>
              </div>
            )}

            {report.reportData.stationedShips && report.reportData.stationedShips.length > 0 && (
              <div className="space-y-1">
                <div className="text-slate-400">Flottenkomposition:</div>
                <div className="ml-2 space-y-0.5">
                  {report.reportData.stationedShips.map((ship) => (
                    <div key={ship.id} className="text-slate-400 text-xs">
                      • {ship.name} (Hülle: {ship.hullIntegrity}%, Angriff: {ship.attack})
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="border-t border-slate-700 pt-2 text-xs text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>Ziel:</span>
              <span className="text-slate-300">{report.targetTileId}</span>
            </div>
            <div className="flex justify-between">
              <span>Erstellt:</span>
              <span className="text-slate-300">{new Date(report.createdAt).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Läuft ab:</span>
              <span className={isExpired ? 'text-red-400' : 'text-green-400'}>
                {expiryDate.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-slate-700 px-4 py-3 flex justify-end bg-slate-800">
          <Button size="sm" onClick={onClose}>
            Schließen
          </Button>
        </div>
      </div>
    </div>
  );
};
