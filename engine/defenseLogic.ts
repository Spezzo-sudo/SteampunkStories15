/**
 * Enumeration of the playable factions with unique defense line-ups.
 */
export enum FactionId {
  Aetherion = 'Aetherion',
  Novarkh = 'Novarkh',
  Thermoclan = 'Thermoclan'
}

/**
 * Configuration contract describing the requirements of a defense structure.
 */
export interface DefenseStructure {
  id: string;
  name: string;
  tags: string[];
  description: string;
  energyCost: number;
  requiresResearch: string;
  requires_buildings: Record<string, number>;
  faction: FactionId | 'All';
}

/**
 * Snapshot of the player's current unlock progress and owned buildings.
 */
export interface UnlockContext {
  faction: FactionId;
  buildings: Record<string, number>;
}

/**
 * Minimal research tracker indicating which technologies are finished.
 */
export interface PlayerResearchState {
  completed: Record<string, boolean>;
}

interface DefenseConstructionEvent {
  event: 'defense_constructed';
  playerId: string;
  faction: FactionId;
  structureId: string;
  location: string;
  requirementsMet: boolean;
}

const mockPlayer = {
  id: 'player-001',
  faction: FactionId.Aetherion
};

const defenseEventLog: DefenseConstructionEvent[] = [];

function logEvent(event: DefenseConstructionEvent): void {
  defenseEventLog.push(event);
}

/**
 * Lookup table describing all currently supported defensive structures.
 */
export const Defenses: Record<string, DefenseStructure> = {
  PYRONIS_BASTION: {
    id: 'PYRONIS_BASTION',
    name: 'Pyronis-Bastion',
    tags: ['aoe'],
    description: 'Heavy pyronis tower with splash damage',
    energyCost: 8,
    requiresResearch: 'plasma_overload',
    requires_buildings: { defense_platform: 4 },
    faction: FactionId.Thermoclan
  },
  SCHILDWALL_EMITTER: {
    id: 'SCHILDWALL_EMITTER',
    name: 'Schildwall-Emitter',
    tags: ['shield'],
    description: 'Projects a defensive shield wall',
    energyCost: 7,
    requiresResearch: 'schildmatrix_tech',
    requires_buildings: { defense_platform: 5 },
    faction: FactionId.Aetherion
  },
  REPLIKATOR_BLOCKER: {
    id: 'REPLIKATOR_BLOCKER',
    name: 'Replikator-Blocker',
    tags: ['disrupt'],
    description: 'Prevents enemy replication abilities',
    energyCost: 4,
    requiresResearch: 'quantenbegrenzung',
    requires_buildings: { defense_platform: 2 },
    faction: FactionId.Novarkh
  },
  TESLA_BATTERIE: {
    id: 'TESLA_BATTERIE',
    name: 'Tesla-Batterie',
    tags: ['burst', 'short-range'],
    description: 'Kurzreichweite, hohe Feuerrate.',
    energyCost: 4,
    requiresResearch: 'tesla-spulen-forschung',
    requires_buildings: { panzerwerk: 1 },
    faction: 'All'
  },
  DAMPFKANONE: {
    id: 'DAMPFKANONE',
    name: 'Dampfkanone',
    tags: ['aoe', 'mid-range'],
    description: 'Mittlere Reichweite mit Flächenschaden.',
    energyCost: 6,
    requiresResearch: 'pulver-projektilkunde',
    requires_buildings: { panzerwerk: 2 },
    faction: 'All'
  },
  AETHERSCHILD_KUPPEL: {
    id: 'AETHERSCHILD_KUPPEL',
    name: 'Ätherschild-Kuppel',
    tags: ['shield', 'support'],
    description: 'Absorbiert Schaden und regeneriert.',
    energyCost: 7,
    requiresResearch: 'magnetfeldbarrieren',
    requires_buildings: { forschungslabor: 3 },
    faction: FactionId.Aetherion
  },
  LUFTMINENFELD: {
    id: 'LUFTMINENFELD',
    name: 'Luftminenfeld',
    tags: ['trap', 'burst'],
    description: 'Einmaliger Spike gegen anrückende Flotten.',
    energyCost: 5,
    requiresResearch: 'aethergravimetrie',
    requires_buildings: { panzerwerk: 1 },
    faction: 'All'
  }
};

/**
 * Checks whether the provided context fulfills all requirements to construct the defense.
 */
export function canBuildDefense(id: string, ctx: UnlockContext, research: PlayerResearchState): boolean {
  const def = Defenses[id];
  if (!def) return false;
  if (def.faction && def.faction !== 'All' && def.faction !== ctx.faction) {
    return false;
  }
  if (!research.completed[def.requiresResearch]) return false;
  for (const [b, lvl] of Object.entries(def.requires_buildings)) {
    if ((ctx.buildings[b] || 0) < lvl) return false;
  }
  return true;
}

/**
 * Logs an analytics event for construction attempts and returns whether the build succeeded.
 */
export function buildDefense(id: string, ctx: UnlockContext, research: PlayerResearchState): boolean {
  const success = canBuildDefense(id, ctx, research);
  logEvent({
    event: 'defense_constructed',
    playerId: mockPlayer.id,
    faction: mockPlayer.faction,
    structureId: id,
    location: 'base',
    requirementsMet: success
  });
  return success;
}
