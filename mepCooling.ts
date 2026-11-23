import type { DealConfig, MepCoolingResult } from '../types/schema';

const CDU_UNIT_CAPACITY_KW = 1350; // 1.35 MW internal liquid-to-liquid CDU tower
const MANDATORY_PAC_UNIT_KW = 80 as const; // Mandatory 80 kW chilled-water PACs
const CHILLER_UNIT_MW = 2.2; // 2.2 MW adiabatic free-cooling magnetic bearing chiller

function getRedundantCount(active: number, redundancy: DealConfig['redundancy']): number {
  if (redundancy === '2N') return active * 2;
  if (redundancy === '2N+1') return active * 2 + 1;
  // N+1 default
  return active + Math.max(1, Math.ceil(active * 0.15));
}

/**
 * Computes White-Space rack/pod sizing, DLC/Air thermal split, mandatory 80 kW PACs,
 * internal-only CDU towers (ZERO yard CDUs), yard/roof adiabatic chillers,
 * 3-zone isolation areas, FWS/CHW flow rates (LPM), and dynamic PUE.
 */
export function computeMepCooling(deal: DealConfig): MepCoolingResult {
  const itLoadMw = Math.max(0.5, deal.targetItLoadMw);
  const dlcShare = Math.min(95, Math.max(0, deal.dlcSharePct)) / 100;
  const airShare = 1 - dlcShare;

  const dlcHeatLoadMw = Number((itLoadMw * dlcShare).toFixed(3));
  const airHeatLoadMw = Number((itLoadMw * airShare).toFixed(3));

  // Rack mix based on average rack power density (2.5m H x 900mm W x 1200mm D)
  const avgRackKw = Math.max(15, deal.avgRackKw);
  const totalRacks = Math.max(1, Math.ceil((itLoadMw * 1000) / avgRackKw));
  const dlcRacks = Math.round(totalRacks * dlcShare);
  const airRacks = Math.max(0, totalRacks - dlcRacks);

  // Pod count (Container architecture uses 0.5 / 1.0 / 2.0 MW pods; BnM groups into 2 MW data hall bays)
  const effectiveUnitMw = deal.architecture === 'Container' ? deal.containerUnitMw : 2.0;
  const podCount = Math.max(1, Math.ceil(itLoadMw / effectiveUnitMw));

  // Internal CDU Towers (STRICT INVARIANT: ZERO YARD CDUs)
  const yardCduCount = 0 as const;
  const internalCduCountActive = dlcHeatLoadMw > 0 ? Math.max(1, Math.ceil((dlcHeatLoadMw * 1000) / CDU_UNIT_CAPACITY_KW)) : 0;
  const internalCduCountTotal =
    internalCduCountActive > 0 ? getRedundantCount(internalCduCountActive, deal.redundancy) : 0;

  // Mandatory 80 kW PACs: cover air-cooled IT load + 12% residual heat leakage from DLC racks + latent dehumidification
  const residualLeakageKw = dlcHeatLoadMw * 1000 * 0.12;
  const latentDehumKw = itLoadMw * 1000 * (deal.climate.designWetBulbC >= 26 ? 0.04 : 0.02);
  const totalAirSensibleAndLatentKw = airHeatLoadMw * 1000 + residualLeakageKw + latentDehumKw;
  const pacCountActive = Math.max(podCount, Math.ceil(totalAirSensibleAndLatentKw / MANDATORY_PAC_UNIT_KW));
  const pacCountTotal = getRedundantCount(pacCountActive, deal.redundancy);

  // Dynamic PUE model sensitive to DLC share, ambient dry-bulb, FWS supply temp, and BESS/UPS topology
  const baseOverhead = 0.095; // Electrical losses (transformers, busduct, UPS)
  const coolingOverhead =
    0.26 * airShare +
    0.085 * dlcShare +
    Math.max(0, (deal.climate.designDryBulbC - 32) * 0.0045) -
    Math.max(0, (deal.fwsSupplyTempC - 28) * 0.003);
  const bnmBonus = deal.architecture === 'BnM' ? -0.01 : 0;
  const estimatedPue = Number(Math.min(1.75, Math.max(1.12, 1 + baseOverhead + coolingOverhead + bnmBonus)).toFixed(3));

  // Total heat rejection = IT Load + electrical distribution & pump/fan thermal losses (~65% of non-IT overhead)
  const totalHeatRejectionMw = Number((itLoadMw * (1 + (estimatedPue - 1) * 0.65)).toFixed(2));

  // Roof/Yard Adiabatic Chillers
  const chillerCountActive = Math.max(1, Math.ceil(totalHeatRejectionMw / CHILLER_UNIT_MW));
  const chillerCountTotal = getRedundantCount(chillerCountActive, deal.redundancy);

  // Flow rates: Q(kW) = m_dot * Cp(4.186 kJ/kgK) * dT => LPM = (kW * 60) / (4.186 * dT)
  const fwsDeltaTC = 8.0; // PG25 / FWS loop delta-T across CDU
  const chwDeltaTC = 6.0; // Primary chilled water delta-T
  const fwsFlowRateLpm = Math.round(((dlcHeatLoadMw * 1000) * 60) / (3.95 * fwsDeltaTC));
  const chwFlowRateLpm = Math.round(((totalHeatRejectionMw * 1000) * 60) / (4.186 * chwDeltaTC));

  // Adiabatic trim water usage during peak ambient hours (~1,400 hrs/yr in India tropical climate)
  const adiabaticHoursPerYear = deal.climate.designDryBulbC >= 36 ? 1600 : 1100;
  const annualWaterConsumptionKl = Math.round(totalHeatRejectionMw * 0.85 * adiabaticHoursPerYear);

  // 3-Zone Isolation Layout Areas (m2)
  const zone1WhiteSpaceM2 =
    deal.architecture === 'Container'
      ? Math.round(podCount * (deal.containerUnitMw === 2.0 ? 82 : deal.containerUnitMw === 1.0 ? 46 : 36) * 1.45)
      : Math.round(totalRacks * 4.4 + internalCduCountTotal * 6 + pacCountTotal * 5);

  const zone2HeatRejectionYardM2 =
    deal.chillerPlacement === 'Roof'
      ? Math.round(chillerCountTotal * 14 + 120) // Pump skids + buffer tanks at grade
      : Math.round(chillerCountTotal * 48 + 160); // Full chiller yard + acoustic screening

  const zone3ElectricalPowerYardM2 = Math.round(
    itLoadMw * 32 + (deal.includeBessRideThrough ? Math.ceil(itLoadMw / 2.5) * 34 : 0) + 180
  );

  // Circulation roads, fire tender perimeter (6m NBC clear), MMR vaults
  const circulationAndSetbackM2 = Math.round((zone1WhiteSpaceM2 + zone2HeatRejectionYardM2 + zone3ElectricalPowerYardM2) * 0.42);
  const totalSiteAreaM2 =
    zone1WhiteSpaceM2 + zone2HeatRejectionYardM2 + zone3ElectricalPowerYardM2 + circulationAndSetbackM2;

  // Compliance Gear (VESDA, Chemical Air Scrubbers for coastal/industrial India, CCTV, Rodent Repellent)
  const isCoastalOrIndustrial = deal.climate.annualRainfallMm > 1500 || deal.climate.city.toLowerCase().includes('mumbai');
  const complianceGear = {
    vesdaDetectors: Math.max(2, podCount * 2),
    chemicalAirScrubbers: Math.max(2, Math.ceil(podCount * (isCoastalOrIndustrial ? 1.0 : 0.5))),
    cctvCameras: Math.max(12, Math.ceil(totalSiteAreaM2 / 180)),
    rodentRepellentUnits: Math.max(6, podCount * 2 + 4)
  };

  let inletTempWarning: string | null = null;
  if (deal.maxInletTempC > 35) {
    inletTempWarning = `Max inlet ${deal.maxInletTempC}°C exceeds ASHRAE A2 (35°C) envelope — verify GPU OEM warranty.`;
  } else if (deal.fwsSupplyTempC > 40) {
    inletTempWarning = `FWS supply ${deal.fwsSupplyTempC}°C requires ASHRAE W4-rated cold plates.`;
  }

  return {
    itLoadMw,
    dlcHeatLoadMw,
    airHeatLoadMw,
    totalHeatRejectionMw,
    estimatedPue,
    totalRacks,
    dlcRacks,
    airRacks,
    podCount,
    whiteSpaceAreaM2: zone1WhiteSpaceM2,
    totalSiteAreaM2,
    yardCduCount,
    internalCduCountActive,
    internalCduCountTotal,
    cduUnitCapacityKw: CDU_UNIT_CAPACITY_KW,
    mandatoryPacUnitKw: MANDATORY_PAC_UNIT_KW,
    pacCountActive,
    pacCountTotal,
    chillerUnitMw: CHILLER_UNIT_MW,
    chillerCountActive,
    chillerCountTotal,
    chillerPlacement: deal.chillerPlacement,
    fwsFlowRateLpm,
    chwFlowRateLpm,
    annualWaterConsumptionKl,
    threeZoneIsolation: {
      zone1WhiteSpaceM2,
      zone2HeatRejectionYardM2,
      zone3ElectricalPowerYardM2
    },
    complianceGear,
    inletTempWarning
  };
}
