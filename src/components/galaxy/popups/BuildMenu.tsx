import React from 'react';
import { useMapStore } from '@/store/mapStore';
import { UNIT_SPECS, type UnitSpec } from '@/data/units';
import { Button } from '@/components/ui/Button';

/**
 * A popup for building units on a specific tile.
 */
export const BuildMenu: React.FC = () => {
  const { buildMenuTile, closeBuildMenu } = useMapStore((state) => ({
    buildMenuTile: state.buildMenuTile,
    closeBuildMenu: state.closeBuildMenu,
  }));

  if (!buildMenuTile) {
    return null;
  }

  const handleBuildUnit = (unit: UnitSpec) => {
    console.log(`BUILD COMMAND: Unit ${unit.id} on tile ${buildMenuTile.q},${buildMenuTile.r}`);
    // This will later be replaced with a call to a service that
    // queues the build order on the backend.
    closeBuildMenu();
  };

  const unitList = Object.values(UNIT_SPECS);

  return (
    <div className="absolute bottom-4 right-4 z-30 w-80 rounded-lg border border-slate-700 bg-slate-900/90 p-4 shadow-lg backdrop-blur-sm">
      <div className="flex items-start justify-between">
        <h3 className="font-cinzel text-lg text-yellow-200">Baumenü für Feld {buildMenuTile.q},{buildMenuTile.r}</h3>
        <button onClick={closeBuildMenu} className="text-slate-400 hover:text-white">
          &times;
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {unitList.map((unit) => (
          <div key={unit.id} className="grid grid-cols-3 items-center gap-2">
            <div className="col-span-2">
              <p className="font-semibold text-white">{unit.name}</p>
              <p className="text-xs text-slate-400">
                Kosten: {unit.cost.minerals} Min, {unit.cost.gas} Gas
              </p>
            </div>
            <Button onClick={() => handleBuildUnit(unit)} size="sm" variant="primary">
              Bauen
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};
