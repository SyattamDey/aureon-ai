import {
  BusinessAnalysisResult,
  BusinessInput,
  CalculatedMetrics,
  CompanyRecord,
  MarketAnalysisResult,
  MarketInput,
  RecommendationsResult,
  RiskAssessmentResult,
  WorkspaceNote,
} from '../types';

export function computeCalculatedMetrics(
  revenue: number | null,
  expenses: number | null,
  employeeCount: number | null = null
): CalculatedMetrics {
  const validRev =
    revenue !== null && Number.isFinite(revenue) && revenue >= 0 ? revenue : null;
  const validExp =
    expenses !== null && Number.isFinite(expenses) && expenses >= 0 ? expenses : null;
  const validEmp =
    employeeCount !== null && Number.isFinite(employeeCount) && employeeCount > 0
      ? Math.round(employeeCount)
      : null;

  if (validRev === null || validExp === null) {
    return {
      revenue: validRev,
      expenses: validExp,
      operatingProfit: null,
      operatingMarginPct: null,
      expenseRatioPct: null,
      revenuePerEmployee: validRev !== null && validEmp !== null ? Math.round(validRev / validEmp) : null,
      profitExplanation:
        'Operating profit cannot be calculated because annual revenue or annual operating expenses is unavailable.',
      marginExplanation:
        'Operating profit margin requires both positive annual revenue and annual operating expenses.',
    };
  }

  const operatingProfit = validRev - validExp;
  const operatingMarginPct =
    validRev > 0 ? Number(((operatingProfit / validRev) * 100).toFixed(2)) : null;
  const expenseRatioPct =
    validRev > 0 ? Number(((validExp / validRev) * 100).toFixed(2)) : null;
  const revenuePerEmployee = validEmp !== null ? Math.round(validRev / validEmp) : null;

  const profitExplanation = `Operating Profit = Revenue ($${validRev.toLocaleString(
    'en-US'
  )}) − Operating Expenses ($${validExp.toLocaleString('en-US')}) = ${
    operatingProfit < 0 ? '-' : ''
  }$${Math.abs(operatingProfit).toLocaleString('en-US')}.`;

  const marginExplanation =
    validRev > 0
      ? `Operating Profit Margin = (Operating Profit / Revenue) × 100 = (${operatingProfit.toLocaleString(
          'en-US'
        )} / ${validRev.toLocaleString('en-US')}) × 100 = ${operatingMarginPct?.toFixed(2)}%.`
      : 'Operating Profit Margin is undefined because annual revenue is $0 (revenue must be positive).';

  return {
    revenue: validRev,
    expenses: validExp,
    operatingProfit,
    operatingMarginPct,
    expenseRatioPct,
    revenuePerEmployee,
    profitExplanation,
    marginExplanation,
  };
}

/**
 * Clearly labelled FICTIONAL demonstration companies strictly for academic & testing mode.
 * Never mixed with verified live company search results.
 */
export const FICTIONAL_DEMO_COMPANIES: CompanyRecord[] = [
  {
    id: 'demo-meridian-robotics',
    companyName: 'Meridian Industrial Automation Inc. (Fictional Demo)',
    country: 'United States',
    region: 'North America',
    headquarters: 'Pittsburgh, Pennsylvania, USA',
    industry: 'Industrial Automation & Robotics',
    ownershipStatus: 'Private',
    stockExchange: null,
    ticker: null,
    registrationId: 'DEMO-US-001',
    sourceName: 'AUREON Fictional Demonstration Dataset',
    sourceUrl: null,
    lastUpdated: 'Demo Baseline',
    recordOrigin: 'fictional_demo',
    annualRevenue: 48500000,
    annualOperatingExpenses: 39200000,
    operatingProfit: 9300000,
    employeeCount: 215,
    currency: 'USD',
    fiscalPeriod: 'FY Fictional Baseline',
    description:
      'Fictional mid-market industrial robotics and predictive-maintenance software company used for educational demonstration.',
  },
  {
    id: 'demo-vanguard-treasury',
    companyName: 'Vanguard Treasury Cloud PLC (Fictional Demo)',
    country: 'United Kingdom',
    region: 'Europe',
    headquarters: 'London, United Kingdom',
    industry: 'Enterprise B2B FinTech SaaS',
    ownershipStatus: 'Public',
    stockExchange: 'LSE (Demo)',
    ticker: 'VTC.DEMO',
    registrationId: 'DEMO-UK-002',
    sourceName: 'AUREON Fictional Demonstration Dataset',
    sourceUrl: null,
    lastUpdated: 'Demo Baseline',
    recordOrigin: 'fictional_demo',
    annualRevenue: 22400000,
    annualOperatingExpenses: 24100000,
    operatingProfit: -1700000,
    employeeCount: 142,
    currency: 'USD',
    fiscalPeriod: 'FY Fictional Run-Rate',
    description:
      'Fictional multi-entity treasury liquidity SaaS vendor used to demonstrate negative-margin breakeven analysis.',
  },
  {
    id: 'demo-solstice-bio',
    companyName: 'Solstice Cold-Chain Logistics Pte. (Fictional Demo)',
    country: 'Singapore',
    region: 'Asia-Pacific',
    headquarters: 'Singapore',
    industry: 'Pharmaceutical Logistics & Cold Chain',
    ownershipStatus: 'Private',
    stockExchange: null,
    ticker: null,
    registrationId: 'DEMO-SG-003',
    sourceName: 'AUREON Fictional Demonstration Dataset',
    sourceUrl: null,
    lastUpdated: 'Demo Baseline',
    recordOrigin: 'fictional_demo',
    annualRevenue: 64200000,
    annualOperatingExpenses: 55800000,
    operatingProfit: 8400000,
    employeeCount: 380,
    currency: 'USD',
    fiscalPeriod: 'FY Fictional Baseline',
    description:
      'Fictional regional temperature-controlled medical freight operator across ASEAN corridors.',
  },
  {
    id: 'demo-nordic-grid',
    companyName: 'Nordic Grid Storage ASA (Fictional Demo)',
    country: 'Norway',
    region: 'Europe',
    headquarters: 'Oslo, Norway',
    industry: 'Grid-Scale Energy Storage & Software',
    ownershipStatus: 'Public',
    stockExchange: 'OSL (Demo)',
    ticker: 'NGS.DEMO',
    registrationId: 'DEMO-NO-004',
    sourceName: 'AUREON Fictional Demonstration Dataset',
    sourceUrl: null,
    lastUpdated: 'Demo Baseline',
    recordOrigin: 'fictional_demo',
    annualRevenue: 112000000,
    annualOperatingExpenses: 96400000,
    operatingProfit: 15600000,
    employeeCount: 410,
    currency: 'USD',
    fiscalPeriod: 'FY Fictional Baseline',
    description:
      'Fictional utility battery storage integrator and dispatch optimization software provider.',
  },
  {
    id: 'demo-andes-agritech',
    companyName: 'Andes Precision Agro SA (Fictional Demo)',
    country: 'Chile',
    region: 'Latin America',
    headquarters: 'Santiago, Chile',
    industry: 'Agricultural Telemetry & Irrigation Systems',
    ownershipStatus: 'Private',
    stockExchange: null,
    ticker: null,
    registrationId: 'DEMO-CL-005',
    sourceName: 'AUREON Fictional Demonstration Dataset',
    sourceUrl: null,
    lastUpdated: 'Demo Baseline',
    recordOrigin: 'fictional_demo',
    annualRevenue: 14800000,
    annualOperatingExpenses: 12900000,
    operatingProfit: 1900000,
    employeeCount: 95,
    currency: 'USD',
    fiscalPeriod: 'FY Fictional Baseline',
    description:
      'Fictional precision irrigation sensor and water-efficiency analytics firm serving commercial vineyards and orchards.',
  },
  {
    id: 'demo-crescent-health',
    companyName: 'Crescent Diagnostics Holdings (Fictional Demo)',
    country: 'United Arab Emirates',
    region: 'Middle East & Africa',
    headquarters: 'Abu Dhabi, UAE',
    industry: 'Clinical Laboratory Services',
    ownershipStatus: 'Public',
    stockExchange: 'ADX (Demo)',
    ticker: 'CDH.DEMO',
    registrationId: 'DEMO-AE-006',
    sourceName: 'AUREON Fictional Demonstration Dataset',
    sourceUrl: null,
    lastUpdated: 'Demo Baseline',
    recordOrigin: 'fictional_demo',
    annualRevenue: 87500000,
    annualOperatingExpenses: 71000000,
    operatingProfit: 16500000,
    employeeCount: 620,
    currency: 'USD',
    fiscalPeriod: 'FY Fictional Baseline',
    description:
      'Fictional regional reference diagnostic laboratory network across GCC hospital groups.',
  },
];

export interface SampleProfile {
  id: string;
  label: string;
  descriptor: string;
  businessInput: BusinessInput;
  marketInput: MarketInput;
  businessAnalysis: BusinessAnalysisResult;
  marketAnalysis: MarketAnalysisResult;
  riskAssessment: RiskAssessmentResult;
  recommendations: RecommendationsResult;
}

export const SAMPLE_PROFILES: SampleProfile[] = [
  {
    id: 'meridian-robotics',
    label: 'Meridian Industrial Automation (Fictional Demo)',
    descriptor: 'Fictional mid-market industrial robotics & factory vision firm',
    businessInput: {
      companyName: 'Meridian Industrial Automation Inc. (Fictional Demo)',
      industry: 'Industrial Automation & Robotics',
      country: 'United States',
      revenue: 48500000,
      expenses: 39200000,
      employeeCount: 215,
      objectives:
        'Expand recurring predictive-maintenance software revenue from 18% to 30% of mix, improve operating margin over 18 months, and enter DACH automotive tier-2 manufacturing accounts.',
      challenges:
        'Custom field-engineering integration hours vary across legacy factory floors, lengthening deployment timelines and working-capital lockup during selective customer CapEx cycles.',
      periodLabel: 'Fictional Demo Baseline',
      recordOrigin: 'fictional_demo',
      sourceAttribution: 'AUREON Fictional Demonstration Dataset',
      lastUpdated: 'Demo Baseline',
      tickerOrRegId: 'DEMO-US-001',
    },
    marketInput: {
      industry: 'Industrial Automation & Robotics',
      targetMarket:
        'Mid-market discrete manufacturers upgrading assembly lines across North America and DACH Europe',
      competitors:
        'Global automation conglomerates, specialized machine-vision vendors, and regional systems integrators',
      marketConditions:
        'Capital expenditure budgets remain selective due to borrowing costs, pushing buyers to demand faster payback periods and turnkey software retrofits.',
    },
    businessAnalysis: {
      sourceType: 'sample',
      generatedAt: 'Fictional Demonstration Dataset',
      calculatedMetrics: computeCalculatedMetrics(48500000, 39200000, 215),
      executiveSummary:
        'FICTIONAL DEMONSTRATION REPORT: Based strictly on the demonstration figures ($48,500,000 annual revenue against $39,200,000 operating expenses across 215 employees), Meridian generates a calculated operating profit of $9,300,000 (19.18% operating profit margin). Achieving higher margins and DACH market entry depends on standardizing field commissioning and lifting recurring software attach rates.',
      reportSections: [
        {
          number: 1,
          title: 'Executive Summary',
          content:
            'Meridian demonstrates profitable baseline operations on supplied demonstration figures ($9.30M operating profit; 19.18% operating margin). Strategic upside centers on transitioning delivery toward recurring predictive-maintenance software while containing custom field-engineering variance.',
        },
        {
          number: 2,
          title: 'Company Overview',
          content:
            'Fictional US-based Industrial Automation & Robotics operator employing 215 staff (~$225,581 calculated revenue per employee). Currently operating as a private demonstration entity.',
        },
        {
          number: 3,
          title: 'Business Activities',
          content:
            'Delivers factory vision and robotics automation retrofits paired with predictive-maintenance telemetry software (stated by user as 18% of revenue mix).',
        },
        {
          number: 4,
          title: 'Financial Performance',
          content:
            'Annual revenue of $48,500,000 minus operating expenses of $39,200,000 yields $9,300,000 in calculated operating profit. Multi-year historical trends, balance sheet debt, and cash flow statements were not supplied.',
        },
        {
          number: 5,
          title: 'Revenue and Expense Analysis',
          content:
            'Operating expenses represent 80.82% of revenue. Given hardware and field-commissioning intensity noted in current challenges, variable project labor and component procurement likely drive the bulk of cost absorption.',
        },
        {
          number: 6,
          title: 'Profitability Assessment',
          content:
            'At 19.18% operating profit margin, the firm maintains a positive operating buffer that can internally finance selective commercial expansion if project scoping remains disciplined.',
        },
        {
          number: 7,
          title: 'Operational Efficiency',
          content:
            'Supplied revenue per employee stands at $225,581. Stated variability in legacy factory-floor commissioning hours represents the primary operational bottleneck reducing repeatability.',
        },
        {
          number: 8,
          title: 'Market Position',
          content:
            'Positioned for mid-market discrete manufacturers seeking rapid brownfield payback rather than multi-year greenfield plant replacements.',
        },
        {
          number: 9,
          title: 'Competitor Analysis',
          content:
            'Competes against global automation conglomerates, specialized vision suppliers, and regional integrators. Exact competitor market share and pricing benchmarks are unavailable without external filings.',
        },
        {
          number: 10,
          title: 'Business Opportunities',
          content:
            'Bundling predictive-maintenance telemetry onto existing installed hardware and certifying DACH regional integrators offer capital-light expansion pathways.',
        },
        {
          number: 11,
          title: 'Financial and Operational Risks',
          content:
            'Primary risks include working-capital strain from delayed customer CapEx sign-offs, commissioning overrun hours on custom sites, and DACH regulatory certification lead times.',
        },
        {
          number: 12,
          title: 'Strategic Recommendations',
          content:
            'Prioritize installed-base software upgrades, standardize commissioning templates, enforce procurement milestone deposits, and enter DACH through certified partner channels.',
        },
      ],
      suppliedEvidence: [
        'Annual Revenue: $48,500,000 (Demonstration Input)',
        'Annual Operating Expenses: $39,200,000 (Demonstration Input)',
        'Calculated Operating Profit: $9,300,000 (19.18% Operating Margin)',
        'Employee Headcount: 215 ($225,581 calculated revenue per employee)',
      ],
      aiAssumptions: [
        'Assumes predictive-maintenance software carries higher incremental gross margin than bespoke field-integration hardware.',
        'Assumes existing North American customers represent accessible upsell candidates for software telemetry.',
      ],
      missingInformation: [
        'Gross margin breakdown between hardware systems, field services, and software subscriptions.',
        'Balance sheet cash reserves, debt obligations, and multi-year historical revenue growth rates.',
      ],
      performanceDrivers: [
        {
          title: 'Positive Operating Cushion',
          observation:
            'Calculated operating profit of $9.30M provides internal liquidity to support selective commercial initiatives.',
          impactDirection: 'Positive',
        },
        {
          title: 'Commissioning Variance Pressure',
          observation:
            'Operating expenses consume 80.82% of revenue, reflecting field-engineering labor variance across legacy sites.',
          impactDirection: 'Pressure',
        },
        {
          title: 'Software Mix Expansion Lever',
          observation:
            'Moving recurring software toward the stated 30% goal improves revenue predictability.',
          impactDirection: 'Positive',
        },
      ],
      objectiveAlignment: [
        {
          objective: 'Grow recurring predictive-maintenance software from 18% to 30%',
          readiness: 'Strong',
          rationale:
            'Installed hardware base provides an existing distribution footprint for telemetry upgrades.',
        },
        {
          objective: 'Improve operating margin over 18 months',
          readiness: 'Moderate',
          rationale:
            'Requires tighter scoping rules on custom field-engineering engagements.',
        },
        {
          objective: 'Enter DACH tier-2 automotive accounts',
          readiness: 'Needs Focus',
          rationale:
            'Regional compliance certifications and entrenched local integrators require a partner-led approach.',
        },
      ],
      illustrativeScenarios: [
        {
          label: 'Conservative Scenario',
          revenueMultiplier: 0.94,
          marginDeltaPctPoints: -2.5,
          thesis: 'Selective CapEx freezes delay deployments and leave engineering utilization under-absorbed.',
        },
        {
          label: 'Base Execution Scenario',
          revenueMultiplier: 1.08,
          marginDeltaPctPoints: 1.8,
          thesis: 'Steady renewals and initial software attach gains keep operating margin trending upward.',
        },
        {
          label: 'Expansion Scenario',
          revenueMultiplier: 1.18,
          marginDeltaPctPoints: 3.6,
          thesis: 'Standardized commissioning plus DACH integrator traction drives operating leverage.',
        },
      ],
    },
    marketAnalysis: {
      sourceType: 'sample',
      generatedAt: 'Fictional Demonstration Dataset',
      dataIntegrityNotice:
        'Illustrative structural analysis derived strictly from provided demonstration inputs. Does not represent live market feeds or verified external statistics.',
      marketOverview:
        'Mid-market discrete manufacturers face skilled-labor constraints alongside tighter CapEx scrutiny, favoring modular retrofit packages with short payback horizons.',
      demandDrivers: [
        {
          factor: 'Retrofit & Telemetry Economics',
          strength: 'High',
          explanation:
            'Buyers favor software overlays extending existing line uptime over full mechanical replacement.',
        },
        {
          factor: 'Quality-Inspection Traceability',
          strength: 'High',
          explanation:
            'Tier-2 automotive contracts increasingly require automated component-level defect audit logs.',
        },
        {
          factor: 'Turnkey Integrator Bandwidth',
          strength: 'Moderate',
          explanation:
            'Mid-sized plants lack internal robotics teams and seek pre-configured packages.',
        },
      ],
      competitiveLandscape: [
        {
          segment: 'Global Automation Conglomerates',
          intensity: 'High',
          differentiationAngle:
            'Dominant on high-volume greenfield lines, less agile for mixed-vendor brownfield retrofits.',
        },
        {
          segment: 'Specialized Vision Vendors',
          intensity: 'Moderate',
          differentiationAngle:
            'Strong component optics, narrower predictive-maintenance fleet integration.',
        },
        {
          segment: 'Regional Systems Integrators',
          intensity: 'Moderate',
          differentiationAngle:
            'Established local plant access in DACH; strong candidates for certified co-sell alliances.',
        },
      ],
      opportunities: [
        {
          title: 'Brownfield Vision-to-Cloud Retrofit Bundle',
          attractivenessScore: 4.6,
          executionComplexity: 2.3,
          summary: 'Package vision sensors with predictive downtime telemetry for legacy presses.',
        },
        {
          title: 'DACH Tier-2 Integrator Alliance Program',
          attractivenessScore: 4.2,
          executionComplexity: 3.6,
          summary: 'Certify regional German/Austrian integrators to shorten compliance and sales cycles.',
        },
        {
          title: 'Outcome-Linked Maintenance Tiers',
          attractivenessScore: 3.9,
          executionComplexity: 3.2,
          summary: 'Convert CapEx resistance into predictable operating-budget uptime agreements.',
        },
      ],
      structuralBarriers: [
        'European CE and plant safety recertification lead times.',
        'Legacy PLC protocol fragmentation across mixed factory floors.',
        'Working-capital strain if hardware delivery schedules slip.',
      ],
      indicatorsToMonitor: [
        'Quote-to-PO cycle duration across North American vs. DACH mid-market bids.',
        'Software attach rate on active customer renewals.',
        'Field commissioning hours relative to scoped estimates.',
      ],
    },
    riskAssessment: {
      sourceType: 'sample',
      generatedAt: 'Fictional Demonstration Dataset',
      overallPostureSummary:
        'Balanced-to-Moderate overall exposure in the demonstration profile. Positive 19.18% operating margin cushions execution, while custom field-engineering variance and European expansion create elevated operational and regulatory considerations.',
      risks: [
        {
          category: 'Financial',
          severity: 'Moderate',
          likelihoodScore: 2.6,
          impactScore: 3.4,
          explanation:
            'Although $9.30M operating profit provides buffer, working capital can tighten if hardware inventory sits ahead of delayed customer sign-offs.',
          evidenceBasis:
            'Supplied revenue ($48.5M) vs. expenses ($39.2M) and stated challenge of working-capital lockup during selective CapEx cycles.',
          earlyWarningSignals: [
            'Days Sales Outstanding extending beyond milestone billing targets',
            'Deferred hardware backlog accumulating in warehouse inventory',
          ],
          mitigationControls: [
            'Require 40%–50% procurement milestone deposits on custom orders',
            'Stage-gate DACH market entry spend against signed pipeline milestones',
          ],
        },
        {
          category: 'Operational',
          severity: 'Elevated',
          likelihoodScore: 3.8,
          impactScore: 3.9,
          explanation:
            'Bespoke field-engineering integration across legacy factory floors risks stretching specialist bandwidth and eroding project margins.',
          evidenceBasis:
            'Explicitly noted in current challenges: custom field-engineering integration hours vary across legacy factory floors.',
          earlyWarningSignals: [
            'Actual site commissioning hours exceeding bid estimates by >10%',
            'Delayed handoffs between engineering and customer success teams',
          ],
          mitigationControls: [
            'Standardize pre-deployment factory acceptance testing templates',
            'Train certified partner engineers before adding direct international headcount',
          ],
        },
        {
          category: 'Market',
          severity: 'Elevated',
          likelihoodScore: 3.4,
          impactScore: 3.7,
          explanation:
            'Selective customer CapEx approvals during elevated borrowing conditions can lengthen industrial sales cycles.',
          evidenceBasis:
            'Supplied market conditions cite selective CapEx budgets and buyer demand for shorter payback periods.',
          earlyWarningSignals: [
            'Higher share of RFPs split into smaller phased pilots',
            'Longer CFO review cycles on mid-market automation bids',
          ],
          mitigationControls: [
            'Lead proposals with modular software-first retrofits below CapEx thresholds',
            'Provide structured payback modeling based on verified customer downtime logs',
          ],
        },
        {
          category: 'Competitive',
          severity: 'Moderate',
          likelihoodScore: 3.1,
          impactScore: 3.3,
          explanation:
            'Global incumbents and vision suppliers may bundle diagnostic software aggressively to protect tier-2 accounts.',
          evidenceBasis:
            'Supplied competitor brief identifying global automation conglomerates and specialized vision vendors.',
          earlyWarningSignals: [
            'Competitors bundling multi-year software licenses at zero incremental hardware fee',
            'Increased discounting pressure in multi-vendor renewals',
          ],
          mitigationControls: [
            'Emphasize vendor-agnostic PLC compatibility across mixed machine fleets',
            'Embed automated compliance audit reporting into predictive-maintenance tiers',
          ],
        },
        {
          category: 'Regulatory',
          severity: 'Elevated',
          likelihoodScore: 3.3,
          impactScore: 3.6,
          explanation:
            'Cross-border industrial robotics and telemetry expansion into DACH introduces EU Machinery Regulation, CE safety certification, and industrial data-governance requirements.',
          evidenceBasis:
            'Stated objective to enter DACH automotive tier-2 accounts; no specific compliance certifications were supplied in inputs.',
          earlyWarningSignals: [
            'Customer procurement checklists requesting EU Machinery Regulation conformity documentation',
            'Data residency objections on cloud telemetry ingestion',
          ],
          mitigationControls: [
            'Engage accredited EU notified-body compliance review prior to commercial DACH launch',
            'Offer EU-hosted telemetry deployment options for DACH accounts',
          ],
        },
      ],
      stressTestNarrative:
        'Qualitative sensitivity on supplied inputs: if selective CapEx delays reduce revenue by 10% ($4.85M) while fixed engineering payroll remains sticky, calculated operating profit of $9.30M would compress sharply toward ~$4.5M–$5.0M.',
    },
    recommendations: {
      sourceType: 'sample',
      generatedAt: 'Fictional Demonstration Dataset',
      strategicThesis:
        'Sequence capital-light recurring software expansion and commissioning standardization ahead of partner-led DACH market entry.',
      recommendations: [
        {
          id: 'rec-1',
          title: 'Installed-Base Predictive Software Expansion',
          horizon: 'Short-Term',
          pillar: 'Growth Opportunities',
          priority: 'Primary',
          rationale:
            'Targeting active North American hardware sites accelerates recurring mix toward 30% without greenfield CapEx approval delays.',
          expectedQualitativeImpact: 'Supports predictable recurring revenue growth with low acquisition cost.',
          capitalAllocationSharePct: 30,
        },
        {
          id: 'rec-2',
          title: 'Standardize Brownfield Commissioning Playbooks',
          horizon: 'Short-Term',
          pillar: 'Operational Improvement',
          priority: 'Primary',
          rationale:
            'Templatized PLC and vision onboarding compresses deployment hour variance and protects the 19.18% operating margin.',
          expectedQualitativeImpact: 'Reduces custom engineering rework and frees specialist capacity.',
          capitalAllocationSharePct: 20,
        },
        {
          id: 'rec-3',
          title: 'Enforce Milestone-Gated Procurement & Cost Controls',
          horizon: 'Short-Term',
          pillar: 'Cost Optimisation',
          priority: 'Primary',
          rationale:
            'Aligning customer milestone deposits with long-lead hardware procurement limits balance-sheet cash lockup.',
          expectedQualitativeImpact: 'Strengthens working-capital resilience during slower CapEx cycles.',
          capitalAllocationSharePct: 15,
        },
        {
          id: 'rec-4',
          title: 'Vendor-Agnostic Mixed-Fleet Differentiation',
          horizon: 'Long-Term',
          pillar: 'Competitive Positioning',
          priority: 'Secondary',
          rationale:
            'Positioning as the unified telemetry layer across competing robot brands protects differentiation against single-OEM lock-in.',
          expectedQualitativeImpact: 'Improves enterprise win rates in heterogeneous factories.',
          capitalAllocationSharePct: 15,
        },
        {
          id: 'rec-5',
          title: 'DACH Certified Integrator Channel Expansion',
          horizon: 'Long-Term',
          pillar: 'Business Expansion',
          priority: 'Primary',
          rationale:
            'Partnering with 3–4 established DACH integrators lowers fixed overhead and accelerates local trust.',
          expectedQualitativeImpact: 'Enables measured European expansion without heavy upfront payroll.',
          capitalAllocationSharePct: 12,
        },
        {
          id: 'rec-6',
          title: 'Pre-Certified EU Machinery & Data Residency Readiness',
          horizon: 'Long-Term',
          pillar: 'Risk Mitigation',
          priority: 'Secondary',
          rationale:
            'Completing CE/EU conformity packages and regional telemetry hosting removes procurement blockers early.',
          expectedQualitativeImpact: 'Avoids late-stage compliance delays in DACH automotive tenders.',
          capitalAllocationSharePct: 8,
        },
      ],
      nextSteps: [
        {
          id: 'step-1',
          step: 'Audit top 40 active customer sites for predictive-maintenance software upgrade readiness',
          owner: 'VP Commercial & Customer Success',
          timeframe: 'Weeks 1–4',
          kpi: '15 expansion proposals issued',
          completed: false,
        },
        {
          id: 'step-2',
          step: 'Standardize legacy PLC retrofit scoping checklist & fixed-tier commissioning pricing',
          owner: 'Head of Field Engineering',
          timeframe: 'Weeks 3–8',
          kpi: '20% reduction in commissioning hour variance',
          completed: false,
        },
        {
          id: 'step-3',
          step: 'Update hardware sales agreements to enforce 45% procurement milestone deposits',
          owner: 'Finance & Legal',
          timeframe: 'Month 1',
          kpi: '100% new custom orders compliant',
          completed: false,
        },
        {
          id: 'step-4',
          step: 'Shortlist 6 DACH tier-2 integrators and initiate EU compliance documentation review',
          owner: 'International Expansion Lead',
          timeframe: 'Months 3–6',
          kpi: '2 certified partner agreements signed',
          completed: false,
        },
      ],
    },
  },
  {
    id: 'vanguard-fintech',
    label: 'Vanguard Treasury Cloud (Fictional Demo)',
    descriptor: 'Fictional B2B multi-entity liquidity & cash-flow SaaS platform',
    businessInput: {
      companyName: 'Vanguard Treasury Cloud PLC (Fictional Demo)',
      industry: 'Enterprise B2B FinTech SaaS',
      country: 'United Kingdom',
      revenue: 22400000,
      expenses: 24100000,
      employeeCount: 142,
      objectives:
        'Reach operating breakeven within 4 quarters while sustaining multi-subsidiary expansion across mid-market CFO teams and completing enterprise ISO/SOC-2 audits.',
      challenges:
        'Long enterprise security questionnaires and bespoke bank-host-to-host onboarding slow time-to-live and weigh on near-term operating margins (-7.59%).',
      periodLabel: 'Fictional Demo Run-Rate',
      recordOrigin: 'fictional_demo',
      sourceAttribution: 'AUREON Fictional Demonstration Dataset',
      lastUpdated: 'Demo Baseline',
      tickerOrRegId: 'VTC.DEMO',
    },
    marketInput: {
      industry: 'Enterprise B2B FinTech SaaS',
      targetMarket:
        'Multi-subsidiary mid-market enterprises managing cross-border treasury and ERP reconciliation',
      competitors:
        'Legacy treasury management suites, native ERP modules, and API-first cash startups',
      marketConditions:
        'CFOs prioritize cash yield visibility and working-capital control amid heightened cybersecurity and vendor consolidation scrutiny.',
    },
    businessAnalysis: {
      sourceType: 'sample',
      generatedAt: 'Fictional Demonstration Dataset',
      calculatedMetrics: computeCalculatedMetrics(22400000, 24100000, 142),
      executiveSummary:
        'FICTIONAL DEMONSTRATION REPORT: On supplied demonstration figures ($22,400,000 revenue vs. $24,100,000 operating expenses across 142 employees), Vanguard records an operating deficit of -$1,700,000 (-7.59% operating margin). Reaching breakeven requires holding overhead growth flat while expanding multi-subsidiary adoption inside existing accounts.',
      reportSections: [
        { number: 1, title: 'Executive Summary', content: 'Operates near inflection with a -$1.70M operating deficit (-7.59% margin). Disciplined opex gating and subsidiary expansion represent the clearest path to breakeven.' },
        { number: 2, title: 'Company Overview', content: 'Fictional UK-headquartered Enterprise FinTech SaaS operator with 142 employees (~$157,746 revenue per employee).' },
        { number: 3, title: 'Business Activities', content: 'Provides multi-entity cash visibility, bank connectivity, and ERP treasury reconciliation.' },
        { number: 4, title: 'Financial Performance', content: 'Annual revenue of $22.40M minus operating expenses of $24.10M equals -$1.70M operating loss. Cash runway and debt details were not provided.' },
        { number: 5, title: 'Revenue and Expense Analysis', content: 'Operating expenses equal 107.59% of revenue, reflecting compliance audit investment and custom bank onboarding load.' },
        { number: 6, title: 'Profitability Assessment', content: 'Currently operating at a -7.59% operating margin; narrowing the $1.70M gap requires ~8%–10% incremental revenue with flat overhead.' },
        { number: 7, title: 'Operational Efficiency', content: 'Bespoke bank host-to-host setups slow onboarding throughput and absorb engineering hours.' },
        { number: 8, title: 'Market Position', content: 'Focused wedge between rigid legacy treasury suites and basic single-entity startup tools.' },
        { number: 9, title: 'Competitor Analysis', content: 'Faces native ERP bundling and legacy suites; competitor pricing schedules are not verified in supplied data.' },
        { number: 10, title: 'Business Opportunities', content: 'Post-M&A multi-ERP consolidation and automated intercompany reconciliation add-ons.' },
        { number: 11, title: 'Financial and Operational Risks', content: 'Enterprise deal slippage prolonging negative operating margin and compliance audit engineering drag.' },
        { number: 12, title: 'Strategic Recommendations', content: 'Prioritize existing-logo subsidiary expansion, freeze non-essential G&A, and standardize top bank connectors.' },
      ],
      suppliedEvidence: [
        'Annual Revenue: $22,400,000 (Demonstration Input)',
        'Annual Operating Expenses: $24,100,000 (Demonstration Input)',
        'Calculated Operating Profit: -$1,700,000 (-7.59% Operating Margin)',
        'Employee Count: 142',
      ],
      aiAssumptions: [
        'Assumes existing customers hold additional un-onboarded subsidiaries suitable for expansion.',
      ],
      missingInformation: [
        'Cash balance, monthly burn rate, and net dollar retention cohort metrics.',
      ],
      performanceDrivers: [
        { title: 'Near-Inflection Cost Base', observation: 'Expenses at 107.59% of revenue put breakeven within reach.', impactDirection: 'Neutral' },
        { title: 'Audit & Onboarding Load', observation: 'Compliance prep and custom bank feeds weigh on near-term margin.', impactDirection: 'Pressure' },
        { title: 'Subsidiary Expansion Flywheel', observation: 'Multi-entity rollouts scale ACV efficiently.', impactDirection: 'Positive' },
      ],
      objectiveAlignment: [
        { objective: 'Reach operating breakeven within 4 quarters', readiness: 'Moderate', rationale: 'Requires closing $1.70M deficit via disciplined opex control.' },
        { objective: 'Complete enterprise ISO/SOC-2 readiness', readiness: 'Strong', rationale: 'Unlocks regulated enterprise procurement.' },
      ],
      illustrativeScenarios: [
        { label: 'Conservative Scenario', revenueMultiplier: 1.04, marginDeltaPctPoints: 1.5, thesis: 'Deal slippage keeps margin slightly negative (-6.1%).' },
        { label: 'Base Execution Scenario', revenueMultiplier: 1.15, marginDeltaPctPoints: 8.2, thesis: 'Flat opex and subsidiary expansion reach slight positive margin (+0.6%).' },
        { label: 'Expansion Scenario', revenueMultiplier: 1.24, marginDeltaPctPoints: 12.4, thesis: 'Post-audit enterprise wins lift margin toward +4.8%.' },
      ],
    },
    marketAnalysis: {
      sourceType: 'sample',
      generatedAt: 'Fictional Demonstration Dataset',
      dataIntegrityNotice: 'Illustrative structural analysis from demonstration brief. No live market data fabricated.',
      marketOverview: 'Multi-entity CFOs seek rapid ERP liquidity visibility without multi-quarter legacy consulting projects.',
      demandDrivers: [
        { factor: 'Idle Cash Visibility', strength: 'High', explanation: 'Fragmented subsidiary accounts create direct treasury efficiency loss.' },
        { factor: 'Rapid Multi-ERP Aggregation', strength: 'High', explanation: 'Acquisitive mid-market firms run mixed ERPs requiring unified cash views.' },
        { factor: 'Security Governance', strength: 'Moderate', explanation: 'Procurement consolidates onto audited vendors.' },
      ],
      competitiveLandscape: [
        { segment: 'Legacy Treasury Suites', intensity: 'High', differentiationAngle: 'Heavy implementation cost and long rollout times.' },
        { segment: 'Native ERP Modules', intensity: 'Moderate', differentiationAngle: 'Weak across heterogeneous multi-ERP subsidiaries.' },
        { segment: 'API-First Startups', intensity: 'Moderate', differentiationAngle: 'Often lack enterprise ISO/SOC-2 controls.' },
      ],
      opportunities: [
        { title: 'Post-M&A Multi-ERP Consolidation Playbook', attractivenessScore: 4.7, executionComplexity: 2.5, summary: 'Win acquisitive firms running mixed ERPs.' },
        { title: 'Automated Intercompany Reconciliation', attractivenessScore: 4.3, executionComplexity: 3.1, summary: 'Monetize existing bank feeds with close automation.' },
      ],
      structuralBarriers: [
        'Regional bank host-to-host certification lead times.',
        'Long enterprise security and legal review cycles.',
      ],
      indicatorsToMonitor: [
        'Days from contract signature to live multi-bank feeds.',
        'Security questionnaire turnaround time.',
      ],
    },
    riskAssessment: {
      sourceType: 'sample',
      generatedAt: 'Fictional Demonstration Dataset',
      overallPostureSummary: 'Elevated near-term financial and competitive risk due to the -7.59% operating deficit alongside enterprise sales-cycle friction.',
      risks: [
        {
          category: 'Financial',
          severity: 'Elevated',
          likelihoodScore: 3.5,
          impactScore: 4.1,
          explanation: 'Operating deficit of -$1.70M limits margin for bookings slippage before breakeven.',
          evidenceBasis: 'Supplied revenue ($22.4M) vs. expenses ($24.1M).',
          earlyWarningSignals: ['Quarterly bookings below plan', 'Opex drift above 4%'],
          mitigationControls: ['Gate hiring to ARR milestones', 'Incentivize annual upfront billing'],
        },
        {
          category: 'Operational',
          severity: 'Moderate',
          likelihoodScore: 3.0,
          impactScore: 3.6,
          explanation: 'Bespoke bank setups and audit collection strain engineering bandwidth.',
          evidenceBasis: 'Stated challenge of bespoke bank onboarding and SOC-2/ISO audits.',
          earlyWarningSignals: ['Onboarding backlog >45 days'],
          mitigationControls: ['Automate top-25 bank connector health checks'],
        },
        {
          category: 'Market',
          severity: 'Moderate',
          likelihoodScore: 2.8,
          impactScore: 3.2,
          explanation: 'IT budget consolidation can pause net-new software evaluations.',
          evidenceBasis: 'Stated market condition of vendor consolidation scrutiny.',
          earlyWarningSignals: ['Longer CFO procurement approvals'],
          mitigationControls: ['Lead with close-speed and fraud-control ROI'],
        },
        {
          category: 'Competitive',
          severity: 'High',
          likelihoodScore: 3.8,
          impactScore: 4.0,
          explanation: 'ERP incumbents bundle basic cash modules at low marginal cost.',
          evidenceBasis: 'Stated competitor set includes native ERP modules.',
          earlyWarningSignals: ['Losses citing native ERP sufficiency'],
          mitigationControls: ['Target multi-ERP groups where single-ERP tools fail'],
        },
        {
          category: 'Regulatory',
          severity: 'Elevated',
          likelihoodScore: 3.2,
          impactScore: 4.0,
          explanation: 'Cross-border UK/EU open-banking, PSD2, and SOC-2/ISO data controls carry strict audit obligations.',
          evidenceBasis: 'Stated UK FinTech SaaS operation and ongoing ISO/SOC-2 audit objectives.',
          earlyWarningSignals: ['Audit findings delaying enterprise security sign-off'],
          mitigationControls: ['Maintain continuous automated compliance evidence logging'],
        },
      ],
      stressTestNarrative: 'If revenue grows only 4% with flat expenses, operating deficit remains near -$0.8M.',
    },
    recommendations: {
      sourceType: 'sample',
      generatedAt: 'Fictional Demonstration Dataset',
      strategicThesis: 'Focus on multi-subsidiary existing-account expansion and opex discipline to cross breakeven.',
      recommendations: [
        {
          id: 'v-1',
          title: 'Multi-Subsidiary Expansion Campaign',
          horizon: 'Short-Term',
          pillar: 'Growth Opportunities',
          priority: 'Primary',
          rationale: 'Lowest-cost path to closing the $1.70M operating deficit.',
          expectedQualitativeImpact: 'Accelerates net retention without high outbound CAC.',
          capitalAllocationSharePct: 30,
        },
        {
          id: 'v-2',
          title: 'OpEx Gating Until Breakeven',
          horizon: 'Short-Term',
          pillar: 'Cost Optimisation',
          priority: 'Primary',
          rationale: 'Prevents payroll expansion ahead of ARR conversion.',
          expectedQualitativeImpact: 'Protects runway and accelerates margin crossover.',
          capitalAllocationSharePct: 25,
        },
        {
          id: 'v-3',
          title: 'Standardize Top-25 Bank Connectors',
          horizon: 'Short-Term',
          pillar: 'Operational Improvement',
          priority: 'Primary',
          rationale: 'Removes bespoke onboarding bottlenecks.',
          expectedQualitativeImpact: 'Shortens time-to-live and reduces engineering load.',
          capitalAllocationSharePct: 15,
        },
        {
          id: 'v-4',
          title: 'Multi-ERP Post-M&A Positioning',
          horizon: 'Long-Term',
          pillar: 'Competitive Positioning',
          priority: 'Primary',
          rationale: 'Avoids single-ERP bundling battles.',
          expectedQualitativeImpact: 'Raises enterprise win rates.',
          capitalAllocationSharePct: 12,
        },
        {
          id: 'v-5',
          title: 'Regulated Healthcare & Manufacturing Expansion',
          horizon: 'Long-Term',
          pillar: 'Business Expansion',
          priority: 'Secondary',
          rationale: 'Leverages completed ISO/SOC-2 credentials into new verticals.',
          expectedQualitativeImpact: 'Expands addressable enterprise pipeline.',
          capitalAllocationSharePct: 10,
        },
        {
          id: 'v-6',
          title: 'Continuous Compliance Telemetry Automation',
          horizon: 'Long-Term',
          pillar: 'Risk Mitigation',
          priority: 'Secondary',
          rationale: 'Sustains audit readiness with minimal engineering distraction.',
          expectedQualitativeImpact: 'Speeds enterprise security sign-off.',
          capitalAllocationSharePct: 8,
        },
      ],
      nextSteps: [
        {
          id: 'vs-1',
          step: 'Identify top 25 accounts with un-onboarded subsidiaries for expansion outreach',
          owner: 'VP Revenue',
          timeframe: 'Weeks 1–3',
          kpi: '20 CFO reviews booked',
          completed: false,
        },
        {
          id: 'vs-2',
          step: 'Publish Trust Portal with SOC-2/ISO artifacts for enterprise procurement',
          owner: 'Security Lead',
          timeframe: 'Weeks 2–6',
          kpi: '30% faster security review cycle',
          completed: false,
        },
      ],
    },
  },
];

export const INITIAL_WORKSPACE_NOTES: WorkspaceNote[] = [
  {
    id: 'note-1',
    title: 'Demonstration Note — Software Attach Rate Check',
    category: 'Business',
    content:
      'Sample note: Verify whether moving software mix toward 30% requires separating customer onboarding from field hardware commissioning.',
    updatedAt: 'Demo Note',
  },
];
