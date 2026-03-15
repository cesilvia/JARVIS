import { NextRequest, NextResponse } from "next/server";
import { getAllBikes, upsertBikes, deleteBike } from "@/app/lib/db";

export async function GET() {
  const bikes = getAllBikes();
  return NextResponse.json({ bikes });
}

export async function PUT(request: NextRequest) {
  const { bikes } = await request.json();
  if (!Array.isArray(bikes)) return NextResponse.json({ error: "bikes array required" }, { status: 400 });
  upsertBikes(bikes);
  return NextResponse.json({ success: true, count: bikes.length });
}

export async function DELETE(request: NextRequest) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  deleteBike(id);
  return NextResponse.json({ success: true });
}
