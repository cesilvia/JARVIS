"use client";

import Link from "next/link";

export default function SettingsNavIcon() {
  return (
    <Link
      href="/settings"
      className="fixed bottom-6 right-6 z-40 transition-transform hover:scale-110"
      title="Back to Settings"
      aria-label="Back to Settings"
    >
      <svg
        viewBox="0 0 48 48"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-10 h-10 text-slate-400 hover:text-slate-200 transition-colors"
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
    </Link>
  );
}
