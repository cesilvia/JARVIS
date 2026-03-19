import { NextResponse } from "next/server";
import { getActivitiesWithoutWeather, upsertRideWeather, type RideWeatherRow } from "@/app/lib/db";

const BATCH_SIZE = 10; // Smaller batch since timeline rides make multiple API calls

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

async function fetchHourlyWeather(lat: number, lng: number, date: string, hours: number[]) {
  const dateStr = date.slice(0, 10);
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${dateStr}&end_date=${dateStr}&hourly=temperature_2m,apparent_temperature,wind_speed_10m,wind_direction_10m,precipitation,relative_humidity_2m,weather_code`;

  const res = await fetch(url);
  if (!res.ok) return {};
  const data = await res.json();
  const hourly = data.hourly;
  if (!hourly?.time?.length) return {};

  const result: Record<number, { temperature: number; feelsLike: number; windSpeed: number; windDirection: number; precipitation: number; weatherCode: number; humidity: number }> = {};
  for (const hr of hours) {
    const idx = Math.min(hr, hourly.time.length - 1);
    result[hr] = {
      temperature: hourly.temperature_2m?.[idx] ?? null,
      feelsLike: hourly.apparent_temperature?.[idx] ?? null,
      windSpeed: hourly.wind_speed_10m?.[idx] ?? null,
      windDirection: hourly.wind_direction_10m?.[idx] ?? null,
      precipitation: hourly.precipitation?.[idx] ?? null,
      weatherCode: hourly.weather_code?.[idx] ?? null,
      humidity: hourly.relative_humidity_2m?.[idx] ?? null,
    };
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

export async function POST() {
  try {
    const missing = getActivitiesWithoutWeather();
    const batch = missing.slice(0, BATCH_SIZE);

    const today = new Date().toISOString().slice(0, 10);
    const eligible = batch.filter((a) => a.start_date.slice(0, 10) < today);

    const results: RideWeatherRow[] = [];
    let errors = 0;

    for (const ride of eligible) {
      try {
        const startHour = new Date(ride.start_date).getUTCHours();
        const rideHours = Math.max(1, Math.ceil(ride.moving_time / 3600));

        // If ride has a polyline and is longer than 1 hour, build a timeline
        if (ride.map_polyline && ride.map_polyline.length > 10 && rideHours > 1) {
          const routePoints = decodePolyline(ride.map_polyline);
          const sampledPoints = samplePoints(routePoints, rideHours + 1);

          // Group by location (rounded to 0.1°) to minimize API calls
          const locationGroups = new Map<string, { lat: number; lng: number; hours: number[]; indices: number[] }>();
          for (let i = 0; i < sampledPoints.length; i++) {
            const [lat, lng] = sampledPoints[i];
            const clockHour = (startHour + i) % 24;
            const key = `${lat.toFixed(1)},${lng.toFixed(1)}`;
            const group = locationGroups.get(key);
            if (group) { group.hours.push(clockHour); group.indices.push(i); }
            else locationGroups.set(key, { lat, lng, hours: [clockHour], indices: [i] });
          }

          const timeline: TimelinePoint[] = [];
          for (const group of locationGroups.values()) {
            const weatherByHour = await fetchHourlyWeather(group.lat, group.lng, ride.start_date, group.hours);
            for (let j = 0; j < group.indices.length; j++) {
              const idx = group.indices[j];
              const hr = group.hours[j];
              const w = weatherByHour[hr];
              if (w) {
                timeline.push({
                  hour: idx, lat: sampledPoints[idx][0], lng: sampledPoints[idx][1],
                  temperature: w.temperature, feelsLike: w.feelsLike,
                  windSpeed: w.windSpeed, windDirection: w.windDirection,
                  precipitation: w.precipitation, weatherCode: w.weatherCode,
                });
              }
            }
            await new Promise((r) => setTimeout(r, 200));
          }

          timeline.sort((a, b) => a.hour - b.hour);
          const first = timeline[0];
          results.push({
            activity_id: ride.id,
            temperature: first?.temperature ?? null,
            feels_like: first?.feelsLike ?? null,
            wind_speed: first?.windSpeed ?? null,
            wind_direction: first?.windDirection ?? null,
            precipitation: first?.precipitation ?? null,
            weather_code: first?.weatherCode ?? null,
            humidity: null,
            timeline: JSON.stringify(timeline),
          });
        } else {
          // Short ride or no polyline — single-point weather
          const weatherByHour = await fetchHourlyWeather(ride.start_lat, ride.start_lng, ride.start_date, [startHour]);
          const w = weatherByHour[startHour];
          if (w) {
            results.push({
              activity_id: ride.id,
              temperature: w.temperature, feels_like: w.feelsLike,
              wind_speed: w.windSpeed, wind_direction: w.windDirection,
              precipitation: w.precipitation, weather_code: w.weatherCode,
              humidity: w.humidity, timeline: null,
            });
          }
          await new Promise((r) => setTimeout(r, 200));
        }
      } catch {
        errors++;
      }
    }

    if (results.length > 0) {
      upsertRideWeather(results);
    }

    return NextResponse.json({
      processed: results.length,
      errors,
      remaining: missing.length - eligible.length - results.length,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown" }, { status: 500 });
  }
}
