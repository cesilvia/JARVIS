import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";

export async function POST(request: Request) {
  try {
    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Current and new password required" },
        { status: 400 }
      );
    }

    if (typeof newPassword !== "string" || newPassword.length < 4) {
      return NextResponse.json(
        { error: "New password must be at least 4 characters" },
        { status: 400 }
      );
    }

    const currentHash = process.env.AUTH_PASSWORD_HASH;
    if (!currentHash) {
      return NextResponse.json(
        { error: "Auth not configured" },
        { status: 500 }
      );
    }

    const valid = await bcrypt.compare(currentPassword, currentHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 401 }
      );
    }

    const newHash = await bcrypt.hash(newPassword, 12);

    // Update .env.local
    const envPath = join(process.cwd(), ".env.local");
    const envContent = await readFile(envPath, "utf-8");
    const updated = envContent.replace(
      /^AUTH_PASSWORD_HASH=.*$/m,
      `AUTH_PASSWORD_HASH=${newHash.replace(/\$/g, "\\$")}`
    );
    await writeFile(envPath, updated);

    // Update in-process env so it takes effect immediately
    process.env.AUTH_PASSWORD_HASH = newHash;

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to change password" },
      { status: 500 }
    );
  }
}
