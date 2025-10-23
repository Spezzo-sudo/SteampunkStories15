import { ALL_BIOMES } from '@/constants/biomes';
import type { HexBiome } from '@/types/biome';

/**
 * Merkmalsvektor für prozedurale Biome-Zuweisung.
 * Werte sind normalisiert (0..1) und stammen z. B. aus Noise-Samples.
 */
export interface SectorFeatures {
  starClass: 'O' | 'B' | 'A' | 'F' | 'G' | 'K' | 'M';
  aether: number;
  debris: number;
  traffic: number;
  law: number;
  gravityShear: number;
  heat: number;
  habitability: number;
}

/** Informationen über bereits zugewiesene Nachbarn. */
export interface NeighborInfo {
  ids: string[];
}

const STAR_HEAT: Record<SectorFeatures['starClass'], number> = {
  O: 1,
  B: 0.9,
  A: 0.75,
  F: 0.65,
  G: 0.55,
  K: 0.4,
  M: 0.25,
};

const MAX_RANDOM_VARIANCE = 0.05;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const mulberry32 = (seed: number) => {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

/**
 * Bewertet ein Biom anhand der Sektor-Merkmale und optionaler Nachbarn.
 */
export const scoreBiome = (
  biome: HexBiome,
  features: SectorFeatures,
  neighbors?: NeighborInfo,
): number => {
  let score = 0;

  if (biome.tags.includes('aether') || biome.tags.includes('nebula')) {
    score += features.aether * 2.2;
  }
  if (biome.tags.includes('debris') || biome.tags.includes('salvage')) {
    score += features.debris * 2.0;
  }
  if (biome.tags.includes('trade') || biome.tags.includes('route') || biome.tags.includes('hub')) {
    score += features.traffic * (1.2 + 0.8 * features.law);
  }
  if (biome.tags.includes('piracy') || biome.tags.includes('black_market')) {
    score += features.traffic * (1.4 - features.law);
  }
  if (biome.tags.includes('industry') || biome.tags.includes('smog')) {
    score += features.heat * 0.7 + features.debris * 0.8;
  }
  if (biome.tags.includes('research') || biome.tags.includes('ancient') || biome.tags.includes('anomaly')) {
    score += features.gravityShear * 1.4 + features.aether * 0.6;
  }
  if (biome.tags.includes('food') || biome.tags.includes('colony')) {
    score += features.habitability * 1.6 + features.traffic * 0.4;
  }
  if (biome.tags.includes('fuel') || biome.tags.includes('wind')) {
    score += STAR_HEAT[features.starClass] * 0.6 + features.heat * 0.9;
  }

  if (neighbors && biome.adjacency) {
    const { prefers = [], avoids = [] } = biome.adjacency;
    const neighborIds = new Set(neighbors.ids);
    if (prefers.some((id) => neighborIds.has(id))) {
      score += 0.6;
    }
    if (avoids.some((id) => neighborIds.has(id))) {
      score -= 0.6;
    }
  }

  return score;
};

/**
 * Wählt deterministisch ein passendes Biom basierend auf Merkmalen.
 */
export const pickBiomeForSector = (
  features: SectorFeatures,
  neighbors: NeighborInfo | undefined,
  seed: number,
): HexBiome => {
  const rng = mulberry32(seed);
  const softScores = ALL_BIOMES.map((biome) => {
    const base = scoreBiome(biome, features, neighbors);
    const variance = rng() * MAX_RANDOM_VARIANCE;
    return { biome, total: base + variance };
  }).sort((a, b) => b.total - a.total);

  const topCandidates = softScores.slice(0, 4);
  const weights = topCandidates.map((entry) => Math.exp(entry.total));
  const weightSum = weights.reduce((acc, value) => acc + value, 0);
  const target = rng() * weightSum;

  let accumulated = 0;
  for (let index = 0; index < topCandidates.length; index += 1) {
    accumulated += weights[index];
    if (target <= accumulated) {
      return topCandidates[index].biome;
    }
  }

  return topCandidates[0].biome;
};
