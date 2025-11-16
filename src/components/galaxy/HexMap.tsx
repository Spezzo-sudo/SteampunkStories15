import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alliance, GalaxySystem, Player } from '@/types';
import { BIOMES } from '@/constants/biomes';
import { biomeToTileStyle } from '@/lib/hexRender';
import type { TileStyle } from '@/lib/hexRender';
import { axialToPixel as axialToPixelCoord, describeCoordinate, formatSystemCoordinate, getHexHeight } from '@/lib/hex';
import HexTile from '@/components/galaxy/tiles/HexTile';
import HexBackground from '@/components/galaxy/HexBackground';
import HexTerrainCanvas from '@/components/galaxy/terrain/HexTerrainCanvas';
import type { TerrainTile } from '@/components/galaxy/terrain/HexTerrainCanvas.types';
import { createTileTheme, type TileTheme } from '@/lib/hexTheme';
import { hexToRgb, rgbToHex } from '@/lib/color';
import { useSmoothPanZoom, type SmoothPanZoomState } from '@/hooks/useSmoothPanZoom';
import { loadTerrainFromTiled } from '@/lib/tiled';

interface HexMapProps {
  systems: GalaxySystem[];
  players: Player[];
  alliances: Alliance[];
  filteredSystemIds: Set<string>;
  highlightedAllianceIds: string[];
  selectedSystemId?: string | null;
  onSelect: (system: GalaxySystem) => void;
  zoom: number;
  onZoomChange: (value: number) => void;
  height?: number;
}

interface OwnerSummary {
  owners: { id: string; label: string; color: string }[];
  extraCount: number;
}

interface PositionedSystem {
  system: GalaxySystem;
  position: { x: number; y: number };
  ownerSummary: OwnerSummary;
  tileTheme: TileTheme;
  matchesFilter: boolean;
  isHighlighted: boolean;
  highlightColor: string | null;
  highlightTags: string[];
  biomeName?: string;
}

interface BucketIndex {
  size: number;
  entries: Map<string, PositionedSystem[]>;
}

interface LayoutMetadata {
  entries: PositionedSystem[];
  bounds: {
    width: number;
    height: number;
  } | null;
  contentBounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  } | null;
  buckets: BucketIndex | null;
}

const HEX_SIZE = 48;
const PADDING = HEX_SIZE * 3;
const MIN_ZOOM = 0.35;
const MAX_ZOOM = 3.0;
const LOD_MINOR_GRID = 1.5;
const DEFAULT_MAP_HEIGHT = 460;
const BUCKET_SIZE = 256;
const ZOOM_IN_FACTOR = 1.1;
const ZOOM_OUT_FACTOR = 0.9;

const clampZoom = (value: number) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value));

const aggregateOwners = (
  system: GalaxySystem,
  playersById: Map<string, Player>,
  alliancesById: Map<string, Alliance>,
): OwnerSummary => {
  const ownerMap = new Map<string, { label: string; color: string; count: number }>();
  system.planets?.forEach((planet) => {
    if (!planet.ownerId) {
      return;
    }
    const player = playersById.get(planet.ownerId);
    const alliance = planet.allianceId ? alliancesById.get(planet.allianceId) : undefined;
    const label = alliance ? alliance.tag : player?.name ?? 'Unbekannt';
    const color = alliance?.color ?? player?.color ?? '#facc15';
    const current = ownerMap.get(planet.ownerId);
    if (current) {
      current.count += 1;
    } else {
      ownerMap.set(planet.ownerId, { label, color, count: 1 });
    }
  });

  const owners = Array.from(ownerMap.values())
    .sort((a, b) => b.count - a.count)
    .map((entry, index) => ({ id: `${system.id}-owner-${index}`, label: entry.label, color: entry.color }));

  return {
    owners: owners.slice(0, 3),
    extraCount: Math.max(0, owners.length - 3),
  };
};

const srgbToLinear = (channel: number): number => {
  const normalized = channel / 255;
  if (normalized <= 0.04045) {
    return normalized / 12.92;
  }
  return Math.pow((normalized + 0.055) / 1.055, 2.4);
};

const linearToSrgb = (channel: number): number => {
  const clamped = Math.max(0, Math.min(1, channel));
  if (clamped <= 0.0031308) {
    return clamped * 12.92 * 255;
  }
  return (1.055 * Math.pow(clamped, 1 / 2.4) - 0.055) * 255;
};

const averageHexColors = (colors: string[]): string => {
  if (colors.length === 0) {
    // Debug fallback: magenta indicates empty color array
    return '#ff00ff';
  }
  const valid = colors
    .map((color) => hexToRgb(color))
    .filter((entry): entry is NonNullable<ReturnType<typeof hexToRgb>> => entry != null);
  if (valid.length === 0) {
    // Debug fallback: magenta indicates invalid color format(s)
    console.warn('[HexMap] Invalid color values detected in alliance/player colors:', colors);
    return '#ff00ff';
  }
  const { red, green, blue } = valid.reduce(
    (acc, current) => ({
      red: acc.red + srgbToLinear(current.red),
      green: acc.green + srgbToLinear(current.green),
      blue: acc.blue + srgbToLinear(current.blue),
    }),
    { red: 0, green: 0, blue: 0 },
  );
  const count = valid.length;
  return rgbToHex(
    Math.round(linearToSrgb(red / count)),
    Math.round(linearToSrgb(green / count)),
    Math.round(linearToSrgb(blue / count)),
  );
};

const resolveBiomeVisuals = (
  system: GalaxySystem,
): { theme: TileTheme; biomeName?: string } => {
  const biome = system.biomeId ? BIOMES[system.biomeId] : undefined;
  const style: TileStyle = biome
    ? biomeToTileStyle(biome)
    : {
        fill: '#334155',
        stroke: '#94a3b8',
        accent: '#ffd166',
        decals: undefined,
      };
  return {
    theme: createTileTheme(style),
    biomeName: biome?.name,
  };
};

const buildLayout = (
  systems: GalaxySystem[],
  players: Player[],
  alliances: Alliance[],
  filteredSystemIds: Set<string>,
  highlightedAllianceIds: Set<string>,
): LayoutMetadata => {
  if (systems.length === 0) {
    return { entries: [], bounds: null, contentBounds: null, buckets: null };
  }

  const alliancesById = new Map(alliances.map((alliance) => [alliance.id, alliance]));
  const playersById = new Map(players.map((player) => [player.id, player]));

  const rawEntries = systems.map((system) => {
    const { x, y } = axialToPixelCoord(system.axial, HEX_SIZE);
    const ownerSummary = aggregateOwners(system, playersById, alliancesById);
    const { theme, biomeName } = resolveBiomeVisuals(system);
    const matchedAllianceIds = new Set<string>();
    system.planets?.forEach((planet) => {
      if (planet.allianceId && highlightedAllianceIds.has(planet.allianceId)) {
        matchedAllianceIds.add(planet.allianceId);
      }
    });

    const matchedAlliances = Array.from(matchedAllianceIds)
      .map((id) => alliancesById.get(id))
      .filter((entry): entry is Alliance => Boolean(entry));

    const highlightColor =
      matchedAlliances.length > 0 ? averageHexColors(matchedAlliances.map((entry) => entry.color)) : null;
    const highlightTags = matchedAlliances.map((entry) => entry.tag);

    return {
      system,
      x,
      y,
      ownerSummary,
      tileTheme: theme,
      biomeName,
      matchesFilter: filteredSystemIds.has(system.id),
      highlightColor,
      highlightTags,
    };
  });

  const initialBounds = rawEntries.reduce(
    (acc, entry) => ({
      minX: Math.min(acc.minX, entry.x),
      maxX: Math.max(acc.maxX, entry.x),
      minY: Math.min(acc.minY, entry.y),
      maxY: Math.max(acc.maxY, entry.y),
    }),
    {
      minX: rawEntries[0].x,
      maxX: rawEntries[0].x,
      minY: rawEntries[0].y,
      maxY: rawEntries[0].y,
    },
  );

  const width = initialBounds.maxX - initialBounds.minX + PADDING * 2;
  const height = initialBounds.maxY - initialBounds.minY + PADDING * 2;

  const entries: PositionedSystem[] = rawEntries.map((entry) => ({
    system: entry.system,
    position: {
      x: entry.x - initialBounds.minX + PADDING,
      y: entry.y - initialBounds.minY + PADDING,
    },
    ownerSummary: entry.ownerSummary,
    tileTheme: entry.tileTheme,
    matchesFilter: entry.matchesFilter,
    isHighlighted: entry.highlightColor !== null,
    highlightColor: entry.highlightColor,
    highlightTags: entry.highlightTags,
    biomeName: entry.biomeName,
  }));

  const contentBounds = entries.reduce(
    (acc, entry) => ({
      minX: Math.min(acc.minX, entry.position.x),
      maxX: Math.max(acc.maxX, entry.position.x),
      minY: Math.min(acc.minY, entry.position.y),
      maxY: Math.max(acc.maxY, entry.position.y),
    }),
    {
      minX: entries[0].position.x,
      maxX: entries[0].position.x,
      minY: entries[0].position.y,
      maxY: entries[0].position.y,
    },
  );

  const buckets = new Map<string, PositionedSystem[]>();
  const bucketSize = BUCKET_SIZE;
  entries.forEach((entry) => {
    const bucketX = Math.floor(entry.position.x / bucketSize);
    const bucketY = Math.floor(entry.position.y / bucketSize);
    const key = `${bucketX},${bucketY}`;
    const bucketEntries = buckets.get(key);
    if (bucketEntries) {
      bucketEntries.push(entry);
    } else {
      buckets.set(key, [entry]);
    }
  });

  return {
    entries,
    bounds: { width, height },
    contentBounds,
    buckets: { size: bucketSize, entries: buckets },
  };
};

/**
 * Interaktive Hex-Karte der Galaxie mit Zoom-, Pan- und Highlight-Unterstützung.
 */
const HexMap: React.FC<HexMapProps> = ({
  systems,
  players,
  alliances,
  filteredSystemIds,
  highlightedAllianceIds,
  selectedSystemId,
  onSelect,
  zoom,
  onZoomChange,
  height = DEFAULT_MAP_HEIGHT,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragPointer = useRef<{ x: number; y: number } | null>(null);
  const panZoomStateRef = useRef<SmoothPanZoomState | null>(null);
  const [terrainTiles, setTerrainTiles] = useState<TerrainTile[]>([]);

  const initialPanZoom = useRef<SmoothPanZoomState>({ x: 0, y: 0, z: zoom }).current;
  const handlePanZoomChange = useCallback(
    (next: SmoothPanZoomState) => {
      if (Math.abs(next.z - zoom) > 0.001) {
        onZoomChange(Number(next.z.toFixed(2)));
      }
    },
    [onZoomChange, zoom],
  );

  const {
    state: panZoomState,
    queuePan,
    queueZoom,
    setImmediate: setPanZoom,
    sync: syncPanZoom,
  } = useSmoothPanZoom(initialPanZoom, {
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM,
    onChange: handlePanZoomChange,
  });

  useEffect(() => {
    panZoomStateRef.current = panZoomState;
  }, [panZoomState]);

  useEffect(() => {
    let active = true;
    loadTerrainFromTiled('/maps/galaxy.tmj')
      .then((tiles) => {
        if (active) {
          setTerrainTiles(tiles);
        }
      })
      .catch((error) => {
        console.error('Failed to load terrain map', error);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!panZoomStateRef.current) {
      return;
    }
    if (Math.abs(panZoomStateRef.current.z - zoom) > 0.001) {
      syncPanZoom({ ...panZoomStateRef.current, z: zoom });
    }
  }, [syncPanZoom, zoom]);

  const highlightedSet = useMemo(() => new Set(highlightedAllianceIds), [highlightedAllianceIds]);

  const layout = useMemo(
    () => buildLayout(systems, players, alliances, filteredSystemIds, highlightedSet),
    [alliances, filteredSystemIds, highlightedSet, players, systems],
  );

  const { entries, bounds, contentBounds, buckets } = layout;

  const viewHeight = bounds ? Math.max(bounds.height, getHexHeight(HEX_SIZE) * 8) : getHexHeight(HEX_SIZE) * 8;
  const currentZoom = panZoomState.z;
  const currentOffset = { x: panZoomState.x, y: panZoomState.y };

  const autoFitRef = useRef(false);
  const zoomRef = useRef(currentZoom);

  useEffect(() => {
    zoomRef.current = currentZoom;
  }, [currentZoom]);

  useEffect(() => {
    if (!bounds || !contentBounds || entries.length === 0) {
      return;
    }
    const svg = svgRef.current;
    const clientWidth = svg?.clientWidth ?? bounds.width;
    const clientHeight = svg?.clientHeight ?? viewHeight;
    const padding = HEX_SIZE * 2;
    const contentWidth = Math.max(1, contentBounds.maxX - contentBounds.minX);
    const contentHeight = Math.max(1, contentBounds.maxY - contentBounds.minY);
    const targetZoom = Math.min(
      MAX_ZOOM,
      Math.max(
        MIN_ZOOM,
        Math.min(clientWidth / (contentWidth + padding), clientHeight / (contentHeight + padding)),
      ),
    );

    if (!autoFitRef.current || Math.abs(zoomRef.current - targetZoom) > 0.05) {
      autoFitRef.current = true;
      const viewWidthWorld = clientWidth / targetZoom;
      const viewHeightWorld = clientHeight / targetZoom;
      const centerX = contentBounds.minX + contentWidth / 2;
      const centerY = contentBounds.minY + contentHeight / 2;
      setPanZoom({
        x: viewWidthWorld / 2 - centerX,
        y: viewHeightWorld / 2 - centerY,
        z: targetZoom,
      });
    }
  }, [bounds, contentBounds, entries.length, setPanZoom, viewHeight]);

  useEffect(() => {
    if (!bounds || entries.length === 0 || !selectedSystemId) {
      return;
    }

    const targetEntry = entries.find((entry) => entry.system.id === selectedSystemId);
    if (!targetEntry) {
      return;
    }

    const current = zoomRef.current;
    const svg = svgRef.current;
    const clientWidth = svg?.clientWidth ?? bounds.width;
    const clientHeight = svg?.clientHeight ?? viewHeight;
    const viewWidthWorld = clientWidth / current;
    const viewHeightWorld = clientHeight / current;
    const nextX = viewWidthWorld / 2 - targetEntry.position.x;
    const nextY = viewHeightWorld / 2 - targetEntry.position.y;

    if (Math.abs(nextX - panZoomState.x) > 0.01 || Math.abs(nextY - panZoomState.y) > 0.01) {
      setPanZoom({
        x: nextX,
        y: nextY,
        z: current,
      });
    }
  }, [bounds, entries, panZoomState.x, panZoomState.y, selectedSystemId, setPanZoom, viewHeight]);

  const handleWheel = (event: React.WheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    if (!bounds) {
      return;
    }
    const svgElement = svgRef.current;
    if (!svgElement) {
      return;
    }
    const rect = svgElement.getBoundingClientRect();
    const cursorX = event.clientX - rect.left;
    const cursorY = event.clientY - rect.top;
    const worldX = cursorX / currentZoom - panZoomState.x;
    const worldY = cursorY / currentZoom - panZoomState.y;
    const baseFactor = event.deltaY < 0 ? ZOOM_IN_FACTOR : ZOOM_OUT_FACTOR;
    const scaledFactor = Math.pow(baseFactor, Math.min(1.8, Math.abs(event.deltaY) / 120));
    const targetZoom = clampZoom(currentZoom * scaledFactor);
    const delta = targetZoom - currentZoom;
    if (Math.abs(delta) < 0.0001) {
      return;
    }
    queueZoom(delta, { cursorX, cursorY, worldX, worldY });
  };

  const handlePointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragPointer.current = { x: event.clientX, y: event.clientY };
  };

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!dragPointer.current || event.buttons !== 1) {
      return;
    }
    const dx = event.clientX - dragPointer.current.x;
    const dy = event.clientY - dragPointer.current.y;
    dragPointer.current = { x: event.clientX, y: event.clientY };
    queuePan(dx, dy);
  };

  const handlePointerUp = (event: React.PointerEvent<SVGSVGElement>) => {
    event.currentTarget.releasePointerCapture(event.pointerId);
    dragPointer.current = null;
  };


  const visibleEntries = useMemo(() => {
    if (!bounds) {
      return [];
    }
    const padding = HEX_SIZE * 6;
    const worldWidth = bounds.width / currentZoom;
    const worldHeight = viewHeight / currentZoom;
    const minX = -currentOffset.x - padding;
    const maxX = minX + worldWidth + padding * 2;
    const minY = -currentOffset.y - padding;
    const maxY = minY + worldHeight + padding * 2;

    if (!buckets) {
      return entries.filter(
        ({ position }) => position.x >= minX && position.x <= maxX && position.y >= minY && position.y <= maxY,
      );
    }

    const { size, entries: bucketEntries } = buckets;
    const startBucketX = Math.floor(minX / size);
    const endBucketX = Math.floor(maxX / size);
    const startBucketY = Math.floor(minY / size);
    const endBucketY = Math.floor(maxY / size);
    const candidates: PositionedSystem[] = [];

    for (let bucketX = startBucketX; bucketX <= endBucketX; bucketX += 1) {
      for (let bucketY = startBucketY; bucketY <= endBucketY; bucketY += 1) {
        const bucketKey = `${bucketX},${bucketY}`;
        const bucket = bucketEntries.get(bucketKey);
        if (!bucket) {
          continue;
        }
        for (const entry of bucket) {
          const { x, y } = entry.position;
          if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
            candidates.push(entry);
          }
        }
      }
    }

    return candidates;
  }, [bounds, buckets, currentOffset.x, currentOffset.y, currentZoom, entries, viewHeight]);

  if (!bounds || entries.length === 0) {
    const fallbackHeight = getHexHeight(HEX_SIZE) * 6;
    const fallbackWidth = HEX_SIZE * 12;
    return (
      <div className="steampunk-glass steampunk-border rounded-lg p-4">
        <svg viewBox={`0 0 ${fallbackWidth} ${fallbackHeight}`} style={{ height }} className="w-full" role="presentation">
          <title>Keine Systeme sichtbar</title>
          <text x="50%" y="50%" textAnchor="middle" className="font-cinzel fill-yellow-200 text-[0.85rem]">
            Keine Systeme sichtbar
          </text>
        </svg>
      </div>
    );
  }

  return (
    <div className="relative steampunk-glass steampunk-border rounded-lg p-4">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${bounds.width} ${viewHeight}`}
        className="w-full cursor-grab"
        style={{ height, touchAction: 'none' }}
        role="presentation"
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <defs>
          <radialGradient id="hex-glow" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.25)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
          <radialGradient id="map-halo" cx="50%" cy="50%" r="75%">
            <stop offset="0%" stopColor="rgba(14, 14, 28, 0.85)" />
            <stop offset="100%" stopColor="rgba(4, 7, 16, 0.95)" />
          </radialGradient>
          <pattern id="starfield" width="28" height="28" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="4" r="0.8" fill="rgba(252,211,77,0.10)" />
            <circle cx="14" cy="12" r="0.6" fill="rgba(252,211,77,0.06)" />
            <circle cx="24" cy="22" r="0.7" fill="rgba(252,211,77,0.08)" />
          </pattern>
          <pattern id="hex-minor-grid" width="60" height="52" patternUnits="userSpaceOnUse">
            <path
              d="M0,26 L15,0 L45,0 L60,26 L45,52 L15,52 Z"
              fill="none"
              stroke="#94a3b8"
              strokeOpacity="0.12"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#map-halo)" rx="18" />
        <rect width="100%" height="100%" fill="url(#starfield)" opacity="0.15" />
        {currentZoom >= LOD_MINOR_GRID && (
          <rect width="100%" height="100%" fill="url(#hex-minor-grid)" />
        )}
        <g transform={`translate(${currentOffset.x}, ${currentOffset.y}) scale(${currentZoom})`} className="cursor-grab">
          {terrainTiles.length > 0 && (
            <foreignObject
              x={0}
              y={0}
              width={bounds.width}
              height={viewHeight}
              pointerEvents="none"
            >
              <HexTerrainCanvas
                tiles={terrainTiles}
                width={bounds.width}
                height={viewHeight}
                zoom={currentZoom}
                offset={currentOffset}
                size={HEX_SIZE}
              />
            </foreignObject>
          )}
          <HexBackground width={bounds.width} height={viewHeight} zoom={currentZoom} offset={currentOffset} size={HEX_SIZE} />
          {visibleEntries.map((entry) => {
            const {
              system,
              position,
              ownerSummary,
              tileTheme,
              matchesFilter,
              isHighlighted,
              highlightColor,
              highlightTags,
              biomeName,
            } = entry;
            const isSelected = system.id === selectedSystemId;
            const dimmed = !matchesFilter && !isHighlighted && !isSelected;
            const ownersVisible = matchesFilter || isHighlighted;
            const highlightLabel =
              isHighlighted && highlightTags.length > 0 ? highlightTags.join(' vs ') : undefined;

            const handleKeyDown = (event: React.KeyboardEvent<SVGGElement>) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect(system);
              }
            };

            return (
              <HexTile
                key={system.id}
                position={position}
                size={HEX_SIZE}
                theme={tileTheme}
                zoom={currentZoom}
                selected={isSelected}
                highlighted={isHighlighted}
                highlightColor={highlightColor}
                dimmed={dimmed}
                coordinateLabel={formatSystemCoordinate(system)}
                secondaryLabel={biomeName}
                highlightLabel={highlightLabel}
                owners={ownersVisible ? ownerSummary.owners : undefined}
                extraOwnerCount={ownersVisible ? ownerSummary.extraCount : 0}
                onClick={() => onSelect(system)}
                onKeyDown={handleKeyDown}
                tabIndex={0}
                role="button"
                className="cursor-pointer focus:outline-none"
                aria-label={describeCoordinate(system)}
              />
            );
          })}
        </g>
      </svg>
    </div>
  );
};

export default React.memo(HexMap);






