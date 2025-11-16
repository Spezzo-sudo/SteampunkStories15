import React, { useState, useMemo } from 'react';
import { SHIP_BLUEPRINTS, MAX_SHIPYARD_QUEUE } from '@/constants';
import { ResourceType } from '@/types';
import GameObjectCard from '@/components/ui/GameObjectCard';
import { useShipyardStore } from '@/store/shipyardStore';
import { useGameStore } from '@/store/gameStore';
import ProductionBoard from '@/components/views/common/ProductionBoard';
import { getShipRoleIcon } from '@/lib/ui/iconMap';
import { formatResourceAmount } from '@/lib/ui/formatting';
import { useShipyardSync } from '@/hooks/useShipyardSync';

/**
 * Werft mit modernem CollapsibleCard-Design für Schiffsübersicht.
 * Zeigt Blueprints kompakt, expanded view mit vollständigen Details.
 */
const WerftView: React.FC = () => {
  useShipyardSync();

  const [shipQuantities, setShipQuantities] = useState<Record<string, number>>({});
  const queue = useShipyardStore((state) => state.queue);
  const hangarCapacity = useShipyardStore((state) => state.hangarCapacity);
  const inventory = useShipyardStore((state) => state.inventory);
  const startOrder = useShipyardStore((state) => state.startOrder);
  const canAfford = useGameStore((state) => state.canAfford);
  const resources = useGameStore((state) => state.resources);

  const handleQuantityChange = (shipId: string, quantity: number) => {
    setShipQuantities((prev) => ({
      ...prev,
      [shipId]: quantity,
    }));
  };

  const handleBuildShip = (shipId: string, quantity: number) => {
    startOrder(shipId, quantity);
  };

  const calculateSlotUsage = useMemo(() => {
    let occupied = 0;
    let reserved = 0;

    Object.entries(inventory).forEach(([blueprintId, qty]) => {
      const ship = SHIP_BLUEPRINTS.find((s) => s.id === blueprintId);
      if (ship) {
        occupied += ship.hangarSlots * qty;
      }
    });

    queue
      .filter((order) => order.status !== 'completed' && order.status !== 'cancelled')
      .forEach((order) => {
        const ship = SHIP_BLUEPRINTS.find((s) => s.id === order.blueprintId);
        if (ship) {
          reserved += ship.hangarSlots * order.quantity;
        }
      });

    return { occupied, reserved, available: hangarCapacity - occupied - reserved };
  }, [inventory, queue, hangarCapacity]);

  const activeOrders = useMemo(
    () => queue.filter((order) => order.status !== 'completed' && order.status !== 'cancelled'),
    [queue]
  );

  const getShipAffordability = (ship: typeof SHIP_BLUEPRINTS[0], quantity: number) => {
    const cost = {
      [ResourceType.Orichalkum]: ship.baseCost[ResourceType.Orichalkum] * quantity,
      [ResourceType.Fokuskristalle]: ship.baseCost[ResourceType.Fokuskristalle] * quantity,
      [ResourceType.Vitriol]: ship.baseCost[ResourceType.Vitriol] * quantity,
    };
    return canAfford(cost);
  };

  const statusPanel = (
    <div className="rounded-2xl border border-yellow-800/30 bg-black/50 p-6 shadow-xl">
      <h3 className="text-[clamp(1.2rem,1vw+1rem,1.6rem)] font-cinzel text-yellow-200">Werftstatus</h3>
      <dl className="mt-3 space-y-3 text-sm text-gray-200">
        <div className="rounded-lg bg-black/40 p-3">
          <dt className="text-xs uppercase tracking-wide text-yellow-300">Verfügbare Slots</dt>
          <dd className="font-semibold">
            {calculateSlotUsage.available} von {hangarCapacity} Slots frei
            {calculateSlotUsage.reserved > 0 && (
              <div className="mt-1 text-xs text-slate-400">
                {calculateSlotUsage.occupied} belegt, {calculateSlotUsage.reserved} reserviert
              </div>
            )}
          </dd>
        </div>
        <div className="rounded-lg bg-black/40 p-3">
          <dt className="text-xs uppercase tracking-wide text-yellow-300">Aktive Bauaufträge</dt>
          <dd className="font-semibold">
            {activeOrders.length === 0 ? (
              'Keine aktiven Aufträge'
            ) : (
              <>
                {activeOrders.length} von {MAX_SHIPYARD_QUEUE}
                <div className="mt-2 space-y-1">
                  {activeOrders.slice(0, 3).map((order) => {
                    const ship = SHIP_BLUEPRINTS.find((s) => s.id === order.blueprintId);
                    const progress = Math.round(
                      ((Date.now() - order.startTime) / (order.endTime - order.startTime)) * 100
                    );
                    return (
                      <div key={order.id} className="text-xs text-slate-300">
                        {ship?.name} ×{order.quantity} ({Math.max(0, progress)}%)
                      </div>
                    );
                  })}
                  {activeOrders.length > 3 && (
                    <div className="text-xs text-slate-400">+{activeOrders.length - 3} weitere...</div>
                  )}
                </div>
              </>
            )}
          </dd>
        </div>
        <div className="rounded-lg bg-black/40 p-3">
          <dt className="text-xs uppercase tracking-wide text-yellow-300">Ressourcen verfügbar</dt>
          <dd className="space-y-1 font-semibold">
            <div className="text-yellow-200">OR {formatResourceAmount(resources[ResourceType.Orichalkum])}</div>
            <div className="text-blue-200">KR {formatResourceAmount(resources[ResourceType.Fokuskristalle])}</div>
            <div className="text-red-200">VT {formatResourceAmount(resources[ResourceType.Vitriol])}</div>
          </dd>
        </div>
      </dl>
    </div>
  );

  const checklistPanel = (
    <div className="rounded-2xl border border-yellow-800/30 bg-black/45 p-6 shadow-xl">
      <h3 className="text-[clamp(1.1rem,1vw+0.9rem,1.5rem)] font-cinzel text-yellow-200">Checkliste</h3>
      <ul className="mt-3 space-y-2 text-sm text-gray-300">
        <li>✓ Ressourcenpuffer prüfen</li>
        <li>✓ Hangar-Slots reservieren</li>
        <li>⚙ Crewzuteilung automatisieren</li>
        <li>⚙ Missionsplanung ans Backend anbinden</li>
      </ul>
    </div>
  );

  return (
    <ProductionBoard
      title="Werft"
      description="Plane deine Flotte mit modernen Schiffsdesigns. Wähle ein Schiff, lege die Menge fest und starte den Bau."
      sidebar={
        <>
          {statusPanel}
          {checklistPanel}
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5">
          {SHIP_BLUEPRINTS.map((ship) => {
            const quantity = shipQuantities[ship.id] || 1;
            const affordable = getShipAffordability(ship, quantity);
            const noCapacity = calculateSlotUsage.available < ship.hangarSlots * quantity;
            const queueFull = activeOrders.length >= MAX_SHIPYARD_QUEUE;
            const isDisabled = noCapacity || queueFull;

            return (
              <GameObjectCard
                key={ship.id}
                id={ship.id}
                icon={getShipRoleIcon(ship.role)}
                title={ship.name}
                level={1}
                targetLevel={1}
                flavorText={ship.flavorText || ship.description}
                fullDescription={`${ship.description}\n\n${ship.flavorText || ''}`}
                stats={{
                  'Hangar-Slots': ship.hangarSlots,
                  Crew: ship.crew,
                  Laderaum: `${formatResourceAmount(ship.cargo)} Einheiten`,
                }}
                cost={ship.baseCost}
                buildTime={ship.buildTimeSeconds}
                canAfford={affordable}
                onAction={() => handleBuildShip(ship.id, quantity)}
                actionLabel="Bauen"
                image={ship.image}
                imageAlt={`${ship.name} Illustration`}
                quantity={quantity}
                onQuantityChange={(qty) => handleQuantityChange(ship.id, qty)}
                disabled={isDisabled}
              />
            );
          })}
        </div>
      </div>
    </ProductionBoard>
  );
};

export default WerftView;
