"""Fetch property details (year built, sqft, sale history) for each single-family parcel.

Data sources:
- Florida Statewide Cadastral ArcGIS layer: year_built, living_sqft, lot_sqft
- PAPA MapDetails endpoint: sale history (date + price)
- Bedrooms/bathrooms: NOT available from any public PAPA API or state data.
  The PAPA website renders property details via JavaScript (SPA) and the underlying
  MapDetails endpoint only exposes sqft, sale history, and appraisal values.
  The Florida DOR NAL file also lacks bed/bath fields.
"""
import json
import re
import sys
import time
from datetime import datetime
from pathlib import Path

import requests

DATA_DIR = Path(__file__).parent.parent / "data"
RAW_PATH = DATA_DIR / "papa_raw.json"
OUT_PATH = DATA_DIR / "papa_details.json"

# Florida Statewide Cadastral ArcGIS FeatureServer
CADASTRAL_URL = (
    "https://services9.arcgis.com/Gh9awoU677aKree0/arcgis/rest/services/"
    "Florida_Statewide_Cadastral/FeatureServer/0/query"
)
CADASTRAL_FIELDS = (
    "PARCEL_ID,ACT_YR_BLT,EFF_YR_BLT,TOT_LVG_AR,LND_SQFOOT,"
    "NO_BULDNG,NO_RES_UNT,IMP_QUAL,CONST_CLAS"
)

# PAPA MapDetails endpoint (found via papashared.js on the PAPA GIS map viewer)
PAPA_MAP_DETAILS_URL = "https://pbcpao.gov/Property/MapDetails"

BATCH_SIZE = 60  # Max PCNs per Cadastral query to avoid URL length limits
REQUEST_DELAY = 0.75  # Seconds between MapDetails requests


def load_single_family_pcns():
    """Load PCNs for single-family properties from papa_raw.json."""
    with open(RAW_PATH) as f:
        raw = json.load(f)

    parcels = []
    for feature in raw["features"]:
        props = feature["properties"]
        if props.get("PROPERTY_USE") == "SINGLE FAMILY":
            parcels.append({
                "pcn": props["PARID"],
                "address": props.get("SITE_ADDR_STR", ""),
                "owner": props.get("OWNER_NAME1", ""),
                "acres": props.get("ACRES"),
            })
    return parcels


def fetch_cadastral_data(pcns):
    """Batch-query the Florida Statewide Cadastral layer for building details."""
    results = {}
    batches = [pcns[i:i + BATCH_SIZE] for i in range(0, len(pcns), BATCH_SIZE)]

    for batch_num, batch in enumerate(batches, 1):
        pcn_list = ",".join([f"'{p}'" for p in batch])
        params = {
            "where": f"PARCEL_ID IN ({pcn_list})",
            "outFields": CADASTRAL_FIELDS,
            "returnGeometry": "false",
            "resultRecordCount": 200,
            "f": "json",
        }
        print(f"  Cadastral batch {batch_num}/{len(batches)} ({len(batch)} PCNs)...")
        resp = requests.get(CADASTRAL_URL, params=params, timeout=30)
        resp.raise_for_status()
        data = resp.json()

        for feature in data.get("features", []):
            attrs = feature["attributes"]
            pcn = attrs["PARCEL_ID"]
            results[pcn] = {
                "year_built": attrs.get("ACT_YR_BLT"),
                "effective_year_built": attrs.get("EFF_YR_BLT"),
                "living_sqft": attrs.get("TOT_LVG_AR"),
                "lot_sqft": attrs.get("LND_SQFOOT"),
                "num_buildings": attrs.get("NO_BULDNG"),
                "num_res_units": attrs.get("NO_RES_UNT"),
                "improvement_quality": attrs.get("IMP_QUAL"),
                "construction_class": attrs.get("CONST_CLAS"),
            }

    return results


def parse_sale_history(html):
    """Extract sale history (date, price) from PAPA MapDetails HTML."""
    sales = []
    sales_start = html.find("Sales Information")
    if sales_start < 0:
        return sales

    sales_end = html.find("Appraisals", sales_start)
    if sales_end < 0:
        sales_end = len(html)
    section = html[sales_start:sales_end]

    rows = re.findall(r"<tr[^>]*>(.*?)</tr>", section, re.DOTALL)
    for row in rows:
        cells = re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", row, re.DOTALL)
        cleaned = [re.sub(r"<[^>]+>", "", c).strip() for c in cells]
        if len(cleaned) >= 2 and cleaned[0] != "Sales Date":
            date_str = cleaned[0]
            price_str = cleaned[1]
            try:
                sale_date = datetime.strptime(date_str, "%m/%d/%Y").strftime("%Y-%m-%d")
            except ValueError:
                sale_date = date_str
            try:
                price = int(price_str.replace("$", "").replace(",", ""))
            except ValueError:
                price = None

            sales.append({"date": sale_date, "price": price})

    return sales


def parse_total_sqft(html):
    """Extract Total Square Feet from PAPA MapDetails HTML."""
    match = re.search(r'<label\s+id=["\']lblSqft["\']\s*>(.*?)</label>', html)
    if match:
        try:
            return int(match.group(1).strip().replace(",", ""))
        except ValueError:
            pass
    return None


def fetch_map_details(pcn):
    """Fetch sale history and total sqft from PAPA MapDetails for a single parcel."""
    resp = requests.get(
        PAPA_MAP_DETAILS_URL,
        params={"parcelId": pcn},
        timeout=15,
        headers={"User-Agent": "Mozilla/5.0 (HOA Dashboard Data Pipeline)"},
    )
    if resp.status_code != 200 or len(resp.text) < 500:
        return None, None

    sale_history = parse_sale_history(resp.text)
    total_sqft = parse_total_sqft(resp.text)
    return sale_history, total_sqft


def main():
    if not RAW_PATH.exists():
        print(f"Error: {RAW_PATH} not found. Run fetch_papa.py first.")
        sys.exit(1)

    # Step 1: Load single-family PCNs
    print("Loading single-family parcels from papa_raw.json...")
    parcels = load_single_family_pcns()
    print(f"  Found {len(parcels)} single-family properties")

    # Step 2: Batch-fetch building data from Florida Statewide Cadastral
    print("\nFetching building data from Florida Statewide Cadastral...")
    pcns = [p["pcn"] for p in parcels]
    cadastral = fetch_cadastral_data(pcns)
    print(f"  Got building data for {len(cadastral)}/{len(pcns)} properties")

    # Step 3: Fetch sale history from PAPA MapDetails (one at a time, with delay)
    print(f"\nFetching sale history from PAPA MapDetails ({len(parcels)} properties)...")
    sale_data = {}
    sqft_data = {}
    failures = []

    for i, parcel in enumerate(parcels, 1):
        pcn = parcel["pcn"]
        try:
            sales, total_sqft = fetch_map_details(pcn)
            if sales is not None:
                sale_data[pcn] = sales
                sqft_data[pcn] = total_sqft
                sale_count = len(sales) if sales else 0
                if i % 20 == 0 or i == len(parcels):
                    print(f"  [{i}/{len(parcels)}] {pcn} - {sale_count} sales")
            else:
                failures.append(pcn)
                if i % 20 == 0 or i == len(parcels):
                    print(f"  [{i}/{len(parcels)}] {pcn} - FAILED")
        except Exception as e:
            failures.append(pcn)
            print(f"  [{i}/{len(parcels)}] {pcn} - ERROR: {e}")

        if i < len(parcels):
            time.sleep(REQUEST_DELAY)

    print(f"  Sale history fetched for {len(sale_data)}/{len(parcels)} properties")
    if failures:
        print(f"  Failures: {len(failures)} - {failures}")

    # Step 4: Combine all data
    print("\nCombining data...")
    results = []
    for parcel in parcels:
        pcn = parcel["pcn"]
        cad = cadastral.get(pcn, {})

        record = {
            "pcn": pcn,
            "address": parcel["address"],
            "owner": parcel["owner"],
            "bedrooms": None,  # Not available from public API
            "bathrooms": None,  # Not available from public API
            "living_sqft": cad.get("living_sqft"),
            "total_sqft": sqft_data.get(pcn),
            "lot_sqft": cad.get("lot_sqft"),
            "lot_acres": parcel.get("acres"),
            "year_built": cad.get("year_built"),
            "effective_year_built": cad.get("effective_year_built"),
            "construction_class": cad.get("construction_class"),
            "improvement_quality": cad.get("improvement_quality"),
            "sale_history": sale_data.get(pcn, []),
        }
        results.append(record)

    # Step 5: Save output
    DATA_DIR.mkdir(exist_ok=True)
    with open(OUT_PATH, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nSaved {len(results)} records to {OUT_PATH}")

    # Step 6: Print summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Total properties enriched: {len(results)}")
    print(f"Building data (Cadastral): {len(cadastral)}/{len(results)}")
    print(f"Sale history (MapDetails): {len(sale_data)}/{len(results)}")
    if failures:
        print(f"Failed PCNs: {failures}")

    # Stats
    years = [r["year_built"] for r in results if r["year_built"]]
    areas = [r["living_sqft"] for r in results if r["living_sqft"]]
    lots = [r["lot_sqft"] for r in results if r["lot_sqft"]]
    sales_counts = [len(r["sale_history"]) for r in results]

    if years:
        print(f"\nYear built range: {min(years)} - {max(years)}")
    if areas:
        print(f"Living sqft range: {min(areas):,.0f} - {max(areas):,.0f}")
    if lots:
        print(f"Lot sqft range: {min(lots):,.0f} - {max(lots):,.0f}")
    print(f"Total sales records: {sum(sales_counts)}")
    print(f"Properties with sale history: {sum(1 for c in sales_counts if c > 0)}")

    # Sample record
    if results:
        sample = results[0]
        print(f"\nSample record ({sample['address']}):")
        print(json.dumps(sample, indent=2))

    print("\nNOTE: bedrooms and bathrooms are null because the PAPA website")
    print("renders these via JavaScript (SPA) and the MapDetails endpoint")
    print("does not include them. The Florida DOR NAL file also lacks these fields.")


if __name__ == "__main__":
    main()
