import type { CivilPlinthResult, DealConfig, MepCoolingResult } from '../types/schema';

const PILE_SBC_THRESHOLD_KPA = 110;
const PILE_CAP_DEPTH_M = 4.5;
const PILE_DIAMETER_MM = 450;
const SINGLE_PILE_SAFE_LOAD_KN = 450; // 450mm bored cast-in-situ RCC pile safe working capacity

/**
 * Typed Civil, Plinth & Foundation Bearing Engine (C-101).
 * Automatically switches from 1.35–1.80m RCC Plinth/Raft to 4.5m RCC Pile Cap
 * whenever Soil Safe Bearing Capacity (SBC) falls below 110 kPa.
 */
export function computeCivilPlinth(deal: DealConfig, mep: MepCoolingResult): CivilPlinthResult {
  const sbc = Math.max(40, deal.civil.soilSbcKpa);
  const requiresPiling = sbc < PILE_SBC_THRESHOLD_KPA;
  const zFactor = deal.climate.seismicZoneFactorZ;

  // Calculate total vertical gravity load (Dead + Live) in kN
  // 100 kW liquid-cooled AI rack ~ 1,650 kg (~16.2 kN); pod steel shell ~ 38 tons (~373 kN)
  const rackLoadKn = mep.totalRacks * 16.5;
  const cduAndPacLoadKn = mep.internalCduCountTotal * 16 + mep.pacCountTotal * 9;
  const enclosureLoadKn =
    deal.architecture === 'Container'
      ? mep.podCount * (deal.containerUnitMw === 2.0 ? 375 : deal.containerUnitMw === 1.0 ? 235 : 175)
      : mep.whiteSpaceAreaM2 * (deal.civil.bnmSlabLiveLoadKpa * 0.45);
  const chillerYardLoadKn = mep.chillerCountTotal * 165;
  const structuralSelfWeightFactor = 1.28; // Plinth/raft concrete + seismic overturning margin

  const totalDeadAndLiveLoadKn = Math.round(
    (rackLoadKn + cduAndPacLoadKn + enclosureLoadKn + chillerYardLoadKn) * structuralSelfWeightFactor
  );

  // Bearing footprint area (pod plinth pads + yard equipment pads, or BnM raft slab)
  const footprintAreaM2 =
    deal.architecture === 'Container'
      ? Math.max(40, Math.round(mep.podCount * (deal.containerUnitMw === 2.0 ? 92 : 54) + mep.chillerCountTotal * 26))
      : Math.max(80, Math.round(mep.whiteSpaceAreaM2 * 1.12));

  // Imposed bearing pressure in kN/m2 (= kPa)
  const imposedBearingKpa = Number((totalDeadAndLiveLoadKn / footprintAreaM2).toFixed(1));

  // Foundation embedment depth & pile count
  let embedmentDepthM: number;
  let pileCount = 0;
  let pileLengthM = 0;
  let effectiveCapacityKpa = sbc;

  if (requiresPiling) {
    embedmentDepthM = PILE_CAP_DEPTH_M;
    pileLengthM = sbc < 75 ? 12.0 : 9.0; // Friction/end-bearing bore depth below 4.5m cap
    // Size piles with 1.35x seismic & group efficiency factor
    pileCount = Math.max(8, Math.ceil((totalDeadAndLiveLoadKn * (1.25 + zFactor)) / SINGLE_PILE_SAFE_LOAD_KN));
    effectiveCapacityKpa = Number(((pileCount * SINGLE_PILE_SAFE_LOAD_KN) / footprintAreaM2).toFixed(1));
  } else {
    // Embedment scales smoothly between 1.35m and 1.80m based on SBC and seismic zone
    if (sbc >= 220 && zFactor <= 0.16) {
      embedmentDepthM = 1.35;
    } else if (sbc >= 150) {
      embedmentDepthM = 1.55;
    } else {
      embedmentDepthM = 1.8;
    }
    if (zFactor >= 0.24) {
      embedmentDepthM = Math.min(1.8, Number((embedmentDepthM + 0.15).toFixed(2)));
    }
  }

  // Bearing Safety Factor (FoS)
  const bearingFoS = Number((effectiveCapacityKpa / Math.max(1, imposedBearingKpa)).toFixed(2));
  const fosStatus: CivilPlinthResult['fosStatus'] = requiresPiling
    ? 'PILE_MITIGATED'
    : bearingFoS >= 2.0
      ? 'PASS'
      : 'MARGINAL';

  // Concrete (M35 grade) & Fe550D rebar volume estimation
  const slabThicknessM = requiresPiling ? 0.65 : deal.architecture === 'BnM' ? 0.45 : 0.35;
  const plinthHeightM = Math.max(0.45, deal.civil.plinthClearHeightM);
  const concreteVolumeM3 = Math.round(
    footprintAreaM2 * (slabThicknessM + plinthHeightM * 0.35) +
      pileCount * (Math.PI * Math.pow(PILE_DIAMETER_MM / 2000, 2) * (pileLengthM + PILE_CAP_DEPTH_M))
  );
  const rebarKgPerM3 = requiresPiling ? 145 : zFactor >= 0.24 ? 130 : 110;
  const rebarTonnageMt = Number(((concreteVolumeM3 * rebarKgPerM3) / 1000).toFixed(1));

  // Seismic anchorage specification (IS 1893:2016)
  const anchorBoltSpec =
    zFactor >= 0.24
      ? 'M30 Gr 8.8 HDG Chemical/Cast-in Seismic Anchors @ 1.2m c/c (Zone IV/V)'
      : 'M24 Gr 8.8 HDG Cast-in Seismic Anchors @ 1.5m c/c (Zone II/III)';

  // Civil Cost Model (INR Cr): Base civil/plinth/drainage/roads + Pile Cap Adder
  const civilBaseCostInrCr = Number(
    (
      (concreteVolumeM3 * 0.00145) + // M35 concrete + formwork
      (rebarTonnageMt * 0.0082) +    // Fe550D rebar supplied & fixed
      (mep.totalSiteAreaM2 * 0.00038) // 1:50 stormwater grading, compound wall, fire tender road
    ).toFixed(2)
  );

  const pileAdderInrCr = requiresPiling
    ? Number(((pileCount * 0.0185) + (footprintAreaM2 * 0.0012)).toFixed(2))
    : 0;

  const civilTotalCostInrCr = Number((civilBaseCostInrCr + pileAdderInrCr).toFixed(2));

  const advisoryNotes: string[] = [];
  if (requiresPiling) {
    advisoryNotes.push(
      `Soil SBC (${sbc} kPa) < 110 kPa threshold: switched to 4.5m RCC Pile Cap with ${pileCount}x ${PILE_DIAMETER_MM}mm piles (+₹${pileAdderInrCr} Cr).`
    );
  } else {
    advisoryNotes.push(
      `Shallow RCC Plinth/Raft (${embedmentDepthM}m below FGL) valid at SBC ${sbc} kPa with FoS ${bearingFoS}.`
    );
  }
  if (deal.civil.groundwaterDepthM <= 2.5) {
    advisoryNotes.push(
      `High water table (${deal.civil.groundwaterDepthM}m): specify sulphate-resistant M35 concrete & crystalline waterproofing.`
    );
  }
  if (deal.architecture === 'BnM' && deal.civil.bnmClearHeightM < 6.0) {
    advisoryNotes.push(
      `BnM clear height (${deal.civil.bnmClearHeightM}m) below 6.0m recommendation for 2.5m AI racks + overhead FWS/busduct trays.`
    );
  }
  if (deal.climate.annualRainfallMm > 1800) {
    advisoryNotes.push(
      `Tropical monsoon rainfall (${deal.climate.annualRainfallMm} mm/yr): enforce ${deal.civil.yardDrainageSlope} yard slope & >= ${Math.max(0.9, plinthHeightM).toFixed(1)}m FGL plinth.`
    );
  }

  return {
    foundationType: requiresPiling ? '4.5m RCC Pile Cap Foundation' : 'RCC Plinth / Raft',
    requiresPiling,
    embedmentDepthM,
    pileLengthM,
    pileDiameterMm: PILE_DIAMETER_MM,
    pileCount,
    totalDeadAndLiveLoadKn,
    footprintAreaM2,
    imposedBearingKpa,
    allowableSbcKpa: sbc,
    effectiveCapacityKpa,
    bearingFoS,
    fosStatus,
    concreteVolumeM3,
    rebarTonnageMt,
    anchorBoltSpec,
    drainageSlope: deal.civil.yardDrainageSlope,
    pileAdderInrCr,
    civilBaseCostInrCr,
    civilTotalCostInrCr,
    advisoryNotes
  };
}
