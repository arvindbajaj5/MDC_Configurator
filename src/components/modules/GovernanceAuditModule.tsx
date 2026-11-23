import React, { useState } from 'react';
import { CheckSquare, ClipboardList, ShieldCheck } from 'lucide-react';
import {
  build15PointExecutiveSummary,
  buildCommissioningChecklist,
  runComplianceAudits
} from '../../engines/auditAndSummary';
import type { DealConfig, FullEngineeringOutput } from '../../types/schema';

interface GovernanceAuditModuleProps {
  deal: DealConfig;
  eng: FullEngineeringOutput;
  onPatchDeal: (updater: (d: DealConfig) => DealConfig) => void;
}

export const GovernanceAuditModule: React.FC<GovernanceAuditModuleProps> = ({
  deal,
  eng,
  onPatchDeal
}) => {
  const [subTab, setSubTab] = useState<'exec15' | 'commissioning' | 'audits'>('exec15');

  const execPoints = build15PointExecutiveSummary(deal, eng);
  const cxSteps = buildCommissioningChecklist(deal.commissioningCompletedIds);
  const audits = runComplianceAudits(deal, eng);

  const completedCount = cxSteps.filter((s) => s.completed).length;
  const cxPct = Math.round((completedCount / cxSteps.length) * 100);

  const toggleStep = (id: string) => {
    const current = new Set(deal.commissioningCompletedIds ?? []);
    if (current.has(id)) current.delete(id);
    else current.add(id);
    onPatchDeal((d) => ({ ...d, commissioningCompletedIds: Array.from(current) }));
  };

  return (
    <div className="space-y-3 text-xs">
      <div className="bg-white border border-slate-200 rounded-cad p-2 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setSubTab('exec15')}
          className={`px-3 py-1.5 rounded-cad font-semibold border flex items-center gap-1.5 ${
            subTab === 'exec15' ? 'bg-brand-navy text-white border-brand-navy' : 'bg-slate-50 text-slate-700 border-slate-200'
          }`}
        >
          <ClipboardList className="w-3.5 h-3.5" /> 15-Point Executive Summary
        </button>
        <button
          type="button"
          onClick={() => setSubTab('commissioning')}
          className={`px-3 py-1.5 rounded-cad font-semibold border flex items-center gap-1.5 ${
            subTab === 'commissioning' ? 'bg-brand-navy text-white border-brand-navy' : 'bg-slate-50 text-slate-700 border-slate-200'
          }`}
        >
          <CheckSquare className="w-3.5 h-3.5" /> L1–L5 Commissioning ({cxPct}%)
        </button>
        <button
          type="button"
          onClick={() => setSubTab('audits')}
          className={`px-3 py-1.5 rounded-cad font-semibold border flex items-center gap-1.5 ${
            subTab === 'audits' ? 'bg-brand-navy text-white border-brand-navy' : 'bg-slate-50 text-slate-700 border-slate-200'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" /> Uptime Tier &amp; BIS Audits ({audits.filter((a) => a.status === 'PASS').length}/{audits.length} Pass)
        </button>
      </div>

      {subTab === 'exec15' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {execPoints.map((pt) => (
            <div key={pt.index} className="bg-white border border-slate-200 rounded-cad p-2.5">
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-cad bg-brand-navy text-white">
                  #{String(pt.index).padStart(2, '0')}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-orange">
                  {pt.category}
                </span>
              </div>
              <p className="font-bold text-slate-900 text-xs">{pt.headline}</p>
              <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">{pt.detail}</p>
            </div>
          ))}
        </div>
      )}

      {subTab === 'commissioning' && (
        <div className="bg-white border border-slate-200 rounded-cad p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold uppercase tracking-wider text-brand-navy">
              L1 (FAT) → L5 (Integrated Systems Test) Readiness Tracker
            </h3>
            <span className="font-mono font-bold text-brand-emerald">
              {completedCount} / {cxSteps.length} Complete ({cxPct}%)
            </span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-cad overflow-hidden">
            <div className="h-full bg-brand-emerald transition-all" style={{ width: `${cxPct}%` }} />
          </div>
          <div className="divide-y divide-slate-100">
            {cxSteps.map((s) => (
              <label key={s.id} className="py-2 flex items-start gap-2.5 cursor-pointer hover:bg-slate-50 px-1.5">
                <input
                  type="checkbox"
                  checked={s.completed}
                  onChange={() => toggleStep(s.id)}
                  className="mt-0.5 accent-brand-orange"
                />
                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-cad bg-slate-100 border border-slate-300 text-brand-navy shrink-0">
                  {s.level}
                </span>
                <div className="flex-1">
                  <p className={`font-medium ${s.completed ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                    {s.checkpoint}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {s.phaseTitle} • Owner: {s.owner}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {subTab === 'audits' && (
        <div className="bg-white border border-slate-200 rounded-cad divide-y divide-slate-100">
          {audits.map((a) => (
            <div key={a.id} className="p-2.5 flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {a.domain} • <span className="font-mono text-brand-navy">{a.codeRef}</span>
                </p>
                <p className="font-semibold text-slate-900 mt-0.5">{a.requirement}</p>
                <p className="text-[11px] text-slate-600 mt-0.5">{a.evidence}</p>
              </div>
              <span
                className={`px-2 py-0.5 rounded-cad font-mono text-[10px] font-bold shrink-0 ${
                  a.status === 'PASS'
                    ? 'bg-emerald-100 text-emerald-800'
                    : a.status === 'WARN'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-red-100 text-red-800'
                }`}
              >
                {a.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
