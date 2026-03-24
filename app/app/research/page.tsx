"use client";

import { useState, useEffect, useCallback } from "react";
import Navigation from "../components/Navigation";
import AskJarvis from "../components/AskJarvis";
import {
  getResearchDocuments,
  getResearchStats,
  getResearchSources,
  saveResearchSources,
  deleteResearchSourceById,
  getUnreviewedTags,
  confirmTag,
  setDocumentTags,
  syncReadwise,
  getReadwiseSyncStatus,
} from "../lib/api-client";

type Tab = "search" | "library" | "sources" | "tags";

interface DocSummary {
  id: string;
  title: string;
  author?: string;
  source?: string;
  sourceUrl?: string;
  category?: string;
  summary?: string;
  wordCount: number;
  syncedAt: string;
  tags: string[];
}

interface SourceItem {
  id: string;
  name: string;
  url?: string;
  sourceType: string;
  active: boolean;
  createdAt: string;
}

interface TagReview {
  id: string;
  title: string;
  source: string | null;
  category: string | null;
  tags: string[];
}

interface Stats {
  documents: number;
  activeSources: number;
  unreviewedTags: number;
  tags: { tag: string; count: number }[];
}

export default function ResearchPage() {
  const [tab, setTab] = useState<Tab>("search");
  const [stats, setStats] = useState<Stats | null>(null);
  const [documents, setDocuments] = useState<DocSummary[]>([]);
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [unreviewed, setUnreviewed] = useState<TagReview[]>([]);
  const [syncStatus, setSyncStatus] = useState<{ lastSync: string | null; configured: boolean; openrouterConfigured?: boolean; lightragHealthy?: boolean } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [filterTag, setFilterTag] = useState<string | null>(null);

  // New source form
  const [newSourceName, setNewSourceName] = useState("");
  const [newSourceUrl, setNewSourceUrl] = useState("");
  const [newSourceType, setNewSourceType] = useState("youtube");

  const loadStats = useCallback(async () => {
    const s = await getResearchStats();
    setStats(s);
  }, []);

  const loadDocs = useCallback(async () => {
    const d = await getResearchDocuments({ tag: filterTag ?? undefined, limit: 50 });
    setDocuments(d);
  }, [filterTag]);

  const loadSources = useCallback(async () => {
    const s = await getResearchSources();
    setSources(s);
  }, []);

  const loadUnreviewed = useCallback(async () => {
    const u = await getUnreviewedTags();
    setUnreviewed(u);
  }, []);

  const loadSyncStatus = useCallback(async () => {
    const s = await getReadwiseSyncStatus();
    setSyncStatus(s);
  }, []);

  useEffect(() => {
    loadStats();
    loadSyncStatus();
  }, [loadStats, loadSyncStatus]);

  useEffect(() => {
    if (tab === "library") loadDocs();
    if (tab === "sources") loadSources();
    if (tab === "tags") { loadUnreviewed(); loadStats(); }
  }, [tab, loadDocs, loadSources, loadUnreviewed, loadStats]);

  const handleSync = async (full = false) => {
    setSyncing(true);
    try {
      const res = await syncReadwise(full);
      if (res.error) {
        alert(`Sync error: ${res.error}`);
      } else {
        alert(`Synced ${res.processed} documents (${res.indexed} indexed in LightRAG)`);
        loadStats();
        loadSyncStatus();
        if (tab === "library") loadDocs();
        if (tab === "tags") loadUnreviewed();
      }
    } catch {
      alert("Sync failed — check that READWISE_API_KEY is set in .env.local");
    } finally {
      setSyncing(false);
    }
  };

  const handleAddSource = async () => {
    if (!newSourceName.trim()) return;
    const id = `src-${Date.now()}`;
    await saveResearchSources([{
      id,
      name: newSourceName.trim(),
      url: newSourceUrl.trim() || undefined,
      sourceType: newSourceType,
    }]);
    setNewSourceName("");
    setNewSourceUrl("");
    loadSources();
  };

  const handleDeleteSource = async (id: string) => {
    await deleteResearchSourceById(id);
    loadSources();
  };

  const handleConfirmAllTags = async (item: TagReview) => {
    for (const tag of item.tags) {
      await confirmTag(item.id, tag);
    }
    loadUnreviewed();
    loadStats();
  };

  const handleRetagDocument = async (item: TagReview, newTags: string[]) => {
    await setDocumentTags(item.id, newTags);
    loadUnreviewed();
    loadStats();
  };

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: "search", label: "Search" },
    { id: "library", label: "Library" },
    { id: "sources", label: "Sources" },
    { id: "tags", label: "Review Tags", badge: stats?.unreviewedTags },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Navigation />
        <h1 className="text-3xl font-bold font-mono mt-6">Research</h1>
        <p className="text-slate-400 mt-1 font-mono text-sm">
          Knowledge base powered by Readwise, podcasts, and articles.
        </p>

        {/* Stats bar */}
        {stats && (
          <div className="flex flex-wrap gap-4 mt-4 text-xs font-mono text-slate-500">
            <span>{stats.documents} documents</span>
            <span>{stats.activeSources} sources</span>
            {stats.unreviewedTags > 0 && (
              <span className="text-amber-400">{stats.unreviewedTags} tags to review</span>
            )}
            {syncStatus?.lastSync && (
              <span>Last sync: {new Date(syncStatus.lastSync).toLocaleDateString()}</span>
            )}
          </div>
        )}

        {/* Sync controls */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => handleSync(false)}
            disabled={syncing || !syncStatus?.configured}
            className="px-3 py-1.5 text-xs font-mono rounded bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 disabled:opacity-30 transition-colors"
          >
            {syncing ? "Syncing..." : "Sync Readwise"}
          </button>
          <button
            onClick={() => handleSync(true)}
            disabled={syncing || !syncStatus?.configured}
            className="px-3 py-1.5 text-xs font-mono rounded bg-slate-700/50 text-slate-400 hover:bg-slate-700 disabled:opacity-30 transition-colors"
          >
            Full Re-sync
          </button>
          {!syncStatus?.configured && (
            <span className="text-xs font-mono text-amber-400 self-center">
              Add READWISE_API_KEY to .env.local
            </span>
          )}
          {syncStatus && !syncStatus.lightragHealthy && (
            <span className="text-xs font-mono text-amber-400 self-center">
              LightRAG not reachable
            </span>
          )}
          {syncStatus?.lightragHealthy && (
            <span className="text-xs font-mono text-green-400 self-center">
              LightRAG connected
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-6 border-b border-slate-700/50">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm font-mono border-b-2 transition-colors ${
                tab === t.id
                  ? "border-cyan-400 text-cyan-300"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              {t.label}
              {t.badge ? (
                <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-amber-400/20 text-amber-400 rounded-full">
                  {t.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="mt-6">
          {/* ─── Search ─── */}
          {tab === "search" && (
            <div>
              <AskJarvis scope="all" fullPage placeholder="Ask about your articles, podcasts, and highlights..." />
            </div>
          )}

          {/* ─── Library ─── */}
          {tab === "library" && (
            <div>
              {/* Tag filter */}
              {stats && stats.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  <button
                    onClick={() => setFilterTag(null)}
                    className={`px-2 py-1 text-xs font-mono rounded transition-colors ${
                      !filterTag ? "bg-cyan-500/20 text-cyan-300" : "bg-slate-800/50 text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    All
                  </button>
                  {stats.tags.map(t => (
                    <button
                      key={t.tag}
                      onClick={() => setFilterTag(t.tag)}
                      className={`px-2 py-1 text-xs font-mono rounded transition-colors ${
                        filterTag === t.tag ? "bg-cyan-500/20 text-cyan-300" : "bg-slate-800/50 text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      {t.tag} ({t.count})
                    </button>
                  ))}
                </div>
              )}

              {documents.length === 0 ? (
                <div className="text-center py-12 text-slate-500 font-mono text-sm">
                  No documents yet. Sync your Readwise library to get started.
                </div>
              ) : (
                <div className="space-y-2">
                  {documents.map(doc => (
                    <div key={doc.id} className="p-3 rounded-lg bg-slate-800/30 border border-slate-700/50 hover:border-slate-600 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-mono text-sm text-slate-200 truncate">{doc.title}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            {doc.author && <span className="font-mono text-xs text-slate-500">{doc.author}</span>}
                            {doc.category && (
                              <span className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-700/50 text-slate-400 rounded">
                                {doc.category}
                              </span>
                            )}
                            <span className="font-mono text-[10px] text-slate-600">{doc.wordCount.toLocaleString()} words</span>
                          </div>
                          {doc.tags.length > 0 && (
                            <div className="flex gap-1 mt-1.5">
                              {doc.tags.map(t => (
                                <span key={t} className="px-1.5 py-0.5 text-[10px] font-mono bg-cyan-500/10 text-cyan-400/70 rounded">
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        {doc.sourceUrl && (
                          <a
                            href={doc.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 text-cyan-400/40 hover:text-cyan-400 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── Sources ─── */}
          {tab === "sources" && (
            <div>
              <p className="text-slate-400 font-mono text-xs mb-4">
                Manage podcast feeds and content sources. These are tracked by JARVIS for N8N to ingest.
              </p>

              {/* Add source form */}
              <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/50 mb-6">
                <h3 className="font-mono text-sm text-slate-300 mb-3">Add Source</h3>
                <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto]">
                  <input
                    type="text"
                    value={newSourceName}
                    onChange={e => setNewSourceName(e.target.value)}
                    placeholder="Source name"
                    className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-400/50"
                  />
                  <input
                    type="text"
                    value={newSourceUrl}
                    onChange={e => setNewSourceUrl(e.target.value)}
                    placeholder="URL (YouTube playlist, RSS, blog)"
                    className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-400/50"
                  />
                  <select
                    value={newSourceType}
                    onChange={e => setNewSourceType(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm font-mono text-slate-100 focus:outline-none focus:border-cyan-400/50"
                  >
                    <option value="youtube">YouTube</option>
                    <option value="rss">RSS/Podcast</option>
                    <option value="blog">Blog</option>
                    <option value="other">Other</option>
                  </select>
                  <button
                    onClick={handleAddSource}
                    disabled={!newSourceName.trim()}
                    className="px-4 py-2 text-sm font-mono rounded bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 disabled:opacity-30 transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Source list */}
              {sources.length === 0 ? (
                <div className="text-center py-8 text-slate-500 font-mono text-sm">
                  No sources configured. Add a YouTube channel or RSS feed to get started.
                </div>
              ) : (
                <div className="space-y-2">
                  {sources.map(s => (
                    <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 border border-slate-700/50">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${s.active ? "bg-green-400" : "bg-slate-600"}`} />
                          <span className="font-mono text-sm text-slate-200">{s.name}</span>
                          <span className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-700/50 text-slate-400 rounded">
                            {s.sourceType}
                          </span>
                        </div>
                        {s.url && (
                          <p className="font-mono text-xs text-slate-500 mt-1 truncate pl-4">{s.url}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteSource(s.id)}
                        className="text-slate-600 hover:text-red-400 transition-colors ml-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── Tag Review ─── */}
          {tab === "tags" && (
            <div>
              <p className="text-slate-400 font-mono text-xs mb-4">
                Review auto-classified tags. Confirm or change tags to improve future classification.
              </p>

              {unreviewed.length === 0 ? (
                <div className="text-center py-8 text-slate-500 font-mono text-sm">
                  All tags reviewed. New documents will appear here after syncing.
                </div>
              ) : (
                <div className="space-y-3">
                  {unreviewed.map(item => (
                    <TagReviewCard
                      key={item.id}
                      item={item}
                      allTags={stats?.tags.map(t => t.tag) ?? []}
                      onConfirm={() => handleConfirmAllTags(item)}
                      onRetag={(tags) => handleRetagDocument(item, tags)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Tag Review Card ────────────────────────────────────────

function TagReviewCard({
  item,
  allTags,
  onConfirm,
  onRetag,
}: {
  item: TagReview;
  allTags: string[];
  onConfirm: () => void;
  onRetag: (tags: string[]) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editTags, setEditTags] = useState<string[]>(item.tags);
  const [newTag, setNewTag] = useState("");

  const handleAddTag = () => {
    if (newTag.trim() && !editTags.includes(newTag.trim())) {
      setEditTags([...editTags, newTag.trim().toLowerCase()]);
      setNewTag("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setEditTags(editTags.filter(t => t !== tag));
  };

  const handleSave = () => {
    onRetag(editTags);
    setEditing(false);
  };

  return (
    <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-700/50">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-mono text-sm text-slate-200 truncate">{item.title}</h3>
          <div className="flex items-center gap-2 mt-1">
            {item.source && <span className="font-mono text-xs text-slate-500">{item.source}</span>}
            {item.category && (
              <span className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-700/50 text-slate-400 rounded">
                {item.category}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tags display / edit */}
      {!editing ? (
        <div className="flex items-center gap-2 mt-2">
          <div className="flex gap-1 flex-wrap">
            {item.tags.map(t => (
              <span key={t} className="px-1.5 py-0.5 text-[10px] font-mono bg-amber-400/10 text-amber-400/70 rounded border border-amber-400/20">
                {t}
              </span>
            ))}
          </div>
          <div className="flex gap-1 ml-auto shrink-0">
            <button
              onClick={onConfirm}
              className="px-2 py-1 text-[10px] font-mono rounded bg-green-500/20 text-green-300 hover:bg-green-500/30 transition-colors"
            >
              Confirm
            </button>
            <button
              onClick={() => setEditing(true)}
              className="px-2 py-1 text-[10px] font-mono rounded bg-slate-700/50 text-slate-400 hover:bg-slate-700 transition-colors"
            >
              Edit
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          <div className="flex gap-1 flex-wrap">
            {editTags.map(t => (
              <button
                key={t}
                onClick={() => handleRemoveTag(t)}
                className="px-1.5 py-0.5 text-[10px] font-mono bg-cyan-500/10 text-cyan-300 rounded hover:bg-red-500/20 hover:text-red-300 transition-colors"
              >
                {t} ×
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            <input
              type="text"
              value={newTag}
              onChange={e => setNewTag(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleAddTag(); }}
              placeholder="Add tag..."
              list="tag-suggestions"
              className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-400/50"
            />
            <datalist id="tag-suggestions">
              {allTags.filter(t => !editTags.includes(t)).map(t => (
                <option key={t} value={t} />
              ))}
            </datalist>
            <button onClick={handleAddTag} className="px-2 py-1 text-xs font-mono rounded bg-slate-700/50 text-slate-400 hover:bg-slate-700">+</button>
            <button onClick={handleSave} className="px-2 py-1 text-xs font-mono rounded bg-green-500/20 text-green-300 hover:bg-green-500/30">Save</button>
            <button onClick={() => { setEditing(false); setEditTags(item.tags); }} className="px-2 py-1 text-xs font-mono rounded bg-slate-700/50 text-slate-400 hover:bg-slate-700">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
