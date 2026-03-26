import { NextRequest } from "next/server";
import {
  upsertResearchDocuments,
  setResearchTags,
  autoClassifyWithHierarchy,
  kvGet,
  kvSet,
} from "@/app/lib/db";

const READWISE_API = "https://readwise.io/api/v3";
const LIGHTRAG_URL = process.env.LIGHTRAG_URL || "http://localhost:9621";

// Auto-classify tags based on content and source
function autoClassifyTags(doc: { title: string; author?: string; source?: string; content?: string; category?: string }): string[] {
  const text = `${doc.title} ${doc.author ?? ""} ${doc.content ?? ""}`.toLowerCase();
  const tags: string[] = [];

  const cyclingKeywords = [
    "ftp", "tss", "ctl", "atl", "vo2max", "vo2", "threshold", "sweet spot",
    "interval", "cadence", "power zone", "heart rate zone", "watts", "watt",
    "endurance ride", "tempo", "polarized", "base phase", "build phase",
    "trainerroad", "trainer road", "cycling", "cyclist", "peloton",
    "criterium", "gran fondo", "time trial", "bike fit", "aero",
    "recovery ride", "ramp test", "training plan", "training block",
  ];
  if (cyclingKeywords.some(k => text.includes(k))) tags.push("cycling");

  const nutritionKeywords = [
    "nutrition", "carbohydrate", "protein", "calorie", "macro",
    "fueling", "hydration", "electrolyte", "glycogen", "recovery nutrition",
    "pre-ride", "post-ride", "during ride", "food", "diet", "supplement",
  ];
  if (nutritionKeywords.some(k => text.includes(k))) tags.push("nutrition");

  const scienceKeywords = [
    "periodization", "overtraining", "fatigue", "adaptation", "deload",
    "taper", "peak", "race prep", "aerobic", "anaerobic", "lactate",
    "mitochondria", "muscle fiber", "fast twitch", "slow twitch",
  ];
  if (scienceKeywords.some(k => text.includes(k))) tags.push("training-science");

  const gearKeywords = [
    "bike setup", "wheel", "tire", "groupset", "drivetrain", "helmet",
    "shoes", "cleats", "saddle", "handlebar", "stem", "seatpost",
    "power meter", "head unit", "garmin", "wahoo",
  ];
  if (gearKeywords.some(k => text.includes(k))) tags.push("gear");

  const healthKeywords = [
    "sleep", "recovery", "injury", "pain", "stretching", "mobility",
    "foam roll", "massage", "mental health", "burnout", "overreaching",
  ];
  if (healthKeywords.some(k => text.includes(k))) tags.push("health");

  if (tags.length === 0) tags.push("general");
  return tags;
}

// Push a document to LightRAG for indexing (entity extraction + knowledge graph + embeddings)
async function pushToLightRAG(docId: string, content: string, metadata?: { title?: string; author?: string; source?: string }) {
  try {
    const res = await fetch(`${LIGHTRAG_URL}/documents/text`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: content,
        metadata: {
          id: docId,
          ...metadata,
        },
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(`LightRAG indexing failed for ${docId}: ${text}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`LightRAG unreachable for ${docId}:`, err);
    return false;
  }
}

// Fetch documents from Readwise API with pagination
async function fetchReadwiseDocuments(apiKey: string, updatedAfter?: string) {
  const docs: Record<string, unknown>[] = [];
  let nextCursor: string | null = null;

  do {
    const params = new URLSearchParams();
    if (updatedAfter) params.set("updated_after", updatedAfter);
    if (nextCursor) params.set("page_cursor", nextCursor);
    params.set("page_size", "50");

    const url = `${READWISE_API}/list/?${params.toString()}`;
    const res = await fetch(url, {
      headers: { Authorization: `Token ${apiKey}` },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Readwise API error ${res.status}: ${text}`);
    }

    const data = await res.json();
    if (data.results) docs.push(...data.results);
    nextCursor = data.next_page_cursor ?? null;
  } while (nextCursor);

  return docs;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.READWISE_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "READWISE_API_KEY not configured in .env.local" }, { status: 500 });
  }

  const body = await request.json().catch(() => ({}));
  const fullSync = body.fullSync === true;

  const lastSync = fullSync ? null : kvGet<string>("readwise-last-sync");

  try {
    const rawDocs = await fetchReadwiseDocuments(apiKey, lastSync ?? undefined);

    let processed = 0;
    let indexed = 0;

    for (const raw of rawDocs) {
      const id = `rw-${raw.id}`;
      const content = (raw.content as string) ?? (raw.html as string) ?? (raw.summary as string) ?? "";
      const plainContent = content.replace(/<[^>]*>/g, "");

      const doc = {
        id,
        readwiseId: String(raw.id),
        title: (raw.title as string) ?? "Untitled",
        author: (raw.author as string) ?? undefined,
        source: (raw.source as string) ?? undefined,
        sourceUrl: (raw.source_url as string) ?? (raw.url as string) ?? undefined,
        category: (raw.category as string) ?? undefined,
        content: plainContent,
        summary: (raw.summary as string) ?? undefined,
        imageUrl: (raw.image_url as string) ?? (raw.cover_image_url as string) ?? undefined,
        wordCount: plainContent.split(/\s+/).length,
        readwiseUpdatedAt: (raw.updated_at as string) ?? undefined,
      };

      // Save metadata to SQLite (source of truth for tags, metadata, library browsing)
      upsertResearchDocuments([doc]);

      // Push full text to LightRAG for knowledge graph indexing
      if (plainContent.length > 100) {
        const success = await pushToLightRAG(id, plainContent, {
          title: doc.title,
          author: doc.author,
          source: doc.source,
        });
        if (success) indexed++;
      }

      // Auto-classify tags using hierarchy (stored in SQLite for JARVIS UI filtering)
      const tags = autoClassifyWithHierarchy(doc);
      setResearchTags(id, tags.map(t => ({ tag: t, auto: true, confirmed: false })));

      processed++;
    }

    kvSet("readwise-last-sync", new Date().toISOString());

    return Response.json({
      success: true,
      processed,
      indexed,
      fullSync,
      lastSync: lastSync ?? "never",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    return Response.json({ error: message }, { status: 500 });
  }
}

// GET — return sync status
export async function GET() {
  const lastSync = kvGet<string>("readwise-last-sync");
  const hasReadwiseKey = !!process.env.READWISE_API_KEY;
  const hasOpenRouterKey = !!process.env.OPENROUTER_API_KEY;

  // Check LightRAG health
  let lightragHealthy = false;
  try {
    const res = await fetch(`${LIGHTRAG_URL}/health`, { signal: AbortSignal.timeout(2000) });
    lightragHealthy = res.ok;
  } catch { /* unreachable */ }

  return Response.json({
    lastSync,
    configured: hasReadwiseKey,
    openrouterConfigured: hasOpenRouterKey,
    lightragHealthy,
  });
}
