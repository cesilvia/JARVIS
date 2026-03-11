import { NextResponse } from "next/server";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { isAuthenticated } from "../../../../lib/session";
import {
  getCredentials,
  saveCredential,
  storeChallenge,
  getAndDeleteChallenge,
} from "../../../../lib/webauthn-store";

const RP_NAME = "J.A.R.V.I.S.";

function getRpId(request: Request): string {
  const url = new URL(request.url);
  return url.hostname;
}

function getOrigin(request: Request): string {
  const url = new URL(request.url);
  return url.origin;
}

// GET: generate registration options (must be authenticated first)
export async function GET(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const existing = await getCredentials();
    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: getRpId(request),
      userName: "jarvis-owner",
      userDisplayName: "JARVIS Owner",
      attestationType: "none",
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "preferred",
      },
      excludeCredentials: existing.map((c) => ({
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
    console.error("WebAuthn registration options error:", err);
    return NextResponse.json(
      { error: "Failed to generate options" },
      { status: 500 }
    );
  }
}

// POST: verify registration response
export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as RegistrationResponseJSON;
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

    const verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin: getOrigin(request),
      expectedRPID: getRpId(request),
    });

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json(
        { error: "Verification failed" },
        { status: 400 }
      );
    }

    const { credential } = verification.registrationInfo;

    await saveCredential({
      credentialID: credential.id,
      credentialPublicKey: Buffer.from(credential.publicKey).toString("base64url"),
      counter: credential.counter,
      transports: body.response.transports,
    });

    const response = NextResponse.json({ ok: true });
    response.cookies.delete("webauthn-session");
    return response;
  } catch (err) {
    console.error("WebAuthn registration verify error:", err);
    return NextResponse.json(
      { error: "Registration failed" },
      { status: 500 }
    );
  }
}
