import type { StravaActivity } from "../bike/strava/types";

// ─── FTP History ────────────────────────────────────────────

export interface FtpEntry {
  date: string; // ISO date, e.g. "2026-01-20"
  ftp: number;
}

/**
 * Get the FTP that was active on a given date, using the FTP history.
 * Falls back to the most recent FTP if no history entry covers the date.
 */
function getFtpForDate(date: string, ftpHistory: FtpEntry[]): number {
  // ftpHistory should be sorted by date ascending
  let ftp = ftpHistory[0]?.ftp ?? 0;
  for (const entry of ftpHistory) {
    if (entry.date <= date) ftp = entry.ftp;
    else break;
  }
  return ftp;
}

/**
 * Aggregate daily TSS from Strava activities.
 * Uses FTP history to apply the correct FTP for each ride's date.
 * TSS = (duration_s × NP × IF) / (FTP × 3600) × 100
 */
export function computeDailyTSS(
  activities: StravaActivity[],
  ftpOrHistory: number | FtpEntry[],
): Map<string, number> {
  const daily = new Map<string, number>();
  const useHistory = Array.isArray(ftpOrHistory);
  const history = useHistory
    ? [...ftpOrHistory].sort((a, b) => a.date.localeCompare(b.date))
    : [];

  for (const a of activities) {
    const np = a.weighted_average_watts;
    if (!np) continue;
    const day = a.start_date.slice(0, 10);
    const ftp = useHistory ? getFtpForDate(day, history) : ftpOrHistory;
    if (!ftp) continue;
    const iff = np / ftp;
    const tss = (a.moving_time * np * iff) / (ftp * 3600) * 100;
    daily.set(day, (daily.get(day) || 0) + tss);
  }
  return daily;
}

export interface FitnessEntry {
  date: string;
  ctl: number;
  atl: number;
  tsb: number;
  tss: number;
}

/**
 * Compute CTL/ATL/TSB from daily TSS values using TrainerRoad's method:
 * CTL = simple rolling average of daily TSS over last 42 days (no exponential weighting)
 * ATL = 7-day exponential moving average (acute / fatigue)
 * TSB = CTL - ATL (form / freshness)
 */
export function computeFitness(dailyTSS: Map<string, number>, days: number): FitnessEntry[] {
  const sorted = Array.from(dailyTSS.keys()).sort();
  if (sorted.length === 0) return [];
  const start = new Date(sorted[0]);
  const end = new Date();
  const result: FitnessEntry[] = [];
  // Ring buffer for last 42 days of TSS (for simple rolling average CTL)
  const ctlWindow: number[] = [];
  let atl = 0;

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    const tss = dailyTSS.get(key) || 0;

    // CTL: simple rolling average of last 42 days
    ctlWindow.push(tss);
    if (ctlWindow.length > 42) ctlWindow.shift();
    const ctl = ctlWindow.reduce((sum, v) => sum + v, 0) / ctlWindow.length;

    // ATL: 7-day exponential moving average
    atl = atl + (tss - atl) / 7;

    result.push({ date: key, ctl, atl, tsb: ctl - atl, tss });
  }
  return result.slice(-days);
}
