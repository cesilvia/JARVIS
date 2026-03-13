import { NextRequest, NextResponse } from "next/server";

const STRAVA_BASE = "https://www.strava.com/api/v3";

export async function POST(request: NextRequest) {
  try {
    const { accessToken, activityId } = await request.json();
    if (!accessToken || !activityId) {
      return NextResponse.json({ error: "accessToken and activityId required" }, { status: 400 });
    }

    const url = `${STRAVA_BASE}/activities/${activityId}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `Strava API: ${res.status} ${text.slice(0, 200)}` }, { status: res.status });
    }

    const activity = await res.json();
    return NextResponse.json({ activity });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
