import React, { useState } from 'react';
import {
  AlertTriangle,
  BookmarkPlus,
  Check,
  CheckCircle2,
  Copy,
  Loader2,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { BusinessInput, MarketInput, RiskAssessmentResult, RiskCategoryAnalysis } from '../types';
import { computeCalculatedMetrics } from '../data/sampleProfiles';
import { formatCompactCurrency } from '../components/BrandMark';
import { RiskPostureMatrixChart } from '../components/Charts';
import {
  AiProcessingBanner,
  ErrorAlert,
  ProvenanceBanner,
  VerifiedVsAiHeader,
} from '../components/ProvenanceBanner';

interface RiskAssessmentViewProps {
  businessInput: BusinessInput;
  marketInput: MarketInput;
  assessment: RiskAssessmentResult;
  onAnalyze: () => void;
  isLoading: boolean;
  error: string | null;
  onClearError: () => void;
  onSaveSnapshot: () => void;
  savedJustNow: boolean;
}

function SeverityIndicator({ severity }: { severity: RiskCategoryAnalysis['severity'] }) {
  if (severity === 'High') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700">
        <ShieldAlert className="w-3.5 h-3.5" />
        <span>High Risk</span>
      </span>
    );
  }
  if (severity === 'Elevated') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
        <AlertTriangle className="w-3.5 h-3.5" />
        <span>Elevated Risk</span>
      </span>
    );
  }
  if (severity === 'Moderate') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#1B365D]">
        <AlertTriangle className="w-3.5 h-3.5" />
        <span>Moderate Risk</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
      <CheckCircle2 className="w-3.5 h-3.5" />
      <span>Low Risk</span>
    </span>
  );
}

export const RiskAssessmentView: React.FC<RiskAssessmentViewProps> = ({
  businessInput,
  marketInput,
  assessment,
  onAnalyze,
  isLoading,
  error,
  onClearError,
  onSaveSnapshot,
  savedJustNow,
}) => {
  const [copied, setCopied] = useState(false);
  const metrics = computeCalculatedMetrics(
    businessInput.revenue,
    businessInput.expenses,
    businessInput.employeeCount
  );

  const handleCopy = async () => {
    const text = [
      `# AUREON AI — 5-Domain Risk Assessment: ${businessInput.companyName}`,
      assessment.overallPostureSummary,
      '',
      ...assessment.risks.flatMap((r) => [
        `## ${r.category} Risk — ${r.severity} (Likelihood ${r.likelihoodScore}/5, Impact ${r.impactScore}/5)`,
        r.explanation,
        `Evidence Basis: ${r.evidenceBasis}`,
        `Mitigation Controls: ${r.mitigationControls.join('; ')}`,
        '',
      ]),
      `Stress-Test Commentary: ${assessment.stressTestNarrative}`,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
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
          <h1 className="text-xl font-bold text-[#0B1B35]">Risk Assessment</h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Five-domain risk diagnostic across Financial, Operational, Market, Competitive, and Regulatory exposures.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
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

          <button
            type="button"
            onClick={onAnalyze}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#0B1B35] hover:bg-[#12284C] disabled:opacity-60 text-white text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#D1A942]" />
                <span>Evaluating 5 Risk Domains...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-[#D1A942]" />
                <span>Run 5-Domain Risk Assessment</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && <ErrorAlert message={error} onDismiss={onClearError} />}

      {/* Active Profile Context Strip */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div>
          <div className="text-slate-500">Evaluated Entity</div>
          <div className="font-semibold text-[#0B1B35] mt-0.5 truncate">
            {businessInput.companyName} ({businessInput.country || 'Country Unspecified'})
          </div>
        </div>
        <div>
          <div className="text-slate-500">Operating Profit &amp; Margin</div>
          <div className="font-mono tabular-nums font-semibold text-[#0B1B35] mt-0.5">
            {metrics.operatingProfit !== null
              ? `${formatCompactCurrency(metrics.operatingProfit)} (${
                  metrics.operatingMarginPct !== null
                    ? `${metrics.operatingMarginPct.toFixed(1)}%`
                    : 'N/A'
                })`
              : 'Financials Unavailable'}
          </div>
        </div>
        <div>
          <div className="text-slate-500">Target Market</div>
          <div className="text-slate-700 mt-0.5 line-clamp-1">{marketInput.targetMarket}</div>
        </div>
        <div>
          <div className="text-slate-500">Market Conditions</div>
          <div className="text-slate-700 mt-0.5 line-clamp-1">{marketInput.marketConditions}</div>
        </div>
      </div>

      <ProvenanceBanner
        sourceType={assessment.sourceType}
        generatedAt={assessment.generatedAt}
        factBasisLabel="Evidence basis explicitly cites supplied/retrieved inputs without inventing unverified facts"
      />

      {isLoading ? (
        <div className="space-y-4">
          <AiProcessingBanner detail="Evaluating Financial, Operational, Market, Competitive, and Regulatory risk exposures." />
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4 animate-pulse">
            <div className="h-4 bg-slate-200 rounded w-1/3" />
            <div className="h-52 bg-slate-100 rounded" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-36 bg-slate-100 rounded" />
              <div className="h-36 bg-slate-100 rounded" />
            </div>
          </div>
        </div>
      ) : (
        <>
          <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <VerifiedVsAiHeader
              kind="ai"
              title="5-Domain Risk Exposure Matrix & Overall Posture"
              subtitle={assessment.sourceType === 'ai' ? 'Gemini Risk Analysis' : 'Fictional Demo'}
            />
            <p className="text-sm text-slate-700 leading-relaxed">{assessment.overallPostureSummary}</p>
            <RiskPostureMatrixChart risks={assessment.risks} />
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {assessment.risks.map((risk) => (
              <section
                key={risk.category}
                className="bg-white border border-slate-200 rounded-lg p-5 space-y-4"
              >
                <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200">
                  <div>
                    <h3 className="text-base font-bold text-[#0B1B35]">{risk.category} Risk</h3>
                    <div className="text-xs text-slate-500 font-mono tabular-nums mt-0.5">
                      Likelihood {risk.likelihoodScore.toFixed(1)}/5 · Impact {risk.impactScore.toFixed(1)}/5
                    </div>
                  </div>
                  <SeverityIndicator severity={risk.severity} />
                </div>

                <p className="text-sm text-slate-700 leading-relaxed">{risk.explanation}</p>

                <div className="bg-slate-50 border border-slate-200 rounded-md p-3 text-xs">
                  <span className="font-semibold text-[#1B365D]">Evidence Basis: </span>
                  <span className="text-slate-600 leading-relaxed">{risk.evidenceBasis}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                  <div>
                    <h4 className="text-xs font-semibold text-[#0B1B35] mb-1.5">Early Warning Signals</h4>
                    <ul className="space-y-1 text-xs text-slate-600 list-disc pl-4">
                      {risk.earlyWarningSignals.map((sig, i) => (
                        <li key={i} className="leading-relaxed">
                          {sig}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-[#0B1B35] mb-1.5">Mitigation Strategies</h4>
                    <ul className="space-y-1 text-xs text-slate-600 list-disc pl-4">
                      {risk.mitigationControls.map((ctrl, i) => (
                        <li key={i} className="leading-relaxed">
                          {ctrl}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>
            ))}
          </div>

          <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-2.5">
            <VerifiedVsAiHeader
              kind="ai"
              title="Qualitative Sensitivity & Stress-Test Commentary"
              subtitle="Illustrative Stress Case"
            />
            <p className="text-sm text-slate-700 leading-relaxed">{assessment.stressTestNarrative}</p>
          </section>
        </>
      )}
    </div>
  );
};
