import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const days = searchParams.get("days") || "7";

  if (!lat || !lng) {
    return NextResponse.json({ error: "lat and lng required" }, { status: 400 });
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=temperature_2m,apparent_temperature,wind_speed_10m,wind_direction_10m,precipitation_probability,precipitation,relative_humidity_2m,weather_code&forecast_days=${days}&timezone=auto`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Open-Meteo forecast error: ${res.status}`);
    const data = await res.json();

    const hourly = data.hourly;
    if (!hourly?.time?.length) {
      return NextResponse.json({ hours: [] });
    }

    const hours = hourly.time.map((time: string, i: number) => ({
      time,
      temperature: hourly.temperature_2m?.[i] ?? null,
      feelsLike: hourly.apparent_temperature?.[i] ?? null,
      windSpeed: hourly.wind_speed_10m?.[i] ?? null,
      windDirection: hourly.wind_direction_10m?.[i] ?? null,
      precipitation: hourly.precipitation?.[i] ?? null,
      precipitationProbability: hourly.precipitation_probability?.[i] ?? null,
      weatherCode: hourly.weather_code?.[i] ?? null,
      humidity: hourly.relative_humidity_2m?.[i] ?? null,
    }));

    return NextResponse.json({ hours, timezone: data.timezone });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown" }, { status: 500 });
  }
}
