import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Play, Sparkles } from 'lucide-react';

import { AiProcessingBanner } from './ProvenanceBanner';

const DEFAULT_TEST_PROMPT =
  "Explain how operating profit margin helps evaluate a company's performance.";

interface GeminiStatusResponse {
  configured: boolean;
  model: string;
  fallbackModel?: string;
}

interface GeminiTestResponse {
  ok: boolean;
  model?: string;
  prompt?: string;
  responseText?: string;
  testedAt?: string;
  error?: string;
}

export const AiConnectionTestPanel: React.FC = () => {
  const [status, setStatus] = useState<GeminiStatusResponse | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>(DEFAULT_TEST_PROMPT);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<GeminiTestResponse | null>(null);

  useEffect(() => {
    fetch('/api/gemini/status')
      .then(async (r) => {
        const data = (await r.json()) as GeminiStatusResponse;
        if (!r.ok) throw new Error('Unable to check server-side Gemini configuration.');
        setStatus(data);
      })
      .catch((err) => {
        setStatusError(
          err instanceof Error ? err.message : 'Failed to inspect server AI environment.'
        );
      });
  }, []);

  const handleRunTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setTesting(true);
    setResult(null);

    try {
      const res = await fetch('/api/gemini/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = (await res.json()) as GeminiTestResponse;
      if (!res.ok || !data.ok) {
        setResult({
          ok: false,
          model: data.model || status?.model,
          error:
            data.error ||
            'AI service temporarily unavailable. Please try again shortly.',
        });
        return;
      }
      setResult(data);
    } catch {
      setResult({
        ok: false,
        error: 'AI service temporarily unavailable. Please try again shortly.',
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#9A7214] shrink-0" />
          <h2 className="text-sm font-semibold text-[#0B1B35]">
            Server-Side Gemini AI Connection Verification
          </h2>
        </div>

        <div className="text-xs text-slate-600 flex flex-wrap items-center gap-2">
          {statusError ? (
            <span className="text-red-700 font-medium">{statusError}</span>
          ) : status ? (
            <>
              <span className="font-mono text-[#0B1B35]">Model: {status.model}</span>
              <span aria-hidden="true">·</span>
              {status.configured ? (
                <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Server Key Detected</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-medium text-red-700">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Server Key Not Configured</span>
                </span>
              )}
            </>
          ) : (
            <span className="text-slate-400">Checking server environment...</span>
          )}
        </div>
      </div>

      <form onSubmit={handleRunTest} className="space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-end gap-3">
          <div className="flex-1">
            <label htmlFor="gemini-test-prompt" className="block text-xs font-semibold text-slate-700 mb-1">
              Live Verification Prompt
            </label>
            <input
              id="gemini-test-prompt"
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#0B1B35]"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setPrompt(DEFAULT_TEST_PROMPT)}
              className="px-3 py-2 rounded-md border border-slate-300 bg-white hover:border-[#C59B27] text-xs font-medium text-slate-700 cursor-pointer whitespace-nowrap"
            >
              Reset Prompt
            </button>

            <button
              type="submit"
              disabled={testing}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-[#0B1B35] hover:bg-[#12284C] disabled:opacity-60 text-white text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
            >
              {testing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#D1A942]" />
                  <span>Calling Gemini API...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 text-[#D1A942]" />
                  <span>Test Gemini Connection</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {testing && (
        <AiProcessingBanner detail="Verifying live Gemini API connectivity with automatic retry and fallback support." />
      )}

      {result && (
        <div
          role={result.ok ? 'status' : 'alert'}
          className={`rounded-md border p-4 space-y-2 ${
            result.ok
              ? 'bg-slate-50 border-slate-200 text-[#0B1B35]'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          {result.ok ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Live Gemini API Connection Verified</span>
                </span>
                <span className="font-mono tabular-nums text-slate-500">
                  {result.model} · {result.testedAt}
                </span>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {result.responseText}
              </p>
            </>
          ) : (
            <div className="flex items-start gap-2.5 text-xs">
              <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-semibold text-red-900">Gemini Connection Test Failed</div>
                <p className="text-red-800 leading-relaxed">{result.error}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
