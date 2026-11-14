export type NavSection =
  | 'overview'
  | 'explorer'
  | 'business'
  | 'market'
  | 'risk'
  | 'recommendations'
  | 'briefing'
  | 'workspace';

export type AnalysisSourceType = 'sample' | 'ai';

export type CompanyOwnershipStatus = 'Public' | 'Private' | 'Unknown';

export type DataProviderId =
  | 'sec_edgar'
  | 'companies_house'
  | 'opencorporates'
  | 'fmp'
  | 'manual'
  | 'fictional_demo';

export type WorldRegion =
  | 'All Regions'
  | 'North America'
  | 'Europe'
  | 'Asia-Pacific'
  | 'Latin America'
  | 'Middle East & Africa'
  | 'Global / Other';

export interface ProviderStatus {
  id: Exclude<DataProviderId, 'manual' | 'fictional_demo'>;
  name: string;
  regionScope: string;
  connected: boolean;
  requiresKey: boolean;
  envVarName: string | null;
  limitationNote: string;
}

export interface CompanyRecord {
  id: string;
  companyName: string;
  country: string;
  region: Exclude<WorldRegion, 'All Regions'>;
  headquarters: string | null;
  industry: string | null;
  ownershipStatus: CompanyOwnershipStatus;
  stockExchange: string | null;
  ticker: string | null;
  registrationId: string | null;
  sourceName: string;
  sourceUrl: string | null;
  lastUpdated: string | null;
  recordOrigin: DataProviderId;
  // Verified / retrieved figures ONLY (null = unavailable, never substitute 0 for missing)
  annualRevenue: number | null;
  annualOperatingExpenses: number | null;
  operatingProfit: number | null;
  employeeCount: number | null;
  currency: string;
  fiscalPeriod: string | null;
  description: string | null;
}

export interface BusinessInput {
  companyName: string;
  industry: string;
  country: string;
  revenue: number | null;
  expenses: number | null;
  employeeCount: number | null;
  objectives: string;
  challenges: string;
  periodLabel: string;
  recordOrigin: DataProviderId;
  sourceAttribution: string | null;
  lastUpdated: string | null;
  tickerOrRegId: string | null;
}

export interface MarketInput {
  industry: string;
  targetMarket: string;
  competitors: string;
  marketConditions: string;
}

export interface CalculatedMetrics {
  revenue: number | null;
  expenses: number | null;
  operatingProfit: number | null;
  operatingMarginPct: number | null;
  expenseRatioPct: number | null;
  revenuePerEmployee: number | null;
  marginExplanation: string;
  profitExplanation: string;
}

export interface ReportSectionItem {
  number: number;
  title: string;
  content: string;
}

export interface PerformanceDriver {
  title: string;
  observation: string;
  impactDirection: 'Positive' | 'Neutral' | 'Pressure';
}

export interface ObjectiveAlignment {
  objective: string;
  readiness: 'Strong' | 'Moderate' | 'Needs Focus';
  rationale: string;
}

export interface IllustrativeScenario {
  label: string;
  revenueMultiplier: number;
  marginDeltaPctPoints: number;
  thesis: string;
}

export interface BusinessAnalysisResult {
  sourceType: AnalysisSourceType;
  generatedAt: string;
  calculatedMetrics: CalculatedMetrics;
  executiveSummary: string;
  reportSections: ReportSectionItem[];
  suppliedEvidence: string[];
  aiAssumptions: string[];
  missingInformation: string[];
  performanceDrivers: PerformanceDriver[];
  objectiveAlignment: ObjectiveAlignment[];
  illustrativeScenarios: IllustrativeScenario[];
}

export interface DemandDriver {
  factor: string;
  strength: 'High' | 'Moderate' | 'Emerging';
  explanation: string;
}

export interface CompetitiveSegment {
  segment: string;
  intensity: 'Low' | 'Moderate' | 'High';
  differentiationAngle: string;
}

export interface MarketOpportunity {
  title: string;
  attractivenessScore: number;
  executionComplexity: number;
  summary: string;
}

export interface MarketAnalysisResult {
  sourceType: AnalysisSourceType;
  generatedAt: string;
  dataIntegrityNotice: string;
  marketOverview: string;
  demandDrivers: DemandDriver[];
  competitiveLandscape: CompetitiveSegment[];
  opportunities: MarketOpportunity[];
  structuralBarriers: string[];
  indicatorsToMonitor: string[];
}

export type RiskCategoryName =
  | 'Financial'
  | 'Operational'
  | 'Market'
  | 'Competitive'
  | 'Regulatory';

export type RiskSeverity = 'Low' | 'Moderate' | 'Elevated' | 'High';

export interface RiskCategoryAnalysis {
  category: RiskCategoryName;
  severity: RiskSeverity;
  likelihoodScore: number;
  impactScore: number;
  explanation: string;
  evidenceBasis: string;
  earlyWarningSignals: string[];
  mitigationControls: string[];
}

export interface RiskAssessmentResult {
  sourceType: AnalysisSourceType;
  generatedAt: string;
  overallPostureSummary: string;
  risks: RiskCategoryAnalysis[];
  stressTestNarrative: string;
}

export type StrategyHorizon = 'Short-Term' | 'Long-Term';
export type StrategyPillar =
  | 'Business Expansion'
  | 'Cost Optimisation'
  | 'Competitive Positioning'
  | 'Operational Improvement'
  | 'Growth Opportunities'
  | 'Risk Mitigation';

export interface RecommendationItem {
  id: string;
  title: string;
  horizon: StrategyHorizon;
  pillar: StrategyPillar;
  priority: 'Primary' | 'Secondary';
  rationale: string;
  expectedQualitativeImpact: string;
  capitalAllocationSharePct: number;
}

export interface ActionStep {
  id: string;
  step: string;
  owner: string;
  timeframe: string;
  kpi: string;
  completed: boolean;
}

export interface RecommendationsResult {
  sourceType: AnalysisSourceType;
  generatedAt: string;
  strategicThesis: string;
  recommendations: RecommendationItem[];
  nextSteps: ActionStep[];
}

export interface WorkspaceNote {
  id: string;
  title: string;
  category: 'Business' | 'Market' | 'Risk' | 'Strategy' | 'General';
  content: string;
  updatedAt: string;
}

export interface SavedSnapshot {
  id: string;
  title: string;
  module: 'Business' | 'Market' | 'Risk' | 'Recommendations';
  companyName: string;
  summary: string;
  createdAt: string;
  sourceType: AnalysisSourceType;
}

export interface WorkspaceMemoResult {
  generatedAt: string;
  title: string;
  verifiedInputsSummary: string[];
  aiStrategicSynthesis: string;
  keyRisksAndTradeoffs: string[];
  recommendedBoardActions: string[];
}

export interface BriefingRecommendation {
  title: string;
  rationale: string;
}

export interface BriefingFinancialRow {
  label: string;
  value: string;
}

export interface ExecutiveBriefingData {
  briefingId: string;
  subject: string;
  reportDate: string;
  companyName: string;
  industry: string;
  country: string;
  recordOriginLabel: string;
  executiveOverview: string;
  companyProfile: string;
  financialHighlights: BriefingFinancialRow[];
  financialNarrative: string;
  marketIntelligence: string;
  competitorInsights: string;
  riskAlerts: string[];
  growthOpportunities: string[];
  strategicRecommendations: BriefingRecommendation[];
  overallAssessment: string;
  sourceReferences: string[];
  dataLimitations: string[];
}

export interface GeneratedBriefingResponse {
  briefing: ExecutiveBriefingData;
  htmlContent: string;
  plainText: string;
  model: string;
}

export interface EmailProviderStatus {
  provider: 'Resend';
  configured: boolean;
  senderConfigured: boolean;
  testingMode: boolean;
  permittedTestingRecipient: string | null;
  configurationNote: string;
  testingRestrictionWarning: string | null;
}

export interface EmailSendResult {
  ok: boolean;
  messageId?: string;
  recipient?: string;
  testingMode?: boolean;
  sentAt?: string;
  error?: string;
}

