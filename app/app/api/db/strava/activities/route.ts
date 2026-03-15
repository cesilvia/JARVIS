import { NextRequest, NextResponse } from "next/server";
import { getAllActivities, upsertActivities } from "@/app/lib/db";

export async function GET() {
  const activities = getAllActivities();
  return NextResponse.json({ activities });
}

export async function PUT(request: NextRequest) {
  const { activities } = await request.json();
  if (!Array.isArray(activities)) return NextResponse.json({ error: "activities array required" }, { status: 400 });
  upsertActivities(activities);
  return NextResponse.json({ success: true, count: activities.length });
}
