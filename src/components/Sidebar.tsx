import React from 'react';
import {
  LayoutDashboard,
  Search,
  Building2,
  Globe2,
  ShieldAlert,
  Lightbulb,
  Mail,
  FolderKanban,
  X,
} from 'lucide-react';
import { NavSection } from '../types';
import { SAMPLE_PROFILES } from '../data/sampleProfiles';
import { AureonCrest } from './BrandMark';

interface SidebarProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  activeSampleId: string;
  onLoadSample: (id: string) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  snapshotCount: number;
  noteCount: number;
}

const NAV_ITEMS: { id: NavSection; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'explorer', label: 'Company Explorer', icon: Search },
  { id: 'business', label: 'Business Intelligence', icon: Building2 },
  { id: 'market', label: 'Market Intelligence', icon: Globe2 },
  { id: 'risk', label: 'Risk Assessment', icon: ShieldAlert },
  { id: 'recommendations', label: 'AI Recommendations', icon: Lightbulb },
  { id: 'briefing', label: 'Executive Briefing', icon: Mail },
  { id: 'workspace', label: 'Research Workspace', icon: FolderKanban },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSelectSection,
  activeSampleId,
  onLoadSample,
  mobileOpen,
  onCloseMobile,
  snapshotCount,
  noteCount,
}) => {
  const content = (
    <div className="flex flex-col h-full bg-[#0B1B35] text-white w-[264px] shrink-0 select-none">
      {/* Brand Header */}
      <div className="px-5 pt-6 pb-5 border-b border-white/10 flex items-start justify-between gap-2">
        <div className="flex items-start gap-3">
          <AureonCrest className="w-8 h-8 shrink-0 mt-0.5" />
          <div>
            <div className="font-display font-bold tracking-tight text-base text-white leading-none">
              AUREON AI
            </div>
            <p className="text-[11px] text-slate-300/80 mt-1.5 leading-snug">
              Global Intelligence for Business &amp; Capital
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 text-slate-300 hover:text-white rounded"
          aria-label="Close navigation menu"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto" aria-label="Main Navigation">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectSection(item.id);
                onCloseMobile();
              }}
              className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium transition-colors text-left whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-[#152B52] text-white border border-[#C59B27]/50'
                  : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-[#D1A942]' : 'text-slate-400'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </span>
              {item.id === 'workspace' && (snapshotCount > 0 || noteCount > 0) && (
                <span className="text-[11px] font-mono tabular-nums text-slate-300/80 shrink-0">
                  {snapshotCount + noteCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Demonstration Mode Switcher */}
      <div className="px-4 py-4 border-t border-white/10 space-y-2">
        <label
          htmlFor="sample-profile-select"
          className="block text-[11px] font-medium text-slate-300"
        >
          Fictional Demo Preset (Testing Only)
        </label>
        <select
          id="sample-profile-select"
          value={activeSampleId}
          onChange={(e) => onLoadSample(e.target.value)}
          className="w-full bg-[#12284C] border border-white/15 rounded-md px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#D1A942]"
        >
          {SAMPLE_PROFILES.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
          <option value="live_or_manual">Active Live / Manual Profile</option>
        </select>
      </div>

      {/* Educational Disclaimer */}
      <div className="px-4 py-3.5 bg-[#071326] border-t border-white/10 text-[11px] text-slate-400 leading-relaxed">
        Educational &amp; informational use only. Fictional demos are strictly isolated from live registry records.
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:flex lg:flex-col lg:h-screen lg:sticky lg:top-0 no-print">
        {content}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex no-print">
          <div
            className="fixed inset-0 bg-[#071326]/60 backdrop-blur-xs"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 h-full">{content}</div>
        </div>
      )}
    </>
  );
};
