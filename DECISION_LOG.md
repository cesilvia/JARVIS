# Decision Log - J.A.R.V.I.S. Nutrition Tracker

## 2026-01-29

### Tech Stack Decisions

**Decision:** Use Next.js with React and TypeScript for web app
- **Rationale:** User wanted to start with a website first, then build native apps later. Next.js provides good structure and is easy to deploy to Vercel.
- **Alternatives Considered:** SwiftUI (for native), Convex built-in tools (simpler but less flexible)
- **Status:** Implemented

**Decision:** Use USDA FoodData Central API and Open Food Facts API (both free)
- **Rationale:** Free options with good coverage. USDA for ingredient search, Open Food Facts for barcode scanning.
- **Alternatives Considered:** Paid APIs like Spoonacular (more features but costs money)
- **Status:** Implemented with API key setup

**Decision:** Use localStorage for data persistence (recipes and saved ingredients)
- **Rationale:** Simple, works client-side, no backend setup needed initially. Can migrate to Convex later if needed.
- **Alternatives Considered:** Convex backend (mentioned in PRD but deferred)
- **Status:** Implemented

### Feature Decisions

**Decision:** Start with nutrition tracking feature instead of full PRD scope
- **Rationale:** User wanted to focus on nutrition/macro tracking first. More manageable scope.
- **Status:** Implemented

**Decision:** Manual entry saves ingredients automatically for future search
- **Rationale:** Makes it easy to reuse custom products. Improves workflow efficiency.
- **Status:** Implemented

**Decision:** Recipes section integrated into main page
- **Rationale:** User wanted recipes visible alongside nutrition search. Better UX than separate page only.
- **Status:** Implemented

**Decision:** Recipe import from websites using schema.org parsing
- **Rationale:** User wanted to import recipes easily. Schema.org is standard format most recipe sites use.
- **Status:** Implemented

### UI/UX Decisions

**Decision:** Custom amount input at top, updates main macro table
- **Rationale:** User preference for workflow. Makes it easy to calculate macros for any amount.
- **Status:** Implemented

**Decision:** Unified layout for "Find Nutrition Information" and "Recipes" boxes
- **Rationale:** Consistent UI, cleaner design. User requested matching layouts.
- **Status:** Implemented

**Decision:** Recipe Builder button moved into Recipes box header
- **Rationale:** Reduces redundancy, keeps related actions together.
- **Status:** Implemented

**Decision:** Search box always visible in Recipes section
- **Rationale:** User requested. Makes search accessible even when no recipes exist yet.
- **Status:** Implemented

**Decision:** Fraction-based amount input with quick buttons in Recipe Builder
- **Rationale:** User requested fraction buttons (1/8, 1/4, etc.) and ability to add multiple amounts together. More intuitive for cooking measurements.
- **Implementation:** Amounts can be added together, displayed in fraction form when appropriate, with quick buttons for common fractions and units.
- **Status:** Implemented

**Decision:** Navigation component for consistent "Return to Main Menu" button
- **Rationale:** User requested return to main menu button on all screens. Centralized component ensures consistency.
- **Status:** Implemented

**Decision:** Export/Import backup functionality for recipes and saved ingredients
- **Rationale:** User requested ability to backup data. Provides data portability and safety.
- **Implementation:** JSON export/import on main page (both recipes and ingredients) and recipe builder page (recipes only).
- **Status:** Implemented

**Decision:** Fix recipe persistence race condition
- **Rationale:** Critical bug where recipes were being erased on page load. Used `isInitialLoad` flag to prevent save effect from running before data is loaded.
- **Status:** Fixed

**Decision:** Rewrite recipe import parser following expert scraping rules
- **Rationale:** Original parser was incorrectly extracting navigation items and preparation instructions instead of ingredients. User provided expert rules for recipe scraping with priority order: JSON-LD → Microdata → Headings → Classes.
- **Implementation:** Complete rewrite of `/app/api/recipes/import/route.ts` following structured parsing approach with proper ingredient detection heuristics, navigation filtering, and support for grouped ingredients (e.g., "Dressing" subsections).
- **Status:** Implemented (currently debugging - parser may need further refinement)
