# Next Session Prompt for Cursor

Copy and paste this into Cursor at the start of your next chat session:

---

I'm working on J.A.R.V.I.S., a personal nutrition and macro tracking web application. Here's the current state:

## Project Context

- **Location:** `/Users/chrissilvia/Projects/JARVIS/app`
- **Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS
- **Current Status:** MVP nutrition tracker is functional with recipe management and backup features

## What's Been Built

1. **Nutrition Tracker Page** (`/app/page.tsx`)
   - Search ingredients by name (USDA API with autocomplete)
   - Search by barcode/UPC (Open Food Facts API)
   - Manual ingredient entry (saves automatically for future search)
   - Macro calculator (per serving, per gram, per 100g, custom amounts)
   - Saved ingredients appear in autocomplete dropdown
   - Recipes section showing saved recipes (click to view macros)
   - Export/Import backup functionality (recipes + saved ingredients)

2. **Recipe Builder Page** (`/app/recipes/page.tsx`)
   - Create custom recipes with ingredients
   - Import recipes from websites (schema.org parsing)
   - Calculate recipe macros (total, per serving, per 100g)
   - Search and filter recipes
   - Edit/delete recipes
   - **Edit ingredient nutrition values** - Click "Edit" on any ingredient to modify calories, carbs, protein, and fat
   - Fraction-based amount input with quick buttons (1/8, 1/4, etc.)
   - Amounts can be added together, displayed in fraction form
   - Quick unit buttons (g, oz, cup, tbsp, tsp, ml)
   - Reordered inputs: amount -> unit -> ingredient
   - Per serving macros shown first, then totals, then per 100g
   - Export/Import recipes (JSON)
   - Recipes saved to localStorage with persistence fix

3. **Navigation Component** (`/app/components/Navigation.tsx`)
   - "Return to Main Menu" button on all pages (except home)
   - Consistent navigation across the app

4. **API Integrations**
   - USDA FoodData Central API (ingredient search) - API key configured
   - Open Food Facts API (barcode lookup)
   - Recipe import API (`/app/api/recipes/import/route.ts`)

## Key Files

- `app/page.tsx` - Main nutrition tracker page
- `app/recipes/page.tsx` - Recipe builder page
- `app/components/Navigation.tsx` - Navigation component
- `app/api/usda/search/route.ts` - USDA search API
- `app/api/usda/autocomplete/route.ts` - Autocomplete API
- `app/api/openfoodfacts/barcode/route.ts` - Barcode lookup API
- `app/api/recipes/import/route.ts` - Recipe import API
- `.env.local` - Contains USDA_API_KEY (not committed)

## Data Storage

- Recipes: localStorage key `jarvis-recipes`
- Saved Ingredients: localStorage key `jarvis-saved-ingredients`
- Both support JSON export/import for backup

## Recent Fixes

- **Recipe Persistence Bug:** Fixed race condition where recipes were being erased on page load. Used `isInitialLoad` flag to prevent save effect from running before data is loaded.

## Development

- Dev server: `npm run dev` (runs on http://localhost:3000)
- API key: Stored in `.env.local` (USDA_API_KEY)
- **Note:** Git requires Xcode license agreement - user needs to run `sudo xcodebuild -license` if committing

## Important Notes

- User is technical but not a programmer - explain decisions clearly
- Ask questions one at a time
- Provide suggestions when needed
- User prefers to learn and understand decisions
- User requested backup functionality - implemented export/import for data safety

## Documentation

- `DECISION_LOG.md` - Records key decisions made (updated with recent changes)
- `FUTURE_FEATURES.md` - Planned features and improvements (export/import marked as completed)
- `JARVIS-v1-PRD.md` - Original product requirements document
- `NEXT_SESSION_PROMPT.md` - This file

## Recent Features Completed

- ✅ Fraction-based amount input with quick buttons
- ✅ Navigation component for consistent menu access
- ✅ Export/Import backup functionality (recipes and saved ingredients)
- ✅ Recipe persistence bug fix
- ✅ Per serving macros displayed first in recipe view
- ✅ Ingredient nutrition editing - Can edit calories, carbs, protein, and fat for imported ingredients
- ✅ Hub page with multiple theme options (JARVIS, F.R.I.D.A.Y., JARVIS 2.0, JARVIS 3.0, JARVIS 4.0)
- ✅ HUD-style visual effects (glowing borders, circuit patterns, corner decorations)
- ✅ JARVIS 4.0 command center layout (top module frames, left command panel, center dashboard, bottom utility frames)

## Hub Page Details

**Location:** `/app/hub/page.tsx`

**Themes Available:**
- **JARVIS:** Electric blue/cyan, classic HUD style with glowing effects
- **F.R.I.D.A.Y.:** Orange with electric blue/green highlights, modern/minimal style
- **JARVIS 2.0:** Gold/amber colors, classic HUD style
- **JARVIS 3.0:** Module frames across top (circular icons), dashboard in center when module selected
- **JARVIS 4.0:** Command center layout:
  - Top: Module frames (circular icons, 50px) - clicking shows dashboard in center
  - Left panel: Command center with appointments, tasks, weather (currently mock data)
  - Center: Large frame showing placeholder image when no module selected, module dashboard when selected
  - Bottom: Settings, Profile, System Status, Notifications frames (functionality pending)
  - Clicking selected module frame again closes dashboard

**Module Icons:** Currently using placeholder frame image (`/assets/Gemini_Generated_Image_574i41574i41574i-85020c02-51b2-4208-8468-3735b6a7f65e.png`) for all modules. User plans to create custom frames for each module.

**Styling:** HUD-style effects implemented in `/app/globals.css` with classes for glowing borders, circuit patterns, corner decorations, and animations.

## Current Issues / In Progress

- **Recipe Import Parser:** Recently rewrote the recipe import parser (`/app/api/recipes/import/route.ts`) following expert scraping rules with priority: JSON-LD → Microdata → Headings → Classes. The parser includes proper ingredient detection heuristics and navigation filtering. However, it's currently not extracting ingredients correctly - needs debugging to identify why ingredients aren't being found/imported. Added console logging for debugging.

## Important Context

- User reported that recipe import was importing navigation items ("Gut Health") and preparation instructions instead of ingredients
- Parser was rewritten to follow expert rules but currently not working - nothing is being imported
- Need to debug why ingredients aren't being extracted (check console logs, verify HTML structure matches expectations)
- User wants to eventually integrate real data sources for command center (calendar, tasks, weather)
- Custom module frame images need to be designed and implemented

Please help me continue building features and improving the app. Current focus areas:
1. Fixing the recipe import parser
2. Implementing functionality for bottom utility frames in JARVIS 4.0
3. Integrating real data sources for command center panel
4. Creating custom module frame designs
