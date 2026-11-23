import React from 'react';
import { Network, ShieldAlert, ShieldCheck } from 'lucide-react';
import type { DealConfig } from '../../types/schema';
import { SliderInput } from '../controls/SliderInput';

interface TelecomMmrModuleProps {
  deal: DealConfig;
  onPatchDeal: (updater: (d: DealConfig) => DealConfig) => void;
}

export const TelecomMmrModule: React.FC<TelecomMmrModuleProps> = ({ deal, onPatchDeal }) => {
  const diversePass = deal.telecom.diverseVaultSeparationM >= 20 && deal.telecom.mmrCount >= 2;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs">
      <section className="bg-white border border-slate-200 rounded-cad p-3 space-y-2.5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-brand-navy border-b border-slate-100 pb-2 flex items-center gap-1.5">
          <Network className="w-3.5 h-3.5 text-brand-orange" />
          Telecom &amp; Carrier Meet-Me Room (MMR) Configurator
        </h2>
        <SliderInput
          label="Meet-Me Rooms (MMRs)"
          value={deal.telecom.mmrCount}
          min={1}
          max={4}
          step={1}
          unit="Rooms"
          hint="TIA-942-B Tier III/IV requires >= 2 diverse MMRs"
          onChange={(v) => onPatchDeal((d) => ({ ...d, telecom: { ...d.telecom, mmrCount: v } }))}
        />
        <SliderInput
          label="Diverse Underground Fiber Vault Separation"
          value={deal.telecom.diverseVaultSeparationM}
          min={10}
          max={60}
          step={2}
          unit="m"
          hint="Minimum 20m physical separation required"
          onChange={(v) =>
            onPatchDeal((d) => ({ ...d, telecom: { ...d.telecom, diverseVaultSeparationM: v } }))
          }
        />
        <SliderInput
          label="High-Density ODF Bays per MMR"
          value={deal.telecom.odfBaysPerMmr}
          min={2}
          max={16}
          step={1}
          unit="Bays"
          onChange={(v) => onPatchDeal((d) => ({ ...d, telecom: { ...d.telecom, odfBaysPerMmr: v } }))}
        />
        <SliderInput
          label="Carrier Demarcation Racks"
          value={deal.telecom.carrierDemarcRacks}
          min={2}
          max={24}
          step={2}
          unit="Racks"
          onChange={(v) =>
            onPatchDeal((d) => ({ ...d, telecom: { ...d.telecom, carrierDemarcRacks: v } }))
          }
        />
      </section>

      <section className="bg-white border border-slate-200 rounded-cad p-3 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-brand-navy border-b border-slate-100 pb-2">
          TIA-942-B Carrier Diversity Status (Feeds A-101 &amp; BOQ-CMP)
        </h3>
        <div
          className={`border rounded-cad p-3 ${
            diversePass ? 'border-emerald-200 bg-emerald-50 text-emerald-950' : 'border-amber-300 bg-amber-50 text-amber-950'
          }`}
        >
          <p className="font-bold flex items-center gap-1.5">
            {diversePass ? (
              <ShieldCheck className="w-4 h-4 text-brand-emerald" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-amber-600" />
            )}
            {diversePass ? 'DUAL DIVERSE CARRIER INGRESS VERIFIED' : 'BELOW TIA-942-B DIVERSITY THRESHOLD'}
          </p>
          <p className="mt-1 text-[11px]">
            {deal.telecom.mmrCount} MMRs • {deal.telecom.diverseVaultSeparationM}m underground vault split •{' '}
            {deal.telecom.mmrCount * deal.telecom.odfBaysPerMmr} total ODF bays • {deal.telecom.carrierDemarcRacks}{' '}
            carrier demarcation racks.
          </p>
        </div>

        <div className="border border-slate-200 rounded-cad p-2.5 bg-slate-50 font-mono text-[11px] space-y-1">
          <p><strong>Conduit Ingress:</strong> 2x 8-Way 110mm HDPE Sub-Ducts (East + West Entrances)</p>
          <p><strong>Backbone Ready:</strong> 400G/800G OS2 Single-Mode + RoCEv2/InfiniBand Spine Patch</p>
          <p><strong>Security:</strong> Biometric MMR Access + Separate Carrier Escort Corridor</p>
        </div>
      </section>
    </div>
  );
};
