import React, { useCallback } from 'react';
import { useGameStore } from '@/store/gameStore';
import { RESEARCH, BUILDINGS } from '@/constants';
import CollapsibleCard from '@/components/ui/CollapsibleCard';
import { canResearch } from '@/lib/requirements';

const RESEARCH_CATEGORIES = {
  antrieb: [
    'aetherdynamik',
    'kolbenAntrieb',
    'dampfjet',
    'aethermotor',
  ],
  oekonomie: [
    'kesseldruckOptimierung',
    'differenzmaschinenKalkuel',
    'observatoriumsnetz',
  ],
  waffen: [
    'panzerungstechnik',
    'teslaSpulenForschung',
    'lichtbogenIngenieurwesen',
    'pulverProjektilkunde',
    'magnetfeldBarrieren',
    'aetherplasmaEntladungen',
  ],
  utility: [
    'spionagetechnologie',
    'rumpfverstaerkungsLegierungen',
  ],
} as const;

const CATEGORY_LABELS: Record<keyof typeof RESEARCH_CATEGORIES, string> = {
  antrieb: 'Antrieb',
  oekonomie: 'Ökonomie',
  waffen: 'Waffen',
  utility: 'Utility',
};

/**
 * Generates requirement text for CollapsibleCard requirements prop.
 * Combines tech-tree requirements into human-readable strings with status indicators.
 */
const buildResearchRequirementsText = (
  tech: typeof RESEARCH[keyof typeof RESEARCH],
  currentResearch: Record<string, number>,
  currentBuildings: Record<string, number>
): string[] => {
  const reqs: string[] = [];

  if (!tech.requires || tech.requires.length === 0) {
    return reqs;
  }

  tech.requires.forEach((req) => {
    if (req.type === 'research') {
      const researchName = RESEARCH[req.id as keyof typeof RESEARCH]?.name || req.id;
      const requiredLevel = req.level || 1;
      const currentLevel = currentResearch[req.id] || 0;
      const met = currentLevel >= requiredLevel;

      reqs.push(`${met ? '✓' : '✗'} ${researchName} Stufe ${requiredLevel}`);
    } else {
      const buildingName = BUILDINGS[req.id as keyof typeof BUILDINGS]?.name || req.id;
      const requiredLevel = req.level || 1;
      const currentLevel = currentBuildings[req.id] || 0;
      const met = currentLevel >= requiredLevel;

      reqs.push(`${met ? '✓' : '✗'} ${buildingName} Level ${requiredLevel}`);
    }
  });

  return reqs;
};

/**
 * Icon mapping für Forschung.
 */
const getResearchIcon = (researchId: string): string => {
  const iconMap: Record<string, string> = {
    aetherdynamik: '⚡',
    kolbenAntrieb: '🔧',
    dampfjet: '💨',
    aethermotor: '⚙️',
    kesseldruckOptimierung: '📈',
    differenzmaschinenKalkuel: '🧮',
    observatoriumsnetz: '🔭',
    panzerungstechnik: '🛡️',
    teslaSpulenForschung: '⚡',
    lichtbogenIngenieurwesen: '💡',
    pulverProjektilkunde: '🎯',
    magnetfeldBarrieren: '🧲',
    aetherplasmaEntladungen: '🌟',
    spionagetechnologie: '🕵️',
    rumpfverstaerkungsLegierungen: '🔨',
  };
  return iconMap[researchId] || '🔬';
};

const ALL_CATEGORY_KEY = 'alle';

type CategoryKey = keyof typeof RESEARCH_CATEGORIES | typeof ALL_CATEGORY_KEY;

/**
 * Übersicht über alle Forschungsprojekte mit Filtertabs für die Informationsarchitektur.
 */
const ResearchView: React.FC = () => {
  const research = useGameStore((state) => state.research);
  const buildings = useGameStore((state) => state.buildings);
  const buildQueue = useGameStore((state) => state.buildQueue);
  const canAfford = useGameStore((state) => state.canAfford);
  const getUpgradeCost = useGameStore((state) => state.getUpgradeCost);
  const getBuildTime = useGameStore((state) => state.getBuildTime);
  const startUpgrade = useGameStore((state) => state.startUpgrade);
  const [activeCategory, setActiveCategory] = React.useState<CategoryKey>(ALL_CATEGORY_KEY);

  const handleCategoryChange = (category: CategoryKey) => {
    setActiveCategory(category);
  };

  const handleUpgrade = useCallback(
    (tech: typeof RESEARCH[keyof typeof RESEARCH]) => {
      startUpgrade(tech);
    },
    [startUpgrade],
  );

  const categoryEntries = Object.entries(CATEGORY_LABELS) as ([
    keyof typeof RESEARCH_CATEGORIES,
    string,
  ])[];

  const filteredResearch = Object.values(RESEARCH).filter((tech) => {
    if (activeCategory === ALL_CATEGORY_KEY) {
      return true;
    }
    return RESEARCH_CATEGORIES[activeCategory]?.includes(tech.id);
  });

  return (
    <section className="space-y-8 pb-16">
      <header className="space-y-3">
        <h2 className="text-[clamp(1.8rem,1.2vw+1.5rem,2.4rem)] font-cinzel text-yellow-300">Forschungslabor</h2>
        <p className="text-sm text-gray-300">
          Filtere deine Projekte nach Themenbereichen und plane Upgrades mit klaren Anforderungen.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={() => handleCategoryChange(ALL_CATEGORY_KEY)}
            className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-colors ${
              activeCategory === ALL_CATEGORY_KEY
                ? 'bg-yellow-600/80 text-black'
                : 'bg-black/40 text-gray-200 hover:bg-yellow-800/40'
            }`}
          >
            Alle
          </button>
          {categoryEntries.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => handleCategoryChange(key)}
              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-colors ${
                activeCategory === key
                  ? 'bg-yellow-600/80 text-black'
                  : 'bg-black/40 text-gray-200 hover:bg-yellow-800/40'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {filteredResearch.map((tech) => {
          const currentLevel = research[tech.id] || 0;
          const targetLevel = buildQueue
            .filter((item) => item.entityId === tech.id)
            .reduce((max, item) => Math.max(max, item.level), currentLevel);

          const nextLevel = targetLevel + 1;
          const costForNextUpgrade = getUpgradeCost(tech, nextLevel);
          const buildTime = getBuildTime(costForNextUpgrade);
          const isUpgrading = buildQueue.some((item) => item.entityId === tech.id);
          const affordable = canAfford(costForNextUpgrade);

          // Validate requirements for tech
          const validation = canResearch(tech.id, research, buildings);
          const requirementsText = buildResearchRequirementsText(tech, research, buildings);

          return (
            <CollapsibleCard
              key={tech.id}
              id={tech.id}
              icon={getResearchIcon(tech.id)}
              title={tech.name}
              level={currentLevel}
              targetLevel={targetLevel}
              shortDescription={tech.description}
              fullDescription={`${tech.description}\n\nDiese Forschung ist ein essentieller Bestandteil deines wissenschaftlichen Fortschritts.`}
              cost={costForNextUpgrade}
              buildTime={buildTime}
              canAfford={affordable}
              onAction={() => handleUpgrade(tech)}
              actionLabel={isUpgrading ? 'Weiter forschen' : 'Forschen'}
              image={tech.image}
              imageAlt={`${tech.name} Forschungsgrafik`}
              isUpgrading={isUpgrading}
              queueLength={buildQueue.length}
              requirements={requirementsText.length > 0 ? requirementsText : undefined}
              disabled={!validation.canDo || buildQueue.length >= 10}
            />
          );
        })}
      </div>
    </section>
  );
};

export default ResearchView;
