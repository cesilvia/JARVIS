import { NextRequest, NextResponse } from "next/server";

const STRAVA_BASE = "https://www.strava.com/api/v3";
const STREAM_KEYS = "time,watts,heartrate,cadence,velocity_smooth,altitude,distance";

export async function POST(request: NextRequest) {
  try {
    const { accessToken, activityId } = await request.json();
    if (!accessToken || !activityId) {
      return NextResponse.json({ error: "accessToken and activityId required" }, { status: 400 });
    }

    const url = `${STRAVA_BASE}/activities/${activityId}/streams?keys=${STREAM_KEYS}&key_by_type=true`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      if (res.status === 429) {
        return NextResponse.json({ error: "Rate limited. Try again in a few minutes." }, { status: 429 });
      }
      const text = await res.text();
      return NextResponse.json({ error: `Strava API: ${res.status} ${text.slice(0, 200)}` }, { status: res.status });
    }

    const raw = await res.json();

    const streams: Record<string, number[]> = {};
    if (Array.isArray(raw)) {
      for (const s of raw) {
        if (s.type && Array.isArray(s.data)) {
          streams[s.type] = s.data;
        }
      }
    } else if (typeof raw === "object") {
      for (const [key, val] of Object.entries(raw)) {
        if (val && typeof val === "object" && "data" in val && Array.isArray((val as { data: unknown }).data)) {
          streams[key] = (val as { data: number[] }).data;
        }
      }
    }

    return NextResponse.json({ streams });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
