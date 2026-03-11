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

**Decision:** Add ingredient nutrition editing capability in Recipe Builder
- **Rationale:** User requested ability to edit calories (and other macros) for imported ingredients, since imported recipes often have incomplete or incorrect nutrition data.
- **Implementation:** Added inline editing functionality in Recipe Builder. Each ingredient shows an "Edit" button that opens input fields for calories, carbohydrates, protein, and fat. Changes update recipe totals automatically.
- **Status:** Implemented

**Decision:** Create modular hub page with multiple theme options
- **Rationale:** User wanted a main hub page to access different JARVIS modules (nutrition tracker, tasks, email, calendar, fitness, weather). Started with three view options: Simple Menu, Dashboard, and Hybrid.
- **Implementation:** Created `/app/hub/page.tsx` with module cards, stats overview, and navigation to different modules.
- **Status:** Implemented

**Decision:** Implement multiple theme options (JARVIS, F.R.I.D.A.Y., JARVIS 2.0, JARVIS 3.0, JARVIS 4.0)
- **Rationale:** User wanted different visual themes inspired by Iron Man interfaces. Each theme has distinct color schemes and styling approaches.
- **Implementation:** 
  - **JARVIS:** Electric blue/cyan, classic HUD style
  - **F.R.I.D.A.Y.:** Orange with electric blue/green highlights, modern/minimal style
  - **JARVIS 2.0:** Gold/amber colors, classic HUD style
  - **JARVIS 3.0:** Module frames across top, dashboard in center (circular icon navigation)
  - **JARVIS 4.0:** Command center layout with top module frames, left panel (appointments/tasks/weather), center dashboard, bottom utility frames
- **Status:** Implemented

**Decision:** Use HUD-style visual effects (glowing borders, circuit patterns, corner decorations)
- **Rationale:** User wanted futuristic HUD aesthetic matching Iron Man interfaces. Classic HUD themes get glow effects, circuit patterns, and geometric decorations.
- **Implementation:** Added CSS classes for HUD cards, glowing effects, circuit board backgrounds, corner brackets, and pulse animations. Modern/minimal themes use cleaner styling.
- **Status:** Implemented

**Decision:** JARVIS 4.0 command center layout design
- **Rationale:** User wanted a command center-style interface with module frames at top, information panels on left, large center frame, and utility frames at bottom. Inspired by HUD interface images.
- **Implementation:** 
  - Top: Circular module frames (50px) that show dashboard when clicked
  - Left panel: Command center with appointments, tasks, and weather (mock data for now)
  - Center: Large frame showing image placeholder when no module selected, module dashboard when selected
  - Bottom: Settings, Profile, System Status, and Notifications frames
  - Clicking selected module frame again closes dashboard
- **Status:** Implemented

## 2026-03-05

### Hub & Icon Decisions

**Decision:** Replace Iron Man profile icon with custom SVG (bald head + rectangular glasses)
- **Rationale:** User wanted a simpler, more personal profile icon. Same stroke style and theme color as other icons.
- **Implementation:** Oval head shape (round top, rounded chin), rectangular glasses as only facial detail. Backup saved in `JarvisProfileIcon.ironman.backup.tsx`.
- **Status:** Implemented

**Decision:** Simplify top row to three modules only (Nutrition, Bike, Strava)
- **Rationale:** User requested removal of triangle (tasks/food pyramid) and four frame icons (email, calendar, fitness, weather).
- **Status:** Implemented

**Decision:** Create status icon and status page
- **Rationale:** User wanted status icon matching other icons' style, linked to a dedicated page.
- **Implementation:** Gauge/dial icon (outer ring, arc, tick marks, needle). Status page at `/status` with Navigation.
- **Status:** Implemented

**Decision:** Create alerts page and alert icon
- **Rationale:** User wanted alerts/notifications with dedicated page and icon.
- **Implementation:** Triangle + exclamation icon (within circle). Alerts page at `/alerts`. Electric orange icon when `localStorage.jarvis-unread-alerts` is set.
- **Status:** Implemented

**Decision:** Connect recipes page to nutrition page
- **Rationale:** Recipes and nutrition are related; user wanted clear navigation between them.
- **Implementation:** Nutrition page already linked to `/recipes`. Added "Nutrition Tracker" link in recipes page subtitle.
- **Status:** Implemented

**Decision:** Use new frame image (jarvis-frame.png) for hub center and module frames
- **Rationale:** User provided new cyan circular HUD design with circuitry, text rings, and symbols.
- **Implementation:** Image copied to `public/assets/jarvis-frame.png`, all frame references updated.
- **Status:** Implemented

**Decision:** Standardize icon sizes across hub
- **Rationale:** Some icons appeared larger than others due to content extent (e.g., settings gear teeth extended beyond circle).
- **Implementation:** Settings gear teeth shortened to fit within r=14; bike wheel rim set to r=14; bottom row icons in fixed w-24 h-24 flex-shrink-0 containers.
- **Status:** Implemented

**Decision:** Remove circle from bike gear icon
- **Rationale:** User preferred bike gear without outer circle (vertical lines only).
- **Status:** Implemented

**Decision:** Expand hub with new modules (Calendar, Tasks, Weather, Notes, Health)
- **Rationale:** User wanted JARVIS as a personal assistant with additional modules. Added Calendar, Task Manager, Weather, Notes (Craft), and Health to top row.
- **Implementation:** Created JarvisCalendarIcon, JarvisTaskManagerIcon, JarvisWeatherIcon, JarvisNotesIcon, JarvisHealthIcon. Added modules to hub with placeholder pages at /calendar, /tasks, /weather, /notes, /health.
- **Status:** Implemented

**Decision:** Nutrition icon – plate with fork (left) and knife (right)
- **Rationale:** User wanted nutrition icon inspired by place setting. Plate with fork on left, knife (straight line) on right, all fit within circle.
- **Status:** Implemented

**Decision:** Settings icon – sliders instead of gear
- **Rationale:** User wanted to change bottom row settings icon. Replaced gear with three horizontal sliders (control panel style).
- **Status:** Implemented

**Decision:** Task manager icon – checklist with empty circles
- **Rationale:** User tried clipboard (task1) then checklist style. Final design: three rows with circle + line per row. Backup at JarvisTaskManagerIcon.task1.backup.tsx.
- **Status:** Implemented

**Decision:** Notes icon – clipboard with list lines
- **Rationale:** User wanted notes connected to Craft. Clipboard design with top clip bar, main board, and list lines.
- **Status:** Implemented

**Decision:** Health icon – EKG waveform
- **Rationale:** User wanted heart rate graph. Final design: EKG trace with P wave, QRS complex (tall spike), S dip, T wave.
- **Status:** Implemented

**Decision:** Profile icon – bald head, rectangular glasses, no smile
- **Rationale:** User wanted icon inspired by professional headshot. Simplified to bald head, glasses, no smile.
- **Status:** Implemented

**Decision:** Fix icons to fit within circle (bike gear, settings gear)
- **Rationale:** Several icons had lines extending outside r=18 circle. Shortened teeth/lines, added clipPath where needed.
- **Status:** Implemented

**Decision:** Hub module order – Calendar, Nutrition, Bike, Strava, Tasks, Weather, Notes, Health
- **Rationale:** Logical grouping: calendar/schedule first, core nutrition/bike/Strava, then productivity (tasks, notes), health/weather last.
- **Status:** Implemented

**Decision:** Wedge-shaped summary card on single icon click
- **Rationale:** User wanted HUD-style summary inspired by Iron Man interface. Single click opens wedge; double-click or click wedge navigates to module.
- **Implementation:** Wedge originates from center of frame, points toward clicked icon. All wedges same dimensions, size, shape (based on Strava wedge). Fixed 120° angle. Length = healthDist × 0.6. Rounded opposite edge. Overlays center frame. Slides in from center (~200ms). Click same icon to close; click elsewhere to close; click other icon switches wedge. Icon row z-30 so icons stay clickable above wedge overlay.
- **Status:** Implemented

**Decision:** Active wedge indicator – color inversion instead of green dot
- **Rationale:** User preferred inverted colors over green dot. Selected icon: blue becomes black (icon stroke), black becomes blue (circle background).
- **Status:** Implemented

**Decision:** Top row module icon size – 90px (slightly reduced from 96px)
- **Rationale:** User requested very slight decrease in icon size.
- **Status:** Implemented

**Decision:** Remove wedge label from summary card
- **Rationale:** User found the module name and "Summary" label unnecessary.
- **Status:** Implemented

**Decision:** Wedge summary cards for bottom row icons (Settings, Profile, Status, Alerts)
- **Rationale:** User wanted same wedge behavior for bottom row as top row.
- **Implementation:** Single click opens wedge; double-click or click wedge navigates. Same color inversion when selected. Alerts icon keeps orange when unread. Wedges point from center toward each bottom icon.
- **Status:** Implemented

### Nutrition Page & Navigation

**Decision:** Redesign nutrition tracker page to match hub (JARVIS 4.0 HUD)
- **Rationale:** User wanted consistent look across app. Hub uses cyan primary (#00D9FF), circuit background, hud-card, hud-text.
- **Implementation:** Nutrition page uses same theme, CircuitBackground, hud-scifi-bg; all cards/buttons/inputs use theme colors; Navigation accepts optional linkClassName for theme styling.
- **Status:** Implemented

**Decision:** Replace "Return to JARVIS" button with small JARVIS frame image
- **Rationale:** User wanted frame icon in upper left instead of text button.
- **Implementation:** Navigation component shows jarvis-frame.png (same as hub) with jarvis-hud/hud-element; fixed size via inline style (80px) to override .jarvis-hud 100% sizing. Links to /hub.
- **Status:** Implemented

**Decision:** Nutrition page header – frame and title on same row; title "Nutrition"
- **Rationale:** User wanted title on same level as frame; later simplified label to "Nutrition" to match card heading.
- **Implementation:** Single flex row with Navigation (frame) left, h2 "Nutrition" right. Same hud-text styling as card heading.
- **Status:** Implemented

**Decision:** Nutrition results card only when data loaded; hide when leaving page
- **Rationale:** User did not want results card always visible; only after search/recipe selection, and hidden when navigating away.
- **Implementation:** Card renders only when nutritionData is set. usePathname effect clears nutritionData/customAmount/error when pathname is /nutrition so returning to page starts fresh.
- **Status:** Implemented

**Decision:** Clear button on nutrition results card
- **Rationale:** User wanted to dismiss the results panel. Placed in upper right of the card.
- **Implementation:** Absolute-positioned Clear button clears nutritionData, customAmount, error.
- **Status:** Implemented

**Decision:** Move backup (export/import) to Settings; weekly reminder in Alerts
- **Rationale:** User wanted backup in main settings; reminder to back up weekly (or do it weekly) in Alerts.
- **Implementation:** Settings page has "Backup" section (id=nutrition) with Export/Import for recipes and saved ingredients; last backup timestamp in localStorage. Alerts page shows weekly reminder card when last backup &gt; 7 days or never; link to Settings#nutrition. Removed Export/Import from nutrition page.
- **Status:** Implemented

**Decision:** Settings icon below recipes card on nutrition page
- **Rationale:** User wanted quick access to nutrition-related settings (backup) from nutrition page.
- **Implementation:** Hub-style sliders icon (same SVG as hub) below recipes card, links to /settings#nutrition. Icon size 80px (w-16 h-16), click area 96px; theme glow and hover scale.
- **Status:** Implemented

**Decision:** Recipe cards operate like ingredient/barcode products
- **Rationale:** User wanted recipe cards (e.g. Curried Couscous, Date Salad) to behave like selecting a product from search or barcode – same nutrition results panel.
- **Implementation:** Whole recipe card is clickable (role=button, keyboard support); click calls loadRecipeNutrition(recipe) and scrolls to same nutrition results card. "Recipe" badge added; "View Details" removed. Edit link uses stopPropagation so Edit does not open panel.
- **Status:** Implemented

**Decision:** Manual entries searchable in "Search by ingredient name"
- **Rationale:** User wanted manually added foods to appear when searching by ingredient.
- **Implementation:** Manual entries already saved to savedIngredients and localStorage; autocomplete filters savedIngredients first then USDA. Added confirmation message "Saved. You can find it by searching above." after manual add.
- **Status:** Implemented

**Decision:** Rename "Nutrition" to "Foods & Ingredients"
- **Rationale:** User wanted the top box and header to say "Foods & Ingredients" instead of "Nutrition."
- **Implementation:** Page header and first card heading both use "Foods & Ingredients" with same hud-text styling.
- **Status:** Implemented

**Decision:** Recipe cards only when user has searched
- **Rationale:** User did not want recipe cards (e.g. Curried Couscous, Date Salad) to always show; only when a search is entered.
- **Implementation:** Recipe list grid renders only when recipeSearch.trim() is non-empty. When recipes exist but search is empty, nothing is shown (no "Search recipes above to see results" message). "View all" link only when searching and &gt;6 results.
- **Status:** Implemented

**Decision:** Compare Recipes – last two viewed recipes for macro comparison
- **Rationale:** User wanted to compare macros between the most recently viewed recipe and the immediate past one.
- **Implementation:** "Compare Recipes" button next to Recipe Builder toggles a panel. When a recipe card is clicked, that recipe is pushed to recentRecipesForCompare (max 2, most recent first). Panel shows side-by-side per-serving macros (Cal, Carbs, Prot, Fat) for those two recipes; if &lt;2 viewed, shows message to click at least 2 recipes.
- **Status:** Implemented

### Bike Gear Page

**Decision:** Bike gear page sections with custom icons (no boxes)
- **Rationale:** User wanted section icons similar to the hub for: Component list, Gear inventory, Service log, Tire pressure, Sizing & fit, Ride checklist, Packing checklist. No boxes around icons.
- **Implementation:** Bike page uses HUD theme and CircuitBackground. Seven section buttons with icon + label + description; no card/border (transparent, hover opacity only). Icons: (1) Component list = drivetrain (chainring, chain, cassette), (2) Gear inventory = bike jersey + helmet, (3) Service log = crescent wrench head, (4) Tire pressure = gauge with needle, (5) Sizing & fit = tape measure with tick marks, (6) Ride checklist = road bike side view, (7) Packing checklist = suitcase with handle. All icons stroke-only, fit in circle r=18, hub-style.
- **Status:** Implemented

**Decision:** Bike gear section icons enlarged 250%, subtitles removed
- **Rationale:** User wanted larger, clearer section icons and no description line under each (e.g. "Bikes and parts").
- **Implementation:** Icon size changed from 48px to 120px (250%). Section buttons show only icon + name; description prop no longer rendered.
- **Status:** Implemented

**Decision:** Ride checklist icon – bicycle side view with correct geometry
- **Rationale:** User wanted a recognizable bicycle icon fitting inside the circle, with proper frame and bars.
- **Implementation:** Bicycle drawn with wheels (r=5.5, centers 13 & 35 inside circle), seat tube angled back, top tube horizontal, down tube/head tube meeting above front tire (y=23), saddle above top tube, stem and drop bars extending from headset. Whole bicycle scaled in a &lt;g&gt; to 82% so it fits inside the circle.
- **Status:** Implemented

**Decision:** Sizing & fit icon – tape measure only, from above, with tick marks
- **Rationale:** User wanted a tape measure icon showing only the tape (no case), view from above so tick marks are visible.
- **Implementation:** Single tape blade (rounded rect) with ruler-style tick marks originating at top of tape, not touching bottom; even spacing with long/medium/short ticks (like real tape). Horizontal sleeve-hem line removed from t-shirt outline to avoid "dots" at sleeve ends.
- **Status:** Implemented

**Decision:** Gear inventory icon – t-shirt with sleeve definition and zipper
- **Rationale:** User wanted a clear t-shirt/jersey icon with sleeves distinct from body, and a zipper.
- **Implementation:** Simple t-shirt outline (crew neck, sleeves, body, hem). Shoulder-to-armpit shortened; sleeve length increased by moving outer sleeve edge away from midline (x=12 left, x=36 right). Sleeve defined as shoulder → outer edge → underarm only (not the lowest horizontal hem line nor the body vertical); sleeve drawn in electric blue (#00BFFF). Zipper line from neck opening curve (y=16) to bottom hem (y=37), not to top horizontal.
- **Status:** Implemented

### Recipe Builder (Units, Amount, Display)

**Decision:** Add bunch, can, clove(s) as units in Recipe Builder
- **Rationale:** User requested these units when creating recipes (e.g. "1 bunch parsley", "1 can tomatoes", "3 cloves garlic").
- **Implementation:** Added to unit dropdown and quick-unit buttons. `convertToGrams` uses nominal values for nutrition totals: bunch=50g, can=400g, clove/cloves=5g.
- **Status:** Implemented

**Decision:** Allow blank amount when adding ingredients (treat as 1)
- **Rationale:** User wanted to add items like "1 bell pepper" without typing "1"; leaving amount blank should default to 1.
- **Implementation:** In Recipe Builder add-ingredient flow, amount is optional; blank amount uses 1. Placeholder set to "Amount (optional)".
- **Status:** Implemented

**Decision:** Display ingredient amounts as mixed fractions (e.g. 2 1/2, not 5/2)
- **Rationale:** User preferred readable mixed numbers for cooking (e.g. "2 1/2 cups") instead of improper fractions.
- **Implementation:** Added `decimalToMixedFraction` and `formatAmount`; ingredient list and edit form show mixed fractions. Amount input accepts mixed input ("2 1/2", "2 and 1/2") and formats on blur. `parseFraction` extended to parse mixed numbers.
- **Status:** Implemented

### Gear Inventory

**Decision:** Add purchase date and helmet replacement reminder to gear
- **Rationale:** User wanted to track when gear was purchased and get reminders when helmets need replacing (3–5 year lifespan).
- **Implementation:** GearItem has `purchaseDate` and `replaceReminderYears` fields. Helmets default to 3-year replacement. Min/max clamped to 3–5 years. Helper text on form: "Helmets should be replaced every 3–5 years." Replace-by date shown on helmet cards.
- **Status:** Implemented

**Decision:** Helmet replacement alerts on Alerts page and hub
- **Rationale:** User wanted helmet reminders linked to the Alerts page, and the hub icon to turn orange when alerts exist.
- **Implementation:** Alerts page reads `jarvis-gear-inventory` from localStorage, finds helmets with purchase date + replace years, computes replace-by date, shows alert when within 30 days or overdue. Hub computes same logic in `hubGetAlertSummaries()` — icon turns orange (#FF6600) when backup overdue or helmet due. Hub rechecks every 60s.
- **Status:** Implemented

**Decision:** Replace "Kit" category with separate "Jersey" and "Bibs" categories
- **Rationale:** User wanted more specific categorization. Later removed Tools, Accessories, and Other as well.
- **Implementation:** GEAR_CATEGORIES = ["Helmets", "Jersey", "Bibs", "Shoes"]. Legacy categories (e.g. "Kit") still display if present in saved data.
- **Status:** Implemented

**Decision:** Jersey-specific fields: sleeve length, colors (multi), weather
- **Rationale:** User wanted jerseys to have sleeve length (short/long), multiple colors, and weather type (warm/cool/cold). Name is optional for jerseys.
- **Implementation:** `sleeveLength`, `colors: string[]`, `weather` fields on GearItem. Add/edit forms show these fields conditionally when category is "Jersey." Colors use add/remove UI for multiple entries. Existing single `color` strings migrated to `colors[]` on load.
- **Status:** Implemented

**Decision:** Remove Condition field from all gear entries
- **Rationale:** User did not want condition tracking on gear items.
- **Implementation:** Removed `condition` from GearItem, add form, edit form, card display, and GearEditForm props. CONDITIONS array removed.
- **Status:** Implemented

### Page Header Template

**Decision:** Standard header template: Frame left, title center, parent-section icon right
- **Rationale:** User wanted consistent headers across all pages. No "← Section" text links for back navigation; instead use a parent-section icon in upper right corner, same size as the JARVIS frame (80×80px).
- **Implementation:** Gear inventory and Component list pages use cycling wheel icon (CyclingIcon.tsx) in upper right linking to /bike. Right column uses `flex justify-end` with explicit 80×80 sizing. Updated `.cursor/rules/jarvis-page-template.mdc` to enforce this pattern for all future pages.
- **Status:** Implemented

### Alert Wedge Summary

**Decision:** Show alert summary text inside the hub wedge for Alerts
- **Rationale:** User wanted to see what alerts are active without leaving the hub.
- **Implementation:** `hubGetAlertSummaries()` returns summary strings (backup reminder, helmet replacement). Passed as `summaryLines` to WedgeSummaryCard. Text rendered as SVG `<text>/<tspan>` inside the wedge, clipped to wedge path, counter-rotated so text stays horizontal on the page. Bullet points ("• ") for each alert with hanging indent on wrapped lines. "No Current Alerts" shown (centered) when no alerts exist. White text with dark drop shadow for readability. Left-aligned with increased line spacing (LINE_HEIGHT=20).
- **Status:** Implemented

## 2026-03-10

### Strava – Dedicated Page

**Decision:** Move Strava connect/sync/disconnect to its own page at `/bike/strava`
- **Rationale:** Strava OAuth, token refresh, activity sync, and gear fetching added complexity to the Component list page. A dedicated Strava page gives a cleaner separation of concerns and room to grow (linked-bike mileage display, gear list).
- **Implementation:** New `bike/strava/page.tsx` handles OAuth callback (hash params), token storage (`jarvis-strava-tokens`), token refresh, activities + gear API calls, mileage aggregation (total/indoor/road), and writes synced gear to `jarvis-strava-gear` in localStorage. Component list now reads gear options from `jarvis-strava-gear` instead of managing tokens directly. Strava page shows connected status, sync button, disconnect, last-sync timestamp, linked bikes with mileage, and Strava gear list.
- **Status:** Implemented

**Decision:** Add Strava icon and section to bike page
- **Rationale:** Strava needed its own entry point on the cycling hub alongside the other sections.
- **Implementation:** `StravaIcon` SVG (upward chevron/arrow mark inside circle, matching Strava's brand). Added as first section in the bike page grid, linking to `/bike/strava`.
- **Status:** Implemented

### Tire Pressure Calculator

**Decision:** Create tire pressure calculator page at `/bike/tire-pressure`
- **Rationale:** User wanted a tool to compute recommended front/rear PSI based on total system weight, tire width, tire type, surface, and conditions.
- **Implementation:** Full-featured calculator with:
  - **Weight components:** Rider & kit (lbs), helmet (oz), shoes (oz), bike (lbs), selectable wheel sets, water bottles (configurable count and type), repair kits (saddle/tube toggles), front/rear lights, computer.
  - **Defaults system:** Weights auto-save on blur. If a value differs from the saved default, a banner asks "Set as new default?" with Yes/No.
  - **Tire settings:** Bike selection (reads from `jarvis-bikes`), tire width (common presets 23–50mm + custom), same or different front/rear, tire type (clincher/tubeless/tubular), surface (smooth/rough/gravel/mixed), conditions (dry/wet).
  - **PSI calculation:** Based on 15% tire drop methodology. Wheel-load = total weight × front/rear fraction. PSI = (wheel-load × tire-type-K) / width, adjusted for surface and conditions, clamped to safe min/max per width.
  - **Front/rear split:** Slider (30–50%) with bike-type presets (road 40/60, gravel 42/58, etc.).
  - **Tire Pressure Limits table:** Built-in tires (Bontrager R3, Continental GP 5000 S TR) plus user-added custom tires. Persistent via `jarvis-tire-pressure-tires`.
  - **Collapsible sections** for Weight and Tire Settings.
  - **PSI results** at top: front and rear PSI with ±8% range.
- **Status:** Implemented

**Decision:** Link tire pressure section on bike page to `/bike/tire-pressure`
- **Rationale:** Tire pressure was a placeholder section; now routes to the new calculator page.
- **Status:** Implemented

### Component List Refinements

**Decision:** Remove bike color from Component list
- **Rationale:** Color picker/swatch added clutter without practical value. Bike type is sufficient identification.
- **Implementation:** Removed `BIKE_COLORS` array, color picker from add/edit forms, color swatch from bike row, and `color` from all type signatures.
- **Status:** Implemented

**Decision:** Add inline editing for individual components
- **Rationale:** Previously components could only be added or removed. User needed to edit component details (brand, model, size, weight, install date, mileage, service interval, notes) without deleting and re-adding.
- **Implementation:** `ComponentEditForm` component with all editable fields. Each component row shows Edit and Remove buttons. `updateComponent()` merges partial updates into the bike's component array.
- **Status:** Implemented

**Decision:** Collapsible Notes & Attachments section per bike
- **Rationale:** Notes and attachments took up vertical space even when not needed. Collapsing keeps the bike list compact.
- **Implementation:** Toggle button ("▸ Notes & Attachments" / "▾ Notes & Attachments") controlled by `showDetailsId` state. Attach-files input moved inside the collapsible area.
- **Status:** Implemented

**Decision:** Fix localStorage persistence race condition (isLoaded pattern)
- **Rationale:** Component list and gear inventory had a bug where the save effect could run before data was loaded from localStorage, overwriting saved data with empty state.
- **Implementation:** Added `isLoaded` boolean state. Set to `true` after load effect completes. Save effect skips when `isLoaded` is false. Applied to Component list (`bikes`) and Gear inventory (`items`).
- **Status:** Implemented

**Decision:** Rename headings for consistency
- **Rationale:** Minor capitalization cleanup.
- **Implementation:** "Component list" → "Component List", "Bikes and parts" → "Bikes and Components".
- **Status:** Implemented

### Favicon & Editor Settings

**Decision:** Use JARVIS frame as favicon
- **Rationale:** Default Next.js favicon didn't match the app identity. The JARVIS frame (cyan circular HUD with circuitry) is the app's visual identity.
- **Implementation:** Converted `public/assets/jarvis-frame.png` to a multi-size ICO (16×16, 32×32, 48×48, 64×64) at `app/favicon.ico` using Pillow.
- **Status:** Implemented

**Decision:** Enable Raycast snippet expansion in Cursor
- **Rationale:** Raycast text expansion was blocked by VS Code/Cursor's accessibility support intercepting keystrokes.
- **Implementation:** Set `"editor.accessibilitySupport": "off"` in Cursor user settings (`~/Library/Application Support/Cursor/User/settings.json`).
- **Status:** Implemented

### Deployment & Naming

**Decision:** Rename project from `nutrition-app` to `jarvis` / `app`
- **Rationale:** JARVIS is a personal assistant, not a nutrition tracker. The directory name and Vercel project name should reflect that.
- **Implementation:** Directory renamed from `nutrition-app` to `app`. Vercel project renamed to `jarvis`. Package name updated to `jarvis`. All internal references updated.
- **Status:** Implemented

**Decision:** Deploy to Vercel at `jarvis.chrissilvia.com`
- **Rationale:** User owns `chrissilvia.com` (DNS on Cloudflare). Vercel provides free hosting with auto-deploy from GitHub.
- **Implementation:** Vercel project `jarvis` connected to GitHub repo `cesilvia/JARVIS`. Root directory set to `app`. Custom domain `jarvis.chrissilvia.com` added. DNS A record points to `76.76.21.21`. Auto-deploys on push to `main`.
- **Status:** Implemented

**Decision:** Update app metadata to reflect JARVIS identity
- **Rationale:** Page title and description still said "Nutrition Tracker."
- **Implementation:** Title changed to "J.A.R.V.I.S.", description to "Personal AI Operations Assistant."
- **Status:** Implemented

### Authentication

**Decision:** Add password + biometric (WebAuthn) authentication
- **Rationale:** User wanted to restrict access to JARVIS with password, fingerprint, or facial recognition.
- **Implementation:**
  - Next.js middleware gates all routes; unauthenticated requests redirect to `/login`.
  - Password auth: bcrypt-hashed password stored in `AUTH_PASSWORD_HASH` env var. Signed JWT session cookie (30-day expiry) using `jose` library.
  - Biometric auth: WebAuthn (Touch ID on Mac, Face ID on iPhone) via `@simplewebauthn/server` and `@simplewebauthn/browser`. Credentials stored in `.data/webauthn.json` locally.
  - First-time setup flow: if no password hash exists, login page shows "Create Password" form that writes hash to `.env.local`.
  - Settings page has Security section for biometric registration and logout.
- **Status:** Implemented
