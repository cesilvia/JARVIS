"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navigation from "../../components/Navigation";
import SettingsNavIcon from "../SettingsNavIcon";
import * as api from "../../lib/api-client";
import {
  ZoneConfig, ZoneBand,
  buildDefaultPowerZones, buildDefaultHRZones,
  StravaGoal, DEFAULT_GOALS,
} from "../../bike/strava/types";

const METERS_TO_MILES = 1 / 1609.34;

// Strava wordmark
const StravaIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
    <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
  </svg>
);

// Bike wheel icon for quick-nav — matches hub JarvisBikeWheelIcon
const BikeWheelIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <div className={`${className} relative flex items-center justify-center`}>
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" className="absolute inset-0 w-full h-full" aria-hidden>
      <circle cx="24" cy="24" r="18" strokeWidth="1.25" fill="none" />
    </svg>
    <div
      className="w-[62%] h-[62%]"
      style={{
        backgroundColor: "currentColor",
        WebkitMaskImage: "url('/assets/bike-wheel.svg')",
        maskImage: "url('/assets/bike-wheel.svg')",
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
    />
  </div>
);

export default function CyclingSettingsPage() {
  const [stravaConnected, setStravaConnected] = useState(false);
  const [stravaSyncing, setStravaSyncing] = useState(false);
  const [stravaError, setStravaError] = useState("");
  const [stravaLastSync, setStravaLastSync] = useState<string | null>(null);
  const [ftp, setFtp] = useState("");
  const [maxHR, setMaxHR] = useState("");
  const [powerZones, setPowerZones] = useState<ZoneBand[]>([]);
  const [hrZones, setHRZones] = useState<ZoneBand[]>([]);
  const [zonesSaved, setZonesSaved] = useState(false);
  const [goals, setGoals] = useState<StravaGoal[]>(DEFAULT_GOALS);
  const [goalsSaved, setGoalsSaved] = useState(false);

  useEffect(() => {
    async function loadData() {
      const tokens = await api.getKV("strava-tokens");
      setStravaConnected(!!tokens);
      const lastSync = await api.getKV<string>("strava-last-sync");
      setStravaLastSync(lastSync);
      const existingZones = await api.getKV<ZoneConfig>("strava-zones");
      if (existingZones) {
        setFtp(String(existingZones.ftp));
        setMaxHR(String(existingZones.maxHR));
        setPowerZones(existingZones.powerZones);
        setHRZones(existingZones.hrZones);
      }
      const savedGoals = await api.getKV<StravaGoal[]>("strava-goals");
      if (savedGoals) setGoals(savedGoals);
    }
    loadData();
  }, []);

  // Handle Strava OAuth callback hash
  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    if (!hash) return;
    const params = new URLSearchParams(hash.slice(1));
    const accessToken = params.get("strava_access_token");
    const refreshToken = params.get("strava_refresh_token");
    const expiresAt = params.get("strava_expires_at");
    if (accessToken && refreshToken && expiresAt) {
      const tokens = { accessToken, refreshToken, expiresAt: parseInt(expiresAt, 10) };
      api.setKV("strava-tokens", tokens);
      setStravaConnected(true);
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, []);

  // Handle Strava error in query params
  useEffect(() => {
    const err = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("strava_error") : null;
    if (err) {
      setStravaError(decodeURIComponent(err));
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  const handleStravaSync = async () => {
    const stored = await api.getKV<{ accessToken: string; refreshToken: string; expiresAt: number }>("strava-tokens");
    if (!stored) return;
    setStravaSyncing(true);
    setStravaError("");
    try {
      let accessToken = stored.accessToken;
      const expiresIn = stored.expiresAt - Math.floor(Date.now() / 1000);
      if (expiresIn < 3600) {
        const refreshRes = await fetch("/api/strava/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: stored.refreshToken }),
        });
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          accessToken = data.accessToken;
          const newTokens = { accessToken: data.accessToken, refreshToken: data.refreshToken, expiresAt: data.expiresAt };
          await api.setKV("strava-tokens", newTokens);
        }
      }
      const [activitiesRes, gearRes] = await Promise.all([
        fetch("/api/strava/activities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken }),
        }),
        fetch("/api/strava/gear", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken }),
        }),
      ]);
      if (!activitiesRes.ok) throw new Error((await activitiesRes.json().catch(() => ({}))).error || `Activities: ${activitiesRes.status}`);
      if (!gearRes.ok) throw new Error((await gearRes.json().catch(() => ({}))).error || `Gear: ${gearRes.status}`);

      const { activities } = await activitiesRes.json();
      const { gear } = await gearRes.json();

      await api.saveActivities(activities);

      const gearList = (gear || []).map((g: { id: string; name: string }) => ({ id: g.id, name: g.name }));
      await api.setKV("strava-gear", gearList);

      const byGear: Record<string, { total: number; indoor: number; road: number }> = {};
      for (const a of activities) {
        const gearId = a.gear_id || "unassigned";
        if (!byGear[gearId]) byGear[gearId] = { total: 0, indoor: 0, road: 0 };
        const miles = (a.distance || 0) * METERS_TO_MILES;
        byGear[gearId].total += miles;
        if (a.trainer) byGear[gearId].indoor += miles;
        else byGear[gearId].road += miles;
      }

      const now = new Date().toISOString();
      let currentBikes = await api.getBikes<{ stravaGearId?: string; [key: string]: unknown }>();
      currentBikes = currentBikes.map((b) => {
        const gearId = b.stravaGearId;
        if (!gearId || !byGear[gearId]) return b;
        const { total, indoor, road } = byGear[gearId];
        return { ...b, totalMiles: Math.round(total * 10) / 10, indoorMiles: Math.round(indoor * 10) / 10, roadMiles: Math.round(road * 10) / 10, lastSyncAt: now };
      });
      await api.saveBikes(currentBikes);
      await api.setKV("strava-last-sync", now);
      setStravaLastSync(now);
    } catch (err) {
      setStravaError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setStravaSyncing(false);
    }
  };

  const handleStravaDisconnect = async () => {
    if (confirm("Disconnect Strava? Mileage data will remain but you won't be able to sync.")) {
      await api.deleteKV("strava-tokens");
      setStravaConnected(false);
    }
  };

  const handleFtpChange = (val: string) => {
    setFtp(val);
    const n = parseInt(val, 10);
    if (n > 0) setPowerZones(buildDefaultPowerZones(n));
  };

  const handleMaxHRChange = (val: string) => {
    setMaxHR(val);
    const n = parseInt(val, 10);
    if (n > 0) setHRZones(buildDefaultHRZones(n));
  };

  const handleZoneBoundaryChange = (type: "power" | "hr", index: number, field: "min" | "max", value: string) => {
    const setter = type === "power" ? setPowerZones : setHRZones;
    setter((prev) => prev.map((z, i) => i === index ? { ...z, [field]: parseInt(value, 10) || 0 } : z));
  };

  const handleResetZone = (type: "power" | "hr", index: number) => {
    const setter = type === "power" ? setPowerZones : setHRZones;
    setter((prev) => prev.map((z, i) => i === index ? { ...z, min: z.defaultMin, max: z.defaultMax } : z));
  };

  const handleGoalChange = (index: number, value: string) => {
    setGoals((prev) => prev.map((g, i) => i === index ? { ...g, target: parseInt(value, 10) || 0 } : g));
  };

  const handleSaveGoals = async () => {
    await api.setKV("strava-goals", goals);
    setGoalsSaved(true);
    setTimeout(() => setGoalsSaved(false), 3000);
  };

  const handleResetGoals = async () => {
    setGoals(DEFAULT_GOALS);
    await api.setKV("strava-goals", DEFAULT_GOALS);
    setGoalsSaved(true);
    setTimeout(() => setGoalsSaved(false), 3000);
  };

  const handleSaveZones = async () => {
    const ftpNum = parseInt(ftp, 10);
    const maxHRNum = parseInt(maxHR, 10);
    if (!ftpNum || !maxHRNum) return;
    const config: ZoneConfig = { ftp: ftpNum, maxHR: maxHRNum, zonesUpdatedAt: new Date().toISOString(), powerZones, hrZones };
    await api.setKV("strava-zones", config);
    setZonesSaved(true);
    setTimeout(() => setZonesSaved(false), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Navigation />

        {/* Quick Nav */}
        <div className="flex items-center justify-end mt-4 mb-6">
          <div className="flex items-center gap-3">
            <Link href="/bike" className="text-slate-400 hover:text-orange-400 transition-colors" title="Bike Dashboard">
              <BikeWheelIcon className="w-7 h-7" />
            </Link>
            <Link href="/bike/strava" className="text-slate-400 hover:text-orange-500 transition-colors" title="Strava Dashboard">
              <StravaIcon className="w-5 h-5" />
            </Link>
          </div>
        </div>

        <h1 className="text-3xl font-bold font-mono text-orange-400">Cycling</h1>
        <p className="text-slate-400 mt-2 font-mono text-sm mb-8">
          Strava connection and training zone configuration.
        </p>

        {/* Strava Section */}
        <section className="border border-slate-700 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold font-mono text-slate-100 mb-2">Strava</h2>
          <p className="text-slate-400 font-mono text-sm mb-4">
            Connect and sync your cycling data from Strava.
          </p>
          {stravaError && (
            <p className="text-red-400 font-mono text-xs mb-3">{stravaError}</p>
          )}
          {stravaConnected ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-green-400" />
                <span className="text-green-400 font-mono text-sm">Connected</span>
              </div>
              {stravaLastSync && (
                <p className="text-slate-500 font-mono text-xs">
                  Last synced: {new Date(stravaLastSync).toLocaleDateString()} at{" "}
                  {new Date(stravaLastSync).toLocaleTimeString()}
                </p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={handleStravaSync}
                  disabled={stravaSyncing}
                  className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-100 font-mono text-sm transition-colors disabled:opacity-50"
                >
                  {stravaSyncing ? "Syncing..." : "Sync from Strava"}
                </button>
                <button
                  onClick={handleStravaDisconnect}
                  className="px-4 py-2 rounded-lg bg-red-900/50 hover:bg-red-800/50 text-red-300 font-mono text-sm transition-colors"
                >
                  Disconnect
                </button>
              </div>
            </div>
          ) : (
            <a
              href="/api/strava/auth"
              className="inline-block px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-100 font-mono text-sm transition-colors"
            >
              Connect Strava
            </a>
          )}
        </section>

        {/* Goals Section */}
        <section className="border border-slate-700 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold font-mono text-slate-100 mb-2">Goals</h2>
          <p className="text-slate-400 font-mono text-sm mb-4">
            Set your cycling goals. Progress is tracked on the Strava overview page.
          </p>
          <div className="space-y-3">
            {goals.map((goal, i) => (
              <div key={goal.key} className="flex items-center gap-3">
                <span className="w-40 text-slate-400 font-mono text-sm truncate">{goal.label}</span>
                <input
                  type="number"
                  value={goal.target}
                  onChange={(e) => handleGoalChange(i, e.target.value)}
                  className="w-24 px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-slate-100 font-mono text-sm text-right"
                />
                <span className="text-slate-500 font-mono text-sm">{goal.unit}/{goal.period === "weekly" ? "week" : "year"}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-4">
            <button onClick={handleSaveGoals} className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-100 font-mono text-sm transition-colors">
              Save Goals
            </button>
            <button onClick={handleResetGoals} className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 font-mono text-sm transition-colors">
              Reset Defaults
            </button>
            {goalsSaved && <span className="text-green-400 font-mono text-xs">Saved!</span>}
          </div>
        </section>

        {/* Training Zones Section */}
        <section className="border border-slate-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold font-mono text-slate-100 mb-2">Training Zones</h2>
          <p className="text-slate-400 font-mono text-sm mb-4">
            Set your FTP and Max HR. Default zones are auto-calculated; override any boundary manually.
          </p>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-slate-400 font-mono text-xs block mb-1">FTP (watts)</label>
              <input type="number" value={ftp} onChange={(e) => handleFtpChange(e.target.value)} placeholder="e.g. 250" className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-slate-100 font-mono text-sm" />
            </div>
            <div>
              <label className="text-slate-400 font-mono text-xs block mb-1">Max HR (bpm)</label>
              <input type="number" value={maxHR} onChange={(e) => handleMaxHRChange(e.target.value)} placeholder="e.g. 185" className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-slate-100 font-mono text-sm" />
            </div>
          </div>
          {powerZones.length > 0 && (
            <div className="mb-4">
              <h3 className="text-slate-300 font-mono text-sm mb-2">Power Zones</h3>
              <div className="space-y-1.5">
                {powerZones.map((z, i) => {
                  const isCustom = z.min !== z.defaultMin || z.max !== z.defaultMax;
                  return (
                    <div key={z.name} className="flex items-center gap-2 text-xs font-mono">
                      <span className="w-36 text-slate-400 truncate">{z.name}</span>
                      <input type="number" value={z.min} onChange={(e) => handleZoneBoundaryChange("power", i, "min", e.target.value)} className="w-16 px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-100 text-center" />
                      <span className="text-slate-500">&ndash;</span>
                      <input type="number" value={z.max >= 9999 ? "" : z.max} placeholder="max" onChange={(e) => handleZoneBoundaryChange("power", i, "max", e.target.value || "9999")} className="w-16 px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-100 text-center" />
                      <span className="text-slate-500">w</span>
                      {isCustom && <button onClick={() => handleResetZone("power", i)} className="text-slate-500 hover:text-slate-300 text-[10px]">reset</button>}
                      {isCustom && <span className="text-amber-400 text-[10px]">custom</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {hrZones.length > 0 && (
            <div className="mb-4">
              <h3 className="text-slate-300 font-mono text-sm mb-2">HR Zones</h3>
              <div className="space-y-1.5">
                {hrZones.map((z, i) => {
                  const isCustom = z.min !== z.defaultMin || z.max !== z.defaultMax;
                  return (
                    <div key={z.name} className="flex items-center gap-2 text-xs font-mono">
                      <span className="w-36 text-slate-400 truncate">{z.name}</span>
                      <input type="number" value={z.min} onChange={(e) => handleZoneBoundaryChange("hr", i, "min", e.target.value)} className="w-16 px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-100 text-center" />
                      <span className="text-slate-500">&ndash;</span>
                      <input type="number" value={z.max} onChange={(e) => handleZoneBoundaryChange("hr", i, "max", e.target.value)} className="w-16 px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-100 text-center" />
                      <span className="text-slate-500">bpm</span>
                      {isCustom && <button onClick={() => handleResetZone("hr", i)} className="text-slate-500 hover:text-slate-300 text-[10px]">reset</button>}
                      {isCustom && <span className="text-amber-400 text-[10px]">custom</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {(parseInt(ftp, 10) > 0 && parseInt(maxHR, 10) > 0) && (
            <div className="flex items-center gap-3">
              <button onClick={handleSaveZones} className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-100 font-mono text-sm transition-colors">
                Save Zones
              </button>
              {zonesSaved && <span className="text-green-400 font-mono text-xs">Saved! Reminder set for 28 days.</span>}
            </div>
          )}
        </section>
      </div>
      <SettingsNavIcon />
    </div>
  );
}
