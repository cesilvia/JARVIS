"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navigation from "../../components/Navigation";

type BackupInfo = {
  name: string;
  size: number;
  created: string;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function BackupSettingsPage() {
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [backupDir, setBackupDir] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [restoring, setRestoring] = useState<string | null>(null);

  const fetchBackups = async () => {
    try {
      const res = await fetch("/api/backup");
      const json = await res.json();
      if (json.backups) {
        setBackups(json.backups);
        setBackupDir(json.backupDir || "");
      }
    } catch {
      // silently fail on list
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const handleBackup = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch("/api/backup", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        const r2Status = json.r2?.success ? " + R2" : json.r2?.error ? ` (R2 failed: ${json.r2.error})` : "";
        setStatus({
          type: "success",
          message: `Backed up ${json.keys} keys (${formatBytes(json.size)})${r2Status}`,
        });
        fetchBackups();
      } else {
        setStatus({ type: "error", message: json.error || "Backup failed" });
      }
    } catch (err) {
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Backup failed",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (fileName: string) => {
    if (!confirm(`Restore from ${fileName}? This will overwrite your current data.`)) return;

    setRestoring(fileName);
    setStatus(null);
    try {
      const res = await fetch(`/api/backup?file=${encodeURIComponent(fileName)}`, {
        method: "PUT",
      });
      const json = await res.json();

      if (json.success) {
        const summary = Object.entries(json.results as Record<string, string>)
          .map(([k, v]) => `${k}: ${v}`)
          .join(", ");
        setStatus({
          type: "success",
          message: `Restored from ${fileName} (${summary})`,
        });
      } else {
        setStatus({ type: "error", message: json.error || "Restore failed" });
      }
    } catch (err) {
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Restore failed",
      });
    } finally {
      setRestoring(null);
    }
  };

  const handleDelete = async (fileName: string) => {
    if (!confirm(`Delete backup ${fileName}? This cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/backup?file=${encodeURIComponent(fileName)}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        setStatus({ type: "success", message: `Deleted ${fileName}` });
        fetchBackups();
      } else {
        setStatus({ type: "error", message: json.error || "Delete failed" });
      }
    } catch (err) {
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Delete failed",
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Navigation />

        <Link href="/settings" className="text-cyan-400 hover:text-cyan-300 font-mono text-sm">
          &larr; Settings
        </Link>

        <h1 className="text-3xl font-bold font-mono mt-4">Backup</h1>
        <p className="text-slate-400 mt-2 font-mono text-sm mb-6">
          Full JARVIS backup to iCloud Drive.
        </p>

        {/* Status banner */}
        {status && (
          <div
            className={`mb-6 p-3 rounded-lg font-mono text-sm border ${
              status.type === "success"
                ? "bg-emerald-900/30 border-emerald-500/30 text-emerald-300"
                : "bg-red-900/30 border-red-500/30 text-red-300"
            }`}
          >
            {status.message}
          </div>
        )}

        {/* Backup button */}
        <div className="border border-cyan-400/20 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold font-mono text-cyan-400 mb-2">Backup Now</h2>
          <p className="text-slate-400 font-mono text-xs mb-4">
            Exports all JARVIS data (Strava, German, Nutrition, Bikes, Settings) to a single JSON
            file in your iCloud Drive.
          </p>
          <button
            onClick={handleBackup}
            disabled={loading}
            className="px-6 py-2.5 bg-cyan-500/20 border border-cyan-400/40 rounded-lg font-mono text-sm text-cyan-300 hover:bg-cyan-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Backing up..." : "Backup to iCloud"}
          </button>
          {backupDir && (
            <p className="text-slate-500 font-mono text-[10px] mt-3 break-all">
              Saves to: {backupDir}
            </p>
          )}
        </div>

        {/* Backup list */}
        <div className="border border-slate-700/50 rounded-lg p-6">
          <h2 className="text-lg font-semibold font-mono text-slate-300 mb-4">
            Saved Backups ({backups.length})
          </h2>

          {backups.length === 0 ? (
            <p className="text-slate-500 font-mono text-sm">No backups yet.</p>
          ) : (
            <div className="space-y-3">
              {backups.map((b) => (
                <div
                  key={b.name}
                  className="flex items-center justify-between border border-slate-700/30 rounded-lg px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm text-slate-200 truncate">{b.name}</p>
                    <p className="font-mono text-[10px] text-slate-500">
                      {formatDate(b.created)} &middot; {formatBytes(b.size)}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-4 shrink-0">
                    <button
                      onClick={() => handleRestore(b.name)}
                      disabled={restoring === b.name}
                      className="px-3 py-1.5 bg-emerald-500/15 border border-emerald-400/30 rounded font-mono text-xs text-emerald-300 hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
                    >
                      {restoring === b.name ? "..." : "Restore"}
                    </button>
                    <button
                      onClick={() => handleDelete(b.name)}
                      className="px-3 py-1.5 bg-red-500/10 border border-red-400/20 rounded font-mono text-xs text-red-400 hover:bg-red-500/20 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
