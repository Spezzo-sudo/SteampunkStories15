import React from 'react';

type MapLoaderProps = {
  progress: number;
};

const LINES = [
  'Kalibriere Ätherkompass …',
  'Poliere Messing-Zahnrad #27 …',
  'Entzünde Plasmalaternen im Dock …',
  'Verankere Zeppeline an Handelsrouten …',
  'Synchronisiere Sternkarten …',
] as const;

/**
 * Displays a thematic loading overlay while the galaxy tiles are prepared.
 */
const MapLoader: React.FC<MapLoaderProps> = ({ progress }) => {
  const clamped = Math.min(100, Math.max(0, Math.round(progress)));
  const index = Math.min(LINES.length - 1, Math.floor((clamped / 100) * LINES.length));
  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-md space-y-4 px-6 text-center">
        <h2 className="text-2xl font-semibold text-white">Galaxie wird berechnet …</h2>
        <p className="text-sm text-slate-300">{LINES[index]}</p>
        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-700/60">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-pink-500 transition-[width]"
            style={{ width: `${clamped}%` }}
          />
        </div>
        <p className="text-xs text-slate-400">{clamped}%</p>
      </div>
    </div>
  );
};

export default MapLoader;
