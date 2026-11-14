import React from 'react';
import { Info, Loader2, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';
import { AnalysisSourceType } from '../types';

interface ProvenanceBannerProps {
  sourceType: AnalysisSourceType;
  generatedAt: string;
  factBasisLabel?: string;
  extraNote?: string;
}

export const ProvenanceBanner: React.FC<ProvenanceBannerProps> = ({
  sourceType,
  generatedAt,
  factBasisLabel = 'Financial metrics computed deterministically from user inputs',
  extraNote,
}) => {
  const isAI = sourceType === 'ai';

  return (
    <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-slate-600">
      <div className="flex items-start sm:items-center gap-2.5">
        {isAI ? (
          <Sparkles className="w-4 h-4 text-[#9A7214] shrink-0 mt-0.5 sm:mt-0" />
        ) : (
          <Info className="w-4 h-4 text-[#1B365D] shrink-0 mt-0.5 sm:mt-0" />
        )}
        <div className="leading-relaxed">
          <span className="font-semibold text-[#0B1B35]">
            {isAI ? 'AI-Generated Synthesis' : 'Sample Demonstration Output'}
          </span>
          <span className="mx-1.5 text-slate-300" aria-hidden="true">·</span>
          <span>{factBasisLabel}</span>
          {extraNote && (
            <>
              <span className="mx-1.5 text-slate-300" aria-hidden="true">·</span>
              <span className="text-slate-500">{extraNote}</span>
            </>
          )}
        </div>
      </div>
      <div className="text-slate-500 font-mono tabular-nums whitespace-nowrap shrink-0 pl-6 sm:pl-0">
        {generatedAt}
      </div>
    </div>
  );
};

export const VerifiedVsAiHeader: React.FC<{
  kind: 'verified' | 'ai';
  title: string;
  subtitle?: string;
}> = ({ kind, title, subtitle }) => {
  return (
    <div className="flex items-center justify-between gap-4 pb-3 border-b border-slate-200">
      <div className="flex items-center gap-2 min-w-0">
        {kind === 'verified' ? (
          <CheckCircle2 className="w-4 h-4 text-[#1B365D] shrink-0" />
        ) : (
          <Sparkles className="w-4 h-4 text-[#9A7214] shrink-0" />
        )}
        <h3 className="text-sm font-semibold text-[#0B1B35] truncate">{title}</h3>
      </div>
      <span className="text-xs text-slate-500 whitespace-nowrap shrink-0">
        {subtitle ?? (kind === 'verified' ? 'Deterministic Input Basis' : 'AI Synthesis · Informational')}
      </span>
    </div>
  );
};

export const AiProcessingBanner: React.FC<{ detail?: string | null }> = ({ detail }) => (
  <div
    role="status"
    aria-live="polite"
    className="bg-white border border-[#C59B27]/60 rounded-lg px-4 py-3.5 flex items-center gap-3 text-xs text-[#0B1B35]"
  >
    <Loader2 className="w-4 h-4 animate-spin text-[#9A7214] shrink-0" />
    <div className="space-y-0.5">
      <div className="font-semibold text-[#0B1B35]">
        AUREON AI is processing your analysis.
      </div>
      {detail && <div className="text-slate-500">{detail}</div>}
    </div>
  </div>
);

export const ErrorAlert: React.FC<{ message: string; onDismiss?: () => void }> = ({
  message,
  onDismiss,
}) => (
  <div
    role="alert"
    className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-start justify-between gap-3 text-sm text-red-900"
  >
    <div className="flex items-start gap-2.5">
      <ShieldAlert className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
      <p className="leading-snug">{message}</p>
    </div>
    {onDismiss && (
      <button
        type="button"
        onClick={onDismiss}
        className="text-xs font-medium text-red-800 hover:text-red-950 underline whitespace-nowrap shrink-0"
      >
        Dismiss
      </button>
    )}
  </div>
);
