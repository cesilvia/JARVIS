# Cursor Prompt: JARVIS Dashboard — Next Session

## Context
I'm building a Next.js personal dashboard ("JARVIS") at `app/` with a HUD/sci-fi theme (primary=#00D9FF, secondary=#67C7EB, dark background). Uses TypeScript, Tailwind, better-sqlite3 for persistence. All data migrated from localStorage to server-side SQLite. Charts are hand-rolled inline SVG (no charting library). The hub page is at `app/hub/page.tsx` with wedge-based navigation.

## Current state (as of 2026-03-17)

- **SQLite migration complete**: KV table + 8 normalized tables, 10 API routes under /api/db/*, async api-client.ts.
- **Mac Mini hosting via Cloudflare Tunnel**: `jarvis.chrissilvia.com` → Mac Mini Docker. Three containers: jarvis, n8n, cloudflared.
- **Auto-deploy**: `deploy.sh` + launchd polls GitHub every 2min. Push to main → auto-rebuilds Docker.
- **Nightly backup**: N8N workflow POSTs /api/backup at 2am daily. Saves locally to `./backups/` AND uploads to Cloudflare R2 bucket `jarvis-backups` (off-device backup). Sets `last-full-backup` KV key.
- **R2 backup**: AWS Signature V4 signing using Node crypto (no SDK dependency). R2 credentials in `.env.local` on Mac Mini only (prod-only for safety).
- **Page verification checklist**: `/settings/verification` tracks 38 items across 7 groups.
- **German vocabulary**: ~1,869 words across 6 categories in `app/lib/german-vocab/`. 500 verbs.
- **German conjugation engine (2026-03-17)**: `app/lib/german-conjugation.ts` (~500 lines) covers 4 tenses (Präsens, Präteritum, Perfekt, Futur I) × 6 pronouns. 100+ irregular verb lookup table. `app/lib/german-conjugation-cards.ts` generates 12,000 conjugation flashcards (partOfSpeech="conjugation").
- **German badges (2026-03-17)**: Yellow badges for weak nouns (W), preposition case governance (Akk/Dat/Gen/↕), subordinating conjunction verb kickers (VK). `WordBadge` component in page.tsx. Badges in WotD cards, dictionary, flashcards, and hub wedge.
- **German types**: `VocabWord` has `weakNoun?: boolean`, `caseGovernment?`, `verbKicker?: boolean`. `partOfSpeech` includes "conjugation". `VocabWordBase` = VocabWord without SR fields.
- **Neuter color**: das nouns now orange (#FFB347), not green.

## Key files

- `app/lib/db.ts` — SQLite singleton, all table schemas, CRUD functions, exportAll()
- `app/lib/api-client.ts` — Async fetch wrappers with generics
- `app/lib/german-types.ts` — Shared VocabWord and VocabWordBase types
- `app/lib/german-conjugation.ts` — Conjugation engine (conjugateVerb, generateFlashcards, IRREGULARS table)
- `app/lib/german-conjugation-cards.ts` — Generates VocabWordBase[] conjugation cards from verb list
- `app/lib/word-of-the-day.ts` — Date-seeded word selection + wedge formatting with gender colors + definitions + badge suffixes
- `app/lib/german-vocab/` — 6 files: nouns.ts (8 weak nouns marked), verbs.ts (500 verbs), adjectives.ts, adverbs.ts, prepositions.ts, conjunctions.ts
- `app/german/page.tsx` — German learning page (~1100 lines) with WordBadge component, conjugation filter, merge logic preserving weakNoun/category from builtins
- `app/hub/page.tsx` — Main dashboard with wedge summaries (~950 lines)
- `app/hub/WedgeSummaryCard.tsx` — Wedge overlay with staggered labels
- `app/bike/strava/page.tsx` — Strava cycling dashboard (~1700 lines)
- `proxy.ts` — Auth middleware (PUBLIC_PATHS includes /api/backup)
- `Dockerfile` — Multi-stage Next.js + better-sqlite3 build
- `docker-compose.yml` — JARVIS + N8N + cloudflared services

## Deploy workflow
Just push to main. Auto-deploys to Mac Mini within 2 minutes.

## Important notes
- `.env.local` on Mini uses `$$` to escape `$` in bcrypt hashes (Docker Compose interpolation). Local dev uses `\$` (shell escaping).
- R2 env vars only on Mac Mini (prod-only for safety).
- N8N is Tailscale-only (no public URL, no auth).
- When `.env.local` changes, remind user to update Apple Passwords entry.
- Wedge text word-wraps with indented continuations — don't shrink font to fit.
- Conjugation engine must be 100% accurate. The IRREGULARS table in german-conjugation.ts has been verified. Don't modify without double-checking.

## Next priorities — German detail pages

These three detail pages are the immediate next task. Each should be a button on the relevant card type that opens a detail view (modal/overlay or separate page):

### 1. Noun declension detail page
- Button on noun cards in dictionary/flashcards
- Shows nom/akk/dat/gen case table for the noun (with article changes: der→den→dem→des for masculine, etc.)
- Sample sentence for each case
- Weak noun (n-Deklination) indicator when applicable — shows the -n/-en ending in non-nominative cases
- Plural forms if available

### 2. Verb conjugation detail page
- Button on verb cards in dictionary/flashcards
- 2-column layout: ich/du/er in left column, wir/ihr/sie in right column
- All 4 tenses (Präsens, Präteritum, Perfekt, Futur I) with usage notes per tense
- 1st person singular sample sentence with translation per tense
- Use the existing `conjugateVerb()` from `app/lib/german-conjugation.ts` — it returns all forms

### 3. Adjective ending detail page
- Button on adjective cards in dictionary/flashcards
- 3 tables: definite article (der/die/das), indefinite article (ein/eine/ein), no article
- Each table: 4 cases × 3 genders (masculine/feminine/neuter) + plural
- Shows the adjective with the correct ending in each cell (e.g., "der große Mann", "ein großer Mann", "großer Mann")

## Other priorities (pick one or more after detail pages)
1. **[Quick win] Weather page** — Open-Meteo (free, no API key), cycling-relevant (wind, rain, rideable hours), feeds hub wedge.
2. **[New page] Journal page** — SQLite table, daily entries with mood/energy tags.
3. **[New page] Research page** — Readwise API integration + RAG (Ollama on Mac Mini).
4. **[Infrastructure] N8N Strava sync workflow** — Hourly auto-sync + token refresh, no browser needed.
5. **[Infrastructure] MCP server** — Expose JARVIS data as MCP tools for Claude.
6. **[UX] Command palette (Cmd+K)** — Quick-add, search, navigate from any page.
7. **[Cycling] Bike maintenance tracker** — Wire components + Strava mileage for replacement alerts.

See `FUTURE_FEATURES.md` for the full roadmap.

What would you like to work on?
