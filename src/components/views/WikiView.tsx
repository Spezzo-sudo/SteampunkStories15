import React, { useState, useMemo } from 'react';
import wikiData from '@/data/wiki.json';
import { WikiArticle, WikiData } from '@/types';

/**
 * WikiView component displays an interactive in-game wiki with search and category navigation.
 * Features searchable articles, category filtering, and markdown content rendering.
 */
const WikiView: React.FC = () => {
  const data: WikiData = wikiData;
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<WikiArticle | null>(null);

  // Filter articles based on search query and selected category
  const filteredArticles = useMemo(() => {
    return data.articles.filter((article) => {
      const matchesCategory = selectedCategory === null || article.category === selectedCategory;
      const matchesSearch =
        searchQuery === '' ||
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.searchTags.some((tag) =>
          tag.toLowerCase().includes(searchQuery.toLowerCase())
        );
      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <section className="space-y-8 pb-16">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-3xl">📖</span>
          <h1 className="text-3xl font-bold text-yellow-300">Steampunk Wiki</h1>
        </div>
        <p className="text-yellow-100/80">
          Alles, was du über Äther-Imperium wissen musst
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          placeholder="Wiki durchsuchen... (z.B. 'Kesseldruck', 'Schiffe', 'Angriff')"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-3 rounded-lg bg-yellow-900/20 border border-yellow-700/50 text-yellow-50 placeholder-yellow-600/60 focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/30 transition"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-3 text-yellow-600 hover:text-yellow-400 transition"
          >
            ✕
          </button>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-4">
        {/* Sidebar: Categories */}
        <div className="lg:col-span-1">
          <div className="sticky top-20 space-y-2">
            <h2 className="text-sm font-bold text-yellow-300 uppercase tracking-wider">
              Kategorien
            </h2>
            <button
              onClick={() => setSelectedCategory(null)}
              className={`w-full text-left px-4 py-3 rounded-lg transition ${
                selectedCategory === null
                  ? 'bg-yellow-800/40 text-yellow-200 border border-yellow-600/50'
                  : 'text-yellow-100/70 hover:bg-yellow-900/20'
              }`}
            >
              Alle (
              {selectedCategory === null ? filteredArticles.length : data.articles.length})
            </button>
            {data.categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`w-full text-left px-4 py-3 rounded-lg transition ${
                  selectedCategory === category.id
                    ? 'bg-yellow-800/40 text-yellow-200 border border-yellow-600/50'
                    : 'text-yellow-100/70 hover:bg-yellow-900/20'
                }`}
              >
                <span className="mr-2">{category.icon}</span>
                {category.name} ({data.articles.filter((a) => a.category === category.id).length})
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {selectedArticle ? (
            // Article View
            <div className="space-y-6">
              <button
                onClick={() => setSelectedArticle(null)}
                className="flex items-center gap-2 text-yellow-400 hover:text-yellow-300 transition"
              >
                ← Zurück zu Artikeln
              </button>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{selectedArticle.icon}</span>
                  <h2 className="text-2xl font-bold text-yellow-300">{selectedArticle.title}</h2>
                </div>

                {/* Markdown-like content rendering */}
                <div className="prose prose-invert max-w-none space-y-4 text-yellow-50/90">
                  {selectedArticle.content.split('\n').map((line, idx) => {
                    // Headers
                    if (line.startsWith('## ')) {
                      return (
                        <h3
                          key={idx}
                          className="text-lg font-bold text-yellow-300 mt-4 pt-4 border-t border-yellow-700/30"
                        >
                          {line.replace('## ', '')}
                        </h3>
                      );
                    }
                    if (line.startsWith('### ')) {
                      return (
                        <h4
                          key={idx}
                          className="text-base font-bold text-yellow-200 mt-3"
                        >
                          {line.replace('### ', '')}
                        </h4>
                      );
                    }
                    // Bold text
                    if (line.startsWith('- ')) {
                      return (
                        <li key={idx} className="ml-4">
                          {renderInlineMarkdown(line.substring(2))}
                        </li>
                      );
                    }
                    // Empty lines
                    if (line.trim() === '') {
                      return <div key={idx} />;
                    }
                    // Paragraphs
                    return (
                      <p key={idx} className="leading-relaxed">
                        {renderInlineMarkdown(line)}
                      </p>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            // Article List View
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-yellow-300">
                {selectedCategory
                  ? data.categories.find((c) => c.id === selectedCategory)?.name
                  : 'Alle Artikel'}{' '}
                ({filteredArticles.length})
              </h2>

              {filteredArticles.length === 0 ? (
                <div className="text-center py-12 text-yellow-600">
                  <p className="text-lg">Keine Artikel gefunden</p>
                  <p className="text-sm mt-2">Versuche eine andere Suche oder Kategorie</p>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {filteredArticles.map((article) => (
                    <button
                      key={article.id}
                      onClick={() => setSelectedArticle(article)}
                      className="text-left p-4 rounded-lg bg-yellow-900/10 border border-yellow-700/30 hover:border-yellow-600/60 hover:bg-yellow-900/20 transition space-y-2 group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-2xl">{article.icon}</span>
                          <div>
                            <h3 className="font-bold text-yellow-300 group-hover:text-yellow-200 transition">
                              {article.title}
                            </h3>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-yellow-100/60 line-clamp-2">
                        {article.content.split('\n')[0].replace(/^## |^### |^- /, '')}
                      </p>
                      <div className="flex flex-wrap gap-1 pt-2">
                        {article.searchTags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="text-xs px-2 py-1 rounded bg-yellow-900/40 text-yellow-300"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

/**
 * Helper function to render inline markdown (bold, code)
 */
function renderInlineMarkdown(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  // Replace **bold** with styled text
  const boldRegex = /\*\*([^*]+)\*\*/g;
  let match;

  while ((match = boldRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    parts.push(
      <strong key={match.index} className="text-yellow-200 font-bold">
        {match[1]}
      </strong>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

export default WikiView;
