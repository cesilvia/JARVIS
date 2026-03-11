import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { createSession, setSessionCookie } from "../../../lib/session";

const ENV_FILE = join(process.cwd(), ".env.local");

async function readEnvFile(): Promise<string> {
  try {
    return await readFile(ENV_FILE, "utf-8");
  } catch {
    return "";
  }
}

function isSetup(): boolean {
  return !!process.env.AUTH_PASSWORD_HASH;
}

// GET: check if setup is needed
export async function GET() {
  return NextResponse.json({ needsSetup: !isSetup() });
}

// POST: set initial password
export async function POST(request: Request) {
  if (isSetup()) {
    return NextResponse.json(
      { error: "Password already configured" },
      { status: 400 }
    );
  }

  try {
    const { password } = await request.json();
    if (!password || typeof password !== "string" || password.length < 4) {
      return NextResponse.json(
        { error: "Password must be at least 4 characters" },
        { status: 400 }
      );
    }

    const hash = await bcrypt.hash(password, 12);

    // Generate session secret if not present
    let sessionSecret = process.env.SESSION_SECRET;
    if (!sessionSecret) {
      sessionSecret = crypto.randomUUID() + crypto.randomUUID();
    }

    // Write to .env.local
    let envContent = await readEnvFile();
    if (!envContent.endsWith("\n") && envContent.length > 0) {
      envContent += "\n";
    }
    envContent += `AUTH_PASSWORD_HASH=${hash.replace(/\$/g, "\\$")}\n`;
    if (!process.env.SESSION_SECRET) {
      envContent += `SESSION_SECRET=${sessionSecret}\n`;
    }
    await writeFile(ENV_FILE, envContent);

    // Set env vars in the current process so they take effect immediately
    process.env.AUTH_PASSWORD_HASH = hash;
    process.env.SESSION_SECRET = sessionSecret;

    const token = await createSession();
    await setSessionCookie(token);

    return NextResponse.json({ ok: true, needsRestart: false });
  } catch (err) {
    console.error("Setup error:", err);
    return NextResponse.json({ error: "Setup failed" }, { status: 500 });
  }
}
