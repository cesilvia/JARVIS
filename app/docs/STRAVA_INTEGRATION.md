# Strava Integration

This document describes how Strava is integrated in JARVIS and how to set it up for current and future features.

## Current Use

- **Bike component list** – Syncs mileage (total, indoor, road) from Strava activities to bikes. Users link each bike to a Strava gear item.

## Setup

### 1. Create a Strava API app

1. Go to [Strava API Settings](https://www.strava.com/settings/api)
2. Click **Create an App** (or use an existing one)
3. Fill in:
   - **Application Name**: e.g. `JARVIS`
   - **Category**: e.g. `Lifestyle`
   - **Website**: `http://localhost:3000` (for local dev)
   - **Authorization Callback Domain**: `localhost` (no `http://` or port)
4. Save and note your **Client ID** and **Client Secret**

### 2. Environment variables

Add to `.env.local`:

```
STRAVA_CLIENT_ID=your_client_id
STRAVA_CLIENT_SECRET=your_client_secret
```

### 3. Restart the dev server

Restart after changing `.env.local`.

---

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/strava/auth` | GET | Initiates OAuth, redirects to Strava |
| `/api/strava/callback` | GET | Handles OAuth callback, exchanges code for tokens |
| `/api/strava/activities` | POST | Fetches athlete activities (body: `{ accessToken }`) |
| `/api/strava/gear` | POST | Fetches athlete bikes/gear (body: `{ accessToken }`) |
| `/api/strava/refresh` | POST | Refreshes access token (body: `{ refreshToken }`) |

---

## OAuth Scopes

Current scopes: `activity:read_all`, `profile:read_all`

- **activity:read_all** – Read all activities (including private)
- **profile:read_all** – Read profile and gear (bikes, shoes)

For future features, consider:
- `activity:write` – Create/edit activities
- `read` – Public segments, routes, etc.

---

## Strava API Reference

- [Strava API v3](https://developers.strava.com/docs/reference/)
- [Authentication](https://developers.strava.com/docs/authentication/)
- [Activities](https://developers.strava.com/docs/reference/#api-Activities)

### Key activity fields

- `distance` – meters (÷ 1609.34 for miles)
- `trainer` – `true` = indoor, `false` = outdoor/road
- `gear_id` – links activity to a bike (e.g. `b123456`)
- `type` / `sport_type` – e.g. `Ride`, `VirtualRide`, `MountainBikeRide`

### Token lifecycle

- Access tokens expire in ~6 hours
- Use refresh token to get new access token before expiry
- Tokens stored client-side in `localStorage` under `jarvis-strava-tokens`

---

## Future Features

Ideas for extending Strava integration:

- **Activity feed** – Show recent rides on hub or bike page
- **Route suggestions** – Use Strava routes/segments
- **Goals** – Weekly/monthly mileage targets
- **Workout upload** – Push planned workouts to Strava
- **Segment efforts** – Track PRs on favorite segments
