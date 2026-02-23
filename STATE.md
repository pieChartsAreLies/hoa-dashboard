# State

## Current Focus

Phase 1 implementation complete. Ready for deployment and browser testing.

## Status

- [x] Design brainstorming and approval
- [x] Design doc written (`docs/plans/2026-02-22-hoa-dashboard-design.md`)
- [x] Implementation plan (`docs/plans/2026-02-22-hoa-dashboard-implementation.md`)
- [x] Data pipeline (fetch_papa.py, fetch_details.py, fetch_rates.py, process.py)
- [x] Database: 122 homes, 723 sale history records, 659 mortgage rates
- [x] DB query layer + types + metrics + amortization library
- [x] API routes (properties, properties/[pcn], stats, geojson, flips)
- [x] App layout with dark theme and navigation
- [x] Interactive map with colored parcel polygons (7 metric options)
- [x] Property detail side panel (metrics, equity, sale history)
- [x] "What If I Sold Today?" sell scenario modeler
- [x] Leaderboards (9 presets including Best Flips, gold/silver/bronze)
- [x] Analytics charts (5 charts + bedroom placeholder + equity distribution + SOH analysis)
- [x] Equity calculator (configurable down payment %, term, rate source)
- [x] Flip/renovation detection (badges on map, leaderboard, detail panel)
- [x] SOH cap / tax efficiency analysis with tax impact estimates
- [x] Interest rate overlay on purchase timing scatter (color-coded dots)
- [x] Community summary page with stats, property mix, notable sales
- [x] Methodology page (data sources, formulas, disclaimers)
- [x] Community selector UI (coming soon dropdown)
- [x] Docker deployment config (Dockerfile, docker-compose.yml, standalone)
- [ ] Deploy to homelab (Loki) and configure paseos.michaelgerstl.com
- [ ] Browser testing and visual QA

## Known Issues

- Bedrooms/bathrooms NULL for all properties (PAPA requires browser rendering)
- MKT_NOT_CAPPED NULL (SOH uses market_value vs assessed_value gap instead)
- Non-arm's-length transactions filtered at $1,000 threshold
- Docker build not tested locally (needs Loki)

## Data Summary

| Metric | Value |
|--------|-------|
| Properties | 122 single-family |
| Sale history | 723 records |
| Mortgage rates | 659 monthly (1971-2026) |
| Avg market value | $783,219 |
| Total community value | ~$95.4M |
| Homesteaded | 109/122 (89%) |
| Year built | 1976-1982 |
| Living sqft | 1,695-4,849 |

## Next Steps

1. Deploy Docker container to Loki (192.168.2.16)
2. Configure reverse proxy for paseos.michaelgerstl.com with SSL
3. Browser test all pages and interactions
4. Add bedroom/bathroom data (Playwright scraping or manual entry)
5. Phase 2: anonymous comparison, time machine slider, comparable clustering, macro benchmarks, embeddable widget
