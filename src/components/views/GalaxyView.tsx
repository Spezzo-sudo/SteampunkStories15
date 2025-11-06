import React, { useEffect } from 'react';
import { MacroMap } from '@/components/galaxy/MacroMap';
import { RegionView } from '@/components/galaxy/RegionView';
import { useMapStore } from '@/store/mapStore';

/**
 * Main galaxy view orchestrating macro map rendering and micro region drilldowns.
 */
export default function GalaxyView(): React.ReactElement {
  const mode = useMapStore((state) => state.mode);
  const regions = useMapStore((state) => state.regions);
  const activeRegion = useMapStore((state) => state.activeRegion);
  const loadWorld = useMapStore((state) => state.loadWorld);
  const backToMacro = useMapStore((state) => state.backToMacro);
  const activeMeta =
    activeRegion && regions.find((region) => region.id === activeRegion.regionId);

  useEffect(() => {
    void loadWorld();
  }, [loadWorld]);

  if (mode === 'micro' && activeRegion) {
    return (
      <section className="flex h-full flex-col gap-4 p-4">
        <header className="flex flex-col gap-3 rounded-3xl border border-slate-700/60 bg-slate-900/60 p-4 shadow-inner md:flex-row md:items-center md:justify-between">
          <div>
            <nav className="text-[0.65rem] uppercase tracking-[0.2em] text-slate-400">Weltkarte ▸ Region</nav>
            <h1 className="text-2xl font-cinzel text-yellow-200">
              {activeMeta?.name ?? `Region ${activeRegion.regionId}`}
            </h1>
            <p className="mt-1 text-xs uppercase tracking-wide text-slate-300">
              Koordinaten {activeRegion.RQ}, {activeRegion.RR}
              {activeMeta?.seed !== undefined ? ` • Seed ${activeMeta.seed}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={backToMacro}
            className="self-start rounded-md border border-yellow-500/40 bg-black/50 px-4 py-2 text-sm text-yellow-100 transition hover:bg-yellow-500/20 md:self-auto"
          >
            ⟵ Zurück zur Makrokarte
          </button>
        </header>
        <div className="flex-1 overflow-hidden rounded-3xl border border-slate-700/60 bg-slate-900/60 shadow-inner">
          <RegionView region={activeRegion} />
        </div>
      </section>
    );
  }

  if (mode === 'idle') {
    return (
      <section className="flex h-full items-center justify-center text-slate-200">
        <span>Makrokarte wird geladen…</span>
      </section>
    );
  }

  return (
    <section className="flex h-full flex-col gap-4 p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-cinzel text-yellow-200">Ätherische Weltkarte</h1>
        <p className="text-xs uppercase tracking-wide text-slate-300">Regionen insgesamt: {regions.length}</p>
      </header>
      <div className="flex-1 overflow-hidden rounded-3xl border border-slate-700/60 bg-slate-900/60 shadow-inner">
        <MacroMap regions={regions} />
      </div>
    </section>
  );
}
