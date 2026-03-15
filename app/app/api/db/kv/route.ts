import { NextRequest, NextResponse } from "next/server";
import { kvGet, kvGetAll, kvSet, kvDelete } from "@/app/lib/db";

export async function GET(request: NextRequest) {
  const key = new URL(request.url).searchParams.get("key");
  if (!key) {
    // No key specified → return all KV pairs
    const all = kvGetAll();
    return NextResponse.json({ entries: all });
  }
  const value = kvGet(key);
  return NextResponse.json({ key, value });
}

export async function PUT(request: NextRequest) {
  const { key, value } = await request.json();
  if (!key) return NextResponse.json({ error: "key required" }, { status: 400 });
  kvSet(key, value);
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const key = new URL(request.url).searchParams.get("key");
  if (!key) return NextResponse.json({ error: "key required" }, { status: 400 });
  kvDelete(key);
  return NextResponse.json({ success: true });
}
