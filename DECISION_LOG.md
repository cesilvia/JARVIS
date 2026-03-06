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
