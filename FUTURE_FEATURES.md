# Future Features Log — J.A.R.V.I.S. Dashboard

## Infrastructure

### Completed
- ~~**SQLite migration**~~ — DONE (2026-03-15): localStorage → better-sqlite3. KV + 8 normalized tables, 10 API routes, api-client.ts.
- ~~**Docker + N8N on Mac Mini**~~ — DONE (2026-03-16): Docker Compose with JARVIS + N8N + cloudflared. Auto-deploy via git polling.
- ~~**Nightly backup**~~ — DONE (2026-03-16): N8N workflow POSTs to /api/backup at 2am daily.
- ~~**Off-device backup (Cloudflare R2)**~~ — DONE (2026-03-17): Backup POST saves locally + uploads to R2 bucket. Survives Mac Mini disk failure. Free tier (10 GB).
- ~~**Page verification checklist**~~ — DONE (2026-03-16): /settings/verification with file hash tracking, auto-invalidation, hub wedge integration.
- ~~**Auto-deploy**~~ — DONE: deploy.sh + launchd polls GitHub every 2min, auto-rebuilds Docker.

### Planned
- **N8N workflow expansion** — Strava auto-sync (hourly), power curve builder (overnight), weather prefetch, German vocab backup
- **MCP server** — Expose JARVIS data as MCP tools for Claude ("How many miles this week?", "Add journal entry")
- **Ollama (local LLM)** — Run on Mac Mini for Research page RAG without API costs
- **SQLite FTS5** — Full-text search across all JARVIS data (recipes, vocab, gear, notes, journal)
- **Command palette (Cmd+K)** — Spotlight-style overlay from any page. Quick-add, search, navigate.
- **Global search** — Search across all modules, powered by FTS5
- **Uptime Kuma** — Service monitor, pings JARVIS/N8N every minute, alerts on downtime
- **Caddy** — Reverse proxy with auto-HTTPS (if needed beyond Cloudflare Tunnel)
- **Offline / PWA** — Service worker + local cache for when Mac Mini is unreachable
- **Mobile layout** — Touch-friendly alternative to wedge interaction
- **Push notifications** — Web push for alerts (helmet, backup, zone review)

## New Pages

- **Journal page** — Daily entries with mood/energy tags stored in SQLite. Correlate with training load.
- **Research page** — Readwise API + RAG. Pull highlights/annotations, embed locally (Ollama), semantic search.

## App Integrations

### High-value
- **Fantastical / Apple Calendar** — CalDAV/iCal sync for Calendar page. Cross-reference with weather for ride scheduling.
- **TrainerRoad** — Planned workouts, training plan progression, workout compliance.
- **Readwise** — Highlights, annotations, books → Research page RAG.
- **Garmin Connect** — Sleep, HRV, body battery, stress → Health page.
- **Ride with GPS** — Route planning, saved routes, route matching.
- **SRAM AXS** — Component wear tracking, shift data.
- **Open-Meteo** — Free weather API (no key). Wind, precipitation, "rideable hours."

### Medium-value
- **DeepL / Leo** — Inline translation/dictionary for German page.
- **Craft** — URL schemes/export for Notes page.
- **AnyList** — No public API; link recipes to grocery lists if API added.
- **Duolingo** — No official API; scrape streak/XP for German wedge.

### Lower priority
- **Google Maps / Apple Maps** — Route/commute info for ride planning
- **Apple Music** — Currently playing, workout playlists
- **LDS Tools / Gospel Library** — Reading plans, ward info

## Cross-Module Intelligence

- **Morning briefing** — Single "today" view: weather, calendar, tasks due, German cards due, training status.
- **Pre-ride briefing** — Weather at ride time + TSB/freshness + TrainerRoad workout + calendar conflicts.
- **Ride planner** — Weather + training load + calendar free time → best ride window.
- **Weekly review** — Auto-generated: miles ridden, words learned, recipes cooked, tasks completed.
- **Recipe meal planner + grocery list** — Select week's recipes, generate deduped grocery list for AnyList.
- **Data correlations** — Sleep vs training load vs mood. Scatter plots over time.

## Hub Wedge Improvements

- ~~**German wedge**~~ — DONE (2026-03-17): Word of the Day — 5 words (v/n/adj/adv/prp) with gender color-coding. Two-column layout.
- ~~**Nutrition wedge**~~ — DONE (2026-03-17): Placeholder "Fuel for the work required" (no Hexis/AnyList API).
- **German wedge layout iteration** — Try different layouts (centered, single-column, etc.)
- **Health wedge** — Placeholder until Garmin/Apple Health wired in

## Bike Enhancements

### Maintenance Tracker
- Mileage-based component alerts: chain (3,000 mi), brake pads (5,000 mi), etc. Wire components + Strava mileage.

### Strava Dashboard
- Improve polyline route matching (edit distance / lat-lng proximity)
- Select specific rides to compare
- Zwift route name lookup via polyline matching
- Power curve: parallelize build, move to N8N overnight workflow

## Streak / Consistency Tracker
- GitHub-style contribution grid: rode, studied German, journaled. Hub or profile page.

## German Page Enhancements
- ~~**Expand vocabulary**~~ — DONE (2026-03-17): ~1,869 words (528 nouns, 506 verbs, 483 adjectives, 251 adverbs, 51 prepositions, 32 conjunctions, 18 phrases). All with example sentences.
- ~~**Word of the Day**~~ — DONE (2026-03-17): 5 daily words on hub wedge + German page top section. Deterministic date-seeded selection, prioritizes un-mastered words.
- Listening practice (SpeechSynthesis / TTS)
- Reading practice (passages with tap-to-translate)
- Auto-backup via N8N
- Component extraction from page.tsx
- DeepL/Leo inline dictionary

## Nutrition Enhancements
- Recipe search with macro filtering
- Meal planning + daily macro tracking
- Recipe scaling (double/half)
- Recipe categories/tags
- Hexis: no public API — watch for Apple Health sync or Intervals.icu path

## "Wow Factor"
- **Voice control** — Web Speech API for basic commands
- **Animated transitions** — HUD-themed page transitions (scan lines, holographic fade-in)
- **Dashboard mode** — Fullscreen always-on display view

## Authentication & Security
- Password reset from Settings
- Session management (view/revoke active sessions)
