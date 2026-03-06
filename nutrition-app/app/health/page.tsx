"use client";

import Link from "next/link";
import Navigation from "../components/Navigation";

export default function HealthPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Navigation />
        <h1 className="text-3xl font-bold font-mono mt-6">Health</h1>
        <p className="text-slate-400 mt-2 font-mono text-sm">
          Health metrics, activity, and wellness (coming soon).
        </p>
      </div>
    </div>
  );
}
