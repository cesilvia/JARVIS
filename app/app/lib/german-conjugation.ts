// ─── German Verb Conjugation Engine ──────────────────────────────
// Generates conjugations for Präsens, Präteritum, Perfekt, Futur I
// Handles regular verbs via rules + irregular verbs via lookup table
//
// IMPORTANT: This table must be linguistically accurate.
// Sources: Duden, Langenscheidt, Pons conjugation references.

export interface Conjugation {
  ich: string;
  du: string;
  er: string;  // er/sie/es
  wir: string;
  ihr: string;
  sie: string; // sie/Sie
}

export interface VerbConjugations {
  infinitive: string;
  präsens: Conjugation;
  präteritum: Conjugation;
  perfekt: Conjugation;
  futurI: Conjugation;
}

// ─── Irregular Verb Data ────────────────────────────────────────
// Each entry overrides the regular conjugation rules.
// Fields:
//   stem?: Präsens stem (if different from regular)
//   du/er?: Präsens stem-vowel changes for 2nd/3rd person singular
//   prät: Präteritum stem (all persons use this + weak/strong endings)
//   pp: Past participle
//   aux: "haben" or "sein" (auxiliary for Perfekt)
//   strong: true if Präteritum uses strong endings (no -te)

interface IrregularEntry {
  du?: string;     // full du form in Präsens (e.g., "bist", "liest")
  er?: string;     // full er form in Präsens (e.g., "ist", "liest")
  prät: string;    // Präteritum stem for strong, or full ich-form stem for weak
  pp: string;      // past participle
  aux?: "sein";    // only specify if sein (haben is default)
  strong?: boolean; // true = strong Präteritum endings (no -te suffix)
  // For completely irregular Präsens (sein, wissen, etc.)
  präsens?: Conjugation;
  // For completely irregular Präteritum
  präteritum?: Conjugation;
}

// Helper: get the stem of a regular verb (remove -en or -n)
function getStem(infinitive: string): string {
  const clean = infinitive.replace(/^sich\s+/, "");
  if (clean.endsWith("eln") || clean.endsWith("ern")) return clean.slice(0, -1); // wandern→wander, sammeln→sammel
  if (clean.endsWith("en")) return clean.slice(0, -2);
  if (clean.endsWith("n")) return clean.slice(0, -1);
  return clean;
}

// Helper: does stem end in d/t/m/n (preceded by consonant)?
// These verbs need an extra -e- before endings starting with consonant
function needsEInsertion(stem: string): boolean {
  if (/[dt]$/.test(stem)) return true;
  // -m or -n preceded by a consonant other than l, r, m, n, h
  if (/[^lrmnh][mn]$/.test(stem)) return true;
  return false;
}

// Helper: get the base verb (for separable verbs like "anfangen" → "fangen", prefix "an")
function splitSeparable(infinitive: string): { prefix: string; base: string } | null {
  const separablePrefixes = [
    "ab", "an", "auf", "aus", "bei", "ein", "fest", "her", "hin", "los",
    "mit", "nach", "vor", "weg", "zu", "zurück", "zusammen", "weiter",
    "um", "über", "unter", "durch", // these can be separable or inseparable
  ];
  const clean = infinitive.replace(/^sich\s+/, "");
  for (const prefix of separablePrefixes) {
    if (clean.startsWith(prefix) && clean.length > prefix.length + 2) {
      const base = clean.slice(prefix.length);
      // Check if the base verb exists in irregulars
      if (IRREGULARS[base]) {
        return { prefix, base };
      }
    }
  }
  return null;
}

// ─── The Irregular Verb Table ───────────────────────────────────
// Only verbs that deviate from regular conjugation patterns.
// Regular verbs (arbeiten, machen, etc.) don't need entries here.
const IRREGULARS: Record<string, IrregularEntry> = {
  // ── Highly Irregular ──────────────────────────────────────────
  "sein": {
    präsens: { ich: "bin", du: "bist", er: "ist", wir: "sind", ihr: "seid", sie: "sind" },
    präteritum: { ich: "war", du: "warst", er: "war", wir: "waren", ihr: "wart", sie: "waren" },
    prät: "war", pp: "gewesen", aux: "sein", strong: true,
  },
  "haben": {
    präsens: { ich: "habe", du: "hast", er: "hat", wir: "haben", ihr: "habt", sie: "haben" },
    prät: "hatt", pp: "gehabt", strong: false,
  },
  "werden": {
    du: "wirst", er: "wird",
    prät: "wurd", pp: "geworden", aux: "sein", strong: true,
    präteritum: { ich: "wurde", du: "wurdest", er: "wurde", wir: "wurden", ihr: "wurdet", sie: "wurden" },
  },
  "wissen": {
    präsens: { ich: "weiß", du: "weißt", er: "weiß", wir: "wissen", ihr: "wisst", sie: "wissen" },
    prät: "wusst", pp: "gewusst", strong: false,
  },
  "tun": {
    prät: "tat", pp: "getan", strong: true,
    präteritum: { ich: "tat", du: "tatst", er: "tat", wir: "taten", ihr: "tatet", sie: "taten" },
  },

  // ── Modal Verbs ───────────────────────────────────────────────
  "können": {
    präsens: { ich: "kann", du: "kannst", er: "kann", wir: "können", ihr: "könnt", sie: "können" },
    prät: "konnt", pp: "gekonnt", strong: false,
  },
  "müssen": {
    präsens: { ich: "muss", du: "musst", er: "muss", wir: "müssen", ihr: "müsst", sie: "müssen" },
    prät: "musst", pp: "gemusst", strong: false,
  },
  "dürfen": {
    präsens: { ich: "darf", du: "darfst", er: "darf", wir: "dürfen", ihr: "dürft", sie: "dürfen" },
    prät: "durft", pp: "gedurft", strong: false,
  },
  "sollen": {
    präsens: { ich: "soll", du: "sollst", er: "soll", wir: "sollen", ihr: "sollt", sie: "sollen" },
    prät: "sollt", pp: "gesollt", strong: false,
  },
  "wollen": {
    präsens: { ich: "will", du: "willst", er: "will", wir: "wollen", ihr: "wollt", sie: "wollen" },
    prät: "wollt", pp: "gewollt", strong: false,
  },
  "mögen": {
    präsens: { ich: "mag", du: "magst", er: "mag", wir: "mögen", ihr: "mögt", sie: "mögen" },
    prät: "mocht", pp: "gemocht", strong: false,
  },

  // ── Strong Verbs (a→ä, e→i, e→ie, etc.) ──────────────────────
  // Stem vowel change in du/er Präsens + strong Präteritum

  // a → ä / ie / u patterns
  "fahren": { du: "fährst", er: "fährt", prät: "fuhr", pp: "gefahren", aux: "sein", strong: true },
  "fallen": { du: "fällst", er: "fällt", prät: "fiel", pp: "gefallen", aux: "sein", strong: true },
  "fangen": { du: "fängst", er: "fängt", prät: "fing", pp: "gefangen", strong: true },
  "halten": { du: "hältst", er: "hält", prät: "hielt", pp: "gehalten", strong: true },
  "lassen": { du: "lässt", er: "lässt", prät: "ließ", pp: "gelassen", strong: true },
  "laden": { du: "lädst", er: "lädt", prät: "lud", pp: "geladen", strong: true },
  "raten": { du: "rätst", er: "rät", prät: "riet", pp: "geraten", strong: true },
  "schlafen": { du: "schläfst", er: "schläft", prät: "schlief", pp: "geschlafen", strong: true },
  "schlagen": { du: "schlägst", er: "schlägt", prät: "schlug", pp: "geschlagen", strong: true },
  "tragen": { du: "trägst", er: "trägt", prät: "trug", pp: "getragen", strong: true },
  "wachsen": { du: "wächst", er: "wächst", prät: "wuchs", pp: "gewachsen", aux: "sein", strong: true },
  "waschen": { du: "wäschst", er: "wäscht", prät: "wusch", pp: "gewaschen", strong: true },
  "laufen": { du: "läufst", er: "läuft", prät: "lief", pp: "gelaufen", aux: "sein", strong: true },
  "graben": { du: "gräbst", er: "gräbt", prät: "grub", pp: "gegraben", strong: true },

  // e → i patterns
  "essen": { du: "isst", er: "isst", prät: "aß", pp: "gegessen", strong: true },
  "geben": { du: "gibst", er: "gibt", prät: "gab", pp: "gegeben", strong: true },
  "helfen": { du: "hilfst", er: "hilft", prät: "half", pp: "geholfen", strong: true },
  "nehmen": { du: "nimmst", er: "nimmt", prät: "nahm", pp: "genommen", strong: true },
  "sprechen": { du: "sprichst", er: "spricht", prät: "sprach", pp: "gesprochen", strong: true },
  "sterben": { du: "stirbst", er: "stirbt", prät: "starb", pp: "gestorben", aux: "sein", strong: true },
  "treffen": { du: "triffst", er: "trifft", prät: "traf", pp: "getroffen", strong: true },
  "vergessen": { du: "vergisst", er: "vergisst", prät: "vergaß", pp: "vergessen", strong: true },
  "werfen": { du: "wirfst", er: "wirft", prät: "warf", pp: "geworfen", strong: true },
  "brechen": { du: "brichst", er: "bricht", prät: "brach", pp: "gebrochen", strong: true },
  "messen": { du: "misst", er: "misst", prät: "maß", pp: "gemessen", strong: true },
  "treten": { du: "trittst", er: "tritt", prät: "trat", pp: "getreten", aux: "sein", strong: true },
  "gelten": { du: "giltst", er: "gilt", prät: "galt", pp: "gegolten", strong: true },

  // e → ie patterns
  "lesen": { du: "liest", er: "liest", prät: "las", pp: "gelesen", strong: true },
  "sehen": { du: "siehst", er: "sieht", prät: "sah", pp: "gesehen", strong: true },
  "empfehlen": { du: "empfiehlst", er: "empfiehlt", prät: "empfahl", pp: "empfohlen", strong: true },
  "stehlen": { du: "stiehlst", er: "stiehlt", prät: "stahl", pp: "gestohlen", strong: true },
  "befehlen": { du: "befiehlst", er: "befiehlt", prät: "befahl", pp: "befohlen", strong: true },
  "geschehen": { du: "geschieht", er: "geschieht", prät: "geschah", pp: "geschehen", aux: "sein", strong: true },

  // ei → ie / i patterns
  "bleiben": { prät: "blieb", pp: "geblieben", aux: "sein", strong: true },
  "schreiben": { prät: "schrieb", pp: "geschrieben", strong: true },
  "steigen": { prät: "stieg", pp: "gestiegen", aux: "sein", strong: true },
  "treiben": { prät: "trieb", pp: "getrieben", strong: true },
  "scheinen": { prät: "schien", pp: "geschienen", strong: true },
  "leihen": { prät: "lieh", pp: "geliehen", strong: true },
  "streiten": { prät: "stritt", pp: "gestritten", strong: true },
  "schneiden": { prät: "schnitt", pp: "geschnitten", strong: true },
  "entscheiden": { prät: "entschied", pp: "entschieden", strong: true },
  "vergleichen": { prät: "verglich", pp: "verglichen", strong: true },
  "vermeiden": { prät: "vermied", pp: "vermieden", strong: true },
  "weisen": { prät: "wies", pp: "gewiesen", strong: true },
  "beweisen": { prät: "bewies", pp: "bewiesen", strong: true },

  // ie → o patterns
  "bieten": { prät: "bot", pp: "geboten", strong: true },
  "fliegen": { prät: "flog", pp: "geflogen", aux: "sein", strong: true },
  "fließen": { prät: "floss", pp: "geflossen", aux: "sein", strong: true },
  "frieren": { prät: "fror", pp: "gefroren", strong: true },
  "genießen": { prät: "genoss", pp: "genossen", strong: true },
  "gießen": { prät: "goss", pp: "gegossen", strong: true },
  "kriechen": { prät: "kroch", pp: "gekrochen", aux: "sein", strong: true },
  "riechen": { prät: "roch", pp: "gerochen", strong: true },
  "schieben": { prät: "schob", pp: "geschoben", strong: true },
  "schießen": { prät: "schoss", pp: "geschossen", strong: true },
  "schließen": { prät: "schloss", pp: "geschlossen", strong: true },
  "verlieren": { prät: "verlor", pp: "verloren", strong: true },
  "ziehen": { prät: "zog", pp: "gezogen", strong: true },
  "wiegen": { prät: "wog", pp: "gewogen", strong: true },

  // i → a / u patterns
  "finden": { prät: "fand", pp: "gefunden", strong: true },
  "binden": { prät: "band", pp: "gebunden", strong: true },
  "singen": { prät: "sang", pp: "gesungen", strong: true },
  "sinken": { prät: "sank", pp: "gesunken", aux: "sein", strong: true },
  "trinken": { prät: "trank", pp: "getrunken", strong: true },
  "gelingen": { prät: "gelang", pp: "gelungen", aux: "sein", strong: true },
  "gewinnen": { prät: "gewann", pp: "gewonnen", strong: true },
  "schwimmen": { prät: "schwamm", pp: "geschwommen", aux: "sein", strong: true },
  "beginnen": { prät: "begann", pp: "begonnen", strong: true },
  "verschwinden": { prät: "verschwand", pp: "verschwunden", aux: "sein", strong: true },
  "zwingen": { prät: "zwang", pp: "gezwungen", strong: true },
  "verbinden": { prät: "verband", pp: "verbunden", strong: true },
  "empfinden": { prät: "empfand", pp: "empfunden", strong: true },

  // Other strong patterns
  "gehen": { prät: "ging", pp: "gegangen", aux: "sein", strong: true },
  "stehen": { prät: "stand", pp: "gestanden", strong: true },
  "verstehen": { prät: "verstand", pp: "verstanden", strong: true },
  "entstehen": { prät: "entstand", pp: "entstanden", aux: "sein", strong: true },
  "kommen": { prät: "kam", pp: "gekommen", aux: "sein", strong: true },
  "bekommen": { prät: "bekam", pp: "bekommen", strong: true },
  "liegen": { prät: "lag", pp: "gelegen", strong: true },
  "sitzen": { prät: "saß", pp: "gesessen", strong: true },
  "bitten": { prät: "bat", pp: "gebeten", strong: true },
  "rufen": { prät: "rief", pp: "gerufen", strong: true },
  "stoßen": { du: "stößt", er: "stößt", prät: "stieß", pp: "gestoßen", strong: true },
  "heißen": { prät: "hieß", pp: "geheißen", strong: true },
  "lügen": { prät: "log", pp: "gelogen", strong: true },
  "schwören": { prät: "schwor", pp: "geschworen", strong: true },
  "heben": { prät: "hob", pp: "gehoben", strong: true },
  "schaffen": { prät: "schuf", pp: "geschaffen", strong: true }, // "to create" (strong); "to manage" is weak
  "erscheinen": { prät: "erschien", pp: "erschienen", aux: "sein", strong: true },

  // ── Mixed Verbs (irregular Präteritum but weak -te endings) ───
  "bringen": { prät: "bracht", pp: "gebracht", strong: false },
  "denken": { prät: "dacht", pp: "gedacht", strong: false },
  "kennen": { prät: "kannt", pp: "gekannt", strong: false },
  "nennen": { prät: "nannt", pp: "genannt", strong: false },
  "rennen": { prät: "rannt", pp: "gerannt", aux: "sein", strong: false },
  "senden": { prät: "sandt", pp: "gesandt", strong: false }, // also regular: sendete/gesendet
  "wenden": { prät: "wandt", pp: "gewandt", strong: false }, // also regular: wendete/gewendet
  "brennen": { prät: "brannt", pp: "gebrannt", strong: false },

  // ── Verbs with sein auxiliary (but otherwise regular or listed above) ─
  "passieren": { prät: "passiert", pp: "passiert", strong: false, aux: "sein" },
  "wandern": { prät: "wandert", pp: "gewandert", strong: false, aux: "sein" },
  "reisen": { prät: "reist", pp: "gereist", strong: false, aux: "sein" },
  "folgen": { prät: "folgt", pp: "gefolgt", strong: false, aux: "sein" },
  "umziehen": { prät: "zog um", pp: "umgezogen", aux: "sein", strong: true },
  "aufstehen": { prät: "stand auf", pp: "aufgestanden", aux: "sein", strong: true },
  "einschlafen": { du: "schläfst ein", er: "schläft ein", prät: "schlief ein", pp: "eingeschlafen", aux: "sein", strong: true },
  "ankommen": { prät: "kam an", pp: "angekommen", aux: "sein", strong: true },
  "zurückkommen": { prät: "kam zurück", pp: "zurückgekommen", aux: "sein", strong: true },
  "ausgehen": { prät: "ging aus", pp: "ausgegangen", aux: "sein", strong: true },
  "aufwachsen": { du: "wächst auf", er: "wächst auf", prät: "wuchs auf", pp: "aufgewachsen", aux: "sein", strong: true },
  "einziehen": { prät: "zog ein", pp: "eingezogen", aux: "sein", strong: true },
  "auftreten": { du: "trittst auf", er: "tritt auf", prät: "trat auf", pp: "aufgetreten", aux: "sein", strong: true },

  // ── Separable Strong Verbs ────────────────────────────────────
  "anfangen": { du: "fängst an", er: "fängt an", prät: "fing an", pp: "angefangen", strong: true },
  "aufgeben": { du: "gibst auf", er: "gibt auf", prät: "gab auf", pp: "aufgegeben", strong: true },
  "einladen": { du: "lädst ein", er: "lädt ein", prät: "lud ein", pp: "eingeladen", strong: true },
  "vorlesen": { du: "liest vor", er: "liest vor", prät: "las vor", pp: "vorgelesen", strong: true },
  "aussehen": { du: "siehst aus", er: "sieht aus", prät: "sah aus", pp: "ausgesehen", strong: true },
  "fernsehen": { du: "siehst fern", er: "sieht fern", prät: "sah fern", pp: "ferngesehen", strong: true },
  "teilnehmen": { du: "nimmst teil", er: "nimmt teil", prät: "nahm teil", pp: "teilgenommen", strong: true },
  "stattfinden": { prät: "fand statt", pp: "stattgefunden", strong: true },
  "vorziehen": { prät: "zog vor", pp: "vorgezogen", strong: true },
  "zunehmen": { du: "nimmst zu", er: "nimmt zu", prät: "nahm zu", pp: "zugenommen", strong: true },
  "abnehmen": { du: "nimmst ab", er: "nimmt ab", prät: "nahm ab", pp: "abgenommen", strong: true },
  "anbieten": { prät: "bot an", pp: "angeboten", strong: true },
  "aufnehmen": { du: "nimmst auf", er: "nimmt auf", prät: "nahm auf", pp: "aufgenommen", strong: true },
  "ausgeben": { du: "gibst aus", er: "gibt aus", prät: "gab aus", pp: "ausgegeben", strong: true },
  "vorstellen": { prät: "stellt", pp: "vorgestellt", strong: false },
  "anrufen": { prät: "rief an", pp: "angerufen", strong: true },
  "einkaufen": { prät: "kauft", pp: "eingekauft", strong: false },
  "aufräumen": { prät: "räumt", pp: "aufgeräumt", strong: false },

  // ── Inseparable prefix verbs ──────────────────────────────────
  "beschreiben": { prät: "beschrieb", pp: "beschrieben", strong: true },
  "erhalten": { du: "erhältst", er: "erhält", prät: "erhielt", pp: "erhalten", strong: true },
  "verbieten": { prät: "verbot", pp: "verboten", strong: true },
  "versprechen": { du: "versprichst", er: "verspricht", prät: "versprach", pp: "versprochen", strong: true },
  "empfangen": { du: "empfängst", er: "empfängt", prät: "empfing", pp: "empfangen", strong: true },
  "unternehmen": { du: "unternimmst", er: "unternimmt", prät: "unternahm", pp: "unternommen", strong: true },
  "unterbrechen": { du: "unterbrichst", er: "unterbricht", prät: "unterbrach", pp: "unterbrochen", strong: true },
  "unterscheiden": { prät: "unterschied", pp: "unterschieden", strong: true },
  "übertreiben": { prät: "übertrieb", pp: "übertrieben", strong: true },
  "verhindern": { prät: "verhindert", pp: "verhindert", strong: false },
  "verändern": { prät: "verändert", pp: "verändert", strong: false },
  "ersetzen": { prät: "ersetzt", pp: "ersetzt", strong: false },
  "beeinflussen": { prät: "beeinflusst", pp: "beeinflusst", strong: false },
};

// ─── Conjugation Functions ──────────────────────────────────────

function conjugatePräsens(infinitive: string, irr?: IrregularEntry): Conjugation {
  if (irr?.präsens) return irr.präsens;

  const clean = infinitive.replace(/^sich\s+/, "");

  // Detect separable verbs: if du/er form has a space (e.g., "fängst an"), the verb is separable
  const isSeparable = irr?.du?.includes(" ") || irr?.er?.includes(" ");
  let separablePrefix = "";

  if (isSeparable && irr?.du) {
    // Extract the suffix after the last space in du form: "fängst an" → "an"
    const duParts = irr.du.split(" ");
    separablePrefix = duParts.slice(1).join(" ");
  }

  const baseStem = isSeparable ? getStem(clean.slice(separablePrefix.length)) : getStem(clean);
  const stem = isSeparable ? baseStem : getStem(clean);
  const eInsert = needsEInsertion(stem);

  const ichVerb = stem + "e";
  const ich = isSeparable ? `${ichVerb} ${separablePrefix}` : ichVerb;
  const du = irr?.du || (stem + (eInsert ? "est" : "st"));
  const er = irr?.er || (stem + (eInsert ? "et" : "t"));
  const wirVerb = clean.endsWith("eln") ? stem + "n" : stem + "en";
  const wir = isSeparable ? `${stem}en ${separablePrefix}` : wirVerb;
  const ihrVerb = stem + (eInsert ? "et" : "t");
  const ihr = isSeparable ? `${ihrVerb} ${separablePrefix}` : ihrVerb;
  const sie = wir;

  return { ich, du, er, wir, ihr, sie };
}

function conjugatePräteritum(infinitive: string, irr?: IrregularEntry): Conjugation {
  if (irr?.präteritum) return irr.präteritum;

  const clean = infinitive.replace(/^sich\s+/, "");

  if (irr) {
    const prätStem = irr.prät;
    if (irr.strong) {
      // Strong Präteritum: no -te suffix, vowel change carries the tense
      // Check for separable prefix in prät (e.g., "fing an")
      const parts = prätStem.split(" ");
      const stem = parts[0];
      const suffix = parts.length > 1 ? " " + parts.slice(1).join(" ") : "";
      const eInsert = needsEInsertion(stem);
      return {
        ich: prätStem,
        du: stem + (eInsert ? "est" : "st") + suffix,
        er: prätStem,
        wir: stem + "en" + suffix,
        ihr: stem + (eInsert ? "et" : "t") + suffix,
        sie: stem + "en" + suffix,
      };
    } else {
      // Mixed/weak irregular: -te endings but irregular stem
      // Check for separable prefix in prät
      const parts = prätStem.split(" ");
      const stem = parts[0];
      const suffix = parts.length > 1 ? " " + parts.slice(1).join(" ") : "";
      // For weak prät, the stem already includes the -t- (e.g., "kannt")
      // We need: ich kannte, du kanntest, etc.
      return {
        ich: stem + "e" + suffix,
        du: stem + "est" + suffix,
        er: stem + "e" + suffix,
        wir: stem + "en" + suffix,
        ihr: stem + "et" + suffix,
        sie: stem + "en" + suffix,
      };
    }
  }

  // Regular weak verb: stem + -te, -test, -te, -ten, -tet, -ten
  const stem = getStem(clean);
  const eInsert = needsEInsertion(stem);
  const base = stem + (eInsert ? "ete" : "te");
  return {
    ich: base,
    du: base + "st",
    er: base,
    wir: base + "n",
    ihr: base + "t",
    sie: base + "n",
  };
}

function conjugatePerfekt(infinitive: string, irr?: IrregularEntry): Conjugation {
  const clean = infinitive.replace(/^sich\s+/, "");
  const aux = irr?.aux || "haben";
  let pp: string;

  if (irr?.pp) {
    pp = irr.pp;
  } else {
    // Regular past participle: ge- + stem + -t
    const stem = getStem(clean);
    const eInsert = needsEInsertion(stem);
    // Inseparable prefixes don't get ge-
    const inseparable = /^(be|emp|ent|er|ge|miss|ver|zer|hinter|über|unter|durch|um|wider)/.test(clean);
    // -ieren verbs don't get ge-
    const ieren = clean.endsWith("ieren");
    const prefix = (inseparable || ieren) ? "" : "ge";
    pp = prefix + stem + (eInsert ? "et" : "t");
  }

  const auxConj = aux === "sein"
    ? { ich: "bin", du: "bist", er: "ist", wir: "sind", ihr: "seid", sie: "sind" }
    : { ich: "habe", du: "hast", er: "hat", wir: "haben", ihr: "habt", sie: "haben" };

  return {
    ich: `${auxConj.ich} ${pp}`,
    du: `${auxConj.du} ${pp}`,
    er: `${auxConj.er} ${pp}`,
    wir: `${auxConj.wir} ${pp}`,
    ihr: `${auxConj.ihr} ${pp}`,
    sie: `${auxConj.sie} ${pp}`,
  };
}

function conjugateFuturI(infinitive: string): Conjugation {
  const clean = infinitive.replace(/^sich\s+/, "");
  return {
    ich: `werde ${clean}`,
    du: `wirst ${clean}`,
    er: `wird ${clean}`,
    wir: `werden ${clean}`,
    ihr: `werdet ${clean}`,
    sie: `werden ${clean}`,
  };
}

// ─── Main API ───────────────────────────────────────────────────

export function conjugateVerb(infinitive: string): VerbConjugations {
  const clean = infinitive.replace(/^sich\s+/, "");
  const irr = IRREGULARS[clean] || IRREGULARS[infinitive];

  return {
    infinitive,
    präsens: conjugatePräsens(infinitive, irr),
    präteritum: conjugatePräteritum(infinitive, irr),
    perfekt: conjugatePerfekt(infinitive, irr),
    futurI: conjugateFuturI(infinitive),
  };
}

// ─── English Translation Helpers ────────────────────────────────
// Maps German conjugated forms to English equivalents for flashcards

interface PronounTranslation {
  subject: string;
  präsens: (eng: string) => string;
  präteritum: (eng: string) => string;
  perfekt: (eng: string) => string;
  futurI: (eng: string) => string;
}

// Simple English translation templates
// eng = base English verb, e.g., "work" from "to work"
function getBaseEnglish(toForm: string): string {
  // "to work" → "work", "to be able to" → "be able to"
  return toForm.replace(/^to\s+/, "").split("/")[0].trim();
}

function thirdPersonS(verb: string): string {
  if (verb === "be") return "is";
  if (verb === "have") return "has";
  if (verb === "do") return "does";
  if (verb === "go") return "goes";
  if (verb.endsWith("y") && !/[aeiou]y$/.test(verb)) return verb.slice(0, -1) + "ies";
  if (/[sxzh]$/.test(verb) || verb.endsWith("ch") || verb.endsWith("sh")) return verb + "es";
  return verb + "s";
}

function pastTense(verb: string): string {
  // Very basic - covers regular verbs, common irregulars should be handled upstream
  if (verb === "be") return "was";
  if (verb === "have") return "had";
  if (verb === "do") return "did";
  if (verb === "go") return "went";
  if (verb === "make") return "made";
  if (verb === "come") return "came";
  if (verb === "give") return "gave";
  if (verb === "take") return "took";
  if (verb === "see") return "saw";
  if (verb === "know") return "knew";
  if (verb === "get") return "got";
  if (verb === "find") return "found";
  if (verb === "think") return "thought";
  if (verb === "say") return "said";
  if (verb === "tell") return "told";
  if (verb === "can") return "could";
  if (verb === "read") return "read";
  if (verb === "write") return "wrote";
  if (verb === "run") return "ran";
  if (verb === "eat") return "ate";
  if (verb === "drink") return "drank";
  if (verb === "drive") return "drove";
  if (verb === "sleep") return "slept";
  if (verb === "speak") return "spoke";
  if (verb === "bring") return "brought";
  if (verb === "buy") return "bought";
  if (verb === "sell") return "sold";
  if (verb === "sit") return "sat";
  if (verb === "stand") return "stood";
  if (verb === "lose") return "lost";
  if (verb === "win") return "won";
  if (verb === "feel") return "felt";
  if (verb === "keep") return "kept";
  if (verb === "leave") return "left";
  if (verb === "begin") return "began";
  if (verb === "break") return "broke";
  if (verb === "fall") return "fell";
  if (verb === "fly") return "flew";
  if (verb === "grow") return "grew";
  if (verb === "hold") return "held";
  if (verb === "lend") return "lent";
  if (verb === "meet") return "met";
  if (verb === "send") return "sent";
  if (verb === "spend") return "spent";
  if (verb === "swim") return "swam";
  if (verb === "sing") return "sang";
  if (verb === "throw") return "threw";
  if (verb === "wear") return "wore";
  if (verb === "forget") return "forgot";
  if (verb === "choose") return "chose";
  if (verb.endsWith("e")) return verb + "d";
  if (verb.endsWith("y") && !/[aeiou]y$/.test(verb)) return verb.slice(0, -1) + "ied";
  return verb + "ed";
}

function pastParticiple(verb: string): string {
  if (verb === "be") return "been";
  if (verb === "have") return "had";
  if (verb === "do") return "done";
  if (verb === "go") return "gone";
  if (verb === "make") return "made";
  if (verb === "come") return "come";
  if (verb === "give") return "given";
  if (verb === "take") return "taken";
  if (verb === "see") return "seen";
  if (verb === "know") return "known";
  if (verb === "get") return "gotten";
  if (verb === "find") return "found";
  if (verb === "think") return "thought";
  if (verb === "say") return "said";
  if (verb === "tell") return "told";
  if (verb === "write") return "written";
  if (verb === "eat") return "eaten";
  if (verb === "drink") return "drunk";
  if (verb === "drive") return "driven";
  if (verb === "speak") return "spoken";
  if (verb === "break") return "broken";
  if (verb === "choose") return "chosen";
  if (verb === "fall") return "fallen";
  if (verb === "fly") return "flown";
  if (verb === "grow") return "grown";
  if (verb === "sing") return "sung";
  if (verb === "swim") return "swum";
  if (verb === "throw") return "thrown";
  if (verb === "wear") return "worn";
  if (verb === "forget") return "forgotten";
  if (verb === "win") return "won";
  if (verb === "begin") return "begun";
  if (verb === "run") return "run";
  return pastTense(verb); // fallback to past tense for regular verbs
}

const PRONOUN_TRANSLATIONS: PronounTranslation[] = [
  {
    subject: "I",
    präsens: (eng) => `I ${eng}`,
    präteritum: (eng) => `I ${pastTense(eng)}`,
    perfekt: (eng) => `I have ${pastParticiple(eng)}`,
    futurI: (eng) => `I will ${eng}`,
  },
  {
    subject: "you (informal)",
    präsens: (eng) => `you ${eng}`,
    präteritum: (eng) => `you ${pastTense(eng)}`,
    perfekt: (eng) => `you have ${pastParticiple(eng)}`,
    futurI: (eng) => `you will ${eng}`,
  },
  {
    subject: "he/she/it",
    präsens: (eng) => `he/she ${thirdPersonS(eng)}`,
    präteritum: (eng) => `he/she ${pastTense(eng)}`,
    perfekt: (eng) => `he/she has ${pastParticiple(eng)}`,
    futurI: (eng) => `he/she will ${eng}`,
  },
  {
    subject: "we",
    präsens: (eng) => `we ${eng}`,
    präteritum: (eng) => `we ${pastTense(eng)}`,
    perfekt: (eng) => `we have ${pastParticiple(eng)}`,
    futurI: (eng) => `we will ${eng}`,
  },
  {
    subject: "you (plural)",
    präsens: (eng) => `you ${eng}`,
    präteritum: (eng) => `you ${pastTense(eng)}`,
    perfekt: (eng) => `you have ${pastParticiple(eng)}`,
    futurI: (eng) => `you will ${eng}`,
  },
  {
    subject: "they",
    präsens: (eng) => `they ${eng}`,
    präteritum: (eng) => `they ${pastTense(eng)}`,
    perfekt: (eng) => `they have ${pastParticiple(eng)}`,
    futurI: (eng) => `they will ${eng}`,
  },
];

export type Tense = "präsens" | "präteritum" | "perfekt" | "futurI";
export type Pronoun = "ich" | "du" | "er" | "wir" | "ihr" | "sie";

const TENSE_LABELS: Record<Tense, string> = {
  präsens: "Präsens",
  präteritum: "Präteritum",
  perfekt: "Perfekt",
  futurI: "Futur I",
};

const TENSE_USAGE: Record<Tense, string> = {
  präsens: "Present tense — everyday spoken & written German",
  präteritum: "Simple past — mainly written German, narratives",
  perfekt: "Conversational past — most common spoken past tense",
  futurI: "Future — intentions, predictions, assumptions",
};

const PRONOUN_KEYS: Pronoun[] = ["ich", "du", "er", "wir", "ihr", "sie"];

export interface FlashcardData {
  german: string;     // conjugated form, e.g., "ich arbeite"
  english: string;    // translation, e.g., "I work"
  tense: Tense;
  pronoun: Pronoun;
  infinitive: string;
}

export function generateFlashcards(infinitive: string, englishInfinitive: string): FlashcardData[] {
  const conj = conjugateVerb(infinitive);
  const baseEng = getBaseEnglish(englishInfinitive);
  const cards: FlashcardData[] = [];
  const tenses: Tense[] = ["präsens", "präteritum", "perfekt", "futurI"];
  const isReflexive = infinitive.startsWith("sich ");
  const reflexivePronouns: Record<Pronoun, string> = {
    ich: "mich", du: "dich", er: "sich", wir: "uns", ihr: "euch", sie: "sich",
  };
  // Some reflexive verbs use dative reflexive pronouns
  const dativeReflexive = ["sich vorstellen", "sich überlegen", "sich anmelden"];
  const useDative = dativeReflexive.includes(infinitive);
  if (useDative) {
    reflexivePronouns.ich = "mir";
    reflexivePronouns.du = "dir";
    reflexivePronouns.wir = "uns"; // same
    reflexivePronouns.ihr = "euch"; // same
  }

  for (const tense of tenses) {
    const conjugation = conj[tense];
    for (let i = 0; i < PRONOUN_KEYS.length; i++) {
      const pronoun = PRONOUN_KEYS[i];
      let germanForm = conjugation[pronoun];

      // Add reflexive pronoun if needed
      if (isReflexive) {
        const refPron = reflexivePronouns[pronoun];
        // For Perfekt/Futur, insert reflexive pronoun after subject
        if (tense === "perfekt" || tense === "futurI") {
          const parts = germanForm.split(" ");
          germanForm = parts[0] + " " + refPron + " " + parts.slice(1).join(" ");
        } else {
          germanForm = germanForm.split(" ")[0] + " " + refPron + " " + germanForm.split(" ").slice(1).join(" ");
          // Actually, for simple tenses: "ich erinnere mich" — reflexive comes after verb
          // Re-do: pronoun + verb + reflexive
          const verbParts = germanForm.split(" ");
          // germanForm is just the conjugated form (e.g., "erinnere")
          // We need: "ich erinnere mich"
          germanForm = verbParts.join(" ") + " " + refPron;
        }
      }

      const englishForm = PRONOUN_TRANSLATIONS[i][tense](baseEng);

      cards.push({
        german: `${pronoun} ${germanForm}`,
        english: englishForm,
        tense,
        pronoun,
        infinitive,
      });
    }
  }

  return cards;
}

export { TENSE_LABELS, TENSE_USAGE, PRONOUN_KEYS, IRREGULARS };
