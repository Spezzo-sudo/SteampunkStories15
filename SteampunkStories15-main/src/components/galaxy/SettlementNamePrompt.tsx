import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';

interface SettlementNamePromptProps {
  onConfirm: (name: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
  tileCoordinates?: string;
}

/**
 * Settlement Name Prompt Modal
 *
 * Simple input dialog for entering a settlement name before creation.
 * Validates input and provides feedback to user.
 */
export const SettlementNamePrompt: React.FC<SettlementNamePromptProps> = ({
  onConfirm,
  onCancel,
  isLoading = false,
  tileCoordinates = 'unbekannt',
}) => {
  const [settlementName, setSettlementName] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    const trimmed = settlementName.trim();

    // Validation
    if (!trimmed) {
      setError('Siedlungsname erforderlich');
      return;
    }

    if (trimmed.length < 3) {
      setError('Name muss mindestens 3 Zeichen lang sein');
      return;
    }

    if (trimmed.length > 30) {
      setError('Name darf maximal 30 Zeichen lang sein');
      return;
    }

    setError('');
    onConfirm(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLoading) {
      handleConfirm();
    }
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-lg w-96 shadow-xl">
        {/* Header */}
        <div className="bg-slate-800 px-6 py-4 border-b border-slate-700">
          <h2 className="text-lg font-bold text-yellow-200">Neue Siedlung gründen</h2>
          <p className="text-xs text-slate-400 mt-1">Feld: {tileCoordinates}</p>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Siedlungsname
              </label>
              <input
                type="text"
                value={settlementName}
                onChange={(e) => {
                  setSettlementName(e.target.value);
                  if (error) setError(''); // Clear error on input
                }}
                onKeyDown={handleKeyDown}
                placeholder="z.B. Stahlort, Kristallfels, Dampfhaven..."
                maxLength={30}
                disabled={isLoading}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-slate-100 placeholder-slate-500 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 disabled:opacity-50"
                autoFocus
              />
              <p className="text-xs text-slate-400 mt-1">
                {settlementName.length}/30 Zeichen
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-900/20 border border-red-700 rounded">
                <p className="text-sm text-red-400">❌ {error}</p>
              </div>
            )}

            <div className="bg-slate-800 p-3 rounded border border-slate-700">
              <p className="text-xs text-slate-300">
                <span className="text-yellow-400 font-semibold">🏛️ Startressourcen:</span>
              </p>
              <div className="mt-2 space-y-1 text-xs text-slate-400">
                <div>• Orichalkum: 1000</div>
                <div>• Fokuskristalle: 500</div>
                <div>• Vitriol: 500</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-700 px-6 py-4 bg-slate-800 flex gap-3">
          <Button
            onClick={onCancel}
            variant="secondary"
            disabled={isLoading}
            className="flex-1"
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleConfirm}
            variant="primary"
            disabled={isLoading || !settlementName.trim()}
            className="flex-1"
          >
            {isLoading ? '⏳ Gründen...' : '✓ Siedeln'}
          </Button>
        </div>
      </div>
    </div>
  );
};
