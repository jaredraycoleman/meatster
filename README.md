# Kaani

USDA Beef Price Analytics Dashboard.

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS v4
- **Charts**: Recharts
- **Data Fetching**: TanStack React Query
- **Deployment**: Cloudflare Pages
- **Scheduled Jobs**: GitHub Actions (checks for new USDA data during business hours)

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Deployment

### Cloudflare Pages

1. Connect your GitHub repository to Cloudflare Pages
2. Set build command: `npm run build`
3. Set output directory: `dist`

### Automated Data Updates

GitHub Actions workflow (`.github/workflows/update-data.yml`) checks every 30 minutes during USDA business hours for new data and triggers a rebuild if found.

Required secrets:
- `CLOUDFLARE_API_TOKEN`: Cloudflare API token with Pages edit permissions
- `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare account ID

## Data Source

Price data is sourced from the [USDA Market Price Reporting (MPR) DataMart](https://mpr.datamart.ams.usda.gov/).

## Legacy

The original Python/Dash version is preserved in `app.py`, `predictor.py`, etc.
