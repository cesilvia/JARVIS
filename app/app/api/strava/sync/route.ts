import { NextResponse } from "next/server";
import { kvGet, kvSet, upsertActivities } from "@/app/lib/db";

const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";
const STRAVA_ACTIVITIES_URL = "https://www.strava.com/api/v3/athlete/activities";

interface StravaTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

interface StravaActivity {
  id: number;
  type: string;
  sport_type: string;
  [key: string]: unknown;
}

function isRide(a: StravaActivity): boolean {
  return (
    a.type === "Ride" ||
    a.sport_type?.includes("Ride") ||
    a.sport_type === "VirtualRide" ||
    a.sport_type === "MountainBikeRide" ||
    a.sport_type === "GravelRide" ||
    a.sport_type === "EBikeRide"
  );
}

async function refreshAccessToken(tokens: StravaTokens): Promise<StravaTokens> {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Strava not configured");

  const res = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: tokens.refreshToken,
    }).toString(),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);

  const data = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_at,
  };
}

async function fetchActivitiesSince(
  accessToken: string,
  afterEpoch: number
): Promise<StravaActivity[]> {
  const all: StravaActivity[] = [];
  let page = 1;
  const perPage = 200;

  while (true) {
    const url = `${STRAVA_ACTIVITIES_URL}?after=${afterEpoch}&page=${page}&per_page=${perPage}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(30000),
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

// POST /api/strava/sync
// Called by N8N on a schedule. No request body needed — reads tokens from KV.
export async function POST() {
  try {
    // 1. Load tokens
    let tokens = kvGet<StravaTokens>("strava-tokens");
    if (!tokens) {
      return NextResponse.json(
        { error: "No Strava tokens — connect Strava in Settings first" },
        { status: 400 }
      );
    }

    // 2. Refresh if expired or expiring within 10 minutes
    const now = Math.floor(Date.now() / 1000);
    if (tokens.expiresAt - now < 600) {
      tokens = await refreshAccessToken(tokens);
      kvSet("strava-tokens", tokens);
    }

    // 3. Determine "since" timestamp — default to 30 days ago if no prior sync
    const lastSync = kvGet<string>("strava-last-sync");
    let afterEpoch: number;
    if (lastSync) {
      // Go back 2 hours before last sync to catch any stragglers / edits
      afterEpoch = Math.floor(new Date(lastSync).getTime() / 1000) - 7200;
    } else {
      // First auto-sync: fetch last 30 days
      afterEpoch = now - 30 * 86400;
    }

    // 4. Fetch & filter rides
    const activities = await fetchActivitiesSince(tokens.accessToken, afterEpoch);
    const rides = activities.filter(isRide);

    // 5. Upsert into SQLite
    if (rides.length > 0) {
      upsertActivities(rides);
    }

    // 6. Update last-sync timestamp
    const syncTime = new Date().toISOString();
    kvSet("strava-last-sync", syncTime);

    return NextResponse.json({
      success: true,
      synced: rides.length,
      total_fetched: activities.length,
      since: new Date(afterEpoch * 1000).toISOString(),
      syncTime,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
