import React, { useEffect, useState } from 'react';
import { Menu, Sparkles } from 'lucide-react';
import {
  BusinessAnalysisResult,
  BusinessInput,
  CompanyRecord,
  MarketAnalysisResult,
  MarketInput,
  NavSection,
  RecommendationsResult,
  RiskAssessmentResult,
  SavedSnapshot,
  WorkspaceMemoResult,
  WorkspaceNote,
} from './types';
import {
  computeCalculatedMetrics,
  INITIAL_WORKSPACE_NOTES,
  SAMPLE_PROFILES,
} from './data/sampleProfiles';
import { Sidebar } from './components/Sidebar';
import { OverviewView } from './views/OverviewView';
import { CompanyExplorerView } from './views/CompanyExplorerView';
import { BusinessIntelligenceView } from './views/BusinessIntelligenceView';
import { MarketIntelligenceView } from './views/MarketIntelligenceView';
import { RiskAssessmentView } from './views/RiskAssessmentView';
import { RecommendationsView } from './views/RecommendationsView';
import { ExecutiveBriefingView } from './views/ExecutiveBriefingView';
import { ResearchWorkspaceView } from './views/ResearchWorkspaceView';

const SECTION_TITLES: Record<NavSection, string> = {
  overview: 'Overview',
  explorer: 'Global Company Explorer',
  business: 'Business Intelligence',
  market: 'Market Intelligence',
  risk: 'Risk Assessment',
  recommendations: 'AI Recommendations',
  briefing: 'Executive Briefing',
  workspace: 'Research Workspace',
};

const STORAGE_NOTES_KEY = 'aureon_workspace_notes_v1';
const STORAGE_SNAPSHOTS_KEY = 'aureon_workspace_snapshots_v1';

async function postJson<T>(url: string, payload: unknown): Promise<T> {
  let res: globalThis.Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error('AI service temporarily unavailable. Please try again shortly.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      data.error ||
        (res.status >= 500 || res.status === 429
          ? 'AI service temporarily unavailable. Please try again shortly.'
          : `Request failed (${res.status})`)
    );
  }
  return data as T;
}

export default function App() {
  const initialProfile = SAMPLE_PROFILES[0];

  const [activeSection, setActiveSection] = useState<NavSection>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSampleId, setActiveSampleId] = useState<string>(initialProfile.id);

  // Domain Inputs
  const [businessInput, setBusinessInput] = useState<BusinessInput>(initialProfile.businessInput);
  const [marketInput, setMarketInput] = useState<MarketInput>(initialProfile.marketInput);
  const [strategicFocus, setStrategicFocus] = useState<string>(
    'Balance business expansion with disciplined cost optimisation and risk mitigation'
  );

  // Analysis Outputs
  const [businessAnalysis, setBusinessAnalysis] = useState<BusinessAnalysisResult>(
    initialProfile.businessAnalysis
  );
  const [marketAnalysis, setMarketAnalysis] = useState<MarketAnalysisResult>(
    initialProfile.marketAnalysis
  );
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessmentResult>(
    initialProfile.riskAssessment
  );
  const [recommendations, setRecommendations] = useState<RecommendationsResult>(
    initialProfile.recommendations
  );
  const [workspaceMemo, setWorkspaceMemo] = useState<WorkspaceMemoResult | null>(null);

  // Workspace Persistence
  const [notes, setNotes] = useState<WorkspaceNote[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_NOTES_KEY);
      if (raw) return JSON.parse(raw) as WorkspaceNote[];
    } catch {
      // ignore storage read error
    }
    return INITIAL_WORKSPACE_NOTES;
  });

  const [snapshots, setSnapshots] = useState<SavedSnapshot[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_SNAPSHOTS_KEY);
      if (raw) return JSON.parse(raw) as SavedSnapshot[];
    } catch {
      // ignore storage read error
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_NOTES_KEY, JSON.stringify(notes));
    } catch {
      // ignore storage write error
    }
  }, [notes]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SNAPSHOTS_KEY, JSON.stringify(snapshots));
    } catch {
      // ignore storage write error
    }
  }, [snapshots]);

  // Loading & Error States
  const [loadingBusiness, setLoadingBusiness] = useState(false);
  const [loadingMarket, setLoadingMarket] = useState(false);
  const [loadingRisk, setLoadingRisk] = useState(false);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [loadingMemo, setLoadingMemo] = useState(false);
  const [isSuiteRunning, setIsSuiteRunning] = useState(false);
  const [suiteStatusLabel, setSuiteStatusLabel] = useState<string | null>(null);

  const [businessError, setBusinessError] = useState<string | null>(null);
  const [marketError, setMarketError] = useState<string | null>(null);
  const [riskError, setRiskError] = useState<string | null>(null);
  const [recsError, setRecsError] = useState<string | null>(null);
  const [memoError, setMemoError] = useState<string | null>(null);
  const [suiteError, setSuiteError] = useState<string | null>(null);

  const [savedFlag, setSavedFlag] = useState<string | null>(null);

  const triggerSavedFlag = (key: string) => {
    setSavedFlag(key);
    setTimeout(() => {
      setSavedFlag((prev) => (prev === key ? null : prev));
    }, 2000);
  };

  const handleLoadSample = (id: string) => {
    setActiveSampleId(id);
    setBusinessError(null);
    setMarketError(null);
    setRiskError(null);
    setRecsError(null);
    setSuiteError(null);

    if (id === 'live_or_manual') {
      setBusinessInput({
        companyName: '',
        industry: '',
        country: '',
        revenue: null,
        expenses: null,
        employeeCount: null,
        objectives: '',
        challenges: '',
        periodLabel: 'FY Annualized',
        recordOrigin: 'manual',
        sourceAttribution: 'Manual User Entry',
        lastUpdated: new Date().toLocaleDateString('en-US', { dateStyle: 'medium' }),
        tickerOrRegId: null,
      });
      setMarketInput({
        industry: '',
        targetMarket: '',
        competitors: '',
        marketConditions: '',
      });
      return;
    }

    const found = SAMPLE_PROFILES.find((p) => p.id === id);
    if (found) {
      setBusinessInput(found.businessInput);
      setMarketInput(found.marketInput);
      setBusinessAnalysis(found.businessAnalysis);
      setMarketAnalysis(found.marketAnalysis);
      setRiskAssessment(found.riskAssessment);
      setRecommendations(found.recommendations);
    }
  };

  const handleChangeBusinessInput = (next: BusinessInput) => {
    setBusinessInput(next);
    if (activeSampleId !== 'live_or_manual') {
      setActiveSampleId('live_or_manual');
    }
  };

  const handleChangeMarketInput = (next: MarketInput) => {
    setMarketInput(next);
    if (activeSampleId !== 'live_or_manual') {
      setActiveSampleId('live_or_manual');
    }
  };

  // Individual AI Execution Handlers
  const runBusinessAnalysis = async (overrideInput?: BusinessInput) => {
    const payload = overrideInput || businessInput;
    setBusinessError(null);
    setLoadingBusiness(true);
    try {
      const result = await postJson<BusinessAnalysisResult>('/api/analyze/business', payload);
      setBusinessAnalysis(result);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to generate business analysis.';
      setBusinessError(msg);
      throw err;
    } finally {
      setLoadingBusiness(false);
    }
  };

  const runMarketAnalysis = async () => {
    setMarketError(null);
    setLoadingMarket(true);
    try {
      const result = await postJson<MarketAnalysisResult>('/api/analyze/market', marketInput);
      setMarketAnalysis(result);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to generate market analysis.';
      setMarketError(msg);
      throw err;
    } finally {
      setLoadingMarket(false);
    }
  };

  const runRiskAnalysis = async () => {
    setRiskError(null);
    setLoadingRisk(true);
    try {
      const result = await postJson<RiskAssessmentResult>('/api/analyze/risk', {
        ...businessInput,
        ...marketInput,
      });
      setRiskAssessment(result);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to run risk assessment.';
      setRiskError(msg);
      throw err;
    } finally {
      setLoadingRisk(false);
    }
  };

  const runRecommendations = async (overrideRiskSummary?: string) => {
    setRecsError(null);
    setLoadingRecs(true);
    try {
      const result = await postJson<RecommendationsResult>('/api/analyze/recommendations', {
        businessInput,
        marketInput,
        riskSummary: overrideRiskSummary || riskAssessment.overallPostureSummary,
        strategicFocus,
      });
      setRecommendations(result);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to generate recommendations.';
      setRecsError(msg);
      throw err;
    } finally {
      setLoadingRecs(false);
    }
  };

  const handleSelectCompanyFromExplorer = (record: CompanyRecord, autoRunReport: boolean) => {
    const nextBusiness: BusinessInput = {
      companyName: record.companyName,
      industry: record.industry || 'General Corporate / Unspecified',
      country: record.country,
      revenue: record.annualRevenue,
      expenses: record.annualOperatingExpenses,
      employeeCount: record.employeeCount,
      objectives:
        record.recordOrigin === 'fictional_demo'
          ? 'Evaluate operational profitability, market expansion opportunities, and risk posture.'
          : 'Assess financial performance, competitive position, and strategic opportunities using retrieved registry filings.',
      challenges:
        record.annualRevenue === null || record.annualOperatingExpenses === null
          ? 'Certain financial or workforce metrics were unavailable in the external registry source.'
          : '',
      periodLabel: record.fiscalPeriod || 'Latest Available Period',
      recordOrigin: record.recordOrigin,
      sourceAttribution: record.sourceName,
      lastUpdated: record.lastUpdated,
      tickerOrRegId: record.ticker || record.registrationId,
    };

    setActiveSampleId('live_or_manual');
    setBusinessInput(nextBusiness);
    setMarketInput({
      industry: record.industry || 'General Corporate',
      targetMarket: `${record.country} & international addressable markets`,
      competitors: 'Regional and global industry peers',
      marketConditions: 'Evaluate structural sector conditions without fabricating live market data',
    });

    setBusinessError(null);
    setActiveSection('business');

    if (autoRunReport) {
      void runBusinessAnalysis(nextBusiness).catch(() => {});
    }
  };

  const runFullSuite = async () => {
    if (!businessInput.companyName.trim() || !businessInput.industry.trim()) {
      setSuiteError(
        'Please provide a Company Name and Industry in Business Intelligence before running the full suite.'
      );
      return;
    }
    setSuiteError(null);
    setIsSuiteRunning(true);
    try {
      setSuiteStatusLabel('Generating 12-Section Report...');
      await runBusinessAnalysis();

      setSuiteStatusLabel('Analyzing Market...');
      await runMarketAnalysis();

      setSuiteStatusLabel('Evaluating 5 Risk Domains...');
      const riskRes = await runRiskAnalysis();

      setSuiteStatusLabel('Synthesizing 6-Pillar Strategy...');
      await runRecommendations(riskRes.overallPostureSummary);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Full AI suite execution stopped due to an error.';
      setSuiteError(msg);
    } finally {
      setIsSuiteRunning(false);
      setSuiteStatusLabel(null);
    }
  };

  const handleSynthesizeMemo = async (researchQuestion: string) => {
    setMemoError(null);
    setLoadingMemo(true);
    try {
      const metrics = computeCalculatedMetrics(
        businessInput.revenue,
        businessInput.expenses,
        businessInput.employeeCount
      );
      const result = await postJson<WorkspaceMemoResult>('/api/workspace/synthesize', {
        companyName: businessInput.companyName || 'Active Company',
        businessMetrics: {
          ...businessInput,
          ...metrics,
        },
        notes,
        snapshots,
        researchQuestion,
      });
      setWorkspaceMemo(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to synthesize executive memo.';
      setMemoError(msg);
    } finally {
      setLoadingMemo(false);
    }
  };

  const saveSnapshot = (
    module: SavedSnapshot['module'],
    title: string,
    summary: string,
    sourceType: 'sample' | 'ai'
  ) => {
    const newSnap: SavedSnapshot = {
      id: `snap-${Date.now()}`,
      title,
      module,
      companyName: businessInput.companyName || 'Untitled Company',
      summary,
      createdAt: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      sourceType,
    };
    setSnapshots((prev) => [newSnap, ...prev]);
    triggerSavedFlag(module);
  };

  const handleAddNote = (note: Omit<WorkspaceNote, 'id' | 'updatedAt'>) => {
    const newNote: WorkspaceNote = {
      ...note,
      id: `note-${Date.now()}`,
      updatedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    };
    setNotes((prev) => [newNote, ...prev]);
  };

  const handleToggleStep = (stepId: string) => {
    setRecommendations((prev) => ({
      ...prev,
      nextSteps: prev.nextSteps.map((s) =>
        s.id === stepId ? { ...s, completed: !s.completed } : s
      ),
    }));
  };

  return (
    <div className="min-h-screen flex bg-[#F6F8FB] text-[#0B1B35]">
      <Sidebar
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        activeSampleId={activeSampleId}
        onLoadSample={handleLoadSample}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        snapshotCount={snapshots.length}
        noteCount={notes.length}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar Contract: Breadcrumb Left — Active Context — Single Primary Action Right */}
        <header className="bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6 sticky top-0 z-30 no-print">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 text-slate-700 hover:text-[#0B1B35] rounded-md"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0 truncate">
              <span className="font-display font-bold text-[#0B1B35] whitespace-nowrap shrink-0">
                AUREON AI
              </span>
              <span className="text-slate-300" aria-hidden="true">/</span>
              <span className="font-medium text-slate-600 truncate">
                {SECTION_TITLES[activeSection]}
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 truncate max-w-sm">
            <span className="truncate font-medium text-slate-700">
              {businessInput.companyName || 'Custom Company Profile'}
            </span>
            <span aria-hidden="true">·</span>
            <span className="whitespace-nowrap shrink-0">
              {businessInput.recordOrigin === 'fictional_demo' ? 'Fictional Demo' : 'Active Profile'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setActiveSection('workspace')}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-[#0B1B35] hover:bg-[#12284C] text-white text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#D1A942]" />
            <span>Workspace Memo</span>
          </button>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-[1400px] w-full mx-auto">
          {activeSection === 'overview' && (
            <OverviewView
              businessInput={businessInput}
              businessAnalysis={businessAnalysis}
              marketAnalysis={marketAnalysis}
              riskAssessment={riskAssessment}
              recommendations={recommendations}
              onNavigate={setActiveSection}
              onRunFullSuite={runFullSuite}
              isSuiteRunning={isSuiteRunning}
              suiteStatusLabel={suiteStatusLabel}
              error={suiteError}
              onClearError={() => setSuiteError(null)}
            />
          )}

          {activeSection === 'explorer' && (
            <CompanyExplorerView onSelectForBusiness={handleSelectCompanyFromExplorer} />
          )}

          {activeSection === 'business' && (
            <BusinessIntelligenceView
              input={businessInput}
              onChangeInput={handleChangeBusinessInput}
              analysis={businessAnalysis}
              onAnalyze={() => void runBusinessAnalysis().catch(() => {})}
              isLoading={loadingBusiness}
              error={businessError}
              onClearError={() => setBusinessError(null)}
              onSaveSnapshot={() =>
                saveSnapshot(
                  'Business',
                  `${businessInput.companyName || 'Company'} — 12-Section Analysis`,
                  businessAnalysis.executiveSummary,
                  businessAnalysis.sourceType
                )
              }
              savedJustNow={savedFlag === 'Business'}
            />
          )}

          {activeSection === 'market' && (
            <MarketIntelligenceView
              input={marketInput}
              onChangeInput={handleChangeMarketInput}
              analysis={marketAnalysis}
              onAnalyze={() => void runMarketAnalysis().catch(() => {})}
              isLoading={loadingMarket}
              error={marketError}
              onClearError={() => setMarketError(null)}
              onSaveSnapshot={() =>
                saveSnapshot(
                  'Market',
                  `${marketInput.industry || 'Market'} — Structure Analysis`,
                  marketAnalysis.marketOverview,
                  marketAnalysis.sourceType
                )
              }
              savedJustNow={savedFlag === 'Market'}
            />
          )}

          {activeSection === 'risk' && (
            <RiskAssessmentView
              businessInput={businessInput}
              marketInput={marketInput}
              assessment={riskAssessment}
              onAnalyze={() => void runRiskAnalysis().catch(() => {})}
              isLoading={loadingRisk}
              error={riskError}
              onClearError={() => setRiskError(null)}
              onSaveSnapshot={() =>
                saveSnapshot(
                  'Risk',
                  `${businessInput.companyName || 'Company'} — 5-Domain Risk Posture`,
                  riskAssessment.overallPostureSummary,
                  riskAssessment.sourceType
                )
              }
              savedJustNow={savedFlag === 'Risk'}
            />
          )}

          {activeSection === 'recommendations' && (
            <RecommendationsView
              result={recommendations}
              strategicFocus={strategicFocus}
              onChangeStrategicFocus={setStrategicFocus}
              onGenerate={() => void runRecommendations().catch(() => {})}
              onToggleStep={handleToggleStep}
              isLoading={loadingRecs}
              error={recsError}
              onClearError={() => setRecsError(null)}
              onSaveSnapshot={() =>
                saveSnapshot(
                  'Recommendations',
                  `${businessInput.companyName || 'Company'} — 6-Pillar Strategy`,
                  recommendations.strategicThesis,
                  recommendations.sourceType
                )
              }
              savedJustNow={savedFlag === 'Recommendations'}
            />
          )}

          {activeSection === 'briefing' && (
            <ExecutiveBriefingView
              businessInput={businessInput}
              marketInput={marketInput}
              riskAssessment={riskAssessment}
            />
          )}

          {activeSection === 'workspace' && (
            <ResearchWorkspaceView
              businessInput={businessInput}
              notes={notes}
              snapshots={snapshots}
              memo={workspaceMemo}
              onAddNote={handleAddNote}
              onDeleteNote={(id) => setNotes((prev) => prev.filter((n) => n.id !== id))}
              onDeleteSnapshot={(id) => setSnapshots((prev) => prev.filter((s) => s.id !== id))}
              onSynthesizeMemo={(q) => void handleSynthesizeMemo(q)}
              isSynthesizing={loadingMemo}
              error={memoError}
              onClearError={() => setMemoError(null)}
            />
          )}
        </main>

        {/* Institutional Disclaimer Footer */}
        <footer className="border-t border-slate-200 bg-white px-4 sm:px-6 lg:px-8 py-4 text-xs text-slate-500 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 no-print">
          <div>
            <span className="font-semibold text-[#0B1B35]">AUREON AI</span>
            <span className="mx-1.5 text-slate-300" aria-hidden="true">·</span>
            <span>Global Intelligence for Business &amp; Capital</span>
          </div>
          <p className="leading-relaxed">
            Disclaimer: Educational and informational purposes only. Does not constitute investment advice, audited reporting, or live market quotes unless retrieved from a connected external source.
          </p>
        </footer>
      </div>
    </div>
  );
}
