import { NextRequest } from "next/server";

const INTERVALS_API = "https://intervals.icu/api/v1";

function getAuthHeader(): string | null {
  const apiKey = process.env.INTERVALS_API_KEY;
  if (!apiKey) return null;
  return "Basic " + Buffer.from("API_KEY:" + apiKey).toString("base64");
}

// GET /api/intervals/wellness?oldest=2025-01-01&newest=2026-03-24&days=90
export async function GET(request: NextRequest) {
  const auth = getAuthHeader();
  const athleteId = process.env.INTERVALS_ATHLETE_ID;
  if (!auth || !athleteId) {
    return Response.json({ error: "INTERVALS_API_KEY or INTERVALS_ATHLETE_ID not configured" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") ?? "90");
  const newest = searchParams.get("newest") ?? new Date().toISOString().slice(0, 10);
  const oldestParam = searchParams.get("oldest");
  const oldest = oldestParam ?? (() => {
    const d = new Date(newest);
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
  })();

  try {
    const res = await fetch(
      `${INTERVALS_API}/athlete/${athleteId}/wellness?oldest=${oldest}&newest=${newest}`,
      { headers: { Authorization: auth } }
    );

    if (!res.ok) {
      const text = await res.text();
      return Response.json({ error: `intervals.icu API error ${res.status}: ${text}` }, { status: res.status });
    }

    const data = await res.json();

    // Transform to a cleaner format
    const wellness = (data as Record<string, unknown>[]).map((d) => ({
      date: d.id as string,
      ctl: d.ctl as number ?? 0,
      atl: d.atl as number ?? 0,
      tsb: ((d.ctl as number) ?? 0) - ((d.atl as number) ?? 0),
      ctlLoad: d.ctlLoad as number ?? 0,
      atlLoad: d.atlLoad as number ?? 0,
      rampRate: d.rampRate as number ?? 0,
    }));

    return Response.json({ wellness });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch wellness data";
    return Response.json({ error: message }, { status: 500 });
  }
}
