"use client";

import { useMemo } from "react";
import { conjugateVerb, TENSE_USAGE, type Tense } from "../lib/german-conjugation";
import type { VocabWordBase } from "../lib/german-types";

// ─── Theme (matches page.tsx) ───────────────────────────────────
const theme = { primary: "#00D9FF", secondary: "#67C7EB", bg: "#000000" };
const ARTICLE_COLORS: Record<string, string> = {
  der: "#4A9EFF",  // blue - masculine
  die: "#FF4A6A",  // red - feminine
  das: "#FFB347",  // orange - neuter
};

// ─── Shared Modal Shell ─────────────────────────────────────────
function ModalShell({ title, subtitle, onClose, children }: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded"
        style={{ background: "#0a0a0a", border: `1px solid ${theme.primary}40` }}
      >
        <div className="sticky top-0 flex items-center justify-between px-5 py-4" style={{ background: "#0a0a0a", borderBottom: `1px solid ${theme.primary}20` }}>
          <div>
            <h2 className="text-lg font-bold" style={{ color: theme.primary }}>{title}</h2>
            {subtitle && <p className="text-xs mt-0.5" style={{ color: theme.secondary }}>{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 text-sm font-mono"
            style={{ border: `1px solid ${theme.primary}40`, color: theme.secondary }}
          >
            Close
          </button>
        </div>
        <div className="px-5 py-4">
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── Styled Table ───────────────────────────────────────────────
function DetailTable({ headers, rows, highlightCol }: {
  headers: string[];
  rows: string[][];
  highlightCol?: number;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm font-mono" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="px-3 py-2 text-left text-xs uppercase tracking-wider" style={{ color: theme.secondary, borderBottom: `1px solid ${theme.primary}30` }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className="px-3 py-2"
                  style={{
                    color: ci === 0 ? theme.secondary : (highlightCol !== undefined && ci === highlightCol ? theme.primary : "#fff"),
                    borderBottom: `1px solid ${theme.primary}10`,
                    fontWeight: ci === highlightCol ? 600 : 400,
                  }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Section Label ──────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-mono uppercase tracking-wider mt-5 mb-2" style={{ color: theme.secondary }}>
      {children}
    </h3>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 1. NOUN DECLENSION MODAL
// ═══════════════════════════════════════════════════════════════════

// Article declension tables
const DEFINITE_ARTICLES: Record<string, Record<string, string>> = {
  der: { Nominativ: "der", Akkusativ: "den", Dativ: "dem", Genitiv: "des" },
  die: { Nominativ: "die", Akkusativ: "die", Dativ: "der", Genitiv: "der" },
  das: { Nominativ: "das", Akkusativ: "das", Dativ: "dem", Genitiv: "des" },
};

const INDEFINITE_ARTICLES: Record<string, Record<string, string>> = {
  der: { Nominativ: "ein", Akkusativ: "einen", Dativ: "einem", Genitiv: "eines" },
  die: { Nominativ: "eine", Akkusativ: "eine", Dativ: "einer", Genitiv: "einer" },
  das: { Nominativ: "ein", Akkusativ: "ein", Dativ: "einem", Genitiv: "eines" },
};

// Genitive noun suffix: masculine/neuter add -s or -es
function genitiveSuffix(noun: string, article?: string): string {
  if (article !== "der" && article !== "das") return "";
  // Short monosyllabic words typically get -es
  if (noun.length <= 4 || /[sßxz]$/.test(noun)) return "es";
  return "s";
}

// Weak noun: non-nominative forms get -n or -en
function weakNounForm(noun: string): string {
  if (noun.endsWith("e")) return noun + "n";
  return noun + "en";
}

// Sample sentences for each case
function nounCaseSentences(noun: string, article: string, english: string, weakNoun?: boolean): Record<string, { de: string; en: string }> {
  const defArt = DEFINITE_ARTICLES[article];
  const nounNom = noun;
  const nounAkk = weakNoun ? weakNounForm(noun) : noun;
  const nounDat = weakNoun ? weakNounForm(noun) : noun;
  const nounGen = weakNoun
    ? weakNounForm(noun)
    : (article === "der" || article === "das") ? noun + genitiveSuffix(noun, article) : noun;

  return {
    Nominativ: {
      de: `${defArt.Nominativ} ${nounNom} ist hier.`,
      en: `The ${english} is here.`,
    },
    Akkusativ: {
      de: `Ich sehe ${defArt.Akkusativ} ${nounAkk}.`,
      en: `I see the ${english}.`,
    },
    Dativ: {
      de: `Ich gebe ${defArt.Dativ} ${nounDat} etwas.`,
      en: `I give the ${english} something.`,
    },
    Genitiv: {
      de: `Das ist die Farbe ${defArt.Genitiv} ${nounGen}.`,
      en: `That is the color of the ${english}.`,
    },
  };
}

// Full noun phrase table: shows article + adjective + noun across all cases
// for definite, indefinite, and no-article contexts
function NounPhraseTable({ noun, article, weakNoun }: { noun: string; article: string; weakNoun?: boolean }) {
  const gender = article === "der" ? "m" : article === "die" ? "f" : "n";
  const adj = "groß";
  const cases = ["Nominativ", "Akkusativ", "Dativ", "Genitiv"];

  function nounForm(c: string): string {
    if (weakNoun && c !== "Nominativ") return weakNounForm(noun);
    if (c === "Genitiv" && (article === "der" || article === "das")) {
      return noun + genitiveSuffix(noun, article);
    }
    return noun;
  }

  return (
    <DetailTable
      headers={["Case", "Definite", "Indefinite", "No Article"]}
      rows={cases.map((c) => {
        const nf = nounForm(c);
        const defArt = DEF_ART_TABLE[c][gender];
        const indefArt = INDEF_ART_TABLE[c][gender];
        const adjDef = adjWithEnding(adj, ADJ_DEFINITE[c][gender]);
        const adjIndef = adjWithEnding(adj, ADJ_INDEFINITE[c][gender]);
        const adjNone = adjWithEnding(adj, ADJ_NO_ARTICLE[c][gender]);
        return [
          c,
          `${defArt} ${adjDef} ${nf}`,
          indefArt === "—" ? `— ${adjIndef} ${nf}` : `${indefArt} ${adjIndef} ${nf}`,
          `${adjNone} ${nf}`,
        ];
      })}
    />
  );
}

export function NounDeclensionModal({ word, onClose }: {
  word: VocabWordBase & { article: string };
  onClose: () => void;
}) {
  const { german, english, article, weakNoun } = word;
  const genderLabel = article === "der" ? "Masculine" : article === "die" ? "Feminine" : "Neuter";
  const defArt = DEFINITE_ARTICLES[article];
  const indefArt = INDEFINITE_ARTICLES[article];
  const cases = ["Nominativ", "Akkusativ", "Dativ", "Genitiv"];
  const sentences = nounCaseSentences(german, article, english, weakNoun);

  // Compute noun forms per case
  const nounForms = useMemo(() => {
    return cases.map((c) => {
      if (weakNoun && c !== "Nominativ") return weakNounForm(german);
      if (c === "Genitiv" && (article === "der" || article === "das")) {
        return german + genitiveSuffix(german, article);
      }
      return german;
    });
  }, [german, article, weakNoun]);

  return (
    <ModalShell
      title={`${article} ${german}`}
      subtitle={`${english} — ${genderLabel}${weakNoun ? " — Weak Noun (n-Deklination)" : ""}`}
      onClose={onClose}
    >
      {weakNoun && (
        <div className="mb-4 px-3 py-2 rounded text-xs font-mono" style={{ background: "#FFD70010", border: "1px solid #FFD70040", color: "#FFD700" }}>
          Weak noun (n-Deklination) — adds -n/-en in all cases except Nominativ singular
        </div>
      )}

      <SectionLabel>Definite Article (the)</SectionLabel>
      <DetailTable
        headers={["Case", "Article + Noun", "Question"]}
        rows={cases.map((c, i) => [
          c,
          `${defArt[c]} ${nounForms[i]}`,
          c === "Nominativ" ? "Wer? Was?" : c === "Akkusativ" ? "Wen? Was?" : c === "Dativ" ? "Wem?" : "Wessen?",
        ])}
        highlightCol={1}
      />

      <SectionLabel>Indefinite Article (a/an)</SectionLabel>
      <DetailTable
        headers={["Case", "Article + Noun"]}
        rows={cases.map((c, i) => [
          c,
          `${indefArt[c]} ${nounForms[i]}`,
        ])}
        highlightCol={1}
      />

      <SectionLabel>Full Noun Phrase (with adjective &quot;groß&quot;)</SectionLabel>
      <NounPhraseTable noun={german} article={article} weakNoun={weakNoun} />

      <SectionLabel>Example Sentences</SectionLabel>
      <div className="space-y-3">
        {cases.map((c) => (
          <div key={c} className="px-3 py-2 rounded" style={{ background: `${theme.primary}08`, border: `1px solid ${theme.primary}15` }}>
            <span className="text-xs uppercase tracking-wider" style={{ color: theme.secondary }}>{c}</span>
            <p className="text-sm font-mono mt-1" style={{ color: theme.primary }}>{sentences[c].de}</p>
            <p className="text-xs font-mono" style={{ color: theme.secondary }}>{sentences[c].en}</p>
          </div>
        ))}
      </div>
    </ModalShell>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 2. VERB CONJUGATION MODAL
// ═══════════════════════════════════════════════════════════════════

const TENSE_ORDER: Tense[] = ["präsens", "präteritum", "perfekt", "futurI"];
const TENSE_LABELS: Record<Tense, string> = {
  präsens: "Präsens (Present)",
  präteritum: "Präteritum (Simple Past)",
  perfekt: "Perfekt (Conversational Past)",
  futurI: "Futur I (Future)",
};

// Simple example sentences using 1st person singular
function verbTenseSentences(infinitive: string, english: string, conj: ReturnType<typeof conjugateVerb>): Record<Tense, { de: string; en: string }> {
  const baseEng = english.replace(/^to\s+/, "").split("/")[0].trim();
  return {
    präsens: {
      de: `Ich ${conj.präsens.ich} jeden Tag.`,
      en: `I ${baseEng} every day.`,
    },
    präteritum: {
      de: `Ich ${conj.präteritum.ich} gestern.`,
      en: `I ${baseEng === "be" ? "was" : baseEng + "ed"} yesterday.`,
    },
    perfekt: {
      de: `Ich ${conj.perfekt.ich}.`,
      en: `I have ${baseEng === "be" ? "been" : baseEng + "ed"}.`,
    },
    futurI: {
      de: `Ich ${conj.futurI.ich} morgen.`,
      en: `I will ${baseEng} tomorrow.`,
    },
  };
}

export function VerbConjugationModal({ word, onClose }: {
  word: VocabWordBase;
  onClose: () => void;
}) {
  const { german, english } = word;
  const conj = useMemo(() => conjugateVerb(german), [german]);
  const sentences = useMemo(() => verbTenseSentences(german, english, conj), [german, english, conj]);
  const pronounLabels = ["ich", "du", "er/sie/es", "wir", "ihr", "sie/Sie"];
  const pronounKeys = ["ich", "du", "er", "wir", "ihr", "sie"] as const;

  return (
    <ModalShell
      title={german}
      subtitle={english}
      onClose={onClose}
    >
      {TENSE_ORDER.map((tense) => {
        const c = conj[tense];
        return (
          <div key={tense} className="mb-6">
            <SectionLabel>{TENSE_LABELS[tense]}</SectionLabel>
            <p className="text-xs mb-2 -mt-1" style={{ color: theme.secondary + "80" }}>{TENSE_USAGE[tense]}</p>

            {/* 2-column conjugation grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-sm mb-2">
              {/* Left column: ich, du, er */}
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex justify-between px-3 py-1.5 rounded" style={{ background: `${theme.primary}08` }}>
                  <span style={{ color: theme.secondary }}>{pronounLabels[i]}</span>
                  <span style={{ color: theme.primary, fontWeight: 600 }}>{c[pronounKeys[i]]}</span>
                </div>
              ))}
              {/* Right column: wir, ihr, sie */}
              {[3, 4, 5].map((i) => (
                <div key={i} className="flex justify-between px-3 py-1.5 rounded" style={{ background: `${theme.primary}08`, gridColumn: 2, gridRow: i - 2 }}>
                  <span style={{ color: theme.secondary }}>{pronounLabels[i]}</span>
                  <span style={{ color: theme.primary, fontWeight: 600 }}>{c[pronounKeys[i]]}</span>
                </div>
              ))}
            </div>

            {/* Sample sentence */}
            <div className="px-3 py-2 rounded" style={{ background: `${theme.primary}05`, border: `1px solid ${theme.primary}10` }}>
              <p className="text-xs font-mono" style={{ color: theme.primary }}>{sentences[tense].de}</p>
              <p className="text-xs font-mono" style={{ color: theme.secondary }}>{sentences[tense].en}</p>
            </div>
          </div>
        );
      })}
    </ModalShell>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 3. ADJECTIVE ENDING MODAL
// ═══════════════════════════════════════════════════════════════════

// Adjective ending tables
// Format: [case][gender] → ending
// Genders: m(asculine), f(eminine), n(euter), p(lural)

const ADJ_DEFINITE: Record<string, Record<string, string>> = {
  Nominativ: { m: "e", f: "e", n: "e", p: "en" },
  Akkusativ: { m: "en", f: "e", n: "e", p: "en" },
  Dativ:     { m: "en", f: "en", n: "en", p: "en" },
  Genitiv:   { m: "en", f: "en", n: "en", p: "en" },
};

const ADJ_INDEFINITE: Record<string, Record<string, string>> = {
  Nominativ: { m: "er", f: "e", n: "es", p: "en" },
  Akkusativ: { m: "en", f: "e", n: "es", p: "en" },
  Dativ:     { m: "en", f: "en", n: "en", p: "en" },
  Genitiv:   { m: "en", f: "en", n: "en", p: "en" },
};

const ADJ_NO_ARTICLE: Record<string, Record<string, string>> = {
  Nominativ: { m: "er", f: "e", n: "es", p: "e" },
  Akkusativ: { m: "en", f: "e", n: "es", p: "e" },
  Dativ:     { m: "em", f: "er", n: "em", p: "en" },
  Genitiv:   { m: "en", f: "er", n: "en", p: "er" },
};

// Example nouns per gender for illustration
const EXAMPLE_NOUNS: Record<string, { article: string; indef: string; noun: string; en: string }> = {
  m: { article: "der", indef: "ein", noun: "Mann", en: "man" },
  f: { article: "die", indef: "eine", noun: "Frau", en: "woman" },
  n: { article: "das", indef: "ein", noun: "Kind", en: "child" },
  p: { article: "die", indef: "—", noun: "Leute", en: "people" },
};

const GENDER_LABELS: Record<string, string> = { m: "Masc.", f: "Fem.", n: "Neut.", p: "Plural" };
const GENDERS = ["m", "f", "n", "p"] as const;
const CASES = ["Nominativ", "Akkusativ", "Dativ", "Genitiv"];

// Definite article per case/gender
const DEF_ART_TABLE: Record<string, Record<string, string>> = {
  Nominativ: { m: "der", f: "die", n: "das", p: "die" },
  Akkusativ: { m: "den", f: "die", n: "das", p: "die" },
  Dativ:     { m: "dem", f: "der", n: "dem", p: "den" },
  Genitiv:   { m: "des", f: "der", n: "des", p: "der" },
};

const INDEF_ART_TABLE: Record<string, Record<string, string>> = {
  Nominativ: { m: "ein", f: "eine", n: "ein", p: "—" },
  Akkusativ: { m: "einen", f: "eine", n: "ein", p: "—" },
  Dativ:     { m: "einem", f: "einer", n: "einem", p: "—" },
  Genitiv:   { m: "eines", f: "einer", n: "eines", p: "—" },
};

function adjWithEnding(adj: string, ending: string): string {
  // Handle adjectives ending in -e (e.g., "müde" → "müder" not "müdeer")
  if (adj.endsWith("e") && ending.startsWith("e")) return adj + ending.slice(1);
  // Handle adjectives ending in -el (e.g., "dunkel" → "dunkler" not "dunkeler")
  if (adj.endsWith("el") && ending) return adj.slice(0, -2) + "l" + ending;
  // Handle adjectives ending in -er (e.g., "teuer" → "teure" not "teuere")
  if (adj.endsWith("er") && ending && !["er"].includes(ending)) return adj.slice(0, -2) + "r" + ending;
  return adj + ending;
}

function AdjEndingTable({ title, endingTable, articleTable, adj }: {
  title: string;
  endingTable: Record<string, Record<string, string>>;
  articleTable?: Record<string, Record<string, string>>;
  adj: string;
}) {
  return (
    <div className="mb-5">
      <SectionLabel>{title}</SectionLabel>
      <DetailTable
        headers={["Case", ...GENDERS.map((g) => GENDER_LABELS[g])]}
        rows={CASES.map((c) => [
          c,
          ...GENDERS.map((g) => {
            const ending = endingTable[c][g];
            const artStr = articleTable ? articleTable[c][g] : "";
            const noun = EXAMPLE_NOUNS[g].noun;
            const adjForm = adjWithEnding(adj, ending);
            if (artStr && artStr !== "—") {
              return `${artStr} ${adjForm} ${noun}`;
            }
            if (artStr === "—") {
              return `${adjForm} ${noun}`;
            }
            return `${adjForm} ${noun}`;
          }),
        ])}
      />
    </div>
  );
}

export function AdjectiveEndingModal({ word, onClose }: {
  word: VocabWordBase;
  onClose: () => void;
}) {
  const { german, english } = word;

  return (
    <ModalShell
      title={german}
      subtitle={`${english} — Adjective Endings`}
      onClose={onClose}
    >
      <p className="text-xs mb-4" style={{ color: theme.secondary }}>
        Adjective endings depend on the article type, case, and gender. Example nouns: der Mann, die Frau, das Kind, die Leute.
      </p>

      <AdjEndingTable
        title="With Definite Article (der/die/das)"
        endingTable={ADJ_DEFINITE}
        articleTable={DEF_ART_TABLE}
        adj={german}
      />

      <AdjEndingTable
        title="With Indefinite Article (ein/eine)"
        endingTable={ADJ_INDEFINITE}
        articleTable={INDEF_ART_TABLE}
        adj={german}
      />

      <AdjEndingTable
        title="Without Article"
        endingTable={ADJ_NO_ARTICLE}
        adj={german}
      />

      <SectionLabel>Key Pattern</SectionLabel>
      <div className="space-y-2 text-xs font-mono">
        <div className="px-3 py-2 rounded" style={{ background: `${theme.primary}08`, border: `1px solid ${theme.primary}15` }}>
          <p style={{ color: theme.primary }}>Definite article → mostly <strong>-e</strong> or <strong>-en</strong></p>
          <p style={{ color: theme.secondary }}>The article already shows case/gender, so the adjective ending is "weak"</p>
        </div>
        <div className="px-3 py-2 rounded" style={{ background: `${theme.primary}08`, border: `1px solid ${theme.primary}15` }}>
          <p style={{ color: theme.primary }}>Indefinite article → <strong>-er/-e/-es</strong> in Nom, <strong>-en</strong> elsewhere</p>
          <p style={{ color: theme.secondary }}>Where ein has no ending (masc Nom, neut Nom/Akk), the adjective takes the "strong" ending</p>
        </div>
        <div className="px-3 py-2 rounded" style={{ background: `${theme.primary}08`, border: `1px solid ${theme.primary}15` }}>
          <p style={{ color: theme.primary }}>No article → adjective takes the <strong>strong ending</strong> (like der/die/das endings)</p>
          <p style={{ color: theme.secondary }}>The adjective itself must signal case and gender</p>
        </div>
      </div>
    </ModalShell>
  );
}
