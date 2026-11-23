import React from 'react';
import { Palette, ShieldCheck } from 'lucide-react';
import type { DealConfig, FullEngineeringOutput } from '../../types/schema';

interface WhiteSpaceBrandingProps {
  deal: DealConfig;
  eng: FullEngineeringOutput;
  onPatchDeal: (updater: (d: DealConfig) => DealConfig) => void;
}

export const WhiteSpaceBranding: React.FC<WhiteSpaceBrandingProps> = ({
  deal,
  eng,
  onPatchDeal
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <section className="bg-white border border-slate-200 rounded-cad p-3 space-y-3 text-xs">
        <h2 className="text-xs font-bold uppercase tracking-wider text-brand-navy border-b border-slate-100 pb-2">
          White-Space Topology (Zero Yard CDUs Enforced)
        </h2>

        <div className="border border-emerald-200 bg-emerald-50 rounded-cad p-2.5 text-emerald-950">
          <p className="font-semibold flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-brand-emerald" />
            Architectural Invariant Verified
          </p>
          <p className="mt-1 text-[11px]">
            <strong>Yard CDUs: {eng.mep.yardCduCount}</strong> (strictly prohibited). All{' '}
            <strong>{eng.mep.internalCduCountTotal}x 1.35 MW CDU towers</strong> and{' '}
            <strong>{eng.mep.pacCountTotal}x mandatory 80 kW PACs</strong> are housed inside conditioned white-space,
            paired with <strong>{eng.mep.chillerCountTotal}x {deal.chillerPlacement.toLowerCase()}-mounted adiabatic chillers</strong>.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="border border-slate-200 rounded-cad p-2.5">
            <p className="text-[10px] uppercase text-slate-500">Enclosure Mode</p>
            <p className="font-bold text-brand-navy mt-0.5">
              {deal.architecture === 'Container' ? `${eng.mep.podCount}x ${deal.containerUnitMw} MW Pods` : 'BnM High-Bay Hall'}
            </p>
            <p className="text-[11px] font-mono text-slate-500">White-Space: {eng.mep.whiteSpaceAreaM2} m²</p>
          </div>
          <div className="border border-slate-200 rounded-cad p-2.5">
            <p className="text-[10px] uppercase text-slate-500">Rack Geometry</p>
            <p className="font-bold text-brand-navy mt-0.5">{eng.mep.totalRacks} Racks @ {deal.avgRackKw} kW</p>
            <p className="text-[11px] font-mono text-slate-500">2.5m H × 900mm W × 1200mm D</p>
          </div>
        </div>

        <div className="flex gap-2">
          {(['Container', 'BnM'] as const).map((arch) => (
            <button
              key={arch}
              type="button"
              onClick={() => onPatchDeal((d) => ({ ...d, architecture: arch }))}
              className={`flex-1 py-2 rounded-cad font-semibold border ${
                deal.architecture === arch
                  ? 'bg-brand-navy text-white border-brand-navy'
                  : 'bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              Switch to {arch === 'Container' ? 'Modular Container Pods' : 'BnM Data Hall'}
            </button>
          ))}
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-cad p-3 space-y-3 text-xs">
        <h2 className="text-xs font-bold uppercase tracking-wider text-brand-navy border-b border-slate-100 pb-2 flex items-center gap-1.5">
          <Palette className="w-3.5 h-3.5 text-brand-orange" />
          Container / Rack Custom Branding &amp; Deferred Artwork Caveat
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <label className="block">
            <span className="text-[10px] font-semibold uppercase text-slate-500">Client Brand Label</span>
            <input
              type="text"
              value={deal.branding.clientName}
              onChange={(e) =>
                onPatchDeal((d) => ({ ...d, branding: { ...d.branding, clientName: e.target.value } }))
              }
              className="mt-1 w-full border border-slate-300 rounded-cad px-2.5 py-1.5"
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-semibold uppercase text-slate-500">External Shell Finish</span>
            <select
              value={deal.branding.containerFinish}
              onChange={(e) =>
                onPatchDeal((d) => ({
                  ...d,
                  branding: {
                    ...d.branding,
                    containerFinish: e.target.value as DealConfig['branding']['containerFinish']
                  }
                }))
              }
              className="mt-1 w-full border border-slate-300 rounded-cad px-2.5 py-1.5 bg-white"
            >
              <option value="Sovereign White">Sovereign White (Solar Reflective)</option>
              <option value="Matte Graphite">Matte Graphite (Industrial)</option>
              <option value="Deep Navy">Deep Navy (#002870)</option>
              <option value="Custom RAL">Custom RAL Industrial Coat</option>
            </select>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <label className="flex items-center justify-between border border-slate-200 rounded-cad px-2.5 py-1.5">
            <span className="font-semibold text-slate-700">Primary Stripe</span>
            <input
              type="color"
              value={deal.branding.primaryHex}
              onChange={(e) =>
                onPatchDeal((d) => ({ ...d, branding: { ...d.branding, primaryHex: e.target.value } }))
              }
              className="w-8 h-6 cursor-pointer"
            />
          </label>
          <label className="flex items-center justify-between border border-slate-200 rounded-cad px-2.5 py-1.5">
            <span className="font-semibold text-slate-700">Accent Trim</span>
            <input
              type="color"
              value={deal.branding.accentHex}
              onChange={(e) =>
                onPatchDeal((d) => ({ ...d, branding: { ...d.branding, accentHex: e.target.value } }))
              }
              className="w-8 h-6 cursor-pointer"
            />
          </label>
        </div>

        <div className="border border-amber-200 bg-amber-50 rounded-cad p-2.5 space-y-1.5">
          <label className="flex items-center gap-2 font-semibold text-amber-950 cursor-pointer">
            <input
              type="checkbox"
              checked={deal.branding.artworkDeferred}
              onChange={(e) =>
                onPatchDeal((d) => ({ ...d, branding: { ...d.branding, artworkDeferred: e.target.checked } }))
              }
              className="accent-brand-orange"
            />
            Include Deferred External Artwork / Livery Caveat in Proposals
          </label>
          <textarea
            rows={2}
            value={deal.branding.deferredCaveatNote}
            onChange={(e) =>
              onPatchDeal((d) => ({ ...d, branding: { ...d.branding, deferredCaveatNote: e.target.value } }))
            }
            className="w-full border border-amber-300 bg-white rounded-cad p-2 text-[11px]"
          />
        </div>
      </section>
    </div>
  );
};
