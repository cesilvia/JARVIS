"use client";

import Navigation from "../../components/Navigation";
import SettingsNavIcon from "../SettingsNavIcon";

// Cycling icon (hub bike gear / cassette style) – parked here for reference
const CyclingIcon = ({ className = "w-12 h-12", stroke = "#94a3b8" }: { className?: string; stroke?: string }) => (
  <svg viewBox="0 0 48 48" fill="none" stroke={stroke} strokeWidth="2.25" strokeLinecap="butt" strokeLinejoin="miter" className={className} aria-hidden>
    <circle cx="24" cy="24" r="18" strokeWidth="1.25" fill="none" />
    <line x1="15" y1="20" x2="15" y2="28" strokeWidth="2.25" />
    <line x1="18.5" y1="17" x2="18.5" y2="31" strokeWidth="2.25" />
    <line x1="22" y1="15" x2="22" y2="33" strokeWidth="2.25" />
    <line x1="25.5" y1="13" x2="25.5" y2="35" strokeWidth="2.25" />
    <line x1="29" y1="11" x2="29" y2="37" strokeWidth="2.25" />
    <line x1="32.5" y1="10" x2="32.5" y2="38" strokeWidth="2.25" />
  </svg>
);

export default function ExtrasPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Navigation />
        <h1 className="text-3xl font-bold font-mono mt-4 text-slate-400">Extras</h1>
        <p className="text-slate-400 mt-2 font-mono text-sm mb-8">
          Things you&apos;ve created but don&apos;t need or want to use right now. A place to park experiments, backups, or features for later.
        </p>

        <section className="border border-slate-700 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold font-mono text-slate-100 mb-2">Cycling icon</h2>
          <p className="text-slate-400 font-mono text-sm mb-4">
            Hub bike gear / cassette icon (thin circle with vertical lines).
          </p>
          <CyclingIcon className="w-16 h-16" stroke="#94a3b8" />
        </section>

        <section className="border border-slate-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold font-mono text-slate-100 mb-2">More</h2>
          <p className="text-slate-400 font-mono text-sm">
            Add more items here when you have something to stash.
          </p>
        </section>
      </div>
      <SettingsNavIcon />
    </div>
  );
}
