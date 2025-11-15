import React from 'react';
import { useGameStore } from '@/store/gameStore';
import { RESEARCH, BUILDINGS } from '@/constants';
import GameCard, { RequirementInfo } from '@/components/ui/GameCard';
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
 * Converts requirement definition to RequirementInfo for display.
 */
const buildRequirementsList = (
  tech: typeof RESEARCH[keyof typeof RESEARCH],
  currentResearch: Record<string, number>,
  currentBuildings: Record<string, number>
): RequirementInfo[] => {
  if (!tech.requires || tech.requires.length === 0) {
    return [];
  }

  return tech.requires.map((req) => {
    if (req.type === 'research') {
      const researchName = RESEARCH[req.id as keyof typeof RESEARCH]?.name || req.id;
      const requiredLevel = req.level || 1;
      const currentLevel = currentResearch[req.id] || 0;

      return {
        name: researchName,
        required: `Stufe ${requiredLevel}`,
        met: currentLevel >= requiredLevel,
      };
    } else {
      const buildingName = BUILDINGS[req.id as keyof typeof BUILDINGS]?.name || req.id;
      const requiredLevel = req.level || 1;
      const currentLevel = currentBuildings[req.id] || 0;

      return {
        name: buildingName,
        required: `Level ${requiredLevel}`,
        met: currentLevel >= requiredLevel,
      };
    }
  });
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

          // UPDATED: Use dynamic requirements from tech definition
          const validation = canResearch(tech.id, research, buildings);
          const requirementsList = buildRequirementsList(tech, research, buildings);

          return (
            <GameCard
              key={tech.id}
              name={tech.name}
              level={currentLevel}
              targetLevel={targetLevel}
              description={tech.description}
              image={tech.image}
              imageAlt={`${tech.name} Forschungsgrafik`}
              upgradeCost={costForNextUpgrade}
              buildTime={buildTime}
              canAfford={affordable}
              canUpgrade={validation.canDo}
              requirements={requirementsList}
              onUpgrade={() => startUpgrade(tech)}
              isUpgrading={isUpgrading}
              queueLength={buildQueue.length}
            />
          );
        })}
      </div>
    </section>
  );
};

export default ResearchView;
