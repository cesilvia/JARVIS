# Future Features Log - J.A.R.V.I.S. Nutrition Tracker

## Planned Features

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
   - **Status:** ✅ Completed - JSON export/import implemented for recipes and saved ingredients

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

17. **Module Dashboard Views**
    - Create detailed dashboard views for each module when selected
    - Show relevant stats and quick actions
    - **Status:** Basic dashboard implemented for Nutrition module, others pending

18. **Bottom Frame Functionality**
    - Implement Settings panel
    - User Profile management
    - System Status monitoring
    - Notifications/alerts system
    - **Status:** Settings, Profile, Status, Alerts all link to dedicated pages. Alerts icon turns electric orange when `localStorage.jarvis-unread-alerts` is set. Alerts/Status pages are placeholders (coming soon). Real alert data integration pending.

19. **Custom Module Frames**
    - Design unique frame images for each module
    - Replace placeholder frames with custom designs
    - **Status:** Using jarvis-frame.png (cyan circular HUD with circuitry) for center frame. Custom per-module frames pending

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
- Document smarts (Craft doc summarization)
- Weekly review insights
