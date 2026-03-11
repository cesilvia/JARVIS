"use client";

import Link from "next/link";
import Navigation from "../components/Navigation";

export default function CalendarPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Navigation />
        <h1 className="text-3xl font-bold font-mono mt-6">Calendar</h1>
        <p className="text-slate-400 mt-2 font-mono text-sm">
          Connect your calendar to view events and schedule (coming soon).
        </p>
      </div>
    </div>
  );
}
