
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { useMapStore } from './mapStore';
import { RegionView } from '@/components/galaxy/RegionView';
import React from 'react';
import type { Region, Tile } from '@/data/types';
import * as MicroRegion from '@/lib/hexgrid/microRegion';

// Mock the canvas methods because they don't exist in JSDOM
HTMLCanvasElement.prototype.getContext = () => ({
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(400) })),
  putImageData: vi.fn(),
  createImageData: vi.fn(() => ({ data: new Uint8ClampedArray(400) })),
  setTransform: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  stroke: vi.fn(),
  fill: vi.fn(),
  arc: vi.fn(),
  fillText: vi.fn(),
  measureText: vi.fn(() => ({ width: 50 })),
}) as any;

HTMLCanvasElement.prototype.getBoundingClientRect = () => ({
    width: 800,
    height: 600,
    top: 0,
    left: 0,
    right: 800,
    bottom: 600,
    x: 0,
    y: 0,
    toJSON: () => ({}),
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
}));

vi.mock('@/services/firebase/gameApi', () => ({
    observeRegionTiles: vi.fn(() => vi.fn()),
}));

const MOCK_TILE: Tile = { q: 1, r: 2, regionId: 'test-region', biome: 'grassland', hasSettlement: undefined };

const MOCK_REGION: Region = {
  id: 'test-region',
  name: 'Test Region',
  q: 0,
  r: 0,
  tiles: [MOCK_TILE],
  allianceId: 'test-alliance',
  centroid: { x: 0, y: 0 },
};

const originalState = useMapStore.getState();

describe('RegionView and mapStore Interaction', () => {

  afterEach(() => {
    useMapStore.setState(originalState);
    vi.clearAllMocks();
  });

  it('should open and close the TileActionPopup without causing an infinite loop', async () => {
    // Spy on console.error to detect React errors
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Use the actual store implementation
    const { backToMacro, handleTileClick, closeActionPopup } = useMapStore.getState();

    // Mock the function that identifies the tile from a click
    const pickTileAtSpy = vi.spyOn(MicroRegion, 'pickTileAt').mockReturnValue(MOCK_TILE);

    render(<RegionView region={MOCK_REGION} />);
    
    const canvas = screen.getByRole('presentation').querySelector('canvas');
    expect(canvas).not.toBeNull();

    // 1. Click the canvas to open the popup
    await act(async () => {
      fireEvent.click(canvas!);
    });

    // Check that the popup is open
    expect(screen.getByText(`Feld ${MOCK_TILE.q},${MOCK_TILE.r}`)).toBeInTheDocument();
    
    // 2. Click the close button on the popup
    const closeButton = screen.getByText('×');
    await act(async () => {
      fireEvent.click(closeButton);
    });
    
    // Check that the popup is closed
    expect(screen.queryByText(`Feld ${MOCK_TILE.q},${MOCK_TILE.r}`)).not.toBeInTheDocument();

    // Assert that no "Maximum update depth exceeded" error was thrown
    expect(consoleErrorSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('Maximum update depth exceeded')
    );
    
    pickTileAtSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });
});
