import type { StravaActivity } from "../bike/strava/types";

/**
 * Aggregate daily TSS from Strava activities.
 * TSS = (duration_s × NP × IF) / (FTP × 3600) × 100
 */
export function computeDailyTSS(activities: StravaActivity[], ftp: number): Map<string, number> {
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

export interface FitnessEntry {
  date: string;
  ctl: number;
  atl: number;
  tsb: number;
  tss: number;
}

/**
 * Compute CTL/ATL/TSB from daily TSS values.
 * CTL = 42-day exponential moving average (chronic / fitness)
 * ATL = 7-day exponential moving average (acute / fatigue)
 * TSB = CTL - ATL (form / freshness)
 */
export function computeFitness(dailyTSS: Map<string, number>, days: number): FitnessEntry[] {
  const sorted = Array.from(dailyTSS.keys()).sort();
  if (sorted.length === 0) return [];
  const start = new Date(sorted[0]);
  const end = new Date();
  const result: FitnessEntry[] = [];
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
