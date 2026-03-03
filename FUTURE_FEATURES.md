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

## Technical Improvements

- **Error Handling:** Better error messages and recovery
- **Performance:** Optimize recipe calculations for large recipes
- **Accessibility:** Improve keyboard navigation and screen reader support
- **Mobile Optimization:** Better mobile experience
- **Offline Support:** Work offline with service workers
- **Testing:** Add unit and integration tests

## From Original PRD (v1.1 Roadmap)

- Voice commands/notifications
- AnyList deep sync
- Advanced fitness features (Strava integration, Maps route suggestions)
- Document smarts (Craft doc summarization)
- Weekly review insights
