"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navigation from "../components/Navigation";
import * as api from "../lib/api-client";

const BACKUP_REMINDER_DAYS = 7;
const FULL_BACKUP_REMINDER_DAYS = 1;
const HELMET_REMINDER_DAYS = 30;
const ZONE_REVIEW_DAYS = 28;

interface GearItem {
  id: string;
  name: string;
  category: string;
  purchaseDate?: string;
  replaceReminderYears?: number;
}

function getReplaceDate(item: GearItem): Date | null {
  if (!item.purchaseDate || !item.replaceReminderYears) return null;
  const d = new Date(item.purchaseDate);
  if (isNaN(d.getTime())) return null;
  d.setFullYear(d.getFullYear() + item.replaceReminderYears);
  return d;
}

export default function AlertsPage() {
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [backupOverdue, setBackupOverdue] = useState(false);
  const [lastFullBackup, setLastFullBackup] = useState<string | null>(null);
  const [fullBackupOverdue, setFullBackupOverdue] = useState(false);
  const [helmetReminders, setHelmetReminders] = useState<{ item: GearItem; replaceDate: Date }[]>([]);
  const [zoneReviewDue, setZoneReviewDue] = useState(false);
  const [zoneReviewDays, setZoneReviewDays] = useState(0);

  // Migration state
  const [migrationNeeded, setMigrationNeeded] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [migrationResults, setMigrationResults] = useState<Record<string, string> | null>(null);
  const [migrationError, setMigrationError] = useState<string | null>(null);
  const [localKeyCount, setLocalKeyCount] = useState(0);

  useEffect(() => {
    async function loadAlerts() {
      // Check localStorage migration
      const jarvisKeys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith("jarvis-")) jarvisKeys.push(key);
      }
      if (jarvisKeys.length > 0) {
        try {
          const kvData = await api.getAllKV();
          if (Object.keys(kvData).length === 0) {
            setLocalKeyCount(jarvisKeys.length);
            setMigrationNeeded(true);
          }
        } catch {
          setLocalKeyCount(jarvisKeys.length);
          setMigrationNeeded(true);
        }
      }

      // Load all data in parallel
      const [nutritionBackup, fullBackup, zones, gearItems] = await Promise.all([
        api.getKV<string>("last-nutrition-backup"),
        api.getKV<string>("last-full-backup"),
        api.getKV<{ zonesUpdatedAt?: string }>("strava-zones"),
        api.getGearItems<GearItem>(),
      ]);

      // Nutrition backup
      setLastBackup(nutritionBackup);
      if (!nutritionBackup) {
        setBackupOverdue(true);
      } else {
        const then = new Date(nutritionBackup).getTime();
        const now = Date.now();
        const daysSince = (now - then) / (1000 * 60 * 60 * 24);
        setBackupOverdue(daysSince >= BACKUP_REMINDER_DAYS);
      }

      // Full backup
      setLastFullBackup(fullBackup);
      if (!fullBackup) {
        setFullBackupOverdue(true);
      } else {
        const daysSince = (Date.now() - new Date(fullBackup).getTime()) / (1000 * 60 * 60 * 24);
        setFullBackupOverdue(daysSince >= FULL_BACKUP_REMINDER_DAYS);
      }

      // Zone review
      if (zones?.zonesUpdatedAt) {
        const days = (Date.now() - new Date(zones.zonesUpdatedAt).getTime()) / (1000 * 60 * 60 * 24);
        setZoneReviewDays(Math.floor(days));
        setZoneReviewDue(days >= ZONE_REVIEW_DAYS);
      }

      // Helmet reminders
      const now = Date.now();
      const cutoff = now + HELMET_REMINDER_DAYS * 24 * 60 * 60 * 1000;
      const reminders: { item: GearItem; replaceDate: Date }[] = [];
      for (const item of gearItems) {
        if (item.category !== "Helmets") continue;
        const replaceDate = getReplaceDate(item);
        if (!replaceDate) continue;
        if (replaceDate.getTime() <= cutoff) {
          reminders.push({ item, replaceDate });
        }
      }
      reminders.sort((a, b) => a.replaceDate.getTime() - b.replaceDate.getTime());
      setHelmetReminders(reminders);
    }

    loadAlerts();
  }, []);

  async function handleMigrate() {
    setMigrationStatus("running");
    setMigrationError(null);
    const data: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("jarvis-")) {
        data[key] = localStorage.getItem(key) ?? "";
      }
    }
    try {
      const result = await api.migrateFromLocalStorage(data);
      if (result.success) {
        setMigrationStatus("done");
        setMigrationResults((result as { success: boolean; results?: Record<string, string> }).results ?? null);
      } else {
        setMigrationStatus("error");
        setMigrationError(result.error ?? "Unknown error");
      }
    } catch (err) {
      setMigrationStatus("error");
      setMigrationError(err instanceof Error ? err.message : "Migration request failed");
    }
  }

  function handleClearLocalStorage() {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("jarvis-")) keysToRemove.push(key);
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
    setMigrationNeeded(false);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Navigation />
        <h1 className="text-3xl font-bold font-mono mt-6">Alerts</h1>
        <p className="text-slate-400 mt-2 font-mono text-sm mb-8">
          Notifications and reminders.
        </p>

        {migrationNeeded && (
          <section className="border border-red-600/50 rounded-lg p-6 bg-red-950/20 mb-6">
            <h2 className="text-lg font-semibold font-mono text-red-200 mb-2">
              Database migration required
            </h2>
            {migrationStatus === "idle" && (
              <>
                <p className="text-slate-400 font-mono text-sm mb-4">
                  Found {localKeyCount} localStorage keys to migrate to SQLite. This is a one-time operation.
                </p>
                <button
                  onClick={handleMigrate}
                  className="inline-block px-4 py-2 rounded-lg bg-red-700 hover:bg-red-600 text-slate-100 font-mono text-sm transition-colors"
                >
                  Migrate Now
                </button>
              </>
            )}
            {migrationStatus === "running" && (
              <p className="text-slate-400 font-mono text-sm animate-pulse">
                Migrating data to SQLite...
              </p>
            )}
            {migrationStatus === "done" && (
              <>
                <p className="text-green-400 font-mono text-sm mb-3">Migration complete.</p>
                {migrationResults && (
                  <ul className="text-slate-400 font-mono text-sm mb-4 space-y-0.5">
                    {Object.entries(migrationResults).map(([key, val]) => (
                      <li key={key}>{key}: {val}</li>
                    ))}
                  </ul>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={handleClearLocalStorage}
                    className="inline-block px-4 py-2 rounded-lg bg-green-700 hover:bg-green-600 text-slate-100 font-mono text-sm transition-colors"
                  >
                    Clear localStorage &amp; Dismiss
                  </button>
                  <button
                    onClick={() => setMigrationNeeded(false)}
                    className="inline-block px-4 py-2 rounded-lg border border-slate-600 hover:bg-slate-800 text-slate-300 font-mono text-sm transition-colors"
                  >
                    Keep localStorage
                  </button>
                </div>
              </>
            )}
            {migrationStatus === "error" && (
              <>
                <p className="text-red-400 font-mono text-sm mb-3">{migrationError}</p>
                <button
                  onClick={handleMigrate}
                  className="inline-block px-4 py-2 rounded-lg bg-red-700 hover:bg-red-600 text-slate-100 font-mono text-sm transition-colors"
                >
                  Retry
                </button>
              </>
            )}
          </section>
        )}

        {fullBackupOverdue && (
          <section className="border border-amber-600/50 rounded-lg p-6 bg-amber-950/20 mb-6">
            <h2 className="text-lg font-semibold font-mono text-amber-200 mb-2">
              Daily reminder: Back up JARVIS to iCloud
            </h2>
            <p className="text-slate-400 font-mono text-sm mb-4">
              {lastFullBackup
                ? `Your last full backup was ${new Date(lastFullBackup).toLocaleDateString()}. Back up daily until N8N automates this.`
                : "You haven't done a full JARVIS backup yet. Back up all your data to iCloud Drive."}
            </p>
            <Link
              href="/settings/backup"
              className="inline-block px-4 py-2 rounded-lg bg-amber-700 hover:bg-amber-600 text-slate-100 font-mono text-sm transition-colors"
            >
              Open Settings → Backup
            </Link>
          </section>
        )}

        {!fullBackupOverdue && lastFullBackup && (
          <section className="border border-slate-700 rounded-lg p-6 mb-6">
            <p className="text-slate-400 font-mono text-sm">
              JARVIS backup is up to date. Last backup: {new Date(lastFullBackup).toLocaleDateString()}. You can manage backups in <Link href="/settings/backup" className="text-slate-300 underline hover:text-white">Settings → Backup</Link>.
            </p>
          </section>
        )}

        {backupOverdue && (
          <section className="border border-amber-600/50 rounded-lg p-6 bg-amber-950/20 mb-6">
            <h2 className="text-lg font-semibold font-mono text-amber-200 mb-2">
              Weekly reminder: Back up nutrition data
            </h2>
            <p className="text-slate-400 font-mono text-sm mb-4">
              {lastBackup
                ? `Your last backup was ${new Date(lastBackup).toLocaleDateString()}. Back up your recipes and saved ingredients at least weekly.`
                : "You haven't backed up your nutrition data yet. Export a backup from Settings so you don't lose your recipes and ingredients."}
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

        {zoneReviewDue && (
          <section className="border border-amber-600/50 rounded-lg p-6 bg-amber-950/20 mb-6">
            <h2 className="text-lg font-semibold font-mono text-amber-200 mb-2">
              Review your training zones
            </h2>
            <p className="text-slate-400 font-mono text-sm mb-4">
              Your power and HR zones were last updated {zoneReviewDays} days ago. Review your FTP and zones to keep your training analysis accurate.
            </p>
            <Link
              href="/settings#strava"
              className="inline-block px-4 py-2 rounded-lg bg-amber-700 hover:bg-amber-600 text-slate-100 font-mono text-sm transition-colors"
            >
              Open Settings → Training Zones
            </Link>
          </section>
        )}

        {helmetReminders.length > 0 && (
          <section className="border border-amber-600/50 rounded-lg p-6 bg-amber-950/20 mb-6">
            <h2 className="text-lg font-semibold font-mono text-amber-200 mb-2">
              Helmet replacement reminder
            </h2>
            <p className="text-slate-400 font-mono text-sm mb-4">
              The following helmets are due for replacement soon (or are overdue):
            </p>
            <ul className="space-y-2 mb-4">
              {helmetReminders.map(({ item, replaceDate }) => (
                <li key={item.id} className="font-mono text-sm">
                  <span className="text-slate-200">{item.name}</span>
                  <span className="text-slate-500 ml-2">
                    — replace by {replaceDate.toLocaleDateString()}
                    {replaceDate.getTime() < Date.now() && (
                      <span className="text-amber-400 ml-1">(overdue)</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
            <Link
              href="/bike/inventory"
              className="inline-block px-4 py-2 rounded-lg bg-amber-700 hover:bg-amber-600 text-slate-100 font-mono text-sm transition-colors"
            >
              Open Gear Inventory →
            </Link>
          </section>
        )}
      </div>
    </div>
  );
}
