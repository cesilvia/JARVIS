"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import AskJarvis from "./AskJarvis";

// Map page paths to RAG scopes
function scopeForPath(path: string): string | undefined {
  if (path.startsWith("/bike") || path.startsWith("/bike/strava")) return "cycling";
  if (path.startsWith("/nutrition") || path.startsWith("/recipes")) return "nutrition";
  if (path.startsWith("/health")) return "health";
  if (path.startsWith("/german")) return undefined; // No RAG scope for German
  if (path.startsWith("/research")) return undefined; // Research page has its own search
  return "all";
}

export default function FloatingAskButton() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const scope = scopeForPath(pathname);

  // Don't show on Research page (has its own search) or hub
  const hidden = pathname === "/research" || pathname === "/hub" || scope === undefined;

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open]);

  if (hidden) return null;

  return (
    <>
      {/* Floating button — visible on mobile only */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 sm:hidden w-12 h-12 rounded-full bg-cyan-500/20 border border-cyan-400/30 backdrop-blur-sm flex items-center justify-center shadow-lg shadow-cyan-500/10 active:scale-95 transition-transform"
          aria-label="Ask JARVIS"
        >
          <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      )}

      {/* Bottom sheet panel */}
      {open && (
        <div className="fixed inset-0 z-50 sm:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="absolute bottom-0 left-0 right-0 bg-slate-900 border-t border-cyan-400/20 rounded-t-2xl p-4 pb-8 max-h-[80vh] overflow-y-auto animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-xs text-slate-500 uppercase tracking-wider">
                Ask JARVIS {scope && scope !== "all" ? `(${scope})` : ""}
              </span>
              <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <AskJarvis scope={scope} />
          </div>
        </div>
      )}
    </>
  );
}
