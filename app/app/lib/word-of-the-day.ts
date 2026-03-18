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

const ROTATING_CATEGORIES = ["adjective", "adverb", "preposition", "conjunction"] as const;

function filterByCategory(vocab: VocabWord[], category: string): VocabWord[] {
  if (category === "preposition") {
    return vocab.filter(w => w.partOfSpeech === "preposition" || w.partOfSpeech === "conjunction");
  }
  return vocab.filter(w => w.partOfSpeech === category);
}

function pickFromCategory(vocab: VocabWord[], category: string, rng: () => number): WordOfTheDay | null {
  const pool = filterByCategory(vocab, category);
  if (pool.length === 0) return null;
  const sorted = [...pool].sort((a, b) => a.german.localeCompare(b.german));
  const unmastered = sorted.filter(w => w.repetitions < 5);
  const pickFrom = unmastered.length > 0 ? unmastered : sorted;
  const index = Math.floor(rng() * pickFrom.length);
  return { word: pickFrom[index], category };
}

export function getWordsOfTheDay(date: Date, vocab: VocabWord[]): WordOfTheDay[] {
  const dateStr = date.toISOString().slice(0, 10);
  const seed = hashDateString(dateStr);
  const rng = seededRandom(seed);

  const results: WordOfTheDay[] = [];

  // Always include a verb and a noun
  const verb = pickFromCategory(vocab, "verb", rng);
  if (verb) results.push(verb);
  const noun = pickFromCategory(vocab, "noun", rng);
  if (noun) results.push(noun);

  // Rotate through adjective/adverb/preposition/conjunction by date
  const daysSinceEpoch = Math.floor(date.getTime() / 86400000);
  const rotatingCategory = ROTATING_CATEGORIES[daysSinceEpoch % ROTATING_CATEGORIES.length];
  const third = pickFromCategory(vocab, rotatingCategory, rng);
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
    // Badge suffix for weak nouns, preposition case, verb kickers
    let badge = "";
    if (word.weakNoun) badge = " [W]";
    else if (word.partOfSpeech === "preposition" && word.category) {
      if (word.category === "Akkusativ") badge = " [Akk]";
      else if (word.category === "Dativ") badge = " [Dat]";
      else if (word.category === "Genitiv") badge = " [Gen]";
      else if (word.category.includes("Two-Way") || word.category.includes("Wechsel")) badge = " [↕]";
    } else if (word.partOfSpeech === "conjunction" && word.category === "Subordinating") badge = " [VK]";
    lines.push(`${pos}: ${nounPart}${badge}`);
    colors.push(word.article ? ARTICLE_WEDGE_COLORS[word.article] : undefined);
    definitions.push(word.english || undefined);
  }
  return { lines, colors, definitions };
}
