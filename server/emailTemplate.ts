import type { ExecutiveBriefingData } from '../src/types.ts';

function escapeHtml(input: string): string {
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildExecutiveBriefingHtml(briefing: ExecutiveBriefingData): string {
  const riskItemsHtml = briefing.riskAlerts
    .map(
      (r) =>
        `<li style="margin:0 0 8px 0;color:#334155;font-size:14px;line-height:1.55;">${escapeHtml(
          r
        )}</li>`
    )
    .join('');

  const growthItemsHtml = briefing.growthOpportunities
    .map(
      (g) =>
        `<li style="margin:0 0 8px 0;color:#334155;font-size:14px;line-height:1.55;">${escapeHtml(
          g
        )}</li>`
    )
    .join('');

  const recsHtml = briefing.strategicRecommendations
    .map(
      (rec, idx) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #E2E8F0;vertical-align:top;width:36px;font-family:'Courier New',monospace;font-weight:700;font-size:13px;color:#9A7214;">
          0${idx + 1}
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #E2E8F0;vertical-align:top;">
          <div style="font-size:14px;font-weight:700;color:#0B1B35;margin-bottom:3px;">${escapeHtml(
            rec.title
          )}</div>
          <div style="font-size:13px;color:#475569;line-height:1.5;">${escapeHtml(
            rec.rationale
          )}</div>
        </td>
      </tr>`
    )
    .join('');

  const financialRowsHtml = briefing.financialHighlights
    .map(
      (item) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #E2E8F0;font-size:13px;color:#475569;width:42%;">${escapeHtml(
          item.label
        )}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #E2E8F0;font-size:13px;font-weight:700;color:#0B1B35;font-family:'Courier New',monospace;text-align:right;">${escapeHtml(
          item.value
        )}</td>
      </tr>`
    )
    .join('');

  const sourcesHtml = briefing.sourceReferences
    .map(
      (s) =>
        `<li style="margin:0 0 4px 0;font-size:12px;color:#475569;line-height:1.45;">${escapeHtml(
          s
        )}</li>`
    )
    .join('');

  const limitationsHtml = briefing.dataLimitations
    .map(
      (l) =>
        `<li style="margin:0 0 4px 0;font-size:12px;color:#475569;line-height:1.45;">${escapeHtml(
          l
        )}</li>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(briefing.subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#F4F6FA;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;color:#0B1B35;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F4F6FA;padding:28px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="680" cellpadding="0" cellspacing="0" style="max-width:680px;width:100%;background-color:#FFFFFF;border:1px solid #CBD5E1;border-radius:6px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background-color:#0B1B35;padding:26px 32px;border-bottom:3px solid #C59B27;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="font-size:20px;font-weight:700;letter-spacing:0.6px;color:#FFFFFF;">AUREON AI</div>
                    <div style="font-size:12px;color:#D1A942;margin-top:4px;">Global Intelligence for Business &amp; Capital</div>
                  </td>
                  <td align="right" style="vertical-align:top;">
                    <div style="font-size:11px;color:#CBD5E1;">EXECUTIVE BRIEFING</div>
                    <div style="font-size:12px;color:#FFFFFF;margin-top:3px;font-family:'Courier New',monospace;">${escapeHtml(
                      briefing.reportDate
                    )}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Title Band -->
          <tr>
            <td style="padding:24px 32px 18px 32px;border-bottom:1px solid #E2E8F0;background-color:#F8FAFC;">
              <div style="font-size:11px;font-weight:700;color:#9A7214;letter-spacing:0.4px;">COMPANY INTELLIGENCE BRIEFING</div>
              <h1 style="margin:6px 0 6px 0;font-size:22px;line-height:1.3;color:#0B1B35;">${escapeHtml(
                briefing.companyName
              )}</h1>
              <div style="font-size:12px;color:#475569;">${escapeHtml(
                briefing.industry
              )} &middot; ${escapeHtml(briefing.country)} &middot; ${escapeHtml(
    briefing.recordOriginLabel
  )}</div>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding:26px 32px;">
              <!-- 1. Executive Overview -->
              <h2 style="margin:0 0 8px 0;font-size:15px;color:#0B1B35;border-bottom:1px solid #E2E8F0;padding-bottom:6px;">1. Executive Overview</h2>
              <p style="margin:0 0 20px 0;font-size:14px;line-height:1.6;color:#334155;">${escapeHtml(
                briefing.executiveOverview
              )}</p>

              <!-- 2. Company Profile -->
              <h2 style="margin:0 0 8px 0;font-size:15px;color:#0B1B35;border-bottom:1px solid #E2E8F0;padding-bottom:6px;">2. Company Profile</h2>
              <p style="margin:0 0 20px 0;font-size:14px;line-height:1.6;color:#334155;">${escapeHtml(
                briefing.companyProfile
              )}</p>

              <!-- 3. Financial Highlights -->
              <h2 style="margin:0 0 10px 0;font-size:15px;color:#0B1B35;border-bottom:1px solid #E2E8F0;padding-bottom:6px;">3. Financial Highlights (Supplied / Retrieved Basis)</h2>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E2E8F0;border-radius:4px;margin-bottom:10px;">
                ${financialRowsHtml}
              </table>
              <p style="margin:0 0 20px 0;font-size:13px;line-height:1.55;color:#475569;">${escapeHtml(
                briefing.financialNarrative
              )}</p>

              <!-- 4. Market Intelligence -->
              <h2 style="margin:0 0 8px 0;font-size:15px;color:#0B1B35;border-bottom:1px solid #E2E8F0;padding-bottom:6px;">4. Market Intelligence</h2>
              <p style="margin:0 0 20px 0;font-size:14px;line-height:1.6;color:#334155;">${escapeHtml(
                briefing.marketIntelligence
              )}</p>

              <!-- 5. Competitor Insights -->
              <h2 style="margin:0 0 8px 0;font-size:15px;color:#0B1B35;border-bottom:1px solid #E2E8F0;padding-bottom:6px;">5. Competitor Insights</h2>
              <p style="margin:0 0 20px 0;font-size:14px;line-height:1.6;color:#334155;">${escapeHtml(
                briefing.competitorInsights
              )}</p>

              <!-- 6. Important Risk Alerts -->
              <h2 style="margin:0 0 8px 0;font-size:15px;color:#0B1B35;border-bottom:1px solid #E2E8F0;padding-bottom:6px;">6. Important Risk Alerts</h2>
              <ul style="margin:0 0 20px 0;padding-left:20px;">${riskItemsHtml}</ul>

              <!-- 7. Growth Opportunities -->
              <h2 style="margin:0 0 8px 0;font-size:15px;color:#0B1B35;border-bottom:1px solid #E2E8F0;padding-bottom:6px;">7. Growth Opportunities</h2>
              <ul style="margin:0 0 20px 0;padding-left:20px;">${growthItemsHtml}</ul>

              <!-- 8. Five Strategic Recommendations -->
              <h2 style="margin:0 0 10px 0;font-size:15px;color:#0B1B35;border-bottom:1px solid #E2E8F0;padding-bottom:6px;">8. Five Strategic Recommendations</h2>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E2E8F0;border-radius:4px;margin-bottom:20px;">
                ${recsHtml}
              </table>

              <!-- 9. Overall Assessment -->
              <h2 style="margin:0 0 8px 0;font-size:15px;color:#0B1B35;border-bottom:1px solid #E2E8F0;padding-bottom:6px;">9. Overall Assessment</h2>
              <p style="margin:0 0 22px 0;font-size:14px;line-height:1.6;color:#334155;">${escapeHtml(
                briefing.overallAssessment
              )}</p>

              <!-- Source References & Data Limitations -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:4px;">
                <tr>
                  <td style="padding:16px 18px;">
                    <div style="font-size:12px;font-weight:700;color:#0B1B35;margin-bottom:6px;">Source References</div>
                    <ul style="margin:0 0 12px 0;padding-left:18px;">${sourcesHtml}</ul>
                    <div style="font-size:12px;font-weight:700;color:#0B1B35;margin-bottom:6px;">Data Limitations &amp; Integrity Notice</div>
                    <ul style="margin:0;padding-left:18px;">${limitationsHtml}</ul>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer Disclaimer -->
          <tr>
            <td style="background-color:#0B1B35;padding:18px 32px;color:#CBD5E1;font-size:11px;line-height:1.55;">
              <div style="color:#D1A942;font-weight:700;margin-bottom:4px;">AUREON AI &middot; Educational &amp; Informational Disclaimer</div>
              This Executive Briefing was manually requested by the user and combines supplied or retrieved company records with AI-generated strategic interpretation. It does not constitute verified live market data, audited financial statements, or investment advice.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildExecutiveBriefingText(briefing: ExecutiveBriefingData): string {
  return [
    `AUREON AI — EXECUTIVE BRIEFING`,
    `Global Intelligence for Business & Capital`,
    `Report Date: ${briefing.reportDate}`,
    `Company: ${briefing.companyName} (${briefing.industry} · ${briefing.country})`,
    `Origin: ${briefing.recordOriginLabel}`,
    '',
    '1. EXECUTIVE OVERVIEW',
    briefing.executiveOverview,
    '',
    '2. COMPANY PROFILE',
    briefing.companyProfile,
    '',
    '3. FINANCIAL HIGHLIGHTS',
    ...briefing.financialHighlights.map((f) => `- ${f.label}: ${f.value}`),
    briefing.financialNarrative,
    '',
    '4. MARKET INTELLIGENCE',
    briefing.marketIntelligence,
    '',
    '5. COMPETITOR INSIGHTS',
    briefing.competitorInsights,
    '',
    '6. IMPORTANT RISK ALERTS',
    ...briefing.riskAlerts.map((r) => `- ${r}`),
    '',
    '7. GROWTH OPPORTUNITIES',
    ...briefing.growthOpportunities.map((g) => `- ${g}`),
    '',
    '8. FIVE STRATEGIC RECOMMENDATIONS',
    ...briefing.strategicRecommendations.map((r, i) => `${i + 1}. ${r.title}: ${r.rationale}`),
    '',
    '9. OVERALL ASSESSMENT',
    briefing.overallAssessment,
    '',
    'SOURCE REFERENCES',
    ...briefing.sourceReferences.map((s) => `- ${s}`),
    '',
    'DATA LIMITATIONS',
    ...briefing.dataLimitations.map((d) => `- ${d}`),
    '',
    '---',
    'Disclaimer: Generated upon manual user request for educational and informational purposes only. Does not constitute verified live financial market data or investment advice.',
  ].join('\n');
}
