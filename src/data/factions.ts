/** Descriptor for an alliance used when highlighting regions and tiles. */
export interface AllianceMeta {
  /** Stable identifier referenced by regions and tiles. */
  id: string;
  /** Short label used for badges. */
  tag: string;
  /** Primary color applied during filters. */
  color: string;
}

/** Static alliance palette for the prototype map. */
export const ALLIANCES: AllianceMeta[] = [
  { id: 'house-aurum', tag: 'AUR', color: '#fbbf24' },
  { id: 'guild-cerulean', tag: 'CER', color: '#38bdf8' },
  { id: 'order-verdant', tag: 'VER', color: '#34d399' },
  { id: 'coven-ember', tag: 'EMB', color: '#f97316' },
];

/** Builds a lookup map from alliance identifier to metadata. */
export const buildAllianceMap = () => new Map(ALLIANCES.map((entry) => [entry.id, entry]));
