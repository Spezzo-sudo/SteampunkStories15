import React, { useCallback } from 'react';
import { useGameStore } from '@/store/gameStore';
import { BUILDINGS, RESEARCH } from '@/constants';
import GameObjectCard from '@/components/ui/GameObjectCard';
import { Building } from '@/types';
import { canBuildOrUpgrade } from '@/lib/requirements';

/**
 * Generates requirement text for CollapsibleCard requirements prop.
 * Combines tech-tree and energy requirements into human-readable strings.
 */
const buildRequirementsText = (
  building: Building,
  currentResearch: Record<string, number>,
  currentBuildings: Record<string, number>,
  kesseldruck: { capacity: number; consumption: number }
): string[] => {
  const reqs: string[] = [];

  // 1. Tech-tree requirements
  if (building.requires && building.requires.length > 0) {
    building.requires.forEach((req) => {
      if (req.type === 'research') {
        const researchDef = RESEARCH[req.id as keyof typeof RESEARCH];
        const researchName = researchDef?.name || req.id;
        const requiredLevel = req.level || 1;
        const currentLevel = currentResearch[req.id] || 0;
        const met = currentLevel >= requiredLevel;

        reqs.push(`${met ? '✓' : '✗'} ${researchName} Stufe ${requiredLevel}`);
      } else if (req.type === 'building') {
        const buildingDef = BUILDINGS[req.id as keyof typeof BUILDINGS];
        const buildingName = buildingDef?.name || req.id;
        const requiredLevel = req.level || 1;
        const currentLevel = currentBuildings[req.id] || 0;
        const met = currentLevel >= requiredLevel;

        reqs.push(`${met ? '✓' : '✗'} ${buildingName} Level ${requiredLevel}`);
      }
    });
  }

  // 2. Energy requirement
  if (building.baseEnergyConsumption && building.baseEnergyConsumption > 0) {
    const wouldExceed =
      kesseldruck.consumption + building.baseEnergyConsumption > kesseldruck.capacity;
    const availableEnergy = kesseldruck.capacity - kesseldruck.consumption;
    const met = !wouldExceed;

    reqs.push(
      `${met ? '✓' : '✗'} Energiekapazität: ${building.baseEnergyConsumption} benötigt / ${availableEnergy} verfügbar`
    );
  }

  return reqs;
};

/**
 * Icon mapping für Gebäude.
 */
const getBuildingIcon = (buildingId: string): string => {
  const iconMap: Record<string, string> = {
    orichalkumSchmelze: '⚙️',
    kristallKondensator: '💠',
    vitrolDestille: '⚗️',
    dampfkraftwerk: '🔥',
    energiespeicher: '🔋',
    lagerhaus: '📦',
    forschungslabor: '🧪',
    werft: '⚓',
    rathaus: '🏛️',
    marktplatz: '🏪',
  };
  return iconMap[buildingId] || '🏗️';
};

/**
 * Übersicht aller ausbaubaren Gebäude mit modernem CollapsibleCard-Design.
 * Integriert Requirements-Validierung mit moderner UI.
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
        <p className="text-sm text-gray-300">Klicke auf ein Gebäude für Details oder baue direkt aus.</p>
      </header>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-3">
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

          // Validate requirements (tech-tree + energy)
          const validation = canBuildOrUpgrade(
            building.id,
            nextLevel,
            research,
            buildings,
            kesseldruck
          );
          const requirementsText = buildRequirementsText(
            building,
            research,
            buildings,
            kesseldruck
          );

          return (
            <GameObjectCard
              key={building.id}
              id={building.id}
              icon={getBuildingIcon(building.id)}
              title={building.name}
              level={currentLevel}
              targetLevel={targetLevel}
              flavorText={building.flavorText || building.description}
              fullDescription={`${building.description}\n\n${building.flavorText || ''}`}
              cost={costForNextUpgrade}
              buildTime={buildTime}
              canAfford={affordable}
              onAction={() => handleUpgrade(building)}
              actionLabel={isUpgrading ? 'Weiter ausbauen' : 'Ausbauen'}
              image={building.image}
              imageAlt={`${building.name} Illustration`}
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

export default BuildingsView;
