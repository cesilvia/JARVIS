import { NextRequest, NextResponse } from "next/server";

const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const refreshToken = body.refreshToken as string;
    if (!refreshToken) {
      return NextResponse.json({ error: "refreshToken required" }, { status: 400 });
    }

    const clientId = process.env.STRAVA_CLIENT_ID;
    const clientSecret = process.env.STRAVA_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: "Strava not configured" }, { status: 500 });
    }

    const res = await fetch(STRAVA_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }).toString(),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      throw new Error(`Strava refresh failed: ${res.status}`);
    }

    const data = (await res.json()) as {
      access_token: string;
      refresh_token: string;
      expires_at: number;
    };

    return NextResponse.json({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_at,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Refresh failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
