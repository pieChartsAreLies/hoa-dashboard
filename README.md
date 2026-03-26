# HOA Dashboard

Interactive neighborhood analytics dashboard for Los Paseos of Via Verde (Boca Raton, FL). Visualizes home values vs purchase prices with an interactive Mapbox map, leaderboards, equity calculations, and market research insights.

## Features

- **Parcel map with metric overlays** -- color-coded choropleth map with toggleable metrics (assessed value, equity, appreciation, sale date, and more)
- **Property detail cards** -- click any parcel to view full property details, tax history, and equity estimates
- **Equity calculator** -- configurable assumptions for down payment, rate, and term with full amortization modeling and equity distribution charts
- **Value leaderboards** -- rank properties by assessed value, equity, appreciation rate, and other metrics
- **Appreciation curves** -- visualize property value growth over time across the community
- **Sell scenario modeler** -- model net proceeds under different sale price and cost assumptions
- **Flip detection** -- badge system identifying properties with short hold periods and significant price changes
- **8 analytical chart types** -- scatter plots, histograms, box plots, pie charts, bar charts, time series, SOH tax analysis, and interest rate overlays

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- A [Mapbox](https://mapbox.com) access token

### Local Development

```bash
git clone https://github.com/pieChartsAreLies/hoa-dashboard.git
cd hoa-dashboard
npm install
```

Create a `.env.local` file:

```
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token_here
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Docker

```bash
docker compose up
```

The app builds as a standalone Next.js container and serves on port 3000.

## Architecture

```
hoa-dashboard/
  src/
    app/            # Next.js 16 App Router pages and API routes
    components/     # React 19 components (Map, Charts, PropertyCard, etc.)
    lib/            # Database access (better-sqlite3), utilities
  scripts/          # Python data pipeline (ArcGIS fetch, PMMS rates, processing)
  data/             # SQLite database, GeoJSON, and intermediate data files
  public/           # Static assets
```

**Frontend:** Next.js 16 with React 19, TypeScript, Tailwind CSS 4, Mapbox GL JS (via react-map-gl), and Recharts for visualization.

**Backend:** Server-side Next.js API routes query an embedded SQLite database using better-sqlite3. No external database server required.

**Data Pipeline:** Python scripts pull parcel and sales data from the PAPA (Palm Beach County Property Appraiser) ArcGIS REST API and mortgage rate data from Freddie Mac's Primary Mortgage Market Survey (PMMS). The pipeline geocodes parcels, computes derived metrics (equity estimates, appreciation rates, flip detection), and writes everything to SQLite.

## Data Sources

- **PAPA ArcGIS REST API** -- Palm Beach County Property Appraiser parcel, sales, and assessment data
- **Freddie Mac PMMS** -- Primary Mortgage Market Survey for historical and current mortgage rates

## Tech Stack

- **Frontend:** Next.js 16, React 19, TypeScript
- **Database:** SQLite (better-sqlite3, embedded)
- **Map:** Mapbox GL JS via react-map-gl
- **Visualization:** Recharts
- **Styling:** Tailwind CSS 4
- **Data Pipeline:** Python (requests, shapely)
- **Deployment:** Docker (standalone Next.js build)

## Screenshots

<!-- TODO: Add screenshots of map view, analytics page, equity calculator -->

## License

[MIT](LICENSE)
