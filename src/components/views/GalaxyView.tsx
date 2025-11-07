import React, { useEffect, useMemo } from 'react';
import { MacroMap } from '@/components/galaxy/MacroMap';
import { RegionView } from '@/components/galaxy/RegionView';
import { useMapStore } from '@/store/mapStore';

/**
 * Main galaxy view orchestrating macro map rendering and micro region drilldowns.
 */
export default function GalaxyView(): React.ReactElement {
  const mode = useMapStore((state) => state.mode);
  const regionsRecord = useMapStore((state) => state.regions);
  const lanes = useMapStore((state) => state.lanes);
  const activeRegion = useMapStore((state) => state.activeRegion);
  const loadWorld = useMapStore((state) => state.loadWorld);
  const loadingWorld = useMapStore((state) => state.loadingWorld);

  const regionNodes = useMemo(() => Object.values(regionsRecord), [regionsRecord]);

  useEffect(() => {
    void loadWorld();
  }, [loadWorld]);

  if (mode === 'micro' && activeRegion) {
    return (
      <section className="flex h-[calc(100dvh-1rem)] flex-col p-2 sm:p-4">
        <div className="relative flex-1 overflow-hidden rounded-3xl border border-slate-700/60 bg-slate-950/70 shadow-inner">
          <RegionView region={activeRegion} />
        </div>
      </section>
    );
  }

  return (
    <section className="flex h-[calc(100dvh-1rem)] flex-col gap-4 p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-cinzel text-yellow-200">Ätherische Weltkarte</h1>
        <p className="text-xs uppercase tracking-wide text-slate-300">
          {loadingWorld ? 'Lade Regionen…' : `Regionen insgesamt: ${regionNodes.length}`}
        </p>
      </header>
      <div className="relative flex-1 overflow-hidden rounded-3xl border border-slate-700/60 bg-slate-900/60 shadow-inner">
        <MacroMap nodes={regionNodes} lanes={lanes} />
      </div>
    </section>
  );
}
