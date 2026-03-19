import { NextRequest, NextResponse } from "next/server";
import { upsertRideWeather, type RideWeatherRow } from "@/app/lib/db";

// Decode Google-encoded polyline
function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let i = 0, lat = 0, lng = 0;
  while (i < encoded.length) {
    let shift = 0, result = 0, byte: number;
    do { byte = encoded.charCodeAt(i++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);
    shift = 0; result = 0;
    do { byte = encoded.charCodeAt(i++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : (result >> 1);
    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}

function samplePoints(points: [number, number][], n: number): [number, number][] {
  if (points.length <= n) return points;
  const result: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const idx = Math.round((i / (n - 1)) * (points.length - 1));
    result.push(points[idx]);
  }
  return result;
}

interface TimelinePoint {
  hour: number;
  lat: number;
  lng: number;
  temperature: number | null;
  feelsLike: number | null;
  windSpeed: number | null;
  windDirection: number | null;
  precipitation: number | null;
  weatherCode: number | null;
}

async function fetchHourlyWeather(lat: number, lng: number, date: string, hours: number[]): Promise<Record<number, { temperature: number; feelsLike: number; windSpeed: number; windDirection: number; precipitation: number; weatherCode: number }>> {
  const dateStr = date.slice(0, 10);
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${dateStr}&end_date=${dateStr}&hourly=temperature_2m,apparent_temperature,wind_speed_10m,wind_direction_10m,precipitation,weather_code`;

  const res = await fetch(url);
  if (!res.ok) return {};
  const data = await res.json();
  const hourly = data.hourly;
  if (!hourly?.time?.length) return {};

  const result: Record<number, { temperature: number; feelsLike: number; windSpeed: number; windDirection: number; precipitation: number; weatherCode: number }> = {};
  for (const hr of hours) {
    const idx = Math.min(hr, hourly.time.length - 1);
    result[hr] = {
      temperature: hourly.temperature_2m?.[idx] ?? null,
      feelsLike: hourly.apparent_temperature?.[idx] ?? null,
      windSpeed: hourly.wind_speed_10m?.[idx] ?? null,
      windDirection: hourly.wind_direction_10m?.[idx] ?? null,
      precipitation: hourly.precipitation?.[idx] ?? null,
      weatherCode: hourly.weather_code?.[idx] ?? null,
    };
  }
  return result;
}

export async function POST(request: NextRequest) {
  try {
    const { activityId, polyline, startDate, movingTimeSeconds } = await request.json();
    if (!activityId || !polyline || !startDate) {
      return NextResponse.json({ error: "activityId, polyline, startDate required" }, { status: 400 });
    }

    const points = decodePolyline(polyline);
    if (points.length < 2) {
      return NextResponse.json({ error: "Polyline too short" }, { status: 400 });
    }

    const startHour = new Date(startDate).getUTCHours();
    const rideHours = Math.max(1, Math.ceil((movingTimeSeconds || 3600) / 3600));
    // Sample one point per hour of riding
    const sampledPoints = samplePoints(points, rideHours + 1);

    const timeline: TimelinePoint[] = [];

    // Fetch weather for each sampled point
    // Group by unique lat/lng (rounded to 0.1°) to minimize API calls
    const locationGroups = new Map<string, { lat: number; lng: number; hours: number[]; indices: number[] }>();

    for (let i = 0; i < sampledPoints.length; i++) {
      const [lat, lng] = sampledPoints[i];
      const clockHour = (startHour + i) % 24;
      const key = `${lat.toFixed(1)},${lng.toFixed(1)}`;
      const group = locationGroups.get(key);
      if (group) {
        group.hours.push(clockHour);
        group.indices.push(i);
      } else {
        locationGroups.set(key, { lat, lng, hours: [clockHour], indices: [i] });
      }
    }

    // Fetch weather for each unique location
    for (const group of locationGroups.values()) {
      const weatherByHour = await fetchHourlyWeather(group.lat, group.lng, startDate, group.hours);
      for (let j = 0; j < group.indices.length; j++) {
        const idx = group.indices[j];
        const hr = group.hours[j];
        const w = weatherByHour[hr];
        timeline.push({
          hour: idx,
          lat: sampledPoints[idx][0],
          lng: sampledPoints[idx][1],
          temperature: w?.temperature ?? null,
          feelsLike: w?.feelsLike ?? null,
          windSpeed: w?.windSpeed ?? null,
          windDirection: w?.windDirection ?? null,
          precipitation: w?.precipitation ?? null,
          weatherCode: w?.weatherCode ?? null,
        });
      }
      // Rate limit politeness
      await new Promise((r) => setTimeout(r, 200));
    }

    // Sort timeline by hour
    timeline.sort((a, b) => a.hour - b.hour);

    // Save: use first point as the summary, store full timeline
    const first = timeline[0];
    const row: RideWeatherRow = {
      activity_id: activityId,
      temperature: first?.temperature ?? null,
      feels_like: first?.feelsLike ?? null,
      wind_speed: first?.windSpeed ?? null,
      wind_direction: first?.windDirection ?? null,
      precipitation: first?.precipitation ?? null,
      weather_code: first?.weatherCode ?? null,
      humidity: null,
      timeline: JSON.stringify(timeline),
    };
    upsertRideWeather([row]);

    return NextResponse.json({ timeline, saved: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown" }, { status: 500 });
  }
}
