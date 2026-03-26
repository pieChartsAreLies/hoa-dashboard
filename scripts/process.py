"""Process raw PAPA data and load into SQLite."""
import csv
import json
import sqlite3
from datetime import datetime
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"
DB_PATH = DATA_DIR / "hoa.db"


def create_schema(conn):
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
    rates_path = DATA_DIR / "mortgage_rates.csv"
    with open(rates_path) as f:
        reader = csv.DictReader(f)
        rows = [(r["year_month"], float(r["rate_30yr"])) for r in reader]
    conn.executemany("INSERT INTO mortgage_rates (year_month, rate_30yr) VALUES (?, ?)", rows)
    print(f"Loaded {len(rows)} mortgage rate records")


def epoch_to_date(epoch_ms):
    if not epoch_ms:
        return None
    try:
        return datetime.utcfromtimestamp(epoch_ms / 1000).strftime("%Y-%m-%d")
    except (ValueError, TypeError, OSError):
        return None


def parse_price(price_str):
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
    if not geometry or geometry.get("type") not in ("Polygon", "MultiPolygon"):
        return None, None
    try:
        if geometry["type"] == "Polygon":
            coords = geometry["coordinates"][0]
        else:
            coords = geometry["coordinates"][0][0]
        lngs = [c[0] for c in coords]
        lats = [c[1] for c in coords]
        return sum(lats) / len(lats), sum(lngs) / len(lngs)
    except (IndexError, TypeError):
        return None, None


def process():
    # Load raw ArcGIS data
    with open(DATA_DIR / "papa_raw.json") as f:
        raw = json.load(f)
    print(f"Loaded {len(raw['features'])} parcels from ArcGIS")

    # Load scraped details
    details_path = DATA_DIR / "papa_details.json"
    details = {}
    if details_path.exists():
        with open(details_path) as f:
            details_list = json.load(f)
        details = {d["pcn"]: d for d in details_list}
        print(f"Loaded {len(details)} detail records")

    # Filter to single-family only for the main properties table
    sf_features = [f for f in raw["features"] if f["properties"].get("PROPERTY_USE", "").strip() == "SINGLE FAMILY"]
    print(f"Filtered to {len(sf_features)} single-family properties")

    # Create GeoJSON for Mapbox (only single-family parcels)
    map_features = []
    for feat in sf_features:
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

    for feat in sf_features:
        props = feat["properties"]
        pcn = props.get("PARID")
        if not pcn:
            continue

        lat, lng = compute_centroid(feat.get("geometry"))
        detail = details.get(pcn, {})

        # Use the most recent legitimate sale (>= $1,000) from detail data as the "purchase"
        # This skips $10 non-arm's-length transfers (family transfers, etc.)
        # Otherwise fall back to ArcGIS SALE_DATE/PRICE
        sale_history = detail.get("sale_history", [])
        purchase_date = None
        purchase_price = None
        if sale_history:
            # sale_history is ordered most recent first; pick first with price >= 1000
            for sale in sale_history:
                price = sale.get("price")
                if price is not None and price >= 1000:
                    purchase_date = sale.get("date")
                    purchase_price = price
                    break
        if purchase_price is None:
            purchase_date = epoch_to_date(props.get("SALE_DATE") or props.get("Q_SALE_DATE"))
            purchase_price = parse_price(props.get("PRICE"))

        property_rows.append((
            pcn,
            props.get("SITE_ADDR_STR", "").strip(),
            props.get("OWNER_NAME1", "").strip(),
            purchase_price,
            purchase_date,
            props.get("TOTAL_MARKET"),
            props.get("ASSESSED_VAL"),
            props.get("MKT_NOT_CAPPED"),
            props.get("LAND_MARKET"),
            props.get("IMPRV_MRKT"),
            detail.get("bedrooms") or None,  # 0 = missing data from county
            detail.get("bathrooms") or None,
            detail.get("living_sqft"),
            detail.get("lot_sqft"),
            detail.get("year_built"),
            1 if props.get("HMSTD_FLG") in ("Y", "YES", "1", True) else 0,
            lat,
            lng,
            props.get("PROPERTY_USE", "").strip(),
            props.get("ACRES"),
        ))

        # All sale history records
        for sale in sale_history:
            sale_rows.append((
                pcn,
                sale.get("date"),
                sale.get("price"),
                None,  # buyer not available from current scraping
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
    cur = conn.execute("""
        SELECT COUNT(*), AVG(market_value), AVG(purchase_price), MIN(purchase_date), MAX(purchase_date)
        FROM properties WHERE market_value > 0 AND purchase_price > 0
    """)
    count, avg_market, avg_purchase, oldest_sale, newest_sale = cur.fetchone()
    print(f"\nSummary: {count} properties with both values")
    if avg_market:
        print(f"  Avg market value: ${avg_market:,.0f}")
    if avg_purchase:
        print(f"  Avg purchase price: ${avg_purchase:,.0f}")
    if oldest_sale:
        print(f"  Oldest purchase: {oldest_sale}")
    if newest_sale:
        print(f"  Newest purchase: {newest_sale}")

    # Homestead stats
    cur2 = conn.execute("SELECT SUM(homestead), COUNT(*) FROM properties")
    hmstd, total = cur2.fetchone()
    print(f"  Homesteaded: {hmstd}/{total}")

    conn.close()
    print(f"\nDatabase saved to {DB_PATH}")


if __name__ == "__main__":
    process()
