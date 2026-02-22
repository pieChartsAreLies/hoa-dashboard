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

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return "N/A";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

export function formatPct(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined) return "N/A";
  return `${value.toFixed(decimals)}%`;
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return "N/A";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}
