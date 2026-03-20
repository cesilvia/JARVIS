"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getKV, setKV } from "@/app/lib/api-client";

// --- Types ---

interface CommandItem {
  id: string;
  title: string;
  subtitle: string;
  category: "recent" | "navigation" | "action" | "result";
  href?: string;
  action?: () => Promise<void> | void;
}

interface SearchResult {
  type: string;
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

// --- Static items ---

const NAV_ITEMS: CommandItem[] = [
  { id: "nav-hub", title: "Hub", subtitle: "Home dashboard", category: "navigation", href: "/hub" },
  { id: "nav-strava", title: "Strava", subtitle: "Cycling dashboard", category: "navigation", href: "/bike/strava" },
  { id: "nav-bike", title: "Bike", subtitle: "Bikes and gear overview", category: "navigation", href: "/bike" },
  { id: "nav-german", title: "Deutsch", subtitle: "German language learning", category: "navigation", href: "/german" },
  { id: "nav-recipes", title: "Recipes", subtitle: "Recipe builder", category: "navigation", href: "/recipes" },
  { id: "nav-recipes-browse", title: "Browse Recipes", subtitle: "Browse saved recipes", category: "navigation", href: "/recipes/browse" },
  { id: "nav-nutrition", title: "Nutrition", subtitle: "Nutrition tracker", category: "navigation", href: "/nutrition" },
  { id: "nav-calendar", title: "Calendar", subtitle: "Calendar view", category: "navigation", href: "/calendar" },
  { id: "nav-tasks", title: "Tasks", subtitle: "Task manager", category: "navigation", href: "/tasks" },
  { id: "nav-weather", title: "Weather", subtitle: "Weather forecast", category: "navigation", href: "/weather" },
  { id: "nav-notes", title: "Notes", subtitle: "Notes", category: "navigation", href: "/notes" },
  { id: "nav-health", title: "Health", subtitle: "Health metrics", category: "navigation", href: "/health" },
  { id: "nav-inventory", title: "Gear Inventory", subtitle: "Bike gear and clothing", category: "navigation", href: "/bike/inventory" },
  { id: "nav-components", title: "Bike Components", subtitle: "Component tracking", category: "navigation", href: "/bike/components" },
  { id: "nav-tire-pressure", title: "Tire Pressure", subtitle: "Tire pressure calculator", category: "navigation", href: "/bike/tire-pressure" },
  { id: "nav-settings", title: "Settings", subtitle: "App settings", category: "navigation", href: "/settings" },
  { id: "nav-backup", title: "Backup", subtitle: "Backup and restore", category: "navigation", href: "/settings/backup" },
  { id: "nav-alerts", title: "Alerts", subtitle: "System alerts", category: "navigation", href: "/alerts" },
  { id: "nav-profile", title: "Profile", subtitle: "User profile", category: "navigation", href: "/profile" },
  { id: "nav-status", title: "System Status", subtitle: "System status", category: "navigation", href: "/status" },
  { id: "nav-verification", title: "Page Verification", subtitle: "Verify pages after changes", category: "navigation", href: "/settings/verification" },
];

const ACTION_ITEMS: CommandItem[] = [
  { id: "action-sync-strava", title: "Sync Strava", subtitle: "Fetch latest rides", category: "action" },
  { id: "action-backup", title: "Backup to R2", subtitle: "Full JARVIS backup", category: "action" },
];

// --- Fuzzy match ---

function fuzzyMatch(query: string, target: string): number {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  if (t.includes(q)) return 2; // substring match scores higher
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  return qi === q.length ? 1 : 0;
}

// --- Component ---

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [recents, setRecents] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Load recents on mount
  useEffect(() => {
    getKV<string[]>("command-palette-recents").then((r) => {
      if (r) setRecents(r);
    });
  }, []);

  // Cmd+K listener
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setSearchResults([]);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Body scroll lock
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const { results } = await res.json();
          setSearchResults(results ?? []);
        }
      } catch { /* ignore */ }
    }, 200);
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [query]);

  // Build the visible items list
  const getItems = useCallback((): CommandItem[] => {
    const items: CommandItem[] = [];

    if (!query) {
      // Show recents first, then nav
      for (const recentId of recents) {
        const nav = NAV_ITEMS.find((n) => n.id === recentId);
        const act = ACTION_ITEMS.find((a) => a.id === recentId);
        const item = nav || act;
        if (item) items.push({ ...item, category: "recent" });
      }
      items.push(...NAV_ITEMS);
      items.push(...ACTION_ITEMS);
      return items;
    }

    // Filter static items by fuzzy match
    const scored: { item: CommandItem; score: number }[] = [];
    for (const item of [...NAV_ITEMS, ...ACTION_ITEMS]) {
      const titleScore = fuzzyMatch(query, item.title);
      const subtitleScore = fuzzyMatch(query, item.subtitle);
      const score = Math.max(titleScore, subtitleScore);
      if (score > 0) scored.push({ item, score });
    }
    scored.sort((a, b) => b.score - a.score);
    items.push(...scored.map((s) => s.item));

    // Add search results
    for (const r of searchResults) {
      items.push({
        id: `result-${r.type}-${r.id}`,
        title: r.title,
        subtitle: r.subtitle,
        category: "result",
        href: r.href,
      });
    }

    return items;
  }, [query, recents, searchResults]);

  const items = getItems();

  // Keep selected index in bounds
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, searchResults]);

  // Execute an item
  const executeItem = useCallback(async (item: CommandItem) => {
    // Save to recents
    const newRecents = [item.id, ...recents.filter((r) => r !== item.id)].slice(0, 10);
    setRecents(newRecents);
    setKV("command-palette-recents", newRecents);

    setOpen(false);

    // Handle actions
    if (item.id === "action-sync-strava") {
      try { await fetch("/api/strava/sync", { method: "POST" }); } catch { /* ignore */ }
      return;
    }
    if (item.id === "action-backup") {
      try { await fetch("/api/backup", { method: "POST" }); } catch { /* ignore */ }
      return;
    }

    // Navigate
    if (item.href) {
      router.push(item.href);
    }
  }, [recents, router]);

  // Keyboard navigation
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (items[selectedIndex]) executeItem(items[selectedIndex]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  }

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (!open) return null;

  // Group items by category for display
  const categoryLabels: Record<string, string> = {
    recent: "Recent",
    navigation: "Navigation",
    action: "Actions",
    result: "Search Results",
  };
  const groups: { label: string; items: { item: CommandItem; globalIndex: number }[] }[] = [];
  let globalIndex = 0;
  const seen = new Set<string>();
  for (const item of items) {
    // Skip duplicates (recents that also appear in navigation)
    if (seen.has(item.id) && item.category !== "recent") { globalIndex++; continue; }
    seen.add(item.id);

    const label = categoryLabels[item.category] || item.category;
    let group = groups.find((g) => g.label === label);
    if (!group) {
      group = { label, items: [] };
      groups.push(group);
    }
    group.items.push({ item, globalIndex });
    globalIndex++;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={() => setOpen(false)}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Palette */}
      <div
        className="relative w-full max-w-lg mx-4 bg-slate-900 border border-cyan-400/30 rounded-xl shadow-2xl shadow-cyan-500/10 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Input */}
        <div className="flex items-center border-b border-cyan-400/20 px-4">
          <svg className="w-4 h-4 text-cyan-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages, actions, data..."
            className="w-full px-3 py-3.5 bg-transparent text-slate-100 font-mono text-sm placeholder-slate-500 focus:outline-none"
          />
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-slate-500 bg-slate-800 border border-slate-700 rounded">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto py-2">
          {items.length === 0 && query && (
            <p className="px-4 py-6 text-center text-slate-500 font-mono text-sm">
              No results for &ldquo;{query}&rdquo;
            </p>
          )}

          {groups.map((group) => (
            <div key={group.label}>
              <div className="px-4 pt-2 pb-1">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                  {group.label}
                </span>
              </div>
              {group.items.map(({ item, globalIndex: idx }) => (
                <button
                  key={`${item.id}-${idx}`}
                  data-index={idx}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                    idx === selectedIndex
                      ? "bg-cyan-500/15 text-cyan-300"
                      : "text-slate-300 hover:bg-slate-800/50"
                  }`}
                  onClick={() => executeItem(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <span className="w-5 h-5 flex items-center justify-center shrink-0 text-xs">
                    {item.category === "recent" && "↩"}
                    {item.category === "navigation" && "→"}
                    {item.category === "action" && "⚡"}
                    {item.category === "result" && "◇"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-sm truncate">{item.title}</div>
                    <div className="font-mono text-xs text-slate-500 truncate">{item.subtitle}</div>
                  </div>
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-cyan-400/20 px-4 py-2 flex gap-4 text-[10px] font-mono text-slate-600">
          <span>↑↓ navigate</span>
          <span>↵ select</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}
