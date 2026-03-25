"use client";

import { useState, useEffect } from "react";
import * as api from "../lib/api-client";
import { computeDailyTSS, computeFitness } from "../lib/training-load";
import { getIntervalsFitness } from "../lib/api-client";
import { METERS_TO_MILES } from "../bike/strava/types";
import type { StravaActivity } from "../bike/strava/types";

// ─── Theme ───────────────────────────────────────────────────────
const theme = { primary: "#00D9FF", secondary: "#67C7EB", bg: "#000000" };

// ─── WMO Weather Codes ──────────────────────────────────────────
const WEATHER_DESCRIPTIONS: Record<number, string> = {
  0: "Clear", 1: "Mostly Clear", 2: "Partly Cloudy", 3: "Overcast",
  45: "Fog", 48: "Fog", 51: "Light Drizzle", 53: "Drizzle", 55: "Heavy Drizzle",
  61: "Light Rain", 63: "Rain", 65: "Heavy Rain",
  71: "Light Snow", 73: "Snow", 75: "Heavy Snow",
  80: "Light Showers", 81: "Showers", 82: "Heavy Showers",
  85: "Snow Showers", 86: "Heavy Snow Showers",
  95: "Thunderstorm", 96: "Thunderstorm + Hail", 99: "Thunderstorm + Hail",
};

function weatherDescription(code: number | null): string {
  if (code === null) return "—";
  return WEATHER_DESCRIPTIONS[code] ?? "Unknown";
}

function celsiusToF(c: number): number {
  return Math.round(c * 9 / 5 + 32);
}

function kphToMph(kph: number): number {
  return Math.round(kph * 0.621371);
}

// ─── Greeting ───────────────────────────────────────────────────
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning, Chris";
  if (h < 17) return "Good Afternoon, Chris";
  return "Good Evening, Chris";
}

// ─── Ride Window ────────────────────────────────────────────────
interface HourData {
  time: string;
  temperature: number;
  feelsLike: number;
  windSpeed: number;
  precipitation: number;
  precipitationProbability: number;
  weatherCode: number;
  humidity: number;
}

function computeRideWindow(hours: HourData[]): string {
  const now = new Date();
  const currentHour = now.getHours();
  // Only consider daylight hours from now onward (6am - 9pm)
  const remaining = hours.filter((h) => {
    const hr = parseInt(h.time.slice(11, 13), 10);
    return hr >= Math.max(currentHour, 6) && hr <= 21;
  });
  if (remaining.length === 0) return "No window today";

  // Find rideable hours: low precip, moderate wind, above freezing
  const rideable = remaining.filter(
    (h) => h.precipitation < 0.5 && h.windSpeed < 30 && h.temperature > 0
  );
  if (rideable.length === 0) return "Indoor day";

  // Find longest contiguous stretch
  let bestStart = 0, bestLen = 0, curStart = 0, curLen = 0;
  for (let i = 0; i < rideable.length; i++) {
    const hr = parseInt(rideable[i].time.slice(11, 13), 10);
    const prevHr = i > 0 ? parseInt(rideable[i - 1].time.slice(11, 13), 10) : hr - 1;
    if (hr === prevHr + 1) {
      curLen++;
    } else {
      curStart = i;
      curLen = 1;
    }
    if (curLen > bestLen) {
      bestLen = curLen;
      bestStart = curStart;
    }
  }

  const startHr = parseInt(rideable[bestStart].time.slice(11, 13), 10);
  const endHr = parseInt(rideable[bestStart + bestLen - 1].time.slice(11, 13), 10) + 1;
  const fmt = (hr: number) => {
    if (hr === 0 || hr === 24) return "12am";
    if (hr === 12) return "12pm";
    return hr < 12 ? `${hr}am` : `${hr - 12}pm`;
  };

  // If basically all remaining daylight is rideable
  if (bestLen >= remaining.length - 1 && bestLen >= 8) return "All day";
  return `${fmt(startHr)} – ${fmt(endHr)}`;
}

// ─── Data Types ─────────────────────────────────────────────────
interface TrainingData {
  tsb: number;
  status: string;
  lastRideName: string;
  lastRideDistance: string;
  lastRideAgo: string;
}

interface WeatherData {
  temp: string;
  feelsLike: string;
  description: string;
  wind: string;
  rideWindow: string;
}

interface TodayData {
  cardsDue: number;
}

// ─── Component ──────────────────────────────────────────────────
export default function WelcomeBanner({ isOpen }: { isOpen: boolean }) {
  const [training, setTraining] = useState<TrainingData | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [today, setToday] = useState<TodayData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // Fetch all data in parallel
      const [trainingResult, weatherResult, todayResult] = await Promise.allSettled([
        loadTraining(),
        loadWeather(),
        loadToday(),
      ]);

      if (cancelled) return;
      if (trainingResult.status === "fulfilled") setTraining(trainingResult.value);
      if (weatherResult.status === "fulfilled") setWeather(weatherResult.value);
      if (todayResult.status === "fulfilled") setToday(todayResult.value);
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div
      className="w-full overflow-hidden transition-all duration-500 ease-in-out"
      style={{
        maxHeight: isOpen ? "300px" : "0px",
        opacity: isOpen ? 1 : 0,
      }}
    >
      <div className="w-full max-w-3xl mx-auto px-4 pb-4">
        {/* Greeting */}
        <h2
          className="font-mono text-lg font-bold mb-3 text-center"
          style={{ color: theme.primary, textShadow: `0 0 12px ${theme.primary}40` }}
        >
          {getGreeting()}
        </h2>

        {/* Three info cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Training */}
          <InfoCard title="Training" loading={loading}>
            {training ? (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold font-mono" style={{ color: theme.primary }}>
                    {Math.round(training.tsb)}
                  </span>
                  <span className="text-xs font-mono" style={{ color: theme.secondary }}>TSB</span>
                  <StatusBadge status={training.status} />
                </div>
                <p className="text-xs font-mono mt-1.5" style={{ color: theme.secondary }}>
                  {training.lastRideName}
                </p>
                <p className="text-[10px] font-mono" style={{ color: theme.secondary, opacity: 0.7 }}>
                  {training.lastRideDistance} · {training.lastRideAgo}
                </p>
              </>
            ) : (
              <p className="text-xs font-mono" style={{ color: theme.secondary, opacity: 0.5 }}>No data</p>
            )}
          </InfoCard>

          {/* Weather */}
          <InfoCard title="Weather" loading={loading}>
            {weather ? (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold font-mono" style={{ color: theme.primary }}>
                    {weather.temp}
                  </span>
                  <span className="text-xs font-mono" style={{ color: theme.secondary }}>
                    {weather.description}
                  </span>
                </div>
                <p className="text-xs font-mono mt-1.5" style={{ color: theme.secondary }}>
                  Feels {weather.feelsLike} · Wind {weather.wind}
                </p>
                <p className="text-[10px] font-mono" style={{ color: theme.secondary, opacity: 0.7 }}>
                  Ride window: {weather.rideWindow}
                </p>
              </>
            ) : (
              <p className="text-xs font-mono" style={{ color: theme.secondary, opacity: 0.5 }}>No data</p>
            )}
          </InfoCard>

          {/* Today */}
          <InfoCard title="Today" loading={loading}>
            {today ? (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold font-mono" style={{ color: theme.primary }}>
                    {today.cardsDue}
                  </span>
                  <span className="text-xs font-mono" style={{ color: theme.secondary }}>
                    German cards due
                  </span>
                </div>
                <p className="text-xs font-mono mt-1.5" style={{ color: theme.secondary, opacity: 0.5 }}>
                  Calendar — coming soon
                </p>
                <p className="text-[10px] font-mono" style={{ color: theme.secondary, opacity: 0.5 }}>
                  Tasks — coming soon
                </p>
              </>
            ) : (
              <p className="text-xs font-mono" style={{ color: theme.secondary, opacity: 0.5 }}>No data</p>
            )}
          </InfoCard>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────

function InfoCard({ title, loading, children }: { title: string; loading: boolean; children: React.ReactNode }) {
  return (
    <div
      className="rounded px-4 py-3"
      style={{
        background: `${theme.primary}08`,
        border: `1px solid ${theme.primary}20`,
      }}
    >
      <p
        className="text-[10px] font-mono uppercase tracking-wider mb-2"
        style={{ color: theme.secondary, opacity: 0.6 }}
      >
        {title}
      </p>
      {loading ? (
        <div className="space-y-2">
          <div className="h-5 w-20 rounded animate-pulse" style={{ background: `${theme.primary}15` }} />
          <div className="h-3 w-32 rounded animate-pulse" style={{ background: `${theme.primary}10` }} />
        </div>
      ) : (
        children
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color = status === "Fresh" ? "#22c55e" : status === "Training" ? "#eab308" : "#ef4444";
  return (
    <span
      className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded"
      style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}
    >
      {status}
    </span>
  );
}

// ─── Data Loaders ───────────────────────────────────────────────

async function loadTraining(): Promise<TrainingData | null> {
  try {
    const [activities, zones] = await Promise.all([
      api.getActivities() as Promise<StravaActivity[]>,
      api.getKV<{ ftp?: number }>("strava-zones"),
    ]);
    if (!activities?.length) return null;

    // Prefer intervals.icu for CTL/ATL/TSB
    let tsb = 0;
    let status = "Fresh";
    try {
      const wellness = await getIntervalsFitness(7);
      const latest = wellness[wellness.length - 1];
      if (latest) {
        tsb = latest.tsb;
        status = tsb > -10 ? "Fresh" : tsb > -30 ? "Training" : "Overreaching";
      }
    } catch {
      // Fallback to local calculation
      const ftp = zones?.ftp;
      if (ftp) {
        const dailyTSS = computeDailyTSS(activities, ftp);
        const fitness = computeFitness(dailyTSS, 1);
        const latest = fitness[fitness.length - 1];
        if (latest) {
          tsb = latest.tsb;
          status = tsb > -10 ? "Fresh" : tsb > -30 ? "Training" : "Overreaching";
        }
      }
    }

    // Last ride
    const sorted = [...activities].sort(
      (a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
    );
    const last = sorted[0];
    const miles = Math.round(last.distance * METERS_TO_MILES);
    const daysAgo = Math.round((Date.now() - new Date(last.start_date).getTime()) / (1000 * 60 * 60 * 24));
    const lastRideAgo = daysAgo === 0 ? "Today" : daysAgo === 1 ? "Yesterday" : `${daysAgo} days ago`;

    return { tsb, status, lastRideName: last.name, lastRideDistance: `${miles} mi`, lastRideAgo };
  } catch {
    return null;
  }
}

async function loadWeather(): Promise<WeatherData | null> {
  try {
    // Derive location from most common ride start
    const activities = (await api.getActivities()) as StravaActivity[];
    const locs = activities
      .filter((a) => a.start_latlng)
      .map((a) => a.start_latlng!);
    if (locs.length === 0) return null;

    // Cluster to find most common start area
    const buckets = new Map<string, { lat: number; lng: number; count: number }>();
    for (const [lat, lng] of locs) {
      const key = `${(Math.round(lat / 0.07) * 0.07).toFixed(2)},${(Math.round(lng / 0.07) * 0.07).toFixed(2)}`;
      const b = buckets.get(key);
      if (b) { b.lat += lat; b.lng += lng; b.count++; }
      else buckets.set(key, { lat, lng, count: 1 });
    }
    let best = { lat: 0, lng: 0, count: 0 };
    for (const b of buckets.values()) { if (b.count > best.count) best = b; }
    if (best.count === 0) return null;

    const lat = +(best.lat / best.count).toFixed(4);
    const lng = +(best.lng / best.count).toFixed(4);

    const forecast = await api.getForecast(lat, lng, 1);
    if (!forecast?.hours?.length) return null;

    // Find current hour
    const nowHr = new Date().getHours();
    const currentHour = forecast.hours.find((h: HourData) => {
      const hr = parseInt(h.time.slice(11, 13), 10);
      return hr === nowHr;
    }) || forecast.hours[0];

    return {
      temp: `${celsiusToF(currentHour.temperature)}°F`,
      feelsLike: `${celsiusToF(currentHour.feelsLike)}°F`,
      description: weatherDescription(currentHour.weatherCode),
      wind: `${kphToMph(currentHour.windSpeed)} mph`,
      rideWindow: computeRideWindow(forecast.hours),
    };
  } catch {
    return null;
  }
}

async function loadToday(): Promise<TodayData | null> {
  try {
    const vocab = (await api.getVocab()) as { nextReview: number }[];
    const now = Date.now();
    const due = vocab.filter((w) => w.nextReview <= now).length;
    return { cardsDue: due };
  } catch {
    return null;
  }
}
