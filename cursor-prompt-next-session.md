This is JARVIS, a Next.js 16 personal dashboard (app router, SQLite via better-sqlite3, Docker on Mac Mini, auto-deploy from main). The hub page has radial SVG "wedge" UI components on desktop and a scrollable card layout on mobile.

What was done last session (2026-03-27, late evening)
Completed & deployed to main:

Layout Audit — Fixed nutrition page duplicate "Food and Nutrition" title (was rendered twice: once as page header, once inside card). Removed duplicate, moved "Add Manually" into a third input row matching Search and Barcode UPC rows (label + text input + button). Product name carries over to manual entry form. Added NutritionBackIcon (fork plate icon) in upper-right of page header when manual entry form is open — collapses form on click. Standardized settings sub-page margins (backup, security, extras) from mt-4 to mt-6. Removed dim text-slate-400 color from Extras title.

Wedge Text Rendering Overhaul — Complete rewrite of WedgeSummaryCard.tsx. Old approach: counter-rotated SVG text with fixed X positions caused text to extend outside wedge at various angles. New approach: (1) SVG clipPath on text group — text physically cannot render outside wedge boundary at any angle, (2) dark semi-transparent backdrop (rgba(0,0,0,0.35)) behind text for readability, (3) auto-scaling computes largest font that fits inside wedge using inscribed rectangle geometry (min scale 0.55 centered / 0.85 left-aligned), (4) text X positions centered around rotation pivot (TC*L) to minimize clipping, (5) left-aligned mode (German) uses per-row left boundary based on Y position (LEFT_BASE_X + y*0.3) so entries in wider part of wedge use more space. Per-wedge tuning: Strava 2-char left shift, Nutrition 1-char right + 2-line down offset, Alerts no offset, German per-row dynamic positioning.

Welcome Banner + Wedge Fix — When clicking a wedge icon while the welcome banner was showing, the wedge appeared disconnected from the hub center (offset by banner height). Fix: handleIconClick now closes banner first, then delays wedge display by 550ms (matching CSS transition). Separate useEffect recalculates wedge position after banner transition completes.

German Wedge Colors — Masculine noun wedge color darkened from #4A7ECC to #191970 (midnight blue) for readability against bright cyan wedge background.

Env vars added this session:
- No new env vars this session

Pending / needs checking:
- Test component alerts — user needs to add components with mileageAtInstall and serviceIntervalMiles to see progress bars
- Podcast backfill progress — was 193 of 444 episodes as of evening 3/27. Check with: `wc -l ~/podcast-pipeline/completed.txt`
- After backfill completes, switch cron schedule for ongoing runs (currently runs 8pm-6am nightly during backfill)
- TSB calculation revisit — ~8% NP gap between Strava and TR remains
- Ride notes trend analysis — charts/scatter plots using stored computed fields (RPE vs TSS, weight over time, nutrition patterns, sleep vs performance)

Queued features (in priority order):
1. Ride notes trend analysis — Charts: RPE vs TSS scatter, weight over time, carbs/hr trends, sleep quality vs performance, GI issue correlation. Use stored computed fields in ride_notes table.
2. Welcome banner extras — Fantastical events and Things 3 tasks in "Today" card (user has a friend with an MCP server for this — wait for that)
3. Research citation export — "Cite" button on Library cards, pre-fill from Readwise metadata, user fills gaps, saves citation data to SQLite, format as APA/MLA/etc. Also need to pull Readwise highlights into document view. Never guess citations — only use verified data.
4. German translation chat — Chat-style enhancement to dictionary. Follow-up questions on translations (formal vs informal, alternatives). Same AI backend (OpenRouter/Gemini). Remembers context. Persists last conversation, "New conversation" button, history dropdown. Saved to SQLite.
5. Calendar page — Document-to-ICS tool. Drag PDF/image/text onto drop zone, AI extracts events, side-by-side review (doc preview + editable event cards), download individual or all .ics files for Fantastical. Flags uncertain fields. Stateless (no persistence). Mockup: mockups/calendar-ics-tool.html
6. Add more podcast sources — Successful Athletes Podcast, Science of Getting Faster, etc.
7. Full Convex migration evaluation — Consider after Higgins is stable

Separate project — Higgins:
Shared household grocery/pantry/meal planning/recipe app (React Native + Expo + Convex). Development happens in a separate chat. JARVIS integration comes after Higgins is underway.

Recurring bug pattern to watch for:
- JavaScript `new Date("2026-03-20T06:00")` treats no-timezone strings as UTC, not local. Always parse date/time components from strings directly or append timezone info.

Key files:
- app/hub/page.tsx — Hub page (desktop wedge + mobile card layout, banner state/toggle)
- app/hub/WedgeSummaryCard.tsx — Wedge text rendering (clipPath, auto-scale, per-wedge positioning)
- app/hub/WelcomeBanner.tsx — Welcome banner (3 info cards, intervals.icu TSB, component alerts)
- app/lib/training-load.ts — TSS/CTL/ATL/TSB (TR rolling-avg method + FTP history)
- app/lib/word-of-the-day.ts — German WotD selection, formatting, article colors (#191970 masculine, #D94A6B feminine, #CC8844 neuter)
- app/research/page.tsx — Research page (Search, Library drill-down, Sources, Tag Review with hierarchy picker)
- app/components/AskJarvis.tsx — Reusable RAG search component
- app/components/FloatingAskButton.tsx — Mobile floating Ask button
- app/components/CommandPalette.tsx — Command palette (Cmd+K, RAG + MCP)
- app/components/NutritionBackIcon.tsx — Fork plate icon for nutrition sub-pages
- app/api/rag/query/route.ts — RAG query via LightRAG REST API
- app/api/readwise/sync/route.ts — Readwise sync (metadata → SQLite, content → LightRAG, hierarchical auto-classify)
- app/api/intervals/wellness/route.ts — intervals.icu CTL/ATL/TSB
- app/api/db/research/ — Research documents, sources, tags, hierarchy CRUD
- app/api/db/strava/ride-notes/ — Ride notes CRUD, options CRUD, LightRAG indexing
- app/api/backup/route.ts — Backup (SQLite + N8N workflows → local + R2)
- app/lib/mcp-tools.ts — MCP tools (11 tools including query_knowledge)
- app/lib/db.ts — SQLite schema and CRUD (ride_notes, ride_note_options, tag_hierarchy, research_documents, research_tags, research_sources + all other tables)
- app/lib/api-client.ts — Client-side API wrappers
- app/bike/strava/page.tsx — Strava dashboard (intervals.icu fitness, FTP history, ride detail with notes)
- app/bike/strava/RideNotesPanel.tsx — Ride notes form component (5 collapsible sections, auto-save, copy)
- app/bike/strava/types.ts — Strava + ride notes TypeScript types
- app/bike/components/page.tsx — Component list with mileage progress bars and alerts
- app/nutrition/page.tsx — Nutrition page (3 input rows: search, barcode, manual add; manual entry form with NutritionBackIcon)
- app/settings/cycling/page.tsx — Cycling settings (Strava, zones, goals, ride note options)
- docker-compose.yml — JARVIS + N8N + LightRAG + cloudflared + Watchtower
- ~/podcast-pipeline/transcribe.sh — Podcast transcription pipeline (Mac Mini, running continuously)
- lightrag.env — LightRAG config with OpenRouter keys (Mac Mini, .gitignored)
- docs/DECISIONS.md — Technical decision log
- docs/FUTURE_FEATURES.md — Planned features backlog
- docs/RESTORE.md — Disaster recovery guide (GitHub Issue #1 pinned)

Important rules
- Never commit or push without explicit permission — always ask first
- When .env.local changes, remind user to update Apple Passwords backup
- User prefers step-by-step guidance, one step at a time — not assumptions or big dumps
- When giving multi-step instructions, sequence ALL steps correctly before presenting — never add prerequisites after giving steps
- Read user messages carefully — do not re-ask questions already answered
- Verify claims in code before stating them as fact — don't guess
- Do not present guesses as fact — if you don't know the source for a claim, say so
- Higgins discussion stays in a separate chat — only discuss JARVIS integration here
- User is 51, cyclist, FTP 275 (as of 2026-03-18), uses TrainerRoad for training
