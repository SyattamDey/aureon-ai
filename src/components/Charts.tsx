import React, { useState } from 'react';
import {
  CalculatedMetrics,
  IllustrativeScenario,
  MarketOpportunity,
  RecommendationItem,
  RiskCategoryAnalysis,
} from '../types';
import { formatCompactCurrency } from './BrandMark';

// 1. Deterministic Financial Structure Bar Chart (Distinguishes Unavailable from $0)
export const FinancialStructureChart: React.FC<{ metrics: CalculatedMetrics }> = ({ metrics }) => {
  const [hovered, setHovered] = useState<string | null>(null);

  if (metrics.revenue === null || metrics.expenses === null || metrics.operatingProfit === null) {
    return (
      <div className="border border-dashed border-slate-200 rounded-md p-6 text-center space-y-1.5 bg-slate-50/50">
        <div className="text-xs font-semibold text-[#0B1B35]">
          Financial Chart Unavailable — Missing Revenue or Operating Expenses
        </div>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          AUREON AI distinguishes unavailable financial data from zero. Enter Annual Revenue and Annual Operating Expenses to render unit economics.
        </p>
      </div>
    );
  }

  const maxVal = Math.max(metrics.revenue, metrics.expenses, Math.abs(metrics.operatingProfit), 1);

  const bars = [
    {
      key: 'revenue',
      label: 'Annual Revenue',
      value: metrics.revenue,
      pctOfRev: '100.0%',
      color: '#0B1B35',
      note: 'Supplied / retrieved annual revenue',
    },
    {
      key: 'expenses',
      label: 'Operating Expenses',
      value: metrics.expenses,
      pctOfRev:
        metrics.expenseRatioPct !== null ? `${metrics.expenseRatioPct.toFixed(1)}% of rev` : 'N/A',
      color: '#475569',
      note: 'Supplied / retrieved annual operating expenses',
    },
    {
      key: 'net',
      label: metrics.operatingProfit >= 0 ? 'Operating Profit' : 'Operating Loss',
      value: Math.abs(metrics.operatingProfit),
      rawValue: metrics.operatingProfit,
      pctOfRev:
        metrics.operatingMarginPct !== null
          ? `${metrics.operatingMarginPct.toFixed(1)}% margin`
          : 'Margin N/A',
      color: metrics.operatingProfit >= 0 ? '#B88B22' : '#B91C1C',
      note: 'Calculated: Revenue minus Operating Expenses',
    },
  ];

  const chartHeight = 190;
  const chartTop = 20;
  const chartBottom = 210;
  const usableHeight = chartHeight - 10;

  return (
    <div className="space-y-3">
      <div className="w-full overflow-x-auto">
        <svg
          viewBox="0 0 520 250"
          className="w-full h-56 select-none"
          role="img"
          aria-label="Financial structure bar chart"
        >
          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
            const y = chartBottom - t * usableHeight;
            const labelVal = maxVal * t;
            return (
              <g key={t}>
                <line x1="72" y1={y} x2="500" y2={y} stroke="#E2E8F0" strokeWidth="1" />
                <text
                  x="64"
                  y={y + 4}
                  textAnchor="end"
                  className="fill-slate-400 text-[10px] font-mono tabular-nums"
                >
                  {formatCompactCurrency(labelVal)}
                </text>
              </g>
            );
          })}

          {bars.map((bar, idx) => {
            const barWidth = 84;
            const slotCenter = 148 + idx * 140;
            const x = slotCenter - barWidth / 2;
            const h = Math.max((bar.value / maxVal) * usableHeight, 3);
            const y = chartBottom - h;
            const displayVal = bar.rawValue !== undefined ? bar.rawValue : bar.value;
            const isActive = hovered === bar.key;

            return (
              <g
                key={bar.key}
                onMouseEnter={() => setHovered(bar.key)}
                onMouseLeave={() => setHovered(null)}
                className="cursor-pointer"
              >
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={h}
                  rx="4"
                  fill={bar.color}
                  opacity={hovered && !isActive ? 0.65 : 1}
                  className="transition-opacity duration-150"
                />
                <text
                  x={slotCenter}
                  y={Math.max(y - 7, chartTop - 4)}
                  textAnchor="middle"
                  className="fill-[#0B1B35] text-[11px] font-mono font-semibold tabular-nums"
                >
                  {formatCompactCurrency(displayVal)}
                </text>
                <text
                  x={slotCenter}
                  y={chartBottom + 17}
                  textAnchor="middle"
                  className="fill-slate-700 text-[11px] font-medium"
                >
                  {bar.label}
                </text>
                <text
                  x={slotCenter}
                  y={chartBottom + 32}
                  textAnchor="middle"
                  className="fill-slate-400 text-[10px] font-mono tabular-nums"
                >
                  {bar.pctOfRev}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="min-h-[20px] text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2">
        <span>
          {hovered
            ? bars.find((b) => b.key === hovered)?.note
            : 'Hover a bar to inspect provenance · Deterministic calculation'}
        </span>
        <span className="font-mono tabular-nums text-slate-600">
          {metrics.operatingMarginPct !== null
            ? `Operating Margin: ${metrics.operatingMarginPct.toFixed(2)}%`
            : 'Operating Margin: N/A'}
        </span>
      </div>
    </div>
  );
};

// 2. Illustrative Scenario Trajectory Chart
export const ScenarioComparisonChart: React.FC<{
  baseRevenue: number | null;
  baseMarginPct: number | null;
  scenarios: IllustrativeScenario[];
}> = ({ baseRevenue, baseMarginPct, scenarios }) => {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  if (baseRevenue === null || baseRevenue <= 0 || baseMarginPct === null) {
    return (
      <div className="space-y-2.5">
        {scenarios.map((s) => (
          <div key={s.label} className="p-3 rounded-md border border-slate-200 bg-white">
            <div className="flex items-center justify-between text-xs font-semibold text-[#0B1B35]">
              <span>{s.label}</span>
              <span className="font-mono text-slate-500">Conceptual Sensitivity</span>
            </div>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">{s.thesis}</p>
          </div>
        ))}
      </div>
    );
  }

  const items = scenarios.map((s) => {
    const projectedRevenue = baseRevenue * s.revenueMultiplier;
    const projectedMargin = Number((baseMarginPct + s.marginDeltaPctPoints).toFixed(1));
    return { ...s, projectedRevenue, projectedMargin };
  });

  const maxRev = Math.max(...items.map((i) => i.projectedRevenue), baseRevenue, 1);

  return (
    <div className="space-y-3">
      {items.map((item, idx) => {
        const widthPct = Math.min(Math.max((item.projectedRevenue / maxRev) * 100, 8), 100);
        const isPositive = item.projectedMargin >= 0;
        const isHovered = activeIdx === idx;
        return (
          <div
            key={item.label}
            onMouseEnter={() => setActiveIdx(idx)}
            onMouseLeave={() => setActiveIdx(null)}
            className={`p-3 rounded-md border transition-colors duration-150 ${
              isHovered ? 'border-[#C59B27] bg-slate-50/80' : 'border-slate-200 bg-white'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
              <span className="text-xs font-semibold text-[#0B1B35]">{item.label}</span>
              <div className="flex items-center gap-3 text-xs font-mono tabular-nums">
                <span className="text-slate-700">
                  Illustrative Rev: {formatCompactCurrency(item.projectedRevenue)} ({item.revenueMultiplier.toFixed(2)}x)
                </span>
                <span className={isPositive ? 'text-emerald-700 font-medium' : 'text-red-700 font-medium'}>
                  Margin: {item.projectedMargin > 0 ? '+' : ''}
                  {item.projectedMargin}%
                </span>
              </div>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-sm overflow-hidden">
              <div
                className="h-full rounded-sm transition-all duration-300"
                style={{
                  width: `${widthPct}%`,
                  backgroundColor: idx === 0 ? '#64748B' : idx === 1 ? '#1B365D' : '#B88B22',
                }}
              />
            </div>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{item.thesis}</p>
          </div>
        );
      })}
    </div>
  );
};

// 3. Risk Posture 2x2 Matrix (Supports 5 Risk Domains)
export const RiskPostureMatrixChart: React.FC<{ risks: RiskCategoryAnalysis[] }> = ({ risks }) => {
  const [hoveredCat, setHoveredCat] = useState<string | null>(null);

  const severityColor = (sev: RiskCategoryAnalysis['severity']) => {
    switch (sev) {
      case 'High':
        return '#B91C1C';
      case 'Elevated':
        return '#D97706';
      case 'Moderate':
        return '#1B365D';
      case 'Low':
        return '#15803D';
    }
  };

  const plotLeft = 56;
  const plotRight = 396;
  const plotTop = 20;
  const plotBottom = 206;
  const plotW = plotRight - plotLeft;
  const plotH = plotBottom - plotTop;

  const toX = (likelihood: number) => {
    const clamped = Math.min(Math.max(likelihood, 1), 5);
    return plotLeft + ((clamped - 1) / 4) * plotW;
  };
  const toY = (impact: number) => {
    const clamped = Math.min(Math.max(impact, 1), 5);
    return plotBottom - ((clamped - 1) / 4) * plotH;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
      <div className="lg:col-span-7">
        <svg viewBox="0 0 430 245" className="w-full h-56 select-none" role="img" aria-label="Risk exposure matrix">
          <rect
            x={plotLeft + plotW / 2}
            y={plotTop}
            width={plotW / 2}
            height={plotH / 2}
            fill="#FEF2F2"
            opacity="0.7"
          />
          <rect
            x={plotLeft}
            y={plotTop}
            width={plotW / 2}
            height={plotH / 2}
            fill="#FFFBEB"
            opacity="0.45"
          />
          <rect x={plotLeft} y={plotTop + plotH / 2} width={plotW} height={plotH / 2} fill="#F8FAFC" />

          <rect x={plotLeft} y={plotTop} width={plotW} height={plotH} fill="none" stroke="#CBD5E1" strokeWidth="1" />
          <line
            x1={plotLeft + plotW / 2}
            y1={plotTop}
            x2={plotLeft + plotW / 2}
            y2={plotBottom}
            stroke="#CBD5E1"
            strokeDasharray="4 4"
          />
          <line
            x1={plotLeft}
            y1={plotTop + plotH / 2}
            x2={plotRight}
            y2={plotTop + plotH / 2}
            stroke="#CBD5E1"
            strokeDasharray="4 4"
          />

          <text x={plotRight - 6} y={plotTop + 14} textAnchor="end" className="fill-red-800/70 text-[9px] font-medium">
            Critical Priority
          </text>
          <text x={plotLeft + 6} y={plotTop + 14} textAnchor="start" className="fill-amber-800/70 text-[9px] font-medium">
            High Impact / Low Prob.
          </text>
          <text x={plotLeft + 6} y={plotBottom - 6} textAnchor="start" className="fill-slate-400 text-[9px] font-medium">
            Routine Monitoring
          </text>

          {[1, 2, 3, 4, 5].map((n) => (
            <g key={n}>
              <text x={toX(n)} y={plotBottom + 15} textAnchor="middle" className="fill-slate-400 text-[10px] font-mono">
                {n}
              </text>
              <text x={plotLeft - 10} y={toY(n) + 3} textAnchor="end" className="fill-slate-400 text-[10px] font-mono">
                {n}
              </text>
            </g>
          ))}

          <text x={(plotLeft + plotRight) / 2} y={238} textAnchor="middle" className="fill-slate-500 text-[10px] font-medium">
            Likelihood Rating (1–5 AI Assessment)
          </text>
          <text
            x={14}
            y={(plotTop + plotBottom) / 2}
            textAnchor="middle"
            transform={`rotate(-90 14 ${(plotTop + plotBottom) / 2})`}
            className="fill-slate-500 text-[10px] font-medium"
          >
            Impact Severity (1–5)
          </text>

          {risks.map((risk) => {
            const cx = toX(risk.likelihoodScore);
            const cy = toY(risk.impactScore);
            const fill = severityColor(risk.severity);
            const isHovered = hoveredCat === risk.category;
            return (
              <g
                key={risk.category}
                onMouseEnter={() => setHoveredCat(risk.category)}
                onMouseLeave={() => setHoveredCat(null)}
                className="cursor-pointer"
              >
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 10 : 8}
                  fill={fill}
                  stroke="#FFFFFF"
                  strokeWidth="2"
                  className="transition-all duration-150"
                />
                <text x={cx} y={cy - 12} textAnchor="middle" className="fill-[#0B1B35] text-[10px] font-semibold">
                  {risk.category}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="lg:col-span-5 space-y-2">
        {risks.map((risk) => {
          const composite = Number(((risk.likelihoodScore + risk.impactScore) / 2).toFixed(1));
          const barPct = (composite / 5) * 100;
          const color = severityColor(risk.severity);
          const isHovered = hoveredCat === risk.category;
          return (
            <div
              key={risk.category}
              onMouseEnter={() => setHoveredCat(risk.category)}
              onMouseLeave={() => setHoveredCat(null)}
              className={`px-3 py-2 rounded-md border transition-colors ${
                isHovered ? 'border-[#C59B27] bg-slate-50' : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-[#0B1B35]">{risk.category} Risk</span>
                <span className="font-mono tabular-nums font-medium" style={{ color }}>
                  {risk.severity} ({composite}/5)
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-sm overflow-hidden">
                <div className="h-full rounded-sm" style={{ width: `${barPct}%`, backgroundColor: color }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// 4. Market Opportunity Matrix
export const OpportunityMatrixChart: React.FC<{ opportunities: MarketOpportunity[] }> = ({
  opportunities,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const plotLeft = 56;
  const plotRight = 440;
  const plotTop = 20;
  const plotBottom = 200;
  const plotW = plotRight - plotLeft;
  const plotH = plotBottom - plotTop;

  const toX = (complexity: number) =>
    plotLeft + ((Math.min(Math.max(complexity, 1), 5) - 1) / 4) * plotW;
  const toY = (attractiveness: number) =>
    plotBottom - ((Math.min(Math.max(attractiveness, 1), 5) - 1) / 4) * plotH;

  return (
    <div className="space-y-2">
      <svg viewBox="0 0 470 238" className="w-full h-56 select-none" role="img" aria-label="Market opportunity matrix">
        <rect x={plotLeft} y={plotTop} width={plotW / 2} height={plotH / 2} fill="#FEF9EC" />
        <rect x={plotLeft + plotW / 2} y={plotTop} width={plotW / 2} height={plotH / 2} fill="#F8FAFC" />
        <rect x={plotLeft} y={plotTop + plotH / 2} width={plotW} height={plotH / 2} fill="#FFFFFF" />
        <rect x={plotLeft} y={plotTop} width={plotW} height={plotH} fill="none" stroke="#CBD5E1" />
        <line x1={plotLeft + plotW / 2} y1={plotTop} x2={plotLeft + plotW / 2} y2={plotBottom} stroke="#CBD5E1" strokeDasharray="4 4" />
        <line x1={plotLeft} y1={plotTop + plotH / 2} x2={plotRight} y2={plotTop + plotH / 2} stroke="#CBD5E1" strokeDasharray="4 4" />

        <text x={plotLeft + 8} y={plotTop + 14} className="fill-[#9A7214] text-[9px] font-semibold">
          High-Leverage Quick Wins
        </text>
        <text x={plotRight - 8} y={plotTop + 14} textAnchor="end" className="fill-slate-500 text-[9px] font-medium">
          Strategic Initiatives
        </text>

        {[1, 2, 3, 4, 5].map((n) => (
          <g key={n}>
            <text x={toX(n)} y={plotBottom + 14} textAnchor="middle" className="fill-slate-400 text-[10px] font-mono">
              {n}
            </text>
            <text x={plotLeft - 10} y={toY(n) + 3} textAnchor="end" className="fill-slate-400 text-[10px] font-mono">
              {n}
            </text>
          </g>
        ))}

        <text x={(plotLeft + plotRight) / 2} y={232} textAnchor="middle" className="fill-slate-500 text-[10px] font-medium">
          Execution Complexity (1–5)
        </text>
        <text
          x={14}
          y={(plotTop + plotBottom) / 2}
          textAnchor="middle"
          transform={`rotate(-90 14 ${(plotTop + plotBottom) / 2})`}
          className="fill-slate-500 text-[10px] font-medium"
        >
          Strategic Attractiveness (1–5)
        </text>

        {opportunities.map((opp, idx) => {
          const cx = toX(opp.executionComplexity);
          const cy = toY(opp.attractivenessScore);
          const isHovered = hoveredIdx === idx;
          return (
            <g
              key={opp.title}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="cursor-pointer"
            >
              <circle
                cx={cx}
                cy={cy}
                r={isHovered ? 11 : 9}
                fill={idx === 0 ? '#B88B22' : '#0B1B35'}
                stroke="#FFFFFF"
                strokeWidth="2"
              />
              <text x={cx} y={cy + 3.5} textAnchor="middle" className="fill-white text-[10px] font-mono font-semibold">
                {idx + 1}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="space-y-1.5 border-t border-slate-100 pt-2">
        {opportunities.map((opp, idx) => (
          <div
            key={opp.title}
            onMouseEnter={() => setHoveredIdx(idx)}
            onMouseLeave={() => setHoveredIdx(null)}
            className={`flex items-baseline justify-between gap-3 text-xs px-2 py-1 rounded ${
              hoveredIdx === idx ? 'bg-slate-50 text-[#0B1B35]' : 'text-slate-600'
            }`}
          >
            <span className="truncate font-medium">
              <span className="font-mono text-[#9A7214] mr-1.5">0{idx + 1}.</span>
              {opp.title}
            </span>
            <span className="font-mono tabular-nums text-slate-500 shrink-0">
              Attr {opp.attractivenessScore.toFixed(1)} · Cmplx {opp.executionComplexity.toFixed(1)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// 5. Capital & Focus Allocation Segmented Bar (Supports 6 Strategic Pillars)
export const CapitalAllocationChart: React.FC<{ recommendations: RecommendationItem[] }> = ({
  recommendations,
}) => {
  const colors = ['#0B1B35', '#B88B22', '#2E5082', '#64748B', '#8C6D1F', '#334155'];
  const total = recommendations.reduce((acc, r) => acc + (r.capitalAllocationSharePct || 0), 0) || 100;

  return (
    <div className="space-y-3">
      <div className="w-full h-4 rounded-sm overflow-hidden flex bg-slate-100">
        {recommendations.map((rec, idx) => {
          const pct = (rec.capitalAllocationSharePct / total) * 100;
          return (
            <div
              key={rec.id}
              style={{ width: `${pct}%`, backgroundColor: colors[idx % colors.length] }}
              title={`${rec.title}: ${rec.capitalAllocationSharePct}%`}
              className="h-full border-r border-white last:border-r-0 transition-all duration-300"
            />
          );
        })}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {recommendations.map((rec, idx) => (
          <div key={rec.id} className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-xs shrink-0"
                style={{ backgroundColor: colors[idx % colors.length] }}
                aria-hidden="true"
              />
              <span className="text-slate-700 truncate">{rec.title}</span>
            </div>
            <span className="font-mono tabular-nums font-semibold text-[#0B1B35] shrink-0">
              {rec.capitalAllocationSharePct}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
