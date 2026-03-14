# Cursor Prompt: JARVIS Dashboard — Next Session

## Context
I'm building a Next.js personal dashboard ("JARVIS") at `app/` with a HUD/sci-fi theme (primary=#00D9FF, secondary=#67C7EB, dark background). The main feature so far is a Strava cycling dashboard at `app/bike/strava/page.tsx`. Types are in `app/bike/strava/types.ts`. Charts are hand-rolled inline SVG (no charting library). The hub page is at `app/hub/page.tsx` with wedge-based navigation.

## What Was Just Implemented (2026-03-14)

### 1. Tire Pressure Calculator Fix
- Original formula used linear `PSI = (wheelLoad × k) / width` with k values ~3× too low (7.0-7.8), producing results clamped to minimum PSI floors
- Replaced with non-linear power-law model: `PSI = k × wheelLoad^0.2 / width^0.625`
- New k values: Clincher=290, Tubeless=264, Tubular=277 — calibrated against SILCA tire pressure data
- Sub-linear load exponent (0.2) prevents rear tire from being disproportionately high vs front
- For 200 lbs, 32mm tubeless, smooth pavement: ~60F/65R PSI (matches SILCA)
- Widened number inputs (w-20 → w-24), hid browser number spinners for easier data entry
- File: `app/bike/tire-pressure/page.tsx`

### 2. Hub Wedge Strava Summary (2026-03-13)
- Strava wedge shows summary stats: Week miles, YTD miles, Elevation, TSB status
- `WedgeSummaryCard` redesigned: removed text wrapping, added `noBullets` prop for left-label / right-value alignment
- TSB formatted as "TSB: -1 (Fresh)" with status right-justified
- Hub page imports Strava types and computes CTL/ATL/TSB from cached activities + zones

### 3. Previous Session Features (still in place)
- Power curve auto-build (two-phase: cached then API, circuit breaker, daily auto-update)
- Fitness chart with TSB zone shading, dashed trendlines, white TSB line
- Ride cards: 3-column grid, route names from descriptions, compare buttons
- Power & HR Zone period cards (Week/Month/Year toggle)

## Technical Notes
- Strava dashboard: single-file client component ("use client") — ~1700 lines in page.tsx
- Stream data: `/api/strava/streams`, cached in localStorage per activity
- Activity detail: `/api/strava/activity-detail/?id=<activity_id>`
- Token refresh: `/api/strava/refresh` with 10s timeout
- Tire pressure: non-linear model with surface/condition multipliers, clamped to safe min/max per width
- Hexis.live has no public API — potential data via Apple Health or Intervals.icu API

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

### Nutrition Integration
- Hexis.live has no public API — could pull data via Apple Health sync or Intervals.icu API

### Strava Enhancements
- Improve polyline route matching (edit distance or decoded lat/lng proximity)
- Manual ride comparison selection (currently auto-matches)
- Persist comparison view state across tab switches
- Zwift route name lookup via polyline matching against reference database
- Power curve build speed: could parallelize or batch API calls
- Component extraction from page.tsx (~1700 lines)
