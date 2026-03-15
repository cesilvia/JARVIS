import { NextRequest, NextResponse } from "next/server";
import { getAllRecipes, upsertRecipes, deleteRecipe } from "@/app/lib/db";

export async function GET() {
  const recipes = getAllRecipes();
  return NextResponse.json({ recipes });
}

export async function PUT(request: NextRequest) {
  const { recipes } = await request.json();
  if (!Array.isArray(recipes)) return NextResponse.json({ error: "recipes array required" }, { status: 400 });
  upsertRecipes(recipes);
  return NextResponse.json({ success: true, count: recipes.length });
}

export async function DELETE(request: NextRequest) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  deleteRecipe(id);
  return NextResponse.json({ success: true });
}
