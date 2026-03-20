import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/app/lib/db";

export async function GET(request: NextRequest) {
  const q = new URL(request.url).searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const db = getDb();
  const pattern = `%${q}%`;
  const results: { type: string; id: string; title: string; subtitle: string; href: string }[] = [];

  // Recipes
  const recipes = db
    .prepare("SELECT id, name FROM recipes WHERE name LIKE ? LIMIT 5")
    .all(pattern) as { id: string; name: string }[];
  for (const r of recipes) {
    results.push({ type: "recipe", id: r.id, title: r.name, subtitle: "Recipe", href: "/recipes" });
  }

  // German vocab
  const vocab = db
    .prepare("SELECT german, english, part_of_speech FROM german_vocab WHERE german LIKE ? OR english LIKE ? LIMIT 5")
    .all(pattern, pattern) as { german: string; english: string; part_of_speech: string }[];
  for (const v of vocab) {
    results.push({ type: "german", id: v.german, title: v.german, subtitle: `${v.english} (${v.part_of_speech})`, href: "/german" });
  }

  // Gear inventory
  const gear = db
    .prepare("SELECT id, name, category FROM gear_inventory WHERE name LIKE ? LIMIT 5")
    .all(pattern) as { id: string; name: string; category: string }[];
  for (const g of gear) {
    results.push({ type: "gear", id: g.id, title: g.name, subtitle: g.category, href: "/bike/inventory" });
  }

  // Bikes
  const bikes = db
    .prepare("SELECT id, name, type FROM bikes WHERE name LIKE ? LIMIT 5")
    .all(pattern) as { id: string; name: string; type: string }[];
  for (const b of bikes) {
    results.push({ type: "bike", id: b.id, title: b.name, subtitle: b.type, href: "/bike" });
  }

  // Strava activities (by name)
  const activities = db
    .prepare("SELECT id, name, type FROM strava_activities WHERE name LIKE ? LIMIT 5")
    .all(pattern) as { id: number; name: string; type: string }[];
  for (const a of activities) {
    results.push({ type: "activity", id: String(a.id), title: a.name, subtitle: a.type, href: `/bike/strava?ride=${a.id}` });
  }

  return NextResponse.json({ results });
}
