import { INITIAL_STANDARDS, V12_CATALOG_EXPANSIONS } from '../data/masterCatalog';
import { DEFAULT_SUPPLY_CHAIN_V13 } from '../data/supplyChainSeed';
import type {
  ActiveRackInstance,
  BomLineItem,
  ContainerPod,
  CurrencyCode,
  EngineeringResult,
  MasterStandards,
  NonItCatalogItem,
  PlaceholderSku,
  ProjectDeal,
  RackSku,
  SupplyChainSku,
  SupplySynthesisMatch,
  UnitDatasheet,
  ValidationCheck
} from '../types/mdc';
import { synthesizeMonthlyClimate } from './climateSeismic';
import { sanitizeProject } from './storageAdapter';
import { calcRedundantUnits, matchOrSynthesizeSubsystem } from './supplyMatcher';

export function formatMoney(
  valInr: number,
  currency: CurrencyCode = 'INR',
  standards: MasterStandards = INITIAL_STANDARDS
): string {
  if (currency === 'USD') {
    const v = valInr / (standards.usdRate || 84);
    return '$' + (v >= 1e6 ? (v / 1e6).toFixed(2) + 'M' : Math.round(v).toLocaleString('en-US'));
  }
  if (currency === 'EUR') {
    const v = valInr / (standards.eurRate || 91);
    return '€' + (v >= 1e6 ? (v / 1e6).toFixed(2) + 'M' : Math.round(v).toLocaleString('en-US'));
  }
  if (valInr >= 1e7) return '₹' + (valInr / 1e7).toFixed(2) + ' Cr';
  if (valInr >= 1e5) return '₹' + (valInr / 1e5).toFixed(2) + ' L';
  return '₹' + Math.round(valInr).toLocaleString('en-IN');
}

export function totalHsdK(litres: number): string {
  return (litres / 1000).toFixed(1);
}

/**
 * Generates an auto-drafted Stage 2 configuration from Stage 1 inputs + Supply Chain DB.
 * Uses the ±20% / <=8 active units matcher and persists clean selections without mutating Master Catalog.
 */
export function buildFirstDraftPatch(
  rawProject: ProjectDeal,
  skus: RackSku[],
  nonItCatalog: NonItCatalogItem[],
  standards: MasterStandards,
  supplyItems: SupplyChainSku[] = DEFAULT_SUPPLY_CHAIN_V13.items
): Partial<ProjectDeal> {
  const project = sanitizeProject(rawProject, standards);
  const skuMap = Object.fromEntries(skus.map(s => [s.id, s]));

  let anyRacks = false;
  let anyDlc = false;
  let anyExtCdu = false;
  Object.entries(project.rackQuantities || {}).forEach(([id, q]) => {
    const qty = Number(q) || 0;
    const s = skuMap[id];
    if (s && qty > 0) {
      anyRacks = true;
      const isDlc = s.coolingType === 'DLC' || (Number(s.liquidSplitPct) || 0) > 0;
      if (isDlc) anyDlc = true;
      if (isDlc && !s.cduIntegrated) anyExtCdu = true;
    }
  });

  // Enable full mission-critical scope automatically on First-Draft Design
  const seeded: ProjectDeal = {
    ...project,
    includeTransformer: anyRacks,
    includeHtVcb: anyRacks,
    includeLvSwitchgear: anyRacks,
    includeIntelligentRpdu: anyRacks,
    includeUpsContainer: anyRacks,
    includeBatteryContainer: anyRacks,
    includeDgYard: anyRacks,
    includeIntegratedBms: anyRacks,
    includeLeakRope: anyDlc,
    includeVesdaFire: anyRacks,
    includeCctvSecurity: anyRacks,
    includeLiquidLoop: anyDlc,
    includeExtCdu: anyExtCdu,
    includePumpSkids: anyDlc,
    includeWaterTanks: anyDlc,
    includeGlycolDosing: anyDlc,
    includeRoomDehum: anyRacks,
    includeInstallation: anyRacks,
    includeAmcContract: anyRacks
  };

  const previewEng = computeEngineeringV13(seeded, skus, nonItCatalog, standards, supplyItems);
  const pickMasterBlock = (group: string, demand: number, fallbackId: string): string => {
    const options = [...nonItCatalog, ...V12_CATALOG_EXPANSIONS].filter(i => i.group === group && i.ratedCapacity > 0);
    if (!options.length || demand <= 0) return fallbackId;
    let best = options[0];
    let bestScore = Infinity;
    options.forEach(opt => {
      const calc = calcRedundantUnits(demand, opt.ratedCapacity, seeded.uptimeTier);
      const count = group === 'dg' ? Math.max(2, calc.total) : calc.total;
      const score = count * opt.cost + count * (opt.footprintSqm || 15) * 25000;
      if (score < bestScore) {
        bestScore = score;
        best = opt;
      }
    });
    return best.id;
  };

  return {
    status: 'Drafted',
    firstDraftGeneratedAt: new Date().toISOString(),
    includeTransformer: seeded.includeTransformer,
    includeHtVcb: seeded.includeHtVcb,
    includeLvSwitchgear: seeded.includeLvSwitchgear,
    includeIntelligentRpdu: seeded.includeIntelligentRpdu,
    includeUpsContainer: seeded.includeUpsContainer,
    includeBatteryContainer: seeded.includeBatteryContainer,
    includeDgYard: seeded.includeDgYard,
    includeIntegratedBms: seeded.includeIntegratedBms,
    includeLeakRope: seeded.includeLeakRope,
    includeVesdaFire: seeded.includeVesdaFire,
    includeCctvSecurity: seeded.includeCctvSecurity,
    includeLiquidLoop: seeded.includeLiquidLoop,
    includeExtCdu: seeded.includeExtCdu,
    includePumpSkids: seeded.includePumpSkids,
    includeWaterTanks: seeded.includeWaterTanks,
    includeGlycolDosing: seeded.includeGlycolDosing,
    includeRoomDehum: seeded.includeRoomDehum,
    includeInstallation: seeded.includeInstallation,
    includeAmcContract: seeded.includeAmcContract,
    selectedTrafoId: pickMasterBlock('trafo', previewEng.totalFacilityPeakKva, seeded.selectedTrafoId),
    selectedUpsId: pickMasterBlock('ups', previewEng.upsCriticalLoadKva, seeded.selectedUpsId),
    selectedDgId: pickMasterBlock('dg', previewEng.totalFacilityPeakKva, seeded.selectedDgId),
    selectedCoolerId: pickMasterBlock('cooler', previewEng.totalLiquidKw, seeded.selectedCoolerId),
    selectedCduId: pickMasterBlock('cdu', previewEng.extCduRequiredKw, seeded.selectedCduId),
    selectedTankId: pickMasterBlock('tank', previewEng.reqWaterKl || 25, seeded.selectedTankId),
    solutionQtyOverrides: {}
  };
}

/**
 * V13.1 Unified Master Engineering Engine
 * - Preserves 100% V11/V12 calculation fidelity (rack packing, 12-month ASHRAE, white-space PAC/CDU,
 *   Civil Plinth / 4.5m Pile Cap & FoS, Telecom MMR, Logistics/Crane Rigging, MII, L1-L5 Commissioning).
 * - Adds ±20% / <=8 active-unit Supply Chain auto-synthesis & deal-local [PLACEHOLDER] SKU generation.
 * - Supports inline deal-local SKU overrides & Special Vendor Quotes.
 * - Evaluates SOFT Validation Gate (PASS/WARN/FAIL with Accept Deviation / Waive notes; never hard-blocks Stage 3).
 */
export function computeEngineeringV13(
  rawProject: ProjectDeal,
  skus: RackSku[],
  nonItCatalog: NonItCatalogItem[],
  standards: MasterStandards = INITIAL_STANDARDS,
  supplyItems: SupplyChainSku[] = DEFAULT_SUPPLY_CHAIN_V13.items
): EngineeringResult {
  const project = sanitizeProject(rawProject, standards);
  const fullCatalog: NonItCatalogItem[] = [
    ...nonItCatalog.map(i => ({ miiPct: i.miiPct ?? 82, origin: i.origin ?? 'India', ...i })),
    ...V12_CATALOG_EXPANSIONS.filter(exp => !nonItCatalog.some(base => base.id === exp.id))
  ];

  const skuMap = Object.fromEntries(skus.map(s => [s.id, s]));
  const catMap = Object.fromEntries(fullCatalog.map(item => [item.id, item]));
  const ovQty = project.solutionQtyOverrides || {};
  const inlineOv = project.inlineSkuOverrides || {};

  // 1. IT RACK AGGREGATION & GOVERNING MAX INLET TEMP
  const activeRacks: ActiveRackInstance[] = [];
  let totalNameplatePeakKw = 0;
  let totalDesignContKw = 0;
  let totalActualKw = 0;
  let dlcDesignKw = 0;
  let acDesignKw = 0;
  let totalLiquidKw = 0;
  let totalAirKw = 0;
  let totalFlowLpm = 0;
  let maxReqDeltaPBar = 0;
  let extCduRequiredKw = 0;
  let hasDlcRacks = false;
  let hasExtCduRacks = false;
  let governingMaxInletTempC = 45;
  let activeRackFootprintSqm = 0;

  Object.entries(project.rackQuantities || {}).forEach(([skuId, qty]) => {
    const q = Number(qty) || 0;
    const sku = skuMap[skuId];
    if (!sku || q <= 0) return;

    const isDlc = sku.coolingType === 'DLC' || (Number(sku.liquidSplitPct) || 0) > 0;
    const liqPct = isDlc ? Number(sku.liquidSplitPct) || 90 : 0;
    const isExtCdu = isDlc && !sku.cduIntegrated;
    const skuMaxInlet = Number(sku.maxInletTempC) || (isDlc ? 35 : 27);

    if (isDlc && skuMaxInlet < governingMaxInletTempC) {
      governingMaxInletTempC = skuMaxInlet;
    }

    for (let i = 0; i < q; i++) {
      const instKey = `${sku.id}__${i}`;
      const contF = sku.continuousFactor || 0.94;
      const utilF = sku.operatingUtilFactor || 0.85;
      const designContKw = sku.peakKw * contF;
      const stdActualKw = designContKw * utilF;
      const rawActual = project.actualRackLoads?.[instKey];
      const actualKw =
        project.loadingMode === 'ActualPerRack' && rawActual !== undefined && rawActual !== ''
          ? Number(rawActual)
          : stdActualKw;

      const effectiveThermalKw = project.loadingMode === 'ActualPerRack' ? actualKw : designContKw;
      const liqKw = effectiveThermalKw * (liqPct / 100);
      const airKw = effectiveThermalKw - liqKw;

      totalNameplatePeakKw += sku.peakKw;
      totalDesignContKw += designContKw;
      totalActualKw += actualKw;
      if (isDlc) dlcDesignKw += designContKw;
      else acDesignKw += designContKw;

      totalLiquidKw += liqKw;
      totalAirKw += airKw;
      totalFlowLpm += liqKw * (sku.flowLpmPerKw || 0);
      if ((sku.reqDeltaPBar || 0) > maxReqDeltaPBar) maxReqDeltaPBar = sku.reqDeltaPBar;
      activeRackFootprintSqm += ((sku.widthMm || 800) / 1000) * ((sku.depthMm || 1200) / 1000);

      if (isDlc) hasDlcRacks = true;
      if (isExtCdu) {
        extCduRequiredKw += liqKw;
        hasExtCduRacks = true;
      }

      activeRacks.push({
        ...sku,
        isDlc,
        isExtCdu,
        liquidSplitPct: liqPct,
        maxInletTempC: skuMaxInlet,
        instanceKey: instKey,
        instanceIndex: i + 1,
        designContKw,
        actualKw,
        liqKw,
        airKw,
        totalWeightKg: Number(sku.weightKg) || 1500
      });
    }
  });

  if (!hasDlcRacks) governingMaxInletTempC = 32;
  const effectiveSupplyTempC =
    project.targetSupplyTempC !== '' && project.targetSupplyTempC !== undefined && project.targetSupplyTempC !== null
      ? Number(project.targetSupplyTempC)
      : governingMaxInletTempC;
  const inletTempViolation = hasDlcRacks && effectiveSupplyTempC > governingMaxInletTempC;

  const dlcRacks = activeRacks.filter(r => r.isDlc);
  const acRacks = activeRacks.filter(r => !r.isDlc);

  // 2. CONTAINER / BnM BAY BIN PACKING
  const airlockReserveMm = project.airlockVestibule ? 1400 : 400;
  const wallInsulReserveMm = 400;
  const growthFactor = 1 + (Number(project.futureGrowthReservePct) || 0) / 100;
  let targetExtLengthMm = standards.iso40LengthMm;
  if (project.containerLengthMode === 'ISO20') targetExtLengthMm = standards.iso20LengthMm;
  else if (project.containerLengthMode === 'ISO40') targetExtLengthMm = standards.iso40LengthMm;
  else targetExtLengthMm = project.maxCustomLengthMm || standards.defaultCustomMaxLenMm;

  const isAllInOne = project.containerLengthMode === 'AllInOne';
  if (isAllInOne) targetExtLengthMm = 12192;
  const effectiveAirlockMm = isAllInOne ? 3600 : airlockReserveMm;
  const maxUsableRowMm = Math.max(3200, Math.floor((targetExtLengthMm - effectiveAirlockMm - wallInsulReserveMm) / growthFactor));
  const maxDlcKwPerPod = isAllInOne ? 1000 : standards.maxDlcKwPerPod || 2000;
  const maxAcKwPerPod = standards.maxAcKwPerPod || 400;
  const maxPayloadKgPerPod = standards.maxPodPayloadKg || 36000;

  const sortedDlc = [...dlcRacks].sort((a, b) => b.designContKw - a.designContKw);
  const pods: ContainerPod[] = [];

  const packGroup = (rackList: ActiveRackInstance[], podKind: 'DLC' | 'AC', maxKwCap: number) => {
    const localPods: Omit<
      ContainerPod,
      | 'label'
      | 'extLengthMm'
      | 'extWidthMm'
      | 'extHeightMm'
      | 'floorFootprintSqm'
      | 'reservedGrowthMm'
      | 'emptyTareKg'
      | 'grossRiggingKg'
      | 'shellAreaSqm'
      | 'bayUtilPct'
      | 'rowAKw'
      | 'rowBKw'
      | 'phaseBalancePct'
    >[] = [];

    rackList.forEach(rack => {
      let placed = false;
      for (const p of localPods) {
        if (project.packingStrategy === 'Segregated' && p.racks.length > 0 && p.racks[0].id !== rack.id) continue;
        const rowALen = p.rowA.reduce((s, r) => s + r.widthMm + 50, 0);
        const rowBLen = p.rowB.reduce((s, r) => s + r.widthMm + 50, 0);
        const targetRow = rowALen <= rowBLen ? 'A' : 'B';
        const currentRowLen = targetRow === 'A' ? rowALen : rowBLen;
        const nextKw = p.designContKw + rack.designContKw;
        const nextWt = p.wetWeightKg + rack.totalWeightKg;
        if (currentRowLen + rack.widthMm <= maxUsableRowMm && nextKw <= maxKwCap && nextWt <= maxPayloadKgPerPod) {
          p.racks.push(rack);
          if (targetRow === 'A') p.rowA.push(rack);
          else p.rowB.push(rack);
          p.designContKw = nextKw;
          p.actualKw += rack.actualKw;
          p.peakKw += rack.peakKw;
          p.liqKw += rack.liqKw;
          p.airKw += rack.airKw;
          p.wetWeightKg = nextWt;
          placed = true;
          break;
        }
      }
      if (!placed) {
        localPods.push({
          id: `${podKind}-${localPods.length + 1}`,
          kind: podKind,
          racks: [rack],
          rowA: [rack],
          rowB: [],
          designContKw: rack.designContKw,
          actualKw: rack.actualKw,
          peakKw: rack.peakKw,
          liqKw: rack.liqKw,
          airKw: rack.airKw,
          wetWeightKg: rack.totalWeightKg
        });
      }
    });

    localPods.forEach((p, idx) => {
      const rowALen = p.rowA.reduce((s, r) => s + r.widthMm + 50, 0);
      const rowBLen = p.rowB.reduce((s, r) => s + r.widthMm + 50, 0);
      const activeBayMm = Math.max(rowALen, rowBLen);
      const reservedGrowthMm = Math.round(activeBayMm * ((Number(project.futureGrowthReservePct) || 0) / 100));
      const usedBayMm = activeBayMm + reservedGrowthMm;

      let extLenMm = targetExtLengthMm;
      if (project.containerLengthMode === 'CustomOptimum') {
        const rawLen = usedBayMm + airlockReserveMm + wallInsulReserveMm;
        extLenMm = Math.max(6000, Math.ceil(rawLen / 250) * 250);
      }
      const shellAreaSqm =
        2 * ((extLenMm / 1000) * (project.containerHeightMm / 1000)) +
        2 * ((project.containerWidthMm / 1000) * (project.containerHeightMm / 1000)) +
        2 * ((extLenMm / 1000) * (project.containerWidthMm / 1000));
      const floorFootprintSqm = (extLenMm / 1000) * (project.containerWidthMm / 1000);
      const emptyTareKg = Math.round(shellAreaSqm * (project.wallThicknessMm * 7.85 * 1.35) + 2800);
      const rowAKw = p.rowA.reduce((s, r) => s + r.actualKw, 0);
      const rowBKw = p.rowB.reduce((s, r) => s + r.actualKw, 0);
      const phaseBalancePct =
        Math.max(rowAKw, rowBKw) > 0 ? Math.round((Math.min(rowAKw, rowBKw) / Math.max(rowAKw, rowBKw)) * 100) : 100;

      pods.push({
        ...p,
        label: isAllInOne ? `All-in-One Pod #${idx + 1}` : `${podKind} Pod #${idx + 1}`,
        extLengthMm: extLenMm,
        extWidthMm: project.containerWidthMm,
        extHeightMm: project.containerHeightMm,
        floorFootprintSqm,
        reservedGrowthMm,
        emptyTareKg,
        grossRiggingKg: emptyTareKg + p.wetWeightKg,
        shellAreaSqm,
        bayUtilPct: Math.min(100, Math.round((activeBayMm / Math.max(1000, extLenMm - airlockReserveMm - wallInsulReserveMm)) * 100)),
        rowAKw,
        rowBKw,
        phaseBalancePct
      });
    });
  };

  packGroup(sortedDlc, 'DLC', maxDlcKwPerPod);
  packGroup(acRacks, 'AC', maxAcKwPerPod);

  const dlcPods = pods.filter(p => p.kind === 'DLC');
  const acPods = pods.filter(p => p.kind === 'AC');

  const baseWhiteSpaceSqm = pods.reduce((s, p) => s + p.floorFootprintSqm, 0);
  const futureGrowthAreaSqm = baseWhiteSpaceSqm * ((Number(project.futureGrowthReservePct) || 0) / 100) * 0.65;
  const aisleServiceAreaSqm = Math.max(0, baseWhiteSpaceSqm - activeRackFootprintSqm - futureGrowthAreaSqm);

  const isGanged = project.hallTopology !== 'Isolated';
  const sharedWallSavingsSqm =
    isGanged && pods.length > 1
      ? (pods.length - 1) * ((pods[0]?.extLengthMm || 12000) / 1000) * (project.containerHeightMm / 1000) * 1.6
      : 0;

  // 3. 12-MONTH ASHRAE THERMAL & WATER PROFILE
  const cduApproachC = 3.0;
  const facilityLoopLimitC = effectiveSupplyTempC - cduApproachC;
  const baseClimate =
    project.monthlyClimate?.length === 12
      ? project.monthlyClimate
      : synthesizeMonthlyClimate(project.peakDryBulb, project.peakWetBulb, project.relHumidityPct);

  const monthlyProfile = baseClimate.map(mc => {
    let mode: 'FreeCooling' | 'AdiabaticSpray' | 'TrimChiller' | 'DryChiller' | 'AirCooling' = 'FreeCooling';
    let evapFactor = 0.0;
    let chillerFrac = 0.0;
    if (!hasDlcRacks || project.waterAvailability === 'Zero') {
      mode = project.waterAvailability === 'Zero' ? 'DryChiller' : 'AirCooling';
      chillerFrac = 0.45;
    } else if (mc.dryBulbC <= facilityLoopLimitC) {
      mode = 'FreeCooling';
      evapFactor = 0.02;
      chillerFrac = 0.0;
    } else if (mc.wetBulbC <= facilityLoopLimitC) {
      mode = 'AdiabaticSpray';
      const depression = Math.max(1, mc.dryBulbC - mc.wetBulbC);
      evapFactor = Math.min(0.65, 0.25 + depression * 0.022);
      chillerFrac = 0.05;
    } else {
      mode = 'TrimChiller';
      evapFactor = 0.32;
      chillerFrac = 0.35;
    }
    const monthlyWaterKl = Math.round((totalActualKw * 730 * evapFactor) / 1000);
    return { ...mc, mode, evapFactor, chillerFrac, monthlyWaterKl };
  });

  const freeCoolMonths = monthlyProfile.filter(m => m.mode === 'FreeCooling').length;
  const adiabaticMonths = monthlyProfile.filter(m => m.mode === 'AdiabaticSpray').length;
  const trimChillerMonths = monthlyProfile.filter(m => m.mode === 'TrimChiller').length;
  const peakMonthWaterKl = Math.max(...monthlyProfile.map(m => m.monthlyWaterKl), 0);
  const annualWaterKl = monthlyProfile.reduce((s, m) => s + m.monthlyWaterKl, 0);
  const avgChillerFrac = monthlyProfile.reduce((s, m) => s + m.chillerFrac, 0) / 12;

  let recommendedCoolingMode = `Air-Side Precision Cooling (${project.airCoolingType})`;
  let trimChillerKw = 0;

  if (hasDlcRacks) {
    if (project.waterAvailability === 'Zero') {
      recommendedCoolingMode = 'Zero-Water Dry Coolers + Mechanical Trim Chillers';
      trimChillerKw = Math.round(totalDesignContKw * 0.45);
    } else if (trimChillerMonths > 0) {
      recommendedCoolingMode = `Hybrid Adiabatic (${freeCoolMonths}m Free / ${adiabaticMonths}m Spray / ${trimChillerMonths}m Trim Chiller)`;
      trimChillerKw = Math.round(totalDesignContKw * 0.32);
    } else {
      recommendedCoolingMode = `100% Free-Cooling + Adiabatic Spray (${freeCoolMonths}m Dry / ${adiabaticMonths}m Spray)`;
      trimChillerKw = 0;
    }
  } else if (totalDesignContKw > 0) {
    recommendedCoolingMode = `100% Air-Cooled (${project.airCoolingType} Precision Cooling)`;
  }

  const coolingMode =
    project.coolingOverrideMode === 'Auto' || !project.coolingOverrideMode
      ? recommendedCoolingMode
      : project.coolingOverrideMode;

  const pueAnnualized =
    totalDesignContKw > 0
      ? Number((1.085 + avgChillerFrac * 0.11 + (totalAirKw / Math.max(1, totalDesignContKw)) * 0.14).toFixed(3))
      : 1.15;
  const puePeakDesign =
    totalDesignContKw > 0
      ? Number((1.09 + (trimChillerKw > 0 ? 0.048 : 0.02) + (totalAirKw / Math.max(1, totalDesignContKw)) * 0.14).toFixed(3))
      : 1.15;

  const totalFacilityPeakKw = Math.round(totalNameplatePeakKw * puePeakDesign);
  const totalFacilityPeakKva = Math.round(totalFacilityPeakKw / 0.9);
  const upsCriticalLoadKva = project.upsBacksUpCooling ? totalFacilityPeakKva : Math.round(totalNameplatePeakKw / 0.9);

  const altDerate = (project.elevationM || 0) > 1000 ? Math.max(0.8, 1 - ((project.elevationM - 1000) / 1000) * 0.04) : 1.0;
  const tempDerate = (project.peakDryBulb || 38) > 40 ? Math.max(0.85, 1 - (project.peakDryBulb - 40) * 0.015) : 1.0;
  const dgDerateFactor = Number((altDerate * tempDerate).toFixed(3));

  const peakDailyEvapLitres = Math.round((peakMonthWaterKl * 1000) / 30);
  const loopFillLitres = Math.round(totalLiquidKw * 3.2);
  const reqWaterKl =
    hasDlcRacks && project.includeWaterTanks
      ? Math.max(10, Math.ceil((peakDailyEvapLitres * (project.waterAutonomyDays || 3) + loopFillLitres) / 1000))
      : 0;

  // 4. V13.1 SUPPLY CHAIN SYNTHESIS & ±20% AUTO-PLACEHOLDER ENGINE
  const supplyMatches: Record<string, SupplySynthesisMatch> = {};
  const dealPlaceholders: PlaceholderSku[] = [];

  const registerMatch = (
    group: string,
    categoryLabel: string,
    demand: number,
    demandUnit: string,
    enabled: boolean,
    minUnits = 1
  ) => {
    if (!enabled || demand <= 0) return;
    // If engineer replaced SKU inline for this deal, respect inline override first
    const ov = inlineOv[group];
    if (ov) {
      const calc = calcRedundantUnits(demand, ov.ratedCapacity, project.uptimeTier);
      const totalUnits = ov.qtyOverride !== undefined ? ov.qtyOverride : Math.max(minUnits, calc.total);
      supplyMatches[group] = {
        group,
        demand,
        demandUnit,
        matchedSkuId: ov.skuId,
        vendor: ov.make,
        model: ov.model,
        label: ov.label,
        ratedCapacity: ov.ratedCapacity,
        activeN: calc.activeN,
        redundantR: calc.redundantR,
        totalUnits,
        unitPriceInr: ov.unitCostInr,
        footprintSqm: ov.footprintSqm,
        miiPct: ov.miiPct,
        confidence: 'Verified',
        utilizationPct: Number(((demand / Math.max(1, calc.activeN * ov.ratedCapacity)) * 100).toFixed(1)),
        isPlaceholder: false
      };
      return;
    }

    const match = matchOrSynthesizeSubsystem({
      dealId: project.id,
      group,
      categoryLabel,
      demand,
      demandUnit,
      uptimeTier: project.uptimeTier,
      supplyItems,
      masterFallbacks: fullCatalog,
      minUnits
    });
    if (match) {
      supplyMatches[group] = match;
      if (match.isPlaceholder && match.placeholder) {
        dealPlaceholders.push(match.placeholder);
      }
    }
  };

  registerMatch('trafo', 'MV/LV K-Factor Transformer', totalFacilityPeakKva, 'kVA', project.includeTransformer && totalDesignContKw > 0);
  registerMatch('ups', 'Containerized Modular UPS', upsCriticalLoadKva, 'kVA', project.includeUpsContainer && totalDesignContKw > 0);
  registerMatch('dg', 'CPCB IV+ Diesel Generator', Math.round(totalFacilityPeakKva / Math.max(0.5, dgDerateFactor)), 'kVA', project.includeDgYard && totalDesignContKw > 0, 2);
  registerMatch('cooler', 'Adiabatic / Dry Fluid Cooler', totalLiquidKw, 'kW', hasDlcRacks && project.includeLiquidLoop);
  registerMatch('cdu', 'Floor Liquid CDU Tower', extCduRequiredKw, 'kW', hasExtCduRacks && project.includeExtCdu);
  registerMatch('tank', 'SS316L Water Storage Tank', reqWaterKl, 'kL', hasDlcRacks && project.includeWaterTanks);

  // Resolve active building blocks (preferring inline override -> placeholder -> selected master catalog)
  const resolveSelectedBlock = (group: string, selectedId: string, fallbackId: string): NonItCatalogItem => {
    const match = supplyMatches[group];
    const inline = inlineOv[group];
    if (inline) {
      return {
        id: inline.skuId,
        group,
        category: catMap[selectedId]?.category || 'Custom Deal Override',
        label: inline.label,
        ratedCapacity: inline.ratedCapacity,
        capacityUnit: inline.capacityUnit,
        footprintSqm: inline.footprintSqm,
        unit: `per ${inline.ratedCapacity}${inline.capacityUnit}`,
        cost: inline.unitCostInr,
        make: inline.make,
        model: inline.model,
        miiPct: inline.miiPct
      };
    }
    if (match?.isPlaceholder && match.placeholder) {
      return {
        id: match.placeholder.id,
        group,
        category: match.placeholder.category,
        label: match.placeholder.builtUpName,
        ratedCapacity: match.placeholder.synthesizedRating,
        capacityUnit: match.placeholder.capacityUnit,
        footprintSqm: match.placeholder.scaledFootprintSqm,
        unit: `per ${match.placeholder.synthesizedRating}${match.placeholder.capacityUnit}`,
        cost: match.placeholder.romUnitPriceInr,
        make: 'TBD — Market Scout',
        model: match.model,
        miiPct: match.miiPct
      };
    }
    return catMap[selectedId] || fullCatalog.find(i => i.id === fallbackId) || fullCatalog[0];
  };

  const selCdu = resolveSelectedBlock('cdu', project.selectedCduId, 'cdu-1350kw');
  const selCooler = resolveSelectedBlock('cooler', project.selectedCoolerId, 'cooler-1000kw');
  const selTank = resolveSelectedBlock('tank', project.selectedTankId, 'tank-25kl');
  const selTrafo = resolveSelectedBlock('trafo', project.selectedTrafoId, 'trafo-2000kva');
  const selUps = resolveSelectedBlock('ups', project.selectedUpsId, 'ups-1000kva');
  const selDg = resolveSelectedBlock('dg', project.selectedDgId, 'dg-1500kva');

  // Redundancy calculations + inline quantity overrides
  const cduCalc =
    hasExtCduRacks && project.includeExtCdu
      ? calcRedundantUnits(extCduRequiredKw, selCdu.ratedCapacity || 1350, project.uptimeTier)
      : { activeN: 0, redundantR: 0, total: 0 };
  const extCduUnits = ovQty.cdu !== undefined && ovQty.cdu !== '' ? Number(ovQty.cdu) : cduCalc.total;

  const coolerCalc =
    hasDlcRacks && project.includeLiquidLoop
      ? calcRedundantUnits(totalLiquidKw, selCooler.ratedCapacity || 1000, project.uptimeTier)
      : { activeN: 0, redundantR: 0, total: 0 };
  const adiabaticUnits = ovQty.cooler !== undefined && ovQty.cooler !== '' ? Number(ovQty.cooler) : coolerCalc.total;

  const chillerTrimCalc =
    hasDlcRacks && project.includeLiquidLoop && trimChillerKw > 0
      ? calcRedundantUnits(trimChillerKw, 500, project.uptimeTier)
      : { activeN: 0, redundantR: 0, total: 0 };
  const trimChillerUnits = ovQty.chiller !== undefined && ovQty.chiller !== '' ? Number(ovQty.chiller) : chillerTrimCalc.total;

  const airCalc =
    totalAirKw > 0 && project.includeRoomDehum
      ? calcRedundantUnits(totalAirKw, 40, project.uptimeTier)
      : { activeN: 0, redundantR: 0, total: 0 };
  const autoAirUnits = airCalc.total > 0 ? Math.max(pods.length, airCalc.total) : 0;
  const airSideUnits = ovQty.air !== undefined && ovQty.air !== '' ? Number(ovQty.air) : autoAirUnits;

  const pumpCalc =
    hasDlcRacks && project.includePumpSkids
      ? calcRedundantUnits(totalFlowLpm, 2500, project.uptimeTier)
      : { activeN: 0, redundantR: 0, total: 0 };
  const pumpSkidsCount = ovQty.pump !== undefined && ovQty.pump !== '' ? Number(ovQty.pump) : pumpCalc.total;
  const headerFrictionBar = Number((0.45 + pods.length * 0.08).toFixed(2));
  const cduDropBar = 0.65;
  const pumpDesignHeadBar = Number((maxReqDeltaPBar + cduDropBar + headerFrictionBar).toFixed(2));

  const tankRatingKl = selTank.ratedCapacity || 25;
  const autoTankUnits = reqWaterKl > 0 ? Math.max(1, Math.ceil(reqWaterKl / tankRatingKl)) : 0;
  const waterTankUnits = ovQty.tank !== undefined && ovQty.tank !== '' ? Number(ovQty.tank) : autoTankUnits;
  const totalWaterStorageKl = waterTankUnits * tankRatingKl;

  const trafoCalc =
    project.includeTransformer && totalDesignContKw > 0
      ? calcRedundantUnits(totalFacilityPeakKva, selTrafo.ratedCapacity || 2000, project.uptimeTier)
      : { activeN: 0, redundantR: 0, total: 0 };
  const transformerUnits = ovQty.trafo !== undefined && ovQty.trafo !== '' ? Number(ovQty.trafo) : trafoCalc.total;

  const lvSwitchgearUnits =
    project.includeLvSwitchgear && totalDesignContKw > 0
      ? ovQty.lvacb !== undefined && ovQty.lvacb !== ''
        ? Number(ovQty.lvacb)
        : Math.max(1, transformerUnits)
      : 0;

  const upsCalc =
    project.includeUpsContainer && totalDesignContKw > 0
      ? calcRedundantUnits(upsCriticalLoadKva, selUps.ratedCapacity || 1000, project.uptimeTier)
      : { activeN: 0, redundantR: 0, total: 0 };
  const upsContainersCount = ovQty.ups !== undefined && ovQty.ups !== '' ? Number(ovQty.ups) : upsCalc.total;

  const dodFactor = project.batteryChemistry === 'LFP' ? standards.lfpDoDPct / 100 : standards.vrlaDoDPct / 100;
  const criticalBackupKw = Math.round(upsCriticalLoadKva * 0.9);
  const batteryKwhReq = (criticalBackupKw * ((project.batteryRuntimeMin || 15) / 60)) / (dodFactor * 0.96 * 0.85);
  const autoBattUnits = project.includeBatteryContainer && totalDesignContKw > 0 ? Math.max(1, Math.ceil(batteryKwhReq / 1200)) : 0;
  const batteryContainersCount = ovQty.bess !== undefined && ovQty.bess !== '' ? Number(ovQty.bess) : autoBattUnits;

  const effectiveDgKva = Math.round((selDg.ratedCapacity || 1500) * dgDerateFactor);
  const dgCalc =
    project.includeDgYard && totalDesignContKw > 0
      ? calcRedundantUnits(totalFacilityPeakKva, effectiveDgKva, project.uptimeTier)
      : { activeN: 0, redundantR: 0, total: 0 };
  const autoDgUnits = dgCalc.total > 0 ? Math.max(2, dgCalc.total) : 0;
  const dgUnitsCount = ovQty.dg !== undefined && ovQty.dg !== '' ? Number(ovQty.dg) : autoDgUnits;
  const totalHsdFuelLitres = Math.round(totalFacilityPeakKw * 0.8 * 0.25 * (project.dgAutonomyHours || 24));

  const totalNetPodVolM3 = pods.reduce(
    (s, p) => s + (p.extLengthMm / 1000) * (p.extWidthMm / 1000) * ((p.extHeightMm - project.plenumHeightMm) / 1000),
    0
  );
  const novecGasKg = Math.round(totalNetPodVolM3 * 0.68);

  // 5. WHITE-SPACE INTERNAL EQUIPMENT (Internal CDUs + Mandatory PACs + Chillers)
  const isBnM = project.shellArchitecture === 'BnM_Hall';
  const podCount = Math.max(1, pods.length);

  const internalCduCount = extCduUnits;
  const internalCduFootprintSqm = Number((internalCduCount * 1.44).toFixed(1));
  const pacCalc =
    pods.length > 0 ? calcRedundantUnits(Math.max(totalAirKw, pods.length * 45), 80, project.uptimeTier) : { activeN: 0, redundantR: 0, total: 0 };
  const mandatoryPacCount = pods.length > 0 ? Math.max(pods.length, pacCalc.total) : 0;
  const pacFootprintSqm = Number((mandatoryPacCount * 2.2).toFixed(1));
  const pduFootprintSqm = Number((pods.length * 1.8).toFixed(1));
  const totalChillerLoadKw = Math.round(totalAirKw + mandatoryPacCount * 35);
  const wsChillerCalc = totalChillerLoadKw > 0 ? calcRedundantUnits(totalChillerLoadKw, 1000, project.uptimeTier) : { activeN: 0, redundantR: 0, total: 0 };
  const chillerUnitsCount = wsChillerCalc.total;

  const whiteSpaceSupportSqm = Number((internalCduFootprintSqm + pacFootprintSqm + pduFootprintSqm).toFixed(1));
  const totalItWhiteSpaceSqm = Number((baseWhiteSpaceSqm + whiteSpaceSupportSqm).toFixed(1));

  // 6. CIVIL PLINTH / 4.5m PILE CAP & BEARING SAFETY FACTOR (PRESERVED FROM V12.4)
  const floodPlinthMm = Math.max(
    (project.historicalFloodLevelMm || 450) + 300,
    /mumbai|chennai|kolkata|kochi/i.test(project.cityQuery || '') ? 900 : 650
  );
  const roofChillerMassT =
    project.chillerPlacement === 'ContainerRoof' && !isBnM ? Number(((chillerUnitsCount * 11.5) / podCount).toFixed(1)) : 0;
  const basePodMassT = Number(((pods[0]?.grossRiggingKg || 28000) / 1000).toFixed(1));
  const unitGrossTonnes = isBnM
    ? Number(((totalDesignContKw / podCount) * 0.014).toFixed(1))
    : Number((basePodMassT + roofChillerMassT + (internalCduCount * 1.1) / podCount + (mandatoryPacCount * 0.75) / podCount).toFixed(1));
  const floorPressureKpa = Number(((unitGrossTonnes * 9.81) / (isBnM ? 64.0 : 32.0)).toFixed(1));
  const cornerNodeKn = Math.round((unitGrossTonnes * 9.81) / 4);
  const sbc = Math.max(20, Number(project.soilBearingCapacityKpa) || 150);
  const isWeakSoil = sbc < 110;
  const embedmentDepthM = isWeakSoil ? 4.5 : sbc < 160 ? 1.8 : 1.35;
  const imposedBearingKpa = Number((cornerNodeKn / 2.25).toFixed(1));
  const bearingSafetyFactor = Number((sbc / Math.max(1, imposedBearingKpa)).toFixed(2));
  const foundationType = isWeakSoil
    ? 'Bored Cast-in-Situ Friction Piles (4.5m Pile Cap Depth) + RCC Pile Cap'
    : `Isolated M35 RCC Pad Footing (${((cornerNodeKn / sbc) * 1.35).toFixed(2)} m²/node, ${embedmentDepthM}m IS 1904) + Raised Plinth`;

  // 7. TELECOM MMR & LOGISTICS / HEAVY-LIFT RIGGING
  const mmrRoomsCount = Math.max(1, Math.ceil(podCount / 6));
  const odfBaysCount = Math.max(2, (project.carrierCount || 3) * 2);
  const totalFiberStrands = odfBaysCount * (project.odfCoreDensity || 576);
  const overheadFiberMeters = podCount * 32;
  const gpuFabricLinks = activeRacks.length * 8;

  const logOv = project.logisticsOverrides || {};
  const trailerCount =
    logOv.trailers !== undefined && logOv.trailers !== '' ? Number(logOv.trailers) : isBnM ? Math.max(2, Math.ceil(podCount / 2)) : podCount;
  const minTurningRadiusM = Number(Math.max(15.0, 22.5 - (Number(project.approachRoadWidthM) || 12) * 0.5).toFixed(1));
  const craneTonnage =
    logOv.craneTonnage !== undefined && logOv.craneTonnage !== ''
      ? Number(logOv.craneTonnage)
      : unitGrossTonnes > 38 || (project.craneWorkingRadiusM || 10) > 12
        ? 350
        : 250;
  const outriggerGroundKpa = Math.round((unitGrossTonnes * 9.81 * 1.45) / 4.8);
  const laydownStagingSqm =
    logOv.stagingSqm !== undefined && logOv.stagingSqm !== '' ? Number(logOv.stagingSqm) : Math.max(240, trailerCount * 80);

  // 8. YARD FOOTPRINT & PLOT UTILIZATION
  const yardBreakdown = {
    cduPumpSqm: Math.round(pumpSkidsCount * 10 + (project.includeGlycolDosing ? 6 : 0)),
    coolerChillerSqm: Math.round(adiabaticUnits * (selCooler.footprintSqm || 24) + trimChillerUnits * 18 + (project.chillerPlacement === 'DedicatedYardPad' ? chillerUnitsCount * 26 : 0)),
    waterTankSqm: Math.round(waterTankUnits * (selTank.footprintSqm || 12)),
    substationSqm: Math.round(transformerUnits * (selTrafo.footprintSqm || 14) + lvSwitchgearUnits * 8 + (project.includeHtVcb ? 10 : 0)),
    upsBessSqm: Math.round(upsContainersCount * (selUps.footprintSqm || 28) + batteryContainersCount * 36),
    dgPesoSqm: Math.round(dgUnitsCount * (selDg.footprintSqm || 36) + (dgUnitsCount > 0 ? Math.ceil(totalHsdFuelLitres / 2000) : 0)),
    adminStagingSqm: Math.round((project.includeAdminModule ? 40 : 0) + (project.includeStagingModule ? 35 : 0))
  };
  const totalNonItYardSqm = Object.values(yardBreakdown).reduce((a, b) => a + b, 0);
  const totalCampusOccupiedSqm = Math.round((totalItWhiteSpaceSqm + totalNonItYardSqm) * 1.25);
  const plinthSqm = Math.round(totalItWhiteSpaceSqm + totalNonItYardSqm);

  // 9. PER-UNIT DATASHEETS
  const unitDatasheets: UnitDatasheet[] = pods.map((p, idx) => {
    const unitId = isBnM ? `BNM-BAY-${String(idx + 1).padStart(2, '0')}` : `MDC-POD-${String(idx + 1).padStart(2, '0')}`;
    const artworkStatus =
      project.brandingMode === 'standard'
        ? 'OEM Standard Finish'
        : project.brandingMode === 'custom_ready'
          ? 'Client Vector Logo Applied'
          : '[CLIENT ARTWORK PENDING — FILES LATER]';
    return {
      unitId,
      shellSpec: isBnM ? `BnM RCC Bay (${project.bnmColumnGridM} Grid)` : `${(p.extLengthMm / 1000).toFixed(2)}m ISO Corten-A Shell`,
      itKw: Math.round(p.designContKw),
      rackCount: p.racks.length,
      internalEquip: `${Math.ceil(mandatoryPacCount / podCount)}× PAC + ${Math.ceil(internalCduCount / podCount)}× Internal CDU`,
      grossTonnes: unitGrossTonnes,
      coatingSpec:
        project.brandingMode === 'standard' ? 'RAL 7035 Industrial' : `Ext: ${project.exteriorRalLabel} / Int: ${project.interiorRalLabel}`,
      rackFinish: project.rackBezelFinish,
      artworkStatus
    };
  });

  // 10. COMMERCIAL BOQ SYNTHESIS (WITH DEAL-LOCAL PLACEHOLDERS, INLINE OVERRIDES & SPECIAL VENDOR QUOTES)
  const makeBomRow = (
    key: string,
    qty: number,
    label: string,
    category: string,
    specs: string,
    opts?: {
      group?: string;
      overrideRate?: number;
      make?: string;
      model?: string;
      miiPct?: number;
      isPlaceholder?: boolean;
      isDealLocalSku?: boolean;
    }
  ): BomLineItem => {
    const base = catMap[key] || { cost: 500000, make: 'Grade-A OEM', model: 'STD-1', unit: 'unit', miiPct: 84 };
    const masterUnitCost = opts?.overrideRate !== undefined ? opts.overrideRate : Number(base.cost || 0);
    const ov = project.dealOverrides?.[key];
    let unitCost = masterUnitCost;
    let isOverridden = false;
    let discountPct = 0;

    if (ov) {
      if (ov.mode === 'discount' && ov.discountPct !== undefined && ov.discountPct !== '') {
        discountPct = Number(ov.discountPct) || 0;
        unitCost = Math.round(masterUnitCost * (1 - discountPct / 100));
        isOverridden = true;
      } else if (ov.mode === 'price' && ov.specialPrice !== undefined && ov.specialPrice !== '') {
        unitCost = Number(ov.specialPrice);
        discountPct = masterUnitCost > 0 ? Number((((masterUnitCost - unitCost) / masterUnitCost) * 100).toFixed(1)) : 0;
        isOverridden = true;
      }
    }

    const rawCostTotal = unitCost * qty;
    const withContingency = rawCostTotal * (1 + (project.contingencyPct || 7) / 100);
    const sellingPreTax = withContingency / Math.max(0.05, 1 - (project.marginPct || 18) / 100);
    const gstAmt = sellingPreTax * ((project.gstPct || 18) / 100);

    return {
      key,
      group: opts?.group,
      category,
      label,
      specs,
      make: ov?.vendorName || opts?.make || base.make,
      model: ov?.vendorSku || opts?.model || base.model,
      unit: base.unit || 'unit',
      qty,
      masterUnitCost,
      unitCost,
      isOverridden,
      isPlaceholder: opts?.isPlaceholder,
      isDealLocalSku: opts?.isDealLocalSku,
      discountPct,
      validUntil: ov?.validUntil || '',
      comments: ov?.comments || '',
      miiPct: opts?.miiPct ?? base.miiPct ?? 84,
      rawCostTotal,
      withContingency,
      sellingPreTax,
      gstAmt,
      grandTotalInclGst: sellingPreTax + gstAmt
    };
  };

  const bomItems: BomLineItem[] = [];
  const isHighSeismic = project.seismicZone === 'Zone IV' || project.seismicZone === 'Zone V';

  if (pods.length > 0) {
    if (isBnM) {
      const mwQty = Math.max(1, Math.ceil(totalDesignContKw / 1000));
      bomItems.push(
        makeBomRow(
          'bnm-hall-wrapper',
          mwQty,
          `Brick-and-Mortar (BnM) Fire-Rated Technical Hall (${pods.length} Bays)`,
          'Modular Enclosures & Civil',
          `${project.bnmColumnGridM} Grid • ${project.bnmSlabThicknessMm}mm RCC Slab • ${project.bnmClearSoffitM}m Soffit`
        )
      );
    } else if (project.bespokeContainerPriceInr !== '' && Number(project.bespokeContainerPriceInr) > 0) {
      bomItems.push(
        makeBomRow(
          'containerPodShell',
          pods.length,
          `Modular IT Compute Containers (${pods.length} Pods, ${project.metallurgy})`,
          'Modular Enclosures & Civil',
          `${(pods[0].extLengthMm / 1000).toFixed(2)}m L × ${(pods[0].extWidthMm / 1000).toFixed(2)}m W | Dedicated White-Space`,
          { overrideRate: Number(project.bespokeContainerPriceInr), make: 'Bespoke Fab', model: 'SPA-H Corten Heavy', miiPct: 96 }
        )
      );
    } else {
      const netShellSqm = Math.max(40, Math.round(pods.reduce((s, p) => s + p.shellAreaSqm, 0) - sharedWallSavingsSqm));
      bomItems.push(
        makeBomRow(
          'shellPerSqm',
          netShellSqm,
          `Custom Modular IT Enclosures (${pods.length} Pods, ${project.metallurgy})`,
          'Modular Enclosures & Civil',
          `${project.hallTopology} | ${Math.round(totalItWhiteSpaceSqm)} m² White-Space`
        )
      );
    }

    if (project.brandingMode !== 'standard') {
      bomItems.push(
        makeBomRow(
          'custom-branding-pkg',
          pods.length,
          'Customer Exterior/Interior RAL Coating, Rack Bezel & Logo Package',
          'Modular Enclosures & Civil',
          project.brandingMode === 'custom_tbd'
            ? 'Custom RAL & Vinyl Prep [CLIENT ARTWORK PENDING]'
            : `Custom RAL (${project.exteriorRalLabel}) & Logo Applied`
        )
      );
    }

    if (isHighSeismic || project.emiShielding) {
      bomItems.push(
        makeBomRow(
          'seismicBracingPod',
          pods.length,
          `Seismic Reinforcement (${project.seismicZone}), EMI Shielding & Flex Loops`,
          'Modular Enclosures & Civil',
          `${project.seismicLabel} + Weather/Heat Proofing`
        )
      );
    }

    const totalMeters = pods.reduce((s, p) => s + (p.extLengthMm / 1000) * 2, 0);
    bomItems.push(
      makeBomRow(
        'buswayPerMeter',
        Math.round(totalMeters * (project.uptimeTier === 'Tier IV' ? 2 : 1.5)),
        `Overhead Dual A/B Power Busways (${standards.buswayAmperageA}A)`,
        'Power Distribution & Transformation',
        `${project.uptimeTier} Redundant Overhead Busways`
      )
    );
    if (project.includeIntelligentRpdu) {
      bomItems.push(
        makeBomRow(
          'intelligentRpdu',
          activeRacks.length,
          'Intelligent 0U Metered/Switched Rack PDUs (Dual A/B Set)',
          'Power Distribution & Transformation',
          `${activeRacks.length} Dual-Feed Rack PDU Pairs`
        )
      );
    }
    if (hasDlcRacks) {
      bomItems.push(
        makeBomRow(
          'ss316HeaderPerMeter',
          Math.round(totalMeters * 2.2),
          'SS316L Supply/Return Coolant Headers & Isolation Valves',
          'Hydraulics, Piping & Water Storage',
          `${standards.coolantType} (${Math.round(totalFlowLpm)} LPM)`
        )
      );
    }

    // Mandatory White-Space PACs + Roof/Yard Chillers
    bomItems.push(
      makeBomRow(
        'roomDehumPac80Kw',
        mandatoryPacCount,
        'White-Space Precision Air Coolers (PAC 80 kW — Mandatory Room/Humidity)',
        'Liquid Cooling & Heat Rejection',
        `${mandatoryPacCount} PACs (${pacFootprintSqm} m² white-space) • ${project.airflowDelivery}`
      )
    );
    if (chillerUnitsCount > 0) {
      bomItems.push(
        makeBomRow(
          'chiller-1000kw',
          chillerUnitsCount,
          `Air-Cooled Magnetic-Bearing Chillers (${project.chillerPlacement === 'ContainerRoof' ? 'Container Roof-Mounted' : 'Yard Chiller Pad'})`,
          'Liquid Cooling & Heat Rejection',
          `Serves PACs + AC/RDHX loads (${totalChillerLoadKw} kW)`
        )
      );
    }
  }

  // Helper to push synthesized/selected major equipment blocks into BOM
  const pushMajorBlock = (group: string, item: NonItCatalogItem, qty: number, specLine: string) => {
    if (qty <= 0) return;
    const match = supplyMatches[group];
    const isPh = Boolean(match?.isPlaceholder);
    const isLocal = Boolean(inlineOv[group]?.scope === 'deal_only');
    bomItems.push(
      makeBomRow(item.id, qty, item.label, item.category, isPh ? `${specLine} | ${match?.placeholder?.marketScoutRemark || ''}` : specLine, {
        group,
        overrideRate: item.cost,
        make: item.make,
        model: item.model,
        miiPct: item.miiPct,
        isPlaceholder: isPh,
        isDealLocalSku: isLocal
      })
    );
  };

  pushMajorBlock('cdu', selCdu, extCduUnits, `Internal White-Space CDU: ${Math.round(extCduRequiredKw)} kW (${cduCalc.activeN}+${cduCalc.redundantR})`);
  pushMajorBlock('cooler', selCooler, adiabaticUnits, `${coolingMode} (${coolerCalc.activeN}+${coolerCalc.redundantR})`);
  if (trimChillerUnits > 0) {
    bomItems.push(makeBomRow('trimChiller500Kw', trimChillerUnits, 'Peak Monsoon Mechanical Trim Chillers (500 kW)', 'Liquid Cooling & Heat Rejection', `Handles ${trimChillerKw} kW peak wet-bulb trim`));
  }
  if (pumpSkidsCount > 0) {
    bomItems.push(makeBomRow('primaryPumpSkid', pumpSkidsCount, `VFD Circulating Pump Skids (${project.pumpStagingMode})`, 'Hydraulics, Piping & Water Storage', `${Math.round(totalFlowLpm)} LPM @ ${pumpDesignHeadBar} bar TDH + 50μ Strainer`));
  }
  pushMajorBlock('tank', selTank, waterTankUnits, `${project.waterAutonomyDays}-day peak evap buffer (${totalWaterStorageKl} kL total)`);

  if (hasDlcRacks && pods.length > 0) {
    bomItems.push(makeBomRow('preloop-water-treat', 1, 'Pre-Loop RO/DM Water Treatment & Chemical Dosing Skid', 'Hydraulics, Piping & Water Storage', 'Pre-treats make-up water prior to DLC loop fill'));
    const pg25Lots = Math.max(1, Math.ceil((totalLiquidKw * 3.2) / 5000));
    bomItems.push(makeBomRow('glycol-pg25-isolated', pg25Lots, 'Factory-Isolated Inhibited PG25 Glycol Fluid (5000L Drum Lot)', 'Consumables & Operational Chemicals', 'Factory-Supplied PG25 + OAT/Azole Inhibitor (Isolated Line Item)'));
  }

  pushMajorBlock('trafo', selTrafo, transformerUnits, `${transformerUnits} × ${selTrafo.ratedCapacity} kVA (${totalFacilityPeakKva} kVA peak)`);
  if (project.includeHtVcb && transformerUnits > 0) {
    bomItems.push(makeBomRow('htVcbPanel', Math.max(1, Math.ceil(transformerUnits / 2)), '11kV/33kV Indoor HT VCB Ring Main & Metering Panel', 'Power Distribution & Transformation', 'SF6/Vacuum Circuit Breaker Switchboard'));
  }
  if (lvSwitchgearUnits > 0) {
    bomItems.push(makeBomRow('lvSwitchgearPanel', lvSwitchgearUnits, 'Main LV ACB Switchgear & Auto-Transfer Lineup', 'Power Distribution & Transformation', '3200A Form-4B Drawout Switchboard'));
  }
  if (pods.length > 0) {
    bomItems.push(makeBomRow('apfc-spd-panel', Math.max(1, Math.ceil(podCount / 2)), 'Detuned APFC Capacitor Banks (500 kVAr) + Type 1+2 SPD Array', 'Power Distribution & Transformation', 'Harmonic & Surge Suppression (CEIG / NBCS 2026)'));
    bomItems.push(makeBomRow('mcc-panel', 1, 'Intelligent VFD Motor Control Center (MCC) for Cooling Plant', 'Power Distribution & Transformation', 'Form-4B VFD Pump & Fan Controls'));
  }

  pushMajorBlock('ups', selUps, upsContainersCount, `${project.uptimeTier} Modular UPS (${upsCalc.activeN}+${upsCalc.redundantR})`);
  if (batteryContainersCount > 0) {
    bomItems.push(makeBomRow('batteryContainer15Min', batteryContainersCount, `Containerized ${project.batteryChemistry} Battery Pods (${project.batteryRuntimeMin} min)`, 'Backup Power & Energy Storage', `${Math.round(batteryKwhReq)} kWh (${project.upsRideThroughMode})`));
  }
  pushMajorBlock('dg', selDg, dgUnitsCount, `${dgUnitsCount} × ${selDg.ratedCapacity} kVA (${totalHsdFuelLitres.toLocaleString()}L PESO fuel)`);
  if (project.includeGridLoadShield && totalDesignContKw > 0) {
    const shieldBlocks = Math.max(1, Math.ceil((totalDesignContKw * 0.2) / 3000));
    bomItems.push(makeBomRow('grid-load-shield', shieldBlocks, '20% Dynamic Load-Drop Shield (Fast Load Bank + Grid BESS Buffer)', 'Backup Power & Energy Storage', `Absorbs ${((totalDesignContKw * 0.2) / 1000).toFixed(2)} MW sudden AI load drop`));
  }

  if (pods.length > 0) {
    if (project.includeIntegratedBms) bomItems.push(makeBomRow('integratedBmsPod', pods.length, 'Integrated IBMS, DCIM, EPMS & PLC Telemetry Suite', 'BMS, Fire Suppression & Security', 'SCADA, branch power, CDU & thermal telemetry'));
    if (project.includeLeakRope) {
      const ropeMeters = Math.round(pods.reduce((s, p) => s + (p.extLengthMm / 1000) * 3, 0));
      bomItems.push(makeBomRow('leakDetectionRope', ropeMeters, 'Addressable Conductive Liquid Leak Detection Rope & Panel', 'BMS, Fire Suppression & Security', `${ropeMeters}m perimeter & manifold zone sensing`));
    }
    if (project.includeVesdaFire) bomItems.push(makeBomRow('vesdaFirePod', pods.length, `VESDA Aspirating Smoke + Novec 1230 Clean Agent (${novecGasKg} kg)`, 'BMS, Fire Suppression & Security', 'Early warning laser detection + clean-agent flooding'));
    if (project.includeCctvSecurity) bomItems.push(makeBomRow('cctvSecuritySite', Math.max(1, Math.ceil(pods.length / 2)), 'IP CCTV Surveillance, 90-Day NVR & Biometric Access', 'BMS, Fire Suppression & Security', 'Internal aisle domes + perimeter PTZ & turnstiles'));
    if (project.includeK12Mantrap) bomItems.push(makeBomRow('k12-mantrap-pkg', 1, 'K12/M50 Anti-Ram Bollards & Dual-Door Biometric Mantrap Portal', 'BMS, Fire Suppression & Security', 'Crash-rated perimeter gates & interlocking security mantrap'));
    if (project.includeRodentRepellent) bomItems.push(makeBomRow('rodent-repellent-pkg', pods.length, '#316 SS Rodent Armor Mesh + Ultrasonic Repellent Transducers', 'Environmental Hardening & ZLD', 'Complete cable/pipe ingress & subfloor rodent barrier'));
    if (project.includeGasScrubber) bomItems.push(makeBomRow('gas-scrubber-unit', pods.length, 'ISA G1 Chemical Air Scrubber & Anti-Corrosive Curtain (H2S/SO2)', 'Environmental Hardening & ZLD', 'Protects copper/electronics from industrial/sewage gases'));
    if (project.includeZldRecovery) bomItems.push(makeBomRow('zld-water-plant', 1, 'Zero Liquid Discharge (ZLD) RO Reject & PAC Condensate Recovery', 'Environmental Hardening & ZLD', 'Zero untreated discharge + PAC condensate reuse'));

    bomItems.push(makeBomRow('ops-consumables-lot', pods.length, 'Water Treatment Chemicals, RO/DM Resins, PAC Filters & Scrubber Media', 'Consumables & Operational Chemicals', 'Operational replenishment chemicals & filter media'));

    if (project.includeTelecomMmr) {
      bomItems.push(makeBomRow('telecom-mmr-room', mmrRoomsCount, 'Carrier-Neutral Meet-Me Room (MMR), 48U ODF Bays & -48V DC Plant', 'Telecom, MMR & Connectivity', `${project.carrierCount} Carriers • ${odfBaysCount}× ${project.odfCoreDensity}F ODFs`));
      bomItems.push(makeBomRow('diverse-fiber-vaults', 1, 'Dual Diverse Underground Fiber Vaults (North/South) & 4-Way HDPE Ducts', 'Telecom, MMR & Connectivity', `>= ${project.diverseVaultSeparationM}m physical route separation`));
      bomItems.push(makeBomRow('overhead-fiber-raceway', pods.length, 'Overhead Yellow LSZH Fiber Raceways & High-Density Trunk Cabling', 'Telecom, MMR & Connectivity', `${overheadFiberMeters}m segregated optical troughs + ${project.fabricType}`));
    }
    if (project.includeLogisticsRigging) {
      bomItems.push(makeBomRow('logistics-transport-crane', pods.length, `Multi-Axle Low-Bed Trailers & ${craneTonnage}T Mobile Crane Mobilization`, 'Logistics, Heavy-Lift & Rigging', `Turning radius >= ${minTurningRadiusM}m • Outrigger bearing ${outriggerGroundKpa} kN/m²`));
      bomItems.push(makeBomRow('onsite-rigging-kit', 1, 'Azobe Spreader Mats, 5T Forklifts, 15T Roller Skates, Toe Jacks & Shims', 'Logistics, Heavy-Lift & Rigging', `Laydown yard ${laydownStagingSqm} m² • Full on-site rigging inventory`));
    }
  }

  if (project.includeAcousticBarrier) bomItems.push(makeBomRow('acousticBarrierMeter', 85, 'CPCB Neighbor-Boundary Acoustic Louver & Barrier Wall', 'Modular Enclosures & Civil', 'Attenuates yard noise to <= 65 dBA at boundary'));
  if (project.includeAdminModule) bomItems.push(makeBomRow('adminSparesModule', 1, 'Operations NOC, Admin & ESD Spares Workshop Container', 'Modular Enclosures & Civil', 'Operator consoles, diagnostic bench & spare manifolds'));
  if (project.includeStagingModule) bomItems.push(makeBomRow('stagingDockModule', 1, 'Staging, Unloading Dock & Nitrogen Leak-Test Bay', 'Modular Enclosures & Civil', 'Hydraulic lift + heavy rack de-crating zone'));
  if (plinthSqm > 0) bomItems.push(makeBomRow('civilPlinthPerSqm', plinthSqm, 'Elevated RCC Monsoon Plinths, Storm Drains & Canopy', 'Modular Enclosures & Civil', `${foundationType}`));

  const hardwareCapexRaw = bomItems.reduce((s, it) => s + it.rawCostTotal, 0);

  if (project.includeInstallation && pods.length > 0) {
    bomItems.push(makeBomRow('installCommissionPod', pods.length, 'Turnkey Site Rigging, Ganging, Hydro-Flush & IST (L1–L5)', 'Services & AMC', 'Crane lifting, inter-bay sealing & commissioning'));
  }
  if (project.includeAmcContract && totalDesignContKw > 0) {
    const mwQty = Number((totalDesignContKw / 1000).toFixed(2));
    const years = Number(project.amcYears) || 5;
    if (project.amcPricingBasis === 'PctOfCapex') {
      const pct = Number(project.amcPctOfCapex) || 3.5;
      const annualBaseCost = Math.round(hardwareCapexRaw * (pct / 100));
      bomItems.push(makeBomRow('annualAmcOpsPerMw', years, `${years}-Year Managed O&M, AMC & Consumables (${pct}% of CapEx/yr)`, 'Services & AMC', `${project.amcSupportModel} (${project.residentHeadcount} staff, ${years} yrs)`, { overrideRate: annualBaseCost }));
    } else {
      bomItems.push(makeBomRow('annualAmcOpsPerMw', Number((mwQty * years).toFixed(2)), `${years}-Year Managed O&M, Annual AMC & Consumables`, 'Services & AMC', `${project.amcSupportModel} (${project.residentHeadcount} staff, ${years} yrs × ${mwQty} MW)`));
    }
  }

  (project.nonStandardWorks || []).forEach(nsw => {
    if ((Number(nsw.qty) || 0) > 0 && (Number(nsw.unitCostInr) || 0) > 0) {
      bomItems.push(makeBomRow(`nsw_${nsw.id}`, Number(nsw.qty), nsw.desc || 'Non-Standard Site Work', 'Non-Standard Works', `Custom BOQ (${nsw.unit})`, { overrideRate: Number(nsw.unitCostInr), make: 'Site Contractor', model: 'CUSTOM-BOQ', miiPct: 95 }));
    }
  });

  // 11. TOTALS, MII WEIGHTED SCORING, TCO & PLOT FIT
  let totalWeightedMii = 0;
  const totals = bomItems.reduce(
    (acc, it) => {
      totalWeightedMii += it.sellingPreTax * (it.miiPct || 84);
      return {
        rawCost: acc.rawCost + it.rawCostTotal,
        contingency: acc.contingency + (it.withContingency - it.rawCostTotal),
        sellingPreTax: acc.sellingPreTax + it.sellingPreTax,
        gst: acc.gst + it.gstAmt,
        grandTotal: acc.grandTotal + it.grandTotalInclGst
      };
    },
    { rawCost: 0, contingency: 0, sellingPreTax: 0, gst: 0, grandTotal: 0 }
  );

  const overallMiiPct = totals.sellingPreTax > 0 ? Number((totalWeightedMii / totals.sellingPreTax).toFixed(1)) : 86.0;
  const miiClassLabel = overallMiiPct >= 50 ? `Class-I Local Supplier (${overallMiiPct}%)` : `Class-II Local Supplier (${overallMiiPct}%)`;

  const capexSellingPreTax = bomItems.filter(i => i.category !== 'Services & AMC').reduce((s, i) => s + i.sellingPreTax, 0);
  const servicesAmcPreTax = bomItems.filter(i => i.category === 'Services & AMC').reduce((s, i) => s + i.sellingPreTax, 0);
  const d1Factor = project.deploymentMode === 'Phased' ? (project.day1SharePct || 50) / 100 : 1.0;
  const day1CapexPreTax = Math.round(capexSellingPreTax * (0.35 + 0.65 * d1Factor));
  const dayNCapexPreTax = Math.max(0, Math.round(capexSellingPreTax - day1CapexPreTax));

  const annualItKwh = totalActualKw * 8760;
  const annualFacilityKwh = annualItKwh * pueAnnualized;
  const annualPowerCostInr = annualFacilityKwh * (project.gridTariffInrKwh || 8.5);
  const annualWaterCostInr = annualWaterKl * (project.waterTariffInrKl || 65);
  const annualAmcCostInr = project.includeAmcContract ? servicesAmcPreTax / Math.max(1, project.amcYears || 5) : capexSellingPreTax * 0.03;
  const annualTotalOpexInr = annualPowerCostInr + annualWaterCostInr + annualAmcCostInr;
  const fiveYearTcoInr = capexSellingPreTax + annualTotalOpexInr * 5;

  const verts = project.parcelVertices || [];
  let polyArea = 0;
  for (let i = 0; i < verts.length; i++) {
    const j = (i + 1) % verts.length;
    polyArea += verts[i].x * verts[j].y - verts[j].x * verts[i].y;
  }
  const polyAreaSqm = Math.abs(polyArea) / 2;
  const manualSqm =
    project.plotAreaInput !== '' && Number(project.plotAreaInput) > 0
      ? project.plotAreaUnit === 'acres'
        ? Number(project.plotAreaInput) * 4046.8564
        : Number(project.plotAreaInput)
      : 0;
  const grossPlotSqm = manualSqm > 0 ? manualSqm : polyAreaSqm;
  const netBuildableSqm = Math.max(100, grossPlotSqm * 0.72);
  const plotUtilizationPct = Math.min(100, Math.round((totalCampusOccupiedSqm / Math.max(1, netBuildableSqm)) * 100));

  const sourceDba = dgUnitsCount > 0 ? 82 : 76;
  const attenuationDb = 20 * Math.log10(Math.max(2, project.setbackMeters)) + (project.includeAcousticBarrier ? 12 : 0);
  const boundaryNoiseDba = Math.round(sourceDba - attenuationDb);

  const scaleWks = Math.max(1, Math.ceil(totalDesignContKw / 5000));
  const ganttTasks = [
    { task: '1. Detailed Engineering, Statutory Approvals & Submittals', startWk: 1, durWk: 3 + scaleWks },
    { task: '2. Container Fabrication / BnM Civil & Factory Integration', startWk: 2, durWk: 6 + scaleWks },
    { task: '3. Site Plinths, Trenches & Utility Grid Readiness', startWk: 3, durWk: 5 + scaleWks },
    { task: '4. Substation, Modular UPS, BESS, DGs & Cooling Yard', startWk: 5, durWk: 6 + scaleWks },
    { task: '5. Delivery, Crane Rigging, Inter-Bay Ganging & Hydro-Flush', startWk: 9 + scaleWks, durWk: 3 },
    { task: '6. Cold/Hot Commissioning, IST (L1–L5) & Handover', startWk: 12 + scaleWks, durWk: 2 }
  ];

  // 12. SOFT VALIDATION GATE (WITH ACCEPT DEVIATION / WAIVE SUPPORT; NEVER HARD-BLOCKS STAGE 3)
  const rawValidations: ValidationCheck[] = [];
  if (activeRacks.length === 0) {
    rawValidations.push({ status: 'FAIL', code: 'VAL-00', title: 'No IT Racks Configured', msg: 'Add IT racks in Stage 1 (or click Auto-Fit) to size containers, cooling, pumps, and power.' });
  } else {
    rawValidations.push({ status: 'PASS', code: 'VAL-00', title: 'IT Compute Load Defined', msg: `${activeRacks.length} racks (${(dlcDesignKw / 1000).toFixed(2)} MW DLC / ${(acDesignKw / 1000).toFixed(2)} MW AC).` });
  }

  if (inletTempViolation) {
    rawValidations.push({ status: 'FAIL', code: 'VAL-T1', title: 'Coolant Supply Temp Exceeds Rack Inlet Limit', msg: `Target supply ${effectiveSupplyTempC}°C exceeds governing active DLC ceiling (${governingMaxInletTempC}°C).` });
  } else if (hasDlcRacks) {
    rawValidations.push({ status: 'PASS', code: 'VAL-T1', title: 'Inlet Coolant Temperature Envelope Verified', msg: `Supply ${effectiveSupplyTempC}°C <= Governing Limit ${governingMaxInletTempC}°C (${freeCoolMonths}m Free / ${adiabaticMonths}m Spray / ${trimChillerMonths}m Trim).` });
  }

  if (hasDlcRacks && (!project.includeLiquidLoop || !project.includePumpSkids || !project.includeWaterTanks)) {
    rawValidations.push({ status: 'FAIL', code: 'VAL-01', title: 'Incomplete DLC Hydraulic Loop', msg: 'DLC racks require Liquid Heat Rejection, VFD Pump Skids, and Make-Up Water Tanks enabled.' });
  } else if (hasExtCduRacks && !project.includeExtCdu) {
    rawValidations.push({ status: 'FAIL', code: 'VAL-02', title: 'Missing Internal Floor CDUs', msg: 'External-CDU racks require Internal Floor Liquid CDUs enabled.' });
  } else if (activeRacks.length > 0) {
    rawValidations.push({ status: 'PASS', code: 'VAL-01', title: 'DLC Hydraulic & Thermal Loop Verified', msg: `${Math.round(totalFlowLpm)} LPM @ ${pumpDesignHeadBar} bar TDH + ${totalWaterStorageKl} kL tank storage matched.` });
  }

  if (dealPlaceholders.length > 0) {
    rawValidations.push({
      status: 'WARNING',
      code: 'VAL-SC',
      title: `${dealPlaceholders.length} Market-Scout [PLACEHOLDER] SKU(s) Synthesized`,
      msg: `No Supply DB OEM matched within ±20% / <=8 units for: ${dealPlaceholders.map(p => p.group.toUpperCase()).join(', ')}. Export Partner RFQ CSV or override inline.`
    });
  } else if (activeRacks.length > 0) {
    rawValidations.push({ status: 'PASS', code: 'VAL-SC', title: 'Supply Chain OEM Fit Verified (±20% / <=8 Units)', msg: 'All major MEP subsystems matched verified Tier-1 / Tier-2 India OEM SKUs.' });
  }

  if (bearingSafetyFactor < 2.0) {
    rawValidations.push({ status: 'WARNING', code: 'VAL-CIV', title: 'Civil Bearing Safety Factor < 2.0×', msg: `Soil SBC ${sbc} kN/m² vs imposed ${imposedBearingKpa} kN/m² yields FoS ${bearingSafetyFactor}×. Increase footing area or use 4.5m pile cap.` });
  } else {
    rawValidations.push({ status: 'PASS', code: 'VAL-CIV', title: 'Civil Plinth & Foundation Bearing Verified', msg: `${isWeakSoil ? '4.5m Pile Cap' : `${embedmentDepthM}m Pad Footing`} • FoS ${bearingSafetyFactor}× (Safe >= 2.0×) • +${floodPlinthMm}mm flood plinth.` });
  }

  if (activeRacks.length > 0 && (!project.includeIntegratedBms || !project.includeVesdaFire)) {
    rawValidations.push({ status: 'WARNING', code: 'VAL-03', title: 'IBMS or VESDA Fire Suppression Unchecked', msg: 'Mission-critical AI clusters require IBMS and VESDA + Novec 1230 suppression.' });
  } else if (activeRacks.length > 0) {
    rawValidations.push({ status: 'PASS', code: 'VAL-03', title: 'IBMS, VESDA & Novec 1230 Verified', msg: `IBMS, leak ropes, VESDA laser smoke & ${novecGasKg} kg Novec 1230 clean agent active.` });
  }

  if (boundaryNoiseDba > 65 && !project.includeAcousticBarrier) {
    rawValidations.push({ status: 'WARNING', code: 'VAL-06', title: 'CPCB Boundary Noise Exceeds 65 dBA', msg: `Estimated boundary noise is ${boundaryNoiseDba} dBA at ${project.setbackMeters}m setback. Enable Acoustic Barrier Wall.` });
  } else if (pods.length > 0) {
    rawValidations.push({ status: 'PASS', code: 'VAL-06', title: 'Boundary Acoustic Envelope Verified', msg: `Estimated perimeter sound is ${boundaryNoiseDba} dBA (within CPCB 65 dBA industrial limit).` });
  }

  if (project.setbackMeters < 6.0) {
    rawValidations.push({ status: 'FAIL', code: 'VAL-07', title: 'NBC Fire-Tender Driveway Violation', msg: `Setback is ${project.setbackMeters}m. Indian NBC Part 4 requires >= 6.0m clear fire-tender access.` });
  } else {
    rawValidations.push({ status: 'PASS', code: 'VAL-07', title: 'NBC Setback & Parcel Fit Verified', msg: `${project.setbackMeters}m fire lane preserved; ${plotUtilizationPct}% net buildable plot utilized.` });
  }

  const waivers = project.validationWaivers || {};
  const validations: ValidationCheck[] = rawValidations.map(v => {
    const w = waivers[v.code];
    if (w?.waived) {
      return { ...v, waived: true, waiverNote: w.note, waivedAt: w.waivedAt };
    }
    return v;
  });

  const isNoTier = project.uptimeTier === 'None';
  const isNoReg = (project.regulatoryCode || '').toLowerCase().includes('no specific compliance');

  const uptimeChecks: ValidationCheck[] = isNoTier
    ? [{ code: 'UPT-00', title: 'No Uptime Tier Mandate Selected', status: 'NA', msg: 'Basic N / Best-Effort deployment without Uptime Tier II/III/IV certification.' }]
    : [
        {
          code: 'UPT-01',
          title: `${project.uptimeTier} Redundant Capacity (${project.uptimeTier === 'Tier IV' ? '2N' : 'N+1'})`,
          status: activeRacks.length > 0 && upsContainersCount >= (project.uptimeTier === 'Tier IV' ? upsCalc.activeN * 2 : upsCalc.activeN + 1) ? 'GREEN' : 'RED',
          msg: upsContainersCount > 0 ? `UPS configured: ${upsContainersCount} pods (Active N=${upsCalc.activeN}, Redundant R=${upsContainersCount - upsCalc.activeN}).` : 'Modular UPS pods missing or undersized.'
        },
        {
          code: 'UPT-02',
          title: 'Dual-Path A/B Power Distribution',
          status: pods.length > 0 ? 'GREEN' : 'AMBER',
          msg: `Overhead Dual A/B ${standards.buswayAmperageA}A track busways ${project.includeIntelligentRpdu ? '+ dual-corded metered rPDUs' : ''}.`
        },
        {
          code: 'UPT-03',
          title: project.uptimeTier === 'Tier IV' ? '2N Fault-Tolerant Cooling & Continuous Pump Bus' : 'Concurrently Maintainable Thermal & Hydraulic Loop',
          status: !hasDlcRacks || (project.includeLiquidLoop && project.includePumpSkids && project.upsBacksUpCooling) ? 'GREEN' : 'AMBER',
          msg: project.upsBacksUpCooling ? 'Primary VFD pumps & CDUs backed on UPS bus for continuous thermal ride-through.' : 'Enable UPS cooling backup for uninterrupted DG transfer.'
        },
        {
          code: 'UPT-04',
          title: `Prime / Standby Engine-Generator Autonomy (${project.dgAutonomyHours}h)`,
          status: project.includeDgYard && dgUnitsCount >= 2 && project.dgAutonomyHours >= (project.uptimeTier === 'Tier IV' ? 48 : 12) ? 'GREEN' : project.includeDgYard ? 'AMBER' : 'RED',
          msg: project.includeDgYard ? `${dgUnitsCount} × ${selDg.ratedCapacity} kVA CPCB IV+ DGs with ${totalHsdFuelLitres.toLocaleString()} L fuel (${project.dgAutonomyHours}h).` : 'Standby DG plant not included.'
        }
      ];

  const bisChecks: ValidationCheck[] = isNoReg
    ? [{ code: 'BIS-00', title: 'No Specific Statutory / BIS Mandates Selected', status: 'NA', msg: 'Non-regulated internal pilot scope.' }]
    : [
        { code: 'IS-1893', title: `IS 1893 Seismic Structural Compliance (${project.seismicZone})`, status: !isHighSeismic || project.emiShielding ? 'GREEN' : 'AMBER', msg: `${project.seismicLabel} — structural gussets & flexible braided SS316L coolant loops.` },
        { code: 'CEA-2023', title: 'CEA Safety & Electric Supply', status: project.includeTransformer && project.includeLvSwitchgear ? 'GREEN' : 'AMBER', msg: `IS 1180 / IEC 60076 ${project.transformerType} transformers + Form-4B LV ACB switchgear.` },
        { code: 'NBC-IV', title: 'NBC Part 4 Fire Safety & 6.0m Access', status: project.setbackMeters >= 6.0 && project.includeVesdaFire ? 'GREEN' : project.setbackMeters < 6.0 ? 'RED' : 'AMBER', msg: `${project.setbackMeters}m perimeter fire lane; VESDA + ${novecGasKg} kg Novec 1230.` },
        { code: 'CPCB-PESO', title: 'CPCB IV+ Noise (<=65 dBA) & PESO Fuel', status: boundaryNoiseDba <= 65 || project.includeAcousticBarrier ? 'GREEN' : 'AMBER', msg: `Boundary noise ${boundaryNoiseDba} dBA; ${totalHsdFuelLitres.toLocaleString()} L PESO HSD storage.` },
        { code: 'BIS-UPS', title: 'BIS / IEC 62040 UPS & IBMS Telemetry', status: project.includeUpsContainer && project.includeIntegratedBms ? 'GREEN' : 'AMBER', msg: `IEC 62040-3 Online UPS (${project.batteryChemistry}) + IBMS/DCIM/EPMS.` }
      ];

  const failCount = validations.filter(v => v.status === 'FAIL').length;
  const unwaivedFailCount = validations.filter(v => v.status === 'FAIL' && !v.waived).length;
  const warnCount = validations.filter(v => v.status === 'WARNING' && !v.waived).length;
  const waivedCount = validations.filter(v => v.waived).length;

  const loadDropShieldMw = Number(((totalDesignContKw / 1000) * 0.2).toFixed(2));
  const commissioningSchedule = [
    { level: 'L1 — Factory Acceptance Test (FAT)', scope: 'Shell hydro-test (1.5× MAWP), busway hi-pot, internal CDU, PAC & switchgear FAT', gate: 'Pre-Dispatch Release' },
    { level: 'L2 — Site Acceptance & Civil Verification', scope: `+${floodPlinthMm}mm RCC plinth level check, M30 seismic anchor torque, ${craneTonnage}T crane rigging`, gate: 'Installation Sign-Off' },
    { level: 'L3 — Pre-Functional & Cold Commissioning', scope: 'RO/DM pre-treatment, SS316L flushing, factory PG25 glycol fill, IBMS point-to-point', gate: 'Energization Permit (CEIG)' },
    { level: 'L4 — Functional Subsystem Testing', scope: 'UPS battery discharge, CPCB IV+ DG auto-transfer, VESDA/Novec & mantrap interlocks', gate: 'Subsystems Ready' },
    { level: 'L5 — Integrated Systems Testing (IST)', scope: `100% heat-load bank run + ${loadDropShieldMw} MW sudden load-rejection simulation`, gate: 'Handover & SLA Start' }
  ];

  return {
    activeRacks, dlcRacks, acRacks, pods, dlcPods, acPods,
    totalNameplatePeakKw, totalDesignContKw, totalActualKw, dlcDesignKw, acDesignKw,
    totalLiquidKw, totalAirKw,
    governingMaxInletTempC, effectiveSupplyTempC, inletTempViolation,
    monthlyProfile, freeCoolMonths, adiabaticMonths, trimChillerMonths, peakMonthWaterKl, annualWaterKl,
    totalFlowLpm, maxReqDeltaPBar, headerFrictionBar, cduDropBar, pumpDesignHeadBar, pumpSkidsCount, pumpCalc,
    reqWaterKl, totalWaterStorageKl, waterTankUnits, selTank,
    extCduRequiredKw, hasDlcRacks, hasExtCduRacks,
    recommendedCoolingMode, coolingMode, trimChillerKw,
    pueAnnualized, puePeakDesign, totalFacilityPeakKw, totalFacilityPeakKva,
    selTrafo, trafoCalc, transformerUnits, lvSwitchgearUnits,
    selUps, upsCalc, upsContainersCount, upsCriticalLoadKva,
    batteryKwhReq, batteryContainersCount,
    selDg, dgCalc, dgUnitsCount, dgDerateFactor, effectiveDgKva, totalHsdFuelLitres,
    selCdu, cduCalc, extCduUnits,
    selCooler, coolerCalc, adiabaticUnits,
    trimChillerUnits, airSideUnits, novecGasKg,
    activeRackFootprintSqm, aisleServiceAreaSqm, futureGrowthAreaSqm, totalItWhiteSpaceSqm,
    yardBreakdown, totalNonItYardSqm, totalCampusOccupiedSqm, plinthSqm,
    sharedWallSavingsSqm, bomItems, totals, capexSellingPreTax, servicesAmcPreTax,
    day1CapexPreTax, dayNCapexPreTax,
    annualPowerCostInr, annualWaterCostInr, annualAmcCostInr, annualTotalOpexInr, fiveYearTcoInr,
    grossPlotSqm, netBuildableSqm, plotUtilizationPct,
    boundaryNoiseDba, ganttTasks, validations, uptimeChecks, bisChecks,
    failCount, unwaivedFailCount, warnCount, waivedCount,
    whiteSpace: {
      internalCduCount, internalCduFootprintSqm,
      mandatoryPacCount, pacFootprintSqm,
      chillerUnitsCount, totalChillerLoadKw,
      pduFootprintSqm, whiteSpaceSupportSqm
    },
    civil: {
      isBnM, floodPlinthMm, unitGrossTonnes, floorPressureKpa, cornerNodeKn,
      sbc, isWeakSoil, embedmentDepthM, imposedBearingKpa, bearingSafetyFactor, foundationType
    },
    gridShield: { loadDropShieldMw },
    telecom: {
      mmrRoomsCount, odfBaysCount, totalFiberStrands, overheadFiberMeters, gpuFabricLinks,
      fabricType: project.fabricType
    },
    logistics: {
      trailerCount, minTurningRadiusM, craneTonnage, outriggerGroundKpa, laydownStagingSqm
    },
    unitDatasheets,
    mii: { overallMiiPct, miiClassLabel },
    commissioningSchedule,
    supplyMatches,
    dealPlaceholders
  };
}
