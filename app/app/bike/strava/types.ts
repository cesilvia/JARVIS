export interface StravaActivity {
  id: number;
  name: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  type: string;
  sport_type: string;
  trainer: boolean;
  gear_id: string | null;
  start_date: string;
  total_elevation_gain: number;
  average_speed: number;
  max_speed: number;
  average_heartrate?: number;
  max_heartrate?: number;
  has_heartrate?: boolean;
  average_watts?: number;
  max_watts?: number;
  weighted_average_watts?: number;
  device_watts?: boolean;
  kilojoules?: number;
  calories?: number;
  average_cadence?: number;
  suffer_score?: number;
  pr_count?: number;
  achievement_count?: number;
  kudos_count: number;
}

export interface StreamData {
  time?: number[];
  watts?: number[];
  heartrate?: number[];
  cadence?: number[];
  velocity_smooth?: number[];
  altitude?: number[];
  distance?: number[];
}

export interface Bike {
  id: string;
  name: string;
  type: string;
  stravaGearId?: string;
  totalMiles?: number;
  indoorMiles?: number;
  roadMiles?: number;
  [key: string]: unknown;
}

export interface ZoneConfig {
  ftp: number;
  maxHR: number;
  zonesUpdatedAt: string;
  powerZones: ZoneBand[];
  hrZones: ZoneBand[];
}

export interface ZoneBand {
  name: string;
  min: number;
  max: number;
  defaultMin: number;
  defaultMax: number;
  color: string;
}

export const STRAVA_ACTIVITIES_KEY = "jarvis-strava-activities";
export const STRAVA_TOKENS_KEY = "jarvis-strava-tokens";
export const STRAVA_LAST_SYNC_KEY = "jarvis-strava-last-sync";
export const STRAVA_ZONES_KEY = "jarvis-strava-zones";
export const STRAVA_POWER_CURVE_KEY = "jarvis-strava-power-curve";
export const BIKES_STORAGE_KEY = "jarvis-bikes";

export const METERS_TO_MILES = 1 / 1609.34;
export const METERS_TO_FEET = 3.28084;
export const MPS_TO_MPH = 2.23694;
export const AUTO_SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

export const POWER_ZONE_COLORS = [
  "#67C7EB", "#00D9FF", "#00FF88", "#FFD700", "#FF8C00", "#FF4444", "#FF00FF",
];
export const HR_ZONE_COLORS = [
  "#67C7EB", "#00D9FF", "#00FF88", "#FFD700", "#FF4444",
];

export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - ((day + 6) % 7));
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function getYearStart(): Date {
  return new Date(new Date().getFullYear(), 0, 1);
}

export function buildDefaultPowerZones(ftp: number): ZoneBand[] {
  const pcts = [
    { name: "Z1 Active Recovery", min: 0, max: 0.55 },
    { name: "Z2 Endurance", min: 0.55, max: 0.75 },
    { name: "Z3 Tempo", min: 0.75, max: 0.90 },
    { name: "Z4 Threshold", min: 0.90, max: 1.05 },
    { name: "Z5 VO2max", min: 1.05, max: 1.20 },
    { name: "Z6 Anaerobic", min: 1.20, max: 1.50 },
    { name: "Z7 Neuromuscular", min: 1.50, max: 9.99 },
  ];
  return pcts.map((z, i) => ({
    name: z.name,
    min: Math.round(ftp * z.min),
    max: z.max >= 9 ? 9999 : Math.round(ftp * z.max),
    defaultMin: Math.round(ftp * z.min),
    defaultMax: z.max >= 9 ? 9999 : Math.round(ftp * z.max),
    color: POWER_ZONE_COLORS[i],
  }));
}

export function buildDefaultHRZones(maxHR: number): ZoneBand[] {
  const pcts = [
    { name: "Z1 Recovery", min: 0, max: 0.60 },
    { name: "Z2 Aerobic", min: 0.60, max: 0.70 },
    { name: "Z3 Tempo", min: 0.70, max: 0.80 },
    { name: "Z4 Threshold", min: 0.80, max: 0.90 },
    { name: "Z5 VO2max", min: 0.90, max: 1.00 },
  ];
  return pcts.map((z, i) => ({
    name: z.name,
    min: Math.round(maxHR * z.min),
    max: Math.round(maxHR * z.max),
    defaultMin: Math.round(maxHR * z.min),
    defaultMax: Math.round(maxHR * z.max),
    color: HR_ZONE_COLORS[i],
  }));
}

export function loadZones(): ZoneConfig | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STRAVA_ZONES_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ZoneConfig;
  } catch {
    return null;
  }
}
