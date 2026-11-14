import React from 'react';
import {
  ArrowRight,
  Building2,
  Globe2,
  Lightbulb,
  Loader2,
  Search,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import {
  BusinessAnalysisResult,
  BusinessInput,
  MarketAnalysisResult,
  NavSection,
  RecommendationsResult,
  RiskAssessmentResult,
} from '../types';
import { computeCalculatedMetrics } from '../data/sampleProfiles';
import { formatCompactCurrency } from '../components/BrandMark';
import { FinancialStructureChart, RiskPostureMatrixChart } from '../components/Charts';
import {
  AiProcessingBanner,
  ErrorAlert,
  ProvenanceBanner,
  VerifiedVsAiHeader,
} from '../components/ProvenanceBanner';
import { AiConnectionTestPanel } from '../components/AiConnectionTestPanel';

interface OverviewViewProps {
  businessInput: BusinessInput;
  businessAnalysis: BusinessAnalysisResult;
  marketAnalysis: MarketAnalysisResult;
  riskAssessment: RiskAssessmentResult;
  recommendations: RecommendationsResult;
  onNavigate: (section: NavSection) => void;
  onRunFullSuite: () => void;
  isSuiteRunning: boolean;
  suiteStatusLabel: string | null;
  error: string | null;
  onClearError: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  businessInput,
  businessAnalysis,
  marketAnalysis,
  riskAssessment,
  recommendations,
  onNavigate,
  onRunFullSuite,
  isSuiteRunning,
  suiteStatusLabel,
  error,
  onClearError,
}) => {
  const liveMetrics = computeCalculatedMetrics(
    businessInput.revenue,
    businessInput.expenses,
    businessInput.employeeCount
  );
  const completedSteps = recommendations.nextSteps.filter((s) => s.completed).length;

  return (
    <div className="space-y-6">
      {/* Executive Command Header */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
            <span>{businessInput.industry || 'Industry Unspecified'}</span>
            <span aria-hidden="true">·</span>
            <span>{businessInput.country || 'Country Unspecified'}</span>
            <span aria-hidden="true">·</span>
            <span>{businessInput.sourceAttribution || 'Manual Profile'}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0B1B35]">
            {businessInput.companyName || 'Untitled Company Profile'}
          </h1>
          <p className="text-sm text-slate-600 max-w-3xl leading-relaxed">
            {businessAnalysis.executiveSummary}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('explorer')}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-md border border-slate-300 bg-white hover:border-[#C59B27] text-xs font-semibold text-[#0B1B35] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Search className="w-3.5 h-3.5 text-[#1B365D]" />
            <span>Explore Global Companies</span>
          </button>

          <button
            type="button"
            onClick={onRunFullSuite}
            disabled={isSuiteRunning}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-[#0B1B35] hover:bg-[#12284C] disabled:opacity-60 text-white text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isSuiteRunning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#D1A942]" />
                <span>{suiteStatusLabel || 'Running Suite...'}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-[#D1A942]" />
                <span>Run Full AI Suite</span>
              </>
            )}
          </button>
        </div>
      </div>

      {isSuiteRunning && <AiProcessingBanner detail={suiteStatusLabel} />}
      {error && <ErrorAlert message={error} onDismiss={onClearError} />}

      {/* 4 Deterministic Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span>Annual Revenue</span>
            <span>Input / Filing</span>
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-[#0B1B35]">
            {liveMetrics.revenue !== null ? formatCompactCurrency(liveMetrics.revenue) : 'Unavailable'}
          </div>
          <p className="text-xs text-slate-500 mt-1.5">{businessInput.periodLabel}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span>Operating Expenses</span>
            <span>Input / Filing</span>
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-[#0B1B35]">
            {liveMetrics.expenses !== null ? formatCompactCurrency(liveMetrics.expenses) : 'Unavailable'}
          </div>
          <p className="text-xs text-slate-500 mt-1.5 font-mono tabular-nums">
            {liveMetrics.expenseRatioPct !== null
              ? `Expense Ratio: ${liveMetrics.expenseRatioPct.toFixed(1)}%`
              : 'Expense Ratio: N/A'}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span>Operating Profit</span>
            <span>Calculated</span>
          </div>
          <div
            className={`text-2xl font-bold font-mono tabular-nums ${
              liveMetrics.operatingProfit !== null && liveMetrics.operatingProfit < 0
                ? 'text-red-700'
                : 'text-[#0B1B35]'
            }`}
          >
            {liveMetrics.operatingProfit !== null
              ? formatCompactCurrency(liveMetrics.operatingProfit)
              : 'Unavailable'}
          </div>
          <p className="text-xs text-slate-500 mt-1.5 font-mono tabular-nums">
            Employees:{' '}
            {businessInput.employeeCount !== null
              ? businessInput.employeeCount.toLocaleString('en-US')
              : 'Unavailable'}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span>Operating Margin</span>
            <span>Calculated</span>
          </div>
          <div
            className={`text-2xl font-bold font-mono tabular-nums ${
              liveMetrics.operatingMarginPct === null
                ? 'text-slate-500'
                : liveMetrics.operatingMarginPct >= 0
                ? 'text-[#9A7214]'
                : 'text-red-700'
            }`}
          >
            {liveMetrics.operatingMarginPct !== null
              ? `${liveMetrics.operatingMarginPct > 0 ? '+' : ''}${liveMetrics.operatingMarginPct.toFixed(1)}%`
              : 'N/A'}
          </div>
          <p className="text-xs text-slate-500 mt-1.5 font-mono tabular-nums">
            Action Plan: {completedSteps}/{recommendations.nextSteps.length} steps complete
          </p>
        </div>
      </div>

      {/* Provenance Bar */}
      <ProvenanceBanner
        sourceType={businessAnalysis.sourceType}
        generatedAt={businessAnalysis.generatedAt}
        factBasisLabel={
          businessInput.recordOrigin === 'fictional_demo'
            ? 'Fictional demonstration company — isolated from live registry data'
            : `Source: ${businessInput.sourceAttribution || 'Manual Entry'}`
        }
      />

      {/* Primary Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <section className="xl:col-span-6 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <VerifiedVsAiHeader
            kind="verified"
            title="Financial Structure & Operating Profit"
            subtitle="Deterministic Input Chart"
          />
          <FinancialStructureChart metrics={liveMetrics} />
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={() => onNavigate('business')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1B365D] hover:text-[#9A7214] transition-colors cursor-pointer"
            >
              <span>Open 12-Section Business Report</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>

        <section className="xl:col-span-6 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <VerifiedVsAiHeader
            kind="ai"
            title="5-Domain Enterprise Risk Posture"
            subtitle={riskAssessment.sourceType === 'ai' ? 'AI Assessment' : 'Fictional Demo'}
          />
          <RiskPostureMatrixChart risks={riskAssessment.risks} />
          <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-100">
            <p className="text-xs text-slate-600 line-clamp-1">{riskAssessment.overallPostureSummary}</p>
            <button
              type="button"
              onClick={() => onNavigate('risk')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1B365D] hover:text-[#9A7214] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Inspect 5-Domain Matrix</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>
      </div>

      {/* Intelligence Module Quick Access Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => onNavigate('explorer')}
          className="text-left bg-white border border-slate-200 hover:border-[#C59B27] rounded-lg p-4 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <Search className="w-4 h-4 text-[#1B365D]" />
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#9A7214]" />
          </div>
          <div className="text-sm font-semibold text-[#0B1B35]">Global Company Explorer</div>
          <p className="text-xs text-slate-500 mt-1 line-clamp-2">
            Live SEC EDGAR directory &amp; filings, UK/Global registry connectors, or manual entry
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('business')}
          className="text-left bg-white border border-slate-200 hover:border-[#C59B27] rounded-lg p-4 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <Building2 className="w-4 h-4 text-[#1B365D]" />
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#9A7214]" />
          </div>
          <div className="text-sm font-semibold text-[#0B1B35]">12-Section Business Analysis</div>
          <p className="text-xs text-slate-500 mt-1 line-clamp-2">
            {businessAnalysis.performanceDrivers[0]?.title || 'Evaluate profitability & strategic alignment'}
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('market')}
          className="text-left bg-white border border-slate-200 hover:border-[#C59B27] rounded-lg p-4 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <Globe2 className="w-4 h-4 text-[#1B365D]" />
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#9A7214]" />
          </div>
          <div className="text-sm font-semibold text-[#0B1B35]">Market Intelligence</div>
          <p className="text-xs text-slate-500 mt-1 line-clamp-2">
            {marketAnalysis.opportunities[0]?.title || 'Analyze target demand drivers & opportunities'}
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('recommendations')}
          className="text-left bg-white border border-slate-200 hover:border-[#C59B27] rounded-lg p-4 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <Lightbulb className="w-4 h-4 text-[#9A7214]" />
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#9A7214]" />
          </div>
          <div className="text-sm font-semibold text-[#0B1B35]">6-Pillar Recommendations</div>
          <p className="text-xs text-slate-500 mt-1 line-clamp-2">
            Short-term &amp; long-term action plan across expansion, cost, risk &amp; positioning
          </p>
        </button>
      </div>

      {/* Live Gemini AI Connection Verification */}
      <AiConnectionTestPanel />
    </div>
  );
};
