import React, { useState } from 'react';
import { BookmarkPlus, Check, CheckSquare, Copy, Loader2, Sparkles, Square } from 'lucide-react';
import { RecommendationsResult, StrategyHorizon, StrategyPillar } from '../types';
import { CapitalAllocationChart } from '../components/Charts';
import {
  AiProcessingBanner,
  ErrorAlert,
  ProvenanceBanner,
  VerifiedVsAiHeader,
} from '../components/ProvenanceBanner';

interface RecommendationsViewProps {
  result: RecommendationsResult;
  strategicFocus: string;
  onChangeStrategicFocus: (val: string) => void;
  onGenerate: () => void;
  onToggleStep: (stepId: string) => void;
  isLoading: boolean;
  error: string | null;
  onClearError: () => void;
  onSaveSnapshot: () => void;
  savedJustNow: boolean;
}

const HORIZON_FILTERS: ('All' | StrategyHorizon)[] = ['All', 'Short-Term', 'Long-Term'];
const PILLAR_FILTERS: ('All' | StrategyPillar)[] = [
  'All',
  'Business Expansion',
  'Cost Optimisation',
  'Competitive Positioning',
  'Operational Improvement',
  'Growth Opportunities',
  'Risk Mitigation',
];

export const RecommendationsView: React.FC<RecommendationsViewProps> = ({
  result,
  strategicFocus,
  onChangeStrategicFocus,
  onGenerate,
  onToggleStep,
  isLoading,
  error,
  onClearError,
  onSaveSnapshot,
  savedJustNow,
}) => {
  const [horizonFilter, setHorizonFilter] = useState<'All' | StrategyHorizon>('All');
  const [pillarFilter, setPillarFilter] = useState<'All' | StrategyPillar>('All');
  const [copied, setCopied] = useState(false);

  const filteredRecommendations = result.recommendations.filter((r) => {
    if (horizonFilter !== 'All' && r.horizon !== horizonFilter) return false;
    if (pillarFilter !== 'All' && r.pillar !== pillarFilter) return false;
    return true;
  });

  const shortTermRecs = filteredRecommendations.filter((r) => r.horizon === 'Short-Term');
  const longTermRecs = filteredRecommendations.filter((r) => r.horizon === 'Long-Term');
  const completedCount = result.nextSteps.filter((s) => s.completed).length;

  const handleCopy = async () => {
    const lines = [
      `# AUREON AI — Strategic Recommendations`,
      `Thesis: ${result.strategicThesis}`,
      '',
      '## Short-Term Recommendations (0–6 Months)',
      ...result.recommendations
        .filter((r) => r.horizon === 'Short-Term')
        .map((r) => `- [${r.pillar}] ${r.title}: ${r.rationale} (Impact: ${r.expectedQualitativeImpact})`),
      '',
      '## Long-Term Recommendations (6–24 Months)',
      ...result.recommendations
        .filter((r) => r.horizon === 'Long-Term')
        .map((r) => `- [${r.pillar}] ${r.title}: ${r.rationale} (Impact: ${r.expectedQualitativeImpact})`),
      '',
      '## Suggested Next Steps',
      ...result.nextSteps.map((s) => `- ${s.step} (Owner: ${s.owner}, Target: ${s.timeframe}, KPI: ${s.kpi})`),
    ];
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#0B1B35]">AI Recommendations</h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Practical strategies across 6 operational and capital pillars, separated into Short-Term and Long-Term horizons.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-slate-300 bg-white hover:border-[#C59B27] text-xs font-semibold text-[#0B1B35] cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Report'}</span>
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

      {error && <ErrorAlert message={error} onDismiss={onClearError} />}

      {/* Strategy Focus Prompt Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
        <div className="flex flex-col md:flex-row md:items-end gap-3">
          <div className="flex-1">
            <label htmlFor="rec-focus" className="block text-xs font-semibold text-slate-700 mb-1">
              Strategic Mandate / Focus Area (Optional)
            </label>
            <input
              id="rec-focus"
              type="text"
              value={strategicFocus}
              onChange={(e) => onChangeStrategicFocus(e.target.value)}
              placeholder="e.g., Prioritize cost optimisation and risk mitigation before international expansion"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#0B1B35]"
            />
          </div>
          <button
            type="button"
            onClick={onGenerate}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-[#0B1B35] hover:bg-[#12284C] disabled:opacity-60 text-white text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#D1A942]" />
                <span>Synthesizing 6 Pillars...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-[#D1A942]" />
                <span>Generate AI Recommendations</span>
              </>
            )}
          </button>
        </div>
      </div>

      <ProvenanceBanner
        sourceType={result.sourceType}
        generatedAt={result.generatedAt}
        factBasisLabel="Covers Business Expansion, Cost Optimisation, Competitive Positioning, Operational Improvement, Growth & Risk Mitigation"
      />

      {isLoading ? (
        <div className="space-y-4">
          <AiProcessingBanner detail="Generating short-term and long-term strategies across 6 pillars." />
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4 animate-pulse">
            <div className="h-4 bg-slate-200 rounded w-1/3" />
            <div className="h-20 bg-slate-100 rounded" />
            <div className="h-48 bg-slate-100 rounded" />
          </div>
        </div>
      ) : (
        <>
          <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-5">
            <VerifiedVsAiHeader
              kind="ai"
              title="Core Strategic Thesis & Focus Allocation"
              subtitle={result.sourceType === 'ai' ? 'Gemini Strategy' : 'Fictional Demo'}
            />
            <p className="text-sm text-slate-700 leading-relaxed">{result.strategicThesis}</p>
            <div className="pt-2 border-t border-slate-100">
              <div className="text-xs font-semibold text-[#0B1B35] mb-3">
                Suggested Effort &amp; Capital Allocation Across 6 Pillars
              </div>
              <CapitalAllocationChart recommendations={result.recommendations} />
            </div>
          </section>

          {/* Horizon & Pillar Filters */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="inline-flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg self-start">
              {HORIZON_FILTERS.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setHorizonFilter(h)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    horizonFilter === h
                      ? 'bg-white text-[#0B1B35] shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-[#0B1B35]'
                  }`}
                >
                  {h === 'All' ? 'All Horizons' : h}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="pillar-select" className="text-xs font-semibold text-slate-600">
                Pillar:
              </label>
              <select
                id="pillar-select"
                value={pillarFilter}
                onChange={(e) => setPillarFilter(e.target.value as 'All' | StrategyPillar)}
                className="px-3 py-1.5 text-xs border border-slate-300 rounded-md bg-white focus:outline-none focus:border-[#0B1B35]"
              >
                {PILLAR_FILTERS.map((p) => (
                  <option key={p} value={p}>
                    {p === 'All' ? 'All 6 Strategic Pillars' : p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Short-Term vs Long-Term Separated Sections */}
          {shortTermRecs.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-base font-bold text-[#0B1B35]">
                Short-Term Recommendations <span className="text-xs font-normal text-slate-500">· 0–6 Months Execution</span>
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {shortTermRecs.map((rec) => (
                  <div key={rec.id} className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs text-slate-500 flex flex-wrap items-center gap-1.5 mb-1">
                          <span className="font-semibold text-[#9A7214]">{rec.pillar}</span>
                          <span aria-hidden="true">·</span>
                          <span>{rec.priority} Priority</span>
                        </div>
                        <h3 className="text-sm font-bold text-[#0B1B35]">{rec.title}</h3>
                      </div>
                      <span className="font-mono tabular-nums text-xs font-semibold text-[#0B1B35] shrink-0">
                        {rec.capitalAllocationSharePct}% focus
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{rec.rationale}</p>
                    <div className="pt-2 border-t border-slate-100 text-xs text-slate-700">
                      <span className="font-semibold text-[#0B1B35]">Expected Impact:</span>{' '}
                      {rec.expectedQualitativeImpact}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {longTermRecs.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-base font-bold text-[#0B1B35]">
                Long-Term Recommendations <span className="text-xs font-normal text-slate-500">· 6–24 Months Structural Positioning</span>
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {longTermRecs.map((rec) => (
                  <div key={rec.id} className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs text-slate-500 flex flex-wrap items-center gap-1.5 mb-1">
                          <span className="font-semibold text-[#1B365D]">{rec.pillar}</span>
                          <span aria-hidden="true">·</span>
                          <span>{rec.priority} Priority</span>
                        </div>
                        <h3 className="text-sm font-bold text-[#0B1B35]">{rec.title}</h3>
                      </div>
                      <span className="font-mono tabular-nums text-xs font-semibold text-[#0B1B35] shrink-0">
                        {rec.capitalAllocationSharePct}% focus
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{rec.rationale}</p>
                    <div className="pt-2 border-t border-slate-100 text-xs text-slate-700">
                      <span className="font-semibold text-[#0B1B35]">Expected Impact:</span>{' '}
                      {rec.expectedQualitativeImpact}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Suggested Next Steps Interactive Execution Table */}
          <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between gap-4 pb-3 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-[#0B1B35]">Suggested Next Steps &amp; Execution Plan</h3>
              <span className="text-xs font-mono tabular-nums text-slate-500">
                {completedCount}/{result.nextSteps.length} completed
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {result.nextSteps.map((step) => (
                <div
                  key={step.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <button
                    type="button"
                    onClick={() => onToggleStep(step.id)}
                    className="flex items-start gap-3 text-left cursor-pointer group flex-1"
                  >
                    {step.completed ? (
                      <CheckSquare className="w-4 h-4 text-[#9A7214] shrink-0 mt-0.5" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400 group-hover:text-[#0B1B35] shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div
                        className={`text-sm font-medium leading-snug ${
                          step.completed ? 'line-through text-slate-400' : 'text-[#0B1B35]'
                        }`}
                      >
                        {step.step}
                      </div>
                      <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                        <span>Owner: {step.owner}</span>
                        <span aria-hidden="true">·</span>
                        <span>Target: {step.timeframe}</span>
                      </div>
                    </div>
                  </button>
                  <div className="text-xs text-slate-600 sm:text-right pl-7 sm:pl-0 shrink-0 max-w-xs">
                    <span className="text-slate-400">KPI: </span>
                    <span className="font-medium text-[#0B1B35]">{step.kpi}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
};
