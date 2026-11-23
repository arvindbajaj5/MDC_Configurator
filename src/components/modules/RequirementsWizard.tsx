import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  RefreshCw,
  ShieldCheck
} from 'lucide-react';
import { fetchOpenMeteoEra5Climate, lookupIs1893SeismicZone } from '../../engines/climateSeismic';
import type { DealConfig, FullEngineeringOutput, SoilClass } from '../../types/schema';
import { SliderInput } from '../controls/SliderInput';

interface RequirementsWizardProps {
  deal: DealConfig;
  eng: FullEngineeringOutput;
  onPatchDeal: (updater: (d: DealConfig) => DealConfig) => void;
  onNotify: (tone: 'success' | 'error' | 'info' | 'warning', title: string, detail?: string) => void;
}

const INDIA_SITE_PRESETS = [
  { city: 'Navi Mumbai', state: 'Maharashtra', lat: 19.033, lon: 73.0297, sbc: 125, soil: 'Soft Marine Clay' as SoilClass },
  { city: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lon: 80.2707, sbc: 105, soil: 'Soft Marine Clay' as SoilClass },
  { city: 'Noida', state: 'Uttar Pradesh', lat: 28.5355, lon: 77.391, sbc: 165, soil: 'Stiff Clay' as SoilClass },
  { city: 'Hyderabad', state: 'Telangana', lat: 17.385, lon: 78.4867, sbc: 260, soil: 'Hard Rock' as SoilClass },
  { city: 'Bengaluru', state: 'Karnataka', lat: 12.9716, lon: 77.5946, sbc: 210, soil: 'Dense Gravel/Sand' as SoilClass },
  { city: 'Guwahati', state: 'Assam', lat: 26.1445, lon: 91.7362, sbc: 95, soil: 'Reclaimed Fill' as SoilClass }
];

const STEPS = [
  '1. Site & Climate',
  '2. Compute & Racks',
  '3. Thermal & DLC',
  '4. Pod vs BnM',
  '5. Power & BESS',
  '6. Civil & Soil',
  '7. Commercial'
];

export const RequirementsWizard: React.FC<RequirementsWizardProps> = ({
  deal,
  eng,
  onPatchDeal,
  onNotify
}) => {
  const [step, setStep] = useState(0);
  const [fetching, setFetching] = useState(false);

  const handlePresetCity = (p: (typeof INDIA_SITE_PRESETS)[number]) => {
    const seismic = lookupIs1893SeismicZone(p.city, p.lat, p.lon);
    onPatchDeal((d) => ({
      ...d,
      climate: {
        ...d.climate,
        city: p.city,
        state: p.state,
        latitude: p.lat,
        longitude: p.lon,
        seismicZone: seismic.zone,
        seismicZoneFactorZ: seismic.factorZ,
        source: 'Preset Baseline'
      },
      civil: {
        ...d.civil,
        soilClass: p.soil,
        soilSbcKpa: p.sbc
      }
    }));
    onNotify('info', `Site Applied: ${p.city}`, `${seismic.zone} (Z=${seismic.factorZ}) | SBC ${p.sbc} kPa`);
  };

  const handleLiveEra5 = async () => {
    setFetching(true);
    try {
      const profile = await fetchOpenMeteoEra5Climate(
        deal.climate.city,
        deal.climate.state,
        deal.climate.latitude,
        deal.climate.longitude
      );
      onPatchDeal((d) => ({ ...d, climate: profile }));
      onNotify(
        'success',
        `Open-Meteo ERA5 Synced (${profile.city})`,
        `99% DB: ${profile.designDryBulbC}°C | Rain: ${profile.annualRainfallMm} mm/yr | ${profile.seismicZone}`
      );
    } catch (err) {
      onNotify('error', 'ERA5 API Failed', err instanceof Error ? err.message : String(err));
    } finally {
      setFetching(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Compact Stepper Header */}
      <div className="bg-white border border-slate-200 rounded-cad p-2">
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {STEPS.map((label, idx) => (
            <button
              key={label}
              type="button"
              onClick={() => setStep(idx)}
              className={`px-2.5 py-1.5 text-[11px] font-semibold rounded-cad whitespace-nowrap border ${
                step === idx
                  ? 'bg-brand-navy text-white border-brand-navy'
                  : idx < step
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Step Content Card */}
      <div className="bg-white border border-slate-200 rounded-cad p-3 space-y-3">
        {step === 0 && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-brand-navy flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-brand-orange" />
                Step 1: Project Identity, Open-Meteo ERA5 &amp; IS 1893 Seismic
              </h2>
              <button
                type="button"
                disabled={fetching}
                onClick={handleLiveEra5}
                className="px-2.5 py-1 text-[11px] font-semibold bg-brand-orange text-white rounded-cad flex items-center gap-1.5 hover:bg-brand-orange/90 disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${fetching ? 'animate-spin' : ''}`} />
                Fetch Live Open-Meteo ERA5
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <label className="block">
                <span className="text-[10px] font-semibold uppercase text-slate-500">Deal / Project Name</span>
                <input
                  type="text"
                  value={deal.name}
                  onChange={(e) => onPatchDeal((d) => ({ ...d, name: e.target.value }))}
                  className="mt-1 w-full border border-slate-300 rounded-cad px-2.5 py-1.5 font-semibold text-brand-navy"
                />
              </label>
              <label className="block">
                <span className="text-[10px] font-semibold uppercase text-slate-500">Customer / Agency</span>
                <input
                  type="text"
                  value={deal.customer}
                  onChange={(e) => onPatchDeal((d) => ({ ...d, customer: e.target.value }))}
                  className="mt-1 w-full border border-slate-300 rounded-cad px-2.5 py-1.5"
                />
              </label>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase text-slate-500 mb-1.5">
                Quick India Sovereign DC Corridor Presets (Auto-Updates Lat/Lon, Seismic &amp; Soil SBC)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {INDIA_SITE_PRESETS.map((p) => (
                  <button
                    key={p.city}
                    type="button"
                    onClick={() => handlePresetCity(p)}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-cad border ${
                      deal.climate.city === p.city
                        ? 'bg-brand-navy text-white border-brand-navy'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {p.city} ({p.sbc} kPa)
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="border border-slate-200 rounded-cad p-2 bg-slate-50">
                <span className="text-[10px] text-slate-500">Design Dry-Bulb</span>
                <p className="font-mono font-bold text-brand-orange">{deal.climate.designDryBulbC}°C</p>
              </div>
              <div className="border border-slate-200 rounded-cad p-2 bg-slate-50">
                <span className="text-[10px] text-slate-500">Design Wet-Bulb</span>
                <p className="font-mono font-bold text-brand-navy">{deal.climate.designWetBulbC}°C</p>
              </div>
              <div className="border border-slate-200 rounded-cad p-2 bg-slate-50">
                <span className="text-[10px] text-slate-500">IS 1893 Seismic</span>
                <p className="font-mono font-bold text-brand-navy">
                  {deal.climate.seismicZone} (Z={deal.climate.seismicZoneFactorZ})
                </p>
              </div>
              <div className="border border-slate-200 rounded-cad p-2 bg-slate-50">
                <span className="text-[10px] text-slate-500">Monsoon Rain</span>
                <p className="font-mono font-bold text-brand-cobalt">{deal.climate.annualRainfallMm} mm/yr</p>
              </div>
            </div>
          </>
        )}

        {step === 1 && (
          <div className="space-y-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-brand-navy border-b border-slate-100 pb-2">
              Step 2: Target IT Load &amp; AI Rack Density Mix
            </h2>
            <SliderInput
              label="Target Critical IT Load"
              value={deal.targetItLoadMw}
              min={0.5}
              max={50}
              step={0.5}
              unit="MW"
              hint={`Gross Demand: ${eng.electrical.grossFacilityMw} MW / ${eng.electrical.grossFacilityMva} MVA`}
              onChange={(v) => onPatchDeal((d) => ({ ...d, targetItLoadMw: v }))}
            />
            <SliderInput
              label="Average Rack Power Density (2.5m H × 900mm W × 1200mm D)"
              value={deal.avgRackKw}
              min={30}
              max={140}
              step={5}
              unit="kW/rack"
              hint={`Total Racks: ${eng.mep.totalRacks} (${eng.mep.dlcRacks} DLC / ${eng.mep.airRacks} Air)`}
              onChange={(v) => onPatchDeal((d) => ({ ...d, avgRackKw: v }))}
            />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-brand-navy border-b border-slate-100 pb-2">
              Step 3: Direct Liquid Cooling (DLC) Split &amp; Temperature Setpoints
            </h2>
            <SliderInput
              label="Direct Liquid Cooling (DLC) Share"
              value={deal.dlcSharePct}
              min={0}
              max={95}
              step={5}
              unit="%"
              hint={`PUE ${eng.mep.estimatedPue.toFixed(2)} | ${eng.mep.internalCduCountTotal} Internal CDUs | 0 Yard CDUs`}
              onChange={(v) => onPatchDeal((d) => ({ ...d, dlcSharePct: v }))}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <SliderInput
                label="Max White-Space Air Inlet Temp"
                value={deal.maxInletTempC}
                min={20}
                max={40}
                step={1}
                unit="°C"
                hint={eng.mep.inletTempWarning ?? 'ASHRAE A2 Compliant'}
                onChange={(v) => onPatchDeal((d) => ({ ...d, maxInletTempC: v }))}
              />
              <SliderInput
                label="Secondary FWS Supply Temp (DLC)"
                value={deal.fwsSupplyTempC}
                min={20}
                max={45}
                step={1}
                unit="°C"
                hint={`FWS Flow: ${eng.mep.fwsFlowRateLpm.toLocaleString()} LPM`}
                onChange={(v) => onPatchDeal((d) => ({ ...d, fwsSupplyTempC: v }))}
              />
            </div>
            <div className="flex items-center justify-between border border-slate-200 rounded-cad p-2.5 text-xs">
              <span className="font-semibold text-slate-700">Adiabatic Chiller Placement</span>
              <div className="flex gap-1.5">
                {(['Yard', 'Roof'] as const).map((place) => (
                  <button
                    key={place}
                    type="button"
                    onClick={() => onPatchDeal((d) => ({ ...d, chillerPlacement: place }))}
                    className={`px-3 py-1 rounded-cad text-[11px] font-semibold border ${
                      deal.chillerPlacement === place
                        ? 'bg-brand-navy text-white border-brand-navy'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    {place} Mounted
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3 text-xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-brand-navy border-b border-slate-100 pb-2">
              Step 4: Container Pods vs BnM Hall &amp; Uptime Redundancy
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="border border-slate-200 rounded-cad p-2.5 space-y-1.5">
                <p className="text-[10px] font-bold uppercase text-slate-500">Enclosure Strategy</p>
                {(['Container', 'BnM'] as const).map((arch) => (
                  <button
                    key={arch}
                    type="button"
                    onClick={() => onPatchDeal((d) => ({ ...d, architecture: arch }))}
                    className={`w-full text-left px-2.5 py-1.5 rounded-cad border font-semibold ${
                      deal.architecture === arch
                        ? 'bg-brand-navy text-white border-brand-navy'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    {arch === 'Container' ? 'Prefab Modular Container Pods' : 'Brick-and-Mortar (BnM) Hall'}
                  </button>
                ))}
              </div>

              <div className="border border-slate-200 rounded-cad p-2.5 space-y-1.5">
                <p className="text-[10px] font-bold uppercase text-slate-500">Uptime Tier Target</p>
                {(['Tier II', 'Tier III', 'Tier IV'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => onPatchDeal((d) => ({ ...d, uptimeTier: t }))}
                    className={`w-full text-left px-2.5 py-1.5 rounded-cad border font-semibold ${
                      deal.uptimeTier === t
                        ? 'bg-brand-orange text-white border-brand-orange'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    Uptime {t}
                  </button>
                ))}
              </div>

              <div className="border border-slate-200 rounded-cad p-2.5 space-y-1.5">
                <p className="text-[10px] font-bold uppercase text-slate-500">MEP / Electrical Redundancy</p>
                {(['N+1', '2N', '2N+1'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => onPatchDeal((d) => ({ ...d, redundancy: r }))}
                    className={`w-full text-left px-2.5 py-1.5 rounded-cad border font-semibold ${
                      deal.redundancy === r
                        ? 'bg-brand-navy text-white border-brand-navy'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    {r} Redundancy
                  </button>
                ))}
              </div>
            </div>

            {deal.architecture === 'Container' && (
              <div className="flex items-center justify-between border border-slate-200 rounded-cad p-2.5">
                <span className="font-semibold text-slate-700">Modular Pod Unit Rating</span>
                <div className="flex gap-1.5">
                  {([0.5, 1.0, 2.0] as const).map((mw) => (
                    <button
                      key={mw}
                      type="button"
                      onClick={() => onPatchDeal((d) => ({ ...d, containerUnitMw: mw }))}
                      className={`px-3 py-1 rounded-cad font-mono font-semibold border ${
                        deal.containerUnitMw === mw
                          ? 'bg-brand-navy text-white border-brand-navy'
                          : 'bg-white text-slate-700 border-slate-300'
                      }`}
                    >
                      {mw} MW ({Math.ceil(deal.targetItLoadMw / mw)} Pods)
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-2.5 text-xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-brand-navy border-b border-slate-100 pb-2">
              Step 5: Electrical Harmonics &amp; BESS Grid Load-Drop Protection
            </h2>
            <div className="flex items-center justify-between border border-slate-200 rounded-cad p-2.5">
              <div>
                <p className="font-semibold text-slate-900">LFP BESS Grid Load-Drop Protection</p>
                <p className="text-[11px] text-slate-500">
                  Absorbs synchronous AI GPU step-load drops and shields utility substation stability.
                </p>
              </div>
              <input
                type="checkbox"
                checked={deal.includeBessRideThrough}
                onChange={(e) => onPatchDeal((d) => ({ ...d, includeBessRideThrough: e.target.checked }))}
                className="w-4 h-4 accent-brand-orange"
              />
            </div>
            {deal.includeBessRideThrough && (
              <SliderInput
                label="BESS Ride-Through / Ramp-Shield Duration"
                value={deal.bessDurationMin}
                min={10}
                max={60}
                step={5}
                unit="min"
                hint={`${eng.electrical.bessPowerMw} MW / ${eng.electrical.bessEnergyMwh} MWh LFP BESS`}
                onChange={(v) => onPatchDeal((d) => ({ ...d, bessDurationMin: v }))}
              />
            )}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="border border-slate-200 rounded-cad p-2.5 flex items-center justify-between">
                <span className="font-semibold">Transformer Harmonic Class</span>
                <div className="flex gap-1">
                  {(['K-13', 'K-20'] as const).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => onPatchDeal((d) => ({ ...d, standards: { ...d.standards, kFactorRating: k } }))}
                      className={`px-2 py-0.5 rounded-cad font-mono font-semibold border ${
                        eng.electrical.standards.kFactorRating === k
                          ? 'bg-brand-navy text-white border-brand-navy'
                          : 'bg-white border-slate-300'
                      }`}
                    >
                      {k}
                    </button>
                  ))}
                </div>
              </div>
              <div className="border border-slate-200 rounded-cad p-2.5 flex items-center justify-between">
                <span className="font-semibold">Sandwich Busduct Ingress</span>
                <div className="flex gap-1">
                  {(['IP55', 'IP65'] as const).map((ip) => (
                    <button
                      key={ip}
                      type="button"
                      onClick={() => onPatchDeal((d) => ({ ...d, standards: { ...d.standards, busductIpRating: ip } }))}
                      className={`px-2 py-0.5 rounded-cad font-mono font-semibold border ${
                        eng.electrical.standards.busductIpRating === ip
                          ? 'bg-brand-navy text-white border-brand-navy'
                          : 'bg-white border-slate-300'
                      }`}
                    >
                      {ip}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-brand-navy border-b border-slate-100 pb-2">
              Step 6: Geotechnical Soil Bearing &amp; Plinth Sizing
            </h2>
            <SliderInput
              label="Soil Safe Bearing Capacity (SBC)"
              value={deal.civil.soilSbcKpa}
              min={60}
              max={300}
              step={5}
              unit="kPa"
              hint={`${eng.civil.foundationType} | FoS ${eng.civil.bearingFoS}x`}
              onChange={(v) => onPatchDeal((d) => ({ ...d, civil: { ...d.civil, soilSbcKpa: v } }))}
            />
            <SliderInput
              label="Plinth Clear Height Above FGL"
              value={deal.civil.plinthClearHeightM}
              min={0.45}
              max={1.8}
              step={0.05}
              unit="m"
              hint={`Drainage: ${deal.civil.yardDrainageSlope} | Water Table: ${deal.civil.groundwaterDepthM}m`}
              onChange={(v) => onPatchDeal((d) => ({ ...d, civil: { ...d.civil, plinthClearHeightM: v } }))}
            />
          </div>
        )}

        {step === 6 && (
          <div className="space-y-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-brand-navy border-b border-slate-100 pb-2">
              Step 7: Commercial Power Tariff, Margin &amp; 5-Year TCO Assumptions
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <SliderInput
                label="Industrial HV Power Tariff"
                value={deal.commercial.powerTariffInrPerKwh}
                min={5.0}
                max={14.0}
                step={0.2}
                unit="₹/kWh"
                onChange={(v) => onPatchDeal((d) => ({ ...d, commercial: { ...d.commercial, powerTariffInrPerKwh: v } }))}
              />
              <SliderInput
                label="Annual Power Tariff Escalation"
                value={deal.commercial.tariffEscalationPct}
                min={0}
                max={10}
                step={0.5}
                unit="%/yr"
                onChange={(v) => onPatchDeal((d) => ({ ...d, commercial: { ...d.commercial, tariffEscalationPct: v } }))}
              />
              <SliderInput
                label="EPC / SI Margin"
                value={deal.commercial.marginPct}
                min={4}
                max={25}
                step={0.5}
                unit="%"
                onChange={(v) => onPatchDeal((d) => ({ ...d, commercial: { ...d.commercial, marginPct: v } }))}
              />
              <SliderInput
                label="Project Contingency"
                value={deal.commercial.contingencyPct}
                min={0}
                max={15}
                step={0.5}
                unit="%"
                onChange={(v) => onPatchDeal((d) => ({ ...d, commercial: { ...d.commercial, contingencyPct: v } }))}
              />
            </div>
            <div className="border border-emerald-200 bg-emerald-50 rounded-cad p-2.5 text-xs text-emerald-950 flex items-center justify-between">
              <span className="font-semibold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-brand-emerald" />
                Wizard Complete — Turnkey CapEx ₹{eng.commercial.totalCapexInrCr} Cr | 5-Yr TCO ₹{eng.commercial.totalTco5YrInrCr} Cr
              </span>
              <span className="font-mono font-bold text-brand-navy">MII {eng.commercial.weightedBoqMiiPercent}%</span>
            </div>
          </div>
        )}

        {/* Step Navigation Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <button
            type="button"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className="px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-cad bg-white hover:bg-slate-50 flex items-center gap-1 disabled:opacity-40"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Previous
          </button>
          <span className="text-[11px] font-mono text-slate-500">
            Step {step + 1} of {STEPS.length}
          </span>
          <button
            type="button"
            disabled={step === STEPS.length - 1}
            onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
            className="px-3 py-1.5 text-xs font-semibold bg-brand-navy text-white rounded-cad hover:bg-brand-navy/90 flex items-center gap-1 disabled:opacity-40"
          >
            Next <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
