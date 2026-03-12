# Cursor Prompt: Strava Rides Tab Redesign

## Context
I'm building a Next.js cycling dashboard at `app/bike/strava/page.tsx` with a HUD/sci-fi theme (primary=#00D9FF, secondary=#67C7EB, dark background). It integrates with the Strava API and caches activities in localStorage. Types are in `app/bike/strava/types.ts`.

The Rides tab currently shows ALL rides in a flat list. I want to redesign it with the following features:

## Requirements

### 1. Default View: Last 7 Days
- Show only rides from the last 7 days by default
- Progressive "Show More" expansion:
  - First click: add 21 days (28 days total)
  - Subsequent clicks: add 30 days each

### 2. Ride Comparison by Route/Workout
- **Structured workouts** (e.g., TrainerRoad): Match by activity name — TrainerRoad supplies consistent workout names. These can be done indoors OR outdoors, so do NOT rely on the `trainer` boolean alone.
- **Free rides / outdoor routes**: Match by map data (summary_polyline or latlng streams from Strava) to find repeated routes.
- Add a **"Compare" button** on each expanded ride card

### 3. Comparison View - Metric Cards
- Side-by-side cards showing: date, distance, time, avg speed, avg power, normalized power (weighted_average_watts), avg HR, elevation, calories, cadence
- **Show deltas vs previous instance** — e.g., "Avg Power: 245w (+12w)"

### 4. Comparison View - Overlay Charts
- **Outdoor routes** (has summary_polyline): Power, HR, Cadence, Speed overlay charts (NOT elevation — same route)
- **Indoor workouts** (no summary_polyline / trainer=true): Power, HR, Cadence overlay charts (NOT speed or elevation — not apples-to-apples)
- **Chart style**: Selected ride in full color, up to ~3 most recent past instances in progressively dimmer colors
- Charts use stream data from Strava API (watts, heartrate, cadence, velocity_smooth)

## Technical Notes
- This is a single-file client component ("use client") — all components are in page.tsx
- Charts are hand-rolled inline SVG (no charting library)
- Stream data can be fetched from `/api/strava/activities/{id}/streams?keys=watts,heartrate,cadence,velocity_smooth,latlng`
- The `summary_polyline` field is available on each StravaActivity (may need to be added to the type)
- Strava API also provides `map.summary_polyline` on activity detail responses
