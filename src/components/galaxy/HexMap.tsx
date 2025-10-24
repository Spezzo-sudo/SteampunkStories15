import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alliance, GalaxySystem, Player } from '@/types';
import { BIOMES } from '@/constants/biomes';
import { biomeToTileStyle } from '@/lib/hexRender';
import type { TileStyle } from '@/lib/hexRender';
import { axialToPixel, describeCoordinate, formatSystemCoordinate, getHexHeight } from '@/lib/hex';
import HexTile from '@/components/galaxy/tiles/HexTile';
import HexBackground from '@/components/galaxy/HexBackground';
import { createTileTheme, type TileTheme } from '@/lib/hexTheme';
import { hexToRgb, rgbToHex } from '@/lib/color';

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
const MAX_ZOOM = 3.5;
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
    const { x, y } = axialToPixel(system.axial, HEX_SIZE);
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
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const zoomRef = useRef(zoom);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  const highlightedSet = useMemo(() => new Set(highlightedAllianceIds), [highlightedAllianceIds]);

  const layout = useMemo(
    () => buildLayout(systems, players, alliances, filteredSystemIds, highlightedSet),
    [alliances, filteredSystemIds, highlightedSet, players, systems],
  );

  const { entries, bounds, contentBounds } = layout;

  const viewHeight = bounds ? Math.max(bounds.height, getHexHeight(HEX_SIZE) * 8) : getHexHeight(HEX_SIZE) * 8;

  const autoFitRef = useRef(false);

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
      if (Math.abs(zoom - targetZoom) > 0.01) {
        onZoomChange(Number(targetZoom.toFixed(2)));
      }
      const viewWidthWorld = clientWidth / targetZoom;
      const viewHeightWorld = clientHeight / targetZoom;
      const centerX = contentBounds.minX + contentWidth / 2;
      const centerY = contentBounds.minY + contentHeight / 2;
      setOffset({
        x: viewWidthWorld / 2 - centerX,
        y: viewHeightWorld / 2 - centerY,
      });
    }
  }, [bounds, contentBounds, entries.length, onZoomChange, viewHeight, zoom]);

  useEffect(() => {
    if (!bounds || entries.length === 0 || !selectedSystemId) {
      return;
    }

    const targetEntry = entries.find((entry) => entry.system.id === selectedSystemId);
    if (!targetEntry) {
      return;
    }

    const currentZoom = zoomRef.current;
    const svg = svgRef.current;
    const clientWidth = svg?.clientWidth ?? bounds.width;
    const clientHeight = svg?.clientHeight ?? viewHeight;
    const viewWidthWorld = clientWidth / currentZoom;
    const viewHeightWorld = clientHeight / currentZoom;
    setOffset({
      x: viewWidthWorld / 2 - targetEntry.position.x,
      y: viewHeightWorld / 2 - targetEntry.position.y,
    });
  }, [bounds, entries, selectedSystemId, viewHeight]);

  const handleWheel = (event: React.WheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    if (!bounds) {
      return;
    }
    const delta = event.deltaY < 0 ? 0.15 : -0.15;
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number((zoom + delta).toFixed(2))));
    if (next === zoom) {
      return;
    }

    const svgElement = svgRef.current;
    if (svgElement) {
      const rect = svgElement.getBoundingClientRect();
      const cursorX = event.clientX - rect.left;
      const cursorY = event.clientY - rect.top;
      const worldX = cursorX / zoom - offset.x;
      const worldY = cursorY / zoom - offset.y;
      const newOffsetX = cursorX / next - worldX;
      const newOffsetY = cursorY / next - worldY;
      setOffset({ x: newOffsetX, y: newOffsetY });
    }

    onZoomChange(next);
  };

  const handleMouseDown = (event: React.MouseEvent<SVGSVGElement>) => {
    dragStart.current = { x: event.clientX, y: event.clientY };
  };

  const handleMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
    if (!dragStart.current) {
      return;
    }
    const dx = (event.clientX - dragStart.current.x) / zoom;
    const dy = (event.clientY - dragStart.current.y) / zoom;
    dragStart.current = { x: event.clientX, y: event.clientY };
    setOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
  };

  const handleMouseUp = () => {
    dragStart.current = null;
  };

  const visibleEntries = useMemo(() => {
    if (!bounds) {
      return [];
    }
    const padding = HEX_SIZE * 6;
    const worldWidth = bounds.width / zoom;
    const worldHeight = viewHeight / zoom;
    const minX = -offset.x - padding;
    const maxX = minX + worldWidth + padding * 2;
    const minY = -offset.y - padding;
    const maxY = minY + worldHeight + padding * 2;
    return entries.filter(
      ({ position }) => position.x >= minX && position.x <= maxX && position.y >= minY && position.y <= maxY,
    );
  }, [bounds, entries, offset.x, offset.y, viewHeight, zoom]);

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
    <div className="steampunk-glass steampunk-border rounded-lg p-4">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${bounds.width} ${viewHeight}`}
        className="w-full cursor-grab"
        style={{ height }}
        role="presentation"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
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
            <circle cx="2" cy="4" r="0.8" fill="rgba(252,211,77,0.12)" />
            <circle cx="14" cy="12" r="0.6" fill="rgba(252,211,77,0.07)" />
            <circle cx="24" cy="22" r="0.7" fill="rgba(252,211,77,0.09)" />
          </pattern>
          <pattern id="hex-minor-grid" width="60" height="52" patternUnits="userSpaceOnUse">
            <path d="M0 26 L15 0 L45 0 L60 26 L45 52 L15 52 Z" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#map-halo)" rx="18" />
        <rect width="100%" height="100%" fill="url(#starfield)" opacity="0.35" />
        <rect width="100%" height="100%" fill="url(#hex-minor-grid)" opacity="0.28" />
        <g transform={`translate(${offset.x}, ${offset.y}) scale(${zoom})`} className="cursor-grab">
          <HexBackground
            width={bounds.width}
            height={viewHeight}
            zoom={zoom}
            offset={offset}
            hexSize={HEX_SIZE}
          />
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
                zoom={zoom}
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
