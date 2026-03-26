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
- ~~**LightRAG + OpenRouter**~~ — DONE (2026-03-24): LightRAG Docker container on Mac Mini for knowledge graph RAG. OpenRouter for embeddings (text-embedding-3-small) and LLM (Gemini 2.5 Flash). Semantic search across Readwise articles, podcast transcripts, highlights.
- **Full Convex migration** — Consider migrating all JARVIS data from SQLite to Convex for real-time sync, native vector search, and shared infrastructure with Higgins. Currently Convex is not used; LightRAG handles vector/graph search. Evaluate after Higgins is stable and if multi-device sync becomes important.
- ~~**intervals.icu integration**~~ — DONE (2026-03-25): CTL/ATL/TSB pulled from intervals.icu wellness API instead of local computation. Matches TrainerRoad numbers more closely. Falls back to local TR-method calculation (42-day rolling avg CTL + FTP history).
- ~~**Podcast transcription pipeline**~~ — DONE (2026-03-25): whisper.cpp + yt-dlp on Mac Mini. Downloads and transcribes Ask a Cycling Coach episodes (444 total), pushes to LightRAG. Cron runs 8pm-6am during backfill, switching to 3am after. Newest episodes first.
- **TSB calculation revisit** — Current TSB uses TR rolling-average CTL + EMA ATL with Strava NP. ~8% NP gap vs TR remains. User wants to revisit. Consider configurable time constants in Settings, or TR API if they ever publish one.
- **Podcast pipeline: add more sources** — Currently only Ask a Cycling Coach. Add Successful Athletes Podcast, Science of Getting Faster, other cycling/training podcasts. Managed via Research page Sources tab.
- **Podcast pipeline: switch to 3am cron** — After backfill completes, update cron from `0 20` to `0 3` for ongoing new-episode-only runs.
- **Global search (FTS5)** — Full-text search across all JARVIS data (recipes, vocab, gear, notes, journal). Separate from RAG semantic search.
- ~~**Command palette (Cmd+K)**~~ — DONE (2026-03-20): Spotlight-style overlay from any page. Fuzzy search across navigation, actions, and data (recipes, vocab, gear, bikes, rides). Recent items persist via KV.
- **Chat widget in JARVIS** — Embedded Claude conversation on the hub or as a panel. Full multi-turn chat with access to MCP tools for complex queries and follow-ups. Richer than command palette AI mode.
- **Global search** — Search across all modules, powered by FTS5
- **Uptime Kuma** — Service monitor, pings JARVIS/N8N every minute, alerts on downtime
- **Caddy** — Reverse proxy with auto-HTTPS (if needed beyond Cloudflare Tunnel)
- ~~**Dev mode alert suppression**~~ — DONE (2026-03-22): Backup and Strava sync alerts hidden on localhost (N8N runs against prod Docker, not local SQLite).
- **Offline / PWA** — Service worker + local cache for when Mac Mini is unreachable
- **Mobile layout** — Touch-friendly alternative to wedge interaction
- **React Native app** — Full native iOS app for JARVIS. Real push notifications, native feel, App Store/TestFlight distribution. Build after PWA if more native capabilities are needed. Skills transfer from Higgins React Native work.
- **Push notifications** — Web push for alerts (helmet, backup, zone review)
- **Things3 integration** — Sync tasks from Things3 via Apple Shortcuts + N8N. Things3 has URL scheme and Shortcuts support but no public API.
- ~~**Welcome banner**~~ — DONE (2026-03-22): "Good Morning/Afternoon/Evening, Chris" with 3 info cards (Training TSB, Weather + ride window, Today with German cards due). Auto-collapses 10s. Toggle via JARVIS frame tap. Training load extracted to shared lib. Calendar/tasks placeholders until Fantastical + Things 3 integrated.
- **Welcome message extras** — Fantastical events, Things 3 tasks, streak tracking (riding/German), motivational cycling quote of the day. Add as integrations become available.
- ~~**Research page (Readwise tab)**~~ — DONE (2026-03-24): Full Research page with RAG search (LightRAG + Gemini Flash), Readwise sync, library browser with tag filtering, source management (YouTube/RSS/Blog feeds for N8N), tag review workflow (auto-classify + user verification). AskJarvis component embeddable on any page. Cmd+K enhanced with semantic search. Mobile floating Ask button. Still needed: quote of the day on hub wedge, reading stats.
- **Research page (Journal tab)** — Daily entries with mood/energy tags stored in SQLite. Correlate with training load. Initial build done, UX needs revisit.
- **Chat widget in JARVIS** — Embedded Claude conversation on the hub. Full multi-turn chat with MCP tools. Richer than command palette AI mode.

## New Pages

- ~~**Research page**~~ — RESTRUCTURED (2026-03-22): Hub icon renamed from Notes to Research. Now an umbrella page with tabs: Readwise, Notes, Journal.

## App Integrations

### High-value
- **Fantastical / Apple Calendar** — CalDAV/iCal sync for Calendar page. Cross-reference with weather for ride scheduling.
- **TrainerRoad** — No public API. Planned workouts, training plan progression, workout compliance. Podcast transcripts being ingested via YouTube + whisper.cpp. TSS/CTL data sourced via intervals.icu as proxy.
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

- ~~**Morning briefing**~~ — DONE (2026-03-22): Welcome banner on hub. Training TSB + weather + German cards due. Placeholders for calendar/tasks.
- **Pre-ride briefing** — Weather at ride time + TSB/freshness + TrainerRoad workout + calendar conflicts.
- **Ride planner** — Weather + training load + calendar free time → best ride window.
- **Weekly review** — Auto-generated: miles ridden, words learned, recipes cooked, tasks completed.
- **Recipe meal planner + grocery list** — Select week's recipes, generate deduped grocery list for AnyList.
- **Data correlations** — Sleep vs training load vs mood. Scatter plots over time.

## Hub Wedge Improvements

- **Nutrition wedge** — Recipe count (nutritionStats already loaded, not displayed)
- **German wedge** — Cards due for review today (SM-2 next_review data available)
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
- Listening practice (SpeechSynthesis / TTS)
- Reading practice (passages with tap-to-translate)
- Expand vocabulary (currently ~150 words)
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
