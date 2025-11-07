import { beforeEach, describe, expect, it } from 'vitest';
import { useMapStore } from '@/store/mapStore';

const resetStore = () => {
  useMapStore.setState({
    mode: 'macro',
    world: null,
    activeRegion: null,
    home: null,
    loadingWorld: false,
    worldError: null,
  });
};

describe('mapStore.setHomeOnce', () => {
  beforeEach(async () => {
    resetStore();
    await useMapStore.getState().loadWorld();
  });

  it('only records the first home selection', () => {
    const world = useMapStore.getState().world;
    expect(world).not.toBeNull();
    const region = world?.regions[0];
    expect(region).toBeDefined();
    const tile = region?.tiles[0];
    expect(tile).toBeDefined();
    if (!region || !tile) {
      throw new Error('Missing region or tile for test setup.');
    }

    const first = useMapStore.getState().setHomeOnce(region.id, tile.q, tile.r);
    const second = useMapStore.getState().setHomeOnce(region.id, tile.q + 1, tile.r);

    expect(first).toBe(true);
    expect(second).toBe(false);

    const home = useMapStore.getState().home;
    expect(home).not.toBeNull();
    expect(home?.tileKey).toBe(`${tile.q},${tile.r}`);
    expect(typeof home?.setAt).toBe('number');
  });

  it('enables building after a home is set', () => {
    expect(useMapStore.getState().canBuild()).toBe(false);
    const world = useMapStore.getState().world;
    const region = world?.regions[0];
    const tile = region?.tiles[0];
    if (!region || !tile) {
      throw new Error('Missing region or tile for test setup.');
    }

    useMapStore.getState().setHomeOnce(region.id, tile.q, tile.r);
    expect(useMapStore.getState().canBuild()).toBe(true);
  });
});
