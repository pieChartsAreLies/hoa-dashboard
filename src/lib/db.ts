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
    SELECT p.*,
      CASE WHEN p.purchase_price > 0 AND p.market_value > 0
        THEN ROUND((p.market_value - p.purchase_price) * 100.0 / p.purchase_price, 2)
        ELSE NULL END as total_return_pct,
      CASE WHEN p.purchase_price > 0 AND p.market_value > 0 AND p.purchase_date IS NOT NULL
        THEN ROUND((julianday('now') - julianday(p.purchase_date)) / 365.25, 1)
        ELSE NULL END as years_held,
      CASE WHEN p.purchase_price > 0 AND p.market_value > 0
        THEN ROUND(p.market_value - p.purchase_price, 0)
        ELSE NULL END as total_gain_dollars,
      CASE WHEN p.purchase_price > 0 AND p.living_sqft > 0
        THEN ROUND(p.purchase_price / p.living_sqft, 2)
        ELSE NULL END as price_per_sqft_purchase,
      CASE WHEN p.market_value > 0 AND p.living_sqft > 0
        THEN ROUND(p.market_value / p.living_sqft, 2)
        ELSE NULL END as price_per_sqft_current,
      m.rate_30yr as rate_at_purchase
    FROM properties p
    LEFT JOIN mortgage_rates m ON m.year_month = substr(p.purchase_date, 1, 7)
    WHERE p.market_value > 0
    ORDER BY p.address
  `).all();
}

export function getPropertyByPcn(pcn: string) {
  return getDb().prepare(`
    SELECT p.*,
      CASE WHEN p.purchase_price > 0 AND p.market_value > 0
        THEN ROUND((p.market_value - p.purchase_price) * 100.0 / p.purchase_price, 2)
        ELSE NULL END as total_return_pct,
      CASE WHEN p.purchase_price > 0 AND p.market_value > 0 AND p.purchase_date IS NOT NULL
        THEN ROUND((julianday('now') - julianday(p.purchase_date)) / 365.25, 1)
        ELSE NULL END as years_held,
      CASE WHEN p.purchase_price > 0 AND p.market_value > 0
        THEN ROUND(p.market_value - p.purchase_price, 0)
        ELSE NULL END as total_gain_dollars,
      CASE WHEN p.purchase_price > 0 AND p.living_sqft > 0
        THEN ROUND(p.purchase_price / p.living_sqft, 2)
        ELSE NULL END as price_per_sqft_purchase,
      CASE WHEN p.market_value > 0 AND p.living_sqft > 0
        THEN ROUND(p.market_value / p.living_sqft, 2)
        ELSE NULL END as price_per_sqft_current,
      m.rate_30yr as rate_at_purchase
    FROM properties p
    LEFT JOIN mortgage_rates m ON m.year_month = substr(p.purchase_date, 1, 7)
    WHERE p.pcn = ?
  `).get(pcn);
}

export function getSaleHistory(pcn: string) {
  return getDb().prepare(
    "SELECT * FROM sale_history WHERE pcn = ? ORDER BY sale_date DESC"
  ).all(pcn);
}

export function getMortgageRate(yearMonth: string) {
  return getDb().prepare(
    "SELECT rate_30yr FROM mortgage_rates WHERE year_month = ?"
  ).get(yearMonth) as { rate_30yr: number } | undefined;
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
      ROUND(SUM(market_value), 0) as total_community_value,
      ROUND(AVG(market_value), 0) as avg_market_value,
      ROUND(AVG(CASE WHEN purchase_price > 0 AND market_value > 0
        THEN (market_value - purchase_price) * 100.0 / purchase_price
        ELSE NULL END), 2) as avg_return_pct,
      ROUND(AVG(CASE WHEN market_value > 0 AND living_sqft > 0
        THEN market_value / living_sqft ELSE NULL END), 2) as avg_price_per_sqft,
      ROUND(AVG(bedrooms), 1) as avg_bedrooms,
      ROUND(AVG(living_sqft), 0) as avg_living_sqft
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

export function getFlips() {
  return getDb().prepare(`
    SELECT sh1.pcn,
      sh1.sale_price as buy_price, sh1.sale_date as buy_date,
      sh2.sale_price as sell_price, sh2.sale_date as sell_date,
      ROUND((sh2.sale_price - sh1.sale_price) * 100.0 / sh1.sale_price, 1) as flip_return_pct
    FROM sale_history sh1
    JOIN sale_history sh2 ON sh1.pcn = sh2.pcn
      AND sh2.sale_date > sh1.sale_date
      AND julianday(sh2.sale_date) - julianday(sh1.sale_date) <= 1095
      AND sh1.sale_price > 0
      AND sh2.sale_price > sh1.sale_price * 1.3
    ORDER BY flip_return_pct DESC
  `).all();
}
