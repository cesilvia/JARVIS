"use client";

import Navigation from "../components/Navigation";
import CircuitBackground from "../hub/CircuitBackground";

const hubTheme = {
  primary: "#00D9FF",
  secondary: "#67C7EB",
  background: "#000000",
};

// Component list: drivetrain inspired by chainring + crank arms + pedals, chain, rear cog
function BikeComponentListIcon({ className = "w-12 h-12", style, stroke: strokeColor }: { className?: string; style?: React.CSSProperties; stroke?: string }) {
  const stroke = strokeColor ?? "currentColor";
  const r = 18;
  const cx = 24;
  const cy = 24;
  // Rear cog (left): center 14,24 radius 4
  const rearCx = 14;
  const rearCy = 24;
  const rearR = 4;
  // Front chainring (right): center 32,24 radius 9
  const frontCx = 32;
  const frontCy = 24;
  const frontR = 9;
  // Crank arms from front center: ~45° down-right and up-left; pedal at end
  const armLen = 7;
  const pedal1 = { x: frontCx + armLen * 0.7, y: frontCy + armLen * 0.7 }; // down-right
  const pedal2 = { x: frontCx - armLen * 0.7, y: frontCy - armLen * 0.7 };  // up-left
  // Teeth: rear 8, front 12 (small radial notches)
  const rearTeeth = 8;
  const frontTeeth = 12;
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke={stroke} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden>
      <circle cx={cx} cy={cy} r={r} strokeWidth="1.25" fill="none" />
      {/* Rear cog (small) with teeth */}
      <circle cx={rearCx} cy={rearCy} r={rearR} strokeWidth="2.25" fill="none" />
      <circle cx={rearCx} cy={rearCy} r={1.2} strokeWidth="2.25" fill="none" />
      {Array.from({ length: rearTeeth }).map((_, i) => {
        const a = (i / rearTeeth) * 2 * Math.PI - Math.PI / 2;
        const x1 = rearCx + (rearR - 0.4) * Math.cos(a);
        const y1 = rearCy - (rearR - 0.4) * Math.sin(a);
        const x2 = rearCx + (rearR + 0.4) * Math.cos(a);
        const y2 = rearCy - (rearR + 0.4) * Math.sin(a);
        return <line key={`r-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth="2.25" />;
      })}
      {/* Chain: upper and lower runs */}
      <path d={`M ${frontCx - frontR + 0.5} ${frontCy - 2} Q ${(frontCx + rearCx) / 2} ${frontCy - 6} ${rearCx + rearR - 0.5} ${rearCy - 2}`} strokeWidth="1.5" fill="none" />
      <path d={`M ${rearCx + rearR - 0.5} ${rearCy + 2} Q ${(frontCx + rearCx) / 2} ${frontCy + 6} ${frontCx - frontR + 0.5} ${frontCy + 2}`} strokeWidth="1.5" fill="none" />
      {/* Front chainring (large) with teeth and hub cutouts */}
      <circle cx={frontCx} cy={frontCy} r={frontR} strokeWidth="2.25" fill="none" />
      {Array.from({ length: frontTeeth }).map((_, i) => {
        const a = (i / frontTeeth) * 2 * Math.PI - Math.PI / 2;
        const x1 = frontCx + (frontR - 0.5) * Math.cos(a);
        const y1 = frontCy - (frontR - 0.5) * Math.sin(a);
        const x2 = frontCx + (frontR + 0.5) * Math.cos(a);
        const y2 = frontCy - (frontR + 0.5) * Math.sin(a);
        return <line key={`f-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth="2.25" />;
      })}
      {/* Hub: small center + radiating cutouts (4 spokes) */}
      <circle cx={frontCx} cy={frontCy} r={2.2} strokeWidth="2.25" fill="none" />
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * 2 * Math.PI + Math.PI / 4;
        const x2 = frontCx + 2.2 * Math.cos(a);
        const y2 = frontCy - 2.2 * Math.sin(a);
        return <line key={`h-${i}`} x1={frontCx} y1={frontCy} x2={x2} y2={y2} strokeWidth="2.25" />;
      })}
      {/* Crank arms and pedals */}
      <line x1={frontCx} y1={frontCy} x2={pedal1.x} y2={pedal1.y} strokeWidth="2.25" />
      <line x1={frontCx} y1={frontCy} x2={pedal2.x} y2={pedal2.y} strokeWidth="2.25" />
      <rect x={pedal1.x - 1.2} y={pedal1.y - 0.8} width={2.4} height={1.6} rx={0.3} strokeWidth="2.25" fill="none" />
      <rect x={pedal2.x - 1.2} y={pedal2.y - 0.8} width={2.4} height={1.6} rx={0.3} strokeWidth="2.25" fill="none" />
    </svg>
  );
}

// Gear inventory: simple t-shirt (crew neck, short sleeves, body)
function GearInventoryIcon({ className = "w-12 h-12", style, stroke: strokeColor }: { className?: string; style?: React.CSSProperties; stroke?: string }) {
  const s = strokeColor ?? "currentColor";
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke={s} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden>
      <circle cx="24" cy="24" r="18" strokeWidth="1.25" fill="none" />
      {/* T-shirt outline: shorter shoulder-to-armpit, longer sleeve from armpit to hem */}
      <path
        d="M 24 12
           L 18 12 L 12 14 L 12 21 L 16 21 L 16 28 L 16 35 L 18 37
           L 30 37 L 32 35 L 32 28 L 32 21 L 36 21 L 36 14 L 30 12 L 24 12"
        strokeWidth="2.25"
        fill="none"
      />
      {/* Sleeves (orange); lowest vertical not sleeve (electric blue) */}
      <path d="M 18 12 L 12 14 L 12 21 L 16 21" strokeWidth="2.25" stroke="#00BFFF" fill="none" />
      <path d="M 16 21 L 16 28" strokeWidth="2.25" stroke="#00BFFF" fill="none" />
      <path d="M 32 21 L 36 21 L 36 14 L 30 12" strokeWidth="2.25" stroke="#00BFFF" fill="none" />
      <path d="M 32 28 L 32 21" strokeWidth="2.25" stroke="#00BFFF" fill="none" />
      {/* Neck opening */}
      <path d="M 20 14 Q 24 16 28 14" strokeWidth="2.25" fill="none" />
      {/* Zipper from collar to bottom */}
      <line x1="24" y1="16" x2="24" y2="37" strokeWidth="2.25" stroke={s} />
    </svg>
  );
}

// Service log: gear + wrench (OpenClipart 278694) inside circle
function ServiceLogIcon({ className = "w-12 h-12", style, stroke: strokeColor }: { className?: string; style?: React.CSSProperties; stroke?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke={strokeColor ?? "currentColor"} strokeWidth="1.25" className={className} style={style} aria-hidden>
      <circle cx="24" cy="24" r="18" strokeWidth="1.25" fill="none" />
      <image
        href="/gear-wrench.svg"
        x="6"
        y="6"
        width="36"
        height="36"
        preserveAspectRatio="xMidYMid meet"
      />
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

// Sizing and fit: tape only from above with clear ruler-style tick marks
function SizingFitIcon({ className = "w-12 h-12", style, stroke: strokeColor }: { className?: string; style?: React.CSSProperties; stroke?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke={strokeColor ?? "currentColor"} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden>
      <circle cx="24" cy="24" r="18" strokeWidth="1.25" fill="none" />
      {/* Tape blade */}
      <rect x="8" y="18" width="32" height="12" rx="1" strokeWidth="2.25" fill="none" />
      {/* Ruler ticks: from top of tape down, long/medium/short, not touching bottom */}
      {[10, 13, 16, 19, 22, 25, 28, 31, 34, 37, 40].map((x, i) => {
        const yTop = 18;
        const tickLen = i % 4 === 0 ? 8 : i % 2 === 0 ? 5 : 2.5;
        return (
          <line key={x} x1={x} y1={yTop} x2={x} y2={yTop + tickLen} strokeWidth="2.25" />
        );
      })}
    </svg>
  );
}

// Ride checklist: bicycle side view – inside circle; saddle higher than bars; drop handlebars; single down tube
function RideChecklistIcon({ className = "w-12 h-12", style, stroke: strokeColor }: { className?: string; style?: React.CSSProperties; stroke?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke={strokeColor ?? "currentColor"} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden>
      <circle cx="24" cy="24" r="18" strokeWidth="1.25" fill="none" />
      <g transform="translate(24,24) scale(0.82) translate(-24,-24)">
        <circle cx="13" cy="30" r="5.5" strokeWidth="2.25" fill="none" />
        <circle cx="35" cy="30" r="5.5" strokeWidth="2.25" fill="none" />
        <line x1="22" y1="30" x2="20" y2="20" strokeWidth="2.25" />
        <line x1="20" y1="20" x2="32" y2="20" strokeWidth="2.25" />
        <line x1="20" y1="20" x2="13" y2="30" strokeWidth="2.25" />
        <line x1="22" y1="30" x2="13" y2="30" strokeWidth="2.25" />
        <line x1="32" y1="20" x2="32" y2="23" strokeWidth="2.25" />
        <line x1="32" y1="23" x2="35" y2="30" strokeWidth="2.25" />
        <line x1="32" y1="23" x2="22" y2="30" strokeWidth="2.25" />
        <line x1="20" y1="20" x2="20" y2="16" strokeWidth="2.25" />
        <path d="M18 16 L22 16" strokeWidth="2.25" />
        <line x1="32" y1="20" x2="34" y2="19" strokeWidth="2.25" />
        <line x1="32" y1="19" x2="36" y2="19" strokeWidth="2.25" />
        <path d="M32 19 L31 22" strokeWidth="2.25" />
        <path d="M36 19 L36 22" strokeWidth="2.25" />
      </g>
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
          {sections.map(({ id, name, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className="flex flex-col items-center justify-center gap-3 text-center transition-opacity hover:opacity-90 bg-transparent border-none p-4"
            >
              <Icon className="w-[120px] h-[120px] min-w-[120px] min-h-[120px]" stroke={hubTheme.primary} />
              <div className="font-semibold text-[#00D9FF] text-sm">{name}</div>
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
