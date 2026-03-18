"use client";

import { useState, useEffect } from "react";
import Navigation from "../../components/Navigation";
import SettingsNavIcon from "../SettingsNavIcon";

type VerifyStatus = {
  path: string;
  verified: boolean;
  invalidated: boolean;
  verifiedAt: string | null;
};

type PageEntry = {
  path: string;
  name: string;
  group: string;
};

const PAGES: PageEntry[] = [
  // Core
  { path: "/hub", name: "Hub", group: "Core" },
  { path: "/calendar", name: "Calendar", group: "Core" },
  { path: "/tasks", name: "Task Manager", group: "Core" },
  { path: "/weather", name: "Weather", group: "Core" },
  { path: "/notes", name: "Notes", group: "Core" },
  { path: "/health", name: "Health", group: "Core" },
  { path: "/profile", name: "Profile", group: "Core" },
  // Hub Wedges & Icons
  { path: "/hub/wedge/calendar", name: "Calendar Wedge & Icon", group: "Hub Wedges" },
  { path: "/hub/wedge/nutrition", name: "Nutrition Wedge & Icon", group: "Hub Wedges" },
  { path: "/hub/wedge/strava", name: "Strava Wedge & Icon", group: "Hub Wedges" },
  { path: "/hub/wedge/tasks", name: "Tasks Wedge & Icon", group: "Hub Wedges" },
  { path: "/hub/wedge/weather", name: "Weather Wedge & Icon", group: "Hub Wedges" },
  { path: "/hub/wedge/notes", name: "Notes Wedge & Icon", group: "Hub Wedges" },
  { path: "/hub/wedge/health", name: "Health Wedge & Icon", group: "Hub Wedges" },
  { path: "/hub/wedge/german", name: "German Wedge & Icon", group: "Hub Wedges" },
  { path: "/hub/icon/settings", name: "Settings Icon", group: "Hub Wedges" },
  { path: "/hub/icon/profile", name: "Profile Icon", group: "Hub Wedges" },
  { path: "/hub/icon/status", name: "Status Icon", group: "Hub Wedges" },
  { path: "/hub/icon/alerts", name: "Alerts Icon", group: "Hub Wedges" },
  // Cycling
  { path: "/bike", name: "Bike Hub", group: "Cycling" },
  { path: "/bike/strava", name: "Strava Dashboard", group: "Cycling" },
  { path: "/bike/components", name: "Bike Components", group: "Cycling" },
  { path: "/bike/tire-pressure", name: "Tire Pressure", group: "Cycling" },
  { path: "/bike/inventory", name: "Gear Inventory", group: "Cycling" },
  // Nutrition
  { path: "/nutrition", name: "Nutrition Tracker", group: "Nutrition" },
  { path: "/recipes", name: "Recipes", group: "Nutrition" },
  { path: "/recipes/browse", name: "Recipe Browser", group: "Nutrition" },
  // Learning
  { path: "/german", name: "Deutsch", group: "Learning" },
  // Settings
  { path: "/settings", name: "Settings Hub", group: "Settings" },
  { path: "/settings/cycling", name: "Cycling Settings", group: "Settings" },
  { path: "/settings/nutrition", name: "Nutrition Settings", group: "Settings" },
  { path: "/settings/backup", name: "Backup", group: "Settings" },
  { path: "/settings/security", name: "Security", group: "Settings" },
  { path: "/settings/extras", name: "Extras", group: "Settings" },
  { path: "/settings/verification", name: "Verification", group: "Settings" },
  // System
  { path: "/login", name: "Login", group: "System" },
  { path: "/status", name: "Status", group: "System" },
  { path: "/alerts", name: "Alerts", group: "System" },
];

const GROUP_COLORS: Record<string, { text: string; border: string }> = {
  Core: { text: "text-cyan-400", border: "border-cyan-400/20" },
  "Hub Wedges": { text: "text-purple-400", border: "border-purple-400/20" },
  Cycling: { text: "text-orange-400", border: "border-orange-400/20" },
  Nutrition: { text: "text-green-400", border: "border-green-400/20" },
  Learning: { text: "text-amber-400", border: "border-amber-400/20" },
  Settings: { text: "text-blue-400", border: "border-blue-400/20" },
  System: { text: "text-slate-400", border: "border-slate-400/20" },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function VerificationPage() {
  const [statuses, setStatuses] = useState<Record<string, VerifyStatus>>({});
  const [loading, setLoading] = useState(true);

  const fetchStatuses = async () => {
    try {
      const res = await fetch("/api/db/verification");
      const { pages } = await res.json();
      const map: Record<string, VerifyStatus> = {};
      for (const p of pages as VerifyStatus[]) {
        map[p.path] = p;
      }
      setStatuses(map);
    } catch {
      // ignore
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStatuses();
  }, []);

  const toggle = async (pagePath: string) => {
    const current = statuses[pagePath];
    const isCurrentlyVerified = current?.verified && !current?.invalidated;

    if (isCurrentlyVerified) {
      // Unverify
      await fetch(`/api/db/verification?path=${encodeURIComponent(pagePath)}`, {
        method: "DELETE",
      });
    } else {
      // Verify (stores current file hash)
      await fetch("/api/db/verification", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: pagePath }),
      });
    }
    await fetchStatuses();
  };

  const resetAll = async () => {
    if (!confirm("Uncheck all pages? This clears all verification status.")) return;
    await fetch("/api/db/verification?path=*", { method: "DELETE" });
    await fetchStatuses();
  };

  const groups = [...new Set(PAGES.map((p) => p.group))];
  const verified = PAGES.filter((p) => statuses[p.path]?.verified).length;
  const invalidated = PAGES.filter((p) => statuses[p.path]?.invalidated).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Navigation />

        <h1 className="text-3xl font-bold font-mono mt-4">Verification</h1>
        <p className="text-slate-400 mt-2 font-mono text-sm mb-2">
          Track which pages have been verified after changes.
        </p>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between font-mono text-xs text-slate-400 mb-1">
            <span>
              {verified} / {PAGES.length} verified
            </span>
            <span>{Math.round((verified / PAGES.length) * 100)}%</span>
          </div>
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-400 rounded-full transition-all duration-300"
              style={{ width: `${(verified / PAGES.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Invalidated banner */}
        {invalidated > 0 && (
          <div className="mb-4 p-3 rounded-lg font-mono text-sm border bg-orange-900/20 border-orange-500/30 text-orange-300">
            {invalidated} page{invalidated !== 1 ? "s" : ""} changed since last verified — re-check needed
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={resetAll}
            disabled={verified === 0 && invalidated === 0}
            className="px-4 py-2 bg-red-500/10 border border-red-400/20 rounded-lg font-mono text-xs text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Reset All
          </button>
        </div>

        {loading ? (
          <p className="text-slate-500 font-mono text-sm">Loading...</p>
        ) : (
          <div className="space-y-6">
            {groups.map((group) => {
              const color = GROUP_COLORS[group] ?? GROUP_COLORS.System;
              const pages = PAGES.filter((p) => p.group === group);
              const groupVerified = pages.filter((p) => statuses[p.path]?.verified).length;

              return (
                <div key={group}>
                  <div className="flex items-center gap-2 mb-2">
                    <h2 className={`text-sm font-semibold font-mono ${color.text}`}>
                      {group}
                    </h2>
                    <span className="text-slate-600 font-mono text-xs">
                      {groupVerified}/{pages.length}
                    </span>
                  </div>
                  <div className={`border ${color.border} rounded-lg divide-y divide-slate-800`}>
                    {pages.map((page) => {
                      const st = statuses[page.path];
                      const isVerified = st?.verified && !st?.invalidated;
                      const isInvalidated = st?.invalidated;
                      return (
                        <div
                          key={page.path}
                          className="flex items-center justify-between px-4 py-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <button
                              onClick={() => toggle(page.path)}
                              className={`w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                                isVerified
                                  ? "bg-cyan-500/30 border-cyan-400/60 text-cyan-300"
                                  : isInvalidated
                                  ? "bg-orange-500/30 border-orange-400/60 text-orange-300"
                                  : "border-slate-600 hover:border-slate-400"
                              }`}
                            >
                              {isVerified && (
                                <svg viewBox="0 0 16 16" className="w-3 h-3" fill="currentColor">
                                  <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
                                </svg>
                              )}
                              {isInvalidated && (
                                <svg viewBox="0 0 16 16" className="w-3 h-3" fill="currentColor">
                                  <path d="M8 1.5a.75.75 0 0 1 .75.75v5a.75.75 0 0 1-1.5 0v-5A.75.75 0 0 1 8 1.5Zm0 9a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z" />
                                </svg>
                              )}
                            </button>
                            <div className="min-w-0">
                              <span
                                className={`font-mono text-sm ${
                                  isInvalidated ? "text-orange-300" : "text-slate-200"
                                }`}
                              >
                                {page.name}
                              </span>
                              <span className="font-mono text-[10px] text-slate-600 ml-2">
                                {page.path}
                              </span>
                              {isInvalidated && (
                                <span className="font-mono text-[10px] text-orange-400 ml-2">
                                  changed
                                </span>
                              )}
                            </div>
                          </div>
                          {isVerified && st.verifiedAt && (
                            <span className="font-mono text-[10px] text-slate-500 shrink-0 ml-2">
                              {formatDate(st.verifiedAt)}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <SettingsNavIcon />
    </div>
  );
}
