import type { Axial } from '@/types/map';
import type { Convoy, Unit } from '@/types/convoy';
import { getActionConfig } from './planning';

const fallbackNow = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const fallbackRaf =
  typeof requestAnimationFrame !== 'undefined'
    ? requestAnimationFrame
    : (callback: FrameRequestCallback) => setTimeout(() => callback(fallbackNow()), 16);

/**
 * Drives a convoy along its planned path, resolving the assigned action and optional return trip.
 */
export const runConvoy = async (
  convoy: Convoy,
  units: Unit[],
  worldToPx: (axial: Axial) => { x: number; y: number },
  onStep: (axial: Axial) => void,
  onState: (state: Convoy['state']) => void,
  onDone: (ok: boolean) => void,
) => {
  try {
    onState('movingOut');
    await travelPath(convoy.path, worldToPx, onStep, convoy.speed);

    onState('resolving');
    await resolveAction(convoy.action);

    if (convoy.roundTrip) {
      onState('returning');
      const back = [...convoy.path].reverse();
      await travelPath(back, worldToPx, onStep, convoy.speed);
    }

    onState('done');
    onDone(true);
  } catch (error) {
    console.error('Convoy execution failed', error);
    onState('failed');
    onDone(false);
  }
};

const travelPath = (
  path: Axial[],
  worldToPx: (axial: Axial) => { x: number; y: number },
  onStep: (axial: Axial) => void,
  convoySpeed: number,
) => {
  if (path.length <= 1) {
    if (path[0]) {
      onStep(path[0]);
    }
    return Promise.resolve();
  }
  const msPerHex = Math.round(280 / Math.max(0.1, convoySpeed));
  return path.slice(1).reduce<Promise<void>>(async (chain, axial, index) => {
    await chain;
    const previous = path[index];
    if (!previous) {
      return;
    }
    const from = worldToPx(previous);
    const to = worldToPx(axial);
    await tween(from, to, msPerHex, () => {
      onStep(axial);
    });
  }, Promise.resolve());
};

const tween = (
  start: { x: number; y: number },
  end: { x: number; y: number },
  durationMs: number,
  apply: (point: { x: number; y: number }) => void,
) =>
  new Promise<void>((resolve) => {
    const origin = fallbackNow();
    const tick: FrameRequestCallback = (time) => {
      const progress = Math.min(1, (time - origin) / durationMs);
      const point = {
        x: start.x + (end.x - start.x) * progress,
        y: start.y + (end.y - start.y) * progress,
      };
      apply(point);
      if (progress < 1) {
        fallbackRaf(tick);
      } else {
        resolve();
      }
    };
    fallbackRaf(tick);
  });

const resolveAction = async (action: Convoy['action']) => {
  const { actionMs } = getActionConfig(action);
  if (actionMs <= 0) {
    return;
  }
  await new Promise((resolve) => {
    setTimeout(resolve, actionMs);
  });
};
