# Meatster

USDA Beef Price Analytics Dashboard for Harris Ranch Beef.

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS v4
- **Charts**: Recharts
- **Data Fetching**: TanStack React Query
- **Deployment**: Cloudflare Pages
- **Scheduled Jobs**: Cloudflare Workers (checks for new data every 2 hours)

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

### Scheduled Worker (Data Update Checker)

The scheduled worker checks every 2 hours if new USDA data is available and triggers a rebuild if found.

```bash
cd workers

# Create KV namespace
wrangler kv:namespace create MEATSTER_KV

# Update wrangler.toml with the KV namespace ID

# Set secrets
wrangler secret put CF_API_TOKEN
wrangler secret put CF_ACCOUNT_ID

# Deploy the worker
wrangler deploy
```

Required secrets:
- `CF_API_TOKEN`: Cloudflare API token with Pages edit permissions
- `CF_ACCOUNT_ID`: Your Cloudflare account ID

## Data Source

Price data is sourced from the [USDA Market Price Reporting (MPR) DataMart](https://mpr.datamart.ams.usda.gov/).

## Legacy

The original Python/Dash version is preserved in `app.py`, `predictor.py`, etc.
