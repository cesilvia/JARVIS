import { NextRequest, NextResponse } from "next/server";
import { getAllGearItems, upsertGearItems, deleteGearItem } from "@/app/lib/db";

export async function GET() {
  const items = getAllGearItems();
  return NextResponse.json({ items });
}

export async function PUT(request: NextRequest) {
  const { items } = await request.json();
  if (!Array.isArray(items)) return NextResponse.json({ error: "items array required" }, { status: 400 });
  upsertGearItems(items);
  return NextResponse.json({ success: true, count: items.length });
}

export async function DELETE(request: NextRequest) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  deleteGearItem(id);
  return NextResponse.json({ success: true });
}
