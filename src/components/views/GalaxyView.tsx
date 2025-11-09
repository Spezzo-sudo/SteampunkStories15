import React, { useEffect, useMemo } from 'react';
import { MacroMap } from '@/components/galaxy/MacroMap';
import { RegionView } from '@/components/galaxy/RegionView';
import { useMapStore } from '@/store/mapStore';
import { useSessionStore } from '@/store/sessionStore';

/**
 * Main galaxy view orchestrating macro map rendering and micro region drilldowns.
 */
export default function GalaxyView(): React.ReactElement {
  const mode = useMapStore((state) => state.mode);
  const world = useMapStore((state) => state.world);
  const activeRegion = useMapStore((state) => state.activeRegion);
  const loadWorld = useMapStore((state) => state.loadWorld);
  const loadingWorld = useMapStore((state) => state.loadingWorld);
  const worldError = useMapStore((state) => state.worldError);
  const sessionUser = useSessionStore((state) => state.user);

  const regionCount = useMemo(() => world?.regions.length ?? 0, [world]);

  useEffect(() => {
    if (!sessionUser) {
      return;
    }
    void loadWorld();
  }, [loadWorld, sessionUser]);

  if (mode === 'micro' && activeRegion) {
    return (
      <section className="map-h flex flex-col p-2 sm:p-4">
        <div className="relative flex-1 overflow-hidden rounded-3xl border border-slate-700/60 bg-slate-950/70 shadow-inner">
          <RegionView region={activeRegion} />
        </div>
      </section>
    );
  }

  return (
    <section className="map-h flex flex-col gap-4 p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-cinzel text-yellow-200">Ätherische Weltkarte</h1>
        <p className="text-xs uppercase tracking-wide text-slate-300">
          {loadingWorld ? 'Lade Regionen…' : `Regionen insgesamt: ${regionCount}`}
        </p>
      </header>
      <div className="relative flex-1 overflow-hidden rounded-3xl border border-slate-700/60 bg-slate-900/60 shadow-inner">
        {worldError ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-sm text-amber-200">
            <p className="font-cinzel text-lg text-amber-300">Weltkarte nicht verfügbar</p>
            <p className="max-w-sm text-xs text-amber-100/80">
              {worldError}. Bitte überprüfe deine Verbindung oder versuche es in einigen Minuten erneut.
            </p>
          </div>
        ) : (
          <MacroMap />
        )}
      </div>
    </section>
  );
}
