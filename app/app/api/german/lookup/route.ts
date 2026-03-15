import { NextRequest, NextResponse } from "next/server";

// Free translation API: MyMemory
// Supports de|en and en|de language pairs
// Rate limit: ~5000 words/day without API key

export async function POST(req: NextRequest) {
  try {
    const { word, direction } = await req.json();
    if (!word || typeof word !== "string") {
      return NextResponse.json({ error: "Missing word" }, { status: 400 });
    }

    const langPair = direction === "en-de" ? "en|de" : "de|en";
    const trimmed = word.trim().toLowerCase();

    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed)}&langpair=${langPair}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });

    if (!res.ok) {
      return NextResponse.json({ error: "Translation service error" }, { status: 502 });
    }

    const data = await res.json();
    const mainTranslation = data.responseData?.translatedText || "";

    // Get alternative translations from matches
    const alternatives: string[] = [];
    if (data.matches && Array.isArray(data.matches)) {
      for (const match of data.matches) {
        const t = match.translation?.toLowerCase();
        if (t && t !== mainTranslation.toLowerCase() && !alternatives.includes(t)) {
          alternatives.push(t);
          if (alternatives.length >= 5) break;
        }
      }
    }

    return NextResponse.json({
      word: trimmed,
      translation: mainTranslation,
      alternatives,
      direction: direction || "de-en",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
