# State

## Current Focus

Interactive map view complete. Next: leaderboards page.

## Status

- [x] Design brainstorming and approval
- [x] Design doc written (`docs/plans/2026-02-22-hoa-dashboard-design.md`)
- [x] Project scaffold (Next.js)
- [x] Data pipeline: fetch PAPA parcels (`scripts/fetch_papa.py` -> `data/papa_raw.json`)
- [x] Data pipeline: fetch Freddie Mac rates (`scripts/fetch_rates.py` -> `data/pmms.csv`)
- [x] Data pipeline: fetch property details (`scripts/fetch_details.py` -> `data/papa_details.json`)
- [x] Process and load SQLite (`scripts/process.py` -> `data/hoa.db` + `data/parcels.geojson`)
- [x] DB query layer + types (`src/lib/db.ts`, `src/lib/types.ts`)
- [x] Metrics + amortization library (`src/lib/metrics.ts`, `src/lib/amortization.ts`)
- [x] API routes (`src/app/api/` -- properties, stats, geojson, flips)
- [x] Frontend scaffold: layout, navigation, dark theme
- [x] Map view with parcel polygons
- [ ] Leaderboards
- [ ] Analytics charts
- [ ] Equity calculator
- [ ] Docker deployment
- [ ] DNS + reverse proxy setup

## Known Issues

- Bedrooms/bathrooms NOT available from any public PAPA API or Florida DOR data. PAPA website renders these via JavaScript SPA; the MapDetails endpoint and state NAL files lack these fields. May need to add manually or find alternative source.
- 122 single-family homes confirmed in the subdivision (plus 20 common areas, 1 vacant)
- Year built range is 1976-1982 (all original construction)
- Sale history includes non-arm's-length transactions ($1, $10 sales) that skew return calculations. The flips query and avg_return_pct in stats are affected. Consider filtering sale_price > 1000 or similar threshold for meaningful analysis.

## Next Steps

Build the leaderboards page with sortable tables and ranking views.
