import React, { useEffect, useState } from 'react';
import { useMapStore } from '@/store/mapStore';

interface DebugFabProps {
  mode: 'macro' | 'micro';
}

/**
 * Floating debug panel that exposes quick toggles for RAW, grid, lane and legend overlays.
 */
const DebugFab: React.FC<DebugFabProps> = ({ mode }) => {
  const [open, setOpen] = useState(false);

  const raw = useMapStore((state) => state.rawMode);
  const setRaw = useMapStore((state) => state.setRawMode);
  const grid = useMapStore((state) => state.showGrid);
  const setGrid = useMapStore((state) => state.setShowGrid);
  const lanes = useMapStore((state) => state.showLanes);
  const setLanes = useMapStore((state) => state.setShowLanes);
  const legend = useMapStore((state) => state.showLegend);
  const setLegend = useMapStore((state) => state.setShowLegend);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.repeat) {
        return;
      }
      if (event.key === 'r' || event.key === 'R') {
        setRaw(!raw);
      } else if (event.key === 'g' || event.key === 'G') {
        setGrid(!grid);
      } else if ((event.key === 'l' || event.key === 'L') && mode === 'macro') {
        setLanes(!lanes);
      } else if (event.key === 'h' || event.key === 'H') {
        setLegend(!legend);
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [grid, lanes, legend, mode, raw, setGrid, setLanes, setLegend, setRaw]);

  return (
    <div className="pointer-events-auto absolute right-4 bottom-4 z-50 flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="h-12 w-12 rounded-full border border-slate-600/50 bg-slate-900/80 text-xl text-slate-200 shadow-lg backdrop-blur"
        aria-expanded={open}
        aria-label="Schön-Testmodus öffnen"
      >
        ⋯
      </button>
      {open ? (
        <div className="w-[220px] rounded-2xl border border-slate-600/40 bg-slate-900/85 p-3 text-sm text-slate-100 shadow-xl backdrop-blur">
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-300/90">Schön·Testmodus</div>
          <DebugToggle label="RAW" active={raw} onToggle={() => setRaw(!raw)} />
          <DebugToggle label="Grid (Region)" active={grid} onToggle={() => setGrid(!grid)} />
          {mode === 'macro' ? <DebugToggle label="Aether-Lanes" active={lanes} onToggle={() => setLanes(!lanes)} /> : null}
          <DebugToggle label="Legende" active={legend} onToggle={() => setLegend(!legend)} />
        </div>
      ) : null}
    </div>
  );
};

interface DebugToggleProps {
  label: string;
  active: boolean;
  onToggle: () => void;
}

const DebugToggle: React.FC<DebugToggleProps> = ({ label, active, onToggle }) => {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`mb-2 flex w-full items-center justify-between rounded-lg border px-3 py-2 text-xs uppercase tracking-[0.2em] transition ${
        active
          ? 'border-teal-400/40 bg-teal-950/20 text-teal-200'
          : 'border-slate-600/40 bg-slate-800/20 text-slate-200/90 hover:border-teal-400/40 hover:text-teal-100'
      }`}
    >
      <span>{label}</span>
      <span className="text-[0.6rem]">{active ? 'AN' : 'AUS'}</span>
    </button>
  );
};

export default DebugFab;
