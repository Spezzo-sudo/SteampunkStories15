import React, { useId, useMemo } from 'react';
import type { OwnerChipEntry } from '@/components/galaxy/OwnerChips';
import type { TileTheme } from '@/lib/hexTheme';
import { withAlpha } from '@/lib/color';

type HexTileProps = {
  position: { x: number; y: number };
  size: number;
  theme: TileTheme;
  zoom: number;
  selected?: boolean;
  highlighted?: boolean;
  highlightColor?: string | null;
  dimmed?: boolean;
  coordinateLabel?: string;
  secondaryLabel?: string;
  highlightLabel?: string;
  owners?: OwnerChipEntry[];
  extraOwnerCount?: number;
} & Omit<React.SVGAttributes<SVGGElement>, 'children'>;

const EXTRUSION_MIN = 4;
const LOD_EXTRUSION = 0.7;
const LOD_DECOR = 1.0;
const LOD_LABELS = 1.1;
const LOD_OWNER_BADGES = 1.2;

/**
 * Renders a stylised, extruded hex tile that reflects the current biome theme.
 */
const HexTile: React.FC<HexTileProps> = ({
  position,
  size,
  theme,
  zoom,
  selected = false,
  highlighted = false,
  highlightColor,
  dimmed = false,
  coordinateLabel,
  secondaryLabel,
  highlightLabel,
  owners,
  extraOwnerCount = 0,
  ...groupProps
}) => {
  const id = useId();
  const depth = useMemo(
    () => Math.max(EXTRUSION_MIN, Math.round(size * 0.35 * Math.min(1.15, zoom + 0.15))),
    [size, zoom],
  );

  const points = useMemo(() => buildHexPoints(size), [size]);
  const extrudedFaces = useMemo(() => buildExtrudedFaces(points, depth), [points, depth]);

  const showExtrusion = zoom >= LOD_EXTRUSION;
  const showDecor = zoom >= LOD_DECOR;
  const showLabels = zoom >= LOD_LABELS;
  const showOwnerBadges = zoom >= LOD_OWNER_BADGES && owners && owners.length > 0;

  const baseStroke = highlightColor ?? theme.edge;
  const strokeOpacity = highlighted ? 1 : dimmed ? 0.65 : 0.85;
  const strokeWidth = selected ? 2.6 : highlighted ? 2.2 : 1.4;
  const topOpacity = dimmed ? 0.52 : highlighted ? 0.88 : 0.7;

  const gradTop = `grad-top-${id}`;
  const gradEdge = `grad-edge-${id}`;
  const gradAo = `grad-ao-${id}`;
  const filterShadow = `filter-shadow-${id}`;
  const filterNoise = `filter-noise-${id}`;

  const accent = highlightColor ?? theme.accent;
  const ownerBadgeStartY = size * 0.62 + (showExtrusion ? depth * 0.3 : 0);
  const ownerCircleRadius = Math.max(3, Math.round(size * 0.09));

  return (
    <g transform={`translate(${position.x}, ${position.y})`} {...groupProps}>
      <defs>
        <linearGradient id={gradTop} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={theme.topHighlight} />
          <stop offset="100%" stopColor={theme.topBase} />
        </linearGradient>
        <linearGradient id={gradEdge} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={withAlpha(accent, 0.8)} />
          <stop offset="100%" stopColor={withAlpha(theme.edge, 0.05)} />
        </linearGradient>
        <radialGradient id={gradAo} cx="50%" cy="50%" r="68%">
          <stop offset="65%" stopColor={withAlpha('#000000', 0)} />
          <stop offset="100%" stopColor={withAlpha(theme.ambientOcclusion, 0.7)} />
        </radialGradient>
        <filter id={filterShadow} x="-45%" y="-45%" width="190%" height="220%">
          <feDropShadow
            dx="0"
            dy={Math.round(depth * 0.35)}
            stdDeviation="3"
            floodColor={withAlpha('#000000', 0.6)}
          />
        </filter>
        <filter id={filterNoise} x="-12%" y="-12%" width="124%" height="124%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="2.4"
            numOctaves="1"
            result="noise"
            seed="17"
          />
          <feColorMatrix in="noise" type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="table" tableValues="0 0.028 0.045 0.0" />
          </feComponentTransfer>
        </filter>
      </defs>

      {showExtrusion &&
        extrudedFaces.map((face, index) => (
          <polygon
            key={`face-${index}`}
            points={faceToAttribute(face)}
            fill={index === 1 ? theme.sideShadow : theme.sideLight}
            filter={`url(#${filterShadow})`}
            opacity={dimmed ? 0.6 : 0.92}
          />
        ))}

      <g filter={`url(#${filterNoise})`}>
        <polygon
          points={pointsToAttribute(points)}
          fill={`url(#${gradTop})`}
          stroke={baseStroke}
          strokeOpacity={strokeOpacity}
          strokeWidth={strokeWidth}
          opacity={topOpacity}
          vectorEffect="non-scaling-stroke"
        />
        <polyline
          points={`${points[5].join(',')} ${points[0].join(',')} ${points[1].join(',')}`}
          stroke={`url(#${gradEdge})`}
          strokeWidth={Math.max(1.5, size * 0.04)}
          strokeLinecap="round"
          fill="none"
          opacity={dimmed ? 0.45 : 0.85}
        />
        <polygon points={pointsToAttribute(points)} fill={`url(#${gradAo})`} opacity={0.32} />
      </g>

      {showDecor && (
        <g opacity={dimmed ? 0.55 : 0.9} aria-label="Tile decor">
          <polygon
            points={`0,-${Math.max(6, size * 0.4)} ${size * 0.08},-${size * 0.14} 0,${size * 0.05} -${size * 0.08},-${size * 0.14}`}
            fill={accent}
          />
          <circle cx={size * 0.28} cy={-size * 0.1} r={Math.max(1.6, size * 0.05)} fill={accent} />
          <circle
            cx={-size * 0.3}
            cy={-size * 0.06}
            r={Math.max(1.1, size * 0.04)}
            fill={withAlpha(accent, 0.75)}
          />
        </g>
      )}

      {showLabels && (coordinateLabel || secondaryLabel) && (
        <g aria-label="Tile labels">
          {coordinateLabel && (
            <text
              x={0}
              y={-size * 0.1}
              textAnchor="middle"
              fontFamily="Cinzel, serif"
              fontSize={Math.max(10, size * 0.3)}
              fill={withAlpha('#f8fafc', dimmed ? 0.52 : 0.9)}
              stroke={withAlpha('#000000', 0.7)}
              strokeWidth={0.8}
              paintOrder="stroke"
            >
              {coordinateLabel}
            </text>
          )}
          {secondaryLabel && (
            <text
              x={0}
              y={size * 0.18}
              textAnchor="middle"
              fontFamily="Inter, system-ui"
              fontSize={Math.max(8, size * 0.22)}
              fill={withAlpha('#e2e8f0', dimmed ? 0.45 : 0.78)}
              letterSpacing="0.08em"
            >
              {secondaryLabel.toUpperCase()}
            </text>
          )}
        </g>
      )}

      {highlightLabel && (
        <g transform={`translate(0, ${size * -0.6})`} aria-label="Highlight label">
          <rect
            x={-size * 0.55}
            y={-size * 0.18}
            width={size * 1.1}
            height={size * 0.28}
            rx={size * 0.08}
            fill={withAlpha(accent, 0.85)}
            stroke={withAlpha('#000000', 0.55)}
            strokeWidth={0.6}
          />
          <text
            x={0}
            y={-size * 0.02}
            textAnchor="middle"
            fontFamily="Inter, system-ui"
            fontSize={Math.max(8, size * 0.22)}
            fill="#0f172a"
            fontWeight={600}
            letterSpacing="0.1em"
          >
            {highlightLabel.toUpperCase()}
          </text>
        </g>
      )}

      {showOwnerBadges && (
        <g aria-label="Owner badges" transform={`translate(0, ${ownerBadgeStartY})`}>
          {owners?.map((owner, index) => {
            const offsetX = (index - ((owners.length - 1) / 2)) * ownerCircleRadius * 2.6;
            const initials = owner.label.slice(0, 2).toUpperCase();
            return (
              <g key={owner.id} transform={`translate(${offsetX}, 0)`}>
                <circle
                  r={ownerCircleRadius}
                  fill={withAlpha(owner.color, 0.88)}
                  stroke={withAlpha('#000000', 0.45)}
                  strokeWidth={0.9}
                />
                <text
                  x={0}
                  y={ownerCircleRadius * 0.32}
                  textAnchor="middle"
                  fontFamily="Inter, system-ui"
                  fontSize={ownerCircleRadius * 0.9}
                  fill="#0f172a"
                  fontWeight={700}
                >
                  {initials}
                </text>
                <title>{owner.label}</title>
              </g>
            );
          })}
          {extraOwnerCount > 0 && (
            <g transform="translate(0, 0)">
              <rect
                x={-ownerCircleRadius * 1.5}
                y={-ownerCircleRadius * 1.05}
                width={ownerCircleRadius * 3}
                height={ownerCircleRadius * 2.1}
                rx={ownerCircleRadius * 0.6}
                fill={withAlpha(accent, 0.9)}
                stroke={withAlpha('#000000', 0.45)}
                strokeWidth={0.8}
              />
              <text
                x={0}
                y={ownerCircleRadius * 0.35}
                textAnchor="middle"
                fontFamily="Inter, system-ui"
                fontSize={ownerCircleRadius * 1.1}
                fill="#0f172a"
                fontWeight={700}
              >
                +{extraOwnerCount}
              </text>
            </g>
          )}
        </g>
      )}
    </g>
  );
};

const buildHexPoints = (radius: number): [number, number][] => {
  const vertices: [number, number][] = [];
  for (let i = 0; i < 6; i += 1) {
    const angle = ((60 * i - 30) * Math.PI) / 180;
    vertices.push([Math.cos(angle) * radius, Math.sin(angle) * radius]);
  }
  return vertices;
};

const buildExtrudedFaces = (top: [number, number][], depth: number) => {
  const bottom = top.map(([x, y]) => [x, y + depth]) as [number, number][];
  const indices: [number, number][] = [
    [2, 3],
    [3, 4],
    [4, 5],
  ];
  return indices.map(([a, b]) => [top[a], top[b], bottom[b], bottom[a]] as [number, number][]);
};

const pointsToAttribute = (vertices: [number, number][]) =>
  vertices.map(([x, y]) => `${x},${y}`).join(' ');

const faceToAttribute = (face: [number, number][]) => pointsToAttribute(face);

export default HexTile;
