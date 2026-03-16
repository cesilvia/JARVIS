# Future Features Log - J.A.R.V.I.S. Nutrition Tracker

## Planned Features

### P0 Priority

1. **Module Summary Content**
   - Define what each module's wedge summary displays when an icon is clicked
   - User to specify content per module: top row (Calendar, Nutrition, Bike, Strava, Tasks, Weather, Notes, Health) and bottom row (Settings, Profile, Status, Alerts)
   - **Status:** Wedge UI implemented for all icons (wedge shape, overlay, click behavior). Content definitions pending.

### High Priority

1. **Convex Backend Integration**
   - Migrate from localStorage to Convex for data persistence
   - Enable cross-device sync
   - Better data management and backup
   - **Status:** Mentioned in PRD, deferred for MVP

2. **Camera-based Barcode Scanning**
   - Use device camera to scan barcodes directly
   - Better UX than manual entry
   - **Status:** Not started

3. **Recipe Search with Macro Filtering**
   - Search recipes by macro requirements (e.g., "recipes with <30g carbs")
   - Filter by calories, protein, etc.
   - **Status:** Mentioned in original requirements, not yet implemented

4. **Meal Planning Features**
   - Plan meals for the day/week
   - Track daily macro totals
   - **Status:** Not started

5. **Saved Ingredients Management**
   - Edit/delete saved ingredients
   - View all saved ingredients
   - **Status:** Ingredients save automatically but no management UI yet
   - **Note:** Recipe ingredient editing is now implemented - can edit nutrition values for ingredients in recipes

### Medium Priority

6. **Recipe Categories/Tags**
   - Organize recipes by category (breakfast, lunch, dinner, snacks)
   - Tag recipes for easy filtering
   - **Status:** Not started

7. **Nutrition History/Tracking**
   - Track daily nutrition intake
   - View weekly/monthly summaries
   - **Status:** Not started

8. **Export/Import Data**
   - Export recipes and ingredients to JSON/CSV
   - Import from other apps
   - **Status:** ✅ Completed - JSON export/import in Settings page (Backup section, id=nutrition). Alerts page shows weekly backup reminder when last backup &gt; 7 days. Nutrition page no longer has export/import buttons.

9. **Recipe Scaling**
   - Scale recipes up/down (e.g., double recipe, half recipe)
   - Automatically recalculate macros
   - **Status:** Not started

10. **Better Recipe Import**
    - Support more recipe sites
    - Better ingredient parsing
    - Handle complex recipes better
    - **Status:** Parser rewritten following expert scraping rules (JSON-LD → Microdata → Headings → Classes priority). Currently debugging to ensure all ingredients are correctly extracted, including grouped subsections like "Dressing".

### Low Priority / Nice to Have

11. **Nutrition Goals**
    - Set daily macro/calorie goals
    - Track progress toward goals
    - **Status:** Not started

12. **Shopping List Generation**
    - Generate shopping lists from recipes
    - Integrate with AnyList (from PRD)
    - **Status:** Not started

13. **Meal Prep Planning**
    - Plan meal prep sessions
    - Calculate total ingredients needed
    - **Status:** Not started

14. **Nutrition Insights**
    - Analyze nutrition patterns
    - Suggest improvements
    - **Status:** Not started

15. **Social Features**
    - Share recipes
    - Import recipes from friends
    - **Status:** Not started

## Hub Page Features

16. **Command Center Data Integration**
    - Replace mock data with real calendar/appointment data
    - Integrate task management system
    - Add weather API integration
    - **Status:** Mock data implemented, real data integration pending
    - **Note:** Calendar, Tasks, Weather, Notes, Health modules added to hub with placeholder pages. Craft integration planned for Notes.

17. **Module Dashboard Views**
    - Create detailed dashboard views for each module when selected
    - Show relevant stats and quick actions
    - **Status:** Basic dashboard implemented for Nutrition module, others pending

18. **Bottom Frame Functionality**
    - Implement Settings panel
    - User Profile management
    - System Status monitoring
    - Notifications/alerts system
    - **Status:** Settings, Profile, Status, Alerts all link to dedicated pages. Alerts icon turns electric orange when backup is overdue or helmets are due for replacement (computed live from localStorage, no manual flag needed). Alerts page shows backup reminder and helmet replacement reminders. Hub wedge shows alert summary text. Status page is placeholder.

19. **Custom Module Frames**
    - Design unique frame images for each module
    - Replace placeholder frames with custom designs
    - **Status:** Using jarvis-frame.png (cyan circular HUD with circuitry) for center frame and favicon. Custom per-module frames pending

## New Module Integrations (Hub)

20. **Craft Notes Integration**
    - Connect Notes module to Craft account
    - Sync notes, documents, spaces via Craft API
    - **Status:** Placeholder page at /notes, integration pending

21. **Calendar Integration**
    - Connect Calendar module to user's calendar
    - View events and schedule
    - **Status:** Placeholder page at /calendar, integration pending

22. **Task Manager Functionality**
    - Full task/to-do management in Tasks module
    - **Status:** Placeholder page at /tasks, functionality pending

23. **Health Data Integration**
    - Health metrics, activity, wellness data
    - **Status:** Placeholder page at /health, integration pending

24. **Weather API Integration**
    - Real weather data for Weather module
    - **Status:** Placeholder page at /weather, API integration pending

25. **Bike Gear Module Content**
    - Component list, gear inventory, service log, tire pressure, sizing/fit, ride checklist, packing checklist
    - **Status:** Component list implemented (bikes with components, inline component editing, notes/attachments collapsible, Strava gear read from shared localStorage). Gear inventory implemented (helmets with 3–5 year replacement reminders, jerseys with sleeve/color/weather fields, bibs, shoes; purchase date, photos, search/filter). Strava has its own page at `/bike/strava` (connect, sync mileage, disconnect, linked-bike display, gear list). Tire pressure calculator implemented at `/bike/tire-pressure` (weight-based PSI calc with defaults system, tire settings, front/rear split, tire limits table). Service log, sizing/fit, ride checklist, packing checklist sections pending.

## Future Enhancements (from recent work)

- **Recipe Builder (completed):** Added units (bunch, can, clove, clove(s)); optional amount (blank = 1); mixed-fraction display (e.g. 2 1/2 instead of 5/2) in list and edit form; parseFraction supports mixed input.
- **Automatic weekly backup:** Option to auto-export nutrition backup weekly (e.g. trigger download or save to cloud) instead of only reminding in Alerts.
- **Nutrition page:** Recipe cards only when searching; Compare Recipes shows last 2 viewed for macro comparison; settings icon links to Settings#nutrition.
- **Bike Gear module content:** Section icons and labels in place (Component list, Gear inventory, Service log, Tire pressure, Sizing & fit, Ride checklist, Packing checklist). Component list, Gear inventory, Strava, and Tire pressure implemented. Remaining sections (Service log, Sizing & fit, Ride checklist, Packing checklist) need content/functionality.
- **Tire pressure enhancements:** Auto-select tire from saved tires list; show warning when calculated PSI exceeds tire min/max limits; historical log of pressures per ride.
- **Gear inventory enhancements:** Bibs-specific fields (pad type, length); shoes-specific fields (cleat type, wear indicator); photo gallery view for gear items.
- **Alert wedge summaries for other modules:** Currently only Alerts wedge shows summary text. Add summaries to other module wedges (e.g. Nutrition: recipe count; Bike: last sync date; Calendar: next event).
- **Strava dashboard enhancements:** ✅ Ride detail charts, power curve, zones, and training load implemented. Remaining: segment leaderboard data; ride heatmap/map visualization; Strava route integration; power duration curve time-range filtering (30d/90d/all).
- **Strava gear sync to inventory:** Automatically pull gear (bikes, shoes) from Strava into gear inventory; link Strava gear IDs to inventory items for mileage tracking.
- **Component list enhancements:** Bulk component operations; component wear tracking (miles since install from Strava data); service-due alerts when mileage exceeds service interval.

## Authentication & Security

- **Password + biometric auth:** ✅ Completed — Next.js middleware gates all routes. Password login with bcrypt hash. WebAuthn biometric login (Touch ID / Face ID). First-time setup flow creates password. Settings page for biometric registration and logout.
- **Persistent database for auth:** WebAuthn credentials now stored on Mac Mini via Docker volume (SQLite). No Vercel dependency.
- **Password reset:** Allow changing password from Settings (requires current password).
- **Session management:** View active sessions; ability to revoke all sessions.

## Technical Improvements

- **Error Handling:** Better error messages and recovery
- **Performance:** Optimize recipe calculations for large recipes
- **Accessibility:** Improve keyboard navigation and screen reader support
- **Mobile Optimization:** Better mobile experience (JARVIS 4.0 layout adapts to mobile)
- **Offline Support:** Work offline with service workers
- **Testing:** Add unit and integration tests

## From Original PRD (v1.1 Roadmap)

- Voice commands/notifications
- AnyList deep sync
- Advanced fitness features (Strava integration, Maps route suggestions)
  - **Strava setup & API reference:** See [app/docs/STRAVA_INTEGRATION.md](app/docs/STRAVA_INTEGRATION.md)
  - **Status:** ✅ Strava dashboard implemented at `/bike/strava` with YTD stats, weekly/monthly comparison, per-bike mileage, mileage-over-time SVG chart, and recent rides list. Connection management moved to Settings page. Activities cached in localStorage.
- Document smarts (Craft doc summarization)
- Weekly review insights
