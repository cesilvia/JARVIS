import { NextRequest, NextResponse } from "next/server";
import { kvGet, kvSet, kvDelete, kvGetAll } from "@/app/lib/db";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const KV_PREFIX = "verify:";

// Map URL path → source file(s) relative to app/
const PAGE_FILES: Record<string, string[]> = {
  "/hub": ["hub/page.tsx", "hub/WedgeSummaryCard.tsx"],
  "/calendar": ["calendar/page.tsx"],
  "/tasks": ["tasks/page.tsx"],
  "/weather": ["weather/page.tsx"],
  "/notes": ["notes/page.tsx"],
  "/health": ["health/page.tsx"],
  "/profile": ["profile/page.tsx"],
  // Hub Wedges & Icons — track hub rendering files; German also tracks vocab/wotd
  "/hub/wedge/calendar": ["hub/page.tsx", "hub/WedgeSummaryCard.tsx"],
  "/hub/wedge/nutrition": ["hub/page.tsx", "hub/WedgeSummaryCard.tsx"],
  "/hub/wedge/strava": ["hub/page.tsx", "hub/WedgeSummaryCard.tsx"],
  "/hub/wedge/tasks": ["hub/page.tsx", "hub/WedgeSummaryCard.tsx"],
  "/hub/wedge/weather": ["hub/page.tsx", "hub/WedgeSummaryCard.tsx"],
  "/hub/wedge/notes": ["hub/page.tsx", "hub/WedgeSummaryCard.tsx"],
  "/hub/wedge/health": ["hub/page.tsx", "hub/WedgeSummaryCard.tsx"],
  "/hub/wedge/german": ["hub/page.tsx", "hub/WedgeSummaryCard.tsx", "lib/word-of-the-day.ts", "lib/german-types.ts"],
  "/hub/icon/settings": ["hub/page.tsx"],
  "/hub/icon/profile": ["hub/page.tsx"],
  "/hub/icon/status": ["hub/page.tsx"],
  "/hub/icon/alerts": ["hub/page.tsx"],
  // Cycling
  "/bike": ["bike/page.tsx"],
  "/bike/strava": ["bike/strava/page.tsx", "bike/strava/types.ts"],
  "/bike/components": ["bike/components/page.tsx"],
  "/bike/tire-pressure": ["bike/tire-pressure/page.tsx"],
  "/bike/inventory": ["bike/inventory/page.tsx"],
  // Nutrition
  "/nutrition": ["nutrition/page.tsx"],
  "/recipes": ["recipes/page.tsx"],
  "/recipes/browse": ["recipes/browse/page.tsx"],
  // Learning
  "/german": ["german/page.tsx"],
  // Settings
  "/settings": ["settings/page.tsx"],
  "/settings/cycling": ["settings/cycling/page.tsx"],
  "/settings/nutrition": ["settings/nutrition/page.tsx"],
  "/settings/backup": ["settings/backup/page.tsx"],
  "/settings/security": ["settings/security/page.tsx"],
  "/settings/extras": ["settings/extras/page.tsx"],
  "/settings/verification": ["settings/verification/page.tsx"],
  // System
  "/login": ["login/page.tsx"],
  "/status": ["status/page.tsx"],
  "/alerts": ["alerts/page.tsx"],
};

const APP_DIR = path.join(process.cwd(), "app");

function hashFiles(files: string[]): string {
  const h = crypto.createHash("md5");
  for (const f of files) {
    const full = path.join(APP_DIR, f);
    try {
      h.update(fs.readFileSync(full));
    } catch {
      h.update(`missing:${f}`);
    }
  }
  return h.digest("hex");
}

type VerifyKV = { verified: boolean; verifiedAt: string; fileHash: string };

export type VerifyStatus = {
  path: string;
  verified: boolean;
  invalidated: boolean;
  verifiedAt: string | null;
};

// GET: return verification status for all pages
export async function GET() {
  const allKV = kvGetAll();
  const results: VerifyStatus[] = [];

  for (const [pagePath, files] of Object.entries(PAGE_FILES)) {
    const kv = allKV[KV_PREFIX + pagePath] as VerifyKV | undefined;
    if (!kv?.verified) {
      results.push({ path: pagePath, verified: false, invalidated: false, verifiedAt: null });
      continue;
    }
    const currentHash = hashFiles(files);
    const invalidated = currentHash !== kv.fileHash;
    results.push({
      path: pagePath,
      verified: !invalidated,
      invalidated,
      verifiedAt: kv.verifiedAt,
    });
  }

  return NextResponse.json({ pages: results });
}

// PUT: mark a page as verified (stores current file hash)
export async function PUT(request: NextRequest) {
  const { path: pagePath } = await request.json();
  if (!pagePath || !PAGE_FILES[pagePath]) {
    return NextResponse.json({ error: "invalid page path" }, { status: 400 });
  }
  const fileHash = hashFiles(PAGE_FILES[pagePath]);
  const value: VerifyKV = {
    verified: true,
    verifiedAt: new Date().toISOString(),
    fileHash,
  };
  kvSet(KV_PREFIX + pagePath, value);
  return NextResponse.json({ success: true, fileHash });
}

// DELETE: clear verification for a page (or all if path=*)
export async function DELETE(request: NextRequest) {
  const pagePath = new URL(request.url).searchParams.get("path");
  if (pagePath === "*") {
    for (const p of Object.keys(PAGE_FILES)) {
      kvDelete(KV_PREFIX + p);
    }
    return NextResponse.json({ success: true });
  }
  if (!pagePath) return NextResponse.json({ error: "path required" }, { status: 400 });
  kvDelete(KV_PREFIX + pagePath);
  return NextResponse.json({ success: true });
}
