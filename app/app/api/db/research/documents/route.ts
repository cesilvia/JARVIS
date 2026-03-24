import { NextRequest } from "next/server";
import {
  getAllResearchDocuments,
  getResearchDocument,
  upsertResearchDocuments,
  deleteResearchDocument,
  getResearchStats,
} from "@/app/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (id) {
    const doc = getResearchDocument(id);
    if (!doc) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ document: doc });
  }

  const source = searchParams.get("source") ?? undefined;
  const tag = searchParams.get("tag") ?? undefined;
  const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined;
  const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!) : undefined;
  const stats = searchParams.get("stats") === "true";

  if (stats) {
    return Response.json({ stats: getResearchStats() });
  }

  const documents = getAllResearchDocuments({ source, tag, limit, offset });
  return Response.json({ documents });
}

export async function PUT(request: NextRequest) {
  const { documents } = await request.json();
  if (!Array.isArray(documents)) {
    return Response.json({ error: "documents array required" }, { status: 400 });
  }
  upsertResearchDocuments(documents);
  return Response.json({ success: true, count: documents.length });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "id required" }, { status: 400 });
  deleteResearchDocument(id);
  return Response.json({ success: true });
}
