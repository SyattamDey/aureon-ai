import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { ThinkingLevel, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import {
  getProviderStatuses,
  getSecCompanyDetail,
  searchCompaniesHouse,
  searchFmp,
  searchOpenCorporates,
  searchSecEdgar,
} from './server/providers.ts';
import type { CompanyRecord, ExecutiveBriefingData } from './src/types.ts';
import {
  buildExecutiveBriefingHtml,
  buildExecutiveBriefingText,
} from './server/emailTemplate.ts';
import {
  formatGeminiErrorResponse,
  generateContentWithRetry,
  isGeminiConfigured,
  PRIMARY_GEMINI_MODEL,
  SUPPORTED_FALLBACK_MODELS,
} from './server/geminiClient.ts';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DEFAULT_RESEND_TESTING_FROM_EMAIL = 'AUREON AI <onboarding@resend.dev>';
const PERMITTED_RESEND_TESTING_RECIPIENT = 'adyajha972@gmail.com';
const inFlightBriefings = new Set<string>();
const sentBriefings = new Map<string, { messageId: string; sentAt: string }>();

function getResendConfig() {
  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  const configuredFrom = (process.env.RESEND_FROM_EMAIL || '').trim();
  const fromEmail = configuredFrom || DEFAULT_RESEND_TESTING_FROM_EMAIL;
  const testingMode = fromEmail.toLowerCase().includes('onboarding@resend.dev');
  return {
    apiKey,
    hasApiKey: apiKey.length > 0,
    fromEmail,
    testingMode,
    permittedTestingRecipient: testingMode ? PERMITTED_RESEND_TESTING_RECIPIENT : null,
  };
}

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

function parseNullableNonNegativeNumber(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  const num = Number(val);
  if (!Number.isFinite(num) || num < 0) return null;
  return num;
}

function computeCalculatedMetrics(
  revenue: number | null,
  expenses: number | null,
  employeeCount: number | null = null
) {
  const validRev = revenue !== null && Number.isFinite(revenue) && revenue >= 0 ? revenue : null;
  const validExp = expenses !== null && Number.isFinite(expenses) && expenses >= 0 ? expenses : null;
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

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'aureon-ai' });
  });

  // Server-side Gemini Environment Verification (never exposes API key)
  app.get('/api/gemini/status', (_req: Request, res: Response) => {
    res.json({
      configured: isGeminiConfigured(),
      model: PRIMARY_GEMINI_MODEL,
      fallbackModel: SUPPORTED_FALLBACK_MODELS[0],
    });
  });

  // Live Gemini Connection Test Endpoint (no simulated responses)
  app.post('/api/gemini/test', async (req: Request, res: Response) => {
    try {
      const prompt = String(
        req.body?.prompt ||
          'Explain how operating profit margin helps evaluate a company\'s performance.'
      ).trim();

      if (!prompt) {
        res.status(400).json({ ok: false, error: 'Test prompt cannot be empty.' });
        return;
      }

      const { response, modelUsed, usedFallback } = await generateContentWithRetry({
        operationName: 'Gemini Connection Test',
        contents: prompt,
        config: {
          systemInstruction:
            'You are AUREON AI. Provide a concise, clear, educational explanation in plain prose (no markdown clutter). Keep your answer under 160 words.',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      const responseText = (response.text ?? '').trim();
      res.json({
        ok: true,
        model: modelUsed,
        usedFallback,
        prompt,
        responseText,
        testedAt: new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }),
      });
    } catch (error) {
      const { status, message } = formatGeminiErrorResponse(error);
      res.status(status).json({
        ok: false,
        model: PRIMARY_GEMINI_MODEL,
        error: message,
      });
    }
  });

  // External Provider Connection Status
  app.get('/api/companies/providers', (_req: Request, res: Response) => {
    res.json({ providers: getProviderStatuses() });
  });

  // Live Company Discovery Across Connected External Providers
  app.get('/api/companies/search', async (req: Request, res: Response) => {
    const q = String(req.query.q || '').trim();
    const ownership = String(req.query.ownership || 'All');
    const region = String(req.query.region || 'All Regions');
    const country = String(req.query.country || '').trim().toLowerCase();
    const industry = String(req.query.industry || '').trim().toLowerCase();

    if (!q || q.length < 2) {
      res.json({
        results: [],
        providers: getProviderStatuses(),
        warnings: [],
      });
      return;
    }

    const providers = getProviderStatuses();
    const warnings: string[] = [];
    const tasks: Array<Promise<CompanyRecord[]>> = [];

    // SEC EDGAR (US Public Issuers)
    if (ownership !== 'Private') {
      tasks.push(
        searchSecEdgar(q, 14).catch((err) => {
          warnings.push(`SEC EDGAR lookup unavailable: ${err instanceof Error ? err.message : 'Network error'}`);
          return [];
        })
      );
    }

    // UK Companies House (if key configured)
    if (providers.find((p) => p.id === 'companies_house')?.connected) {
      tasks.push(
        searchCompaniesHouse(q, 10).catch((err) => {
          warnings.push(`Companies House lookup failed: ${err instanceof Error ? err.message : 'Error'}`);
          return [];
        })
      );
    }

    // OpenCorporates (if token configured)
    if (providers.find((p) => p.id === 'opencorporates')?.connected) {
      tasks.push(
        searchOpenCorporates(q, 10).catch((err) => {
          warnings.push(`OpenCorporates lookup failed: ${err instanceof Error ? err.message : 'Error'}`);
          return [];
        })
      );
    }

    // FMP (if key configured)
    if (ownership !== 'Private' && providers.find((p) => p.id === 'fmp')?.connected) {
      tasks.push(
        searchFmp(q, 10).catch((err) => {
          warnings.push(`FMP lookup failed: ${err instanceof Error ? err.message : 'Error'}`);
          return [];
        })
      );
    }

    const settled = await Promise.all(tasks);
    let combined = settled.flat();

    // Apply requested client filters cleanly without inventing values
    if (ownership === 'Public' || ownership === 'Private') {
      combined = combined.filter((c) => c.ownershipStatus === ownership);
    }
    if (region && region !== 'All Regions') {
      combined = combined.filter((c) => c.region === region);
    }
    if (country && country !== 'all') {
      combined = combined.filter((c) => c.country.toLowerCase().includes(country));
    }
    if (industry) {
      combined = combined.filter(
        (c) =>
          (c.industry || '').toLowerCase().includes(industry) ||
          c.companyName.toLowerCase().includes(industry)
      );
    }

    res.json({
      results: combined.slice(0, 25),
      providers,
      warnings,
    });
  });

  // Fetch detailed SEC EDGAR filing + XBRL facts for a selected US public company
  app.get('/api/companies/sec/:cik', async (req: Request, res: Response) => {
    try {
      const record = await getSecCompanyDetail(String(req.params.cik || ''));
      res.json(record);
    } catch (error) {
      res.status(502).json({
        error: error instanceof Error ? error.message : 'Failed to retrieve SEC EDGAR company filings.',
      });
    }
  });

  // 1. Business Performance Analysis + 12-Section Gemini Report
  app.post('/api/analyze/business', async (req: Request, res: Response) => {
    try {
      const {
        companyName,
        industry,
        country,
        revenue,
        expenses,
        employeeCount,
        objectives,
        challenges,
        periodLabel,
        recordOrigin,
        sourceAttribution,
        lastUpdated,
        tickerOrRegId,
      } = req.body ?? {};

      if (!String(companyName || '').trim() || !String(industry || '').trim()) {
        res.status(400).json({ error: 'Company name and industry are required.' });
        return;
      }

      if (revenue !== null && revenue !== undefined && revenue !== '' && (Number(revenue) < 0 || !Number.isFinite(Number(revenue)))) {
        res.status(400).json({ error: 'Annual revenue must be a valid non-negative number or left blank if unavailable.' });
        return;
      }
      if (expenses !== null && expenses !== undefined && expenses !== '' && (Number(expenses) < 0 || !Number.isFinite(Number(expenses)))) {
        res.status(400).json({ error: 'Annual operating expenses must be a valid non-negative number or left blank if unavailable.' });
        return;
      }
      if (employeeCount !== null && employeeCount !== undefined && employeeCount !== '' && (Number(employeeCount) < 0 || !Number.isFinite(Number(employeeCount)))) {
        res.status(400).json({ error: 'Number of employees must be a valid non-negative integer or left blank.' });
        return;
      }

      const numRev = parseNullableNonNegativeNumber(revenue);
      const numExp = parseNullableNonNegativeNumber(expenses);
      const numEmp = parseNullableNonNegativeNumber(employeeCount);

      const calculatedMetrics = computeCalculatedMetrics(numRev, numExp, numEmp);

      const revStr =
        calculatedMetrics.revenue !== null
          ? `$${calculatedMetrics.revenue.toLocaleString('en-US')}`
          : 'UNAVAILABLE (Not supplied or not retrieved)';
      const expStr =
        calculatedMetrics.expenses !== null
          ? `$${calculatedMetrics.expenses.toLocaleString('en-US')}`
          : 'UNAVAILABLE (Not supplied or not retrieved)';
      const profitStr =
        calculatedMetrics.operatingProfit !== null
          ? `$${calculatedMetrics.operatingProfit.toLocaleString('en-US')}`
          : 'UNAVAILABLE';
      const marginStr =
        calculatedMetrics.operatingMarginPct !== null
          ? `${calculatedMetrics.operatingMarginPct}%`
          : 'UNAVAILABLE';
      const empStr = numEmp !== null ? `${Math.round(numEmp).toLocaleString('en-US')}` : 'UNAVAILABLE';

      const prompt = `Generate a comprehensive 12-Section Institutional Company Analysis Report strictly grounded in the supplied/retrieved evidence below.

SUPPLIED / RETRIEVED EVIDENCE:
- Company Name: ${companyName}
- Country: ${country || 'UNAVAILABLE'}
- Industry: ${industry}
- Record Origin / Attribution: ${recordOrigin || 'manual'} (${sourceAttribution || 'User Manual Entry'}${lastUpdated ? `, updated ${lastUpdated}` : ''})
- Identifier / Ticker: ${tickerOrRegId || 'UNAVAILABLE'}
- Reporting Period: ${periodLabel || 'Annual Baseline'}
- Annual Revenue: ${revStr}
- Annual Operating Expenses: ${expStr}
- Calculated Operating Profit: ${profitStr} (${calculatedMetrics.profitExplanation})
- Calculated Operating Profit Margin: ${marginStr} (${calculatedMetrics.marginExplanation})
- Number of Employees: ${empStr}
- Stated Business Objectives: ${objectives || 'Not specified by user'}
- Stated Current Business Challenges: ${challenges || 'Not specified by user'}

STRICT INTEGRITY RULES:
1. NEVER invent financial figures, headcount, competitor market shares, or live market quotes when a field is marked UNAVAILABLE. Explicitly note when information is missing.
2. NEVER present AI interpretations or estimates as verified financial facts.
3. Produce EXACTLY 12 reportSections numbered 1 through 12 with these exact titles:
   1. Executive Summary
   2. Company Overview
   3. Business Activities
   4. Financial Performance
   5. Revenue and Expense Analysis
   6. Profitability Assessment
   7. Operational Efficiency
   8. Market Position
   9. Competitor Analysis
   10. Business Opportunities
   11. Financial and Operational Risks
   12. Strategic Recommendations
4. Also return:
   - executiveSummary (concise 2–3 sentence synthesis)
   - suppliedEvidence (array of exact facts supplied/retrieved)
   - aiAssumptions (array of analytical assumptions made)
   - missingInformation (array of specific data gaps limiting certainty)
   - performanceDrivers (3 structured observations)
   - objectiveAlignment (assessments for stated objectives)
   - illustrativeScenarios (3 conceptual scenarios: Conservative, Base Execution, Expansion, with revenueMultiplier 0.85..1.35 and marginDeltaPctPoints -8..+12, explicitly conceptual).`;

      const { response } = await generateContentWithRetry({
        operationName: 'Business Intelligence Analysis',
        contents: prompt,
        config: {
          systemInstruction:
            'You are AUREON AI, an institutional business and capital analyst. Use only supplied or retrieved evidence for factual claims. Clearly label missing data, assumptions, and qualitative interpretations.',
          thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              executiveSummary: { type: Type.STRING },
              reportSections: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    number: { type: Type.INTEGER },
                    title: { type: Type.STRING },
                    content: { type: Type.STRING },
                  },
                  required: ['number', 'title', 'content'],
                },
              },
              suppliedEvidence: { type: Type.ARRAY, items: { type: Type.STRING } },
              aiAssumptions: { type: Type.ARRAY, items: { type: Type.STRING } },
              missingInformation: { type: Type.ARRAY, items: { type: Type.STRING } },
              performanceDrivers: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    observation: { type: Type.STRING },
                    impactDirection: { type: Type.STRING, enum: ['Positive', 'Neutral', 'Pressure'] },
                  },
                  required: ['title', 'observation', 'impactDirection'],
                },
              },
              objectiveAlignment: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    objective: { type: Type.STRING },
                    readiness: { type: Type.STRING, enum: ['Strong', 'Moderate', 'Needs Focus'] },
                    rationale: { type: Type.STRING },
                  },
                  required: ['objective', 'readiness', 'rationale'],
                },
              },
              illustrativeScenarios: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING },
                    revenueMultiplier: { type: Type.NUMBER },
                    marginDeltaPctPoints: { type: Type.NUMBER },
                    thesis: { type: Type.STRING },
                  },
                  required: ['label', 'revenueMultiplier', 'marginDeltaPctPoints', 'thesis'],
                },
              },
            },
            required: [
              'executiveSummary',
              'reportSections',
              'suppliedEvidence',
              'aiAssumptions',
              'missingInformation',
              'performanceDrivers',
              'objectiveAlignment',
              'illustrativeScenarios',
            ],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json({
        sourceType: 'ai',
        generatedAt: new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }),
        calculatedMetrics,
        ...parsed,
      });
    } catch (error) {
      const { status, message } = formatGeminiErrorResponse(error);
      res.status(status).json({ error: message });
    }
  });

  // 2. Market Intelligence Analysis
  app.post('/api/analyze/market', async (req: Request, res: Response) => {
    try {
      const { industry, targetMarket, competitors, marketConditions } = req.body ?? {};
      if (!industry || !targetMarket || !competitors || !marketConditions) {
        res.status(400).json({
          error: 'Industry, target market, competitors, and market conditions are required.',
        });
        return;
      }

      const prompt = `Conduct a qualitative Market Intelligence & Opportunity analysis strictly from the user's brief below.
Industry: ${industry}
Target Market: ${targetMarket}
Competitors: ${competitors}
Observed Market Conditions: ${marketConditions}

CRITICAL INTEGRITY CONSTRAINT:
- Do NOT invent or claim live market data, current market capitalization, real-time TAM dollar figures, stock prices, or recent external percentages.
- Frame all market dynamics and opportunities as qualitative structural analysis derived from the stated industry, target segment, competitors, and conditions.
- Include 3 demandDrivers, 3 competitiveLandscape segments, 3 strategic opportunities (each scored 1.0 to 5.0 on attractivenessScore and executionComplexity for matrix plotting), 3 structuralBarriers, and 3 indicatorsToMonitor.`;

      const { response } = await generateContentWithRetry({
        operationName: 'Market Intelligence Analysis',
        contents: prompt,
        config: {
          systemInstruction:
            'You are AUREON AI, an institutional market structure analyst. Never fabricate live market figures, real-time prices, or unverified statistics. Distinguish structural qualitative synthesis clearly.',
          thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              dataIntegrityNotice: { type: Type.STRING },
              marketOverview: { type: Type.STRING },
              demandDrivers: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    factor: { type: Type.STRING },
                    strength: { type: Type.STRING, enum: ['High', 'Moderate', 'Emerging'] },
                    explanation: { type: Type.STRING },
                  },
                  required: ['factor', 'strength', 'explanation'],
                },
              },
              competitiveLandscape: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    segment: { type: Type.STRING },
                    intensity: { type: Type.STRING, enum: ['Low', 'Moderate', 'High'] },
                    differentiationAngle: { type: Type.STRING },
                  },
                  required: ['segment', 'intensity', 'differentiationAngle'],
                },
              },
              opportunities: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    attractivenessScore: { type: Type.NUMBER },
                    executionComplexity: { type: Type.NUMBER },
                    summary: { type: Type.STRING },
                  },
                  required: ['title', 'attractivenessScore', 'executionComplexity', 'summary'],
                },
              },
              structuralBarriers: { type: Type.ARRAY, items: { type: Type.STRING } },
              indicatorsToMonitor: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: [
              'dataIntegrityNotice',
              'marketOverview',
              'demandDrivers',
              'competitiveLandscape',
              'opportunities',
              'structuralBarriers',
              'indicatorsToMonitor',
            ],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json({
        sourceType: 'ai',
        generatedAt: new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }),
        ...parsed,
      });
    } catch (error) {
      const { status, message } = formatGeminiErrorResponse(error);
      res.status(status).json({ error: message });
    }
  });

  // 3. 5-Domain Risk Assessment Analysis
  app.post('/api/analyze/risk', async (req: Request, res: Response) => {
    try {
      const {
        companyName,
        industry,
        country,
        revenue,
        expenses,
        employeeCount,
        objectives,
        challenges,
        targetMarket,
        competitors,
        marketConditions,
      } = req.body ?? {};

      if (!companyName || !industry) {
        res.status(400).json({ error: 'Company profile and industry context are required for risk assessment.' });
        return;
      }

      const metrics = computeCalculatedMetrics(
        parseNullableNonNegativeNumber(revenue),
        parseNullableNonNegativeNumber(expenses),
        parseNullableNonNegativeNumber(employeeCount)
      );

      const prompt = `Perform an institutional 5-domain Risk Assessment (Financial, Operational, Market, Competitive, Regulatory) based strictly on the supplied inputs below:
Company: ${companyName}
Country: ${country || 'Not specified'}
Industry: ${industry}
Revenue: ${metrics.revenue !== null ? `$${metrics.revenue.toLocaleString('en-US')}` : 'UNAVAILABLE'}
Operating Expenses: ${metrics.expenses !== null ? `$${metrics.expenses.toLocaleString('en-US')}` : 'UNAVAILABLE'}
Operating Margin: ${metrics.operatingMarginPct !== null ? `${metrics.operatingMarginPct}%` : 'UNAVAILABLE'}
Employees: ${employeeCount ?? 'UNAVAILABLE'}
Objectives: ${objectives || 'Not specified'}
Challenges: ${challenges || 'Not specified'}
Target Market: ${targetMarket || 'Not specified'}
Competitors: ${competitors || 'Not specified'}
Market Conditions: ${marketConditions || 'Not specified'}

REQUIREMENTS:
- Return EXACTLY 5 risk objects covering categories: "Financial", "Operational", "Market", "Competitive", "Regulatory".
- Never invent evidence. In "evidenceBasis", cite ONLY facts present in the inputs above or explicitly state that no quantitative evidence was supplied and the assessment is structural inference.
- Include severity ("Low" | "Moderate" | "Elevated" | "High"), likelihoodScore (1..5), impactScore (1..5), explanation, evidenceBasis, earlyWarningSignals (2 items), and mitigationControls (2 items).`;

      const { response } = await generateContentWithRetry({
        operationName: '5-Domain Risk Assessment',
        contents: prompt,
        config: {
          systemInstruction:
            'You are AUREON AI, an institutional enterprise risk management engine. Never invent evidence or unverified external data.',
          thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              overallPostureSummary: { type: Type.STRING },
              risks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    category: {
                      type: Type.STRING,
                      enum: ['Financial', 'Operational', 'Market', 'Competitive', 'Regulatory'],
                    },
                    severity: {
                      type: Type.STRING,
                      enum: ['Low', 'Moderate', 'Elevated', 'High'],
                    },
                    likelihoodScore: { type: Type.NUMBER },
                    impactScore: { type: Type.NUMBER },
                    explanation: { type: Type.STRING },
                    evidenceBasis: { type: Type.STRING },
                    earlyWarningSignals: { type: Type.ARRAY, items: { type: Type.STRING } },
                    mitigationControls: { type: Type.ARRAY, items: { type: Type.STRING } },
                  },
                  required: [
                    'category',
                    'severity',
                    'likelihoodScore',
                    'impactScore',
                    'explanation',
                    'evidenceBasis',
                    'earlyWarningSignals',
                    'mitigationControls',
                  ],
                },
              },
              stressTestNarrative: { type: Type.STRING },
            },
            required: ['overallPostureSummary', 'risks', 'stressTestNarrative'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json({
        sourceType: 'ai',
        generatedAt: new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }),
        ...parsed,
      });
    } catch (error) {
      const { status, message } = formatGeminiErrorResponse(error);
      res.status(status).json({ error: message });
    }
  });

  // 4. AI Recommendations (6 Pillars, Short-Term vs Long-Term)
  app.post('/api/analyze/recommendations', async (req: Request, res: Response) => {
    try {
      const { businessInput, marketInput, riskSummary, strategicFocus } = req.body ?? {};
      if (!businessInput?.companyName || !businessInput?.industry) {
        res.status(400).json({ error: 'Active business profile is required to generate recommendations.' });
        return;
      }

      const metrics = computeCalculatedMetrics(
        parseNullableNonNegativeNumber(businessInput.revenue),
        parseNullableNonNegativeNumber(businessInput.expenses),
        parseNullableNonNegativeNumber(businessInput.employeeCount)
      );

      const prompt = `Generate practical business recommendations separated into Short-Term and Long-Term horizons across all 6 strategic pillars:
1. "Business Expansion"
2. "Cost Optimisation"
3. "Competitive Positioning"
4. "Operational Improvement"
5. "Growth Opportunities"
6. "Risk Mitigation"

Company: ${businessInput.companyName} (${businessInput.country || 'Country unspecified'})
Industry: ${businessInput.industry}
Financial Baseline: Revenue ${metrics.revenue !== null ? `$${metrics.revenue.toLocaleString('en-US')}` : 'UNAVAILABLE'}, Expenses ${metrics.expenses !== null ? `$${metrics.expenses.toLocaleString('en-US')}` : 'UNAVAILABLE'}, Margin ${metrics.operatingMarginPct !== null ? `${metrics.operatingMarginPct}%` : 'UNAVAILABLE'}
Objectives: ${businessInput.objectives || 'Not specified'}
Challenges: ${businessInput.challenges || 'Not specified'}
Target Market: ${marketInput?.targetMarket || 'General B2B'}
Competitors: ${marketInput?.competitors || 'Incumbent players'}
Market Conditions: ${marketInput?.marketConditions || 'Standard conditions'}
Risk Context: ${riskSummary || 'Balanced execution risk'}
Additional Strategic Focus: ${strategicFocus || 'Balanced capital efficiency and growth'}

Requirements:
- Return 6 practical recommendations (one for each of the 6 pillars above), balanced cleanly between "Short-Term" (0–6 months) and "Long-Term" (6–24 months) horizons.
- Set capitalAllocationSharePct across the 6 recommendations so they sum cleanly to 100.
- Return 4 concrete suggested next steps with step, owner, timeframe, and measurable KPI.
- Do not fabricate live market data or guarantee financial outcomes.`;

      const { response } = await generateContentWithRetry({
        operationName: '6-Pillar Recommendations',
        contents: prompt,
        config: {
          systemInstruction:
            'You are AUREON AI, a corporate strategy advisor. Provide pragmatic, executable recommendations grounded strictly in supplied inputs.',
          thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              strategicThesis: { type: Type.STRING },
              recommendations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    title: { type: Type.STRING },
                    horizon: { type: Type.STRING, enum: ['Short-Term', 'Long-Term'] },
                    pillar: {
                      type: Type.STRING,
                      enum: [
                        'Business Expansion',
                        'Cost Optimisation',
                        'Competitive Positioning',
                        'Operational Improvement',
                        'Growth Opportunities',
                        'Risk Mitigation',
                      ],
                    },
                    priority: { type: Type.STRING, enum: ['Primary', 'Secondary'] },
                    rationale: { type: Type.STRING },
                    expectedQualitativeImpact: { type: Type.STRING },
                    capitalAllocationSharePct: { type: Type.NUMBER },
                  },
                  required: [
                    'id',
                    'title',
                    'horizon',
                    'pillar',
                    'priority',
                    'rationale',
                    'expectedQualitativeImpact',
                    'capitalAllocationSharePct',
                  ],
                },
              },
              nextSteps: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    step: { type: Type.STRING },
                    owner: { type: Type.STRING },
                    timeframe: { type: Type.STRING },
                    kpi: { type: Type.STRING },
                  },
                  required: ['id', 'step', 'owner', 'timeframe', 'kpi'],
                },
              },
            },
            required: ['strategicThesis', 'recommendations', 'nextSteps'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      const normalizedSteps = Array.isArray(parsed.nextSteps)
        ? parsed.nextSteps.map((s: Record<string, unknown>, idx: number) => ({
            ...s,
            id: String(s.id || `step-${idx + 1}`),
            completed: false,
          }))
        : [];

      res.json({
        sourceType: 'ai',
        generatedAt: new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }),
        strategicThesis: parsed.strategicThesis,
        recommendations: parsed.recommendations,
        nextSteps: normalizedSteps,
      });
    } catch (error) {
      const { status, message } = formatGeminiErrorResponse(error);
      res.status(status).json({ error: message });
    }
  });

  // 5. Research Workspace Executive Memo Synthesis
  app.post('/api/workspace/synthesize', async (req: Request, res: Response) => {
    try {
      const { companyName, businessMetrics, notes, snapshots, researchQuestion } = req.body ?? {};
      if (!companyName) {
        res.status(400).json({ error: 'Company context is required to synthesize a memo.' });
        return;
      }

      const prompt = `Synthesize an Executive Research Memo for ${companyName}.
Deterministic Financial Basis (User Inputs / Retrieved Filings):
${JSON.stringify(businessMetrics ?? {}, null, 2)}

Analyst Research Notes:
${JSON.stringify(notes ?? [], null, 2)}

Saved Analysis Snapshots:
${JSON.stringify(snapshots ?? [], null, 2)}

Specific Research Question / Focus:
${researchQuestion || 'Synthesize key financial constraints, market opportunities, primary risks, and immediate board priorities.'}

Keep verified/user-supplied input facts cleanly separated from AI strategic synthesis. Never fabricate live market figures.`;

      const { response } = await generateContentWithRetry({
        operationName: 'Executive Memo Synthesis',
        contents: prompt,
        config: {
          systemInstruction:
            'You are AUREON AI. Synthesize an executive board memo clearly distinguishing deterministic input/filing facts from AI-generated strategic synthesis.',
          thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              verifiedInputsSummary: { type: Type.ARRAY, items: { type: Type.STRING } },
              aiStrategicSynthesis: { type: Type.STRING },
              keyRisksAndTradeoffs: { type: Type.ARRAY, items: { type: Type.STRING } },
              recommendedBoardActions: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: [
              'title',
              'verifiedInputsSummary',
              'aiStrategicSynthesis',
              'keyRisksAndTradeoffs',
              'recommendedBoardActions',
            ],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json({
        generatedAt: new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }),
        ...parsed,
      });
    } catch (error) {
      const { status, message } = formatGeminiErrorResponse(error);
      res.status(status).json({ error: message });
    }
  });

  // 6. Executive Briefing — Email Provider Status (never exposes API keys or server sender config)
  app.get('/api/briefing/email-status', (_req: Request, res: Response) => {
    const { hasApiKey, testingMode, permittedTestingRecipient } = getResendConfig();

    const testingRestrictionWarning = testingMode
      ? `Restricted Testing Mode Active: No custom domain is required, and manual sending is permitted exclusively to the verified Resend account email (${permittedTestingRecipient}). All other recipient addresses will be rejected.`
      : null;

    let configurationNote = '';
    if (!hasApiKey) {
      configurationNote =
        'Server email provider key (RESEND_API_KEY) is not configured in Settings > Secrets. Real delivery cannot proceed until configured.';
    } else if (testingMode) {
      configurationNote = `Resend Restricted Testing Mode is configured server-side and ready for manual delivery exclusively to ${permittedTestingRecipient}.`;
    } else {
      configurationNote =
        'Resend server-side email delivery is configured with a verified sender domain and ready for manual send.';
    }

    res.json({
      provider: 'Resend',
      configured: hasApiKey,
      senderConfigured: true,
      testingMode,
      permittedTestingRecipient,
      configurationNote,
      testingRestrictionWarning,
    });
  });

  // 7. Executive Briefing — Gemini AI Generator + HTML Email Template
  app.post('/api/briefing/generate', async (req: Request, res: Response) => {
    try {
      const { businessInput, marketInput, riskSummary } = req.body ?? {};
      if (!businessInput?.companyName || !businessInput?.industry) {
        res.status(400).json({
          error: 'Company name and industry are required before generating an Executive Briefing.',
        });
        return;
      }

      const numRev = parseNullableNonNegativeNumber(businessInput.revenue);
      const numExp = parseNullableNonNegativeNumber(businessInput.expenses);
      const numEmp = parseNullableNonNegativeNumber(businessInput.employeeCount);
      const metrics = computeCalculatedMetrics(numRev, numExp, numEmp);

      const revDisplay =
        metrics.revenue !== null ? `$${metrics.revenue.toLocaleString('en-US')}` : 'Unavailable';
      const expDisplay =
        metrics.expenses !== null ? `$${metrics.expenses.toLocaleString('en-US')}` : 'Unavailable';
      const profitDisplay =
        metrics.operatingProfit !== null
          ? `${metrics.operatingProfit < 0 ? '-' : ''}$${Math.abs(
              metrics.operatingProfit
            ).toLocaleString('en-US')}`
          : 'Unavailable';
      const marginDisplay =
        metrics.operatingMarginPct !== null ? `${metrics.operatingMarginPct.toFixed(2)}%` : 'N/A';
      const empDisplay = numEmp !== null ? Math.round(numEmp).toLocaleString('en-US') : 'Unavailable';

      const recordOriginLabel =
        businessInput.recordOrigin === 'fictional_demo'
          ? 'Fictional Demonstration Record (Not Real)'
          : businessInput.sourceAttribution || 'Manual User Entry';

      const prompt = `Draft a concise 1–2 page Executive Briefing strictly grounded in the supplied/retrieved context below.

COMPANY & EVIDENCE CONTEXT:
- Company Name: ${businessInput.companyName}
- Industry: ${businessInput.industry}
- Country: ${businessInput.country || 'Unspecified'}
- Origin / Attribution: ${recordOriginLabel} (Updated: ${businessInput.lastUpdated || 'Current Session'})
- Identifier / Ticker: ${businessInput.tickerOrRegId || 'Unavailable'}
- Reporting Basis: ${businessInput.periodLabel || 'Latest Period'}
- Annual Revenue: ${revDisplay}
- Annual Operating Expenses: ${expDisplay}
- Calculated Operating Profit: ${profitDisplay}
- Calculated Operating Profit Margin: ${marginDisplay}
- Employees: ${empDisplay}
- Business Objectives: ${businessInput.objectives || 'Not specified'}
- Current Challenges: ${businessInput.challenges || 'Not specified'}
- Target Market: ${marketInput?.targetMarket || 'Not specified'}
- Competitors: ${marketInput?.competitors || 'Not specified'}
- Market Conditions: ${marketInput?.marketConditions || 'Not specified'}
- Risk Context: ${riskSummary || 'Evaluate key financial, operational, market, competitive, and regulatory risks from context'}

STRICT RULES:
1. NEVER invent company financial figures, historical revenues, stock prices, or unverified market numbers. If a figure is "Unavailable", acknowledge the gap rather than guessing.
2. Produce concise, executive prose suitable for a 1–2 page board briefing:
   - executiveOverview: 2–3 crisp sentences
   - companyProfile: 2–3 sentences describing entity, jurisdiction, and origin
   - financialNarrative: 2–3 sentences interpreting the calculated financial figures (or noting unavailability)
   - marketIntelligence: 2–3 sentences on target market & demand dynamics
   - competitorInsights: 2–3 sentences on competitive landscape
   - riskAlerts: 3–4 concise high-priority risk bullets
   - growthOpportunities: 3–4 concise growth opportunity bullets
   - strategicRecommendations: EXACTLY 5 practical recommendations ({ title, rationale })
   - overallAssessment: 2–3 sentence concluding synthesis
   - sourceReferences: explicit list of source attributions & dates
   - dataLimitations: explicit list of missing data or informational scope limits.`;

      const { response, modelUsed } = await generateContentWithRetry({
        operationName: 'Executive Briefing Generation',
        contents: prompt,
        config: {
          systemInstruction:
            'You are AUREON AI, an institutional executive briefing engine. Never fabricate financial figures or live market data. Keep content concise and board-ready.',
          thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              executiveOverview: { type: Type.STRING },
              companyProfile: { type: Type.STRING },
              financialNarrative: { type: Type.STRING },
              marketIntelligence: { type: Type.STRING },
              competitorInsights: { type: Type.STRING },
              riskAlerts: { type: Type.ARRAY, items: { type: Type.STRING } },
              growthOpportunities: { type: Type.ARRAY, items: { type: Type.STRING } },
              strategicRecommendations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    rationale: { type: Type.STRING },
                  },
                  required: ['title', 'rationale'],
                },
              },
              overallAssessment: { type: Type.STRING },
              sourceReferences: { type: Type.ARRAY, items: { type: Type.STRING } },
              dataLimitations: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: [
              'executiveOverview',
              'companyProfile',
              'financialNarrative',
              'marketIntelligence',
              'competitorInsights',
              'riskAlerts',
              'growthOpportunities',
              'strategicRecommendations',
              'overallAssessment',
              'sourceReferences',
              'dataLimitations',
            ],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      const reportDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const briefingId = `brf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const briefing: ExecutiveBriefingData = {
        briefingId,
        subject: `AUREON AI Executive Briefing: ${businessInput.companyName}`,
        reportDate,
        companyName: businessInput.companyName,
        industry: businessInput.industry,
        country: businessInput.country || 'Unspecified',
        recordOriginLabel,
        executiveOverview: parsed.executiveOverview || '',
        companyProfile: parsed.companyProfile || '',
        financialHighlights: [
          { label: 'Annual Revenue', value: revDisplay },
          { label: 'Annual Operating Expenses', value: expDisplay },
          { label: 'Operating Profit (Calculated)', value: profitDisplay },
          { label: 'Operating Profit Margin', value: marginDisplay },
          { label: 'Employee Headcount', value: empDisplay },
        ],
        financialNarrative: parsed.financialNarrative || '',
        marketIntelligence: parsed.marketIntelligence || '',
        competitorInsights: parsed.competitorInsights || '',
        riskAlerts: Array.isArray(parsed.riskAlerts) ? parsed.riskAlerts : [],
        growthOpportunities: Array.isArray(parsed.growthOpportunities)
          ? parsed.growthOpportunities
          : [],
        strategicRecommendations: Array.isArray(parsed.strategicRecommendations)
          ? parsed.strategicRecommendations.slice(0, 5)
          : [],
        overallAssessment: parsed.overallAssessment || '',
        sourceReferences: Array.isArray(parsed.sourceReferences)
          ? parsed.sourceReferences
          : [recordOriginLabel],
        dataLimitations: Array.isArray(parsed.dataLimitations)
          ? parsed.dataLimitations
          : ['Informational synthesis only; does not represent verified live market feeds.'],
      };

      const htmlContent = buildExecutiveBriefingHtml(briefing);
      const plainText = buildExecutiveBriefingText(briefing);

      res.json({
        briefing,
        htmlContent,
        plainText,
        model: modelUsed,
      });
    } catch (error) {
      const { status, message } = formatGeminiErrorResponse(error);
      res.status(status).json({ error: message });
    }
  });

  // 8. Executive Briefing — Manual-Only Real Email Delivery via Resend
  app.post('/api/briefing/send', async (req: Request, res: Response) => {
    const {
      briefingId,
      recipientEmail,
      subject,
      htmlContent,
      plainText,
      userConfirmed,
    } = req.body ?? {};

    if (userConfirmed !== true) {
      res.status(400).json({
        ok: false,
        error: 'Explicit user confirmation is required before sending an Executive Briefing.',
      });
      return;
    }

    const email = String(recipientEmail || '').trim().toLowerCase();
    if (!EMAIL_REGEX.test(email)) {
      res.status(400).json({
        ok: false,
        error: 'Please enter a valid recipient email address.',
      });
      return;
    }

    if (!briefingId || !subject || !htmlContent) {
      res.status(400).json({
        ok: false,
        error: 'Generate an Executive Briefing before requesting email delivery.',
      });
      return;
    }

    const dedupeKey = `${String(briefingId)}::${email}`;
    if (sentBriefings.has(dedupeKey)) {
      const prev = sentBriefings.get(dedupeKey)!;
      res.status(409).json({
        ok: false,
        error: `This exact briefing was already delivered to ${email} at ${prev.sentAt} (ID: ${prev.messageId}). Generate a fresh briefing if you wish to send an updated copy.`,
      });
      return;
    }

    if (inFlightBriefings.has(dedupeKey)) {
      res.status(409).json({
        ok: false,
        error: 'Delivery for this briefing is already in progress. Duplicate send prevented.',
      });
      return;
    }

    const { apiKey, hasApiKey, fromEmail, testingMode, permittedTestingRecipient } =
      getResendConfig();

    if (
      testingMode &&
      permittedTestingRecipient &&
      email !== permittedTestingRecipient.toLowerCase()
    ) {
      res.status(403).json({
        ok: false,
        error: `Recipient rejected: AUREON Executive Briefing is in Resend restricted testing mode, which permits manual delivery only to the verified Resend account email (${permittedTestingRecipient}). Sending to "${email}" is not permitted without a verified custom domain.`,
      });
      return;
    }

    if (!hasApiKey) {
      res.status(503).json({
        ok: false,
        error:
          'Email provider is not configured: RESEND_API_KEY is missing from server secrets. Delivery was not simulated.',
      });
      return;
    }

    inFlightBriefings.add(dedupeKey);
    try {
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [email],
          subject: String(subject),
          html: String(htmlContent),
          text: plainText ? String(plainText) : undefined,
        }),
        signal: AbortSignal.timeout(10000),
      });

      const resendPayload = (await resendRes.json().catch(() => ({}))) as {
        id?: string;
        message?: string;
        name?: string;
      };

      if (!resendRes.ok || !resendPayload.id) {
        const providerMsg =
          resendPayload.message ||
          `Resend rejected the email delivery request (HTTP ${resendRes.status}).`;
        const friendlyError =
          testingMode && resendRes.status === 403
            ? `${providerMsg} (Restricted Testing Mode permits delivery only to the verified Resend account email ${permittedTestingRecipient}.)`
            : providerMsg;

        res.status(resendRes.status >= 400 ? resendRes.status : 502).json({
          ok: false,
          error: friendlyError,
        });
        return;
      }

      const sentAt = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
      sentBriefings.set(dedupeKey, { messageId: resendPayload.id, sentAt });

      res.json({
        ok: true,
        messageId: resendPayload.id,
        recipient: email,
        testingMode,
        sentAt,
      });
    } catch (err) {
      res.status(502).json({
        ok: false,
        error:
          err instanceof Error
            ? `Email provider request failed: ${err.message}`
            : 'Unable to reach Resend email service.',
      });
    } finally {
      inFlightBriefings.delete(dedupeKey);
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const httpServer = app.listen(PORT, '0.0.0.0', () => {
    console.log(`AUREON AI server running on http://0.0.0.0:${PORT}`);
  });
  httpServer.requestTimeout = 180000;
}

startServer().catch((err) => {
  console.error('Failed to start AUREON AI server:', err);
  process.exit(1);
});
