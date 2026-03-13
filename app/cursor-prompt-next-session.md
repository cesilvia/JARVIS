# Cursor Prompt: JARVIS Dashboard — Next Session

## Context
I'm building a Next.js personal dashboard ("JARVIS") at `app/` with a HUD/sci-fi theme (primary=#00D9FF, secondary=#67C7EB, dark background). The main feature so far is a Strava cycling dashboard at `app/bike/strava/page.tsx`. Types are in `app/bike/strava/types.ts`. Charts are hand-rolled inline SVG (no charting library). The hub page is at `app/hub/page.tsx` with wedge-based navigation.

## What Was Just Implemented (2026-03-13)

### 1. Hub Wedge Strava Summary
- Strava wedge now shows summary stats: Week miles, YTD miles, Elevation, TSB status
- `WedgeSummaryCard` redesigned: removed text wrapping, added `noBullets` prop for left-label / right-value alignment
- TSB line formatted as "TSB: -1 (Fresh)" with status right-justified
- Hub page imports Strava types and computes CTL/ATL/TSB from cached activities + zones

### 2. Power Curve Auto-Build (Fixed)
- Power curve was stuck at ~20/465 rides due to: stale React closure (`handleBuildCurve` depended on `powerCurve` state), no timeout on `getAccessToken()` token refresh, browser connection pool exhaustion from un-aborted fetches
- Fix: two-phase build — Phase 1 processes all cached streams instantly, Phase 2 fetches uncached from API with `AbortSignal.timeout(10000)` and 3s pacing
- Reads existing curve from localStorage (not state) to avoid closure issues
- Server-side Strava fetches also have 12s AbortController timeout (`app/api/strava/streams/route.ts`, `app/api/strava/refresh/route.ts`)
- Circuit breaker: stops after 5 consecutive API failures, saves progress
- Auto-builds on first visit if no curve exists; auto-updates daily if new rides detected

### 3. Fitness Chart Redesign
- TSB zone background shading: Green (+20 to -10), Amber (-10 to -30), Red (below -30)
- TSB line white for contrast, dashed trendlines for CTL/ATL/TSB
- Legend moved below chart, Y-axis labels at regular intervals

### 4. Previous Session Features (still in place)
- Ride cards: 3-column grid layout with workout name, route name, metrics
- Route names from activity descriptions (post-Feb 25) or parsed from activity name
- Compare Workout/Route buttons with overlay charts and zone comparisons
- Power & HR Zone period cards (Week/Month/Year toggle)

## Technical Notes
- Single-file client component ("use client") — all components in page.tsx (~1700 lines)
- Stream data: `/api/strava/streams` endpoint, cached in localStorage per activity
- Activity detail: `/api/strava/activity-detail/?id=<activity_id>` endpoint
- Token refresh: `/api/strava/refresh` with 10s timeout on Strava OAuth call
- Key localStorage keys: `STRAVA_POWER_CURVE_KEY`, `STRAVA_POWER_CURVE_RIDES_KEY`, `STRAVA_POWER_CURVE_UPDATED_KEY`, `STRAVA_DESCRIPTIONS_KEY`
- Key state: `powerCurve`, `buildingCurve`, `curveProgress`, `compareRide`, `compareMode`, `fitnessRange`

## Planned Features — Infrastructure (Priority)
### Docker + Mac Mini Deployment
- Dockerize JARVIS (Next.js) with multi-stage Dockerfile
- Docker Compose orchestrating: JARVIS, N8N, MCP server
- Deploy to always-on Mac Mini (already has Tailscale + Screens 5)
- Develop on laptop, deploy via git + Docker

### N8N Workflows
- Strava power curve build (overnight, no browser needed — currently 22 min client-side)
- Strava activity sync & token refresh
- Alerts pipeline with push notifications
- Nutrition data backups
- Weather scheduled fetches

### MCP Server
- Expose JARVIS data as MCP tools for Claude/AI assistants
- Query ride data, fitness metrics, power zones
- Read/write journal entries, check/dismiss alerts
- Trigger N8N workflows from Claude

## Planned Features — App
### New Hub Pages
- **German page** — language learning/practice
- **Journal page** — personal journal
- **Research page** — research tool/dashboard

### Strava Enhancements
- Improve polyline route matching (edit distance or decoded lat/lng proximity)
- Manual ride comparison selection (currently auto-matches)
- Persist comparison view state across tab switches
- Zwift route name lookup via polyline matching against reference database
- Power curve build speed: could parallelize or batch API calls
- Component extraction from page.tsx (~1700 lines)
