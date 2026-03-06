"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

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
    id: "nutrition",
    name: "Nutrition Tracker",
    description: "Track macros, ingredients, and recipes",
    icon: "◇",
    href: "/nutrition",
    color: "red",
    available: true,
  },
  {
    id: "bike",
    name: "Bike Gear",
    description: "Cycling and bike gear",
    icon: "◇",
    href: "/bike",
    color: "red",
    available: true,
  },
  {
    id: "strava",
    name: "Strava",
    description: "Strava",
    icon: "◇",
    href: "/strava",
    color: "red",
    available: true,
  },
];

// Profile icon: bald male head outline with rectangular glasses; same style as other icons
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
    {/* Bald head outline: round top (dome), natural sides, rounded chin – oval */}
    <path d="M24 8 C33 8 37 14 37 23 C37 31 34 38 24 39 C14 38 11 31 11 23 C11 14 15 8 24 8 Z" strokeWidth="2.25" />
    {/* Rectangular glasses – left lens */}
    <rect x="12" y="18" width="8" height="6" rx="0.5" strokeWidth="2.25" fill="none" />
    {/* Rectangular glasses – right lens */}
    <rect x="28" y="18" width="8" height="6" rx="0.5" strokeWidth="2.25" fill="none" />
    {/* Bridge between lenses */}
    <line x1="20" y1="20.5" x2="28" y2="20.5" strokeWidth="2.25" />
  </svg>
);

// JARVIS-style settings gear icon (HUD / Iron Man aesthetic: wireframe cog, geometric, tech)
const JarvisSettingsIcon = ({ className = "w-8 h-8", style }: { className?: string; style?: React.CSSProperties }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.25"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={style}
    aria-hidden
  >
    {/* Inner hub */}
    <circle cx="24" cy="24" r="6" strokeWidth="2.25" opacity="0.9" />
    {/* Outer ring (r=14 to match other icons) */}
    <circle cx="24" cy="24" r="14" strokeWidth="2.25" />
    {/* 8 gear teeth (short, within r=14 boundary) */}
    <line x1="24" y1="12" x2="24" y2="10" strokeWidth="2.25" />
    <line x1="24" y1="36" x2="24" y2="38" strokeWidth="2.25" />
    <line x1="12" y1="24" x2="10" y2="24" strokeWidth="2.25" />
    <line x1="36" y1="24" x2="38" y2="24" strokeWidth="2.25" />
    <line x1="17" y1="17" x2="14" y2="14" strokeWidth="2.25" />
    <line x1="31" y1="31" x2="34" y2="34" strokeWidth="2.25" />
    <line x1="17" y1="31" x2="14" y2="34" strokeWidth="2.25" />
    <line x1="31" y1="17" x2="34" y2="14" strokeWidth="2.25" />
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
        strokeLinecap="round"
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
      {/* Deep-section rim (r=14 to match other icons) */}
      <circle cx="24" cy="24" r="14" strokeWidth="2.25" />
      <circle cx="24" cy="24" r="12" strokeWidth="2.25" />
      {/* Small hub */}
      <circle cx="24" cy="24" r={hubR} strokeWidth="2.25" opacity="0.9" />
      {/* Crossed spokes (2-cross lacing, thin) */}
      {spokes}
    </svg>
  );
};

// JARVIS-style bike gear / cassette icon (HUD: side view – vertical lines, short to long)
const JarvisBikeGearIcon = ({ className = "w-12 h-12", style, stroke: strokeColor }: { className?: string; style?: React.CSSProperties; stroke?: string }) => (
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
    {/* Vertical lines (short left → long right) */}
    <line x1="14" y1="20" x2="14" y2="28" strokeWidth="2.25" />
    <line x1="18" y1="16" x2="18" y2="32" strokeWidth="2.25" />
    <line x1="22" y1="14" x2="22" y2="34" strokeWidth="2.25" />
    <line x1="26" y1="12" x2="26" y2="36" strokeWidth="2.25" />
    <line x1="30" y1="10" x2="30" y2="38" strokeWidth="2.25" />
    <line x1="34" y1="8" x2="34" y2="40" strokeWidth="2.25" />
  </svg>
);

// JARVIS-style status icon (realistic gauge: dial arc, tick marks, center pivot, needle)
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
    {/* Outer ring */}
    <circle cx="24" cy="24" r="14" strokeWidth="2.25" />
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
    <circle cx="24" cy="24" r="14" strokeWidth="2.25" />
    {/* Triangle (warning shape) – fully inside circle */}
    <path d="M24 12 L32 34 L16 34 Z" strokeWidth="2.25" fill="none" />
    {/* Exclamation: dot + vertical line */}
    <line x1="24" y1="19" x2="24" y2="27" strokeWidth="2.25" />
    <circle cx="24" cy="30" r="1.25" strokeWidth="2.25" fill="none" />
  </svg>
);

// JARVIS-style nutrition icon (HUD / Iron Man: macro wheel – carbs/protein/fat segments)
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
    {/* Outer ring */}
    <circle cx="24" cy="24" r="14" strokeWidth="2.25" />
    {/* Inner hub */}
    <circle cx="24" cy="24" r="5" strokeWidth="2.25" opacity="0.9" />
    {/* Three macro segments (120° each) – radial lines to rim */}
    <line x1="24" y1="24" x2="24" y2="10" strokeWidth="2.25" />
    <line x1="24" y1="24" x2="12" y2="17" strokeWidth="2.25" />
    <line x1="24" y1="24" x2="36" y2="17" strokeWidth="2.25" />
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
  const nutritionIconSize = isLarge ? "w-32 h-32" : isMedium ? "w-20 h-20" : isSmall ? "w-24 h-24" : "w-16 h-16";
  const borderWidth = isLarge ? "border-[3px]" : "border-2";

  const iconStyles: { [key: string]: React.ReactElement } = {
    nutrition: <JarvisNutritionIcon className={nutritionIconSize} stroke={iconColor} />,
    bike: <JarvisBikeGearIcon className={nutritionIconSize} stroke={iconColor} />,
    strava: <JarvisBikeWheelIcon className={nutritionIconSize} stroke={iconColor} />,
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

export default function HubPage() {
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [nutritionStats, setNutritionStats] = useState({ recipes: 0, ingredients: 0 });
  const [hasAlerts, setHasAlerts] = useState(false);
  const hudClass = currentTheme.style === "classic" ? "hud-card" : "hud-modern";

  // Mock data for command center
  const mockAppointments = [
    { time: "09:00", title: "Team Meeting", location: "Conference Room A" },
    { time: "14:30", title: "Client Call", location: "Zoom" },
    { time: "16:00", title: "Project Review", location: "Office" }
  ];
  
  const mockTasks = [
    { id: 1, title: "Review quarterly reports", priority: "high", due: "Today" },
    { id: 2, title: "Update project documentation", priority: "medium", due: "Tomorrow" },
    { id: 3, title: "Schedule team lunch", priority: "low", due: "This week" }
  ];
  
  const mockWeather = {
    location: "San Francisco, CA",
    temp: "72°F",
    condition: "Partly Cloudy",
    high: "75°F",
    low: "68°F",
    humidity: "65%",
    wind: "10 mph NW"
  };

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

  // Check for unread alerts (from localStorage; set by alerts page when alerts exist)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const unread = localStorage.getItem("jarvis-unread-alerts");
      setHasAlerts(!!unread && unread !== "0" && unread !== "[]");
    }
  }, []);

  return (
    <div className="min-h-screen hud-circuit-bg" style={{ 
      backgroundColor: currentTheme.background,
      color: currentTheme.primary
    }}>
      <main className="container mx-auto px-4 py-8 max-w-6xl relative z-10" style={{ position: "relative", zIndex: 1 }}>
        <div className="h-[calc(100vh-200px)] flex flex-col">
            {/* Top Module Frames */}
            <div className="flex-shrink-0 mb-4">
              <div className="flex items-center justify-center gap-2">
                {modules.map((module) => {
                  const isSelected = selectedModule === module.id;
                  const isAvailable = module.available;
                  const isNutrition = module.id === "nutrition";
                  const isBikeGear = module.id === "bike";
                  const isStrava = module.id === "strava";
                  const frameSize = (isNutrition || isBikeGear || isStrava) ? 96 : 50;
                  return (
                    <button
                      key={module.id}
                      onClick={() => {
                        if (isAvailable) {
                          // Toggle: if already selected, deselect it; otherwise select it
                          setSelectedModule(isSelected ? null : module.id);
                        }
                      }}
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
                        className={`w-full h-full flex items-center justify-center transition-all ${
                          isSelected ? "hud-pulse" : ""
                        }`}
                        style={{
                          filter: isSelected ? `drop-shadow(0 0 15px ${currentTheme.primary})` : `drop-shadow(0 0 10px ${currentTheme.primary})`
                        }}
                      >
                        <div className="w-full h-full flex items-center justify-center" style={{ background: "transparent", color: currentTheme.primary }}>
                          <StylizedIcon moduleId={module.id} size="text-xl" iconColor={currentTheme.primary} />
                        </div>
                      </div>
                      {isSelected && (
                        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 rounded-full" style={{
                          backgroundColor: currentTheme.accent,
                          boxShadow: `0 0 8px ${currentTheme.accent}`
                        }}></div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Main Content Area - Left Panel + Center Frame */}
            <div className="flex-1 flex gap-4 min-h-0">
              {/* Left Command Center Panel */}
              <div className="w-80 flex-shrink-0 flex flex-col gap-4">
                {/* Appointments */}
                <div className={`${hudClass} rounded-lg p-4 relative flex-shrink-0`} style={{
                  backgroundColor: currentTheme.cardBg,
                  borderColor: currentTheme.primary,
                  color: currentTheme.primary
                }}>
                  <div className={`hud-corner hud-corner-top-left`} style={{ borderColor: currentTheme.primary }}></div>
                  <div className={`hud-corner hud-corner-top-right`} style={{ borderColor: currentTheme.primary }}></div>
                  <h3 className="text-sm font-mono uppercase mb-3 hud-text" style={{
                    color: currentTheme.primary,
                    textShadow: `0 0 10px ${currentTheme.primary}`
                  }}>
                    Appointments
                  </h3>
                  <div className="space-y-2">
                    {mockAppointments.map((apt, idx) => (
                      <div key={idx} className="text-xs font-mono" style={{ color: currentTheme.textSecondary, opacity: 0.8 }}>
                        <span style={{ color: currentTheme.accent }}>{apt.time}</span> - {apt.title}
                        <div className="text-xs opacity-60 ml-8">{apt.location}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tasks */}
                <div className={`${hudClass} rounded-lg p-4 relative flex-shrink-0`} style={{
                  backgroundColor: currentTheme.cardBg,
                  borderColor: currentTheme.primary,
                  color: currentTheme.primary
                }}>
                  <div className={`hud-corner hud-corner-top-left`} style={{ borderColor: currentTheme.primary }}></div>
                  <div className={`hud-corner hud-corner-top-right`} style={{ borderColor: currentTheme.primary }}></div>
                  <h3 className="text-sm font-mono uppercase mb-3 hud-text" style={{
                    color: currentTheme.primary,
                    textShadow: `0 0 10px ${currentTheme.primary}`
                  }}>
                    Tasks
                  </h3>
                  <div className="space-y-2">
                    {mockTasks.map((task) => (
                      <div key={task.id} className="text-xs font-mono" style={{ color: currentTheme.textSecondary, opacity: 0.8 }}>
                        <span style={{ 
                          color: task.priority === "high" ? currentTheme.accent : currentTheme.primary 
                        }}>●</span> {task.title}
                        <div className="text-xs opacity-60 ml-4">Due: {task.due}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Weather */}
                <div className={`${hudClass} rounded-lg p-4 relative flex-1`} style={{
                  backgroundColor: currentTheme.cardBg,
                  borderColor: currentTheme.primary,
                  color: currentTheme.primary
                }}>
                  <div className={`hud-corner hud-corner-top-left`} style={{ borderColor: currentTheme.primary }}></div>
                  <div className={`hud-corner hud-corner-top-right`} style={{ borderColor: currentTheme.primary }}></div>
                  <h3 className="text-sm font-mono uppercase mb-3 hud-text" style={{
                    color: currentTheme.primary,
                    textShadow: `0 0 10px ${currentTheme.primary}`
                  }}>
                    Weather
                  </h3>
                  <div className="space-y-2 text-xs font-mono" style={{ color: currentTheme.textSecondary }}>
                    <div className="text-lg hud-text" style={{ color: currentTheme.primary }}>
                      {mockWeather.temp}
                    </div>
                    <div>{mockWeather.condition}</div>
                    <div className="opacity-70">{mockWeather.location}</div>
                    <div className="mt-3 pt-3 border-t" style={{ borderColor: `${currentTheme.primary}30` }}>
                      <div>High: {mockWeather.high} / Low: {mockWeather.low}</div>
                      <div>Humidity: {mockWeather.humidity}</div>
                      <div>Wind: {mockWeather.wind}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Center Large Frame */}
              <div className="flex-1 flex items-center justify-center min-w-0">
                {selectedModule ? (
                  (() => {
                    const module = modules.find(m => m.id === selectedModule);
                    if (!module) return null;
                    
                    return (
                      <div className={`${hudClass} rounded-xl p-8 w-full h-full max-w-4xl relative flex flex-col`} style={{
                        backgroundColor: currentTheme.cardBg,
                        borderColor: currentTheme.primary,
                        color: currentTheme.primary
                      }}>
                        <div className={`hud-corner hud-corner-top-left`} style={{ borderColor: currentTheme.primary }}></div>
                        <div className={`hud-corner hud-corner-top-right`} style={{ borderColor: currentTheme.primary }}></div>
                        <div className={`hud-corner hud-corner-bottom-left`} style={{ borderColor: currentTheme.primary }}></div>
                        <div className={`hud-corner hud-corner-bottom-right`} style={{ borderColor: currentTheme.primary }}></div>

                        <div className="mb-6 text-center">
                          <h2 className="text-3xl font-bold hud-text font-mono" style={{
                            color: currentTheme.primary,
                            textShadow: `0 0 20px ${currentTheme.primary}, 0 0 40px ${currentTheme.primary}40`
                          }}>
                            {module.name}
                          </h2>
                        </div>

                        {module.id === "nutrition" && module.available ? (
                          <div className="space-y-6 flex-1 flex flex-col">
                            <div className="grid grid-cols-2 gap-6">
                              <div className={`${hudClass} p-6 rounded-lg relative`} style={{
                                backgroundColor: `${currentTheme.primary}10`,
                                borderColor: currentTheme.primary
                              }}>
                                <div className="text-xs font-mono uppercase tracking-wider mb-2 hud-text" style={{
                                  color: currentTheme.textSecondary,
                                  opacity: 0.7
                                }}>
                                  Recipes
                                </div>
                                <div className="text-4xl font-bold font-mono hud-text" style={{
                                  color: currentTheme.primary,
                                  textShadow: `0 0 20px ${currentTheme.primary}, 0 0 40px ${currentTheme.primary}40`
                                }}>
                                  {nutritionStats.recipes}
                                </div>
                              </div>
                              <div className={`${hudClass} p-6 rounded-lg relative`} style={{
                                backgroundColor: `${currentTheme.primary}10`,
                                borderColor: currentTheme.primary
                              }}>
                                <div className="text-xs font-mono uppercase tracking-wider mb-2 hud-text" style={{
                                  color: currentTheme.textSecondary,
                                  opacity: 0.7
                                }}>
                                  Ingredients
                                </div>
                                <div className="text-4xl font-bold font-mono hud-text" style={{
                                  color: currentTheme.primary,
                                  textShadow: `0 0 20px ${currentTheme.primary}, 0 0 40px ${currentTheme.primary}40`
                                }}>
                                  {nutritionStats.ingredients}
                                </div>
                              </div>
                            </div>
                            <div className="flex justify-center mt-auto">
                              <Link
                                href={module.href}
                                className={`${hudClass} px-6 py-3 rounded-lg font-mono transition-all hover:scale-105`}
                                style={{
                                  backgroundColor: `${currentTheme.primary}20`,
                                  borderColor: currentTheme.primary,
                                  color: currentTheme.primary,
                                  boxShadow: `0 0 20px ${currentTheme.primary}30`
                                }}
                              >
                                Open Module
                              </Link>
                            </div>
                          </div>
                        ) : !module.available ? (
                          <div className="text-center py-12 flex-1 flex items-center justify-center">
                            <div className="text-lg font-mono hud-text" style={{
                              color: currentTheme.primary,
                              opacity: 0.5
                            }}>
                              [COMING SOON]
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })()
                ) : (
                  <div className={`${hudClass} rounded-xl w-full h-full max-w-4xl relative flex items-center justify-center`} style={{
                    backgroundColor: currentTheme.cardBg,
                    borderColor: currentTheme.primary,
                    color: currentTheme.primary
                  }}>
                    <div className={`hud-corner hud-corner-top-left`} style={{ borderColor: currentTheme.primary }}></div>
                    <div className={`hud-corner hud-corner-top-right`} style={{ borderColor: currentTheme.primary }}></div>
                    <div className={`hud-corner hud-corner-bottom-left`} style={{ borderColor: currentTheme.primary }}></div>
                    <div className={`hud-corner hud-corner-bottom-right`} style={{ borderColor: currentTheme.primary }}></div>
                    <div className="w-96 h-96 flex items-center justify-center">
                      <img
                        src="/assets/jarvis-frame.png"
                        alt="JARVIS Frame"
                        className="jarvis-hud hud-element"
                        style={{ width: "100%", height: "100%", objectFit: "contain", background: "transparent", border: "none", boxShadow: "none" }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Frames - Settings, Profile, Status, Notifications */}
            <div className="flex-shrink-0 mt-4">
              <div className="flex items-center justify-center gap-4">
                {/* Bottom row icons: fixed 96×96px for consistent size */}
                <Link
                  href="/settings"
                  className="flex items-center justify-center w-24 h-24 flex-shrink-0 p-2 transition-all hover:scale-105 focus:outline-none focus:ring-0 border-0 bg-transparent"
                  style={{ color: currentTheme.primary }}
                  title="Settings"
                >
                  <div className="w-full h-full flex items-center justify-center" style={{ filter: `drop-shadow(0 0 10px ${currentTheme.primary})` }}>
                    <JarvisSettingsIcon className="w-24 h-24" />
                  </div>
                </Link>

                <Link
                  href="/profile"
                  className="flex items-center justify-center w-24 h-24 flex-shrink-0 p-2 transition-all hover:scale-105 focus:outline-none focus:ring-0 border-0 bg-transparent"
                  style={{ color: currentTheme.primary }}
                  title="Profile"
                >
                  <div className="w-full h-full flex items-center justify-center" style={{ filter: `drop-shadow(0 0 10px ${currentTheme.primary})` }}>
                    <JarvisProfileIcon className="w-24 h-24" stroke={currentTheme.primary} />
                  </div>
                </Link>

                <Link
                  href="/status"
                  className="flex items-center justify-center w-24 h-24 flex-shrink-0 p-2 transition-all hover:scale-105 focus:outline-none focus:ring-0 border-0 bg-transparent"
                  style={{ color: currentTheme.primary }}
                  title="System Status"
                >
                  <div className="w-full h-full flex items-center justify-center" style={{ filter: `drop-shadow(0 0 10px ${currentTheme.primary})` }}>
                    <JarvisStatusIcon className="w-24 h-24" stroke={currentTheme.primary} />
                  </div>
                </Link>

                <Link
                  href="/alerts"
                  className="flex items-center justify-center w-24 h-24 flex-shrink-0 p-2 transition-all hover:scale-105 focus:outline-none focus:ring-0 border-0 bg-transparent"
                  style={{ color: hasAlerts ? ALERT_ICON_ORANGE : currentTheme.primary }}
                  title="Alerts"
                >
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{
                      filter: `drop-shadow(0 0 10px ${hasAlerts ? ALERT_ICON_ORANGE : currentTheme.primary})`,
                      color: hasAlerts ? ALERT_ICON_ORANGE : currentTheme.primary,
                    }}
                  >
                    <JarvisAlertIcon className="w-24 h-24" stroke={hasAlerts ? ALERT_ICON_ORANGE : currentTheme.primary} />
                  </div>
                </Link>
              </div>
            </div>
          </div>
      </main>
    </div>
  );
}
