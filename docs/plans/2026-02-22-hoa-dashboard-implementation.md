# HOA Dashboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an interactive neighborhood analytics dashboard for Los Paseos of Via Verde with a Zillow-style map, leaderboards, and deep investment analytics.

**Architecture:** Python data pipeline fetches property data from PAPA ArcGIS API + scrapes PAPA web for bed/bath/sqft details, loads into SQLite. Next.js frontend serves an interactive Mapbox map with colored parcel polygons, leaderboard tables, and Recharts analytics. Self-hosted via Docker on homelab.

**Tech Stack:** Python 3.11+, Next.js 14+, TypeScript, Tailwind CSS, Mapbox GL JS, Recharts, better-sqlite3, Docker

---

## Phase Roadmap

| Phase | Scope | Description |
|-------|-------|-------------|
| **1** | Full Build | Data pipeline, map, leaderboards, analytics, equity calculator, "What If" sell scenario, flip detection, SOH cap analysis, rate overlay on charts, methodology page, community selector UI (coming soon), Docker deploy |
| **2** | Engagement & Depth | Anonymous comparison tool, time machine slider, comparable sale clustering, macro benchmark overlays (S&P 500, Case-Shiller), embeddable property widget |

---

## Phase 1: Core MVP

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.mjs`, `postcss.config.mjs`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
- Create: `.gitignore`, `.env.local.example`
- Create: `scripts/requirements.txt`

**Step 1: Initialize Next.js project**

```bash
cd /Users/llama/Development/hoa-dashboard
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --no-import-alias --use-npm
```

Accept overwrite prompts for existing files. This scaffolds the full Next.js project with App Router, TypeScript, and Tailwind.

**Step 2: Install frontend dependencies**

```bash
cd /Users/llama/Development/hoa-dashboard
npm install react-map-gl mapbox-gl recharts better-sqlite3 @turf/centroid
npm install -D @types/better-sqlite3
```

**Step 3: Create Python requirements file**

```
# scripts/requirements.txt
requests>=2.31.0
shapely>=2.0.0
```

**Step 4: Create .env.local.example**

```
# .env.local.example
NEXT_PUBLIC_MAPBOX_TOKEN=<your-mapbox-token>
```

**Step 5: Create .gitignore additions**

Append to `.gitignore`:
```
# Data files
data/*.db
data/*.geojson
.env.local

# Python
scripts/__pycache__/
scripts/*.pyc
venv/
```

**Step 6: Create data directory**

```bash
mkdir -p /Users/llama/Development/hoa-dashboard/data
mkdir -p /Users/llama/Development/hoa-dashboard/scripts
```

**Step 7: Verify dev server starts**

```bash
cd /Users/llama/Development/hoa-dashboard && npm run dev
```

Expected: Next.js dev server starts on http://localhost:3000

**Step 8: Commit**

```bash
git add -A && git commit -m "scaffold: Next.js project with dependencies"
```

---

### Task 2: Python Data Pipeline -- Fetch PAPA Parcels

**Files:**
- Create: `scripts/fetch_papa.py`

**Step 1: Write the fetch script**

This script queries the PAPA ArcGIS FeatureServer for all parcels in the Los Paseos subdivision. Key details:
- Endpoint: `https://gis.pbcgov.org/arcgis/rest/services/Parcels/PARCEL_INFO/FeatureServer/4/query`
- Filter: `SUBDIV_NAME LIKE '%LOS PASEOS OF VIA VERDE%'`
- Must paginate (max 1000 records per request) using `resultOffset` and `orderByFields=OBJECTID ASC`
- Request geometry in GeoJSON format (`f=geojson`) for parcel polygons
- Fields: `PARID,SITE_ADDR_STR,OWNER_NAME1,PRICE,SALE_DATE,TOTAL_MARKET,ASSESSED_VAL,PROPERTY_USE,HMSTD_FLG,ACRES,SUBDIV_NAME`
- Save raw response to `data/papa_raw.json`

```python
"""Fetch all parcels in Los Paseos of Via Verde from PAPA ArcGIS API."""
import json
import requests
import sys
from pathlib import Path

BASE_URL = "https://gis.pbcgov.org/arcgis/rest/services/Parcels/PARCEL_INFO/FeatureServer/4/query"
SUBDIV_FILTER = "SUBDIV_NAME LIKE '%LOS PASEOS OF VIA VERDE%'"
OUT_FIELDS = "PARID,SITE_ADDR_STR,OWNER_NAME1,PRICE,SALE_DATE,Q_SALE_DATE,TOTAL_MARKET,ASSESSED_VAL,MKT_NOT_CAPPED,LAND_MARKET,IMPRV_MRKT,PROPERTY_USE,HMSTD_FLG,ACRES,SUBDIV_NAME,YEAR_ADDED,MONTHS_SINCE_SALE"
PAGE_SIZE = 1000
DATA_DIR = Path(__file__).parent.parent / "data"


def fetch_all_parcels():
    """Fetch all parcels with pagination."""
    all_features = []
    offset = 0

    while True:
        params = {
            "where": SUBDIV_FILTER,
            "outFields": OUT_FIELDS,
            "orderByFields": "OBJECTID ASC",
            "resultOffset": offset,
            "resultRecordCount": PAGE_SIZE,
            "outSR": 4326,
            "f": "geojson",
            "returnGeometry": "true",
        }
        print(f"Fetching offset {offset}...")
        resp = requests.get(BASE_URL, params=params, timeout=60)
        resp.raise_for_status()
        data = resp.json()

        features = data.get("features", [])
        if not features:
            break

        all_features.extend(features)
        print(f"  Got {len(features)} features (total: {len(all_features)})")

        if len(features) < PAGE_SIZE:
            break
        offset += PAGE_SIZE

    return {"type": "FeatureCollection", "features": all_features}


def main():
    DATA_DIR.mkdir(exist_ok=True)
    print(f"Fetching parcels matching: {SUBDIV_FILTER}")
    geojson = fetch_all_parcels()
    print(f"\nTotal parcels fetched: {len(geojson['features'])}")

    out_path = DATA_DIR / "papa_raw.json"
    with open(out_path, "w") as f:
        json.dump(geojson, f, indent=2)
    print(f"Saved to {out_path}")

    # Print sample record for verification
    if geojson["features"]:
        sample = geojson["features"][0]["properties"]
        print(f"\nSample record:")
        for k, v in sample.items():
            print(f"  {k}: {v}")


if __name__ == "__main__":
    main()
```

**Step 2: Run the fetch script**

```bash
cd /Users/llama/Development/hoa-dashboard && python3 scripts/fetch_papa.py
```

Expected: Prints total parcels fetched (100-300 range), saves `data/papa_raw.json`. Inspect the sample record to verify fields are populated.

**Step 3: Commit**

```bash
git add scripts/fetch_papa.py scripts/requirements.txt && git commit -m "feat: PAPA ArcGIS parcel fetch script"
```

---

### Task 3: Python Data Pipeline -- Scrape PAPA Property Details (bed/bath/sqft)

**Files:**
- Create: `scripts/fetch_details.py`

The ArcGIS API does not include bedrooms, bathrooms, or square footage. These must be scraped from individual property detail pages on `pbcpao.gov`.

**Step 1: Investigate the PAPA property detail page**

Navigate to `https://pbcpao.gov/` and search for one address from the raw data (e.g., 20852 Soneto Drive). Identify:
- The URL pattern for individual property pages (likely `https://pbcpao.gov/Property/Details/{PCN}` or similar)
- Where beds, baths, living sqft, year built, lot sqft appear in the HTML or API response
- Whether there's an XHR/fetch call that returns structured JSON (check network tab)

**Step 2: Write the detail scraper**

Based on the page structure found in Step 1, write a script that:
- Reads `data/papa_raw.json` for the list of PCNs
- For each PCN, fetches the property detail page/API
- Extracts: bedrooms, bathrooms, living_sqft, lot_sqft, year_built
- Also extracts sale history (all prior sales, not just the most recent)
- Adds a polite delay between requests (0.5-1 second)
- Saves enriched data to `data/papa_details.json`

The exact implementation depends on what Step 1 reveals about the page structure. The script should be resilient to missing fields and log any PCNs that fail.

**Step 3: Run the detail scraper**

```bash
cd /Users/llama/Development/hoa-dashboard && python3 scripts/fetch_details.py
```

Expected: Enriches each parcel with bed/bath/sqft data. May take 2-5 minutes for 100-300 properties with polite delays.

**Step 4: Commit**

```bash
git add scripts/fetch_details.py && git commit -m "feat: PAPA property detail scraper for bed/bath/sqft"
```

---

### Task 4: Python Data Pipeline -- Fetch Freddie Mac Rates

**Files:**
- Create: `scripts/fetch_rates.py`

**Step 1: Write the rates fetch script**

```python
"""Fetch historical 30-year fixed mortgage rates from FRED."""
import csv
import requests
from pathlib import Path

FRED_URL = "https://fred.stlouisfed.org/graph/fredgraph.csv?id=MORTGAGE30US"
DATA_DIR = Path(__file__).parent.parent / "data"


def fetch_rates():
    """Download FRED PMMS CSV and convert to monthly averages."""
    print("Fetching Freddie Mac PMMS data from FRED...")
    resp = requests.get(FRED_URL, timeout=30)
    resp.raise_for_status()

    # Parse weekly data
    lines = resp.text.strip().split("\n")
    reader = csv.DictReader(lines)

    # Aggregate to monthly averages
    monthly = {}
    for row in reader:
        date_str = row["observation_date"]  # YYYY-MM-DD
        rate_str = row["MORTGAGE30US"]
        if rate_str == ".":  # Missing data marker
            continue
        year_month = date_str[:7]  # YYYY-MM
        rate = float(rate_str)
        if year_month not in monthly:
            monthly[year_month] = []
        monthly[year_month].append(rate)

    # Average each month
    rates = []
    for ym in sorted(monthly.keys()):
        avg_rate = sum(monthly[ym]) / len(monthly[ym])
        rates.append({"year_month": ym, "rate_30yr": round(avg_rate, 2)})

    # Save
    DATA_DIR.mkdir(exist_ok=True)
    out_path = DATA_DIR / "mortgage_rates.csv"
    with open(out_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["year_month", "rate_30yr"])
        writer.writeheader()
        writer.writerows(rates)

    print(f"Saved {len(rates)} monthly rates to {out_path}")
    print(f"Date range: {rates[0]['year_month']} to {rates[-1]['year_month']}")
    print(f"Current rate: {rates[-1]['rate_30yr']}%")


if __name__ == "__main__":
    fetch_rates()
```

**Step 2: Run it**

```bash
cd /Users/llama/Development/hoa-dashboard && python3 scripts/fetch_rates.py
```

Expected: Saves `data/mortgage_rates.csv` with ~650+ monthly rate records from 1971 to present.

**Step 3: Commit**

```bash
git add scripts/fetch_rates.py && git commit -m "feat: Freddie Mac PMMS rate fetch script"
```

---

### Task 5: Python Data Pipeline -- Process and Load SQLite

**Files:**
- Create: `scripts/process.py`

**Step 1: Write the processing script**

This script:
1. Reads `data/papa_raw.json` (ArcGIS data with geometry)
2. Reads `data/papa_details.json` (scraped bed/bath/sqft/sale history)
3. Reads `data/mortgage_rates.csv` (FRED rates)
4. Joins ArcGIS + detail data on PCN
5. Creates SQLite tables: `properties`, `sale_history`, `mortgage_rates`
6. Extracts parcel polygons into `data/parcels.geojson` for Mapbox
7. Computes centroids for each parcel (latitude/longitude)

```python
"""Process raw PAPA data and load into SQLite."""
import csv
import json
import sqlite3
from datetime import datetime
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"
DB_PATH = DATA_DIR / "hoa.db"


def create_schema(conn):
    """Create database tables."""
    conn.executescript("""
        DROP TABLE IF EXISTS properties;
        DROP TABLE IF EXISTS sale_history;
        DROP TABLE IF EXISTS mortgage_rates;

        CREATE TABLE properties (
            pcn TEXT PRIMARY KEY,
            address TEXT,
            owner_name TEXT,
            purchase_price REAL,
            purchase_date TEXT,
            market_value REAL,
            assessed_value REAL,
            market_uncapped REAL,
            land_value REAL,
            improvement_value REAL,
            bedrooms INTEGER,
            bathrooms REAL,
            living_sqft REAL,
            lot_sqft REAL,
            year_built INTEGER,
            homestead INTEGER,
            latitude REAL,
            longitude REAL,
            property_use TEXT,
            acres REAL
        );

        CREATE TABLE sale_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pcn TEXT REFERENCES properties(pcn),
            sale_date TEXT,
            sale_price REAL,
            buyer TEXT
        );

        CREATE TABLE mortgage_rates (
            year_month TEXT PRIMARY KEY,
            rate_30yr REAL
        );
    """)


def load_mortgage_rates(conn):
    """Load FRED mortgage rate data."""
    rates_path = DATA_DIR / "mortgage_rates.csv"
    with open(rates_path) as f:
        reader = csv.DictReader(f)
        rows = [(r["year_month"], float(r["rate_30yr"])) for r in reader]
    conn.executemany(
        "INSERT INTO mortgage_rates (year_month, rate_30yr) VALUES (?, ?)", rows
    )
    print(f"Loaded {len(rows)} mortgage rate records")


def epoch_to_date(epoch_ms):
    """Convert ArcGIS epoch milliseconds to YYYY-MM-DD string."""
    if not epoch_ms:
        return None
    try:
        return datetime.utcfromtimestamp(epoch_ms / 1000).strftime("%Y-%m-%d")
    except (ValueError, TypeError, OSError):
        return None


def parse_price(price_str):
    """Parse price string to float."""
    if not price_str:
        return None
    try:
        cleaned = str(price_str).replace(",", "").replace("$", "").strip()
        if not cleaned or cleaned == "0":
            return None
        return float(cleaned)
    except (ValueError, TypeError):
        return None


def compute_centroid(geometry):
    """Compute centroid of a GeoJSON polygon."""
    if not geometry or geometry["type"] not in ("Polygon", "MultiPolygon"):
        return None, None
    try:
        if geometry["type"] == "Polygon":
            coords = geometry["coordinates"][0]
        else:
            # Use first polygon of multipolygon
            coords = geometry["coordinates"][0][0]
        lngs = [c[0] for c in coords]
        lats = [c[1] for c in coords]
        return sum(lats) / len(lats), sum(lngs) / len(lngs)
    except (IndexError, TypeError):
        return None, None


def process():
    """Main processing pipeline."""
    # Load raw ArcGIS data
    with open(DATA_DIR / "papa_raw.json") as f:
        raw = json.load(f)
    print(f"Loaded {len(raw['features'])} parcels from ArcGIS")

    # Load scraped details (if available)
    details_path = DATA_DIR / "papa_details.json"
    details = {}
    if details_path.exists():
        with open(details_path) as f:
            details_list = json.load(f)
        details = {d["pcn"]: d for d in details_list}
        print(f"Loaded {len(details)} detail records")

    # Create GeoJSON for Mapbox (just polygons with PCN as id)
    map_features = []
    for feat in raw["features"]:
        if feat.get("geometry"):
            map_features.append({
                "type": "Feature",
                "id": feat["properties"]["PARID"],
                "properties": {"pcn": feat["properties"]["PARID"]},
                "geometry": feat["geometry"],
            })
    geojson = {"type": "FeatureCollection", "features": map_features}
    geojson_path = DATA_DIR / "parcels.geojson"
    with open(geojson_path, "w") as f:
        json.dump(geojson, f)
    print(f"Saved {len(map_features)} parcel polygons to {geojson_path}")

    # Process and load into SQLite
    conn = sqlite3.connect(DB_PATH)
    create_schema(conn)
    load_mortgage_rates(conn)

    property_rows = []
    sale_rows = []

    for feat in raw["features"]:
        props = feat["properties"]
        pcn = props.get("PARID")
        if not pcn:
            continue

        lat, lng = compute_centroid(feat.get("geometry"))
        detail = details.get(pcn, {})

        # Parse sale date from epoch ms
        sale_date = epoch_to_date(props.get("SALE_DATE") or props.get("Q_SALE_DATE"))
        purchase_price = parse_price(props.get("PRICE"))

        property_rows.append((
            pcn,
            props.get("SITE_ADDR_STR", "").strip(),
            props.get("OWNER_NAME1", "").strip(),
            purchase_price,
            sale_date,
            props.get("TOTAL_MARKET"),
            props.get("ASSESSED_VAL"),
            props.get("MKT_NOT_CAPPED"),
            props.get("LAND_MARKET"),
            props.get("IMPRV_MRKT"),
            detail.get("bedrooms"),
            detail.get("bathrooms"),
            detail.get("living_sqft"),
            detail.get("lot_sqft"),
            detail.get("year_built"),
            1 if props.get("HMSTD_FLG") in ("Y", "YES", "1", True) else 0,
            lat,
            lng,
            props.get("PROPERTY_USE", "").strip(),
            props.get("ACRES"),
        ))

        # Sale history from detail scrape
        for sale in detail.get("sale_history", []):
            sale_rows.append((
                pcn,
                sale.get("date"),
                parse_price(sale.get("price")),
                sale.get("buyer"),
            ))

    conn.executemany("""
        INSERT INTO properties (
            pcn, address, owner_name, purchase_price, purchase_date,
            market_value, assessed_value, market_uncapped, land_value,
            improvement_value, bedrooms, bathrooms, living_sqft, lot_sqft,
            year_built, homestead, latitude, longitude, property_use, acres
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, property_rows)
    print(f"Inserted {len(property_rows)} properties")

    if sale_rows:
        conn.executemany("""
            INSERT INTO sale_history (pcn, sale_date, sale_price, buyer)
            VALUES (?, ?, ?, ?)
        """, sale_rows)
        print(f"Inserted {len(sale_rows)} sale history records")

    conn.commit()

    # Summary stats
    cur = conn.execute("SELECT COUNT(*), AVG(market_value), AVG(purchase_price) FROM properties WHERE market_value > 0")
    count, avg_market, avg_purchase = cur.fetchone()
    print(f"\nSummary: {count} properties with values")
    print(f"  Avg market value: ${avg_market:,.0f}" if avg_market else "  No market values")
    print(f"  Avg purchase price: ${avg_purchase:,.0f}" if avg_purchase else "  No purchase prices")

    conn.close()
    print(f"\nDatabase saved to {DB_PATH}")


if __name__ == "__main__":
    process()
```

**Step 2: Run it (after Tasks 2-4 have produced data files)**

```bash
cd /Users/llama/Development/hoa-dashboard && python3 scripts/process.py
```

Expected: Creates `data/hoa.db` with populated tables and `data/parcels.geojson`.

**Step 3: Verify the database**

```bash
cd /Users/llama/Development/hoa-dashboard && sqlite3 data/hoa.db "SELECT COUNT(*) FROM properties; SELECT address, purchase_price, market_value FROM properties LIMIT 5;"
```

**Step 4: Commit**

```bash
git add scripts/process.py && git commit -m "feat: data processing pipeline, SQLite loader, GeoJSON extractor"
```

---

### Task 6: Database Query Layer (TypeScript)

**Files:**
- Create: `src/lib/db.ts`
- Create: `src/lib/types.ts`

**Step 1: Write the types**

```typescript
// src/lib/types.ts
export interface Property {
  pcn: string;
  address: string;
  owner_name: string;
  purchase_price: number | null;
  purchase_date: string | null;
  market_value: number | null;
  assessed_value: number | null;
  market_uncapped: number | null;
  land_value: number | null;
  improvement_value: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  living_sqft: number | null;
  lot_sqft: number | null;
  year_built: number | null;
  homestead: boolean;
  latitude: number | null;
  longitude: number | null;
  property_use: string;
  acres: number | null;
}

export interface PropertyWithMetrics extends Property {
  total_return_pct: number | null;
  annualized_return_pct: number | null;
  total_gain_dollars: number | null;
  price_per_sqft_purchase: number | null;
  price_per_sqft_current: number | null;
  years_held: number | null;
}

export interface SaleRecord {
  pcn: string;
  sale_date: string;
  sale_price: number | null;
  buyer: string | null;
}

export interface MortgageRate {
  year_month: string;
  rate_30yr: number;
}

export interface CommunityStats {
  total_properties: number;
  total_community_value: number;
  median_market_value: number;
  median_return_pct: number;
  avg_price_per_sqft: number;
  avg_bedrooms: number;
  avg_living_sqft: number;
}
```

**Step 2: Write the database query layer**

```typescript
// src/lib/db.ts
import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "hoa.db");

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH, { readonly: true });
    db.pragma("journal_mode = WAL");
  }
  return db;
}

export function getAllProperties() {
  return getDb().prepare(`
    SELECT *,
      CASE WHEN purchase_price > 0 AND market_value > 0
        THEN ROUND((market_value - purchase_price) * 100.0 / purchase_price, 2)
        ELSE NULL END as total_return_pct,
      CASE WHEN purchase_price > 0 AND market_value > 0 AND purchase_date IS NOT NULL
        THEN ROUND((julianday('now') - julianday(purchase_date)) / 365.25, 1)
        ELSE NULL END as years_held,
      CASE WHEN purchase_price > 0 AND market_value > 0
        THEN ROUND(market_value - purchase_price, 0)
        ELSE NULL END as total_gain_dollars,
      CASE WHEN purchase_price > 0 AND living_sqft > 0
        THEN ROUND(purchase_price / living_sqft, 2)
        ELSE NULL END as price_per_sqft_purchase,
      CASE WHEN market_value > 0 AND living_sqft > 0
        THEN ROUND(market_value / living_sqft, 2)
        ELSE NULL END as price_per_sqft_current
    FROM properties
    WHERE market_value > 0
    ORDER BY address
  `).all();
}

export function getPropertyByPcn(pcn: string) {
  return getDb().prepare("SELECT * FROM properties WHERE pcn = ?").get(pcn);
}

export function getSaleHistory(pcn: string) {
  return getDb().prepare(
    "SELECT * FROM sale_history WHERE pcn = ? ORDER BY sale_date DESC"
  ).all(pcn);
}

export function getMortgageRate(yearMonth: string) {
  return getDb().prepare(
    "SELECT rate_30yr FROM mortgage_rates WHERE year_month = ?"
  ).get(yearMonth);
}

export function getAllMortgageRates() {
  return getDb().prepare(
    "SELECT * FROM mortgage_rates ORDER BY year_month"
  ).all();
}

export function getCommunityStats() {
  return getDb().prepare(`
    SELECT
      COUNT(*) as total_properties,
      SUM(market_value) as total_community_value,
      AVG(market_value) as avg_market_value,
      AVG(CASE WHEN purchase_price > 0 AND market_value > 0
        THEN (market_value - purchase_price) * 100.0 / purchase_price
        ELSE NULL END) as avg_return_pct,
      AVG(CASE WHEN market_value > 0 AND living_sqft > 0
        THEN market_value / living_sqft ELSE NULL END) as avg_price_per_sqft,
      AVG(bedrooms) as avg_bedrooms,
      AVG(living_sqft) as avg_living_sqft
    FROM properties
    WHERE market_value > 0
  `).get();
}

export function getPropertiesByBedrooms() {
  return getDb().prepare(`
    SELECT
      bedrooms,
      COUNT(*) as count,
      ROUND(AVG(market_value), 0) as avg_value,
      ROUND(AVG(CASE WHEN purchase_price > 0
        THEN (market_value - purchase_price) * 100.0 / purchase_price
        ELSE NULL END), 2) as avg_return_pct,
      ROUND(AVG(CASE WHEN living_sqft > 0
        THEN market_value / living_sqft ELSE NULL END), 2) as avg_price_per_sqft
    FROM properties
    WHERE bedrooms IS NOT NULL AND market_value > 0
    GROUP BY bedrooms
    ORDER BY bedrooms
  `).all();
}
```

**Step 3: Verify it compiles**

```bash
cd /Users/llama/Development/hoa-dashboard && npx tsc --noEmit src/lib/db.ts src/lib/types.ts
```

**Step 4: Commit**

```bash
git add src/lib/db.ts src/lib/types.ts && git commit -m "feat: SQLite query layer and TypeScript types"
```

---

### Task 7: Metrics and Amortization Library

**Files:**
- Create: `src/lib/metrics.ts`
- Create: `src/lib/amortization.ts`

**Step 1: Write amortization module**

```typescript
// src/lib/amortization.ts

export interface EquityParams {
  purchasePrice: number;
  downPaymentPct: number;  // e.g., 0.20 for 20%
  annualRate: number;       // e.g., 6.5 for 6.5%
  termYears: number;        // e.g., 30
  monthsElapsed: number;
  currentMarketValue: number;
}

export interface EquityResult {
  downPayment: number;
  originalLoan: number;
  monthlyPayment: number;
  remainingPrincipal: number;
  totalPrincipalPaid: number;
  estimatedEquity: number;
  equityPct: number;
  leverageReturn: number;
}

export function calculateEquity(params: EquityParams): EquityResult {
  const { purchasePrice, downPaymentPct, annualRate, termYears, monthsElapsed, currentMarketValue } = params;

  const downPayment = purchasePrice * downPaymentPct;
  const originalLoan = purchasePrice - downPayment;
  const monthlyRate = annualRate / 100 / 12;
  const totalPayments = termYears * 12;

  // Monthly payment (standard amortization formula)
  let monthlyPayment: number;
  if (monthlyRate === 0) {
    monthlyPayment = originalLoan / totalPayments;
  } else {
    monthlyPayment = originalLoan * (monthlyRate * Math.pow(1 + monthlyRate, totalPayments))
      / (Math.pow(1 + monthlyRate, totalPayments) - 1);
  }

  // Remaining principal after N months
  let remainingPrincipal: number;
  const capped = Math.min(monthsElapsed, totalPayments);
  if (monthlyRate === 0) {
    remainingPrincipal = originalLoan - (monthlyPayment * capped);
  } else {
    remainingPrincipal = originalLoan * Math.pow(1 + monthlyRate, capped)
      - monthlyPayment * (Math.pow(1 + monthlyRate, capped) - 1) / monthlyRate;
  }
  remainingPrincipal = Math.max(0, remainingPrincipal);

  const totalPrincipalPaid = originalLoan - remainingPrincipal;
  const estimatedEquity = currentMarketValue - remainingPrincipal;
  const equityPct = currentMarketValue > 0 ? estimatedEquity / currentMarketValue : 0;
  const leverageReturn = downPayment > 0 ? (estimatedEquity - downPayment) / downPayment : 0;

  return {
    downPayment: Math.round(downPayment),
    originalLoan: Math.round(originalLoan),
    monthlyPayment: Math.round(monthlyPayment),
    remainingPrincipal: Math.round(remainingPrincipal),
    totalPrincipalPaid: Math.round(totalPrincipalPaid),
    estimatedEquity: Math.round(estimatedEquity),
    equityPct: Math.round(equityPct * 1000) / 1000,
    leverageReturn: Math.round(leverageReturn * 1000) / 1000,
  };
}
```

**Step 2: Write metrics module**

```typescript
// src/lib/metrics.ts

export function annualizedReturn(purchasePrice: number, currentValue: number, yearsHeld: number): number | null {
  if (purchasePrice <= 0 || currentValue <= 0 || yearsHeld <= 0) return null;
  return (Math.pow(currentValue / purchasePrice, 1 / yearsHeld) - 1) * 100;
}

export function totalReturnPct(purchasePrice: number, currentValue: number): number | null {
  if (purchasePrice <= 0 || currentValue <= 0) return null;
  return ((currentValue - purchasePrice) / purchasePrice) * 100;
}

export function pricePerSqft(price: number, sqft: number): number | null {
  if (price <= 0 || sqft <= 0) return null;
  return price / sqft;
}

export function yearsHeld(purchaseDateStr: string): number | null {
  if (!purchaseDateStr) return null;
  const purchaseDate = new Date(purchaseDateStr);
  const now = new Date();
  const diffMs = now.getTime() - purchaseDate.getTime();
  return diffMs / (1000 * 60 * 60 * 24 * 365.25);
}

export function monthsElapsed(purchaseDateStr: string): number {
  if (!purchaseDateStr) return 0;
  const purchase = new Date(purchaseDateStr);
  const now = new Date();
  return (now.getFullYear() - purchase.getFullYear()) * 12
    + (now.getMonth() - purchase.getMonth());
}

export function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return "N/A";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

export function formatPct(value: number | null, decimals = 1): string {
  if (value === null || value === undefined) return "N/A";
  return `${value.toFixed(decimals)}%`;
}
```

**Step 3: Commit**

```bash
git add src/lib/metrics.ts src/lib/amortization.ts && git commit -m "feat: metrics calculations and amortization library"
```

---

### Task 8: API Routes

**Files:**
- Create: `src/app/api/properties/route.ts`
- Create: `src/app/api/properties/[pcn]/route.ts`
- Create: `src/app/api/stats/route.ts`
- Create: `src/app/api/geojson/route.ts`

**Step 1: Write the properties list API**

```typescript
// src/app/api/properties/route.ts
import { NextResponse } from "next/server";
import { getAllProperties } from "@/lib/db";

export async function GET() {
  const properties = getAllProperties();
  return NextResponse.json(properties);
}
```

**Step 2: Write the single property API**

```typescript
// src/app/api/properties/[pcn]/route.ts
import { NextResponse } from "next/server";
import { getPropertyByPcn, getSaleHistory, getMortgageRate } from "@/lib/db";

export async function GET(request: Request, { params }: { params: { pcn: string } }) {
  const property = getPropertyByPcn(params.pcn);
  if (!property) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const saleHistory = getSaleHistory(params.pcn);
  return NextResponse.json({ property, saleHistory });
}
```

**Step 3: Write the stats API**

```typescript
// src/app/api/stats/route.ts
import { NextResponse } from "next/server";
import { getCommunityStats, getPropertiesByBedrooms } from "@/lib/db";

export async function GET() {
  const stats = getCommunityStats();
  const byBedrooms = getPropertiesByBedrooms();
  return NextResponse.json({ stats, byBedrooms });
}
```

**Step 4: Write the GeoJSON API**

```typescript
// src/app/api/geojson/route.ts
import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import path from "path";

export async function GET() {
  const geojsonPath = path.join(process.cwd(), "data", "parcels.geojson");
  const data = JSON.parse(readFileSync(geojsonPath, "utf-8"));
  return NextResponse.json(data);
}
```

**Step 5: Verify routes respond**

```bash
cd /Users/llama/Development/hoa-dashboard && npm run dev
# In another terminal:
curl http://localhost:3000/api/properties | head -c 500
curl http://localhost:3000/api/stats
```

**Step 6: Commit**

```bash
git add src/app/api/ && git commit -m "feat: API routes for properties, stats, and geojson"
```

---

### Task 9: App Layout and Navigation

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`
- Create: `src/components/Navigation.tsx`

**Step 1: Build the navigation component**

A horizontal nav bar with tabs: Map (default), Leaderboards, Analytics, Community. Dark theme to let the Mapbox map and data visualizations pop. Project title "Los Paseos Dashboard" with a subtle tagline.

**Step 2: Update layout.tsx**

Wrap the app in the nav component. Set up the HTML metadata (title, description). Import Mapbox CSS globally.

**Step 3: Update globals.css**

Dark theme base styles. Tailwind layers for consistent spacing and typography.

**Step 4: Verify navigation renders**

```bash
cd /Users/llama/Development/hoa-dashboard && npm run dev
```

Visit http://localhost:3000 -- should see nav bar with all four tabs.

**Step 5: Commit**

```bash
git add src/app/layout.tsx src/app/globals.css src/components/Navigation.tsx && git commit -m "feat: app layout with dark theme and navigation tabs"
```

---

### Task 10: Interactive Map Page

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/components/Map/MapView.tsx`
- Create: `src/components/Map/MetricSelector.tsx`
- Create: `src/components/Map/PropertyTooltip.tsx`
- Create: `src/components/Map/CommunityStatsBar.tsx`

**Step 1: Build the MapView component**

Uses `react-map-gl` with Mapbox GL JS. Loads `parcels.geojson` as a fill layer. Colors each polygon based on the selected metric using a data-driven `fill-color` expression with a color ramp (green = high return, red = low return, or appropriate scale per metric). Joins property metrics data to the GeoJSON features by PCN.

**Step 2: Build MetricSelector**

Horizontal toggle bar at the top of the map. Options: Total Return %, Annualized Return %, Total $ Gained, Current $/sqft, Purchase $/sqft, Estimated Equity, Years Held. Selecting a metric re-colors all parcel polygons.

**Step 3: Build PropertyTooltip**

On hover, show a floating tooltip near the cursor with: address, selected metric value, purchase date, purchase price, current value. Styled as a dark card with clean typography.

**Step 4: Build CommunityStatsBar**

Persistent bar at the bottom of the map view showing: total properties, median value, median return %, avg $/sqft, total community value. Fetched from the `/api/stats` endpoint.

**Step 5: Wire it all together in page.tsx**

Map takes full viewport below the nav. Stats bar overlays the bottom. Metric selector overlays the top. Tooltip follows cursor on hover.

**Step 6: Add satellite/street toggle**

Mapbox style switcher between `mapbox://styles/mapbox/satellite-streets-v12` and `mapbox://styles/mapbox/dark-v11`.

**Step 7: Verify map renders with data**

Requires: `.env.local` with `NEXT_PUBLIC_MAPBOX_TOKEN` set, and `data/parcels.geojson` + `data/hoa.db` populated from the pipeline.

```bash
cd /Users/llama/Development/hoa-dashboard && npm run dev
```

Expected: Map centered on subdivision, colored parcel polygons, hover tooltips working.

**Step 8: Commit**

```bash
git add src/app/page.tsx src/components/Map/ && git commit -m "feat: interactive map with colored parcel polygons and metric selector"
```

---

### Task 11: Property Detail Side Panel

**Files:**
- Create: `src/components/PropertyCard/PropertyDetailPanel.tsx`
- Modify: `src/app/page.tsx` (add click handler)

**Step 1: Build PropertyDetailPanel**

Slide-in panel from the right side of the map when a parcel is clicked. Shows:
- Address and owner name
- Purchase price, date, and current market value with visual comparison (bar or arrow showing gain)
- All computed metrics: total return %, annualized return %, total $ gained, $/sqft purchase vs current
- Equity estimate section with the default assumptions displayed
- Bedroom/bathroom/sqft/year built details
- Sale history list (if multiple sales exist)
- Close button

**Step 2: Wire click handler in page.tsx**

Click on a parcel polygon fetches `/api/properties/[pcn]` and opens the detail panel.

**Step 3: Verify panel opens with real data**

Click a parcel on the map, panel should slide in with all metrics.

**Step 4: Commit**

```bash
git add src/components/PropertyCard/ src/app/page.tsx && git commit -m "feat: property detail side panel with metrics and equity estimate"
```

---

### Task 12: Leaderboards Page

**Files:**
- Create: `src/app/leaderboards/page.tsx`
- Create: `src/components/LeaderboardTable/LeaderboardTable.tsx`
- Create: `src/components/LeaderboardTable/LeaderboardSelector.tsx`

**Step 1: Build LeaderboardTable**

Sortable, filterable table component. Columns: Rank, Address, Purchase Price, Current Value, Total Return %, Annualized Return %, Total $ Gained, $/sqft, Equity. Clicking a column header sorts by that column. Clicking a row navigates to the map centered on that parcel.

**Step 2: Build LeaderboardSelector**

Tabs or buttons for the named leaderboards:
- Best Investment (annualized return % desc)
- Biggest Winner (total $ gained desc)
- Best Deal (purchase $/sqft asc)
- Most Valuable (market value desc)
- Most Equity Built (estimated equity desc)
- Best Leverage (leverage return desc)
- OG Residents (purchase date asc)
- Newest Buyers (purchase date desc)

Selecting a leaderboard pre-sorts the table and highlights the top 3 with gold/silver/bronze styling.

**Step 3: Wire up the page**

Fetches `/api/properties`, computes client-side metrics (annualized return, equity), displays the table.

**Step 4: Verify**

```bash
cd /Users/llama/Development/hoa-dashboard && npm run dev
```

Visit http://localhost:3000/leaderboards -- should see full sortable table with leaderboard presets.

**Step 5: Commit**

```bash
git add src/app/leaderboards/ src/components/LeaderboardTable/ && git commit -m "feat: leaderboards page with sortable table and named presets"
```

---

### Task 13: Analytics Page

**Files:**
- Create: `src/app/analytics/page.tsx`
- Create: `src/components/Charts/BedroomAnalysis.tsx`
- Create: `src/components/Charts/PurchaseTimingScatter.tsx`
- Create: `src/components/Charts/ValueDistribution.tsx`
- Create: `src/components/Charts/AppreciationCurve.tsx`
- Create: `src/components/Charts/PricePerSqftTrend.tsx`
- Create: `src/components/Charts/HoldingPeriodScatter.tsx`

**Step 1: Build each chart component using Recharts**

Each component receives the property data array as props and renders its specific chart:

1. **BedroomAnalysis**: Grouped bar chart -- avg value, avg return %, avg $/sqft by bedroom count. Include a callout card showing "Implied value of an additional bedroom" computed as the average difference between adjacent bedroom counts.

2. **PurchaseTimingScatter**: Scatter plot with purchase date on X axis, annualized return % on Y axis. Each dot is a property, color-coded by bedroom count. Hover shows address and details.

3. **ValueDistribution**: Histogram of current market values. Bins of $25K or $50K increments.

4. **AppreciationCurve**: Line chart showing sale prices over time using all sale history records. Overlay a trend line. This shows how the community's price level has evolved.

5. **PricePerSqftTrend**: Scatter/line showing purchase $/sqft over time for each buyer. Shows whether the neighborhood is getting more or less expensive per square foot.

6. **HoldingPeriodScatter**: Scatter plot with years held on X, total return % on Y. Shows correlation between holding period and returns.

**Step 2: Build the analytics page layout**

Grid layout with all six charts. Section headers explaining what each chart shows. Responsive -- stacks on mobile.

**Step 3: Verify charts render with data**

```bash
cd /Users/llama/Development/hoa-dashboard && npm run dev
```

Visit http://localhost:3000/analytics -- all six charts should render with real data.

**Step 4: Commit**

```bash
git add src/app/analytics/ src/components/Charts/ && git commit -m "feat: analytics page with six chart types"
```

---

### Task 14: Equity Calculator Component

**Files:**
- Create: `src/components/EquityCalculator/EquityPanel.tsx`
- Create: `src/components/Charts/EquityDistribution.tsx`
- Modify: `src/app/analytics/page.tsx` (add equity section)

**Step 1: Build EquityPanel**

A settings panel with sliders/inputs:
- Down payment %: slider from 0-50%, default 20%
- Loan term: toggle 15yr / 30yr, default 30yr
- Rate source: "Historical (auto)" or "Custom" with manual input

When settings change, all equity-dependent metrics recalculate across the page.

**Step 2: Build EquityDistribution chart**

Bar or histogram chart showing estimated equity across all properties. Color-code by equity bracket. Add a secondary chart showing equity by bedroom count.

**Step 3: Add equity section to analytics page**

Place the EquityPanel at the top of a new "Equity Analysis" section on the analytics page, followed by the EquityDistribution chart.

**Step 4: Verify**

Adjust the sliders -- charts should update dynamically.

**Step 5: Commit**

```bash
git add src/components/EquityCalculator/ src/components/Charts/EquityDistribution.tsx src/app/analytics/page.tsx && git commit -m "feat: equity calculator with configurable assumptions and distribution chart"
```

---

### Task 15: Community Summary Page

**Files:**
- Create: `src/app/community/page.tsx`

**Step 1: Build the community summary page**

Card-based layout showing:
- Hero stats: total community value, property count, median value, median return
- Bedroom/bathroom mix: pie or donut chart
- Average sqft, lot size, year built
- Newest sale and oldest sale (with addresses)
- Homestead vs non-homestead count
- A "community profile" card summarizing Los Paseos in plain language

Fetches from `/api/stats` and `/api/properties`.

**Step 2: Verify**

Visit http://localhost:3000/community -- all stats cards should render.

**Step 3: Commit**

```bash
git add src/app/community/ && git commit -m "feat: community summary page with stats cards"
```

---

### Task 16: Docker Deployment

**Files:**
- Create: `Dockerfile`
- Create: `docker-compose.yml`
- Create: `.dockerignore`

**Step 1: Write Dockerfile**

Multi-stage build:
1. Builder stage: install deps, build Next.js
2. Runner stage: Node.js alpine, copy build output + data directory, expose port 3000

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/data ./data
EXPOSE 3000
CMD ["node", "server.js"]
```

Note: Requires `output: "standalone"` in `next.config.mjs`.

**Step 2: Write docker-compose.yml**

```yaml
services:
  hoa-dashboard:
    build: .
    ports:
      - "3100:3000"
    volumes:
      - ./data:/app/data:ro
    restart: unless-stopped
```

**Step 3: Write .dockerignore**

```
node_modules
.next
.git
scripts
venv
```

**Step 4: Update next.config.mjs for standalone output**

Add `output: "standalone"` to the Next.js config.

**Step 5: Build and test locally**

```bash
cd /Users/llama/Development/hoa-dashboard && docker compose up --build -d
curl http://localhost:3100
```

Expected: Dashboard loads on port 3100.

**Step 6: Commit**

```bash
git add Dockerfile docker-compose.yml .dockerignore next.config.mjs && git commit -m "feat: Docker deployment config with standalone Next.js build"
```

---

### Task 17: "What If I Sold Today?" Scenario Modeler

**Files:**
- Create: `src/components/SellScenario/SellScenarioPanel.tsx`
- Modify: `src/components/PropertyCard/PropertyDetailPanel.tsx` (add "What If" button)

**Step 1: Build SellScenarioPanel**

Accessible from the property detail panel via a "What if I sold today?" button. Shows a breakdown:
- Estimated sale price (current market value)
- Minus: remaining mortgage principal (from amortization calc)
- Minus: agent commission (default 6%, configurable slider)
- Minus: FL documentary stamps (0.70 per $100 of sale price = 0.7%)
- Minus: title insurance estimate (optional)
- Equals: **estimated net proceeds**

Configurable inputs: commission %, include/exclude doc stamps. Updates in real time.

**Step 2: Wire into property detail panel**

Add a "What If I Sold Today?" button at the bottom of PropertyDetailPanel. Clicking opens the scenario modeler for that property.

**Step 3: Verify**

Open a property detail panel, click "What If I Sold Today?" -- should see itemized breakdown with correct math.

**Step 4: Commit**

```bash
git add src/components/SellScenario/ src/components/PropertyCard/ && git commit -m "feat: 'What If I Sold Today?' scenario modeler with FL-specific costs"
```

---

### Task 18: Flip / Renovation Detection

**Files:**
- Modify: `src/lib/db.ts` (add flip detection query)
- Modify: `src/lib/types.ts` (add flip flag)
- Modify: `src/components/Map/MapView.tsx` (add flip badge)
- Modify: `src/components/LeaderboardTable/LeaderboardTable.tsx` (add flip badge + leaderboard)

**Step 1: Add flip detection query to db.ts**

Query sale_history for properties with 2+ sales where a subsequent sale was 30%+ higher within 3 years of the prior sale. Return these PCNs with a `likely_flip` flag.

```sql
SELECT sh1.pcn,
  sh1.sale_price as buy_price, sh1.sale_date as buy_date,
  sh2.sale_price as sell_price, sh2.sale_date as sell_date,
  ROUND((sh2.sale_price - sh1.sale_price) * 100.0 / sh1.sale_price, 1) as flip_return_pct
FROM sale_history sh1
JOIN sale_history sh2 ON sh1.pcn = sh2.pcn
  AND sh2.sale_date > sh1.sale_date
  AND julianday(sh2.sale_date) - julianday(sh1.sale_date) <= 1095
  AND sh2.sale_price > sh1.sale_price * 1.3
```

**Step 2: Add visual indicators**

- Map: small icon/badge overlay on parcels flagged as likely flips
- Leaderboard: "Likely Flip" badge next to address
- New leaderboard preset: "Best Flips" sorted by flip_return_pct

**Step 3: Commit**

```bash
git add src/lib/db.ts src/lib/types.ts src/components/Map/ src/components/LeaderboardTable/ && git commit -m "feat: flip/renovation detection with badges on map and leaderboards"
```

---

### Task 19: SOH Cap / Tax Efficiency Analysis

**Files:**
- Create: `src/components/Charts/SOHAnalysis.tsx`
- Modify: `src/app/analytics/page.tsx` (add SOH section)

**Step 1: Build SOHAnalysis chart**

Uses data already in the DB (`assessed_value` vs `market_uncapped`). For homesteaded properties, shows:
- Bar chart: assessed value vs uncapped market value per property, sorted by gap size
- Summary stats: "Average SOH savings: $X/yr in taxes" (estimated using Palm Beach millage rate ~18-20 mills)
- Callout: "If [address] sold, the new buyer's annual taxes would increase by approximately $X"
- The portability benefit: how much SOH cap value could be transferred to a new purchase

The ArcGIS API already returns `ASSESSED_VAL` and `MKT_NOT_CAPPED` -- the gap between them IS the SOH cap benefit. No new data needed.

**Step 2: Add to analytics page**

New section: "Tax Efficiency: Save Our Homes" between the equity section and bedroom analysis.

**Step 3: Commit**

```bash
git add src/components/Charts/SOHAnalysis.tsx src/app/analytics/page.tsx && git commit -m "feat: Save Our Homes cap analysis with tax impact estimates"
```

---

### Task 20: Interest Rate Overlay on Charts

**Files:**
- Modify: `src/components/Charts/PurchaseTimingScatter.tsx` (add rate dimension)
- Modify: `src/app/api/properties/route.ts` (join mortgage rate to response)

**Step 1: Add rate-at-purchase to property API response**

Join the mortgage_rates table to each property based on the purchase_date month. Return as `rate_at_purchase` field.

**Step 2: Enhance PurchaseTimingScatter**

- Size or color dots by mortgage rate at time of purchase
- Add a secondary Y axis or overlay line showing the 30-year rate over time
- Tooltip now includes: address, purchase price, annualized return, AND rate at purchase

**Step 3: Commit**

```bash
git add src/components/Charts/PurchaseTimingScatter.tsx src/app/api/properties/route.ts && git commit -m "feat: interest rate overlay on purchase timing scatter plot"
```

---

### Task 21: Methodology Page

**Files:**
- Create: `src/app/methodology/page.tsx`
- Modify: `src/components/Navigation.tsx` (add Methodology link in footer or secondary nav)

**Step 1: Build methodology page**

Static content page at `/methodology`. Sections:
- **Data Sources**: PAPA ArcGIS API (link), Freddie Mac PMMS via FRED (link)
- **Valuation**: County-appraised market values, updated annually by PAPA
- **Return Calculations**: Total return, annualized return (CAGR formula), with formulas shown
- **Equity Estimates**: Amortization assumptions, default parameters, what "estimated" means
- **Flip Detection**: Criteria (30%+ appreciation within 3 years between sales)
- **SOH Cap Analysis**: How Save Our Homes works, millage rate assumption
- **Limitations & Disclaimers**: Assessed != actual market value, equity uses assumed loan terms, data refresh cadence
- **Last Data Refresh**: Date stamp from when the pipeline last ran

Clean typography, no charts. Builds trust for neighbors, signals rigor for investors.

**Step 2: Add to navigation**

Link in the footer or as a subtle nav item (not a main tab -- it's reference material).

**Step 3: Commit**

```bash
git add src/app/methodology/ src/components/Navigation.tsx && git commit -m "feat: methodology page with data sources, formulas, and disclaimers"
```

---

### Task 22: Multi-Community Selector (Coming Soon)

**Files:**
- Modify: `src/components/Navigation.tsx` (add community dropdown)

**Step 1: Add community selector to nav**

Dropdown in the navigation bar showing "Los Paseos of Via Verde" as the active community. Below it, a disabled "More communities coming soon" option and a "Request your community" mailto link or form.

No backend work needed -- this is purely UI to signal the platform vision.

**Step 2: Commit**

```bash
git add src/components/Navigation.tsx && git commit -m "feat: community selector dropdown with 'coming soon' state"
```

---

### Task 23: Docker Deployment (updated from Task 16)

This is now the final task. Same as Task 16 above but includes all features from Tasks 17-22.

---

## Phase 2: Engagement & Depth (Future)

These require significant new engineering and are deferred:

### "Your Neighbor Bought For..." Anonymous Comparison Tool
- Address input with autocomplete
- Personal rank card across all metrics
- Anonymized neighboring properties ("Neighbor on [Street Name]")
- Shareable card output with Open Graph tags

### Time Machine Slider
- Animated slider below the map
- Interpolate community values at each point in time using sale history
- Map parcel colors animate as slider moves
- Play/pause with speed control

### Comparable Sale Clustering
- Group properties by bed/bath/sqft profile (within tolerance bands)
- "Your Comp Group" view when address is selected
- Show how similar homes performed differently

### Macro Benchmark Overlays
- Fetch S&P 500 total return, Case-Shiller Miami index, PBC median from FRED
- Plot community appreciation alongside benchmarks
- Time-aligned to earliest purchase in dataset

### Embeddable Property Widget
- `/embed/[pcn]` route, minimal chrome, iframe-ready
- Shareable link with Open Graph tags for social preview
- Single property card with key metrics

---

## Dependency Order

```
Task 1 (scaffold)
  ├── Task 2 (fetch PAPA)
  ├── Task 4 (fetch rates)
  │     └── Task 5 (process/SQLite) -- needs 2, 3, 4
  └── Task 3 (scrape details) -- needs 2 for PCN list
        └── Task 5
              ├── Task 6 (db.ts + types.ts)
              │     └── Task 7 (metrics.ts + amortization.ts)
              │           └── Task 8 (API routes)
              │                 ├── Task 9 (layout/nav)
              │                 │     ├── Task 10 (map)
              │                 │     │     └── Task 11 (detail panel)
              │                 │     │           └── Task 17 (sell scenario)
              │                 │     ├── Task 12 (leaderboards)
              │                 │     │     └── Task 18 (flip detection)
              │                 │     ├── Task 13 (analytics charts)
              │                 │     │     ├── Task 14 (equity calc)
              │                 │     │     ├── Task 19 (SOH analysis)
              │                 │     │     └── Task 20 (rate overlay)
              │                 │     ├── Task 15 (community page)
              │                 │     ├── Task 21 (methodology page)
              │                 │     └── Task 22 (community selector UI)
              │                 └── Task 23 (Docker)
```
