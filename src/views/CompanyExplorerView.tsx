import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Copy,
  Database,
  ExternalLink,
  FileSpreadsheet,
  Globe2,
  Info,
  Loader2,
  PlusCircle,
  Search,
  Sparkles,
  XCircle,
} from 'lucide-react';
import {
  CompanyOwnershipStatus,
  CompanyRecord,
  ProviderStatus,
  WorldRegion,
} from '../types';
import { FICTIONAL_DEMO_COMPANIES } from '../data/sampleProfiles';
import { formatCurrency } from '../components/BrandMark';
import { ErrorAlert } from '../components/ProvenanceBanner';

interface CompanyExplorerViewProps {
  onSelectForBusiness: (record: CompanyRecord, autoRunReport: boolean) => void;
}

const REGIONS: WorldRegion[] = [
  'All Regions',
  'North America',
  'Europe',
  'Asia-Pacific',
  'Latin America',
  'Middle East & Africa',
];

export const CompanyExplorerView: React.FC<CompanyExplorerViewProps> = ({
  onSelectForBusiness,
}) => {
  const [dataMode, setDataMode] = useState<'live' | 'demo'>('live');
  const [query, setQuery] = useState('');
  const [ownershipFilter, setOwnershipFilter] = useState<'All' | 'Public' | 'Private'>('All');
  const [regionFilter, setRegionFilter] = useState<WorldRegion>('All Regions');
  const [countryFilter, setCountryFilter] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');

  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [results, setResults] = useState<CompanyRecord[]>([]);
  const [suggestions, setSuggestions] = useState<CompanyRecord[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [searching, setSearching] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedProfile, setSelectedProfile] = useState<CompanyRecord | null>(null);
  const [copiedProfile, setCopiedProfile] = useState(false);

  // Manual Entry Modal / Panel
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualCountry, setManualCountry] = useState('');
  const [manualHq, setManualHq] = useState('');
  const [manualIndustry, setManualIndustry] = useState('');
  const [manualOwnership, setManualOwnership] = useState<CompanyOwnershipStatus>('Private');
  const [manualExchange, setManualExchange] = useState('');
  const [manualTicker, setManualTicker] = useState('');
  const [manualRegId, setManualRegId] = useState('');
  const [manualRevenue, setManualRevenue] = useState('');
  const [manualExpenses, setManualExpenses] = useState('');
  const [manualEmployees, setManualEmployees] = useState('');

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch provider statuses on mount
  useEffect(() => {
    fetch('/api/companies/providers')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.providers)) setProviders(data.providers);
      })
      .catch(() => {});
  }, []);

  // Close autocomplete dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Filter Fictional Demo Companies when in demo mode
  const filterDemoCompanies = (qText: string) => {
    const q = qText.trim().toLowerCase();
    const c = countryFilter.trim().toLowerCase();
    const ind = industryFilter.trim().toLowerCase();

    return FICTIONAL_DEMO_COMPANIES.filter((item) => {
      if (ownershipFilter !== 'All' && item.ownershipStatus !== ownershipFilter) return false;
      if (regionFilter !== 'All Regions' && item.region !== regionFilter) return false;
      if (c && !item.country.toLowerCase().includes(c)) return false;
      if (ind && !(item.industry || '').toLowerCase().includes(ind)) return false;
      if (q) {
        const hay = `${item.companyName} ${item.ticker || ''} ${item.industry || ''} ${item.country}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  };

  // Debounced Autocomplete & Live Filter
  useEffect(() => {
    if (dataMode === 'demo') {
      const demoMatches = filterDemoCompanies(query);
      setResults(demoMatches);
      setSuggestions(query.trim().length >= 1 ? demoMatches.slice(0, 6) : []);
      setWarnings([]);
      return;
    }

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      if (trimmed.length === 0) setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          q: trimmed,
          ownership: ownershipFilter,
          region: regionFilter,
          country: countryFilter.trim(),
          industry: industryFilter.trim(),
        });
        const res = await fetch(`/api/companies/search?${params.toString()}`);
        const data = await res.json();
        if (Array.isArray(data.results)) {
          setSuggestions(data.results.slice(0, 8));
        }
      } catch {
        // silent for autocomplete
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [query, dataMode, ownershipFilter, regionFilter, countryFilter, industryFilter]);

  const executeSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setDropdownOpen(false);
    setError(null);

    if (dataMode === 'demo') {
      setResults(filterDemoCompanies(query));
      return;
    }

    if (query.trim().length < 2) {
      setError('Enter at least 2 characters (company name or stock ticker) to search live registries.');
      return;
    }

    setSearching(true);
    try {
      const params = new URLSearchParams({
        q: query.trim(),
        ownership: ownershipFilter,
        region: regionFilter,
        country: countryFilter.trim(),
        industry: industryFilter.trim(),
      });
      const res = await fetch(`/api/companies/search?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Company discovery search failed.');
      setResults(Array.isArray(data.results) ? data.results : []);
      setWarnings(Array.isArray(data.warnings) ? data.warnings : []);
      if (Array.isArray(data.providers)) setProviders(data.providers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to query company registries.');
    } finally {
      setSearching(false);
    }
  };

  const handleOpenProfile = async (record: CompanyRecord) => {
    setDropdownOpen(false);
    setError(null);

    // If SEC EDGAR record, fetch live filings + XBRL financial figures
    if (record.recordOrigin === 'sec_edgar' && record.id.startsWith('sec-')) {
      const cik = record.id.replace('sec-', '');
      setLoadingProfile(true);
      setSelectedProfile(record);
      try {
        const res = await fetch(`/api/companies/sec/${encodeURIComponent(cik)}`);
        if (res.ok) {
          const detailed = (await res.json()) as CompanyRecord;
          setSelectedProfile(detailed);
        }
      } catch {
        // Keep base directory record if detailed XBRL endpoint times out
      } finally {
        setLoadingProfile(false);
      }
      return;
    }

    setSelectedProfile(record);
  };

  const handleCreateManualRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim() || !manualCountry.trim()) return;

    const revNum = manualRevenue.trim() === '' ? null : Number(manualRevenue);
    const expNum = manualExpenses.trim() === '' ? null : Number(manualExpenses);
    const empNum = manualEmployees.trim() === '' ? null : Math.round(Number(manualEmployees));

    const profit =
      revNum !== null && Number.isFinite(revNum) && expNum !== null && Number.isFinite(expNum)
        ? revNum - expNum
        : null;

    const manualRecord: CompanyRecord = {
      id: `manual-${Date.now()}`,
      companyName: manualName.trim(),
      country: manualCountry.trim(),
      region: 'Global / Other',
      headquarters: manualHq.trim() || null,
      industry: manualIndustry.trim() || null,
      ownershipStatus: manualOwnership,
      stockExchange: manualOwnership === 'Public' ? manualExchange.trim() || null : null,
      ticker: manualOwnership === 'Public' ? manualTicker.trim() || null : null,
      registrationId: manualRegId.trim() || null,
      sourceName: 'Manual User Entry',
      sourceUrl: null,
      lastUpdated: new Date().toLocaleDateString('en-US', { dateStyle: 'medium' }),
      recordOrigin: 'manual',
      annualRevenue: revNum !== null && Number.isFinite(revNum) && revNum >= 0 ? revNum : null,
      annualOperatingExpenses:
        expNum !== null && Number.isFinite(expNum) && expNum >= 0 ? expNum : null,
      operatingProfit: profit,
      employeeCount: empNum !== null && Number.isFinite(empNum) && empNum >= 0 ? empNum : null,
      currency: 'USD',
      fiscalPeriod: 'User Supplied Basis',
      description: 'Manually entered company profile for strategic and financial assessment.',
    };

    setShowManualForm(false);
    setSelectedProfile(manualRecord);
  };

  const handleCopyProfile = async (rec: CompanyRecord) => {
    const lines = [
      `AUREON AI — Company Profile Summary`,
      `Company: ${rec.companyName}`,
      `Origin: ${
        rec.recordOrigin === 'fictional_demo'
          ? 'FICTIONAL DEMONSTRATION RECORD'
          : rec.sourceName
      }`,
      `Status: ${rec.ownershipStatus}${rec.ticker ? ` (${rec.stockExchange || 'Exchange N/A'}: ${rec.ticker})` : ''}`,
      `Country / HQ: ${rec.country}${rec.headquarters ? ` · ${rec.headquarters}` : ''}`,
      `Industry: ${rec.industry || 'Unavailable'}`,
      `Registration / ID: ${rec.registrationId || 'Unavailable'}`,
      `Last Updated: ${rec.lastUpdated || 'Unavailable'}`,
      `Annual Revenue: ${rec.annualRevenue !== null ? formatCurrency(rec.annualRevenue) : 'Unavailable'}`,
      `Annual Operating Expenses: ${rec.annualOperatingExpenses !== null ? formatCurrency(rec.annualOperatingExpenses) : 'Unavailable'}`,
      `Operating Profit: ${rec.operatingProfit !== null ? formatCurrency(rec.operatingProfit) : 'Unavailable'}`,
      `Employees: ${rec.employeeCount !== null ? rec.employeeCount.toLocaleString('en-US') : 'Unavailable'}`,
    ];
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopiedProfile(true);
      setTimeout(() => setCopiedProfile(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  // Company Profile Detail View
  if (selectedProfile) {
    const isDemo = selectedProfile.recordOrigin === 'fictional_demo';
    const marginPct =
      selectedProfile.annualRevenue !== null &&
      selectedProfile.annualRevenue > 0 &&
      selectedProfile.operatingProfit !== null
        ? ((selectedProfile.operatingProfit / selectedProfile.annualRevenue) * 100).toFixed(2)
        : null;

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setSelectedProfile(null)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1B365D] hover:text-[#9A7214] cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Global Company Explorer</span>
          </button>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => handleCopyProfile(selectedProfile)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-slate-300 bg-white hover:border-[#C59B27] text-xs font-medium text-[#0B1B35] cursor-pointer"
            >
              {copiedProfile ? (
                <Check className="w-3.5 h-3.5 text-emerald-700" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copiedProfile ? 'Copied Profile' : 'Copy Profile'}</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectForBusiness(selectedProfile, false)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md border border-[#0B1B35] bg-white hover:bg-slate-50 text-xs font-semibold text-[#0B1B35] cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#1B365D]" />
              <span>Load into Business Intelligence</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectForBusiness(selectedProfile, true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#0B1B35] hover:bg-[#12284C] text-white text-xs font-semibold cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#D1A942]" />
              <span>Run 12-Section Gemini Report</span>
            </button>
          </div>
        </div>

        {isDemo && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg px-4 py-3 text-xs text-amber-950 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Fictional Demonstration Record:</span> This profile is synthetic academic test data and does not represent a real operating corporation.
            </div>
          </div>
        )}

        {/* Profile Header Card */}
        <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 border-b border-slate-200 pb-5">
            <div className="space-y-1.5">
              <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
                <span className="font-semibold text-[#9A7214]">{selectedProfile.ownershipStatus}</span>
                <span aria-hidden="true">·</span>
                <span>{selectedProfile.country}</span>
                {selectedProfile.ticker && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono font-semibold text-[#0B1B35]">
                      {selectedProfile.stockExchange ? `${selectedProfile.stockExchange}: ` : ''}
                      {selectedProfile.ticker}
                    </span>
                  </>
                )}
              </div>
              <h1 className="text-2xl font-bold text-[#0B1B35]">{selectedProfile.companyName}</h1>
              {selectedProfile.description && (
                <p className="text-sm text-slate-600 max-w-3xl leading-relaxed">
                  {selectedProfile.description}
                </p>
              )}
            </div>

            <div className="text-xs text-slate-500 md:text-right space-y-1 shrink-0">
              <div className="font-semibold text-[#0B1B35]">Source: {selectedProfile.sourceName}</div>
              <div>Updated: {selectedProfile.lastUpdated || 'Unavailable'}</div>
              {selectedProfile.sourceUrl && (
                <a
                  href={selectedProfile.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[#1B365D] hover:text-[#9A7214] underline"
                >
                  <span>View Official Registry</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>

          {loadingProfile ? (
            <div className="py-6 flex items-center gap-2.5 text-sm text-slate-600">
              <Loader2 className="w-4 h-4 animate-spin text-[#9A7214]" />
              <span>Retrieving live SEC EDGAR submissions and XBRL annual financial facts...</span>
            </div>
          ) : (
            <>
              {/* Identity Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md">
                  <div className="text-slate-500">Headquarters</div>
                  <div className="font-semibold text-[#0B1B35] mt-1">
                    {selectedProfile.headquarters || 'Unavailable'}
                  </div>
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md">
                  <div className="text-slate-500">Industry / SIC</div>
                  <div className="font-semibold text-[#0B1B35] mt-1">
                    {selectedProfile.industry || 'Unavailable'}
                  </div>
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md">
                  <div className="text-slate-500">Registry Identifier</div>
                  <div className="font-mono font-semibold text-[#0B1B35] mt-1">
                    {selectedProfile.registrationId || 'Unavailable'}
                  </div>
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md">
                  <div className="text-slate-500">Reporting Period</div>
                  <div className="font-semibold text-[#0B1B35] mt-1">
                    {selectedProfile.fiscalPeriod || 'Unavailable'}
                  </div>
                </div>
              </div>

              {/* Financial Facts Grid (Unavailable vs 0 strictly distinguished) */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-[#0B1B35]">
                    Retrieved Financial &amp; Workforce Snapshot
                  </h2>
                  <span className="text-xs text-slate-500">
                    Unavailable fields remain blank/unfilled — never guessed
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="border border-slate-200 rounded-md p-4">
                    <div className="text-xs text-slate-500">Annual Revenue</div>
                    <div className="text-lg font-bold font-mono tabular-nums text-[#0B1B35] mt-1">
                      {selectedProfile.annualRevenue !== null
                        ? formatCurrency(selectedProfile.annualRevenue)
                        : 'Unavailable'}
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-md p-4">
                    <div className="text-xs text-slate-500">Annual Operating Expenses</div>
                    <div className="text-lg font-bold font-mono tabular-nums text-[#0B1B35] mt-1">
                      {selectedProfile.annualOperatingExpenses !== null
                        ? formatCurrency(selectedProfile.annualOperatingExpenses)
                        : 'Unavailable'}
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-md p-4">
                    <div className="text-xs text-slate-500">Operating Profit</div>
                    <div
                      className={`text-lg font-bold font-mono tabular-nums mt-1 ${
                        selectedProfile.operatingProfit !== null && selectedProfile.operatingProfit < 0
                          ? 'text-red-700'
                          : 'text-[#0B1B35]'
                      }`}
                    >
                      {selectedProfile.operatingProfit !== null
                        ? `${formatCurrency(selectedProfile.operatingProfit)}${
                            marginPct !== null ? ` (${marginPct}%)` : ''
                          }`
                        : 'Unavailable'}
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-md p-4">
                    <div className="text-xs text-slate-500">Employees</div>
                    <div className="text-lg font-bold font-mono tabular-nums text-[#0B1B35] mt-1">
                      {selectedProfile.employeeCount !== null
                        ? selectedProfile.employeeCount.toLocaleString('en-US')
                        : 'Unavailable'}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#0B1B35]">Global Company Explorer</h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Discover public and private companies across connected registries, inspect filings, or enter companies manually.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="inline-flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
            <button
              type="button"
              onClick={() => {
                setDataMode('live');
                setResults([]);
                setError(null);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                dataMode === 'live'
                  ? 'bg-white text-[#0B1B35] shadow-xs'
                  : 'text-slate-600 hover:text-[#0B1B35]'
              }`}
            >
              Live External Registries
            </button>
            <button
              type="button"
              onClick={() => {
                setDataMode('demo');
                setError(null);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                dataMode === 'demo'
                  ? 'bg-white text-[#9A7214] shadow-xs'
                  : 'text-slate-600 hover:text-[#0B1B35]'
              }`}
            >
              Fictional Demo Mode
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setManualName(query.trim());
              setShowManualForm((v) => !v);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md border border-[#0B1B35] bg-white hover:bg-slate-50 text-xs font-semibold text-[#0B1B35] whitespace-nowrap cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5 text-[#9A7214]" />
            <span>Manual Company Entry</span>
          </button>
        </div>
      </div>

      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

      {/* Mode Isolation Banner */}
      {dataMode === 'demo' ? (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-950 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Demonstration Mode Active:</span> Displaying strictly isolated fictional companies for academic and testing workflows. Never mixed with live external company records.
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#0B1B35]">
              <Database className="w-4 h-4 text-[#1B365D]" />
              <span>Connected Registry Coverage &amp; Source Limitations</span>
            </div>
            <span className="text-[11px] text-slate-500">
              No single source contains every company worldwide; unconfigured sources remain transparently disabled.
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {providers.map((p) => (
              <div
                key={p.id}
                className="border border-slate-200 rounded-md p-3 text-xs space-y-1 bg-slate-50/50"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-[#0B1B35]">{p.name}</span>
                  {p.connected ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Connected</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 shrink-0">
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Unconfigured</span>
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500">{p.regionScope}</div>
                <p className="text-[11px] text-slate-600 leading-snug">{p.limitationNote}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Manual Company Entry Drawer */}
      {showManualForm && (
        <form
          onSubmit={handleCreateManualRecord}
          className="bg-white border border-[#C59B27] rounded-lg p-5 space-y-4"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h2 className="text-sm font-bold text-[#0B1B35]">Manual Company Entry</h2>
              <p className="text-xs text-slate-500">
                Enter any private or international company when external registry credentials are unavailable or a firm is unlisted.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowManualForm(false)}
              className="text-xs text-slate-500 hover:text-[#0B1B35] underline cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Company Name *</label>
              <input
                type="text"
                required
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                placeholder="e.g., Helvetia Precision AG"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:border-[#0B1B35]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Country *</label>
              <input
                type="text"
                required
                value={manualCountry}
                onChange={(e) => setManualCountry(e.target.value)}
                placeholder="e.g., Switzerland"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:border-[#0B1B35]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Headquarters</label>
              <input
                type="text"
                value={manualHq}
                onChange={(e) => setManualHq(e.target.value)}
                placeholder="e.g., Zurich"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:border-[#0B1B35]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Industry</label>
              <input
                type="text"
                value={manualIndustry}
                onChange={(e) => setManualIndustry(e.target.value)}
                placeholder="e.g., Medical Devices"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:border-[#0B1B35]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Ownership Status</label>
              <select
                value={manualOwnership}
                onChange={(e) => setManualOwnership(e.target.value as CompanyOwnershipStatus)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md bg-white focus:outline-none focus:border-[#0B1B35]"
              >
                <option value="Private">Private Company</option>
                <option value="Public">Publicly Listed</option>
              </select>
            </div>
            {manualOwnership === 'Public' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Stock Exchange</label>
                  <input
                    type="text"
                    value={manualExchange}
                    onChange={(e) => setManualExchange(e.target.value)}
                    placeholder="e.g., SIX"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ticker Symbol</label>
                  <input
                    type="text"
                    value={manualTicker}
                    onChange={(e) => setManualTicker(e.target.value)}
                    placeholder="e.g., HLVP"
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-md"
                  />
                </div>
              </>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Registration ID</label>
              <input
                type="text"
                value={manualRegId}
                onChange={(e) => setManualRegId(e.target.value)}
                placeholder="Optional registry ID"
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Annual Revenue (USD)</label>
              <input
                type="number"
                min={0}
                step="any"
                value={manualRevenue}
                onChange={(e) => setManualRevenue(e.target.value)}
                placeholder="Leave blank if unavailable"
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Operating Expenses (USD)</label>
              <input
                type="number"
                min={0}
                step="any"
                value={manualExpenses}
                onChange={(e) => setManualExpenses(e.target.value)}
                placeholder="Leave blank if unavailable"
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Employees</label>
              <input
                type="number"
                min={0}
                value={manualEmployees}
                onChange={(e) => setManualEmployees(e.target.value)}
                placeholder="Leave blank if unavailable"
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-md"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 rounded-md bg-[#0B1B35] hover:bg-[#12284C] text-white text-xs font-semibold cursor-pointer"
            >
              Create Company Profile
            </button>
          </div>
        </form>
      )}

      {/* Search & Filter Control Panel */}
      <form
        onSubmit={executeSearch}
        className="bg-white border border-slate-200 rounded-lg p-5 space-y-4"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          {/* Search Input with Autocomplete Dropdown */}
          <div className="lg:col-span-6 relative" ref={dropdownRef}>
            <label htmlFor="explorer-search" className="block text-xs font-semibold text-slate-700 mb-1">
              Company Name or Ticker Search
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="explorer-search"
                type="text"
                value={query}
                onFocus={() => setDropdownOpen(true)}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setDropdownOpen(true);
                }}
                placeholder={
                  dataMode === 'live'
                    ? 'Search live SEC EDGAR issuers (e.g., Apple, Microsoft, NVDA, Caterpillar)...'
                    : 'Filter fictional demonstration companies...'
                }
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#0B1B35]"
              />
            </div>

            {dropdownOpen && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-300 rounded-md shadow-lg z-20 max-h-64 overflow-y-auto divide-y divide-slate-100">
                {suggestions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleOpenProfile(item)}
                    className="w-full text-left px-3 py-2.5 hover:bg-slate-50 flex items-center justify-between gap-3 cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[#0B1B35] truncate">
                        {item.companyName}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {item.ownershipStatus} · {item.country} · {item.sourceName}
                      </div>
                    </div>
                    {item.ticker && (
                      <span className="font-mono text-xs font-semibold text-[#9A7214] shrink-0">
                        {item.ticker}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Ownership Segmented Filter */}
          <div className="lg:col-span-3">
            <span className="block text-xs font-semibold text-slate-700 mb-1">Ownership Status</span>
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-md border border-slate-200">
              {(['All', 'Public', 'Private'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setOwnershipFilter(status)}
                  className={`py-1.5 text-xs font-medium rounded transition-colors cursor-pointer ${
                    ownershipFilter === status
                      ? 'bg-white text-[#0B1B35] shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-[#0B1B35]'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Search Submit */}
          <div className="lg:col-span-3 flex items-end">
            <button
              type="submit"
              disabled={searching}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-[#0B1B35] hover:bg-[#12284C] disabled:opacity-60 text-white text-sm font-medium transition-colors cursor-pointer"
            >
              {searching ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#D1A942]" />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 text-[#D1A942]" />
                  <span>Search Companies</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Secondary Geographic & Industry Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
          <div>
            <label htmlFor="filter-region" className="block text-xs font-semibold text-slate-700 mb-1">
              Region
            </label>
            <select
              id="filter-region"
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value as WorldRegion)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md bg-white focus:outline-none focus:border-[#0B1B35]"
            >
              {REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="filter-country" className="block text-xs font-semibold text-slate-700 mb-1">
              Country Filter
            </label>
            <input
              id="filter-country"
              type="text"
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              placeholder="e.g., United States, United Kingdom..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:border-[#0B1B35]"
            />
          </div>
          <div>
            <label htmlFor="filter-industry" className="block text-xs font-semibold text-slate-700 mb-1">
              Industry Filter
            </label>
            <input
              id="filter-industry"
              type="text"
              value={industryFilter}
              onChange={(e) => setIndustryFilter(e.target.value)}
              placeholder="e.g., Robotics, FinTech, Logistics..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:border-[#0B1B35]"
            />
          </div>
        </div>
      </form>

      {warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-900 space-y-1">
          {warnings.map((w, i) => (
            <div key={i}>{w}</div>
          ))}
        </div>
      )}

      {/* Results List */}
      <section className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>
            {dataMode === 'demo'
              ? `Showing ${results.length} fictional demonstration profiles`
              : results.length > 0
              ? `Found ${results.length} verified registry records`
              : 'Enter a company name or ticker above to query live registries'}
          </span>
          {dataMode === 'live' && (
            <span>Tip: Try &ldquo;Microsoft&rdquo;, &ldquo;NVDA&rdquo;, or &ldquo;Caterpillar&rdquo; for live SEC EDGAR filings</span>
          )}
        </div>

        {results.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-8 text-center space-y-3">
            <Globe2 className="w-8 h-8 text-slate-300 mx-auto" />
            <div className="text-sm font-semibold text-[#0B1B35]">
              {dataMode === 'live' && query.trim().length >= 2 && !searching
                ? 'No matching records returned by connected external registries'
                : dataMode === 'live'
                ? 'Search Live Corporate Filings or Enter Any Company Manually'
                : 'No demonstration profiles match your active filters'}
            </div>
            <p className="text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
              {dataMode === 'live'
                ? 'Private entities and non-US issuers require UK Companies House, OpenCorporates, or FMP server credentials. You can add any unlisted or international company via Manual Company Entry.'
                : 'Try clearing region, country, or ownership filters to view all fictional demonstration companies.'}
            </p>
            <div className="pt-1 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setManualName(query.trim());
                  setShowManualForm(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#0B1B35] text-white text-xs font-medium cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5 text-[#D1A942]" />
                <span>Enter Company Manually</span>
              </button>
              {dataMode === 'live' && (
                <button
                  type="button"
                  onClick={() => setDataMode('demo')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md border border-slate-300 bg-white text-xs font-medium text-[#0B1B35] cursor-pointer"
                >
                  <span>Browse Fictional Demo Set</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.map((rec) => (
              <div
                key={rec.id}
                className="bg-white border border-slate-200 hover:border-[#C59B27] rounded-lg p-4 flex flex-col justify-between gap-4 transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold text-[#9A7214]">{rec.ownershipStatus}</span>
                        <span aria-hidden="true">·</span>
                        <span>{rec.country}</span>
                        {rec.ticker && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono font-semibold text-[#0B1B35]">
                              {rec.stockExchange ? `${rec.stockExchange}: ` : ''}
                              {rec.ticker}
                            </span>
                          </>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-[#0B1B35] mt-0.5">{rec.companyName}</h3>
                    </div>
                    <Building2 className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
                    <div>
                      <span className="text-slate-400">HQ: </span>
                      <span>{rec.headquarters || 'Unavailable'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Industry: </span>
                      <span>{rec.industry || 'Unavailable'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">ID: </span>
                      <span className="font-mono">{rec.registrationId || 'Unavailable'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Source: </span>
                      <span>{rec.sourceName}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                  <span className="text-slate-400">Updated: {rec.lastUpdated || 'Unavailable'}</span>
                  <button
                    type="button"
                    onClick={() => handleOpenProfile(rec)}
                    className="inline-flex items-center gap-1 font-semibold text-[#1B365D] hover:text-[#9A7214] cursor-pointer"
                  >
                    <span>Open Profile</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
