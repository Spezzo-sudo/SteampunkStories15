import React, { useEffect, useRef } from 'react';
import {
  BIOME_STYLE,
  EDGE_ALPHA_RAW,
  EDGE_ALPHA_STYLED,
  PATTERN_ALPHA_RAW,
  PATTERN_ALPHA_STYLED,
  createBiomePattern,
} from '@/lib/biomeStyle';
import { useMapStore, type Biome } from '@/store/mapStore';

const BIOME_ORDER: Biome[] = ['IG', 'CL', 'GL', 'HE', 'DK', 'EO', 'BR', 'NE'];
const SWATCH_WIDTH = 64;
const SWATCH_HEIGHT = 36;

/**
 * Overlay legend showcasing biome swatches for the currently active map styling mode.
 */
const LegendOverlay: React.FC = () => {
  const show = useMapStore((state) => state.showLegend);
  const raw = useMapStore((state) => state.rawMode);

  if (!show) {
    return null;
  }

  return (
    <div className="pointer-events-auto absolute left-4 bottom-4 z-40">
      <div className="rounded-2xl border border-slate-600/40 bg-slate-900/80 p-3 shadow-xl backdrop-blur">
        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-200/90">
          Biome · {raw ? 'RAW' : 'Styled'}
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {BIOME_ORDER.map((code) => (
            <LegendSwatch key={code} code={code} raw={raw} />
          ))}
        </div>
      </div>
    </div>
  );
};

interface LegendSwatchProps {
  code: Biome;
  raw: boolean;
}

const LegendSwatch: React.FC<LegendSwatchProps> = ({ code, raw }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    canvas.width = SWATCH_WIDTH * dpr;
    canvas.height = SWATCH_HEIGHT * dpr;
    canvas.style.width = `${SWATCH_WIDTH}px`;
    canvas.style.height = `${SWATCH_HEIGHT}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    const style = BIOME_STYLE[code];
    const patternAlpha = raw ? PATTERN_ALPHA_RAW : PATTERN_ALPHA_STYLED;
    const edgeAlpha = raw ? EDGE_ALPHA_RAW : EDGE_ALPHA_STYLED;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = style.fill;
    ctx.globalAlpha = raw ? 0.92 : 0.78;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const pattern = createBiomePattern(ctx, style.pattern, style.edge, style.fill, dpr, patternAlpha);
    if (pattern) {
      ctx.globalAlpha = patternAlpha;
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.globalAlpha = edgeAlpha;
    ctx.strokeStyle = style.edge;
    ctx.lineWidth = 2 * dpr;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);

    ctx.globalAlpha = 1;
    ctx.font = `${11 * dpr}px 'Inter', system-ui, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3 * dpr;
    ctx.strokeStyle = 'rgba(15,23,42,0.65)';
    ctx.fillStyle = '#f8fafc';
    ctx.strokeText(code, 10 * dpr, (SWATCH_HEIGHT / 2) * dpr);
    ctx.fillText(code, 10 * dpr, (SWATCH_HEIGHT / 2) * dpr);

    ctx.restore();
  }, [code, raw]);

  return (
    <div className="flex items-center gap-3 text-xs text-slate-100/90">
      <canvas ref={canvasRef} className="rounded-lg border border-slate-600/40 shadow-inner" />
      <span className="font-medium uppercase tracking-[0.2em]">{code}</span>
    </div>
  );
};

export default LegendOverlay;
