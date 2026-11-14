import React from 'react';
import { BookmarkPlus, Check, Info, Loader2, Sparkles } from 'lucide-react';
import { MarketAnalysisResult, MarketInput } from '../types';
import { OpportunityMatrixChart } from '../components/Charts';
import {
  AiProcessingBanner,
  ErrorAlert,
  ProvenanceBanner,
  VerifiedVsAiHeader,
} from '../components/ProvenanceBanner';

interface MarketIntelligenceViewProps {
  input: MarketInput;
  onChangeInput: (next: MarketInput) => void;
  analysis: MarketAnalysisResult;
  onAnalyze: () => void;
  isLoading: boolean;
  error: string | null;
  onClearError: () => void;
  onSaveSnapshot: () => void;
  savedJustNow: boolean;
}

export const MarketIntelligenceView: React.FC<MarketIntelligenceViewProps> = ({
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
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAnalyze();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#0B1B35]">Market Intelligence</h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Synthesize structural demand dynamics, competitive positioning, and whitespace opportunities from your market brief.
          </p>
        </div>
        <button
          type="button"
          onClick={onSaveSnapshot}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md border border-slate-300 bg-white hover:border-[#C59B27] text-xs font-semibold text-[#0B1B35] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          {savedJustNow ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <BookmarkPlus className="w-3.5 h-3.5 text-[#9A7214]" />}
          <span>{savedJustNow ? 'Saved to Workspace' : 'Save Snapshot'}</span>
        </button>
      </div>

      {error && <ErrorAlert message={error} onDismiss={onClearError} />}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Market Input Form */}
        <form
          onSubmit={handleSubmit}
          className="xl:col-span-5 bg-white border border-slate-200 rounded-lg p-5 space-y-4"
        >
          <VerifiedVsAiHeader
            kind="verified"
            title="Market Context Inputs"
            subtitle="Qualitative Input Brief"
          />

          <div>
            <label htmlFor="mi-industry" className="block text-xs font-semibold text-slate-700 mb-1">
              Industry
            </label>
            <input
              id="mi-industry"
              type="text"
              required
              value={input.industry}
              onChange={(e) => onChangeInput({ ...input, industry: e.target.value })}
              placeholder="e.g., Enterprise B2B FinTech SaaS"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#0B1B35]"
            />
          </div>

          <div>
            <label htmlFor="mi-target" className="block text-xs font-semibold text-slate-700 mb-1">
              Target Market
            </label>
            <textarea
              id="mi-target"
              rows={3}
              required
              value={input.targetMarket}
              onChange={(e) => onChangeInput({ ...input, targetMarket: e.target.value })}
              placeholder="Describe customer segment, geography, deal size, and buyer persona..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#0B1B35] leading-relaxed"
            />
          </div>

          <div>
            <label htmlFor="mi-competitors" className="block text-xs font-semibold text-slate-700 mb-1">
              Competitors
            </label>
            <textarea
              id="mi-competitors"
              rows={3}
              required
              value={input.competitors}
              onChange={(e) => onChangeInput({ ...input, competitors: e.target.value })}
              placeholder="List direct incumbents, emerging challengers, or substitute workflows..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#0B1B35] leading-relaxed"
            />
          </div>

          <div>
            <label htmlFor="mi-conditions" className="block text-xs font-semibold text-slate-700 mb-1">
              Market Conditions
            </label>
            <textarea
              id="mi-conditions"
              rows={3}
              required
              value={input.marketConditions}
              onChange={(e) => onChangeInput({ ...input, marketConditions: e.target.value })}
              placeholder="Note observed macro trends, CapEx climate, regulatory shifts, or buyer behavior..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#0B1B35] leading-relaxed"
            />
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-md p-3 flex items-start gap-2 text-xs text-slate-600 leading-relaxed">
            <Info className="w-4 h-4 text-[#1B365D] shrink-0 mt-0.5" />
            <span>
              Structural analysis only. AUREON AI does not pull or fabricate live market prices, live TAM feeds, or real-time financial tickers.
            </span>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-[#0B1B35] hover:bg-[#12284C] disabled:opacity-60 text-white text-sm font-medium transition-colors cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#D1A942]" />
                <span>Analyzing Market Structure...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-[#D1A942]" />
                <span>Generate Market Analysis &amp; Opportunities</span>
              </>
            )}
          </button>
        </form>

        {/* Results Column */}
        <div className="xl:col-span-7 space-y-6">
          <ProvenanceBanner
            sourceType={analysis.sourceType}
            generatedAt={analysis.generatedAt}
            factBasisLabel="Qualitative structural synthesis from user market brief"
            extraNote="No live market data fabricated"
          />

          {isLoading ? (
            <div className="space-y-4">
              <AiProcessingBanner detail="Synthesizing structural demand drivers and competitive positioning." />
              <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4 animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-1/3" />
                <div className="h-3 bg-slate-100 rounded w-full" />
                <div className="h-3 bg-slate-100 rounded w-4/5" />
                <div className="h-48 bg-slate-100 rounded" />
              </div>
            </div>
          ) : (
            <>
              <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
                <VerifiedVsAiHeader
                  kind="ai"
                  title="Market Structure & Demand Overview"
                  subtitle={analysis.sourceType === 'ai' ? 'Gemini Synthesis' : 'Sample Output'}
                />
                <p className="text-sm text-slate-700 leading-relaxed">{analysis.marketOverview}</p>
                <p className="text-xs text-slate-500 border-t border-slate-100 pt-3">
                  {analysis.dataIntegrityNotice}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  {analysis.demandDrivers.map((d) => (
                    <div key={d.factor} className="border border-slate-200 rounded-md p-3.5 space-y-1.5">
                      <div className="text-xs font-semibold text-[#0B1B35]">{d.factor}</div>
                      <div className="text-[11px] font-medium text-[#9A7214]">
                        Signal Strength: {d.strength}
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{d.explanation}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
                <VerifiedVsAiHeader
                  kind="ai"
                  title="Strategic Opportunity Matrix"
                  subtitle="AI Relative Scoring (1–5 Scale)"
                />
                <OpportunityMatrixChart opportunities={analysis.opportunities} />
                <div className="space-y-2.5 pt-2 border-t border-slate-100">
                  {analysis.opportunities.map((opp, idx) => (
                    <div key={opp.title} className="text-xs">
                      <span className="font-semibold text-[#0B1B35]">
                        0{idx + 1}. {opp.title}:
                      </span>{' '}
                      <span className="text-slate-600 leading-relaxed">{opp.summary}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
                <VerifiedVsAiHeader
                  kind="ai"
                  title="Competitive Landscape & Differentiation"
                  subtitle="Structural Comparison"
                />
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="py-2 pr-4 font-semibold">Competitor Segment</th>
                        <th className="py-2 px-3 font-semibold whitespace-nowrap">Intensity</th>
                        <th className="py-2 pl-3 font-semibold">Differentiation Angle</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {analysis.competitiveLandscape.map((seg) => (
                        <tr key={seg.segment}>
                          <td className="py-3 pr-4 font-medium text-[#0B1B35] align-top min-w-[160px]">
                            {seg.segment}
                          </td>
                          <td className="py-3 px-3 align-top whitespace-nowrap">
                            <span
                              className={`font-semibold ${
                                seg.intensity === 'High'
                                  ? 'text-red-700'
                                  : seg.intensity === 'Moderate'
                                  ? 'text-[#9A7214]'
                                  : 'text-emerald-700'
                              }`}
                            >
                              {seg.intensity}
                            </span>
                          </td>
                          <td className="py-3 pl-3 text-slate-600 leading-relaxed align-top">
                            {seg.differentiationAngle}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-200">
                  <div>
                    <h4 className="text-xs font-semibold text-[#0B1B35] mb-2">Structural Barriers</h4>
                    <ul className="space-y-1.5 text-xs text-slate-600 list-disc pl-4">
                      {analysis.structuralBarriers.map((b, i) => (
                        <li key={i} className="leading-relaxed">
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-[#0B1B35] mb-2">
                      Leading Indicators to Monitor
                    </h4>
                    <ul className="space-y-1.5 text-xs text-slate-600 list-disc pl-4">
                      {analysis.indicatorsToMonitor.map((ind, i) => (
                        <li key={i} className="leading-relaxed">
                          {ind}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
