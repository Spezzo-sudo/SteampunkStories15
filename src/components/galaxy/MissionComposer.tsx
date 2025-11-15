import React, { useMemo, useState } from 'react';
import type { TileData } from '@/types/map';
import type { PathfindingResult } from '@/lib/pathfinding';

export type MissionAction = 'relocate' | 'attack' | 'colonise' | 'support' | 'trade';

export type MissionTempo = 'instant' | 'next-cycle' | 'staggered';

export interface MissionDraft {
  id: string;
  action: MissionAction;
  tempo: MissionTempo;
  payload: string[];
  escort: boolean;
  notes: string;
}

interface MissionComposerProps {
  startTile: TileData | null;
  targetTile: TileData | null;
  pathResult: PathfindingResult | null;
  onCreateMission: (mission: MissionDraft) => void;
}

interface MissionOption {
  id: MissionAction;
  label: string;
  accent: string;
  description: string;
}

const missionOptions: MissionOption[] = [
  {
    id: 'relocate',
    label: 'Umstationieren',
    accent: 'from-cyan-500/80 via-cyan-300/40 to-transparent',
    description: 'Verlege Truppen oder Kolonisten an einen sicheren Außenposten.',
  },
  {
    id: 'attack',
    label: 'Angreifen',
    accent: 'from-rose-500/70 via-rose-300/30 to-transparent',
    description: 'Setze eine Stoßtruppe in Marsch und plane Feuerunterstützung.',
  },
  {
    id: 'colonise',
    label: 'Kolonisieren',
    accent: 'from-emerald-500/70 via-emerald-400/40 to-transparent',
    description: 'Gründe eine neue Stadt, sichere Ressourcen und baue Verteidigung.',
  },
  {
    id: 'support',
    label: 'Unterstützen',
    accent: 'from-sky-500/70 via-sky-300/30 to-transparent',
    description: 'Verstärke Verbündete mit Versorgungsgütern und Reparaturteams.',
  },
  {
    id: 'trade',
    label: 'Handeln',
    accent: 'from-amber-500/70 via-amber-300/30 to-transparent',
    description: 'Organisiere Karawanen für Ressourcen- und Artefakt-Austausch.',
  },
];

const payloadPresets = [
  { id: 'infantry', label: 'Infanterie-Kompanie' },
  { id: 'colonists', label: '200 Kolonisten' },
  { id: 'supplies', label: 'Versorgungspakete' },
  { id: 'artillery', label: 'Belagerungsausrüstung' },
  { id: 'trade-goods', label: 'Handelswaren & Verträge' },
];

const tempoOptions: { id: MissionTempo; label: string; hint: string }[] = [
  { id: 'instant', label: 'Sofort entsenden', hint: 'Starte in der laufenden Runde.' },
  { id: 'next-cycle', label: 'Nächster Zyklus', hint: 'Bereite vor, Abreise nach Sonnenwende.' },
  { id: 'staggered', label: 'Staffelung', hint: 'In zwei Wellen starten – risikoreduziert.' },
];

const missionColour = (action: MissionAction) => {
  switch (action) {
    case 'attack':
      return 'border-rose-400/40 bg-rose-950/40 text-rose-100';
    case 'colonise':
      return 'border-emerald-400/40 bg-emerald-950/40 text-emerald-100';
    case 'support':
      return 'border-sky-400/40 bg-sky-950/40 text-sky-100';
    case 'trade':
      return 'border-amber-400/40 bg-amber-950/40 text-amber-100';
    default:
      return 'border-cyan-400/40 bg-cyan-950/40 text-cyan-100';
  }
};

/**
 * MissionComposer fasst Start, Ziel und Pfadkosten zusammen und hilft beim Ableiten spielerischer Aufträge.
 */
export const MissionComposer: React.FC<MissionComposerProps> = React.memo(
  ({ startTile, targetTile, pathResult, onCreateMission }) => {
    const [selectedAction, setSelectedAction] = useState<MissionAction>('relocate');
    const [selectedPayloads, setSelectedPayloads] = useState<string[]>(['infantry']);
    const [escort, setEscort] = useState(true);
    const [tempo, setTempo] = useState<MissionTempo>('instant');
    const [notes, setNotes] = useState('');

    const summary = useMemo(() => {
      if (!pathResult || pathResult.status !== 'success' || !startTile || !targetTile) {
        return null;
      }
      const steps = Math.max(pathResult.path.length - 1, 0);
      const travelHours = Math.max(4, Math.round(pathResult.cost * 6));
      const fatigue = Math.max(1, Math.round(pathResult.cost / 2));
      return {
        steps,
        travelHours,
        fatigue,
      };
    }, [pathResult, startTile, targetTile]);

    const handleTogglePayload = (payloadId: string) => {
      setSelectedPayloads((previous) =>
        previous.includes(payloadId)
          ? previous.filter((entry) => entry !== payloadId)
          : [...previous, payloadId],
      );
    };

    const handleSubmit = () => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      onCreateMission({
        id,
        action: selectedAction,
        tempo,
        payload: selectedPayloads,
        escort,
        notes,
      });
      setNotes('');
    };

    return (
      <section className="flex flex-col gap-3 rounded-2xl border border-slate-800/60 bg-slate-950/60 p-4 text-sm text-slate-100">
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Einsatzplan</p>
            <h2 className="font-cinzel text-lg text-yellow-200">Mission zusammenstellen</h2>
          </div>
          <span className={`rounded-full border px-3 py-1 text-[0.65rem] uppercase tracking-wide ${missionColour(selectedAction)}`}>
            {missionOptions.find((option) => option.id === selectedAction)?.label ?? 'Auftrag'}
          </span>
        </header>
        <p className="text-xs text-slate-300">
          Wähle einen Auftragstyp, um schnell zwischen Umstationierung, Angriff, Kolonisierung, Unterstützung oder Handel zu
          wechseln. Jede Option passt Reisezeit, Versorgung und Eskortbedarf automatisch an.
        </p>
        <div className="flex flex-wrap gap-2">
          {missionOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setSelectedAction(option.id)}
              className={`relative flex-1 rounded-xl border border-slate-800/60 bg-slate-900/40 p-3 text-left transition focus:outline-none focus:ring-2 focus:ring-yellow-400/60 ${
                selectedAction === option.id ? 'border-yellow-500/60 bg-yellow-500/10' : ''
              }`}
            >
              <span className={`pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br ${option.accent}`} aria-hidden="true" />
              <span className="relative block font-semibold text-slate-100">{option.label}</span>
              <span className="relative mt-1 block text-[0.7rem] uppercase tracking-wide text-slate-300">{option.description}</span>
            </button>
          ))}
        </div>
        <div className="grid gap-3 rounded-xl border border-slate-800/60 bg-slate-950/60 p-3 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Start</p>
            <p className="text-sm text-slate-100">
              {startTile ? `(${startTile.q}, ${startTile.r}) – ${startTile.biome}` : 'Startpunkt wählen'}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Ziel</p>
            <p className="text-sm text-slate-100">
              {targetTile ? `(${targetTile.q}, ${targetTile.r}) – ${targetTile.biome}` : 'Ziel wählen'}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Reisezeit</p>
            <p className="text-sm text-slate-100">
              {summary ? `${summary.travelHours} h – ${summary.steps} Sprünge` : 'Route unvollständig'}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Belastung</p>
            <p className="text-sm text-slate-100">{summary ? `Erschöpfung ${summary.fatigue}/10` : 'Noch keine Werte'}</p>
          </div>
        </div>
        <fieldset className="flex flex-col gap-2">
          <legend className="text-xs uppercase tracking-wide text-slate-400">Fracht & Personal</legend>
          <div className="flex flex-wrap gap-2">
            {payloadPresets.map((payload) => {
              const active = selectedPayloads.includes(payload.id);
              return (
                <button
                  key={payload.id}
                  type="button"
                  onClick={() => handleTogglePayload(payload.id)}
                  className={`rounded-full border px-3 py-1 text-[0.7rem] uppercase tracking-wide transition ${
                    active
                      ? 'border-yellow-500/70 bg-yellow-500/20 text-yellow-100'
                      : 'border-slate-700/60 bg-slate-900/60 text-slate-300'
                  }`}
                >
                  {payload.label}
                </button>
              );
            })}
          </div>
        </fieldset>
        <fieldset className="flex flex-col gap-2">
          <legend className="text-xs uppercase tracking-wide text-slate-400">Abmarsch</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {tempoOptions.map((option) => (
              <label
                key={option.id}
                className={`flex cursor-pointer flex-col gap-1 rounded-lg border border-slate-800/60 bg-slate-900/40 p-2 text-[0.7rem] uppercase tracking-wide ${
                  tempo === option.id ? 'border-yellow-400/60 bg-yellow-400/10 text-yellow-100' : 'text-slate-300'
                }`}
              >
                <span className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="mission-tempo"
                    className="text-yellow-400"
                    checked={tempo === option.id}
                    onChange={() => setTempo(option.id)}
                  />
                  {option.label}
                </span>
                <span className="text-[0.6rem] normal-case text-slate-400">{option.hint}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <label className="flex items-center gap-2 text-[0.75rem] uppercase tracking-wide text-slate-300">
          <input
            type="checkbox"
            checked={escort}
            onChange={(event) => setEscort(event.target.checked)}
            className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-yellow-400 focus:ring-yellow-400"
          />
          Eskorte anfordern (Luftschiffstaffel)
        </label>
        <label className="flex flex-col gap-2 text-[0.7rem] uppercase tracking-wide text-slate-400">
          Zusätzliche Hinweise
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="min-h-[80px] rounded-xl border border-slate-800/60 bg-black/40 p-3 text-sm text-slate-100 placeholder-slate-500 focus:border-yellow-400/60 focus:outline-none"
            placeholder="Sicherungsplan, Abwurfzonen, Kontakte ..."
          />
        </label>
        <button
          type="button"
          disabled={!startTile || !targetTile || !pathResult || pathResult.status !== 'success'}
          onClick={handleSubmit}
          className="rounded-xl border border-yellow-400/60 bg-yellow-500/10 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-yellow-100 transition hover:bg-yellow-500/20 disabled:cursor-not-allowed disabled:border-slate-700/60 disabled:bg-slate-900/40 disabled:text-slate-500"
        >
          Einsatz vormerken
        </button>
      </section>
    );
  },
);
MissionComposer.displayName = 'MissionComposer';
