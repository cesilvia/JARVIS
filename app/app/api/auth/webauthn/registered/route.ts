import { NextResponse } from "next/server";
import { hasRegisteredCredentials } from "../../../../lib/webauthn-store";

export async function GET() {
  const registered = await hasRegisteredCredentials();
  return NextResponse.json({ registered });
}
