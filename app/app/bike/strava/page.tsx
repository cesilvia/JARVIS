"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Navigation from "../../components/Navigation";
import CircuitBackground from "../../hub/CircuitBackground";
import CyclingIcon from "../CyclingIcon";

const hubTheme = {
  primary: "#00D9FF",
  secondary: "#67C7EB",
  background: "#000000",
};

const STRAVA_ACTIVITIES_KEY = "jarvis-strava-activities";
const STRAVA_TOKENS_KEY = "jarvis-strava-tokens";
const BIKES_STORAGE_KEY = "jarvis-bikes";
const METERS_TO_MILES = 1 / 1609.34;
const METERS_TO_FEET = 3.28084;
const MPS_TO_MPH = 2.23694;

interface StravaActivity {
  id: number;
  name: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  type: string;
  sport_type: string;
  trainer: boolean;
  gear_id: string | null;
  start_date: string;
  total_elevation_gain: number;
  average_speed: number;
  max_speed: number;
  average_heartrate?: number;
  kudos_count: number;
}

interface Bike {
  id: string;
  name: string;
  type: string;
  stravaGearId?: string;
  totalMiles?: number;
  indoorMiles?: number;
  roadMiles?: number;
  [key: string]: unknown;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - ((day + 6) % 7)); // Monday start
  d.setHours(0, 0, 0, 0);
  return d;
}

function getMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getYearStart(): Date {
  return new Date(new Date().getFullYear(), 0, 1);
}

// --- SVG Chart Component ---

function MileageChart({
  activities,
  mode,
}: {
  activities: StravaActivity[];
  mode: "weeks" | "months";
}) {
  const data = useMemo(() => {
    const now = new Date();
    const buckets: { label: string; miles: number }[] = [];

    if (mode === "weeks") {
      for (let i = 11; i >= 0; i--) {
        const weekStart = getWeekStart(new Date(now.getTime() - i * 7 * 86400000));
        const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);
        const miles = activities
          .filter((a) => {
            const d = new Date(a.start_date);
            return d >= weekStart && d < weekEnd;
          })
          .reduce((sum, a) => sum + a.distance * METERS_TO_MILES, 0);
        const label = weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        buckets.push({ label, miles: Math.round(miles * 10) / 10 });
      }
    } else {
      for (let i = 11; i >= 0; i--) {
        const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        const miles = activities
          .filter((a) => {
            const d = new Date(a.start_date);
            return d >= month && d < nextMonth;
          })
          .reduce((sum, a) => sum + a.distance * METERS_TO_MILES, 0);
        const label = month.toLocaleDateString("en-US", { month: "short" });
        buckets.push({ label, miles: Math.round(miles * 10) / 10 });
      }
    }

    return buckets;
  }, [activities, mode]);

  const maxMiles = Math.max(...data.map((d) => d.miles), 1);
  const W = 700;
  const H = 200;
  const padL = 50;
  const padR = 20;
  const padT = 20;
  const padB = 40;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const points = data.map((d, i) => ({
    x: padL + (i / (data.length - 1)) * chartW,
    y: padT + chartH - (d.miles / maxMiles) * chartH,
    ...d,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((frac) => {
    const y = padT + chartH - frac * chartH;
    const val = Math.round(frac * maxMiles);
    return { y, val };
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      {gridLines.map((g) => (
        <g key={g.val}>
          <line x1={padL} y1={g.y} x2={W - padR} y2={g.y} stroke="#00D9FF" strokeOpacity="0.1" strokeWidth="0.5" />
          <text x={padL - 8} y={g.y + 4} textAnchor="end" fill="#67C7EB" fontSize="9" opacity="0.6">
            {g.val}
          </text>
        </g>
      ))}
      <path d={linePath} fill="none" stroke="#00D9FF" strokeWidth="2" strokeLinejoin="round" />
      <path
        d={`${linePath} L${points[points.length - 1].x},${padT + chartH} L${points[0].x},${padT + chartH} Z`}
        fill="url(#chartGradient)"
      />
      <defs>
        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00D9FF" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#00D9FF" stopOpacity="0" />
        </linearGradient>
      </defs>
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3" fill="#00D9FF" />
          <text
            x={p.x}
            y={H - 8}
            textAnchor="middle"
            fill="#67C7EB"
            fontSize="8"
            opacity="0.7"
          >
            {data.length <= 12 ? p.label : i % 2 === 0 ? p.label : ""}
          </text>
        </g>
      ))}
    </svg>
  );
}

// --- Main Page ---

export default function StravaPage() {
  const [activities, setActivities] = useState<StravaActivity[]>([]);
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [connected, setConnected] = useState(false);
  const [chartMode, setChartMode] = useState<"weeks" | "months">("weeks");

  useEffect(() => {
    const stored = localStorage.getItem(STRAVA_ACTIVITIES_KEY);
    if (stored) {
      try {
        setActivities(JSON.parse(stored));
      } catch { /* ignore */ }
    }
    const tokens = localStorage.getItem(STRAVA_TOKENS_KEY);
    setConnected(!!tokens);

    const bikeStored = localStorage.getItem(BIKES_STORAGE_KEY);
    if (bikeStored) {
      try {
        setBikes(JSON.parse(bikeStored));
      } catch { /* ignore */ }
    }
  }, []);

  const now = new Date();
  const yearStart = getYearStart();

  const ytdActivities = useMemo(
    () => activities.filter((a) => new Date(a.start_date) >= yearStart),
    [activities, yearStart]
  );

  const ytdDistance = ytdActivities.reduce((s, a) => s + a.distance * METERS_TO_MILES, 0);
  const ytdTime = ytdActivities.reduce((s, a) => s + a.moving_time, 0);
  const ytdElevation = ytdActivities.reduce((s, a) => s + a.total_elevation_gain * METERS_TO_FEET, 0);
  const ytdRides = ytdActivities.length;

  // Weekly comparison
  const thisWeekStart = getWeekStart(now);
  const lastWeekStart = new Date(thisWeekStart.getTime() - 7 * 86400000);
  const thisWeekMiles = activities
    .filter((a) => new Date(a.start_date) >= thisWeekStart)
    .reduce((s, a) => s + a.distance * METERS_TO_MILES, 0);
  const lastWeekMiles = activities
    .filter((a) => {
      const d = new Date(a.start_date);
      return d >= lastWeekStart && d < thisWeekStart;
    })
    .reduce((s, a) => s + a.distance * METERS_TO_MILES, 0);

  // Monthly comparison
  const thisMonthStart = getMonthStart(now);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const thisMonthMiles = activities
    .filter((a) => new Date(a.start_date) >= thisMonthStart)
    .reduce((s, a) => s + a.distance * METERS_TO_MILES, 0);
  const lastMonthMiles = activities
    .filter((a) => {
      const d = new Date(a.start_date);
      return d >= lastMonthStart && d < thisMonthStart;
    })
    .reduce((s, a) => s + a.distance * METERS_TO_MILES, 0);

  // Per-bike breakdown
  const linkedBikes = bikes.filter((b) => b.stravaGearId);

  // Recent rides (last 10)
  const recentRides = useMemo(
    () =>
      [...activities]
        .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())
        .slice(0, 10),
    [activities]
  );

  const noData = activities.length === 0;

  return (
    <div
      className="min-h-screen hud-scifi-bg relative"
      style={{ backgroundColor: hubTheme.background, color: hubTheme.primary }}
    >
      <CircuitBackground />
      <main className="container mx-auto px-4 py-8 max-w-4xl relative z-10">
        {/* Header */}
        <div className="grid grid-cols-3 items-center gap-4 mb-8">
          <div className="flex justify-start w-20 h-20 min-w-20 min-h-20">
            <Navigation />
          </div>
          <h2 className="text-2xl font-semibold hud-text text-center">Strava</h2>
          <div className="flex justify-end">
            <Link
              href="/bike"
              title="Cycling"
              aria-label="Cycling"
              className="inline-flex items-center justify-center transition-transform hover:scale-110"
              style={{ width: 80, height: 80, minWidth: 80, minHeight: 80 }}
            >
              <CyclingIcon
                className="shrink-0"
                style={{ width: 80, height: 80, minWidth: 80, minHeight: 80 }}
                stroke={hubTheme.primary}
              />
            </Link>
          </div>
        </div>

        {/* Connection status link */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: connected ? "#00FF88" : "#FF4444" }}
            />
            <span className="text-xs" style={{ color: hubTheme.secondary }}>
              {connected ? "Connected to Strava" : "Not connected"}
            </span>
          </div>
          <Link
            href="/settings#strava"
            className="text-xs hover:underline"
            style={{ color: hubTheme.secondary }}
          >
            Manage connection in Settings
          </Link>
        </div>

        {noData ? (
          <div className="hud-card rounded-lg p-12 border border-[#00D9FF]/20 text-center">
            <p className="text-lg mb-2" style={{ color: hubTheme.primary }}>
              No ride data yet
            </p>
            <p className="text-sm" style={{ color: hubTheme.secondary }}>
              {connected
                ? "Go to Settings to sync your Strava data."
                : "Connect Strava in Settings to get started."}
            </p>
            <Link
              href="/settings#strava"
              className="inline-block mt-4 px-4 py-2 rounded-lg border border-[#00D9FF]/50 bg-[rgba(0,217,255,0.15)] text-[#00D9FF] hover:bg-[rgba(0,217,255,0.25)] text-sm"
            >
              Open Settings
            </Link>
          </div>
        ) : (
          <>
            {/* YTD Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <StatCard label="Distance" value={`${Math.round(ytdDistance).toLocaleString()} mi`} />
              <StatCard label="Ride Time" value={formatTime(ytdTime)} />
              <StatCard label="Elevation" value={`${Math.round(ytdElevation).toLocaleString()} ft`} />
              <StatCard label="Rides" value={String(ytdRides)} />
            </div>

            {/* Weekly / Monthly */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <ComparisonCard
                title="This Week"
                current={thisWeekMiles}
                previous={lastWeekMiles}
                previousLabel="Last week"
              />
              <ComparisonCard
                title="This Month"
                current={thisMonthMiles}
                previous={lastMonthMiles}
                previousLabel="Last month"
              />
            </div>

            {/* Per-Bike Breakdown */}
            {linkedBikes.length > 0 && (
              <div className="hud-card rounded-lg p-6 mb-6 border border-[#00D9FF]/20">
                <h3 className="text-lg font-semibold mb-4" style={{ color: hubTheme.primary }}>
                  Per-Bike Mileage
                </h3>
                <div className="space-y-3">
                  {linkedBikes.map((bike) => (
                    <div
                      key={bike.id}
                      className="flex items-center justify-between px-4 py-3 rounded-lg border border-[#00D9FF]/10 bg-[rgba(0,217,255,0.03)]"
                    >
                      <div>
                        <span className="font-medium" style={{ color: hubTheme.primary }}>
                          {bike.name}
                        </span>
                        <span className="text-sm ml-2" style={{ color: hubTheme.secondary }}>
                          {bike.type}
                        </span>
                      </div>
                      <div className="text-right text-xs" style={{ color: hubTheme.secondary }}>
                        {bike.totalMiles != null && (
                          <span>{bike.totalMiles.toFixed(1)} mi total</span>
                        )}
                        {bike.indoorMiles != null && bike.indoorMiles > 0 && (
                          <span className="ml-3">{bike.indoorMiles.toFixed(1)} indoor</span>
                        )}
                        {bike.roadMiles != null && bike.roadMiles > 0 && (
                          <span className="ml-3">{bike.roadMiles.toFixed(1)} road</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mileage Chart */}
            <div className="hud-card rounded-lg p-6 mb-6 border border-[#00D9FF]/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold" style={{ color: hubTheme.primary }}>
                  Mileage Over Time
                </h3>
                <div className="flex gap-1">
                  <button
                    onClick={() => setChartMode("weeks")}
                    className={`px-3 py-1 rounded text-xs transition-colors ${
                      chartMode === "weeks"
                        ? "bg-[rgba(0,217,255,0.25)] text-[#00D9FF] border border-[#00D9FF]/50"
                        : "text-[#67C7EB] hover:text-[#00D9FF]"
                    }`}
                  >
                    12 Weeks
                  </button>
                  <button
                    onClick={() => setChartMode("months")}
                    className={`px-3 py-1 rounded text-xs transition-colors ${
                      chartMode === "months"
                        ? "bg-[rgba(0,217,255,0.25)] text-[#00D9FF] border border-[#00D9FF]/50"
                        : "text-[#67C7EB] hover:text-[#00D9FF]"
                    }`}
                  >
                    12 Months
                  </button>
                </div>
              </div>
              <MileageChart activities={activities} mode={chartMode} />
            </div>

            {/* Recent Rides */}
            <div className="hud-card rounded-lg p-6 border border-[#00D9FF]/20">
              <h3 className="text-lg font-semibold mb-4" style={{ color: hubTheme.primary }}>
                Recent Rides
              </h3>
              <div className="space-y-2">
                {recentRides.map((ride) => (
                  <div
                    key={ride.id}
                    className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 rounded-lg border border-[#00D9FF]/10 bg-[rgba(0,217,255,0.03)]"
                  >
                    <div className="flex-1 min-w-[180px]">
                      <div className="font-medium text-sm" style={{ color: hubTheme.primary }}>
                        {ride.name}
                      </div>
                      <div className="text-xs" style={{ color: hubTheme.secondary }}>
                        {formatDate(ride.start_date)}
                        {ride.trainer && (
                          <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-[rgba(0,217,255,0.15)] border border-[#00D9FF]/30">
                            Indoor
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-4 text-xs" style={{ color: hubTheme.secondary }}>
                      <span>{(ride.distance * METERS_TO_MILES).toFixed(1)} mi</span>
                      <span>{formatTime(ride.moving_time)}</span>
                      <span>{(ride.average_speed * MPS_TO_MPH).toFixed(1)} mph</span>
                      <span>{Math.round(ride.total_elevation_gain * METERS_TO_FEET).toLocaleString()} ft</span>
                      {ride.average_heartrate && <span>{Math.round(ride.average_heartrate)} bpm</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="hud-card rounded-lg p-4 border border-[#00D9FF]/20 text-center">
      <div className="text-2xl font-bold" style={{ color: "#00D9FF" }}>
        {value}
      </div>
      <div className="text-xs mt-1" style={{ color: "#67C7EB" }}>
        {label}
      </div>
    </div>
  );
}

function ComparisonCard({
  title,
  current,
  previous,
  previousLabel,
}: {
  title: string;
  current: number;
  previous: number;
  previousLabel: string;
}) {
  const max = Math.max(current, previous, 1);
  const currentPct = (current / max) * 100;
  const previousPct = (previous / max) * 100;
  const diff = current - previous;
  const diffSign = diff > 0 ? "+" : "";

  return (
    <div className="hud-card rounded-lg p-4 border border-[#00D9FF]/20">
      <div className="flex items-baseline justify-between mb-3">
        <h4 className="text-sm font-semibold" style={{ color: "#00D9FF" }}>
          {title}
        </h4>
        {previous > 0 && (
          <span
            className="text-xs"
            style={{ color: diff >= 0 ? "#00FF88" : "#FF6644" }}
          >
            {diffSign}{diff.toFixed(1)} mi
          </span>
        )}
      </div>
      <div className="space-y-2">
        <div>
          <div className="flex justify-between text-xs mb-1" style={{ color: "#00D9FF" }}>
            <span>Current</span>
            <span>{current.toFixed(1)} mi</span>
          </div>
          <div className="h-2 rounded-full bg-[rgba(0,217,255,0.1)]">
            <div
              className="h-2 rounded-full transition-all"
              style={{ width: `${currentPct}%`, backgroundColor: "#00D9FF" }}
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1" style={{ color: "#67C7EB" }}>
            <span>{previousLabel}</span>
            <span>{previous.toFixed(1)} mi</span>
          </div>
          <div className="h-2 rounded-full bg-[rgba(0,217,255,0.1)]">
            <div
              className="h-2 rounded-full transition-all"
              style={{ width: `${previousPct}%`, backgroundColor: "#67C7EB" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
