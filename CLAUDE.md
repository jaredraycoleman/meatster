# Meatster

USDA beef price analytics dashboard for Harris Ranch Beef. Modernized from Python/Dash to TypeScript/React.

## Commands

```bash
npm run dev      # Start dev server at localhost:5173
npm run build    # TypeScript check + Vite build
npm run lint     # ESLint
npm run preview  # Preview production build
npm run deploy   # Build + deploy to Cloudflare Pages
```

For the scheduled worker:
```bash
cd workers
wrangler deploy  # Deploy the data-check scheduler
```

## Architecture

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4 (uses `@tailwindcss/vite` plugin, no config file)
- **Charts**: Recharts
- **Data fetching**: TanStack React Query
- **Deployment**: Cloudflare Pages + Workers

## Key Files

- `src/services/api.ts` - USDA MPR DataMart API integration
- `src/hooks/useApi.ts` - React Query hooks for data fetching
- `src/components/PriceChart.tsx` - Main chart component
- `src/components/FilterPanel.tsx` - Report/section/item filters
- `workers/scheduled-checker.ts` - Cron job that checks for new USDA data every 2 hours

## Code Style

- Use `@/` path alias for imports from `src/`
- Prefer `function` declarations for components, arrow functions for callbacks
- Use Lucide React for icons
- Format dates with `date-fns`
- Custom Tailwind colors defined in `src/index.css`: `beef-red`, `beef-dark`, `ranch-blue`, `ranch-light`

## Data Source

USDA Market Price Reporting API: `https://mpr.datamart.ams.usda.gov/services/v1.1`

Report ID `2457` = National Daily Boxed Beef Cutout & Boxed Beef Cuts (the primary report used).

## Legacy Files

The original Python implementation is preserved but not actively used:
- `app.py` - Original Dash application
- `predictor.py` - Prophet/ARIMA forecasting experiments
- `download.py` - Bulk data download utility
- `requirements.txt` - Python dependencies
