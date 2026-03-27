import { NextRequest, NextResponse } from "next/server";
import { getRideNote, getAllRideNotes, upsertRideNote, rideNoteExists } from "@/app/lib/db";

export async function GET(request: NextRequest) {
  const activityId = request.nextUrl.searchParams.get("activityId");
  if (activityId) {
    const note = getRideNote(Number(activityId));
    return NextResponse.json({ note });
  }
  // Check existence for multiple IDs
  const ids = request.nextUrl.searchParams.get("checkIds");
  if (ids) {
    const idList = ids.split(",").map(Number).filter(n => !isNaN(n));
    const exists = rideNoteExists(idList);
    return NextResponse.json({ exists });
  }
  // Return all notes (for trends)
  const notes = getAllRideNotes();
  return NextResponse.json({ notes });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { activityId, ...data } = body;
  if (!activityId) return NextResponse.json({ error: "activityId required" }, { status: 400 });
  upsertRideNote(Number(activityId), data);
  return NextResponse.json({ success: true });
}
