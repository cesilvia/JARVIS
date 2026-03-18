import { NextRequest, NextResponse } from "next/server";

const STRAVA_AUTH_URL = "https://www.strava.com/oauth/authorize";
const SCOPES = "activity:read_all,profile:read_all";

export async function GET(request: NextRequest) {
  const origin = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin;
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL(
        "/settings?strava_error=" + encodeURIComponent("Strava not configured. Add STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET to .env.local and restart.") + "#strava",
        origin
      )
    );
  }
  const redirectUri = `${origin}/api/strava/callback`;
  const state = "jarvis-bike-sync";
  const url = `${STRAVA_AUTH_URL}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(SCOPES)}&state=${state}&approval_prompt=force`;
  return NextResponse.redirect(url);
}
