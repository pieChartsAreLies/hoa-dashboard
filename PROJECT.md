# HOA Dashboard

## Goal

Interactive neighborhood analytics dashboard for Los Paseos of Via Verde (Boca Raton, FL). Visualizes home values vs purchase prices with an interactive map, leaderboards, and deep analytics including estimated equity. POC for a larger-scale home-buyer market research tool. Lives at `paseos.michaelgerstl.com`.

## Tech Stack

- **Data pipeline:** Python (requests, shapely) fetching from PAPA ArcGIS REST API + Freddie Mac PMMS
- **Database:** SQLite (embedded, via better-sqlite3)
- **Frontend:** Next.js 14+, React, TypeScript, Tailwind CSS
- **Map:** Mapbox GL JS via react-map-gl (colored parcel polygons)
- **Charts:** Recharts
- **Deployment:** Docker on homelab (Loki), reverse proxy to paseos.michaelgerstl.com

## Architecture

- `scripts/` -- Python data pipeline (fetch, process, load)
- `data/` -- SQLite DB + GeoJSON parcel polygons
- `src/app/` -- Next.js App Router (map, leaderboards, analytics, community, API routes)
- `src/components/` -- Map, PropertyCard, LeaderboardTable, Charts, EquityCalculator
- `src/lib/` -- DB queries, metric calculations, amortization math

Data flows: PAPA ArcGIS API + Freddie Mac PMMS -> Python scripts -> SQLite + GeoJSON -> Next.js API routes + Mapbox layers

## Constraints

- PAPA assessed values only (no Zillow/Zestimate)
- Equity calculations use assumptions (configurable: down payment %, term) since actual loan terms are unknown
- Data refresh is manual (re-run pipeline). PAPA updates annually.
- Scoped to Los Paseos of Via Verde for POC. Architecture supports expansion to other subdivisions.

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-02-22 | PAPA values only, no Zillow | Official, consistent, no external dependency |
| 2026-02-22 | Colored parcel polygons | Premium look, ArcGIS provides geometry |
| 2026-02-22 | Next.js + Mapbox | Modern, polished, handles polygons natively |
| 2026-02-22 | SQLite embedded | Portable, no infra dependency, real SQL |
| 2026-02-22 | Self-hosted on homelab | User preference, Docker on Loki |
| 2026-02-22 | Estimated equity with configurable assumptions | Historical Freddie Mac rates, settings panel for overrides |
