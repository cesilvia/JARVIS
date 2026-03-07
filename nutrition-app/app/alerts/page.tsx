"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navigation from "../components/Navigation";

const JARVIS_LAST_BACKUP_KEY = "jarvis-last-nutrition-backup";
const BACKUP_REMINDER_DAYS = 7;

export default function AlertsPage() {
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [backupOverdue, setBackupOverdue] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(JARVIS_LAST_BACKUP_KEY);
    setLastBackup(stored);
    if (!stored) {
      setBackupOverdue(true);
      return;
    }
    const then = new Date(stored).getTime();
    const now = Date.now();
    const daysSince = (now - then) / (1000 * 60 * 60 * 24);
    setBackupOverdue(daysSince >= BACKUP_REMINDER_DAYS);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Navigation />
        <h1 className="text-3xl font-bold font-mono mt-6">Alerts</h1>
        <p className="text-slate-400 mt-2 font-mono text-sm mb-8">
          Notifications and reminders.
        </p>

        {backupOverdue && (
          <section className="border border-amber-600/50 rounded-lg p-6 bg-amber-950/20 mb-6">
            <h2 className="text-lg font-semibold font-mono text-amber-200 mb-2">
              Weekly reminder: Back up nutrition data
            </h2>
            <p className="text-slate-400 font-mono text-sm mb-4">
              {lastBackup
                ? `Your last backup was ${new Date(lastBackup).toLocaleDateString()}. Back up your recipes and saved ingredients at least weekly.`
                : "You haven’t backed up your nutrition data yet. Export a backup from Settings so you don’t lose your recipes and ingredients."}
            </p>
            <Link
              href="/settings"
              className="inline-block px-4 py-2 rounded-lg bg-amber-700 hover:bg-amber-600 text-slate-100 font-mono text-sm transition-colors"
            >
              Open Settings → Backup
            </Link>
          </section>
        )}

        {!backupOverdue && lastBackup && (
          <section className="border border-slate-700 rounded-lg p-6 mb-6">
            <p className="text-slate-400 font-mono text-sm">
              Nutrition backup is up to date. Last backup: {new Date(lastBackup).toLocaleDateString()}. You can export or import in <Link href="/settings" className="text-slate-300 underline hover:text-white">Settings</Link>.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
