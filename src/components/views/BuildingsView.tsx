import React, { useCallback } from 'react';
import { useGameStore } from '@/store/gameStore';
import { BUILDINGS } from '@/constants';
import CollapsibleCard from '@/components/ui/CollapsibleCard';
import { Building } from '@/types';

/**
 * Übersicht aller ausbaubaren Gebäude mit modernem CollapsibleCard-Design.
 * Compact view zeigt essenzielle Infos, Expanded zeigt vollständige Details.
 */
const BuildingsView: React.FC = () => {
  const buildings = useGameStore((state) => state.buildings);
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

  // Icon mapping für Gebäude
  const getBuildingIcon = (buildingId: string): string => {
    const iconMap: Record<string, string> = {
      'orichalkumMine': '⛏️',
      'kristallLabor': '💠',
      'vitrilDestille': '⚗️',
      'dampfkraftwerk': '🔥',
      'energiespeicher': '🔋',
      'lagerhaus': '📦',
      'forschungslabor': '🧪',
      'werft': '⚓',
      'rathaus': '🏛️',
      'marktplatz': '🏪',
    };
    return iconMap[buildingId] || '🏗️';
  };

  return (
    <section className="space-y-8 pb-16">
      <header className="space-y-2">
        <h2 className="text-[clamp(1.8rem,1.2vw+1.5rem,2.4rem)] font-cinzel text-yellow-300">Gebäudeausbau</h2>
        <p className="text-sm text-gray-300">Klicke auf ein Gebäude für Details oder baue direkt ohne Modal zu öffnen.</p>
      </header>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
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

          return (
            <CollapsibleCard
              key={building.id}
              id={building.id}
              icon={getBuildingIcon(building.id)}
              title={building.name}
              level={currentLevel}
              targetLevel={targetLevel}
              shortDescription={building.description}
              fullDescription={`${building.description}\n\nDieses Gebäude ist ein essentieller Bestandteil deines Imperiums.`}
              cost={costForNextUpgrade}
              buildTime={buildTime}
              canAfford={affordable}
              onAction={() => handleUpgrade(building)}
              actionLabel={isUpgrading ? 'Weiter ausbauen' : 'Ausbauen'}
              image={building.image}
              imageAlt={`${building.name} Illustration`}
              isUpgrading={isUpgrading}
              queueLength={buildQueue.length}
              disabled={buildQueue.length >= 10}
            />
          );
        })}
      </div>
    </section>
  );
};

export default BuildingsView;
