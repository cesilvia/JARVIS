import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "data", "jarvis.db");

let _db: Database.Database | null = null;

const SCHEMA_SQL = `
-- Generic key-value store
CREATE TABLE IF NOT EXISTS kv (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Strava activities
CREATE TABLE IF NOT EXISTS strava_activities (
  id                     INTEGER PRIMARY KEY,
  name                   TEXT NOT NULL,
  distance               REAL NOT NULL DEFAULT 0,
  moving_time            INTEGER NOT NULL DEFAULT 0,
  elapsed_time           INTEGER NOT NULL DEFAULT 0,
  type                   TEXT NOT NULL DEFAULT '',
  sport_type             TEXT NOT NULL DEFAULT '',
  trainer                INTEGER NOT NULL DEFAULT 0,
  gear_id                TEXT,
  start_date             TEXT NOT NULL,
  total_elevation_gain   REAL NOT NULL DEFAULT 0,
  average_speed          REAL NOT NULL DEFAULT 0,
  max_speed              REAL NOT NULL DEFAULT 0,
  average_heartrate      REAL,
  max_heartrate          REAL,
  has_heartrate          INTEGER DEFAULT 0,
  average_watts          REAL,
  max_watts              REAL,
  weighted_average_watts REAL,
  device_watts           INTEGER DEFAULT 0,
  kilojoules             REAL,
  calories               REAL,
  average_cadence        REAL,
  suffer_score           REAL,
  pr_count               INTEGER DEFAULT 0,
  achievement_count      INTEGER DEFAULT 0,
  kudos_count            INTEGER NOT NULL DEFAULT 0,
  map_polyline           TEXT,
  description            TEXT,
  start_lat              REAL,
  start_lng              REAL
);

CREATE INDEX IF NOT EXISTS idx_activities_start_date ON strava_activities(start_date);
CREATE INDEX IF NOT EXISTS idx_activities_gear_id ON strava_activities(gear_id);

-- Strava stream cache (per activity)
CREATE TABLE IF NOT EXISTS strava_streams (
  activity_id INTEGER PRIMARY KEY,
  data        TEXT NOT NULL,
  cached_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- German vocabulary with SM-2 spaced repetition
CREATE TABLE IF NOT EXISTS german_vocab (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  german       TEXT NOT NULL,
  english      TEXT NOT NULL,
  article      TEXT,
  part_of_speech TEXT NOT NULL,
  category     TEXT,
  example      TEXT,
  example_en   TEXT,
  next_review  INTEGER NOT NULL,
  interval     REAL NOT NULL DEFAULT 0,
  ease_factor  REAL NOT NULL DEFAULT 2.5,
  repetitions  INTEGER NOT NULL DEFAULT 0,
  source       TEXT NOT NULL DEFAULT 'builtin',
  UNIQUE(german, english)
);

CREATE INDEX IF NOT EXISTS idx_vocab_next_review ON german_vocab(next_review);

-- Recipes
CREATE TABLE IF NOT EXISTS recipes (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  servings     INTEGER NOT NULL DEFAULT 1,
  ingredients  TEXT NOT NULL DEFAULT '[]',
  total_weight REAL NOT NULL DEFAULT 0,
  source_url   TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Saved ingredients (nutrition lookup cache)
CREATE TABLE IF NOT EXISTS saved_ingredients (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL UNIQUE,
  calories      REAL NOT NULL DEFAULT 0,
  carbohydrates REAL NOT NULL DEFAULT 0,
  protein       REAL NOT NULL DEFAULT 0,
  fat           REAL NOT NULL DEFAULT 0,
  serving_size  REAL,
  serving_unit  TEXT,
  per_100g      TEXT,
  source        TEXT,
  image_url     TEXT
);

-- Bikes
CREATE TABLE IF NOT EXISTS bikes (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  type           TEXT NOT NULL,
  color          TEXT,
  notes          TEXT,
  components     TEXT NOT NULL DEFAULT '[]',
  attachments    TEXT NOT NULL DEFAULT '[]',
  strava_gear_id TEXT,
  total_miles    REAL DEFAULT 0,
  indoor_miles   REAL DEFAULT 0,
  road_miles     REAL DEFAULT 0,
  last_sync_at   TEXT
);

-- Gear inventory
CREATE TABLE IF NOT EXISTS gear_inventory (
  id                     TEXT PRIMARY KEY,
  name                   TEXT NOT NULL,
  category               TEXT NOT NULL,
  brand                  TEXT,
  size                   TEXT,
  notes                  TEXT,
  attachments            TEXT NOT NULL DEFAULT '[]',
  purchase_date          TEXT,
  replace_reminder_years REAL,
  sleeve_length          TEXT,
  colors                 TEXT,
  weather                TEXT
);

-- Ride weather (cached from Open-Meteo)
CREATE TABLE IF NOT EXISTS ride_weather (
  activity_id    INTEGER PRIMARY KEY,
  temperature    REAL,
  feels_like     REAL,
  wind_speed     REAL,
  wind_direction INTEGER,
  precipitation  REAL,
  weather_code   INTEGER,
  humidity       REAL,
  timeline       TEXT,
  fetched_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Tire references
CREATE TABLE IF NOT EXISTS tire_refs (
  id      TEXT PRIMARY KEY,
  brand   TEXT NOT NULL,
  model   TEXT NOT NULL,
  width   INTEGER NOT NULL,
  min_psi INTEGER NOT NULL,
  max_psi INTEGER NOT NULL
);

-- ─── Research / RAG tables ────────────────────────────────────

-- Documents synced from Readwise (articles, podcasts, books, highlights)
CREATE TABLE IF NOT EXISTS research_documents (
  id              TEXT PRIMARY KEY,
  readwise_id     TEXT UNIQUE,
  title           TEXT NOT NULL,
  author          TEXT,
  source          TEXT,
  source_url      TEXT,
  category        TEXT,
  content         TEXT,
  summary         TEXT,
  image_url       TEXT,
  word_count      INTEGER DEFAULT 0,
  readwise_updated_at TEXT,
  synced_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_research_docs_source ON research_documents(source);
CREATE INDEX IF NOT EXISTS idx_research_docs_category ON research_documents(category);

-- Tags (many-to-many, supports multiple tags per document)
CREATE TABLE IF NOT EXISTS research_tags (
  document_id TEXT NOT NULL REFERENCES research_documents(id) ON DELETE CASCADE,
  tag         TEXT NOT NULL,
  auto        INTEGER NOT NULL DEFAULT 1,
  confirmed   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (document_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_tags_tag ON research_tags(tag);

-- Podcast / content sources (managed on Research page)
CREATE TABLE IF NOT EXISTS research_sources (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  url         TEXT,
  source_type TEXT NOT NULL,
  active      INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

export function getDb(): Database.Database {
  if (_db) return _db;
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");
  _db.exec(SCHEMA_SQL);
  // Migrations for existing databases
  const migrations = [
    "ALTER TABLE strava_activities ADD COLUMN start_lat REAL",
    "ALTER TABLE strava_activities ADD COLUMN start_lng REAL",
    "ALTER TABLE ride_weather ADD COLUMN timeline TEXT",
  ];
  for (const sql of migrations) {
    try { _db.exec(sql); } catch { /* column already exists */ }
  }
  // Clean up: remove weather data for indoor/virtual rides
  try {
    _db.exec("DELETE FROM ride_weather WHERE activity_id IN (SELECT id FROM strava_activities WHERE trainer = 1 OR sport_type = 'VirtualRide')");
  } catch { /* table may not exist yet */ }
  return _db;
}

// ─── KV helpers ─────────────────────────────────────────────────

export function kvGet<T = unknown>(key: string): T | null {
  const db = getDb();
  const row = db.prepare("SELECT value FROM kv WHERE key = ?").get(key) as { value: string } | undefined;
  if (!row) return null;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return row.value as T;
  }
}

export function kvSet(key: string, value: unknown): void {
  const db = getDb();
  const json = typeof value === "string" ? value : JSON.stringify(value);
  db.prepare(
    "INSERT INTO kv (key, value, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')"
  ).run(key, json);
}

export function kvDelete(key: string): void {
  const db = getDb();
  db.prepare("DELETE FROM kv WHERE key = ?").run(key);
}

export function kvGetAll(): Record<string, unknown> {
  const db = getDb();
  const rows = db.prepare("SELECT key, value FROM kv").all() as { key: string; value: string }[];
  const result: Record<string, unknown> = {};
  for (const row of rows) {
    try {
      result[row.key] = JSON.parse(row.value);
    } catch {
      result[row.key] = row.value;
    }
  }
  return result;
}

// ─── Strava Activities ──────────────────────────────────────────

interface ActivityRow {
  id: number;
  name: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  type: string;
  sport_type: string;
  trainer: number;
  gear_id: string | null;
  start_date: string;
  total_elevation_gain: number;
  average_speed: number;
  max_speed: number;
  average_heartrate: number | null;
  max_heartrate: number | null;
  has_heartrate: number;
  average_watts: number | null;
  max_watts: number | null;
  weighted_average_watts: number | null;
  device_watts: number;
  kilojoules: number | null;
  calories: number | null;
  average_cadence: number | null;
  suffer_score: number | null;
  pr_count: number;
  achievement_count: number;
  kudos_count: number;
  map_polyline: string | null;
  description: string | null;
  start_lat: number | null;
  start_lng: number | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function activityToRow(a: any) {
  return [
    a.id, a.name, a.distance ?? 0, a.moving_time ?? 0, a.elapsed_time ?? 0,
    a.type ?? "", a.sport_type ?? "", a.trainer ? 1 : 0, a.gear_id ?? null,
    a.start_date, a.total_elevation_gain ?? 0, a.average_speed ?? 0, a.max_speed ?? 0,
    a.average_heartrate ?? null, a.max_heartrate ?? null, a.has_heartrate ? 1 : 0,
    a.average_watts ?? null, a.max_watts ?? null, a.weighted_average_watts ?? null,
    a.device_watts ? 1 : 0, a.kilojoules ?? null, a.calories ?? null,
    a.average_cadence ?? null, a.suffer_score ?? null, a.pr_count ?? 0,
    a.achievement_count ?? 0, a.kudos_count ?? 0,
    a.map?.summary_polyline ?? null, a.description ?? null,
    a.start_latlng?.[0] ?? a.start_lat ?? null,
    a.start_latlng?.[1] ?? a.start_lng ?? null,
  ];
}

function rowToActivity(row: ActivityRow) {
  return {
    id: row.id,
    name: row.name,
    distance: row.distance,
    moving_time: row.moving_time,
    elapsed_time: row.elapsed_time,
    type: row.type,
    sport_type: row.sport_type,
    trainer: row.trainer === 1,
    gear_id: row.gear_id,
    start_date: row.start_date,
    total_elevation_gain: row.total_elevation_gain,
    average_speed: row.average_speed,
    max_speed: row.max_speed,
    average_heartrate: row.average_heartrate ?? undefined,
    max_heartrate: row.max_heartrate ?? undefined,
    has_heartrate: row.has_heartrate === 1,
    average_watts: row.average_watts ?? undefined,
    max_watts: row.max_watts ?? undefined,
    weighted_average_watts: row.weighted_average_watts ?? undefined,
    device_watts: row.device_watts === 1,
    kilojoules: row.kilojoules ?? undefined,
    calories: row.calories ?? undefined,
    average_cadence: row.average_cadence ?? undefined,
    suffer_score: row.suffer_score ?? undefined,
    pr_count: row.pr_count,
    achievement_count: row.achievement_count,
    kudos_count: row.kudos_count,
    map: row.map_polyline ? { summary_polyline: row.map_polyline } : undefined,
    description: row.description ?? undefined,
    start_latlng: row.start_lat != null && row.start_lng != null ? [row.start_lat, row.start_lng] : undefined,
  };
}

const UPSERT_ACTIVITY_SQL = `INSERT OR REPLACE INTO strava_activities
  (id, name, distance, moving_time, elapsed_time, type, sport_type, trainer, gear_id,
   start_date, total_elevation_gain, average_speed, max_speed,
   average_heartrate, max_heartrate, has_heartrate,
   average_watts, max_watts, weighted_average_watts, device_watts,
   kilojoules, calories, average_cadence, suffer_score,
   pr_count, achievement_count, kudos_count, map_polyline, description,
   start_lat, start_lng)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function upsertActivities(activities: any[]): void {
  const db = getDb();
  const stmt = db.prepare(UPSERT_ACTIVITY_SQL);
  const tx = db.transaction(() => {
    for (const a of activities) {
      stmt.run(...activityToRow(a));
    }
  });
  tx();
}

export function getAllActivities() {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM strava_activities ORDER BY start_date DESC").all() as ActivityRow[];
  return rows.map(rowToActivity);
}

// ─── Strava Streams ─────────────────────────────────────────────

export function getStream(activityId: number): unknown | null {
  const db = getDb();
  const row = db.prepare("SELECT data FROM strava_streams WHERE activity_id = ?").get(activityId) as { data: string } | undefined;
  if (!row) return null;
  return JSON.parse(row.data);
}

export function setStream(activityId: number, data: unknown): void {
  const db = getDb();
  db.prepare(
    "INSERT OR REPLACE INTO strava_streams (activity_id, data, cached_at) VALUES (?, ?, datetime('now'))"
  ).run(activityId, JSON.stringify(data));
}

// ─── German Vocab ───────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function upsertVocab(words: any[]): void {
  const db = getDb();
  const stmt = db.prepare(`INSERT INTO german_vocab
    (german, english, article, part_of_speech, category, example, example_en,
     next_review, interval, ease_factor, repetitions, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(german, english) DO UPDATE SET
      article = excluded.article,
      part_of_speech = excluded.part_of_speech,
      category = excluded.category,
      example = excluded.example,
      example_en = excluded.example_en,
      next_review = excluded.next_review,
      interval = excluded.interval,
      ease_factor = excluded.ease_factor,
      repetitions = excluded.repetitions,
      source = excluded.source`);
  const tx = db.transaction(() => {
    for (const w of words) {
      stmt.run(
        w.german, w.english, w.article ?? null, w.partOfSpeech ?? w.part_of_speech,
        w.category ?? null, w.example ?? null, w.exampleEn ?? w.example_en ?? null,
        w.nextReview ?? w.next_review ?? 0, w.interval ?? 0,
        w.easeFactor ?? w.ease_factor ?? 2.5, w.repetitions ?? 0,
        w.source ?? "builtin"
      );
    }
  });
  tx();
}

export function getAllVocab() {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM german_vocab ORDER BY id").all() as {
    id: number; german: string; english: string; article: string | null;
    part_of_speech: string; category: string | null; example: string | null;
    example_en: string | null; next_review: number; interval: number;
    ease_factor: number; repetitions: number; source: string;
  }[];
  return rows.map(r => ({
    german: r.german,
    english: r.english,
    article: r.article ?? undefined,
    partOfSpeech: r.part_of_speech,
    category: r.category ?? undefined,
    example: r.example ?? undefined,
    exampleEn: r.example_en ?? undefined,
    nextReview: r.next_review,
    interval: r.interval,
    easeFactor: r.ease_factor,
    repetitions: r.repetitions,
    source: r.source,
  }));
}

export function deleteVocab(german: string, english: string): void {
  const db = getDb();
  db.prepare("DELETE FROM german_vocab WHERE german = ? AND english = ?").run(german, english);
}

// ─── Recipes ────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function upsertRecipes(recipes: any[]): void {
  const db = getDb();
  const stmt = db.prepare(`INSERT OR REPLACE INTO recipes
    (id, name, servings, ingredients, total_weight, source_url, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`);
  const tx = db.transaction(() => {
    for (const r of recipes) {
      stmt.run(
        r.id ?? crypto.randomUUID(),
        r.name, r.servings ?? 1,
        JSON.stringify(r.ingredients ?? []),
        r.totalWeight ?? r.total_weight ?? 0,
        r.sourceUrl ?? r.source_url ?? null,
        r.createdAt ?? r.created_at ?? new Date().toISOString()
      );
    }
  });
  tx();
}

export function getAllRecipes() {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM recipes ORDER BY created_at DESC").all() as {
    id: string; name: string; servings: number; ingredients: string;
    total_weight: number; source_url: string | null; created_at: string;
  }[];
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    servings: r.servings,
    ingredients: JSON.parse(r.ingredients),
    totalWeight: r.total_weight,
    sourceUrl: r.source_url ?? undefined,
    createdAt: r.created_at,
  }));
}

export function deleteRecipe(id: string): void {
  const db = getDb();
  db.prepare("DELETE FROM recipes WHERE id = ?").run(id);
}

// ─── Saved Ingredients ──────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function upsertIngredients(ingredients: any[]): void {
  const db = getDb();
  const stmt = db.prepare(`INSERT INTO saved_ingredients
    (name, calories, carbohydrates, protein, fat, serving_size, serving_unit, per_100g, source, image_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(name) DO UPDATE SET
      calories = excluded.calories,
      carbohydrates = excluded.carbohydrates,
      protein = excluded.protein,
      fat = excluded.fat,
      serving_size = excluded.serving_size,
      serving_unit = excluded.serving_unit,
      per_100g = excluded.per_100g,
      source = excluded.source,
      image_url = excluded.image_url`);
  const tx = db.transaction(() => {
    for (const i of ingredients) {
      stmt.run(
        i.name, i.calories ?? 0, i.carbohydrates ?? 0, i.protein ?? 0, i.fat ?? 0,
        i.servingSize ?? i.serving_size ?? null, i.servingUnit ?? i.serving_unit ?? null,
        i.per100g ?? i.per_100g ? JSON.stringify(i.per100g ?? i.per_100g) : null,
        i.source ?? null, i.imageUrl ?? i.image_url ?? null
      );
    }
  });
  tx();
}

export function getAllIngredients() {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM saved_ingredients ORDER BY name").all() as {
    id: number; name: string; calories: number; carbohydrates: number;
    protein: number; fat: number; serving_size: number | null;
    serving_unit: string | null; per_100g: string | null;
    source: string | null; image_url: string | null;
  }[];
  return rows.map(r => ({
    name: r.name,
    calories: r.calories,
    carbohydrates: r.carbohydrates,
    protein: r.protein,
    fat: r.fat,
    servingSize: r.serving_size ?? undefined,
    servingUnit: r.serving_unit ?? undefined,
    per100g: r.per_100g ? JSON.parse(r.per_100g) : undefined,
    source: r.source ?? undefined,
    imageUrl: r.image_url ?? undefined,
  }));
}

export function deleteIngredient(name: string): void {
  const db = getDb();
  db.prepare("DELETE FROM saved_ingredients WHERE name = ?").run(name);
}

// ─── Bikes ──────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function upsertBikes(bikes: any[]): void {
  const db = getDb();
  const stmt = db.prepare(`INSERT OR REPLACE INTO bikes
    (id, name, type, color, notes, components, attachments, strava_gear_id,
     total_miles, indoor_miles, road_miles, last_sync_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const tx = db.transaction(() => {
    for (const b of bikes) {
      stmt.run(
        b.id, b.name, b.type, b.color ?? null, b.notes ?? null,
        JSON.stringify(b.components ?? []), JSON.stringify(b.attachments ?? []),
        b.stravaGearId ?? b.strava_gear_id ?? null,
        b.totalMiles ?? b.total_miles ?? 0, b.indoorMiles ?? b.indoor_miles ?? 0,
        b.roadMiles ?? b.road_miles ?? 0, b.lastSyncAt ?? b.last_sync_at ?? null
      );
    }
  });
  tx();
}

export function getAllBikes() {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM bikes ORDER BY name").all() as {
    id: string; name: string; type: string; color: string | null;
    notes: string | null; components: string; attachments: string;
    strava_gear_id: string | null; total_miles: number; indoor_miles: number;
    road_miles: number; last_sync_at: string | null;
  }[];
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    type: r.type,
    color: r.color ?? undefined,
    notes: r.notes ?? undefined,
    components: JSON.parse(r.components),
    attachments: JSON.parse(r.attachments),
    stravaGearId: r.strava_gear_id ?? undefined,
    totalMiles: r.total_miles,
    indoorMiles: r.indoor_miles,
    roadMiles: r.road_miles,
    lastSyncAt: r.last_sync_at ?? undefined,
  }));
}

export function deleteBike(id: string): void {
  const db = getDb();
  db.prepare("DELETE FROM bikes WHERE id = ?").run(id);
}

// ─── Gear Inventory ─────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function upsertGearItems(items: any[]): void {
  const db = getDb();
  const stmt = db.prepare(`INSERT OR REPLACE INTO gear_inventory
    (id, name, category, brand, size, notes, attachments,
     purchase_date, replace_reminder_years, sleeve_length, colors, weather)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const tx = db.transaction(() => {
    for (const g of items) {
      stmt.run(
        g.id, g.name, g.category, g.brand ?? null, g.size ?? null,
        g.notes ?? null, JSON.stringify(g.attachments ?? []),
        g.purchaseDate ?? g.purchase_date ?? null,
        g.replaceReminderYears ?? g.replace_reminder_years ?? null,
        g.sleeveLength ?? g.sleeve_length ?? null,
        g.colors ? JSON.stringify(g.colors) : null,
        g.weather ?? null
      );
    }
  });
  tx();
}

export function getAllGearItems() {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM gear_inventory ORDER BY category, name").all() as {
    id: string; name: string; category: string; brand: string | null;
    size: string | null; notes: string | null; attachments: string;
    purchase_date: string | null; replace_reminder_years: number | null;
    sleeve_length: string | null; colors: string | null; weather: string | null;
  }[];
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    category: r.category,
    brand: r.brand ?? undefined,
    size: r.size ?? undefined,
    notes: r.notes ?? undefined,
    attachments: JSON.parse(r.attachments),
    purchaseDate: r.purchase_date ?? undefined,
    replaceReminderYears: r.replace_reminder_years ?? undefined,
    sleeveLength: r.sleeve_length ?? undefined,
    colors: r.colors ? JSON.parse(r.colors) : undefined,
    weather: r.weather ?? undefined,
  }));
}

export function deleteGearItem(id: string): void {
  const db = getDb();
  db.prepare("DELETE FROM gear_inventory WHERE id = ?").run(id);
}

// ─── Tire Refs ──────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function upsertTireRefs(tires: any[]): void {
  const db = getDb();
  const stmt = db.prepare(`INSERT OR REPLACE INTO tire_refs
    (id, brand, model, width, min_psi, max_psi)
    VALUES (?, ?, ?, ?, ?, ?)`);
  const tx = db.transaction(() => {
    for (const t of tires) {
      stmt.run(t.id, t.brand, t.model, t.width, t.minPSI ?? t.min_psi, t.maxPSI ?? t.max_psi);
    }
  });
  tx();
}

export function getAllTireRefs() {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM tire_refs ORDER BY brand, model").all() as {
    id: string; brand: string; model: string; width: number;
    min_psi: number; max_psi: number;
  }[];
  return rows.map(r => ({
    id: r.id,
    brand: r.brand,
    model: r.model,
    width: r.width,
    minPSI: r.min_psi,
    maxPSI: r.max_psi,
  }));
}

export function deleteTireRef(id: string): void {
  const db = getDb();
  db.prepare("DELETE FROM tire_refs WHERE id = ?").run(id);
}

// ─── Ride Weather ────────────────────────────────────────────────

export interface RideWeatherRow {
  activity_id: number;
  temperature: number | null;
  feels_like: number | null;
  wind_speed: number | null;
  wind_direction: number | null;
  precipitation: number | null;
  weather_code: number | null;
  humidity: number | null;
  timeline: string | null; // JSON array of WeatherTimelinePoint
}

export function getWeatherForActivities(activityIds: number[]): Map<number, RideWeatherRow> {
  const db = getDb();
  const result = new Map<number, RideWeatherRow>();
  if (activityIds.length === 0) return result;
  // SQLite has a variable limit, batch in chunks of 500
  for (let i = 0; i < activityIds.length; i += 500) {
    const chunk = activityIds.slice(i, i + 500);
    const placeholders = chunk.map(() => "?").join(",");
    const rows = db.prepare(`SELECT * FROM ride_weather WHERE activity_id IN (${placeholders})`).all(...chunk) as RideWeatherRow[];
    for (const r of rows) result.set(r.activity_id, r);
  }
  return result;
}

export function upsertRideWeather(rows: RideWeatherRow[]): void {
  const db = getDb();
  const stmt = db.prepare(`INSERT OR REPLACE INTO ride_weather
    (activity_id, temperature, feels_like, wind_speed, wind_direction, precipitation, weather_code, humidity, timeline, fetched_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`);
  const tx = db.transaction(() => {
    for (const r of rows) {
      stmt.run(r.activity_id, r.temperature, r.feels_like, r.wind_speed, r.wind_direction, r.precipitation, r.weather_code, r.humidity, r.timeline ?? null);
    }
  });
  tx();
}

export function getActivitiesWithoutWeather(): { id: number; start_lat: number; start_lng: number; start_date: string; map_polyline: string | null; moving_time: number }[] {
  const db = getDb();
  // Rides with no weather at all
  const noWeather = db.prepare(
    `SELECT id, start_lat, start_lng, start_date, map_polyline, moving_time FROM strava_activities
     WHERE start_lat IS NOT NULL AND start_lng IS NOT NULL AND trainer = 0 AND sport_type != 'VirtualRide'
       AND id NOT IN (SELECT activity_id FROM ride_weather)
     ORDER BY start_date DESC`
  ).all() as { id: number; start_lat: number; start_lng: number; start_date: string; map_polyline: string | null; moving_time: number }[];
  // Rides with weather but no timeline (and have a polyline + >1hr ride)
  const noTimeline = db.prepare(
    `SELECT a.id, a.start_lat, a.start_lng, a.start_date, a.map_polyline, a.moving_time FROM strava_activities a
     INNER JOIN ride_weather w ON a.id = w.activity_id
     WHERE a.start_lat IS NOT NULL AND a.start_lng IS NOT NULL AND a.trainer = 0 AND a.sport_type != 'VirtualRide'
       AND a.map_polyline IS NOT NULL AND length(a.map_polyline) > 10 AND a.moving_time > 3600
       AND (w.timeline IS NULL OR w.timeline = 'null')
     ORDER BY a.start_date DESC`
  ).all() as { id: number; start_lat: number; start_lng: number; start_date: string; map_polyline: string | null; moving_time: number }[];
  return [...noWeather, ...noTimeline];
}

export function getAllRideWeather(): RideWeatherRow[] {
  const db = getDb();
  return db.prepare("SELECT * FROM ride_weather").all() as RideWeatherRow[];
}

// ─── Research Documents ─────────────────────────────────────

export interface ResearchDocument {
  id: string;
  readwiseId?: string;
  title: string;
  author?: string;
  source?: string;
  sourceUrl?: string;
  category?: string;
  content?: string;
  summary?: string;
  imageUrl?: string;
  wordCount?: number;
  readwiseUpdatedAt?: string;
  syncedAt?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function upsertResearchDocuments(docs: any[]): void {
  const db = getDb();
  const stmt = db.prepare(`INSERT INTO research_documents
    (id, readwise_id, title, author, source, source_url, category, content, summary, image_url, word_count, readwise_updated_at, synced_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      readwise_id = excluded.readwise_id,
      title = excluded.title,
      author = excluded.author,
      source = excluded.source,
      source_url = excluded.source_url,
      category = excluded.category,
      content = excluded.content,
      summary = excluded.summary,
      image_url = excluded.image_url,
      word_count = excluded.word_count,
      readwise_updated_at = excluded.readwise_updated_at,
      synced_at = datetime('now')`);
  const tx = db.transaction(() => {
    for (const d of docs) {
      stmt.run(
        d.id, d.readwiseId ?? d.readwise_id ?? null,
        d.title, d.author ?? null, d.source ?? null,
        d.sourceUrl ?? d.source_url ?? null, d.category ?? null,
        d.content ?? null, d.summary ?? null,
        d.imageUrl ?? d.image_url ?? null, d.wordCount ?? d.word_count ?? 0,
        d.readwiseUpdatedAt ?? d.readwise_updated_at ?? null,
      );
    }
  });
  tx();
}

export function getAllResearchDocuments(opts?: { source?: string; tag?: string; limit?: number; offset?: number }) {
  const db = getDb();
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (opts?.source) { conditions.push("d.source = ?"); params.push(opts.source); }
  if (opts?.tag) {
    conditions.push("d.id IN (SELECT document_id FROM research_tags WHERE tag = ?)");
    params.push(opts.tag);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;

  const rows = db.prepare(
    `SELECT d.*, GROUP_CONCAT(DISTINCT t.tag) as tags
     FROM research_documents d
     LEFT JOIN research_tags t ON d.id = t.document_id
     ${where}
     GROUP BY d.id
     ORDER BY d.synced_at DESC
     LIMIT ? OFFSET ?`
  ).all(...params, limit, offset) as (Record<string, unknown> & { tags: string | null })[];

  return rows.map(r => ({
    id: r.id as string,
    readwiseId: r.readwise_id as string | undefined,
    title: r.title as string,
    author: r.author as string | undefined,
    source: r.source as string | undefined,
    sourceUrl: r.source_url as string | undefined,
    category: r.category as string | undefined,
    summary: r.summary as string | undefined,
    imageUrl: r.image_url as string | undefined,
    wordCount: r.word_count as number,
    syncedAt: r.synced_at as string,
    tags: r.tags ? r.tags.split(",") : [],
  }));
}

export function getResearchDocument(id: string) {
  const db = getDb();
  const row = db.prepare("SELECT * FROM research_documents WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  const tags = db.prepare("SELECT tag, auto, confirmed FROM research_tags WHERE document_id = ?").all(id) as { tag: string; auto: number; confirmed: number }[];
  return {
    id: row.id as string,
    title: row.title as string,
    author: row.author as string | undefined,
    source: row.source as string | undefined,
    sourceUrl: row.source_url as string | undefined,
    category: row.category as string | undefined,
    content: row.content as string | undefined,
    summary: row.summary as string | undefined,
    wordCount: row.word_count as number,
    syncedAt: row.synced_at as string,
    tags: tags.map(t => ({ tag: t.tag, auto: t.auto === 1, confirmed: t.confirmed === 1 })),
  };
}

export function deleteResearchDocument(id: string): void {
  const db = getDb();
  db.prepare("DELETE FROM research_documents WHERE id = ?").run(id);
}

// ─── Research Tags ──────────────────────────────────────────

export function setResearchTags(documentId: string, tags: { tag: string; auto?: boolean; confirmed?: boolean }[]): void {
  const db = getDb();
  db.prepare("DELETE FROM research_tags WHERE document_id = ?").run(documentId);
  const stmt = db.prepare(
    "INSERT INTO research_tags (document_id, tag, auto, confirmed) VALUES (?, ?, ?, ?)"
  );
  const tx = db.transaction(() => {
    for (const t of tags) {
      stmt.run(documentId, t.tag, t.auto !== false ? 1 : 0, t.confirmed ? 1 : 0);
    }
  });
  tx();
}

export function confirmResearchTag(documentId: string, tag: string): void {
  const db = getDb();
  db.prepare("UPDATE research_tags SET confirmed = 1 WHERE document_id = ? AND tag = ?").run(documentId, tag);
}

export function getUnreviewedTags(limit = 20) {
  const db = getDb();
  const rows = db.prepare(
    `SELECT d.id, d.title, d.source, d.category, GROUP_CONCAT(t.tag) as tags
     FROM research_documents d
     JOIN research_tags t ON t.document_id = d.id
     WHERE t.auto = 1 AND t.confirmed = 0
     GROUP BY d.id
     ORDER BY d.synced_at DESC
     LIMIT ?`
  ).all(limit) as { id: string; title: string; source: string | null; category: string | null; tags: string }[];
  return rows.map(r => ({
    id: r.id,
    title: r.title,
    source: r.source,
    category: r.category,
    tags: r.tags.split(","),
  }));
}

export function getAllTags() {
  const db = getDb();
  const rows = db.prepare(
    "SELECT tag, COUNT(*) as count FROM research_tags GROUP BY tag ORDER BY count DESC"
  ).all() as { tag: string; count: number }[];
  return rows;
}

// ─── Research Sources ───────────────────────────────────────

export function upsertResearchSources(sources: { id: string; name: string; url?: string; sourceType: string; active?: boolean }[]): void {
  const db = getDb();
  const stmt = db.prepare(
    `INSERT OR REPLACE INTO research_sources (id, name, url, source_type, active, created_at) VALUES (?, ?, ?, ?, ?, datetime('now'))`
  );
  const tx = db.transaction(() => {
    for (const s of sources) {
      stmt.run(s.id, s.name, s.url ?? null, s.sourceType, s.active !== false ? 1 : 0);
    }
  });
  tx();
}

export function getAllResearchSources() {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM research_sources ORDER BY name").all() as {
    id: string; name: string; url: string | null; source_type: string; active: number; created_at: string;
  }[];
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    url: r.url ?? undefined,
    sourceType: r.source_type,
    active: r.active === 1,
    createdAt: r.created_at,
  }));
}

export function deleteResearchSource(id: string): void {
  const db = getDb();
  db.prepare("DELETE FROM research_sources WHERE id = ?").run(id);
}

// ─── Research Stats ─────────────────────────────────────────

export function getResearchStats() {
  const db = getDb();
  const docs = db.prepare("SELECT COUNT(*) as count FROM research_documents").get() as { count: number };
  const sources = db.prepare("SELECT COUNT(*) as count FROM research_sources WHERE active = 1").get() as { count: number };
  const unreviewed = db.prepare(
    "SELECT COUNT(DISTINCT document_id) as count FROM research_tags WHERE auto = 1 AND confirmed = 0"
  ).get() as { count: number };
  const tags = getAllTags();
  return {
    documents: docs.count,
    activeSources: sources.count,
    unreviewedTags: unreviewed.count,
    tags,
  };
}

// ─── Full export for backup ─────────────────────────────────────

export function exportAll(): Record<string, unknown> {
  return {
    kv: kvGetAll(),
    activities: getAllActivities(),
    streams: (() => {
      const db = getDb();
      const rows = db.prepare("SELECT activity_id, data FROM strava_streams").all() as { activity_id: number; data: string }[];
      const result: Record<number, unknown> = {};
      for (const r of rows) result[r.activity_id] = JSON.parse(r.data);
      return result;
    })(),
    vocab: getAllVocab(),
    recipes: getAllRecipes(),
    ingredients: getAllIngredients(),
    bikes: getAllBikes(),
    gearItems: getAllGearItems(),
    tireRefs: getAllTireRefs(),
    rideWeather: getAllRideWeather(),
    researchDocuments: getAllResearchDocuments({ limit: 10000 }),
    researchSources: getAllResearchSources(),
    researchTags: getAllTags(),
  };
}
