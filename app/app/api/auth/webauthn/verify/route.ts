import { NextResponse } from "next/server";
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type AuthenticationResponseJSON,
} from "@simplewebauthn/server";
import { createSession, setSessionCookie } from "../../../../lib/session";
import {
  getCredentials,
  updateCredentialCounter,
  storeChallenge,
  getAndDeleteChallenge,
} from "../../../../lib/webauthn-store";

function getRpId(request: Request): string {
  const url = new URL(request.url);
  return url.hostname;
}

function getOrigin(request: Request): string {
  const url = new URL(request.url);
  return url.origin;
}

// GET: generate authentication options
export async function GET(request: Request) {
  try {
    const credentials = await getCredentials();
    if (credentials.length === 0) {
      return NextResponse.json(
        { error: "No credentials registered" },
        { status: 404 }
      );
    }

    const options = await generateAuthenticationOptions({
      rpID: getRpId(request),
      userVerification: "required",
      allowCredentials: credentials.map((c) => ({
        id: c.credentialID,
        transports: c.transports as AuthenticatorTransport[] | undefined,
      })),
    });

    const sessionId = crypto.randomUUID();
    await storeChallenge(sessionId, options.challenge);

    const response = NextResponse.json(options);
    response.cookies.set("webauthn-session", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 300,
    });
    return response;
  } catch (err) {
    console.error("WebAuthn auth options error:", err);
    return NextResponse.json(
      { error: "Failed to generate options" },
      { status: 500 }
    );
  }
}

// POST: verify authentication response
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AuthenticationResponseJSON;

    const cookieHeader = request.headers.get("cookie") || "";
    const sessionId = cookieHeader
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith("webauthn-session="))
      ?.split("=")[1];

    if (!sessionId) {
      return NextResponse.json(
        { error: "No session found" },
        { status: 400 }
      );
    }

    const expectedChallenge = await getAndDeleteChallenge(sessionId);
    if (!expectedChallenge) {
      return NextResponse.json(
        { error: "Challenge expired or not found" },
        { status: 400 }
      );
    }

    const credentials = await getCredentials();
    const matchedCred = credentials.find(
      (c) => c.credentialID === body.id
    );

    if (!matchedCred) {
      return NextResponse.json(
        { error: "Credential not found" },
        { status: 400 }
      );
    }

    const verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin: getOrigin(request),
      expectedRPID: getRpId(request),
      credential: {
        id: matchedCred.credentialID,
        publicKey: new Uint8Array(
          Buffer.from(matchedCred.credentialPublicKey, "base64url")
        ),
        counter: matchedCred.counter,
        transports: matchedCred.transports as AuthenticatorTransport[] | undefined,
      },
    });

    if (!verification.verified) {
      return NextResponse.json(
        { error: "Verification failed" },
        { status: 401 }
      );
    }

    await updateCredentialCounter(
      matchedCred.credentialID,
      verification.authenticationInfo.newCounter
    );

    const token = await createSession();
    await setSessionCookie(token);

    const response = NextResponse.json({ ok: true });
    response.cookies.delete("webauthn-session");
    return response;
  } catch (err) {
    console.error("WebAuthn auth verify error:", err);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
