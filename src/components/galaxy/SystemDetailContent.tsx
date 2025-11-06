import React from 'react';
import { BIOMES } from '@/constants/biomes';
import { biomeToTileStyle } from '@/lib/hexRender';
import { formatSystemCoordinate } from '@/lib/hex';
import { FOCUS_OUTLINE } from '@/styles/tokens';
import { GalaxySystem, MissionType } from '@/types';

export interface SystemDetailContentProps {
  system: GalaxySystem;
  onClose: () => void;
  onJumpToPlanet: (planetId: string) => void;
  onPlanMission: (planetId: string, type: MissionType) => void;
  onFavorite: (planetId: string) => void;
  getPlayerName: (playerId?: string) => string;
  getAllianceTag: (allianceId?: string) => string | undefined;
  onInspectPlayer: (playerId: string) => void;
  favorites: string[];
  currentPlayerId: string;
  currentAllianceId?: string;
}

/**
 * Shared system detail layout reused by modal, side panel and bottom sheet variants.
 */
const SystemDetailContent: React.FC<SystemDetailContentProps> = ({
  system,
  onClose,
  onJumpToPlanet,
  onPlanMission,
  onFavorite,
  getPlayerName,
  getAllianceTag,
  onInspectPlayer,
  favorites,
  currentPlayerId,
  currentAllianceId,
}) => {
  const coordinate = formatSystemCoordinate(system);
  const systemBiome = system.biomeId ? BIOMES[system.biomeId] : undefined;
  const biomeStyle = systemBiome ? biomeToTileStyle(systemBiome) : undefined;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-yellow-800/40 pb-4">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-yellow-300">Sektor {system.sectorQ}:{system.sectorR}</p>
          <h2 className="text-[clamp(1.4rem,1vw+1.1rem,2.1rem)] font-cinzel text-yellow-200">
            System {system.displayName}
          </h2>
          <p className="text-xs text-gray-400">Koordinate {coordinate}</p>
          {systemBiome && (
            <p className="mt-1 text-xs text-gray-300">
              Biom:{' '}
              <span style={{ color: biomeStyle?.accent ?? '#facc15' }}>{systemBiome.name}</span>
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            className={`rounded-md border border-yellow-700/40 bg-yellow-800/20 px-3 py-1 text-xs uppercase tracking-wide text-yellow-100 ${FOCUS_OUTLINE.className}`}
            onClick={() => navigator.clipboard?.writeText(coordinate).catch(() => undefined)}
          >
            Koordinate kopieren
          </button>
          <button
            type="button"
            onClick={onClose}
            className={`rounded-md border border-yellow-800/40 bg-black/40 px-3 py-1 text-xs text-gray-300 hover:text-white ${FOCUS_OUTLINE.className}`}
          >
            Schließen
          </button>
        </div>
      </header>
      <ul className="space-y-3">
        {system.planets.map((planet) => {
          const playerName = getPlayerName(planet.ownerId);
          const allianceTag = getAllianceTag(planet.allianceId);
          const isOwned = Boolean(planet.ownerId);
          const isFavorite = favorites.includes(planet.id);
          const isCurrentPlayerOwner = planet.ownerId === currentPlayerId;
          const isAllianceMate =
            Boolean(planet.allianceId) && Boolean(currentAllianceId) && planet.allianceId === currentAllianceId;
          const isEnemy = isOwned && !isCurrentPlayerOwner && !isAllianceMate;

          return (
            <li key={planet.id} className="rounded-xl border border-yellow-800/30 bg-black/50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-yellow-300">Slot {planet.slot}</p>
                  <h3 className="text-lg font-cinzel text-yellow-100">{planet.name}</h3>
                  <p className="text-xs text-gray-400">{planet.biome}</p>
                </div>
                <div className="flex flex-col items-end gap-2 text-right text-xs">
                  <div className="flex items-center gap-2">
                    <span className="rounded-sm bg-yellow-800/30 px-2 py-1 text-[0.65rem] text-yellow-100">
                      {isOwned ? playerName : 'Frei'}
                    </span>
                    {allianceTag && (
                      <span className="rounded-sm bg-yellow-900/40 px-2 py-1 text-[0.65rem] text-amber-200">{allianceTag}</span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {isOwned && planet.ownerId && (
                      <button
                        type="button"
                        onClick={() => onInspectPlayer(planet.ownerId!)}
                        className={`rounded-md border border-yellow-800/40 px-2 py-1 text-[0.7rem] text-yellow-100 ${FOCUS_OUTLINE.className}`}
                      >
                        Profil öffnen
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onJumpToPlanet(planet.id)}
                      className={`rounded-md border border-yellow-800/40 px-2 py-1 text-[0.7rem] text-gray-200 hover:text-white ${FOCUS_OUTLINE.className}`}
                    >
                      Zu Planet springen
                    </button>
                    {isOwned ? (
                      <>
                        {isEnemy && (
                          <>
                            <button
                              type="button"
                              onClick={() => onPlanMission(planet.id, MissionType.Angriff)}
                              className={`rounded-md border border-red-800/40 bg-red-900/30 px-2 py-1 text-[0.7rem] text-red-200 ${FOCUS_OUTLINE.className}`}
                            >
                              Angriff planen
                            </button>
                            <button
                              type="button"
                              onClick={() => onPlanMission(planet.id, MissionType.Spionage)}
                              className={`rounded-md border border-purple-800/40 bg-purple-900/30 px-2 py-1 text-[0.7rem] text-purple-200 ${FOCUS_OUTLINE.className}`}
                            >
                              Spionage senden
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => onPlanMission(planet.id, MissionType.Transport)}
                          className={`rounded-md border border-sky-800/40 bg-sky-900/30 px-2 py-1 text-[0.7rem] text-sky-200 ${FOCUS_OUTLINE.className}`}
                        >
                          Transport planen
                        </button>
                        {(isCurrentPlayerOwner || isAllianceMate) && (
                          <button
                            type="button"
                            onClick={() => onPlanMission(planet.id, MissionType.Stationierung)}
                            className={`rounded-md border border-amber-800/40 bg-amber-900/30 px-2 py-1 text-[0.7rem] text-amber-200 ${FOCUS_OUTLINE.className}`}
                          >
                            Stationierung
                          </button>
                        )}
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onPlanMission(planet.id, MissionType.Kolonisierung)}
                        className={`rounded-md border border-emerald-700/40 bg-emerald-900/30 px-2 py-1 text-[0.7rem] text-emerald-200 ${FOCUS_OUTLINE.className}`}
                      >
                        Kolonisieren vormerken
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onFavorite(planet.id)}
                      className={`rounded-md border border-yellow-800/40 px-2 py-1 text-[0.7rem] ${
                        isFavorite ? 'bg-yellow-700/30 text-yellow-200' : 'text-yellow-100'
                      } ${FOCUS_OUTLINE.className}`}
                      aria-pressed={isFavorite}
                      aria-label={isFavorite ? 'Favorit entfernen' : 'Als Favorit speichern'}
                    >
                      {isFavorite ? 'Favorit ✓' : 'Favorisieren'}
                    </button>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default React.memo(SystemDetailContent);
