import React, { useCallback, useMemo } from 'react';
import { useGameStore } from '@/store/gameStore';
import { BUILDINGS, MAX_BUILD_QUEUE_LENGTH, RESEARCH } from '@/constants';
import GameObjectCard from '@/components/ui/GameObjectCard';
import { Building } from '@/types';
import { canBuildOrUpgrade } from '@/lib/requirements';
import ProductionBoard from '@/components/views/common/ProductionBoard';
import { getBuildingIcon } from '@/lib/ui/iconMap';
import { formatResourceAmount } from '@/lib/ui/formatting';

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

  if (building.requires && building.requires.length > 0) {
    building.requires.forEach((req) => {
      if (req.type === 'research') {
        const researchDef = RESEARCH[req.id as keyof typeof RESEARCH];
        const researchName = researchDef?.name || req.id;
        const requiredLevel = req.level || 1;
        const currentLevel = currentResearch[req.id] || 0;
        const met = currentLevel >= requiredLevel;
        reqs.push(`${met ? '✓' : '•'} ${researchName} Stufe ${requiredLevel}`);
      } else if (req.type === 'building') {
        const buildingDef = BUILDINGS[req.id as keyof typeof BUILDINGS];
        const buildingName = buildingDef?.name || req.id;
        const requiredLevel = req.level || 1;
        const currentLevel = currentBuildings[req.id] || 0;
        const met = currentLevel >= requiredLevel;
        reqs.push(`${met ? '✓' : '•'} ${buildingName} Level ${requiredLevel}`);
      }
    });
  }

  if (building.baseEnergyConsumption && building.baseEnergyConsumption > 0) {
    const wouldExceed =
      kesseldruck.consumption + building.baseEnergyConsumption > kesseldruck.capacity;
    const availableEnergy = kesseldruck.capacity - kesseldruck.consumption;
    const met = !wouldExceed;
    reqs.push(
      `${met ? '✓' : '•'} Energiekapazität: ${building.baseEnergyConsumption} benötigt / ${availableEnergy} verfügbar`
    );
  }

  return reqs;
};

/**
 * Übersicht aller ausbaubaren Gebäude mit konsistentem Layout und Statusleiste.
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
    [startUpgrade]
  );

  const queuePanel = useMemo(() => {
    const capacityLeft = Math.max(0, MAX_BUILD_QUEUE_LENGTH - buildQueue.length);
    const upcoming = buildQueue.slice(0, 3).map((item) => ({
      id: item.entityId,
      level: item.level,
      eta: Math.max(0, item.endTime - Date.now()),
    }));

    return (
      <div className="rounded-2xl border border-yellow-800/30 bg-black/50 p-6 shadow-xl">
        <h3 className="text-[clamp(1.1rem,1vw+0.9rem,1.5rem)] font-cinzel text-yellow-200">Ausbau-Status</h3>
        <p className="mt-2 text-sm text-gray-300">
          {buildQueue.length} / {MAX_BUILD_QUEUE_LENGTH} Aufträge aktiv &middot; {capacityLeft} freie Slots
        </p>
        <ul className="mt-4 space-y-2 text-sm text-gray-200">
          {upcoming.length === 0 && <li>Keine aktiven Baustellen</li>}
          {upcoming.map((entry) => {
            const buildingDef = BUILDINGS[entry.id as keyof typeof BUILDINGS];
            return (
              <li
                key={`${entry.id}-${entry.level}`}
                className="flex items-center justify-between rounded-lg bg-black/40 px-3 py-2"
              >
                <span>{buildingDef?.name ?? entry.id} → L{entry.level}</span>
                <span className="text-xs text-yellow-300">{Math.ceil(entry.eta / 60000)}m</span>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }, [buildQueue]);

  const energyPanel = (
    <div className="rounded-2xl border border-yellow-800/30 bg-black/45 p-6 shadow-xl">
      <h3 className="text-[clamp(1.1rem,1vw+0.9rem,1.5rem)] font-cinzel text-yellow-200">Energiehaushalt</h3>
      <dl className="mt-3 space-y-2 text-sm text-gray-200">
        <div className="flex items-center justify-between rounded bg-black/40 px-3 py-2">
          <dt>Kapazität</dt>
          <dd>{formatResourceAmount(kesseldruck.capacity)} bar</dd>
        </div>
        <div className="flex items-center justify-between rounded bg-black/40 px-3 py-2">
          <dt>Verbrauch</dt>
          <dd>{formatResourceAmount(kesseldruck.consumption)} bar</dd>
        </div>
        <div className="flex items-center justify-between rounded bg-black/40 px-3 py-2">
          <dt>Effizienz</dt>
          <dd>{Math.round(Math.min(1, Math.max(0, kesseldruck.efficiency)) * 100)}%</dd>
        </div>
      </dl>
    </div>
  );

  return (
    <ProductionBoard
      title="Gebäudeausbau"
      description="Klicke ein Gebäude an, prüfe Anforderungen und starte identische Ausbau-Workflows wie in Werft und Forschung."
      sidebar={
        <>
          {queuePanel}
          {energyPanel}
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
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
              disabled={!validation.canDo || buildQueue.length >= MAX_BUILD_QUEUE_LENGTH}
            />
          );
        })}
      </div>
    </ProductionBoard>
  );
};

export default BuildingsView;
