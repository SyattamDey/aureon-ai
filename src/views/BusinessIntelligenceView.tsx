import React, { useState } from 'react';
import {
  BookmarkPlus,
  Check,
  Copy,
  Loader2,
  Printer,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Minus,
} from 'lucide-react';
import { BusinessAnalysisResult, BusinessInput } from '../types';
import { computeCalculatedMetrics } from '../data/sampleProfiles';
import { formatCurrency } from '../components/BrandMark';
import { FinancialStructureChart, ScenarioComparisonChart } from '../components/Charts';
import {
  AiProcessingBanner,
  ErrorAlert,
  ProvenanceBanner,
  VerifiedVsAiHeader,
} from '../components/ProvenanceBanner';

interface BusinessIntelligenceViewProps {
  input: BusinessInput;
  onChangeInput: (next: BusinessInput) => void;
  analysis: BusinessAnalysisResult;
  onAnalyze: () => void;
  isLoading: boolean;
  error: string | null;
  onClearError: () => void;
  onSaveSnapshot: () => void;
  savedJustNow: boolean;
}

export const BusinessIntelligenceView: React.FC<BusinessIntelligenceViewProps> = ({
  input,
  onChangeInput,
  analysis,
  onAnalyze,
  isLoading,
  error,
  onClearError,
  onSaveSnapshot,
  savedJustNow,
}) => {
  const [validationMsg, setValidationMsg] = useState<string | null>(null);
  const [copiedReport, setCopiedReport] = useState(false);

  const liveMetrics = computeCalculatedMetrics(
    input.revenue,
    input.expenses,
    input.employeeCount
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.companyName.trim() || !input.industry.trim() || !input.country.trim()) {
      setValidationMsg('Company name, industry, and country are required before running analysis.');
      return;
    }
    if (input.revenue !== null && input.revenue < 0) {
      setValidationMsg('Annual revenue cannot be negative.');
      return;
    }
    if (input.expenses !== null && input.expenses < 0) {
      setValidationMsg('Annual operating expenses cannot be negative.');
      return;
    }
    if (input.employeeCount !== null && input.employeeCount < 0) {
      setValidationMsg('Number of employees cannot be negative.');
      return;
    }
    setValidationMsg(null);
    onAnalyze();
  };

  const handleCopyReport = async () => {
    const lines = [
      `# AUREON AI — 12-Section Company Analysis Report`,
      `Company: ${input.companyName} (${input.country})`,
      `Industry: ${input.industry} | Basis: ${input.periodLabel}`,
      `Source Attribution: ${input.sourceAttribution || 'Manual User Entry'} | Generated: ${analysis.generatedAt}`,
      `Report Provenance: ${analysis.sourceType === 'ai' ? 'AI-Generated Synthesis (Informational)' : 'Fictional Demonstration Output'}`,
      '',
      '## Deterministic Financial Calculations',
      `- Annual Revenue: ${liveMetrics.revenue !== null ? formatCurrency(liveMetrics.revenue) : 'Unavailable'}`,
      `- Annual Operating Expenses: ${liveMetrics.expenses !== null ? formatCurrency(liveMetrics.expenses) : 'Unavailable'}`,
      `- ${liveMetrics.profitExplanation}`,
      `- ${liveMetrics.marginExplanation}`,
      `- Employees: ${input.employeeCount !== null ? input.employeeCount.toLocaleString('en-US') : 'Unavailable'}`,
      '',
      ...analysis.reportSections.flatMap((s) => [`## ${s.number}. ${s.title}`, s.content, '']),
      '## Supplied / Retrieved Evidence',
      ...analysis.suppliedEvidence.map((e) => `- ${e}`),
      '',
      '## AI Interpretations & Assumptions',
      ...analysis.aiAssumptions.map((a) => `- ${a}`),
      '',
      '## Missing Information / Data Gaps',
      ...analysis.missingInformation.map((m) => `- ${m}`),
      '',
      '---',
      'Disclaimer: Educational and informational purposes only. Estimates and AI interpretations are not verified financial facts or live market data.',
    ];

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopiedReport(true);
      setTimeout(() => setCopiedReport(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#0B1B35]">Business Intelligence</h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Analyse a selected registry company or manual inputs to compute operating profitability and generate a 12-section Gemini report.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0 no-print">
          <button
            type="button"
            onClick={handleCopyReport}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-slate-300 bg-white hover:border-[#C59B27] text-xs font-semibold text-[#0B1B35] transition-colors whitespace-nowrap cursor-pointer"
          >
            {copiedReport ? (
              <Check className="w-3.5 h-3.5 text-emerald-700" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>{copiedReport ? 'Copied Report' : 'Copy Report'}</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-slate-300 bg-white hover:border-[#C59B27] text-xs font-semibold text-[#0B1B35] transition-colors whitespace-nowrap cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Export / Print</span>
          </button>

          <button
            type="button"
            onClick={onSaveSnapshot}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md border border-slate-300 bg-white hover:border-[#C59B27] text-xs font-semibold text-[#0B1B35] transition-colors whitespace-nowrap cursor-pointer"
          >
            {savedJustNow ? (
              <Check className="w-3.5 h-3.5 text-emerald-700" />
            ) : (
              <BookmarkPlus className="w-3.5 h-3.5 text-[#9A7214]" />
            )}
            <span>{savedJustNow ? 'Saved' : 'Save Snapshot'}</span>
          </button>
        </div>
      </div>

      {(error || validationMsg) && (
        <ErrorAlert
          message={validationMsg || error || ''}
          onDismiss={() => {
            setValidationMsg(null);
            onClearError();
          }}
        />
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Input Form */}
        <form
          onSubmit={handleSubmit}
          className="xl:col-span-5 bg-white border border-slate-200 rounded-lg p-5 space-y-4 no-print"
        >
          <VerifiedVsAiHeader
            kind="verified"
            title="Company Profile & Financial Inputs"
            subtitle={input.sourceAttribution || 'Manual Entry'}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label htmlFor="bi-company" className="block text-xs font-semibold text-slate-700 mb-1">
                Company Name *
              </label>
              <input
                id="bi-company"
                type="text"
                required
                value={input.companyName}
                onChange={(e) => onChangeInput({ ...input, companyName: e.target.value })}
                placeholder="Enter company name"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#0B1B35]"
              />
            </div>

            <div>
              <label htmlFor="bi-industry" className="block text-xs font-semibold text-slate-700 mb-1">
                Industry *
              </label>
              <input
                id="bi-industry"
                type="text"
                required
                value={input.industry}
                onChange={(e) => onChangeInput({ ...input, industry: e.target.value })}
                placeholder="e.g., Industrial Robotics"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#0B1B35]"
              />
            </div>

            <div>
              <label htmlFor="bi-country" className="block text-xs font-semibold text-slate-700 mb-1">
                Country *
              </label>
              <input
                id="bi-country"
                type="text"
                required
                value={input.country}
                onChange={(e) => onChangeInput({ ...input, country: e.target.value })}
                placeholder="e.g., United States"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#0B1B35]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="bi-revenue" className="block text-xs font-semibold text-slate-700 mb-1">
                Annual Revenue (USD)
              </label>
              <input
                id="bi-revenue"
                type="number"
                min={0}
                step="any"
                value={input.revenue === null ? '' : input.revenue}
                onChange={(e) => {
                  const raw = e.target.value;
                  onChangeInput({
                    ...input,
                    revenue: raw === '' ? null : Number(raw),
                  });
                }}
                placeholder="Leave blank if unavailable"
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md focus:outline-none focus:border-[#0B1B35]"
              />
            </div>

            <div>
              <label htmlFor="bi-expenses" className="block text-xs font-semibold text-slate-700 mb-1">
                Annual Operating Expenses (USD)
              </label>
              <input
                id="bi-expenses"
                type="number"
                min={0}
                step="any"
                value={input.expenses === null ? '' : input.expenses}
                onChange={(e) => {
                  const raw = e.target.value;
                  onChangeInput({
                    ...input,
                    expenses: raw === '' ? null : Number(raw),
                  });
                }}
                placeholder="Leave blank if unavailable"
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md focus:outline-none focus:border-[#0B1B35]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="bi-employees" className="block text-xs font-semibold text-slate-700 mb-1">
                Number of Employees
              </label>
              <input
                id="bi-employees"
                type="number"
                min={0}
                step={1}
                value={input.employeeCount === null ? '' : input.employeeCount}
                onChange={(e) => {
                  const raw = e.target.value;
                  onChangeInput({
                    ...input,
                    employeeCount: raw === '' ? null : Math.round(Number(raw)),
                  });
                }}
                placeholder="Leave blank if unavailable"
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md focus:outline-none focus:border-[#0B1B35]"
              />
            </div>

            <div>
              <label htmlFor="bi-period" className="block text-xs font-semibold text-slate-700 mb-1">
                Reporting Period
              </label>
              <input
                id="bi-period"
                type="text"
                value={input.periodLabel}
                onChange={(e) => onChangeInput({ ...input, periodLabel: e.target.value })}
                placeholder="FY Annualized"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#0B1B35]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="bi-objectives" className="block text-xs font-semibold text-slate-700 mb-1">
              Business Objectives
            </label>
            <textarea
              id="bi-objectives"
              rows={3}
              value={input.objectives}
              onChange={(e) => onChangeInput({ ...input, objectives: e.target.value })}
              placeholder="Outline growth targets, margin goals, or geographic expansion priorities..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#0B1B35] leading-relaxed"
            />
          </div>

          <div>
            <label htmlFor="bi-challenges" className="block text-xs font-semibold text-slate-700 mb-1">
              Current Business Challenges
            </label>
            <textarea
              id="bi-challenges"
              rows={3}
              value={input.challenges}
              onChange={(e) => onChangeInput({ ...input, challenges: e.target.value })}
              placeholder="Describe operational bottlenecks, cost pressures, supply chain constraints, or competitive headwinds..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#0B1B35] leading-relaxed"
            />
          </div>

          {/* Calculation Audit Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-md p-3.5 space-y-2 text-xs">
            <div className="font-semibold text-[#0B1B35]">Deterministic Calculation Verification</div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <div className="text-slate-500">Operating Profit</div>
                <div
                  className={`font-mono tabular-nums font-semibold mt-0.5 ${
                    liveMetrics.operatingProfit !== null && liveMetrics.operatingProfit < 0
                      ? 'text-red-700'
                      : 'text-[#0B1B35]'
                  }`}
                >
                  {liveMetrics.operatingProfit !== null
                    ? formatCurrency(liveMetrics.operatingProfit)
                    : 'Unavailable'}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Profit Margin</div>
                <div className="font-mono tabular-nums font-semibold text-[#0B1B35] mt-0.5">
                  {liveMetrics.operatingMarginPct !== null
                    ? `${liveMetrics.operatingMarginPct.toFixed(2)}%`
                    : 'N/A'}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Rev / Employee</div>
                <div className="font-mono tabular-nums font-semibold text-[#0B1B35] mt-0.5">
                  {liveMetrics.revenuePerEmployee !== null
                    ? formatCurrency(liveMetrics.revenuePerEmployee)
                    : 'Unavailable'}
                </div>
              </div>
            </div>
            <div className="text-[11px] text-slate-600 space-y-1 pt-1 border-t border-slate-200 leading-relaxed">
              <div>{liveMetrics.profitExplanation}</div>
              <div>{liveMetrics.marginExplanation}</div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-[#0B1B35] hover:bg-[#12284C] disabled:opacity-60 text-white text-sm font-semibold tracking-wide transition-colors cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#D1A942]" />
                <span>Generating 12-Section Analysis...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-[#D1A942]" />
                <span>ANALYSE BUSINESS</span>
              </>
            )}
          </button>
        </form>

        {/* Right Column: Charts & 12-Section Gemini Report */}
        <div className="xl:col-span-7 space-y-6">
          <ProvenanceBanner
            sourceType={analysis.sourceType}
            generatedAt={analysis.generatedAt}
            factBasisLabel={
              input.recordOrigin === 'fictional_demo'
                ? 'Fictional demonstration data — not a real company'
                : `Basis: ${input.sourceAttribution || 'Manual User Entry'}`
            }
          />

          <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <VerifiedVsAiHeader
              kind="verified"
              title="Unit Economics & Operating Profit Breakdown"
              subtitle="Deterministic Input Chart"
            />
            <FinancialStructureChart metrics={liveMetrics} />
          </section>

          {isLoading ? (
            <div className="space-y-4">
              <AiProcessingBanner detail="Evaluating financials and generating the 12-section report with automatic retry protection." />
              <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4 animate-pulse">
                <div className="h-5 bg-slate-200 rounded w-1/2" />
                <div className="h-3 bg-slate-100 rounded w-full" />
                <div className="h-3 bg-slate-100 rounded w-5/6" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="h-28 bg-slate-100 rounded" />
                  <div className="h-28 bg-slate-100 rounded" />
                </div>
                <div className="h-36 bg-slate-100 rounded" />
              </div>
            </div>
          ) : (
            <>
              {/* Evidence, Assumptions & Missing Info Audit */}
              <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
                <VerifiedVsAiHeader
                  kind="ai"
                  title="Evidence Discipline, Assumptions & Data Gaps"
                  subtitle="Fact vs. AI Separation"
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="border border-slate-200 rounded-md p-3.5 space-y-2 bg-slate-50/50">
                    <div className="font-semibold text-[#1B365D]">Supplied / Retrieved Facts</div>
                    <ul className="space-y-1 text-slate-700 list-disc pl-4">
                      {analysis.suppliedEvidence.map((item, i) => (
                        <li key={i} className="leading-relaxed">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="border border-slate-200 rounded-md p-3.5 space-y-2">
                    <div className="font-semibold text-[#9A7214]">AI Interpretations &amp; Assumptions</div>
                    <ul className="space-y-1 text-slate-600 list-disc pl-4">
                      {analysis.aiAssumptions.map((item, i) => (
                        <li key={i} className="leading-relaxed">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="border border-slate-200 rounded-md p-3.5 space-y-2">
                    <div className="font-semibold text-slate-700">Missing Information</div>
                    <ul className="space-y-1 text-slate-600 list-disc pl-4">
                      {analysis.missingInformation.map((item, i) => (
                        <li key={i} className="leading-relaxed">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>

              {/* 12-Section Structured Gemini Company Analysis Report */}
              <section className="bg-white border border-slate-200 rounded-lg p-5 sm:p-6 space-y-5">
                <VerifiedVsAiHeader
                  kind="ai"
                  title="12-Section Institutional Company Analysis Report"
                  subtitle={analysis.sourceType === 'ai' ? 'Gemini Report' : 'Fictional Demo Report'}
                />

                <div className="grid grid-cols-1 gap-4 divide-y divide-slate-100">
                  {analysis.reportSections.map((section) => (
                    <article key={section.number} className="pt-4 first:pt-0 space-y-1.5">
                      <h4 className="text-sm font-bold text-[#0B1B35]">
                        <span className="font-mono text-[#9A7214] mr-2">
                          {String(section.number).padStart(2, '0')}.
                        </span>
                        {section.title}
                      </h4>
                      <p className="text-sm text-slate-700 leading-relaxed">{section.content}</p>
                    </article>
                  ))}
                </div>
              </section>

              {/* Performance Drivers & Objective Alignment */}
              <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
                <VerifiedVsAiHeader
                  kind="ai"
                  title="Key Performance Drivers & Objective Alignment"
                  subtitle="AI Evaluation"
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {analysis.performanceDrivers.map((driver) => (
                    <div
                      key={driver.title}
                      className="border border-slate-200 rounded-md p-3.5 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2 text-xs font-semibold">
                        <span className="text-[#0B1B35]">{driver.title}</span>
                        {driver.impactDirection === 'Positive' && (
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        )}
                        {driver.impactDirection === 'Pressure' && (
                          <TrendingDown className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                        )}
                        {driver.impactDirection === 'Neutral' && (
                          <Minus className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{driver.observation}</p>
                    </div>
                  ))}
                </div>

                {analysis.objectiveAlignment.length > 0 && (
                  <div className="overflow-x-auto pt-2">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500">
                          <th className="py-2 pr-4 font-semibold">Stated Objective</th>
                          <th className="py-2 px-3 font-semibold whitespace-nowrap">Readiness</th>
                          <th className="py-2 pl-3 font-semibold">Rationale</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {analysis.objectiveAlignment.map((row) => (
                          <tr key={row.objective}>
                            <td className="py-2.5 pr-4 font-medium text-[#0B1B35] align-top">
                              {row.objective}
                            </td>
                            <td className="py-2.5 px-3 align-top whitespace-nowrap">
                              <span
                                className={`font-semibold ${
                                  row.readiness === 'Strong'
                                    ? 'text-emerald-700'
                                    : row.readiness === 'Moderate'
                                    ? 'text-[#9A7214]'
                                    : 'text-red-700'
                                }`}
                              >
                                {row.readiness}
                              </span>
                            </td>
                            <td className="py-2.5 pl-3 text-slate-600 leading-relaxed align-top">
                              {row.rationale}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {/* Illustrative Scenarios */}
              <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
                <VerifiedVsAiHeader
                  kind="ai"
                  title="Illustrative Sensitivity Scenarios"
                  subtitle="Conceptual Modeling · Not Verified Forecasts"
                />
                <ScenarioComparisonChart
                  baseRevenue={liveMetrics.revenue}
                  baseMarginPct={liveMetrics.operatingMarginPct}
                  scenarios={analysis.illustrativeScenarios}
                />
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
