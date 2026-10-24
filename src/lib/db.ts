import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "hoa.db");

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH, { readonly: true });
  }
  return db;
}

export function getAllProperties() {
  return getDb().prepare(`
    SELECT p.*,
      CASE WHEN p.purchase_price > 1000 AND p.current_value > 0
        THEN ROUND((p.current_value - p.purchase_price) * 100.0 / p.purchase_price, 2)
        ELSE NULL END as total_return_pct,
      CASE WHEN p.purchase_price > 1000 AND p.current_value > 0 AND p.purchase_date IS NOT NULL
        THEN ROUND((julianday('now') - julianday(p.purchase_date)) / 365.25, 1)
        ELSE NULL END as years_held,
      CASE WHEN p.purchase_price > 1000 AND p.current_value > 0
        THEN ROUND(p.current_value - p.purchase_price, 0)
        ELSE NULL END as total_gain_dollars,
      CASE WHEN p.purchase_price > 1000 AND p.living_sqft > 0
        THEN ROUND(p.purchase_price / p.living_sqft, 2)
        ELSE NULL END as price_per_sqft_purchase,
      CASE WHEN p.current_value > 0 AND p.living_sqft > 0
        THEN ROUND(p.current_value / p.living_sqft, 2)
        ELSE NULL END as price_per_sqft_current,
      m.rate_30yr as rate_at_purchase
    FROM properties p
    LEFT JOIN mortgage_rates m ON m.year_month = substr(p.purchase_date, 1, 7)
    WHERE p.current_value > 0
    ORDER BY p.address
  `).all();
}

export function getPropertyByPcn(pcn: string) {
  return getDb().prepare(`
    SELECT p.*,
      CASE WHEN p.purchase_price > 1000 AND p.current_value > 0
        THEN ROUND((p.current_value - p.purchase_price) * 100.0 / p.purchase_price, 2)
        ELSE NULL END as total_return_pct,
      CASE WHEN p.purchase_price > 1000 AND p.current_value > 0 AND p.purchase_date IS NOT NULL
        THEN ROUND((julianday('now') - julianday(p.purchase_date)) / 365.25, 1)
        ELSE NULL END as years_held,
      CASE WHEN p.purchase_price > 1000 AND p.current_value > 0
        THEN ROUND(p.current_value - p.purchase_price, 0)
        ELSE NULL END as total_gain_dollars,
      CASE WHEN p.purchase_price > 1000 AND p.living_sqft > 0
        THEN ROUND(p.purchase_price / p.living_sqft, 2)
        ELSE NULL END as price_per_sqft_purchase,
      CASE WHEN p.current_value > 0 AND p.living_sqft > 0
        THEN ROUND(p.current_value / p.living_sqft, 2)
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
      ROUND(SUM(current_value), 0) as total_community_value,
      ROUND(AVG(current_value), 0) as avg_market_value,
      ROUND(AVG(CASE WHEN purchase_price > 1000 AND current_value > 0
        THEN (current_value - purchase_price) * 100.0 / purchase_price
        ELSE NULL END), 2) as avg_return_pct,
      ROUND(AVG(CASE WHEN current_value > 0 AND living_sqft > 0
        THEN current_value / living_sqft ELSE NULL END), 2) as avg_price_per_sqft,
      ROUND(AVG(bedrooms), 1) as avg_bedrooms,
      ROUND(AVG(living_sqft), 0) as avg_living_sqft
    FROM properties
    WHERE current_value > 0
  `).get();
}

export function getPropertiesByBedrooms() {
  return getDb().prepare(`
    SELECT
      bedrooms,
      COUNT(*) as count,
      ROUND(AVG(current_value), 0) as avg_value,
      ROUND(AVG(CASE WHEN purchase_price > 1000
        THEN (current_value - purchase_price) * 100.0 / purchase_price
        ELSE NULL END), 2) as avg_return_pct,
      ROUND(AVG(CASE WHEN living_sqft > 0
        THEN current_value / living_sqft ELSE NULL END), 2) as avg_price_per_sqft
    FROM properties
    WHERE bedrooms IS NOT NULL AND current_value > 0
    GROUP BY bedrooms
    ORDER BY bedrooms
  `).all();
}

export function getFlips() {
  return getDb().prepare(`
    WITH ranked AS (
      SELECT pcn, sale_date, sale_price,
        ROW_NUMBER() OVER (PARTITION BY pcn ORDER BY sale_date ASC) as rn
      FROM sale_history
      WHERE sale_price > 1000
    ),
    consecutive AS (
      SELECT r1.pcn,
        r1.sale_price as buy_price, r1.sale_date as buy_date,
        r2.sale_price as sell_price, r2.sale_date as sell_date,
        r2.rn as sell_rn,
        MAX(r2.rn) OVER (PARTITION BY r1.pcn) as max_rn
      FROM ranked r1
      JOIN ranked r2 ON r1.pcn = r2.pcn AND r2.rn = r1.rn + 1
    )
    SELECT pcn, buy_price, buy_date, sell_price, sell_date,
      ROUND((sell_price - buy_price) * 100.0 / buy_price, 1) as flip_return_pct
    FROM consecutive
    WHERE julianday(sell_date) - julianday(buy_date) <= 1095
      AND sell_price > buy_price * 1.3
      AND sell_rn = max_rn
      AND sell_date >= date('now', '-20 years')
    ORDER BY flip_return_pct DESC
  `).all();
}
