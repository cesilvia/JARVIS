import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import { exportAll, kvSet, kvGetAll, upsertActivities, setStream, upsertVocab, upsertRecipes, upsertIngredients, upsertBikes, upsertGearItems, upsertTireRefs } from "@/app/lib/db";

const BACKUP_DIR = process.env.BACKUP_DIR || path.join(
  os.homedir(),
  "Library",
  "Mobile Documents",
  "com~apple~CloudDocs",
  "JARVIS-backups"
);

// --- R2 upload via S3-compatible API (AWS Signature V4) ---

function hmacSha256(key: Buffer | string, data: string): Buffer {
  return crypto.createHmac("sha256", key).update(data).digest();
}

function sha256(data: string | Buffer): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

async function uploadToR2(fileName: string, body: Buffer): Promise<{ success: boolean; error?: string }> {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME || "jarvis-backups";

  if (!accountId || !accessKeyId || !secretAccessKey) {
    return { success: false, error: "R2 credentials not configured" };
  }

  const host = `${accountId}.r2.cloudflarestorage.com`;
  const url = `https://${host}/${bucket}/${fileName}`;
  const now = new Date();
  const dateStamp = now.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const shortDate = dateStamp.slice(0, 8);
  const region = "auto";
  const service = "s3";
  const scope = `${shortDate}/${region}/${service}/aws4_request`;

  const payloadHash = sha256(body);

  const headers: Record<string, string> = {
    Host: host,
    "Content-Type": "application/json",
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": dateStamp,
  };

  // Canonical request
  const signedHeaderKeys = Object.keys(headers).map((k) => k.toLowerCase()).sort();
  const signedHeaders = signedHeaderKeys.join(";");
  const canonicalHeaders = signedHeaderKeys.map((k) => `${k}:${headers[Object.keys(headers).find((h) => h.toLowerCase() === k)!]}`).join("\n") + "\n";

  const canonicalRequest = [
    "PUT",
    `/${bucket}/${fileName}`,
    "", // no query string
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  // String to sign
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    dateStamp,
    scope,
    sha256(canonicalRequest),
  ].join("\n");

  // Signing key
  const kDate = hmacSha256(`AWS4${secretAccessKey}`, shortDate);
  const kRegion = hmacSha256(kDate, region);
  const kService = hmacSha256(kRegion, service);
  const kSigning = hmacSha256(kService, "aws4_request");
  const signature = hmacSha256(kSigning, stringToSign).toString("hex");

  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  try {
    const res = await fetch(url, {
      method: "PUT",
      headers: { ...headers, Authorization: authorization },
      body,
    });

    if (!res.ok) {
      const text = await res.text();
      return { success: false, error: `R2 upload failed (${res.status}): ${text}` };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "R2 upload failed" };
  }
}

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

// GET: list backups or retrieve a specific one
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const file = searchParams.get("file");

    ensureBackupDir();

    if (file) {
      // Prevent path traversal
      const safeName = path.basename(file);
      const filePath = path.join(BACKUP_DIR, safeName);
      if (!fs.existsSync(filePath)) {
        return NextResponse.json({ error: "Backup not found" }, { status: 404 });
      }
      const content = fs.readFileSync(filePath, "utf-8");
      return NextResponse.json(JSON.parse(content));
    }

    // List all backups
    const files = fs.readdirSync(BACKUP_DIR)
      .filter((f) => f.startsWith("jarvis-backup-") && f.endsWith(".json"))
      .sort()
      .reverse();

    const backups = files.map((f) => {
      const stat = fs.statSync(path.join(BACKUP_DIR, f));
      return {
        name: f,
        size: stat.size,
        created: stat.birthtime.toISOString(),
      };
    });

    return NextResponse.json({ backups, backupDir: BACKUP_DIR });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to read backups" },
      { status: 500 }
    );
  }
}

// POST: save a backup (reads all data from SQLite server-side)
export async function POST() {
  try {
    ensureBackupDir();

    // Export everything from SQLite
    const exported = exportAll();

    // Format with jarvis- prefix keys for backward compatibility with restore/migration
    const data: Record<string, unknown> = {};

    // Domain tables
    if (Array.isArray(exported.activities) && exported.activities.length > 0)
      data["jarvis-strava-activities"] = exported.activities;
    if (Array.isArray(exported.vocab) && exported.vocab.length > 0)
      data["jarvis-german-vocab"] = exported.vocab;
    if (Array.isArray(exported.recipes) && exported.recipes.length > 0)
      data["jarvis-recipes"] = exported.recipes;
    if (Array.isArray(exported.ingredients) && exported.ingredients.length > 0)
      data["jarvis-saved-ingredients"] = exported.ingredients;
    if (Array.isArray(exported.bikes) && exported.bikes.length > 0)
      data["jarvis-bikes"] = exported.bikes;
    if (Array.isArray(exported.gearItems) && exported.gearItems.length > 0)
      data["jarvis-gear-inventory"] = exported.gearItems;
    if (Array.isArray(exported.tireRefs) && exported.tireRefs.length > 0)
      data["jarvis-tire-pressure-tires"] = exported.tireRefs;

    // Streams (keyed by activity ID)
    if (exported.streams && typeof exported.streams === "object") {
      for (const [actId, streamData] of Object.entries(exported.streams as Record<string, unknown>)) {
        data[`jarvis-strava-stream-${actId}`] = streamData;
      }
    }

    // KV entries — re-add the jarvis- prefix
    if (exported.kv && typeof exported.kv === "object") {
      for (const [key, value] of Object.entries(exported.kv as Record<string, unknown>)) {
        data[`jarvis-${key}`] = value;
      }
    }

    const timestamp = new Date().toISOString().split("T")[0];
    const fileName = `jarvis-backup-${timestamp}.json`;
    const filePath = path.join(BACKUP_DIR, fileName);

    const backup = {
      version: 2,
      exportedAt: new Date().toISOString(),
      data,
    };

    const jsonStr = JSON.stringify(backup, null, 2);
    fs.writeFileSync(filePath, jsonStr, "utf-8");

    // Upload to R2 (off-device backup)
    const r2Result = await uploadToR2(fileName, Buffer.from(jsonStr));

    // Update last backup timestamp in SQLite
    kvSet("last-full-backup", new Date().toISOString());

    return NextResponse.json({
      success: true,
      fileName,
      path: filePath,
      size: fs.statSync(filePath).size,
      keys: Object.keys(data).length,
      r2: r2Result,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save backup" },
      { status: 500 }
    );
  }
}

// PUT: restore from a backup file (server-side — reads file and writes to SQLite)
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const file = searchParams.get("file");

    if (!file) {
      return NextResponse.json({ error: "file parameter required" }, { status: 400 });
    }

    const safeName = path.basename(file);
    const filePath = path.join(BACKUP_DIR, safeName);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "Backup not found" }, { status: 404 });
    }

    const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const data = content.data;
    if (!data || typeof data !== "object") {
      return NextResponse.json({ error: "Invalid backup format" }, { status: 400 });
    }

    const results: Record<string, string> = {};

    // Domain tables
    if (data["jarvis-strava-activities"]) {
      const arr = data["jarvis-strava-activities"];
      if (Array.isArray(arr)) { upsertActivities(arr); results["activities"] = `${arr.length}`; }
    }
    if (data["jarvis-german-vocab"]) {
      const arr = data["jarvis-german-vocab"];
      if (Array.isArray(arr)) { upsertVocab(arr); results["vocab"] = `${arr.length}`; }
    }
    if (data["jarvis-recipes"]) {
      const arr = data["jarvis-recipes"];
      if (Array.isArray(arr)) { upsertRecipes(arr); results["recipes"] = `${arr.length}`; }
    }
    if (data["jarvis-saved-ingredients"]) {
      const arr = data["jarvis-saved-ingredients"];
      if (Array.isArray(arr)) { upsertIngredients(arr); results["ingredients"] = `${arr.length}`; }
    }
    if (data["jarvis-bikes"]) {
      const arr = data["jarvis-bikes"];
      if (Array.isArray(arr)) { upsertBikes(arr); results["bikes"] = `${arr.length}`; }
    }
    if (data["jarvis-gear-inventory"]) {
      const arr = data["jarvis-gear-inventory"];
      if (Array.isArray(arr)) { upsertGearItems(arr); results["gear"] = `${arr.length}`; }
    }
    if (data["jarvis-tire-pressure-tires"]) {
      const arr = data["jarvis-tire-pressure-tires"];
      if (Array.isArray(arr)) { upsertTireRefs(arr); results["tires"] = `${arr.length}`; }
    }

    // Streams
    let streamCount = 0;
    for (const key of Object.keys(data)) {
      if (key.startsWith("jarvis-strava-stream-")) {
        const activityId = parseInt(key.replace("jarvis-strava-stream-", ""), 10);
        if (!isNaN(activityId)) {
          setStream(activityId, data[key]);
          streamCount++;
        }
      }
    }
    if (streamCount > 0) results["streams"] = `${streamCount}`;

    // KV entries
    const domainKeys = new Set([
      "jarvis-strava-activities", "jarvis-bikes", "jarvis-gear-inventory",
      "jarvis-recipes", "jarvis-saved-ingredients", "jarvis-german-vocab",
      "jarvis-tire-pressure-tires",
    ]);
    let kvCount = 0;
    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith("jarvis-") && !domainKeys.has(key) && !key.startsWith("jarvis-strava-stream-")) {
        kvSet(key.replace(/^jarvis-/, ""), value);
        kvCount++;
      }
    }
    results["kv"] = `${kvCount}`;

    return NextResponse.json({ success: true, results });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Restore failed" },
      { status: 500 }
    );
  }
}

// DELETE: remove a specific backup
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const file = searchParams.get("file");

    if (!file) {
      return NextResponse.json({ error: "file parameter required" }, { status: 400 });
    }

    const safeName = path.basename(file);
    const filePath = path.join(BACKUP_DIR, safeName);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "Backup not found" }, { status: 404 });
    }

    fs.unlinkSync(filePath);
    return NextResponse.json({ success: true, deleted: safeName });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete backup" },
      { status: 500 }
    );
  }
}
