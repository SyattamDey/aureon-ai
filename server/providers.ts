import type {
  CompanyRecord,
  ProviderStatus,
} from '../src/types.ts';

const DEFAULT_SEC_UA =
  process.env.SEC_EDGAR_USER_AGENT || 'AureonAI/1.0 (institutional-research@aureon.example)';

interface SecTickerRow {
  cik: number;
  name: string;
  ticker: string;
  exchange: string;
}

let secTickersCache: { fetchedAt: number; rows: SecTickerRow[] } | null = null;
const SEC_CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours

export function getProviderStatuses(): ProviderStatus[] {
  return [
    {
      id: 'sec_edgar',
      name: 'SEC EDGAR',
      regionScope: 'United States Public Filings',
      connected: true,
      requiresKey: false,
      envVarName: 'SEC_EDGAR_USER_AGENT',
      limitationNote:
        'Covers SEC-registered public issuers only. Private US firms and non-SEC foreign issuers are not listed.',
    },
    {
      id: 'companies_house',
      name: 'UK Companies House',
      regionScope: 'United Kingdom Registry (Public & Private)',
      connected: Boolean(process.env.COMPANIES_HOUSE_API_KEY),
      requiresKey: true,
      envVarName: 'COMPANIES_HOUSE_API_KEY',
      limitationNote: process.env.COMPANIES_HOUSE_API_KEY
        ? 'Connected to UK Companies House registry search.'
        : 'Not connected. Configure COMPANIES_HOUSE_API_KEY in server secrets for UK registry records.',
    },
    {
      id: 'opencorporates',
      name: 'OpenCorporates',
      regionScope: 'Global Corporate Registries',
      connected: Boolean(process.env.OPENCORPORATES_API_TOKEN),
      requiresKey: true,
      envVarName: 'OPENCORPORATES_API_TOKEN',
      limitationNote: process.env.OPENCORPORATES_API_TOKEN
        ? 'Connected to OpenCorporates global registry discovery.'
        : 'Not connected. Configure OPENCORPORATES_API_TOKEN in server secrets for global registry coverage.',
    },
    {
      id: 'fmp',
      name: 'Financial Modeling Prep',
      regionScope: 'Global Public Equities & Financial Statements',
      connected: Boolean(process.env.FMP_API_KEY),
      requiresKey: true,
      envVarName: 'FMP_API_KEY',
      limitationNote: process.env.FMP_API_KEY
        ? 'Connected to Financial Modeling Prep global equity profiles.'
        : 'Not connected. Configure FMP_API_KEY in server secrets for international exchange financials.',
    },
  ];
}

async function getSecTickerRows(): Promise<SecTickerRow[]> {
  if (secTickersCache && Date.now() - secTickersCache.fetchedAt < SEC_CACHE_TTL_MS) {
    return secTickersCache.rows;
  }

  // company_tickers_exchange.json includes exchange directly: fields [cik, name, ticker, exchange]
  const res = await fetch('https://www.sec.gov/files/company_tickers_exchange.json', {
    headers: {
      'User-Agent': DEFAULT_SEC_UA,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(9000),
  });

  if (!res.ok) {
    throw new Error(`SEC EDGAR directory returned HTTP ${res.status}`);
  }

  const payload = (await res.json()) as { data?: Array<[number, string, string, string]> };
  const rawData = Array.isArray(payload.data) ? payload.data : [];
  const rows: SecTickerRow[] = rawData.map(([cik, name, ticker, exchange]) => ({
    cik: Number(cik),
    name: String(name || ''),
    ticker: String(ticker || ''),
    exchange: String(exchange || ''),
  }));

  secTickersCache = { fetchedAt: Date.now(), rows };
  return rows;
}

export async function searchSecEdgar(query: string, limit = 15): Promise<CompanyRecord[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const rows = await getSecTickerRows();

  const exactMatches: SecTickerRow[] = [];
  const prefixMatches: SecTickerRow[] = [];
  const substringMatches: SecTickerRow[] = [];

  for (const row of rows) {
    const nameLower = row.name.toLowerCase();
    const tickerLower = row.ticker.toLowerCase();
    if (tickerLower === q || nameLower === q) {
      exactMatches.push(row);
    } else if (tickerLower.startsWith(q) || nameLower.startsWith(q)) {
      prefixMatches.push(row);
    } else if (nameLower.includes(q) || tickerLower.includes(q)) {
      substringMatches.push(row);
    }
    if (exactMatches.length + prefixMatches.length >= limit * 2) {
      // Enough high-relevance hits collected
      if (exactMatches.length >= limit) break;
    }
  }

  const merged = [...exactMatches, ...prefixMatches, ...substringMatches].slice(0, limit);
  return merged.map((r) => {
    const cikPadded = String(r.cik).padStart(10, '0');
    return {
      id: `sec-${cikPadded}`,
      companyName: r.name,
      country: 'United States',
      region: 'North America',
      headquarters: null,
      industry: null,
      ownershipStatus: 'Public',
      stockExchange: r.exchange || null,
      ticker: r.ticker || null,
      registrationId: `CIK ${cikPadded}`,
      sourceName: 'SEC EDGAR',
      sourceUrl: `https://www.sec.gov/edgar/browse/?CIK=${cikPadded}`,
      lastUpdated: 'Directory live via SEC EDGAR',
      recordOrigin: 'sec_edgar',
      annualRevenue: null,
      annualOperatingExpenses: null,
      operatingProfit: null,
      employeeCount: null,
      currency: 'USD',
      fiscalPeriod: null,
      description: null,
    };
  });
}

function extractLatestAnnualUsdFact(
  factsRoot: Record<string, unknown>,
  conceptCandidates: string[]
): { value: number | null; endDate: string | null; form: string | null } {
  const usGaap = (factsRoot?.facts as Record<string, unknown> | undefined)?.['us-gaap'] as
    | Record<string, { units?: { USD?: Array<{ val?: number; form?: string; end?: string; fp?: string; frame?: string }> } }>
    | undefined;

  if (!usGaap) return { value: null, endDate: null, form: null };

  for (const concept of conceptCandidates) {
    const entries = usGaap[concept]?.units?.USD;
    if (!Array.isArray(entries) || entries.length === 0) continue;

    // Prefer 10-K / 20-F / FY entries sorted descending by end date
    const annualEntries = entries
      .filter(
        (e) =>
          typeof e.val === 'number' &&
          Number.isFinite(e.val) &&
          (e.form === '10-K' || e.form === '20-F' || e.form === '40-F' || e.fp === 'FY')
      )
      .sort((a, b) => String(b.end || '').localeCompare(String(a.end || '')));

    if (annualEntries.length > 0) {
      const latest = annualEntries[0];
      return {
        value: typeof latest.val === 'number' ? latest.val : null,
        endDate: latest.end ?? null,
        form: latest.form ?? null,
      };
    }
  }
  return { value: null, endDate: null, form: null };
}

export async function getSecCompanyDetail(cikRaw: string): Promise<CompanyRecord> {
  const digits = cikRaw.replace(/\D/g, '');
  const cikPadded = digits.padStart(10, '0');

  const [subRes, factsRes] = await Promise.all([
    fetch(`https://data.sec.gov/submissions/CIK${cikPadded}.json`, {
      headers: { 'User-Agent': DEFAULT_SEC_UA, Accept: 'application/json' },
      signal: AbortSignal.timeout(9000),
    }),
    fetch(`https://data.sec.gov/api/xbrl/companyfacts/CIK${cikPadded}.json`, {
      headers: { 'User-Agent': DEFAULT_SEC_UA, Accept: 'application/json' },
      signal: AbortSignal.timeout(9000),
    }).catch(() => null),
  ]);

  if (!subRes.ok) {
    throw new Error(`SEC submissions lookup failed (HTTP ${subRes.status})`);
  }

  const sub = (await subRes.json()) as {
    name?: string;
    sicDescription?: string;
    tickers?: string[];
    exchanges?: string[];
    ein?: string;
    stateOfIncorporation?: string;
    addresses?: {
      business?: {
        city?: string;
        stateOrCountry?: string;
        stateOrCountryDescription?: string;
      };
    };
    filings?: {
      recent?: {
        filingDate?: string[];
      };
    };
  };

  let annualRevenue: number | null = null;
  let annualOperatingExpenses: number | null = null;
  let operatingProfit: number | null = null;
  let fiscalEnd: string | null = null;

  if (factsRes && factsRes.ok) {
    const factsJson = (await factsRes.json()) as Record<string, unknown>;
    const revFact = extractLatestAnnualUsdFact(factsJson, [
      'RevenueFromContractWithCustomerExcludingAssessedTax',
      'Revenues',
      'SalesRevenueNet',
      'RevenueFromContractWithCustomerIncludingAssessedTax',
      'InterestAndDividendIncomeOperating',
    ]);
    const opIncomeFact = extractLatestAnnualUsdFact(factsJson, ['OperatingIncomeLoss']);
    const costsAndExpFact = extractLatestAnnualUsdFact(factsJson, ['CostsAndExpenses']);

    annualRevenue = revFact.value;
    fiscalEnd = revFact.endDate || opIncomeFact.endDate;

    if (
      annualRevenue !== null &&
      opIncomeFact.value !== null &&
      (!revFact.endDate || !opIncomeFact.endDate || revFact.endDate === opIncomeFact.endDate)
    ) {
      const totalOpCosts = annualRevenue - opIncomeFact.value;
      annualOperatingExpenses = totalOpCosts >= 0 ? totalOpCosts : null;
      operatingProfit = opIncomeFact.value;
    } else if (costsAndExpFact.value !== null) {
      annualOperatingExpenses = costsAndExpFact.value;
      operatingProfit =
        annualRevenue !== null ? annualRevenue - annualOperatingExpenses : opIncomeFact.value;
    } else {
      operatingProfit = opIncomeFact.value;
    }
  }

  const bizAddr = sub.addresses?.business;
  const hqParts = [bizAddr?.city, bizAddr?.stateOrCountryDescription || bizAddr?.stateOrCountry]
    .filter(Boolean)
    .join(', ');
  const latestFilingDate = sub.filings?.recent?.filingDate?.[0] ?? null;

  return {
    id: `sec-${cikPadded}`,
    companyName: sub.name || `Issuer CIK ${cikPadded}`,
    country: 'United States',
    region: 'North America',
    headquarters: hqParts || null,
    industry: sub.sicDescription || null,
    ownershipStatus: 'Public',
    stockExchange: sub.exchanges?.[0] || null,
    ticker: sub.tickers?.[0] || null,
    registrationId: sub.ein ? `CIK ${cikPadded} · EIN ${sub.ein}` : `CIK ${cikPadded}`,
    sourceName: 'SEC EDGAR (Submissions & XBRL)',
    sourceUrl: `https://www.sec.gov/edgar/browse/?CIK=${cikPadded}`,
    lastUpdated: latestFilingDate || fiscalEnd || 'Available via SEC EDGAR',
    recordOrigin: 'sec_edgar',
    annualRevenue,
    annualOperatingExpenses,
    operatingProfit,
    employeeCount: null, // Not standardized in SEC XBRL companyfacts summary
    currency: 'USD',
    fiscalPeriod: fiscalEnd ? `FY ending ${fiscalEnd}` : null,
    description: sub.sicDescription
      ? `SEC-registered issuer classified under ${sub.sicDescription}.`
      : null,
  };
}

export async function searchCompaniesHouse(query: string, limit = 10): Promise<CompanyRecord[]> {
  const apiKey = process.env.COMPANIES_HOUSE_API_KEY;
  if (!apiKey) return [];

  const auth = Buffer.from(`${apiKey}:`).toString('base64');
  const res = await fetch(
    `https://api.company-information.service.gov.uk/search/companies?q=${encodeURIComponent(
      query
    )}&items_per_page=${limit}`,
    {
      headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    }
  );
  if (!res.ok) {
    throw new Error(`Companies House returned HTTP ${res.status}`);
  }

  const data = (await res.json()) as {
    items?: Array<{
      company_number?: string;
      title?: string;
      company_type?: string;
      address_snippet?: string;
      date_of_creation?: string;
      company_status?: string;
    }>;
  };

  return (data.items || []).map((item) => {
    const isPlc = (item.company_type || '').toLowerCase().includes('plc');
    return {
      id: `uk-${item.company_number}`,
      companyName: item.title || 'Unknown UK Entity',
      country: 'United Kingdom',
      region: 'Europe',
      headquarters: item.address_snippet || null,
      industry: null,
      ownershipStatus: isPlc ? 'Public' : 'Private',
      stockExchange: null,
      ticker: null,
      registrationId: item.company_number ? `UK Co. No. ${item.company_number}` : null,
      sourceName: 'UK Companies House',
      sourceUrl: item.company_number
        ? `https://find-and-update.company-information.service.gov.uk/company/${item.company_number}`
        : null,
      lastUpdated: item.date_of_creation ? `Inc. ${item.date_of_creation}` : 'Live Registry',
      recordOrigin: 'companies_house',
      annualRevenue: null,
      annualOperatingExpenses: null,
      operatingProfit: null,
      employeeCount: null,
      currency: 'GBP',
      fiscalPeriod: null,
      description: item.company_status ? `Registry status: ${item.company_status}` : null,
    };
  });
}

export async function searchOpenCorporates(query: string, limit = 10): Promise<CompanyRecord[]> {
  const token = process.env.OPENCORPORATES_API_TOKEN;
  if (!token) return [];

  const res = await fetch(
    `https://api.opencorporates.com/v0.4/companies/search?q=${encodeURIComponent(
      query
    )}&per_page=${limit}&api_token=${encodeURIComponent(token)}`,
    {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    }
  );
  if (!res.ok) {
    throw new Error(`OpenCorporates returned HTTP ${res.status}`);
  }

  const data = (await res.json()) as {
    results?: {
      companies?: Array<{
        company?: {
          name?: string;
          company_number?: string;
          jurisdiction_code?: string;
          registered_address_in_full?: string;
          opencorporates_url?: string;
          retrieved_at?: string;
          company_type?: string;
        };
      }>;
    };
  };

  return (data.results?.companies || [])
    .map((c) => c.company)
    .filter((c): c is NonNullable<typeof c> => Boolean(c?.name))
    .map((c) => ({
      id: `oc-${c.jurisdiction_code || 'xx'}-${c.company_number || c.name}`,
      companyName: c.name!,
      country: (c.jurisdiction_code || 'International').toUpperCase(),
      region: 'Global / Other',
      headquarters: c.registered_address_in_full || null,
      industry: null,
      ownershipStatus: 'Unknown',
      stockExchange: null,
      ticker: null,
      registrationId: c.company_number
        ? `${(c.jurisdiction_code || '').toUpperCase()} ${c.company_number}`.trim()
        : null,
      sourceName: 'OpenCorporates',
      sourceUrl: c.opencorporates_url || null,
      lastUpdated: c.retrieved_at ? c.retrieved_at.slice(0, 10) : 'Registry Record',
      recordOrigin: 'opencorporates',
      annualRevenue: null,
      annualOperatingExpenses: null,
      operatingProfit: null,
      employeeCount: null,
      currency: 'USD',
      fiscalPeriod: null,
      description: c.company_type || null,
    }));
}

export async function searchFmp(query: string, limit = 10): Promise<CompanyRecord[]> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) return [];

  const res = await fetch(
    `https://financialmodelingprep.com/stable/search-name?query=${encodeURIComponent(
      query
    )}&limit=${limit}&apikey=${encodeURIComponent(apiKey)}`,
    {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    }
  );
  if (!res.ok) {
    throw new Error(`FMP returned HTTP ${res.status}`);
  }

  const rows = (await res.json()) as Array<{
    symbol?: string;
    name?: string;
    currency?: string;
    exchangeFullName?: string;
    exchange?: string;
  }>;

  if (!Array.isArray(rows)) return [];

  return rows.map((r) => ({
    id: `fmp-${r.symbol}`,
    companyName: r.name || r.symbol || 'Listed Issuer',
    country: 'Global Exchange Listing',
    region: 'Global / Other',
    headquarters: null,
    industry: null,
    ownershipStatus: 'Public',
    stockExchange: r.exchangeFullName || r.exchange || null,
    ticker: r.symbol || null,
    registrationId: r.symbol ? `Ticker ${r.symbol}` : null,
    sourceName: 'Financial Modeling Prep',
    sourceUrl: null,
    lastUpdated: 'Live Equity Directory',
    recordOrigin: 'fmp',
    annualRevenue: null,
    annualOperatingExpenses: null,
    operatingProfit: null,
    employeeCount: null,
    currency: r.currency || 'USD',
    fiscalPeriod: null,
    description: null,
  }));
}
