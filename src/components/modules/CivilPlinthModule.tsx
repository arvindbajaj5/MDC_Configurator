import React from 'react';
import { HardHat } from 'lucide-react';
import type { DealConfig, FullEngineeringOutput, SoilClass } from '../../types/schema';
import { SliderInput } from '../controls/SliderInput';

interface CivilPlinthModuleProps {
  deal: DealConfig;
  eng: FullEngineeringOutput;
  onPatchDeal: (updater: (d: DealConfig) => DealConfig) => void;
}

const SOIL_PRESETS: Array<{ soilClass: SoilClass; sbc: number }> = [
  { soilClass: 'Hard Rock', sbc: 260 },
  { soilClass: 'Dense Gravel/Sand', sbc: 200 },
  { soilClass: 'Stiff Clay', sbc: 150 },
  { soilClass: 'Soft Marine Clay', sbc: 95 },
  { soilClass: 'Reclaimed Fill', sbc: 75 }
];

export const CivilPlinthModule: React.FC<CivilPlinthModuleProps> = ({
  deal,
  eng,
  onPatchDeal
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <section className="bg-white border border-slate-200 rounded-cad p-3 space-y-2.5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-brand-navy flex items-center gap-1.5">
            <HardHat className="w-3.5 h-3.5 text-brand-orange" />
            Geotechnical, Plinth &amp; BnM Structural Controls
          </h2>
          <div className="flex gap-1">
            {(['1:50', '1:40'] as const).map((slope) => (
              <button
                key={slope}
                type="button"
                onClick={() => onPatchDeal((d) => ({ ...d, civil: { ...d.civil, yardDrainageSlope: slope } }))}
                className={`px-2 py-0.5 text-[10px] font-mono font-semibold rounded-cad border ${
                  deal.civil.yardDrainageSlope === slope
                    ? 'bg-brand-navy text-white border-brand-navy'
                    : 'bg-white border-slate-300'
                }`}
              >
                Drain {slope}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {SOIL_PRESETS.map((s) => (
            <button
              key={s.soilClass}
              type="button"
              onClick={() =>
                onPatchDeal((d) => ({
                  ...d,
                  civil: { ...d.civil, soilClass: s.soilClass, soilSbcKpa: s.sbc }
                }))
              }
              className={`px-2 py-1 text-[11px] font-semibold rounded-cad border ${
                deal.civil.soilClass === s.soilClass
                  ? 'bg-brand-navy text-white border-brand-navy'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {s.soilClass} ({s.sbc} kPa)
            </button>
          ))}
        </div>

        <SliderInput
          label="Soil Safe Bearing Capacity (SBC)"
          value={deal.civil.soilSbcKpa}
          min={60}
          max={300}
          step={5}
          unit="kPa"
          hint="< 110 kPa automatically switches to 4.5m RCC Pile Cap"
          onChange={(v) => onPatchDeal((d) => ({ ...d, civil: { ...d.civil, soilSbcKpa: v } }))}
        />
        <SliderInput
          label="Plinth Height Above FGL"
          value={deal.civil.plinthClearHeightM}
          min={0.45}
          max={1.8}
          step={0.05}
          unit="m"
          onChange={(v) => onPatchDeal((d) => ({ ...d, civil: { ...d.civil, plinthClearHeightM: v } }))}
        />
        <SliderInput
          label="Groundwater Table Depth"
          value={deal.civil.groundwaterDepthM}
          min={1.0}
          max={12.0}
          step={0.5}
          unit="m"
          onChange={(v) => onPatchDeal((d) => ({ ...d, civil: { ...d.civil, groundwaterDepthM: v } }))}
        />

        {deal.architecture === 'BnM' && (
          <div className="grid grid-cols-2 gap-2">
            <SliderInput
              label="BnM Slab Live Load"
              value={deal.civil.bnmSlabLiveLoadKpa}
              min={15}
              max={40}
              step={1}
              unit="kPa"
              onChange={(v) => onPatchDeal((d) => ({ ...d, civil: { ...d.civil, bnmSlabLiveLoadKpa: v } }))}
            />
            <SliderInput
              label="BnM Structural Clear Height"
              value={deal.civil.bnmClearHeightM}
              min={4.5}
              max={9.0}
              step={0.5}
              unit="m"
              onChange={(v) => onPatchDeal((d) => ({ ...d, civil: { ...d.civil, bnmClearHeightM: v } }))}
            />
          </div>
        )}
      </section>

      <section className="bg-cad-bg text-slate-100 border border-slate-800 rounded-cad p-3 space-y-2.5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <h3 className="font-mono text-xs font-bold text-sky-400">C-101 LIVE BEARING &amp; FOUNDATION ENGINE</h3>
          <span
            className={`px-2 py-0.5 rounded-cad font-mono text-[10px] font-bold ${
              eng.civil.requiresPiling ? 'bg-brand-orange text-white' : 'bg-brand-emerald text-white'
            }`}
          >
            {eng.civil.foundationType}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-xs">
          <div className="bg-slate-900 border border-slate-800 p-2 rounded-cad">
            <span className="text-[10px] text-slate-400">Embedment Depth</span>
            <p className="text-sm font-bold text-white">{eng.civil.embedmentDepthM} m</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-2 rounded-cad">
            <span className="text-[10px] text-slate-400">Imposed Bearing</span>
            <p className="text-sm font-bold text-sky-300">{eng.civil.imposedBearingKpa} kN/m²</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-2 rounded-cad">
            <span className="text-[10px] text-slate-400">Bearing FoS</span>
            <p className="text-sm font-bold text-emerald-400">{eng.civil.bearingFoS}x ({eng.civil.fosStatus})</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-2 rounded-cad">
            <span className="text-[10px] text-slate-400">M35 Concrete / Rebar</span>
            <p className="text-sm font-bold">{eng.civil.concreteVolumeM3} m³ / {eng.civil.rebarTonnageMt} MT</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-2 rounded-cad">
            <span className="text-[10px] text-slate-400">450mm Bored Piles</span>
            <p className="text-sm font-bold">{eng.civil.pileCount} Nos (+₹{eng.civil.pileAdderInrCr} Cr)</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-2 rounded-cad">
            <span className="text-[10px] text-slate-400">Total Civil BOQ</span>
            <p className="text-sm font-bold text-brand-amber">₹{eng.civil.civilTotalCostInrCr} Cr</p>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-2 text-[11px] space-y-1 text-slate-300">
          <p className="font-mono text-sky-300">{eng.civil.anchorBoltSpec}</p>
          {eng.civil.advisoryNotes.map((n, i) => (
            <p key={i}>• {n}</p>
          ))}
        </div>
      </section>
    </div>
  );
};
