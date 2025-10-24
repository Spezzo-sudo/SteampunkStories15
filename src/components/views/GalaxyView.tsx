import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BIOME_STYLES } from '@/constants';
import { Alliance, GalaxyPlanet, GalaxySystem, MissionType, PlanetBiome, Player } from '@/types';
import { useDirectoryStore } from '@/store/directoryStore';
import { useAllianceStore } from '@/store/allianceStore';
import HexMap from '@/components/galaxy/HexMap';
import SystemModal from '@/components/galaxy/SystemModal';
import GalaxyLegend from '@/components/galaxy/GalaxyLegend';
import VirtualList from '@/lib/virtualList';
import { formatSystemCoordinate, parseSystemCoordinate } from '@/lib/hex';
import OwnerChips, { OwnerChipEntry } from '@/components/galaxy/OwnerChips';
import ChatSidebar from '@/components/messaging/ChatSidebar';
import { FOCUS_OUTLINE } from '@/styles/tokens';
import { useMissionStore } from '@/store/missionStore';
import { ALL_BIOMES, BIOMES } from '@/constants/biomes';

const ROW_HEIGHT = 76;
const MIN_ZOOM = 0.45;
const MAX_ZOOM = 4.2;
const ZOOM_STEP = 0.25;
const SECTOR_CHUNK_SIZE = 12;

interface TableRow {
  id: string;
  coordinate: string;
  systemName: string;
  freeSlots: number;
  owners: OwnerChipEntry[];
  extraOwnerCount: number;
  systemIndex: number;
  biomeId?: string;
  biomeName?: string;
  biomeAccent?: string;
}

type SectorRange = {
  qMin: number;
  qMax: number;
  rMin: number;
  rMax: number;
};

type SectorBounds = {
  minQ: number;
  maxQ: number;
  minR: number;
  maxR: number;
};

type LegendBiomeEntry = React.ComponentProps<typeof GalaxyLegend>['biomes'][number];
type LegendAllianceEntry = React.ComponentProps<typeof GalaxyLegend>['alliances'][number];

interface MapOverlayProps {
  onClose: () => void;
  systems: GalaxySystem[];
  players: Player[];
  alliances: Alliance[];
  selectedSystemId: string | null;
  onSelect: (system: GalaxySystem) => void;
  zoom: number;
  onZoomChange: (value: number) => void;
  filteredSystemIds: Set<string>;
  highlightedAllianceIds: string[];
  legendBiomes: LegendBiomeEntry[];
  legendAlliances: LegendAllianceEntry[];
  activeRange: SectorRange | null;
  onNavigate: (axis: 'q' | 'r', delta: number) => void;
  chunkCounts: { q: number; r: number };
  sectorBounds: SectorBounds | null;
  sectorChunk: { qIndex: number; rIndex: number };
  onSelectChunk: (qIndex: number, rIndex: number) => void;
}

const MapOverlay: React.FC<MapOverlayProps> = ({
  onClose,
  systems,
  players,
  alliances,
  selectedSystemId,
  onSelect,
  zoom,
  onZoomChange,
  filteredSystemIds,
  highlightedAllianceIds,
  legendBiomes,
  legendAlliances,
  activeRange,
  onNavigate,
  chunkCounts,
  sectorBounds,
  sectorChunk,
  onSelectChunk,
}) => {
  const chunkMeta = useMemo(() => {
    if (!sectorBounds || chunkCounts.q <= 0 || chunkCounts.r <= 0) {
      return null;
    }
    const qSpan = sectorBounds.maxQ - sectorBounds.minQ + 1;
    const rSpan = sectorBounds.maxR - sectorBounds.minR + 1;
    const qSize = Math.ceil(qSpan / chunkCounts.q);
    const rSize = Math.ceil(rSpan / chunkCounts.r);
    const cells = new Map<string, { count: number; range: SectorRange }>();

    for (let rIndex = 0; rIndex < chunkCounts.r; rIndex += 1) {
      for (let qIndex = 0; qIndex < chunkCounts.q; qIndex += 1) {
        const qMin = sectorBounds.minQ + qIndex * qSize;
        const qMax = Math.min(sectorBounds.maxQ, qMin + qSize - 1);
        const rMin = sectorBounds.minR + rIndex * rSize;
        const rMax = Math.min(sectorBounds.maxR, rMin + rSize - 1);
        cells.set(`${qIndex}-${rIndex}`, { count: 0, range: { qMin, qMax, rMin, rMax } });
      }
    }

    systems.forEach((system) => {
      const qIndex = Math.min(chunkCounts.q - 1, Math.floor((system.sectorQ - sectorBounds.minQ) / qSize));
      const rIndex = Math.min(chunkCounts.r - 1, Math.floor((system.sectorR - sectorBounds.minR) / rSize));
      const key = `${qIndex}-${rIndex}`;
      const cell = cells.get(key);
      if (cell) {
        cell.count += 1;
      }
    });

    return { cells, qSize, rSize };
  }, [chunkCounts.q, chunkCounts.r, sectorBounds, systems]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-6">
      <div className="flex h/full w/full max-h-[95vh] max-w-6xl flex-col gap-4 rounded-3xl border border-yellow-800/40 bg-black/90 p-6 shadow-[0_25px_80px_rgba(0,0,0,0.85)]">
        <header className="flex flex-col gap-3 border-b border-yellow-800/30 pb-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-[clamp(1.6rem,1vw+1.4rem,2.4rem)] font-cinzel text-yellow-200">Galaktische Karte</h2>
            {activeRange ? (
              <p className="text-xs text-gray-300">
                Aktiver Block: Q {activeRange.qMin}-{activeRange.qMax} | R {activeRange.rMin}-{activeRange.rMax}
              </p>
            ) : (
              <p className="text-xs text-gray-400">Gesamtes Grid</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate('q', -1)}
              className={`rounded-md border border-yellow-800/40 bg-black/40 px-3 py-1 text-xs text-gray-200 hover:text-yellow-100 ${FOCUS_OUTLINE.className}`}
            >
              ← Q
            </button>
            <button
              type="button"
              onClick={() => onNavigate('q', 1)}
              className={`rounded-md border border-yellow-800/40 bg-black/40 px-3 py-1 text-xs text-gray-200 hover:text-yellow-100 ${FOCUS_OUTLINE.className}`}
            >
              Q →
            </button>
            <button
              type="button"
              onClick={() => onNavigate('r', -1)}
              className={`rounded-md border border-yellow-800/40 bg-black/40 px-3 py-1 text-xs text-gray-200 hover:text-yellow-100 ${FOCUS_OUTLINE.className}`}
            >
              ↑ R
            </button>
            <button
              type="button"
              onClick={() => onNavigate('r', 1)}
              className={`rounded-md border border-yellow-800/40 bg-black/40 px-3 py-1 text-xs text-gray-200 hover:text-yellow-100 ${FOCUS_OUTLINE.className}`}
            >
              R ↓
            </button>
            <button
              type="button"
              onClick={onClose}
              className={`rounded-md border border-yellow-800/40 bg-yellow-800/20 px-3 py-1 text-xs uppercase tracking-wide text-yellow-100 hover:text-white ${FOCUS_OUTLINE.className}`}
            >
              Schliessen
            </button>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-6 overflow-hidden xl:flex-row">
          <div className="relative flex-1">
            <HexMap
              systems={systems}
              players={players}
              alliances={alliances}
              selectedSystemId={selectedSystemId}
              onSelect={onSelect}
              zoom={zoom}
              onZoomChange={onZoomChange}
              filteredSystemIds={filteredSystemIds}
              highlightedAllianceIds={highlightedAllianceIds}
              height={720}
            />
            <div className="pointer-events-none absolute inset-0 flex items-start justify-end p-4">
              <div className="pointer-events-auto inline-flex flex-col gap-2 rounded-xl border border-yellow-800/30 bg-black/70 p-2 shadow-lg">
                <button
                  type="button"
                  onClick={() => onZoomChange(Math.min(MAX_ZOOM, Number((zoom + ZOOM_STEP).toFixed(2))))}
                  className={`rounded-md border border-yellow-800/40 px-3 py-1 text-sm text-yellow-100 hover:text-white ${FOCUS_OUTLINE.className}`}
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => onZoomChange(Math.max(MIN_ZOOM, Number((zoom - ZOOM_STEP).toFixed(2))))}
                  className={`rounded-md border border-yellow-800/40 px-3 py-1 text-sm text-yellow-100 hover:text-white ${FOCUS_OUTLINE.className}`}
                >
                  −
                </button>
                <button
                  type="button"
                  onClick={() => onZoomChange(1.15)}
                  className={`rounded-md border border-yellow-800/40 px-3 py-1 text-xs text-yellow-100 hover:text-white ${FOCUS_OUTLINE.className}`}
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
          <aside className="flex w/full max-w-xs flex-col gap-4">
            <GalaxyLegend biomes={legendBiomes} alliances={legendAlliances} />
            {chunkMeta ? (
              <div className="rounded-2xl border border-yellow-800/30 bg-black/45 p-4 text-xs text-gray-300">
                <h3 className="text-xs font-cinzel uppercase tracking-wider text-yellow-200">Universums-Uebersicht</h3>
                <p className="mt-2 text-xs text-gray-400">
                  Tippe auf einen Block, um direkt zu einem Sektor-Cluster zu springen. Die Zahl zeigt die Anzahl der Systeme in diesem Abschnitt.
                </p>
                <div className="mt-3 grid gap-2 text-xs" style={{ gridTemplateColumns: `repeat(${chunkCounts.q}, minmax(0, 1fr))` }}>
                  {Array.from({ length: chunkCounts.r }).map((_, rIndex) =>
                    Array.from({ length: chunkCounts.q }).map((_, qIndex) => {
                      const key = `${qIndex}-${rIndex}`;
                      const cell = chunkMeta!.cells.get(key);
                      const isActive = sectorChunk.qIndex === qIndex && sectorChunk.rIndex === rIndex;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => onSelectChunk(qIndex, rIndex)}
                          className={`flex flex-col rounded-lg border px-2 py-2 text-left transition ${FOCUS_OUTLINE.className} ${
                            isActive
                              ? 'border-yellow-400/80 bg-yellow-500/10 text-yellow-100 shadow-[0_0_18px_rgba(250,204,85,0.25)]'
                              : 'border-yellow-800/40 bg-black/50 text-gray-300 hover:border-yellow-600/60 hover:text-yellow-100'
                          }`}
                        >
                          <span className="text-[0.7rem] uppercase tracking-wide text-yellow-300">
                            Q {cell?.range.qMin ?? '-'}-{cell?.range.qMax ?? '-'}
                          </span>
                          <span className="text-[0.7rem] uppercase tracking-wide text-yellow-300">
                            R {cell?.range.rMin ?? '-'}-{cell?.range.rMax ?? '-'}
                          </span>
                          <span className="mt-1 text-xs text-gray-200">{cell?.count ?? 0} Systeme</span>
                        </button>
                      );
                    }),
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-yellow-800/30 bg-black/45 p-4 text-xs text-gray-300">
                <h3 className="text-xs font-cinzel uppercase tracking-wider text-yellow-200">Universums-Uebersicht</h3>
                <p className="mt-2 text-xs text-gray-400">Zu wenige Daten, um einen Uebersichtsblock zu berechnen.</p>
              </div>
            )}
            <div className="rounded-2xl border border-yellow-800/30 bg-black/45 p-4 text-xs text-gray-300">
              <h3 className="text-xs font-cinzel uppercase tracking-wider text-yellow-200">Chunk-Quicknav</h3>
              <p className="mt-2 text-xs text-gray-400">
                Nutze die Pfeile oder das Uebersichtsraster, um angrenzende Sektorblocke anzusteuern. Die Karte bleibt synchron mit der Liste
                und den Allianz-Highlights.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

const buildOwnerSummary = (
  systemId: string,
  planets: GalaxyPlanet[],
  players: Player[],
  alliances: Alliance[],
) => {
  const ownerMap = new Map<string, { label: string; color: string; count: number }>();
  planets.forEach((planet) => {
    if (!planet.ownerId) {
      return;
    }
    const player = players.find((entry) => entry.id === planet.ownerId);
    const alliance = alliances.find((entry) => entry.id === planet.allianceId);
    const key = planet.ownerId;
    const label = alliance ? alliance.tag : player?.name ?? 'Unbekannt';
    const color = alliance?.color ?? player?.color ?? '#facc15';
    const entry = ownerMap.get(key);
    if (entry) {
      entry.count += 1;
    } else {
      ownerMap.set(key, { label, color, count: 1 });
    }
  });
  const owners = Array.from(ownerMap.values())
    .sort((a, b) => b.count - a.count)
    .map((entry, index) => ({ id: `${systemId}-owner-${index}`, label: entry.label, color: entry.color }));
  return {
    owners: owners.slice(0, 3),
    extra: owners.length > 3 ? owners.length - 3 : 0,
  };
};

/**
 * Galaxy v3 view combining virtualised table, large map and lightweight communication tools.
 */
export default function GalaxyView(): JSX.Element {
  const systems = useDirectoryStore((state) => state.systems);
  const players = useDirectoryStore((state) => state.players);
  const currentPlayerId = useDirectoryStore((state) => state.currentPlayerId);
  const openProfile = useDirectoryStore((state) => state.openPlayerProfile);
  const favoritePlanet = useDirectoryStore((state) => state.favoritePlanet);
  const favorites = useDirectoryStore((state) => state.favorites);
  const alliances = useAllianceStore((state) => state.alliances);
  const planMission = useMissionStore((state) => state.planMission);

  const [searchTerm, setSearchTerm] = useState('');
  const [onlyMine, setOnlyMine] = useState(false);
  const [onlyFree, setOnlyFree] = useState(false);
  const [biomeFilter, setBiomeFilter] = useState<PlanetBiome | 'all'>('all');
  const [selectedSystemId, setSelectedSystemId] = useState<string | null>(null);
  const [modalSystemId, setModalSystemId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1.15);
  const [selectedAllianceIds, setSelectedAllianceIds] = useState<string[]>([]);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const sectorInitRef = useRef(false);

  const selectedSystem = useMemo(
    () => systems.find((system) => system.id === selectedSystemId) ?? null,
    [selectedSystemId, systems],
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sysParam = params.get('sys');
    if (!sysParam) {
      return;
    }
    const coordinate = parseSystemCoordinate(sysParam);
    if (!coordinate) {
      return;
    }
    const system = systems.find(
      (entry) =>
        entry.sectorQ === coordinate.sectorQ &&
        entry.sectorR === coordinate.sectorR &&
        entry.sysIndex === coordinate.sysIndex,
    );
    if (system) {
      setSelectedSystemId(system.id);
      setModalSystemId(system.id);
    }
  }, [systems]);

  useEffect(() => {
    if (!selectedSystem) {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    params.set('sys', formatSystemCoordinate(selectedSystem));
    window.history.replaceState(null, '', `?${params.toString()}`);
  }, [selectedSystem]);

  const biomeOptions = useMemo(
    () => Object.entries(BIOME_STYLES) as [PlanetBiome, { label: string; fill: string; stroke: string }][],
    [],
  );

  const allianceMap = useMemo(() => {
    const entries = new Map<string, Alliance>();
    alliances.forEach((alliance) => entries.set(alliance.id, alliance));
    return entries;
  }, [alliances]);

  const selectedAllianceSet = useMemo(() => new Set(selectedAllianceIds), [selectedAllianceIds]);

  const sectorBounds = useMemo<SectorBounds | null>(() => {
    if (systems.length === 0) {
      return null;
    }
    return systems.reduce(
      (acc, system) => ({
        minQ: Math.min(acc.minQ, system.sectorQ),
        maxQ: Math.max(acc.maxQ, system.sectorQ),
        minR: Math.min(acc.minR, system.sectorR),
        maxR: Math.max(acc.maxR, system.sectorR),
      }),
      {
        minQ: systems[0].sectorQ,
        maxQ: systems[0].sectorQ,
        minR: systems[0].sectorR,
        maxR: systems[0].sectorR,
      },
    );
  }, [systems]);

  const chunkCounts = useMemo(() => {
    if (!sectorBounds) {
      return { q: 1, r: 1 };
    }
    const width = sectorBounds.maxQ - sectorBounds.minQ + 1;
    const height = sectorBounds.maxR - sectorBounds.minR + 1;
    return {
      q: Math.max(1, Math.ceil(width / SECTOR_CHUNK_SIZE)),
      r: Math.max(1, Math.ceil(height / SECTOR_CHUNK_SIZE)),
    };
  }, [sectorBounds]);

  const [sectorChunk, setSectorChunk] = useState({ qIndex: 0, rIndex: 0 });

  useEffect(() => {
    if (!sectorBounds || sectorInitRef.current) {
      return;
    }
    sectorInitRef.current = true;
    const defaultChunk = {
      qIndex: Math.min(chunkCounts.q - 1, Math.max(0, Math.floor((chunkCounts.q - 1) / 2))),
      rIndex: Math.min(chunkCounts.r - 1, Math.max(0, Math.floor((chunkCounts.r - 1) / 2))),
    };
    setSectorChunk(defaultChunk);
  }, [chunkCounts, sectorBounds]);

  const navigateChunk = useCallback(
    (axis: 'q' | 'r', delta: number) => {
      setSectorChunk((prev) => {
        const maxQ = chunkCounts.q - 1;
        const maxR = chunkCounts.r - 1;
        if (axis === 'q') {
          const next = Math.min(maxQ, Math.max(0, prev.qIndex + delta));
          if (next === prev.qIndex) {
            return prev;
          }
          return { ...prev, qIndex: next };
        }
        const next = Math.min(maxR, Math.max(0, prev.rIndex + delta));
        if (next === prev.rIndex) {
          return prev;
        }
        return { ...prev, rIndex: next };
      });
    },
    [chunkCounts.q, chunkCounts.r],
  );

  const activeSectorRange = useMemo(() => {
    if (!sectorBounds) {
      return null;
    }
    const qStart = sectorBounds.minQ + sectorChunk.qIndex * SECTOR_CHUNK_SIZE;
    const rStart = sectorBounds.minR + sectorChunk.rIndex * SECTOR_CHUNK_SIZE;
    return {
      qMin: qStart,
      qMax: Math.min(sectorBounds.maxQ, qStart + SECTOR_CHUNK_SIZE - 1),
      rMin: rStart,
      rMax: Math.min(sectorBounds.maxR, rStart + SECTOR_CHUNK_SIZE - 1),
    };
  }, [sectorBounds, sectorChunk]);

  const sectorChunkOptionsQ = useMemo(() => {
    if (!sectorBounds) {
      return [{ value: 0, label: 'Q 0-0' }];
    }
    return Array.from({ length: chunkCounts.q }, (_, index) => {
      const start = sectorBounds.minQ + index * SECTOR_CHUNK_SIZE;
      const end = Math.min(sectorBounds.maxQ, start + SECTOR_CHUNK_SIZE - 1);
      return { value: index, label: `Q ${start}-${end}` };
    });
  }, [chunkCounts, sectorBounds]);

  const sectorChunkOptionsR = useMemo(() => {
    if (!sectorBounds) {
      return [{ value: 0, label: 'R 0-0' }];
    }
    return Array.from({ length: chunkCounts.r }, (_, index) => {
      const start = sectorBounds.minR + index * SECTOR_CHUNK_SIZE;
      const end = Math.min(sectorBounds.maxR, start + SECTOR_CHUNK_SIZE - 1);
      return { value: index, label: `R ${start}-${end}` };
    });
  }, [chunkCounts, sectorBounds]);

  const sectorFilteredSystems = useMemo(() => {
    if (!activeSectorRange) {
      return systems;
    }
    return systems.filter(
      (system) =>
        system.sectorQ >= activeSectorRange.qMin &&
        system.sectorQ <= activeSectorRange.qMax &&
        system.sectorR >= activeSectorRange.rMin &&
        system.sectorR <= activeSectorRange.rMax,
    );
  }, [activeSectorRange, systems]);

  const prominentAlliances = useMemo(() => {
    const sorted = [...alliances].sort((a, b) => b.members.length - a.members.length);
    const base = sorted.slice(0, 12);
    const selectedExtras = selectedAllianceIds
      .map((id) => allianceMap.get(id))
      .filter((entry): entry is Alliance => Boolean(entry));
    const merged: Alliance[] = [...base];
    selectedExtras.forEach((entry) => {
      if (!merged.some((item) => item.id === entry.id)) {
        merged.push(entry);
      }
    });
    return merged;
  }, [alliances, allianceMap, selectedAllianceIds]);

  const tableRows = useMemo<TableRow[]>(() => {
    const term = searchTerm.trim().toLowerCase();
    return sectorFilteredSystems
      .map((system, index) => {
        const coordinate = formatSystemCoordinate(system);
        const freeSlots = system.planets.filter((planet) => !planet.ownerId).length;
        const ownerSummary = buildOwnerSummary(system.id, system.planets, players, alliances);
        const systemBiome = system.biomeId ? BIOMES[system.biomeId] : undefined;
        const haystack = [
          coordinate,
          system.displayName,
          system.biomeId ?? '',
          systemBiome?.name?.toLowerCase() ?? '',
          ...system.planets.map((planet) => planet.name.toLowerCase()),
          ...system.planets.map((planet) => {
            const player = players.find((entry) => entry.id === planet.ownerId);
            return player?.name.toLowerCase() ?? '';
          }),
          ...system.planets.map((planet) => {
            const alliance = alliances.find((entry) => entry.id === planet.allianceId);
            return alliance?.tag.toLowerCase() ?? '';
          }),
        ]
          .join(' ')
          .toLowerCase();

        const passesSearch = term.length === 0 || haystack.includes(term);
        const passesBiome =
          biomeFilter === 'all' || system.planets.some((planet) => planet.biome === biomeFilter);
        const passesMine = !onlyMine || system.planets.some((planet) => planet.ownerId === currentPlayerId);
        const passesFree = !onlyFree || freeSlots > 0;
        const passesAlliance =
          selectedAllianceSet.size === 0 ||
          system.planets.some((planet) => planet.allianceId && selectedAllianceSet.has(planet.allianceId));

        if (!(passesSearch && passesBiome && passesMine && passesFree && passesAlliance)) {
          return null;
        }

        return {
          id: system.id,
          coordinate,
          systemName: system.displayName,
          freeSlots,
          owners: ownerSummary.owners,
          extraOwnerCount: ownerSummary.extra,
          systemIndex: index,
          biomeId: system.biomeId,
          biomeName: systemBiome?.name,
          biomeAccent: systemBiome?.palette.accent,
        };
      })
      .filter((entry): entry is TableRow => Boolean(entry));
  }, [
    alliances,
    biomeFilter,
    currentPlayerId,
    onlyFree,
    onlyMine,
    players,
    searchTerm,
    sectorFilteredSystems,
    selectedAllianceSet,
  ]);

  const selectedIndex = tableRows.findIndex((row) => row.id === selectedSystemId);
  const filteredSystemIds = useMemo(() => new Set(tableRows.map((row) => row.id)), [tableRows]);

  const focusChunkForSystem = useCallback(
    (system: GalaxySystem | null) => {
      if (!system || !sectorBounds) {
        return;
      }
      const qIndex = Math.min(
        chunkCounts.q - 1,
        Math.max(0, Math.floor((system.sectorQ - sectorBounds.minQ) / SECTOR_CHUNK_SIZE)),
      );
      const rIndex = Math.min(
        chunkCounts.r - 1,
        Math.max(0, Math.floor((system.sectorR - sectorBounds.minR) / SECTOR_CHUNK_SIZE)),
      );
      setSectorChunk((prev) => {
        if (prev.qIndex === qIndex && prev.rIndex === rIndex) {
          return prev;
        }
        return { qIndex, rIndex };
      });
    },
    [chunkCounts, sectorBounds],
  );

  useEffect(() => {
    if (selectedSystem) {
      focusChunkForSystem(selectedSystem);
    }
  }, [focusChunkForSystem, selectedSystem]);

  const handleRowSelect = (row: TableRow) => {
    const system = systems.find((entry) => entry.id === row.id);
    if (system) {
      focusChunkForSystem(system);
    }
    setSelectedSystemId(row.id);
    setModalSystemId(row.id);
    setZoom((value) => (value < 1.4 ? 1.4 : value));
  };

  const handleMapSelect = (system: GalaxySystem) => {
    focusChunkForSystem(system);
    setSelectedSystemId(system.id);
    setModalSystemId(system.id);
  };

  const currentPlayer = players.find((player) => player.id === currentPlayerId) ?? null;
  const currentAllianceId = currentPlayer?.allianceId;
  const getPlayerName = (playerId?: string) => players.find((player) => player.id === playerId)?.name ?? 'Frei';
  const getAllianceTag = (allianceId?: string) => alliances.find((alliance) => alliance.id === allianceId)?.tag;

  const legendBiomes = useMemo(
    () => ALL_BIOMES.map((biome) => ({ id: biome.id, label: biome.name, fill: biome.palette.base })),
    [],
  );
  const legendAlliances = alliances.map((alliance) => ({ id: alliance.id, tag: alliance.tag, color: alliance.color }));
  const shareCoordinate = (coordinate: string) => navigator.clipboard?.writeText(coordinate).catch(() => undefined);

  const toggleAllianceHighlight = (allianceId: string) => {
    setSelectedAllianceIds((current) =>
      current.includes(allianceId) ? current.filter((id) => id !== allianceId) : [...current, allianceId],
    );
  };

  const clearAllianceHighlights = () => {
    setSelectedAllianceIds([]);
  };

  const handlePlanMission = (planetId: string, type: MissionType) => {
    const planet = selectedSystem?.planets.find((entry) => entry.id === planetId);
    if (!planet || !selectedSystem) {
      return;
    }
    planMission({ targetPlanetId: planet.id, missionType: type });
  };

  return (
    <section className="space-y-6 pb-16">
      <header className="space-y-1">
        <h2 className="text-[clamp(1.8rem,1.2vw+1.5rem,2.4rem)] font-cinzel text-yellow-300">Galaxie v3</h2>
        <p className="text-sm text-gray-300">
          Filtere Systeme für 100+ Kommandanten, nutze Deep-Links und plane Einsätze direkt auf der Karte.
        </p>
      </header>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-yellow-800/30 bg-black/45 p-5 shadow-xl">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Koordinaten, Spieler oder Allianz"
                className={`w-full rounded-md border border-yellow-800/40 bg-black/40 px-3 py-2 text-sm text-yellow-100 placeholder:text-gray-500 ${FOCUS_OUTLINE.className}`}
              />
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-300">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={onlyMine}
                    onChange={(event) => setOnlyMine(event.target.checked)}
                    className="h-4 w-4 rounded border-yellow-800/40 bg-black/40"
                  />
                  Nur meine
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={onlyFree}
                    onChange={(event) => setOnlyFree(event.target.checked)}
                    className="h-4 w-4 rounded border-yellow-800/40 bg-black/40"
                  />
                  Freie Slots
                </label>
                <select
                  value={biomeFilter}
                  onChange={(event) => setBiomeFilter(event.target.value as PlanetBiome | 'all')}
                  className={`rounded-md border border-yellow-800/40 bg-black/40 px-2 py-1 ${FOCUS_OUTLINE.className}`}
                >
                  <option value="all">Alle Biome</option>
                  {biomeOptions.map(([id, style]) => (
                    <option key={id} value={id}>
                      {style.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-300">
                <label className="inline-flex items-center gap-2">
                  <span>Region Q</span>
                  <select
                    value={sectorChunk.qIndex}
                    onChange={(event) =>
                      setSectorChunk((prev) => ({
                        ...prev,
                        qIndex: Number.parseInt(event.target.value, 10),
                      }))
                    }
                    className={`rounded-md border border-yellow-800/40 bg-black/40 px-2 py-1 ${FOCUS_OUTLINE.className}`}
                  >
                    {sectorChunkOptionsQ.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="inline-flex items-center gap-2">
                  <span>Region R</span>
                  <select
                    value={sectorChunk.rIndex}
                    onChange={(event) =>
                      setSectorChunk((prev) => ({
                        ...prev,
                        rIndex: Number.parseInt(event.target.value, 10),
                      }))
                    }
                    className={`rounded-md border border-yellow-800/40 bg-black/40 px-2 py-1 ${FOCUS_OUTLINE.className}`}
                  >
                    {sectorChunkOptionsR.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex items-center gap-2 text-xs text-gray-300">
                  <span className="uppercase tracking-wide text-yellow-300">Navigation</span>
                  <button
                    type="button"
                    onClick={() => navigateChunk('q', -1)}
                    className={`rounded-md border border-yellow-800/40 bg-black/40 px-2 py-1 text-sm text-gray-200 hover:text-yellow-100 ${FOCUS_OUTLINE.className}`}
                    aria-label="Region links"
                  >
                    ← Q
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateChunk('q', 1)}
                    className={`rounded-md border border-yellow-800/40 bg-black/40 px-2 py-1 text-sm text-gray-200 hover:text-yellow-100 ${FOCUS_OUTLINE.className}`}
                    aria-label="Region rechts"
                  >
                    Q →
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateChunk('r', -1)}
                    className={`rounded-md border border-yellow-800/40 bg-black/40 px-2 py-1 text-sm text-gray-200 hover:text-yellow-100 ${FOCUS_OUTLINE.className}`}
                    aria-label="Region oben"
                  >
                    ↑ R
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateChunk('r', 1)}
                    className={`rounded-md border border-yellow-800/40 bg-black/40 px-2 py-1 text-sm text-gray-200 hover:text-yellow-100 ${FOCUS_OUTLINE.className}`}
                    aria-label="Region unten"
                  >
                    R ↓
                  </button>
                </div>
                {activeSectorRange && (
                  <span className="rounded-md bg-black/40 px-2 py-1 text-xs text-yellow-200">
                    Q {activeSectorRange.qMin}-{activeSectorRange.qMax} | R {activeSectorRange.rMin}-{activeSectorRange.rMax}
                  </span>
                )}
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              {tableRows.length} von {sectorFilteredSystems.length} Systemen im aktuellen Ausschnitt
            </p>
            <div className="mt-4 space-y-2">
              <p className="text-xs uppercase tracking-wide text-yellow-400">Allianzen hervorheben</p>
              <div className="flex flex-wrap gap-2">
                {prominentAlliances.map((alliance) => {
                  const isActive = selectedAllianceIds.includes(alliance.id);
                  return (
                    <button
                      key={alliance.id}
                      type="button"
                      onClick={() => toggleAllianceHighlight(alliance.id)}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                        isActive
                          ? 'border-yellow-300 bg-yellow-500/20 text-yellow-100'
                          : 'border-yellow-800/40 bg-black/40 text-gray-300 hover:text-yellow-100'
                      }`}
                      style={
                        isActive
                          ? { boxShadow: `0 0 0 2px ${alliance.color}`, borderColor: alliance.color }
                          : { borderColor: alliance.color }
                      }
                    >
                      {alliance.tag}
                    </button>
                  );
                })}
                {selectedAllianceIds.length > 0 && (
                  <button
                    type="button"
                    onClick={clearAllianceHighlights}
                    className="rounded-full border border-yellow-800/40 bg-black/40 px-3 py-1 text-xs text-gray-300 hover:text-yellow-100"
                  >
                    Zuruecksetzen
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-yellow-800/30 bg-black/45 p-2 shadow-xl">
            <VirtualList
              rowCount={tableRows.length}
              rowHeight={ROW_HEIGHT}
              height={520}
              renderRow={(index) => {
                const row = tableRows[index];
                if (!row) {
                  return null;
                }
                const isSelected = row.id === selectedSystemId;
                return (
                  <button
                    type="button"
                    onClick={() => handleRowSelect(row)}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl border border-yellow-800/30 bg-black/40 px-4 py-3 text-left text-sm transition-colors ${
                      isSelected ? 'bg-yellow-900/30 text-yellow-100' : 'hover:bg-yellow-800/20 text-gray-200'
                    }`}
                  >
                    <div>
                      <p className="font-cinzel text-yellow-200">{row.coordinate}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs">
                        <span className="text-gray-400">{row.systemName}</span>
                        {row.biomeName && (
                          <span
                            className="rounded-full border px-2 py-0.5 uppercase tracking-wide"
                            style={{
                              borderColor: row.biomeAccent ?? 'rgba(234,179,8,0.6)',
                              color: row.biomeAccent ?? '#facc15',
                              backgroundColor: 'rgba(0,0,0,0.35)',
                            }}
                          >
                            {row.biomeName}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <OwnerChips owners={row.owners} extraCount={row.extraOwnerCount} />
                      <span className="rounded-md bg-black/40 px-2 py-1 text-xs text-yellow-200">Frei: {row.freeSlots}</span>
                    </div>
                  </button>
                );
              }}
              scrollToIndex={selectedIndex >= 0 ? selectedIndex : null}
            />
          </div>
        </div>
        <div className="space-y-4">
          <div className="relative">
            <div className="absolute left-4 top-4 z-[55]">
              <button
                type="button"
                onClick={() => setIsMapExpanded(true)}
                className={`rounded-md border border-yellow-800/40 bg-black/60 px-3 py-1 text-xs uppercase tracking-wide text-yellow-100 hover:bg-yellow-800/40 hover:text-white ${FOCUS_OUTLINE.className}`}
              >
                Karte vergroessern
              </button>
            </div>
            <HexMap
              systems={sectorFilteredSystems}
              players={players}
              alliances={alliances}
              selectedSystemId={selectedSystemId}
              onSelect={handleMapSelect}
              zoom={zoom}
              onZoomChange={setZoom}
              filteredSystemIds={filteredSystemIds}
              highlightedAllianceIds={selectedAllianceIds}
              height={520}
            />
            <div className="absolute bottom-4 right-4 z-40">
              <div className="inline-flex flex-col gap-2 rounded-xl border border-yellow-800/30 bg-black/60 p-2 shadow-lg">
                <button
                  type="button"
                  onClick={() =>
                    setZoom((value) => Math.min(MAX_ZOOM, Number((value + ZOOM_STEP).toFixed(2))))
                  }
                  className={`rounded-md border border-yellow-800/40 px-2 py-1 text-sm text-yellow-100 ${FOCUS_OUTLINE.className}`}
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setZoom((value) => Math.max(MIN_ZOOM, Number((value - ZOOM_STEP).toFixed(2))))
                  }
                  className={`rounded-md border border-yellow-800/40 px-2 py-1 text-sm text-yellow-100 ${FOCUS_OUTLINE.className}`}
                >
                  −
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(1)}
                  className={`rounded-md border border-yellow-800/40 px-2 py-1 text-xs text-yellow-100 ${FOCUS_OUTLINE.className}`}
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
          <GalaxyLegend biomes={legendBiomes} alliances={legendAlliances} />
          <ChatSidebar
            coordinate={selectedSystem ? formatSystemCoordinate(selectedSystem) : undefined}
            onShareCoordinate={shareCoordinate}
          />
        </div>
      </div>
      {modalSystemId && selectedSystem && (
        <SystemModal
          system={selectedSystem}
          onClose={() => setModalSystemId(null)}
          onJumpToPlanet={(_planetId) => {
            setModalSystemId(null);
          }}
          onPlanMission={handlePlanMission}
          onFavorite={(planetId) => favoritePlanet(planetId)}
          getPlayerName={getPlayerName}
          getAllianceTag={getAllianceTag}
          onInspectPlayer={openProfile}
          favorites={favorites}
          currentPlayerId={currentPlayerId}
          currentAllianceId={currentAllianceId}
        />
      )}
      {isMapExpanded && (
        <MapOverlay
          onClose={() => setIsMapExpanded(false)}
          systems={sectorFilteredSystems}
          players={players}
          alliances={alliances}
          selectedSystemId={selectedSystemId}
          onSelect={handleMapSelect}
          zoom={zoom}
          onZoomChange={setZoom}
          filteredSystemIds={filteredSystemIds}
          highlightedAllianceIds={selectedAllianceIds}
          legendBiomes={legendBiomes}
          legendAlliances={legendAlliances}
          activeRange={activeSectorRange}
          onNavigate={navigateChunk}
          chunkCounts={chunkCounts}
          sectorBounds={sectorBounds}
          sectorChunk={sectorChunk}
          onSelectChunk={(qIndex, rIndex) => setSectorChunk({ qIndex, rIndex })}
        />
      )}
    </section>
  );
}
