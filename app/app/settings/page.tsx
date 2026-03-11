"use client";

import Link from "next/link";
import Navigation from "../components/Navigation";

const BikeWheelIcon = ({ className = "w-10 h-10" }: { className?: string }) => {
  const hubR = 2.5;
  const rimR = 14;
  const n = 16;
  const cross = 4;
  const spokes = Array.from({ length: n }, (_, i) => {
    const a1 = (i * 2 * Math.PI) / n;
    const a2 = ((i + cross) * 2 * Math.PI) / n;
    return (
      <line key={i} x1={24 + hubR * Math.cos(a1)} y1={24 - hubR * Math.sin(a1)} x2={24 + rimR * Math.cos(a2)} y2={24 - rimR * Math.sin(a2)} strokeWidth="1.25" strokeLinecap="butt" />
    );
  });
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <circle cx="24" cy="24" r="18" strokeWidth="1.25" fill="none" />
      <circle cx="24" cy="24" r={rimR} strokeWidth="2.25" />
      <circle cx="24" cy="24" r={hubR} strokeWidth="2.25" opacity="0.9" />
      {spokes}
    </svg>
  );
};

const NutritionIcon = ({ className = "w-10 h-10" }: { className?: string }) => (
  <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <circle cx="24" cy="24" r="18" strokeWidth="1.25" fill="none" />
    <circle cx="24" cy="24" r="9" strokeWidth="2.25" fill="none" />
    <line x1="11" y1="15" x2="11" y2="33" strokeWidth="2.25" />
    <line x1="9" y1="15" x2="9" y2="20" strokeWidth="2.25" />
    <line x1="11" y1="15" x2="11" y2="20" strokeWidth="2.25" />
    <line x1="13" y1="15" x2="13" y2="20" strokeWidth="2.25" />
    <line x1="9" y1="15" x2="13" y2="15" strokeWidth="2.25" />
    <line x1="37" y1="15" x2="37" y2="33" strokeWidth="2.25" />
  </svg>
);

const SecurityIcon = ({ className = "w-10 h-10" }: { className?: string }) => (
  <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <circle cx="24" cy="24" r="18" strokeWidth="1.25" fill="none" />
    <path d="M24 10 L34 16 V26 C34 32 30 36 24 38 C18 36 14 32 14 26 V16 Z" strokeWidth="2.25" fill="none" />
    <line x1="24" y1="22" x2="24" y2="28" strokeWidth="2.25" />
    <circle cx="24" cy="30" r="1.25" strokeWidth="2.25" fill="none" />
  </svg>
);

const ExtrasIcon = ({ className = "w-10 h-10" }: { className?: string }) => (
  <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <circle cx="24" cy="24" r="18" strokeWidth="1.25" fill="none" />
    <rect x="14" y="14" width="20" height="20" rx="2" strokeWidth="2.25" fill="none" />
    <line x1="24" y1="19" x2="24" y2="29" strokeWidth="2.25" />
    <line x1="19" y1="24" x2="29" y2="24" strokeWidth="2.25" />
  </svg>
);

const categories = [
  {
    name: "Cycling",
    description: "Strava connection and training zones",
    href: "/settings/cycling",
    icon: BikeWheelIcon,
    color: "text-orange-400",
    borderColor: "border-orange-400/20",
    hoverBg: "hover:bg-orange-400/5",
  },
  {
    name: "Nutrition",
    description: "Backup and import recipes & ingredients",
    href: "/settings/nutrition",
    icon: NutritionIcon,
    color: "text-green-400",
    borderColor: "border-green-400/20",
    hoverBg: "hover:bg-green-400/5",
  },
  {
    name: "Security",
    description: "Password, biometrics, and authentication",
    href: "/settings/security",
    icon: SecurityIcon,
    color: "text-blue-400",
    borderColor: "border-blue-400/20",
    hoverBg: "hover:bg-blue-400/5",
  },
  {
    name: "Extras",
    description: "Experiments and parked features",
    href: "/settings/extras",
    icon: ExtrasIcon,
    color: "text-slate-400",
    borderColor: "border-slate-400/20",
    hoverBg: "hover:bg-slate-400/5",
  },
];

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Navigation />
        <h1 className="text-3xl font-bold font-mono mt-6">Settings</h1>
        <p className="text-slate-400 mt-2 font-mono text-sm mb-8">
          Configuration and preferences.
        </p>

        <div className="grid grid-cols-2 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.name}
              href={cat.href}
              className={`border ${cat.borderColor} rounded-lg p-6 ${cat.hoverBg} transition-colors group`}
            >
              <cat.icon className={`w-10 h-10 ${cat.color} mb-3 group-hover:scale-110 transition-transform`} />
              <h2 className={`text-lg font-semibold font-mono ${cat.color}`}>{cat.name}</h2>
              <p className="text-slate-500 font-mono text-xs mt-1">{cat.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
