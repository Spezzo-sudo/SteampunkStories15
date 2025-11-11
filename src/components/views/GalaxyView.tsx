import React, { useEffect, useMemo, useRef } from 'react';
import { MacroMap } from '@/components/galaxy/MacroMap';
import { RegionView } from '@/components/galaxy/RegionView';
import { useMapStore } from '@/store/mapStore';
import { useSessionStore } from '@/store/sessionStore';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';

/** Renders a welcome screen for players who have not yet placed a home base. */
const WelcomeMode: React.FC = () => (
  <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
    <h1 className="font-cinzel text-2xl text-amber-300">Willkommen, Kommandant!</h1>
    <p className="max-w-md text-sm text-slate-300">
      Das Schicksal deines Volkes liegt in deinen Händen. Um deine Reise zu beginnen, musst du zuerst eine Heimatbasis
      in einem der bewohnbaren Systeme errichten. Wähle eine Region auf der Karte und suche dir einen geeigneten Planeten
      aus, um dein interstellares Imperium zu gründen.
    </p>
  </div>
);

/** Main galaxy view orchestrating macro map rendering and micro region drilldowns. */
export default function GalaxyView(): React.ReactElement {
  const didLoadWorld = useRef(false);

  // --- Zustand Selectors ---
  const mode = useMapStore((state) => state.mode);
  const world = useMapStore((state) => state.world);
  const activeRegion = useMapStore((state) => state.activeRegion);
  const loadingWorld = useMapStore((state) => state.loadingWorld);
  const worldError = useMapStore((state) => state.worldError);

  const userId = useSessionStore((state) => state.user?.uid);
  const profile = useSessionStore((state) => state.profile);
  const sessionLoading = useSessionStore((state) => state.initializing);
  const loadingProfile = useSessionStore((state) => state.loadingProfile);

  // --- Memoized Values ---
  const regionCount = useMemo(() => world?.regions.length ?? 0, [world]);

  // --- Effects ---
  useEffect(() => {
    // Guard to ensure world data is loaded only once.
    if (!userId || didLoadWorld.current) {
      return;
    }
    didLoadWorld.current = true;
    useMapStore.getState().loadWorld();
  }, [userId]);

  // --- Render Logic ---
  if (sessionLoading || loadingProfile) {
    return <LoadingOverlay>Lade Sitzung...</LoadingOverlay>;
  }

  if (profile && !profile.hasPlacedHome) {
    if (mode === 'micro' && activeRegion) {
      return (
        <section className="map-h flex flex-col p-2 sm:p-4">
          <div className="absolute left-1/2 top-6 z-10 -translate-x-1/2 rounded-md bg-slate-900/80 px-4 py-2 text-white shadow-lg">
            Wähle ein Feld, um deine Heimatbasis zu errichten.
          </div>
          <div className="relative flex-1 overflow-hidden rounded-3xl border border-slate-700/60 bg-slate-950/70 shadow-inner">
            <RegionView region={activeRegion} />
          </div>
        </section>
      );
    }

    return (
      <section className="map-h flex flex-col gap-4 p-4">
        <header className="flex items-center justify-center">
          <h1 className="text-2xl font-cinzel text-yellow-200">Wähle deine Startregion</h1>
        </header>
        <div className="relative flex-1 overflow-hidden rounded-3xl border border-slate-700/60 bg-slate-900/60 shadow-inner">
          <MacroMap />
        </div>
      </section>
    );
  }

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
