import { NextRequest, NextResponse } from "next/server";

const STRAVA_ATHLETE_URL = "https://www.strava.com/api/v3/athlete";

export interface StravaGear {
  id: string;
  primary: boolean;
  name: string;
  resource_state: number;
  distance: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const accessToken = body.accessToken as string;
    if (!accessToken) {
      return NextResponse.json({ error: "accessToken required" }, { status: 400 });
    }

    const res = await fetch(STRAVA_ATHLETE_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      throw new Error(`Strava API error: ${res.status} ${await res.text()}`);
    }

    const athlete = (await res.json()) as {
      bikes?: StravaGear[];
      shoes?: StravaGear[];
    };

    const bikes = athlete.bikes || [];

    return NextResponse.json({
      gear: bikes.map((b) => ({
        id: b.id,
        name: b.name,
        primary: b.primary,
        distance: b.distance,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
