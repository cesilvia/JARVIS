import { NextRequest, NextResponse } from "next/server";
import { getRideNoteOptions, getAllRideNoteOptions, upsertRideNoteOption, deleteRideNoteOption } from "@/app/lib/db";

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get("category");
  const all = request.nextUrl.searchParams.get("all");
  if (all === "1") {
    const options = getAllRideNoteOptions();
    return NextResponse.json({ options });
  }
  const options = getRideNoteOptions(category ?? undefined);
  return NextResponse.json({ options });
}

export async function PUT(request: NextRequest) {
  const { category, label, sortOrder } = await request.json();
  if (!category || !label) return NextResponse.json({ error: "category and label required" }, { status: 400 });
  upsertRideNoteOption(category, label, sortOrder ?? 0);
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  deleteRideNoteOption(Number(id));
  return NextResponse.json({ success: true });
}
