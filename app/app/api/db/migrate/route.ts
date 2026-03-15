import { NextRequest, NextResponse } from "next/server";
import {
  kvSet,
  upsertActivities,
  setStream,
  upsertVocab,
  upsertRecipes,
  upsertIngredients,
  upsertBikes,
  upsertGearItems,
  upsertTireRefs,
} from "@/app/lib/db";

// One-time migration: accepts a full localStorage dump and writes everything to SQLite.
// The data format matches the backup JSON: keys are the original jarvis-* localStorage keys.
export async function POST(request: NextRequest) {
  try {
    const { data } = await request.json();
    if (!data || typeof data !== "object") {
      return NextResponse.json({ error: "data object required" }, { status: 400 });
    }

    const results: Record<string, string> = {};

    // ─── Normalized tables ────────────────────────────────────────

    // Strava activities
    if (data["jarvis-strava-activities"]) {
      try {
        const activities = typeof data["jarvis-strava-activities"] === "string"
          ? JSON.parse(data["jarvis-strava-activities"])
          : data["jarvis-strava-activities"];
        if (Array.isArray(activities)) {
          upsertActivities(activities);
          results["strava-activities"] = `${activities.length} activities`;
        }
      } catch (e) { results["strava-activities"] = `error: ${e}`; }
    }

    // Strava stream cache (dynamic keys: jarvis-strava-stream-{id})
    let streamCount = 0;
    for (const key of Object.keys(data)) {
      if (key.startsWith("jarvis-strava-stream-")) {
        try {
          const activityId = parseInt(key.replace("jarvis-strava-stream-", ""), 10);
          if (!isNaN(activityId)) {
            const streamData = typeof data[key] === "string" ? JSON.parse(data[key]) : data[key];
            setStream(activityId, streamData);
            streamCount++;
          }
        } catch { /* skip bad streams */ }
      }
    }
    if (streamCount > 0) results["strava-streams"] = `${streamCount} streams`;

    // German vocabulary
    if (data["jarvis-german-vocab"]) {
      try {
        const vocab = typeof data["jarvis-german-vocab"] === "string"
          ? JSON.parse(data["jarvis-german-vocab"])
          : data["jarvis-german-vocab"];
        if (Array.isArray(vocab)) {
          upsertVocab(vocab);
          results["german-vocab"] = `${vocab.length} words`;
        }
      } catch (e) { results["german-vocab"] = `error: ${e}`; }
    }

    // Recipes
    if (data["jarvis-recipes"]) {
      try {
        const recipes = typeof data["jarvis-recipes"] === "string"
          ? JSON.parse(data["jarvis-recipes"])
          : data["jarvis-recipes"];
        if (Array.isArray(recipes)) {
          upsertRecipes(recipes);
          results["recipes"] = `${recipes.length} recipes`;
        }
      } catch (e) { results["recipes"] = `error: ${e}`; }
    }

    // Saved ingredients
    if (data["jarvis-saved-ingredients"]) {
      try {
        const ingredients = typeof data["jarvis-saved-ingredients"] === "string"
          ? JSON.parse(data["jarvis-saved-ingredients"])
          : data["jarvis-saved-ingredients"];
        if (Array.isArray(ingredients)) {
          upsertIngredients(ingredients);
          results["saved-ingredients"] = `${ingredients.length} ingredients`;
        }
      } catch (e) { results["saved-ingredients"] = `error: ${e}`; }
    }

    // Bikes
    if (data["jarvis-bikes"]) {
      try {
        const bikes = typeof data["jarvis-bikes"] === "string"
          ? JSON.parse(data["jarvis-bikes"])
          : data["jarvis-bikes"];
        if (Array.isArray(bikes)) {
          upsertBikes(bikes);
          results["bikes"] = `${bikes.length} bikes`;
        }
      } catch (e) { results["bikes"] = `error: ${e}`; }
    }

    // Gear inventory
    if (data["jarvis-gear-inventory"]) {
      try {
        const items = typeof data["jarvis-gear-inventory"] === "string"
          ? JSON.parse(data["jarvis-gear-inventory"])
          : data["jarvis-gear-inventory"];
        if (Array.isArray(items)) {
          upsertGearItems(items);
          results["gear-inventory"] = `${items.length} items`;
        }
      } catch (e) { results["gear-inventory"] = `error: ${e}`; }
    }

    // Tire refs
    if (data["jarvis-tire-pressure-tires"]) {
      try {
        const tires = typeof data["jarvis-tire-pressure-tires"] === "string"
          ? JSON.parse(data["jarvis-tire-pressure-tires"])
          : data["jarvis-tire-pressure-tires"];
        if (Array.isArray(tires)) {
          upsertTireRefs(tires);
          results["tire-refs"] = `${tires.length} tires`;
        }
      } catch (e) { results["tire-refs"] = `error: ${e}`; }
    }

    // ─── KV entries (everything else) ─────────────────────────────

    const KV_KEYS = [
      "jarvis-strava-tokens",
      "jarvis-strava-descriptions",
      "jarvis-strava-zones",
      "jarvis-strava-goals",
      "jarvis-strava-gear",
      "jarvis-strava-power-curve",
      "jarvis-strava-power-curve-rides",
      "jarvis-strava-power-curve-updated",
      "jarvis-strava-last-sync",
      "jarvis-tire-pressure-defaults",
      "jarvis-tire-pressure-selected-tires",
      "jarvis-german-quiz-stats",
      "jarvis-last-nutrition-backup",
      "jarvis-last-full-backup",
      "jarvis-owner",
      "jarvis-session",
      "jarvis-bike-sync",
    ];

    let kvCount = 0;
    for (const key of KV_KEYS) {
      if (data[key] !== undefined && data[key] !== null) {
        const kvKey = key.replace(/^jarvis-/, "");
        const value = typeof data[key] === "string" ? (() => { try { return JSON.parse(data[key]); } catch { return data[key]; } })() : data[key];
        kvSet(kvKey, value);
        kvCount++;
      }
    }
    results["kv"] = `${kvCount} entries`;

    return NextResponse.json({ success: true, results });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Migration failed" },
      { status: 500 }
    );
  }
}
