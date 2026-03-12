# Cursor Prompt: Strava Dashboard — Next Session

## Context
I'm building a Next.js cycling dashboard at `app/bike/strava/page.tsx` with a HUD/sci-fi theme (primary=#00D9FF, secondary=#67C7EB, dark background). It integrates with the Strava API and caches activities in localStorage. Types are in `app/bike/strava/types.ts`.

## What Was Just Implemented
The rides tab was redesigned with these features (all in `app/bike/strava/page.tsx`):

### 1. Default View: Last 7 Days
- Shows only rides from the last 7 days by default (state: `rideDaysShown`)
- Progressive "Show More": first click → 28 days, subsequent → +30 days
- "Reset to 7 days" button when expanded

### 2. Ride Comparison
- **Compare button** appears on expanded ride cards when similar rides exist
- **Structured workouts** (TrainerRoad): matched by exact activity name (NOT `trainer` boolean — TR workouts can be outdoor)
- **Free rides / routes**: matched by `summary_polyline` prefix similarity (>60% match)
- Matching logic is in `similarRides` useMemo and `handleCompare` callback

### 3. Comparison View
- **Metric table**: side-by-side with deltas (green/red, tenths for distance/speed)
- **Overlay charts**: Power, HR, Cadence (+ Speed for outdoor routes). Selected ride full color, past instances in dimmer #00D9FF shades. Component: `OverlayChart`
- **Grouped zone bars**: Per-zone clusters comparing time-in-zone across rides. Component: `ZoneCompareGrouped`

### 4. Sync Reliability Fix
- `syncActivities()` won't overwrite localStorage with empty API results
- Auto-sync shows "Sync failed — showing cached rides" on error and falls back to localStorage

## Technical Notes
- Single-file client component ("use client") — all components are in page.tsx
- Charts are hand-rolled inline SVG (no charting library)
- Stream data fetched from `/api/strava/streams` endpoint
- `StravaActivity` type includes `map?: { summary_polyline?: string }` (added to both types.ts and API route)
- Comparison state: `compareRide`, `compareStreams`, `loadingCompareStreams`, `similarRides`

## Known Limitations / Potential Improvements
- Polyline route matching is prefix-based; could use edit distance or decoded lat/lng proximity for better accuracy
- No way to manually select specific rides to compare — currently auto-matches
- Comparison view state is lost on tab switch
- The page.tsx file is large (~1200 lines) — may want to extract components at some point
