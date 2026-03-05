"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

type HubView = "menu" | "dashboard" | "hybrid";
type Theme = "jarvis" | "friday" | "jarvis2" | "jarvis3" | "jarvis4";

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
    href: "/",
    color: "red",
    available: true,
  },
  {
    id: "tasks",
    name: "Task Management",
    description: "Extract and manage tasks from emails",
    icon: "□",
    href: "/tasks",
    color: "red",
    available: false,
  },
  {
    id: "email",
    name: "Email Assistant",
    description: "Draft emails and manage inbox",
    icon: "✉",
    href: "/email",
    color: "red",
    available: false,
  },
  {
    id: "calendar",
    name: "Calendar",
    description: "Schedule management and workload awareness",
    icon: "▦",
    href: "/calendar",
    color: "red",
    available: false,
  },
  {
    id: "fitness",
    name: "Fitness & Training",
    description: "Training plans and nutrition prep",
    icon: "⚡",
    href: "/fitness",
    color: "orange",
    available: false,
  },
  {
    id: "weather",
    name: "Weather",
    description: "Weather-aware planning",
    icon: "⊙",
    href: "/weather",
    color: "red",
    available: false,
  },
];

// J.A.R.V.I.S. frame wrapper component - using the uploaded image
const JarvisFrame = ({ isLarge }: { isLarge: boolean }) => {
  return (
      <img
        src="/assets/Gemini_Generated_Image_574i41574i41574i-85020c02-51b2-4208-8468-3735b6a7f65e.png"
        alt="JARVIS Frame"
        className="jarvis-hud hud-element"
      />
  );
};

// Helper component to render stylized icons
const StylizedIcon = ({ moduleId, size = "text-4xl" }: { moduleId: string; size?: string }) => {
  const isLarge = size === "text-4xl";
  const isMedium = size === "text-2xl";
  const isSmall = size === "text-xl";
  
  // Adjust frame size based on icon size - smaller for compact display
  const frameSize = isLarge ? "w-12 h-12" : isMedium ? "w-8 h-8" : isSmall ? "w-10 h-10" : "w-6 h-6";
  const iconSize = isLarge ? "w-12 h-12" : isMedium ? "w-8 h-8" : isSmall ? "w-10 h-10" : "w-6 h-6";
  const borderWidth = isLarge ? "border-[3px]" : "border-2";
  
  const iconStyles: { [key: string]: React.ReactElement } = {
    nutrition: (
      <div className={frameSize} style={{ position: "relative", background: "transparent", border: "none", boxShadow: "none" }}>
        <img
          src="/assets/Gemini_Generated_Image_574i41574i41574i-85020c02-51b2-4208-8468-3735b6a7f65e.png"
          alt="JARVIS Frame"
          className="jarvis-hud hud-element"
          style={{ width: "100%", height: "100%", objectFit: "contain", background: "transparent", border: "none", boxShadow: "none" }}
        />
      </div>
    ),
    tasks: (
      <div className={frameSize} style={{ position: "relative", background: "transparent", border: "none", boxShadow: "none" }}>
        <img
          src="/assets/Gemini_Generated_Image_574i41574i41574i-85020c02-51b2-4208-8468-3735b6a7f65e.png"
          alt="JARVIS Frame"
          className="jarvis-hud hud-element"
          style={{ width: "100%", height: "100%", objectFit: "contain", background: "transparent", border: "none", boxShadow: "none" }}
        />
      </div>
    ),
    email: (
      <div className={frameSize} style={{ position: "relative", background: "transparent", border: "none", boxShadow: "none" }}>
        <img
          src="/assets/Gemini_Generated_Image_574i41574i41574i-85020c02-51b2-4208-8468-3735b6a7f65e.png"
          alt="JARVIS Frame"
          className="jarvis-hud hud-element"
          style={{ width: "100%", height: "100%", objectFit: "contain", background: "transparent", border: "none", boxShadow: "none" }}
        />
      </div>
    ),
    calendar: (
      <div className={frameSize} style={{ position: "relative", background: "transparent", border: "none", boxShadow: "none" }}>
        <img
          src="/assets/Gemini_Generated_Image_574i41574i41574i-85020c02-51b2-4208-8468-3735b6a7f65e.png"
          alt="JARVIS Frame"
          className="jarvis-hud hud-element"
          style={{ width: "100%", height: "100%", objectFit: "contain", background: "transparent", border: "none", boxShadow: "none" }}
        />
      </div>
    ),
    fitness: (
      <div className={frameSize} style={{ position: "relative", background: "transparent", border: "none", boxShadow: "none" }}>
        <img
          src="/assets/Gemini_Generated_Image_574i41574i41574i-85020c02-51b2-4208-8468-3735b6a7f65e.png"
          alt="JARVIS Frame"
          className="jarvis-hud hud-element"
          style={{ width: "100%", height: "100%", objectFit: "contain", background: "transparent", border: "none", boxShadow: "none" }}
        />
      </div>
    ),
    weather: (
      <div className={frameSize} style={{ position: "relative", background: "transparent", border: "none", boxShadow: "none" }}>
        <img
          src="/assets/Gemini_Generated_Image_574i41574i41574i-85020c02-51b2-4208-8468-3735b6a7f65e.png"
          alt="JARVIS Frame"
          className="jarvis-hud hud-element"
          style={{ width: "100%", height: "100%", objectFit: "contain", background: "transparent", border: "none", boxShadow: "none" }}
        />
      </div>
    ),
  };

  return iconStyles[moduleId] || <div className={`${iconSize} ${borderWidth} border-[#FBCA03]`}></div>;
};

// Helper function to get color classes
const getColorClasses = (color: string, available: boolean) => {
  if (!available) {
    return {
      border: "border-slate-700",
      bg: "bg-[#6A0C0B]/40",
      hoverBorder: "",
      button: "bg-[#6A0C0B]",
      borderLeft: "border-slate-700",
    };
  }

  const colorMap: { [key: string]: { border: string; bg: string; hoverBorder: string; button: string; borderLeft: string } } = {
    green: {
      border: "border-[#AA0505]/40",
      bg: "bg-[#AA0505]/20",
      hoverBorder: "hover:border-[#AA0505]/60",
      button: "bg-[#AA0505] hover:bg-[#6A0C0B]",
      borderLeft: "border-[#AA0505]",
    },
    red: {
      border: "border-[#AA0505]/40",
      bg: "bg-[#AA0505]/20",
      hoverBorder: "hover:border-[#AA0505]/60",
      button: "bg-[#AA0505] hover:bg-[#6A0C0B]",
      borderLeft: "border-[#AA0505]",
    },
    purple: {
      border: "border-[#AA0505]/40",
      bg: "bg-[#AA0505]/20",
      hoverBorder: "hover:border-[#AA0505]/60",
      button: "bg-[#AA0505] hover:bg-[#6A0C0B]",
      borderLeft: "border-[#AA0505]",
    },
    indigo: {
      border: "border-[#AA0505]/40",
      bg: "bg-[#AA0505]/20",
      hoverBorder: "hover:border-[#AA0505]/60",
      button: "bg-[#AA0505] hover:bg-[#6A0C0B]",
      borderLeft: "border-[#AA0505]",
    },
    orange: {
      border: "border-[#B97D10]/40",
      bg: "bg-[#B97D10]/20",
      hoverBorder: "hover:border-[#FBCA03]/60",
      button: "bg-[#B97D10] hover:bg-[#FBCA03]",
      borderLeft: "border-[#B97D10]",
    },
    sky: {
      border: "border-[#AA0505]/40",
      bg: "bg-[#AA0505]/20",
      hoverBorder: "hover:border-[#AA0505]/60",
      button: "bg-[#AA0505] hover:bg-[#6A0C0B]",
      borderLeft: "border-[#AA0505]",
    },
  };

  return colorMap[color] || colorMap.red;
};

// Theme configurations
const themes = {
  jarvis: {
    name: "JARVIS",
    primary: "#00D9FF", // Electric blue/cyan (main glow)
    secondary: "#67C7EB", // Lighter blue
    accent: "#00FF88", // Green highlights
    background: "#000000", // Pure black
    cardBg: "rgba(0, 217, 255, 0.05)", // Very subtle blue tint
    text: "#00D9FF", // Electric blue text
    textSecondary: "#67C7EB", // Lighter blue for secondary text
    style: "classic", // Classic HUD style
    glow: "#00D9FF", // Glow color
    circuit: "#00D9FF" // Circuit pattern color
  },
  friday: {
    name: "F.R.I.D.A.Y.",
    primary: "#FF6B35", // Orange (main)
    secondary: "#00D9FF", // Electric blue (highlights)
    accent: "#00FF88", // Green highlights
    background: "#0A0500", // Very dark brown-black
    cardBg: "rgba(255, 107, 53, 0.05)", // Very subtle orange tint
    text: "#FF6B35", // Orange text
    textSecondary: "#FFB88C", // Lighter orange
    style: "modern", // Modern/minimal
    glow: "#FF6B35", // Glow color
    circuit: "#00D9FF" // Circuit pattern uses blue/green
  },
  jarvis2: {
    name: "JARVIS 2.0",
    primary: "#FBCA03", // Bright gold (main glow)
    secondary: "#FFD700", // Pure gold
    accent: "#FFA500", // Amber highlights
    background: "#000000", // Pure black
    cardBg: "rgba(251, 202, 3, 0.05)", // Very subtle gold tint
    text: "#FBCA03", // Gold text
    textSecondary: "#FFD700", // Lighter gold
    style: "classic", // Classic HUD style
    glow: "#FBCA03", // Glow color
    circuit: "#FBCA03" // Circuit pattern color
  },
  jarvis3: {
    name: "JARVIS 3.0",
    primary: "#00D9FF", // Electric blue/cyan (main glow)
    secondary: "#67C7EB", // Lighter blue
    accent: "#00FF88", // Green highlights
    background: "#000000", // Pure black
    cardBg: "rgba(0, 217, 255, 0.05)", // Very subtle blue tint
    text: "#00D9FF", // Electric blue text
    textSecondary: "#67C7EB", // Lighter blue for secondary text
    style: "classic", // Classic HUD style
    glow: "#00D9FF", // Glow color
    circuit: "#00D9FF" // Circuit pattern color
  },
  jarvis4: {
    name: "JARVIS 4.0",
    primary: "#00D9FF", // Electric blue/cyan (main glow)
    secondary: "#67C7EB", // Lighter blue
    accent: "#00FF88", // Green highlights
    background: "#000000", // Pure black
    cardBg: "rgba(0, 217, 255, 0.05)", // Very subtle blue tint
    text: "#00D9FF", // Electric blue text
    textSecondary: "#67C7EB", // Lighter blue for secondary text
    style: "classic", // Classic HUD style
    glow: "#00D9FF", // Glow color
    circuit: "#00D9FF" // Circuit pattern color
  }
};

export default function HubPage() {
  const [view, setView] = useState<HubView>("menu");
  const [theme, setTheme] = useState<Theme>("jarvis");
  const [selectedModule, setSelectedModule] = useState<string | null>(null); // No module selected by default
  const [nutritionStats, setNutritionStats] = useState({ recipes: 0, ingredients: 0 });
  
  const currentTheme = themes[theme];
  
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

  const hudClass = currentTheme.style === "classic" ? "hud-card" : "hud-modern";
  
  return (
    <div className="min-h-screen hud-circuit-bg" style={{ 
      backgroundColor: currentTheme.background,
      color: currentTheme.primary
    }}>
      <main className="container mx-auto px-4 py-8 max-w-6xl relative z-10" style={{ position: "relative", zIndex: 1 }}>
        {/* Header */}
        <div className="mb-8 relative">
          <h1 className="text-5xl font-bold mb-2 hud-text" style={{
            color: currentTheme.primary,
            textShadow: `0 0 20px ${currentTheme.primary}, 0 0 40px ${currentTheme.primary}40`
          }}>
            {currentTheme.name}
          </h1>
          <p className="text-lg hud-text" style={{ 
            color: currentTheme.textSecondary,
            textShadow: `0 0 10px ${currentTheme.textSecondary}40`
          }}>
            Personal AI Operations Assistant
          </p>
        </div>

        {/* Theme Selector */}
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setTheme("jarvis")}
            className={`px-4 py-2 rounded-lg transition-all text-sm font-mono ${
              theme === "jarvis"
                ? "hud-glow"
                : "opacity-60 hover:opacity-100"
            }`}
            style={{
              backgroundColor: theme === "jarvis" ? `${themes.jarvis.primary}20` : "transparent",
              border: `2px solid ${themes.jarvis.primary}`,
              color: themes.jarvis.primary,
              boxShadow: theme === "jarvis" ? `0 0 20px ${themes.jarvis.primary}50` : "none"
            }}
          >
            JARVIS
          </button>
          <button
            onClick={() => setTheme("friday")}
            className={`px-4 py-2 rounded-lg transition-all text-sm font-mono ${
              theme === "friday"
                ? "hud-glow"
                : "opacity-60 hover:opacity-100"
            }`}
            style={{
              backgroundColor: theme === "friday" ? `${themes.friday.primary}20` : "transparent",
              border: `2px solid ${themes.friday.primary}`,
              color: themes.friday.primary,
              boxShadow: theme === "friday" ? `0 0 20px ${themes.friday.primary}50` : "none"
            }}
          >
            F.R.I.D.A.Y.
          </button>
          <button
            onClick={() => setTheme("jarvis2")}
            className={`px-4 py-2 rounded-lg transition-all text-sm font-mono ${
              theme === "jarvis2"
                ? "hud-glow"
                : "opacity-60 hover:opacity-100"
            }`}
            style={{
              backgroundColor: theme === "jarvis2" ? `${themes.jarvis2.primary}20` : "transparent",
              border: `2px solid ${themes.jarvis2.primary}`,
              color: themes.jarvis2.primary,
              boxShadow: theme === "jarvis2" ? `0 0 20px ${themes.jarvis2.primary}50` : "none"
            }}
          >
            JARVIS 2.0
          </button>
          <button
            onClick={() => setTheme("jarvis3")}
            className={`px-4 py-2 rounded-lg transition-all text-sm font-mono ${
              theme === "jarvis3"
                ? "hud-glow"
                : "opacity-60 hover:opacity-100"
            }`}
            style={{
              backgroundColor: theme === "jarvis3" ? `${themes.jarvis3.primary}20` : "transparent",
              border: `2px solid ${themes.jarvis3.primary}`,
              color: themes.jarvis3.primary,
              boxShadow: theme === "jarvis3" ? `0 0 20px ${themes.jarvis3.primary}50` : "none"
            }}
          >
            JARVIS 3.0
          </button>
          <button
            onClick={() => setTheme("jarvis4")}
            className={`px-4 py-2 rounded-lg transition-all text-sm font-mono ${
              theme === "jarvis4"
                ? "hud-glow"
                : "opacity-60 hover:opacity-100"
            }`}
            style={{
              backgroundColor: theme === "jarvis4" ? `${themes.jarvis4.primary}20` : "transparent",
              border: `2px solid ${themes.jarvis4.primary}`,
              color: themes.jarvis4.primary,
              boxShadow: theme === "jarvis4" ? `0 0 20px ${themes.jarvis4.primary}50` : "none"
            }}
          >
            JARVIS 4.0
          </button>
        </div>

        {/* View Selector - Hide for JARVIS 3.0 and 4.0 */}
        {theme !== "jarvis3" && theme !== "jarvis4" && (
          <div className="mb-6 flex gap-2">
            <button
              onClick={() => setView("menu")}
              className={`px-4 py-2 rounded-lg transition-all font-mono text-sm ${
                view === "menu" ? "hud-glow" : ""
              }`}
              style={{
                backgroundColor: view === "menu" ? `${currentTheme.primary}20` : "transparent",
                border: `2px solid ${currentTheme.primary}`,
                color: currentTheme.primary,
                boxShadow: view === "menu" ? `0 0 20px ${currentTheme.primary}50` : "none"
              }}
            >
              Simple Menu
            </button>
            <button
              onClick={() => setView("dashboard")}
              className={`px-4 py-2 rounded-lg transition-all font-mono text-sm ${
                view === "dashboard" ? "hud-glow" : ""
              }`}
              style={{
                backgroundColor: view === "dashboard" ? `${currentTheme.primary}20` : "transparent",
                border: `2px solid ${currentTheme.primary}`,
                color: currentTheme.primary,
                boxShadow: view === "dashboard" ? `0 0 20px ${currentTheme.primary}50` : "none"
              }}
            >
              Dashboard
            </button>
            <button
              onClick={() => setView("hybrid")}
              className={`px-4 py-2 rounded-lg transition-all font-mono text-sm ${
                view === "hybrid" ? "hud-glow" : ""
              }`}
              style={{
                backgroundColor: view === "hybrid" ? `${currentTheme.primary}20` : "transparent",
                border: `2px solid ${currentTheme.primary}`,
                color: currentTheme.primary,
                boxShadow: view === "hybrid" ? `0 0 20px ${currentTheme.primary}50` : "none"
              }}
            >
              Hybrid
            </button>
          </div>
        )}

        {/* Simple Menu View */}
        {view === "menu" && theme !== "jarvis4" && (
          <div className={`${hudClass} rounded-xl p-6 relative`} style={{
            backgroundColor: currentTheme.cardBg,
            borderColor: currentTheme.primary,
            color: currentTheme.primary
          }}>
            {currentTheme.style === "classic" && (
              <>
                <div className={`hud-corner hud-corner-top-left`} style={{ borderColor: currentTheme.primary }}></div>
                <div className={`hud-corner hud-corner-top-right`} style={{ borderColor: currentTheme.primary }}></div>
                <div className={`hud-corner hud-corner-bottom-left`} style={{ borderColor: currentTheme.primary }}></div>
                <div className={`hud-corner hud-corner-bottom-right`} style={{ borderColor: currentTheme.primary }}></div>
              </>
            )}
            <h2 className="text-2xl font-semibold mb-6 hud-text font-mono" style={{ 
              color: currentTheme.primary,
              textShadow: `0 0 15px ${currentTheme.primary}`
            }}>
              Modules
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {modules.map((module) => {
                const colors = getColorClasses(module.color, module.available);
                return (
                  <Link
                    key={module.id}
                    href={module.available ? module.href : "#"}
                    className={`${hudClass} p-6 rounded-lg transition-all relative ${
                      module.available
                        ? "cursor-pointer hover:scale-105 hud-pulse"
                        : "opacity-40 cursor-not-allowed"
                    }`}
                    style={{
                      borderColor: module.available ? currentTheme.primary : `${currentTheme.primary}30`,
                      backgroundColor: module.available ? currentTheme.cardBg : `${currentTheme.primary}05`,
                      color: currentTheme.primary,
                      boxShadow: module.available && currentTheme.style === "classic" 
                        ? `0 0 20px ${currentTheme.primary}30, inset 0 0 20px ${currentTheme.primary}10` 
                        : "none"
                    }}
                    onMouseEnter={(e) => {
                      if (module.available) {
                        e.currentTarget.style.borderColor = currentTheme.primary;
                        e.currentTarget.style.boxShadow = `0 0 30px ${currentTheme.primary}60, inset 0 0 30px ${currentTheme.primary}20`;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (module.available) {
                        e.currentTarget.style.borderColor = currentTheme.primary;
                        e.currentTarget.style.boxShadow = currentTheme.style === "classic" 
                          ? `0 0 20px ${currentTheme.primary}30, inset 0 0 20px ${currentTheme.primary}10` 
                          : "none";
                      }
                    }}
                  >
                    <div className="mb-3 flex items-center justify-center">
                      <StylizedIcon moduleId={module.id} size="text-4xl" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2 hud-text font-mono" style={{ 
                      color: currentTheme.primary,
                      textShadow: `0 0 10px ${currentTheme.primary}`
                    }}>
                      {module.name}
                    </h3>
                    {!module.available && (
                      <div className="mt-2 text-xs font-mono" style={{ 
                        color: currentTheme.primary,
                        opacity: 0.5
                      }}>
                        [COMING SOON]
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Dashboard View */}
        {view === "dashboard" && theme !== "jarvis4" && (
          <div className="space-y-8">
            {/* Quick Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className={`${hudClass} rounded-xl p-6 transition-all hover:scale-105 relative`} style={{
                backgroundColor: currentTheme.cardBg,
                borderColor: currentTheme.primary,
                color: currentTheme.primary,
                boxShadow: currentTheme.style === "classic" 
                  ? `0 0 20px ${currentTheme.primary}30, inset 0 0 20px ${currentTheme.primary}10` 
                  : "none"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = `0 0 30px ${currentTheme.primary}60, inset 0 0 30px ${currentTheme.primary}20`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = currentTheme.style === "classic" 
                  ? `0 0 20px ${currentTheme.primary}30, inset 0 0 20px ${currentTheme.primary}10` 
                  : "none";
              }}>
                {currentTheme.style === "classic" && (
                  <>
                    <div className={`hud-corner hud-corner-top-left`} style={{ borderColor: currentTheme.primary }}></div>
                    <div className={`hud-corner hud-corner-top-right`} style={{ borderColor: currentTheme.primary }}></div>
                  </>
                )}
                <div className="text-xs font-mono uppercase tracking-wider mb-2 hud-text" style={{ 
                  color: currentTheme.textSecondary || currentTheme.primary,
                  opacity: 0.7,
                  textShadow: `0 0 5px ${currentTheme.textSecondary || currentTheme.primary}40`
                }}>
                  Total Modules
                </div>
                <div className="text-4xl font-bold mb-1 font-mono hud-text" style={{
                  color: currentTheme.primary,
                  textShadow: `0 0 20px ${currentTheme.primary}, 0 0 40px ${currentTheme.primary}40`
                }}>
                  {modules.length}
                </div>
                <div className="text-xs font-mono" style={{ 
                  color: currentTheme.textSecondary || currentTheme.primary,
                  opacity: 0.6
                }}>
                  Available across all features
                </div>
              </div>
              <div className={`${hudClass} rounded-xl p-6 transition-all hover:scale-105 relative`} style={{
                backgroundColor: currentTheme.cardBg,
                borderColor: currentTheme.accent,
                color: currentTheme.accent,
                boxShadow: currentTheme.style === "classic" 
                  ? `0 0 20px ${currentTheme.accent}30, inset 0 0 20px ${currentTheme.accent}10` 
                  : "none"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = `0 0 30px ${currentTheme.accent}60, inset 0 0 30px ${currentTheme.accent}20`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = currentTheme.style === "classic" 
                  ? `0 0 20px ${currentTheme.accent}30, inset 0 0 20px ${currentTheme.accent}10` 
                  : "none";
              }}>
                {currentTheme.style === "classic" && (
                  <>
                    <div className={`hud-corner hud-corner-top-left`} style={{ borderColor: currentTheme.accent }}></div>
                    <div className={`hud-corner hud-corner-top-right`} style={{ borderColor: currentTheme.accent }}></div>
                  </>
                )}
                <div className="text-xs font-mono uppercase tracking-wider mb-2 hud-text" style={{ 
                  color: currentTheme.accent,
                  opacity: 0.7,
                  textShadow: `0 0 5px ${currentTheme.accent}40`
                }}>
                  Available Now
                </div>
                <div className="text-4xl font-bold mb-1 font-mono hud-text" style={{
                  color: currentTheme.accent,
                  textShadow: `0 0 20px ${currentTheme.accent}, 0 0 40px ${currentTheme.accent}40`
                }}>
                  {modules.filter((m) => m.available).length}
                </div>
                <div className="text-xs font-mono" style={{ 
                  color: currentTheme.accent,
                  opacity: 0.6
                }}>
                  Ready to use
                </div>
              </div>
              <div className={`${hudClass} rounded-xl p-6 transition-all hover:scale-105 relative`} style={{
                backgroundColor: currentTheme.cardBg,
                borderColor: currentTheme.primary,
                color: currentTheme.primary,
                boxShadow: currentTheme.style === "classic" 
                  ? `0 0 20px ${currentTheme.primary}30, inset 0 0 20px ${currentTheme.primary}10` 
                  : "none"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = `0 0 30px ${currentTheme.primary}60, inset 0 0 30px ${currentTheme.primary}20`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = currentTheme.style === "classic" 
                  ? `0 0 20px ${currentTheme.primary}30, inset 0 0 20px ${currentTheme.primary}10` 
                  : "none";
              }}>
                {currentTheme.style === "classic" && (
                  <>
                    <div className={`hud-corner hud-corner-top-left`} style={{ borderColor: currentTheme.primary }}></div>
                    <div className={`hud-corner hud-corner-top-right`} style={{ borderColor: currentTheme.primary }}></div>
                  </>
                )}
                <div className="text-xs font-mono uppercase tracking-wider mb-2 hud-text" style={{ 
                  color: currentTheme.textSecondary || currentTheme.primary,
                  opacity: 0.7,
                  textShadow: `0 0 5px ${currentTheme.textSecondary || currentTheme.primary}40`
                }}>
                  In Development
                </div>
                <div className="text-4xl font-bold mb-1 font-mono hud-text" style={{
                  color: currentTheme.primary,
                  textShadow: `0 0 20px ${currentTheme.primary}, 0 0 40px ${currentTheme.primary}40`
                }}>
                  {modules.filter((m) => !m.available).length}
                </div>
                <div className="text-xs font-mono" style={{ 
                  color: currentTheme.textSecondary || currentTheme.primary,
                  opacity: 0.6
                }}>
                  Coming soon
                </div>
              </div>
            </div>

            {/* Module Widgets */}
            <div>
              <h2 className="text-xl font-semibold mb-5 hud-text font-mono" style={{ 
                color: currentTheme.primary,
                textShadow: `0 0 15px ${currentTheme.primary}`
              }}>
                Modules
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {modules.map((module) => {
                  const CardContent = (
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-5">
                        <div className="flex items-start gap-4">
                          <div className={`${hudClass} w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0`} style={{
                            backgroundColor: currentTheme.cardBg,
                            borderColor: currentTheme.primary,
                            color: currentTheme.primary,
                            boxShadow: currentTheme.style === "classic" 
                              ? `0 0 15px ${currentTheme.primary}30, inset 0 0 15px ${currentTheme.primary}10` 
                              : "none"
                          }}>
                            <StylizedIcon moduleId={module.id} size="text-2xl" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold mb-1 hud-text font-mono" style={{ 
                              color: currentTheme.primary,
                              textShadow: `0 0 10px ${currentTheme.primary}`
                            }}>
                              {module.name}
                            </h3>
                          </div>
                        </div>
                        {module.available ? (
                          <span className="px-2.5 py-1 text-xs font-mono rounded-md border flex-shrink-0 hud-text" style={{
                            backgroundColor: `${currentTheme.accent}20`,
                            color: currentTheme.accent,
                            borderColor: currentTheme.accent,
                            textShadow: `0 0 8px ${currentTheme.accent}`,
                            boxShadow: `0 0 10px ${currentTheme.accent}30`
                          }}>
                            ACTIVE
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 text-xs font-mono rounded-md border flex-shrink-0" style={{
                            backgroundColor: `${currentTheme.primary}20`,
                            color: currentTheme.primary,
                            opacity: 0.5,
                            borderColor: `${currentTheme.primary}50`
                          }}>
                            SOON
                          </span>
                        )}
                      </div>

                      {/* Module-specific stats/widgets */}
                      {module.id === "nutrition" && module.available && (
                        <div className="mt-5 pt-5 border-t" style={{ borderColor: `${currentTheme.primary}30` }}>
                          <div className="grid grid-cols-2 gap-5">
                            <div>
                              <div className="text-xs font-mono uppercase tracking-wider mb-1.5 hud-text" style={{ 
                                color: currentTheme.textSecondary || currentTheme.primary,
                                opacity: 0.7,
                                textShadow: `0 0 5px ${currentTheme.textSecondary || currentTheme.primary}40`
                              }}>
                                Recipes
                              </div>
                              <div className="text-2xl font-bold font-mono hud-text" style={{
                                color: currentTheme.primary,
                                textShadow: `0 0 15px ${currentTheme.primary}, 0 0 30px ${currentTheme.primary}40`
                              }}>
                                {nutritionStats.recipes}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs font-mono uppercase tracking-wider mb-1.5 hud-text" style={{ 
                                color: currentTheme.textSecondary || currentTheme.primary,
                                opacity: 0.7,
                                textShadow: `0 0 5px ${currentTheme.textSecondary || currentTheme.primary}40`
                              }}>
                                Ingredients
                              </div>
                              <div className="text-2xl font-bold font-mono hud-text" style={{
                                color: currentTheme.primary,
                                textShadow: `0 0 15px ${currentTheme.primary}, 0 0 30px ${currentTheme.primary}40`
                              }}>
                                {nutritionStats.ingredients}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                    </div>
                  );

                  if (module.available) {
                    return (
                      <Link
                        key={module.id}
                        href={module.href}
                        className={`${hudClass} rounded-xl transition-all cursor-pointer block hover:scale-[1.02] relative`}
                        style={{
                          backgroundColor: currentTheme.cardBg,
                          borderColor: currentTheme.primary,
                          color: currentTheme.primary,
                          boxShadow: currentTheme.style === "classic" 
                            ? `0 0 20px ${currentTheme.primary}30, inset 0 0 20px ${currentTheme.primary}10` 
                            : "none"
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = `0 0 30px ${currentTheme.primary}60, inset 0 0 30px ${currentTheme.primary}20`;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = currentTheme.style === "classic" 
                            ? `0 0 20px ${currentTheme.primary}30, inset 0 0 20px ${currentTheme.primary}10` 
                            : "none";
                        }}
                      >
                        {currentTheme.style === "classic" && (
                          <>
                            <div className={`hud-corner hud-corner-top-left`} style={{ borderColor: currentTheme.primary }}></div>
                            <div className={`hud-corner hud-corner-top-right`} style={{ borderColor: currentTheme.primary }}></div>
                          </>
                        )}
                        {CardContent}
                      </Link>
                    );
                  } else {
                    return (
                      <div
                        key={module.id}
                        className={`${hudClass} rounded-xl opacity-40 relative`}
                        style={{
                          backgroundColor: `${currentTheme.primary}10`,
                          borderColor: `${currentTheme.primary}30`,
                          color: currentTheme.primary
                        }}
                      >
                        {CardContent}
                      </div>
                    );
                  }
                })}
              </div>
            </div>
          </div>
        )}

        {/* Hybrid View */}
        {view === "hybrid" && theme !== "jarvis4" && (
          <div className="space-y-6">
            {/* Quick Stats Bar */}
            <div className={`${hudClass} rounded-xl p-6 relative`} style={{
              backgroundColor: currentTheme.cardBg,
              borderColor: currentTheme.primary,
              color: currentTheme.primary
            }}>
              {currentTheme.style === "classic" && (
                <>
                  <div className={`hud-corner hud-corner-top-left`} style={{ borderColor: currentTheme.primary }}></div>
                  <div className={`hud-corner hud-corner-top-right`} style={{ borderColor: currentTheme.primary }}></div>
                  <div className={`hud-corner hud-corner-bottom-left`} style={{ borderColor: currentTheme.primary }}></div>
                  <div className={`hud-corner hud-corner-bottom-right`} style={{ borderColor: currentTheme.primary }}></div>
                </>
              )}
              <h2 className="text-xl font-semibold mb-4 hud-text font-mono" style={{ 
                color: currentTheme.primary,
                textShadow: `0 0 15px ${currentTheme.primary}`
              }}>
                Quick Overview
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold font-mono hud-text" style={{
                    color: currentTheme.primary,
                    textShadow: `0 0 15px ${currentTheme.primary}, 0 0 30px ${currentTheme.primary}40`
                  }}>
                    {modules.filter((m) => m.available).length}
                  </div>
                  <div className="text-xs font-mono" style={{ 
                    color: currentTheme.textSecondary || currentTheme.primary,
                    opacity: 0.7
                  }}>Active Modules</div>
                </div>
                {modules.find((m) => m.id === "nutrition" && m.available) && (
                  <>
                    <div className="text-center">
                      <div className="text-2xl font-bold font-mono hud-text" style={{
                        color: currentTheme.accent,
                        textShadow: `0 0 15px ${currentTheme.accent}, 0 0 30px ${currentTheme.accent}40`
                      }}>
                        {nutritionStats.recipes}
                      </div>
                      <div className="text-xs font-mono" style={{ 
                        color: currentTheme.textSecondary || currentTheme.primary,
                        opacity: 0.6
                      }}>Recipes</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold font-mono hud-text" style={{
                        color: currentTheme.accent,
                        textShadow: `0 0 15px ${currentTheme.accent}, 0 0 30px ${currentTheme.accent}40`
                      }}>
                        {nutritionStats.ingredients}
                      </div>
                      <div className="text-xs font-mono" style={{ 
                        color: currentTheme.textSecondary || currentTheme.primary,
                        opacity: 0.6
                      }}>Ingredients</div>
                    </div>
                  </>
                )}
                <div className="text-center">
                  <div className="text-2xl font-bold font-mono hud-text" style={{
                    color: currentTheme.primary,
                    textShadow: `0 0 15px ${currentTheme.primary}, 0 0 30px ${currentTheme.primary}40`
                  }}>
                    {modules.filter((m) => !m.available).length}
                  </div>
                  <div className="text-xs font-mono" style={{ 
                    color: currentTheme.textSecondary || currentTheme.primary,
                    opacity: 0.6
                  }}>Coming Soon</div>
                </div>
              </div>
            </div>

            {/* Module Grid */}
            <div className={`${hudClass} rounded-xl p-6 relative`} style={{
              backgroundColor: currentTheme.cardBg,
              borderColor: currentTheme.primary,
              color: currentTheme.primary
            }}>
              {currentTheme.style === "classic" && (
                <>
                  <div className={`hud-corner hud-corner-top-left`} style={{ borderColor: currentTheme.primary }}></div>
                  <div className={`hud-corner hud-corner-top-right`} style={{ borderColor: currentTheme.primary }}></div>
                  <div className={`hud-corner hud-corner-bottom-left`} style={{ borderColor: currentTheme.primary }}></div>
                  <div className={`hud-corner hud-corner-bottom-right`} style={{ borderColor: currentTheme.primary }}></div>
                </>
              )}
              <h2 className="text-2xl font-semibold mb-6 hud-text font-mono" style={{ 
                color: currentTheme.primary,
                textShadow: `0 0 15px ${currentTheme.primary}`
              }}>
                All Modules
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {modules.map((module) => {
                  return (
                    <Link
                      key={module.id}
                      href={module.available ? module.href : "#"}
                      className={`${hudClass} p-5 rounded-lg transition-all relative ${
                        module.available
                          ? "cursor-pointer hover:scale-105 hud-pulse"
                          : "opacity-40 cursor-not-allowed"
                      }`}
                      style={{
                        borderColor: module.available ? currentTheme.primary : `${currentTheme.primary}30`,
                        backgroundColor: module.available ? currentTheme.cardBg : `${currentTheme.primary}05`,
                        color: currentTheme.primary,
                        boxShadow: module.available && currentTheme.style === "classic" 
                          ? `0 0 20px ${currentTheme.primary}30, inset 0 0 20px ${currentTheme.primary}10` 
                          : "none"
                      }}
                      onMouseEnter={(e) => {
                        if (module.available) {
                          e.currentTarget.style.borderColor = currentTheme.primary;
                          e.currentTarget.style.boxShadow = `0 0 30px ${currentTheme.primary}60, inset 0 0 30px ${currentTheme.primary}20`;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (module.available) {
                          e.currentTarget.style.borderColor = currentTheme.primary;
                          e.currentTarget.style.boxShadow = currentTheme.style === "classic" 
                            ? `0 0 20px ${currentTheme.primary}30, inset 0 0 20px ${currentTheme.primary}10` 
                            : "none";
                        }
                      }}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center justify-center">
                          <StylizedIcon moduleId={module.id} size="text-3xl" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold hud-text font-mono" style={{ 
                            color: currentTheme.primary,
                            textShadow: `0 0 10px ${currentTheme.primary}`
                          }}>
                            {module.name}
                          </h3>
                          {module.available && (
                            <span className="text-xs font-mono hud-text" style={{ 
                              color: currentTheme.accent,
                              textShadow: `0 0 8px ${currentTheme.accent}`
                            }}>● ACTIVE</span>
                          )}
                        </div>
                      </div>
                      {module.id === "nutrition" && module.available && (
                        <div className="mt-3 pt-3 border-t text-xs font-mono" style={{
                          borderColor: `${currentTheme.primary}30`,
                          color: currentTheme.textSecondary || currentTheme.primary,
                          opacity: 0.7
                        }}>
                          {nutritionStats.recipes} recipes • {nutritionStats.ingredients} ingredients
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* JARVIS 3.0 Layout */}
        {theme === "jarvis3" && (
          <div className="flex flex-col md:flex-row h-[calc(100vh-200px)]">
            {/* Module Navigation Bar - Top (Desktop) / Left (Mobile) */}
            <div className="mb-6 md:mb-0 md:mr-4 flex-shrink-0">
              <div className="flex md:flex-col items-center justify-center gap-1.5 md:gap-2">
                {modules.map((module) => {
                  const isSelected = selectedModule === module.id;
                  const isAvailable = module.available;
                  
                  return (
                    <button
                      key={module.id}
                      onClick={() => {
                        if (isAvailable && module.href !== "#") {
                          window.location.href = module.href;
                        } else if (isAvailable) {
                          setSelectedModule(module.id);
                        }
                      }}
                      className={`relative transition-all bg-transparent border-none p-0 ${
                        isAvailable ? "cursor-pointer hover:scale-110" : "cursor-not-allowed opacity-40"
                      }`}
                      style={{
                        width: "40px",
                        height: "40px",
                        background: "transparent",
                        border: "none",
                        outline: "none",
                        boxShadow: "none"
                      }}
                      title={module.name}
                    >
                      {/* Circular Frame Only - No Card Background */}
                      <div
                        className={`w-full h-full flex items-center justify-center transition-all ${
                          isSelected ? "hud-pulse" : ""
                        }`}
                        style={{
                          filter: isSelected ? `drop-shadow(0 0 12px ${currentTheme.primary})` : `drop-shadow(0 0 6px ${currentTheme.primary}40)`,
                          background: "transparent",
                          border: "none"
                        }}
                      >
                        <div className="w-full h-full flex items-center justify-center" style={{ background: "transparent" }}>
                          <StylizedIcon moduleId={module.id} size="text-xl" />
                        </div>
                      </div>
                      
                      {/* Active Indicator */}
                      {isSelected && (
                        <div className="absolute -bottom-1 md:-right-1 md:bottom-auto md:top-1/2 md:transform md:-translate-y-1/2 left-1/2 md:left-auto transform -translate-x-1/2 md:translate-x-0 w-2 h-2 rounded-full" style={{
                          backgroundColor: currentTheme.accent,
                          boxShadow: `0 0 8px ${currentTheme.accent}`
                        }}></div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dashboard Content Area - Center */}
            <div className="flex-1 flex items-center justify-center min-w-0">
              {selectedModule ? (
                (() => {
                  const module = modules.find(m => m.id === selectedModule);
                  if (!module) return null;
                  
                  return (
                    <div className={`${hudClass} rounded-xl p-8 w-full max-w-4xl relative`} style={{
                      backgroundColor: currentTheme.cardBg,
                      borderColor: currentTheme.primary,
                      color: currentTheme.primary
                    }}>
                      {/* Corner Decorations */}
                      <div className={`hud-corner hud-corner-top-left`} style={{ borderColor: currentTheme.primary }}></div>
                      <div className={`hud-corner hud-corner-top-right`} style={{ borderColor: currentTheme.primary }}></div>
                      <div className={`hud-corner hud-corner-bottom-left`} style={{ borderColor: currentTheme.primary }}></div>
                      <div className={`hud-corner hud-corner-bottom-right`} style={{ borderColor: currentTheme.primary }}></div>

                      {/* Module Header */}
                      <div className="mb-6 text-center">
                        <h2 className="text-3xl font-bold hud-text font-mono" style={{
                          color: currentTheme.primary,
                          textShadow: `0 0 20px ${currentTheme.primary}, 0 0 40px ${currentTheme.primary}40`
                        }}>
                          {module.name}
                        </h2>
                      </div>

                      {/* Module-Specific Dashboard Content */}
                      {module.id === "nutrition" && module.available ? (
                        <div className="space-y-6">
                          {/* Quick Stats */}
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

                          {/* Quick Actions */}
                          <div className="flex justify-center gap-4">
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
                        <div className="text-center py-12">
                          <div className="text-lg font-mono hud-text mb-4" style={{
                            color: currentTheme.primary,
                            opacity: 0.5
                          }}>
                            [COMING SOON]
                          </div>
                          <p className="text-sm font-mono" style={{
                            color: currentTheme.textSecondary,
                            opacity: 0.6
                          }}>
                            This module is currently in development
                          </p>
                        </div>
                      ) : null}
                    </div>
                  );
                })()
              ) : (
                <div className={`${hudClass} rounded-xl p-8 max-w-2xl relative`} style={{
                  backgroundColor: currentTheme.cardBg,
                  borderColor: currentTheme.primary,
                  color: currentTheme.primary
                }}>
                  <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4 hud-text font-mono" style={{
                      color: currentTheme.primary,
                      textShadow: `0 0 15px ${currentTheme.primary}`
                    }}>
                      Select a Module
                    </h2>
                    <p className="text-sm font-mono" style={{
                      color: currentTheme.textSecondary,
                      opacity: 0.7
                    }}>
                      Choose a module from the navigation bar above to view its dashboard
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* JARVIS 4.0 Layout - Command Center Design */}
        {theme === "jarvis4" && (
          <div className="h-[calc(100vh-200px)] flex flex-col">
            {/* Top Module Frames */}
            <div className="flex-shrink-0 mb-4">
              <div className="flex items-center justify-center gap-2">
                {modules.map((module) => {
                  const isSelected = selectedModule === module.id;
                  const isAvailable = module.available;
                  
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
                        width: "50px",
                        height: "50px",
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
                          filter: isSelected ? `drop-shadow(0 0 15px ${currentTheme.primary})` : `drop-shadow(0 0 8px ${currentTheme.primary}40)`
                        }}
                      >
                        <div className="w-full h-full flex items-center justify-center" style={{ background: "transparent" }}>
                          <StylizedIcon moduleId={module.id} size="text-xl" />
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
                        src="/assets/Gemini_Generated_Image_574i41574i41574i-85020c02-51b2-4208-8468-3735b6a7f65e.png"
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
                {/* Settings */}
                <button
                  className={`${hudClass} rounded-lg p-4 w-24 h-24 flex flex-col items-center justify-center transition-all hover:scale-105`}
                  style={{
                    backgroundColor: currentTheme.cardBg,
                    borderColor: currentTheme.primary,
                    color: currentTheme.primary
                  }}
                  title="Settings"
                >
                  <div className="text-2xl mb-1">⚙</div>
                  <div className="text-xs font-mono hud-text">Settings</div>
                </button>

                {/* User Profile */}
                <button
                  className={`${hudClass} rounded-lg p-4 w-24 h-24 flex flex-col items-center justify-center transition-all hover:scale-105`}
                  style={{
                    backgroundColor: currentTheme.cardBg,
                    borderColor: currentTheme.primary,
                    color: currentTheme.primary
                  }}
                  title="Profile"
                >
                  <div className="text-2xl mb-1">👤</div>
                  <div className="text-xs font-mono hud-text">Profile</div>
                </button>

                {/* System Status */}
                <button
                  className={`${hudClass} rounded-lg p-4 w-24 h-24 flex flex-col items-center justify-center transition-all hover:scale-105`}
                  style={{
                    backgroundColor: currentTheme.cardBg,
                    borderColor: currentTheme.primary,
                    color: currentTheme.primary
                  }}
                  title="System Status"
                >
                  <div className="text-2xl mb-1">📊</div>
                  <div className="text-xs font-mono hud-text">Status</div>
                </button>

                {/* Notifications */}
                <button
                  className={`${hudClass} rounded-lg p-4 w-24 h-24 flex flex-col items-center justify-center transition-all hover:scale-105 relative`}
                  style={{
                    backgroundColor: currentTheme.cardBg,
                    borderColor: currentTheme.primary,
                    color: currentTheme.primary
                  }}
                  title="Notifications"
                >
                  <div className="text-2xl mb-1">🔔</div>
                  <div className="text-xs font-mono hud-text">Alerts</div>
                  <div className="absolute top-2 right-2 w-2 h-2 rounded-full" style={{
                    backgroundColor: currentTheme.accent,
                    boxShadow: `0 0 8px ${currentTheme.accent}`
                  }}></div>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
