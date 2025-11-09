import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { CONFIG } from '@/config/mapConfig';
import type { Region, Tile } from '@/data/types';
import type { Unit, Convoy } from '@/types/convoy';
import { drawRegion, pickTileAt, regionHull } from '@/lib/hexgrid/microRegion';
import { resizeCanvas, type Camera, fitToBounds } from '@/lib/hexgrid/viewport';
import { parseCoordinate } from '@/lib/hexgrid/coordinateParser';
import { OrderSheet, type OrderDraft, type UnitStackSummary } from '@/components/galaxy/OrderSheet';
import { RegionSummaryTable } from '@/components/galaxy/RegionSummaryTable';
import { planConvoy } from '@/lib/movement/planning';
import { ActionType } from '@/types/convoy';
import { runConvoy } from '@/lib/movement/runner';
import { axialToPx, type Axial } from '@/lib/hexgrid/hex';
import { useMapStore } from '@/store/mapStore';
import { ConvoyActionModal } from './ConvoyActionModal';
import { ToastVariant, useUiStore } from '@/store/uiStore';
import { UnitSelectionModal } from './UnitSelectionModal';
import { BIOME_STYLE } from '@/lib/biomeStyle';
import { hasFirebaseConfig } from '@/config/firebaseConfig';
import { requestConvoy } from '@/services/firebase/gameApi';
import { useSessionStore } from '@/store/sessionStore';

interface RenderEnv {
  ctx: CanvasRenderingContext2D;
  dpr: number;
  width: number;
  height: number;
  cssWidth: number;
  cssHeight: number;
}

const DEFAULT_CAMERA: Camera = { tx: 0, ty: 0, scale: 1, minScale: 0.6, maxScale: 6 };

const toTileKey = (tile: Tile) => `${tile.q},${tile.r}`;

const buildStacks = (region: Region): UnitStackSummary[] => {
  const stacks: UnitStackSummary[] = [];
  let townCount = 0;
  let outpostCount = 0;
  region.tiles.forEach((tile) => {
    if (!tile.hasSettlement) {
      return;
    }
    const isTown = tile.hasSettlement.icon === 'TOWN';
    if (isTown) {
      townCount += 1;
    } else {
      outpostCount += 1;
    }
    const label = isTown ? `Garnison ${townCount}` : `Vorhut ${outpostCount}`;
    const strength = isTown ? 24 : 12;
    const count = isTown ? 3 : 1;
    stacks.push({
      id: `${region.id}-${tile.q},${tile.r}`,
      label,
      faction: tile.allianceId ?? 'Neutral',
      count,
      strength,
      origin: `${region.RQ},${region.RR};${tile.q},${tile.r}`,
    });
  });
  return stacks;
};

interface RegionViewProps {
  region: Region;
}

/**
 * Micro map canvas rendering the 19-hex tile cluster paired with command tooling and summary tables.
 */
const RegionViewComponent: React.FC<RegionViewProps> = ({ region }) => {
  const backToMacro = useMapStore((state) => state.backToMacro);
  const world = useMapStore((state) => state.world);
  const allianceFilterOn = useMapStore((state) => state.world?.allianceFilterOn ?? false);
  const toggleAllianceFilter = useMapStore((state) => state.toggleAllianceFilter);
  const selectRegion = useMapStore((state) => state.selectRegion);
  const home = useMapStore((state) => state.home ?? state.world?.home ?? null);
  const setHomeOnce = useMapStore((state) => state.setHomeOnce);
  const canBuild = useMapStore((state) => state.canBuild);
  const worldId = useMapStore((state) => state.worldId);
  const pushToast = useUiStore((state) => state.pushToast);
  const sessionUser = useSessionStore((state) => state.user);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cameraRef = useRef<Camera>({ ...DEFAULT_CAMERA });
  const envRef = useRef<RenderEnv | null>(null);
  const regionRef = useRef<Region | null>(region);
  const selectedRef = useRef<Tile | null>(null);
  const unitMarkerRef = useRef<HTMLDivElement>(null);
  const pendingFocusRef = useRef<{ regionId: string; q: number; r: number } | null>(null);

  const [selectedTile, setSelectedTile] = useState<Tile | null>(null);
  const [coordValue, setCoordValue] = useState('');
  const [coordError, setCoordError] = useState<string | null>(null);
  const [selectedUnitIds, setSelectedUnitIds] = useState<Set<string>>(new Set());
  const [queuedOrders, setQueuedOrders] = useState<OrderDraft[]>([]);
  const [orderTab, setOrderTab] = useState(0);
  const [movementPlan, setMovementPlan] = useState<{
    origin: Tile;
    units: Unit[];
    target?: Tile;
  } | null>(null);
  const [targetSelectMode, setTargetSelectMode] = useState(false);

  const stacks = useMemo(() => buildStacks(region), [region]);
  const homeTileKey = home?.regionId === region.id ? home.tileKey : undefined;
  const hasHome = Boolean(home);
  const homeGlowActive = orderTab === 0;

  const dominantBiome = useMemo(() => {
    const biomeCounts = region.tiles.reduce(
      (acc, tile) => {
        acc[tile.biome] = (acc[tile.biome] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
    return Object.entries(biomeCounts).sort((a, b) => b[1] - a[1])[0][0];
  }, [region]);

  const render = useCallback(
    (time: number) => {
      const env = envRef.current;
      const currentRegion = regionRef.current;
      if (env?.ctx && currentRegion) {
        drawRegion(env.ctx, cameraRef.current, env.dpr, currentRegion, CONFIG.microHexSizePx, time, {
          selected: selectedRef.current,
          showAlliances: allianceFilterOn,
          homeTileKey,
          homeGlow: homeGlowActive,
        });
      }
    },
    [allianceFilterOn, homeGlowActive, homeTileKey],
  );

  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    const currentRegion = regionRef.current;
    if (!canvas || !currentRegion) {
      return;
    }
    const result = resizeCanvas(canvas);
    if (!result.ctx) {
      envRef.current = null;
      return;
    }
    envRef.current = {
      ctx: result.ctx,
      dpr: result.dpr,
      width: result.width,
      height: result.height,
      cssWidth: result.cssWidth,
      cssHeight: result.cssHeight,
    };
    const { bounds } = regionHull(currentRegion, CONFIG.microHexSizePx);
    fitToBounds(cameraRef.current, bounds, result.width, result.height, CONFIG.paddingPx);
    render(performance.now());
  }, [render]);

  useEffect(() => {
    regionRef.current = region;
    selectedRef.current = null;
    setSelectedTile(null);
    setSelectedUnitIds(new Set());
    handleResize();
  }, [region, handleResize]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return undefined;
    }
    handleResize();
    const observer = new ResizeObserver(handleResize);
    observer.observe(container);
    const viewport = window.visualViewport;
    const viewportHandler = () => handleResize();
    viewport?.addEventListener('resize', viewportHandler);
    return () => {
      observer.disconnect();
      viewport?.removeEventListener('resize', viewportHandler);
    };
  }, [handleResize]);

  useEffect(() => {
    render(performance.now());
  }, [allianceFilterOn, homeGlowActive, render, homeTileKey]);

  useEffect(() => {
    selectedRef.current = selectedTile;
    render(performance.now());
  }, [selectedTile, render]);

  useEffect(() => {
    const pending = pendingFocusRef.current;
    if (pending && pending.regionId === region.id) {
      const tile = region.tiles.find((candidate) => candidate.q === pending.q && candidate.r === pending.r);
      if (tile) {
        setSelectedTile(tile);
        selectedRef.current = tile;
      }
      pendingFocusRef.current = null;
    }
  }, [region]);

  const getTileFromEvent = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const env = envRef.current;
    const currentRegion = regionRef.current;
    const canvas = canvasRef.current;
    if (!env || !currentRegion || !canvas) {
      return null;
    }
    const rect = canvas.getBoundingClientRect();
    const px = (event.clientX - rect.left) * env.dpr;
    const py = (event.clientY - rect.top) * env.dpr;
    const worldX = (px - cameraRef.current.tx) / cameraRef.current.scale;
    const worldY = (py - cameraRef.current.ty) / cameraRef.current.scale;
    return pickTileAt(currentRegion, { x: worldX, y: worldY }, CONFIG.microHexSizePx);
  }, []);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const tile = getTileFromEvent(event);
      if (!tile) {
        return;
      }

      if (targetSelectMode) {
        handleTargetSelect(tile);
      } else {
        const unitsOnTile = world?.units.filter(
          (u) => u.location.q === tile.q && u.location.r === tile.r && u.regionId === region.id,
        );
        if (unitsOnTile && unitsOnTile.length > 0 && tile.allianceId === world?.player.allianceId) {
          setMovementPlan({ origin: tile, units: unitsOnTile });
        } else {
          setSelectedTile(tile);
        }
      }
    },
    [getTileFromEvent, region.id, targetSelectMode, world],
  );

  const handleTargetSelect = useCallback(
    (tile: Tile) => {
      if (!movementPlan) {
        return;
      }
      const plan = planConvoy(
        region,
        { q: movementPlan.origin.q, r: movementPlan.origin.r },
        { q: tile.q, r: tile.r },
        movementPlan.units,
        ActionType.MOVE,
      );
      if (!plan.ok) {
        pushToast({
          title: 'Pathfinding Error',
          description: plan.reason,
          variant: ToastVariant.Error,
        });
        setTargetSelectMode(false);
        setMovementPlan(null);
      } else {
        setMovementPlan((prev) => (prev ? { ...prev, target: tile } : null));
        setTargetSelectMode(false);
      }
    },
    [movementPlan, pushToast, region],
  );

  const handleToggleUnit = useCallback((id: string) => {
    setSelectedUnitIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleCommitOrders = useCallback(
    (mode: 'dispatch' | 'queue') => {
      const activeStacks = stacks.filter((stack) => selectedUnitIds.has(stack.id));
      if (!activeStacks.length) {
        return;
      }
      const now = Date.now();
      const entry: OrderDraft = {
        id: `${mode}-${now}`,
        unitLabels: activeStacks.map((stack) => stack.label),
        mode,
        createdAt: now,
      };
      setQueuedOrders((prev) => [entry, ...prev]);
      setSelectedUnitIds(new Set());
    },
    [selectedUnitIds, stacks],
  );

  const handleCoordSubmit = useCallback(() => {
    if (!coordValue.trim()) {
      return;
    }
    const parsed = parseCoordinate(coordValue);
    if (!parsed) {
      setCoordError('Ungültiges Format. Beispiel: 1,-1;0,2');
      return;
    }
    setCoordError(null);
    const targetRegion = world?.regions.find(
      (entry) => entry.RQ === parsed.region.RQ && entry.RR === parsed.region.RR,
    );
    if (!targetRegion) {
      setCoordError('Region nicht gefunden.');
      return;
    }
    if (parsed.hex) {
      pendingFocusRef.current = { regionId: targetRegion.id, q: parsed.hex.q, r: parsed.hex.r };
    } else {
      pendingFocusRef.current = null;
    }
    if (targetRegion.id !== region.id) {
      selectRegion(targetRegion.id);
    } else if (parsed.hex) {
      const tile = region.tiles.find((candidate) => candidate.q === parsed.hex.q && candidate.r === parsed.hex.r);
      if (tile) {
        setSelectedTile(tile);
      } else {
        setCoordError('Hex nicht gefunden.');
        return;
      }
    }
    setCoordValue('');
  }, [coordValue, world, region, selectRegion]);

  const handleCoordKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        handleCoordSubmit();
      }
    },
    [handleCoordSubmit],
  );

  const handleHomeSelection = useCallback(() => {
    if (!selectedTile) {
      return;
    }
    const ok = setHomeOnce(region.id, selectedTile.q, selectedTile.r);
    const coordinate = `${selectedTile.q},${selectedTile.r}`;
    pushToast({
      title: ok ? 'Heimat gesetzt' : 'Heimat bereits festgelegt',
      description: ok
        ? `Startpunkt ${coordinate} in ${region.name} bestätigt.`
        : 'Der Startpunkt wurde zuvor festgelegt und kann nicht geändert werden.',
      variant: ok ? ToastVariant.Success : ToastVariant.Info,
    });
  }, [pushToast, region.id, region.name, selectedTile, setHomeOnce]);

  const isHomeTile = selectedTile ? homeTileKey === toTileKey(selectedTile) : false;

  const handleConvoyConfirm = async (convoy: Convoy, units: Unit[]) => {
    const worldToPx = (ax: Axial) => axialToPx(ax.q, ax.r, CONFIG.microHexSizePx);

    const onStep = (ax: Axial) => {
      const { x, y } = worldToPx(ax);
      if (unitMarkerRef.current) {
        unitMarkerRef.current.style.transform = `translate(${x}px, ${y}px)`;
        unitMarkerRef.current.style.opacity = '1';
      }
    };

    if (hasFirebaseConfig()) {
      try {
        await requestConvoy({
          worldId,
          regionId: region.id,
          origin: { q: convoy.origin.q, r: convoy.origin.r },
          target: { q: convoy.target.q, r: convoy.target.r },
          unitIds: convoy.unitIds,
          action: convoy.action,
        });
        pushToast({
          title: 'Konvoi übergeben',
          description: 'Der Auftrag wurde an den Server gesendet.',
          variant: ToastVariant.Success,
        });
        setMovementPlan(null);
        setTargetSelectMode(false);
      } catch (error) {
        pushToast({
          title: 'Konvoi fehlgeschlagen',
          description:
            error instanceof Error
              ? error.message
              : 'Der Auftrag konnte nicht angelegt werden.',
          variant: ToastVariant.Warning,
        });
      }
      return;
    }

    const onState = (state: Convoy['state']) => {
      console.log('Konvoi Status (lokal):', state);
    };

    const onDone = (success: boolean) => {
      if (success && convoy.action === ActionType.COLONIZE) {
        useMapStore
          .getState()
          .setSettlement(region.id, `${convoy.target.q},${convoy.target.r}`, {
            playerId: sessionUser?.uid ?? 'local-player',
            icon: 'OUTPOST',
          });
      }
      if (unitMarkerRef.current) {
        unitMarkerRef.current.style.opacity = '0';
      }
      setMovementPlan(null);
      setTargetSelectMode(false);
    };

    runConvoy(convoy, units, worldToPx, onStep, onState, onDone);
  };

  return (
    <>
      {movementPlan && !movementPlan.target && (
        <UnitSelectionModal
          units={movementPlan.units}
          onClose={() => {
            setMovementPlan(null);
            setTargetSelectMode(false);
          }}
          onUnitsSelected={(units) => {
            setMovementPlan((prev) => (prev ? { ...prev, units } : null));
            setTargetSelectMode(true);
          }}
        />
      )}
      {movementPlan && movementPlan.target && (
        <ConvoyActionModal
          region={region}
          start={movementPlan.origin}
          target={movementPlan.target}
          availableUnits={movementPlan.units}
          onConfirm={handleConvoyConfirm}
          onClose={() => {
            setMovementPlan(null);
            setTargetSelectMode(false);
          }}
        />
      )}
      <section className="region-container-fade-in h-[calc(100dvh-56px)] grid grid-rows-[minmax(420px,1fr)_auto_minmax(200px,1fr)] gap-3 p-4">
        <div ref={containerRef} className="relative rounded-2xl border border-slate-700/60 bg-slate-900/60 shadow-inner overflow-hidden">
          <div
            className="absolute inset-0 h-full w-full"
          style={{ background: BIOME_STYLE[dominantBiome as keyof typeof BIOME_STYLE].backgroundGradient }}
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full"
          role="img"
          aria-label={`Region ${region.name}`}
          onPointerDown={handlePointerDown}
        />
        <div
          ref={unitMarkerRef}
          className="unit-marker"
          style={{
            position: 'absolute',
            width: '20px',
            height: '20px',
            background: 'gold',
            borderRadius: '50%',
            pointerEvents: 'none',
            opacity: 0,
            transition: 'opacity 0.3s',
          }}
        />
        <div className="pointer-events-none absolute left-4 top-4 flex flex-col gap-3">
          <div className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-slate-500/50 bg-slate-900/90 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.4em] text-slate-100 shadow-lg">
            <span>{region.name}</span>
          </div>
          <div className="pointer-events-none flex flex-wrap gap-2">
            <button
              type="button"
              className="pointer-events-auto rounded-full border border-slate-600/60 bg-slate-900/80 px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-slate-100 shadow-lg"
              onClick={backToMacro}
            >
              Zur Übersicht
            </button>
            <button
              type="button"
              className="pointer-events-auto rounded-full border border-slate-600/60 bg-slate-900/80 px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-slate-100 shadow-lg"
              onClick={toggleAllianceFilter}
            >
              {allianceFilterOn ? 'Allianzen: EIN' : 'Allianzen: AUS'}
            </button>
          </div>
        </div>
        {!canBuild() && (
          <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center p-4">
            <div className="pointer-events-auto rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-center text-xs uppercase tracking-widest text-emerald-100 shadow-lg">
              Wähle ein Hex als Heimat, um Bauaufträge freizuschalten.
            </div>
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0">
          <div className="pointer-events-auto mx-4 mb-4 flex items-center gap-3 rounded-xl bg-slate-800/90 px-3 py-2 backdrop-blur">
            <label className="text-sm text-slate-200">Ziel (RQ,RR;q,r)</label>
            <input
              value={coordValue}
              onChange={(event) => {
                setCoordValue(event.target.value);
                setCoordError(null);
              }}
              onKeyDown={handleCoordKeyDown}
              placeholder="z. B. 1,-1;0,2"
              className="flex-1 rounded bg-slate-900/60 px-2 py-1 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-emerald-400/70"
            />
            <button
              type="button"
              className="rounded bg-emerald-600 px-3 py-1 text-sm font-semibold text-emerald-50 transition hover:bg-emerald-500"
              onClick={handleCoordSubmit}
            >
              Anpeilen
            </button>
          </div>
          {coordError ? (
            <p className="mx-4 mb-3 text-[0.65rem] uppercase tracking-widest text-amber-300">{coordError}</p>
          ) : null}
        </div>
        {selectedTile && (
          <div className="pointer-events-auto absolute right-4 top-24 w-64 rounded-2xl border border-slate-600/50 bg-slate-900/85 p-4 text-xs text-slate-100 shadow-xl backdrop-blur">
            <p className="mb-1 font-semibold uppercase tracking-[0.3em]">Hex {selectedTile.q},{selectedTile.r}</p>
            <p className="text-[0.7rem] text-slate-200">Biome: {selectedTile.biome}</p>
            {selectedTile.allianceId && <p className="text-[0.7rem] text-slate-200">Bande: {selectedTile.allianceId}</p>}
            {selectedTile.hasSettlement ? (
              <p className="text-[0.7rem] text-amber-200">Siedlung: {selectedTile.hasSettlement.icon}</p>
            ) : (
              <p className="text-[0.7rem] text-slate-400">Unbesiedelt</p>
            )}
            <p className="mt-2 text-[0.65rem] text-slate-300">
              {isHomeTile
                ? 'Als Heimat markiert'
                : hasHome
                  ? 'Startpunkt bereits vergeben'
                  : 'Noch nicht als Heimat gesetzt'}
            </p>
            <button
              type="button"
              className="mt-3 w-full rounded-lg bg-emerald-600 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-emerald-50 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-700"
              onClick={handleHomeSelection}
              disabled={hasHome}
            >
              Heimat festlegen
            </button>
          </div>
        )}
      </div>

      <div className="h-px rounded-full bg-gradient-to-r from-slate-800 via-slate-600/60 to-slate-800" />

      <OrderSheet
        available={stacks}
        selectedIds={selectedUnitIds}
        queued={queuedOrders}
        onToggle={handleToggleUnit}
        onCommit={handleCommitOrders}
        disabled={!canBuild()}
        disabledHint={!canBuild() ? 'Heimat wählen, um Einheiten zu kommandieren.' : undefined}
        activeTab={orderTab}
        onTabChange={setOrderTab}
      />

      <div className="min-h-[240px] rounded-2xl border border-slate-700/60 bg-slate-900/60 shadow-inner">
        <RegionSummaryTable
          tiles={region.tiles}
          selectedTileKey={selectedTile ? toTileKey(selectedTile) : undefined}
          onInspect={setSelectedTile}
        />
      </div>
    </section>
    </>
  );
};

export const RegionView = React.memo(RegionViewComponent);
RegionView.displayName = 'RegionView';
