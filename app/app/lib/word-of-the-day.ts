import type { VocabWord } from "./german-types";
import type { VocabWordBase } from "./german-types";
import { EXPANDED_NOUNS } from "./german-vocab/nouns";
import { EXPANDED_VERBS } from "./german-vocab/verbs";
import { EXPANDED_ADJECTIVES } from "./german-vocab/adjectives";
import { EXPANDED_ADVERBS } from "./german-vocab/adverbs";
import { EXPANDED_PREPOSITIONS } from "./german-vocab/prepositions";
import { EXPANDED_CONJUNCTIONS } from "./german-vocab/conjunctions";

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

// ─── Static Word Pools (sorted, never changes at runtime) ───────
// Selection uses ONLY these static lists so adding words to the DB
// or mastering cards can never change the daily picks.
const STATIC_VERBS = [...EXPANDED_VERBS].sort((a, b) => a.german.localeCompare(b.german));
const STATIC_NOUNS = [...EXPANDED_NOUNS].sort((a, b) => a.german.localeCompare(b.german));
const STATIC_ADJECTIVES = [...EXPANDED_ADJECTIVES].sort((a, b) => a.german.localeCompare(b.german));
const STATIC_ADVERBS = [...EXPANDED_ADVERBS].sort((a, b) => a.german.localeCompare(b.german));
const STATIC_PREPOSITIONS = [...EXPANDED_PREPOSITIONS, ...EXPANDED_CONJUNCTIONS].sort((a, b) => a.german.localeCompare(b.german));

const STATIC_POOLS: Record<string, VocabWordBase[]> = {
  verb: STATIC_VERBS,
  noun: STATIC_NOUNS,
  adjective: STATIC_ADJECTIVES,
  adverb: STATIC_ADVERBS,
  preposition: STATIC_PREPOSITIONS,
};

// ─── Word of the Day Selection ──────────────────────────────────
// Returns 3 words: one verb, one noun, one rotating (adj/adv/prp/cnj)
// Deterministic per date — uses static builtin lists only

export interface WordOfTheDay {
  word: VocabWord;
  category: string; // "verb" | "noun" | "adjective" | "adverb" | "preposition"
}

const ROTATING_CATEGORIES = ["adjective", "adverb", "preposition", "conjunction"] as const;

function pickFromStaticPool(
  category: string,
  rng: () => number,
  vocab: VocabWord[],
): WordOfTheDay | null {
  const poolKey = category === "conjunction" ? "preposition" : category;
  const pool = STATIC_POOLS[poolKey];
  if (!pool || pool.length === 0) return null;

  // Pick a deterministic index from the static pool
  const index = Math.floor(rng() * pool.length);
  const picked = pool[index];

  // Find the matching word in the user's vocab (for SR state), or create a default
  const match = vocab.find(
    (w) => w.german === picked.german && w.partOfSpeech === picked.partOfSpeech,
  );

  const word: VocabWord = match || {
    ...picked,
    nextReview: 0,
    interval: 0,
    easeFactor: 2.5,
    repetitions: 0,
    source: "builtin",
  };

  return { word, category: picked.partOfSpeech };
}

export function getWordsOfTheDay(date: Date, vocab: VocabWord[]): WordOfTheDay[] {
  const dateStr = date.toISOString().slice(0, 10);
  const seed = hashDateString(dateStr);
  const rng = seededRandom(seed);

  const results: WordOfTheDay[] = [];

  // Always include a verb and a noun
  const verb = pickFromStaticPool("verb", rng, vocab);
  if (verb) results.push(verb);
  const noun = pickFromStaticPool("noun", rng, vocab);
  if (noun) results.push(noun);

  // Rotate through adjective/adverb/preposition/conjunction by date
  const daysSinceEpoch = Math.floor(date.getTime() / 86400000);
  const rotatingCategory = ROTATING_CATEGORIES[daysSinceEpoch % ROTATING_CATEGORIES.length];
  const third = pickFromStaticPool(rotatingCategory, rng, vocab);
  if (third) results.push(third);

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
export interface WotdWedgeData {
  lines: string[];
  colors: (string | undefined)[];
  definitions: (string | undefined)[];
}

export function formatWotdForWedge(words: WordOfTheDay[]): WotdWedgeData {
  const lines: string[] = [];
  const colors: (string | undefined)[] = [];
  const definitions: (string | undefined)[] = [];
  const POS_ABBREV: Record<string, string> = {
    verb: "v", noun: "n", adjective: "adj", adverb: "adv", preposition: "prp", conjunction: "cnj",
  };
  for (const { word } of words) {
    const pos = POS_ABBREV[word.partOfSpeech] || word.partOfSpeech;
    const nounPart = word.article ? `${word.article} ${word.german}` : word.german;
    // Compact badge: circled letters for case governance, small markers for others
    let badge = "";
    if (word.weakNoun) badge = " Ⓦ";
    else if (word.partOfSpeech === "preposition" && word.category) {
      if (word.category === "Akkusativ") badge = " Ⓐ";
      else if (word.category === "Dativ") badge = " Ⓓ";
      else if (word.category === "Genitiv") badge = " Ⓖ";
      else if (word.category.includes("Two-Way") || word.category.includes("Wechsel")) badge = " ↕";
    } else if (word.partOfSpeech === "conjunction" && word.category === "Subordinating") badge = " ⓥ";
    lines.push(`${pos}: ${nounPart}${badge}`);
    colors.push(word.article ? ARTICLE_WEDGE_COLORS[word.article] : undefined);
    definitions.push(word.english || undefined);
  }
  return { lines, colors, definitions };
}
