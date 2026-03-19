import { NextRequest, NextResponse } from "next/server";
import { getWeatherForActivities, getActivitiesWithoutWeather } from "@/app/lib/db";

export async function POST(request: NextRequest) {
  const { activityIds } = await request.json();
  if (!Array.isArray(activityIds)) {
    return NextResponse.json({ error: "activityIds array required" }, { status: 400 });
  }
  const weatherMap = getWeatherForActivities(activityIds);
  const weather: Record<number, unknown> = {};
  for (const [id, row] of weatherMap) {
    weather[id] = {
      activityId: row.activity_id,
      temperature: row.temperature,
      feelsLike: row.feels_like,
      windSpeed: row.wind_speed,
      windDirection: row.wind_direction,
      precipitation: row.precipitation,
      weatherCode: row.weather_code,
      humidity: row.humidity,
      timeline: row.timeline ? JSON.parse(row.timeline) : null,
    };
  }
  return NextResponse.json({ weather });
}

export async function GET() {
  const missing = getActivitiesWithoutWeather();
  return NextResponse.json({ count: missing.length });
}
