import React, { useEffect, useMemo, useState } from 'react';
import type { RegionData, TileData } from '@/types/map';
import type { Convoy, Unit } from '@/types/convoy';
import { ActionType } from '@/types/convoy';
import { planConvoy } from '@/lib/movement/planning';
import { convoySpeed } from '@/lib/movement/costs';

interface ConvoyActionModalProps {
  region: RegionData;
  start: TileData;
  target: TileData;
  availableUnits: Unit[];
  onClose: () => void;
  onConfirm: (convoy: Convoy, units: Unit[]) => void;
}

const ACTION_LABEL: Record<ActionType, string> = {
  [ActionType.MOVE]: 'Bewegen',
  [ActionType.COLONIZE]: 'Kolonisieren',
  [ActionType.SCOUT]: 'Spähen',
  [ActionType.ATTACK]: 'Angreifen',
};

const pressureFormatter = new Intl.NumberFormat('de-DE', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

const durationFormatter = new Intl.RelativeTimeFormat('de', { numeric: 'auto' });

const formatDuration = (ms: number) => {
  if (ms < 60_000) {
    return `${Math.round(ms / 1000)} Sekunden`;
  }
  const minutes = Math.round(ms / 60_000);
  return durationFormatter.format(minutes, 'minute');
};

/**
 * Modal that allows the player to pick units and an action to plan a convoy.
 */
export const ConvoyActionModal: React.FC<ConvoyActionModalProps> = ({
  region,
  start,
  target,
  availableUnits,
  onClose,
  onConfirm,
}) => {
  const [selectedUnits, setSelectedUnits] = useState<string[]>(() => availableUnits.map((unit) => unit.id));
  const [action, setAction] = useState<ActionType>(ActionType.SCOUT);
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    setSelectedUnits(availableUnits.map((unit) => unit.id));
  }, [availableUnits]);

  const selectedUnitObjects = useMemo(
    () => availableUnits.filter((unit) => selectedUnits.includes(unit.id)),
    [availableUnits, selectedUnits],
  );

  const plan = useMemo(() => {
    if (selectedUnitObjects.length === 0) {
      return null;
    }
    return planConvoy(
      region,
      { q: start.q, r: start.r },
      { q: target.q, r: target.r },
      selectedUnitObjects,
      action,
    );
  }, [action, region, selectedUnitObjects, start.q, start.r, target.q, target.r]);

  useEffect(() => {
    if (!plan || plan.ok) {
      setWarning(null);
      return;
    }
    setWarning(plan.reason);
  }, [plan]);

  const handleConfirm = () => {
    if (!plan || !plan.ok) {
      return;
    }
    const convoyUnits = selectedUnitObjects;
    const convoy: Convoy = {
      id: `convoy-${Date.now()}`,
      unitIds: convoyUnits.map((unit) => unit.id),
      origin: { RQ: region.RQ, RR: region.RR, q: start.q, r: start.r },
      target: { RQ: region.RQ, RR: region.RR, q: target.q, r: target.r },
      path: plan.path,
      action,
      roundTrip: plan.roundTrip,
      speed: convoySpeed(convoyUnits),
      pressureTankMax: plan.pressureTankMax,
      pressureCost: plan.cost,
      etaMs: plan.etaMs,
      state: 'queued',
      region,
    };
    onConfirm(convoy, convoyUnits);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 p-4">
      <div className="relative w-full max-w-3xl rounded-3xl border border-yellow-500/40 bg-slate-950/95 p-6 shadow-2xl">
        <button
          type="button"
          className="absolute right-4 top-4 text-sm uppercase tracking-wide text-yellow-200"
          onClick={onClose}
        >
          Schließen
        </button>
        <div className="mb-4 text-xs uppercase tracking-wide text-yellow-200">Konvoi planen</div>
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-4">
            <div>
              <h3 className="font-cinzel text-lg text-yellow-100">Einheiten auswählen</h3>
              <p className="text-xs text-slate-300">
                Starte auf Hex ({start.q}, {start.r}) → Ziel ({target.q}, {target.r})
              </p>
            </div>
            <ul className="space-y-2">
              {availableUnits.map((unit) => {
                const isSelected = selectedUnits.includes(unit.id);
                return (
                  <li
                    key={unit.id}
                    className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm transition ${
                      isSelected
                        ? 'border-cyan-400/70 bg-cyan-500/10 text-cyan-100'
                        : 'border-slate-700/60 bg-slate-900/40 text-slate-200 hover:border-cyan-400/40'
                    }`}
                  >
                    <label className="flex flex-1 cursor-pointer items-center justify-between gap-3">
                      <span className="font-medium">{unit.name}</span>
                      <span className="text-[0.65rem] uppercase tracking-wide text-slate-300">
                        Tempo {unit.speed.toFixed(2)} • Druck {unit.pressureCapacity}
                      </span>
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={isSelected}
                        onChange={(event) => {
                          setSelectedUnits((previous) => {
                            if (event.target.checked) {
                              return [...previous, unit.id];
                            }
                            return previous.filter((id) => id !== unit.id);
                          });
                        }}
                      />
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="space-y-4">
            <div>
              <h3 className="font-cinzel text-lg text-yellow-100">Aktion</h3>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {Object.values(ActionType).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAction(value)}
                    className={`rounded-lg border px-3 py-2 text-sm uppercase tracking-wide transition ${
                      action === value
                        ? 'border-amber-400/70 bg-amber-500/10 text-amber-100'
                        : 'border-slate-700/60 bg-slate-900/40 text-slate-200 hover:border-amber-400/40'
                    }`}
                  >
                    {ACTION_LABEL[value]}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-700/60 bg-black/40 p-4 text-sm text-slate-100">
              <h4 className="text-xs uppercase tracking-wide text-slate-300">Zusammenfassung</h4>
              {selectedUnitObjects.length === 0 ? (
                <p className="mt-2 text-slate-400">Bitte mindestens eine Einheit wählen.</p>
              ) : plan ? (
                plan.ok ? (
                  <div className="mt-3 space-y-2 text-sm text-slate-100">
                    <p>Druckkosten: {pressureFormatter.format(plan.cost)} / {plan.pressureTankMax}</p>
                    <p>ETA: {formatDuration(plan.etaMs)}</p>
                    <p>Tempo: {convoySpeed(selectedUnitObjects).toFixed(2)} Hex/s</p>
                    <p>{plan.roundTrip ? 'Hin- und Rückweg' : 'Einfacher Weg'}</p>
                  </div>
                ) : (
                  <div className="mt-3 space-y-2 text-sm text-rose-200">
                    <p>{plan.reason}</p>
                    {plan.cost ? (
                      <p>
                        Erforderlicher Druck: {pressureFormatter.format(plan.cost)} / {plan.pressureTankMax}
                      </p>
                    ) : null}
                  </div>
                )
              ) : null}
            </div>
            <button
              type="button"
              disabled={!plan || !plan.ok}
              onClick={handleConfirm}
              className="w-full rounded-xl border border-emerald-400/70 bg-emerald-500/20 py-3 text-sm uppercase tracking-wide text-emerald-100 disabled:cursor-not-allowed disabled:border-slate-700/60 disabled:bg-slate-900/40 disabled:text-slate-500"
            >
              Konvoi starten
            </button>
            {warning ? (
              <div className="rounded-xl border border-rose-400/50 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
                {warning}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
