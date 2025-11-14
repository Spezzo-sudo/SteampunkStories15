import React, { useMemo, useState } from 'react';
import { TECH_TREE_NODES, TechNode, TechNodeCategory } from '@/constants/techTree';
import { FOCUS_OUTLINE } from '@/styles/tokens';

const CATEGORY_LABELS: Record<TechNodeCategory, string> = {
  structure: 'Struktur',
  unit: 'Einheit',
  research: 'Forschung',
  support: 'Support',
};

const CATEGORY_COLORS: Record<TechNodeCategory, string> = {
  structure: 'bg-yellow-800/30 border-yellow-500/40 text-yellow-100',
  unit: 'bg-emerald-900/30 border-emerald-500/40 text-emerald-100',
  research: 'bg-sky-900/30 border-sky-500/40 text-sky-100',
  support: 'bg-purple-900/30 border-purple-500/40 text-purple-100',
};

const CATEGORY_GRADIENTS: Record<TechNodeCategory, string> = {
  structure: 'linear-gradient(135deg, rgba(255,196,57,0.4), rgba(118,83,22,0.55))',
  unit: 'linear-gradient(135deg, rgba(45,186,120,0.5), rgba(15,82,46,0.65))',
  research: 'linear-gradient(135deg, rgba(70,144,255,0.45), rgba(21,61,122,0.7))',
  support: 'linear-gradient(135deg, rgba(170,96,255,0.5), rgba(83,32,120,0.7))',
};

const CATEGORY_ICONS: Record<TechNodeCategory, string> = {
  structure: '🏛️',
  unit: '⚔️',
  research: '🧪',
  support: '⚙️',
};

const CATEGORY_ORDER: TechNodeCategory[] = ['structure', 'unit', 'support', 'research'];

type CategoryFilter = TechNodeCategory | 'all';

const FILTER_OPTIONS: { label: string; value: CategoryFilter }[] = [
  { label: 'Alle Kategorien', value: 'all' },
  { label: 'Strukturen', value: 'structure' },
  { label: 'Einheiten', value: 'unit' },
  { label: 'Support', value: 'support' },
  { label: 'Forschung', value: 'research' },
];

/**
 * Zeigt den technologischen Baum mit Filter- und Suchfunktionen.
 */
const TechTreeView: React.FC = () => {
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredNodes = useMemo(() => {
    return TECH_TREE_NODES.filter((node) => {
      if (category !== 'all' && node.category !== category) {
        return false;
      }
      if (!normalizedSearch) {
        return true;
      }
      const haystack = [node.name, node.summary, node.description, ...node.tags].join(' ').toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [category, normalizedSearch]);

  const tiers = useMemo(() => {
    const map = new Map<number, TechNode[]>();
    filteredNodes.forEach((node) => {
      const tierNodes = map.get(node.tier) ?? [];
      tierNodes.push(node);
      map.set(node.tier, tierNodes);
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([tier, nodes]) => ({
        tier,
        nodes: nodes.sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) || a.name.localeCompare(b.name)),
      }));
  }, [filteredNodes]);

  const selectedNode = useMemo(
    () => TECH_TREE_NODES.find((node) => node.id === selectedId) ?? null,
    [selectedId],
  );

  return (
    <section className="space-y-6 pb-16">
      <header className="rounded-2xl border border-yellow-800/30 bg-black/45 p-6 shadow-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-[clamp(1.8rem,1vw+1.5rem,2.4rem)] font-cinzel text-yellow-300">Technologie-Archiv</h2>
            <p className="text-sm text-gray-300">
              Filtere nach Kategorie, suche nach Namen oder Tags und studiere die detaillierten Einträge.
            </p>
          </div>
          <div className="flex flex-1 flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Einheit, Struktur oder Keyword suchen…"
              className={`w-full rounded-md border border-yellow-800/40 bg-black/40 px-3 py-2 text-sm text-yellow-100 placeholder:text-gray-500 lg:max-w-xs ${FOCUS_OUTLINE.className}`}
            />
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value as CategoryFilter)}
              className={`rounded-md border border-yellow-800/40 bg-black/40 px-3 py-2 text-sm text-yellow-100 lg:w-48 ${FOCUS_OUTLINE.className}`}
            >
              {FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,0.9fr)]">
        <div className="rounded-2xl border border-yellow-800/30 bg-black/45 p-6 shadow-xl">
          {tiers.length === 0 ? (
            <p className="text-sm text-gray-400">Keine Einträge gefunden – passe die Filter oder die Suche an.</p>
          ) : (
            <div className="space-y-10">
              {tiers.map(({ tier, nodes }) => (
                <section key={tier} aria-label={`Tier ${tier}`} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-yellow-800/30" />
                    <p className="text-xs uppercase tracking-[0.35em] text-yellow-300">Tier {tier}</p>
                    <div className="h-px flex-1 bg-yellow-800/30" />
                  </div>
                  <div className="flex flex-wrap gap-4">
                    {nodes.map((node) => {
                      const isActive = node.id === selectedId;
                      const categoryClass = CATEGORY_COLORS[node.category];
                      return (
                        <button
                          key={node.id}
                          type="button"
                          onClick={() => setSelectedId(node.id)}
                          className={`group relative flex min-w-[220px] flex-1 flex-col rounded-xl border px-4 py-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-yellow-500/60 hover:shadow-[0_10px_30px_rgba(255,200,0,0.15)] ${categoryClass} ${
                            isActive ? 'ring-2 ring-yellow-400/60 ring-offset-1 ring-offset-black' : ''
                          } ${FOCUS_OUTLINE.className}`}
                        >
                          <span className="text-xs uppercase tracking-widest text-yellow-200/80">
                            {CATEGORY_LABELS[node.category]}
                          </span>
                          <h3 className="mt-1 text-lg font-cinzel text-yellow-100">{node.name}</h3>
                          <p className="mt-2 text-sm text-gray-200 line-clamp-2">{node.summary}</p>
                          <div className="mt-3 flex flex-wrap gap-1 text-[0.65rem] uppercase tracking-wide text-gray-300">
                            {node.tags.slice(0, 4).map((tag) => (
                              <span key={tag} className="rounded-full bg-black/40 px-2 py-0.5 text-yellow-100/80">
                                {tag}
                              </span>
                            ))}
                          </div>
                          {node.requires.length > 0 && (
                            <p className="mt-3 text-[0.7rem] text-yellow-200/70">
                              Benötigt: {node.requires.map((req) => TECH_TREE_NODES.find((n) => n.id === req)?.name ?? req).join(', ')}
                            </p>
                          )}
                          <span className="pointer-events-none absolute inset-x-0 -bottom-2 h-1 rounded-b-xl bg-gradient-to-r from-transparent via-yellow-500/40 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>

        <aside className="flex h-full min-w-0 flex-col gap-4">
          <article className="flex-1 rounded-2xl border border-yellow-800/30 bg-black/50 p-6 shadow-xl">
            {selectedNode ? (
              <TechNodeDetails node={selectedNode} />
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center text-sm text-gray-400">
                <p>Wähle links einen Eintrag aus, um Details zu sehen.</p>
                <p className="mt-2 text-xs text-gray-500">
                  Tipp: Filtere nach Kategorie oder suche nach Schlagworten wie &bdquo;Portal&ldquo;.
                </p>
              </div>
            )}
          </article>
          <article className="rounded-2xl border border-yellow-800/30 bg-black/45 p-5 text-xs text-gray-300 shadow-xl">
            <h3 className="text-xs font-cinzel uppercase tracking-wider text-yellow-200">Hinweise</h3>
            <ul className="mt-2 space-y-1">
              <li>• Tiers sind frei interpretierbar – spätere Inhalte ergänzen weitere Stufen.</li>
              <li>• Bild-Assets können in <code>public/assets/tech</code> ersetzt oder erweitert werden.</li>
              <li>• Der Detailbereich eignet sich auch für Videos oder 3D-Viewer.</li>
            </ul>
          </article>
        </aside>
      </div>
    </section>
  );
};

interface TechNodeDetailsProps {
  node: TechNode;
}

/**
 * Detaildarstellung einer Technologie mit Stärken, Schwächen und Lore.
 */
const TechNodeDetails: React.FC<TechNodeDetailsProps> = ({ node }) => {
  const { hp, attack, defense, speed, upkeep } = node.stats;

  return (
    <div className="flex h-full min-w-0 flex-col gap-4">
      <header className="space-y-2 border-b border-yellow-800/30 pb-4">
        <h3 className="text-[clamp(1.4rem,0.8vw+1.3rem,2rem)] font-cinzel text-yellow-200">{node.name}</h3>
        <p className="text-xs uppercase tracking-[0.3em] text-yellow-400">{CATEGORY_LABELS[node.category]}</p>
        <p className="text-sm text-gray-200 break-words hyphens-auto">{node.description}</p>
      </header>
      <div className="grid min-w-0 gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <section>
            <h4 className="text-xs uppercase tracking-wider text-yellow-300">Kernwerte</h4>
            <dl className="mt-2 grid grid-cols-2 gap-3 text-sm text-gray-200">
              {hp !== undefined && (
                <>
                  <dt className="text-xs uppercase tracking-wide text-gray-400">Lebenspunkte</dt>
                  <dd>{hp}</dd>
                </>
              )}
              {attack !== undefined && (
                <>
                  <dt className="text-xs uppercase tracking-wide text-gray-400">Angriff</dt>
                  <dd>{attack}</dd>
                </>
              )}
              {defense !== undefined && (
                <>
                  <dt className="text-xs uppercase tracking-wide text-gray-400">Verteidigung</dt>
                  <dd>{defense}</dd>
                </>
              )}
              {speed !== undefined && (
                <>
                  <dt className="text-xs uppercase tracking-wide text-gray-400">Geschwindigkeit</dt>
                  <dd>{speed}</dd>
                </>
              )}
            </dl>
            {upkeep && Object.keys(upkeep).length > 0 && (
              <div className="mt-3 text-xs text-gray-400">
                Unterhalt:{' '}
                {Object.entries(upkeep)
                  .map(([resource, amount]) => `${resource}: ${amount}`)
                  .join(', ')}
              </div>
            )}
          </section>
          <section className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="text-xs uppercase tracking-wider text-emerald-300">Stärken</h4>
              <ul className="mt-2 space-y-1 text-sm text-emerald-200">
                {node.strengths.map((entry) => (
                  <li key={entry}>• {entry}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-xs uppercase tracking-wider text-red-300">Schwächen</h4>
              <ul className="mt-2 space-y-1 text-sm text-red-200">
                {node.weaknesses.map((entry) => (
                  <li key={entry}>• {entry}</li>
                ))}
              </ul>
            </div>
          </section>
          <section>
            <h4 className="text-xs uppercase tracking-wider text-yellow-300">Lore &amp; Notizen</h4>
            <p className="mt-2 text-sm text-gray-200 break-words hyphens-auto">{node.lore}</p>
          </section>
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex-1 rounded-xl border border-yellow-800/30 bg-black/40 p-3">
            <div
              className="flex h-full flex-col items-center justify-center rounded-lg text-center text-gray-100"
              style={{
                background: CATEGORY_GRADIENTS[node.category],
                boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
              }}
            >
              <span className="text-5xl drop-shadow-md">{CATEGORY_ICONS[node.category]}</span>
              <p className="mt-3 text-sm text-gray-100/90 break-words hyphens-auto">Illustration-Platzhalter</p>
              <p className="text-xs text-gray-200/70 break-words hyphens-auto">
                Ersetze mich durch ein Bild in <code>public/assets/tech</code>.
              </p>
            </div>
          </div>
          <section className="rounded-xl border border-yellow-800/30 bg-black/40 p-3 text-xs text-gray-300">
            <h4 className="text-xs font-cinzel uppercase tracking-wider text-yellow-200">Verfügbare Aktionen</h4>
            <ul className="mt-2 space-y-1">
              <li>• Forschung beginnen (Platzhalter)</li>
              <li>• Blaupause anfordern</li>
              <li>• Flotten-Loadout simulieren</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TechTreeView;
