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
- **German conjugation engine**: `app/lib/german-conjugation.ts` (~500 lines) covers 4 tenses (Präsens, Präteritum, Perfekt, Futur I) × 6 pronouns. 100+ irregular verb lookup table. `app/lib/german-conjugation-cards.ts` generates 12,000 conjugation flashcards (partOfSpeech="conjugation").
- **German badges**: Yellow badges for weak nouns (W), preposition case governance (Akk/Dat/Gen/↕), subordinating conjunction verb kickers (VK). `WordBadge` component in page.tsx. Badges in WotD cards, dictionary, flashcards.
- **German detail modals (2026-03-17)**: `app/german/DetailModals.tsx` — three modal components accessible from WotD cards, dictionary, and flashcards:
  - `NounDeclensionModal` — definite/indefinite article tables, full noun phrase table (article + adjective "groß" + noun across definite/indefinite/no-article contexts), example sentences per case, weak noun indicator.
  - `VerbConjugationModal` — 2-column layout (ich/du/er left, wir/ihr/sie right), 4 tenses with usage notes, sample sentence per tense. Uses existing `conjugateVerb()` engine.
  - `AdjectiveEndingModal` — 3 tables (definite/indefinite/no article), 4 cases × 3 genders + plural, key pattern summary.
- **WotD stability (2026-03-17)**: Word of the Day selection uses static builtin word lists only (not dynamic vocab array). Adding words or mastering cards never changes the daily picks. 3 words per day: verb, noun, rotating 3rd (adj/adv/prp/cnj).
- **Hub wedge badges (2026-03-17)**: Circled Unicode letters (Ⓓ/Ⓐ/Ⓖ) for case governance, rendered as red superscript at 60% font size. Definition text word-wraps if too long.
- **Noun color coding**: Entire noun (article + word) color-coded by gender (blue=masc, red=fem, orange=neut) everywhere on German page.
- **German types**: `VocabWord` has `weakNoun?: boolean`, `caseGovernment?`, `verbKicker?: boolean`. `partOfSpeech` includes "conjugation". `VocabWordBase` = VocabWord without SR fields.
- **Neuter color**: das nouns now orange (#FFB347), not green.

## Key files

- `app/lib/db.ts` — SQLite singleton, all table schemas, CRUD functions, exportAll()
- `app/lib/api-client.ts` — Async fetch wrappers with generics
- `app/lib/german-types.ts` — Shared VocabWord and VocabWordBase types
- `app/lib/german-conjugation.ts` — Conjugation engine (conjugateVerb, generateFlashcards, IRREGULARS table)
- `app/lib/german-conjugation-cards.ts` — Generates VocabWordBase[] conjugation cards from verb list
- `app/lib/word-of-the-day.ts` — Date-seeded word selection from static builtin lists + wedge formatting with gender colors + circled badge characters
- `app/lib/german-vocab/` — 6 files: nouns.ts (8 weak nouns marked), verbs.ts (500 verbs), adjectives.ts, adverbs.ts, prepositions.ts, conjunctions.ts
- `app/german/page.tsx` — German learning page (~1100 lines) with WordBadge component, conjugation filter, detail modal state
- `app/german/DetailModals.tsx` — NounDeclensionModal, VerbConjugationModal, AdjectiveEndingModal
- `app/hub/page.tsx` — Main dashboard with wedge summaries (~950 lines)
- `app/hub/WedgeSummaryCard.tsx` — Wedge overlay with staggered labels, badge superscript rendering, definition word-wrapping
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
- Part of speech labels on German page cards should be in English (Noun, Verb, Adjective), not German.

## First task — Try yellow badge style on hub wedge

The German page has yellow badges (WordBadge component in page.tsx) for case governance: small yellow text with yellow border, e.g., "Dat", "Akk", "Gen". Currently the hub wedge uses red circled Unicode letters (Ⓓ/Ⓐ/Ⓖ) as superscripts for the same purpose.

**Try replacing the circled Unicode letters on the hub wedge with the same yellow badge style used on the German page.** This is an experiment — be ready to revert if it doesn't look right.

The badge rendering is in `app/hub/WedgeSummaryCard.tsx` around line 267-279 (the `badgeMatch` / `badge` rendering). The badge data comes from `app/lib/word-of-the-day.ts` `formatWotdForWedge()`. The yellow badge style on the German page is in the `WordBadge` component in `app/german/page.tsx`.

## Other priorities (pick one or more after the badge experiment)
1. **[Quick win] Weather page** — Open-Meteo (free, no API key), cycling-relevant (wind, rain, rideable hours), feeds hub wedge.
2. **[New page] Journal page** — SQLite table, daily entries with mood/energy tags.
3. **[New page] Research page** — Readwise API integration + RAG (Ollama on Mac Mini).
4. **[Infrastructure] N8N Strava sync workflow** — Hourly auto-sync + token refresh, no browser needed.
5. **[Infrastructure] MCP server** — Expose JARVIS data as MCP tools for Claude.
6. **[UX] Command palette (Cmd+K)** — Quick-add, search, navigate from any page.
7. **[Cycling] Bike maintenance tracker** — Wire components + Strava mileage for replacement alerts.

See `FUTURE_FEATURES.md` for the full roadmap.

What would you like to work on?
