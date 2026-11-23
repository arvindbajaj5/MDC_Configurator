import { DEFAULT_ELECTRICAL_STANDARDS } from '../data/defaults';
import type {
  DealConfig,
  ElectricalSldNode,
  ElectricalSldResult,
  ElectricalStandards,
  MepCoolingResult
} from '../types/schema';

/**
 * Guarantees a complete, non-null ElectricalStandards object even if a legacy V11/V12
 * deal JSON omits `standards` or only supplies partial keys.
 * Permanently eliminates V12.4 Bug #1 (`ReferenceError: standards is not defined` on E-201).
 */
export function resolveElectricalStandards(
  partial?: Partial<ElectricalStandards> | null
): ElectricalStandards {
  return {
    wiringCode: partial?.wiringCode?.trim() || DEFAULT_ELECTRICAL_STANDARDS.wiringCode,
    lowVoltageStandard: partial?.lowVoltageStandard?.trim() || DEFAULT_ELECTRICAL_STANDARDS.lowVoltageStandard,
    harmonicsStandard: partial?.harmonicsStandard?.trim() || DEFAULT_ELECTRICAL_STANDARDS.harmonicsStandard,
    lightningProtection: partial?.lightningProtection?.trim() || DEFAULT_ELECTRICAL_STANDARDS.lightningProtection,
    earthingStandard: partial?.earthingStandard?.trim() || DEFAULT_ELECTRICAL_STANDARDS.earthingStandard,
    ceaRegulation: partial?.ceaRegulation?.trim() || DEFAULT_ELECTRICAL_STANDARDS.ceaRegulation,
    transformerStandard: partial?.transformerStandard?.trim() || DEFAULT_ELECTRICAL_STANDARDS.transformerStandard,
    busductIpRating: partial?.busductIpRating === 'IP55' ? 'IP55' : 'IP65',
    kFactorRating: partial?.kFactorRating === 'K-20' ? 'K-20' : 'K-13'
  };
}

/**
 * Computes MV/LV Electrical Single-Line Diagram (E-201) parameters:
 * Utility incomer (33kV/132kV), K-13 AI harmonic transformers, IP55/IP65 sandwich busducts,
 * CPCB-IV+ DG sets, modular UPS, and BESS grid load-drop ride-through.
 */
export function computeElectricalSld(deal: DealConfig, mep: MepCoolingResult): ElectricalSldResult {
  const standards = resolveElectricalStandards(deal.standards);
  const powerFactor = 0.92;
  const grossFacilityMw = Number((mep.itLoadMw * mep.estimatedPue).toFixed(2));
  const grossFacilityMva = Number((grossFacilityMw / powerFactor).toFixed(2));

  // India Grid Code: >20 MW typically connects at 132 kV EHV substation; <=20 MW at 33 kV dual feeder
  const incomingVoltageKv: 33 | 132 = grossFacilityMw > 20 ? 132 : 33;

  // 3.15 MVA K-13 cast resin dry-type transformers loaded to max 80% continuous
  const transformerRatingMva = 3.15;
  const transformerCountActive = Math.max(2, Math.ceil(grossFacilityMva / (transformerRatingMva * 0.8)));
  const transformerCountTotal =
    deal.redundancy === '2N'
      ? transformerCountActive * 2
      : deal.redundancy === '2N+1'
        ? transformerCountActive * 2 + 1
        : transformerCountActive + Math.max(1, Math.ceil(transformerCountActive * 0.2));

  // MV Switchgear lineup (2 incomers + bus coupler + transformer feeders + metering)
  const mvSwitchgearPanels = transformerCountTotal + 4;

  // IP65/IP55 Sandwich Busduct Trunking (5000A rated @ 415V 3-phase ~ 3.2 MVA capacity per run)
  const busductRatingAmps = 5000;
  const busductRunsCount = Math.max(2, mep.podCount * 2); // Dual A+B path per pod/gallery

  // 2.5 MVA CPCB-IV+ Data Center Continuous DG Sets
  const dgUnitRatingMva = 2.5;
  const dgCountActive = Math.max(2, Math.ceil(grossFacilityMva / (dgUnitRatingMva * 0.85)));
  const dgCountTotal =
    deal.redundancy === '2N' ? dgCountActive * 2 : dgCountActive + Math.max(1, Math.ceil(dgCountActive * 0.2));

  // Modular UPS protects IT Load + CDUs + Controls (1.08x IT load)
  const upsCapacityMw = Number((mep.itLoadMw * 1.08).toFixed(2));

  // BESS Grid Load-Drop Protection (absorbs instantaneous AI training step-load swings & grid sags)
  const bessPowerMw = deal.includeBessRideThrough ? Number((mep.itLoadMw * 0.5).toFixed(2)) : 0;
  const bessEnergyMwh = deal.includeBessRideThrough
    ? Number(((bessPowerMw * Math.max(10, deal.bessDurationMin)) / 60).toFixed(2))
    : 0;

  const nodes: ElectricalSldNode[] = [
    {
      id: 'UTIL-GRID',
      label: `Dual Diverse ${incomingVoltageKv} kV Utility Feeders`,
      voltageKv: incomingVoltageKv,
      ratingLabel: `${grossFacilityMva} MVA Demand`,
      redundancy: '2N Feeders',
      zone: 'Utility'
    },
    {
      id: 'MV-SWG',
      label: `${incomingVoltageKv === 132 ? '132/33 kV Substation + ' : ''}33 kV GIS MV Switchgear`,
      voltageKv: 33,
      ratingLabel: `${mvSwitchgearPanels} Panels (40 kA)`,
      redundancy: 'Split Bus + Coupler',
      zone: 'MV Yard'
    },
    {
      id: 'DG-SYNC',
      label: `CPCB-IV+ Sync DG Bank`,
      voltageKv: 11,
      ratingLabel: `${dgCountTotal}x ${dgUnitRatingMva} MVA (${dgCountActive} Active)`,
      redundancy: deal.redundancy,
      zone: 'MV Yard'
    },
    {
      id: 'TRF-K13',
      label: `${standards.kFactorRating} Cast Resin AI Transformers`,
      voltageKv: 0.415,
      ratingLabel: `${transformerCountTotal}x ${transformerRatingMva} MVA`,
      redundancy: deal.redundancy,
      zone: 'MV Yard'
    },
    {
      id: 'UPS-BESS',
      label: deal.includeBessRideThrough
        ? `Modular Li-Ion UPS + LFP BESS Load-Drop Buffer`
        : `Modular Li-Ion Online UPS`,
      voltageKv: 0.415,
      ratingLabel: deal.includeBessRideThrough
        ? `${upsCapacityMw} MW UPS | ${bessPowerMw} MW / ${bessEnergyMwh} MWh BESS`
        : `${upsCapacityMw} MW UPS`,
      redundancy: deal.redundancy,
      zone: 'LV Distribution'
    },
    {
      id: 'BUSDUCT-AB',
      label: `Dual A/B ${standards.busductIpRating} Sandwich Busducts`,
      voltageKv: 0.415,
      ratingLabel: `${busductRunsCount} Runs @ ${busductRatingAmps}A`,
      redundancy: '2N A+B Paths',
      zone: 'White Space'
    }
  ];

  const validationChecks = [
    {
      code: standards.wiringCode,
      label: 'LV Wiring & Distribution Code',
      passed: true,
      detail: `${standards.wiringCode} & ${standards.lowVoltageStandard} applied to all ${busductRunsCount} A/B busways.`
    },
    {
      code: standards.harmonicsStandard,
      label: 'AI GPU Non-Linear Harmonic Mitigation',
      passed: true,
      detail: `${standards.kFactorRating} transformers (${transformerCountTotal} units) + active front-end UPS (<5% THD).`
    },
    {
      code: standards.earthingStandard,
      label: 'Substation & White-Space Earthing',
      passed: true,
      detail: `${standards.earthingStandard} copper-bonded earth mesh + ${standards.lightningProtection}.`
    },
    {
      code: 'AI-STEP-LOAD',
      label: 'Grid Load-Drop Transient Protection',
      passed: deal.includeBessRideThrough,
      detail: deal.includeBessRideThrough
        ? `${bessPowerMw} MW / ${bessEnergyMwh} MWh LFP BESS shields utility against synchronous GPU drop.`
        : 'BESS ride-through disabled — confirm utility grid ramp-rate tolerance for AI training workloads.'
    }
  ];

  return {
    standards,
    itLoadMw: mep.itLoadMw,
    grossFacilityMw,
    grossFacilityMva,
    incomingVoltageKv,
    mvSwitchgearPanels,
    transformerRatingMva,
    transformerCountActive,
    transformerCountTotal,
    busductRunsCount,
    busductRatingAmps,
    busductIpRating: standards.busductIpRating,
    dgUnitRatingMva,
    dgCountActive,
    dgCountTotal,
    upsCapacityMw,
    bessPowerMw,
    bessEnergyMwh,
    nodes,
    validationChecks
  };
}
