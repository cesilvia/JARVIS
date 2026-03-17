# Cursor Prompt: JARVIS Dashboard — Next Session

## Context
I'm building a Next.js personal dashboard ("JARVIS") at `app/` with a HUD/sci-fi theme (primary=#00D9FF, secondary=#67C7EB, dark background). Uses TypeScript, Tailwind, better-sqlite3 for persistence. All data migrated from localStorage to server-side SQLite. Charts are hand-rolled inline SVG (no charting library). The hub page is at `app/hub/page.tsx` with wedge-based navigation.

## Current state (as of 2026-03-16)
- **SQLite migration complete**: All ~30 localStorage keys migrated to server-side SQLite via better-sqlite3. Hybrid schema: KV table + 8 normalized tables (strava_activities, strava_streams, german_vocab, recipes, saved_ingredients, bikes, gear_inventory, tire_refs). 10 API routes under /api/db/*, async api-client.ts with generic type params.
- **Mac Mini hosting via Cloudflare Tunnel**: JARVIS served at `jarvis.chrissilvia.com` through Cloudflare Tunnel → Mac Mini Docker. Three containers: jarvis (port 3000 internal), n8n (port 5678 Tailscale-only), cloudflared. Vercel disconnected.
- **Auto-deploy**: `deploy.sh` + launchd polls GitHub every 2min. Push to main → auto-rebuilds Docker on Mac Mini. Logs at `~/Projects/JARVIS/deploy.log`.
- **Nightly automated backup**: N8N workflow triggers POST /api/backup at 2am daily. Sets `last-full-backup` KV key to clear hub alert.
- **Wedge text**: Word-wraps long bullet text with indented continuations. Recalculates origin on window resize.
- **Recipe import**: Expanded unit map (bunch/can/clove/pinch/dash), size descriptors (large/medium/small → "count"), "count" unit in builder.

## Key files
- `app/lib/db.ts` — SQLite singleton, all table schemas, CRUD functions, exportAll()
- `app/lib/api-client.ts` — Async fetch wrappers with generics
- `app/api/db/*` — 10 route files
- `app/api/backup/route.ts` — Full backup/restore (supports BACKUP_DIR env var)
- `app/api/recipes/import/route.ts` — Recipe URL import with ingredient parsing
- `proxy.ts` — Auth middleware (PUBLIC_PATHS includes /api/backup)
- `Dockerfile` — Multi-stage Next.js + better-sqlite3 build
- `docker-compose.yml` — JARVIS + N8N + cloudflared services
- `deploy.sh` + `com.jarvis.deploy.plist` — Auto-deploy via git polling
- `app/hub/page.tsx` — Main dashboard with wedge summaries
- `app/hub/WedgeSummaryCard.tsx` — Wedge overlay with text wrapping
- `app/bike/strava/page.tsx` — Strava cycling dashboard (~1700 lines)
- `app/bike/strava/types.ts` — Shared Strava/bike types and constants

## Deploy workflow
Just push to main. Auto-deploys to Mac Mini within 2 minutes.

## Important notes
- `.env.local` on Mini uses `$$` to escape `$` in bcrypt hashes (Docker Compose interpolation). Local dev uses `\$` (shell escaping)
- Separate `.env` file on Mini holds `CLOUDFLARE_TUNNEL_TOKEN`
- N8N is Tailscale-only (no public URL, no auth)
- Mac Mini repo is a proper git clone at `~/Projects/JARVIS/`

## Next priorities (pick one)
1. **[P1] Page verification checklist** — QA page in settings/dev area to track which pages verified post-migration. Store in SQLite KV. Manual checkboxes, re-flag when code changes touch a page.
2. **[P1] Journal page** — New hub page for personal journal entries. Store in SQLite.
3. **[P1] Research page** — New hub page for research tool/dashboard.
4. **N8N Strava sync workflow** — Automate Strava activity sync + token refresh via N8N (no browser needed).
5. **Strava enhancements** — Component extraction from page.tsx, polyline route matching, Zwift route lookup.

What would you like to work on?
