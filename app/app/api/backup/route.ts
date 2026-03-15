import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

const BACKUP_DIR = path.join(
  os.homedir(),
  "Library",
  "Mobile Documents",
  "com~apple~CloudDocs",
  "JARVIS-backups"
);

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

// POST: save a backup
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { data } = body;

    if (!data || typeof data !== "object") {
      return NextResponse.json({ error: "data object required" }, { status: 400 });
    }

    ensureBackupDir();

    const timestamp = new Date().toISOString().split("T")[0];
    const fileName = `jarvis-backup-${timestamp}.json`;
    const filePath = path.join(BACKUP_DIR, fileName);

    const backup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      data,
    };

    fs.writeFileSync(filePath, JSON.stringify(backup, null, 2), "utf-8");

    return NextResponse.json({
      success: true,
      fileName,
      path: filePath,
      size: fs.statSync(filePath).size,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save backup" },
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
