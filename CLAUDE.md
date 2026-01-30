# Meatster

USDA beef price analytics dashboard. Modernized from Python/Dash to TypeScript/React.

## Commands

```bash
npm run dev      # Start dev server at localhost:5173
npm run build    # TypeScript check + Vite build
npm run lint     # ESLint
npm run preview  # Preview production build
npm run deploy   # Build + deploy to Cloudflare Pages
```

Data updates are handled by GitHub Actions (`.github/workflows/update-data.yml`).

## Architecture

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4 (uses `@tailwindcss/vite` plugin, no config file)
- **Charts**: Recharts
- **Data fetching**: TanStack React Query
- **Deployment**: Cloudflare Pages + Workers

## Key Files

- `src/services/staticApi.ts` - Loads pre-generated JSON data from `/data/`
- `src/hooks/useApi.ts` - React Query hooks for data fetching
- `src/components/PriceChart.tsx` - Main chart component
- `src/components/FilterPanel.tsx` - Report/section/item filters
- `scripts/generate-data.ts` - Build-time script that fetches USDA data and writes static JSON
- `scripts/check-for-updates.ts` - Compares USDA published timestamps to detect new data

## Code Style

- Use `@/` path alias for imports from `src/`
- Prefer `function` declarations for components, arrow functions for callbacks
- Use Lucide React for icons
- Format dates with `date-fns`
- Custom Tailwind colors defined in `src/index.css`: `beef-red`, `beef-dark`, `ranch-blue`, `ranch-light`

## Data Source

USDA Market Price Reporting API: `https://mpr.datamart.ams.usda.gov/services/v1.1`

Key reports:
- `2453` = National Daily Boxed Beef Cutout (PM) - publishes ~2:30 PM ET weekdays, used for update checking
- `2457` = National Weekly Boxed Beef Cuts for Branded Product (app default)
- `2459` = National Daily Boxed Beef Cutout (Comprehensive) - also checked for updates

## Legacy Files

The original Python implementation is preserved but not actively used:
- `app.py` - Original Dash application
- `predictor.py` - Prophet/ARIMA forecasting experiments
- `download.py` - Bulk data download utility
- `requirements.txt` - Python dependencies
