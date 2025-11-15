type TextureStatus = 'requested' | 'loaded' | 'failed' | 'cached';

interface TextureCounters {
  requested: number;
  loaded: number;
  failed: number;
  cached: number;
}

const counters = new Map<string, TextureCounters>();
let dirty = false;
let scheduledFlush: number | null = null;

const ensureEntry = (url: string): TextureCounters => {
  let entry = counters.get(url);
  if (!entry) {
    entry = { requested: 0, loaded: 0, failed: 0, cached: 0 };
    counters.set(url, entry);
  }
  return entry;
};

const scheduleFlush = () => {
  if (scheduledFlush !== null) {
    return;
  }
  scheduledFlush = window.setTimeout(() => {
    scheduledFlush = null;
    if (!dirty) {
      return;
    }
    dirty = false;
    const summary = Array.from(counters.entries()).map(([url, stats]) => ({
      url,
      ...stats,
    }));
    const failures = summary.filter((item) => item.failed > 0);
    const payload = {
      texturesTracked: summary.length,
      failures: failures.length,
      summary,
    };
    const label = failures.length
      ? `%c[TextureTrace] ${failures.length} failure(s)`
      : `%c[TextureTrace] ${summary.length} tracked`;
    const color = failures.length ? 'color: #f87171' : 'color: #38bdf8';
    console.groupCollapsed(label, color);
    console.table(summary);
    console.groupEnd();
    if (failures.length) {
      console.warn('[TextureTrace] unresolved texture failures', payload);
    }
  }, 1000);
};

export const traceTextureEvent = (url: string, status: TextureStatus) => {
  if (!url) return;
  const entry = ensureEntry(url);
  entry[status] += 1;
  dirty = true;
  scheduleFlush();
};
