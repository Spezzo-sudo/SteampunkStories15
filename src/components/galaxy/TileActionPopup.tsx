import type { Tile } from '@/data/types';
import { Button } from '@/components/ui/Button';
import { useMapStore } from '@/store/mapStore';

interface TileActionPopupProps {
  tile: Tile;
  onClose: () => void;
}

/**
 * Determines which actions are available for a given tile.
 * This is a placeholder and will be expanded with real game logic.
 */
const getAvailableActions = (tile: Tile) => {
  const actions: string[] = [];
  if (tile.hasSettlement) {
    // Belongs to the player or another faction
    actions.push('Angreifen', 'Ausspähen');
  } else {
    // Unsettled tile
    actions.push('Siedeln');
  }

  // Transport is always available for now, to any tile
  actions.push('Transportieren');

  return actions;
};

export const TileActionPopup: React.FC<TileActionPopupProps> = ({ tile, onClose }) => {
  const { settleTile, initiateTransport } = useMapStore((state) => ({ 
    settleTile: state.settleTile,
    initiateTransport: state.initiateTransport,
  }));
  
  const owner = tile.hasSettlement ? tile.hasSettlement.playerId : 'Niemand';
  // TODO: Fetch real structure data
  const structures = ['Keine'];
  const availableActions = getAvailableActions(tile);

  const handleSettle = () => {
    settleTile(tile.regionId, `${tile.q},${tile.r}`);
    onClose(); // Close popup after action
  };

  const handleTransport = () => {
    initiateTransport(tile.regionId, `${tile.q},${tile.r}`);
    onClose(); // Close popup to allow target selection
  };

  return (
    <div className="absolute bottom-4 left-1/2 z-20 w-80 -translate-x-1/2 rounded-lg bg-slate-800 p-4 shadow-lg ring-1 ring-slate-700">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-100">Feld-Details</h3>
          <p className="text-sm text-slate-400">
            Koordinaten: Q: {tile.q}, R: {tile.r}
          </p>
        </div>
        <Button size="sm" variant="ghost" onClick={onClose}>
          X
        </Button>
      </div>
      <div className="mt-4 space-y-2 border-t border-slate-700 pt-4">
        <p className="text-sm text-slate-300">Bewohnt von: {owner}</p>
        <p className="text-sm text-slate-300">Strukturen: {structures.join(', ')}</p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-700 pt-4">
        {availableActions.includes('Siedeln') && (
          <Button size="sm" onClick={handleSettle}>
            Siedeln
          </Button>
        )}
        {availableActions.includes('Transportieren') && (
          <Button size="sm" onClick={handleTransport}>
            Transportieren
          </Button>
        )}
        {availableActions.includes('Angreifen') && <Button size="sm">Angreifen</Button>}
        {availableActions.includes('Ausspähen') && <Button size="sm">Ausspähen</Button>}
      </div>
    </div>
  );
};
