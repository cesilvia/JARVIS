"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import Navigation from "../../components/Navigation";
import CircuitBackground from "../../hub/CircuitBackground";
import CyclingIcon from "../CyclingIcon";
import {
  StravaActivity, StreamData, Bike, ZoneConfig, StravaGoal,
  DEFAULT_GOALS,
  METERS_TO_MILES, METERS_TO_FEET, MPS_TO_MPH, AUTO_SYNC_INTERVAL_MS,
  POWER_ZONE_COLORS, HR_ZONE_COLORS,
  formatTime, formatHours, formatDate, getWeekStart, getMonthStart, getYearStart,
} from "./types";
import * as api from "../../lib/api-client";

const hubTheme = { primary: "#00D9FF", secondary: "#67C7EB", background: "#000000" };
type Tab = "overview" | "rides" | "power" | "fitness";

// ─── Sync helper ────────────────────────────────────────────────

async function getAccessToken(): Promise<string | null> {
  const tokens = await api.getKV<{ accessToken: string; refreshToken: string; expiresAt: number }>("strava-tokens");
  if (!tokens) return null;
  let accessToken = tokens.accessToken;
  const expiresIn = tokens.expiresAt - Math.floor(Date.now() / 1000);
  if (expiresIn < 3600) {
    try {
      const res = await fetch("/api/strava/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
        signal: AbortSignal.timeout(12000),
      });
      if (res.ok) {
        const data = await res.json();
        accessToken = data.accessToken;
        await api.setKV("strava-tokens", {
          accessToken: data.accessToken, refreshToken: data.refreshToken, expiresAt: data.expiresAt,
        });
      }
    } catch (err) {
      console.warn("Token refresh failed:", err);
      // Return existing token — it may still work briefly
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
  if (!Array.isArray(activities) || activities.length === 0) {
    // Don't overwrite stored rides with empty results — return what we already have
    const stored = await api.getActivities<StravaActivity>();
    if (stored.length > 0) return stored;
    return [];
  }
  await api.saveActivities(activities);
  await api.setKV("strava-last-sync", new Date().toISOString());
  if (gearRes.ok) {
    const { gear } = await gearRes.json();
    const gearList = (gear || []).map((g: { id: string; name: string }) => ({ id: g.id, name: g.name }));
    await api.setKV("strava-gear", gearList);
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
    const bikesArr = await api.getBikes();
    if (bikesArr.length > 0) {
      let bikes = bikesArr as { stravaGearId?: string; [k: string]: unknown }[];
      bikes = bikes.map((b) => {
        const gid = b.stravaGearId;
        if (!gid || !byGear[gid]) return b;
        const { total, indoor, road } = byGear[gid];
        return { ...b, totalMiles: Math.round(total * 10) / 10, indoorMiles: Math.round(indoor * 10) / 10, roadMiles: Math.round(road * 10) / 10, lastSyncAt: now };
      });
      await api.saveBikes(bikes);
    }
  }
  return activities;
}

// ─── Stream fetching ────────────────────────────────────────────

async function fetchStream(activityId: number): Promise<StreamData | null> {
  const cached = await api.getStream(activityId);
  if (cached) return cached as StreamData;
  const accessToken = await getAccessToken();
  if (!accessToken) return null;
  const res = await fetch("/api/strava/streams", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessToken, activityId }),
  });
  if (!res.ok) return null;
  const { streams } = await res.json();
  await api.saveStream(activityId, streams);
  return streams as StreamData;
}

// ─── Description fetching ────────────────────────────────────────

async function loadDescriptionCache(): Promise<Record<number, string>> {
  const raw = await api.getKV<Record<number, string>>("strava-descriptions");
  return raw || {};
}

async function saveDescriptionCache(cache: Record<number, string>) {
  await api.setKV("strava-descriptions", cache);
}

async function fetchDescription(activityId: number): Promise<string | null> {
  const cache = await loadDescriptionCache();
  if (cache[activityId] !== undefined) return cache[activityId];
  const accessToken = await getAccessToken();
  if (!accessToken) return null;
  const res = await fetch("/api/strava/activity-detail", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessToken, activityId }),
  });
  if (!res.ok) return null;
  const { activity } = await res.json();
  const desc = activity.description || "";
  cache[activityId] = desc;
  await saveDescriptionCache(cache);
  return desc;
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

const OVERLAY_COLORS = ["#00D9FF", "rgba(0,217,255,0.5)", "rgba(0,217,255,0.3)", "rgba(0,217,255,0.15)"];

function OverlayChart({ series, labels, color, label, unit, height = 140 }: {
  series: (number[] | undefined)[]; labels: string[]; color: string; label: string; unit: string; height?: number;
}) {
  const validSeries = series.filter((s): s is number[] => !!s && s.length > 0);
  if (validSeries.length === 0) return null;
  const W = 700, padL = 45, padR = 10, padT = 10, padB = 28;
  const cW = W - padL - padR, cH = height - padT - padB;
  const allMax = Math.max(...validSeries.map((s) => Math.max(...s)), 1);
  const allMin = Math.min(...validSeries.map((s) => Math.min(...s)), 0);
  const range = allMax - allMin || 1;
  const colors = [color, ...OVERLAY_COLORS.slice(1)];
  return (
    <div className="mb-3">
      <div className="text-xs mb-1" style={{ color }}>{label}</div>
      <svg viewBox={`0 0 ${W} ${height}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        {[0, 0.5, 1].map((f) => {
          const y = padT + cH - f * cH;
          return (
            <g key={f}>
              <line x1={padL} y1={y} x2={W - padR} y2={y} stroke={color} strokeOpacity="0.1" strokeWidth="0.5" />
              <text x={padL - 5} y={y + 3} textAnchor="end" fill={color} fontSize="8" opacity="0.5">{Math.round(allMin + f * range)}</text>
            </g>
          );
        })}
        {validSeries.map((data, si) => {
          const step = Math.max(1, Math.floor(data.length / 500));
          const sampled = data.filter((_, i) => i % step === 0);
          const pts = sampled.map((v, i) => ({
            x: padL + (i / (sampled.length - 1)) * cW,
            y: padT + cH - ((v - allMin) / range) * cH,
          }));
          const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
          return <path key={si} d={path} fill="none" stroke={colors[si] || colors[colors.length - 1]} strokeWidth={si === 0 ? "1.5" : "1"} />;
        }).reverse()}
        {/* Legend */}
        {labels.map((lbl, i) => (
          <g key={i}>
            <rect x={padL + i * 120} y={height - 14} width={10} height={3} fill={colors[i] || colors[colors.length - 1]} rx="1" />
            <text x={padL + i * 120 + 14} y={height - 10} fill={color} fontSize="7" opacity="0.7">{lbl}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function ZoneCompareGrouped({ title, zones, allTimes, dateLabels, colors }: {
  title: string; zones: { name: string }[]; allTimes: number[][]; dateLabels: string[]; colors: string[];
}) {
  // For each zone, show grouped bars (one per ride)
  const rideColors = ["#00D9FF", "rgba(0,217,255,0.5)", "rgba(0,217,255,0.3)", "rgba(0,217,255,0.15)"];
  const allTotals = allTimes.map((times) => times.reduce((s, t) => s + t, 0) || 1);
  const maxPct = Math.max(...allTimes.flatMap((times, ri) => times.map((t) => (t / allTotals[ri]) * 100)), 1);
  return (
    <div className="mb-4">
      <div className="text-xs mb-2 font-medium" style={{ color: hubTheme.primary }}>{title}</div>
      <div className="space-y-2">
        {zones.map((z, zi) => (
          <div key={z.name}>
            <div className="text-[10px] mb-0.5" style={{ color: colors[zi] }}>{z.name}</div>
            <div className="space-y-0.5">
              {allTimes.map((times, ri) => {
                const pct = (times[zi] / allTotals[ri]) * 100;
                const barW = (pct / maxPct) * 100;
                return (
                  <div key={ri} className="flex items-center gap-2 text-[10px]">
                    <span className="w-20 truncate" style={{ color: rideColors[ri] }}>{dateLabels[ri]}</span>
                    <div className="flex-1 h-2.5 rounded-full bg-[rgba(0,217,255,0.05)]">
                      <div className="h-2.5 rounded-full" style={{ width: `${barW}%`, backgroundColor: colors[zi], opacity: ri === 0 ? 0.8 : 0.3 + (0.2 / (ri + 1)) }} />
                    </div>
                    <span className="w-10 text-right" style={{ color: hubTheme.secondary }}>{pct.toFixed(0)}%</span>
                    <span className="w-12 text-right" style={{ color: hubTheme.secondary }}>{formatTime(times[zi])}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {/* Legend */}
      <div className="flex gap-4 mt-2">
        {dateLabels.map((lbl, i) => (
          <div key={i} className="flex items-center gap-1 text-[10px]" style={{ color: rideColors[i] }}>
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: rideColors[i] }} />{lbl}
          </div>
        ))}
      </div>
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

function ZoneBar({ zones, times, colors, unit }: { zones: { name: string; min: number; max: number }[]; times: number[]; colors: string[]; unit?: string }) {
  const total = times.reduce((s, t) => s + t, 0) || 1;
  const u = unit || "";
  return (
    <div className="space-y-1.5">
      {zones.map((z, i) => {
        const pct = (times[i] / total) * 100;
        const rangeLabel = z.max >= 9999 ? `${z.min}${u}+` : `${z.min}-${z.max}${u}`;
        return (
          <div key={z.name} className="flex items-center gap-2 text-xs">
            <span className="w-44 truncate" style={{ color: colors[i] }}>{z.name} ({rangeLabel})</span>
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
  const W = 700, H = 255, padL = 45, padR = 10, padT = 15, padB = 45;
  const cW = W - padL - padR, cH = H - padT - padB;
  const allVals = data.flatMap((d) => [d.ctl, d.atl, d.tsb]);
  const max = Math.max(...allVals, 1);
  const min = Math.min(...allVals, -35);
  const range = max - min || 1;
  const toY = (v: number) => padT + cH - ((v - min) / range) * cH;
  const toX = (i: number) => padL + (i / (data.length - 1)) * cW;
  const mkPath = (key: "ctl" | "atl" | "tsb") => data.map((d, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(d[key]).toFixed(1)}`).join(" ");

  // Linear trendline helper
  const mkTrend = (key: "ctl" | "atl" | "tsb") => {
    const n = data.length;
    let sx = 0, sy = 0, sxy = 0, sx2 = 0;
    data.forEach((d, i) => { const v = d[key]; sx += i; sy += v; sxy += i * v; sx2 += i * i; });
    const slope = (n * sxy - sx * sy) / (n * sx2 - sx * sx);
    const intercept = (sy - slope * sx) / n;
    const y0 = intercept, y1 = intercept + slope * (n - 1);
    return `M${toX(0).toFixed(1)},${toY(y0).toFixed(1)} L${toX(n - 1).toFixed(1)},${toY(y1).toFixed(1)}`;
  };

  // TSB zone background rects
  const tsbZones = (() => {
    const y_pos20 = toY(20);
    const y_neg10 = toY(-10);
    const y_neg30 = toY(-30);
    const chartTop = padT;
    const chartBot = padT + cH;
    const x0 = padL, x1 = W - padR;
    const clamp = (v: number) => Math.min(Math.max(v, chartTop), chartBot);
    const rects: { y: number; h: number; fill: string }[] = [];
    // Green: +20 to -10 (fresh/balanced)
    const greenTop = clamp(y_pos20);
    const greenBot = clamp(y_neg10);
    if (greenBot > greenTop) rects.push({ y: greenTop, h: greenBot - greenTop, fill: "rgba(0,200,60,0.15)" });
    // Amber: -10 to -30 (training load)
    const yellowTop = clamp(y_neg10);
    const yellowBot = clamp(y_neg30);
    if (yellowBot > yellowTop) rects.push({ y: yellowTop, h: yellowBot - yellowTop, fill: "rgba(255,140,0,0.20)" });
    // Red: below -30 (overreaching)
    const redTop = clamp(y_neg30);
    const redBot = chartBot;
    if (redBot > redTop) rects.push({ y: redTop, h: redBot - redTop, fill: "rgba(255,30,30,0.20)" });
    return rects.map((r, i) => <rect key={i} x={x0} y={r.y} width={x1 - x0} height={r.h} fill={r.fill} />);
  })();

  const monthLabels: { x: number; label: string }[] = [];
  let lastMonth = "";
  data.forEach((d, i) => {
    const m = d.date.slice(0, 7);
    if (m !== lastMonth) { lastMonth = m; monthLabels.push({ x: toX(i), label: new Date(d.date).toLocaleDateString("en-US", { month: "short" }) }); }
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      {/* TSB zone backgrounds */}
      {tsbZones}
      {/* Grid lines and Y-axis labels at nice intervals */}
      {(() => {
        const step = range < 60 ? 10 : range < 120 ? 20 : 50;
        const first = Math.ceil(min / step) * step;
        const ticks: number[] = [];
        for (let v = first; v <= max; v += step) ticks.push(v);
        return ticks.map((v) => (
          <g key={v}>
            <line x1={padL} y1={toY(v)} x2={W - padR} y2={toY(v)} stroke="#00D9FF" strokeOpacity={v === 0 ? "0.3" : "0.07"} strokeWidth="0.5" strokeDasharray={v === 0 ? "4,4" : undefined} />
            <text x={padL - 5} y={toY(v) + 3} textAnchor="end" fill="#67C7EB" fontSize="8" opacity="0.5">{v}</text>
          </g>
        ));
      })()}
      {/* Data lines */}
      <path d={mkPath("ctl")} fill="none" stroke="#00D9FF" strokeWidth="2" />
      <path d={mkPath("atl")} fill="none" stroke="#FF00FF" strokeWidth="1.5" strokeOpacity="0.8" />
      <path d={mkPath("tsb")} fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeOpacity="0.9" />
      {/* Dashed trendlines */}
      <path d={mkTrend("ctl")} fill="none" stroke="#00D9FF" strokeWidth="1" strokeDasharray="6,4" strokeOpacity="0.5" />
      <path d={mkTrend("atl")} fill="none" stroke="#FF00FF" strokeWidth="1" strokeDasharray="6,4" strokeOpacity="0.5" />
      <path d={mkTrend("tsb")} fill="none" stroke="#FFFFFF" strokeWidth="1" strokeDasharray="6,4" strokeOpacity="0.4" />
      {/* Month labels */}
      {monthLabels.map((m) => <text key={m.x} x={m.x} y={H - 5} fill="#67C7EB" fontSize="8" opacity="0.6">{m.label}</text>)}
      {/* Legend — bottom row below month labels */}
      <g>
        <line x1={padL} y1={H - 2} x2={padL + 15} y2={H - 2} stroke="#00D9FF" strokeWidth="2" />
        <text x={padL + 19} y={H + 1} fill="#00D9FF" fontSize="8">CTL</text>
        <line x1={padL + 50} y1={H - 2} x2={padL + 65} y2={H - 2} stroke="#FF00FF" strokeWidth="1.5" />
        <text x={padL + 69} y={H + 1} fill="#FF00FF" fontSize="8">ATL</text>
        <line x1={padL + 100} y1={H - 2} x2={padL + 115} y2={H - 2} stroke="#FFFFFF" strokeWidth="1.5" />
        <text x={padL + 119} y={H + 1} fill="#FFFFFF" fontSize="8">TSB</text>
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
  const W = 700, H = 290, padL = 60, padR = 15, padT = 15, padB = 65;
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
            {/* Grid lines + Y-axis labels */}
            {[0, 0.25, 0.5, 0.75, 1].map((f) => {
              const y = padT + cH - f * cH;
              const val = Math.round(f * chartData.maxVal);
              return (
                <g key={f}>
                  <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#00D9FF" strokeOpacity="0.08" strokeWidth="0.5" />
                  <text x={padL - 6} y={y + 5} textAnchor="end" fill="#67C7EB" fontSize="16" opacity="0.8">{val.toLocaleString()}</text>
                </g>
              );
            })}
            {/* X-axis labels */}
            {(() => {
              if (goal.period === "weekly") {
                const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
                return days.map((d, i) => {
                  const x = padL + (i / 6) * cW;
                  return <text key={i} x={x} y={padT + cH + 22} textAnchor="middle" fill="#67C7EB" fontSize="16" opacity="0.8">{d}</text>;
                });
              } else {
                const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                return months.map((m, i) => {
                  const weekOfMonth = (i * 52) / 12;
                  const x = padL + (weekOfMonth / 51) * cW;
                  return <text key={i} x={x} y={padT + cH + 22} textAnchor="middle" fill="#67C7EB" fontSize="15" opacity="0.8">{m}</text>;
                });
              }
            })()}
            {/* X-axis line */}
            <line x1={padL} y1={padT + cH} x2={W - padR} y2={padT + cH} stroke="#00D9FF" strokeOpacity="0.15" strokeWidth="0.5" />
            {/* Expected line (dashed) */}
            <path
              d={chartData.points.map((p, i) => {
                const x = padL + (i / (chartData.totalDays - 1 || 1)) * cW;
                const y = padT + cH - (p.expected / chartData.maxVal) * cH;
                return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
              }).join(" ")}
              fill="none" stroke="#67C7EB" strokeWidth="2.5" strokeDasharray="6 4" opacity="0.85"
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
            {/* Data point dots with hover tooltips */}
            {chartData.points.map((p, i) => {
              const x = padL + (i / (chartData.totalDays - 1 || 1)) * cW;
              const y = padT + cH - (p.actual / chartData.maxVal) * cH;
              const label = goal.unit === "rides" ? Math.round(p.actual).toString() : p.actual < 1000 ? p.actual.toFixed(1) : Math.round(p.actual).toLocaleString();
              const expLabel = goal.unit === "rides" ? Math.round(p.expected).toString() : p.expected < 1000 ? p.expected.toFixed(1) : Math.round(p.expected).toLocaleString();
              const periodLabel = goal.period === "weekly" ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][p.day] || `Day ${p.day + 1}` : `Wk ${p.day + 1}`;
              return (
                <g key={i}>
                  <circle cx={x} cy={y} r="4" fill={statusColor} stroke="#000" strokeWidth="1" opacity="0.9" style={{ cursor: "pointer" }}>
                    <title>{`${periodLabel}: ${label} ${goal.unit} (goal pace: ${expLabel})`}</title>
                  </circle>
                  {/* Invisible larger hit area for easier hover */}
                  <circle cx={x} cy={y} r="12" fill="transparent" style={{ cursor: "pointer" }}>
                    <title>{`${periodLabel}: ${label} ${goal.unit} (goal pace: ${expLabel})`}</title>
                  </circle>
                </g>
              );
            })}
            {/* Legend */}
            <line x1={padL + 10} y1={H - 14} x2={padL + 45} y2={H - 14} stroke={statusColor} strokeWidth="2.5" />
            <text x={padL + 50} y={H - 8} fill={statusColor} fontSize="17" fontWeight="600">Actual</text>
            <line x1={padL + 130} y1={H - 14} x2={padL + 170} y2={H - 14} stroke="#67C7EB" strokeWidth="2.5" strokeDasharray="6 4" opacity="0.9" />
            <text x={padL + 175} y={H - 8} fill="#67C7EB" fontSize="17" fontWeight="600" opacity="0.95">Goal Pace</text>
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
  const [rideDaysShown, setRideDaysShown] = useState(7);
  const [rideDescriptions, setRideDescriptions] = useState<Record<number, string>>({});
  const [compareRide, setCompareRide] = useState<number | null>(null);
  const [compareStreams, setCompareStreams] = useState<Record<number, StreamData>>({});
  const [loadingCompareStreams, setLoadingCompareStreams] = useState(false);

  // Load from SQLite
  useEffect(() => {
    async function loadData() {
      const [storedActivities, tokens, storedBikes, storedZones, curveStored, storedGoals] = await Promise.all([
        api.getActivities<StravaActivity>(),
        api.getKV("strava-tokens"),
        api.getBikes<Bike>(),
        api.getKV<ZoneConfig>("strava-zones"),
        api.getKV<Record<number, number>>("strava-power-curve"),
        api.getKV<StravaGoal[]>("strava-goals"),
      ]);
      if (storedActivities.length > 0) setActivities(storedActivities);
      setConnected(!!tokens);
      if (storedBikes.length > 0) setBikes(storedBikes);
      setZones(storedZones || null);
      if (curveStored) setPowerCurve(curveStored);
      setGoals(storedGoals || DEFAULT_GOALS);
    }
    loadData();
  }, []);

  // Auto-sync on page visit
  useEffect(() => {
    if (!connected) return;
    async function autoSync() {
      const lastSync = await api.getKV<string>("strava-last-sync");
      const stale = !lastSync || (Date.now() - new Date(lastSync).getTime()) > AUTO_SYNC_INTERVAL_MS;
      if (!stale) return;
      setSyncing(true);
      setSyncMsg("Auto-syncing...");
      try {
        const acts = await syncActivities();
        setActivities(acts);
        setSyncMsg(`Synced ${acts.length} rides`);
        setTimeout(() => setSyncMsg(""), 3000);
      } catch (err) {
        console.error("Strava auto-sync failed:", err);
        setSyncMsg("Sync failed — showing cached rides");
        setTimeout(() => setSyncMsg(""), 5000);
        // Fall back to SQLite so we don't show empty state
        const stored = await api.getActivities<StravaActivity>();
        if (stored.length > 0) setActivities(stored);
      } finally {
        setSyncing(false);
      }
    }
    autoSync();
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

  // Build power curve in two phases: cached streams first, then API fetches
  const handleBuildCurve = useCallback(async () => {
    setBuildingCurve(true);
    const powerRides = activities.filter((a) => a.device_watts || a.average_watts);
    let processedIds: Set<number> = new Set();
    try {
      const stored = await api.getKV<number[]>("strava-power-curve-rides");
      if (stored) processedIds = new Set(stored);
    } catch { /* ignore */ }
    const remaining = powerRides.filter((r) => !processedIds.has(r.id));
    // Read existing curve from SQLite (not state) to avoid stale closure issues
    let bestAll: Record<number, number> = {};
    try {
      const curveStored = await api.getKV<Record<number, number>>("strava-power-curve");
      if (curveStored) bestAll = curveStored;
    } catch { /* ignore */ }
    let done = powerRides.length - remaining.length;
    const total = powerRides.length;

    const addStream = (stream: StreamData) => {
      if (!stream.watts) return;
      const best = computeBestEfforts(stream.watts);
      for (const [dur, w] of Object.entries(best)) {
        const d = Number(dur);
        if (!bestAll[d] || w > bestAll[d]) bestAll[d] = w;
      }
    };

    const saveProgress = async () => {
      setPowerCurve({ ...bestAll });
      await api.setKV("strava-power-curve", bestAll);
      await api.setKV("strava-power-curve-rides", [...processedIds]);
    };

    // Phase 1: Process all rides with cached streams (no API calls)
    const uncached: typeof remaining = [];
    setCurveProgress(`${done}/${total} (scanning cache...)`);
    await new Promise((r) => setTimeout(r, 0)); // yield for UI
    for (const ride of remaining) {
      const cached = await api.getStream(ride.id);
      if (cached) {
        try { addStream(cached as StreamData); } catch { /* ignore */ }
        processedIds.add(ride.id);
        done++;
      } else {
        uncached.push(ride);
      }
    }
    await saveProgress();
    setCurveProgress(`${done}/${total} (${uncached.length} need fetching)`);
    await new Promise((r) => setTimeout(r, 100)); // yield for UI

    // Phase 2: Fetch uncached streams from API one at a time
    if (uncached.length > 0) {
      let accessToken = await getAccessToken();
      if (!accessToken) {
        setCurveProgress(`${done}/${total} (no access token — cached only)`);
        setBuildingCurve(false);
        return;
      }
      let consecutiveFailures = 0;
      for (let i = 0; i < uncached.length; i++) {
        const ride = uncached[i];
        setCurveProgress(`${done}/${total} (fetching ${i + 1}/${uncached.length})`);

        let stream: StreamData | null = null;
        try {
          const res = await fetch("/api/strava/streams", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accessToken, activityId: ride.id }),
            signal: AbortSignal.timeout(10000),
          });
          if (res.status === 429) {
            await saveProgress();
            setCurveProgress(`${done}/${total} (rate limited, pausing 90s...)`);
            await new Promise((r) => setTimeout(r, 90000));
            accessToken = await getAccessToken() || accessToken;
            // Retry once
            try {
              const retry = await fetch("/api/strava/streams", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ accessToken, activityId: ride.id }),
                signal: AbortSignal.timeout(10000),
              });
              if (retry.ok) {
                const data = await retry.json();
                if (data?.streams) stream = data.streams as StreamData;
              }
            } catch { /* retry failed */ }
          } else if (res.ok) {
            const data = await res.json();
            if (data?.streams) stream = data.streams as StreamData;
          }
        } catch (err) {
          console.warn(`Power curve: failed to fetch ride ${ride.id}:`, err);
        }

        if (stream) {
          await api.saveStream(ride.id, stream);
          addStream(stream);
          consecutiveFailures = 0;
        } else {
          consecutiveFailures++;
        }
        processedIds.add(ride.id);
        done++;

        if (done % 10 === 0) await saveProgress();

        if (consecutiveFailures >= 5) {
          await saveProgress();
          setCurveProgress(`${done}/${total} (stopped — ${consecutiveFailures} failures in a row)`);
          setBuildingCurve(false);
          return;
        }

        // Pace: 3s between API calls
        await new Promise((r) => setTimeout(r, 3000));
      }
    }

    await saveProgress();
    await api.setKV("strava-power-curve-updated", new Date().toISOString());
    setBuildingCurve(false);
    setCurveProgress("");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activities]);

  // Auto-build/update power curve: on first load if never built, or daily for new rides
  useEffect(() => {
    if (!connected || activities.length === 0 || buildingCurve) return;
    const powerRides = activities.filter((a) => a.device_watts || a.average_watts);
    if (powerRides.length === 0) return;

    async function checkAndBuild() {
      const [lastUpdated, storedRides] = await Promise.all([
        api.getKV<string>("strava-power-curve-updated"),
        api.getKV<number[]>("strava-power-curve-rides"),
      ]);
      const hasExistingCurve = Object.keys(powerCurve).length > 0;
      const processedIds = new Set(storedRides || []);
      const hasNewRides = powerRides.some((r) => !processedIds.has(r.id));

      if (!hasExistingCurve) {
        // Never built — start building automatically
        handleBuildCurve();
      } else if (hasNewRides && lastUpdated) {
        // Has new rides — update if last update was >24h ago
        const hoursSinceUpdate = (Date.now() - new Date(lastUpdated).getTime()) / (1000 * 60 * 60);
        if (hoursSinceUpdate >= 24) {
          handleBuildCurve();
        }
      }
    }
    checkAndBuild();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, activities]);

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

  // Rides filtered by date window
  const visibleRides = useMemo(() => {
    const cutoff = Date.now() - rideDaysShown * 24 * 60 * 60 * 1000;
    return allRides.filter((r) => new Date(r.start_date).getTime() >= cutoff);
  }, [allRides, rideDaysShown]);

  const hasMoreRides = visibleRides.length < allRides.length;

  // Fetch descriptions for visible rides on the rides tab
  useEffect(() => {
    if (tab !== "rides" || visibleRides.length === 0) return;
    let cancelled = false;
    (async () => {
      const cache = await loadDescriptionCache();
      if (cancelled) return;
      const missing = visibleRides.filter((r) => rideDescriptions[r.id] === undefined && cache[r.id] === undefined);
      // Load already-cached descriptions into state
      const fromCache: Record<number, string> = {};
      for (const r of visibleRides) {
        if (cache[r.id] !== undefined && rideDescriptions[r.id] === undefined) {
          fromCache[r.id] = cache[r.id];
        }
      }
      if (Object.keys(fromCache).length > 0) {
        setRideDescriptions((prev) => ({ ...prev, ...fromCache }));
      }
      if (missing.length === 0) return;
      for (const ride of missing) {
        if (cancelled) break;
        const desc = await fetchDescription(ride.id);
        if (!cancelled && desc !== null) {
          setRideDescriptions((prev) => ({ ...prev, [ride.id]: desc }));
        }
      }
    })();
    return () => { cancelled = true; };
  }, [tab, visibleRides, rideDescriptions]);

  const handleShowMore = useCallback(() => {
    setRideDaysShown((prev) => (prev === 7 ? 28 : prev + 30));
  }, []);

  const [compareMode, setCompareMode] = useState<"workout" | "route" | null>(null);

  // Find similar rides for comparison (by name for workouts, by route polyline)
  const similarRides = useMemo(() => {
    if (!compareRide || !compareMode) return [];
    const target = allRides.find((r) => r.id === compareRide);
    if (!target) return [];
    const candidates = allRides.filter((r) => r.id !== target.id);
    if (compareMode === "workout") {
      return candidates.filter((r) => r.name === target.name).slice(0, 3);
    }
    // Route matching via summary_polyline
    const targetPoly = target.map?.summary_polyline;
    if (targetPoly && targetPoly.length > 10) {
      const routeMatches = candidates.filter((r) => {
        const poly = r.map?.summary_polyline;
        if (!poly || poly.length < 10) return false;
        const minLen = Math.min(targetPoly.length, poly.length);
        let match = 0;
        for (let i = 0; i < minLen; i++) { if (targetPoly[i] === poly[i]) match++; else break; }
        return match / minLen > 0.6;
      });
      return routeMatches.slice(0, 3);
    }
    return [];
  }, [compareRide, compareMode, allRides]);

  // Load streams for comparison rides
  const handleCompare = useCallback(async (rideId: number, mode: "workout" | "route") => {
    setCompareRide(rideId);
    setCompareMode(mode);
    const target = allRides.find((r) => r.id === rideId);
    if (!target) return;
    const candidates = allRides.filter((r) => r.id !== rideId);
    let matches: StravaActivity[];
    if (mode === "workout") {
      matches = candidates.filter((r) => r.name === target.name).slice(0, 3);
    } else {
      const targetPoly = target.map?.summary_polyline;
      if (targetPoly && targetPoly.length > 10) {
        matches = candidates.filter((r) => {
          const poly = r.map?.summary_polyline;
          if (!poly || poly.length < 10) return false;
          const minLen = Math.min(targetPoly.length, poly.length);
          let match = 0;
          for (let i = 0; i < minLen; i++) { if (targetPoly[i] === poly[i]) match++; else break; }
          return match / minLen > 0.6;
        }).slice(0, 3);
      } else {
        matches = [];
      }
    }
    if (matches.length === 0) return;
    setLoadingCompareStreams(true);
    const allIds = [rideId, ...matches.map((m) => m.id)];
    const streams: Record<number, StreamData> = {};
    for (const id of allIds) {
      if (rideStreams[id]) { streams[id] = rideStreams[id]; continue; }
      const s = await fetchStream(id);
      if (s) streams[id] = s;
    }
    setCompareStreams(streams);
    setLoadingCompareStreams(false);
  }, [allRides, rideStreams]);

  // Aggregated zone times from cached streams
  // Zone period selection and independent stream fetching
  const [zonePeriod, setZonePeriod] = useState<"week" | "month" | "year">("week");
  const [zoneStreams, setZoneStreams] = useState<Record<number, StreamData>>({});
  const [loadingZoneStreams, setLoadingZoneStreams] = useState(false);
  const [zoneStreamProgress, setZoneStreamProgress] = useState("");

  const zoneRides = useMemo(() => {
    const cutoff = zonePeriod === "week" ? thisWeekStart
      : zonePeriod === "month" ? getMonthStart(now)
      : yearStart;
    return activities.filter((a) => new Date(a.start_date) >= cutoff && (a.device_watts || a.average_watts || a.average_heartrate));
  }, [activities, zonePeriod, thisWeekStart, now, yearStart]);

  // Auto-fetch streams for zone rides when on power or fitness tab (pause during curve build)
  useEffect(() => {
    if (tab !== "power" && tab !== "fitness") return;
    if (!zones || zoneRides.length === 0) return;
    if (buildingCurve) return;
    const missing = zoneRides.filter((r) => !zoneStreams[r.id]);
    if (missing.length === 0) return;
    let cancelled = false;
    setLoadingZoneStreams(true);
    (async () => {
      let processed = 0;
      for (const ride of missing) {
        if (cancelled) break;
        const stream = await fetchStream(ride.id);
        if (stream && !cancelled) {
          setZoneStreams((prev) => ({ ...prev, [ride.id]: stream }));
        }
        processed++;
        setZoneStreamProgress(`${processed}/${missing.length} rides`);
        if (processed % 8 === 0) await new Promise((r) => setTimeout(r, 500));
      }
      if (!cancelled) {
        setLoadingZoneStreams(false);
        setZoneStreamProgress("");
      }
    })();
    return () => { cancelled = true; setLoadingZoneStreams(false); };
  }, [tab, zones, zoneRides, zoneStreams, buildingCurve]);

  const aggregatedPowerZoneTimes = useMemo(() => {
    if (!zones) return null;
    const total = new Array(zones.powerZones.length).fill(0);
    for (const ride of zoneRides) {
      const stream = zoneStreams[ride.id];
      if (stream?.watts) {
        const t = computeZoneTime(stream.watts, zones.powerZones);
        t.forEach((v, i) => (total[i] += v));
      }
    }
    return total.some((t) => t > 0) ? total : null;
  }, [zoneRides, zoneStreams, zones]);

  const aggregatedHRZoneTimes = useMemo(() => {
    if (!zones) return null;
    const total = new Array(zones.hrZones.length).fill(0);
    for (const ride of zoneRides) {
      const stream = zoneStreams[ride.id];
      if (stream?.heartrate) {
        const t = computeZoneTime(stream.heartrate, zones.hrZones);
        t.forEach((v, i) => (total[i] += v));
      }
    }
    return total.some((t) => t > 0) ? total : null;
  }, [zoneRides, zoneStreams, zones]);

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
          {connected && (
            <button
              disabled={syncing}
              onClick={async () => {
                setSyncing(true);
                setSyncMsg("Full sync...");
                try {
                  const acts = await syncActivities();
                  setActivities(acts);
                  setSyncMsg(`Synced ${acts.length} rides`);
                  setTimeout(() => setSyncMsg(""), 3000);
                } catch {
                  setSyncMsg("Sync failed");
                  setTimeout(() => setSyncMsg(""), 5000);
                } finally {
                  setSyncing(false);
                }
              }}
              className="text-xs px-3 py-1 rounded border border-[#00D9FF]/30 text-[#67C7EB] hover:text-[#00D9FF] hover:border-[#00D9FF]/50 disabled:opacity-50"
            >
              {syncing ? "Syncing..." : "Sync"}
            </button>
          )}
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
                {/* Ride list */}
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs" style={{ color: hubTheme.secondary }}>
                    {visibleRides.length} of {allRides.length} rides (last {rideDaysShown} days)
                  </p>
                  {rideDaysShown > 7 && (
                    <button onClick={() => setRideDaysShown(7)} className="text-[10px] px-2 py-0.5 rounded border border-[#00D9FF]/20 text-[#67C7EB] hover:text-[#00D9FF]">
                      Reset to 7 days
                    </button>
                  )}
                </div>
                {visibleRides.map((ride) => {
                  const isExpanded = expandedRide === ride.id;
                  const stream = rideStreams[ride.id];
                  const isLoading = loadingStream === ride.id;
                  const desc = rideDescriptions[ride.id] || "";
                  // Parse workout name and route: before Feb 25 2026, route was in the name after " on "
                  const nameOnMatch = ride.name.match(/^(.+?)\s+on\s+(.+)$/i);
                  const workoutName = nameOnMatch ? nameOnMatch[1] : ride.name;
                  const routeName = nameOnMatch ? nameOnMatch[2] : desc || "";
                  return (
                    <div key={ride.id}>
                      <button
                        onClick={() => handleExpandRide(ride.id)}
                        className="w-full text-left grid gap-x-6 px-4 py-3 rounded-lg border border-[#00D9FF]/10 bg-[rgba(0,217,255,0.03)] hover:bg-[rgba(0,217,255,0.08)] transition-colors"
                        style={{ gridTemplateColumns: "minmax(140px, 1.2fr) minmax(120px, 1fr) minmax(140px, 1fr)" }}
                      >
                        {/* Column 1: Name, Route, Date */}
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate" style={{ color: hubTheme.primary }}>{workoutName}</div>
                          {routeName && <div className="text-xs truncate" style={{ color: hubTheme.secondary }}>{routeName}</div>}
                          <div className="text-xs" style={{ color: hubTheme.secondary }}>
                            {formatDate(ride.start_date)}
                            {ride.trainer && <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-[rgba(0,217,255,0.15)] border border-[#00D9FF]/30">Indoor</span>}
                          </div>
                        </div>
                        {/* Column 2: Miles, Time, MPH, Elevation */}
                        <div className="text-xs space-y-0.5" style={{ color: hubTheme.secondary }}>
                          <div className="flex justify-between"><span>Miles:</span><span>{(ride.distance * METERS_TO_MILES).toFixed(1)}</span></div>
                          <div className="flex justify-between"><span>Time:</span><span>{formatHours(ride.moving_time)}</span></div>
                          <div className="flex justify-between"><span>Mph:</span><span>{ride.average_speed > 0 ? (ride.average_speed * MPS_TO_MPH).toFixed(1) : "--"}</span></div>
                          <div className="flex justify-between"><span>Elevation:</span><span>{ride.total_elevation_gain > 0 ? `${Math.round(ride.total_elevation_gain * METERS_TO_FEET).toLocaleString()} ft` : "--"}</span></div>
                        </div>
                        {/* Column 3: Watts, NP, Cadence, HR */}
                        <div className="text-xs space-y-0.5" style={{ color: hubTheme.secondary }}>
                          <div className="flex justify-between"><span>Average Watts:</span><span>{ride.average_watts ? Math.round(ride.average_watts) : "--"}</span></div>
                          <div className="flex justify-between"><span>Normalized Power:</span><span>{ride.weighted_average_watts ? ride.weighted_average_watts : "--"}</span></div>
                          <div className="flex justify-between"><span>Cadence:</span><span>{ride.average_cadence ? Math.round(ride.average_cadence) : "--"}</span></div>
                          <div className="flex justify-between"><span>Average Heart Rate:</span><span>{ride.average_heartrate ? Math.round(ride.average_heartrate) : "--"}</span></div>
                        </div>
                      </button>
                      {/* Comparison view — rendered directly below the ride card */}
                      {compareRide === ride.id && (() => {
                        const target = allRides.find((r) => r.id === compareRide);
                        if (!target) return null;
                        const matches = similarRides;
                        const allCompare = [target, ...matches];
                        const hasPolyline = !!target.map?.summary_polyline;
                        return (
                          <div className="hud-card rounded-lg p-6 mt-1 mb-2 border border-[#00D9FF]/20">
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="text-sm font-semibold" style={{ color: hubTheme.primary }}>
                                Comparing: {target.name} ({matches.length} past instance{matches.length !== 1 ? "s" : ""})
                              </h3>
                              <button onClick={() => { setCompareRide(null); setCompareMode(null); }} className="text-xs px-2 py-1 rounded border border-[#00D9FF]/30 text-[#67C7EB] hover:text-[#00D9FF]">
                                Close
                              </button>
                            </div>
                            {matches.length === 0 && !loadingCompareStreams && (
                              <p className="text-xs" style={{ color: hubTheme.secondary }}>No similar rides found to compare against.</p>
                            )}
                            {loadingCompareStreams && <p className="text-xs" style={{ color: hubTheme.secondary }}>Loading stream data for comparison...</p>}
                            {matches.length > 0 && (
                              <>
                                <div className="mb-4">
                                  <div className="text-xs mb-2 font-medium" style={{ color: hubTheme.primary }}>Metrics</div>
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-xs" style={{ color: hubTheme.secondary }}>
                                      <thead>
                                        <tr className="border-b border-[#00D9FF]/10">
                                          <th className="text-left py-1 pr-3" style={{ color: hubTheme.primary }}>Ride</th>
                                          <th className="text-right py-1 px-2">Date</th>
                                          <th className="text-right py-1 px-2">Dist</th>
                                          <th className="text-right py-1 px-2">Time</th>
                                          <th className="text-right py-1 px-2">Speed</th>
                                          <th className="text-right py-1 px-2">Power</th>
                                          <th className="text-right py-1 px-2">NP</th>
                                          <th className="text-right py-1 px-2">HR</th>
                                          <th className="text-right py-1 px-2">Elev</th>
                                          <th className="text-right py-1 px-2">Cal</th>
                                          <th className="text-right py-1 px-2">Cadence</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {allCompare.map((r, i) => {
                                          const prev = i < allCompare.length - 1 ? allCompare[i + 1] : undefined;
                                          const delta = (val: number | undefined, prevVal: number | undefined, decimals = 0) => {
                                            if (val === undefined || prevVal === undefined) return null;
                                            const d = val - prevVal;
                                            const fmt = decimals > 0 ? d.toFixed(decimals) : String(Math.round(d));
                                            return <span className={`ml-1 text-[9px] ${d >= 0 ? "text-green-400" : "text-red-400"}`}>({d >= 0 ? "+" : ""}{fmt})</span>;
                                          };
                                          return (
                                            <tr key={r.id} className={`border-b border-[#00D9FF]/5 ${i === 0 ? "font-medium" : ""}`} style={i === 0 ? { color: hubTheme.primary } : undefined}>
                                              <td className="py-1.5 pr-3 truncate max-w-[120px]">{i === 0 ? "Selected" : formatDate(r.start_date)}</td>
                                              <td className="text-right py-1.5 px-2">{formatDate(r.start_date)}</td>
                                              <td className="text-right py-1.5 px-2">{(r.distance * METERS_TO_MILES).toFixed(1)} mi{delta(r.distance * METERS_TO_MILES, prev ? prev.distance * METERS_TO_MILES : undefined, 1)}</td>
                                              <td className="text-right py-1.5 px-2">{formatTime(r.moving_time)}</td>
                                              <td className="text-right py-1.5 px-2">{(r.average_speed * MPS_TO_MPH).toFixed(1)}{delta(r.average_speed * MPS_TO_MPH, prev ? prev.average_speed * MPS_TO_MPH : undefined, 1)}</td>
                                              <td className="text-right py-1.5 px-2">{r.average_watts ? `${Math.round(r.average_watts)}w` : "—"}{delta(r.average_watts, prev?.average_watts)}</td>
                                              <td className="text-right py-1.5 px-2">{r.weighted_average_watts ? `${r.weighted_average_watts}w` : "—"}{delta(r.weighted_average_watts, prev?.weighted_average_watts)}</td>
                                              <td className="text-right py-1.5 px-2">{r.average_heartrate ? `${Math.round(r.average_heartrate)}` : "—"}{delta(r.average_heartrate, prev?.average_heartrate)}</td>
                                              <td className="text-right py-1.5 px-2">{Math.round(r.total_elevation_gain * METERS_TO_FEET)}{delta(r.total_elevation_gain * METERS_TO_FEET, prev ? prev.total_elevation_gain * METERS_TO_FEET : undefined)}</td>
                                              <td className="text-right py-1.5 px-2">{r.calories ? Math.round(r.calories) : "—"}{delta(r.calories, prev?.calories)}</td>
                                              <td className="text-right py-1.5 px-2">{r.average_cadence ? Math.round(r.average_cadence) : "—"}{delta(r.average_cadence, prev?.average_cadence)}</td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                                {/* Overlay charts */}
                                {!loadingCompareStreams && Object.keys(compareStreams).length > 0 && (() => {
                                  const streamList = allCompare.map((r) => compareStreams[r.id]);
                                  const dateLabels = allCompare.map((r) => formatDate(r.start_date));
                                  return (
                                    <>
                                      <div className="text-xs mb-2 font-medium" style={{ color: hubTheme.primary }}>Stream Overlays</div>
                                      <OverlayChart
                                        series={streamList.map((s) => s?.watts)}
                                        labels={dateLabels} color="#FFD700" label="Power (watts)" unit="w"
                                      />
                                      <OverlayChart
                                        series={streamList.map((s) => s?.heartrate)}
                                        labels={dateLabels} color="#FF4444" label="Heart Rate (bpm)" unit="bpm"
                                      />
                                      <OverlayChart
                                        series={streamList.map((s) => s?.cadence)}
                                        labels={dateLabels} color="#00FF88" label="Cadence (rpm)" unit="rpm"
                                      />
                                      {hasPolyline && (
                                        <OverlayChart
                                          series={streamList.map((s) => s?.velocity_smooth?.map((v) => v * MPS_TO_MPH))}
                                          labels={dateLabels} color="#67C7EB" label="Speed (mph)" unit="mph"
                                        />
                                      )}
                                      {/* Zone comparisons */}
                                      {zones && (() => {
                                        const powerTimesAll = streamList.map((s) => s?.watts ? computeZoneTime(s.watts, zones.powerZones) : new Array(zones.powerZones.length).fill(0));
                                        const hrTimesAll = streamList.map((s) => s?.heartrate ? computeZoneTime(s.heartrate, zones.hrZones) : new Array(zones.hrZones.length).fill(0));
                                        const hasPower = powerTimesAll.some((t) => t.some((v) => v > 0));
                                        const hasHR = hrTimesAll.some((t) => t.some((v) => v > 0));
                                        return (
                                          <>
                                            {hasPower && (
                                              <ZoneCompareGrouped
                                                title="Power Zones" zones={zones.powerZones}
                                                allTimes={powerTimesAll} dateLabels={dateLabels} colors={POWER_ZONE_COLORS}
                                              />
                                            )}
                                            {hasHR && (
                                              <ZoneCompareGrouped
                                                title="HR Zones" zones={zones.hrZones}
                                                allTimes={hrTimesAll} dateLabels={dateLabels} colors={HR_ZONE_COLORS}
                                              />
                                            )}
                                          </>
                                        );
                                      })()}
                                    </>
                                  );
                                })()}
                              </>
                            )}
                          </div>
                        );
                      })()}
                      {isExpanded && (
                        <div className="hud-card rounded-lg p-4 mt-1 mb-2 border border-[#00D9FF]/20">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex gap-2">
                              {allRides.filter((r) => r.id !== ride.id && r.name === ride.name).length > 0 && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleCompare(ride.id, "workout"); }}
                                  className="px-3 py-1.5 rounded text-xs border border-[#00D9FF]/50 bg-[rgba(0,217,255,0.15)] text-[#00D9FF] hover:bg-[rgba(0,217,255,0.25)]"
                                >
                                  Compare Workout
                                </button>
                              )}
                              {(() => {
                                const targetPoly = ride.map?.summary_polyline;
                                if (!targetPoly || targetPoly.length <= 10) return null;
                                const hasRouteMatch = allRides.some((r) => {
                                  if (r.id === ride.id) return false;
                                  const poly = r.map?.summary_polyline;
                                  if (!poly || poly.length < 10) return false;
                                  const minLen = Math.min(targetPoly.length, poly.length);
                                  let match = 0;
                                  for (let i = 0; i < minLen; i++) { if (targetPoly[i] === poly[i]) match++; else break; }
                                  return match / minLen > 0.6;
                                });
                                if (!hasRouteMatch) return null;
                                return (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleCompare(ride.id, "route"); }}
                                    className="px-3 py-1.5 rounded text-xs border border-[#00D9FF]/50 bg-[rgba(0,217,255,0.15)] text-[#00D9FF] hover:bg-[rgba(0,217,255,0.25)]"
                                  >
                                    Compare Route
                                  </button>
                                );
                              })()}
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); setExpandedRide(null); }}
                              className="px-2 py-1 rounded text-xs border border-[#00D9FF]/30 text-[#67C7EB] hover:text-[#00D9FF] hover:border-[#00D9FF]/50"
                            >
                              Close
                            </button>
                          </div>
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
                                  <ZoneBar zones={zones.powerZones} times={computeZoneTime(stream.watts, zones.powerZones)} colors={POWER_ZONE_COLORS} unit="w" />
                                </div>
                              )}
                              {zones && stream.heartrate && (
                                <div className="mt-3">
                                  <div className="text-xs mb-2" style={{ color: hubTheme.primary }}>HR Zones</div>
                                  <ZoneBar zones={zones.hrZones} times={computeZoneTime(stream.heartrate, zones.hrZones)} colors={HR_ZONE_COLORS} unit="bpm" />
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {hasMoreRides && (
                  <button
                    onClick={handleShowMore}
                    className="w-full py-3 rounded-lg border border-[#00D9FF]/20 text-xs text-[#00D9FF] hover:bg-[rgba(0,217,255,0.08)] transition-colors"
                  >
                    Show More ({allRides.length - visibleRides.length} older rides)
                  </button>
                )}
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
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold" style={{ color: hubTheme.primary }}>Power Zones (FTP: {zones.ftp}w)</h3>
                      <div className="flex gap-1">
                        {([["week", "Week"], ["month", "Month"], ["year", "Year"]] as const).map(([key, label]) => (
                          <button key={key} onClick={() => setZonePeriod(key)} className={`px-3 py-1 rounded text-xs transition-colors ${zonePeriod === key ? "bg-[rgba(0,217,255,0.25)] text-[#00D9FF] border border-[#00D9FF]/50" : "text-[#67C7EB] hover:text-[#00D9FF]"}`}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {loadingZoneStreams && (
                      <p className="text-xs mb-2" style={{ color: hubTheme.secondary }}>Loading streams... {zoneStreamProgress}</p>
                    )}
                    {aggregatedPowerZoneTimes ? (
                      <ZoneBar zones={zones.powerZones} times={aggregatedPowerZoneTimes} colors={POWER_ZONE_COLORS} unit="w" />
                    ) : (
                      <p className="text-sm" style={{ color: hubTheme.secondary }}>
                        {loadingZoneStreams ? "Fetching ride data..." : zoneRides.length === 0 ? "No rides with power data in this period." : "No stream data available yet."}
                      </p>
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
                        <StatCard label="Form (TSB)" value={String(Math.round(fitnessData[fitnessData.length - 1].tsb))} sub={fitnessData[fitnessData.length - 1].tsb > -10 ? "Fresh" : fitnessData[fitnessData.length - 1].tsb > -30 ? "Training Load" : "Overreaching"} />
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
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold" style={{ color: hubTheme.primary }}>HR Zones (Max: {zones.maxHR} bpm)</h3>
                          <div className="flex gap-1">
                            {([["week", "Week"], ["month", "Month"], ["year", "Year"]] as const).map(([key, label]) => (
                              <button key={key} onClick={() => setZonePeriod(key)} className={`px-3 py-1 rounded text-xs transition-colors ${zonePeriod === key ? "bg-[rgba(0,217,255,0.25)] text-[#00D9FF] border border-[#00D9FF]/50" : "text-[#67C7EB] hover:text-[#00D9FF]"}`}>
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                        {loadingZoneStreams && (
                          <p className="text-xs mb-2" style={{ color: hubTheme.secondary }}>Loading streams... {zoneStreamProgress}</p>
                        )}
                        {aggregatedHRZoneTimes ? (
                          <ZoneBar zones={zones.hrZones} times={aggregatedHRZoneTimes} colors={HR_ZONE_COLORS} unit="bpm" />
                        ) : (
                          <p className="text-sm" style={{ color: hubTheme.secondary }}>
                            {loadingZoneStreams ? "Fetching ride data..." : zoneRides.length === 0 ? "No rides with HR data in this period." : "No stream data available yet."}
                          </p>
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
        {/* Settings link */}
        <div className="flex justify-center mt-8 mb-4">
          <Link href="/settings#strava" title="Strava Settings" className="group flex items-center gap-2 px-4 py-2 rounded-lg border border-[#00D9FF]/20 hover:border-[#00D9FF]/50 hover:bg-[rgba(0,217,255,0.08)] transition-colors">
            <svg viewBox="0 0 48 48" fill="none" stroke="#67C7EB" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 group-hover:stroke-[#00D9FF] transition-colors" aria-hidden>
              <circle cx="24" cy="24" r="18" strokeWidth="1.25" fill="none" />
              <line x1="16" y1="18" x2="32" y2="18" strokeWidth="2.25" />
              <circle cx="22" cy="18" r="2.5" strokeWidth="2.25" fill="none" />
              <line x1="16" y1="24" x2="32" y2="24" strokeWidth="2.25" />
              <circle cx="28" cy="24" r="2.5" strokeWidth="2.25" fill="none" />
              <line x1="16" y1="30" x2="32" y2="30" strokeWidth="2.25" />
              <circle cx="24" cy="30" r="2.5" strokeWidth="2.25" fill="none" />
            </svg>
            <span className="text-xs group-hover:text-[#00D9FF] transition-colors" style={{ color: "#67C7EB" }}>Settings</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
