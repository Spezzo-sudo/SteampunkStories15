import React, { useCallback } from 'react';
import { useGameStore } from '@/store/gameStore';
import { BUILDINGS } from '@/constants';
import GameCard, { RequirementInfo } from '@/components/ui/GameCard';
import { Building } from '@/types';
import { canBuildOrUpgrade } from '@/lib/requirements';

/**
 * Builds requirement list for a building from its definition.
 */
const buildRequirementsList = (
  building: Building,
  currentResearch: Record<string, number>,
  currentBuildings: Record<string, number>
): RequirementInfo[] => {
  if (!building.requires || building.requires.length === 0) {
    return [];
  }

  return building.requires.map((req) => {
    if (req.type === 'research') {
      const researchName = (BUILDINGS as any)[req.id]?.name || req.id; // Note: req.id is research
      const researchDef = Object.values(BUILDINGS).find((b) => (b as any).id === req.id);
      const requiredLevel = req.level || 1;
      const currentLevel = currentResearch[req.id] || 0;

      return {
        name: researchName,
        required: `Stufe ${requiredLevel}`,
        met: currentLevel >= requiredLevel,
      };
    } else if (req.type === 'building') {
      const buildingName = BUILDINGS[req.id as keyof typeof BUILDINGS]?.name || req.id;
      const requiredLevel = req.level || 1;
      const currentLevel = currentBuildings[req.id] || 0;

      return {
        name: buildingName,
        required: `Level ${requiredLevel}`,
        met: currentLevel >= requiredLevel,
      };
    } else {
      // Energy requirement
      return {
        name: 'Energiekapazität',
        required: 'Verfügbar',
        met: true,
        blocked: false,
      };
    }
  });
};

/**
 * Übersicht aller ausbaubaren Gebäude inklusive Upgrade-Kosten und Bauzeit.
 */
const BuildingsView: React.FC = () => {
  const buildings = useGameStore((state) => state.buildings);
  const research = useGameStore((state) => state.research);
  const kesseldruck = useGameStore((state) => state.kesseldruck);
  const buildQueue = useGameStore((state) => state.buildQueue);
  const canAfford = useGameStore((state) => state.canAfford);
  const getUpgradeCost = useGameStore((state) => state.getUpgradeCost);
  const getBuildTime = useGameStore((state) => state.getBuildTime);
  const startUpgrade = useGameStore((state) => state.startUpgrade);

  const handleUpgrade = useCallback(
    (building: Building) => {
      startUpgrade(building);
    },
    [startUpgrade],
  );

  return (
    <section className="space-y-8 pb-16">
      <header className="space-y-2">
        <h2 className="text-[clamp(1.8rem,1.2vw+1.5rem,2.4rem)] font-cinzel text-yellow-300">Gebäudeausbau</h2>
        <p className="text-sm text-gray-300">Organisiere deine Industriekapazitäten in einem responsiven Grid.</p>
      </header>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {Object.values(BUILDINGS).map((building) => {
          const currentLevel = buildings[building.id] || 0;
          const targetLevel = buildQueue
            .filter((item) => item.entityId === building.id)
            .reduce((max, item) => Math.max(max, item.level), currentLevel);

          const nextLevel = targetLevel + 1;
          const costForNextUpgrade = getUpgradeCost(building, nextLevel);
          const buildTime = getBuildTime(costForNextUpgrade);
          const isUpgrading = buildQueue.some((item) => item.entityId === building.id);
          const affordable = canAfford(costForNextUpgrade);

          // UPDATED: Validate with canBuildOrUpgrade
          const validation = canBuildOrUpgrade(
            building.id,
            nextLevel,
            research,
            buildings,
            kesseldruck
          );
          const requirementsList = buildRequirementsList(building, research, buildings);

          return (
            <GameCard
              key={building.id}
              name={building.name}
              level={currentLevel}
              targetLevel={targetLevel}
              description={building.description}
              image={building.image}
              imageAlt={`${building.name} Illustration`}
              upgradeCost={costForNextUpgrade}
              buildTime={buildTime}
              canAfford={affordable}
              canUpgrade={validation.canDo}
              requirements={requirementsList}
              onUpgrade={() => handleUpgrade(building)}
              isUpgrading={isUpgrading}
              queueLength={buildQueue.length}
            />
          );
        })}
      </div>
    </section>
  );
};

export default BuildingsView;
