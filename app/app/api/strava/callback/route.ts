import { NextRequest, NextResponse } from "next/server";

const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(
        new URL(`/settings/cycling?strava_error=${encodeURIComponent(error)}#strava`, request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(new URL("/settings/cycling?strava_error=no_code#strava", request.url));
    }

    const clientId = process.env.STRAVA_CLIENT_ID;
    const clientSecret = process.env.STRAVA_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        new URL("/settings/cycling?strava_error=config#strava", request.url)
      );
    }

    const origin = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin;
    const redirectUri = `${origin}/api/strava/callback`;

    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    });

    const res = await fetch(STRAVA_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!res.ok) {
      const err = await res.text();
      const msg = err.length > 80 ? err.slice(0, 80) + "…" : err;
      return NextResponse.redirect(
        new URL(`/settings/cycling?strava_error=${encodeURIComponent("Token exchange failed: " + msg)}#strava`, request.url)
      );
    }

    const data = (await res.json()) as {
      access_token: string;
      refresh_token: string;
      expires_at: number;
      athlete?: { id: number; username?: string };
    };

    const redirectUrl = new URL("/settings/cycling", request.url);
    redirectUrl.hash = `strava_access_token=${data.access_token}&strava_refresh_token=${data.refresh_token}&strava_expires_at=${data.expires_at}`;
    return NextResponse.redirect(redirectUrl);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.redirect(
      new URL(`/settings/cycling?strava_error=${encodeURIComponent("Callback error: " + message)}#strava`, request.url)
    );
  }
}
