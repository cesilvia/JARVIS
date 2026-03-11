"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import Navigation from "../../components/Navigation";
import CircuitBackground from "../../hub/CircuitBackground";
import CyclingIcon from "../CyclingIcon";
import {
  StravaActivity, StreamData, Bike, ZoneConfig, StravaGoal,
  STRAVA_ACTIVITIES_KEY, STRAVA_TOKENS_KEY, STRAVA_LAST_SYNC_KEY,
  STRAVA_ZONES_KEY, STRAVA_POWER_CURVE_KEY, BIKES_STORAGE_KEY,
  METERS_TO_MILES, METERS_TO_FEET, MPS_TO_MPH, AUTO_SYNC_INTERVAL_MS,
  POWER_ZONE_COLORS, HR_ZONE_COLORS,
  formatTime, formatDate, getWeekStart, getMonthStart, getYearStart,
  loadZones, loadGoals,
} from "./types";

const hubTheme = { primary: "#00D9FF", secondary: "#67C7EB", background: "#000000" };
const STRAVA_GEAR_KEY = "jarvis-strava-gear";
type Tab = "overview" | "rides" | "power" | "fitness";

// ─── Sync helper ────────────────────────────────────────────────

async function getAccessToken(): Promise<string | null> {
  const stored = localStorage.getItem(STRAVA_TOKENS_KEY);
  if (!stored) return null;
  const tokens = JSON.parse(stored);
  let accessToken = tokens.accessToken;
  const expiresIn = tokens.expiresAt - Math.floor(Date.now() / 1000);
  if (expiresIn < 3600) {
    const res = await fetch("/api/strava/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: tokens.refreshToken }),
    });
    if (res.ok) {
      const data = await res.json();
      accessToken = data.accessToken;
      localStorage.setItem(STRAVA_TOKENS_KEY, JSON.stringify({
        accessToken: data.accessToken, refreshToken: data.refreshToken, expiresAt: data.expiresAt,
      }));
    }
  }
  return accessToken;
}

async function syncActivities(): Promise<StravaActivity[]> {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error("Not connected");
  const [actRes, gearRes] = await Promise.all([
    fetch("/api/strava/activities", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accessToken }) }),
    fetch("/api/strava/gear", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accessToken }) }),
  ]);
  if (!actRes.ok) throw new Error((await actRes.json().catch(() => ({}))).error || `${actRes.status}`);
  const { activities } = await actRes.json();
  localStorage.setItem(STRAVA_ACTIVITIES_KEY, JSON.stringify(activities));
  localStorage.setItem(STRAVA_LAST_SYNC_KEY, new Date().toISOString());
  if (gearRes.ok) {
    const { gear } = await gearRes.json();
    const gearList = (gear || []).map((g: { id: string; name: string }) => ({ id: g.id, name: g.name }));
    localStorage.setItem(STRAVA_GEAR_KEY, JSON.stringify(gearList));
    const byGear: Record<string, { total: number; indoor: number; road: number }> = {};
    for (const a of activities) {
      const gid = a.gear_id || "unassigned";
      if (!byGear[gid]) byGear[gid] = { total: 0, indoor: 0, road: 0 };
      const mi = (a.distance || 0) * METERS_TO_MILES;
      byGear[gid].total += mi;
      if (a.trainer) byGear[gid].indoor += mi;
      else byGear[gid].road += mi;
    }
    const now = new Date().toISOString();
    const bikesRaw = localStorage.getItem(BIKES_STORAGE_KEY);
    if (bikesRaw) {
      let bikes = JSON.parse(bikesRaw);
      bikes = bikes.map((b: { stravaGearId?: string; [k: string]: unknown }) => {
        const gid = b.stravaGearId;
        if (!gid || !byGear[gid]) return b;
        const { total, indoor, road } = byGear[gid];
        return { ...b, totalMiles: Math.round(total * 10) / 10, indoorMiles: Math.round(indoor * 10) / 10, roadMiles: Math.round(road * 10) / 10, lastSyncAt: now };
      });
      localStorage.setItem(BIKES_STORAGE_KEY, JSON.stringify(bikes));
    }
  }
  return activities;
}

// ─── Stream fetching ────────────────────────────────────────────

function getStreamCacheKey(id: number) { return `jarvis-strava-stream-${id}`; }

async function fetchStream(activityId: number): Promise<StreamData | null> {
  const cached = localStorage.getItem(getStreamCacheKey(activityId));
  if (cached) { try { return JSON.parse(cached); } catch { /* fall through */ } }
  const accessToken = await getAccessToken();
  if (!accessToken) return null;
  const res = await fetch("/api/strava/streams", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessToken, activityId }),
  });
  if (!res.ok) return null;
  const { streams } = await res.json();
  localStorage.setItem(getStreamCacheKey(activityId), JSON.stringify(streams));
  return streams as StreamData;
}

// ─── Power curve computation ────────────────────────────────────

const CURVE_DURATIONS = [5, 10, 30, 60, 120, 300, 600, 1200, 3600];
const CURVE_LABELS = ["5s", "10s", "30s", "1m", "2m", "5m", "10m", "20m", "60m"];

function computeBestEfforts(watts: number[]): Record<number, number> {
  const results: Record<number, number> = {};
  for (const dur of CURVE_DURATIONS) {
    if (watts.length < dur) continue;
    let sum = 0;
    for (let i = 0; i < dur; i++) sum += watts[i];
    let best = sum / dur;
    for (let i = dur; i < watts.length; i++) {
      sum += watts[i] - watts[i - dur];
      const avg = sum / dur;
      if (avg > best) best = avg;
    }
    results[dur] = Math.round(best);
  }
  return results;
}

// ─── Zone time computation ──────────────────────────────────────

function computeZoneTime(data: number[], zones: { min: number; max: number }[]): number[] {
  const times = new Array(zones.length).fill(0);
  for (const val of data) {
    for (let z = zones.length - 1; z >= 0; z--) {
      if (val >= zones[z].min) { times[z]++; break; }
    }
  }
  return times;
}

// ─── TSS / CTL / ATL / TSB ──────────────────────────────────────

function computeDailyTSS(activities: StravaActivity[], ftp: number): Map<string, number> {
  const daily = new Map<string, number>();
  for (const a of activities) {
    const np = a.weighted_average_watts;
    if (!np || !ftp) continue;
    const iff = np / ftp;
    const tss = (a.moving_time * np * iff) / (ftp * 3600) * 100;
    const day = a.start_date.slice(0, 10);
    daily.set(day, (daily.get(day) || 0) + tss);
  }
  return daily;
}

function computeFitness(dailyTSS: Map<string, number>, days: number) {
  const sorted = Array.from(dailyTSS.keys()).sort();
  if (sorted.length === 0) return [];
  const start = new Date(sorted[0]);
  const end = new Date();
  const result: { date: string; ctl: number; atl: number; tsb: number; tss: number }[] = [];
  let ctl = 0, atl = 0;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    const tss = dailyTSS.get(key) || 0;
    ctl = ctl + (tss - ctl) / 42;
    atl = atl + (tss - atl) / 7;
    result.push({ date: key, ctl, atl, tsb: ctl - atl, tss });
  }
  return result.slice(-days);
}

// ─── SVG Charts ─────────────────────────────────────────────────

function LineChart({ data, yKey, color, label, unit, height = 120 }: {
  data: number[]; yKey?: string; color: string; label: string; unit: string; height?: number;
}) {
  if (!data || data.length === 0) return null;
  const W = 700, padL = 45, padR = 10, padT = 10, padB = 20;
  const cW = W - padL - padR, cH = height - padT - padB;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const step = Math.max(1, Math.floor(data.length / 500));
  const sampled = data.filter((_, i) => i % step === 0);
  const pts = sampled.map((v, i) => ({
    x: padL + (i / (sampled.length - 1)) * cW,
    y: padT + cH - ((v - min) / range) * cH,
  }));
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const gradId = `grad-${label.replace(/\s/g, "")}`;
  return (
    <div className="mb-3">
      <div className="text-xs mb-1" style={{ color }}>{label}</div>
      <svg viewBox={`0 0 ${W} ${height}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((f) => {
          const y = padT + cH - f * cH;
          const val = Math.round(min + f * range);
          return (
            <g key={f}>
              <line x1={padL} y1={y} x2={W - padR} y2={y} stroke={color} strokeOpacity="0.1" strokeWidth="0.5" />
              <text x={padL - 5} y={y + 3} textAnchor="end" fill={color} fontSize="8" opacity="0.5">{val}</text>
            </g>
          );
        })}
        <path d={`${path} L${pts[pts.length - 1].x.toFixed(1)},${padT + cH} L${pts[0].x.toFixed(1)},${padT + cH} Z`} fill={`url(#${gradId})`} />
        <path d={path} fill="none" stroke={color} strokeWidth="1.5" />
        <text x={W - padR} y={padT + 10} textAnchor="end" fill={color} fontSize="8" opacity="0.6">
          avg {Math.round(data.reduce((s, v) => s + v, 0) / data.length)} {unit}
        </text>
      </svg>
    </div>
  );
}

function MileageChart({ activities, mode }: { activities: StravaActivity[]; mode: "weeks" | "months" }) {
  const data = useMemo(() => {
    const now = new Date();
    const buckets: { label: string; miles: number }[] = [];
    if (mode === "weeks") {
      for (let i = 11; i >= 0; i--) {
        const ws = getWeekStart(new Date(now.getTime() - i * 7 * 86400000));
        const we = new Date(ws.getTime() + 7 * 86400000);
        const miles = activities.filter((a) => { const d = new Date(a.start_date); return d >= ws && d < we; }).reduce((s, a) => s + a.distance * METERS_TO_MILES, 0);
        buckets.push({ label: ws.toLocaleDateString("en-US", { month: "short", day: "numeric" }), miles: Math.round(miles * 10) / 10 });
      }
    } else {
      for (let i = 11; i >= 0; i--) {
        const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const nm = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        const miles = activities.filter((a) => { const d = new Date(a.start_date); return d >= m && d < nm; }).reduce((s, a) => s + a.distance * METERS_TO_MILES, 0);
        buckets.push({ label: m.toLocaleDateString("en-US", { month: "short" }), miles: Math.round(miles * 10) / 10 });
      }
    }
    return buckets;
  }, [activities, mode]);

  const maxMiles = Math.max(...data.map((d) => d.miles), 1);
  const W = 700, H = 200, padL = 50, padR = 20, padT = 20, padB = 40;
  const chartW = W - padL - padR, chartH = H - padT - padB;
  const points = data.map((d, i) => ({ x: padL + (i / (data.length - 1)) * chartW, y: padT + chartH - (d.miles / maxMiles) * chartH, ...d }));
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((f) => ({ y: padT + chartH - f * chartH, val: Math.round(f * maxMiles) }));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      {gridLines.map((g) => (
        <g key={g.val}>
          <line x1={padL} y1={g.y} x2={W - padR} y2={g.y} stroke="#00D9FF" strokeOpacity="0.1" strokeWidth="0.5" />
          <text x={padL - 8} y={g.y + 4} textAnchor="end" fill="#67C7EB" fontSize="9" opacity="0.6">{g.val}</text>
        </g>
      ))}
      <path d={linePath} fill="none" stroke="#00D9FF" strokeWidth="2" strokeLinejoin="round" />
      <path d={`${linePath} L${points[points.length - 1].x},${padT + chartH} L${points[0].x},${padT + chartH} Z`} fill="url(#mileGrad)" />
      <defs><linearGradient id="mileGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#00D9FF" stopOpacity="0.25" /><stop offset="100%" stopColor="#00D9FF" stopOpacity="0" /></linearGradient></defs>
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3" fill="#00D9FF" />
          <text x={p.x} y={H - 8} textAnchor="middle" fill="#67C7EB" fontSize="8" opacity="0.7">{p.label}</text>
        </g>
      ))}
    </svg>
  );
}

function ZoneBar({ zones, times, colors }: { zones: { name: string }[]; times: number[]; colors: string[] }) {
  const total = times.reduce((s, t) => s + t, 0) || 1;
  return (
    <div className="space-y-1.5">
      {zones.map((z, i) => {
        const pct = (times[i] / total) * 100;
        return (
          <div key={z.name} className="flex items-center gap-2 text-xs">
            <span className="w-28 truncate" style={{ color: colors[i] }}>{z.name}</span>
            <div className="flex-1 h-3 rounded-full bg-[rgba(0,217,255,0.05)]">
              <div className="h-3 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: colors[i], opacity: 0.7 }} />
            </div>
            <span className="w-14 text-right" style={{ color: hubTheme.secondary }}>{formatTime(times[i])}</span>
            <span className="w-10 text-right" style={{ color: hubTheme.secondary }}>{pct.toFixed(0)}%</span>
          </div>
        );
      })}
    </div>
  );
}

function FitnessChart({ data }: { data: { date: string; ctl: number; atl: number; tsb: number }[] }) {
  if (data.length < 2) return <p className="text-xs" style={{ color: hubTheme.secondary }}>Not enough data for fitness chart.</p>;
  const W = 700, H = 220, padL = 45, padR = 10, padT = 15, padB = 30;
  const cW = W - padL - padR, cH = H - padT - padB;
  const allVals = data.flatMap((d) => [d.ctl, d.atl, d.tsb]);
  const max = Math.max(...allVals, 1);
  const min = Math.min(...allVals, -10);
  const range = max - min || 1;
  const toY = (v: number) => padT + cH - ((v - min) / range) * cH;
  const toX = (i: number) => padL + (i / (data.length - 1)) * cW;
  const mkPath = (key: "ctl" | "atl" | "tsb") => data.map((d, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(d[key]).toFixed(1)}`).join(" ");

  const zeroY = toY(0);
  const monthLabels: { x: number; label: string }[] = [];
  let lastMonth = "";
  data.forEach((d, i) => {
    const m = d.date.slice(0, 7);
    if (m !== lastMonth) { lastMonth = m; monthLabels.push({ x: toX(i), label: new Date(d.date).toLocaleDateString("en-US", { month: "short" }) }); }
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      <line x1={padL} y1={zeroY} x2={W - padR} y2={zeroY} stroke="#67C7EB" strokeOpacity="0.3" strokeWidth="0.5" strokeDasharray="4,4" />
      {[0.25, 0.5, 0.75, 1].map((f) => {
        const y = padT + cH - f * cH;
        return <line key={f} x1={padL} y1={y} x2={W - padR} y2={y} stroke="#00D9FF" strokeOpacity="0.05" strokeWidth="0.5" />;
      })}
      <path d={mkPath("ctl")} fill="none" stroke="#00D9FF" strokeWidth="2" />
      <path d={mkPath("atl")} fill="none" stroke="#FF00FF" strokeWidth="1.5" strokeOpacity="0.8" />
      <path d={mkPath("tsb")} fill="none" stroke="#00FF88" strokeWidth="1.5" strokeOpacity="0.8" />
      {monthLabels.map((m) => <text key={m.x} x={m.x} y={H - 5} fill="#67C7EB" fontSize="8" opacity="0.6">{m.label}</text>)}
      <text x={padL - 5} y={padT + 8} textAnchor="end" fill="#67C7EB" fontSize="7" opacity="0.5">{Math.round(max)}</text>
      <text x={padL - 5} y={padT + cH + 3} textAnchor="end" fill="#67C7EB" fontSize="7" opacity="0.5">{Math.round(min)}</text>
      <g>
        <rect x={W - padR - 90} y={padT} width={85} height={40} rx={3} fill="rgba(0,0,0,0.6)" />
        <line x1={W - padR - 85} y1={padT + 10} x2={W - padR - 70} y2={padT + 10} stroke="#00D9FF" strokeWidth="2" />
        <text x={W - padR - 66} y={padT + 13} fill="#00D9FF" fontSize="7">Fitness (CTL)</text>
        <line x1={W - padR - 85} y1={padT + 22} x2={W - padR - 70} y2={padT + 22} stroke="#FF00FF" strokeWidth="1.5" />
        <text x={W - padR - 66} y={padT + 25} fill="#FF00FF" fontSize="7">Fatigue (ATL)</text>
        <line x1={W - padR - 85} y1={padT + 34} x2={W - padR - 70} y2={padT + 34} stroke="#00FF88" strokeWidth="1.5" />
        <text x={W - padR - 66} y={padT + 37} fill="#00FF88" fontSize="7">Form (TSB)</text>
      </g>
    </svg>
  );
}

function PowerCurveChart({ curve }: { curve: Record<number, number> }) {
  const durations = CURVE_DURATIONS.filter((d) => curve[d] != null);
  if (durations.length < 2) return null;
  const W = 700, H = 200, padL = 50, padR = 20, padT = 20, padB = 40;
  const cW = W - padL - padR, cH = H - padT - padB;
  const maxW = Math.max(...durations.map((d) => curve[d]), 1);
  const logMin = Math.log10(durations[0]);
  const logMax = Math.log10(durations[durations.length - 1]);
  const logRange = logMax - logMin || 1;
  const pts = durations.map((d) => ({
    x: padL + ((Math.log10(d) - logMin) / logRange) * cW,
    y: padT + cH - (curve[d] / maxW) * cH,
    watts: curve[d],
    dur: d,
  }));
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      {[0, 0.25, 0.5, 0.75, 1].map((f) => {
        const y = padT + cH - f * cH;
        return (
          <g key={f}>
            <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#00D9FF" strokeOpacity="0.1" strokeWidth="0.5" />
            <text x={padL - 8} y={y + 4} textAnchor="end" fill="#67C7EB" fontSize="9" opacity="0.6">{Math.round(f * maxW)}w</text>
          </g>
        );
      })}
      <path d={`${path} L${pts[pts.length - 1].x.toFixed(1)},${padT + cH} L${pts[0].x.toFixed(1)},${padT + cH} Z`} fill="url(#pcGrad)" />
      <path d={path} fill="none" stroke="#FFD700" strokeWidth="2.5" strokeLinejoin="round" />
      <defs><linearGradient id="pcGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#FFD700" stopOpacity="0.2" /><stop offset="100%" stopColor="#FFD700" stopOpacity="0" /></linearGradient></defs>
      {pts.map((p, i) => (
        <g key={p.dur}>
          <circle cx={p.x} cy={p.y} r="4" fill="#FFD700" />
          <text x={p.x} y={p.y - 8} textAnchor="middle" fill="#FFD700" fontSize="9" fontWeight="bold">{p.watts}w</text>
          <text x={p.x} y={H - 8} textAnchor="middle" fill="#67C7EB" fontSize="8" opacity="0.7">{CURVE_LABELS[CURVE_DURATIONS.indexOf(p.dur)]}</text>
        </g>
      ))}
    </svg>
  );
}

// ─── Small components ───────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="hud-card rounded-lg p-3 border border-[#00D9FF]/20 text-center">
      <div className="text-xl font-bold" style={{ color: "#00D9FF" }}>{value}</div>
      <div className="text-[10px] mt-0.5" style={{ color: "#67C7EB" }}>{label}</div>
      {sub && <div className="text-[9px] mt-0.5" style={{ color: "#67C7EB", opacity: 0.6 }}>{sub}</div>}
    </div>
  );
}


function GoalCard({ goal, actual, activities }: { goal: StravaGoal; actual: number; activities: StravaActivity[] }) {
  const [expanded, setExpanded] = useState(false);
  const now = new Date();

  // Calculate expected progress based on how far through the period we are
  let expectedPct: number;
  if (goal.period === "weekly") {
    const weekStart = getWeekStart(now);
    const dayOfWeek = (now.getTime() - weekStart.getTime()) / (7 * 86400000);
    expectedPct = Math.min(dayOfWeek, 1);
  } else {
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const yearEnd = new Date(now.getFullYear() + 1, 0, 1);
    expectedPct = (now.getTime() - yearStart.getTime()) / (yearEnd.getTime() - yearStart.getTime());
  }

  const expected = goal.target * expectedPct;
  const pct = goal.target > 0 ? (actual / goal.target) * 100 : 0;
  const diff = actual - expected;
  const status: "ahead" | "on-track" | "behind" = diff > expected * 0.02 ? "ahead" : diff < -expected * 0.02 ? "behind" : "on-track";
  const statusColor = status === "ahead" ? "#00FF88" : status === "behind" ? "#FF6644" : "#FFD700";
  const statusLabel = status === "ahead" ? "Ahead" : status === "behind" ? "Behind" : "On Track";

  // Build cumulative chart data: expected line vs actual line
  const chartData = useMemo(() => {
    if (!expanded) return { points: [] as { day: number; actual: number; expected: number }[], maxVal: 0, totalDays: 0 };

    if (goal.period === "weekly") {
      const weekStart = getWeekStart(now);
      const totalDays = 7;
      const dailyTarget = goal.target / 7;
      // Accumulate daily
      const dailyActual = new Array(7).fill(0);
      activities.forEach((a) => {
        const d = new Date(a.start_date);
        if (d >= weekStart) {
          const dayIdx = Math.min(Math.floor((d.getTime() - weekStart.getTime()) / 86400000), 6);
          if (goal.key === "weekly-miles") dailyActual[dayIdx] += a.distance * METERS_TO_MILES;
        }
      });
      let cumActual = 0;
      const points = [];
      for (let i = 0; i <= Math.min(Math.floor((now.getTime() - weekStart.getTime()) / 86400000), 6); i++) {
        cumActual += dailyActual[i];
        points.push({ day: i, actual: cumActual, expected: dailyTarget * (i + 1) });
      }
      const maxVal = Math.max(goal.target, cumActual, 1);
      return { points, maxVal, totalDays };
    } else {
      // Yearly goal — aggregate by week
      const yearStart = new Date(now.getFullYear(), 0, 1);
      const totalWeeks = Math.ceil((now.getTime() - yearStart.getTime()) / (7 * 86400000));
      const weeklyTarget = goal.target / 52;
      const weeklyActual = new Array(Math.max(totalWeeks, 1)).fill(0);
      activities.forEach((a) => {
        const d = new Date(a.start_date);
        if (d >= yearStart) {
          const weekIdx = Math.min(Math.floor((d.getTime() - yearStart.getTime()) / (7 * 86400000)), weeklyActual.length - 1);
          if (goal.key === "yearly-miles") weeklyActual[weekIdx] += a.distance * METERS_TO_MILES;
          else if (goal.key === "yearly-elevation") weeklyActual[weekIdx] += a.total_elevation_gain * METERS_TO_FEET;
          else if (goal.key === "yearly-rides") weeklyActual[weekIdx] += 1;
        }
      });
      let cumActual = 0;
      const points = [];
      for (let i = 0; i < weeklyActual.length; i++) {
        cumActual += weeklyActual[i];
        points.push({ day: i, actual: cumActual, expected: weeklyTarget * (i + 1) });
      }
      const maxVal = Math.max(goal.target, cumActual, 1);
      return { points, maxVal, totalDays: 52 };
    }
  }, [expanded, goal, activities, now]);

  // SVG chart
  const W = 700, H = 240, padL = 55, padR = 10, padT = 15, padB = 30;
  const cW = W - padL - padR, cH = H - padT - padB;

  return (
    <div className="hud-card rounded-lg border border-[#00D9FF]/20 overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="w-full text-left p-4 hover:bg-[rgba(0,217,255,0.05)] transition-colors">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold" style={{ color: "#00D9FF" }}>{goal.label}</h4>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ color: statusColor, backgroundColor: `${statusColor}15`, border: `1px solid ${statusColor}40` }}>
            {statusLabel}{expected > 0 ? ` ${diff > 0 ? "+" : ""}${goal.unit === "rides" ? Math.round(diff) : Math.abs(diff) < 100 ? diff.toFixed(1) : Math.round(diff).toLocaleString()} ${goal.unit} (${diff > 0 ? "+" : ""}${((diff / expected) * 100).toFixed(1)}%)` : ""}
          </span>
        </div>
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-2xl font-bold" style={{ color: "#00D9FF" }}>
            {goal.unit === "rides" ? Math.round(actual) : actual < 1000 ? actual.toFixed(1) : Math.round(actual).toLocaleString()}
          </span>
          <span className="text-xs" style={{ color: "#67C7EB" }}>/ {goal.target.toLocaleString()} {goal.unit}</span>
        </div>
        {/* Progress bar */}
        <div className="h-2 rounded-full bg-[rgba(0,217,255,0.1)] relative">
          {/* Expected marker */}
          <div className="absolute top-0 h-2 w-0.5" style={{ left: `${Math.min(expectedPct * 100, 100)}%`, backgroundColor: "#67C7EB", opacity: 0.6 }} />
          {/* Actual bar */}
          <div className="h-2 rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: statusColor }} />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px]" style={{ color: "#67C7EB" }}>
            {diff > 0 ? "+" : ""}{goal.unit === "rides" ? Math.round(diff) : Math.abs(diff) < 100 ? diff.toFixed(1) : Math.round(diff).toLocaleString()} {goal.unit} vs expected
          </span>
          <span className="text-[10px]" style={{ color: "#67C7EB" }}>{pct.toFixed(1)}%</span>
        </div>
      </button>
      {expanded && chartData.points.length > 1 && (
        <div className="px-4 pb-4">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((f) => {
              const y = padT + cH - f * cH;
              const val = Math.round(f * chartData.maxVal);
              return (
                <g key={f}>
                  <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#00D9FF" strokeOpacity="0.08" strokeWidth="0.5" />
                  <text x={padL - 5} y={y + 5} textAnchor="end" fill="#67C7EB" fontSize="16" opacity="0.8">{val.toLocaleString()}</text>
                </g>
              );
            })}
            {/* Expected line (dashed) */}
            <path
              d={chartData.points.map((p, i) => {
                const x = padL + (i / (chartData.totalDays - 1 || 1)) * cW;
                const y = padT + cH - (p.expected / chartData.maxVal) * cH;
                return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
              }).join(" ")}
              fill="none" stroke="#67C7EB" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.6"
            />
            {/* Actual line */}
            <path
              d={chartData.points.map((p, i) => {
                const x = padL + (i / (chartData.totalDays - 1 || 1)) * cW;
                const y = padT + cH - (p.actual / chartData.maxVal) * cH;
                return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
              }).join(" ")}
              fill="none" stroke={statusColor} strokeWidth="2"
            />
            {/* Legend */}
            <line x1={padL + 10} y1={H - 10} x2={padL + 40} y2={H - 10} stroke={statusColor} strokeWidth="2" />
            <text x={padL + 44} y={H - 5} fill={statusColor} fontSize="14">Actual</text>
            <line x1={padL + 105} y1={H - 10} x2={padL + 135} y2={H - 10} stroke="#67C7EB" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.6" />
            <text x={padL + 139} y={H - 5} fill="#67C7EB" fontSize="14" opacity="0.8">Goal Pace</text>
          </svg>
        </div>
      )}
    </div>
  );
}

function TabButton({ tab, active, onClick }: { tab: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${active ? "bg-[rgba(0,217,255,0.25)] text-[#00D9FF] border border-[#00D9FF]/50" : "text-[#67C7EB] hover:text-[#00D9FF] border border-transparent"}`}>
      {tab}
    </button>
  );
}

// ─── Main page ──────────────────────────────────────────────────

export default function StravaPage() {
  const [activities, setActivities] = useState<StravaActivity[]>([]);
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [connected, setConnected] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");
  const [chartMode, setChartMode] = useState<"weeks" | "months">("weeks");
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const [expandedRide, setExpandedRide] = useState<number | null>(null);
  const [rideStreams, setRideStreams] = useState<Record<number, StreamData>>({});
  const [loadingStream, setLoadingStream] = useState<number | null>(null);
  const [zones, setZones] = useState<ZoneConfig | null>(null);
  const [powerCurve, setPowerCurve] = useState<Record<number, number>>({});
  const [buildingCurve, setBuildingCurve] = useState(false);
  const [curveProgress, setCurveProgress] = useState("");
  const [fitnessRange, setFitnessRange] = useState(90);
  const [goals, setGoals] = useState<StravaGoal[]>([]);

  // Load from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STRAVA_ACTIVITIES_KEY);
    if (stored) { try { setActivities(JSON.parse(stored)); } catch { /* ignore */ } }
    setConnected(!!localStorage.getItem(STRAVA_TOKENS_KEY));
    const bikeStored = localStorage.getItem(BIKES_STORAGE_KEY);
    if (bikeStored) { try { setBikes(JSON.parse(bikeStored)); } catch { /* ignore */ } }
    setZones(loadZones());
    const curveStored = localStorage.getItem(STRAVA_POWER_CURVE_KEY);
    if (curveStored) { try { setPowerCurve(JSON.parse(curveStored)); } catch { /* ignore */ } }
    setGoals(loadGoals());
  }, []);

  // Auto-sync on page visit
  useEffect(() => {
    if (!connected) return;
    const lastSync = localStorage.getItem(STRAVA_LAST_SYNC_KEY);
    const stale = !lastSync || (Date.now() - new Date(lastSync).getTime()) > AUTO_SYNC_INTERVAL_MS;
    if (!stale) return;
    setSyncing(true);
    setSyncMsg("Auto-syncing...");
    syncActivities()
      .then((acts) => { setActivities(acts); setSyncMsg(`Synced ${acts.length} rides`); setTimeout(() => setSyncMsg(""), 3000); })
      .catch(() => setSyncMsg(""))
      .finally(() => setSyncing(false));
  }, [connected]);

  // Ride detail stream loading
  const handleExpandRide = useCallback(async (id: number) => {
    if (expandedRide === id) { setExpandedRide(null); return; }
    setExpandedRide(id);
    if (rideStreams[id]) return;
    setLoadingStream(id);
    const stream = await fetchStream(id);
    if (stream) setRideStreams((prev) => ({ ...prev, [id]: stream }));
    setLoadingStream(null);
  }, [expandedRide, rideStreams]);

  // Build power curve
  const handleBuildCurve = useCallback(async () => {
    setBuildingCurve(true);
    const powerRides = activities.filter((a) => a.device_watts || a.average_watts);
    const bestAll: Record<number, number> = { ...powerCurve };
    let processed = 0;
    for (const ride of powerRides) {
      const stream = await fetchStream(ride.id);
      if (stream?.watts) {
        const best = computeBestEfforts(stream.watts);
        for (const [dur, w] of Object.entries(best)) {
          const d = Number(dur);
          if (!bestAll[d] || w > bestAll[d]) bestAll[d] = w;
        }
      }
      processed++;
      setCurveProgress(`${processed}/${powerRides.length} rides`);
      if (processed % 8 === 0) await new Promise((r) => setTimeout(r, 500));
    }
    setPowerCurve(bestAll);
    localStorage.setItem(STRAVA_POWER_CURVE_KEY, JSON.stringify(bestAll));
    setBuildingCurve(false);
    setCurveProgress("");
  }, [activities, powerCurve]);

  // Computed values
  const now = useMemo(() => new Date(), []);
  const yearStart = useMemo(() => getYearStart(), []);
  const ytd = useMemo(() => activities.filter((a) => new Date(a.start_date) >= yearStart), [activities, yearStart]);

  const ytdDistance = ytd.reduce((s, a) => s + a.distance * METERS_TO_MILES, 0);
  const ytdTime = ytd.reduce((s, a) => s + a.moving_time, 0);
  const ytdElevation = ytd.reduce((s, a) => s + a.total_elevation_gain * METERS_TO_FEET, 0);
  const ytdCalories = ytd.reduce((s, a) => s + (a.calories || a.kilojoules || 0), 0);
  const ytdPowerRides = ytd.filter((a) => a.average_watts);
  const ytdAvgPower = ytdPowerRides.length > 0 ? Math.round(ytdPowerRides.reduce((s, a) => s + (a.average_watts || 0), 0) / ytdPowerRides.length) : null;
  const ytdHRRides = ytd.filter((a) => a.average_heartrate);
  const ytdAvgHR = ytdHRRides.length > 0 ? Math.round(ytdHRRides.reduce((s, a) => s + (a.average_heartrate || 0), 0) / ytdHRRides.length) : null;
  const ytdCadenceRides = ytd.filter((a) => a.average_cadence);
  const ytdAvgCadence = ytdCadenceRides.length > 0 ? Math.round(ytdCadenceRides.reduce((s, a) => s + (a.average_cadence || 0), 0) / ytdCadenceRides.length) : null;

  const thisWeekStart = useMemo(() => getWeekStart(now), [now]);

  // Goal actuals
  const goalActuals = useMemo(() => {
    const weekMiles = activities.filter((a) => new Date(a.start_date) >= thisWeekStart).reduce((s, a) => s + a.distance * METERS_TO_MILES, 0);
    const map: Record<string, number> = {
      "weekly-miles": weekMiles,
      "yearly-miles": ytdDistance,
      "yearly-elevation": ytdElevation,
      "yearly-rides": ytd.length,
    };
    return map;
  }, [activities, thisWeekStart, ytdDistance, ytdElevation, ytd]);

  const linkedBikes = bikes.filter((b) => b.stravaGearId);

  const allRides = useMemo(
    () => [...activities].sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()),
    [activities]
  );

  // Aggregated zone times from cached streams
  const aggregatedPowerZoneTimes = useMemo(() => {
    if (!zones) return null;
    const total = new Array(zones.powerZones.length).fill(0);
    for (const [, stream] of Object.entries(rideStreams)) {
      if (stream.watts) {
        const t = computeZoneTime(stream.watts, zones.powerZones);
        t.forEach((v, i) => (total[i] += v));
      }
    }
    return total.some((t) => t > 0) ? total : null;
  }, [rideStreams, zones]);

  const aggregatedHRZoneTimes = useMemo(() => {
    if (!zones) return null;
    const total = new Array(zones.hrZones.length).fill(0);
    for (const [, stream] of Object.entries(rideStreams)) {
      if (stream.heartrate) {
        const t = computeZoneTime(stream.heartrate, zones.hrZones);
        t.forEach((v, i) => (total[i] += v));
      }
    }
    return total.some((t) => t > 0) ? total : null;
  }, [rideStreams, zones]);

  // Fitness data
  const fitnessData = useMemo(() => {
    const ftp = zones?.ftp;
    if (!ftp || activities.length === 0) return [];
    const daily = computeDailyTSS(activities, ftp);
    return computeFitness(daily, fitnessRange);
  }, [activities, zones, fitnessRange]);

  const noData = activities.length === 0;

  return (
    <div className="min-h-screen hud-scifi-bg relative" style={{ backgroundColor: hubTheme.background, color: hubTheme.primary }}>
      <CircuitBackground />
      <main className="container mx-auto px-4 py-8 max-w-4xl relative z-10">
        {/* Header */}
        <div className="grid grid-cols-3 items-center gap-4 mb-6">
          <div className="flex justify-start w-20 h-20 min-w-20 min-h-20"><Navigation /></div>
          <h2 className="text-2xl font-semibold hud-text text-center">Strava</h2>
          <div className="flex justify-end">
            <Link href="/bike" title="Cycling" aria-label="Cycling" className="inline-flex items-center justify-center transition-transform hover:scale-110" style={{ width: 80, height: 80, minWidth: 80, minHeight: 80 }}>
              <CyclingIcon className="shrink-0" style={{ width: 80, height: 80, minWidth: 80, minHeight: 80 }} stroke={hubTheme.primary} />
            </Link>
          </div>
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: connected ? "#00FF88" : "#FF4444" }} />
            <span className="text-xs" style={{ color: hubTheme.secondary }}>{connected ? "Connected" : "Not connected"}</span>
            {syncMsg && <span className="text-xs ml-2" style={{ color: syncing ? "#FFD700" : "#00FF88" }}>{syncMsg}</span>}
          </div>
          <Link href="/settings#strava" className="text-xs hover:underline" style={{ color: hubTheme.secondary }}>Settings</Link>
        </div>

        {noData ? (
          <div className="hud-card rounded-lg p-12 border border-[#00D9FF]/20 text-center">
            <p className="text-lg mb-2" style={{ color: hubTheme.primary }}>No ride data yet</p>
            <p className="text-sm" style={{ color: hubTheme.secondary }}>{connected ? "Go to Settings to sync your Strava data." : "Connect Strava in Settings to get started."}</p>
            <Link href="/settings#strava" className="inline-block mt-4 px-4 py-2 rounded-lg border border-[#00D9FF]/50 bg-[rgba(0,217,255,0.15)] text-[#00D9FF] hover:bg-[rgba(0,217,255,0.25)] text-sm">Open Settings</Link>
          </div>
        ) : (
          <>
            {/* Tab bar */}
            <div className="flex gap-1 mb-6 overflow-x-auto">
              <TabButton tab="Overview" active={tab === "overview"} onClick={() => setTab("overview")} />
              <TabButton tab="Rides" active={tab === "rides"} onClick={() => setTab("rides")} />
              <TabButton tab="Power" active={tab === "power"} onClick={() => setTab("power")} />
              <TabButton tab="Fitness" active={tab === "fitness"} onClick={() => setTab("fitness")} />
            </div>

            {/* ─── OVERVIEW TAB ─── */}
            {tab === "overview" && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <StatCard label="Distance" value={`${Math.round(ytdDistance).toLocaleString()} mi`} />
                  <StatCard label="Ride Time" value={formatTime(ytdTime)} />
                  <StatCard label="Elevation" value={`${Math.round(ytdElevation).toLocaleString()} ft`} />
                  <StatCard label="Rides" value={String(ytd.length)} />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  <StatCard label="Calories" value={ytdCalories > 0 ? `${Math.round(ytdCalories).toLocaleString()}` : "—"} />
                  <StatCard label="Avg Power" value={ytdAvgPower ? `${ytdAvgPower}w` : "—"} />
                  <StatCard label="Avg HR" value={ytdAvgHR ? `${ytdAvgHR} bpm` : "—"} />
                  <StatCard label="Avg Cadence" value={ytdAvgCadence ? `${ytdAvgCadence} rpm` : "—"} />
                </div>
                {/* Goals */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {goals.map((goal) => (
                    <GoalCard key={goal.key} goal={goal} actual={goalActuals[goal.key] || 0} activities={activities} />
                  ))}
                </div>
                {linkedBikes.length > 0 && (
                  <div className="hud-card rounded-lg p-6 mb-6 border border-[#00D9FF]/20">
                    <h3 className="text-lg font-semibold mb-4" style={{ color: hubTheme.primary }}>Per-Bike Mileage</h3>
                    <div className="space-y-3">
                      {linkedBikes.map((bike) => (
                        <div key={bike.id} className="flex items-center justify-between px-4 py-3 rounded-lg border border-[#00D9FF]/10 bg-[rgba(0,217,255,0.03)]">
                          <div>
                            <span className="font-medium" style={{ color: hubTheme.primary }}>{bike.name}</span>
                            <span className="text-sm ml-2" style={{ color: hubTheme.secondary }}>{bike.type}</span>
                          </div>
                          <div className="text-right text-xs" style={{ color: hubTheme.secondary }}>
                            {bike.totalMiles != null && <span>{bike.totalMiles.toFixed(1)} mi</span>}
                            {bike.indoorMiles != null && bike.indoorMiles > 0 && <span className="ml-3">{bike.indoorMiles.toFixed(1)} indoor</span>}
                            {bike.roadMiles != null && bike.roadMiles > 0 && <span className="ml-3">{bike.roadMiles.toFixed(1)} road</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="hud-card rounded-lg p-6 mb-6 border border-[#00D9FF]/20">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold" style={{ color: hubTheme.primary }}>Mileage Over Time</h3>
                    <div className="flex gap-1">
                      {(["weeks", "months"] as const).map((m) => (
                        <button key={m} onClick={() => setChartMode(m)} className={`px-3 py-1 rounded text-xs transition-colors ${chartMode === m ? "bg-[rgba(0,217,255,0.25)] text-[#00D9FF] border border-[#00D9FF]/50" : "text-[#67C7EB] hover:text-[#00D9FF]"}`}>
                          12 {m === "weeks" ? "Weeks" : "Months"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <MileageChart activities={activities} mode={chartMode} />
                </div>
              </>
            )}

            {/* ─── RIDES TAB ─── */}
            {tab === "rides" && (
              <div className="space-y-2">
                <p className="text-xs mb-4" style={{ color: hubTheme.secondary }}>{allRides.length} rides total. Click a ride for detail charts.</p>
                {allRides.map((ride) => {
                  const isExpanded = expandedRide === ride.id;
                  const stream = rideStreams[ride.id];
                  const isLoading = loadingStream === ride.id;
                  return (
                    <div key={ride.id}>
                      <button
                        onClick={() => handleExpandRide(ride.id)}
                        className="w-full text-left flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-3 rounded-lg border border-[#00D9FF]/10 bg-[rgba(0,217,255,0.03)] hover:bg-[rgba(0,217,255,0.08)] transition-colors"
                      >
                        <div className="flex-1 min-w-[160px]">
                          <div className="font-medium text-sm" style={{ color: hubTheme.primary }}>{ride.name}</div>
                          <div className="text-xs" style={{ color: hubTheme.secondary }}>
                            {formatDate(ride.start_date)}
                            {ride.trainer && <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-[rgba(0,217,255,0.15)] border border-[#00D9FF]/30">Indoor</span>}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs" style={{ color: hubTheme.secondary }}>
                          <span>{(ride.distance * METERS_TO_MILES).toFixed(1)} mi</span>
                          <span>{formatTime(ride.moving_time)}</span>
                          {ride.average_speed > 0 && <span>{(ride.average_speed * MPS_TO_MPH).toFixed(1)} mph</span>}
                          {ride.total_elevation_gain > 0 && <span>{Math.round(ride.total_elevation_gain * METERS_TO_FEET).toLocaleString()} ft</span>}
                          {ride.average_watts && <span>{Math.round(ride.average_watts)}w</span>}
                          {ride.weighted_average_watts && <span>NP {ride.weighted_average_watts}w</span>}
                          {ride.calories && <span>{Math.round(ride.calories)} cal</span>}
                          {ride.average_cadence && <span>{Math.round(ride.average_cadence)} rpm</span>}
                          {ride.average_heartrate && <span>{Math.round(ride.average_heartrate)} bpm</span>}
                          {ride.max_heartrate && <span>max {ride.max_heartrate} bpm</span>}
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="hud-card rounded-lg p-4 mt-1 mb-2 border border-[#00D9FF]/20">
                          {isLoading && <p className="text-xs" style={{ color: hubTheme.secondary }}>Loading streams...</p>}
                          {!isLoading && !stream && <p className="text-xs" style={{ color: hubTheme.secondary }}>No stream data available for this ride.</p>}
                          {stream && (
                            <>
                              {stream.watts && <LineChart data={stream.watts} color="#FFD700" label="Power (watts)" unit="w" />}
                              {stream.heartrate && <LineChart data={stream.heartrate} color="#FF4444" label="Heart Rate (bpm)" unit="bpm" />}
                              {stream.cadence && <LineChart data={stream.cadence} color="#00FF88" label="Cadence (rpm)" unit="rpm" />}
                              {stream.velocity_smooth && <LineChart data={stream.velocity_smooth.map((v) => v * MPS_TO_MPH)} color="#67C7EB" label="Speed (mph)" unit="mph" />}
                              {stream.altitude && <LineChart data={stream.altitude.map((v) => v * METERS_TO_FEET)} color="#FF8C00" label="Elevation (ft)" unit="ft" />}
                              {zones && stream.watts && (
                                <div className="mt-3">
                                  <div className="text-xs mb-2" style={{ color: hubTheme.primary }}>Power Zones</div>
                                  <ZoneBar zones={zones.powerZones} times={computeZoneTime(stream.watts, zones.powerZones)} colors={POWER_ZONE_COLORS} />
                                </div>
                              )}
                              {zones && stream.heartrate && (
                                <div className="mt-3">
                                  <div className="text-xs mb-2" style={{ color: hubTheme.primary }}>HR Zones</div>
                                  <ZoneBar zones={zones.hrZones} times={computeZoneTime(stream.heartrate, zones.hrZones)} colors={HR_ZONE_COLORS} />
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ─── POWER TAB ─── */}
            {tab === "power" && (
              <>
                <div className="hud-card rounded-lg p-6 mb-6 border border-[#00D9FF]/20">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold" style={{ color: hubTheme.primary }}>Power Curve</h3>
                    <button
                      onClick={handleBuildCurve}
                      disabled={buildingCurve}
                      className="px-3 py-1.5 rounded text-xs border border-[#00D9FF]/50 bg-[rgba(0,217,255,0.15)] text-[#00D9FF] hover:bg-[rgba(0,217,255,0.25)] disabled:opacity-50"
                    >
                      {buildingCurve ? `Building... ${curveProgress}` : Object.keys(powerCurve).length > 0 ? "Rebuild Curve" : "Build Power Curve"}
                    </button>
                  </div>
                  {Object.keys(powerCurve).length > 0 ? (
                    <PowerCurveChart curve={powerCurve} />
                  ) : (
                    <p className="text-sm" style={{ color: hubTheme.secondary }}>
                      Click &quot;Build Power Curve&quot; to analyze your rides. This fetches detailed data for each ride with power data.
                    </p>
                  )}
                </div>

                {/* Power stats */}
                {ytdPowerRides.length > 0 && (
                  <div className="hud-card rounded-lg p-6 mb-6 border border-[#00D9FF]/20">
                    <h3 className="text-lg font-semibold mb-4" style={{ color: hubTheme.primary }}>YTD Power Stats</h3>
                    <div className="grid grid-cols-3 gap-3">
                      <StatCard label="Avg Power" value={`${ytdAvgPower}w`} />
                      <StatCard label="Best NP" value={`${Math.max(...ytdPowerRides.map((r) => r.weighted_average_watts || 0))}w`} />
                      <StatCard label="Max Power" value={`${Math.max(...ytdPowerRides.map((r) => r.max_watts || 0))}w`} />
                    </div>
                  </div>
                )}

                {/* Power zones */}
                {zones ? (
                  <div className="hud-card rounded-lg p-6 border border-[#00D9FF]/20">
                    <h3 className="text-lg font-semibold mb-4" style={{ color: hubTheme.primary }}>Power Zones (FTP: {zones.ftp}w)</h3>
                    {aggregatedPowerZoneTimes ? (
                      <ZoneBar zones={zones.powerZones} times={aggregatedPowerZoneTimes} colors={POWER_ZONE_COLORS} />
                    ) : (
                      <p className="text-sm" style={{ color: hubTheme.secondary }}>View ride details to load stream data, then zone distributions will appear here.</p>
                    )}
                  </div>
                ) : (
                  <div className="hud-card rounded-lg p-6 border border-[#00D9FF]/20 text-center">
                    <p className="text-sm mb-2" style={{ color: hubTheme.secondary }}>Set your FTP and Max HR in Settings to see zone analysis.</p>
                    <Link href="/settings#strava" className="text-xs hover:underline" style={{ color: hubTheme.primary }}>Open Settings</Link>
                  </div>
                )}
              </>
            )}

            {/* ─── FITNESS TAB ─── */}
            {tab === "fitness" && (
              <>
                {zones?.ftp ? (
                  <>
                    {fitnessData.length > 0 && (
                      <div className="grid grid-cols-3 gap-3 mb-6">
                        <StatCard label="Fitness (CTL)" value={String(Math.round(fitnessData[fitnessData.length - 1].ctl))} />
                        <StatCard label="Fatigue (ATL)" value={String(Math.round(fitnessData[fitnessData.length - 1].atl))} />
                        <StatCard label="Form (TSB)" value={String(Math.round(fitnessData[fitnessData.length - 1].tsb))} sub={fitnessData[fitnessData.length - 1].tsb > 5 ? "Fresh" : fitnessData[fitnessData.length - 1].tsb < -10 ? "Fatigued" : "Neutral"} />
                      </div>
                    )}
                    <div className="hud-card rounded-lg p-6 mb-6 border border-[#00D9FF]/20">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold" style={{ color: hubTheme.primary }}>Training Load</h3>
                        <div className="flex gap-1">
                          {[90, 180, 365].map((d) => (
                            <button key={d} onClick={() => setFitnessRange(d)} className={`px-3 py-1 rounded text-xs transition-colors ${fitnessRange === d ? "bg-[rgba(0,217,255,0.25)] text-[#00D9FF] border border-[#00D9FF]/50" : "text-[#67C7EB] hover:text-[#00D9FF]"}`}>
                              {d === 365 ? "1 Year" : `${d}d`}
                            </button>
                          ))}
                        </div>
                      </div>
                      <FitnessChart data={fitnessData} />
                    </div>

                    {/* HR zones */}
                    {zones && (
                      <div className="hud-card rounded-lg p-6 border border-[#00D9FF]/20">
                        <h3 className="text-lg font-semibold mb-4" style={{ color: hubTheme.primary }}>HR Zones (Max: {zones.maxHR} bpm)</h3>
                        {aggregatedHRZoneTimes ? (
                          <ZoneBar zones={zones.hrZones} times={aggregatedHRZoneTimes} colors={HR_ZONE_COLORS} />
                        ) : (
                          <p className="text-sm" style={{ color: hubTheme.secondary }}>View ride details to load stream data, then HR zone distributions will appear here.</p>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="hud-card rounded-lg p-12 border border-[#00D9FF]/20 text-center">
                    <p className="text-lg mb-2" style={{ color: hubTheme.primary }}>Set up your training zones</p>
                    <p className="text-sm mb-4" style={{ color: hubTheme.secondary }}>Enter your FTP and Max HR in Settings to see training load analysis, fitness trends, and zone distributions.</p>
                    <Link href="/settings#strava" className="inline-block px-4 py-2 rounded-lg border border-[#00D9FF]/50 bg-[rgba(0,217,255,0.15)] text-[#00D9FF] hover:bg-[rgba(0,217,255,0.25)] text-sm">Open Settings</Link>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
