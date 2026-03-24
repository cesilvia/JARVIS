import { NextRequest } from "next/server";
import { getResearchStats } from "@/app/lib/db";

const LIGHTRAG_URL = process.env.LIGHTRAG_URL || "http://localhost:9621";

// Query modes: naive (vector-only), local (graph neighborhood),
// global (cross-graph), hybrid (local+global), mix (graph+vector, recommended)
type QueryMode = "naive" | "local" | "global" | "hybrid" | "mix";

// Map scopes to LightRAG query modes — mix is best for cross-document reasoning
function queryModeForScope(scope?: string): QueryMode {
  // Use mix mode (graph + vector) for all queries — it's the recommended default
  return "mix";
}

export async function POST(request: NextRequest) {
  const { question, scope, mode } = await request.json();
  if (!question || typeof question !== "string") {
    return Response.json({ error: "question is required" }, { status: 400 });
  }

  // Check if LightRAG is reachable
  try {
    const healthRes = await fetch(`${LIGHTRAG_URL}/health`, { signal: AbortSignal.timeout(3000) });
    if (!healthRes.ok) throw new Error("unhealthy");
  } catch {
    // Fallback: check if we have any local content at all
    const stats = getResearchStats();
    return Response.json({
      answer: stats.documents > 0
        ? "LightRAG server is not reachable. Make sure it's running on the Mac Mini. Check LIGHTRAG_URL in .env.local."
        : "No research content has been synced yet, and LightRAG server is not reachable. Set up LightRAG on the Mac Mini and sync your Readwise library.",
      citations: [],
      error: "LIGHTRAG_UNREACHABLE",
    });
  }

  try {
    const queryMode = (mode as QueryMode) || queryModeForScope(scope);

    const res = await fetch(`${LIGHTRAG_URL}/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: question,
        mode: queryMode,
        // Only return context without LLM generation — we'll handle that ourselves
        // so we can use our own system prompt and citation format
        only_need_context: true,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return Response.json({ error: `LightRAG query failed: ${text}` }, { status: 500 });
    }

    const data = await res.json();
    const context = typeof data === "string" ? data : (data.response ?? data.context ?? "");

    if (!context || context.trim().length === 0) {
      return Response.json({
        answer: `I couldn't find any relevant content${scope && scope !== "all" ? ` about "${scope}"` : ""} for that question. Try syncing more content or rephrasing your question.`,
        citations: [],
      });
    }

    // Use Gemini Flash via OpenRouter for the synthesis step
    const openrouterKey = process.env.OPENROUTER_API_KEY;
    if (!openrouterKey) {
      return Response.json({ error: "OPENROUTER_API_KEY not configured" }, { status: 500 });
    }

    const llmRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openrouterKey}`,
        "HTTP-Referer": "https://jarvis.local",
        "X-Title": "JARVIS Research",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        max_tokens: 1500,
        messages: [
          {
            role: "system",
            content: `You are JARVIS, a personal AI research assistant. Answer the user's question using ONLY the provided source material. Be accurate, concise, and helpful.

IMPORTANT RULES:
- Only use information from the provided sources. If the sources don't contain enough information, say so.
- When citing, mention the specific source title and author inline.
- If the source has a timestamp, include it in your citation.
- Format your answer in clean markdown.
- Be direct and concise — the user wants actionable information, not summaries of what sources exist.

Today's date: ${new Date().toISOString().split("T")[0]}`,
          },
          {
            role: "user",
            content: `Here is the relevant context from my knowledge base:\n\n${context}\n\n---\n\nQuestion: ${question}`,
          },
        ],
      }),
    });

    if (!llmRes.ok) {
      const errText = await llmRes.text();
      return Response.json({ error: `LLM request failed: ${errText}` }, { status: 500 });
    }

    const llmData = await llmRes.json();
    const answer = llmData.choices?.[0]?.message?.content || "I couldn't generate a response.";

    // Extract any source references from the context for citation display
    // LightRAG context includes entity/relationship info but not structured citations
    // The citations come from the answer text itself (inline mentions)
    return Response.json({
      answer,
      citations: [],
      mode: queryMode,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "RAG query failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
