import { NextRequest } from "next/server";
import {
  getTagHierarchy,
  insertTagHierarchyNode,
  reclassifyAllDocuments,
} from "@/app/lib/db";

export async function GET() {
  const hierarchy = getTagHierarchy();
  return Response.json({ hierarchy });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  if (!body.id || !body.label || !body.level) {
    return Response.json({ error: "id, label, and level required" }, { status: 400 });
  }
  insertTagHierarchyNode({
    id: body.id,
    label: body.label,
    level: body.level,
    parent: body.parent ?? null,
    keywords: body.keywords ?? "",
  });
  return Response.json({ success: true });
}

export async function PUT() {
  const count = reclassifyAllDocuments();
  return Response.json({ success: true, count });
}
