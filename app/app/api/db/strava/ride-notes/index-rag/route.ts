import { NextRequest, NextResponse } from "next/server";
import { getRideNote, getDb } from "@/app/lib/db";

const LIGHTRAG_URL = process.env.LIGHTRAG_URL || "http://localhost:9621";

export async function POST(request: NextRequest) {
  const { activityId } = await request.json();
  if (!activityId) return NextResponse.json({ error: "activityId required" }, { status: 400 });

  const note = getRideNote(Number(activityId));
  if (!note) return NextResponse.json({ error: "No note found" }, { status: 404 });

  // Get activity metadata for context
  const db = getDb();
  const activity = db.prepare("SELECT name, start_date, trainer, sport_type, moving_time, average_watts, weighted_average_watts FROM strava_activities WHERE id = ?").get(activityId) as {
    name: string; start_date: string; trainer: number; sport_type: string;
    moving_time: number; average_watts: number | null; weighted_average_watts: number | null;
  } | undefined;

  if (!activity) return NextResponse.json({ error: "Activity not found" }, { status: 404 });

  const durationHrs = activity.moving_time / 3600;
  const indoorOutdoor = activity.trainer || activity.sport_type === "VirtualRide" ? "Indoor" : "Outdoor";
  const date = new Date(activity.start_date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  // Build structured text for RAG
  const lines: string[] = [];
  lines.push(`Ride Note for "${activity.name}" on ${date}`);
  lines.push(`Type: ${note.ride_type ?? "unspecified"} | RPE: ${note.rpe ?? "—"}/10 | ${indoorOutdoor} | Duration: ${durationHrs.toFixed(1)}hr`);

  if (note.calories_on_bike || note.carbs_per_hour || note.bottle_count || note.electrolyte_mg) {
    const parts = [];
    if (note.calories_on_bike) parts.push(`${note.calories_on_bike} cal`);
    if (note.carbs_per_hour) parts.push(`${note.carbs_per_hour} g/hr carbs`);
    if (note.bottle_count) parts.push(`${note.bottle_count} bottles (${note.total_fluid_oz ?? "?"} oz)`);
    if (note.electrolyte_mg) parts.push(`${note.electrolyte_mg}mg electrolyte${note.electrolyte_product ? ` (${note.electrolyte_product})` : ""}`);
    lines.push(`Nutrition: ${parts.join(", ")}`);
  }
  if (note.gi_issues && note.gi_issues !== "none") {
    lines.push(`GI Issues: ${note.gi_issues}`);
  }

  if (note.meal_timing || note.pre_carbs_g || note.weight_lbs) {
    const parts = [];
    if (note.meal_timing) parts.push(`Meal ${note.meal_timing} before`);
    if (note.pre_carbs_g) parts.push(`${note.pre_carbs_g}g carbs`);
    if (note.pre_protein_g) parts.push(`${note.pre_protein_g}g protein`);
    if (note.pre_fat_g) parts.push(`${note.pre_fat_g}g fat`);
    if (note.leg_freshness) parts.push(`Freshness ${note.leg_freshness}/5`);
    if (note.weight_lbs) parts.push(`Weight ${note.weight_lbs} lbs`);
    if (note.watts_per_kg) parts.push(`${note.watts_per_kg} w/kg`);
    lines.push(`Pre-ride: ${parts.join(", ")}`);
  }

  if (note.sleep_hours || note.sleep_quality || (note.cramping && note.cramping !== "none")) {
    const parts = [];
    if (note.sleep_hours) parts.push(`Sleep ${note.sleep_hours}hr`);
    if (note.sleep_quality) parts.push(`quality ${note.sleep_quality}/10`);
    if (note.cramping && note.cramping !== "none") parts.push(`Cramping: ${note.cramping}`);
    lines.push(`Recovery: ${parts.join(", ")}`);
  }

  if (note.notes) {
    lines.push(`Notes: ${note.notes}`);
  }

  const text = lines.join("\n");

  try {
    const res = await fetch(`${LIGHTRAG_URL}/documents/text`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        metadata: {
          id: `ride-note-${activityId}`,
          title: `Ride Note: ${activity.name}`,
          source: "ride-notes",
        },
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error(`LightRAG ride note indexing failed for ${activityId}: ${errText}`);
      return NextResponse.json({ success: false, error: errText });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("LightRAG ride note indexing error:", err);
    return NextResponse.json({ success: false, error: "LightRAG not reachable" });
  }
}
