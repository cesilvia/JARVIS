"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Navigation from "../components/Navigation";
import CircuitBackground from "../hub/CircuitBackground";
import * as api from "../lib/api-client";

// ─── Theme ───────────────────────────────────────────────────────
const theme = { primary: "#00D9FF", secondary: "#67C7EB", bg: "#000000" };

// Article colors (standard German learning convention)
const ARTICLE_COLORS: Record<string, string> = {
  der: "#4A9EFF",  // blue - masculine
  die: "#FF4A6A",  // red - feminine
  das: "#4AFF88",  // green - neuter
};

// ─── Types ───────────────────────────────────────────────────────
type Tab = "dictionary" | "flashcards" | "grammar" | "quiz" | "backup";

interface VocabWord {
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

interface QuizQuestion {
  type: "article" | "translation" | "conjugation" | "case";
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

// ─── Storage Keys (used by migration endpoint) ─────────────────

// ─── Built-in Vocabulary ────────────────────────────────────────
// Common German nouns with articles
const BUILTIN_NOUNS: Omit<VocabWord, "nextReview" | "interval" | "easeFactor" | "repetitions" | "source">[] = [
  // People & Family
  { german: "Mann", english: "man", article: "der", partOfSpeech: "noun", category: "People", example: "Der Mann trinkt Kaffee.", exampleEn: "The man drinks coffee." },
  { german: "Frau", english: "woman", article: "die", partOfSpeech: "noun", category: "People", example: "Die Frau liest ein Buch.", exampleEn: "The woman reads a book." },
  { german: "Kind", english: "child", article: "das", partOfSpeech: "noun", category: "People", example: "Das Kind spielt im Garten.", exampleEn: "The child plays in the garden." },
  { german: "Junge", english: "boy", article: "der", partOfSpeech: "noun", category: "People", example: "Der Junge geht zur Schule.", exampleEn: "The boy goes to school." },
  { german: "Mädchen", english: "girl", article: "das", partOfSpeech: "noun", category: "People", example: "Das Mädchen singt ein Lied.", exampleEn: "The girl sings a song." },
  { german: "Freund", english: "friend (male)", article: "der", partOfSpeech: "noun", category: "People", example: "Mein Freund kommt aus Berlin.", exampleEn: "My friend comes from Berlin." },
  { german: "Freundin", english: "friend (female)", article: "die", partOfSpeech: "noun", category: "People", example: "Meine Freundin spricht Deutsch.", exampleEn: "My friend speaks German." },
  { german: "Familie", english: "family", article: "die", partOfSpeech: "noun", category: "People", example: "Die Familie isst zusammen.", exampleEn: "The family eats together." },
  { german: "Mutter", english: "mother", article: "die", partOfSpeech: "noun", category: "People", example: "Die Mutter kocht das Abendessen.", exampleEn: "The mother cooks dinner." },
  { german: "Vater", english: "father", article: "der", partOfSpeech: "noun", category: "People", example: "Der Vater arbeitet im Büro.", exampleEn: "The father works in the office." },
  { german: "Bruder", english: "brother", article: "der", partOfSpeech: "noun", category: "People", example: "Mein Bruder ist älter als ich.", exampleEn: "My brother is older than me." },
  { german: "Schwester", english: "sister", article: "die", partOfSpeech: "noun", category: "People", example: "Meine Schwester studiert Medizin.", exampleEn: "My sister studies medicine." },

  // Food & Drink
  { german: "Wasser", english: "water", article: "das", partOfSpeech: "noun", category: "Food & Drink", example: "Ich trinke Wasser.", exampleEn: "I drink water." },
  { german: "Brot", english: "bread", article: "das", partOfSpeech: "noun", category: "Food & Drink", example: "Das Brot ist frisch.", exampleEn: "The bread is fresh." },
  { german: "Kaffee", english: "coffee", article: "der", partOfSpeech: "noun", category: "Food & Drink", example: "Der Kaffee ist heiß.", exampleEn: "The coffee is hot." },
  { german: "Bier", english: "beer", article: "das", partOfSpeech: "noun", category: "Food & Drink", example: "Ein Bier, bitte.", exampleEn: "A beer, please." },
  { german: "Milch", english: "milk", article: "die", partOfSpeech: "noun", category: "Food & Drink", example: "Die Milch ist im Kühlschrank.", exampleEn: "The milk is in the fridge." },
  { german: "Apfel", english: "apple", article: "der", partOfSpeech: "noun", category: "Food & Drink", example: "Der Apfel ist rot.", exampleEn: "The apple is red." },
  { german: "Ei", english: "egg", article: "das", partOfSpeech: "noun", category: "Food & Drink", example: "Ich esse ein Ei zum Frühstück.", exampleEn: "I eat an egg for breakfast." },
  { german: "Fleisch", english: "meat", article: "das", partOfSpeech: "noun", category: "Food & Drink", example: "Das Fleisch ist teuer.", exampleEn: "The meat is expensive." },
  { german: "Käse", english: "cheese", article: "der", partOfSpeech: "noun", category: "Food & Drink", example: "Ich mag Käse.", exampleEn: "I like cheese." },
  { german: "Kuchen", english: "cake", article: "der", partOfSpeech: "noun", category: "Food & Drink", example: "Der Kuchen schmeckt gut.", exampleEn: "The cake tastes good." },

  // Places
  { german: "Haus", english: "house", article: "das", partOfSpeech: "noun", category: "Places", example: "Das Haus ist groß.", exampleEn: "The house is big." },
  { german: "Schule", english: "school", article: "die", partOfSpeech: "noun", category: "Places", example: "Die Schule beginnt um acht.", exampleEn: "School starts at eight." },
  { german: "Stadt", english: "city", article: "die", partOfSpeech: "noun", category: "Places", example: "Die Stadt ist sehr alt.", exampleEn: "The city is very old." },
  { german: "Land", english: "country", article: "das", partOfSpeech: "noun", category: "Places", example: "Das Land ist wunderschön.", exampleEn: "The country is beautiful." },
  { german: "Straße", english: "street", article: "die", partOfSpeech: "noun", category: "Places", example: "Die Straße ist lang.", exampleEn: "The street is long." },
  { german: "Bahnhof", english: "train station", article: "der", partOfSpeech: "noun", category: "Places", example: "Der Bahnhof ist in der Mitte der Stadt.", exampleEn: "The train station is in the center of the city." },
  { german: "Flughafen", english: "airport", article: "der", partOfSpeech: "noun", category: "Places", example: "Der Flughafen ist weit weg.", exampleEn: "The airport is far away." },
  { german: "Krankenhaus", english: "hospital", article: "das", partOfSpeech: "noun", category: "Places", example: "Das Krankenhaus ist neu.", exampleEn: "The hospital is new." },
  { german: "Büro", english: "office", article: "das", partOfSpeech: "noun", category: "Places", example: "Ich arbeite im Büro.", exampleEn: "I work in the office." },
  { german: "Restaurant", english: "restaurant", article: "das", partOfSpeech: "noun", category: "Places", example: "Das Restaurant ist sehr gut.", exampleEn: "The restaurant is very good." },
  { german: "Markt", english: "market", article: "der", partOfSpeech: "noun", category: "Places", example: "Der Markt ist am Samstag.", exampleEn: "The market is on Saturday." },
  { german: "Kirche", english: "church", article: "die", partOfSpeech: "noun", category: "Places", example: "Die Kirche ist sehr alt.", exampleEn: "The church is very old." },

  // Things & Objects
  { german: "Buch", english: "book", article: "das", partOfSpeech: "noun", category: "Things", example: "Das Buch ist interessant.", exampleEn: "The book is interesting." },
  { german: "Auto", english: "car", article: "das", partOfSpeech: "noun", category: "Things", example: "Das Auto ist neu.", exampleEn: "The car is new." },
  { german: "Tisch", english: "table", article: "der", partOfSpeech: "noun", category: "Things", example: "Der Tisch ist aus Holz.", exampleEn: "The table is made of wood." },
  { german: "Stuhl", english: "chair", article: "der", partOfSpeech: "noun", category: "Things", example: "Der Stuhl ist bequem.", exampleEn: "The chair is comfortable." },
  { german: "Tür", english: "door", article: "die", partOfSpeech: "noun", category: "Things", example: "Die Tür ist offen.", exampleEn: "The door is open." },
  { german: "Fenster", english: "window", article: "das", partOfSpeech: "noun", category: "Things", example: "Das Fenster ist geschlossen.", exampleEn: "The window is closed." },
  { german: "Schlüssel", english: "key", article: "der", partOfSpeech: "noun", category: "Things", example: "Wo ist der Schlüssel?", exampleEn: "Where is the key?" },
  { german: "Telefon", english: "telephone", article: "das", partOfSpeech: "noun", category: "Things", example: "Das Telefon klingelt.", exampleEn: "The telephone rings." },
  { german: "Uhr", english: "clock/watch", article: "die", partOfSpeech: "noun", category: "Things", example: "Die Uhr zeigt drei Uhr.", exampleEn: "The clock shows three o'clock." },
  { german: "Geld", english: "money", article: "das", partOfSpeech: "noun", category: "Things", example: "Ich habe kein Geld.", exampleEn: "I have no money." },
  { german: "Zeitung", english: "newspaper", article: "die", partOfSpeech: "noun", category: "Things", example: "Ich lese die Zeitung.", exampleEn: "I read the newspaper." },
  { german: "Brief", english: "letter", article: "der", partOfSpeech: "noun", category: "Things", example: "Der Brief ist von meiner Mutter.", exampleEn: "The letter is from my mother." },
  { german: "Fahrrad", english: "bicycle", article: "das", partOfSpeech: "noun", category: "Things", example: "Ich fahre mit dem Fahrrad.", exampleEn: "I ride the bicycle." },

  // Nature & Weather
  { german: "Sonne", english: "sun", article: "die", partOfSpeech: "noun", category: "Nature", example: "Die Sonne scheint.", exampleEn: "The sun is shining." },
  { german: "Mond", english: "moon", article: "der", partOfSpeech: "noun", category: "Nature", example: "Der Mond ist voll.", exampleEn: "The moon is full." },
  { german: "Regen", english: "rain", article: "der", partOfSpeech: "noun", category: "Nature", example: "Der Regen hört nicht auf.", exampleEn: "The rain doesn't stop." },
  { german: "Schnee", english: "snow", article: "der", partOfSpeech: "noun", category: "Nature", example: "Der Schnee ist weiß.", exampleEn: "The snow is white." },
  { german: "Baum", english: "tree", article: "der", partOfSpeech: "noun", category: "Nature", example: "Der Baum ist sehr groß.", exampleEn: "The tree is very big." },
  { german: "Blume", english: "flower", article: "die", partOfSpeech: "noun", category: "Nature", example: "Die Blume ist schön.", exampleEn: "The flower is beautiful." },
  { german: "Berg", english: "mountain", article: "der", partOfSpeech: "noun", category: "Nature", example: "Der Berg ist hoch.", exampleEn: "The mountain is high." },
  { german: "Meer", english: "sea", article: "das", partOfSpeech: "noun", category: "Nature", example: "Das Meer ist blau.", exampleEn: "The sea is blue." },
  { german: "Fluss", english: "river", article: "der", partOfSpeech: "noun", category: "Nature", example: "Der Fluss fließt nach Norden.", exampleEn: "The river flows north." },

  // Time
  { german: "Tag", english: "day", article: "der", partOfSpeech: "noun", category: "Time", example: "Der Tag war lang.", exampleEn: "The day was long." },
  { german: "Nacht", english: "night", article: "die", partOfSpeech: "noun", category: "Time", example: "Die Nacht ist ruhig.", exampleEn: "The night is quiet." },
  { german: "Woche", english: "week", article: "die", partOfSpeech: "noun", category: "Time", example: "Die Woche hat sieben Tage.", exampleEn: "The week has seven days." },
  { german: "Monat", english: "month", article: "der", partOfSpeech: "noun", category: "Time", example: "Dieser Monat hat 30 Tage.", exampleEn: "This month has 30 days." },
  { german: "Jahr", english: "year", article: "das", partOfSpeech: "noun", category: "Time", example: "Das Jahr hat zwölf Monate.", exampleEn: "The year has twelve months." },
  { german: "Stunde", english: "hour", article: "die", partOfSpeech: "noun", category: "Time", example: "Eine Stunde hat 60 Minuten.", exampleEn: "An hour has 60 minutes." },
  { german: "Minute", english: "minute", article: "die", partOfSpeech: "noun", category: "Time", example: "Warte eine Minute.", exampleEn: "Wait a minute." },

  // Body
  { german: "Kopf", english: "head", article: "der", partOfSpeech: "noun", category: "Body", example: "Mein Kopf tut weh.", exampleEn: "My head hurts." },
  { german: "Hand", english: "hand", article: "die", partOfSpeech: "noun", category: "Body", example: "Gib mir deine Hand.", exampleEn: "Give me your hand." },
  { german: "Auge", english: "eye", article: "das", partOfSpeech: "noun", category: "Body", example: "Das Auge ist blau.", exampleEn: "The eye is blue." },
  { german: "Herz", english: "heart", article: "das", partOfSpeech: "noun", category: "Body", example: "Das Herz schlägt schnell.", exampleEn: "The heart beats fast." },

  // Abstract
  { german: "Arbeit", english: "work", article: "die", partOfSpeech: "noun", category: "Abstract", example: "Die Arbeit ist wichtig.", exampleEn: "Work is important." },
  { german: "Frage", english: "question", article: "die", partOfSpeech: "noun", category: "Abstract", example: "Ich habe eine Frage.", exampleEn: "I have a question." },
  { german: "Antwort", english: "answer", article: "die", partOfSpeech: "noun", category: "Abstract", example: "Die Antwort ist richtig.", exampleEn: "The answer is correct." },
  { german: "Problem", english: "problem", article: "das", partOfSpeech: "noun", category: "Abstract", example: "Das ist ein großes Problem.", exampleEn: "That is a big problem." },
  { german: "Sprache", english: "language", article: "die", partOfSpeech: "noun", category: "Abstract", example: "Deutsch ist eine schöne Sprache.", exampleEn: "German is a beautiful language." },
  { german: "Wort", english: "word", article: "das", partOfSpeech: "noun", category: "Abstract", example: "Das Wort ist lang.", exampleEn: "The word is long." },
  { german: "Geschichte", english: "story/history", article: "die", partOfSpeech: "noun", category: "Abstract", example: "Die Geschichte ist interessant.", exampleEn: "The story is interesting." },
  { german: "Musik", english: "music", article: "die", partOfSpeech: "noun", category: "Abstract", example: "Ich höre Musik.", exampleEn: "I listen to music." },
  { german: "Liebe", english: "love", article: "die", partOfSpeech: "noun", category: "Abstract", example: "Liebe ist wichtig.", exampleEn: "Love is important." },
];

const BUILTIN_VERBS: Omit<VocabWord, "nextReview" | "interval" | "easeFactor" | "repetitions" | "source">[] = [
  { german: "sein", english: "to be", partOfSpeech: "verb", category: "Essential", example: "Ich bin müde.", exampleEn: "I am tired." },
  { german: "haben", english: "to have", partOfSpeech: "verb", category: "Essential", example: "Ich habe Hunger.", exampleEn: "I am hungry." },
  { german: "werden", english: "to become", partOfSpeech: "verb", category: "Essential", example: "Es wird kalt.", exampleEn: "It is getting cold." },
  { german: "können", english: "can / to be able to", partOfSpeech: "verb", category: "Modal", example: "Ich kann Deutsch sprechen.", exampleEn: "I can speak German." },
  { german: "müssen", english: "must / to have to", partOfSpeech: "verb", category: "Modal", example: "Ich muss arbeiten.", exampleEn: "I have to work." },
  { german: "sollen", english: "should / to be supposed to", partOfSpeech: "verb", category: "Modal", example: "Du sollst nicht lügen.", exampleEn: "You should not lie." },
  { german: "wollen", english: "to want", partOfSpeech: "verb", category: "Modal", example: "Ich will nach Hause gehen.", exampleEn: "I want to go home." },
  { german: "dürfen", english: "may / to be allowed to", partOfSpeech: "verb", category: "Modal", example: "Darf ich hier sitzen?", exampleEn: "May I sit here?" },
  { german: "mögen", english: "to like", partOfSpeech: "verb", category: "Modal", example: "Ich mag Schokolade.", exampleEn: "I like chocolate." },
  { german: "machen", english: "to make / to do", partOfSpeech: "verb", category: "Common", example: "Was machst du?", exampleEn: "What are you doing?" },
  { german: "gehen", english: "to go", partOfSpeech: "verb", category: "Common", example: "Ich gehe nach Hause.", exampleEn: "I go home." },
  { german: "kommen", english: "to come", partOfSpeech: "verb", category: "Common", example: "Woher kommst du?", exampleEn: "Where do you come from?" },
  { german: "sagen", english: "to say", partOfSpeech: "verb", category: "Common", example: "Was sagst du?", exampleEn: "What do you say?" },
  { german: "geben", english: "to give", partOfSpeech: "verb", category: "Common", example: "Gib mir das Buch.", exampleEn: "Give me the book." },
  { german: "nehmen", english: "to take", partOfSpeech: "verb", category: "Common", example: "Ich nehme den Bus.", exampleEn: "I take the bus." },
  { german: "finden", english: "to find", partOfSpeech: "verb", category: "Common", example: "Ich finde das gut.", exampleEn: "I find that good." },
  { german: "denken", english: "to think", partOfSpeech: "verb", category: "Common", example: "Ich denke oft an dich.", exampleEn: "I often think of you." },
  { german: "wissen", english: "to know (a fact)", partOfSpeech: "verb", category: "Common", example: "Ich weiß es nicht.", exampleEn: "I don't know." },
  { german: "kennen", english: "to know (be familiar with)", partOfSpeech: "verb", category: "Common", example: "Kennst du diesen Film?", exampleEn: "Do you know this movie?" },
  { german: "sehen", english: "to see", partOfSpeech: "verb", category: "Common", example: "Ich sehe einen Vogel.", exampleEn: "I see a bird." },
  { german: "sprechen", english: "to speak", partOfSpeech: "verb", category: "Common", example: "Sprechen Sie Deutsch?", exampleEn: "Do you speak German?" },
  { german: "lesen", english: "to read", partOfSpeech: "verb", category: "Common", example: "Ich lese gern.", exampleEn: "I like to read." },
  { german: "schreiben", english: "to write", partOfSpeech: "verb", category: "Common", example: "Ich schreibe einen Brief.", exampleEn: "I write a letter." },
  { german: "essen", english: "to eat", partOfSpeech: "verb", category: "Common", example: "Wir essen um zwölf.", exampleEn: "We eat at twelve." },
  { german: "trinken", english: "to drink", partOfSpeech: "verb", category: "Common", example: "Ich trinke Tee.", exampleEn: "I drink tea." },
  { german: "schlafen", english: "to sleep", partOfSpeech: "verb", category: "Common", example: "Ich schlafe acht Stunden.", exampleEn: "I sleep eight hours." },
  { german: "fahren", english: "to drive / to go (by vehicle)", partOfSpeech: "verb", category: "Common", example: "Ich fahre mit dem Zug.", exampleEn: "I travel by train." },
  { german: "arbeiten", english: "to work", partOfSpeech: "verb", category: "Common", example: "Ich arbeite jeden Tag.", exampleEn: "I work every day." },
  { german: "spielen", english: "to play", partOfSpeech: "verb", category: "Common", example: "Die Kinder spielen draußen.", exampleEn: "The children play outside." },
  { german: "lernen", english: "to learn", partOfSpeech: "verb", category: "Common", example: "Ich lerne Deutsch.", exampleEn: "I am learning German." },
  { german: "kaufen", english: "to buy", partOfSpeech: "verb", category: "Common", example: "Ich kaufe Brot.", exampleEn: "I buy bread." },
  { german: "verstehen", english: "to understand", partOfSpeech: "verb", category: "Common", example: "Ich verstehe dich.", exampleEn: "I understand you." },
  { german: "helfen", english: "to help", partOfSpeech: "verb", category: "Common", example: "Kannst du mir helfen?", exampleEn: "Can you help me?" },
  { german: "brauchen", english: "to need", partOfSpeech: "verb", category: "Common", example: "Ich brauche Hilfe.", exampleEn: "I need help." },
  { german: "glauben", english: "to believe", partOfSpeech: "verb", category: "Common", example: "Ich glaube dir.", exampleEn: "I believe you." },
  { german: "leben", english: "to live", partOfSpeech: "verb", category: "Common", example: "Ich lebe in Deutschland.", exampleEn: "I live in Germany." },
  { german: "bleiben", english: "to stay", partOfSpeech: "verb", category: "Common", example: "Ich bleibe zu Hause.", exampleEn: "I stay at home." },
  { german: "stehen", english: "to stand", partOfSpeech: "verb", category: "Common", example: "Ich stehe an der Tür.", exampleEn: "I stand at the door." },
  { german: "sitzen", english: "to sit", partOfSpeech: "verb", category: "Common", example: "Ich sitze auf dem Stuhl.", exampleEn: "I sit on the chair." },
  { german: "laufen", english: "to run / to walk", partOfSpeech: "verb", category: "Common", example: "Ich laufe jeden Morgen.", exampleEn: "I run every morning." },
];

const BUILTIN_ADJECTIVES: Omit<VocabWord, "nextReview" | "interval" | "easeFactor" | "repetitions" | "source">[] = [
  { german: "gut", english: "good", partOfSpeech: "adjective", category: "Common" },
  { german: "schlecht", english: "bad", partOfSpeech: "adjective", category: "Common" },
  { german: "groß", english: "big / tall", partOfSpeech: "adjective", category: "Common" },
  { german: "klein", english: "small / short", partOfSpeech: "adjective", category: "Common" },
  { german: "neu", english: "new", partOfSpeech: "adjective", category: "Common" },
  { german: "alt", english: "old", partOfSpeech: "adjective", category: "Common" },
  { german: "schön", english: "beautiful / nice", partOfSpeech: "adjective", category: "Common" },
  { german: "schnell", english: "fast", partOfSpeech: "adjective", category: "Common" },
  { german: "langsam", english: "slow", partOfSpeech: "adjective", category: "Common" },
  { german: "heiß", english: "hot", partOfSpeech: "adjective", category: "Common" },
  { german: "kalt", english: "cold", partOfSpeech: "adjective", category: "Common" },
  { german: "wichtig", english: "important", partOfSpeech: "adjective", category: "Common" },
  { german: "richtig", english: "correct / right", partOfSpeech: "adjective", category: "Common" },
  { german: "falsch", english: "wrong / false", partOfSpeech: "adjective", category: "Common" },
  { german: "schwer", english: "heavy / difficult", partOfSpeech: "adjective", category: "Common" },
  { german: "leicht", english: "light / easy", partOfSpeech: "adjective", category: "Common" },
  { german: "lang", english: "long", partOfSpeech: "adjective", category: "Common" },
  { german: "kurz", english: "short (length)", partOfSpeech: "adjective", category: "Common" },
  { german: "teuer", english: "expensive", partOfSpeech: "adjective", category: "Common" },
  { german: "billig", english: "cheap", partOfSpeech: "adjective", category: "Common" },
  { german: "müde", english: "tired", partOfSpeech: "adjective", category: "Common" },
  { german: "hungrig", english: "hungry", partOfSpeech: "adjective", category: "Common" },
  { german: "fertig", english: "finished / ready", partOfSpeech: "adjective", category: "Common" },
  { german: "möglich", english: "possible", partOfSpeech: "adjective", category: "Common" },
];

const BUILTIN_PHRASES: Omit<VocabWord, "nextReview" | "interval" | "easeFactor" | "repetitions" | "source">[] = [
  { german: "Guten Morgen", english: "Good morning", partOfSpeech: "phrase", category: "Greetings" },
  { german: "Guten Tag", english: "Good day / Hello", partOfSpeech: "phrase", category: "Greetings" },
  { german: "Guten Abend", english: "Good evening", partOfSpeech: "phrase", category: "Greetings" },
  { german: "Auf Wiedersehen", english: "Goodbye", partOfSpeech: "phrase", category: "Greetings" },
  { german: "Tschüss", english: "Bye (informal)", partOfSpeech: "phrase", category: "Greetings" },
  { german: "Danke", english: "Thank you", partOfSpeech: "phrase", category: "Essentials" },
  { german: "Bitte", english: "Please / You're welcome", partOfSpeech: "phrase", category: "Essentials" },
  { german: "Entschuldigung", english: "Excuse me / Sorry", partOfSpeech: "phrase", category: "Essentials" },
  { german: "Wie geht es Ihnen?", english: "How are you? (formal)", partOfSpeech: "phrase", category: "Essentials" },
  { german: "Wie geht's?", english: "How are you? (informal)", partOfSpeech: "phrase", category: "Essentials" },
  { german: "Ich verstehe nicht", english: "I don't understand", partOfSpeech: "phrase", category: "Essentials" },
  { german: "Sprechen Sie Englisch?", english: "Do you speak English?", partOfSpeech: "phrase", category: "Essentials" },
  { german: "Wie heißt du?", english: "What is your name? (informal)", partOfSpeech: "phrase", category: "Essentials" },
  { german: "Ich heiße...", english: "My name is...", partOfSpeech: "phrase", category: "Essentials" },
  { german: "Wo ist...?", english: "Where is...?", partOfSpeech: "phrase", category: "Travel" },
  { german: "Wie viel kostet das?", english: "How much does that cost?", partOfSpeech: "phrase", category: "Travel" },
  { german: "Die Rechnung, bitte", english: "The bill, please", partOfSpeech: "phrase", category: "Travel" },
  { german: "Ich möchte...", english: "I would like...", partOfSpeech: "phrase", category: "Travel" },
];

const ALL_BUILTIN = [...BUILTIN_NOUNS, ...BUILTIN_VERBS, ...BUILTIN_ADJECTIVES, ...BUILTIN_PHRASES];

function initWord(w: Omit<VocabWord, "nextReview" | "interval" | "easeFactor" | "repetitions" | "source">, source: "builtin" | "lookup" = "builtin"): VocabWord {
  return { ...w, nextReview: 0, interval: 0, easeFactor: 2.5, repetitions: 0, source };
}

// ─── SM-2 Spaced Repetition ────────────────────────────────────
function sm2Update(word: VocabWord, quality: number): VocabWord {
  // quality: 0-5, where 0=complete failure, 3=correct with difficulty, 5=perfect
  const w = { ...word };
  if (quality >= 3) {
    if (w.repetitions === 0) w.interval = 1;
    else if (w.repetitions === 1) w.interval = 6;
    else w.interval = Math.round(w.interval * w.easeFactor);
    w.repetitions += 1;
  } else {
    w.repetitions = 0;
    w.interval = 1;
  }
  w.easeFactor = Math.max(1.3, w.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
  w.nextReview = Date.now() + w.interval * 24 * 60 * 60 * 1000;
  return w;
}

// ─── Grammar Data ──────────────────────────────────────────────
const GRAMMAR_SECTIONS = [
  {
    id: "cases",
    title: "The Four Cases",
    content: `German has four grammatical cases that determine the form of articles, pronouns, and adjective endings. The case depends on the role a noun plays in the sentence.`,
    table: {
      headers: ["Case", "Function", "Question", "Example"],
      rows: [
        ["Nominativ", "Subject (who/what does it)", "Wer? Was?", "Der Mann liest. (The man reads.)"],
        ["Akkusativ", "Direct object (who/what is acted upon)", "Wen? Was?", "Ich sehe den Mann. (I see the man.)"],
        ["Dativ", "Indirect object (to/for whom)", "Wem?", "Ich gebe dem Mann das Buch. (I give the man the book.)"],
        ["Genitiv", "Possession (whose)", "Wessen?", "Das Buch des Mannes. (The man's book.)"],
      ],
    },
  },
  {
    id: "articles",
    title: "Definite Articles (the)",
    content: `The definite article changes based on gender and case. Memorize the article with every noun.`,
    table: {
      headers: ["Case", "Masculine (der)", "Feminine (die)", "Neuter (das)", "Plural (die)"],
      rows: [
        ["Nominativ", "der", "die", "das", "die"],
        ["Akkusativ", "den", "die", "das", "die"],
        ["Dativ", "dem", "der", "dem", "den (+n)"],
        ["Genitiv", "des (+s/es)", "der", "des (+s/es)", "der"],
      ],
    },
  },
  {
    id: "indefinite-articles",
    title: "Indefinite Articles (a/an)",
    content: `Indefinite articles follow a similar pattern. "kein" (no/not a) uses the same endings.`,
    table: {
      headers: ["Case", "Masculine (ein)", "Feminine (eine)", "Neuter (ein)"],
      rows: [
        ["Nominativ", "ein", "eine", "ein"],
        ["Akkusativ", "einen", "eine", "ein"],
        ["Dativ", "einem", "einer", "einem"],
        ["Genitiv", "eines", "einer", "eines"],
      ],
    },
  },
  {
    id: "pronouns",
    title: "Personal Pronouns",
    content: `Personal pronouns change form with each case.`,
    table: {
      headers: ["Nominativ", "Akkusativ", "Dativ", "English"],
      rows: [
        ["ich", "mich", "mir", "I / me"],
        ["du", "dich", "dir", "you (informal)"],
        ["er", "ihn", "ihm", "he / him"],
        ["sie", "sie", "ihr", "she / her"],
        ["es", "es", "ihm", "it"],
        ["wir", "uns", "uns", "we / us"],
        ["ihr", "euch", "euch", "you (plural)"],
        ["sie/Sie", "sie/Sie", "ihnen/Ihnen", "they/you (formal)"],
      ],
    },
  },
  {
    id: "present-tense",
    title: "Present Tense Conjugation",
    content: `Regular verbs follow a predictable pattern. Remove -en from the infinitive to get the stem, then add endings.`,
    table: {
      headers: ["Pronoun", "Ending", "machen (to do)", "spielen (to play)"],
      rows: [
        ["ich", "-e", "mache", "spiele"],
        ["du", "-st", "machst", "spielst"],
        ["er/sie/es", "-t", "macht", "spielt"],
        ["wir", "-en", "machen", "spielen"],
        ["ihr", "-t", "macht", "spielt"],
        ["sie/Sie", "-en", "machen", "spielen"],
      ],
    },
  },
  {
    id: "irregular-verbs",
    title: "Important Irregular Verbs (Present Tense)",
    content: `These common verbs have irregular conjugations. The vowel changes in du and er/sie/es forms.`,
    table: {
      headers: ["Verb", "ich", "du", "er/sie/es", "wir", "ihr", "sie/Sie"],
      rows: [
        ["sein (to be)", "bin", "bist", "ist", "sind", "seid", "sind"],
        ["haben (to have)", "habe", "hast", "hat", "haben", "habt", "haben"],
        ["werden (to become)", "werde", "wirst", "wird", "werden", "werdet", "werden"],
        ["sehen (to see)", "sehe", "siehst", "sieht", "sehen", "seht", "sehen"],
        ["geben (to give)", "gebe", "gibst", "gibt", "geben", "gebt", "geben"],
        ["fahren (to drive)", "fahre", "fährst", "fährt", "fahren", "fahrt", "fahren"],
        ["lesen (to read)", "lese", "liest", "liest", "lesen", "lest", "lesen"],
        ["sprechen (to speak)", "spreche", "sprichst", "spricht", "sprechen", "sprecht", "sprechen"],
        ["essen (to eat)", "esse", "isst", "isst", "essen", "esst", "essen"],
        ["nehmen (to take)", "nehme", "nimmst", "nimmt", "nehmen", "nehmt", "nehmen"],
        ["schlafen (to sleep)", "schlafe", "schläfst", "schläft", "schlafen", "schlaft", "schlafen"],
        ["laufen (to run)", "laufe", "läufst", "läuft", "laufen", "lauft", "laufen"],
        ["helfen (to help)", "helfe", "hilfst", "hilft", "helfen", "helft", "helfen"],
      ],
    },
  },
  {
    id: "past-tense",
    title: "Past Tense (Perfekt)",
    content: `Spoken German mostly uses the Perfekt (present perfect) for past events. It's formed with haben or sein + past participle (Partizip II). Use sein for verbs of movement or state change (gehen, kommen, fahren, werden).`,
    table: {
      headers: ["Type", "Formula", "Example", "English"],
      rows: [
        ["Regular", "ge- + stem + -t", "Ich habe gemacht.", "I did / I have done."],
        ["Irregular", "ge- + stem change + -en", "Ich habe gesehen.", "I saw / I have seen."],
        ["Separable", "prefix + ge- + stem + -t/-en", "Ich habe eingekauft.", "I shopped."],
        ["Inseparable (be-, er-, ver-...)", "no ge-", "Ich habe verstanden.", "I understood."],
        ["With sein", "sein + Partizip II", "Ich bin gegangen.", "I went / I have gone."],
      ],
    },
  },
  {
    id: "word-order",
    title: "Word Order Rules",
    content: `German word order is more flexible than English but follows strict rules.`,
    table: {
      headers: ["Rule", "Example", "English"],
      rows: [
        ["V2: Verb is always 2nd element in main clauses", "Heute gehe ich ins Kino.", "Today I go to the cinema."],
        ["Time-Manner-Place (TMP)", "Ich fahre morgen schnell nach Berlin.", "I drive tomorrow quickly to Berlin."],
        ["Verb goes to END in subordinate clauses", "..., weil ich müde bin.", "...because I am tired."],
        ["Questions: Verb first (yes/no) or W-word first", "Gehst du? / Wohin gehst du?", "Are you going? / Where are you going?"],
        ["Modal + Infinitive: infinitive goes to end", "Ich muss heute arbeiten.", "I have to work today."],
      ],
    },
  },
  {
    id: "prepositions",
    title: "Prepositions & Their Cases",
    content: `Prepositions govern specific cases. Two-way prepositions (Wechselpräpositionen) take Akkusativ for movement/direction and Dativ for location/position.`,
    table: {
      headers: ["Case", "Prepositions", "Example"],
      rows: [
        ["Akkusativ", "durch, für, gegen, ohne, um", "Ich gehe durch den Park. (through the park)"],
        ["Dativ", "aus, bei, mit, nach, seit, von, zu", "Ich komme aus der Schule. (from school)"],
        ["Two-way (Akk=motion, Dat=location)", "an, auf, hinter, in, neben, über, unter, vor, zwischen", "Ich gehe in den Park. (into) / Ich bin im Park. (in)"],
      ],
    },
  },
  {
    id: "negation",
    title: "Negation",
    content: `German uses "nicht" and "kein" for negation.`,
    table: {
      headers: ["Type", "Usage", "Example", "English"],
      rows: [
        ["nicht", "Negate verbs, adjectives, adverbs", "Ich gehe nicht.", "I don't go."],
        ["nicht", "Negate specific elements (before that element)", "Ich gehe nicht nach Hause.", "I'm not going home."],
        ["kein", "Negate nouns (replaces ein/eine)", "Ich habe kein Geld.", "I have no money."],
        ["kein", "Negate nouns (replaces zero article)", "Ich trinke keinen Kaffee.", "I don't drink coffee."],
      ],
    },
  },
];

// ─── Quiz Generation ────────────────────────────────────────────
function generateArticleQuestion(vocab: VocabWord[]): QuizQuestion | null {
  const nouns = vocab.filter((w) => w.partOfSpeech === "noun" && w.article);
  if (nouns.length < 4) return null;
  const target = nouns[Math.floor(Math.random() * nouns.length)];
  return {
    type: "article",
    question: `What is the correct article for "${target.german}" (${target.english})?`,
    options: ["der", "die", "das"],
    correctIndex: ["der", "die", "das"].indexOf(target.article!),
    explanation: `${target.article} ${target.german} — ${target.article === "der" ? "masculine" : target.article === "die" ? "feminine" : "neuter"}`,
  };
}

function generateTranslationQuestion(vocab: VocabWord[], direction: "de-en" | "en-de"): QuizQuestion | null {
  if (vocab.length < 4) return null;
  const shuffled = [...vocab].sort(() => Math.random() - 0.5);
  const target = shuffled[0];
  const distractors = shuffled.slice(1, 4);
  if (direction === "de-en") {
    const display = target.article ? `${target.article} ${target.german}` : target.german;
    const options = [target, ...distractors].sort(() => Math.random() - 0.5).map((w) => w.english);
    return {
      type: "translation",
      question: `What does "${display}" mean in English?`,
      options,
      correctIndex: options.indexOf(target.english),
      explanation: `${display} = ${target.english}`,
    };
  } else {
    const options = [target, ...distractors].sort(() => Math.random() - 0.5).map((w) => w.article ? `${w.article} ${w.german}` : w.german);
    const correctOption = target.article ? `${target.article} ${target.german}` : target.german;
    return {
      type: "translation",
      question: `How do you say "${target.english}" in German?`,
      options,
      correctIndex: options.indexOf(correctOption),
      explanation: `${target.english} = ${correctOption}`,
    };
  }
}

function generateCaseQuestion(): QuizQuestion {
  const questions: QuizQuestion[] = [
    {
      type: "case",
      question: `"Ich sehe ___ Mann." — Which article completes this sentence?`,
      options: ["der", "den", "dem", "des"],
      correctIndex: 1,
      explanation: `"sehen" takes a direct object (Akkusativ). Masculine Akkusativ: den.`,
    },
    {
      type: "case",
      question: `"Ich gebe ___ Frau das Buch." — Which article?`,
      options: ["die", "der", "den", "dem"],
      correctIndex: 1,
      explanation: `"geben" needs an indirect object (Dativ). Feminine Dativ: der.`,
    },
    {
      type: "case",
      question: `"Ich gehe mit ___ Freund ins Kino." — Which article?`,
      options: ["der", "den", "dem", "des"],
      correctIndex: 2,
      explanation: `"mit" always takes Dativ. Masculine Dativ: dem.`,
    },
    {
      type: "case",
      question: `"Das ist das Auto ___ Lehrers." — Which article?`,
      options: ["der", "den", "dem", "des"],
      correctIndex: 3,
      explanation: `Possession = Genitiv. Masculine Genitiv: des (+ -s on noun).`,
    },
    {
      type: "case",
      question: `"Er geht durch ___ Park." — Which article?`,
      options: ["der", "den", "dem", "des"],
      correctIndex: 1,
      explanation: `"durch" always takes Akkusativ. Masculine Akkusativ: den.`,
    },
    {
      type: "case",
      question: `"Sie kommt aus ___ Schule." — Which article?`,
      options: ["die", "der", "den", "dem"],
      correctIndex: 1,
      explanation: `"aus" always takes Dativ. Feminine Dativ: der.`,
    },
    {
      type: "case",
      question: `"Ich lege das Buch auf ___ Tisch." — Which article? (I'm placing it there)`,
      options: ["der", "den", "dem", "des"],
      correctIndex: 1,
      explanation: `"auf" with movement/direction = Akkusativ. Masculine Akkusativ: den.`,
    },
    {
      type: "case",
      question: `"Das Buch liegt auf ___ Tisch." — Which article? (It's already there)`,
      options: ["der", "den", "dem", "des"],
      correctIndex: 2,
      explanation: `"auf" with location/position = Dativ. Masculine Dativ: dem.`,
    },
    {
      type: "case",
      question: `"Ich kaufe ___ Blume für meine Mutter." — Which article?`,
      options: ["die", "der", "den", "eine"],
      correctIndex: 3,
      explanation: `Direct object (Akkusativ). Feminine Akkusativ stays "eine" (or "die" for definite).`,
    },
    {
      type: "case",
      question: `"Wir fahren ohne ___ Auto." — Which form?`,
      options: ["der", "das", "den", "dem"],
      correctIndex: 1,
      explanation: `"ohne" always takes Akkusativ. Neuter Akkusativ: das.`,
    },
  ];
  return questions[Math.floor(Math.random() * questions.length)];
}

function generateConjugationQuestion(): QuizQuestion {
  const questions: QuizQuestion[] = [
    { type: "conjugation", question: `"Ich ___ müde." (sein)`, options: ["bin", "bist", "ist", "sind"], correctIndex: 0, explanation: `ich bin (I am)` },
    { type: "conjugation", question: `"Du ___ ein Buch." (lesen)`, options: ["lest", "liest", "lese", "lesen"], correctIndex: 1, explanation: `du liest — stem vowel change e→ie` },
    { type: "conjugation", question: `"Er ___ nach Berlin." (fahren)`, options: ["fahrt", "fährt", "fahre", "fahren"], correctIndex: 1, explanation: `er fährt — stem vowel change a→ä` },
    { type: "conjugation", question: `"Wir ___ Deutsch." (sprechen)`, options: ["sprecht", "spricht", "sprechen", "spreche"], correctIndex: 2, explanation: `wir sprechen — regular for wir` },
    { type: "conjugation", question: `"___ du das?" (sehen)`, options: ["Sehst", "Siehst", "Seht", "Sehen"], correctIndex: 1, explanation: `du siehst — stem vowel change e→ie` },
    { type: "conjugation", question: `"Sie ___ gern Kuchen." (essen)`, options: ["esst", "isst", "esse", "essen"], correctIndex: 1, explanation: `sie isst — stem vowel change e→i` },
    { type: "conjugation", question: `"Ich ___ dir helfen." (können)`, options: ["könne", "kannst", "kann", "können"], correctIndex: 2, explanation: `ich kann — modal verb, no ending for ich` },
    { type: "conjugation", question: `"Er ___ das Buch." (nehmen)`, options: ["nehmt", "nimmt", "nehme", "nehmen"], correctIndex: 1, explanation: `er nimmt — stem vowel change e→i, double m` },
    { type: "conjugation", question: `"Ihr ___ sehr gut." (singen)`, options: ["singt", "singst", "singen", "singe"], correctIndex: 0, explanation: `ihr singt — regular -t ending` },
    { type: "conjugation", question: `"Du ___ mir bitte." (helfen)`, options: ["helfst", "hilfst", "helft", "helfe"], correctIndex: 1, explanation: `du hilfst — stem vowel change e→i` },
  ];
  return questions[Math.floor(Math.random() * questions.length)];
}

function generateQuiz(vocab: VocabWord[], count: number = 10): QuizQuestion[] {
  const questions: QuizQuestion[] = [];
  const types = ["article", "translation-de", "translation-en", "case", "conjugation"];
  for (let i = 0; i < count; i++) {
    const type = types[i % types.length];
    let q: QuizQuestion | null = null;
    if (type === "article") q = generateArticleQuestion(vocab);
    else if (type === "translation-de") q = generateTranslationQuestion(vocab, "de-en");
    else if (type === "translation-en") q = generateTranslationQuestion(vocab, "en-de");
    else if (type === "case") q = generateCaseQuestion();
    else q = generateConjugationQuestion();
    if (q) questions.push(q);
  }
  return questions.sort(() => Math.random() - 0.5);
}

// ─── Component ──────────────────────────────────────────────────
export default function GermanPage() {
  const [tab, setTab] = useState<Tab>("dictionary");
  const [vocab, setVocab] = useState<VocabWord[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Load vocab from SQLite, merging with builtins
  useEffect(() => {
    async function load() {
      let saved: VocabWord[] = [];
      try {
        saved = (await api.getVocab()) as VocabWord[];
      } catch { /* ignore */ }
      // Merge: keep saved state for known words, add any new builtins
      const savedKeys = new Set(saved.map((w) => `${w.german}|${w.partOfSpeech}`));
      const merged = [...saved];
      for (const b of ALL_BUILTIN) {
        const key = `${b.german}|${b.partOfSpeech}`;
        if (!savedKeys.has(key)) {
          merged.push(initWord(b, "builtin"));
        }
      }
      setVocab(merged);
      setLoaded(true);
    }
    load();
  }, []);

  // Persist vocab
  const prevVocabRef = useRef(vocab);
  useEffect(() => {
    if (!loaded || prevVocabRef.current === vocab) return;
    prevVocabRef.current = vocab;
    api.saveVocab(vocab);
  }, [vocab, loaded]);

  const saveVocab = useCallback((updater: (prev: VocabWord[]) => VocabWord[]) => {
    setVocab(updater);
  }, []);

  if (!loaded) return <div className="min-h-screen" style={{ backgroundColor: theme.bg }} />;

  return (
    <div className="min-h-screen hud-scifi-bg" style={{ backgroundColor: theme.bg, color: theme.primary }}>
      <CircuitBackground />
      <main className="relative z-10 max-w-5xl mx-auto px-4 py-6">
        <Navigation />
        <h1 className="text-2xl font-bold mb-1 tracking-wide" style={{ textShadow: `0 0 10px ${theme.primary}` }}>
          Deutsch
        </h1>
        <p className="text-sm mb-6" style={{ color: theme.secondary }}>German Language Learning</p>

        {/* Tab Bar */}
        <div className="flex gap-1 mb-6 flex-wrap">
          {(["dictionary", "flashcards", "grammar", "quiz", "backup"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-4 py-2 text-sm font-mono uppercase tracking-wider transition-all"
              style={{
                background: tab === t ? `${theme.primary}20` : "transparent",
                border: `1px solid ${tab === t ? theme.primary : theme.primary + "40"}`,
                color: tab === t ? theme.primary : theme.secondary,
                textShadow: tab === t ? `0 0 6px ${theme.primary}` : "none",
              }}
            >
              {t === "backup" ? "Export / Import" : t}
            </button>
          ))}
        </div>

        {tab === "dictionary" && <DictionaryTab vocab={vocab} saveVocab={saveVocab} />}
        {tab === "flashcards" && <FlashcardsTab vocab={vocab} saveVocab={saveVocab} />}
        {tab === "grammar" && <GrammarTab />}
        {tab === "quiz" && <QuizTab vocab={vocab} />}
        {tab === "backup" && <BackupTab vocab={vocab} setVocab={setVocab} />}
      </main>
    </div>
  );
}

// ─── Dictionary Tab ─────────────────────────────────────────────
function DictionaryTab({ vocab, saveVocab }: { vocab: VocabWord[]; saveVocab: (fn: (prev: VocabWord[]) => VocabWord[]) => void }) {
  const [query, setQuery] = useState("");
  const [direction, setDirection] = useState<"de-en" | "en-de">("de-en");
  const [result, setResult] = useState<{ word: string; translation: string; alternatives: string[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [added, setAdded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Search built-in vocab first, then API
  const localResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    return vocab.filter((w) => {
      if (direction === "de-en") {
        return w.german.toLowerCase().includes(q) || (w.article && `${w.article} ${w.german}`.toLowerCase().includes(q));
      }
      return w.english.toLowerCase().includes(q);
    }).slice(0, 10);
  }, [query, direction, vocab]);

  const handleLookup = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    setAdded(false);
    try {
      const res = await fetch("/api/german/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: query.trim(), direction }),
      });
      if (!res.ok) throw new Error("Lookup failed");
      const data = await res.json();
      setResult(data);
    } catch {
      setError("Could not look up word. Check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddToFlashcards = () => {
    if (!result) return;
    const german = direction === "de-en" ? result.word : result.translation;
    const english = direction === "de-en" ? result.translation : result.word;
    const exists = vocab.some((w) => w.german.toLowerCase() === german.toLowerCase());
    if (exists) { setAdded(true); return; }
    saveVocab((prev) => [...prev, initWord({
      german: german.charAt(0).toUpperCase() + german.slice(1),
      english: english.toLowerCase(),
      partOfSpeech: "noun", // default, user can refine
      category: "Lookup",
    }, "lookup")]);
    setAdded(true);
  };

  return (
    <div>
      <div className="flex gap-2 mb-4 items-center flex-wrap">
        <select
          value={direction}
          onChange={(e) => { setDirection(e.target.value as "de-en" | "en-de"); setResult(null); setError(""); }}
          className="px-3 py-2 font-mono text-sm"
          style={{ background: "#000", border: `1px solid ${theme.primary}40`, color: theme.primary }}
        >
          <option value="de-en">Deutsch → English</option>
          <option value="en-de">English → Deutsch</option>
        </select>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setResult(null); setAdded(false); }}
          onKeyDown={(e) => e.key === "Enter" && handleLookup()}
          placeholder={direction === "de-en" ? "Type a German word..." : "Type an English word..."}
          className="flex-1 min-w-[200px] px-3 py-2 font-mono text-sm"
          style={{ background: "#000", border: `1px solid ${theme.primary}40`, color: theme.primary }}
        />
        <button
          onClick={handleLookup}
          disabled={loading || !query.trim()}
          className="px-4 py-2 font-mono text-sm uppercase tracking-wider transition-all"
          style={{ background: `${theme.primary}20`, border: `1px solid ${theme.primary}`, color: theme.primary, opacity: loading ? 0.5 : 1 }}
        >
          {loading ? "..." : "Look Up"}
        </button>
      </div>

      {/* Local matches */}
      {query.trim() && localResults.length > 0 && !result && (
        <div className="mb-4">
          <p className="text-xs uppercase tracking-wider mb-2" style={{ color: theme.secondary }}>From your vocabulary</p>
          <div className="space-y-1">
            {localResults.map((w, i) => (
              <div key={i} className="flex gap-3 px-3 py-2 font-mono text-sm" style={{ background: `${theme.primary}08`, border: `1px solid ${theme.primary}15` }}>
                <span style={{ color: w.article ? ARTICLE_COLORS[w.article] || theme.primary : theme.primary }}>
                  {w.article ? `${w.article} ${w.german}` : w.german}
                </span>
                <span style={{ color: theme.secondary }}>—</span>
                <span style={{ color: "#fff" }}>{w.english}</span>
                {w.partOfSpeech !== "phrase" && <span className="text-xs" style={{ color: theme.secondary }}>({w.partOfSpeech})</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* API result */}
      {result && (
        <div className="p-4 mb-4" style={{ background: `${theme.primary}10`, border: `1px solid ${theme.primary}40` }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-lg" style={{ color: theme.primary }}>
                {result.word} → <span style={{ color: "#fff" }}>{result.translation}</span>
              </p>
              {result.alternatives.length > 0 && (
                <p className="text-sm mt-1" style={{ color: theme.secondary }}>
                  Also: {result.alternatives.join(", ")}
                </p>
              )}
            </div>
            <button
              onClick={handleAddToFlashcards}
              disabled={added}
              className="px-3 py-1 font-mono text-xs uppercase tracking-wider whitespace-nowrap transition-all"
              style={{
                background: added ? `${theme.primary}10` : `${theme.primary}20`,
                border: `1px solid ${added ? theme.secondary : theme.primary}`,
                color: added ? theme.secondary : theme.primary,
              }}
            >
              {added ? "Added" : "+ Flashcards"}
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-sm font-mono" style={{ color: "#FF4A6A" }}>{error}</p>}

      {/* Recent lookups */}
      {!query.trim() && (() => {
        const lookups = vocab.filter((w) => w.source === "lookup").slice(-20).reverse();
        if (lookups.length === 0) return null;
        return (
          <div>
            <p className="text-xs uppercase tracking-wider mb-2" style={{ color: theme.secondary }}>Recent lookups</p>
            <div className="space-y-1">
              {lookups.map((w, i) => (
                <div key={i} className="flex gap-3 px-3 py-2 font-mono text-sm" style={{ background: `${theme.primary}08`, border: `1px solid ${theme.primary}15` }}>
                  <span style={{ color: w.article ? ARTICLE_COLORS[w.article] || theme.primary : theme.primary }}>
                    {w.article ? `${w.article} ${w.german}` : w.german}
                  </span>
                  <span style={{ color: theme.secondary }}>—</span>
                  <span style={{ color: "#fff" }}>{w.english}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ─── Flashcards Tab ─────────────────────────────────────────────
function FlashcardsTab({ vocab, saveVocab }: { vocab: VocabWord[]; saveVocab: (fn: (prev: VocabWord[]) => VocabWord[]) => void }) {
  const [flipped, setFlipped] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filter, setFilter] = useState<"all" | "due" | "noun" | "verb" | "adjective" | "phrase">("due");
  const [showFront, setShowFront] = useState<"german" | "english">("german");

  const filteredVocab = useMemo(() => {
    let words = [...vocab];
    if (filter === "due") words = words.filter((w) => w.nextReview <= Date.now());
    else if (filter !== "all") words = words.filter((w) => w.partOfSpeech === filter);
    // Sort by next review (most overdue first)
    return words.sort((a, b) => a.nextReview - b.nextReview);
  }, [vocab, filter]);

  const current = filteredVocab[currentIndex] || null;
  const dueCount = vocab.filter((w) => w.nextReview <= Date.now()).length;

  const handleRate = (quality: number) => {
    if (!current) return;
    const updated = sm2Update(current, quality);
    saveVocab((prev) => prev.map((w) => (w.german === current.german && w.partOfSpeech === current.partOfSpeech ? updated : w)));
    setFlipped(false);
    setCurrentIndex((i) => (i + 1 >= filteredVocab.length ? 0 : i + 1));
  };

  return (
    <div>
      {/* Filter bar */}
      <div className="flex gap-2 mb-4 items-center flex-wrap">
        {(["due", "all", "noun", "verb", "adjective", "phrase"] as const).map((f) => (
          <button
            key={f}
            onClick={() => { setFilter(f); setCurrentIndex(0); setFlipped(false); }}
            className="px-3 py-1 text-xs font-mono uppercase tracking-wider"
            style={{
              background: filter === f ? `${theme.primary}20` : "transparent",
              border: `1px solid ${filter === f ? theme.primary : theme.primary + "30"}`,
              color: filter === f ? theme.primary : theme.secondary,
            }}
          >
            {f === "due" ? `Due (${dueCount})` : f}
          </button>
        ))}
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => setShowFront(showFront === "german" ? "english" : "german")}
            className="px-3 py-1 text-xs font-mono"
            style={{ border: `1px solid ${theme.primary}30`, color: theme.secondary }}
          >
            Front: {showFront === "german" ? "DE" : "EN"}
          </button>
        </div>
      </div>

      <p className="text-xs mb-3 font-mono" style={{ color: theme.secondary }}>
        {filteredVocab.length} cards{filter === "due" ? " due for review" : ""}
        {filteredVocab.length > 0 && ` — Card ${currentIndex + 1} of ${filteredVocab.length}`}
      </p>

      {/* Flashcard */}
      {current ? (
        <div className="flex flex-col items-center">
          <button
            onClick={() => setFlipped(!flipped)}
            className="w-full max-w-lg p-8 text-center transition-all cursor-pointer"
            style={{
              background: `${theme.primary}08`,
              border: `2px solid ${flipped ? theme.primary : theme.primary + "60"}`,
              minHeight: 200,
              boxShadow: flipped ? `0 0 20px ${theme.primary}30` : "none",
            }}
          >
            {!flipped ? (
              <div>
                <p className="text-3xl font-bold mb-2" style={{
                  color: showFront === "german" && current.article
                    ? ARTICLE_COLORS[current.article] || theme.primary
                    : theme.primary,
                }}>
                  {showFront === "german"
                    ? (current.article ? `${current.article} ${current.german}` : current.german)
                    : current.english}
                </p>
                <p className="text-xs uppercase tracking-wider" style={{ color: theme.secondary }}>
                  {current.partOfSpeech}{current.category ? ` — ${current.category}` : ""}
                </p>
                <p className="text-xs mt-4" style={{ color: theme.secondary + "80" }}>tap to flip</p>
              </div>
            ) : (
              <div>
                <p className="text-2xl font-bold mb-2" style={{
                  color: showFront === "english" && current.article
                    ? ARTICLE_COLORS[current.article] || theme.primary
                    : "#fff",
                }}>
                  {showFront === "german"
                    ? current.english
                    : (current.article ? `${current.article} ${current.german}` : current.german)}
                </p>
                {current.example && (
                  <div className="mt-4 text-left">
                    <p className="text-sm font-mono" style={{ color: theme.primary }}>
                      {current.example}
                    </p>
                    {current.exampleEn && (
                      <p className="text-sm font-mono" style={{ color: theme.secondary }}>
                        {current.exampleEn}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </button>

          {/* Rating buttons (only show when flipped) */}
          {flipped && (
            <div className="flex gap-2 mt-4">
              <button onClick={() => handleRate(1)} className="px-4 py-2 text-sm font-mono" style={{ background: "#FF4A6A20", border: "1px solid #FF4A6A", color: "#FF4A6A" }}>
                Again
              </button>
              <button onClick={() => handleRate(3)} className="px-4 py-2 text-sm font-mono" style={{ background: "#FFB84A20", border: "1px solid #FFB84A", color: "#FFB84A" }}>
                Hard
              </button>
              <button onClick={() => handleRate(4)} className="px-4 py-2 text-sm font-mono" style={{ background: `${theme.primary}20`, border: `1px solid ${theme.primary}`, color: theme.primary }}>
                Good
              </button>
              <button onClick={() => handleRate(5)} className="px-4 py-2 text-sm font-mono" style={{ background: "#4AFF8820", border: "1px solid #4AFF88", color: "#4AFF88" }}>
                Easy
              </button>
            </div>
          )}

          {/* Skip / navigation */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => { setFlipped(false); setCurrentIndex((i) => (i > 0 ? i - 1 : filteredVocab.length - 1)); }}
              className="px-3 py-1 text-xs font-mono"
              style={{ border: `1px solid ${theme.primary}30`, color: theme.secondary }}
            >
              Prev
            </button>
            <button
              onClick={() => { setFlipped(false); setCurrentIndex((i) => (i + 1 >= filteredVocab.length ? 0 : i + 1)); }}
              className="px-3 py-1 text-xs font-mono"
              style={{ border: `1px solid ${theme.primary}30`, color: theme.secondary }}
            >
              Skip
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-lg font-mono" style={{ color: theme.primary }}>
            {filter === "due" ? "No cards due for review!" : "No cards match this filter."}
          </p>
          {filter === "due" && (
            <p className="text-sm mt-2" style={{ color: theme.secondary }}>
              Come back later or switch to "All" to practice anyway.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Grammar Tab ────────────────────────────────────────────────
function GrammarTab() {
  const [expanded, setExpanded] = useState<string | null>("cases");

  return (
    <div className="space-y-2">
      {GRAMMAR_SECTIONS.map((section) => {
        const isOpen = expanded === section.id;
        return (
          <div key={section.id} style={{ border: `1px solid ${isOpen ? theme.primary : theme.primary + "30"}` }}>
            <button
              onClick={() => setExpanded(isOpen ? null : section.id)}
              className="w-full text-left px-4 py-3 flex items-center justify-between font-mono text-sm uppercase tracking-wider"
              style={{ background: isOpen ? `${theme.primary}15` : `${theme.primary}05`, color: theme.primary }}
            >
              {section.title}
              <span style={{ color: theme.secondary }}>{isOpen ? "−" : "+"}</span>
            </button>
            {isOpen && (
              <div className="px-4 py-3" style={{ background: `${theme.primary}05` }}>
                <p className="text-sm mb-4" style={{ color: "#ccc" }}>{section.content}</p>
                {section.table && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm font-mono" style={{ borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          {section.table.headers.map((h, i) => (
                            <th key={i} className="text-left px-3 py-2" style={{ borderBottom: `1px solid ${theme.primary}40`, color: theme.primary }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {section.table.rows.map((row, ri) => (
                          <tr key={ri}>
                            {row.map((cell, ci) => (
                              <td key={ci} className="px-3 py-2" style={{ borderBottom: `1px solid ${theme.primary}15`, color: ci === 0 ? theme.secondary : "#ddd" }}>
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Quiz Tab ───────────────────────────────────────────────────
function QuizTab({ vocab }: { vocab: VocabWord[] }) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [quizType, setQuizType] = useState<"mixed" | "articles" | "cases" | "conjugation" | "translation">("mixed");
  const [quizHistory, setQuizHistory] = useState<{ date: string; type: string; score: number; total: number }[]>([]);

  useEffect(() => {
    api.getKV<{ date: string; type: string; score: number; total: number }[]>("german-quiz-stats").then((stats) => {
      if (stats) setQuizHistory(stats);
    });
  }, []);

  const startQuiz = (type: typeof quizType) => {
    setQuizType(type);
    let qs: QuizQuestion[] = [];
    if (type === "articles") {
      for (let i = 0; i < 10; i++) { const q = generateArticleQuestion(vocab); if (q) qs.push(q); }
    } else if (type === "cases") {
      for (let i = 0; i < 10; i++) qs.push(generateCaseQuestion());
    } else if (type === "conjugation") {
      for (let i = 0; i < 10; i++) qs.push(generateConjugationQuestion());
    } else if (type === "translation") {
      for (let i = 0; i < 10; i++) {
        const q = generateTranslationQuestion(vocab, i % 2 === 0 ? "de-en" : "en-de");
        if (q) qs.push(q);
      }
    } else {
      qs = generateQuiz(vocab, 10);
    }
    setQuestions(qs);
    setCurrentQ(0);
    setSelected(null);
    setScore(0);
    setFinished(false);
  };

  const handleAnswer = (idx: number) => {
    if (selected !== null) return; // already answered
    setSelected(idx);
    if (idx === questions[currentQ].correctIndex) {
      setScore((s) => s + 1);
    }
  };

  const handleNext = () => {
    if (currentQ + 1 >= questions.length) {
      setFinished(true);
      // Save quiz stats
      (async () => {
        try {
          const stats = ((await api.getKV<unknown[]>("german-quiz-stats")) ?? []) as unknown[];
          stats.push({ date: new Date().toISOString(), type: quizType, score, total: questions.length });
          await api.setKV("german-quiz-stats", stats.slice(-100));
        } catch { /* ignore */ }
      })();
    } else {
      setCurrentQ((q) => q + 1);
      setSelected(null);
    }
  };

  // Quiz selection screen
  if (questions.length === 0) {
    return (
      <div>
        <p className="text-sm mb-4" style={{ color: theme.secondary }}>Choose a quiz type:</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {([
            { type: "mixed" as const, label: "Mixed", desc: "All question types" },
            { type: "articles" as const, label: "Articles", desc: "der, die, or das?" },
            { type: "cases" as const, label: "Cases", desc: "Nom, Akk, Dat, Gen" },
            { type: "conjugation" as const, label: "Conjugation", desc: "Verb forms" },
            { type: "translation" as const, label: "Translation", desc: "DE ↔ EN" },
          ]).map(({ type, label, desc }) => (
            <button
              key={type}
              onClick={() => startQuiz(type)}
              className="p-4 text-left font-mono transition-all hover:scale-[1.02]"
              style={{ background: `${theme.primary}08`, border: `1px solid ${theme.primary}40` }}
            >
              <p className="text-sm font-bold" style={{ color: theme.primary }}>{label}</p>
              <p className="text-xs mt-1" style={{ color: theme.secondary }}>{desc}</p>
            </button>
          ))}
        </div>

        {/* Quiz history */}
        {quizHistory.length > 0 && (
          <div className="mt-6">
            <p className="text-xs uppercase tracking-wider mb-2" style={{ color: theme.secondary }}>Recent quizzes</p>
            <div className="space-y-1">
              {quizHistory.slice(-5).reverse().map((s, i) => (
                <div key={i} className="flex gap-4 px-3 py-2 text-xs font-mono" style={{ background: `${theme.primary}05`, border: `1px solid ${theme.primary}15` }}>
                  <span style={{ color: theme.secondary }}>{new Date(s.date).toLocaleDateString()}</span>
                  <span style={{ color: theme.primary }}>{s.type}</span>
                  <span style={{ color: s.score / s.total >= 0.8 ? "#4AFF88" : s.score / s.total >= 0.5 ? "#FFB84A" : "#FF4A6A" }}>
                    {s.score}/{s.total} ({Math.round(s.score / s.total * 100)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Finished screen
  if (finished) {
    const pct = Math.round((score / questions.length) * 100);
    const color = pct >= 80 ? "#4AFF88" : pct >= 50 ? "#FFB84A" : "#FF4A6A";
    return (
      <div className="text-center py-8">
        <p className="text-4xl font-bold font-mono" style={{ color }}>{score} / {questions.length}</p>
        <p className="text-lg mt-2 font-mono" style={{ color }}>{pct}%</p>
        <p className="text-sm mt-4" style={{ color: theme.secondary }}>
          {pct >= 80 ? "Excellent!" : pct >= 50 ? "Good effort, keep practicing!" : "Keep studying, you'll get there!"}
        </p>
        <div className="flex gap-3 justify-center mt-6">
          <button
            onClick={() => startQuiz(quizType)}
            className="px-4 py-2 text-sm font-mono"
            style={{ background: `${theme.primary}20`, border: `1px solid ${theme.primary}`, color: theme.primary }}
          >
            Retry
          </button>
          <button
            onClick={() => { setQuestions([]); setFinished(false); }}
            className="px-4 py-2 text-sm font-mono"
            style={{ border: `1px solid ${theme.primary}40`, color: theme.secondary }}
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  // Active question
  const q = questions[currentQ];
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-xs font-mono" style={{ color: theme.secondary }}>
          Question {currentQ + 1} of {questions.length}
        </p>
        <p className="text-xs font-mono" style={{ color: theme.primary }}>Score: {score}</p>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1 mb-6" style={{ background: `${theme.primary}20` }}>
        <div className="h-full transition-all" style={{ width: `${((currentQ + 1) / questions.length) * 100}%`, background: theme.primary }} />
      </div>

      <p className="text-lg font-mono mb-6" style={{ color: "#fff" }}>{q.question}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {q.options.map((opt, i) => {
          const isSelected = selected === i;
          const isCorrect = i === q.correctIndex;
          const showResult = selected !== null;
          let bg = `${theme.primary}08`;
          let border = `${theme.primary}30`;
          let textColor = "#ddd";
          if (showResult && isCorrect) { bg = "#4AFF8820"; border = "#4AFF88"; textColor = "#4AFF88"; }
          else if (showResult && isSelected && !isCorrect) { bg = "#FF4A6A20"; border = "#FF4A6A"; textColor = "#FF4A6A"; }
          else if (isSelected) { bg = `${theme.primary}20`; border = theme.primary; textColor = theme.primary; }
          return (
            <button
              key={i}
              onClick={() => handleAnswer(i)}
              disabled={selected !== null}
              className="px-4 py-3 text-left font-mono text-sm transition-all"
              style={{ background: bg, border: `1px solid ${border}`, color: textColor, cursor: selected !== null ? "default" : "pointer" }}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {selected !== null && (
        <div className="mt-4">
          <p className="text-sm font-mono mb-3" style={{ color: theme.secondary }}>{q.explanation}</p>
          <button
            onClick={handleNext}
            className="px-4 py-2 text-sm font-mono"
            style={{ background: `${theme.primary}20`, border: `1px solid ${theme.primary}`, color: theme.primary }}
          >
            {currentQ + 1 >= questions.length ? "See Results" : "Next"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Backup / Export / Import Tab ───────────────────────────────
function BackupTab({ vocab, setVocab }: { vocab: VocabWord[]; setVocab: (v: VocabWord[]) => void }) {
  const [importStatus, setImportStatus] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      vocab,
      quizStats: (await api.getKV("german-quiz-stats")) ?? [],
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jarvis-german-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (!data.vocab || !Array.isArray(data.vocab)) throw new Error("Invalid backup file");
        setVocab(data.vocab);
        if (data.quizStats) {
          api.setKV("german-quiz-stats", data.quizStats);
        }
        setImportStatus(`Restored ${data.vocab.length} words from ${data.exportedAt ? new Date(data.exportedAt).toLocaleDateString() : "backup"}.`);
      } catch {
        setImportStatus("Error: Invalid backup file.");
      }
    };
    reader.readAsText(file);
  };

  const totalWords = vocab.length;
  const builtinCount = vocab.filter((w) => w.source === "builtin").length;
  const lookupCount = vocab.filter((w) => w.source === "lookup").length;
  const dueCount = vocab.filter((w) => w.nextReview <= Date.now()).length;
  const masteredCount = vocab.filter((w) => w.repetitions >= 5).length;

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Words", value: totalWords },
          { label: "Built-in", value: builtinCount },
          { label: "Looked Up", value: lookupCount },
          { label: "Due Today", value: dueCount },
          { label: "Mastered (5+)", value: masteredCount },
        ].map(({ label, value }) => (
          <div key={label} className="p-3 text-center font-mono" style={{ background: `${theme.primary}08`, border: `1px solid ${theme.primary}20` }}>
            <p className="text-2xl font-bold" style={{ color: theme.primary }}>{value}</p>
            <p className="text-xs" style={{ color: theme.secondary }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Export */}
      <div className="p-4 mb-4" style={{ background: `${theme.primary}08`, border: `1px solid ${theme.primary}30` }}>
        <p className="text-sm font-mono mb-2" style={{ color: theme.primary }}>Export Data</p>
        <p className="text-xs mb-3" style={{ color: theme.secondary }}>Download all vocabulary, spaced repetition progress, and quiz history as a JSON file.</p>
        <button
          onClick={handleExport}
          className="px-4 py-2 text-sm font-mono uppercase tracking-wider"
          style={{ background: `${theme.primary}20`, border: `1px solid ${theme.primary}`, color: theme.primary }}
        >
          Download Backup
        </button>
      </div>

      {/* Import */}
      <div className="p-4" style={{ background: `${theme.primary}08`, border: `1px solid ${theme.primary}30` }}>
        <p className="text-sm font-mono mb-2" style={{ color: theme.primary }}>Import / Restore</p>
        <p className="text-xs mb-3" style={{ color: theme.secondary }}>Upload a previously exported backup file to restore your data. This will replace your current data.</p>
        <input
          ref={fileRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          className="hidden"
        />
        <button
          onClick={() => fileRef.current?.click()}
          className="px-4 py-2 text-sm font-mono uppercase tracking-wider"
          style={{ background: "#FF4A6A10", border: "1px solid #FF4A6A40", color: "#FF4A6A" }}
        >
          Upload Backup File
        </button>
        {importStatus && <p className="text-xs mt-2 font-mono" style={{ color: importStatus.startsWith("Error") ? "#FF4A6A" : "#4AFF88" }}>{importStatus}</p>}
      </div>
    </div>
  );
}
