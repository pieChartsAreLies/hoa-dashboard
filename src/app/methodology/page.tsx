import Link from "next/link";

export default function MethodologyPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-900 px-4 py-10">
      <article className="mx-auto max-w-3xl">
        {/* Page Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Methodology
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            How data is collected, calculated, and displayed on this dashboard.
          </p>
        </div>

        <div className="space-y-10">
          {/* Data Sources */}
          <Section title="Data Sources">
            <Subsection title="Palm Beach County Property Appraiser (PAPA) ArcGIS REST API">
              <p>
                URL:{" "}
                <ExtLink href="https://gis.pbcgov.org">gis.pbcgov.org</ExtLink>
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>
                  Provides parcel geometry, market values, assessed values, sale
                  prices, sale dates, and homestead status
                </li>
                <li>Updated annually by the county property appraiser</li>
              </ul>
            </Subsection>

            <Subsection title="PAPA Property Detail Pages">
              <p>
                URL:{" "}
                <ExtLink href="https://pbcpao.gov">pbcpao.gov</ExtLink>
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>
                  Provides living square footage, lot square footage, year
                  built, and full sale history
                </li>
              </ul>
            </Subsection>

            <Subsection title="Zillow Zestimates">
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>
                  Estimated market value for each home, read from the Zillow map
                  view and matched to parcels by location
                </li>
                <li>
                  Map labels are rounded (for example $1.08M), so values are
                  accurate to roughly $10K above $1M and $1K below
                </li>
                <li>
                  This is the &quot;Est. Market Value&quot; used for returns,
                  equity, and totals; homes without one fall back to the county
                  market value
                </li>
              </ul>
            </Subsection>

            <Subsection title="Redfin">
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>
                  Bedrooms and bathrooms (the county does not publish them);
                  bedrooms are missing for homes with no MLS listing history
                </li>
                <li>
                  Redfin Estimate, shown alongside Zillow and county values as a
                  cross-check
                </li>
              </ul>
            </Subsection>

            <Subsection title="Freddie Mac Primary Mortgage Market Survey (PMMS) via FRED">
              <p>
                URL:{" "}
                <ExtLink href="https://fred.stlouisfed.org">
                  fred.stlouisfed.org
                </ExtLink>
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>
                  Provides historical weekly 30-year fixed mortgage rates,
                  aggregated to monthly averages
                </li>
              </ul>
            </Subsection>
          </Section>

          <Divider />

          {/* Valuation Method */}
          <Section title="Valuation Method">
            <ul className="list-disc space-y-2 pl-5">
              <li>
                Current values use the county-appraised &ldquo;just market
                value&rdquo; (TOTAL_MARKET field)
              </li>
              <li>
                This is the Property Appraiser&apos;s estimate of fair market
                value, updated annually
              </li>
              <li>
                It may differ from actual sale prices or Zillow/Redfin estimates
              </li>
            </ul>
          </Section>

          <Divider />

          {/* Return Calculations */}
          <Section title="Return Calculations">
            <div className="space-y-3">
              <Formula
                label="Total Return %"
                formula="(Current Value - Purchase Price) / Purchase Price x 100"
              />
              <Formula
                label="Annualized Return % (CAGR)"
                formula="((Current Value / Purchase Price) ^ (1 / Years Held) - 1) x 100"
              />
            </div>
            <p className="mt-4 text-sm text-slate-400">
              Properties with purchase prices under $1,000 are excluded from
              return calculations (likely non-arm&apos;s-length transfers such
              as family gifts or estate transfers).
            </p>
          </Section>

          <Divider />

          {/* Equity Estimates */}
          <Section title="Equity Estimates">
            <ul className="list-disc space-y-2 pl-5">
              <li>
                Assumes conventional financing with configurable down payment
                (default 20%)
              </li>
              <li>
                Uses the 30-year fixed rate from Freddie Mac PMMS for the month
                of purchase
              </li>
              <li>
                Standard amortization formula calculates remaining principal
                balance
              </li>
              <li>
                Estimated Equity = Est. Market Value - Remaining Principal
              </li>
              <li>
                These are estimates only; actual loan terms, refinancing, and
                HELOCs are unknown
              </li>
            </ul>
          </Section>

          <Divider />

          {/* Flip Detection */}
          <Section title="Flip Detection">
            <ul className="list-disc space-y-2 pl-5">
              <li>
                A property is flagged as a &ldquo;likely flip&rdquo; if it was
                purchased and then sold again within 3 years at 30% or more
                above the purchase price
              </li>
              <li>
                This is a heuristic; the actual reason for the price increase
                (renovation, market conditions, etc.) is unknown
              </li>
            </ul>
          </Section>

          <Divider />

          {/* Save Our Homes (SOH) Analysis */}
          <Section title="Save Our Homes (SOH) Analysis">
            <ul className="list-disc space-y-2 pl-5">
              <li>
                Florida&apos;s Save Our Homes amendment caps annual assessed
                value increases at 3% for homesteaded properties
              </li>
              <li>
                The gap between assessed value and market value represents
                accumulated SOH savings
              </li>
              <li>
                Tax impact estimates use an approximate millage rate of 19 mills
              </li>
              <li>
                Portability allows homesteaders to transfer some SOH savings
                when purchasing a new Florida home
              </li>
            </ul>
          </Section>

          <Divider />

          {/* Limitations & Disclaimers */}
          <Section title="Limitations & Disclaimers">
            <ul className="list-disc space-y-2 pl-5">
              <li>
                Assessed values are not actual sale prices and may not reflect
                current market conditions
              </li>
              <li>
                Zillow and Redfin estimates are automated models, not
                appraisals; they can be stale for individual homes (one home
                showed a Zestimate equal to its tax value after a $1.085M sale,
                and uses the Redfin estimate instead)
              </li>
              <li>
                Equity calculations use assumed loan terms; actual financing is
                unknown
              </li>
              <li>
                Sale history may include non-arm&apos;s-length transactions
                (family transfers, estate sales)
              </li>
              <li>
                Bedroom and bathroom counts are not yet available (data
                collection in progress)
              </li>
              <li>
                Data is refreshed manually; check the date below for currency
              </li>
            </ul>
          </Section>

          <Divider />

          {/* Last Data Refresh */}
          <Section title="Last Data Refresh">
            <p className="text-teal-400 font-medium">
              Data last refreshed: February 2026
            </p>
          </Section>
        </div>

        {/* Back to dashboard link */}
        <div className="mt-12 border-t border-slate-700/50 pt-6">
          <Link
            href="/"
            className="text-sm text-teal-400 transition-colors hover:text-teal-300"
          >
            &larr; Back to dashboard
          </Link>
        </div>
      </article>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Reusable sub-components (file-local)                               */
/* ------------------------------------------------------------------ */

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-4 text-xl font-semibold text-white">{title}</h2>
      <div className="text-sm leading-relaxed text-slate-300">{children}</div>
    </section>
  );
}

function Subsection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4 last:mb-0">
      <h3 className="mb-1 text-sm font-medium text-slate-200">{title}</h3>
      <div className="text-sm text-slate-400">{children}</div>
    </div>
  );
}

function Formula({ label, formula }: { label: string; formula: string }) {
  return (
    <div className="rounded-md border border-slate-700 bg-slate-800/50 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className="mt-1 font-mono text-sm text-teal-400">{formula}</p>
    </div>
  );
}

function Divider() {
  return <hr className="border-slate-700/50" />;
}

function ExtLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-teal-400 underline decoration-teal-400/30 underline-offset-2 transition-colors hover:text-teal-300 hover:decoration-teal-300/50"
    >
      {children}
    </a>
  );
}
