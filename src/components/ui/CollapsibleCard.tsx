import React, { useState } from 'react';
import { Resources, ResourceType } from '@/types';
import { MAX_BUILD_QUEUE_LENGTH } from '@/constants';

export interface CollapsibleCardProps {
  id: string;
  icon: string;
  title: string;
  level: number;
  targetLevel: number;
  shortDescription: string; // 1-2 Sätze
  fullDescription?: string; // Erweitert für Modal
  stats?: Record<string, string | number>; // z.B. { 'Angriff': 45, 'Abwehr': 30 }
  cost: Resources;
  buildTime: number;
  canAfford: boolean;
  onAction: (quantity?: number) => void;
  actionLabel: string;
  image?: string;
  imageAlt?: string;
  isUpgrading?: boolean;
  queueLength?: number;
  quantity?: number; // Für Schiffe
  onQuantityChange?: (qty: number) => void;
  requirements?: string[]; // Für Requirements-Badge
  meta?: React.ReactNode;
  disabled?: boolean;
}

const RESOURCE_ICONS: Record<ResourceType, string> = {
  [ResourceType.Orichalkum]: '⚙️',
  [ResourceType.Fokuskristalle]: '💠',
  [ResourceType.Vitriol]: '☠️',
};

const RESOURCE_SHORT: Record<ResourceType, string> = {
  [ResourceType.Orichalkum]: 'Or',
  [ResourceType.Fokuskristalle]: 'Kr',
  [ResourceType.Vitriol]: 'Vt',
};

const formatTime = (seconds: number): string => {
  if (seconds < 0) seconds = 0;
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

/**
 * CollapsibleCard - Modern two-state card component
 * Collapsed: Shows essential info with icons
 * Expanded: Full details in modal
 */
const CollapsibleCard: React.FC<CollapsibleCardProps> = ({
  id: _id, // eslint-disable-line @typescript-eslint/no-unused-vars
  icon,
  title,
  level,
  targetLevel,
  shortDescription,
  fullDescription,
  stats = {},
  cost,
  buildTime,
  canAfford,
  onAction,
  actionLabel,
  image,
  imageAlt,
  isUpgrading = false,
  queueLength = 0,
  quantity = 1,
  onQuantityChange,
  requirements = [],
  meta,
  disabled = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localQuantity, setLocalQuantity] = useState(quantity);

  const queueIsFull = queueLength >= MAX_BUILD_QUEUE_LENGTH;
  const isDisabled = disabled || queueIsFull || !canAfford;

  const handleQuantityChange = (newQty: number) => {
    const clamped = Math.max(1, Math.min(newQty, 999));
    setLocalQuantity(clamped);
    onQuantityChange?.(clamped);
  };

  // =====================
  // COLLAPSED STATE
  // =====================
  const CollapsedView = () => (
    <button
      onClick={() => setIsExpanded(true)}
      className="group w-full rounded-lg border border-yellow-700/40 bg-gradient-to-br from-yellow-900/15 to-black/40 p-4 transition-all duration-300 hover:border-yellow-600/60 hover:bg-gradient-to-br hover:from-yellow-900/25 hover:to-black/50 hover:shadow-lg active:scale-98"
    >
      <div className="flex gap-4">
        {/* Thumbnail Image (Optional) */}
        {image && (
          <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border border-yellow-700/30">
            <img
              src={image}
              alt={imageAlt}
              className="h-full w-full object-cover"
              loading="lazy"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/40" />
          </div>
        )}

        {/* Content Stack */}
        <div className="flex flex-1 flex-col gap-2 text-left">
          {/* Title & Level */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">{icon}</span>
              <h3 className="font-cinzel font-semibold text-yellow-300">{title}</h3>
            </div>
            <span className="text-xs text-yellow-200/70">
              Lv. {level}
              {isUpgrading && targetLevel > level && (
                <span className="ml-1 text-emerald-400">→ {targetLevel}</span>
              )}
            </span>
          </div>

          {/* Short Description */}
          <p className="text-xs text-gray-300 line-clamp-1">{shortDescription}</p>

          {/* Stats Row (Icons) */}
          {Object.keys(stats).length > 0 && (
            <div className="flex flex-wrap gap-3 text-xs text-yellow-200/80">
              {Object.entries(stats).map(([key, value]) => (
                <span key={key} className="font-semibold">
                  {key}: {value}
                </span>
              ))}
            </div>
          )}

          {/* Resources & Buildtime */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-300">
            {/* Resources */}
            <div className="flex gap-2">
              {cost[ResourceType.Orichalkum] > 0 && (
                <span>
                  {RESOURCE_ICONS[ResourceType.Orichalkum]}{' '}
                  {cost[ResourceType.Orichalkum].toLocaleString('de-DE')}
                </span>
              )}
              {cost[ResourceType.Fokuskristalle] > 0 && (
                <span>
                  {RESOURCE_ICONS[ResourceType.Fokuskristalle]}{' '}
                  {cost[ResourceType.Fokuskristalle].toLocaleString('de-DE')}
                </span>
              )}
              {cost[ResourceType.Vitriol] > 0 && (
                <span>
                  {RESOURCE_ICONS[ResourceType.Vitriol]}{' '}
                  {cost[ResourceType.Vitriol].toLocaleString('de-DE')}
                </span>
              )}
            </div>

            {/* Buildtime */}
            <span className="ml-auto flex items-center gap-1">
              ⏱️ {formatTime(buildTime)}
            </span>
          </div>
        </div>

        {/* Action Buttons (Right Side) */}
        <div className="flex flex-col gap-2">
          {/* Quick Action Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAction(localQuantity);
            }}
            disabled={isDisabled}
            className={`h-10 whitespace-nowrap rounded-md px-3 text-xs font-semibold uppercase tracking-wider transition-colors ${
              isDisabled
                ? 'cursor-not-allowed bg-gray-700/40 text-gray-500'
                : 'steampunk-button hover:shadow-lg active:scale-95'
            }`}
          >
            {!canAfford ? '❌' : isUpgrading ? '▶' : '✓'}
          </button>

          {/* Expand Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(true);
            }}
            className="h-10 w-10 rounded-md border border-yellow-700/40 bg-yellow-900/20 text-yellow-200 transition-colors hover:border-yellow-600/60 hover:bg-yellow-900/40 active:scale-95"
            title="Mehr Infos"
          >
            ▼
          </button>
        </div>
      </div>

      {/* Quantity Input (nur wenn vorhanden) */}
      {onQuantityChange && (
        <div
          className="mt-3 flex items-center justify-between rounded-lg bg-black/30 p-2"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-xs text-gray-300">Menge:</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleQuantityChange(localQuantity - 1)}
              className="h-6 w-6 rounded bg-yellow-900/40 text-xs text-yellow-300 hover:bg-yellow-900/60"
            >
              −
            </button>
            <input
              type="number"
              value={localQuantity}
              onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
              className="w-10 rounded bg-black/40 text-center text-xs text-yellow-200 outline-none"
              min="1"
              max="999"
            />
            <button
              type="button"
              onClick={() => handleQuantityChange(localQuantity + 1)}
              className="h-6 w-6 rounded bg-yellow-900/40 text-xs text-yellow-300 hover:bg-yellow-900/60"
            >
              +
            </button>
          </div>
        </div>
      )}
    </button>
  );

  // =====================
  // EXPANDED STATE (MODAL)
  // =====================
  const ExpandedView = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-yellow-700/50 bg-gradient-to-b from-yellow-900/20 to-black/60 p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{icon}</span>
            <div>
              <h2 className="text-2xl font-cinzel font-bold text-yellow-300">{title}</h2>
              <p className="text-sm text-yellow-200/60">Level {level}</p>
            </div>
          </div>
          <button
            onClick={() => setIsExpanded(false)}
            className="text-2xl text-yellow-300 transition-colors hover:text-yellow-100"
          >
            ✕
          </button>
        </div>

        {/* Image (Full Width) */}
        {image && (
          <div className="mb-6 overflow-hidden rounded-xl border border-yellow-700/30">
            <img src={image} alt={imageAlt} className="h-auto w-full object-cover" />
          </div>
        )}

        {/* Full Description */}
        <div className="mb-6 space-y-3 text-gray-300">
          <p className="text-sm leading-relaxed">{fullDescription || shortDescription}</p>

          {/* Stats Section */}
          {Object.keys(stats).length > 0 && (
            <div className="rounded-lg bg-yellow-900/20 p-4">
              <h4 className="mb-3 font-semibold text-yellow-300">Statistiken</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries(stats).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between rounded bg-black/40 px-3 py-2"
                  >
                    <span className="text-gray-300">{key}</span>
                    <span className="font-semibold text-yellow-200">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Requirements */}
          {requirements.length > 0 && (
            <div className="rounded-lg bg-yellow-900/20 p-4">
              <h4 className="mb-2 font-semibold text-yellow-300">Voraussetzungen</h4>
              <ul className="space-y-1 text-sm">
                {requirements.map((req) => (
                  <li key={req} className="flex items-center gap-2 text-gray-300">
                    <span className="text-yellow-300">✓</span> {req}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Meta Info */}
          {meta && <div className="mt-4">{meta}</div>}
        </div>

        {/* Divider */}
        <div className="my-6 border-t border-yellow-700/30" />

        {/* Cost Section */}
        <div className="mb-6 rounded-lg bg-black/40 p-4">
          <h4 className="mb-3 font-semibold text-yellow-300">Kosten für Level {targetLevel + 1}</h4>
          <div className="grid grid-cols-3 gap-3 text-center text-sm">
            <div className="rounded bg-black/40 px-3 py-2">
              <div className="text-2xl">{RESOURCE_ICONS[ResourceType.Orichalkum]}</div>
              <div className="mt-1 text-yellow-200">
                {cost[ResourceType.Orichalkum].toLocaleString('de-DE')}
              </div>
              <div className="text-xs text-gray-400">{RESOURCE_SHORT[ResourceType.Orichalkum]}</div>
            </div>
            <div className="rounded bg-black/40 px-3 py-2">
              <div className="text-2xl">{RESOURCE_ICONS[ResourceType.Fokuskristalle]}</div>
              <div className="mt-1 text-yellow-200">
                {cost[ResourceType.Fokuskristalle].toLocaleString('de-DE')}
              </div>
              <div className="text-xs text-gray-400">
                {RESOURCE_SHORT[ResourceType.Fokuskristalle]}
              </div>
            </div>
            <div className="rounded bg-black/40 px-3 py-2">
              <div className="text-2xl">{RESOURCE_ICONS[ResourceType.Vitriol]}</div>
              <div className="mt-1 text-yellow-200">
                {cost[ResourceType.Vitriol].toLocaleString('de-DE')}
              </div>
              <div className="text-xs text-gray-400">{RESOURCE_SHORT[ResourceType.Vitriol]}</div>
            </div>
          </div>
          <div className="mt-3 text-center text-sm text-gray-300">
            Bauzeit: <span className="font-semibold text-yellow-200">{formatTime(buildTime)}</span>
          </div>
          {!canAfford && <div className="mt-2 text-center text-xs text-red-400">⚠️ Nicht genug Ressourcen</div>}
        </div>

        {/* Quantity Input */}
        {onQuantityChange && (
          <div className="mb-6 rounded-lg bg-black/40 p-4">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-yellow-300">Menge:</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleQuantityChange(localQuantity - 1)}
                  className="h-8 w-8 rounded bg-yellow-900/40 font-semibold text-yellow-300 hover:bg-yellow-900/60"
                >
                  −
                </button>
                <input
                  type="number"
                  value={localQuantity}
                  onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                  className="w-16 rounded bg-black/40 text-center font-semibold text-yellow-200 outline-none"
                  min="1"
                  max="999"
                />
                <button
                  type="button"
                  onClick={() => handleQuantityChange(localQuantity + 1)}
                  className="h-8 w-8 rounded bg-yellow-900/40 font-semibold text-yellow-300 hover:bg-yellow-900/60"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => {
              onAction(localQuantity);
              setIsExpanded(false);
            }}
            disabled={isDisabled}
            className={`flex-1 rounded-lg px-4 py-3 font-cinzel font-semibold uppercase tracking-wide transition-all ${
              isDisabled
                ? 'cursor-not-allowed bg-gray-700/40 text-gray-500'
                : 'steampunk-button hover:shadow-lg active:scale-95'
            }`}
          >
            {!canAfford ? 'Ressourcen fehlen' : actionLabel}
          </button>
          <button
            type="button"
            onClick={() => setIsExpanded(false)}
            className="rounded-lg border border-yellow-700/50 bg-black/40 px-4 py-3 font-semibold text-yellow-300 transition-colors hover:bg-yellow-900/20 active:scale-95"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <CollapsedView />
      {isExpanded && <ExpandedView />}
    </>
  );
};

export default CollapsibleCard;
