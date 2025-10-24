import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Alliance, GalaxySystem, Player } from '@/types';
import { BIOMES } from '@/constants/biomes';
import { biomeToTileStyle } from '@/lib/hexRender';
import type { TileStyle } from '@/lib/hexRender';
import { axialToPixel as axialToPixelCoord, describeCoordinate, formatSystemCoordinate, getHexHeight } from '@/lib/hex';
import HexTile from '@/components/galaxy/tiles/HexTile';
import HexBackground from '@/components/galaxy/HexBackground';
import { createTileTheme, type TileTheme } from '@/lib/hexTheme';
import { hexToRgb, rgbToHex } from '@/lib/color';
import { useSmoothPanZoom, type SmoothPanZoomState } from '@/hooks/useSmoothPanZoom';

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
}

const HEX_SIZE = 48;
const PADDING = HEX_SIZE * 3;
const MIN_ZOOM = 0.35;
const MAX_ZOOM = 3.0;
const LOD_MINOR_GRID = 1.5;
const DEFAULT_MAP_HEIGHT = 460;

const aggregateOwners = (system: GalaxySystem, players: Player[], alliances: Alliance[]): OwnerSummary => {
  const ownerMap = new Map<string, { label: string; color: string; count: number }>();
  system.planets.forEach((planet) => {
    if (!planet.ownerId) {
      return;
    }
    const player = players.find((entry) => entry.id === planet.ownerId);
    const alliance = alliances.find((entry) => entry.id === planet.allianceId);
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

const averageHexColors = (colors: string[]): string => {
  if (colors.length === 0) {
    return '#facc15';
  }
  const { r, g, b } = colors
    .map((color) => hexToRgb(color))
    .reduce(
      (acc, current) => ({
        r: acc.r + current.r,
        g: acc.g + current.g,
        b: acc.b + current.b,
      }),
      { r: 0, g: 0, b: 0 },
    );
  const count = colors.length;
  return rgbToHex({
    r: Math.round(r / count),
    g: Math.round(g / count),
    b: Math.round(b / count),
  });
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
    return { entries: [], bounds: null, contentBounds: null };
  }

  const alliancesById = new Map(alliances.map((alliance) => [alliance.id, alliance]));

  const rawEntries = systems.map((system) => {
    const { x, y } = axialToPixelCoord(system.axial, HEX_SIZE);
    const ownerSummary = aggregateOwners(system, players, alliances);
    const { theme, biomeName } = resolveBiomeVisuals(system);
    const matchedAllianceIds = new Set<string>();
    system.planets.forEach((planet) => {
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

  return {
    entries,
    bounds: { width, height },
    contentBounds,
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

  const { entries, bounds, contentBounds } = layout;

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
    const delta = event.deltaY < 0 ? 0.18 : -0.18;
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
    return entries.filter(
      ({ position }) => position.x >= minX && position.x <= maxX && position.y >= minY && position.y <= maxY,
    );
  }, [bounds, currentOffset.x, currentOffset.y, currentZoom, entries, viewHeight]);

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
        style={{ height }}
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
