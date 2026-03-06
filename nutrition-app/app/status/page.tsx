"use client";

import Link from "next/link";
import Navigation from "../components/Navigation";

export default function StatusPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Navigation />
        <h1 className="text-3xl font-bold font-mono mt-6">System Status</h1>
        <p className="text-slate-400 mt-2 font-mono text-sm">
          System health and status overview (coming soon).
        </p>
      </div>
    </div>
  );
}
