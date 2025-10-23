import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alliance, GalaxySystem, Player } from '@/types';
import { BIOMES } from '@/constants/biomes';
import { biomeToTileStyle } from '@/lib/hexRender';
import type { TileStyle } from '@/lib/hexRender';
import { axialToPixel, buildHexPath, describeCoordinate, formatSystemCoordinate, getHexHeight } from '@/lib/hex';
import OwnerChips from '@/components/galaxy/OwnerChips';

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
  translatedX: number;
  translatedY: number;
  ownerSummary: OwnerSummary;
  tileStyle: TileStyle;
  fillId: string;
  isFiltered: boolean;
  isHighlighted: boolean;
  highlightColor: string | null;
  highlightedTags: string[];
}

interface LayoutMetadata {
  entries: PositionedSystem[];
  bounds: {
    width: number;
    height: number;
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

const clampComponent = (value: number) => Math.max(0, Math.min(255, value));

const hexToRgb = (hex: string) => {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) {
    return { r: 255, g: 202, b: 105 };
  }
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
};

const rgbToHex = (r: number, g: number, b: number) =>
  `#${clampComponent(r).toString(16).padStart(2, '0')}${clampComponent(g)
    .toString(16)
    .padStart(2, '0')}${clampComponent(b).toString(16).padStart(2, '0')}`;

const blendColors = (colors: string[]): string => {
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
  return rgbToHex(Math.round(r / count), Math.round(g / count), Math.round(b / count));
};

const resolveBiomeStyle = (system: GalaxySystem): TileStyle => {
  const biome = system.biomeId ? BIOMES[system.biomeId] : undefined;
  if (biome) {
    return biomeToTileStyle(biome);
  }
  return {
    fill: '#334155',
    stroke: '#94a3b8',
    accent: '#ffd166',
    decals: undefined,
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
    return { entries: [], bounds: null };
  }

  const alliancesById = new Map(alliances.map((alliance) => [alliance.id, alliance]));

  const rawEntries = systems.map((system) => {
    const { x, y } = axialToPixel(system.axial, HEX_SIZE);
    const ownerSummary = aggregateOwners(system, players, alliances);
    const tileStyle = resolveBiomeStyle(system);
    const fillId = system.biomeId ? `biome-${system.biomeId}` : 'biome-unknown';

    const matchedAllianceIds = new Set<string>();
    system.planets.forEach((planet) => {
      if (planet.allianceId && highlightedAllianceIds.has(planet.allianceId)) {
        matchedAllianceIds.add(planet.allianceId);
      }
    });

    const matchedAlliances = Array.from(matchedAllianceIds)
      .map((id) => alliancesById.get(id))
      .filter((entry): entry is Alliance => Boolean(entry));

    const highlightColor = matchedAlliances.length > 0 ? blendColors(matchedAlliances.map((entry) => entry.color)) : null;
    const highlightedTags = matchedAlliances.map((entry) => entry.tag);

    return {
      system,
      x,
      y,
      ownerSummary,
      tileStyle,
      fillId,
      isFiltered: filteredSystemIds.has(system.id),
      isHighlighted: highlightColor !== null,
      highlightColor,
      highlightedTags,
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
    translatedX: entry.x - initialBounds.minX + PADDING,
    translatedY: entry.y - initialBounds.minY + PADDING,
    ownerSummary: entry.ownerSummary,
    tileStyle: entry.tileStyle,
    fillId: entry.fillId,
    isFiltered: entry.isFiltered,
    isHighlighted: entry.isHighlighted,
    highlightColor: entry.highlightColor,
    highlightedTags: entry.highlightedTags,
  }));

  return {
    entries,
    bounds: { width, height },
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

  const { entries, bounds } = layout;
  const gradientStyles = useMemo(() => {
    const map = new Map<string, TileStyle>();
    entries.forEach(({ fillId, tileStyle }) => {
      if (!map.has(fillId)) {
        map.set(fillId, tileStyle);
      }
    });
    return map;
  }, [entries]);

  useEffect(() => {
    if (!bounds || entries.length === 0) {
      return;
    }

    const fallback = entries.find((entry) => entry.isFiltered) ?? entries[0];
    const target = selectedSystemId
      ? entries.find((entry) => entry.system.id === selectedSystemId) ?? fallback
      : fallback;
    const currentZoom = zoomRef.current;
    const centerX = bounds.width / 2 / currentZoom;
    const centerY = bounds.height / 2 / currentZoom;
    setOffset({ x: centerX - target.translatedX, y: centerY - target.translatedY });
  }, [entries, bounds, selectedSystemId]);

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

  const viewHeight = Math.max(bounds.height, getHexHeight(HEX_SIZE) * 8);

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
          {Array.from(gradientStyles.entries()).map(([id, style]) => (
            <radialGradient key={id} id={id} cx="50%" cy="45%" r="70%">
              <stop offset="0%" stopColor={style.accent} stopOpacity={0.95} />
              <stop offset="65%" stopColor={style.fill} stopOpacity={0.85} />
              <stop offset="100%" stopColor={style.fill} stopOpacity={0.65} />
            </radialGradient>
          ))}
        </defs>
        <rect width="100%" height="100%" fill="url(#map-halo)" rx="18" />
        <rect width="100%" height="100%" fill="url(#starfield)" opacity="0.35" />
        <rect width="100%" height="100%" fill="url(#hex-minor-grid)" opacity="0.28" />
        <g transform={`translate(${offset.x}, ${offset.y}) scale(${zoom})`} className="cursor-grab">
          {entries.map(({ system, translatedX, translatedY, ownerSummary, tileStyle, fillId, isFiltered, isHighlighted, highlightColor, highlightedTags }) => {
            const isSelected = system.id === selectedSystemId;
            const polygonFillOpacity = isHighlighted ? 0.82 : isFiltered ? 0.65 : 0.4;
            const polygonStrokeWidth = isSelected ? 4 : isHighlighted ? 3 : 1.5;
            const baseStroke = tileStyle.stroke;
            const baseFill = `url(#${fillId})`;
            const strokeColor = isSelected ? '#facc15' : isHighlighted && highlightColor ? highlightColor : baseStroke;
            const fillValue = isHighlighted && highlightColor ? highlightColor : baseFill;
            const labelOpacity = isFiltered || isHighlighted ? 1 : 0.55;
            const labelColor = isHighlighted && highlightColor ? highlightColor : tileStyle.accent;
            const showChips = isFiltered || isHighlighted;
            const highlightLabel = highlightColor ? highlightedTags.join(' vs ') : '';
            const biomeName = system.biomeId ? BIOMES[system.biomeId]?.name ?? 'Unbekanntes Biom' : undefined;

            return (
              <g
                key={system.id}
                transform={`translate(${translatedX}, ${translatedY})`}
                onClick={() => onSelect(system)}
                className="cursor-pointer focus:outline-none"
                tabIndex={0}
                aria-label={describeCoordinate(system)}
              >
                <polygon
                  points={buildHexPath(0, 0, HEX_SIZE)}
                  fill={fillValue}
                  fillOpacity={polygonFillOpacity}
                  stroke={strokeColor}
                  strokeWidth={polygonStrokeWidth}
                  style={{ transition: 'fill 180ms ease, stroke 180ms ease' }}
                />
                <polygon points={buildHexPath(0, 0, HEX_SIZE)} fill="url(#hex-glow)" opacity={isHighlighted ? 0.7 : 0.35} />
                <text
                  x={0}
                  y={-HEX_SIZE * 0.1}
                  textAnchor="middle"
                  className="font-cinzel text-[0.75rem]"
                  fill={labelColor}
                  opacity={labelOpacity}
                >
                  {formatSystemCoordinate(system)}
                </text>
                {biomeName && (
                  <text
                    x={0}
                    y={HEX_SIZE * 0.15}
                    textAnchor="middle"
                    className="font-sans text-[0.55rem] uppercase tracking-wide"
                    fill="rgba(255,255,255,0.65)"
                    opacity={labelOpacity}
                  >
                    {biomeName}
                  </text>
                )}
                {showChips && (
                  <foreignObject x={-HEX_SIZE} y={HEX_SIZE * 0.2} width={HEX_SIZE * 2} height={52} pointerEvents="none">
                    <div className="flex flex-col items-center gap-1">
                      <OwnerChips owners={ownerSummary.owners} extraCount={ownerSummary.extraCount} />
                      {highlightColor && highlightLabel && (
                        <div
                          className="rounded-full px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider text-black"
                          style={{ backgroundColor: highlightColor }}
                        >
                          {highlightLabel}
                        </div>
                      )}
                    </div>
                  </foreignObject>
                )}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};

export default React.memo(HexMap);
