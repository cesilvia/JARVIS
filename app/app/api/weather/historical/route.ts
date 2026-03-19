import { NextRequest, NextResponse } from "next/server";
import { upsertRideWeather, type RideWeatherRow } from "@/app/lib/db";

interface WeatherRequest {
  activityId: number;
  lat: number;
  lng: number;
  date: string; // ISO date string
}

async function fetchHistoricalWeather(lat: number, lng: number, date: string, hour: number) {
  const dateStr = date.slice(0, 10);
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${dateStr}&end_date=${dateStr}&hourly=temperature_2m,apparent_temperature,wind_speed_10m,wind_direction_10m,precipitation,relative_humidity_2m,weather_code`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`);
  const data = await res.json();

  const hourly = data.hourly;
  if (!hourly?.time?.length) return null;

  // Find the closest hour to the ride start
  const idx = Math.min(hour, hourly.time.length - 1);
  return {
    temperature: hourly.temperature_2m?.[idx] ?? null,
    feels_like: hourly.apparent_temperature?.[idx] ?? null,
    wind_speed: hourly.wind_speed_10m?.[idx] ?? null,
    wind_direction: hourly.wind_direction_10m?.[idx] ?? null,
    precipitation: hourly.precipitation?.[idx] ?? null,
    weather_code: hourly.weather_code?.[idx] ?? null,
    humidity: hourly.relative_humidity_2m?.[idx] ?? null,
  };
}

export async function POST(request: NextRequest) {
  try {
    const { rides } = (await request.json()) as { rides: WeatherRequest[] };
    if (!Array.isArray(rides) || rides.length === 0) {
      return NextResponse.json({ error: "rides array required" }, { status: 400 });
    }
    if (rides.length > 50) {
      return NextResponse.json({ error: "max 50 rides per request" }, { status: 400 });
    }

    const results: RideWeatherRow[] = [];
    const errors: { activityId: number; error: string }[] = [];

    for (const ride of rides) {
      try {
        const hour = new Date(ride.date).getUTCHours();
        const weather = await fetchHistoricalWeather(ride.lat, ride.lng, ride.date, hour);
        if (weather) {
          results.push({ activity_id: ride.activityId, ...weather, timeline: null });
        }
        // Be polite to Open-Meteo
        if (rides.length > 1) await new Promise((r) => setTimeout(r, 200));
      } catch (err) {
        errors.push({ activityId: ride.activityId, error: err instanceof Error ? err.message : "Unknown" });
      }
    }

    if (results.length > 0) {
      upsertRideWeather(results);
    }

    return NextResponse.json({ saved: results.length, errors });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown" }, { status: 500 });
  }
}
