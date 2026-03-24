import { getDb, kvGet, getAllRecipes, getAllGearItems, getAllBikes, getResearchStats, getAllResearchSources } from "./db";

// ─── Tool definitions ───────────────────────────────────────────

export interface ToolDef {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema
  execute: (params: Record<string, unknown>) => Promise<string>;
}

const METERS_TO_MILES = 0.000621371;
const METERS_TO_FEET = 3.28084;

export const jarvisTools: ToolDef[] = [
  {
    name: "get_rides",
    description: "Query Strava cycling rides, optionally filtered by date range or name. Returns ride details including distance, time, power, heart rate.",
    parameters: {
      type: "object",
      properties: {
        start_date: { type: "string", description: "ISO date string, e.g. 2026-01-01" },
        end_date: { type: "string", description: "ISO date string" },
        name: { type: "string", description: "Filter rides by name (substring match)" },
        limit: { type: "number", description: "Max results, default 20" },
      },
      required: [],
    },
    execute: async ({ start_date, end_date, name, limit }) => {
      const db = getDb();
      const conditions: string[] = [];
      const params: unknown[] = [];

      if (start_date) { conditions.push("start_date >= ?"); params.push(start_date); }
      if (end_date) { conditions.push("start_date <= ?"); params.push(end_date); }
      if (name) { conditions.push("name LIKE ?"); params.push(`%${name}%`); }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
      const rows = db.prepare(
        `SELECT id, name, distance, moving_time, total_elevation_gain, average_watts, weighted_average_watts, average_heartrate, average_cadence, average_speed, start_date, type, sport_type, trainer, calories
         FROM strava_activities ${where} ORDER BY start_date DESC LIMIT ?`
      ).all(...params, (limit as number) || 20) as Record<string, unknown>[];

      const rides = rows.map((r) => ({
        ...r,
        miles: ((r.distance as number) * METERS_TO_MILES).toFixed(1),
        hours: ((r.moving_time as number) / 3600).toFixed(2),
        elevation_ft: ((r.total_elevation_gain as number) * METERS_TO_FEET).toFixed(0),
        mph: ((r.average_speed as number) * 2.23694).toFixed(1),
      }));

      return JSON.stringify(rides, null, 2);
    },
  },

  {
    name: "get_ride_stats",
    description: "Get aggregate cycling statistics: total miles, rides, elevation, and time for recent periods.",
    parameters: {
      type: "object",
      properties: {
        period: { type: "string", enum: ["week", "month", "year"], description: "Time period to group by" },
        count: { type: "number", description: "How many periods back, default 4" },
      },
      required: ["period"],
    },
    execute: async ({ period, count }) => {
      const db = getDb();
      const n = (count as number) || 4;
      const now = new Date();
      const results: Record<string, unknown>[] = [];

      for (let i = 0; i < n; i++) {
        let start: Date, end: Date, label: string;
        if (period === "week") {
          const d = new Date(now);
          d.setDate(d.getDate() - d.getDay() - i * 7);
          start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
          end = new Date(start);
          end.setDate(end.getDate() + 7);
          label = `Week of ${start.toISOString().split("T")[0]}`;
        } else if (period === "month") {
          start = new Date(now.getFullYear(), now.getMonth() - i, 1);
          end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
          label = start.toLocaleString("default", { month: "long", year: "numeric" });
        } else {
          start = new Date(now.getFullYear() - i, 0, 1);
          end = new Date(now.getFullYear() - i + 1, 0, 1);
          label = `${start.getFullYear()}`;
        }

        const row = db.prepare(
          `SELECT COUNT(*) as rides, COALESCE(SUM(distance),0) as total_distance, COALESCE(SUM(total_elevation_gain),0) as total_elevation, COALESCE(SUM(moving_time),0) as total_time, COALESCE(SUM(calories),0) as total_calories
           FROM strava_activities WHERE start_date >= ? AND start_date < ?`
        ).get(start.toISOString(), end.toISOString()) as Record<string, number>;

        results.push({
          period: label,
          rides: row.rides,
          miles: (row.total_distance * METERS_TO_MILES).toFixed(1),
          elevation_ft: (row.total_elevation * METERS_TO_FEET).toFixed(0),
          hours: (row.total_time / 3600).toFixed(1),
          calories: row.total_calories,
        });
      }

      return JSON.stringify(results, null, 2);
    },
  },

  {
    name: "get_german_words_due",
    description: "Get German vocabulary words due for flashcard review, sorted by most overdue first.",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Max results, default 20" },
      },
      required: [],
    },
    execute: async ({ limit }) => {
      const db = getDb();
      const now = Date.now();
      const rows = db.prepare(
        `SELECT german, english, article, part_of_speech, category, next_review, interval, repetitions
         FROM german_vocab WHERE next_review <= ? ORDER BY next_review ASC LIMIT ?`
      ).all(now, (limit as number) || 20);
      return JSON.stringify(rows, null, 2);
    },
  },

  {
    name: "get_recipes",
    description: "Search recipes by name. Returns recipe name, servings, ingredients, and source URL.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search term for recipe name" },
      },
      required: [],
    },
    execute: async ({ query }) => {
      if (query) {
        const db = getDb();
        const rows = db.prepare(
          "SELECT id, name, servings, ingredients, source_url, created_at FROM recipes WHERE name LIKE ? LIMIT 20"
        ).all(`%${query}%`);
        return JSON.stringify(rows, null, 2);
      }
      const all = getAllRecipes();
      return JSON.stringify(all.slice(0, 20), null, 2);
    },
  },

  {
    name: "get_gear",
    description: "List gear inventory items (clothing, helmets, accessories), optionally filtered by category.",
    parameters: {
      type: "object",
      properties: {
        category: { type: "string", description: "Filter by category, e.g. Helmets, Jerseys" },
      },
      required: [],
    },
    execute: async ({ category }) => {
      const items = getAllGearItems();
      if (category) {
        return JSON.stringify(items.filter((g: Record<string, unknown>) => g.category === category), null, 2);
      }
      return JSON.stringify(items, null, 2);
    },
  },

  {
    name: "get_bikes",
    description: "List all bikes with mileage totals (total, indoor, road).",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
    execute: async () => {
      const bikes = getAllBikes();
      return JSON.stringify(bikes, null, 2);
    },
  },

  {
    name: "run_backup",
    description: "Trigger a full JARVIS backup to Cloudflare R2. Returns backup status.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
    execute: async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/backup`, {
          method: "POST",
        });
        const data = await res.json();
        return JSON.stringify(data, null, 2);
      } catch (err) {
        return JSON.stringify({ error: err instanceof Error ? err.message : "Backup failed" });
      }
    },
  },

  {
    name: "get_alerts",
    description: "Get current JARVIS alert status: backup age, Strava sync freshness, gear replacement reminders.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
    execute: async () => {
      const alerts: string[] = [];

      const lastBackup = kvGet<string>("last-full-backup");
      if (!lastBackup) {
        alerts.push("No backup recorded");
      } else {
        const days = (Date.now() - new Date(lastBackup).getTime()) / (1000 * 60 * 60 * 24);
        if (days >= 1) alerts.push(`Last backup: ${days.toFixed(1)} days ago`);
        else alerts.push(`Last backup: ${(days * 24).toFixed(1)} hours ago`);
      }

      const lastSync = kvGet<string>("strava-last-sync");
      if (!lastSync) {
        alerts.push("Strava never synced");
      } else {
        const hours = (Date.now() - new Date(lastSync).getTime()) / (1000 * 60 * 60);
        if (hours >= 3) alerts.push(`Strava sync stale: ${hours.toFixed(1)} hours ago`);
        else alerts.push(`Strava synced ${hours.toFixed(1)} hours ago`);
      }

      const gearItems = getAllGearItems() as { name: string; category: string; purchaseDate?: string; replaceReminderYears?: number }[];
      for (const item of gearItems) {
        if (item.category !== "Helmets" || !item.purchaseDate || !item.replaceReminderYears) continue;
        const d = new Date(item.purchaseDate);
        d.setFullYear(d.getFullYear() + item.replaceReminderYears);
        if (d.getTime() <= Date.now() + 30 * 24 * 60 * 60 * 1000) {
          alerts.push(`Helmet: ${item.name} — replace by ${d.toLocaleDateString()}`);
        }
      }

      return alerts.length > 0 ? alerts.join("\n") : "All clear — no alerts.";
    },
  },

  {
    name: "search",
    description: "Search across all JARVIS data: recipes, German words, gear, bikes, and Strava rides.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search term" },
      },
      required: ["query"],
    },
    execute: async ({ query }) => {
      const db = getDb();
      const pattern = `%${query}%`;
      const results: Record<string, unknown>[] = [];

      const recipes = db.prepare("SELECT id, name FROM recipes WHERE name LIKE ? LIMIT 5").all(pattern) as { id: string; name: string }[];
      for (const r of recipes) results.push({ type: "recipe", name: r.name });

      const vocab = db.prepare("SELECT german, english, part_of_speech FROM german_vocab WHERE german LIKE ? OR english LIKE ? LIMIT 5").all(pattern, pattern) as { german: string; english: string; part_of_speech: string }[];
      for (const v of vocab) results.push({ type: "german", word: v.german, meaning: v.english, pos: v.part_of_speech });

      const gear = db.prepare("SELECT name, category FROM gear_inventory WHERE name LIKE ? LIMIT 5").all(pattern) as { name: string; category: string }[];
      for (const g of gear) results.push({ type: "gear", name: g.name, category: g.category });

      const activities = db.prepare("SELECT id, name, start_date FROM strava_activities WHERE name LIKE ? LIMIT 5").all(pattern) as { id: number; name: string; start_date: string }[];
      for (const a of activities) results.push({ type: "ride", name: a.name, date: a.start_date });

      return JSON.stringify(results, null, 2);
    },
  },
  {
    name: "query_knowledge",
    description: "Search the JARVIS knowledge base (Readwise articles, podcast transcripts, highlights). Returns relevant text chunks with source information. Use this for questions about training, nutrition, cycling science, or any topic from the user's reading library.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query (natural language or keywords)" },
        scope: { type: "string", description: "Optional topic filter: cycling, nutrition, health, training-science, gear, or all", enum: ["all", "cycling", "nutrition", "health", "training-science", "gear"] },
        limit: { type: "number", description: "Max results, default 10" },
      },
      required: ["query"],
    },
    execute: async ({ query }) => {
      if (!query) return JSON.stringify({ error: "query required" });
      const lightragUrl = process.env.LIGHTRAG_URL || "http://localhost:9621";
      try {
        const res = await fetch(`${lightragUrl}/query`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: query as string,
            mode: "mix",
            only_need_context: true,
          }),
        });
        if (!res.ok) return JSON.stringify({ error: "LightRAG query failed", status: res.status });
        const data = await res.json();
        const context = typeof data === "string" ? data : (data.response ?? data.context ?? "");
        if (!context) return JSON.stringify({ message: "No matching content found." });
        // Truncate for tool response
        return context.slice(0, 3000);
      } catch {
        return JSON.stringify({ error: "LightRAG server unreachable. Is it running?" });
      }
    },
  },

  {
    name: "get_knowledge_stats",
    description: "Get statistics about the JARVIS knowledge base: document count, chunk count, active sources, tags.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
    execute: async () => {
      const stats = getResearchStats();
      const sources = getAllResearchSources();
      return JSON.stringify({ ...stats, sources: sources.map(s => ({ name: s.name, type: s.sourceType, active: s.active })) }, null, 2);
    },
  },
];

// Convert to Anthropic API tool format
export function toolsForAnthropic() {
  return jarvisTools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.parameters,
  }));
}
