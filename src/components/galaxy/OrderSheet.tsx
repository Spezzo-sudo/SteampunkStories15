import React, { useMemo, useState } from 'react';

interface UnitStackSummary {
  /** Stable identifier to toggle the stack selection. */
  id: string;
  /** Display label describing the stack. */
  label: string;
  /** Faction or alliance owning the stack. */
  faction: string;
  /** Total units contained in the stack. */
  count: number;
  /** Combat strength indicator shown to the player. */
  strength: number;
  /** Coordinate hint to locate the stack on the map. */
  origin: string;
}

interface OrderDraft {
  /** Unique identifier for the queued command. */
  id: string;
  /** Selected stack labels summarised for the UI. */
  unitLabels: string[];
  /** Command mode describing the queue entry. */
  mode: 'dispatch' | 'queue';
  /** Timestamp when the entry was recorded. */
  createdAt: number;
}

interface OrderSheetProps {
  /** Available stacks in the current region. */
  available: UnitStackSummary[];
  /** Currently selected stack identifiers. */
  selectedIds: Set<string>;
  /** Queued order drafts awaiting execution. */
  queued: OrderDraft[];
  /** Toggle callback when a stack chip is clicked. */
  onToggle: (id: string) => void;
  /** Action invoked when the player sends the current selection. */
  onCommit: (mode: 'dispatch' | 'queue') => void;
  /** Whether commands are disabled while awaiting a home selection. */
  disabled: boolean;
  /** Optional helper text displayed when actions are disabled. */
  disabledHint?: string;
}

const tabClass = 'rounded-full px-3 py-1 text-xs uppercase tracking-wide transition';
const chipClass =
  'rounded-full border border-slate-600/60 bg-slate-800/70 px-3 py-1 text-xs flex flex-col gap-1 text-slate-100 shadow-sm hover:border-emerald-300/60 hover:text-emerald-200';

/**
 * Compact bottom sheet displaying available units, active selections and queued commands.
 */
export const OrderSheet: React.FC<OrderSheetProps> = ({
  available,
  selectedIds,
  queued,
  onToggle,
  onCommit,
  disabled,
  disabledHint,
}) => {
  const [activeTab, setActiveTab] = useState(0);

  const selectedStacks = useMemo(
    () => available.filter((stack) => selectedIds.has(stack.id)),
    [available, selectedIds],
  );

  const tabs = [
    { label: 'Verfügbar', content: available },
    { label: 'Markiert', content: selectedStacks },
    { label: 'Queue', content: queued },
  ] as const;

  return (
    <div className="rounded-2xl border border-slate-700/60 bg-slate-900/80 shadow-inner">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-200">Aufträge</span>
        <div className="flex gap-2">
          {tabs.map((tab, index) => (
            <button
              key={tab.label}
              type="button"
              className={`${tabClass} ${
                activeTab === index
                  ? 'border border-emerald-400/80 bg-emerald-500/20 text-emerald-100'
                  : 'border border-slate-600/60 text-slate-300 hover:border-emerald-500/40 hover:text-emerald-200'
              }`}
              onClick={() => setActiveTab(index)}
            >
              {tab.label}
              {index === 0 && available.length ? (
                <span className="ml-1 inline-flex h-5 min-w-[1.5rem] items-center justify-center rounded-full bg-emerald-500/20 text-[0.6rem] text-emerald-100">
                  {available.length}
                </span>
              ) : null}
              {index === 1 && selectedStacks.length ? (
                <span className="ml-1 inline-flex h-5 min-w-[1.5rem] items-center justify-center rounded-full bg-cyan-500/20 text-[0.6rem] text-cyan-100">
                  {selectedStacks.length}
                </span>
              ) : null}
              {index === 2 && queued.length ? (
                <span className="ml-1 inline-flex h-5 min-w-[1.5rem] items-center justify-center rounded-full bg-amber-500/20 text-[0.6rem] text-amber-100">
                  {queued.length}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pb-3">
        {activeTab === 0 ? (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
            {available.length ? (
              available.map((stack) => {
                const isSelected = selectedIds.has(stack.id);
                return (
                  <button
                    key={stack.id}
                    type="button"
                    className={`${chipClass} ${
                      isSelected ? 'border-emerald-400/80 text-emerald-100 shadow-emerald-500/20' : ''
                    }`}
                    onClick={() => onToggle(stack.id)}
                    aria-pressed={isSelected}
                  >
                    <span className="flex items-center justify-between text-[0.7rem] uppercase tracking-widest">
                      <span>{stack.label}</span>
                      <span className="text-slate-400">{stack.faction}</span>
                    </span>
                    <span className="flex items-center justify-between text-[0.65rem] text-slate-300">
                      <span>{stack.count} Einheiten</span>
                      <span>Kraft {stack.strength}</span>
                    </span>
                    <span className="text-[0.6rem] text-slate-400">{stack.origin}</span>
                  </button>
                );
              })
            ) : (
              <p className="text-xs text-slate-400">Keine einsatzbereiten Kontingente in dieser Region.</p>
            )}
          </div>
        ) : null}

        {activeTab === 1 ? (
          <div className="space-y-2">
            {selectedStacks.length ? (
              selectedStacks.map((stack) => (
                <div
                  key={stack.id}
                  className="flex items-center justify-between rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100"
                >
                  <span className="font-semibold uppercase tracking-widest">{stack.label}</span>
                  <span className="text-cyan-200/70">{stack.count} • Kraft {stack.strength}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400">Noch keine Einheiten markiert.</p>
            )}
          </div>
        ) : null}

        {activeTab === 2 ? (
          <div className="space-y-2">
            {queued.length ? (
              queued.map((entry) => (
                <div
                  key={entry.id}
                  className="flex flex-col rounded-xl border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100"
                >
                  <span className="font-semibold uppercase tracking-widest">
                    {entry.mode === 'dispatch' ? 'Sofortauftrag' : 'Warteschlange'}
                  </span>
                  <span className="text-amber-200/80">{entry.unitLabels.join(', ') || 'Keine Einheiten angegeben'}</span>
                  <span className="text-[0.6rem] text-amber-200/60">
                    {new Date(entry.createdAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400">Keine Aufträge in der Warteschlange.</p>
            )}
          </div>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-50 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-700"
            onClick={() => onCommit('dispatch')}
            disabled={disabled || selectedStacks.length === 0}
          >
            Senden
          </button>
          <button
            type="button"
            className="rounded-lg bg-slate-700 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-100 transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:bg-slate-800"
            onClick={() => onCommit('queue')}
            disabled={disabled || selectedStacks.length === 0}
          >
            Zur Queue
          </button>
          {disabled && disabledHint ? (
            <span className="text-[0.65rem] uppercase tracking-widest text-amber-200/80">{disabledHint}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
};

OrderSheet.displayName = 'OrderSheet';

export type { OrderDraft, UnitStackSummary };
