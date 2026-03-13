import { NextRequest, NextResponse } from "next/server";

const STRAVA_ACTIVITIES_URL = "https://www.strava.com/api/v3/athlete/activities";

export interface StravaActivity {
  id: number;
  name: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  type: string;
  sport_type: string;
  trainer: boolean;
  gear_id: string | null;
  start_date: string;
  total_elevation_gain: number;
  average_speed: number;
  max_speed: number;
  average_heartrate?: number;
  max_heartrate?: number;
  has_heartrate?: boolean;
  average_watts?: number;
  max_watts?: number;
  weighted_average_watts?: number;
  device_watts?: boolean;
  kilojoules?: number;
  calories?: number;
  average_cadence?: number;
  suffer_score?: number;
  pr_count?: number;
  achievement_count?: number;
  kudos_count: number;
  map?: { summary_polyline?: string };
  description?: string;
}

async function fetchAllActivities(accessToken: string): Promise<StravaActivity[]> {
  const all: StravaActivity[] = [];
  let page = 1;
  const perPage = 200;

  while (true) {
    const url = `${STRAVA_ACTIVITIES_URL}?page=${page}&per_page=${perPage}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      throw new Error(`Strava API error: ${res.status} ${await res.text()}`);
    }

    const activities = (await res.json()) as StravaActivity[];
    if (activities.length === 0) break;

    all.push(...activities);
    if (activities.length < perPage) break;
    page++;
  }

  return all;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const accessToken = body.accessToken as string;
    if (!accessToken) {
      return NextResponse.json({ error: "accessToken required" }, { status: 400 });
    }

    const activities = await fetchAllActivities(accessToken);

    const rideActivities = activities.filter(
      (a) =>
        a.type === "Ride" ||
        a.sport_type?.includes("Ride") ||
        a.sport_type === "VirtualRide" ||
        a.sport_type === "MountainBikeRide" ||
        a.sport_type === "GravelRide" ||
        a.sport_type === "EBikeRide"
    );

    return NextResponse.json({
      activities: rideActivities,
      total: rideActivities.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
