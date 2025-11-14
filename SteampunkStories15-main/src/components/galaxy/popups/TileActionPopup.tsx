
import React from 'react';
import { useMapStore } from '@/store/mapStore';
import { useSessionStore } from '@/store/sessionStore';
import { Button } from '@/components/ui/Button';
import type { Tile } from '@/data/types';

type TileActionPopupProps = {
  tile: Tile;
  onClose: () => void;
};

/**
 * A popup that displays information about a selected tile and offers actions.
 * It receives tile data and a close handler as props to avoid render loops.
 */
export const TileActionPopup: React.FC<TileActionPopupProps> = ({ tile, onClose }) => {
  // Einzelne Selektoren verwenden um Infinite Loops zu vermeiden
  const openBuildMenu = useMapStore((state) => state.openBuildMenu);
  const user = useSessionStore((state) => state.user);

  if (!tile) {
    return null;
  }

  const { q, r, biome, hasSettlement } = tile;
  const isOwnedByPlayer = hasSettlement?.playerId === user?.id;

  const handleBuildClick = () => {
    openBuildMenu(tile);
  };

  return (
    <div className="absolute bottom-4 right-4 z-20 w-64 rounded-lg border border-slate-700 bg-slate-900/90 p-4 shadow-lg backdrop-blur-sm">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-cinzel text-lg text-yellow-200">
            Feld {q},{r}
          </h3>
          <p className="text-sm text-slate-300">Biome: {biome}</p>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white">
          &times;
        </button>
      </div>

      <div className="mt-4">
        {hasSettlement && (
          <p className="text-xs text-green-400">
            Siedlung: {isOwnedByPlayer ? 'Deine' : hasSettlement.playerId} ({hasSettlement.icon})
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {isOwnedByPlayer && (
          <Button onClick={handleBuildClick} variant="primary">
            Bauen
          </Button>
        )}
        <Button onClick={() => console.log('Transport initiated')} variant="secondary">
          Transport
        </Button>
      </div>
    </div>
  );
};
