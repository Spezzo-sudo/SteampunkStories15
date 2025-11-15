import React from 'react';
import { useGameStore } from '@/store/gameStore';
import { ResourceType } from '@/types';
import ProgressBar from '@/components/ui/ProgressBar';
import { useSessionStore } from '@/store/sessionStore';

const formatNumber = (num: number) => Math.floor(num).toLocaleString('de-DE');

interface ResourceDisplayProps {
  type: ResourceType;
  current: number;
  capacity: number;
}

/**
 * Eine Komponente zur Anzeige einer einzelnen Ressource mit ihrem aktuellen Wert,
 * ihrer Kapazität und einem Fortschrittsbalken.
 */
const ResourceDisplay: React.FC<ResourceDisplayProps> = ({ type, current, capacity }) => {
  const fillPercent = capacity > 0 ? Math.min(100, (current / capacity) * 100) : 0;
  const isNearlyFull = capacity > 0 && current >= capacity * 0.95;
  const textColor = isNearlyFull ? 'text-red-400' : 'text-yellow-200';

  return (
    <div className="flex min-w-[200px] flex-1 flex-col gap-1 rounded-lg bg-black/30 p-3 shadow-sm">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[clamp(0.9rem,0.8vw+0.8rem,1.1rem)] font-cinzel uppercase tracking-wide">
          {type}
        </span>
        <span className={`text-sm font-semibold ${textColor}`}>
          {formatNumber(current)} / {formatNumber(capacity)}
        </span>
      </div>
      <ProgressBar progress={fillPercent} />
      <div className="flex items-center justify-between text-xs text-gray-300">
        <span>Lager</span>
        <span>{fillPercent.toFixed(0)}%</span>
      </div>
    </div>
  );
};

const KesseldruckDisplay: React.FC = () => {
  const { capacity, consumption, net, efficiency } = useGameStore((state) => state.kesseldruck);
  const demandRatio = capacity > 0 ? (consumption / capacity) * 100 : 0;
  const statusColor = net >= 0 ? 'text-emerald-300' : 'text-red-400';
  const gaugePercent = Math.min(100, Math.max(0, demandRatio));
  const tooltip =
    'Kesseldruck beschreibt die verfügbare Energie. Überschuss steigert die Produktions-Effizienz, Defizit drosselt Anlagen.';

  return (
    <div className="flex min-w-[220px] flex-1 flex-col gap-1 rounded-lg bg-black/30 p-3 shadow-sm" title={tooltip}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="flex items-center gap-2 text-[clamp(0.9rem,0.8vw+0.8rem,1.1rem)] font-cinzel uppercase tracking-wide">
          <span role="img" aria-label="Kesseldruck">
            ⎈
          </span>
          Kesseldruck (bar)
        </span>
        <span className="text-sm text-yellow-200">
          {formatNumber(consumption)} / {formatNumber(capacity)}
        </span>
      </div>
      <ProgressBar progress={gaugePercent} />
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-300">
        <span className={statusColor}>{net >= 0 ? `Überschuss ${formatNumber(net)}` : `Defizit ${formatNumber(Math.abs(net))}`}</span>
        <span>Effizienz {Math.round(Math.min(1, Math.max(0, efficiency)) * 100)}%</span>
      </div>
    </div>
  );
};

/**
 * Die obere Leiste der Benutzeroberfläche.
 * Zeigt die aktuellen Ressourcen des Spielers und den Kesseldruck an.
 */
const TopBar: React.FC = () => {
  const resources = useGameStore((state) => state.resources);
  const storage = useGameStore((state) => state.storage);
  const sessionUser = useSessionStore((state) => state.user);
  const logout = useSessionStore((state) => state.logout);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout fehlgeschlagen', error);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <div className="flex flex-1 flex-wrap justify-center gap-3">
        <ResourceDisplay
          type={ResourceType.Orichalkum}
          current={resources[ResourceType.Orichalkum]}
          capacity={storage[ResourceType.Orichalkum]}
        />
        <ResourceDisplay
          type={ResourceType.Fokuskristalle}
          current={resources[ResourceType.Fokuskristalle]}
          capacity={storage[ResourceType.Fokuskristalle]}
        />
        <ResourceDisplay
          type={ResourceType.Vitriol}
          current={resources[ResourceType.Vitriol]}
          capacity={storage[ResourceType.Vitriol]}
        />
        <KesseldruckDisplay />
      </div>
      {sessionUser && (
        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-xs uppercase tracking-wide text-gray-200">
          <span className="font-semibold text-amber-300">{sessionUser.email ?? 'Commander'}</span>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg border border-amber-400/60 px-3 py-1 font-semibold text-amber-300 transition hover:border-amber-200 hover:text-amber-100"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
};

export default TopBar;
