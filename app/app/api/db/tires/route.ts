import { NextRequest, NextResponse } from "next/server";
import { getAllTireRefs, upsertTireRefs, deleteTireRef } from "@/app/lib/db";

export async function GET() {
  const tires = getAllTireRefs();
  return NextResponse.json({ tires });
}

export async function PUT(request: NextRequest) {
  const { tires } = await request.json();
  if (!Array.isArray(tires)) return NextResponse.json({ error: "tires array required" }, { status: 400 });
  upsertTireRefs(tires);
  return NextResponse.json({ success: true, count: tires.length });
}

export async function DELETE(request: NextRequest) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  deleteTireRef(id);
  return NextResponse.json({ success: true });
}
