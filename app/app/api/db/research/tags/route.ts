import { NextRequest } from "next/server";
import { getAllTags, getUnreviewedTags, confirmResearchTag, setResearchTags } from "@/app/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const unreviewed = searchParams.get("unreviewed") === "true";

  if (unreviewed) {
    const items = getUnreviewedTags();
    return Response.json({ items });
  }

  const tags = getAllTags();
  return Response.json({ tags });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();

  // Confirm a single tag
  if (body.documentId && body.tag && body.action === "confirm") {
    confirmResearchTag(body.documentId, body.tag);
    return Response.json({ success: true });
  }

  // Set all tags for a document
  if (body.documentId && Array.isArray(body.tags)) {
    setResearchTags(body.documentId, body.tags.map((t: string) => ({ tag: t, auto: false, confirmed: true })));
    return Response.json({ success: true });
  }

  return Response.json({ error: "Invalid request" }, { status: 400 });
}
