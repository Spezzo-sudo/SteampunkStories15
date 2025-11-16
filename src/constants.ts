
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
    flavorText: 'Massive Schmelzöfen brüten Tag und Nacht und verwandeln Roherz in kostbares Orichalkum. Die gewaltigen Flammen lodern unter Dampfdruck, während schwere Maschinen das glühende Metall zu Barren gießen. Das Fundament jedes Imperiums beginnt hier.',
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
    flavorText: 'Kristalline Strukturen funkeln in diesem Kondensator, während hochfrequente Energiewellen durch spiralförmige Kupferspulen tanzen. Die Rohkristalle werden in kosmischer Resonanz veredelt und zu wertvollen Fokuskristallen transformiert.',
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
    flavorText: 'Faszinierende destillierbare Gase wirbeln durch gläserne Röhren und kupferne Destillierkesseln. Der giftige Dampf wird unter Druck und Hitze in reines, hochexplosives Vitriol umgewandelt - der Treibstoff der Raumfahrt und Kriegsmaschinerie.',
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
    flavorText: 'Gigantische Dampfkessel schnauben rhythmisch, während ölgetränkte Kolben in endlosen Zyklen pumpen. Der Druck baut sich auf - messbar in Bar - und wird durch ein Netzwerk aus Ventilen, Rohren und Regulatoren zu allen Fabrieken und Maschinen des Planeten geleitet. Das Herz der Produktion.',
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
    flavorText: 'Massive Lagerhallen aus verstärktem Orichalkum lagern die wertvollen Metallbarren. Jede Schicht ist sorgfältig gestapelt, bewacht von automatischen Kontrollapparaten. Der Reichtum des Imperiums ruht hier in Sicherheit.',
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
    flavorText: 'Ein Tresor aus mehrlagigem Metall und verstärktem Kristallglas schützt die funkelnden Fokuskristalle vor Diebstahl. Ionische Sensoren überwachen jeden Kristall, während mystische Energiefelder das Eindringen Unbefugter verhindern.',
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
    flavorText: 'Kugelige Druckbehälter aus gehärtetem Stahl atmen rhythmisch mit dem pulsierenden Vitriolgas. Ventile pfeifen, Druckmesser zittern in roten Warngrenzen. Ein falscher Ruck könnte das ganze Komplex in die Luft sprengen.',
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
    flavorText: 'Hier finden die brillantesten Köpfe des Reiches zusammen, rund um große Unterschungstische vollgestellt mit Instrumenten und mechanischen Rechenmaschinen. Blitze tanzen zwischen den Spulen der Forschungsapparate - das Schöpfen von Neuem erfordert Wahnsinn.',
    image: '/assets/illustrations/buildings/forschungslabor.svg',
    baseCost: { [ResourceType.Orichalkum]: 150, [ResourceType.Fokuskristalle]: 200, [ResourceType.Vitriol]: 0 },
    costMultiplier: 2.2,
    baseProduction: { [ResourceType.Orichalkum]: 0, [ResourceType.Fokuskristalle]: 0, [ResourceType.Vitriol]: 0 },
    productionMultiplier: 1.0,
    baseEnergyConsumption: 20,
    energyConsumptionMultiplier: 1.15,
    maxLevel: 20,
    requires: [
      { type: 'building', id: 'dampfkraftwerk', level: 1 }
    ],
  },

  /**
   * Werft: Schiffsbauanstalt. Baut Schiffe und Verteidigungseinheiten. Leveln schaltet neue Schiffstypen frei (in Kombination mit Forschungsbaum).
   */
  werft: {
    id: 'werft',
    name: 'Werft',
    description: 'Schiffbau- und Montageanlage. Baut Kriegsschiffe und Verteidigungseinheiten. Höhere Stufen ermöglichen den Bau stärkerer Schiffe (kombiniert mit Forschung).',
    flavorText: 'Eine monumentale Schiffsbauwerft mit gewaltigen Docks und hängenden Baukränen. Hier entstehen die Flotten des Reiches - jedes Schiff ein Meisterwerk von Ingenieurkunst und Stahl. Schweißflammen zischen, Nieter donnern, und der Dampf steigt zu den Sternen.',
    image: '/assets/illustrations/buildings/werft.svg',
    baseCost: { [ResourceType.Orichalkum]: 200, [ResourceType.Fokuskristalle]: 100, [ResourceType.Vitriol]: 50 },
    costMultiplier: 2.0,
    baseProduction: { [ResourceType.Orichalkum]: 0, [ResourceType.Fokuskristalle]: 0, [ResourceType.Vitriol]: 0 },
    productionMultiplier: 1.0,
    baseEnergyConsumption: 15,
    energyConsumptionMultiplier: 1.1,
    maxLevel: 20,
    requires: [
      { type: 'research', id: 'kolbenAntrieb', level: 1 },
      { type: 'building', id: 'dampfkraftwerk', level: 2 }
    ],
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
    flavorText: 'Die Kunst, Schiffe durch die kosmischen Strömungen des Äthers zu lenken. Hochgradig theoretisch, aber mit praktischen Anwendungen - wer diese Technik beherrscht, wird schneller sein als der Feind.',
    image: '/assets/illustrations/research/aetherdynamik.svg',
    baseCost: { [ResourceType.Orichalkum]: 200, [ResourceType.Fokuskristalle]: 400, [ResourceType.Vitriol]: 100 },
    costMultiplier: 2,
  },
  panzerungstechnik: {
    id: 'panzerungstechnik',
    name: 'Panzerungstechnik',
    description: 'Verstärkt die Hüllen von Schiffen und Verteidigungsanlagen.',
    flavorText: 'Schichten über Schichten von gehärtetem Stahl und Orichalkum-Legierungen. Eine Wissenschaft, die Schiffe zu unzerstörbaren Festungen macht - zumindest theoretisch.',
    image: '/assets/illustrations/research/panzerungstechnik.svg',
    baseCost: { [ResourceType.Orichalkum]: 800, [ResourceType.Fokuskristalle]: 200, [ResourceType.Vitriol]: 0 },
    costMultiplier: 2,
  },
  spionagetechnologie: {
    id: 'spionagetechnologie',
    name: 'Spionagetechnologie',
    description: 'Ermöglicht den Bau von Spionagesonden und verbessert die Informationsgewinnung.',
    flavorText: 'Kleine, raffinierte Maschinen, die in die feindlichen Reihen eindringen. Mit Periskop-Linsen und mechanischen Speichern zeichnen sie alles auf - Information ist Macht.',
    image: '/assets/illustrations/research/spionagetechnologie.svg',
    baseCost: { [ResourceType.Orichalkum]: 200, [ResourceType.Fokuskristalle]: 1000, [ResourceType.Vitriol]: 200 },
    costMultiplier: 2,
  },

  // Zusätzliche Forschungstechologien für die Steampunk-Welt
  kesseldruckOptimierung: {
    id: 'kesseldruckOptimierung',
    name: 'Kesseldruck-Optimierung',
    description: 'Steigert die Effizienz der Energieerzeugung und verringert den Energieverbrauch aller Gebäude. Mehrere Stufen für höhere Boni.',
    flavorText: 'Feinabstimmung von Ventilen, Regulatoren und Röhren - um eine Bar mehr Druck aus der gleichen Menge Brennstoff zu pressen. Die Ingenieure lieben diese Arbeit.',
    image: '/assets/illustrations/research/kesseldruck-optimierung.svg',
    baseCost: { [ResourceType.Orichalkum]: 200, [ResourceType.Fokuskristalle]: 200, [ResourceType.Vitriol]: 50 },
    costMultiplier: 2,
    maxLevel: 3,
    requires: [
      { type: 'building', id: 'dampfkraftwerk', level: 2 }
    ],
  },
  lichtbogenIngenieurwesen: {
    id: 'lichtbogenIngenieurwesen',
    name: 'Lichtbogen-Ingenieurwesen',
    description: 'Ermöglicht fortschrittliche Lichtbogenwaffen und Energieübertragung.',
    flavorText: 'Hochspannungsbögen, die in blendend hellem Licht sprühen. Die Kanonen, die mit dieser Technologie gebaut werden, könnten eine Festung in Sekunden durchschmelzen.',
    image: '/assets/illustrations/research/lichtbogen-ingenieurwesen.svg',
    baseCost: { [ResourceType.Orichalkum]: 400, [ResourceType.Fokuskristalle]: 200, [ResourceType.Vitriol]: 100 },
    costMultiplier: 2,
  },
  teslaSpulenForschung: {
    id: 'teslaSpulenForschung',
    name: 'Tesla-Spulen-Forschung',
    description: 'Erforscht Hochspannungs-Tesla-Spulen zur Verteidigung.',
    flavorText: 'Riesige Spulen, die Blitze durch die Luft schicken - eine Waffe, die nicht nur tötet, sondern auch das Gehirn des Feindes verwirrrt. Gefürchtet und respektiert gleichermaßen.',
    image: '/assets/illustrations/research/tesla-spulen-forschung.svg',
    baseCost: { [ResourceType.Orichalkum]: 800, [ResourceType.Fokuskristalle]: 600, [ResourceType.Vitriol]: 200 },
    costMultiplier: 2.5,
  },
  aetherraumTheorie: {
    id: 'aetherraumTheorie',
    name: 'Ätherraum-Theorie',
    description: 'Legt die Grundlagen für Reisen durch den Äther und interstellare Navigation.',
    flavorText: 'Abstrakte Mathematik, die den Raum selbst durchlöchert. Mit dieser Theorie können Schiffe durch das unmögliche Vakuum zwischen den Sternen navigieren.',
    image: '/assets/illustrations/research/aetherraum-theorie.svg',
    baseCost: { [ResourceType.Orichalkum]: 1200, [ResourceType.Fokuskristalle]: 1200, [ResourceType.Vitriol]: 500 },
    costMultiplier: 2.5,
  },
  observatoriumsnetz: {
    id: 'observatoriumsnetz',
    name: 'Observatoriumsnetz',
    description: 'Verbessert die Spionage- und Scanreichweite durch ein Netz von Observatorien.',
    flavorText: 'Teleskope auf allen Planeten kommunizieren miteinander und bilden ein Auge, das die halbe Galaxie sehen kann. Keine Flotte wird unentdeckt bleiben.',
    image: '/assets/illustrations/research/observatoriumsnetz.svg',
    baseCost: { [ResourceType.Orichalkum]: 500, [ResourceType.Fokuskristalle]: 1000, [ResourceType.Vitriol]: 200 },
    costMultiplier: 2,
  },
  differenzmaschinenKalkuel: {
    id: 'differenzmaschinenKalkuel',
    name: 'Differenzmaschinen-Kalkül',
    description: 'Erhöht die Rechenleistung durch mechanische Differentialmaschinen für komplexe Berechnungen.',
    flavorText: 'Zahnräder, die denken: Mechanische Computer, größer als Häuser, die Mathematik durch pure Mechanik lösen. Schneller als jeder menschliche Verstand.',
    image: '/assets/illustrations/research/differenzmaschinen-kalkuel.svg',
    baseCost: { [ResourceType.Orichalkum]: 150, [ResourceType.Fokuskristalle]: 300, [ResourceType.Vitriol]: 50 },
    costMultiplier: 2,
  },
  pulverProjektilkunde: {
    id: 'pulverProjektilkunde',
    name: 'Pulver- & Projektilkunde',
    description: 'Verbessert die ballistischen Waffen und deren Munition.',
    flavorText: 'Die Chemie der Explosion, perfektioniert. Kanonen, die Projektile mit tödlicher Präzision abfeuern - eine Lehre in Ballista und Feuer.',
    image: '/assets/illustrations/research/pulver-projektilkunde.svg',
    baseCost: { [ResourceType.Orichalkum]: 300, [ResourceType.Fokuskristalle]: 100, [ResourceType.Vitriol]: 200 },
    costMultiplier: 2,
  },
  magnetfeldBarrieren: {
    id: 'magnetfeldBarrieren',
    name: 'Magnetfeldbarrieren',
    description: 'Stärkt Schilde durch magnetische Barrieren und Feldgeneratoren.',
    flavorText: 'Unsichtbare Schilde aus reiner magnetischer Kraft umhüllen die Schiffe. Projektile werden abgelenkt, bevor sie auch nur die Rümpfe berühren.',
    image: '/assets/illustrations/research/magnetfeldbarrieren.svg',
    baseCost: { [ResourceType.Orichalkum]: 500, [ResourceType.Fokuskristalle]: 250, [ResourceType.Vitriol]: 250 },
    costMultiplier: 2.2,
  },
  rumpfverstaerkungsLegierungen: {
    id: 'rumpfverstaerkungsLegierungen',
    name: 'Rumpfverstärkungslegierungen',
    description: 'Entwickelt widerstandsfähigere Legierungen für Schiffsrümpfe.',
    flavorText: 'Metalle, die mit kosmischem Dampf gehärtet werden, werden zu unzerbrechlichen Legierungen. Schiffe aus diesem Material trotzen Projektilen, die andere Schiffe durchbohren würden.',
    image: '/assets/illustrations/research/rumpfverstaerkungslegierungen.svg',
    baseCost: { [ResourceType.Orichalkum]: 400, [ResourceType.Fokuskristalle]: 200, [ResourceType.Vitriol]: 50 },
    costMultiplier: 2,
  },
  kolbenAntrieb: {
    id: 'kolbenAntrieb',
    name: 'Kolbenantrieb',
    description: 'Verbrennungstriebwerk; erhöht die Reisefähigkeit einfacher Schiffe.',
    flavorText: 'Der einfachste aller Antriebe: Verbrenne Vitriol, nutze die Explosion, bewege das Schiff. Effizient, zuverlässig und laut wie ein Donnergewitter.',
    image: '/assets/illustrations/research/kolbenantrieb.svg',
    baseCost: { [ResourceType.Orichalkum]: 300, [ResourceType.Fokuskristalle]: 300, [ResourceType.Vitriol]: 50 },
    costMultiplier: 2,
  },
  dampfjet: {
    id: 'dampfjet',
    name: 'Dampfjet',
    description: 'Impulstriebwerk; steigert die Geschwindigkeit mittels Dampfantrieb.',
    flavorText: 'Der Dampf aus den Kraftwerken wird gezähmt und fokussiert - ein Antrieb von ungeahnter Kraft. Schneller, eleganter und gefährlicher als der reine Kolbenantrieb.',
    image: '/assets/illustrations/research/dampfjet.svg',
    baseCost: { [ResourceType.Orichalkum]: 500, [ResourceType.Fokuskristalle]: 500, [ResourceType.Vitriol]: 100 },
    costMultiplier: 2,
  },
  aethermotor: {
    id: 'aethermotor',
    name: 'Äthermotor',
    description: 'Hyperantrieb basierend auf Ätherenergie.',
    flavorText: 'Ein Antrieb, der die Energie des Äthers selbst anzapft - unbegrenzte Kraft aus dem kosmischen Strom. Mit diesem Antrieb können Schiffe überall hingehen, überall schnell ankommen.',
    image: '/assets/illustrations/research/aethermotor.svg',
    baseCost: { [ResourceType.Orichalkum]: 1600, [ResourceType.Fokuskristalle]: 800, [ResourceType.Vitriol]: 300 },
    costMultiplier: 2.5,
  },
  aetherplasmaEntladungen: {
    id: 'aetherplasmaEntladungen',
    name: 'Ätherplasma-Entladungen',
    description: 'Plasmatechnologie; erforscht energiegeladene Ätherplasma-Geschosse.',
    flavorText: 'Plasma, von der Sonne selbst gezähmt. Diese Waffe kann Planeten in ihre Komponenten zerlegen. Wer das hat, herrscht absolut.',
    image: '/assets/illustrations/research/aetherplasma-entladungen.svg',
    baseCost: { [ResourceType.Orichalkum]: 2000, [ResourceType.Fokuskristalle]: 2000, [ResourceType.Vitriol]: 600 },
    costMultiplier: 3,
  },
  aethernetzVerbund: {
    id: 'aethernetzVerbund',
    name: 'Äthernetz-Verbund',
    description: 'Intergalaktisches Forschungsnetzwerk; ermöglicht den Wissensaustausch zwischen Kolonien.',
    flavorText: 'Ein riesiges Kommunikationsnetzwerk, das alle Kolonien des Reiches verbindet. Wissen fließt wie Blut durch die Adern des Imperiums - wer dies beherrscht, beherrscht alles.',
    image: '/assets/illustrations/research/aethernetz-verbund.svg',
    baseCost: { [ResourceType.Orichalkum]: 4000, [ResourceType.Fokuskristalle]: 3000, [ResourceType.Vitriol]: 1500 },
    costMultiplier: 2.8,
  },
  himmelsmechanik: {
    id: 'himmelsmechanik',
    name: 'Himmelsmechanik',
    description: 'Astrophysik; verbessert die Kapazität, Planeten zu kolonisieren und zu berechnen.',
    flavorText: 'Die Bewegungen der Sterne verstehen - die Mathematik der Welten. Wer diese Kunst beherrscht, kann überall hin reisen und überall kolonisieren.',
    image: '/assets/illustrations/research/himmelsmechanik.svg',
    baseCost: { [ResourceType.Orichalkum]: 2500, [ResourceType.Fokuskristalle]: 1500, [ResourceType.Vitriol]: 500 },
    costMultiplier: 2.2,
  },
  aethergravimetrie: {
    id: 'aethergravimetrie',
    name: 'Äthergravimetrie',
    description: 'Erforscht Gravitation im Äther; Grundlage für Gravitonforschung.',
    flavorText: 'Die letzte Grenze der Physik - Gravitation selbst wird erforscht. Mit dieser Technologie kann man nicht nur Planeten verschieben, sondern ganze Systeme manipulieren. Die Ultimate Waffe.',
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
    flavorText: 'Vollbeladen mit Druckkesseln, Baumaterial und Rohstoffen macht sich dieses Spezialschiff auf die Reise zu fernen Welten. Angekommen am Zielort entfaltet es sich in typischer Steampunk-Manier selbst zur Siedlung - Rohre erblühen zu Fabrikschloten, Laderäume werden zu Wohnquartieren. Ein wahres Wunderwerk der Ingenieurstechnik!',
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
    flavorText: 'Klein, schnell und unglaublich wendig: Die Späherdrohne ist ein fliegendes Periskop mit Turbinen. Nur zwei erfahrene Piloten bedienen ihre komplexen Spion-Apparaturen. Sie sieht alles und berichtet alles - wenn sie nicht zuerst abgeschossen wird.',
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
    flavorText: 'Ein Koloss unter den Frachtschiffen: Der Kohlenfrachter ist ein riesiger Laderaum mit Triebwerk. Sein massiver Rumpf speichert 4500 Einheiten Waren, während drei Decks voller Besatzung den Monster-Transporter durch die Sterne treiben. Langsam aber unaufhaltsam.',
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
    flavorText: 'Ein Kriegsschiff von gefürchteter Eleganz: Die Sturmfregatte kombiniert Geschwindigkeit und Feuerkraft. Ihre Kanonen spucken Projektile aus, während Dampfjets sie durch feindliche Linien treiben. 85 trainierte Soldaten bedienen die tödliche Maschinerie.',
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
    requiredWerftLevel: 3,
    requiredResearch: [
      { id: 'pulverProjektilkunde' },
      { id: 'dampfjet' },
    ],
  },
  {
    id: 'aetherträger',
    name: 'Ätherträger',
    description: 'Unterstützungsschiff mit Reparaturdrohnen und großer Crew.',
    flavorText: 'Ein schwimmendes Arsenal der Unterstützung: Der Ätherträger ist eine mobile Werkstatt, Klinik und Kommandozentrale in einem. Mit 160 spezialisierten Technikern, Drohnen-Scharen und Reparatur-Robotern wird es zur Hoffnung verwundeter Flotten.',
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
    requiredWerftLevel: 5,
    requiredResearch: [
      { id: 'aethermotor' },
      { id: 'magnetfeldBarrieren' },
    ],
  },
];

/**
 * Map of ship blueprints by ID for O(1) lookup performance.
 */
export const SHIP_BLUEPRINTS_MAP = new Map(
  SHIP_BLUEPRINTS.map((ship) => [ship.id, ship])
);

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
