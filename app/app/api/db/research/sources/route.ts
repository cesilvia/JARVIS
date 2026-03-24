import { NextRequest } from "next/server";
import { getAllResearchSources, upsertResearchSources, deleteResearchSource } from "@/app/lib/db";

export async function GET() {
  const sources = getAllResearchSources();
  return Response.json({ sources });
}

export async function PUT(request: NextRequest) {
  const { sources } = await request.json();
  if (!Array.isArray(sources)) {
    return Response.json({ error: "sources array required" }, { status: 400 });
  }
  upsertResearchSources(sources);
  return Response.json({ success: true, count: sources.length });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "id required" }, { status: 400 });
  deleteResearchSource(id);
  return Response.json({ success: true });
}
