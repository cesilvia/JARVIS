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

export async function getActivities(): Promise<unknown[]> {
  const res = await fetch("/api/db/strava/activities");
  if (!res.ok) return [];
  const { activities } = await res.json();
  return activities ?? [];
}

export async function saveActivities(activities: unknown[]): Promise<void> {
  await fetch("/api/db/strava/activities", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ activities }),
  });
}

// ─── Strava Streams ─────────────────────────────────────────────

export async function getStream(activityId: number): Promise<unknown | null> {
  const res = await fetch(`/api/db/strava/streams/${activityId}`);
  if (!res.ok) return null;
  const { data } = await res.json();
  return data ?? null;
}

export async function saveStream(activityId: number, data: unknown): Promise<void> {
  await fetch(`/api/db/strava/streams/${activityId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data }),
  });
}

// ─── German Vocab ───────────────────────────────────────────────

export async function getVocab(): Promise<unknown[]> {
  const res = await fetch("/api/db/german/vocab");
  if (!res.ok) return [];
  const { vocab } = await res.json();
  return vocab ?? [];
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

export async function getRecipes(): Promise<unknown[]> {
  const res = await fetch("/api/db/nutrition/recipes");
  if (!res.ok) return [];
  const { recipes } = await res.json();
  return recipes ?? [];
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

export async function getIngredients(): Promise<unknown[]> {
  const res = await fetch("/api/db/nutrition/ingredients");
  if (!res.ok) return [];
  const { ingredients } = await res.json();
  return ingredients ?? [];
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

export async function getBikes(): Promise<unknown[]> {
  const res = await fetch("/api/db/bikes");
  if (!res.ok) return [];
  const { bikes } = await res.json();
  return bikes ?? [];
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

export async function getGearItems(): Promise<unknown[]> {
  const res = await fetch("/api/db/gear");
  if (!res.ok) return [];
  const { items } = await res.json();
  return items ?? [];
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

export async function getTireRefs(): Promise<unknown[]> {
  const res = await fetch("/api/db/tires");
  if (!res.ok) return [];
  const { tires } = await res.json();
  return tires ?? [];
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

// ─── Migration ──────────────────────────────────────────────────

export async function migrateFromLocalStorage(data: Record<string, unknown>): Promise<{ success: boolean; error?: string }> {
  const res = await fetch("/api/db/migrate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data }),
  });
  return res.json();
}
