# J.A.R.V.I.S. Nutrition Tracker

A personal nutrition and macro tracking web application built with Next.js.

## Features

- **Ingredient Search**: Search for nutrition information by ingredient name using USDA FoodData Central API
- **Barcode Scanning**: Look up nutrition info by scanning or entering UPC barcodes using Open Food Facts API
- **Macro Calculations**: View nutrition data per serving, per gram, per 100g, or custom amounts
- **Real-time Results**: Fast API responses with clean, modern UI

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## API Integrations

### USDA FoodData Central
- Free API (no key required for basic usage)
- Used for ingredient name searches
- Provides official US nutrition data

### Open Food Facts
- Free, open-source database
- Used for barcode/UPC lookups
- Community-driven nutrition data

## Deployment to Vercel

1. Push your code to GitHub (or GitLab/Bitbucket)

2. Go to [vercel.com](https://vercel.com) and sign in

3. Click "New Project" and import your repository

4. Vercel will automatically detect Next.js and configure the build settings

5. Click "Deploy" - your app will be live in minutes!

### Environment Variables

**USDA API Key (Optional but Recommended)**

The USDA API demo key has rate limits. For better performance, get a free API key:

1. Get a free API key from [USDA FoodData Central API](https://fdc.nal.usda.gov/api-guide.html)
2. Create a `.env.local` file in the project root:
   ```
   USDA_API_KEY=your_api_key_here
   ```
3. For Vercel deployment, add `USDA_API_KEY` in project settings → Environment Variables

The app will use `DEMO_KEY` if no environment variable is set, but it may hit rate limits.

## Project Structure

```
nutrition-app/
├── app/
│   ├── api/
│   │   ├── usda/
│   │   │   └── search/route.ts    # USDA API integration
│   │   └── openfoodfacts/
│   │       └── barcode/route.ts   # Open Food Facts API integration
│   ├── layout.tsx                 # Root layout
│   └── page.tsx                   # Main nutrition tracker page
├── package.json
└── README.md
```

## Next Steps

- [ ] Add recipe search with macro filtering
- [ ] Add camera-based barcode scanning
- [ ] Add saved ingredients/favorites
- [ ] Add meal planning features
- [ ] Connect to Convex backend for data persistence

## License

Private project - All rights reserved
