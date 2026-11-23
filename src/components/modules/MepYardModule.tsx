import React from 'react';
import { Droplets, Shield, Zap } from 'lucide-react';
import type { DealConfig, FullEngineeringOutput } from '../../types/schema';

interface MepYardModuleProps {
  deal: DealConfig;
  eng: FullEngineeringOutput;
}

export const MepYardModule: React.FC<MepYardModuleProps> = ({ deal, eng }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs">
      <section className="bg-white border border-slate-200 rounded-cad p-3 space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-brand-navy border-b border-slate-100 pb-2 flex items-center gap-1.5">
          <Droplets className="w-3.5 h-3.5 text-brand-cobalt" />
          3-Zone Isolation &amp; Hydronic Cooling Balance
        </h2>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="border border-emerald-200 bg-emerald-50/50 rounded-cad p-2">
            <p className="text-[10px] text-slate-600 font-semibold">Zone 1 White-Space</p>
            <p className="font-mono text-sm font-bold text-brand-emerald">
              {eng.mep.threeZoneIsolation.zone1WhiteSpaceM2} m²
            </p>
          </div>
          <div className="border border-blue-200 bg-blue-50/50 rounded-cad p-2">
            <p className="text-[10px] text-slate-600 font-semibold">Zone 2 Cooling ({deal.chillerPlacement})</p>
            <p className="font-mono text-sm font-bold text-brand-cobalt">
              {eng.mep.threeZoneIsolation.zone2HeatRejectionYardM2} m²
            </p>
          </div>
          <div className="border border-orange-200 bg-orange-50/50 rounded-cad p-2">
            <p className="text-[10px] text-slate-600 font-semibold">Zone 3 Power Yard</p>
            <p className="font-mono text-sm font-bold text-brand-orange">
              {eng.mep.threeZoneIsolation.zone3ElectricalPowerYardM2} m²
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 font-mono">
          <div className="border border-slate-200 rounded-cad p-2">
            <span className="text-[10px] text-slate-500">FWS Secondary Flow</span>
            <p className="font-bold text-brand-navy">{eng.mep.fwsFlowRateLpm.toLocaleString()} LPM @ {deal.fwsSupplyTempC}°C</p>
          </div>
          <div className="border border-slate-200 rounded-cad p-2">
            <span className="text-[10px] text-slate-500">CHW Primary Flow</span>
            <p className="font-bold text-brand-navy">{eng.mep.chwFlowRateLpm.toLocaleString()} LPM @ {deal.chilledWaterSupplyTempC}°C</p>
          </div>
          <div className="border border-slate-200 rounded-cad p-2">
            <span className="text-[10px] text-slate-500">Total Heat Rejection</span>
            <p className="font-bold text-brand-orange">{eng.mep.totalHeatRejectionMw} MW</p>
          </div>
          <div className="border border-slate-200 rounded-cad p-2">
            <span className="text-[10px] text-slate-500">Peak Adiabatic Water</span>
            <p className="font-bold text-brand-cobalt">{eng.mep.annualWaterConsumptionKl.toLocaleString()} kL/yr</p>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-2">
          <p className="text-[10px] font-bold uppercase text-slate-500 mb-1.5 flex items-center gap-1">
            <Shield className="w-3 h-3 text-brand-emerald" />
            Mandatory Safety &amp; Environmental Compliance Gear
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono">
            <div className="bg-slate-50 border border-slate-200 rounded-cad p-2">
              <p className="text-[10px] text-slate-500">VESDA-E</p>
              <p className="font-bold text-brand-navy">{eng.mep.complianceGear.vesdaDetectors}</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-cad p-2">
              <p className="text-[10px] text-slate-500">ISA G1 Scrubbers</p>
              <p className="font-bold text-brand-navy">{eng.mep.complianceGear.chemicalAirScrubbers}</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-cad p-2">
              <p className="text-[10px] text-slate-500">IP67 CCTV</p>
              <p className="font-bold text-brand-navy">{eng.mep.complianceGear.cctvCameras}</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-cad p-2">
              <p className="text-[10px] text-slate-500">Rodent Grid</p>
              <p className="font-bold text-brand-navy">{eng.mep.complianceGear.rodentRepellentUnits}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-cad p-3 space-y-2.5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-brand-navy border-b border-slate-100 pb-2 flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-brand-orange" />
          Electrical SLD Chain &amp; Code Verification
        </h2>
        <div className="space-y-1.5">
          {eng.electrical.nodes.map((node) => (
            <div key={node.id} className="border border-slate-200 rounded-cad px-2.5 py-1.5 flex items-center justify-between">
              <div>
                <span className="font-mono text-[10px] text-brand-orange font-bold">{node.zone}</span>
                <p className="font-semibold text-slate-900">{node.label}</p>
              </div>
              <div className="text-right font-mono">
                <p className="font-bold text-brand-navy">{node.ratingLabel}</p>
                <p className="text-[10px] text-slate-500">{node.redundancy}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
