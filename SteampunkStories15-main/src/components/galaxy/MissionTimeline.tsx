import React from 'react';
import type { MissionAction, MissionDraft } from '@/components/galaxy/MissionComposer';

export type MissionStatus = 'draft' | 'in-progress' | 'success' | 'failed';

export interface MissionReport {
  id: string;
  action: MissionAction;
  status: MissionStatus;
  originLabel: string;
  targetLabel: string;
  eta: string;
  summary: string;
  highlights: string[];
}

interface MissionTimelineProps {
  drafts: MissionDraft[];
  reports: MissionReport[];
}

const statusColour = (status: MissionStatus) => {
  switch (status) {
    case 'success':
      return 'border-emerald-400/40 bg-emerald-950/40 text-emerald-100';
    case 'failed':
      return 'border-rose-400/40 bg-rose-950/40 text-rose-100';
    case 'in-progress':
      return 'border-sky-400/40 bg-sky-950/40 text-sky-100';
    default:
      return 'border-yellow-400/40 bg-yellow-950/40 text-yellow-100';
  }
};

const actionLabel = (action: MissionAction) => {
  switch (action) {
    case 'attack':
      return 'Angriff';
    case 'colonise':
      return 'Kolonisierung';
    case 'support':
      return 'Unterstützung';
    case 'trade':
      return 'Handelszug';
    default:
      return 'Umstationierung';
  }
};

/**
 * MissionTimeline kombiniert geplante Aufträge mit abgeschlossenen Einsatzberichten.
 */
export const MissionTimeline: React.FC<MissionTimelineProps> = React.memo(({ drafts, reports }) => {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-slate-800/60 bg-slate-950/40 p-4 text-sm text-slate-100">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Kampflog & Berichte</p>
          <h2 className="font-cinzel text-lg text-yellow-200">Einsatztimeline</h2>
        </div>
        <span className="rounded-full border border-slate-700/60 px-3 py-1 text-[0.65rem] uppercase tracking-wide text-slate-300">
          {drafts.length} in Planung
        </span>
      </header>
      {drafts.length === 0 ? (
        <p className="text-xs text-slate-300">Noch keine geplanten Aufträge – stelle eine Mission zusammen und merke sie vor.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {drafts.map((draft) => (
            <article
              key={draft.id}
              className="rounded-xl border border-yellow-400/40 bg-yellow-500/10 p-3 text-[0.75rem] uppercase tracking-wide text-yellow-100"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">Geplant: {actionLabel(draft.action)}</span>
                <span className="text-[0.65rem] text-yellow-200">Tempo: {draft.tempo}</span>
              </div>
              <p className="mt-1 text-[0.65rem] text-yellow-200/80">
                Payload: {draft.payload.length > 0 ? draft.payload.join(', ') : 'Keine Angaben'} • Eskorte {draft.escort ? 'aktiv' : 'aus'}
              </p>
              {draft.notes ? <p className="mt-1 text-[0.65rem] normal-case text-yellow-50/90">{draft.notes}</p> : null}
            </article>
          ))}
        </div>
      )}
      <div className="h-px w-full bg-slate-800/70" />
      <div className="flex flex-col gap-3">
        {reports.map((report) => (
          <article
            key={report.id}
            className={`flex flex-col gap-2 rounded-xl border px-3 py-2 text-[0.75rem] uppercase tracking-wide ${statusColour(report.status)}`}
          >
            <header className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold">{actionLabel(report.action)}</span>
              <span className="text-[0.65rem] text-slate-200">ETA {report.eta}</span>
            </header>
            <p className="text-[0.65rem] text-slate-100">
              {report.originLabel} → {report.targetLabel}
            </p>
            <p className="text-[0.65rem] normal-case text-slate-200/90">{report.summary}</p>
            <ul className="flex flex-col gap-1 text-[0.6rem] normal-case text-slate-300">
              {report.highlights.map((highlight, index) => (
                <li key={`${report.id}-highlight-${index}`} className="flex items-start gap-1">
                  <span aria-hidden="true">✦</span>
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
});
MissionTimeline.displayName = 'MissionTimeline';
