import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  INITIAL_FLEET_COMPOSITION,
  INITIAL_HANGAR_CAPACITY,
  MAX_SHIPYARD_QUEUE,
  SHIP_BLUEPRINTS,
} from '@/constants';
import { Resources, ResourceType, ShipBlueprint, ShipBuildOrder } from '@/types';
import { canBuildShip, formatRequirementError } from '@/lib/requirements';
import { useGameStore } from '@/store/gameStore';
import { ToastVariant, useUiStore } from '@/store/uiStore';

interface ShipyardState {
  queue: ShipBuildOrder[];
  inventory: Record<string, number>;
  hangarCapacity: number;
}

interface ShipyardActions {
  startOrder: (blueprintId: string, quantity?: number) => void;
  cancelOrder: (orderId: string) => void;
  advance: (timestamp: number) => void;
}

const findBlueprint = (blueprintId: string): ShipBlueprint | undefined =>
  SHIP_BLUEPRINTS.find((entry) => entry.id === blueprintId);

const scaleCost = (base: Resources, quantity: number): Resources => ({
  [ResourceType.Orichalkum]: base[ResourceType.Orichalkum] * quantity,
  [ResourceType.Fokuskristalle]: base[ResourceType.Fokuskristalle] * quantity,
  [ResourceType.Vitriol]: base[ResourceType.Vitriol] * quantity,
});

const calculateDuration = (blueprint: ShipBlueprint, quantity: number, werftLevel: number = 0) => {
  // Base duration
  const baseDuration = blueprint.buildTimeSeconds * 1000 * quantity;
  // Apply werft level bonus: -5% build time per level
  const timeMultiplier = 1 - werftLevel * 0.05;
  return baseDuration * timeMultiplier;
};

/**
 * Calculates cost multiplier based on werft level.
 * -2% cost per werft level (better efficiency with higher werft levels).
 */
const getWerftCostMultiplier = (werftLevel: number): number => {
  return 1 - werftLevel * 0.02;
};

const calculateReservedSlots = (orders: ShipBuildOrder[]) =>
  orders.reduce((acc, order) => {
    if (order.status === 'completed' || order.status === 'cancelled') {
      return acc;
    }
    const blueprint = findBlueprint(order.blueprintId);
    if (!blueprint) {
      return acc;
    }
    return acc + blueprint.hangarSlots * order.quantity;
  }, 0);

const calculateInventorySlots = (inventory: Record<string, number>) =>
  Object.entries(inventory).reduce((acc, [blueprintId, quantity]) => {
    const blueprint = findBlueprint(blueprintId);
    if (!blueprint) {
      return acc;
    }
    return acc + blueprint.hangarSlots * quantity;
  }, 0);

const rebuildQueuedSchedule = (orders: ShipBuildOrder[]) => {
  const now = Date.now();
  let cursor = now;
  const sorted = [...orders].sort((a, b) => a.startTime - b.startTime);
  sorted.forEach((order) => {
    const blueprint = findBlueprint(order.blueprintId);
    if (!blueprint) {
      return;
    }
    if (order.status === 'building') {
      cursor = Math.max(cursor, order.endTime);
      return;
    }
    if (order.status !== 'queued') {
      return;
    }
    const duration = calculateDuration(blueprint, order.quantity);
    order.startTime = Math.max(cursor, now);
    order.endTime = order.startTime + duration;
    cursor = order.endTime;
  });
};

const initialInventory = { ...INITIAL_FLEET_COMPOSITION };

/**
 * Shipyard store handling ship production queues, hangar capacity and fleet inventory.
 */
export const useShipyardStore = create<ShipyardState & ShipyardActions>()(
  persist(
    immer((set, get) => ({
      queue: [],
      inventory: initialInventory,
      hangarCapacity: INITIAL_HANGAR_CAPACITY,

      startOrder: (blueprintId, quantity = 1) => {
        const blueprint = findBlueprint(blueprintId);
        if (!blueprint || quantity <= 0) {
          return;
        }
        const { pushToast } = useUiStore.getState();
        const gameState = useGameStore.getState();
        const werftLevel = gameState.buildings['werft'] || 0;
        const research = gameState.research;

        // NEW: Validate ship requirements
        const validation = canBuildShip(blueprintId, werftLevel, research);
        if (!validation.canDo) {
          const errorMsg = formatRequirementError(validation.missing);
          pushToast({
            title: 'Schiff nicht verfügbar',
            description: errorMsg,
            variant: ToastVariant.Warning,
          });
          return;
        }

        const reservedSlots = calculateReservedSlots(get().queue);
        const occupiedSlots = calculateInventorySlots(get().inventory);
        const requiredSlots = blueprint.hangarSlots * quantity;
        if (get().queue.filter((order) => order.status !== 'completed' && order.status !== 'cancelled').length >= MAX_SHIPYARD_QUEUE) {
          pushToast({
            title: 'Werft belegt',
            description: `Maximal ${MAX_SHIPYARD_QUEUE} Aufträge möglich.`,
            variant: ToastVariant.Warning,
          });
          return;
        }
        if (occupiedSlots + reservedSlots + requiredSlots > get().hangarCapacity) {
          pushToast({
            title: 'Hangar voll',
            description: 'Es stehen keine Slots für weitere Schiffe zur Verfügung.',
            variant: ToastVariant.Warning,
          });
          return;
        }

        // NEW: Apply werft cost bonus
        const baseCost = scaleCost(blueprint.baseCost, quantity);
        const costMultiplier = getWerftCostMultiplier(werftLevel);
        const cost: Resources = {
          [ResourceType.Orichalkum]: Math.floor(baseCost[ResourceType.Orichalkum] * costMultiplier),
          [ResourceType.Fokuskristalle]: Math.floor(baseCost[ResourceType.Fokuskristalle] * costMultiplier),
          [ResourceType.Vitriol]: Math.floor(baseCost[ResourceType.Vitriol] * costMultiplier),
        };

        const spent = gameState.spendResources(cost);
        if (!spent) {
          pushToast({
            title: 'Ressourcen fehlen',
            description: 'Nicht genügend Vorräte für den Bauauftrag.',
            variant: ToastVariant.Warning,
          });
          return;
        }
        const now = Date.now();
        const activeOrders = get()
          .queue.filter((order) => order.status !== 'completed' && order.status !== 'cancelled')
          .sort((a, b) => a.endTime - b.endTime);
        const lastEnd = activeOrders.length > 0 ? activeOrders[activeOrders.length - 1].endTime : now;
        const startTime = Math.max(now, lastEnd);
        // NEW: Apply werft time bonus
        const duration = calculateDuration(blueprint, quantity, werftLevel);
        const endTime = startTime + duration;
        const order: ShipBuildOrder = {
          id: `ship-${blueprintId}-${Date.now()}`,
          blueprintId,
          quantity,
          costPaid: cost, // FIXED: Store the actual cost paid (with werft bonus)
          startTime,
          endTime,
          status: 'queued',
        };
        set((state) => {
          state.queue.push(order);
        });
        pushToast({
          title: `${blueprint.name} in Auftrag`,
          description: `${quantity}x ${blueprint.name} eingeplant.`,
          variant: ToastVariant.Success,
        });
      },

      cancelOrder: (orderId) => {
        const { pushToast } = useUiStore.getState();
        const { refundResources } = useGameStore.getState();
        let refund: Resources | null = null;
        let blueprintName = '';
        set((state) => {
          const order = state.queue.find((entry) => entry.id === orderId);
          if (!order || order.status !== 'queued') {
            return;
          }
          const blueprint = findBlueprint(order.blueprintId);
          if (!blueprint) {
            return;
          }
          // FIXED: Use the actual cost paid (with werft bonus) instead of base cost
          refund = order.costPaid;
          blueprintName = blueprint.name;
          state.queue = state.queue.filter((entry) => entry.id !== orderId);
          rebuildQueuedSchedule(state.queue);
        });
        if (refund && blueprintName) {
          refundResources(refund);
          pushToast({
            title: `${blueprintName} gestoppt`,
            description: 'Ressourcen wurden erstattet.',
            variant: ToastVariant.Warning,
          });
        }
      },

      advance: (timestamp) => {
        const { pushToast } = useUiStore.getState();
        const completions: { blueprintId: string; quantity: number }[] = [];
        set((state) => {
          state.queue.forEach((order) => {
            if (order.status === 'queued' && timestamp >= order.startTime) {
              order.status = 'building';
            }
            if (order.status === 'building' && timestamp >= order.endTime) {
              order.status = 'completed';
              state.inventory[order.blueprintId] = (state.inventory[order.blueprintId] ?? 0) + order.quantity;
              completions.push({ blueprintId: order.blueprintId, quantity: order.quantity });
            }
          });
          rebuildQueuedSchedule(state.queue);
        });
        completions.forEach((completion) => {
          const blueprint = findBlueprint(completion.blueprintId);
          if (!blueprint) {
            return;
          }
          pushToast({
            title: `${blueprint.name} fertiggestellt`,
            description: `${completion.quantity} Schiff${completion.quantity > 1 ? 'e' : ''} bereit im Hangar.`,
            variant: ToastVariant.Info,
          });
        });
      },
    })),
    {
      name: 'steam-war-raiders-shipyard',
      version: 1,
      storage:
        typeof window === 'undefined' ? undefined : createJSONStorage(() => window.localStorage),
      partialize: (state) => ({
        queue: state.queue,
        inventory: state.inventory,
        hangarCapacity: state.hangarCapacity,
      }),
    },
  ),
);
