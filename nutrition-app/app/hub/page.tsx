"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CircuitBackground from "./CircuitBackground";
import WedgeSummaryCard from "./WedgeSummaryCard";

interface Module {
  id: string;
  name: string;
  description: string;
  icon: string;
  href: string;
  color: string;
  available: boolean;
}

const modules: Module[] = [
  {
    id: "calendar",
    name: "Calendar",
    description: "Connect and view your calendar",
    icon: "◇",
    href: "/calendar",
    color: "red",
    available: true,
  },
  {
    id: "nutrition",
    name: "Nutrition Tracker",
    description: "Track macros, ingredients, and recipes",
    icon: "◇",
    href: "/nutrition",
    color: "red",
    available: true,
  },
  {
    id: "strava",
    name: "Strava",
    description: "Cycling and bike gear",
    icon: "◇",
    href: "/bike",
    color: "red",
    available: true,
  },
  {
    id: "tasks",
    name: "Task Manager",
    description: "Manage your tasks and to-dos",
    icon: "◇",
    href: "/tasks",
    color: "red",
    available: true,
  },
  {
    id: "weather",
    name: "Weather",
    description: "Weather forecast and conditions",
    icon: "◇",
    href: "/weather",
    color: "red",
    available: true,
  },
  {
    id: "notes",
    name: "Notes",
    description: "Notes connected to Craft",
    icon: "◇",
    href: "/notes",
    color: "red",
    available: true,
  },
  {
    id: "health",
    name: "Health",
    description: "Health metrics and activity",
    icon: "◇",
    href: "/health",
    color: "red",
    available: true,
  },
];

const bottomModules = [
  { id: "settings", name: "Settings", href: "/settings" },
  { id: "profile", name: "Profile", href: "/profile" },
  { id: "status", name: "System Status", href: "/status" },
  { id: "alerts", name: "Alerts", href: "/alerts" },
];

// Profile icon: bald head, rectangular glasses
const JarvisProfileIcon = ({ className = "w-12 h-12", style, stroke: strokeColor }: { className?: string; style?: React.CSSProperties; stroke?: string }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    stroke={strokeColor ?? "currentColor"}
    strokeWidth="2.25"
    strokeLinecap="round"
    strokeLinejoin="round"
    preserveAspectRatio="xMidYMid meet"
    className={className}
    style={style}
    aria-hidden
  >
    <circle cx="24" cy="24" r="18" strokeWidth="1.25" fill="none" />
    {/* Bald head: dome top, rounded chin */}
    <path d="M24 8 C34 8 38 15 38 24 C38 32 34 38 24 38 C14 38 10 32 10 24 C10 15 14 8 24 8 Z" strokeWidth="2.25" />
    {/* Glasses */}
    <rect x="12" y="18" width="8" height="5" rx="0.5" strokeWidth="2.25" fill="none" />
    <rect x="28" y="18" width="8" height="5" rx="0.5" strokeWidth="2.25" fill="none" />
    <line x1="20" y1="20" x2="28" y2="20" strokeWidth="2.25" />
  </svg>
);

// JARVIS-style settings icon: sliders (control panel)
const JarvisSettingsIcon = ({ className = "w-8 h-8", style, stroke: strokeColor }: { className?: string; style?: React.CSSProperties; stroke?: string }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    stroke={strokeColor ?? "currentColor"}
    strokeWidth="2.25"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={style}
    aria-hidden
  >
    <circle cx="24" cy="24" r="18" strokeWidth="1.25" fill="none" />
    {/* Three sliders: track + knob */}
    <line x1="16" y1="18" x2="32" y2="18" strokeWidth="2.25" />
    <circle cx="22" cy="18" r="2.5" strokeWidth="2.25" fill="none" />
    <line x1="16" y1="24" x2="32" y2="24" strokeWidth="2.25" />
    <circle cx="28" cy="24" r="2.5" strokeWidth="2.25" fill="none" />
    <line x1="16" y1="30" x2="32" y2="30" strokeWidth="2.25" />
    <circle cx="24" cy="30" r="2.5" strokeWidth="2.25" fill="none" />
  </svg>
);

// JARVIS-style bike wheel icon (HUD: deep-section rim, small hub, thin crossed spokes)
const JarvisBikeWheelIcon = ({ className = "w-12 h-12", style, stroke: strokeColor }: { className?: string; style?: React.CSSProperties; stroke?: string }) => {
  const hubR = 2.5;
  const rimR = 14;
  const n = 16;
  const cross = 4; // 2-cross lacing: each spoke goes to rim 4 positions over
  const spokes = Array.from({ length: n }, (_, i) => {
    const a1 = (i * 2 * Math.PI) / n;
    const a2 = ((i + cross) * 2 * Math.PI) / n;
    return (
      <line
        key={i}
        x1={24 + hubR * Math.cos(a1)}
        y1={24 - hubR * Math.sin(a1)}
        x2={24 + rimR * Math.cos(a2)}
        y2={24 - rimR * Math.sin(a2)}
        strokeWidth="1.25"
        strokeLinecap="butt"
      />
    );
  });
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke={strokeColor ?? "currentColor"}
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden
    >
      <circle cx="24" cy="24" r="18" strokeWidth="1.25" fill="none" />
      {/* Rim (single circle where spokes meet) */}
      <circle cx="24" cy="24" r={rimR} strokeWidth="2.25" />
      {/* Small hub */}
      <circle cx="24" cy="24" r={hubR} strokeWidth="2.25" opacity="0.9" />
      {/* Crossed spokes (2-cross lacing, thin) */}
      {spokes}
    </svg>
  );
};

// JARVIS-style status icon: thin circle, gauge inside
const JarvisStatusIcon = ({ className = "w-12 h-12", style, stroke: strokeColor }: { className?: string; style?: React.CSSProperties; stroke?: string }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    stroke={strokeColor ?? "currentColor"}
    strokeWidth="2.25"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={style}
    aria-hidden
  >
    <circle cx="24" cy="24" r="18" strokeWidth="1.25" fill="none" />
    {/* Dial arc (bottom half of circle, like a speedometer) */}
    <path d="M10 24 A14 14 0 0 1 38 24" strokeWidth="2.25" />
    {/* Tick marks at 0°, 45°, 90°, 135°, 180° (radial, on the arc) */}
    <line x1="36" y1="24" x2="38" y2="24" strokeWidth="2.25" />
    <line x1="32.3" y1="15.7" x2="34" y2="14" strokeWidth="2.25" />
    <line x1="24" y1="12" x2="24" y2="10" strokeWidth="2.25" />
    <line x1="15.7" y1="15.7" x2="14" y2="14" strokeWidth="2.25" />
    <line x1="12" y1="24" x2="10" y2="24" strokeWidth="2.25" />
    {/* Center pivot (small circle) */}
    <circle cx="24" cy="24" r="2" strokeWidth="2.25" opacity="0.9" />
    {/* Needle (pivots from center, pointing up) */}
    <line x1="24" y1="24" x2="24" y2="11" strokeWidth="2.25" />
  </svg>
);

// JARVIS-style alert/notification icon (exclamation in triangle – warning/alert)
const JarvisAlertIcon = ({ className = "w-12 h-12", style, stroke: strokeColor }: { className?: string; style?: React.CSSProperties; stroke?: string }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    stroke={strokeColor ?? "currentColor"}
    strokeWidth="2.25"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={style}
    aria-hidden
  >
    <circle cx="24" cy="24" r="18" strokeWidth="1.25" fill="none" />
    {/* Triangle (warning shape) – fully inside circle */}
    <path d="M24 12 L32 34 L16 34 Z" strokeWidth="2.25" fill="none" />
    {/* Exclamation: dot + vertical line */}
    <line x1="24" y1="19" x2="24" y2="27" strokeWidth="2.25" />
    <circle cx="24" cy="30" r="1.25" strokeWidth="2.25" fill="none" />
  </svg>
);

// JARVIS-style notes icon: clipboard (Craft)
const JarvisNotesIcon = ({ className = "w-12 h-12", style, stroke: strokeColor }: { className?: string; style?: React.CSSProperties; stroke?: string }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    stroke={strokeColor ?? "currentColor"}
    strokeWidth="2.25"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={style}
    aria-hidden
  >
    <circle cx="24" cy="24" r="18" strokeWidth="1.25" fill="none" />
    {/* Clipboard: top bar (clip) + main board + list lines */}
    <rect x="18" y="10" width="12" height="4" rx="1" strokeWidth="2.25" fill="none" />
    <rect x="14" y="14" width="20" height="22" rx="1" strokeWidth="2.25" fill="none" />
    <line x1="18" y1="20" x2="30" y2="20" strokeWidth="2.25" />
    <line x1="18" y1="26" x2="30" y2="26" strokeWidth="2.25" />
    <line x1="18" y1="32" x2="26" y2="32" strokeWidth="2.25" />
  </svg>
);

// JARVIS-style health icon: heart rate / EKG graph
const JarvisHealthIcon = ({ className = "w-12 h-12", style, stroke: strokeColor }: { className?: string; style?: React.CSSProperties; stroke?: string }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    stroke={strokeColor ?? "currentColor"}
    strokeWidth="2.25"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={style}
    aria-hidden
  >
    <circle cx="24" cy="24" r="18" strokeWidth="1.25" fill="none" />
    {/* EKG: P (small bump), Q (dip), R (tall spike), S (dip), T (rounded) */}
    <path d="M14 26 L15.5 24 L17 26 L19 26 L19.5 28 L20 12 L20.5 30 L22 26 L23.5 22 L25 26 L34 26" strokeWidth="2.25" fill="none" />
  </svg>
);

// JARVIS-style weather icon: sun with rays
const JarvisWeatherIcon = ({ className = "w-12 h-12", style, stroke: strokeColor }: { className?: string; style?: React.CSSProperties; stroke?: string }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    stroke={strokeColor ?? "currentColor"}
    strokeWidth="2.25"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={style}
    aria-hidden
  >
    <circle cx="24" cy="24" r="18" strokeWidth="1.25" fill="none" />
    {/* Sun: center circle + 8 rays */}
    <circle cx="24" cy="24" r="4" strokeWidth="2.25" fill="none" />
    <line x1="24" y1="10" x2="24" y2="14" strokeWidth="2.25" strokeLinecap="round" />
    <line x1="24" y1="34" x2="24" y2="38" strokeWidth="2.25" strokeLinecap="round" />
    <line x1="10" y1="24" x2="14" y2="24" strokeWidth="2.25" strokeLinecap="round" />
    <line x1="34" y1="24" x2="38" y2="24" strokeWidth="2.25" strokeLinecap="round" />
    <line x1="13.2" y1="13.2" x2="16" y2="16" strokeWidth="2.25" strokeLinecap="round" />
    <line x1="32" y1="32" x2="34.8" y2="34.8" strokeWidth="2.25" strokeLinecap="round" />
    <line x1="34.8" y1="13.2" x2="32" y2="16" strokeWidth="2.25" strokeLinecap="round" />
    <line x1="16" y1="32" x2="13.2" y2="34.8" strokeWidth="2.25" strokeLinecap="round" />
  </svg>
);

// JARVIS-style task manager icon: checklist with empty circles (task2)
const JarvisTaskManagerIcon = ({ className = "w-12 h-12", style, stroke: strokeColor }: { className?: string; style?: React.CSSProperties; stroke?: string }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    stroke={strokeColor ?? "currentColor"}
    strokeWidth="2.25"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={style}
    aria-hidden
  >
    <circle cx="24" cy="24" r="18" strokeWidth="1.25" fill="none" />
    {/* Checklist: circles + horizontal lines */}
    <circle cx="16" cy="18" r="2.5" strokeWidth="2.25" fill="none" />
    <line x1="22" y1="18" x2="34" y2="18" strokeWidth="2.25" />
    <circle cx="16" cy="24" r="2.5" strokeWidth="2.25" fill="none" />
    <line x1="22" y1="24" x2="34" y2="24" strokeWidth="2.25" />
    <circle cx="16" cy="30" r="2.5" strokeWidth="2.25" fill="none" />
    <line x1="22" y1="30" x2="30" y2="30" strokeWidth="2.25" />
  </svg>
);

// JARVIS-style calendar icon: calendar page with grid
const JarvisCalendarIcon = ({ className = "w-12 h-12", style, stroke: strokeColor }: { className?: string; style?: React.CSSProperties; stroke?: string }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    stroke={strokeColor ?? "currentColor"}
    strokeWidth="2.25"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={style}
    aria-hidden
  >
    <circle cx="24" cy="24" r="18" strokeWidth="1.25" fill="none" />
    {/* Calendar: rectangle with top bar + grid lines */}
    <rect x="14" y="12" width="20" height="24" rx="1" strokeWidth="2.25" fill="none" />
    <line x1="14" y1="18" x2="34" y2="18" strokeWidth="2.25" />
    <line x1="20" y1="18" x2="20" y2="36" strokeWidth="1.5" opacity="0.8" />
    <line x1="28" y1="18" x2="28" y2="36" strokeWidth="1.5" opacity="0.8" />
    <line x1="14" y1="24" x2="34" y2="24" strokeWidth="1.5" opacity="0.8" />
    <line x1="14" y1="30" x2="34" y2="30" strokeWidth="1.5" opacity="0.8" />
  </svg>
);

// JARVIS-style nutrition icon: plate with fork (left) and knife (right)
const JarvisNutritionIcon = ({ className = "w-12 h-12", style, stroke: strokeColor }: { className?: string; style?: React.CSSProperties; stroke?: string }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    stroke={strokeColor ?? "currentColor"}
    strokeWidth="2.25"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={style}
    aria-hidden
  >
    <circle cx="24" cy="24" r="18" strokeWidth="1.25" fill="none" />
    {/* Plate (inner circle) */}
    <circle cx="24" cy="24" r="9" strokeWidth="2.25" fill="none" />
    {/* Fork (left): handle + 3 tines, inside r=18 */}
    <line x1="11" y1="15" x2="11" y2="33" strokeWidth="2.25" />
    <line x1="9" y1="15" x2="9" y2="20" strokeWidth="2.25" />
    <line x1="11" y1="15" x2="11" y2="20" strokeWidth="2.25" />
    <line x1="13" y1="15" x2="13" y2="20" strokeWidth="2.25" />
    <line x1="9" y1="15" x2="13" y2="15" strokeWidth="2.25" />
    {/* Knife (right): straight vertical line */}
    <line x1="37" y1="15" x2="37" y2="33" strokeWidth="2.25" />
  </svg>
);

// J.A.R.V.I.S. frame wrapper component - using the uploaded image
const JarvisFrame = ({ isLarge }: { isLarge: boolean }) => {
  return (
      <img
        src="/assets/jarvis-frame.png"
        alt="JARVIS Frame"
        className="jarvis-hud hud-element"
      />
  );
};

// Helper component to render stylized icons
const StylizedIcon = ({ moduleId, size = "text-4xl", iconColor }: { moduleId: string; size?: string; iconColor?: string }) => {
  const isLarge = size === "text-4xl";
  const isMedium = size === "text-2xl";
  const isSmall = size === "text-xl";
  
  // Adjust frame size based on icon size - smaller for compact display
  const frameSize = isLarge ? "w-12 h-12" : isMedium ? "w-8 h-8" : isSmall ? "w-10 h-10" : "w-6 h-6";
  const iconSize = isLarge ? "w-12 h-12" : isMedium ? "w-8 h-8" : isSmall ? "w-10 h-10" : "w-6 h-6";
  const nutritionIconSize = isLarge ? "w-32 h-32" : isMedium ? "w-20 h-20" : isSmall ? "w-[90px] h-[90px]" : "w-16 h-16";
  const borderWidth = isLarge ? "border-[3px]" : "border-2";

  const iconStyles: { [key: string]: React.ReactElement } = {
    calendar: <JarvisCalendarIcon className={nutritionIconSize} stroke={iconColor} />,
    nutrition: <JarvisNutritionIcon className={nutritionIconSize} stroke={iconColor} />,
    strava: <JarvisBikeWheelIcon className={nutritionIconSize} stroke={iconColor} />,
    tasks: <JarvisTaskManagerIcon className={nutritionIconSize} stroke={iconColor} />,
    weather: <JarvisWeatherIcon className={nutritionIconSize} stroke={iconColor} />,
    notes: <JarvisNotesIcon className={nutritionIconSize} stroke={iconColor} />,
    health: <JarvisHealthIcon className={nutritionIconSize} stroke={iconColor} />,
  };

  const icon = iconStyles[moduleId] || <div className={`${iconSize} ${borderWidth} border-[#FBCA03]`}></div>;
  return iconColor ? <span style={{ color: iconColor, display: "inline-flex" }}>{icon}</span> : icon;
};

// JARVIS 4.0 theme (only theme)
const currentTheme = {
  name: "JARVIS 4.0",
  primary: "#00D9FF",
  secondary: "#67C7EB",
  accent: "#00FF88",
  background: "#000000",
  cardBg: "rgba(0, 217, 255, 0.05)",
  text: "#00D9FF",
  textSecondary: "#67C7EB",
  style: "classic" as const,
  glow: "#00D9FF",
  circuit: "#00D9FF"
};

const ALERT_ICON_ORANGE = "#FF6600";

// Same logic as alerts page: backup overdue + helmet reminders
const JARVIS_LAST_BACKUP_KEY = "jarvis-last-nutrition-backup";
const BACKUP_REMINDER_DAYS = 7;
const GEAR_STORAGE_KEY = "jarvis-gear-inventory";
const HELMET_REMINDER_DAYS = 30;

function hubGetAlertSummaries(): string[] {
  const lines: string[] = [];
  if (typeof window === "undefined") return lines;
  const lastBackup = localStorage.getItem(JARVIS_LAST_BACKUP_KEY);
  if (!lastBackup) {
    lines.push("Back up nutrition data");
    return lines;
  }
  const daysSince = (Date.now() - new Date(lastBackup).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSince >= BACKUP_REMINDER_DAYS) {
    lines.push("Back up nutrition data");
  }
  const raw = localStorage.getItem(GEAR_STORAGE_KEY);
  if (raw) {
    try {
      const items: { name: string; category: string; purchaseDate?: string; replaceReminderYears?: number }[] = JSON.parse(raw);
      const cutoff = Date.now() + HELMET_REMINDER_DAYS * 24 * 60 * 60 * 1000;
      for (const item of items) {
        if (item.category !== "Helmets" || !item.purchaseDate || !item.replaceReminderYears) continue;
        const d = new Date(item.purchaseDate);
        if (isNaN(d.getTime())) continue;
        d.setFullYear(d.getFullYear() + item.replaceReminderYears);
        if (d.getTime() <= cutoff) {
          lines.push(`Helmet: ${item.name} — replace by ${d.toLocaleDateString()}`);
        }
      }
    } catch {
      // ignore
    }
  }
  return lines;
}

export default function HubPage() {
  const router = useRouter();
  const [wedgeModule, setWedgeModule] = useState<string | null>(null);
  const [nutritionStats, setNutritionStats] = useState({ recipes: 0, ingredients: 0 });
  const [hasAlerts, setHasAlerts] = useState(false);
  const [alertSummaries, setAlertSummaries] = useState<string[]>([]);
  const centerRef = useRef<HTMLDivElement>(null);
  const contentAreaRef = useRef<HTMLDivElement>(null);
  const iconRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Load nutrition stats
  useEffect(() => {
    if (typeof window !== "undefined") {
      const recipes = localStorage.getItem("jarvis-recipes");
      const ingredients = localStorage.getItem("jarvis-saved-ingredients");
      if (recipes) {
        try {
          const parsed = JSON.parse(recipes);
          const ingCount = ingredients ? JSON.parse(ingredients).length : 0;
          setNutritionStats({ recipes: parsed.length, ingredients: ingCount });
        } catch (e) {
          // Ignore
        }
      }
    }
  }, []);

  // Check for alerts (same conditions as alerts page: backup overdue, helmet reminders)
  useEffect(() => {
    const summaries = hubGetAlertSummaries();
    setAlertSummaries(summaries);
    setHasAlerts(summaries.length > 0);
    const interval = setInterval(() => {
      const s = hubGetAlertSummaries();
      setAlertSummaries(s);
      setHasAlerts(s.length > 0);
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Wedge geometry: compute from center and icon positions
  const [wedgeProps, setWedgeProps] = useState<{
    originX: number;
    originY: number;
    angleDeg: number;
    length: number;
    wedgeAngleDeg: number;
  } | null>(null);
  useEffect(() => {
    if (!wedgeModule || !centerRef.current || !contentAreaRef.current) {
      setWedgeProps(null);
      return;
    }
    const centerRect = centerRef.current.getBoundingClientRect();
    const contentRect = contentAreaRef.current.getBoundingClientRect();
    const centerX = centerRect.left - contentRect.left + centerRect.width / 2;
    const centerY = centerRect.top - contentRect.top + centerRect.height / 2;

    const iconEl = iconRefs.current[wedgeModule];
    if (!iconEl) {
      setWedgeProps(null);
      return;
    }
    const iconRect = iconEl.getBoundingClientRect();
    const iconX = iconRect.left - contentRect.left + iconRect.width / 2;
    const iconY = iconRect.top - contentRect.top + iconRect.height / 2;

    const dx = iconX - centerX;
    const dy = iconY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy) || 1;
    // Angle: 0 = east, 90 = south (screen coords). atan2(dy, dx) gives standard math angle.
    const angleRad = Math.atan2(dy, dx);
    const angleDeg = (angleRad * 180) / Math.PI;

    // Wedge angle: standardized at 120° for all
    const wedgeAngleDeg = 120;

    // Use Strava wedge as reference - all wedges stop at same Y (same distance from icon row).
    const healthEl = iconRefs.current["health"];
    const healthDist = healthEl
      ? (() => {
          const r = healthEl.getBoundingClientRect();
          const ix = r.left - contentRect.left + r.width / 2;
          const iy = r.top - contentRect.top + r.height / 2;
          return Math.sqrt((ix - centerX) ** 2 + (iy - centerY) ** 2);
        })()
      : distance;
    const stravaLength = healthDist * 0.6;

    // All wedges: same dimensions, size, shape as Strava wedge.
    const length = stravaLength;

    setWedgeProps({
      originX: centerX,
      originY: centerY,
      angleDeg,
      length,
      wedgeAngleDeg,
    });
  }, [wedgeModule]);

  // Click outside to close wedge
  useEffect(() => {
    if (!wedgeModule) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-wedge]") || target.closest("[data-module-icon]") || target.closest("[data-bottom-icon]")) return;
      setWedgeModule(null);
    };
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, [wedgeModule]);

  const handleIconClick = useCallback((moduleId: string) => {
    const topModule = modules.find((m) => m.id === moduleId);
    const bottomModule = bottomModules.find((m) => m.id === moduleId);
    if (topModule && !topModule.available) return;
    setWedgeModule((prev) => (prev === moduleId ? null : moduleId));
  }, []);

  const handleIconDoubleClick = useCallback(
    (moduleId: string, href: string) => {
      router.push(href);
    },
    [router]
  );

  const handleWedgeNavigate = useCallback(
    (moduleId: string) => {
      const topModule = modules.find((m) => m.id === moduleId);
      const bottomModule = bottomModules.find((m) => m.id === moduleId);
      const href = topModule?.href ?? bottomModule?.href;
      if (!href) return;
      setWedgeModule(null);
      router.push(href);
    },
    [router]
  );

  return (
    <div className="min-h-screen hud-scifi-bg" style={{ 
      backgroundColor: currentTheme.background,
      color: currentTheme.primary
    }}>
      <CircuitBackground />
      <main className="w-full min-h-screen flex flex-col items-center justify-center px-4 py-8 relative z-10">
        <div ref={contentAreaRef} className="flex-1 w-full max-w-4xl flex flex-col items-center justify-center gap-6 relative">
            {/* Top Module Frames - z-30 so icons stay clickable above wedge overlay */}
            <div className="flex-shrink-0 mb-4 relative z-30">
              <div className="flex items-center justify-center gap-2">
                {modules.map((module) => {
                  const isSelected = wedgeModule === module.id;
                  const isAvailable = module.available;
                  const isNutrition = module.id === "nutrition";
                  const isStrava = module.id === "strava";
                  const isCalendar = module.id === "calendar";
                  const isTasks = module.id === "tasks";
                  const isWeather = module.id === "weather";
                  const isNotes = module.id === "notes";
                  const isHealth = module.id === "health";
                  const frameSize = (isNutrition || isStrava || isCalendar || isTasks || isWeather || isNotes || isHealth) ? 90 : 50;
                  return (
                    <button
                      key={module.id}
                      ref={(el) => { iconRefs.current[module.id] = el; }}
                      data-module-icon
                      onClick={() => handleIconClick(module.id)}
                      onDoubleClick={() => handleIconDoubleClick(module.id, module.href)}
                      className={`relative transition-all bg-transparent border-none p-0 ${
                        isAvailable ? "cursor-pointer hover:scale-110" : "cursor-not-allowed opacity-40"
                      }`}
                      style={{
                        width: `${frameSize}px`,
                        height: `${frameSize}px`,
                        background: "transparent",
                        border: "none",
                        outline: "none",
                        boxShadow: "none"
                      }}
                      title={module.name}
                    >
                      <div
                        className={`w-full h-full flex items-center justify-center transition-all rounded-full ${
                          isSelected ? "hud-pulse" : ""
                        }`}
                        style={{
                          backgroundColor: isSelected ? currentTheme.primary : "transparent",
                          filter: isSelected
                            ? `drop-shadow(0 0 4px ${currentTheme.background}) drop-shadow(0 0 8px ${currentTheme.background}80)`
                            : `drop-shadow(0 0 3px ${currentTheme.primary}) drop-shadow(0 0 6px ${currentTheme.primary}60)`
                        }}
                      >
                        <div className="w-full h-full flex items-center justify-center rounded-full" style={{ background: "transparent", color: isSelected ? currentTheme.background : currentTheme.primary }}>
                          <StylizedIcon moduleId={module.id} size="text-xl" iconColor={isSelected ? currentTheme.background : currentTheme.primary} />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Main Content Area - Center Frame Only (no left panel) */}
            <div className="flex-1 flex items-center justify-center min-h-0 relative">
              <div
                ref={centerRef}
                className="w-80 h-80 md:w-96 md:h-96 flex items-center justify-center flex-shrink-0"
                style={{ background: "transparent" }}
              >
                <img
                  src="/assets/jarvis-frame.png"
                  alt="JARVIS Frame"
                  className="jarvis-hud hud-element"
                  style={{ width: "100%", height: "100%", objectFit: "contain", background: "transparent", border: "none", boxShadow: "none" }}
                />
              </div>
            </div>
            {/* Wedge summary overlay - positioned relative to content area */}
            {wedgeModule && wedgeProps && (() => {
              const topModule = modules.find((m) => m.id === wedgeModule);
              const bottomModule = bottomModules.find((m) => m.id === wedgeModule);
              const href = topModule?.href ?? bottomModule?.href;
              if (!href) return null;
              const themeColor = wedgeModule === "alerts" && hasAlerts ? ALERT_ICON_ORANGE : currentTheme.primary;
              return (
                <div className="absolute inset-0 overflow-visible" style={{ zIndex: 20, pointerEvents: "none" }}>
                  <div style={{ pointerEvents: "auto" }}>
                    <WedgeSummaryCard
                      originX={wedgeProps.originX}
                      originY={wedgeProps.originY}
                      angleDeg={wedgeProps.angleDeg}
                      length={wedgeProps.length}
                      wedgeAngleDeg={wedgeProps.wedgeAngleDeg}
                      moduleHref={href}
                      themeColor={themeColor}
                      onNavigate={() => handleWedgeNavigate(wedgeModule)}
                      summaryLines={wedgeModule === "alerts" ? (alertSummaries.length > 0 ? alertSummaries : ["No Current Alerts"]) : undefined}
                    />
                  </div>
                </div>
              );
            })()}

            {/* Bottom Frames - Settings, Profile, Status, Notifications - z-30 so icons stay clickable */}
            <div className="flex-shrink-0 mt-4 relative z-30">
              <div className="flex items-center justify-center gap-4">
                {bottomModules.map((module) => {
                  const isSelected = wedgeModule === module.id;
                  const iconColor = module.id === "alerts" && hasAlerts ? ALERT_ICON_ORANGE : currentTheme.primary;
                  const BottomIcon = module.id === "settings" ? JarvisSettingsIcon : module.id === "profile" ? JarvisProfileIcon : module.id === "status" ? JarvisStatusIcon : JarvisAlertIcon;
                  return (
                    <button
                      key={module.id}
                      ref={(el) => { iconRefs.current[module.id] = el; }}
                      data-bottom-icon
                      onClick={() => handleIconClick(module.id)}
                      onDoubleClick={() => handleIconDoubleClick(module.id, module.href)}
                      className="flex items-center justify-center w-24 h-24 flex-shrink-0 p-2 transition-all hover:scale-105 focus:outline-none focus:ring-0 border-0 bg-transparent cursor-pointer"
                      title={module.name}
                    >
                      <div
                        className={`w-full h-full flex items-center justify-center transition-all rounded-full ${
                          isSelected ? "hud-pulse" : ""
                        }`}
                        style={{
                          backgroundColor: isSelected ? iconColor : "transparent",
                          filter: isSelected
                            ? `drop-shadow(0 0 4px ${currentTheme.background}) drop-shadow(0 0 8px ${currentTheme.background}80)`
                            : `drop-shadow(0 0 3px ${iconColor}) drop-shadow(0 0 6px ${iconColor}60)`,
                        }}
                      >
                        <div className="w-full h-full flex items-center justify-center rounded-full" style={{ background: "transparent", color: isSelected ? currentTheme.background : iconColor }}>
                          <BottomIcon className="w-24 h-24" stroke={isSelected ? currentTheme.background : iconColor} />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
      </main>
    </div>
  );
}
