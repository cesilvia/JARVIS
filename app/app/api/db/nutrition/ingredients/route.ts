import { NextRequest, NextResponse } from "next/server";
import { getAllIngredients, upsertIngredients, deleteIngredient } from "@/app/lib/db";

export async function GET() {
  const ingredients = getAllIngredients();
  return NextResponse.json({ ingredients });
}

export async function PUT(request: NextRequest) {
  const { ingredients } = await request.json();
  if (!Array.isArray(ingredients)) return NextResponse.json({ error: "ingredients array required" }, { status: 400 });
  upsertIngredients(ingredients);
  return NextResponse.json({ success: true, count: ingredients.length });
}

export async function DELETE(request: NextRequest) {
  const name = new URL(request.url).searchParams.get("name");
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  deleteIngredient(name);
  return NextResponse.json({ success: true });
}
