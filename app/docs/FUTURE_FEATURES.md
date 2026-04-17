# Future Features Log — J.A.R.V.I.S. Dashboard

## Infrastructure

### Completed
- ~~**SQLite migration**~~ — DONE (2026-03-15): localStorage → better-sqlite3. KV + 8 normalized tables, 10 API routes, api-client.ts.
- ~~**Docker + N8N on Mac Mini**~~ — DONE (2026-03-16): Docker Compose with JARVIS + N8N + cloudflared. Auto-deploy via git polling.
- ~~**Nightly backup**~~ — DONE (2026-03-16): N8N workflow POSTs to /api/backup at 2am daily.
- ~~**Off-device backup (Cloudflare R2)**~~ — DONE (2026-03-17): Backup POST saves locally + uploads to R2 bucket. Survives Mac Mini disk failure. Free tier (10 GB).
- ~~**Page verification checklist**~~ — DONE (2026-03-16): /settings/verification with file hash tracking, auto-invalidation, hub wedge integration.
- ~~**Auto-deploy**~~ — DONE: deploy.sh + launchd polls GitHub every 2min, auto-rebuilds Docker.
- ~~**Watchtower auto-updates**~~ — DONE (2026-03-26): Watchtower container checks N8N, LightRAG, cloudflared for newer images every Sunday 3am. JARVIS excluded (built from source). Old images cleaned up.
- ~~**N8N workflow backup**~~ — DONE (2026-03-26): Nightly backup POST now fetches N8N workflows via REST API and includes them in R2 backup. N8N backs up its own workflows.
- ~~**Disaster recovery docs**~~ — DONE (2026-03-26): docs/RESTORE.md with 10-step rebuild guide. GitHub Issue #1 pinned with summary.

### Planned
- **N8N workflow expansion** — Strava auto-sync (hourly), power curve builder (overnight), weather prefetch, German vocab backup
- **MCP server** — Expose JARVIS data as MCP tools for Claude ("How many miles this week?", "Add journal entry")
- ~~**LightRAG + OpenRouter**~~ — DONE (2026-03-24): LightRAG Docker container on Mac Mini for knowledge graph RAG. OpenRouter for embeddings (text-embedding-3-small) and LLM (Gemini 2.5 Flash). Semantic search across Readwise articles, podcast transcripts, highlights.
- **Full Convex migration** — Consider migrating all JARVIS data from SQLite to Convex for real-time sync, native vector search, and shared infrastructure with Higgins. Currently Convex is not used; LightRAG handles vector/graph search. Evaluate after Higgins is stable and if multi-device sync becomes important.
- ~~**intervals.icu integration**~~ — DONE (2026-03-25), SUPERSEDED (2026-03-28): Originally used intervals.icu wellness API for CTL/ATL/TSB. Replaced with proper local EMA calculation from Strava NP with configurable constants. intervals.icu API route preserved for cross-reference.
- ~~**Podcast transcription pipeline**~~ — DONE (2026-03-25): whisper.cpp + yt-dlp on Mac Mini. Downloads and transcribes Ask a Cycling Coach episodes (444 total), pushes to LightRAG. Cron runs 8pm-6am during backfill, switching to 3am after. Newest episodes first.
- ~~**TSB calculation revisit**~~ — DONE (2026-03-28): Rewrote to proper Coggan EMA model with configurable ATL/CTL constants in Settings > Cycling. Uses Strava NP (power meter data). ~8% NP gap vs TR accepted as algorithmic difference.
- **Podcast pipeline: add more sources** — Currently only Ask a Cycling Coach. Add Successful Athletes Podcast, Science of Getting Faster, other cycling/training podcasts. Managed via Research page Sources tab.
- **Podcast pipeline: switch to 3am cron** — After backfill completes, update cron from `0 20` to `0 3` for ongoing new-episode-only runs.
- **Global search (FTS5)** — Full-text search across all JARVIS data (recipes, vocab, gear, notes, journal). Separate from RAG semantic search.
- ~~**Command palette (Cmd+K)**~~ — DONE (2026-03-20): Spotlight-style overlay from any page. Fuzzy search across navigation, actions, and data (recipes, vocab, gear, bikes, rides). Recent items persist via KV.
- **Chat widget in JARVIS** — Embedded Claude conversation on the hub or as a panel. Full multi-turn chat with access to MCP tools for complex queries and follow-ups. Richer than command palette AI mode.
- **Global search** — Search across all modules, powered by FTS5
- ~~**Mac Mini hardening**~~ — MOSTLY DONE (2026-04-06): pmset configured (sleep 0, disksleep 0, autorestart 1, womp 1). Docker in Login Items. FileVault stays on (no auto-login — requires Screens 5 login after reboot). UptimeRobot configured. Watchdog script TBD.
- ~~**Remove Vercel domain**~~ — DONE (2026-04-06): jarvis.chrissilvia.com removed from Vercel dashboard. JARVIS project still exists on Vercel but disconnected from repo.
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
- **Research tag hierarchy review** — 3-level (up to 4) tag hierarchy built and deployed (Cycling > Training > Sweet Spot, etc.). Drill-down UI and inline "+" for new tags works. 100 documents need tag review. Revisit whether manual tagging is worth the effort given semantic search handles most queries. Consider: auto-confirm all as-is, or use AI to generate better tags, or simplify to just top-level categories.
- **Research citation export** — "Cite" button on each Library document card. Pre-fills citation form with known metadata from Readwise (title, author, URL, date). User fills in missing fields (publisher, journal, pages). Saves all citation metadata back to SQLite so it's reusable. Supports APA, MLA, and other common formats. Never guesses — only uses verified data. Also need to pull Readwise highlights (annotations/notes) into the document view.
- **German translation chat** — Chat-style enhancement to the German dictionary. After looking up a word/phrase, user can ask follow-up questions (formal vs informal, alternatives, usage context). Uses same OpenRouter/Gemini backend as AskJarvis. Remembers context within conversation. Persists last conversation on page reload. "New conversation" button to start fresh. History dropdown to revisit past discussions. Conversations saved to SQLite.
- **Research page (Journal tab)** — Daily entries with mood/energy tags stored in SQLite. Correlate with training load. Initial build done, UX needs revisit.
- **Chat widget in JARVIS** — Embedded Claude conversation on the hub. Full multi-turn chat with MCP tools. Richer than command palette AI mode.

## New Pages

- ~~**Research page**~~ — RESTRUCTURED (2026-03-22): Hub icon renamed from Notes to Research. Now an umbrella page with tabs: Readwise, Notes, Journal.

### Calendar Page — Document-to-ICS Tool
- **Hub location:** Top row, furthest left icon (already wired, placeholder page exists at app/calendar/page.tsx)
- **Core feature:** Drag-and-drop zone that accepts documents (PDF, images, text files) and uses AI (OpenRouter/Gemini with vision) to extract calendar events. Generates downloadable `.ics` files for import into Fantastical.
- **Workflow:** Drop document → AI extracts events → side-by-side view (document preview on left, extracted event cards on right) → review/edit fields → download individual `.ics` per event or "Download All" button.
- **Editable fields per event:** Title, Date, Time, Location, Notes. All fields editable before download.
- **Flagging:** If AI cannot confidently extract a field (e.g., no time specified), it flags the field in amber for manual entry. Never guesses.
- **Multiple events:** One document can produce multiple events (e.g., multi-day race schedule). Each event has its own `.ics` download button plus a bulk "Download All" option.
- **Stateless:** No persistence — documents and `.ics` files are not saved to SQLite. Pure convert-and-download tool.
- **Mockup:** [mockups/calendar-ics-tool.html](../mockups/calendar-ics-tool.html)

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

## Specialized AI Agents (decided 2026-04-06)
Architecture: each agent = different system prompt + tool set + potentially different model. No coordinator needed for single-user app.

- **Cycling coach agent** — Analyzes ride history, TSB trends, ride notes. Surfaces insights proactively (fatigue patterns, nutrition correlations, cramping trends). E.g. "Your RPE is rising faster than TSS — consider a recovery week" or "GI issues correlate with rides under 60g/hr carbs." Analytical, not retrieval.
- **German tutor agent** — Conversational practice with grammar correction. Aware of SM-2 progress (which words the user struggles with). Persists conversation context. Extends the planned "German translation chat" feature.
- **Calendar/document processor agent** — Extracts structured event data from documents (PDF/image/text → ICS). Narrow, focused prompt. Powers the Calendar page.
- **Email/document triage agent** — Forward emails or drop PDFs into JARVIS, agent extracts action items, calendar events, or reference material. Structured extraction from unstructured input.
- **Natural language data entry** — Instead of filling ride notes form fields: "Rode 90 minutes on the trainer, RPE 6, legs felt heavy, ate a gel and a bottle of Skratch, slept 7 hours." Agent parses into structured fields via function calling.

## Cross-Module Intelligence

- ~~**Morning briefing (static)**~~ — DONE (2026-03-22): Welcome banner on hub. Training TSB + weather + German cards due. Placeholders for calendar/tasks.
- **Morning briefing agent** — Upgrade from static banner. Runs at 6am via N8N, AI assembles weather + ride window + TSB/freshness + German words due + calendar events (once Fantastical wired). Synthesizes what matters today and pushes summary (push notification or email). Not a dashboard you look at — it *comes to you*. Teaches agentic orchestration.
- **Proactive smart alerts** — AI layer on top of rule-based alerts. Surfaces things rules wouldn't catch: "You haven't ridden outdoors in 12 days — weather looks good Thursday afternoon" or "German vocab review frequency is dropping this month." The difference between a dashboard and an assistant.
- **Pre-ride briefing** — Weather at ride time + TSB/freshness + TrainerRoad workout + calendar conflicts.
- **Ride planner** — Weather + training load + calendar free time → best ride window.
- **Weekly review** — Auto-generated: miles ridden, words learned, recipes cooked, tasks completed.
- **Recipe meal planner + grocery list** — Select week's recipes, generate deduped grocery list for AnyList.
- **Data correlations** — Sleep vs training load vs mood. Scatter plots over time.

## Hub Wedge Improvements

- ~~**Wedge text rendering overhaul**~~ — DONE (2026-03-27): clipPath + auto-scaling + dark backdrop. Text guaranteed inside wedge at all angles. Per-wedge positioning: Cycling centered with 2-char left shift, German left-aligned with per-row boundary, Nutrition centered with offset, Alerts centered. Masculine noun color darkened to #191970 for wedge readability.
- ~~**Layout audit**~~ — DONE (2026-03-27): Fixed nutrition page duplicate title, standardized settings margins, added NutritionBackIcon for manual entry, fixed wedge disconnect when welcome banner open.
- ~~**Hub icon rename**~~ — DONE (2026-03-28): "Strava" → "Cycling" on hub (mobile card label). Reflects broader cycling scope.
- ~~**themeColor viewport migration**~~ — DONE (2026-03-28): Moved from `metadata` to `viewport` export, eliminating ~30 Next.js 16 build warnings.
- **Nutrition wedge** — Recipe count (nutritionStats already loaded, not displayed)
- **German wedge** — Cards due for review today (SM-2 next_review data available)
- **Health wedge** — Placeholder until Garmin/Apple Health wired in

## Bike Enhancements

### Maintenance Tracker
- ~~**Mileage-based component alerts**~~ — DONE (2026-03-26): Progress bars on Components page with color-coded status (ok/check/due/overdue). Maintenance Alerts banner at top. Hub welcome banner shows up to 3 alerts in Today card.

### Ride Notes
- ~~**Structured ride notes form**~~ — DONE (2026-03-27): Collapsible form on ride detail view with 5 sections (Effort, Nutrition, Pre-Ride, Recovery, Notes). Auto-save, copy-to-clipboard for TrainerRoad, LightRAG indexing. Configurable dropdowns (ride type, electrolyte product) managed in Settings > Cycling.
- ~~**RPE scale update**~~ — DONE (2026-03-28): Changed from 1–10 to 1–9. Odd numbers are primary anchors (Easy/Moderate/Hard/Very Hard/All Out), even numbers labeled as in-between. Label shown next to slider value.
- ~~**Ride notes copy formatting**~~ — DONE (2026-03-28): Switched to `\r\n` line endings so each field pastes on its own line in TrainerRoad.
- ~~**Zwift indoor detection**~~ — DONE (2026-03-28): Activities with "Zwift" in the name are now detected as indoor rides. Affects Indoor badge, mileage split, weather fetch, and ride notes. TrainerRoad indoor/outdoor detection still TBD.
- ~~**Carbs input + math expressions**~~ — DONE (2026-03-28): Nutrition section first field changed from "Calories on Bike" to "Carbs on Bike (g)" with math expression support (e.g. `75+75`). Calories auto-computed (grams × 4). DB still stores calories_on_bike.
- ~~**CTL/ATL/TSB rewrite**~~ — DONE (2026-03-28): Proper Coggan EMA for both CTL and ATL (was: rolling avg CTL). Configurable constants (ATL=10, CTL=42) in Settings > Cycling. Removed intervals.icu as primary source; uses local Strava NP calculation.
- ~~**Drum picker UI**~~ — DONE (2026-03-28): iOS-style scroll wheel component (DrumPicker.tsx). Replaced sliders for RPE, leg freshness, and sleep quality. Touch-scrollable with snap, fade edges, selection highlight.
- ~~**Leg freshness 1–9 scale**~~ — DONE (2026-03-28): Expanded from 1–5 to 1–9 with labels: Heavy → Tired → Normal → Good → Fresh.
- ~~**Sleep quality 1–9 scale**~~ — DONE (2026-03-28): Changed from 1–10 to 1–9 with labels: Terrible → Poor → OK → Good → Great.
- ~~**Electrolyte mg → grams**~~ — DONE (2026-03-28): New `electrolyte_g` column, auto-migration from mg. Math expression support. Old column preserved.
- ~~**Sleep h:mm input**~~ — DONE (2026-03-28): Sleep hours input accepts `7:30` format instead of decimal. Converts to decimal for storage.
- **Ride notes trend analysis** — Charts over time: RPE vs TSS, calories/hr vs duration, weight tracking, sleep quality vs performance, GI issue correlation with nutrition. Scatter plots and line charts using stored computed fields. Waiting for more data.
- **TrainerRoad indoor/outdoor detection** — TR rides can be indoor or outdoor; needs heuristic (distance? GPS? user override?).
- **RENPHO integration** — Auto-pull weight from RENPHO Health app if a reliable API becomes available. Currently manual entry.

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
- **Voice interaction** — Full speech-to-intent pipeline: Web Speech API for input + TTS for output. Transcription → intent classification → tool calling → response generation. "Hey JARVIS, how many miles this week?" / "You've ridden 127 miles across 4 rides, TSB is minus 12." The most Iron Man thing JARVIS can do.
- **Animated transitions** — HUD-themed page transitions (scan lines, holographic fade-in)
- **Dashboard mode** — Fullscreen always-on display view

## AI Learning Lab (added 2026-04-06)
Features primarily valuable for learning AI concepts hands-on:
- **RAG evaluation pipeline** — Curate 20 questions with known answers, run through LightRAG, score results. Teaches RAG quality measurement — the thing most people skip.
- **Multi-model comparison** — Send same question to Gemini Flash and Claude Sonnet side by side. See tradeoffs (speed/cost vs. quality) in a hands-on way. Informs model selection across JARVIS.
- **Fine-tuning on personal data** — After accumulating enough ride notes and coaching insights, fine-tune a small model on personal cycling patterns. Full data → training → evaluation loop. Advanced, but the data is already accumulating.

## Authentication & Security
- Password reset from Settings
- Session management (view/revoke active sessions)
