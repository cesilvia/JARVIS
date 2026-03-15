import { NextRequest, NextResponse } from "next/server";
import { getStream, setStream } from "@/app/lib/db";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ activityId: string }> }) {
  const { activityId } = await params;
  const data = getStream(Number(activityId));
  return NextResponse.json({ data });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ activityId: string }> }) {
  const { activityId } = await params;
  const { data } = await request.json();
  setStream(Number(activityId), data);
  return NextResponse.json({ success: true });
}
