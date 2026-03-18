// ─── Generate Conjugation Flashcards from Verb List ─────────────
// Creates individual flashcards for each verb × tense × pronoun
// Front: "ich arbeite" | Back: "I work"

import type { VocabWordBase } from "./german-types";
import { generateFlashcards, TENSE_LABELS, type Tense } from "./german-conjugation";

export function generateConjugationBuiltins(verbs: VocabWordBase[]): VocabWordBase[] {
  const cards: VocabWordBase[] = [];

  for (const verb of verbs) {
    if (verb.partOfSpeech !== "verb") continue;

    // Skip multi-word phrases that aren't proper verbs
    const infinitive = verb.german;
    if (infinitive.includes("...") || infinitive.includes("?")) continue;

    try {
      const flashcards = generateFlashcards(infinitive, verb.english);

      for (const fc of flashcards) {
        cards.push({
          german: fc.german,
          english: fc.english,
          partOfSpeech: "conjugation",
          category: `${TENSE_LABELS[fc.tense]} — ${infinitive}`,
        });
      }
    } catch {
      // Skip verbs that fail conjugation (edge cases)
      console.warn(`Skipping conjugation for: ${infinitive}`);
    }
  }

  return cards;
}
