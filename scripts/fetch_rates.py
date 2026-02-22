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
