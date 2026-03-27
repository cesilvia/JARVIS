// Client-side fetch wrappers for the SQLite-backed API routes.
// These replace all direct localStorage.getItem / setItem calls.

// ─── KV ─────────────────────────────────────────────────────────

export async function getKV<T = unknown>(key: string): Promise<T | null> {
  const res = await fetch(`/api/db/kv?key=${encodeURIComponent(key)}`);
  if (!res.ok) return null;
  const { value } = await res.json();
  return (value ?? null) as T | null;
}

export async function setKV(key: string, value: unknown): Promise<void> {
  await fetch("/api/db/kv", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value }),
  });
}

export async function getAllKV(): Promise<Record<string, unknown>> {
  const res = await fetch("/api/db/kv");
  if (!res.ok) return {};
  const { entries } = await res.json();
  return entries ?? {};
}

export async function deleteKV(key: string): Promise<void> {
  await fetch(`/api/db/kv?key=${encodeURIComponent(key)}`, { method: "DELETE" });
}

// ─── Strava Activities ──────────────────────────────────────────

export async function getActivities<T = unknown>(): Promise<T[]> {
  const res = await fetch("/api/db/strava/activities");
  if (!res.ok) return [];
  const { activities } = await res.json();
  return (activities ?? []) as T[];
}

export async function saveActivities(activities: unknown[]): Promise<void> {
  // Batch in chunks of 100 to stay under Next.js 1MB body limit
  const BATCH = 100;
  for (let i = 0; i < activities.length; i += BATCH) {
    const chunk = activities.slice(i, i + BATCH);
    const res = await fetch("/api/db/strava/activities", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activities: chunk }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Save activities failed (batch ${Math.floor(i / BATCH) + 1}): ${err}`);
    }
  }
}

// ─── Strava Streams ─────────────────────────────────────────────

export async function getStream<T = unknown>(activityId: number): Promise<T | null> {
  const res = await fetch(`/api/db/strava/streams/${activityId}`);
  if (!res.ok) return null;
  const { data } = await res.json();
  return (data ?? null) as T | null;
}

export async function saveStream(activityId: number, data: unknown): Promise<void> {
  await fetch(`/api/db/strava/streams/${activityId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data }),
  });
}

// ─── German Vocab ───────────────────────────────────────────────

export async function getVocab<T = unknown>(): Promise<T[]> {
  const res = await fetch("/api/db/german/vocab");
  if (!res.ok) return [];
  const { vocab } = await res.json();
  return (vocab ?? []) as T[];
}

export async function saveVocab(words: unknown[]): Promise<void> {
  await fetch("/api/db/german/vocab", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ words }),
  });
}

export async function deleteVocabWord(german: string, english: string): Promise<void> {
  await fetch(`/api/db/german/vocab?german=${encodeURIComponent(german)}&english=${encodeURIComponent(english)}`, {
    method: "DELETE",
  });
}

// ─── Recipes ────────────────────────────────────────────────────

export async function getRecipes<T = unknown>(): Promise<T[]> {
  const res = await fetch("/api/db/nutrition/recipes");
  if (!res.ok) return [];
  const { recipes } = await res.json();
  return (recipes ?? []) as T[];
}

export async function saveRecipes(recipes: unknown[]): Promise<void> {
  await fetch("/api/db/nutrition/recipes", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recipes }),
  });
}

export async function deleteRecipeById(id: string): Promise<void> {
  await fetch(`/api/db/nutrition/recipes?id=${encodeURIComponent(id)}`, { method: "DELETE" });
}

// ─── Saved Ingredients ──────────────────────────────────────────

export async function getIngredients<T = unknown>(): Promise<T[]> {
  const res = await fetch("/api/db/nutrition/ingredients");
  if (!res.ok) return [];
  const { ingredients } = await res.json();
  return (ingredients ?? []) as T[];
}

export async function saveIngredients(ingredients: unknown[]): Promise<void> {
  await fetch("/api/db/nutrition/ingredients", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ingredients }),
  });
}

export async function deleteIngredientByName(name: string): Promise<void> {
  await fetch(`/api/db/nutrition/ingredients?name=${encodeURIComponent(name)}`, { method: "DELETE" });
}

// ─── Bikes ──────────────────────────────────────────────────────

export async function getBikes<T = unknown>(): Promise<T[]> {
  const res = await fetch("/api/db/bikes");
  if (!res.ok) return [];
  const { bikes } = await res.json();
  return (bikes ?? []) as T[];
}

export async function saveBikes(bikes: unknown[]): Promise<void> {
  await fetch("/api/db/bikes", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bikes }),
  });
}

export async function deleteBikeById(id: string): Promise<void> {
  await fetch(`/api/db/bikes?id=${encodeURIComponent(id)}`, { method: "DELETE" });
}

// ─── Gear Inventory ─────────────────────────────────────────────

export async function getGearItems<T = unknown>(): Promise<T[]> {
  const res = await fetch("/api/db/gear");
  if (!res.ok) return [];
  const { items } = await res.json();
  return (items ?? []) as T[];
}

export async function saveGearItems(items: unknown[]): Promise<void> {
  await fetch("/api/db/gear", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
}

export async function deleteGearItemById(id: string): Promise<void> {
  await fetch(`/api/db/gear?id=${encodeURIComponent(id)}`, { method: "DELETE" });
}

// ─── Tire Refs ──────────────────────────────────────────────────

export async function getTireRefs<T = unknown>(): Promise<T[]> {
  const res = await fetch("/api/db/tires");
  if (!res.ok) return [];
  const { tires } = await res.json();
  return (tires ?? []) as T[];
}

export async function saveTireRefs(tires: unknown[]): Promise<void> {
  await fetch("/api/db/tires", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tires }),
  });
}

export async function deleteTireRefById(id: string): Promise<void> {
  await fetch(`/api/db/tires?id=${encodeURIComponent(id)}`, { method: "DELETE" });
}

// ─── Weather ────────────────────────────────────────────────────

export async function getWeatherForActivities(activityIds: number[]): Promise<Record<number, { activityId: number; temperature: number | null; feelsLike: number | null; windSpeed: number | null; windDirection: number | null; precipitation: number | null; weatherCode: number | null; humidity: number | null; timeline: { hour: number; lat: number; lng: number; temperature: number | null; feelsLike: number | null; windSpeed: number | null; windDirection: number | null; precipitation: number | null; weatherCode: number | null }[] | null }>> {
  if (activityIds.length === 0) return {};
  const res = await fetch("/api/db/weather", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ activityIds }),
  });
  if (!res.ok) return {};
  const { weather } = await res.json();
  return weather ?? {};
}

export async function getMissingWeatherCount(): Promise<number> {
  const res = await fetch("/api/db/weather");
  if (!res.ok) return 0;
  const { count } = await res.json();
  return count ?? 0;
}

export async function backfillWeather(): Promise<{ processed: number; errors: number; remaining: number }> {
  const res = await fetch("/api/weather/backfill", { method: "POST" });
  if (!res.ok) throw new Error("Backfill failed");
  return res.json();
}

export async function fetchHistoricalWeather(rides: { activityId: number; lat: number; lng: number; date: string }[]): Promise<{ saved: number; errors: { activityId: number; error: string }[] }> {
  const res = await fetch("/api/weather/historical", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rides }),
  });
  if (!res.ok) throw new Error("Historical weather fetch failed");
  return res.json();
}

export async function getForecast(lat: number, lng: number, days = 7): Promise<{ hours: { time: string; temperature: number; feelsLike: number; windSpeed: number; windDirection: number; precipitation: number; precipitationProbability: number; weatherCode: number; humidity: number }[]; timezone?: string }> {
  const res = await fetch(`/api/weather/forecast?lat=${lat}&lng=${lng}&days=${days}`);
  if (!res.ok) throw new Error("Forecast fetch failed");
  return res.json();
}

export async function geocodeLocation(query: string): Promise<{ name: string; latitude: number; longitude: number; country: string; admin1?: string }[]> {
  const res = await fetch(`/api/weather/geocode?q=${encodeURIComponent(query)}`);
  if (!res.ok) return [];
  const { results } = await res.json();
  return results ?? [];
}

// ─── Research / RAG ─────────────────────────────────────────

export async function getResearchDocuments(opts?: { source?: string; tag?: string; limit?: number; offset?: number }): Promise<{ id: string; title: string; author?: string; source?: string; sourceUrl?: string; category?: string; summary?: string; wordCount: number; syncedAt: string; tags: string[] }[]> {
  const params = new URLSearchParams();
  if (opts?.source) params.set("source", opts.source);
  if (opts?.tag) params.set("tag", opts.tag);
  if (opts?.limit) params.set("limit", String(opts.limit));
  if (opts?.offset) params.set("offset", String(opts.offset));
  const res = await fetch(`/api/db/research/documents?${params.toString()}`);
  if (!res.ok) return [];
  const { documents } = await res.json();
  return documents ?? [];
}

export async function getResearchDocument(id: string) {
  const res = await fetch(`/api/db/research/documents?id=${encodeURIComponent(id)}`);
  if (!res.ok) return null;
  const { document } = await res.json();
  return document ?? null;
}

export async function getResearchStats(): Promise<{ documents: number; activeSources: number; unreviewedTags: number; tags: { tag: string; count: number }[] }> {
  const res = await fetch("/api/db/research/documents?stats=true");
  if (!res.ok) return { documents: 0, activeSources: 0, unreviewedTags: 0, tags: [] };
  const { stats } = await res.json();
  return stats;
}

export async function getResearchSources(): Promise<{ id: string; name: string; url?: string; sourceType: string; active: boolean; createdAt: string }[]> {
  const res = await fetch("/api/db/research/sources");
  if (!res.ok) return [];
  const { sources } = await res.json();
  return sources ?? [];
}

export async function saveResearchSources(sources: { id: string; name: string; url?: string; sourceType: string; active?: boolean }[]): Promise<void> {
  await fetch("/api/db/research/sources", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sources }),
  });
}

export async function deleteResearchSourceById(id: string): Promise<void> {
  await fetch(`/api/db/research/sources?id=${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function getResearchTags(): Promise<{ tag: string; count: number }[]> {
  const res = await fetch("/api/db/research/tags");
  if (!res.ok) return [];
  const { tags } = await res.json();
  return tags ?? [];
}

export async function getTagHierarchy(): Promise<{ id: string; label: string; level: number; parent: string | null; keywords: string | null }[]> {
  const res = await fetch("/api/db/research/hierarchy");
  if (!res.ok) return [];
  const { hierarchy } = await res.json();
  return hierarchy ?? [];
}

export async function addTagHierarchyNode(node: { id: string; label: string; level: number; parent: string | null; keywords?: string }): Promise<void> {
  await fetch("/api/db/research/hierarchy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(node),
  });
}

export async function reclassifyDocuments(): Promise<{ count: number }> {
  const res = await fetch("/api/db/research/hierarchy", { method: "PUT" });
  return res.json();
}

export async function getUnreviewedTags(): Promise<{ id: string; title: string; source: string | null; category: string | null; summary: string | null; tags: string[] }[]> {
  const res = await fetch("/api/db/research/tags?unreviewed=true");
  if (!res.ok) return [];
  const { items } = await res.json();
  return items ?? [];
}

export async function confirmTag(documentId: string, tag: string): Promise<void> {
  await fetch("/api/db/research/tags", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ documentId, tag, action: "confirm" }),
  });
}

export async function setDocumentTags(documentId: string, tags: string[]): Promise<void> {
  await fetch("/api/db/research/tags", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ documentId, tags }),
  });
}

export async function syncReadwise(fullSync = false): Promise<{ success: boolean; processed: number; indexed: number; error?: string }> {
  const res = await fetch("/api/readwise/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fullSync }),
  });
  return res.json();
}

export async function getReadwiseSyncStatus(): Promise<{ lastSync: string | null; configured: boolean; openrouterConfigured?: boolean; lightragHealthy?: boolean }> {
  const res = await fetch("/api/readwise/sync");
  if (!res.ok) return { lastSync: null, configured: false };
  return res.json();
}

export interface RagResult {
  answer: string;
  citations: {
    index: number;
    title: string;
    author?: string;
    source?: string;
    sourceUrl?: string;
    chunkIndex: number;
    timestamp?: string;
  }[];
  error?: string;
}

export async function queryRag(question: string, scope?: string): Promise<RagResult> {
  const res = await fetch("/api/rag/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, scope }),
  });
  return res.json();
}

// ─── intervals.icu ──────────────────────────────────────────

export interface WellnessEntry {
  date: string;
  ctl: number;
  atl: number;
  tsb: number;
  ctlLoad: number;
  atlLoad: number;
  rampRate: number;
}

export async function getIntervalsFitness(days = 90): Promise<WellnessEntry[]> {
  const res = await fetch(`/api/intervals/wellness?days=${days}`);
  if (!res.ok) return [];
  const { wellness } = await res.json();
  return wellness ?? [];
}

// ─── Migration ──────────────────────────────────────────────────

export async function migrateFromLocalStorage(data: Record<string, unknown>): Promise<{ success: boolean; error?: string }> {
  const res = await fetch("/api/db/migrate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data }),
  });
  return res.json();
}

// ─── Ride Notes ─────────────────────────────────────────────────

import type { RideNote, RideNoteOption } from "@/app/bike/strava/types";

export async function getRideNote(activityId: number): Promise<RideNote | null> {
  const res = await fetch(`/api/db/strava/ride-notes?activityId=${activityId}`);
  if (!res.ok) return null;
  const { note } = await res.json();
  return note ?? null;
}

export async function getAllRideNotes(): Promise<RideNote[]> {
  const res = await fetch("/api/db/strava/ride-notes");
  if (!res.ok) return [];
  const { notes } = await res.json();
  return notes ?? [];
}

export async function saveRideNote(activityId: number, data: Partial<RideNote>): Promise<void> {
  await fetch("/api/db/strava/ride-notes", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ activityId, ...data }),
  });
}

export async function checkRideNotesExist(activityIds: number[]): Promise<Record<number, boolean>> {
  if (activityIds.length === 0) return {};
  const res = await fetch(`/api/db/strava/ride-notes?checkIds=${activityIds.join(",")}`);
  if (!res.ok) return {};
  const { exists } = await res.json();
  return exists ?? {};
}

export async function getRideNoteOptions(category?: string): Promise<RideNoteOption[]> {
  const params = category ? `?category=${encodeURIComponent(category)}` : "";
  const res = await fetch(`/api/db/strava/ride-notes/options${params}`);
  if (!res.ok) return [];
  const { options } = await res.json();
  return options ?? [];
}

export async function getAllRideNoteOptionsAdmin(): Promise<RideNoteOption[]> {
  const res = await fetch("/api/db/strava/ride-notes/options?all=1");
  if (!res.ok) return [];
  const { options } = await res.json();
  return options ?? [];
}

export async function saveRideNoteOption(category: string, label: string, sortOrder: number): Promise<void> {
  await fetch("/api/db/strava/ride-notes/options", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ category, label, sortOrder }),
  });
}

export async function deleteRideNoteOptionById(id: number): Promise<void> {
  await fetch(`/api/db/strava/ride-notes/options?id=${id}`, { method: "DELETE" });
}

export async function indexRideNoteInRAG(activityId: number): Promise<void> {
  await fetch("/api/db/strava/ride-notes/index-rag", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ activityId }),
  });
}
