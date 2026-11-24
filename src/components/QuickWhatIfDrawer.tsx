import React, { useMemo } from 'react';
import { computeEngineeringV13, formatMoney } from '../engine/engineeringEngine';
import type {
  EngineeringResult,
  MasterStandards,
  NonItCatalogItem,
  ProjectDeal,
  RackSku,
  ShellArchitecture,
  SupplyChainSku,
  UptimeTier
} from '../types/mdc';

interface QuickWhatIfDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectDeal;
  eng: EngineeringResult;
  skus: RackSku[];
  nonItCatalog: NonItCatalogItem[];
  standards: MasterStandards;
  supplyItems: SupplyChainSku[];
  onUpdateProject: (patch: Partial<ProjectDeal>) => void;
}

export const QuickWhatIfDrawer: React.FC<QuickWhatIfDrawerProps> = ({
  isOpen,
  onClose,
  project,
  eng,
  skus,
  nonItCatalog,
  standards,
  supplyItems,
  onUpdateProject
}) => {
  const activeRackCount = Object.values(project.rackQuantities || {}).reduce((s, q) => s + (Number(q) || 0), 0);

  const scaleRacksToTargetMw = (nextMw: number) => {
    if (nextMw <= 0) return;
    const curMw = eng.totalDesignContKw / 1000;
    if (curMw <= 0) {
      const dlcSku = skus.find(s => s.coolingType === 'DLC') || skus[0];
      if (!dlcSku) return;
      const qty = Math.max(1, Math.round((nextMw * 1000) / (dlcSku.peakKw * (dlcSku.continuousFactor || 0.94))));
      onUpdateProject({ targetItMw: nextMw, rackQuantities: { ...project.rackQuantities, [dlcSku.id]: qty } });
      return;
    }
    const factor = nextMw / curMw;
    const scaled: Record<string, number> = {};
    Object.entries(project.rackQuantities || {}).forEach(([k, v]) => {
      const q = Number(v) || 0;
      scaled[k] = q > 0 ? Math.max(1, Math.round(q * factor)) : 0;
    });
    onUpdateProject({ targetItMw: nextMw, rackQuantities: scaled });
  };

  // Preview 2N Tier IV vs current for instant sensitivity insight
  const tier4Preview = useMemo(() => {
    if (project.uptimeTier === 'Tier IV') return null;
    return computeEngineeringV13(
      { ...project, uptimeTier: 'Tier IV' },
      skus,
      nonItCatalog,
      standards,
      supplyItems
    );
  }, [project, skus, nonItCatalog, standards, supplyItems]);

  if (!isOpen) return null;

  return (
    <aside className="w-full lg:w-[360px] flex-shrink-0 bg-white border-l border-slate-200 shadow-xl flex flex-col max-h-[calc(100dvh-56px)] overflow-y-auto z-30">
      <div className="navy-bg text-white p-3.5 flex items-center justify-between sticky top-0 z-10">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-300">Live Sensitivity Simulator</span>
          <h3 className="text-sm font-bold">Quick What-If Pane</h3>
        </div>
        <button
          onClick={onClose}
          className="px-2.5 py-1 rounded bg-white/15 hover:bg-white/25 text-xs font-bold"
          title="Collapse Quick What-If Pane"
        >
          ✕ Hide
        </button>
      </div>

      <div className="p-4 space-y-4 text-xs">
        {/* Live KPI Telemetry Card */}
        <div className="p-3 rounded-xl bg-slate-900 text-white space-y-2">
          <div className="flex justify-between items-center border-b border-slate-700 pb-1.5">
            <span className="text-slate-400">Continuous IT Load</span>
            <span className="text-sm font-black text-amber-300">
              {(eng.totalDesignContKw / 1000).toFixed(2)} MW ({activeRackCount} Racks)
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <div>
              <span className="text-[10px] text-slate-400 block">Non-IT Pre-Tax</span>
              <span className="font-bold text-emerald-300">{formatMoney(eng.totals.sellingPreTax, project.currency, standards)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">5-Year TCO</span>
              <span className="font-bold text-sky-300">{formatMoney(eng.fiveYearTcoInr, project.currency, standards)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Annualized PUE</span>
              <span className="font-bold">{eng.pueAnnualized} (Peak {eng.puePeakDesign})</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Campus Footprint</span>
              <span className="font-bold">{eng.totalCampusOccupiedSqm} m² ({eng.plotUtilizationPct}%)</span>
            </div>
          </div>
        </div>

        {/* 1. Shell Architecture Toggle */}
        <div className="space-y-1.5">
          <label className="font-bold navy-text block">1. Enclosure Architecture</label>
          <div className="grid grid-cols-2 gap-1.5">
            {(
              [
                ['Container', 'ISO Containers'],
                ['BnM_Hall', 'BnM Technical Hall']
              ] as [ShellArchitecture, string][]
            ).map(([val, lbl]) => (
              <button
                key={val}
                onClick={() => onUpdateProject({ shellArchitecture: val })}
                className={`py-2 px-2.5 rounded-lg font-bold border text-center transition ${
                  project.shellArchitecture === val
                    ? 'coral-bg text-white border-[#FF5539]'
                    : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Quick IT Load Scaling Presets */}
        <div className="space-y-1.5">
          <div className="flex justify-between">
            <label className="font-bold navy-text">2. Scale IT Load (Proportional Rack Mix)</label>
            <span className="font-bold text-slate-500">{(eng.totalDesignContKw / 1000).toFixed(2)} MW</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {[2, 5, 10, 20].map(mw => (
              <button
                key={mw}
                onClick={() => scaleRacksToTargetMw(mw)}
                className="py-1.5 rounded-lg border border-slate-300 bg-white hover:border-blue-600 font-bold navy-text"
              >
                {mw} MW
              </button>
            ))}
          </div>
        </div>

        {/* 3. Uptime Tier Selector + Tier IV Sensitivity Delta */}
        <div className="space-y-1.5">
          <label className="font-bold navy-text block">3. Uptime Redundancy Tier</label>
          <select
            value={project.uptimeTier}
            onChange={e => onUpdateProject({ uptimeTier: e.target.value as UptimeTier })}
            className="w-full border border-slate-300 rounded-lg px-2.5 py-2 bg-white font-bold navy-text"
          >
            <option value="None">None (Basic N / Pilot)</option>
            <option value="Tier II">Tier II (Partial Redundancy)</option>
            <option value="Tier III">Tier III (N+1 Concurrently Maintainable)</option>
            <option value="Tier IV">Tier IV (2N Fault-Tolerant)</option>
          </select>
          {tier4Preview && (
            <div className="text-[11px] bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 text-amber-950">
              Upgrade to <strong>Tier IV (2N)</strong> delta:{' '}
              <strong>
                +{formatMoney(tier4Preview.totals.sellingPreTax - eng.totals.sellingPreTax, project.currency, standards)}
              </strong>{' '}
              Pre-Tax CAPEX
            </div>
          )}
        </div>

        {/* 4. Growth Reserve % & Coolant Supply Temp */}
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Growth Reserve (%)</label>
            <input
              type="number"
              min={0}
              max={50}
              step={5}
              value={project.futureGrowthReservePct}
              onChange={e => onUpdateProject({ futureGrowthReservePct: Number(e.target.value) })}
              className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold"
            />
          </div>
          <div>
            <label className="font-bold text-slate-700 block mb-1">Supply Temp (°C)</label>
            <input
              type="number"
              min={18}
              max={45}
              placeholder={`Auto (${eng.governingMaxInletTempC}°C)`}
              value={project.targetSupplyTempC}
              onChange={e =>
                onUpdateProject({ targetSupplyTempC: e.target.value === '' ? '' : Number(e.target.value) })
              }
              className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold"
            />
          </div>
        </div>

        {/* 5. Commercial Margin %, Contingency % & Battery Runtime */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
          <div className="font-bold navy-text">Commercial & Ride-Through Levers</div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] text-slate-500 block">Margin %</label>
              <input
                type="number"
                min={0}
                max={50}
                value={project.marginPct}
                onChange={e => onUpdateProject({ marginPct: Number(e.target.value) })}
                className="w-full border rounded px-2 py-1 bg-white font-bold"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 block">Contingency %</label>
              <input
                type="number"
                min={0}
                max={30}
                value={project.contingencyPct}
                onChange={e => onUpdateProject({ contingencyPct: Number(e.target.value) })}
                className="w-full border rounded px-2 py-1 bg-white font-bold"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 block">UPS Mins</label>
              <input
                type="number"
                min={5}
                max={120}
                step={5}
                value={project.batteryRuntimeMin}
                onChange={e => onUpdateProject({ batteryRuntimeMin: Number(e.target.value) })}
                className="w-full border rounded px-2 py-1 bg-white font-bold"
              />
            </div>
          </div>
        </div>

        {/* 6. Active Deal Placeholders & Validation Alert Summary */}
        <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 space-y-1">
          <div className="flex justify-between">
            <span className="font-bold navy-text">Supply DB Placeholders:</span>
            <span className={`font-black ${eng.dealPlaceholders.length > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
              {eng.dealPlaceholders.length} Active
            </span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold navy-text">Validation Gate:</span>
            <span
              className={`font-black ${
                eng.unwaivedFailCount > 0
                  ? 'text-red-700'
                  : eng.warnCount > 0
                    ? 'text-amber-700'
                    : 'text-emerald-700'
              }`}
            >
              {eng.unwaivedFailCount} Fail • {eng.warnCount} Warn • {eng.waivedCount} Waived
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
