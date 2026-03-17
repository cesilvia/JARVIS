import type { VocabWord } from "./german-types";

// ─── Seeded PRNG (Linear Congruential Generator) ────────────────
function hashDateString(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) - hash + dateStr.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

// ─── Word of the Day Selection ──────────────────────────────────
// Returns 5 words: one verb, one noun, one adjective, one adverb, one preposition/conjunction
// Deterministic per date, prioritizes un-mastered words

export interface WordOfTheDay {
  word: VocabWord;
  category: string; // "verb" | "noun" | "adjective" | "adverb" | "preposition"
}

const WOTD_CATEGORIES = ["verb", "noun", "adjective", "adverb", "preposition"] as const;

function filterByCategory(vocab: VocabWord[], category: string): VocabWord[] {
  if (category === "preposition") {
    return vocab.filter(w => w.partOfSpeech === "preposition" || w.partOfSpeech === "conjunction");
  }
  return vocab.filter(w => w.partOfSpeech === category);
}

export function getWordsOfTheDay(date: Date, vocab: VocabWord[]): WordOfTheDay[] {
  const dateStr = date.toISOString().slice(0, 10);
  const seed = hashDateString(dateStr);
  const rng = seededRandom(seed);

  const results: WordOfTheDay[] = [];

  for (const category of WOTD_CATEGORIES) {
    const pool = filterByCategory(vocab, category);
    if (pool.length === 0) continue;

    // Sort deterministically by german word for stable indexing
    const sorted = [...pool].sort((a, b) => a.german.localeCompare(b.german));

    // Prioritize un-mastered words (repetitions < 5)
    const unmastered = sorted.filter(w => w.repetitions < 5);
    const pickFrom = unmastered.length > 0 ? unmastered : sorted;

    const index = Math.floor(rng() * pickFrom.length);
    results.push({ word: pickFrom[index], category });
  }

  return results;
}

// ─── Noun color coding ──────────────────────────────────────────
// Masculine = dark blue, Feminine = reddish pink, Neuter = muted orange
const ARTICLE_WEDGE_COLORS: Record<string, string> = {
  der: "#4A7ECC",  // dark blue
  die: "#D94A6B",  // reddish pink
  das: "#CC8844",  // muted orange
};

// ─── Format for Wedge Display ───────────────────────────────────
export function formatWotdForWedge(words: WordOfTheDay[]): { lines: string[]; colors: (string | undefined)[] } {
  const lines: string[] = [];
  const colors: (string | undefined)[] = [];
  const POS_ABBREV: Record<string, string> = {
    verb: "v", noun: "n", adjective: "adj", adverb: "adv", preposition: "prp", conjunction: "cnj",
  };
  for (const { word } of words) {
    const pos = POS_ABBREV[word.partOfSpeech] || word.partOfSpeech;
    const nounPart = word.article ? `${word.article} ${word.german}` : word.german;
    lines.push(`${pos}: ${nounPart}`);
    colors.push(word.article ? ARTICLE_WEDGE_COLORS[word.article] : undefined);
  }
  return { lines, colors };
}
