import React from 'react';

interface LoadingOverlayProps {
  /**
   * Fortschritt in Prozent, der dem Nutzer im Ladebalken angezeigt wird.
   */
  progress: number;
  /**
   * Optionale Statusmeldung, die unter dem Fortschrittstext dargestellt wird.
   */
  message?: string;
  /**
   * Optionaler Fehlerhinweis, der im Falle eines Fallbacks angezeigt wird.
   */
  error?: string;
}

/**
 * Halbtransparenter Vollbild-Overlay, der den aktuellen Ladefortschritt des Verzeichnisses visualisiert.
 */
export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ progress, message, error }) => {
  const normalizedProgress = Math.min(100, Math.max(0, Math.round(progress)));
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm"
    >
      <div className="w-full max-w-md space-y-6 px-6 text-center">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.4em] text-amber-400">Synchronisierung</p>
          <h1 className="text-3xl font-semibold text-white">Galaktische Daten werden geladen</h1>
          {message && <p className="text-sm text-slate-300">{message}</p>}
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-medium text-slate-200">
            <span>Fortschritt</span>
            <span>{normalizedProgress}%</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-700/60">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-pink-500 transition-all duration-300 ease-out"
              style={{ width: `${normalizedProgress}%` }}
            />
          </div>
        </div>
        {error ? (
          <p className="text-sm text-red-400">
            {error}
            <span className="ml-1 text-slate-400">Fallback-Daten wurden geladen.</span>
          </p>
        ) : (
          <p className="text-xs text-slate-400">Sobald alles bereit ist, startet deine Mission automatisch.</p>
        )}
      </div>
    </div>
  );
};

export default LoadingOverlay;
