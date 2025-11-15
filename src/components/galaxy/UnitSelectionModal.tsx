import { useState } from 'react';
import type { Unit } from '@/types/convoy';

interface UnitSelectionModalProps {
  units: Unit[];
  onUnitsSelected: (units: Unit[]) => void;
  onClose: () => void;
}

export const UnitSelectionModal = ({ units, onUnitsSelected, onClose }: UnitSelectionModalProps) => {
  const [selectedUnits, setSelectedUnits] = useState<Unit[]>(units);

  const handleCheckboxChange = (unit: Unit) => {
    setSelectedUnits((prev) =>
      prev.some((u) => u.id === unit.id) ? prev.filter((u) => u.id !== unit.id) : [...prev, unit],
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-2xl border border-slate-700/60 bg-slate-900/80 p-6 text-white shadow-xl backdrop-blur">
        <h2 className="text-lg font-semibold uppercase tracking-widest">Select Units</h2>
        <div className="mt-4 space-y-2">
          {units.map((unit) => (
            <div key={unit.id} className="flex items-center justify-between rounded-lg bg-slate-800/50 p-3">
              <label htmlFor={`unit-${unit.id}`} className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id={`unit-${unit.id}`}
                  checked={selectedUnits.some((u) => u.id === unit.id)}
                  onChange={() => handleCheckboxChange(unit)}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500"
                />
                <span className="font-semibold">{unit.name}</span>
              </label>
              <div className="text-xs text-slate-400">
                <span>Spd: {unit.speed}</span> | <span>Cap: {unit.pressureCapacity}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-end space-x-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold uppercase tracking-wider text-slate-300 transition hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onUnitsSelected(selectedUnits)}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold uppercase tracking-wider text-white transition hover:bg-emerald-500"
            disabled={selectedUnits.length === 0}
          >
            Select Target
          </button>
        </div>
      </div>
    </div>
  );
};
