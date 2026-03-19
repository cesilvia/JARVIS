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
  map?: { summary_polyline?: string };
  description?: string;
  start_latlng?: [number, number];
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

export interface StravaGoal {
  key: string;
  label: string;
  target: number;
  unit: string;
  period: "weekly" | "yearly";
}

export const DEFAULT_GOALS: StravaGoal[] = [
  { key: "weekly-miles", label: "Weekly Miles", target: 100, unit: "mi", period: "weekly" },
  { key: "yearly-miles", label: "Yearly Miles", target: 5000, unit: "mi", period: "yearly" },
  { key: "yearly-elevation", label: "Yearly Climbing", target: 130000, unit: "ft", period: "yearly" },
  { key: "yearly-rides", label: "Yearly Rides", target: 183, unit: "rides", period: "yearly" },
];

// ─── Weather types ──────────────────────────────────────────────

export interface RideWeather {
  activityId: number;
  temperature: number | null;   // Celsius
  feelsLike: number | null;     // Celsius
  windSpeed: number | null;     // km/h
  windDirection: number | null; // degrees
  precipitation: number | null; // mm
  weatherCode: number | null;   // WMO code
  humidity: number | null;      // percent
  timeline: WeatherTimelinePoint[] | null;
}

export interface HourlyForecast {
  time: string;
  temperature: number;
  feelsLike: number;
  windSpeed: number;
  windDirection: number;
  precipitation: number;
  precipitationProbability: number;
  weatherCode: number;
  humidity: number;
}

export interface GeoResult {
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1?: string;
}

export const KMH_TO_MPH = 0.621371;
export const C_TO_F = (c: number) => Math.round(c * 9 / 5 + 32);
export const MM_TO_IN = (mm: number) => +(mm / 25.4).toFixed(2);

export function windDirectionToCardinal(deg: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

const WMO_CODES: Record<number, string> = {
  0: "Clear", 1: "Mostly Clear", 2: "Partly Cloudy", 3: "Overcast",
  45: "Foggy", 48: "Rime Fog",
  51: "Light Drizzle", 53: "Drizzle", 55: "Heavy Drizzle",
  61: "Light Rain", 63: "Rain", 65: "Heavy Rain",
  66: "Light Freezing Rain", 67: "Freezing Rain",
  71: "Light Snow", 73: "Snow", 75: "Heavy Snow", 77: "Snow Grains",
  80: "Light Showers", 81: "Showers", 82: "Heavy Showers",
  85: "Light Snow Showers", 86: "Snow Showers",
  95: "Thunderstorm", 96: "Thunderstorm w/ Hail", 99: "Severe Thunderstorm",
};

export function weatherCodeToLabel(code: number): string {
  return WMO_CODES[code] ?? "Unknown";
}

// ─── Polyline decoder ───────────────────────────────────────────

export function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let i = 0, lat = 0, lng = 0;
  while (i < encoded.length) {
    let shift = 0, result = 0, byte: number;
    do { byte = encoded.charCodeAt(i++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);
    shift = 0; result = 0;
    do { byte = encoded.charCodeAt(i++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : (result >> 1);
    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}

// Sample N evenly-spaced points along a polyline
export function samplePolylinePoints(points: [number, number][], n: number): [number, number][] {
  if (points.length <= n) return points;
  const result: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const idx = Math.round((i / (n - 1)) * (points.length - 1));
    result.push(points[idx]);
  }
  return result;
}

export interface WeatherTimelinePoint {
  hour: number;       // hour into the ride (0 = start)
  lat: number;
  lng: number;
  temperature: number | null;
  feelsLike: number | null;
  windSpeed: number | null;
  windDirection: number | null;
  precipitation: number | null;
  weatherCode: number | null;
}

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

export function formatHours(seconds: number): string {
  const hrs = seconds / 3600;
  return `${hrs.toFixed(2)} hrs`;
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

