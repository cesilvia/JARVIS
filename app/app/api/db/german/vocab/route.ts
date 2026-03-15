import { NextRequest, NextResponse } from "next/server";
import { getAllVocab, upsertVocab, deleteVocab } from "@/app/lib/db";

export async function GET() {
  const vocab = getAllVocab();
  return NextResponse.json({ vocab });
}

export async function PUT(request: NextRequest) {
  const { words } = await request.json();
  if (!Array.isArray(words)) return NextResponse.json({ error: "words array required" }, { status: 400 });
  upsertVocab(words);
  return NextResponse.json({ success: true, count: words.length });
}

export async function DELETE(request: NextRequest) {
  const url = new URL(request.url);
  const german = url.searchParams.get("german");
  const english = url.searchParams.get("english");
  if (!german || !english) return NextResponse.json({ error: "german and english required" }, { status: 400 });
  deleteVocab(german, english);
  return NextResponse.json({ success: true });
}
