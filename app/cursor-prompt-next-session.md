# Cursor Prompt: Strava Dashboard — Next Session

## Context
I'm building a Next.js cycling dashboard at `app/bike/strava/page.tsx` with a HUD/sci-fi theme (primary=#00D9FF, secondary=#67C7EB, dark background). It integrates with the Strava API and caches activities in localStorage. Types are in `app/bike/strava/types.ts`.

## What Was Just Implemented (2026-03-13)

### 1. Ride Card Columnar Redesign
- Ride cards are now a 3-column grid layout:
  - **Column 1**: Workout name, route name, date (with Indoor badge if applicable)
  - **Column 2**: Miles, Time (in hours, e.g. "2.25 hrs"), Mph, Elevation — labels left-justified, numbers right-justified
  - **Column 3**: Average Watts, Normalized Power, Cadence, Average Heart Rate — same label/number format
- Missing data shows "--"

### 2. Route Name from Descriptions
- Added `/api/strava/activity-detail/` endpoint to fetch individual activity `description` fields
- For rides after Feb 25 2026: route name is parsed from the description (Zwift includes it there)
- For rides before Feb 25 2026: route name is parsed from the activity name after " on " (e.g., "Horoshiridake on Peak Performance" → route = "Peak Performance")
- Descriptions are cached in localStorage under `jarvis-strava-descriptions` key
- Descriptions fetched lazily only for displayed rides without cached descriptions

### 3. Compare Buttons
- **Compare Workout**: only shown when other rides share the same workout name
- **Compare Route**: only shown when polyline similarity match (>60%) exists among ALL rides (not just displayed)
- Comparison view now renders directly below the ride card, before the expanded graphs panel (was previously below the graphs)

### 4. Close Button
- Added close button (X) to the expanded ride detail panel header

### 5. Power & HR Zone Period Cards
- Power Zones card on Power tab: Week/Month/Year toggle, fetches stream data independently
- HR Zones card on Fitness tab: same Week/Month/Year toggle
- Zone labels include ranges: e.g., "Z1 Active Recovery (0-137w)" or "Z1 (0-120 bpm)"
- Both auto-fetch all activities in selected period and aggregate zone time

## Technical Notes
- Single-file client component ("use client") — all components are in page.tsx (~1500 lines)
- Charts are hand-rolled inline SVG (no charting library)
- Stream data fetched from `/api/strava/streams` endpoint
- Activity detail fetched from `/api/strava/activity-detail/?id=<activity_id>` endpoint
- `StravaActivity` type includes `description?: string` and `map?: { summary_polyline?: string }`
- Key state: `compareRide`, `compareMode` ("workout" | "route"), `compareStreams`, `similarRides`, `rideDescriptions`
- `formatHours()` in types.ts formats seconds as "X.XX hrs"
- `STRAVA_DESCRIPTIONS_KEY` in types.ts for localStorage caching

## Known Issues / Potential Improvements
- Power curve on Power tab may be stuck/not building — needs debugging
- Polyline route matching is prefix-based; could use edit distance or decoded lat/lng proximity
- No way to manually select specific rides to compare — currently auto-matches
- Comparison view state is lost on tab switch
- Zwift route name lookup could be improved via polyline matching against a reference database instead of description parsing
- The page.tsx file is large (~1500 lines) — may want to extract components at some point
