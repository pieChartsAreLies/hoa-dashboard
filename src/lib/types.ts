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
  homestead: number;
  latitude: number | null;
  longitude: number | null;
  property_use: string;
  acres: number | null;
  zestimate: number | null;
  zestimate_date: string | null;
  redfin_estimate: number | null;
  current_value: number | null; // zestimate, falling back to county market_value
  value_source: string | null;
}

export interface PropertyWithMetrics extends Property {
  total_return_pct: number | null;
  annualized_return_pct: number | null;
  total_gain_dollars: number | null;
  price_per_sqft_purchase: number | null;
  price_per_sqft_current: number | null;
  years_held: number | null;
  rate_at_purchase: number | null;
}

export interface SaleRecord {
  id: number;
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
  avg_market_value: number;
  avg_return_pct: number;
  avg_price_per_sqft: number;
  avg_bedrooms: number | null;
  avg_living_sqft: number;
}

export interface BedroomGroup {
  bedrooms: number;
  count: number;
  avg_value: number;
  avg_return_pct: number;
  avg_price_per_sqft: number;
}
