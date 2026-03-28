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

// ─── Training Load Constants ────────────────────────────────

export interface TrainingLoadConstants {
  atlConstant: number; // days, default 10 (recovery-adjusted for older athlete)
  ctlConstant: number; // days, default 42 (standard)
}

export const DEFAULT_TRAINING_LOAD_CONSTANTS: TrainingLoadConstants = {
  atlConstant: 10,
  ctlConstant: 42,
};

// ─── CTL / ATL / TSB ────────────────────────────────────────

export interface FitnessEntry {
  date: string;
  ctl: number;
  atl: number;
  tsb: number;
  tss: number;
}

/**
 * Compute CTL/ATL/TSB from daily TSS values using the Coggan/TrainingPeaks
 * exponential weighted moving average model.
 *
 *   CTL_today = CTL_yesterday + (dailyTSS - CTL_yesterday) / CTL_CONSTANT
 *   ATL_today = ATL_yesterday + (dailyTSS - ATL_yesterday) / ATL_CONSTANT
 *   TSB_today = CTL_today - ATL_today
 *
 * Days with no activities are included with TSS=0 so CTL/ATL decay correctly.
 */
export function computeFitness(
  dailyTSS: Map<string, number>,
  days: number,
  constants?: Partial<TrainingLoadConstants>,
): FitnessEntry[] {
  const { atlConstant, ctlConstant } = { ...DEFAULT_TRAINING_LOAD_CONSTANTS, ...constants };

  const sorted = Array.from(dailyTSS.keys()).sort();
  if (sorted.length === 0) return [];
  const start = new Date(sorted[0]);
  const end = new Date();
  const result: FitnessEntry[] = [];
  let ctl = 0;
  let atl = 0;

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    const tss = dailyTSS.get(key) || 0;

    ctl = ctl + (tss - ctl) / ctlConstant;
    atl = atl + (tss - atl) / atlConstant;

    result.push({
      date: key,
      ctl: Math.round(ctl * 10) / 10,
      atl: Math.round(atl * 10) / 10,
      tsb: Math.round((ctl - atl) * 10) / 10,
      tss: Math.round(tss * 10) / 10,
    });
  }
  return result.slice(-days);
}
