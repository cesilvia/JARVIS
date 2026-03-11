"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navigation from "../components/Navigation";
import { useRouter } from "next/navigation";

const JARVIS_LAST_BACKUP_KEY = "jarvis-last-nutrition-backup";
const STRAVA_TOKENS_KEY = "jarvis-strava-tokens";
const STRAVA_ACTIVITIES_KEY = "jarvis-strava-activities";
const STRAVA_GEAR_KEY = "jarvis-strava-gear";
const BIKES_STORAGE_KEY = "jarvis-bikes";
const METERS_TO_MILES = 1 / 1609.34;

export default function SettingsPage() {
  const router = useRouter();
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [biometricRegistered, setBiometricRegistered] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [registeringBiometric, setRegisteringBiometric] = useState(false);
  const [biometricMessage, setBiometricMessage] = useState("");
  const [stravaConnected, setStravaConnected] = useState(false);
  const [stravaSyncing, setStravaSyncing] = useState(false);
  const [stravaError, setStravaError] = useState("");
  const [stravaLastSync, setStravaLastSync] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setLastBackup(localStorage.getItem(JARVIS_LAST_BACKUP_KEY));
      const tokens = localStorage.getItem(STRAVA_TOKENS_KEY);
      setStravaConnected(!!tokens);
      // Derive last sync from bikes
      const bikesRaw = localStorage.getItem(BIKES_STORAGE_KEY);
      if (bikesRaw) {
        try {
          const bikes = JSON.parse(bikesRaw);
          const synced = bikes.filter((b: { lastSyncAt?: string }) => b.lastSyncAt).sort((a: { lastSyncAt?: string }, b: { lastSyncAt?: string }) => (b.lastSyncAt ?? "").localeCompare(a.lastSyncAt ?? ""));
          if (synced.length > 0) setStravaLastSync(synced[0].lastSyncAt);
        } catch { /* ignore */ }
      }
      if (window.PublicKeyCredential) {
        setBiometricSupported(true);
        fetch("/api/auth/webauthn/registered")
          .then((r) => r.json())
          .then((d) => setBiometricRegistered(d.registered))
          .catch(() => {});
      }
    }
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
      localStorage.setItem(STRAVA_TOKENS_KEY, JSON.stringify(tokens));
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
    const stored = localStorage.getItem(STRAVA_TOKENS_KEY);
    if (!stored) return;
    setStravaSyncing(true);
    setStravaError("");
    try {
      const tokens = JSON.parse(stored);
      let accessToken = tokens.accessToken;
      const expiresIn = tokens.expiresAt - Math.floor(Date.now() / 1000);
      if (expiresIn < 3600) {
        const refreshRes = await fetch("/api/strava/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: tokens.refreshToken }),
        });
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          accessToken = data.accessToken;
          const newTokens = { accessToken: data.accessToken, refreshToken: data.refreshToken, expiresAt: data.expiresAt };
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
      if (!activitiesRes.ok) throw new Error((await activitiesRes.json().catch(() => ({}))).error || `Activities: ${activitiesRes.status}`);
      if (!gearRes.ok) throw new Error((await gearRes.json().catch(() => ({}))).error || `Gear: ${gearRes.status}`);

      const { activities } = await activitiesRes.json();
      const { gear } = await gearRes.json();

      // Save raw activities to localStorage
      localStorage.setItem(STRAVA_ACTIVITIES_KEY, JSON.stringify(activities));

      // Save gear list
      const gearList = (gear || []).map((g: { id: string; name: string }) => ({ id: g.id, name: g.name }));
      localStorage.setItem(STRAVA_GEAR_KEY, JSON.stringify(gearList));

      // Aggregate mileage per bike
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
      const bikesRaw = localStorage.getItem(BIKES_STORAGE_KEY);
      let currentBikes = bikesRaw ? JSON.parse(bikesRaw) : [];
      currentBikes = currentBikes.map((b: { stravaGearId?: string; [key: string]: unknown }) => {
        const gearId = b.stravaGearId;
        if (!gearId || !byGear[gearId]) return b;
        const { total, indoor, road } = byGear[gearId];
        return { ...b, totalMiles: Math.round(total * 10) / 10, indoorMiles: Math.round(indoor * 10) / 10, roadMiles: Math.round(road * 10) / 10, lastSyncAt: now };
      });
      localStorage.setItem(BIKES_STORAGE_KEY, JSON.stringify(currentBikes));
      setStravaLastSync(now);
    } catch (err) {
      setStravaError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setStravaSyncing(false);
    }
  };

  const handleStravaDisconnect = () => {
    if (confirm("Disconnect Strava? Mileage data will remain but you won't be able to sync.")) {
      localStorage.removeItem(STRAVA_TOKENS_KEY);
      setStravaConnected(false);
    }
  };

  const handleRegisterBiometric = async () => {
    setRegisteringBiometric(true);
    setBiometricMessage("");
    try {
      const { startRegistration } = await import("@simplewebauthn/browser");
      const optionsRes = await fetch("/api/auth/webauthn/register");
      if (!optionsRes.ok) throw new Error("Failed to get registration options");
      const options = await optionsRes.json();
      const credential = await startRegistration({ optionsJSON: options });
      const verifyRes = await fetch("/api/auth/webauthn/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credential),
      });
      if (verifyRes.ok) {
        setBiometricRegistered(true);
        setBiometricMessage("Biometric registered successfully!");
      } else {
        const data = await verifyRes.json();
        setBiometricMessage(data.error || "Registration failed");
      }
    } catch (err) {
      if (err instanceof Error && err.name === "NotAllowedError") {
        setBiometricMessage("Registration was cancelled");
      } else {
        setBiometricMessage("Registration failed");
      }
    } finally {
      setRegisteringBiometric(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const handleExport = () => {
    const recipes = localStorage.getItem("jarvis-recipes");
    const ingredients = localStorage.getItem("jarvis-saved-ingredients");
    const data = {
      recipes: recipes ? JSON.parse(recipes) : [],
      ingredients: ingredients ? JSON.parse(ingredients) : [],
      exportedAt: new Date().toISOString(),
    };
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `jarvis-backup-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    localStorage.setItem(JARVIS_LAST_BACKUP_KEY, new Date().toISOString());
    setLastBackup(new Date().toISOString());
    alert("Backup exported successfully!");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        let importedCount = 0;
        const recipes = localStorage.getItem("jarvis-recipes");
        const ingredients = localStorage.getItem("jarvis-saved-ingredients");
        const existingRecipes = recipes ? JSON.parse(recipes) : [];
        const existingIngredients = ingredients ? JSON.parse(ingredients) : [];

        if (imported.recipes && Array.isArray(imported.recipes)) {
          const existingIds = new Set(existingRecipes.map((r: { id?: string }) => r.id));
          const newRecipes = imported.recipes.filter((r: { id?: string }) => !r.id || !existingIds.has(r.id));
          if (newRecipes.length > 0 && confirm(`Import ${newRecipes.length} recipe(s)?`)) {
            const mergedRecipes = [...existingRecipes, ...newRecipes];
            localStorage.setItem("jarvis-recipes", JSON.stringify(mergedRecipes));
            importedCount += newRecipes.length;
          }
        }
        if (imported.ingredients && Array.isArray(imported.ingredients)) {
          const existingNames = new Set(existingIngredients.map((i: { name?: string }) => i.name?.toLowerCase()));
          const newIngredients = imported.ingredients.filter(
            (i: { name?: string }) => !existingNames.has(i.name?.toLowerCase())
          );
          if (newIngredients.length > 0 && confirm(`Import ${newIngredients.length} ingredient(s)?`)) {
            const mergedIngredients = [...existingIngredients, ...newIngredients];
            localStorage.setItem("jarvis-saved-ingredients", JSON.stringify(mergedIngredients));
            importedCount += newIngredients.length;
          }
        }

        if (importedCount > 0) {
          alert(`Successfully imported ${importedCount} item(s)!`);
        } else {
          alert("No new items to import.");
        }
      } catch (err) {
        alert("Failed to import backup file. Invalid format.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Navigation />
        <h1 className="text-3xl font-bold font-mono mt-6">Settings</h1>
        <p className="text-slate-400 mt-2 font-mono text-sm mb-8">
          Configuration and preferences.
        </p>

        <section id="strava" className="border border-slate-700 rounded-lg p-6 mb-6 scroll-mt-8">
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

        <section className="border border-slate-700 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold font-mono text-slate-100 mb-2">Extras</h2>
          <p className="text-slate-400 font-mono text-sm mb-4">
            Experiments, backups, or features you&apos;ve created but don&apos;t need right now.
          </p>
          <Link
            href="/settings/extras"
            className="inline-block px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-100 font-mono text-sm transition-colors"
          >
            Open Extras
          </Link>
        </section>

        <section className="border border-slate-700 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold font-mono text-slate-100 mb-2">Security</h2>
          <p className="text-slate-400 font-mono text-sm mb-4">
            Authentication and biometric settings.
          </p>
          <div className="space-y-3">
            {biometricSupported && (
              <div>
                <button
                  onClick={handleRegisterBiometric}
                  disabled={registeringBiometric}
                  className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-100 font-mono text-sm transition-colors disabled:opacity-50"
                >
                  {registeringBiometric
                    ? "Registering..."
                    : biometricRegistered
                    ? "Re-register Biometric"
                    : "Register Biometric (Touch ID / Face ID)"}
                </button>
                {biometricRegistered && (
                  <p className="text-green-400 font-mono text-xs mt-1">Biometric is registered</p>
                )}
                {biometricMessage && (
                  <p className={`font-mono text-xs mt-1 ${biometricMessage.includes("success") ? "text-green-400" : "text-red-400"}`}>
                    {biometricMessage}
                  </p>
                )}
              </div>
            )}
            <div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-lg bg-red-900/50 hover:bg-red-800/50 text-red-300 font-mono text-sm transition-colors"
              >
                Log Out
              </button>
            </div>
          </div>
        </section>

        <section id="nutrition" className="border border-slate-700 rounded-lg p-6 scroll-mt-8">
          <h2 className="text-xl font-semibold font-mono text-slate-100 mb-2">Backup</h2>
          <p className="text-slate-400 font-mono text-sm mb-4">
            Export or import your nutrition data (recipes and saved ingredients). Back up regularly.
          </p>
          {lastBackup && (
            <p className="text-slate-500 font-mono text-xs mb-4">
              Last backup: {new Date(lastBackup).toLocaleDateString()} at {new Date(lastBackup).toLocaleTimeString()}
            </p>
          )}
          <div className="flex gap-3">
            <button
              onClick={handleExport}
              className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-100 font-mono text-sm transition-colors"
            >
              Export backup
            </button>
            <label className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-100 font-mono text-sm cursor-pointer transition-colors">
              Import backup
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>
          </div>
        </section>
      </div>
    </div>
  );
}
