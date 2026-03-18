// ─── Shared German Types ────────────────────────────────────────

export interface VocabWord {
  german: string;
  english: string;
  article?: string;       // der/die/das for nouns
  partOfSpeech: "noun" | "verb" | "adjective" | "adverb" | "phrase" | "preposition" | "conjunction" | "conjugation";
  category?: string;
  example?: string;        // example sentence
  exampleEn?: string;      // English translation of example
  weakNoun?: boolean;      // n-Deklination (e.g., Löwe → Löwen in acc/dat/gen)
  caseGovernment?: "akk" | "dat" | "two-way" | "gen";  // which case a preposition governs
  verbKicker?: boolean;    // subordinating conjunction — verb goes to end
  // Spaced repetition fields
  nextReview: number;      // timestamp
  interval: number;        // days until next review
  easeFactor: number;      // SM-2 ease factor
  repetitions: number;     // successful repetitions in a row
  source: "builtin" | "lookup";
}

export type VocabWordBase = Omit<VocabWord, "nextReview" | "interval" | "easeFactor" | "repetitions" | "source">;
