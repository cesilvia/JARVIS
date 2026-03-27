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

### Strava Dashboard Rebuild

**Decision:** Rebuild Strava page as a data dashboard; move connection controls to Settings
- **Rationale:** The Strava page was primarily connection management. Separating connection controls into Settings and rebuilding the page as a ride dashboard provides a much better experience.
- **Implementation:**
  - Activities API expanded with `total_elevation_gain`, `average_speed`, `max_speed`, `elapsed_time`, `average_heartrate`, `kudos_count` fields.
  - Raw activities cached in `localStorage` (`jarvis-strava-activities`) on sync so the dashboard loads instantly without re-fetching.
  - Connection controls (connect, sync, disconnect, status, last sync) moved to Settings page under a new "Strava" section (`#strava`). OAuth callback redirects to `/settings` instead of `/bike/strava`.
  - Dashboard sections: YTD stats (distance, time, elevation, rides), weekly/monthly mileage comparison bars, per-bike mileage breakdown, pure SVG mileage-over-time chart (12 weeks / 12 months toggle), recent rides list (last 10 with distance, time, speed, elevation, heartrate).
  - All units displayed in miles/feet/mph. Time as `Xh Ym`.
- **Status:** Implemented

### Strava Deep Analytics

**Decision:** Expand Strava page into a full cycling analytics platform with tabs, streams, and training load
- **Rationale:** The basic mileage dashboard didn't expose the rich data available from Strava (power, cadence, HR zones, training load). User wanted power curves, zone distributions, per-ride detail charts, and fitness tracking.
- **Implementation:**
  - **Expanded API fields:** `average_watts`, `max_watts`, `weighted_average_watts`, `kilojoules`, `calories`, `average_cadence`, `max_heartrate`, `suffer_score`, `device_watts`, `pr_count`, `achievement_count`.
  - **Tab navigation:** Overview (existing stats + calories/power/HR/cadence cards), Rides (full list with click-to-expand detail), Power (power curve + zones), Fitness (TSS/CTL/ATL/TSB training load + HR zones).
  - **Auto-sync:** Page auto-syncs if last sync > 6 hours old, plus manual sync in Settings.
  - **Streams API:** New `/api/strava/streams` route fetches per-activity time-series (power, HR, cadence, speed, altitude). Cached in localStorage per activity.
  - **Ride detail:** Click any ride to see SVG charts for power, HR, cadence, speed, elevation over time. Per-ride zone distribution when zones are configured.
  - **Power curve:** Sliding-window best-effort computation across all rides (5s to 60min). SVG chart with log-scale x-axis. Progressive fetch with rate-limit awareness.
  - **Training zones:** FTP and Max HR set in Settings. Default zones auto-calculated; individual zone boundaries can be overridden. Stored in `jarvis-strava-zones`. 28-day review reminder on Alerts page and hub.
  - **Training load (Fitness):** TSS per ride from summary data (NP + duration + FTP). CTL/ATL/TSB (fitness/fatigue/form) computed as exponentially weighted averages. SVG chart with 90d/180d/1yr toggle.
  - **Shared types:** Extracted to `bike/strava/types.ts` for consistency between page, settings, and alerts.
  - **Migrated middleware.ts to proxy.ts** for Next.js 16 compatibility.
- **Status:** Implemented

## 2026-03-16

### Infrastructure: Cloudflare Tunnel Migration

**Decision:** Migrate hosting from Vercel to Mac Mini via Cloudflare Tunnel
- **Rationale:** SQLite requires persistent disk. Vercel serverless can't do this. Mac Mini already runs Docker Compose with JARVIS + N8N. Cloudflare Tunnel provides free HTTPS with no exposed ports.
- **Implementation:** Added cloudflared service to Docker Compose. Created tunnel jarvis-mini in Cloudflare Zero Trust. Published route jarvis.chrissilvia.com to http://jarvis:3000. Changed JARVIS from ports to expose (internal only). Disconnected Vercel Git integration. Tunnel token in .env file, password hash uses $$ escaping for Docker Compose.
- **Status:** Implemented

**Decision:** Keep N8N Tailscale-only (no public URL)
- **Rationale:** N8N has no auth by default. Public access would be a security risk.
- **Status:** Implemented

### Hub: Wedge Text Wrapping and Resize Fix

**Decision:** Word-wrap long wedge bullet text with indented continuations, recalculate on resize
- **Rationale:** Long alert text (e.g. "Back up JARVIS to iCloud") overflowed the wedge shape. Shrinking font made it unreadable. Wedge origin also drifted on window resize since it was only computed once.
- **Implementation:** WedgeSummaryCard calculates available chord width at the text's radial position (60% of wedge length). Lines exceeding maxChars word-wrap with 3-space indent on continuation lines. Font stays at base size (L*0.08). Added window resize listener that recalculates wedge origin/angle/length via `computeWedgeProps` callback.
- **Status:** Implemented

### Recipe Import: Expanded Unit Map and Size Descriptors

**Decision:** Add missing units and handle size descriptors in recipe URL import
- **Rationale:** Imported recipe macros were wildly inaccurate because the import parser's unitMap was missing common units (bunch, can, clove, pinch, dash). Size descriptors like "large" or "medium" were parsed as the unit, defaulting to grams (e.g. "2 large eggs" → 2g of eggs).
- **Implementation:** Added bunch/can/clove/cloves/pinch/dash to import route unitMap. Size descriptors (large/medium/small/whole/big/extra) map to "count" unit and keep the descriptor in the ingredient name for better USDA search. Added "count" unit (100g default) to recipe builder dropdown and quick buttons.
- **Status:** Implemented

### Infrastructure: Auto-Deploy via Git Polling

**Decision:** Automate deployment from laptop push to Mac Mini Docker rebuild
- **Rationale:** Manual deploy (Screens 5 → terminal → docker compose up) was tedious and error-prone. Needed a simple, no-new-infrastructure solution.
- **Implementation:** `deploy.sh` at repo root: git fetch → compare SHAs → git pull --ff-only → docker compose up -d --build jarvis → docker image prune. Runs every 2 minutes via launchd (`com.jarvis.deploy.plist` in ~/Library/LaunchAgents). Logs to ~/Projects/JARVIS/deploy.log. Mac Mini repo converted from loose files to proper git clone.
- **Status:** Implemented

## 2026-03-17

### Backup: Cloudflare R2 Off-Device Backup

**Decision:** Replace iCloud Drive backup path with simple local directory + Cloudflare R2 upload
- **Rationale:** The iCloud Drive volume mount (`~/Library/Mobile Documents/com~apple~CloudDocs/JARVIS-backups`) caused filesystem errors (-35) inside Docker containers. iCloud's special filesystem attributes are incompatible with Docker volume mounts. Even when working, backups were only on the Mac Mini's disk — if the disk died, both SQLite and backups would be lost.
- **Implementation:**
  - Changed docker-compose.yml volume from iCloud path to `./backups:/backups` (simple local dir).
  - Added Cloudflare R2 upload to backup API route using AWS Signature V4 signing (Node.js `crypto` module, no new dependencies).
  - Every backup POST now saves locally AND uploads to R2 bucket `jarvis-backups`.
  - R2 credentials (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ACCOUNT_ID`, `R2_BUCKET_NAME`) in `.env.local` on Mac Mini.
  - Backup UI updated: labels changed from "iCloud" to "R2", success message shows R2 upload status.
  - R2 free tier: 10 GB storage, 1M writes/month, zero egress fees.
- **Status:** Implemented

**Decision:** Use AWS Signature V4 signing directly instead of AWS SDK dependency
- **Rationale:** Avoided adding `@aws-sdk/client-s3` (~50MB) to the Docker image. R2 is S3-compatible, so native `crypto` module handles HMAC-SHA256 signing.
- **Status:** Implemented

### German Page: Conjugation Engine, Badges, and Flashcard Expansion

**Decision:** Build a conjugation engine covering 4 tenses (Präsens, Präteritum, Perfekt, Futur I)
- **Rationale:** User wanted verb conjugation flashcards auto-generated for all 500 verbs × 6 pronouns × 4 tenses = 12,000 cards. Must be 100% accurate — built a comprehensive irregular verb lookup table (100+ entries) covering stem-vowel changes, strong/weak/mixed verbs, separable/inseparable prefixes, sein vs haben auxiliary, reflexive verbs.
- **Implementation:** `app/lib/german-conjugation.ts` (~500 lines) with `conjugateVerb()` and `generateFlashcards()`. `app/lib/german-conjugation-cards.ts` generates VocabWordBase cards from verb list. Cards have front="ich arbeite", back="I work", partOfSpeech="conjugation".
- **Status:** Implemented

**Decision:** Expand verb vocabulary to 500 verbs
- **Rationale:** User wanted top 500 German verbs for comprehensive conjugation coverage.
- **Implementation:** Added 35 new verbs in "Additional Common Verbs" section of `app/lib/german-vocab/verbs.ts`.
- **Status:** Implemented

**Decision:** Fix neuter noun color from green to orange
- **Rationale:** Neuter (`das`) nouns were incorrectly green (#4AFF88). User wanted orange to distinguish from masculine (blue) and feminine (pink).
- **Implementation:** Changed `das` color to `#FFB347` in page.tsx.
- **Status:** Implemented

**Decision:** Add yellow badges for special word properties (W, Akk, Dat, Gen, ↕, VK)
- **Rationale:** User wanted visual indicators for: weak/n-declension nouns (W), preposition case governance (Akk/Dat/Gen/↕ for two-way), subordinating conjunction verb kickers (VK). All badges yellow for visibility.
- **Implementation:** `WordBadge` component in page.tsx. Badges appear in WotD cards, dictionary results, recent lookups, and flashcard front. Badge text also appended to hub wedge display via word-of-the-day.ts.
- **Status:** Implemented

**Decision:** Add "conjugation" as a partOfSpeech type and flashcard filter
- **Rationale:** 12,000 conjugation cards need their own filter in the flashcard tab so users can study conjugations separately.
- **Implementation:** Added to VocabWord union type in german-types.ts. Added filter option in flashcard tab dropdown.
- **Status:** Implemented

**Decision:** Mark weak nouns with `weakNoun: true` field
- **Rationale:** N-Deklination nouns (e.g., Löwe → Löwen in accusative/dative/genitive) need special identification for the W badge and future declension detail page.
- **Implementation:** Added `weakNoun?: boolean` to VocabWord type. Marked 8 nouns in nouns.ts (Nachbar, Mensch, Kollege, Kunde, Polizist, Bär, Gedanke, Name). Merge logic preserves weakNoun from builtins to saved words.
- **Status:** Implemented

### German Wedge: Per-Label X Positioning

**Decision:** Add per-label horizontal nudges for `v:` and `n:` on the German hub wedge
- **Rationale:** The staggered label layout (shortest labels furthest left) didn't look balanced — `v:` needed to shift left and `n:` needed a rightward nudge to create better visual spacing between the three word rows.
- **Implementation:** `labelStartX()` in WedgeSummaryCard applies per-label offsets: `n:` nudged right by 0.75 × CHAR_WIDTH, `v:` nudged left by 0.5 × CHAR_WIDTH. Iteratively tuned through visual feedback.
- **Status:** Implemented

## 2026-03-22

### Command Palette (Cmd+K)

**Decision:** Add a Raycast-style command palette accessible from any page via Cmd+K
- **Rationale:** JARVIS required navigating to a page before taking action. Command palette enables "just do it" from anywhere — search, navigate, run actions, and query data instantly.
- **Implementation:** Single client component in root layout. Fuzzy search across 21 navigation targets + 2 quick actions. Server-side /api/search endpoint queries SQLite across recipes, vocab, gear, bikes, rides. Recent items persist via KV. AI mode (type ?) calls Claude API with MCP tools. Deep-links to Strava rides with auto-expand.
- **Status:** Implemented

### MCP Server

**Decision:** Expose JARVIS data as MCP tools via /api/mcp route
- **Rationale:** Enables Claude (in Claude Code, Claude app, or any MCP client) to query and update JARVIS data conversationally without opening the browser.
- **Implementation:** 9 tools (get_rides, get_ride_stats, get_german_words_due, get_recipes, get_gear, get_bikes, run_backup, get_alerts, search). Shared tool definitions in mcp-tools.ts used by both MCP server and AI chat route. Web-standard StreamableHTTP transport. Requires ANTHROPIC_API_KEY for AI mode.
- **Status:** Implemented (AI mode pending API key setup)

### PWA Support

**Decision:** Add Progressive Web App support for iPhone home screen access
- **Rationale:** Makes JARVIS feel like a native app on iPhone — full screen, own icon, no browser bar. Much less work than building a React Native app.
- **Implementation:** Web manifest, service worker (network-first with cache fallback), apple-touch-icon. Service worker registered in root layout.
- **Status:** Implemented

### Mobile Hub Layout

**Decision:** Add responsive mobile layout for hub page below md breakpoint (768px)
- **Rationale:** Radial wedge layout designed for desktop is unusable on phone — only center icons visible, no scrolling. Mobile needs a touch-friendly alternative.
- **Implementation:** Scrollable card list with module icons, names, and summary info. Dark cards with cyan accents (HUD aesthetic preserved). Desktop layout completely unchanged — mobile layout is a separate `<main>` that shows via `md:hidden`. Single tap navigates (no wedge interaction).
- **Status:** Implemented

### Summary Chart Line Toggles

**Decision:** Make summary chart legend items clickable to show/hide data series
- **Rationale:** With 5 overlapping series (power, HR, cadence, speed, elevation), the chart can be noisy. Toggling lets user focus on specific data.
- **Implementation:** `hiddenSeries` state (Set) in SummaryChart. Legend items toggle on click, hidden series render at 0.3 opacity in legend. Data lines, elevation fill, and FTP line conditionally rendered.
- **Status:** Implemented

### Comparison Ride Colors

**Decision:** Change comparison ride colors from fading blues to distinct colors
- **Rationale:** Progressively lighter shades of cyan were hard to distinguish, especially on mobile.
- **Implementation:** Changed from `["#00D9FF", "rgba(0,217,255,0.5)", ...]` to `["#00D9FF", "#FF6B6B", "#FFD93D", "#6BCB77"]` (cyan, coral, gold, green).
- **Status:** Implemented

### Backup Labels Fix

**Decision:** Update all backup-related labels from "iCloud" to "Cloudflare R2"
- **Rationale:** Backups moved from iCloud Drive to Cloudflare R2 in a prior session, but UI labels in hub alerts, alerts page, settings page, and backup page still referenced iCloud.
- **Implementation:** Updated 4 references across hub, alerts, settings pages. Backup page "Saves to" path changed from iCloud filesystem path to "Cloudflare R2 (jarvis-backups bucket)". Subtitle changed from "R2 Drive" to "Cloudflare R2".
- **Status:** Implemented

### Settings Wedge Simplification

**Decision:** Reduce settings wedge to show only count, not page names
- **Rationale:** Listing page names (hub, calendar, tasks, +34 more) caused layout issues in the wedge shape and wasn't useful information.
- **Implementation:** Removed page name bullets and "+N more" line. Wedge now shows single line: "37 pages need verification".
- **Status:** Implemented

### Weather Removed from Hub

**Decision:** Remove weather icon from hub modules
- **Rationale:** Weather page is a utility, not a daily destination. Weather data will appear in the welcome message instead. Page remains accessible via Cmd+K.
- **Status:** Implemented

### Research Hub Icon (formerly Notes)

**Decision:** Rename Notes hub icon to Research, umbrella for Readwise, Notes, and Journal
- **Rationale:** Notes as a standalone module was underutilized. Research groups three related features (Readwise highlights, personal notes, journal entries) under one hub icon with sub-pages or tabs.
- **Status:** Renamed; sub-pages to be built

### Welcome Banner

**Decision:** Add a "Good Morning/Afternoon/Evening, Chris" banner to the hub with three info cards (Training, Weather, Today)
- **Rationale:** At-a-glance daily status without navigating to individual pages. Shows TSB/form, current weather + ride window, and German cards due. Calendar and tasks are placeholders until Fantastical and Things 3 are integrated.
- **Implementation:** `WelcomeBanner.tsx` component fetches data in parallel (Strava activities for TSB, Open-Meteo forecast, German vocab for cards due). Auto-collapses after 10 seconds. Tap the center JARVIS frame (desktop) or header frame (mobile) to toggle. Training load functions extracted to shared `lib/training-load.ts` (eliminates duplication between hub and Strava page).
- **Status:** Implemented

### Shared Training Load Library

**Decision:** Extract `computeDailyTSS` and `computeFitness` from Strava page into `lib/training-load.ts`
- **Rationale:** Same TSS/CTL/ATL/TSB computation was duplicated in `bike/strava/page.tsx` and inline in `hub/page.tsx`. Welcome banner needs it too.
- **Status:** Implemented

### Dev Mode Alert Suppression

**Decision:** Suppress backup and Strava sync alerts when running on localhost
- **Rationale:** N8N runs backups and Strava syncs against the production Docker instance on the Mac Mini. The local dev SQLite has different timestamps, causing false alerts. Detected via `window.location.hostname === "localhost"`.
- **Status:** Implemented

### PWA Icon Update

**Decision:** Replace Iron Man helmet outline icons with the JARVIS arc reactor frame image
- **Rationale:** The helmet icon was showing as a generic "J" on iPhone home screen. The arc reactor frame matches the in-app branding and has a solid black background (avoids iOS transparent PNG issues).
- **Implementation:** Resized `jarvis-frame.png` (1024×1024) to apple-touch-icon (180), icon-192, and icon-512. Users must delete and re-add the home screen bookmark to pick up the new icon.
- **Status:** Implemented

### Research Page & LightRAG Semantic Search

**Decision:** Build a Research page with RAG-powered semantic search using LightRAG, OpenRouter (embeddings + Gemini Flash), and Readwise sync
- **Rationale:** User wants to query TrainerRoad podcast transcripts, Readwise articles/highlights, and other knowledge sources via natural language from JARVIS. Semantic search (not keyword) is essential for finding conceptually related content.
- **Architecture:** LightRAG Docker container on Mac Mini builds a knowledge graph from ingested documents. OpenRouter provides embeddings (text-embedding-3-small) and LLM (Gemini 2.5 Flash) for synthesis. SQLite stores document metadata, tags, and sources. LightRAG handles chunking, entity extraction, embeddings, and graph-based retrieval.
- **Key decisions:**
  - LightRAG over simple chunk+embed RAG: knowledge graph enables cross-document reasoning
  - OpenRouter over Ollama: avoids running another local service with security concerns, negligible cost
  - Gemini 2.5 Flash over Claude for RAG synthesis: cheaper and faster
  - Convex evaluated but deferred: LightRAG handles its own vector storage. Full Convex migration noted as future consideration.
  - Auto-classification with user verification: documents auto-tagged on sync, queued for user confirmation
- **Status:** Implemented

### intervals.icu Integration for CTL/ATL/TSB

**Decision:** Pull fitness data (CTL, ATL, TSB) from intervals.icu instead of computing locally
- **Rationale:** JARVIS-computed TSS differs from TrainerRoad by ~8% per ride due to different NP calculations between Strava and TR. intervals.icu has a documented public API and calculates TSS from the same power files.
- **Implementation:** API route `/api/intervals/wellness` fetches daily CTL/ATL. Falls back to local calculation if not configured.
- **Status:** Implemented

### TrainerRoad CTL Method & FTP History

**Decision:** Use TrainerRoad's CTL formula (simple 42-day rolling average) instead of Coggan's EMA, and store FTP history for accurate per-ride TSS
- **Rationale:** TrainerRoad uses a simplified rolling average for CTL, not the standard EMA. FTP history needed because applying current FTP to old rides produces wrong TSS.
- **FTP history:** 2026-01-20 (266), 2026-02-16 (272), 2026-03-18 (275). Next update April 13.
- **Open item:** User wants to revisit TSB calculation. ~8% NP gap between Strava and TR remains.
- **Status:** Implemented (TSB revisit pending)

### Podcast Transcription Pipeline

**Decision:** Use whisper.cpp + yt-dlp to transcribe TrainerRoad podcast episodes and push to LightRAG
- **Rationale:** 444 episodes of Ask a Cycling Coach. Whisper chosen over YouTube auto-captions for cycling jargon accuracy. Chosen over cloud APIs ($155-216) because user prefers free.
- **Implementation:** Shell script on Mac Mini. Downloads audio via yt-dlp, transcribes with whisper.cpp (medium.en), pushes to LightRAG. Runs 8pm-6am during backfill, 3am cron after. Newest episodes first.
- **Status:** Running (backfill in progress)

## 2026-03-26

### Research Page: 3-Level Tag Hierarchy

**Decision:** Replace flat tag classification with a hierarchical taxonomy (up to 4 levels)
- **Rationale:** Flat tags (cycling, nutrition, gear, etc.) were insufficient for browsing a growing knowledge base. User wanted drill-down navigation and the ability to create new tags at any level.
- **Implementation:** New `tag_hierarchy` table with slug-path IDs (e.g., `cycling/training/sweet-spot`). Library tab has breadcrumb drill-down (All > Cycling > Training) with doc counts. Tag Review tab shows document summaries and a hierarchical tag picker. Inline "+" buttons to create tags at any level. Prefix-match queries (`WHERE tag LIKE 'cycling/%'`) for hierarchical filtering. Auto-classification uses hierarchy keywords at most specific level.
- **Hierarchy (v2):** Cycling (Training, Metrics, Racing, Bike Fit & Aero, Gear, Training Science), Nutrition (Macros, Fueling, Diet), Health (Recovery, Injury, Mental), Uncategorized. Gear and Training Science moved under Cycling with Level 4 leaf tags.
- **Status:** Implemented

**Decision:** Add title and summary fallbacks for Readwise documents
- **Rationale:** Many Readwise highlights had "Untitled" as title and no summary, making tag review impossible.
- **Implementation:** Title fallback uses first 80 chars of content. Summary fallback uses first 150 chars of content. Applied in both `getAllResearchDocuments` and `getUnreviewedTags` queries.
- **Status:** Implemented

### Mileage-Based Component Replacement Alerts

**Decision:** Add progress bars and status indicators for component service intervals
- **Rationale:** Components had `serviceIntervalMiles` and `mileageAtInstall` fields but no visual feedback on wear status.
- **Implementation:** `getComponentStatus()` computes usage percentage from bike's Strava mileage. Color-coded: cyan (ok), amber (80%+ check soon), orange (100% due), red (110%+ overdue). Progress bar on each component in Components page. Maintenance Alerts banner at top of Components page. Hub welcome banner Today card shows up to 3 component alerts.
- **Status:** Implemented

### Watchtower for Automatic Docker Updates

**Decision:** Add Watchtower container to auto-update N8N, LightRAG, and cloudflared
- **Rationale:** User received N8N update notification and wanted automated updates for all containers. Cron job approach would require separate entries per container. Watchtower handles all pulled-image containers automatically.
- **Implementation:** Watchtower container in docker-compose.yml. Checks for new images every Sunday 3am Pacific. Auto-pulls, restarts, and cleans up old images. JARVIS container excluded via label (built from source, updated by auto-deploy). N8N image updated to official registry `docker.n8n.io/n8nio/n8n:latest`.
- **Status:** Implemented

### N8N Workflow Backup

**Decision:** Include N8N workflows in the nightly JARVIS backup
- **Rationale:** N8N workflows lived only in the `n8n-data` Docker volume. If the Mac Mini died, workflows would be lost and need manual recreation.
- **Implementation:** Backup POST endpoint now fetches all workflows via N8N's REST API (`http://n8n:5678/api/v1/workflows`) and includes them as `jarvis-n8n-workflows` in the backup JSON. Saved to local file + uploaded to R2. N8N triggers a backup that backs up its own workflows.
- **Status:** Implemented

### Disaster Recovery Documentation

**Decision:** Create comprehensive restore guide and pin it on GitHub
- **Rationale:** User wanted assurance that JARVIS could be fully rebuilt on a new machine, with clear instructions.
- **Implementation:** `docs/RESTORE.md` with 10-step recovery process (clone, env vars, tunnel, Docker, restore from R2, re-sync services, N8N import, podcast pipeline, auto-deploy, Tailscale). Pinned GitHub Issue #1 links to the guide. Estimated 30-minute recovery time.
- **Status:** Implemented

## 2026-03-27

### Ride Notes Feature

**Decision:** Add structured ride notes form to Strava ride detail view
- **Rationale:** User wanted to record subjective data (RPE, nutrition, sleep, GI issues, etc.) alongside Strava ride data for trend analysis and correlation with performance metrics.
- **Implementation:** New `ride_notes` table (flat, one row per activity) with 20+ fields across 5 collapsible sections: Effort (RPE slider, ride type, workout name), Nutrition (calories, carbs/hr auto-calc, bottles, fluid auto-calc, GI issues, electrolytes), Pre-Ride (meal timing, macros, leg freshness, weight), Recovery (sleep hours/quality, cramping), Notes (freeform). Auto-save with 1.5s debounce. Computed fields (carbs/hr, total fluid, w/kg) stored in DB and recalculated on every save. Copy-to-clipboard for TrainerRoad paste. Indoor/outdoor auto-detected from Strava trainer flag. LightRAG indexing on save for natural language queries.
- **Design choices:**
  - Flat table (not normalized): one row per activity makes trend queries trivial for a single-user dashboard
  - Computed fields stored: enables simple SQL trend queries without re-deriving; auto-recalculated on input change so never stale
  - Separate component (`RideNotesPanel.tsx`): keeps the 2300-line Strava page manageable
- **Status:** Implemented

### Layout Audit & Wedge Text Overhaul

**Decision:** Fix nutrition page duplicate title and standardize settings page margins
- **Rationale:** Nutrition page had "Food and Nutrition" title rendered twice. Settings sub-pages (backup, security, extras) used inconsistent `mt-4` vs `mt-6` spacing after Navigation.
- **Implementation:** Removed duplicate title from nutrition card header. Moved "Add Manually" button into a new third input row (label + text input + button) matching the Search and Barcode rows. Added NutritionBackIcon (fork) in upper-right of page header when manual entry form is open. Standardized all settings pages to `mt-6`.
- **Status:** Implemented

**Decision:** Rewrite WedgeSummaryCard text rendering with clipPath + auto-scaling
- **Rationale:** Wedge text frequently extended outside the pie-slice boundary at certain angles. Counter-rotating a rectangular text block inside a pie slice is geometrically impossible to contain at all angles without clipping or scaling.
- **Implementation:**
  - SVG `clipPath` applied to the text group — text physically cannot render outside the wedge boundary, ever
  - Dark semi-transparent backdrop (`rgba(0,0,0,0.35)`) behind text for readability against bright wedge fill
  - Auto-scale: computes the largest font size where the text rectangle fits inside the wedge using inscribed rectangle geometry, with minimum scale 0.55 (centered) or 0.85 (left-aligned)
  - Text positions centered around the rotation pivot (`TC * L`) to minimize clipping
  - Left-aligned mode (German): per-row left boundary shifts based on Y position (`LEFT_BASE_X + y * 0.3`), so entries in the wider part of the wedge use more horizontal space
  - Stronger text shadow for contrast
- **Status:** Implemented

**Decision:** Close welcome banner before opening wedge, with transition delay
- **Rationale:** Wedge position was calculated using `getBoundingClientRect()` which included the 300px welcome banner height. When the banner auto-collapsed or was clicked away, the wedge origin was wrong — wedge appeared disconnected from hub center.
- **Implementation:** `handleIconClick` now closes the banner first (`setBannerOpen(false)`) and delays setting the wedge module by 550ms (CSS transition is 500ms). Wedge position is also recalculated after banner transition completes via a separate useEffect.
- **Status:** Implemented

**Decision:** Configurable dropdown options via Settings page
- **Rationale:** User wanted ride type (TrainerRoad-based) and electrolyte product dropdowns to be extensible without code changes.
- **Implementation:** New `ride_note_options` table with category/label/sort_order. Seeded with 11 ride types (Endurance, Recovery, Tempo, Sweet Spot, Threshold, VO2max, Anaerobic, Sprint, Race, Group Ride, Event) and 2 electrolyte products (Re-Lyte, LMNT). Settings > Cycling page has add/remove UI by category. Designed to support future categories.
- **Status:** Implemented
