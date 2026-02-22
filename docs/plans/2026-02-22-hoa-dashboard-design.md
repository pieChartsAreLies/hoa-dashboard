# HOA Dashboard Design

**Date:** 2026-02-22
**Status:** Approved

## Goal

Interactive neighborhood analytics dashboard for Los Paseos of Via Verde (Boca Raton, FL). Shows home values vs purchase prices with leaderboards, an interactive Zillow-style map with colored parcel polygons, and deep analytics including estimated equity calculations. Serves as a POC for a larger-scale home-buyer market research tool.

**Audiences:** Personal/neighbors, portfolio piece, investor pitch material.

**Live at:** `paseos.michaelgerstl.com`

## Community

- **Name:** Los Paseos of Via Verde (platted as "LOS PASEOS OF VIA VERDE REPLAT")
- **Location:** Glades Road & Powerline Road, Boca Raton, FL 33433
- **Type:** Gated single-family HOA community
- **Size:** Estimated 100-300 homes
- **HOA site:** paseosboca.com

## Data Sources

### Palm Beach County Property Appraiser (PAPA)
- **ArcGIS REST API:** `https://maps.co.palm-beach.fl.us/arcgis/rest/services/Parcels/Parcels/MapServer`
- Free, no auth, real-time, includes parcel geometries
- Fields: PCN, address, owner, sale price/date, market/assessed values, beds, baths, sqft, lot size, year built, homestead status
- Filter by SUBID (first 10 digits of PCN) to isolate subdivision
- Sale history available for properties with multiple transactions

### Freddie Mac PMMS
- Historical 30-year fixed mortgage rates by month
- Free CSV download
- Used for estimated equity calculations

## Data Model

### Properties Table

| Field | Type | Source |
|-------|------|--------|
| `pcn` | TEXT PK | PAPA - 17-digit parcel control number |
| `address` | TEXT | PAPA |
| `owner_name` | TEXT | PAPA |
| `purchase_price` | REAL | PAPA - last sale price |
| `purchase_date` | DATE | PAPA - last sale date |
| `market_value` | REAL | PAPA - county-appraised market value |
| `assessed_value` | REAL | PAPA - assessed value |
| `bedrooms` | INTEGER | PAPA |
| `bathrooms` | REAL | PAPA |
| `living_sqft` | REAL | PAPA - living area |
| `lot_sqft` | REAL | PAPA - lot size |
| `year_built` | INTEGER | PAPA |
| `homestead` | BOOLEAN | PAPA - homestead exemption flag |
| `latitude` | REAL | ArcGIS centroid |
| `longitude` | REAL | ArcGIS centroid |

### Sale History Table

| Field | Type |
|-------|------|
| `pcn` | TEXT FK |
| `sale_date` | DATE |
| `sale_price` | REAL |
| `buyer` | TEXT |

### Mortgage Rates Table

| Field | Type |
|-------|------|
| `year_month` | TEXT PK (YYYY-MM) |
| `rate_30yr` | REAL |

### Parcel Geometry
Stored as `parcels.geojson` file for Mapbox (not in SQLite).

### Computed Metrics (query-time or views)
- `total_return_pct` = (market_value - purchase_price) / purchase_price
- `annualized_return_pct` = ((market_value / purchase_price) ^ (1 / years_held)) - 1
- `total_gain_dollars` = market_value - purchase_price
- `price_per_sqft_purchase` = purchase_price / living_sqft
- `price_per_sqft_current` = market_value / living_sqft
- `years_held` = years since purchase_date

### Estimated Equity (configurable assumptions)
- Default: 20% down payment, 30-year fixed term
- Historical rate looked up from Freddie Mac PMMS for purchase month
- `original_loan` = purchase_price * (1 - down_payment_pct)
- `remaining_principal` = amortization calculation based on rate, loan amount, months elapsed
- `estimated_equity` = market_value - remaining_principal
- `equity_pct` = estimated_equity / market_value
- `leverage_return` = (estimated_equity - down_payment) / down_payment

## Interactive Map

- **Engine:** Mapbox GL JS via `react-map-gl`
- **Default view:** Centered on Los Paseos, zoomed to full subdivision
- **Parcel polygons:** Lots filled with color gradient based on selected metric
- **Metric selector:** Toggle bar to switch color scheme between:
  - Total return %
  - Annualized return %
  - Total $ gained
  - Current value per sq ft
  - Purchase price per sq ft
  - Estimated equity
  - Years held
- **Hover:** Tooltip with address, selected metric value, purchase date
- **Click:** Side panel with full property detail card, all metrics, purchase vs current value comparison
- **Satellite/street toggle:** Mapbox base layer switcher
- **Community stats bar:** Persistent bar showing aggregate stats (median return, avg price/sqft, total community value)

## Leaderboards

Sortable table with all properties. Named leaderboards:
- **Best Investment** -- highest annualized return %
- **Biggest Winner** -- most $ gained
- **Best Deal** -- lowest purchase price/sqft at time of purchase
- **Most Valuable** -- highest current market value
- **Most Equity Built** -- highest estimated equity $
- **Best Leverage** -- highest equity gain / down payment ratio
- **Newest Buyer / OG Resident** -- most recent vs earliest purchase

Click any row to jump to that parcel on the map.

## Analytics

### Bedroom Analysis
- Avg value, avg return, avg price/sqft grouped by bedroom count (3BR vs 4BR vs 5BR)
- "What's a bedroom worth?" -- implied value of additional bedroom

### Purchase Timing
- Scatter plot: purchase date vs annualized return
- Shows who bought at the right time

### Value Distribution
- Histogram of current market values

### Appreciation Curve
- Line chart: community median value over time using sale history data points

### Price Per Sq Ft Trends
- How $/sqft at purchase has changed for buyers over time

### Holding Period Analysis
- Scatter plot: years held vs return %

### Equity Analysis
- Equity distribution across the community
- Equity by bedroom count
- Configurable assumptions panel (down payment %, term)

## Architecture

### Project Structure
```
hoa-dashboard/
├── scripts/                  # Python data pipeline
│   ├── fetch_papa.py         # Pull data from ArcGIS REST API
│   ├── fetch_rates.py        # Pull Freddie Mac PMMS historical rates
│   ├── process.py            # Clean, compute, load SQLite
│   └── requirements.txt
├── data/
│   ├── hoa.db                # SQLite database
│   └── parcels.geojson       # Parcel polygons for Mapbox
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── page.tsx          # Map view (default landing)
│   │   ├── leaderboards/     # Leaderboards tab
│   │   ├── analytics/        # Charts & breakdowns
│   │   ├── community/        # Community summary
│   │   └── api/              # API routes (query SQLite)
│   ├── components/
│   │   ├── Map/              # Mapbox + parcel polygons
│   │   ├── PropertyCard/     # Detail side panel
│   │   ├── LeaderboardTable/ # Sortable table
│   │   ├── Charts/           # Recharts components
│   │   └── EquityCalculator/ # Configurable assumptions panel
│   └── lib/
│       ├── db.ts             # SQLite query layer (better-sqlite3)
│       ├── metrics.ts        # Computed field calculations
│       └── amortization.ts   # Equity/loan math
├── Dockerfile
├── docker-compose.yml
├── docs/plans/
├── PROJECT.md
└── STATE.md
```

### Data Pipeline Flow
```
PAPA ArcGIS API --> fetch_papa.py --> raw JSON
Freddie Mac PMMS --> fetch_rates.py --> rates CSV
                                          |
                             process.py <--+
                                  |
                         +--------+--------+
                         |                 |
                      hoa.db        parcels.geojson
                         |                 |
                   Next.js API       Mapbox GL JS
                   routes               layer
```

### Key Dependencies
- **Python:** requests, shapely
- **Frontend:** Next.js 14+, react-map-gl, mapbox-gl, recharts, better-sqlite3, tailwindcss
- **Data:** Freddie Mac PMMS (free CSV)

## Deployment

- **Host:** Docker container on homelab (Loki at 192.168.2.16 or new LXC)
- **Domain:** `paseos.michaelgerstl.com`
- **Reverse proxy:** Route through existing ingress with SSL via Let's Encrypt
- **Process:** `next start` in production mode, serves frontend + API routes
- **Data refresh:** Re-run Python pipeline as needed (PAPA updates annually)

## Expansion Path

Architecture is subdivision-agnostic. To add another community:
1. Run Python pipeline with a different SUBID
2. New rows in same SQLite schema
3. Frontend gets community selector dropdown

PAPA ArcGIS covers all ~660K parcels in Palm Beach County. Other FL counties use the same Esri platform -- expanding means swapping the endpoint URL.

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-02-22 | PAPA assessed values only (no Zillow) | Official, defensible, consistent. No external API dependency. |
| 2026-02-22 | Colored parcel polygons on map | Premium look, differentiator vs typical pin maps. ArcGIS provides geometry. |
| 2026-02-22 | Next.js + Mapbox frontend | Modern, polished, handles parcel polygons natively, scales well. |
| 2026-02-22 | SQLite embedded DB | Portable, no external dependency, real SQL queries. Good for POC scale. |
| 2026-02-22 | Self-hosted on homelab | User preference. Docker on Loki, routed via paseos.michaelgerstl.com. |
| 2026-02-22 | Estimated equity with configurable assumptions | 20% down default, 30yr term, historical Freddie Mac rates. Settings panel for overrides. |
