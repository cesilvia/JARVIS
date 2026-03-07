"use client";

import Navigation from "../components/Navigation";
import CircuitBackground from "../hub/CircuitBackground";

const hubTheme = {
  primary: "#00D9FF",
  secondary: "#67C7EB",
  background: "#000000",
};

// Component list: drivetrain – chainring, chain, cassette
function BikeComponentListIcon({ className = "w-12 h-12", style, stroke: strokeColor }: { className?: string; style?: React.CSSProperties; stroke?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke={strokeColor ?? "currentColor"} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden>
      <circle cx="24" cy="24" r="18" strokeWidth="1.25" fill="none" />
      <circle cx="16" cy="24" r="6" strokeWidth="2.25" fill="none" />
      <circle cx="16" cy="24" r="2.5" strokeWidth="2.25" fill="none" />
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const a = (i * 60 * Math.PI) / 180;
        return <line key={i} x1={16} y1={24} x2={16 + 5 * Math.cos(a)} y2={24 - 5 * Math.sin(a)} strokeWidth="2.25" />;
      })}
      <path d="M22 24 Q26 20 32 24 Q26 28 22 24" strokeWidth="1.5" fill="none" />
      <path d="M22 24 Q18 20 16 24 Q18 28 22 24" strokeWidth="1.5" fill="none" />
      <circle cx="32" cy="24" r="4" strokeWidth="2.25" fill="none" />
      <circle cx="32" cy="24" r="2" strokeWidth="2.25" fill="none" />
      <circle cx="35" cy="22" r="1.8" strokeWidth="2.25" fill="none" />
      <circle cx="35" cy="26" r="1.8" strokeWidth="2.25" fill="none" />
    </svg>
  );
}

// Gear inventory: bike jersey + helmet
function GearInventoryIcon({ className = "w-12 h-12", style, stroke: strokeColor }: { className?: string; style?: React.CSSProperties; stroke?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke={strokeColor ?? "currentColor"} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden>
      <circle cx="24" cy="24" r="18" strokeWidth="1.25" fill="none" />
      <path d="M18 14 L16 22 L18 34 L24 36 L30 34 L32 22 L30 14 L24 12 Z" strokeWidth="2.25" fill="none" />
      <path d="M24 12 L24 36" strokeWidth="2.25" />
      <path d="M28 18 A6 6 0 0 1 28 30 L26 32 L24 31 L22 32 L20 30 A6 6 0 0 1 20 18 L22 16 L26 16 Z" strokeWidth="2.25" fill="none" />
      <path d="M20 26 L18 28" strokeWidth="2.25" />
    </svg>
  );
}

// Service log: head of crescent wrench (open jaw)
function ServiceLogIcon({ className = "w-12 h-12", style, stroke: strokeColor }: { className?: string; style?: React.CSSProperties; stroke?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke={strokeColor ?? "currentColor"} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden>
      <circle cx="24" cy="24" r="18" strokeWidth="1.25" fill="none" />
      <path d="M14 18 L14 30 L20 30 L24 26 L28 30 L34 30 L34 18 L28 22 L24 18 L20 22 Z" strokeWidth="2.25" fill="none" />
      <line x1="24" y1="18" x2="24" y2="26" strokeWidth="2.25" />
    </svg>
  );
}

// Tire pressure: gauge / dial with needle
function TirePressureIcon({ className = "w-12 h-12", style, stroke: strokeColor }: { className?: string; style?: React.CSSProperties; stroke?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke={strokeColor ?? "currentColor"} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden>
      <circle cx="24" cy="24" r="18" strokeWidth="1.25" fill="none" />
      <path d="M10 28 A14 14 0 0 1 38 28" strokeWidth="2.25" />
      <line x1="24" y1="28" x2="24" y2="16" strokeWidth="2.25" />
      <circle cx="24" cy="28" r="2" strokeWidth="2.25" fill="none" />
      <line x1="12" y1="28" x2="14" y2="28" strokeWidth="2.25" />
      <line x1="34" y1="28" x2="36" y2="28" strokeWidth="2.25" />
    </svg>
  );
}

// Sizing and fit: tape measure
function SizingFitIcon({ className = "w-12 h-12", style, stroke: strokeColor }: { className?: string; style?: React.CSSProperties; stroke?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke={strokeColor ?? "currentColor"} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden>
      <circle cx="24" cy="24" r="18" strokeWidth="1.25" fill="none" />
      <rect x="12" y="22" width="24" height="6" rx="0.5" strokeWidth="2.25" fill="none" />
      <rect x="34" y="23" width="4" height="4" rx="0.5" strokeWidth="2.25" fill="none" />
      <line x1="14" y1="25" x2="14" y2="23" strokeWidth="2.25" />
      <line x1="20" y1="25" x2="20" y2="23" strokeWidth="2.25" />
      <line x1="26" y1="25" x2="26" y2="23" strokeWidth="2.25" />
      <line x1="32" y1="25" x2="32" y2="23" strokeWidth="2.25" />
    </svg>
  );
}

// Ride checklist: road bike (side view)
function RideChecklistIcon({ className = "w-12 h-12", style, stroke: strokeColor }: { className?: string; style?: React.CSSProperties; stroke?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke={strokeColor ?? "currentColor"} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden>
      <circle cx="24" cy="24" r="18" strokeWidth="1.25" fill="none" />
      <circle cx="14" cy="32" r="5" strokeWidth="2.25" fill="none" />
      <circle cx="34" cy="32" r="5" strokeWidth="2.25" fill="none" />
      <path d="M14 32 L20 20 L28 14 L34 32" strokeWidth="2.25" fill="none" />
      <path d="M20 20 L34 32" strokeWidth="2.25" />
      <path d="M28 14 L26 20" strokeWidth="2.25" />
      <circle cx="28" cy="14" r="2" strokeWidth="2.25" fill="none" />
      <path d="M20 20 L18 26" strokeWidth="2.25" />
    </svg>
  );
}

// Packing checklist: suitcase
function PackingChecklistIcon({ className = "w-12 h-12", style, stroke: strokeColor }: { className?: string; style?: React.CSSProperties; stroke?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke={strokeColor ?? "currentColor"} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden>
      <circle cx="24" cy="24" r="18" strokeWidth="1.25" fill="none" />
      <rect x="14" y="16" width="20" height="16" rx="1" strokeWidth="2.25" fill="none" />
      <rect x="21" y="13" width="6" height="4" rx="0.5" strokeWidth="2.25" fill="none" />
      <line x1="24" y1="13" x2="24" y2="16" strokeWidth="2.25" />
      <line x1="18" y1="22" x2="30" y2="22" strokeWidth="2.25" />
    </svg>
  );
}

const sections = [
  { id: "components", name: "Component list", icon: BikeComponentListIcon, description: "Bikes and parts" },
  { id: "inventory", name: "Gear inventory", icon: GearInventoryIcon, description: "Helmets, kit, tools" },
  { id: "service", name: "Service log", icon: ServiceLogIcon, description: "Maintenance history" },
  { id: "tire-pressure", name: "Tire pressure", icon: TirePressureIcon, description: "PSI by bike or tire" },
  { id: "sizing", name: "Sizing & fit", icon: SizingFitIcon, description: "Fit numbers and notes" },
  { id: "ride-checklist", name: "Ride checklist", icon: RideChecklistIcon, description: "Pre-ride checks" },
  { id: "packing", name: "Packing checklist", icon: PackingChecklistIcon, description: "What to pack" },
];

export default function BikeGearPage() {
  return (
    <div className="min-h-screen hud-scifi-bg relative" style={{ backgroundColor: hubTheme.background, color: hubTheme.primary }}>
      <CircuitBackground />
      <main className="container mx-auto px-4 py-8 max-w-4xl relative z-10">
        <div className="mb-8 flex items-center justify-between">
          <Navigation />
          <h2 className="text-2xl font-semibold hud-text">Bike Gear</h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {sections.map(({ id, name, icon: Icon, description }) => (
            <button
              key={id}
              type="button"
              className="flex flex-col items-center justify-center gap-3 text-center transition-opacity hover:opacity-90 bg-transparent border-none p-4"
            >
              <Icon className="w-12 h-12" stroke={hubTheme.primary} />
              <div>
                <div className="font-semibold text-[#00D9FF] text-sm">{name}</div>
                <div className="text-xs mt-0.5" style={{ color: hubTheme.secondary }}>{description}</div>
              </div>
            </button>
          ))}
        </div>

        <p className="mt-8 text-center text-sm" style={{ color: hubTheme.secondary }}>
          Tap a section to open it (content coming soon).
        </p>
      </main>
    </div>
  );
}
