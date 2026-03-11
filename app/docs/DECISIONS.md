# Decision Log

Architectural and design decisions made during JARVIS development.

---

## 2026-03-11: Reorganize Settings into category sub-pages

**Context**: The Settings page had grown into a single monolithic page with Strava, Training Zones, Security, Backup, and Extras all in one long scroll. It was hard to find things.

**Decision**: Split Settings into a category grid landing page with four sub-pages:
- `/settings/cycling` — Strava connection + Training Zones
- `/settings/nutrition` — Backup/import/export of recipes and ingredients
- `/settings/security` — Change password, biometrics (Touch ID/Face ID), logout
- `/settings/extras` — Parked experiments and features

Each sub-page has a back arrow to Settings and quick-nav icons in the top-right to jump to the related app page (e.g., bike wheel icon to `/bike`, Strava icon to `/bike/strava`).

**Trade-offs**: More files, but each page is focused and navigable. Strava OAuth callback updated to redirect to `/settings/cycling`.

---

## 2026-03-11: Escape `$` in bcrypt hashes written to `.env.local`

**Context**: Next.js uses dotenv to load `.env.local`, which interprets `$` as variable expansion. Bcrypt hashes contain `$` delimiters (e.g., `$2b$12$...`), causing the hash to be silently mangled when loaded. This made password login fail.

**Decision**: Escape `$` as `\$` when writing `AUTH_PASSWORD_HASH` to `.env.local`. Applied to:
- `/api/auth/setup` (initial password setup)
- `/api/auth/change-password` (password change)

The in-process `process.env.AUTH_PASSWORD_HASH` is set to the raw (unescaped) hash so it works immediately without a server restart.

---

## 2026-03-11: Add change password feature to Settings

**Context**: No way to change the password from within the app. Password could only be set during initial setup.

**Decision**: Added `/api/auth/change-password` API route and a change password form in the Security settings sub-page. Requires current password verification before allowing change.

---

## 2026-03-11: Replace overview cards with Strava goal tracking

**Context**: The Strava overview page had "This Week" and "This Month" comparison cards and a "Recent Rides" section. These didn't answer the key question: am I on track for my goals?

**Decision**: Replaced comparison cards and recent rides with goal tracking cards. Each card shows progress toward a specific goal (weekly miles, yearly miles, yearly climbing, yearly rides) with:
- Status badge showing Ahead/Behind/On Track with amount and percentage difference
- Progress bar with an expected-pace marker
- Expandable SVG line chart comparing actual vs goal pace over time

Goals are stored in localStorage and configurable in Settings > Cycling. The Strava API doesn't expose athlete goals, so defaults are hardcoded (100 mi/week, 5000 mi/year, 130k ft/year, 183 rides/year). Proportional time-based pacing is used — e.g., by March 11, you should have ~19.2% of your yearly goal.

**Trade-offs**: localStorage means goals don't sync across devices. A 2% threshold prevents the status badge from flickering between Ahead/On Track near the boundary.
