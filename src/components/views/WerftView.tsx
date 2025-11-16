import React, { useState } from 'react';
import { SHIP_BLUEPRINTS } from '@/constants';
import { ResourceType } from '@/types';
import GameObjectCard from '@/components/ui/GameObjectCard';

const formatCost = (value: number) => value.toLocaleString('de-DE');

/**
 * Werft mit modernem CollapsibleCard-Design für Schiffe-Übersicht.
 * Zeigt Blueprints kompakt, expanded view mit vollständigen Details.
 */
const WerftView: React.FC = () => {
  const [shipQuantities, setShipQuantities] = useState<Record<string, number>>({});

  const handleQuantityChange = (shipId: string, quantity: number) => {
    setShipQuantities((prev) => ({
      ...prev,
      [shipId]: quantity,
    }));
  };

  const getShipIcon = (role: string): string => {
    const iconMap: Record<string, string> = {
      'Aufklärung': '🔭',
      'Transport': '📦',
      'Angriff': '⚔️',
      'Unterstützung': '🏥',
      'Kolonisation': '🏗️',
    };
    return iconMap[role] || '⚓';
  };

  return (
    <section className="space-y-8 pb-20">
      <header className="space-y-2">
        <h2 className="text-[clamp(1.8rem,1.2vw+1.5rem,2.4rem)] font-cinzel text-yellow-300">Werft</h2>
        <p className="text-sm text-gray-300">
          Plane deine Flotte. Jedes Schiff zeigt wichtige Statistiken, der Bau wird bald aktiviert.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        {/* Schiffe Grid */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-[clamp(1.2rem,1vw+1rem,1.6rem)] font-cinzel text-yellow-200">Verfügbare Blueprints</h3>
            <p className="text-xs text-gray-400">Wähle ein Schiff und lege die Menge fest. Der Bau wird in einem späteren Sprint aktiviert.</p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {SHIP_BLUEPRINTS.map((ship) => {
            const quantity = shipQuantities[ship.id] || 1;
            return (
              <GameObjectCard
                key={ship.id}
                id={ship.id}
                icon={getShipIcon(ship.role)}
                title={ship.name}
                level={1}
                targetLevel={1}
                flavorText={ship.flavorText || ship.description}
                fullDescription={`${ship.description}\n\n${ship.flavorText || ''}`}
                stats={{
                  'Hangar-Slots': ship.hangarSlots,
                  'Crew': ship.crew,
                  'Laderaum': `${formatCost(ship.cargo)} Einheiten`,
                }}
                cost={ship.baseCost}
                buildTime={ship.buildTimeSeconds}
                canAfford={true}
                onAction={() => {
                  /* Wird später aktiviert */
                }}
                actionLabel="Bauen"
                image={ship.image}
                imageAlt={`${ship.name} Illustration`}
                quantity={quantity}
                onQuantityChange={(qty) => handleQuantityChange(ship.id, qty)}
                disabled={true}
              />
            );
        })}
          </div>
        </div>

        {/* Status Panel */}
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-yellow-800/30 bg-black/50 p-6 shadow-xl">
            <h3 className="text-[clamp(1.2rem,1vw+1rem,1.6rem)] font-cinzel text-yellow-200">Werftstatus</h3>
            <dl className="mt-3 space-y-3 text-sm text-gray-200">
              <div className="rounded-lg bg-black/40 p-3">
                <dt className="text-xs uppercase tracking-wide text-yellow-300">Verfügbare Slots</dt>
                <dd className="font-semibold">12 von 16 Slots frei</dd>
              </div>
              <div className="rounded-lg bg-black/40 p-3">
                <dt className="text-xs uppercase tracking-wide text-yellow-300">Aktive Bauaufträge</dt>
                <dd className="font-semibold">Noch keine – hier erscheint später die Queue.</dd>
              </div>
              <div className="rounded-lg bg-black/40 p-3">
                <dt className="text-xs uppercase tracking-wide text-yellow-300">Nächste Mission</dt>
                <dd className="font-semibold">Konvoi nach &quot;Nimbus Reach&quot; (ETA TBA)</dd>
              </div>
            </dl>
          </div>
          <div className="rounded-2xl border border-yellow-800/30 bg-black/45 p-6 shadow-xl">
            <h3 className="text-[clamp(1.1rem,1vw+0.9rem,1.5rem)] font-cinzel text-yellow-200">Checkliste</h3>
            <ul className="mt-3 space-y-2 text-sm text-gray-300">
              <li>✔ Ressourcenpuffer prüfen</li>
              <li>✔ Hangar-Slots reservieren</li>
              <li>⏳ Crewzuteilung automatisieren</li>
              <li>⏳ Missionsplanung ans Backend anbinden</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WerftView;
