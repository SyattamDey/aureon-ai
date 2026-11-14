import React, { useState } from 'react';
import {
  Copy,
  Check,
  FileText,
  Loader2,
  Plus,
  Printer,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  BusinessInput,
  SavedSnapshot,
  WorkspaceMemoResult,
  WorkspaceNote,
} from '../types';
import { computeCalculatedMetrics } from '../data/sampleProfiles';
import { formatCurrency } from '../components/BrandMark';
import {
  AiProcessingBanner,
  ErrorAlert,
  VerifiedVsAiHeader,
} from '../components/ProvenanceBanner';

interface ResearchWorkspaceViewProps {
  businessInput: BusinessInput;
  notes: WorkspaceNote[];
  snapshots: SavedSnapshot[];
  memo: WorkspaceMemoResult | null;
  onAddNote: (note: Omit<WorkspaceNote, 'id' | 'updatedAt'>) => void;
  onDeleteNote: (id: string) => void;
  onDeleteSnapshot: (id: string) => void;
  onSynthesizeMemo: (researchQuestion: string) => void;
  isSynthesizing: boolean;
  error: string | null;
  onClearError: () => void;
}

export const ResearchWorkspaceView: React.FC<ResearchWorkspaceViewProps> = ({
  businessInput,
  notes,
  snapshots,
  memo,
  onAddNote,
  onDeleteNote,
  onDeleteSnapshot,
  onSynthesizeMemo,
  isSynthesizing,
  error,
  onClearError,
}) => {
  const [noteTitle, setNoteTitle] = useState('');
  const [noteCategory, setNoteCategory] = useState<WorkspaceNote['category']>('Strategy');
  const [noteContent, setNoteContent] = useState('');
  const [researchQuestion, setResearchQuestion] = useState(
    'Evaluate capital allocation priorities, primary execution risks, and board-level next steps for the next 12 months.'
  );
  const [copiedMemo, setCopiedMemo] = useState(false);

  const metrics = computeCalculatedMetrics(
    businessInput.revenue,
    businessInput.expenses,
    businessInput.employeeCount
  );

  const handleCreateNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim() || !noteContent.trim()) return;
    onAddNote({
      title: noteTitle.trim(),
      category: noteCategory,
      content: noteContent.trim(),
    });
    setNoteTitle('');
    setNoteContent('');
  };

  const handleCopyMemo = async () => {
    if (!memo) return;
    const text = [
      `# ${memo.title}`,
      `Generated: ${memo.generatedAt} | Company: ${businessInput.companyName}`,
      '',
      '## Verified User Input Basis',
      ...memo.verifiedInputsSummary.map((item) => `- ${item}`),
      '',
      '## AI-Generated Strategic Synthesis (Informational Only)',
      memo.aiStrategicSynthesis,
      '',
      '## Key Risks & Trade-Offs',
      ...memo.keyRisksAndTradeoffs.map((r) => `- ${r}`),
      '',
      '## Recommended Board Actions',
      ...memo.recommendedBoardActions.map((a) => `- ${a}`),
      '',
      '---',
      'Disclaimer: Educational and informational purposes only. Does not constitute verified live financial market data or investment advice.',
    ].join('\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopiedMemo(true);
      setTimeout(() => setCopiedMemo(false), 2000);
    } catch {
      // Clipboard fallback ignored silently
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#0B1B35]">Research Workspace</h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Capture analyst notes, organize saved module snapshots, and synthesize board-ready executive memos.
          </p>
        </div>
      </div>

      {error && <ErrorAlert message={error} onDismiss={onClearError} />}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Column: Notes & Snapshots */}
        <div className="xl:col-span-5 space-y-6 no-print">
          {/* Add Research Note */}
          <form
            onSubmit={handleCreateNote}
            className="bg-white border border-slate-200 rounded-lg p-5 space-y-3.5"
          >
            <VerifiedVsAiHeader
              kind="verified"
              title="Add Analyst Research Note"
              subtitle="Saved Locally"
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="sm:col-span-2">
                <label htmlFor="ws-note-title" className="block text-xs font-semibold text-slate-700 mb-1">
                  Note Title
                </label>
                <input
                  id="ws-note-title"
                  type="text"
                  required
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="e.g., Margin sensitivity check"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:border-[#0B1B35]"
                />
              </div>
              <div>
                <label htmlFor="ws-note-cat" className="block text-xs font-semibold text-slate-700 mb-1">
                  Category
                </label>
                <select
                  id="ws-note-cat"
                  value={noteCategory}
                  onChange={(e) => setNoteCategory(e.target.value as WorkspaceNote['category'])}
                  className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-md bg-white focus:outline-none focus:border-[#0B1B35]"
                >
                  <option value="Business">Business</option>
                  <option value="Market">Market</option>
                  <option value="Risk">Risk</option>
                  <option value="Strategy">Strategy</option>
                  <option value="General">General</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="ws-note-body" className="block text-xs font-semibold text-slate-700 mb-1">
                Observation / Evidence
              </label>
              <textarea
                id="ws-note-body"
                rows={3}
                required
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Record analyst hypothesis, diligence questions, or management assumptions..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:border-[#0B1B35] leading-relaxed"
              />
            </div>

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-md border border-[#0B1B35] bg-[#0B1B35] hover:bg-[#12284C] text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#D1A942]" />
              <span>Save Note to Workspace</span>
            </button>
          </form>

          {/* Research Notes List */}
          <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-[#0B1B35]">Analyst Notes</h3>
              <span className="text-xs font-mono tabular-nums text-slate-500">{notes.length} entries</span>
            </div>

            {notes.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                No research notes yet. Add an observation above to include it in your executive memo synthesis.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {notes.map((n) => (
                  <div key={n.id} className="py-3 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs font-semibold text-[#0B1B35]">{n.title}</div>
                        <div className="text-[11px] text-slate-500">
                          {n.category} · {n.updatedAt}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onDeleteNote(n.id)}
                        className="p-1 text-slate-400 hover:text-red-700 transition-colors cursor-pointer"
                        aria-label={`Delete note ${n.title}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{n.content}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Saved Analysis Snapshots */}
          <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-[#0B1B35]">Saved Module Snapshots</h3>
              <span className="text-xs font-mono tabular-nums text-slate-500">{snapshots.length} saved</span>
            </div>

            {snapshots.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                Use &ldquo;Save Snapshot&rdquo; on Business, Market, Risk, or Recommendations views to archive outputs here.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {snapshots.map((snap) => (
                  <div key={snap.id} className="py-3 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs font-semibold text-[#0B1B35]">{snap.title}</div>
                        <div className="text-[11px] text-slate-500">
                          {snap.module} · {snap.sourceType === 'ai' ? 'AI Synthesis' : 'Sample'} · {snap.createdAt}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onDeleteSnapshot(snap.id)}
                        className="p-1 text-slate-400 hover:text-red-700 transition-colors cursor-pointer"
                        aria-label={`Remove snapshot ${snap.title}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">{snap.summary}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Executive Memo Synthesizer */}
        <div className="xl:col-span-7 space-y-6">
          <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 no-print">
            <VerifiedVsAiHeader
              kind="ai"
              title="Executive Memo Synthesizer"
              subtitle="Combines Inputs, Notes & Snapshots"
            />
            <div className="text-xs text-slate-600 flex flex-wrap items-center gap-3 bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
              <span className="font-semibold text-[#0B1B35]">{businessInput.companyName || 'Active Company'}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                Rev {metrics.revenue !== null ? formatCurrency(metrics.revenue) : 'Unavailable'}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                Margin {metrics.operatingMarginPct !== null ? `${metrics.operatingMarginPct.toFixed(1)}%` : 'N/A'}
              </span>
              <span aria-hidden="true">·</span>
              <span>{notes.length} notes &amp; {snapshots.length} snapshots attached</span>
            </div>

            <div>
              <label htmlFor="ws-question" className="block text-xs font-semibold text-slate-700 mb-1">
                Executive Research Question / Memo Mandate
              </label>
              <textarea
                id="ws-question"
                rows={2}
                value={researchQuestion}
                onChange={(e) => setResearchQuestion(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#0B1B35]"
              />
            </div>

            <button
              type="button"
              onClick={() => onSynthesizeMemo(researchQuestion)}
              disabled={isSynthesizing}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-[#0B1B35] hover:bg-[#12284C] disabled:opacity-60 text-white text-sm font-medium transition-colors cursor-pointer"
            >
              {isSynthesizing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#D1A942]" />
                  <span>Synthesizing Executive Memo...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-[#D1A942]" />
                  <span>Synthesize Executive Memo</span>
                </>
              )}
            </button>
          </section>

          {/* Memo Document Output */}
          <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
            {isSynthesizing ? (
              <div className="space-y-4">
                <AiProcessingBanner detail="Synthesizing your analyst notes, snapshots, and company inputs into an executive memo." />
                <div className="space-y-4 animate-pulse">
                  <div className="h-5 bg-slate-200 rounded w-1/2" />
                  <div className="h-3 bg-slate-100 rounded w-full" />
                  <div className="h-3 bg-slate-100 rounded w-5/6" />
                  <div className="h-28 bg-slate-100 rounded" />
                </div>
              </div>
            ) : memo ? (
              <>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 pb-4 border-b border-slate-200">
                  <div>
                    <div className="text-xs text-[#9A7214] font-semibold">
                      AUREON AI Research Brief · {businessInput.companyName}
                    </div>
                    <h2 className="text-lg font-bold text-[#0B1B35] mt-1">{memo.title}</h2>
                    <div className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
                      Generated {memo.generatedAt}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 no-print">
                    <button
                      type="button"
                      onClick={handleCopyMemo}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 text-xs font-medium text-[#0B1B35] hover:border-[#C59B27] cursor-pointer"
                    >
                      {copiedMemo ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedMemo ? 'Copied' : 'Copy Markdown'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 text-xs font-medium text-[#0B1B35] hover:border-[#C59B27] cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-[#1B365D]">
                    1. Verified User Input Basis (Deterministic)
                  </h3>
                  <ul className="space-y-1 text-xs text-slate-700 list-disc pl-4">
                    {memo.verifiedInputsSummary.map((line, i) => (
                      <li key={i} className="leading-relaxed">
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2 pt-3 border-t border-slate-100">
                  <h3 className="text-xs font-semibold text-[#9A7214]">
                    2. AI-Generated Strategic Synthesis (Informational Only)
                  </h3>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                    {memo.aiStrategicSynthesis}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-3 border-t border-slate-100">
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-[#0B1B35]">3. Key Risks &amp; Trade-Offs</h3>
                    <ul className="space-y-1.5 text-xs text-slate-600 list-disc pl-4">
                      {memo.keyRisksAndTradeoffs.map((item, i) => (
                        <li key={i} className="leading-relaxed">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-[#0B1B35]">4. Recommended Board Actions</h3>
                    <ul className="space-y-1.5 text-xs text-slate-600 list-disc pl-4">
                      {memo.recommendedBoardActions.map((act, i) => (
                        <li key={i} className="leading-relaxed">
                          {act}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 pt-3 border-t border-slate-200">
                  Disclaimer: Prepared for educational and informational purposes only. Does not constitute verified live financial market information or investment advice.
                </div>
              </>
            ) : (
              <div className="py-10 text-center space-y-2">
                <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                <div className="text-sm font-semibold text-[#0B1B35]">No Executive Memo Generated Yet</div>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  Add notes or save module snapshots on the left, refine your research mandate above, and click &ldquo;Synthesize Executive Memo&rdquo; to produce a structured board brief.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
