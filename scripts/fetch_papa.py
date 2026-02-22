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
