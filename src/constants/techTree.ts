import type { ResourceId } from '@/types/biome';

/**
 * ZugehÃ¶rige Typen fÃ¼r Tech-Tree-EintrÃ¤ge.
 */
export type TechNodeCategory = 'structure' | 'unit' | 'research' | 'support';

/**
 * Beschreibt einen technologischen Fortschritt in der Tech-Ansicht.
 */
export interface TechNode {
  /** Stabile ID fÃ¼r Referenzen und AbhÃ¤ngigkeiten. */
  id: string;
  /** Anzeige-Name in der UI. */
  name: string;
  /** Ãœbergeordnete Kategorie (Einheit, GebÃ¤ude, Forschung ...). */
  category: TechNodeCategory;
  /** Technologiestufe â€“ wird fÃ¼r die Spaltenanordnung genutzt. */
  tier: number;
  /** Kurze ErklÃ¤rzeile fÃ¼r Tooltips und Listen. */
  summary: string;
  /** Detaillierte Beschreibung mit Flavor-Text. */
  description: string;
  /** Schlagworte fÃ¼r Filter- und Suchfunktionen. */
  tags: string[];
  /** Ressourcen-/KostenÃ¼bersicht fÃ¼r den ersten Bau/Unlock. */
  cost: Partial<Record<ResourceId, number>>;
  /** AbhÃ¤ngigkeiten, die vorab freigeschaltet sein mÃ¼ssen. */
  requires: string[];
  /** Statistische Kenndaten fÃ¼r den Detail-View. */
  stats: {
    hp?: number;
    attack?: number;
    defense?: number;
    speed?: number;
    upkeep?: Partial<Record<ResourceId, number>>;
  };
  /** StÃ¤rken des Eintrags â€“ Stichpunkte fÃ¼r den Detail-View. */
  strengths: string[];
  /** SchwÃ¤chen bzw. Konter. */
  weaknesses: string[];
  /** Lore-Happen oder Anmerkungen. */
  lore: string;
  /** Optionale Bild-URL oder Illustration. */
  image?: string;
}

/**
 * Kanonischer Tech-Katalog â€“ bildet die Grundlage fÃ¼r die TechTree-Ansicht.
 */
export const TECH_TREE_NODES: TechNode[] = [
  {
    id: 'core-foundry',
    name: 'Ã„therkern-GieÃŸerei',
    category: 'structure',
    tier: 1,
    summary: 'Grundlage jeder Kolonie â€“ raffiniert Ã„ther zu stabilen Kernkristallen.',
    description:
      'Verdichtet rohen Ã„ther zu stabilen Kernkristallen, die als Basismaterial fÃ¼r alle fortgeschrittenen Maschinen dienen. Ohne sie versiegen Produktion und Forschung.',
    tags: ['produktion', 'ressourcen', 'Ã¤ther'],
    cost: { aether: 80, ore: 40 },
    requires: [],
    stats: { hp: 2200, defense: 30, upkeep: { aether: 2 } },
    strengths: ['Stabilisiert die Energieversorgung', 'ErhÃ¶ht die Effizienz aller Minen in der NÃ¤he'],
    weaknesses: ['Hohe Aufbaukosten', 'Angreifbar ohne Verteidigungsanlagen'],
    lore: 'Die erste GieÃŸerei wurde Ã¼ber den Ruinen der Uhrwerkstadt Helion errichtet â€“ eine Landmarke fÃ¼r Pioniere.',
  },
  {
    id: 'aether-lab',
    name: 'Ã„ther-Labor',
    category: 'research',
    tier: 1,
    summary: 'Entsperrt grundlegende Forschung und Analyse von Ã„theranomalien.',
    description:
      'Kompakte Forschungseinheit zur Analyse von Ã„therflÃ¼ssen und Anomalien. Liefert Forschungspunkte und erÃ¶ffnet neue Pfade im Tech-Baum.',
    tags: ['forschung', 'support', 'Ã¤ther'],
    cost: { aether: 60, luxury: 15 },
    requires: ['core-foundry'],
    stats: { hp: 1400, upkeep: { aether: 1 } },
    strengths: ['ErhÃ¶ht ForschungsausstoÃŸ', 'Schaltet spezialisierte Resonanztechnologien frei'],
    weaknesses: ['BenÃ¶tigt konstante Versorgung', 'Geringe Verteidigungswerte'],
    lore: 'Die Akademie von Chronos etabliert mobile Labore, um neue Grenzen des Ã„thers blitzschnell auszukundschaften.',
  },
  {
    id: 'bronze-bastion',
    name: 'Bronzebastion',
    category: 'structure',
    tier: 1,
    summary: 'Defensiver AuÃŸenposten, der sich ideal zur Sicherung neuer Sektoren eignet.',
    description:
      'Eine modulare Verteidigungsanlage mit drehbaren GeschÃ¼tztÃ¼rmen und verstÃ¤rkten Messingplatten. Perfekt, um neue Sektoren zu halten, bis schwere Flotten eintreffen.',
    tags: ['verteidigung', 'turm', 'auÃŸenposten'],
    cost: { ore: 120, coal: 60 },
    requires: ['core-foundry'],
    stats: { hp: 3200, attack: 110, defense: 75, upkeep: { coal: 1 } },
    strengths: ['Hohe Trefferpunkte', 'SchÃ¼tzt angrenzende Strukturen mit Schildkuppel'],
    weaknesses: ['Geringe Reichweite', 'AnfÃ¤llig gegen Belagerungsartillerie'],
    lore: 'Die ersten Bastionen wurden aus den Panzerplatten stillgelegter Dreadnoughts geschmiedet.',
  },
  {
    id: 'steam-frigate',
    name: 'Dampffregatte',
    category: 'unit',
    tier: 2,
    summary: 'Mittlere Kriegsschiffe mit ausgewogenem Angriff und Verteidigung.',
    description:
      'Die Arbeitspferde der Chronos-Flotten. Dampffregatten kombinieren schwenkbare Kanonen mit robustem Rumpf und sind fÃ¼r die Sicherung von Handelsrouten optimiert.',
    tags: ['flotte', 'midgame', 'handelsroute'],
    cost: { ore: 180, fuel: 60, aether: 50 },
    requires: ['bronze-bastion', 'aether-lab'],
    stats: { hp: 1900, attack: 160, defense: 65, speed: 2, upkeep: { fuel: 2 } },
    strengths: ['Vielseitiger Allrounder', 'Bonus gegen Piratennester und Schmuggler'],
    weaknesses: ['Unterliegt schweren Belagerungsschiffen', 'Braucht regelmÃ¤ÃŸige Betankung'],
    lore: 'Jede Fregatte erhÃ¤lt eine eigene Glocke mit eingravierten Siegesdaten â€“ Tradition seit der Ã„ra der Luftkriege.',
  },
  {
    id: 'sky-harvester',
    name: 'Himmels-Ernter',
    category: 'support',
    tier: 2,
    summary: 'Flugmodule, die Biomasse aus Skyfarms automatisiert einsammeln.',
    description:
      'Unbemannte Sammlerplattformen, die die Ausbeute von Skyfarms erhÃ¶hen und gleichzeitig die Versorgungskette mit Lebensmittelkonzentraten stabilisieren.',
    tags: ['skyfarm', 'unterstÃ¼tzung', 'logistik'],
    cost: { food: 90, influence: 25 },
    requires: ['aether-lab'],
    stats: { hp: 900, speed: 3, upkeep: { food: 1 } },
    strengths: ['Steigert Nahrungsertrag angrenzender Felder', 'GewÃ¤hrt temporÃ¤re Buffs fÃ¼r Kolonien'],
    weaknesses: ['Wehrlos gegen Beschuss', 'BenÃ¶tigt ausgewiesene Flugkorridore'],
    lore: 'Die ernter Drohnen folgen einer polyphonen Pfeifsprache â€“ erfunden von Cloud-Pionierin Elara.',
  },
  {
    id: 'resonance-tor',
    name: 'Resonanztor',
    category: 'structure',
    tier: 3,
    summary: 'Erzeugt Portale zwischen Sektoren und erÃ¶ffnet strategische Optionen.',
    description:
      'Massive Toranlage, die Ã„therfrequenzen bricht und stabile Sprungpunkte erzeugt. Verringert Reisezeiten drastisch und ermÃ¶glicht Hinterhalte Ã¼ber groÃŸe Distanz.',
    tags: ['portal', 'logistik', 'spÃ¤tspiel'],
    cost: { aether: 320, luxury: 90, influence: 80 },
    requires: ['steam-frigate', 'sky-harvester'],
    stats: { hp: 4100, defense: 80, upkeep: { aether: 4, luxury: 1 } },
    strengths: ['Teleportiert Flotten in benachbarte Cluster', 'GewÃ¤hrt globale Sicht auf Ã„therstrÃ¶me'],
    weaknesses: ['Extrem energiehungrig', 'SabotageanfÃ¤llig ohne Schildgenerator'],
    lore: 'Legenden berichten, dass Resonanztore einst als Sternentore dienten â€“ ihre Runen sind bis heute nicht entschlÃ¼sselt.',
  },
  {
    id: 'leviathan-dreadnought',
    name: 'Leviathan-Dreadnought',
    category: 'unit',
    tier: 3,
    summary: 'Schwerer Kriegskoloss mit enormer Feuer- und Schildkraft.',
    description:
      'Der HÃ¶hepunkt der Chronos-Schiffswerften. Leviathane tragen mehrere gestaffelte Kanonendecks, Schildprojektoren und Drohnenbuchten fÃ¼r Nahverteidigung.',
    tags: ['flotte', 'schwer', 'endgame'],
    cost: { ore: 420, fuel: 160, aether: 260 },
    requires: ['resonance-tor'],
    stats: { hp: 6200, attack: 340, defense: 210, speed: 1, upkeep: { fuel: 5 } },
    strengths: ['Ãœberragende Feuerkraft', 'Kann Schildkuppeln projizieren', 'FurchteinflÃ¶ÃŸende PrÃ¤senz'],
    weaknesses: ['Sehr langsam', 'Hohe Wartungskosten', 'Ausfall einzelner Systeme kann kritisch sein'],
    lore: 'Nur drei Leviathane wurden bisher gebaut. Ihre RÃ¼mpfe sind mit den Namen gefallener Helden graviert.',
  },
];
