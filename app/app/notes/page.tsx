"use client";

import Link from "next/link";
import Navigation from "../components/Navigation";

export default function NotesPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Navigation />
        <h1 className="text-3xl font-bold font-mono mt-6">Notes</h1>
        <p className="text-slate-400 mt-2 font-mono text-sm">
          Notes connected to your Craft account.
        </p>
        <div className="mt-6 p-4 rounded-lg bg-slate-800/50 border border-slate-700">
          <h2 className="text-lg font-mono font-semibold text-slate-200 mb-2">
            Craft Integration
          </h2>
          <p className="text-slate-400 font-mono text-sm">
            Connect your Craft account to sync notes, documents, and spaces.
            Craft integration coming soon.
          </p>
        </div>
      </div>
    </div>
  );
}
