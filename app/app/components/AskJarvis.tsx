"use client";

import { useState, useRef, useCallback } from "react";
import { queryRag, type RagResult } from "@/app/lib/api-client";

interface AskJarvisProps {
  scope?: string;
  placeholder?: string;
  /** Full page mode with larger layout */
  fullPage?: boolean;
}

export default function AskJarvis({ scope, placeholder, fullPage = false }: AskJarvisProps) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RagResult | null>(null);
  const [history, setHistory] = useState<{ question: string; result: RagResult }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const ask = useCallback(async () => {
    if (!question.trim() || loading) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await queryRag(question.trim(), scope);
      setResult(res);
      if (res.answer && !res.error) {
        setHistory(prev => [{ question: question.trim(), result: res }, ...prev].slice(0, 20));
      }
    } catch {
      setResult({ answer: "Error: Could not reach JARVIS.", citations: [] });
    } finally {
      setLoading(false);
    }
  }, [question, loading, scope]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      ask();
    }
  };

  return (
    <div className={fullPage ? "" : "w-full"}>
      {/* Search input */}
      <div className="flex items-center gap-2 bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2">
        <svg className="w-4 h-4 text-cyan-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? `Ask JARVIS${scope && scope !== "all" ? ` about ${scope}` : ""}...`}
          className="flex-1 bg-transparent text-slate-100 font-mono text-sm placeholder-slate-500 focus:outline-none"
        />
        <button
          onClick={ask}
          disabled={loading || !question.trim()}
          className="px-3 py-1 text-xs font-mono rounded bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "..." : "Ask"}
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center gap-2 mt-3 px-1">
          <div className="w-3 h-3 border-2 border-cyan-400/40 border-t-cyan-400 rounded-full animate-spin" />
          <span className="text-cyan-400 font-mono text-sm">Searching knowledge base...</span>
        </div>
      )}

      {/* Result */}
      {result && !loading && (
        <div className="mt-3">
          {result.error ? (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 font-mono text-sm">
              {result.error}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Answer */}
              <div className="p-4 rounded-lg bg-slate-800/50 border border-cyan-400/20">
                <div className="font-mono text-sm text-slate-200 whitespace-pre-wrap leading-relaxed prose prose-invert prose-sm max-w-none">
                  {result.answer}
                </div>
              </div>

              {/* Citations */}
              {result.citations && result.citations.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider px-1">Sources</p>
                  <div className={`grid gap-2 ${fullPage ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
                    {/* Deduplicate citations by title */}
                    {Array.from(new Map(result.citations.map(c => [c.title, c])).values()).map((c) => (
                      <div key={c.index} className="flex items-start gap-2 p-2 rounded bg-slate-800/30 border border-slate-700/50">
                        <span className="text-[10px] font-mono text-cyan-400 mt-0.5 shrink-0">[{c.index}]</span>
                        <div className="min-w-0">
                          <p className="font-mono text-xs text-slate-300 truncate">{c.title}</p>
                          {c.author && (
                            <p className="font-mono text-[10px] text-slate-500">{c.author}</p>
                          )}
                          {c.sourceUrl && (
                            <a
                              href={c.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-[10px] text-cyan-400/60 hover:text-cyan-400 truncate block"
                            >
                              {c.timestamp ? `${c.sourceUrl}#t=${c.timestamp}` : c.sourceUrl}
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* History (full page mode only) */}
      {fullPage && history.length > 1 && !loading && (
        <div className="mt-6 space-y-2">
          <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider px-1">Previous Questions</p>
          {history.slice(1).map((h, i) => (
            <button
              key={i}
              onClick={() => { setQuestion(h.question); setResult(h.result); }}
              className="w-full text-left p-2 rounded bg-slate-800/20 border border-slate-700/30 hover:border-slate-600 transition-colors"
            >
              <p className="font-mono text-xs text-slate-400 truncate">{h.question}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
