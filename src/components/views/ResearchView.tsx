import React, { useCallback, useMemo } from 'react';
import { useGameStore } from '@/store/gameStore';
import { RESEARCH, BUILDINGS, MAX_BUILD_QUEUE_LENGTH } from '@/constants';
import GameObjectCard from '@/components/ui/GameObjectCard';
import { canResearch } from '@/lib/requirements';
import ProductionBoard from '@/components/views/common/ProductionBoard';
import { getResearchIcon } from '@/lib/ui/iconMap';

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

const ALL_CATEGORY_KEY = 'alle';

type CategoryKey = keyof typeof RESEARCH_CATEGORIES | typeof ALL_CATEGORY_KEY;

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

      reqs.push(`${met ? '✓' : '•'} ${researchName} Stufe ${requiredLevel}`);
    } else {
      const buildingName = BUILDINGS[req.id as keyof typeof BUILDINGS]?.name || req.id;
      const requiredLevel = req.level || 1;
      const currentLevel = currentBuildings[req.id] || 0;
      const met = currentLevel >= requiredLevel;

      reqs.push(`${met ? '✓' : '•'} ${buildingName} Level ${requiredLevel}`);
    }
  });

  return reqs;
};

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
    [startUpgrade]
  );

  const categoryEntries = Object.entries(CATEGORY_LABELS) as ([
    keyof typeof RESEARCH_CATEGORIES,
    string,
  ])[];

  const filteredResearch = useMemo(
    () =>
      Object.values(RESEARCH).filter((tech) => {
        if (activeCategory === ALL_CATEGORY_KEY) {
          return true;
        }
        return RESEARCH_CATEGORIES[activeCategory]?.includes(tech.id);
      }),
    [activeCategory]
  );

  const tabs = (
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
  );

  const researchQueuePanel = useMemo(() => {
    const researchQueue = buildQueue.filter((item) => RESEARCH[item.entityId as keyof typeof RESEARCH]);
    return (
      <div className="rounded-2xl border border-yellow-800/30 bg-black/50 p-6 shadow-xl">
        <h3 className="text-[clamp(1.1rem,1vw+0.9rem,1.5rem)] font-cinzel text-yellow-200">Forschungsstatus</h3>
        <p className="mt-2 text-sm text-gray-300">
          {researchQueue.length} / {MAX_BUILD_QUEUE_LENGTH} Slots belegt
        </p>
        <ul className="mt-4 space-y-2 text-sm text-gray-200">
          {researchQueue.length === 0 && <li>Keine aktiven Studien</li>}
          {researchQueue.slice(0, 3).map((entry) => {
            const tech = RESEARCH[entry.entityId as keyof typeof RESEARCH];
            return (
              <li
                key={`${entry.entityId}-${entry.level}`}
                className="flex items-center justify-between rounded-lg bg-black/40 px-3 py-2"
              >
                <span>{tech?.name ?? entry.entityId} → L{entry.level}</span>
                <span className="text-xs text-yellow-300">
                  {Math.ceil(Math.max(0, entry.endTime - Date.now()) / 60000)}m
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }, [buildQueue]);

  const helperPanel = (
    <div className="rounded-2xl border border-yellow-800/30 bg-black/45 p-6 shadow-xl">
      <h3 className="text-[clamp(1.1rem,1vw+0.9rem,1.5rem)] font-cinzel text-yellow-200">Leitfaden</h3>
      <ul className="mt-3 space-y-2 text-sm text-gray-300">
        <li>✓ Forschungs-, Gebäude- und Werftkarten nutzen identische Controls</li>
        <li>✓ Anforderungen kombinieren Forschung + Gebäude klar</li>
        <li>✓ Queue-Status zeigt denselben Fortschrittsaufbau wie andere Bereiche</li>
      </ul>
    </div>
  );

  return (
    <ProductionBoard
      title="Forschungslabor"
      description="Filtere deine Projekte nach Themenbereichen und plane Upgrades mit klaren Anforderungen."
      actions={tabs}
      sidebar={
        <>
          {researchQueuePanel}
          {helperPanel}
        </>
      }
    >
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5">
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

          const validation = canResearch(tech.id, research, buildings);
          const requirementsText = buildResearchRequirementsText(tech, research, buildings);

          return (
            <GameObjectCard
              key={tech.id}
              id={tech.id}
              icon={getResearchIcon(tech.id)}
              title={tech.name}
              level={currentLevel}
              targetLevel={targetLevel}
              flavorText={tech.flavorText || tech.description}
              fullDescription={`${tech.description}\n\n${tech.flavorText || ''}`}
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
              disabled={!validation.canDo || buildQueue.length >= MAX_BUILD_QUEUE_LENGTH}
            />
          );
        })}
      </div>
    </ProductionBoard>
  );
};

export default ResearchView;
