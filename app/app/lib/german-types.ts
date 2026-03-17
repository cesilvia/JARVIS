// ─── Shared German Types ────────────────────────────────────────

export interface VocabWord {
  german: string;
  english: string;
  article?: string;       // der/die/das for nouns
  partOfSpeech: "noun" | "verb" | "adjective" | "adverb" | "phrase" | "preposition" | "conjunction";
  category?: string;
  example?: string;        // example sentence
  exampleEn?: string;      // English translation of example
  // Spaced repetition fields
  nextReview: number;      // timestamp
  interval: number;        // days until next review
  easeFactor: number;      // SM-2 ease factor
  repetitions: number;     // successful repetitions in a row
  source: "builtin" | "lookup";
}

export type VocabWordBase = Omit<VocabWord, "nextReview" | "interval" | "easeFactor" | "repetitions" | "source">;
