import type { ResourceId } from '@/types/biome';

/**
 * Zugehörige Typen für Tech-Tree-Einträge.
 */
export type TechNodeCategory = 'structure' | 'unit' | 'research' | 'support';

/**
 * Beschreibt einen technologischen Fortschritt in der Tech-Ansicht.
 */
export interface TechNode {
  /** Stabile ID für Referenzen und Abhängigkeiten. */
  id: string;
  /** Anzeige-Name in der UI. */
  name: string;
  /** Übergeordnete Kategorie (Einheit, Gebäude, Forschung ...). */
  category: TechNodeCategory;
  /** Technologiestufe – wird für die Spaltenanordnung genutzt. */
  tier: number;
  /** Kurze Erklärzeile für Tooltips und Listen. */
  summary: string;
  /** Detaillierte Beschreibung mit Flavor-Text. */
  description: string;
  /** Schlagworte für Filter- und Suchfunktionen. */
  tags: string[];
  /** Ressourcen-/Kostenübersicht für den ersten Bau/Unlock. */
  cost: Partial<Record<ResourceId, number>>;
  /** Abhängigkeiten, die vorab freigeschaltet sein müssen. */
  requires: string[];
  /** Statistische Kenndaten für den Detail-View. */
  stats: {
    hp?: number;
    attack?: number;
    defense?: number;
    speed?: number;
    upkeep?: Partial<Record<ResourceId, number>>;
  };
  /** Stärken des Eintrags – Stichpunkte für den Detail-View. */
  strengths: string[];
  /** Schwächen bzw. Konter. */
  weaknesses: string[];
  /** Lore-Happen oder Anmerkungen. */
  lore: string;
  /** Optionale Bild-URL oder Illustration. */
  image?: string;
}

/**
 * Kanonischer Tech-Katalog – bildet die Grundlage für die TechTree-Ansicht.
 */
export const TECH_TREE_NODES: TechNode[] = [
  {
    id: 'core-foundry',
    name: 'Ätherkern-Gießerei',
    category: 'structure',
    tier: 1,
    summary: 'Grundlage jeder Kolonie – raffiniert Äther zu stabilen Kernkristallen.',
    description:
      'Verdichtet rohen Äther zu stabilen Kernkristallen, die als Basismaterial für alle fortgeschrittenen Maschinen dienen. Ohne sie versiegen Produktion und Forschung.',
    tags: ['produktion', 'ressourcen', 'äther'],
    cost: { aether: 80, ore: 40 },
    requires: [],
    stats: { hp: 2200, defense: 30, upkeep: { aether: 2 } },
    strengths: ['Stabilisiert die Energieversorgung', 'Erhöht die Effizienz aller Minen in der Nähe'],
    weaknesses: ['Hohe Aufbaukosten', 'Angreifbar ohne Verteidigungsanlagen'],
    lore: 'Die erste Gießerei wurde über den Ruinen der Uhrwerkstadt Helion errichtet – eine Landmarke für Pioniere.',
  },
  {
    id: 'aether-lab',
    name: 'Äther-Labor',
    category: 'research',
    tier: 1,
    summary: 'Entsperrt grundlegende Forschung und Analyse von Ätheranomalien.',
    description:
      'Kompakte Forschungseinheit zur Analyse von Ätherflüssen und Anomalien. Liefert Forschungspunkte und eröffnet neue Pfade im Tech-Baum.',
    tags: ['forschung', 'support', 'äther'],
    cost: { aether: 60, luxury: 15 },
    requires: ['core-foundry'],
    stats: { hp: 1400, upkeep: { aether: 1 } },
    strengths: ['Erhöht Forschungsausstoß', 'Schaltet spezialisierte Resonanztechnologien frei'],
    weaknesses: ['Benötigt konstante Versorgung', 'Geringe Verteidigungswerte'],
    lore: 'Die Akademie von Chronos etabliert mobile Labore, um neue Grenzen des Äthers blitzschnell auszukundschaften.',
  },
  {
    id: 'bronze-bastion',
    name: 'Bronzebastion',
    category: 'structure',
    tier: 1,
    summary: 'Defensiver Außenposten, der sich ideal zur Sicherung neuer Sektoren eignet.',
    description:
      'Eine modulare Verteidigungsanlage mit drehbaren Geschütztürmen und verstärkten Messingplatten. Perfekt, um neue Sektoren zu halten, bis schwere Flotten eintreffen.',
    tags: ['verteidigung', 'turm', 'außenposten'],
    cost: { ore: 120, coal: 60 },
    requires: ['core-foundry'],
    stats: { hp: 3200, attack: 110, defense: 75, upkeep: { coal: 1 } },
    strengths: ['Hohe Trefferpunkte', 'Schützt angrenzende Strukturen mit Schildkuppel'],
    weaknesses: ['Geringe Reichweite', 'Anfällig gegen Belagerungsartillerie'],
    lore: 'Die ersten Bastionen wurden aus den Panzerplatten stillgelegter Dreadnoughts geschmiedet.',
  },
  {
    id: 'steam-frigate',
    name: 'Dampffregatte',
    category: 'unit',
    tier: 2,
    summary: 'Mittlere Kriegsschiffe mit ausgewogenem Angriff und Verteidigung.',
    description:
      'Die Arbeitspferde der Chronos-Flotten. Dampffregatten kombinieren schwenkbare Kanonen mit robustem Rumpf und sind für die Sicherung von Handelsrouten optimiert.',
    tags: ['flotte', 'midgame', 'handelsroute'],
    cost: { ore: 180, fuel: 60, aether: 50 },
    requires: ['bronze-bastion', 'aether-lab'],
    stats: { hp: 1900, attack: 160, defense: 65, speed: 2, upkeep: { fuel: 2 } },
    strengths: ['Vielseitiger Allrounder', 'Bonus gegen Piratennester und Schmuggler'],
    weaknesses: ['Unterliegt schweren Belagerungsschiffen', 'Braucht regelmäßige Betankung'],
    lore: 'Jede Fregatte erhält eine eigene Glocke mit eingravierten Siegesdaten – Tradition seit der Ära der Luftkriege.',
  },
  {
    id: 'sky-harvester',
    name: 'Himmels-Ernter',
    category: 'support',
    tier: 2,
    summary: 'Flugmodule, die Biomasse aus Skyfarms automatisiert einsammeln.',
    description:
      'Unbemannte Sammlerplattformen, die die Ausbeute von Skyfarms erhöhen und gleichzeitig die Versorgungskette mit Lebensmittelkonzentraten stabilisieren.',
    tags: ['skyfarm', 'unterstützung', 'logistik'],
    cost: { food: 90, influence: 25 },
    requires: ['aether-lab'],
    stats: { hp: 900, speed: 3, upkeep: { food: 1 } },
    strengths: ['Steigert Nahrungsertrag angrenzender Felder', 'Gewährt temporäre Buffs für Kolonien'],
    weaknesses: ['Wehrlos gegen Beschuss', 'Benötigt ausgewiesene Flugkorridore'],
    lore: 'Die ernter Drohnen folgen einer polyphonen Pfeifsprache – erfunden von Cloud-Pionierin Elara.',
  },
  {
    id: 'resonance-tor',
    name: 'Resonanztor',
    category: 'structure',
    tier: 3,
    summary: 'Erzeugt Portale zwischen Sektoren und eröffnet strategische Optionen.',
    description:
      'Massive Toranlage, die Ätherfrequenzen bricht und stabile Sprungpunkte erzeugt. Verringert Reisezeiten drastisch und ermöglicht Hinterhalte über große Distanz.',
    tags: ['portal', 'logistik', 'spätspiel'],
    cost: { aether: 320, luxury: 90, influence: 80 },
    requires: ['steam-frigate', 'sky-harvester'],
    stats: { hp: 4100, defense: 80, upkeep: { aether: 4, luxury: 1 } },
    strengths: ['Teleportiert Flotten in benachbarte Cluster', 'Gewährt globale Sicht auf Ätherströme'],
    weaknesses: ['Extrem energiehungrig', 'Sabotageanfällig ohne Schildgenerator'],
    lore: 'Legenden berichten, dass Resonanztore einst als Sternentore dienten – ihre Runen sind bis heute nicht entschlüsselt.',
  },
  {
    id: 'leviathan-dreadnought',
    name: 'Leviathan-Dreadnought',
    category: 'unit',
    tier: 3,
    summary: 'Schwerer Kriegskoloss mit enormer Feuer- und Schildkraft.',
    description:
      'Der Höhepunkt der Chronos-Schiffswerften. Leviathane tragen mehrere gestaffelte Kanonendecks, Schildprojektoren und Drohnenbuchten für Nahverteidigung.',
    tags: ['flotte', 'schwer', 'endgame'],
    cost: { ore: 420, fuel: 160, aether: 260 },
    requires: ['resonance-tor'],
    stats: { hp: 6200, attack: 340, defense: 210, speed: 1, upkeep: { fuel: 5 } },
    strengths: ['Überragende Feuerkraft', 'Kann Schildkuppeln projizieren', 'Furchteinflößende Präsenz'],
    weaknesses: ['Sehr langsam', 'Hohe Wartungskosten', 'Ausfall einzelner Systeme kann kritisch sein'],
    lore: 'Nur drei Leviathane wurden bisher gebaut. Ihre Rümpfe sind mit den Namen gefallener Helden graviert.',
  },
];
