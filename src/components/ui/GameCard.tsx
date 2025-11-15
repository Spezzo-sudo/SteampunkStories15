import React from 'react';
import { Resources, ResourceType } from '@/types';
import { MAX_BUILD_QUEUE_LENGTH } from '@/constants';
import RequirementBadge from './RequirementBadge';

export interface RequirementInfo {
  name: string;
  required: string;
  met: boolean;
  blocked?: boolean;
}

interface GameCardProps {
  name: string;
  level: number;
  targetLevel: number;
  description: string;
  image?: string;
  imageAlt?: string;
  upgradeCost: Resources;
  buildTime: number;
  canAfford: boolean;
  canUpgrade: boolean; // NEW: Whether all requirements are met
  onUpgrade: () => void;
  isUpgrading: boolean;
  queueLength: number;
  requirements?: RequirementInfo[]; // NEW: List of requirements to display
  meta?: React.ReactNode;
}

const formatTime = (seconds: number) => {
  if (seconds < 0) {
    seconds = 0;
  }
  if (seconds >= 5940) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60)
      .toString()
      .padStart(2, '0');
    const secs = Math.floor(seconds % 60)
      .toString()
      .padStart(2, '0');
    return `${hours}:${minutes}:${secs}`;
  }
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0');
  return `${minutes}:${secs}`;
};

const CostDisplay: React.FC<{ cost: Resources }> = ({ cost }) => (
  <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-gray-200">
    {cost[ResourceType.Orichalkum] > 0 && (
      <span>Or: {cost[ResourceType.Orichalkum].toLocaleString('de-DE')}</span>
    )}
    {cost[ResourceType.Fokuskristalle] > 0 && (
      <span>Kr: {cost[ResourceType.Fokuskristalle].toLocaleString('de-DE')}</span>
    )}
    {cost[ResourceType.Vitriol] > 0 && (
      <span>Vt: {cost[ResourceType.Vitriol].toLocaleString('de-DE')}</span>
    )}
  </div>
);

const GameCard: React.FC<GameCardProps> = ({
  name,
  level,
  targetLevel,
  description,
  image,
  imageAlt,
  upgradeCost,
  buildTime,
  canAfford,
  canUpgrade,
  onUpgrade,
  isUpgrading,
  queueLength,
  requirements,
  meta,
}) => {
  const queueIsFull = queueLength >= MAX_BUILD_QUEUE_LENGTH;
  const showResourceWarning = !canAfford;
  const canClick = canUpgrade && canAfford && !queueIsFull;

  let buttonLabel = 'Ausbauen';
  if (isUpgrading) {
    buttonLabel = 'Weiter ausbauen';
  }
  if (queueIsFull) {
    buttonLabel = `Warteschlange voll (${MAX_BUILD_QUEUE_LENGTH})`;
  }
  if (!canUpgrade) {
    buttonLabel = 'Anforderungen nicht erfüllt';
  }

  return (
    <article className="flex h-full flex-col justify-between rounded-2xl border border-yellow-800/30 bg-black/50 p-5 shadow-lg backdrop-blur">
      {image ? (
        <div className="relative mb-3 overflow-hidden rounded-xl border border-yellow-800/30">
          <img
            src={image}
            alt={imageAlt ?? `${name} Illustration`}
            className="h-36 w-full object-cover"
            loading="lazy"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-black/10 via-transparent to-black/50" />
        </div>
      ) : null}
      <header className="mb-3 border-b border-yellow-800/30 pb-3">
        <h3
          className="text-[clamp(1.1rem,0.9vw+1rem,1.5rem)] font-cinzel font-semibold text-yellow-300 leading-snug"
          style={{ hyphens: 'auto', wordBreak: 'break-word' }}
        >
          {name}
        </h3>
        <p className="mt-1 text-sm text-gray-300">
          Stufe {level}
          {isUpgrading && targetLevel > level && (
            <span className="text-emerald-300"> → {targetLevel}</span>
          )}
        </p>
      </header>
      <div className="flex-1 space-y-3">
        <p className="text-sm leading-relaxed text-gray-300">{description}</p>
        {requirements && requirements.length > 0 && (
          <div className="space-y-2 pt-2">
            <p className="text-xs font-semibold text-gray-300">Anforderungen:</p>
            <div className="space-y-1">
              {requirements.map((req, idx) => (
                <RequirementBadge
                  key={idx}
                  name={req.name}
                  required={req.required}
                  met={req.met}
                  blocked={req.blocked}
                  compact
                />
              ))}
            </div>
          </div>
        )}
        {meta}
      </div>
      <footer className="mt-4 space-y-3 text-center">
        <div>
          <p className="text-sm font-cinzel text-gray-200">Kosten für Stufe {targetLevel + 1}</p>
          <CostDisplay cost={upgradeCost} />
          <p className="text-xs text-gray-400">Bauzeit: {formatTime(buildTime)}</p>
          {showResourceWarning && (
            <p className="text-xs text-red-300">Nicht genug Ressourcen verfügbar.</p>
          )}
        </div>
        <button
          type="button"
          onClick={onUpgrade}
          disabled={!canClick}
          className={`w-full rounded-md px-4 py-2 font-cinzel text-sm uppercase tracking-wide transition-colors ${
            !canClick
              ? 'cursor-not-allowed bg-gray-700 text-gray-400'
              : 'steampunk-button'
          }`}
        >
          {buttonLabel}
        </button>
      </footer>
    </article>
  );
};

export default GameCard;
