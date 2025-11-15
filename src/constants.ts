
import { Building, BuildingConfig, MissionType, PlanetBiome, Research, ResourceType, Resources, ShipBlueprint } from './types';

/**
 * Starting resource amounts granted to every player at account creation.
 */
export const INITIAL_RESOURCES: Resources = {
  [ResourceType.Orichalkum]: 500,
  [ResourceType.Fokuskristalle]: 500,
  [ResourceType.Vitriol]: 100,
};

/**
 * Storage capacities for the initial colony warehouses.
 */
export const INITIAL_STORAGE: Resources = {
  [ResourceType.Orichalkum]: 10000,
  [ResourceType.Fokuskristalle]: 10000,
  [ResourceType.Vitriol]: 5000,
};

/**
 * Definitions of all constructible buildings with their economy parameters.
 */
export const BUILDINGS: Record<string, Building> = {
  /**
   * Die Orichalkum-Schmelze ersetzt die frühere Mine. Sie verarbeitet Erze zu Orichalkum, dem primären
   * Baumaterial für Gebäude und Schiffe.
   */
  orichalkumSchmelze: {
    id: 'orichalkumSchmelze',
    name: 'Orichalkum-Schmelze',
    description: 'Schmilzt Erze zu Orichalkum, dem primären Baumaterial für Gebäude und Schiffe.',
    image: '/assets/illustrations/buildings/orichalkum-schmelze.svg',
    baseCost: { [ResourceType.Orichalkum]: 60, [ResourceType.Fokuskristalle]: 15, [ResourceType.Vitriol]: 0 },
    costMultiplier: 1.5,
    baseProduction: { [ResourceType.Orichalkum]: 20, [ResourceType.Fokuskristalle]: 0, [ResourceType.Vitriol]: 0 },
    productionMultiplier: 1.12,
    baseEnergyConsumption: 10,
    energyConsumptionMultiplier: 1.1,
  },
  /**
   * Der Kristallkondensator ersetzt den Fokuskristall-Synthesizer. Er kondensiert Fokuskristalle für fortschrittliche
   * Elektronik und Forschung.
   */
  kristallKondensator: {
    id: 'kristallKondensator',
    name: 'Kristallkondensator',
    description: 'Kondensiert Fokuskristalle, die für fortschrittliche Elektronik und Forschung benötigt werden.',
    image: '/assets/illustrations/buildings/kristallkondensator.svg',
    baseCost: { [ResourceType.Orichalkum]: 48, [ResourceType.Fokuskristalle]: 24, [ResourceType.Vitriol]: 0 },
    costMultiplier: 1.6,
    baseProduction: { [ResourceType.Orichalkum]: 0, [ResourceType.Fokuskristalle]: 10, [ResourceType.Vitriol]: 0 },
    productionMultiplier: 1.13,
    baseEnergyConsumption: 12,
    energyConsumptionMultiplier: 1.1,
  },
  /**
   * Die Vitriol-Destille ersetzt den Vitriol-Harvester. Sie destilliert Vitriolgas, den Treibstoff für Flotten
   * und schwere Maschinen.
   */
  vitriolDestille: {
    id: 'vitriolDestille',
    name: 'Vitriol-Destille',
    description: 'Destilliert Vitriolgas, den Treibstoff für Flotten und schwere Maschinen.',
    image: '/assets/illustrations/buildings/vitriol-destille.svg',
    baseCost: { [ResourceType.Orichalkum]: 225, [ResourceType.Fokuskristalle]: 75, [ResourceType.Vitriol]: 0 },
    costMultiplier: 1.5,
    baseProduction: { [ResourceType.Orichalkum]: 0, [ResourceType.Fokuskristalle]: 0, [ResourceType.Vitriol]: 5 },
    productionMultiplier: 1.14,
    baseEnergyConsumption: 20,
    energyConsumptionMultiplier: 1.1,
  },
  /**
   * Das Dampfkraftwerk ersetzt den Kesseldruck-Regulator. Es erzeugt die notwendige Energie (Kesseldruck in bar)
   * für den Betrieb aller Anlagen auf dem Planeten.
   */
  dampfkraftwerk: {
    id: 'dampfkraftwerk',
    name: 'Dampfkraftwerk',
    description: 'Erzeugt den notwendigen Kesseldruck (Energie) in bar für den Betrieb aller Anlagen auf dem Planeten.',
    image: '/assets/illustrations/buildings/dampfkraftwerk.svg',
    baseCost: { [ResourceType.Orichalkum]: 75, [ResourceType.Fokuskristalle]: 30, [ResourceType.Vitriol]: 0 },
    costMultiplier: 1.7,
    // Energiegebäude produzieren keine Ressourcen; stattdessen liefern sie Energie über baseEnergySupply.
    baseProduction: { [ResourceType.Orichalkum]: 0, [ResourceType.Fokuskristalle]: 0, [ResourceType.Vitriol]: 0 },
    productionMultiplier: 1.1,
    baseEnergySupply: 30,
    energySupplyMultiplier: 1.12,
  },

  /**
   * Orichalkum-Speicher: Lagerhalle für Orichalkum. Erhöht nur die Orichalkum-Lagerkapazität.
   */
  orichalkumSpeicher: {
    id: 'orichalkumSpeicher',
    name: 'Orichalkum-Speicher',
    description: 'Speicherhalle für Orichalkum. Erhöht die Lagerkapazität für Orichalkum pro Stufe um 1000.',
    image: '/assets/illustrations/buildings/orichalkum-speicher.svg',
    baseCost: { [ResourceType.Orichalkum]: 100, [ResourceType.Fokuskristalle]: 50, [ResourceType.Vitriol]: 0 },
    costMultiplier: 1.8,
    baseProduction: { [ResourceType.Orichalkum]: 0, [ResourceType.Fokuskristalle]: 0, [ResourceType.Vitriol]: 0 },
    productionMultiplier: 1.0,
    baseEnergyConsumption: 5,
    energyConsumptionMultiplier: 1.05,
  },

  /**
   * Kristall-Tresor: Lagerhalle für Fokuskristalle. Erhöht nur die Fokuskristalle-Lagerkapazität.
   */
  kristallTresor: {
    id: 'kristallTresor',
    name: 'Kristall-Tresor',
    description: 'Gesicherte Lagerkammer für Fokuskristalle. Erhöht die Lagerkapazität für Fokuskristalle pro Stufe um 500.',
    image: '/assets/illustrations/buildings/kristall-tresor.svg',
    baseCost: { [ResourceType.Orichalkum]: 80, [ResourceType.Fokuskristalle]: 100, [ResourceType.Vitriol]: 0 },
    costMultiplier: 1.9,
    baseProduction: { [ResourceType.Orichalkum]: 0, [ResourceType.Fokuskristalle]: 0, [ResourceType.Vitriol]: 0 },
    productionMultiplier: 1.0,
    baseEnergyConsumption: 8,
    energyConsumptionMultiplier: 1.08,
  },

  /**
   * Vitriol-Tank: Lagerhalle für Vitriol. Erhöht nur die Vitriol-Lagerkapazität.
   */
  vitriolTank: {
    id: 'vitriolTank',
    name: 'Vitriol-Tank',
    description: 'Druckbehälter für Vitriolgas. Erhöht die Lagerkapazität für Vitriol pro Stufe um 300.',
    image: '/assets/illustrations/buildings/vitriol-tank.svg',
    baseCost: { [ResourceType.Orichalkum]: 120, [ResourceType.Fokuskristalle]: 60, [ResourceType.Vitriol]: 30 },
    costMultiplier: 2.0,
    baseProduction: { [ResourceType.Orichalkum]: 0, [ResourceType.Fokuskristalle]: 0, [ResourceType.Vitriol]: 0 },
    productionMultiplier: 1.0,
    baseEnergyConsumption: 12,
    energyConsumptionMultiplier: 1.1,
  },

  /**
   * Forschungslabor: Zentrale Forschungseinrichtung. Ermöglicht Forschungen und reduziert Forschungszeit.
   */
  forschungslabor: {
    id: 'forschungslabor',
    name: 'Forschungslabor',
    description: 'Zentrale für Grundlagen- und angewandte Forschung. Notwendig um zu forschen. Erhöht Niveau der Forschungsgeschwindigkeit pro Stufe um 5%.',
    image: '/assets/illustrations/buildings/forschungslabor.svg',
    baseCost: { [ResourceType.Orichalkum]: 150, [ResourceType.Fokuskristalle]: 200, [ResourceType.Vitriol]: 0 },
    costMultiplier: 2.2,
    baseProduction: { [ResourceType.Orichalkum]: 0, [ResourceType.Fokuskristalle]: 0, [ResourceType.Vitriol]: 0 },
    productionMultiplier: 1.0,
    baseEnergyConsumption: 20,
    energyConsumptionMultiplier: 1.15,
  },

  /**
   * Werft: Schiffsbauanstalt. Baut Schiffe und Verteidigungseinheiten. Leveln schaltet neue Schiffstypen frei (in Kombination mit Forschungsbaum).
   */
  werft: {
    id: 'werft',
    name: 'Werft',
    description: 'Schiffbau- und Montageanlage. Baut Kriegsschiffe und Verteidigungseinheiten. Höhere Stufen ermöglichen den Bau stärkerer Schiffe (kombiniert mit Forschung).',
    image: '/assets/illustrations/buildings/werft.svg',
    baseCost: { [ResourceType.Orichalkum]: 200, [ResourceType.Fokuskristalle]: 100, [ResourceType.Vitriol]: 50 },
    costMultiplier: 2.0,
    baseProduction: { [ResourceType.Orichalkum]: 0, [ResourceType.Fokuskristalle]: 0, [ResourceType.Vitriol]: 0 },
    productionMultiplier: 1.0,
    baseEnergyConsumption: 15,
    energyConsumptionMultiplier: 1.1,
  },
};

/**
 * Definitions of all research topics available in the MVP build.
 */
export const RESEARCH: Record<string, Research> = {
  aetherdynamik: {
    id: 'aetherdynamik',
    name: 'Ätherdynamik',
    description: 'Verbessert die Effizienz von Antrieben und steigert die Fluggeschwindigkeit aller Schiffe.',
    image: '/assets/illustrations/research/aetherdynamik.svg',
    baseCost: { [ResourceType.Orichalkum]: 200, [ResourceType.Fokuskristalle]: 400, [ResourceType.Vitriol]: 100 },
    costMultiplier: 2,
  },
  panzerungstechnik: {
    id: 'panzerungstechnik',
    name: 'Panzerungstechnik',
    description: 'Verstärkt die Hüllen von Schiffen und Verteidigungsanlagen.',
    image: '/assets/illustrations/research/panzerungstechnik.svg',
    baseCost: { [ResourceType.Orichalkum]: 800, [ResourceType.Fokuskristalle]: 200, [ResourceType.Vitriol]: 0 },
    costMultiplier: 2,
  },
  spionagetechnologie: {
    id: 'spionagetechnologie',
    name: 'Spionagetechnologie',
    description: 'Ermöglicht den Bau von Spionagesonden und verbessert die Informationsgewinnung.',
    image: '/assets/illustrations/research/spionagetechnologie.svg',
    baseCost: { [ResourceType.Orichalkum]: 200, [ResourceType.Fokuskristalle]: 1000, [ResourceType.Vitriol]: 200 },
    costMultiplier: 2,
  },

  // Zusätzliche Forschungstechologien für die Steampunk-Welt
  kesseldruckOptimierung: {
    id: 'kesseldruckOptimierung',
    name: 'Kesseldruck-Optimierung',
    description: 'Steigert die Effizienz der Energieerzeugung und verringert den Energieverbrauch aller Gebäude.',
    image: '/assets/illustrations/research/kesseldruck-optimierung.svg',
    baseCost: { [ResourceType.Orichalkum]: 200, [ResourceType.Fokuskristalle]: 200, [ResourceType.Vitriol]: 50 },
    costMultiplier: 2,
  },
  lichtbogenIngenieurwesen: {
    id: 'lichtbogenIngenieurwesen',
    name: 'Lichtbogen-Ingenieurwesen',
    description: 'Ermöglicht fortschrittliche Lichtbogenwaffen und Energieübertragung.',
    image: '/assets/illustrations/research/lichtbogen-ingenieurwesen.svg',
    baseCost: { [ResourceType.Orichalkum]: 400, [ResourceType.Fokuskristalle]: 200, [ResourceType.Vitriol]: 100 },
    costMultiplier: 2,
  },
  teslaSpulenForschung: {
    id: 'teslaSpulenForschung',
    name: 'Tesla-Spulen-Forschung',
    description: 'Erforscht Hochspannungs-Tesla-Spulen zur Verteidigung.',
    image: '/assets/illustrations/research/tesla-spulen-forschung.svg',
    baseCost: { [ResourceType.Orichalkum]: 800, [ResourceType.Fokuskristalle]: 600, [ResourceType.Vitriol]: 200 },
    costMultiplier: 2.5,
  },
  aetherraumTheorie: {
    id: 'aetherraumTheorie',
    name: 'Ätherraum-Theorie',
    description: 'Legt die Grundlagen für Reisen durch den Äther und interstellare Navigation.',
    image: '/assets/illustrations/research/aetherraum-theorie.svg',
    baseCost: { [ResourceType.Orichalkum]: 1200, [ResourceType.Fokuskristalle]: 1200, [ResourceType.Vitriol]: 500 },
    costMultiplier: 2.5,
  },
  observatoriumsnetz: {
    id: 'observatoriumsnetz',
    name: 'Observatoriumsnetz',
    description: 'Verbessert die Spionage- und Scanreichweite durch ein Netz von Observatorien.',
    image: '/assets/illustrations/research/observatoriumsnetz.svg',
    baseCost: { [ResourceType.Orichalkum]: 500, [ResourceType.Fokuskristalle]: 1000, [ResourceType.Vitriol]: 200 },
    costMultiplier: 2,
  },
  differenzmaschinenKalkuel: {
    id: 'differenzmaschinenKalkuel',
    name: 'Differenzmaschinen-Kalkül',
    description: 'Erhöht die Rechenleistung durch mechanische Differentialmaschinen für komplexe Berechnungen.',
    image: '/assets/illustrations/research/differenzmaschinen-kalkuel.svg',
    baseCost: { [ResourceType.Orichalkum]: 150, [ResourceType.Fokuskristalle]: 300, [ResourceType.Vitriol]: 50 },
    costMultiplier: 2,
  },
  pulverProjektilkunde: {
    id: 'pulverProjektilkunde',
    name: 'Pulver- & Projektilkunde',
    description: 'Verbessert die ballistischen Waffen und deren Munition.',
    image: '/assets/illustrations/research/pulver-projektilkunde.svg',
    baseCost: { [ResourceType.Orichalkum]: 300, [ResourceType.Fokuskristalle]: 100, [ResourceType.Vitriol]: 200 },
    costMultiplier: 2,
  },
  magnetfeldBarrieren: {
    id: 'magnetfeldBarrieren',
    name: 'Magnetfeldbarrieren',
    description: 'Stärkt Schilde durch magnetische Barrieren und Feldgeneratoren.',
    image: '/assets/illustrations/research/magnetfeldbarrieren.svg',
    baseCost: { [ResourceType.Orichalkum]: 500, [ResourceType.Fokuskristalle]: 250, [ResourceType.Vitriol]: 250 },
    costMultiplier: 2.2,
  },
  rumpfverstaerkungsLegierungen: {
    id: 'rumpfverstaerkungsLegierungen',
    name: 'Rumpfverstärkungslegierungen',
    description: 'Entwickelt widerstandsfähigere Legierungen für Schiffsrümpfe.',
    image: '/assets/illustrations/research/rumpfverstaerkungslegierungen.svg',
    baseCost: { [ResourceType.Orichalkum]: 400, [ResourceType.Fokuskristalle]: 200, [ResourceType.Vitriol]: 50 },
    costMultiplier: 2,
  },
  kolbenAntrieb: {
    id: 'kolbenAntrieb',
    name: 'Kolbenantrieb',
    description: 'Verbrennungstriebwerk; erhöht die Reisefähigkeit einfacher Schiffe.',
    image: '/assets/illustrations/research/kolbenantrieb.svg',
    baseCost: { [ResourceType.Orichalkum]: 300, [ResourceType.Fokuskristalle]: 300, [ResourceType.Vitriol]: 50 },
    costMultiplier: 2,
  },
  dampfjet: {
    id: 'dampfjet',
    name: 'Dampfjet',
    description: 'Impulstriebwerk; steigert die Geschwindigkeit mittels Dampfantrieb.',
    image: '/assets/illustrations/research/dampfjet.svg',
    baseCost: { [ResourceType.Orichalkum]: 500, [ResourceType.Fokuskristalle]: 500, [ResourceType.Vitriol]: 100 },
    costMultiplier: 2,
  },
  aethermotor: {
    id: 'aethermotor',
    name: 'Äthermotor',
    description: 'Hyperantrieb basierend auf Ätherenergie.',
    image: '/assets/illustrations/research/aethermotor.svg',
    baseCost: { [ResourceType.Orichalkum]: 1600, [ResourceType.Fokuskristalle]: 800, [ResourceType.Vitriol]: 300 },
    costMultiplier: 2.5,
  },
  aetherplasmaEntladungen: {
    id: 'aetherplasmaEntladungen',
    name: 'Ätherplasma-Entladungen',
    description: 'Plasmatechnologie; erforscht energiegeladene Ätherplasma-Geschosse.',
    image: '/assets/illustrations/research/aetherplasma-entladungen.svg',
    baseCost: { [ResourceType.Orichalkum]: 2000, [ResourceType.Fokuskristalle]: 2000, [ResourceType.Vitriol]: 600 },
    costMultiplier: 3,
  },
  aethernetzVerbund: {
    id: 'aethernetzVerbund',
    name: 'Äthernetz-Verbund',
    description: 'Intergalaktisches Forschungsnetzwerk; ermöglicht den Wissensaustausch zwischen Kolonien.',
    image: '/assets/illustrations/research/aethernetz-verbund.svg',
    baseCost: { [ResourceType.Orichalkum]: 4000, [ResourceType.Fokuskristalle]: 3000, [ResourceType.Vitriol]: 1500 },
    costMultiplier: 2.8,
  },
  himmelsmechanik: {
    id: 'himmelsmechanik',
    name: 'Himmelsmechanik',
    description: 'Astrophysik; verbessert die Kapazität, Planeten zu kolonisieren und zu berechnen.',
    image: '/assets/illustrations/research/himmelsmechanik.svg',
    baseCost: { [ResourceType.Orichalkum]: 2500, [ResourceType.Fokuskristalle]: 1500, [ResourceType.Vitriol]: 500 },
    costMultiplier: 2.2,
  },
  aethergravimetrie: {
    id: 'aethergravimetrie',
    name: 'Äthergravimetrie',
    description: 'Erforscht Gravitation im Äther; Grundlage für Gravitonforschung.',
    image: '/assets/illustrations/research/aethergravimetrie.svg',
    baseCost: { [ResourceType.Orichalkum]: 10000, [ResourceType.Fokuskristalle]: 2000, [ResourceType.Vitriol]: 5000 },
    costMultiplier: 2.5,
  },
};

/**
 * Duration of a simulation tick in milliseconds.
 */
export const TICK_INTERVAL = 1000; // 1 second

/**
 * Global server speed modifier applied to production and build times.
 */
export const SERVER_SPEED = 1;

/**
 * Default starting levels for all buildings on a new colony.
 */
export const INITIAL_BUILDING_LEVELS: Record<string, number> = {
  orichalkumSchmelze: 1,
  kristallKondensator: 1,
  vitriolDestille: 0,
  dampfkraftwerk: 1,
};

/**
 * Default starting levels for all unlocked research topics.
 */
export const INITIAL_RESEARCH_LEVELS: Record<string, number> = {};

/**
 * Maximum number of entries allowed in the build queue simultaneously.
 */
export const MAX_BUILD_QUEUE_LENGTH = 3;

/**
 * Configuration for each settlement building type (immutable reference data).
 * Defines size per level, max level, and production type.
 */
export const SETTLEMENT_BUILDING_CONFIGS: Record<string, BuildingConfig> = {
  // Production buildings
  orichalkumSchmelze: {
    buildingType: 'orichalkumSchmelze',
    displayName: 'Orichalkum-Schmelze',
    description: 'Schmilzt Erze zu Orichalkum',
    sizePerLevel: 1,
    maxLevel: 25,
    productionType: 'orichalkum',
  },
  kristallKondensator: {
    buildingType: 'kristallKondensator',
    displayName: 'Kristallkondensator',
    description: 'Kondensiert Fokuskristalle',
    sizePerLevel: 1,
    maxLevel: 25,
    productionType: 'fokuskristalle',
  },
  vitriolDestille: {
    buildingType: 'vitriolDestille',
    displayName: 'Vitriol-Destille',
    description: 'Destilliert Vitriolgas',
    sizePerLevel: 1,
    maxLevel: 25,
    productionType: 'vitriol',
  },
  dampfkraftwerk: {
    buildingType: 'dampfkraftwerk',
    displayName: 'Dampfkraftwerk',
    description: 'Erzeugt Energie (bar)',
    sizePerLevel: 2,
    maxLevel: 30,
    productionType: 'energy',
  },

  // Storage buildings
  orichalkumSpeicher: {
    buildingType: 'orichalkumSpeicher',
    displayName: 'Orichalkum-Speicher',
    description: 'Speichert Orichalkum (+1000 pro Level)',
    sizePerLevel: 1,
    maxLevel: 15,
    productionType: null,
  },
  kristallTresor: {
    buildingType: 'kristallTresor',
    displayName: 'Kristall-Tresor',
    description: 'Speichert Fokuskristalle (+500 pro Level)',
    sizePerLevel: 1,
    maxLevel: 15,
    productionType: null,
  },
  vitriolTank: {
    buildingType: 'vitriolTank',
    displayName: 'Vitriol-Tank',
    description: 'Speichert Vitriol (+300 pro Level)',
    sizePerLevel: 1,
    maxLevel: 15,
    productionType: null,
  },

  // Key buildings
  forschungslabor: {
    buildingType: 'forschungslabor',
    displayName: 'Forschungslabor',
    description: 'Ermöglicht Forschung (-5% Zeit pro Level)',
    sizePerLevel: 2,
    maxLevel: 20,
    productionType: null,
  },
  werft: {
    buildingType: 'werft',
    displayName: 'Werft',
    description: 'Baut Schiffe und Verteidigungseinheiten',
    sizePerLevel: 3,
    maxLevel: 20,
    productionType: null,
  },
};

/**
 * Default settlement building capacity by settlement level.
 */
export const SETTLEMENT_CAPACITY_BY_LEVEL: Record<number, number> = {
  1: 20,
  2: 30,
  3: 45,
  4: 60,
  5: 80,
  6: 100,
  7: 120,
  8: 140,
  9: 150,
  10: 150, // Max out at level 10
};

/**
 * Visual theme tokens for alle Planetenbiome inklusive Label und Farbcodes für die Hex-Map.
 */
export const BIOME_STYLES: Record<PlanetBiome, { label: string; fill: string; stroke: string }> = {
  [PlanetBiome.Messingwueste]: {
    label: 'Messingwüste',
    fill: '#b8860b',
    stroke: '#f0d68a',
  },
  [PlanetBiome.Aethermoor]: {
    label: 'Äthermoor',
    fill: '#3a7f8c',
    stroke: '#8be0f2',
  },
  [PlanetBiome.Dampfarchipel]: {
    label: 'Dampfarchipel',
    fill: '#6c4f3d',
    stroke: '#d4b08c',
  },
  [PlanetBiome.Uhrwerksteppe]: {
    label: 'Uhrwerksteppe',
    fill: '#44663b',
    stroke: '#a5e267',
  },
  [PlanetBiome.Glimmerkluft]: {
    label: 'Glimmerkluft',
    fill: '#593f7d',
    stroke: '#c6a4ff',
  },
};

/**
 * Startinventar der Werft, damit neue Kommandanten sofort einsatzbereite Schiffe besitzen.
 */
export const INITIAL_FLEET_COMPOSITION: Record<string, number> = {
  spaeherdrohne: 2,
  kohlenfrachter: 1,
};

/**
 * Maximale Anzahl an Hangar-Slots für neue Accounts.
 */
export const INITIAL_HANGAR_CAPACITY = 20;

/**
 * Obergrenze gleichzeitiger Bauaufträge in der Werft.
 */
export const MAX_SHIPYARD_QUEUE = 4;

/**
 * Blueprint-Definitionen für Schiffe der Werftansicht.
 */
export const SHIP_BLUEPRINTS: ShipBlueprint[] = [
  {
    id: 'kolonistenschiff',
    name: 'Kolonistenschiff',
    description: 'Spezialschiff zum Gründen neuer Siedlungen mit Pionier-Crew.',
    image: '/assets/illustrations/ships/kolonistenschiff.svg',
    role: 'Kolonisation',
    hangarSlots: 2,
    baseCost: {
      [ResourceType.Orichalkum]: 500,
      [ResourceType.Fokuskristalle]: 250,
      [ResourceType.Vitriol]: 150,
    },
    buildTimeSeconds: 1200,
    crew: 15,
    cargo: 500,
  },
  {
    id: 'spaeherdrohne',
    name: 'Späherdrohne',
    description: 'Leichte Aufklärungseinheit mit minimalem Crewbedarf.',
    image: '/assets/illustrations/ships/spaeherdrohne.svg',
    role: 'Aufklärung',
    hangarSlots: 1,
    baseCost: {
      [ResourceType.Orichalkum]: 300,
      [ResourceType.Fokuskristalle]: 120,
      [ResourceType.Vitriol]: 80,
    },
    buildTimeSeconds: 900,
    crew: 2,
    cargo: 50,
  },
  {
    id: 'kohlenfrachter',
    name: 'Kohlenfrachter',
    description: 'Massiver Transporter für Langstreckenmissionen.',
    image: '/assets/illustrations/ships/kohlenfrachter.svg',
    role: 'Transport',
    hangarSlots: 3,
    baseCost: {
      [ResourceType.Orichalkum]: 1200,
      [ResourceType.Fokuskristalle]: 300,
      [ResourceType.Vitriol]: 600,
    },
    buildTimeSeconds: 3200,
    crew: 30,
    cargo: 4500,
  },
  {
    id: 'sturmfregatte',
    name: 'Sturmfregatte',
    description: 'Bewaffnete Kampffregatte mit ausgewogenem Verbrauch.',
    image: '/assets/illustrations/ships/sturmfregatte.svg',
    role: 'Angriff',
    hangarSlots: 4,
    baseCost: {
      [ResourceType.Orichalkum]: 2200,
      [ResourceType.Fokuskristalle]: 800,
      [ResourceType.Vitriol]: 900,
    },
    buildTimeSeconds: 5400,
    crew: 85,
    cargo: 800,
  },
  {
    id: 'aetherträger',
    name: 'Ätherträger',
    description: 'Unterstützungsschiff mit Reparaturdrohnen und großer Crew.',
    image: '/assets/illustrations/ships/aethertraeger.svg',
    role: 'Unterstützung',
    hangarSlots: 5,
    baseCost: {
      [ResourceType.Orichalkum]: 3400,
      [ResourceType.Fokuskristalle]: 1400,
      [ResourceType.Vitriol]: 1200,
    },
    buildTimeSeconds: 7600,
    crew: 160,
    cargo: 1200,
  },
];

/**
 * Preparation window applied before any fleet leaves the hangar, measured in milliseconds.
 */
export const MISSION_PREPARATION_TIME = 5 * 60 * 1000;

/**
 * Lower bound for the travel portion of a mission to avoid near-instant completions.
 */
export const MISSION_MIN_TRAVEL_TIME = 8 * 60 * 1000;

/**
 * Base travel time per traversed hex for each mission type.
 */
export const MISSION_TRAVEL_TIME_PER_HEX: Record<MissionType, number> = {
  [MissionType.Angriff]: 4 * 60 * 1000,
  [MissionType.Transport]: 3 * 60 * 1000,
  [MissionType.Spionage]: 2 * 60 * 1000,
  [MissionType.Stationierung]: 150 * 1000,
  [MissionType.Kolonisierung]: 5 * 60 * 1000,
};
