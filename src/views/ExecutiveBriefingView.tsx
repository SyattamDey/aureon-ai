import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  Edit3,
  Eye,
  FileText,
  Loader2,
  Mail,
  Send,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import {
  BusinessInput,
  EmailProviderStatus,
  EmailSendResult,
  GeneratedBriefingResponse,
  MarketInput,
  RiskAssessmentResult,
} from '../types';
import { computeCalculatedMetrics } from '../data/sampleProfiles';
import { formatCurrency } from '../components/BrandMark';
import {
  AiProcessingBanner,
  ErrorAlert,
  VerifiedVsAiHeader,
} from '../components/ProvenanceBanner';

interface ExecutiveBriefingViewProps {
  businessInput: BusinessInput;
  marketInput: MarketInput;
  riskAssessment: RiskAssessmentResult;
}

const STORAGE_EMAIL_KEY = 'aureon_briefing_recipient_v1';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DEFAULT_PERMITTED_TESTING_EMAIL = 'adyajha972@gmail.com';

export const ExecutiveBriefingView: React.FC<ExecutiveBriefingViewProps> = ({
  businessInput,
  marketInput,
  riskAssessment,
}) => {
  // Email Settings State
  const [savedEmail, setSavedEmail] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_EMAIL_KEY) || DEFAULT_PERMITTED_TESTING_EMAIL;
    } catch {
      return DEFAULT_PERMITTED_TESTING_EMAIL;
    }
  });
  const [emailInput, setEmailInput] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_EMAIL_KEY) || DEFAULT_PERMITTED_TESTING_EMAIL;
    } catch {
      return DEFAULT_PERMITTED_TESTING_EMAIL;
    }
  });
  const [isEditingEmail, setIsEditingEmail] = useState<boolean>(false);
  const [emailValidationError, setEmailValidationError] = useState<string | null>(null);
  const [emailSavedNotice, setEmailSavedNotice] = useState(false);

  // Provider Status
  const [providerStatus, setProviderStatus] = useState<EmailProviderStatus | null>(null);

  // Briefing Generation & Preview
  const [generated, setGenerated] = useState<GeneratedBriefingResponse | null>(null);
  const [previewMode, setPreviewMode] = useState<'html' | 'structured'>('html');
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [copiedBriefing, setCopiedBriefing] = useState(false);

  // Manual Send & Explicit Confirmation
  const [showConfirmPanel, setShowConfirmPanel] = useState(false);
  const [userApprovedSend, setUserApprovedSend] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<EmailSendResult | null>(null);

  const metrics = computeCalculatedMetrics(
    businessInput.revenue,
    businessInput.expenses,
    businessInput.employeeCount
  );

  useEffect(() => {
    fetch('/api/briefing/email-status')
      .then((r) => r.json())
      .then((data: EmailProviderStatus) => setProviderStatus(data))
      .catch(() => {});
  }, []);

  const getRecipientRejectionMessage = (candidateEmail: string): string | null => {
    const cleaned = candidateEmail.trim().toLowerCase();
    if (!EMAIL_REGEX.test(cleaned)) {
      return 'Please enter a valid email address (for example, adyajha972@gmail.com).';
    }
    const permitted = providerStatus?.testingMode
      ? providerStatus.permittedTestingRecipient || DEFAULT_PERMITTED_TESTING_EMAIL
      : null;
    if (permitted && cleaned !== permitted.toLowerCase()) {
      return `Recipient rejected: Resend restricted testing mode permits manual sending only to the verified Resend account email (${permitted}). All other recipient addresses are rejected without a verified custom domain.`;
    }
    return null;
  };

  const handleSaveEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = emailInput.trim().toLowerCase();
    const rejection = getRecipientRejectionMessage(cleaned);
    if (rejection) {
      setEmailValidationError(rejection);
      return;
    }
    setEmailValidationError(null);
    setSavedEmail(cleaned);
    setEmailInput(cleaned);
    setIsEditingEmail(false);
    setEmailSavedNotice(true);
    setSendResult(null);
    try {
      localStorage.setItem(STORAGE_EMAIL_KEY, cleaned);
    } catch {
      // ignore storage write error
    }
    setTimeout(() => setEmailSavedNotice(false), 2500);
  };

  const handleGenerateBriefing = async () => {
    if (!businessInput.companyName.trim() || !businessInput.industry.trim()) {
      setGenerateError(
        'Please ensure Company Name and Industry are populated in Business Intelligence or Company Explorer first.'
      );
      return;
    }

    setGenerateError(null);
    setGenerating(true);
    setShowConfirmPanel(false);
    setUserApprovedSend(false);
    setSendResult(null);

    try {
      const res = await fetch('/api/briefing/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessInput,
          marketInput,
          riskSummary: riskAssessment.overallPostureSummary,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data.error || 'AI service temporarily unavailable. Please try again shortly.'
        );
      }
      setGenerated(data as GeneratedBriefingResponse);
    } catch (err) {
      setGenerateError(
        err instanceof Error && err.message !== 'Failed to fetch'
          ? err.message
          : 'AI service temporarily unavailable. Please try again shortly.'
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyBriefing = async () => {
    if (!generated) return;
    try {
      await navigator.clipboard.writeText(generated.plainText);
      setCopiedBriefing(true);
      setTimeout(() => setCopiedBriefing(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleOpenSendConfirmation = () => {
    setSendResult(null);
    const activeRecipient = (isEditingEmail ? emailInput : savedEmail).trim().toLowerCase();
    const rejection = getRecipientRejectionMessage(activeRecipient);
    if (rejection) {
      setEmailValidationError(rejection);
      setIsEditingEmail(true);
      setSendResult({
        ok: false,
        error: rejection,
      });
      return;
    }
    if (!savedEmail || isEditingEmail || savedEmail.toLowerCase() !== activeRecipient) {
      setSavedEmail(activeRecipient);
      setIsEditingEmail(false);
      try {
        localStorage.setItem(STORAGE_EMAIL_KEY, activeRecipient);
      } catch {
        // ignore
      }
    }
    setEmailValidationError(null);
    setUserApprovedSend(false);
    setShowConfirmPanel(true);
  };

  const handleConfirmAndSend = async () => {
    if (!generated || !userApprovedSend || sending) return;

    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch('/api/briefing/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          briefingId: generated.briefing.briefingId,
          recipientEmail: savedEmail,
          subject: generated.briefing.subject,
          htmlContent: generated.htmlContent,
          plainText: generated.plainText,
          userConfirmed: true,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as EmailSendResult;
      if (!res.ok || !data.ok) {
        setSendResult({
          ok: false,
          error: data.error || `Email delivery failed (HTTP ${res.status}).`,
        });
        return;
      }
      setSendResult(data);
      setShowConfirmPanel(false);
      setUserApprovedSend(false);
    } catch (err) {
      setSendResult({
        ok: false,
        error: err instanceof Error ? err.message : 'Network error sending Executive Briefing.',
      });
    } finally {
      setSending(false);
    }
  };

  const alreadySentThisBriefing = Boolean(sendResult?.ok);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#0B1B35]">AUREON Executive Briefing</h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Generate concise 1–2 page executive intelligence reports with Gemini AI and send manually upon explicit approval.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {generated && (
            <button
              type="button"
              onClick={handleCopyBriefing}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-slate-300 bg-white hover:border-[#C59B27] text-xs font-semibold text-[#0B1B35] cursor-pointer whitespace-nowrap"
            >
              {copiedBriefing ? (
                <Check className="w-3.5 h-3.5 text-emerald-700" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copiedBriefing ? 'Copied Briefing' : 'Copy Briefing'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleGenerateBriefing}
            disabled={generating}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#0B1B35] hover:bg-[#12284C] disabled:opacity-60 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
          >
            {generating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#D1A942]" />
                <span>Generating Briefing...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-[#D1A942]" />
                <span>{generated ? 'Regenerate Briefing' : 'Generate Executive Briefing'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {generateError && (
        <ErrorAlert message={generateError} onDismiss={() => setGenerateError(null)} />
      )}

      {/* Restricted Resend Testing Mode Warning Banner */}
      {providerStatus?.testingMode && (
        <div
          role="note"
          className="rounded-lg border border-amber-300 bg-amber-50 p-4 flex items-start gap-3 text-xs text-amber-950"
        >
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-amber-950">
              Resend Restricted Testing Mode — Verified Recipient Only
            </div>
            <p className="leading-relaxed">
              No custom domain verification is required in testing mode. Manual delivery is permitted
              exclusively to the verified Resend account email{' '}
              <span className="font-mono font-semibold">
                {providerStatus.permittedTestingRecipient || DEFAULT_PERMITTED_TESTING_EMAIL}
              </span>
              . All other recipient addresses are rejected.
            </p>
          </div>
        </div>
      )}

      {/* Email Settings & Provider Configuration */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <section className="xl:col-span-5 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <VerifiedVsAiHeader
            kind="verified"
            title="Email Settings & Manual Delivery Policy"
            subtitle="Manual Send Only"
          />

          {isEditingEmail ? (
            <form onSubmit={handleSaveEmail} className="space-y-3">
              <div>
                <label
                  htmlFor="briefing-recipient-email"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Recipient Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="briefing-recipient-email"
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => {
                      setEmailInput(e.target.value);
                      if (emailValidationError) setEmailValidationError(null);
                    }}
                    placeholder="executive@company.com"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#0B1B35]"
                  />
                </div>
                {emailValidationError && (
                  <p className="text-xs text-red-700 mt-1 leading-relaxed">{emailValidationError}</p>
                )}
                {providerStatus?.testingMode && (
                  <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-amber-800">
                    <span>
                      Permitted testing recipient:{' '}
                      <strong className="font-mono">
                        {providerStatus.permittedTestingRecipient || DEFAULT_PERMITTED_TESTING_EMAIL}
                      </strong>
                    </span>
                    {emailInput.trim().toLowerCase() !==
                      (
                        providerStatus.permittedTestingRecipient || DEFAULT_PERMITTED_TESTING_EMAIL
                      ).toLowerCase() && (
                      <button
                        type="button"
                        onClick={() => {
                          const permitted =
                            providerStatus.permittedTestingRecipient ||
                            DEFAULT_PERMITTED_TESTING_EMAIL;
                          setEmailInput(permitted);
                          setEmailValidationError(null);
                        }}
                        className="text-[#0B1B35] font-semibold underline cursor-pointer"
                      >
                        Use {providerStatus.permittedTestingRecipient || DEFAULT_PERMITTED_TESTING_EMAIL}
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#0B1B35] hover:bg-[#12284C] text-white text-xs font-semibold cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5 text-[#D1A942]" />
                  <span>Save Email Preference</span>
                </button>
                {savedEmail && (
                  <button
                    type="button"
                    onClick={() => {
                      setEmailInput(savedEmail);
                      setIsEditingEmail(false);
                      setEmailValidationError(null);
                    }}
                    className="px-3 py-2 rounded-md border border-slate-300 text-xs font-medium text-slate-600 hover:text-[#0B1B35] cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-md p-3.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] text-slate-500">Saved Recipient Email</div>
                <div className="text-sm font-semibold text-[#0B1B35] truncate mt-0.5">
                  {savedEmail}
                </div>
                {emailSavedNotice && (
                  <div className="text-[11px] text-emerald-700 font-medium mt-0.5">
                    Email preference saved locally.
                  </div>
                )}
                {providerStatus?.testingMode &&
                  savedEmail.trim().toLowerCase() !==
                    (
                      providerStatus.permittedTestingRecipient || DEFAULT_PERMITTED_TESTING_EMAIL
                    ).toLowerCase() && (
                    <div className="text-[11px] text-red-700 font-medium mt-1">
                      Not permitted in testing mode. Only{' '}
                      {providerStatus.permittedTestingRecipient || DEFAULT_PERMITTED_TESTING_EMAIL}{' '}
                      is allowed.
                    </div>
                  )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setEmailInput(savedEmail);
                  setIsEditingEmail(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 bg-white hover:border-[#C59B27] text-xs font-semibold text-[#0B1B35] shrink-0 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Email</span>
              </button>
            </div>
          )}

          {/* Policy Guarantees */}
          <div className="border-t border-slate-100 pt-3 space-y-1.5 text-xs text-slate-600">
            <div className="flex items-center gap-2 font-semibold text-[#0B1B35]">
              <ShieldCheck className="w-4 h-4 text-[#9A7214]" />
              <span>Delivery Safeguards</span>
            </div>
            <ul className="list-disc pl-5 space-y-1 text-xs text-slate-600">
              <li>Manual delivery only — no automated daily or weekly scheduling.</li>
              <li>Explicit review &amp; approval required before every transmission.</li>
              <li>Duplicate-send lock prevents accidental double delivery.</li>
            </ul>
          </div>

          {/* Server Email Provider Status */}
          {providerStatus && (
            <div
              className={`border rounded-md p-3.5 text-xs space-y-1.5 ${
                providerStatus.configured && providerStatus.senderConfigured
                  ? providerStatus.testingMode
                    ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                    : 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                  : 'bg-amber-50/70 border-amber-200 text-amber-950'
              }`}
            >
              <div className="flex items-center justify-between gap-2 font-semibold">
                <span>
                  Email Provider: {providerStatus.provider}
                  {providerStatus.testingMode ? ' (Restricted Testing Mode)' : ''}
                </span>
                <span>
                  {providerStatus.configured && providerStatus.senderConfigured
                    ? providerStatus.testingMode
                      ? 'Testing Ready'
                      : 'Ready'
                    : 'API Key Required'}
                </span>
              </div>
              {providerStatus.permittedTestingRecipient && (
                <div className="text-[11px] font-mono opacity-90">
                  Permitted Recipient: {providerStatus.permittedTestingRecipient}
                </div>
              )}
              <p className="leading-relaxed opacity-90">{providerStatus.configurationNote}</p>
            </div>
          )}

          {/* Active Company Source Context */}
          <div className="border-t border-slate-100 pt-3 text-xs space-y-1.5">
            <div className="font-semibold text-[#0B1B35]">Active Briefing Subject</div>
            <div className="text-slate-700 font-medium">{businessInput.companyName || 'Company Unspecified'}</div>
            <div className="text-slate-500 flex flex-wrap gap-2 font-mono tabular-nums">
              <span>Rev: {metrics.revenue !== null ? formatCurrency(metrics.revenue) : 'Unavailable'}</span>
              <span>·</span>
              <span>
                Op Profit:{' '}
                {metrics.operatingProfit !== null ? formatCurrency(metrics.operatingProfit) : 'Unavailable'}
              </span>
            </div>
            <div className="text-[11px] text-slate-500">
              Origin: {businessInput.sourceAttribution || 'Manual User Entry'}
            </div>
          </div>
        </section>

        {/* Right Column: Briefing Preview + Explicit Send Flow */}
        <div className="xl:col-span-7 space-y-4">
          {/* Genuine Send Success / Error Notification */}
          {sendResult && (
            <div
              role={sendResult.ok ? 'status' : 'alert'}
              className={`rounded-lg border p-4 flex items-start gap-3 text-xs ${
                sendResult.ok
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                  : 'bg-red-50 border-red-200 text-red-900'
              }`}
            >
              {sendResult.ok ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <div className="font-semibold">
                  {sendResult.ok
                    ? `Executive Briefing Delivered to ${sendResult.recipient}`
                    : 'Email Delivery Failed'}
                </div>
                <p className="leading-relaxed">
                  {sendResult.ok
                    ? `Dispatched via Resend at ${sendResult.sentAt} (Provider Message ID: ${sendResult.messageId}).`
                    : sendResult.error}
                </p>
              </div>
            </div>
          )}

          {/* Explicit Confirmation Review Step */}
          {showConfirmPanel && generated && (
            <section className="bg-white border-2 border-[#C59B27] rounded-lg p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-200">
                <div>
                  <h2 className="text-sm font-bold text-[#0B1B35]">
                    Confirm Manual Executive Briefing Delivery
                  </h2>
                  <p className="text-xs text-slate-500">
                    Review the recipient and complete email preview below before confirming dispatch.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowConfirmPanel(false)}
                  className="text-xs text-slate-500 hover:text-[#0B1B35] underline self-start cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-md p-3.5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <div className="text-slate-500">Sender Policy</div>
                  <div className="font-semibold text-[#0B1B35] mt-0.5">
                    {providerStatus?.testingMode
                      ? 'Server-Managed Testing Mode'
                      : 'Server-Configured Verified Domain'}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">Permitted Recipient</div>
                  <div className="font-semibold text-[#0B1B35] mt-0.5 flex items-center gap-2">
                    <span className="truncate">{savedEmail}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setShowConfirmPanel(false);
                        setEmailInput(savedEmail);
                        setIsEditingEmail(true);
                      }}
                      className="text-[#9A7214] underline font-medium cursor-pointer shrink-0"
                    >
                      Edit
                    </button>
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">Email Subject</div>
                  <div className="font-semibold text-[#0B1B35] mt-0.5 truncate">
                    {generated.briefing.subject}
                  </div>
                </div>
              </div>

              {providerStatus?.testingMode && (
                <div className="rounded-md border border-amber-200 bg-amber-50/80 px-3 py-2 text-[11px] text-amber-950 leading-relaxed">
                  <strong>Restricted Testing Mode:</strong> Manual delivery is permitted solely to{' '}
                  <span className="font-mono font-semibold">
                    {providerStatus.permittedTestingRecipient || DEFAULT_PERMITTED_TESTING_EMAIL}
                  </span>
                  . Delivery will only succeed after Resend confirms acceptance.
                </div>
              )}

              <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={userApprovedSend}
                  onChange={(e) => setUserApprovedSend(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#0B1B35] focus:ring-[#0B1B35]"
                />
                <span className="leading-relaxed">
                  I have reviewed the recipient address (<strong className="text-[#0B1B35]">{savedEmail}</strong>) and the complete Executive Briefing preview below, and I authorize a one-time manual email delivery.
                </span>
              </label>

              <div className="flex flex-wrap items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleConfirmAndSend}
                  disabled={!userApprovedSend || sending}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-[#0B1B35] hover:bg-[#12284C] disabled:opacity-50 text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  {sending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#D1A942]" />
                      <span>Sending via Server Provider...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5 text-[#D1A942]" />
                      <span>Confirm &amp; Send Briefing</span>
                    </>
                  )}
                </button>
              </div>
            </section>
          )}

          {/* Briefing Preview Workspace */}
          <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#1B365D]" />
                <h2 className="text-sm font-semibold text-[#0B1B35]">
                  Executive Briefing Preview
                </h2>
              </div>

              {generated && (
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="inline-flex items-center gap-1 p-0.5 bg-slate-100 rounded-md border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setPreviewMode('html')}
                      className={`px-2.5 py-1 text-xs font-medium rounded cursor-pointer ${
                        previewMode === 'html'
                          ? 'bg-white text-[#0B1B35] shadow-xs font-semibold'
                          : 'text-slate-600'
                      }`}
                    >
                      HTML Email Preview
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewMode('structured')}
                      className={`px-2.5 py-1 text-xs font-medium rounded cursor-pointer ${
                        previewMode === 'structured'
                          ? 'bg-white text-[#0B1B35] shadow-xs font-semibold'
                          : 'text-slate-600'
                      }`}
                    >
                      Structured Text
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleOpenSendConfirmation}
                    disabled={sending || alreadySentThisBriefing}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#B88B22] hover:bg-[#9A7214] disabled:opacity-50 text-white text-xs font-bold tracking-wide transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>
                      {alreadySentThisBriefing ? 'BRIEFING SENT' : 'SEND EXECUTIVE BRIEFING'}
                    </span>
                  </button>
                </div>
              )}
            </div>

            {generating ? (
              <div className="p-6 sm:p-8 space-y-4">
                <AiProcessingBanner detail="Drafting your 1–2 page Executive Briefing with automatic retry protection." />
                <div className="space-y-4 animate-pulse pt-2">
                  <div className="h-6 bg-slate-200 rounded w-1/2" />
                  <div className="h-3 bg-slate-100 rounded w-full" />
                  <div className="h-3 bg-slate-100 rounded w-5/6" />
                  <div className="h-64 bg-slate-100 rounded" />
                </div>
              </div>
            ) : !generated ? (
              <div className="p-10 text-center space-y-3">
                <FileText className="w-9 h-9 text-slate-300 mx-auto" />
                <div className="text-sm font-semibold text-[#0B1B35]">
                  Ready to Draft Your Executive Briefing
                </div>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  Click &ldquo;Generate Executive Briefing&rdquo; to synthesize the active company profile, calculated financial highlights, market intelligence, risk alerts, and five strategic recommendations into a reviewable HTML email briefing.
                </p>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleGenerateBriefing}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#0B1B35] hover:bg-[#12284C] text-white text-xs font-semibold cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#D1A942]" />
                    <span>Generate Executive Briefing</span>
                  </button>
                </div>
              </div>
            ) : previewMode === 'html' ? (
              <div className="bg-[#F4F6FA] p-3 sm:p-5">
                <iframe
                  title="Executive Briefing Email Preview"
                  srcDoc={generated.htmlContent}
                  sandbox="allow-same-origin"
                  className="w-full h-[760px] bg-white border border-slate-200 rounded-md"
                />
              </div>
            ) : (
              <div className="p-6 space-y-5 text-sm text-slate-700">
                <div className="border-b border-slate-200 pb-3">
                  <div className="text-xs text-[#9A7214] font-semibold">
                    {generated.briefing.subject}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {generated.briefing.reportDate} · Model: {generated.model} · Origin: {generated.briefing.recordOriginLabel}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-[#0B1B35] mb-1">1. Executive Overview</h3>
                  <p className="leading-relaxed">{generated.briefing.executiveOverview}</p>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-[#0B1B35] mb-1">2. Company Profile</h3>
                  <p className="leading-relaxed">{generated.briefing.companyProfile}</p>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-[#0B1B35] mb-2">3. Financial Highlights</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-2">
                    {generated.briefing.financialHighlights.map((fh) => (
                      <div key={fh.label} className="border border-slate-200 rounded p-2.5 text-xs">
                        <div className="text-slate-500 text-[11px]">{fh.label}</div>
                        <div className="font-mono font-semibold text-[#0B1B35] mt-0.5">{fh.value}</div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {generated.briefing.financialNarrative}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-xs font-bold text-[#0B1B35] mb-1">4. Market Intelligence</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {generated.briefing.marketIntelligence}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-[#0B1B35] mb-1">5. Competitor Insights</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {generated.briefing.competitorInsights}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-xs font-bold text-[#0B1B35] mb-1">6. Important Risk Alerts</h3>
                    <ul className="list-disc pl-4 space-y-1 text-xs text-slate-600">
                      {generated.briefing.riskAlerts.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-[#0B1B35] mb-1">7. Growth Opportunities</h3>
                    <ul className="list-disc pl-4 space-y-1 text-xs text-slate-600">
                      {generated.briefing.growthOpportunities.map((g, i) => (
                        <li key={i}>{g}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-[#0B1B35] mb-2">
                    8. Five Strategic Recommendations
                  </h3>
                  <ol className="space-y-2 text-xs">
                    {generated.briefing.strategicRecommendations.map((rec, idx) => (
                      <li key={idx} className="border border-slate-200 rounded p-2.5">
                        <span className="font-mono font-bold text-[#9A7214] mr-2">
                          0{idx + 1}.
                        </span>
                        <span className="font-semibold text-[#0B1B35]">{rec.title}:</span>{' '}
                        <span className="text-slate-600">{rec.rationale}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-[#0B1B35] mb-1">9. Overall Assessment</h3>
                  <p className="leading-relaxed">{generated.briefing.overallAssessment}</p>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
