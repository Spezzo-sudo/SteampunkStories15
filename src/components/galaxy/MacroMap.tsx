import React, { useEffect, useMemo, useState } from 'react';
import { MACRO_HEX_SIZE } from '@/constants/map';
import { axialDisk, axialToPixel, computeHexBoundingBox, getHexVertices } from '@/lib/hex';
import LegendOverlay from '@/components/overlays/LegendOverlay';
import DebugFab from '@/components/overlays/DebugFab';
import { useMapStore, type LaneEdge, type RegionNode } from '@/store/mapStore';

interface MacroMapProps {
  nodes: RegionNode[];
  lanes: LaneEdge[];
}

interface BackgroundHex {
  x: number;
  y: number;
  parity: number;
}

interface NodePlacement {
  node: RegionNode;
  x: number;
  y: number;
}

interface LanePath {
  id: string;
  d: string;
  active: boolean;
  locked: boolean;
}

const edgeKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
const REGION_HEX_RADIUS = MACRO_HEX_SIZE;

const edgeMidAtAngle = (angle: number, size: number) => {
  const vertices = getHexVertices(0, 0, size);
  const normalized = ((angle * 180) / Math.PI + 360) % 360;
  const index = Math.round(normalized / 60) % 6;
  const nextIndex = (index + 1) % 6;
  const start = vertices[index];
  const end = vertices[nextIndex];
  return { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
};

const laneEndpoints = (from: { x: number; y: number }, to: { x: number; y: number }) => {
  const forwardAngle = Math.atan2(to.y - from.y, to.x - from.x);
  const backwardAngle = Math.atan2(from.y - to.y, from.x - to.x);
  const startOffset = edgeMidAtAngle(forwardAngle, REGION_HEX_RADIUS);
  const endOffset = edgeMidAtAngle(backwardAngle, REGION_HEX_RADIUS);
  return {
    ax: from.x + startOffset.x,
    ay: from.y + startOffset.y,
    bx: to.x + endOffset.x,
    by: to.y + endOffset.y,
  };
};

const buildLaneCommand = (from: { x: number; y: number }, to: { x: number; y: number }) => {
  const { ax, ay, bx, by } = laneEndpoints(from, to);
  const midX = (ax + bx) / 2;
  const midY = (ay + by) / 2;
  const dx = bx - ax;
  const dy = by - ay;
  const length = Math.hypot(dx, dy) || 1;
  const nx = -(dy / length);
  const ny = dx / length;
  const curvature = length * 0.18;
  const controlX = midX + nx * curvature;
  const controlY = midY + ny * curvature;
  return `M ${ax} ${ay} Q ${controlX} ${controlY} ${bx} ${by}`;
};

const LanePathElement: React.FC<LanePath> = ({ d, active, locked }) => {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    let frame = 0;
    const animate = () => {
      const speed = locked ? 0.6 : active ? 2.4 : 1.4;
      setOffset((value) => (value - speed) % 200);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [active, locked]);

  return (
    <path
      d={d}
      fill="none"
      stroke={locked ? 'rgba(248,113,113,0.75)' : active ? 'rgba(56,189,248,0.9)' : 'rgba(148,197,255,0.65)'}
      strokeWidth={locked ? 2.5 : active ? 3.5 : 2}
      strokeLinecap="round"
      strokeDasharray={locked ? '4 8' : active ? '12 10' : '8 6'}
      strokeDashoffset={offset}
      className="transition-all duration-300"
    />
  );
};

/**
 * Macro map rendering aether lanes between regions with animated arcs and route previews.
 */
const MacroMapComponent: React.FC<MacroMapProps> = ({ nodes, lanes }) => {
  const openRegion = useMapStore((state) => state.openRegion);
  const prefetchRegion = useMapStore((state) => state.prefetchRegion);
  const computeLaneRoute = useMapStore((state) => state.computeLaneRoute);
  const research = useMapStore((state) => state.research);
  const showLanes = useMapStore((state) => state.showLanes);
  const [planningRoute, setPlanningRoute] = useState(false);
  const [selectedStart, setSelectedStart] = useState<string | null>(null);
  const [route, setRoute] = useState<{ nodes: string[]; cost: number; eta: number } | null>(null);
  const [routeTarget, setRouteTarget] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const layout = useMemo(() => {
    if (nodes.length === 0) {
      const fallback = REGION_HEX_RADIUS * 6;
      return {
        viewBox: `${-fallback / 2} ${-fallback / 2} ${fallback} ${fallback}`,
        placements: [] as NodePlacement[],
        background: [] as BackgroundHex[],
        map: new Map<string, NodePlacement>(),
      };
    }

    const placements: NodePlacement[] = nodes.map((node) => {
      const { x, y } = axialToPixel({ q: node.RQ, r: node.RR }, REGION_HEX_RADIUS);
      return { node, x, y };
    });

    const bounds = computeHexBoundingBox(
      placements.map((placement) => ({ x: placement.x, y: placement.y })),
      REGION_HEX_RADIUS,
    );

    const padding = REGION_HEX_RADIUS * 1.5;
    const width = Math.max(bounds.width + padding * 2, REGION_HEX_RADIUS * 4);
    const height = Math.max(bounds.height + padding * 2, REGION_HEX_RADIUS * 4);
    const viewBox = `${bounds.minX - padding} ${bounds.minY - padding} ${width} ${height}`;

    const axialRadius =
      nodes.reduce((radius, node) => {
        const qAbs = Math.abs(node.RQ);
        const rAbs = Math.abs(node.RR);
        const sAbs = Math.abs(-node.RQ - node.RR);
        return Math.max(radius, qAbs, rAbs, sAbs);
      }, 0) + 3;
    const background: BackgroundHex[] = axialDisk(axialRadius).map((coord) => {
      const { x, y } = axialToPixel(coord, REGION_HEX_RADIUS);
      return { x, y, parity: (coord.q + coord.r) & 1 };
    });

    const map = new Map<string, NodePlacement>();
    placements.forEach((placement) => {
      map.set(placement.node.id, placement);
    });

    return { viewBox, placements, background, map };
  }, [nodes]);

  useEffect(() => {
    if (!notice) {
      return;
    }
    const timeout = window.setTimeout(() => setNotice(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    if (!planningRoute) {
      setSelectedStart(null);
      setRoute(null);
      setRouteTarget(null);
    }
  }, [planningRoute]);

  const activeNodes = new Set(route?.nodes ?? []);
  const activeEdges = useMemo(() => {
    if (!route) {
      return new Set<string>();
    }
    const edges = new Set<string>();
    for (let index = 0; index < route.nodes.length - 1; index += 1) {
      const a = route.nodes[index];
      const b = route.nodes[index + 1];
      edges.add(edgeKey(a, b));
    }
    return edges;
  }, [route]);

  const lanePaths: LanePath[] = useMemo(() => {
    if (!showLanes) {
      return [];
    }
    return lanes
      .map((lane) => {
        const start = layout.map.get(lane.from);
        const end = layout.map.get(lane.to);
        if (!start || !end) {
          return null;
        }
        return {
          id: `${lane.from}-${lane.to}`,
          d: buildLaneCommand(start, end),
          active: activeEdges.has(edgeKey(lane.from, lane.to)),
          locked: !research.aetherNav || Boolean(lane.blocked),
        };
      })
      .filter((value): value is LanePath => Boolean(value));
  }, [activeEdges, lanes, layout.map, research.aetherNav, showLanes]);

  const handleRegionClick = (node: RegionNode, event: React.MouseEvent<SVGGElement>) => {
    const routeMode = planningRoute || event.shiftKey;

    if (!routeMode) {
      setSelectedStart(null);
      setRoute(null);
      setRouteTarget(null);
      void openRegion(node.RQ, node.RR);
      return;
    }

    if (!selectedStart) {
      setSelectedStart(node.id);
      setRoute(null);
      setRouteTarget(null);
      return;
    }

    if (selectedStart === node.id) {
      void openRegion(node.RQ, node.RR);
      setSelectedStart(null);
      setRoute(null);
      setRouteTarget(null);
      return;
    }

    if (!research.aetherNav) {
      setNotice('Erforsche Aether-Navigation, um Lanes zu bereisen.');
      setRoute(null);
      setRouteTarget(null);
      return;
    }

    const result = computeLaneRoute(selectedStart, node.id);
    if (!result) {
      setNotice('Keine Lane-Verbindung gefunden.');
      setRoute(null);
      setRouteTarget(null);
      return;
    }

    setRoute(result);
    setRouteTarget(node.id);
  };

  return (
    <div className="relative h-full w-full">
      <svg role="presentation" className="h-full w-full" viewBox={layout.viewBox} preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="macro-aether-glow" cx="50%" cy="45%" r="65%">
            <stop offset="0%" stopColor="rgba(125,211,252,0.3)" />
            <stop offset="100%" stopColor="rgba(15,23,42,0)" />
          </radialGradient>
          <filter id="macro-node-shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="rgba(15,23,42,0.8)" floodOpacity="0.75" />
          </filter>
        </defs>
        <rect x="-4000" y="-4000" width="8000" height="8000" fill="#0f172a" />
        <circle cx={0} cy={0} r={MACRO_HEX_SIZE * 15} fill="url(#macro-aether-glow)" />
        {layout.background.map((tile) => (
          <polygon
            key={`bg-${tile.x}-${tile.y}`}
            points={buildHexPoints(tile.x, tile.y, MACRO_HEX_SIZE)}
            fill={tile.parity === 0 ? 'rgba(30,41,59,0.45)' : 'rgba(15,23,42,0.35)'}
            stroke="rgba(148,163,184,0.12)"
            strokeWidth={1}
          />
        ))}
        {lanePaths.map((lane) => (
          <LanePathElement key={lane.id} {...lane} />
        ))}
        {layout.placements.map((placement) => {
          const isStart = placement.node.id === selectedStart;
          const isTarget = placement.node.id === routeTarget;
          const isActive = activeNodes.has(placement.node.id);
          const locked = !research.aetherNav;
          return (
            <g
              key={placement.node.id}
              filter="url(#macro-node-shadow)"
              style={{ cursor: 'pointer' }}
              onClick={(event) => handleRegionClick(placement.node, event)}
              onDoubleClick={() => openRegion(placement.node.RQ, placement.node.RR)}
              onPointerEnter={() => prefetchRegion(placement.node.RQ, placement.node.RR)}
            >
              <polygon
                points={buildHexPoints(placement.x, placement.y, MACRO_HEX_SIZE)}
                fill={isStart ? 'rgba(14,165,233,0.75)' : isActive ? 'rgba(34,197,94,0.7)' : 'rgba(30,64,175,0.65)'}
                stroke={isTarget ? '#facc15' : locked ? '#f87171' : isStart ? '#22d3ee' : '#1e40af'}
                strokeWidth={isActive ? 3.5 : locked ? 3 : 2.5}
              />
              {locked ? (
                <text
                  x={placement.x}
                  y={placement.y - MACRO_HEX_SIZE * 0.8}
                  textAnchor="middle"
                  fill="#f87171"
                  fontSize={14}
                  aria-hidden="true"
                >
                  ⛔
                </text>
              ) : null}
              <text
                x={placement.x}
                y={placement.y + 8}
                textAnchor="middle"
                fill="#f8fafc"
                fontSize={13}
                fontFamily="Cinzel, serif"
                style={{ textShadow: '0 2px 6px rgba(15,23,42,0.85)' }}
              >
                {placement.node.name}
              </text>
            </g>
          );
        })}
      </svg>
      {selectedStart ? (
        <div className="pointer-events-none absolute left-4 top-4 z-20 rounded-full border border-slate-600/60 bg-slate-900/70 px-4 py-2 text-[0.65rem] uppercase tracking-[0.3em] text-slate-200">
          Start: {selectedStart}
        </div>
      ) : null}
      <div className="pointer-events-auto absolute left-4 bottom-4 z-20 flex flex-col gap-2 text-xs text-slate-200">
        <button
          type="button"
          onClick={() => setPlanningRoute((value) => !value)}
          aria-pressed={planningRoute}
          className={`rounded-full border px-4 py-2 uppercase tracking-[0.25em] transition ${
            planningRoute
              ? 'border-cyan-300/70 bg-cyan-900/40 text-cyan-100'
              : 'border-slate-600/60 bg-slate-900/70 hover:border-cyan-300/40 hover:text-cyan-100'
          }`}
        >
          {planningRoute ? 'Routenplanung aktiv' : 'Route planen'}
        </button>
        <p className="max-w-[14rem] text-[0.6rem] text-slate-300/80">
          Tipp: Halte die Umschalttaste gedrückt und klicke, um einmalig eine Route zu planen.
        </p>
      </div>
      {!research.aetherNav ? (
        <div className="pointer-events-none absolute right-4 bottom-4 z-20 rounded-full border border-rose-500/60 bg-rose-900/60 px-4 py-2 text-[0.65rem] uppercase tracking-[0.3em] text-rose-100">
          Aether-Navigation erforderlich
        </div>
      ) : null}
      {route ? (
        <div className="pointer-events-none absolute right-4 top-4 z-20 max-w-xs rounded-3xl border border-cyan-300/50 bg-slate-950/80 p-4 text-sm text-cyan-100">
          <p className="text-[0.6rem] uppercase tracking-[0.3em] text-cyan-300">Aether-Route</p>
          <p className="mt-1 font-cinzel text-lg">
            {route.nodes.join(' ▸ ')}
          </p>
          <p className="mt-2 text-xs text-cyan-200">Kosten: {route.cost.toFixed(1)} • ETA: {route.eta}s</p>
        </div>
      ) : null}
      {notice ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
          <div className="rounded-full border border-amber-400/50 bg-amber-900/70 px-4 py-2 text-[0.65rem] uppercase tracking-[0.3em] text-amber-100 shadow-lg">
            {notice}
          </div>
        </div>
      ) : null}
      <LegendOverlay />
      <DebugFab mode="macro" />
    </div>
  );
};

const buildHexPoints = (cx: number, cy: number, size: number) => {
  const points: string[] = [];
  for (let index = 0; index < 6; index += 1) {
    const angle = ((60 * index - 30) * Math.PI) / 180;
    const x = cx + size * Math.cos(angle);
    const y = cy + size * Math.sin(angle);
    points.push(`${x},${y}`);
  }
  return points.join(' ');
};

/** Memoized macro map to prevent excessive re-renders during animation ticks. */
export const MacroMap = React.memo(MacroMapComponent);
MacroMap.displayName = 'MacroMap';
