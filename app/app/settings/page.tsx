"use client";

import Link from "next/link";
import Navigation from "../components/Navigation";

const BikeWheelIcon = ({ className = "w-10 h-10" }: { className?: string }) => (
  <div className={`${className} relative flex items-center justify-center`}>
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" className="absolute inset-0 w-full h-full" aria-hidden>
      <circle cx="24" cy="24" r="18" strokeWidth="1.25" fill="none" />
    </svg>
    <div
      className="w-[62%] h-[62%]"
      style={{
        backgroundColor: "currentColor",
        WebkitMaskImage: "url('/assets/bike-wheel.svg')",
        maskImage: "url('/assets/bike-wheel.svg')",
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
    />
  </div>
);

const NutritionIcon = ({ className = "w-10 h-10" }: { className?: string }) => (
  <div className={`${className} relative flex items-center justify-center`}>
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" className="absolute inset-0 w-full h-full" aria-hidden>
      <circle cx="24" cy="24" r="18" strokeWidth="1.25" fill="none" />
    </svg>
    <div
      className="w-[62%] h-[62%]"
      style={{
        backgroundColor: "currentColor",
        WebkitMaskImage: "url('/assets/fork-silhouette.svg')",
        maskImage: "url('/assets/fork-silhouette.svg')",
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
    />
  </div>
);

const SecurityIcon = ({ className = "w-10 h-10" }: { className?: string }) => (
  <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <circle cx="24" cy="24" r="18" strokeWidth="1.25" fill="none" />
    <path d="M24 10 L34 16 V26 C34 32 30 36 24 38 C18 36 14 32 14 26 V16 Z" strokeWidth="2.25" fill="none" />
    <line x1="24" y1="22" x2="24" y2="28" strokeWidth="2.25" />
    <circle cx="24" cy="30" r="1.25" strokeWidth="2.25" fill="none" />
  </svg>
);

const BackupIcon = ({ className = "w-10 h-10" }: { className?: string }) => (
  <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <circle cx="24" cy="24" r="18" strokeWidth="1.25" fill="none" />
    <path d="M16 28 L16 20 C16 17 18 15 21 15 L27 15 C30 15 32 17 32 20 L32 28" strokeWidth="2.25" fill="none" />
    <polyline points="20,24 24,28 28,24" strokeWidth="2.25" fill="none" />
    <line x1="16" y1="32" x2="32" y2="32" strokeWidth="2.25" />
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
    name: "Backup",
    description: "Full JARVIS backup to iCloud Drive",
    href: "/settings/backup",
    icon: BackupIcon,
    color: "text-cyan-400",
    borderColor: "border-cyan-400/20",
    hoverBg: "hover:bg-cyan-400/5",
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
