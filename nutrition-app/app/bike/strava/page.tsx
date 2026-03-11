"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navigation from "../../components/Navigation";
import CircuitBackground from "../../hub/CircuitBackground";
import CyclingIcon from "../CyclingIcon";

const hubTheme = {
  primary: "#00D9FF",
  secondary: "#67C7EB",
  background: "#000000",
};

const BIKES_STORAGE_KEY = "jarvis-bikes";
const STRAVA_TOKENS_KEY = "jarvis-strava-tokens";
const STRAVA_GEAR_KEY = "jarvis-strava-gear";
const METERS_TO_MILES = 1 / 1609.34;

interface Bike {
  id: string;
  name: string;
  type: string;
  stravaGearId?: string;
  totalMiles?: number;
  indoorMiles?: number;
  roadMiles?: number;
  lastSyncAt?: string;
  [key: string]: unknown;
}

interface StravaGearOption {
  id: string;
  name: string;
}

export default function StravaPage() {
  const [stravaTokens, setStravaTokens] = useState<{ accessToken: string; refreshToken: string; expiresAt: number } | null>(null);
  const [stravaGearOptions, setStravaGearOptions] = useState<StravaGearOption[]>([]);
  const [stravaSyncing, setStravaSyncing] = useState(false);
  const [stravaError, setStravaError] = useState<string | null>(null);
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STRAVA_TOKENS_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.accessToken && parsed.refreshToken) {
          setStravaTokens(parsed);
        }
      } catch {
        localStorage.removeItem(STRAVA_TOKENS_KEY);
      }
    }
    const gearStored = localStorage.getItem(STRAVA_GEAR_KEY);
    if (gearStored) {
      try {
        setStravaGearOptions(JSON.parse(gearStored));
      } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(BIKES_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Bike[];
        setBikes(parsed);
        const synced = parsed.filter((b) => b.lastSyncAt).sort((a, b) => (b.lastSyncAt ?? "").localeCompare(a.lastSyncAt ?? ""));
        if (synced.length > 0) setLastSync(synced[0].lastSyncAt!);
      } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    if (!hash) return;
    const params = new URLSearchParams(hash.slice(1));
    const accessToken = params.get("strava_access_token");
    const refreshToken = params.get("strava_refresh_token");
    const expiresAt = params.get("strava_expires_at");
    if (accessToken && refreshToken && expiresAt) {
      const tokens = { accessToken, refreshToken, expiresAt: parseInt(expiresAt, 10) };
      setStravaTokens(tokens);
      localStorage.setItem(STRAVA_TOKENS_KEY, JSON.stringify(tokens));
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, []);

  useEffect(() => {
    const err = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("strava_error") : null;
    if (err) {
      const decoded = decodeURIComponent(err);
      const friendly: Record<string, string> = {
        config: "Strava not configured. Add STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET to .env.local and restart.",
        no_code: "Strava authorization was cancelled or failed. Try connecting again.",
        access_denied: "Strava authorization was denied.",
      };
      setStravaError(friendly[decoded] || decoded);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  const disconnectStrava = () => {
    if (confirm("Disconnect Strava? Mileage data will remain but you won't be able to sync.")) {
      setStravaTokens(null);
      setStravaGearOptions([]);
      localStorage.removeItem(STRAVA_TOKENS_KEY);
    }
  };

  const syncFromStrava = async () => {
    if (!stravaTokens?.accessToken) return;
    setStravaSyncing(true);
    setStravaError(null);
    try {
      let accessToken = stravaTokens.accessToken;
      const expiresIn = stravaTokens.expiresAt - Math.floor(Date.now() / 1000);
      if (expiresIn < 3600) {
        const refreshRes = await fetch("/api/strava/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: stravaTokens.refreshToken }),
        });
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          accessToken = data.accessToken;
          const newTokens = {
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            expiresAt: data.expiresAt,
          };
          setStravaTokens(newTokens);
          localStorage.setItem(STRAVA_TOKENS_KEY, JSON.stringify(newTokens));
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

      if (!activitiesRes.ok) {
        const err = await activitiesRes.json().catch(() => ({}));
        throw new Error(err.error || `Activities: ${activitiesRes.status}`);
      }
      if (!gearRes.ok) {
        const err = await gearRes.json().catch(() => ({}));
        throw new Error(err.error || `Gear: ${gearRes.status}`);
      }

      const { activities } = await activitiesRes.json();
      const { gear } = await gearRes.json();

      const gearList = (gear || []).map((g: { id: string; name: string }) => ({ id: g.id, name: g.name }));
      setStravaGearOptions(gearList);
      localStorage.setItem(STRAVA_GEAR_KEY, JSON.stringify(gearList));

      const byGear: Record<string, { total: number; indoor: number; road: number }> = {};
      for (const a of activities) {
        const gearId = a.gear_id || "unassigned";
        if (!byGear[gearId]) byGear[gearId] = { total: 0, indoor: 0, road: 0 };
        const miles = (a.distance || 0) * METERS_TO_MILES;
        byGear[gearId].total += miles;
        if (a.trainer) {
          byGear[gearId].indoor += miles;
        } else {
          byGear[gearId].road += miles;
        }
      }

      const now = new Date().toISOString();
      const stored = localStorage.getItem(BIKES_STORAGE_KEY);
      let currentBikes: Bike[] = stored ? JSON.parse(stored) : [];
      currentBikes = currentBikes.map((b) => {
        const gearId = b.stravaGearId;
        if (!gearId || !byGear[gearId]) return b;
        const { total, indoor, road } = byGear[gearId];
        return {
          ...b,
          totalMiles: Math.round(total * 10) / 10,
          indoorMiles: Math.round(indoor * 10) / 10,
          roadMiles: Math.round(road * 10) / 10,
          lastSyncAt: now,
        };
      });
      localStorage.setItem(BIKES_STORAGE_KEY, JSON.stringify(currentBikes));
      setBikes(currentBikes);
      setLastSync(now);
    } catch (err) {
      setStravaError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setStravaSyncing(false);
    }
  };

  const linkedBikes = bikes.filter((b) => b.stravaGearId);

  return (
    <div className="min-h-screen hud-scifi-bg relative" style={{ backgroundColor: hubTheme.background, color: hubTheme.primary }}>
      <CircuitBackground />
      <main className="container mx-auto px-4 py-8 max-w-4xl relative z-10">
        <div className="grid grid-cols-3 items-center gap-4 mb-8">
          <div className="flex justify-start w-20 h-20 min-w-20 min-h-20">
            <Navigation />
          </div>
          <h2 className="text-2xl font-semibold hud-text text-center">Strava</h2>
          <div className="flex justify-end">
            <Link href="/bike" title="Cycling" aria-label="Cycling" className="inline-flex items-center justify-center transition-transform hover:scale-110" style={{ width: 80, height: 80, minWidth: 80, minHeight: 80 }}>
              <CyclingIcon className="shrink-0" style={{ width: 80, height: 80, minWidth: 80, minHeight: 80 }} stroke={hubTheme.primary} />
            </Link>
          </div>
        </div>

        <div className="hud-card rounded-lg p-6 mb-6 border border-[#00D9FF]/20">
          <h3 className="text-lg font-semibold text-[#00D9FF] mb-4">Mileage from Strava</h3>
          {stravaError && (
            <p className="text-red-400 text-sm mb-3">{stravaError}</p>
          )}
          {stravaTokens ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-[#67C7EB] text-sm">Connected to Strava</span>
                <button
                  type="button"
                  onClick={syncFromStrava}
                  disabled={stravaSyncing}
                  className="px-4 py-2 rounded-lg border border-[#00D9FF]/50 bg-[rgba(0,217,255,0.15)] text-[#00D9FF] hover:bg-[rgba(0,217,255,0.25)] text-sm disabled:opacity-50"
                >
                  {stravaSyncing ? "Syncing…" : "Sync from Strava"}
                </button>
                <button
                  type="button"
                  onClick={disconnectStrava}
                  className="px-4 py-2 text-[#67C7EB] hover:text-[#00D9FF] text-sm"
                >
                  Disconnect
                </button>
              </div>
              {lastSync && (
                <p className="text-[#67C7EB]/80 text-xs">
                  Last synced: {new Date(lastSync).toLocaleString()}
                </p>
              )}
            </div>
          ) : (
            <a
              href="/api/strava/auth"
              className="inline-block px-4 py-2 rounded-lg border border-[#00D9FF]/50 bg-[rgba(0,217,255,0.15)] text-[#00D9FF] hover:bg-[rgba(0,217,255,0.25)] text-sm"
            >
              Connect Strava
            </a>
          )}
          <p className="text-[#67C7EB]/80 text-xs mt-3">
            Link each bike to a Strava bike in the Component list (Edit mode). Sync to pull total, indoor, and road miles.
          </p>
          <p className="text-[#67C7EB]/60 text-xs mt-1">
            Setup: Add STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET to .env.local. In Strava API settings, set Authorization Callback Domain to <code className="bg-black/30 px-1 rounded">localhost</code> for local dev.
          </p>
        </div>

        {linkedBikes.length > 0 && (
          <div className="hud-card rounded-lg p-6 mb-6 border border-[#00D9FF]/20">
            <h3 className="text-lg font-semibold text-[#00D9FF] mb-4">Linked bikes</h3>
            <ul className="space-y-3">
              {linkedBikes.map((bike) => (
                <li key={bike.id} className="flex items-center justify-between px-4 py-3 rounded-lg border border-[#00D9FF]/10 bg-[rgba(0,217,255,0.03)]">
                  <div>
                    <span className="font-medium text-[#00D9FF]">{bike.name}</span>
                    <span className="text-[#67C7EB] text-sm ml-2">{bike.type}</span>
                  </div>
                  <div className="text-right text-xs text-[#67C7EB]">
                    {bike.totalMiles != null && <span>{bike.totalMiles.toFixed(1)} mi total</span>}
                    {bike.indoorMiles != null && bike.indoorMiles > 0 && <span className="ml-2">{bike.indoorMiles.toFixed(1)} indoor</span>}
                    {bike.roadMiles != null && bike.roadMiles > 0 && <span className="ml-2">{bike.roadMiles.toFixed(1)} road</span>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {stravaGearOptions.length > 0 && (
          <div className="hud-card rounded-lg p-6 mb-6 border border-[#00D9FF]/20">
            <h3 className="text-lg font-semibold text-[#00D9FF] mb-4">Strava gear</h3>
            <p className="text-[#67C7EB]/80 text-xs mb-3">
              These are your bikes on Strava. Link them to your component list bikes via Edit mode.
            </p>
            <ul className="space-y-2">
              {stravaGearOptions.map((g) => (
                <li key={g.id} className="text-sm text-[#00D9FF]">{g.name} <span className="text-[#67C7EB]/60">({g.id})</span></li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
