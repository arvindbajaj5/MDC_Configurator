import type {
  BoqLineItem,
  CivilPlinthResult,
  CommercialTcoResult,
  DealConfig,
  ElectricalSldResult,
  MepCoolingResult,
  SupplyIntelSku,
  TcoYearRow
} from '../types/schema';

function findSku(skus: SupplyIntelSku[], skuId: string, fallbackLakhs: number, fallbackMii: number) {
  const match = skus.find((s) => s.skuId === skuId);
  return {
    unitCostInrCr: (match ? match.unitPriceInrLakhs : fallbackLakhs) / 100,
    miiPercent: match ? match.miiPercent : fallbackMii
  };
}

/**
 * Generates the engineering-linked Commercial BOQ, applies Special Vendor Quotes,
 * computes CapEx (contingency + margin + GST), CapEx-weighted MII %, and 5-Year TCO.
 */
export function computeCommercialTco(
  deal: DealConfig,
  mep: MepCoolingResult,
  civil: CivilPlinthResult,
  electrical: ElectricalSldResult,
  supplyIntel: SupplyIntelSku[]
): CommercialTcoResult {
  const podSku = findSku(supplyIntel, 'IND-POD-2MW-10', 185, 91);
  const cduSku = findSku(supplyIntel, 'IND-CDU-1350-08', 92, 42);
  const pacSku = findSku(supplyIntel, 'IND-PAC-80KW-09', 26, 74);
  const chlSku = findSku(supplyIntel, 'IND-CHL-ADB-07', 235, 58);
  const swgSku = findSku(supplyIntel, 'IND-SWG-33KV-01', 28.5, 68);
  const trfSku = findSku(supplyIntel, 'IND-TRF-K13-02', 64, 82);
  const busSku = findSku(supplyIntel, 'IND-BUS-IP65-03', 18.2, 79);
  const upsSku = findSku(supplyIntel, 'IND-UPS-MOD-04', 148, 54);
  const bessSku = findSku(supplyIntel, 'IND-BESS-LFP-05', 310, 56);
  const dgSku = findSku(supplyIntel, 'IND-DG-2500-06', 245, 76);
  const vesdaSku = findSku(supplyIntel, 'IND-VES-FIRE-12', 22, 48);
  const scrubSku = findSku(supplyIntel, 'IND-SCR-AIR-13', 14.5, 80);
  const mmrSku = findSku(supplyIntel, 'IND-MMR-ODF-15', 12.8, 84);
  const conSku = findSku(supplyIntel, 'IND-CON-GLY-16', 9.5, 86);

  const rawLines: Array<{
    lineId: string;
    category: string;
    description: string;
    unit: string;
    quantity: number;
    baseUnitCostInrCr: number;
    miiPercent: number;
  }> = [
    {
      lineId: 'BOQ-ENC',
      category: 'White-Space Structure',
      description:
        deal.architecture === 'Container'
          ? `${deal.containerUnitMw} MW Prefabricated Seismic-Rated AI DLC Modular Pods`
          : `Brick-and-Mortar (BnM) High-Bay AI Data Hall Shell & Acoustic Envelope`,
      unit: deal.architecture === 'Container' ? 'Pods' : 'm²',
      quantity: deal.architecture === 'Container' ? mep.podCount : mep.whiteSpaceAreaM2,
      baseUnitCostInrCr:
        deal.architecture === 'Container'
          ? podSku.unitCostInrCr * (deal.containerUnitMw === 2.0 ? 1 : deal.containerUnitMw === 1.0 ? 0.64 : 0.42)
          : 0.0115,
      miiPercent: deal.architecture === 'Container' ? podSku.miiPercent : 94
    },
    {
      lineId: 'BOQ-CDU',
      category: 'Liquid Cooling (Internal)',
      description: `1.35 MW Internal Liquid-to-Liquid CDU Towers (Zero Yard CDUs, ${deal.redundancy})`,
      unit: 'Towers',
      quantity: mep.internalCduCountTotal,
      baseUnitCostInrCr: cduSku.unitCostInrCr,
      miiPercent: cduSku.miiPercent
    },
    {
      lineId: 'BOQ-PAC',
      category: 'Precision Air Cooling',
      description: `Mandatory 80 kW Chilled-Water PAC Units (${deal.redundancy} Residual + Dehumidification)`,
      unit: 'Units',
      quantity: mep.pacCountTotal,
      baseUnitCostInrCr: pacSku.unitCostInrCr,
      miiPercent: pacSku.miiPercent
    },
    {
      lineId: 'BOQ-CHL',
      category: 'Heat Rejection Plant',
      description: `2.2 MW Free-Cooling Adiabatic Chillers (${deal.chillerPlacement} Mounted) + Primary Pumps`,
      unit: 'Units',
      quantity: mep.chillerCountTotal,
      baseUnitCostInrCr: chlSku.unitCostInrCr,
      miiPercent: chlSku.miiPercent
    },
    {
      lineId: 'BOQ-MV',
      category: 'MV Power & Transformers',
      description: `${electrical.incomingVoltageKv} kV Switchgear (${electrical.mvSwitchgearPanels} Panels) + ${electrical.transformerCountTotal}x ${electrical.transformerRatingMva} MVA ${electrical.standards.kFactorRating} Transformers`,
      unit: 'Lot',
      quantity: 1,
      baseUnitCostInrCr: Number(
        (
          electrical.mvSwitchgearPanels * swgSku.unitCostInrCr +
          electrical.transformerCountTotal * trfSku.unitCostInrCr +
          (electrical.incomingVoltageKv === 132 ? 12.5 : 0)
        ).toFixed(2)
      ),
      miiPercent: Math.round((swgSku.miiPercent + trfSku.miiPercent) / 2)
    },
    {
      lineId: 'BOQ-LV',
      category: 'LV Distribution & Busducts',
      description: `${electrical.busductRunsCount}x ${electrical.busductRatingAmps}A ${electrical.busductIpRating} Sandwich Busduct Runs + Intelligent RPPs`,
      unit: 'Runs',
      quantity: electrical.busductRunsCount,
      baseUnitCostInrCr: Number((busSku.unitCostInrCr * 2.4).toFixed(3)),
      miiPercent: busSku.miiPercent
    },
    {
      lineId: 'BOQ-UPS',
      category: 'UPS & BESS Ride-Through',
      description: deal.includeBessRideThrough
        ? `Modular Li-Ion UPS (${electrical.upsCapacityMw} MW) + ${electrical.bessPowerMw} MW / ${electrical.bessEnergyMwh} MWh LFP BESS`
        : `Modular Li-Ion Online Double-Conversion UPS (${electrical.upsCapacityMw} MW)`,
      unit: 'Lot',
      quantity: 1,
      baseUnitCostInrCr: Number(
        (
          Math.ceil(electrical.upsCapacityMw / 1.2) * upsSku.unitCostInrCr +
          (deal.includeBessRideThrough ? Math.ceil(electrical.bessPowerMw / 2.5) * bessSku.unitCostInrCr : 0)
        ).toFixed(2)
      ),
      miiPercent: Math.round((upsSku.miiPercent + bessSku.miiPercent) / 2)
    },
    {
      lineId: 'BOQ-DG',
      category: 'Backup Generation',
      description: `${electrical.dgCountTotal}x ${electrical.dgUnitRatingMva} MVA CPCB-IV+ Acoustic DG Sets + Bulk Fuel Storage`,
      unit: 'Units',
      quantity: electrical.dgCountTotal,
      baseUnitCostInrCr: dgSku.unitCostInrCr,
      miiPercent: dgSku.miiPercent
    },
    {
      lineId: 'BOQ-CIV',
      category: 'Civil, Plinth & Foundation',
      description: `${civil.foundationType} (${civil.embedmentDepthM}m depth, ${civil.concreteVolumeM3} m³ M35, ${civil.rebarTonnageMt} MT Rebar, ${civil.drainageSlope} drainage)`,
      unit: 'Lot',
      quantity: 1,
      baseUnitCostInrCr: civil.civilTotalCostInrCr,
      miiPercent: 95
    },
    {
      lineId: 'BOQ-CMP',
      category: 'Compliance, Safety & MMR',
      description: `VESDA-E (${mep.complianceGear.vesdaDetectors}), Chemical Air Scrubbers (${mep.complianceGear.chemicalAirScrubbers}), CCTV/Rodent Grid & ${deal.telecom.mmrCount}x Carrier MMRs`,
      unit: 'Lot',
      quantity: 1,
      baseUnitCostInrCr: Number(
        (
          mep.complianceGear.vesdaDetectors * vesdaSku.unitCostInrCr +
          mep.complianceGear.chemicalAirScrubbers * scrubSku.unitCostInrCr +
          deal.telecom.mmrCount * deal.telecom.odfBaysPerMmr * mmrSku.unitCostInrCr +
          0.35
        ).toFixed(2)
      ),
      miiPercent: 72
    },
    {
      lineId: 'BOQ-SRV',
      category: 'Logistics, Rigging & L1-L5',
      description: `Heavy-Lift Rigging (${deal.logistics.craneTonnage}T Crane), DCIM/EPMS/BMS, PG25 Consumables & L1–L5 IST Commissioning`,
      unit: 'MW',
      quantity: mep.itLoadMw,
      baseUnitCostInrCr: Number((0.42 + conSku.unitCostInrCr).toFixed(3)),
      miiPercent: 88
    }
  ];

  // Apply Special Vendor Quotes per line item
  const boqLines: BoqLineItem[] = rawLines.map((line) => {
    const sq = deal.specialQuotes?.[line.lineId];
    let effectiveUnitCost = line.baseUnitCostInrCr;
    let hasSpecialQuote = false;

    if (sq) {
      if (typeof sq.overrideUnitCostInrCr === 'number' && sq.overrideUnitCostInrCr >= 0) {
        effectiveUnitCost = sq.overrideUnitCostInrCr;
        hasSpecialQuote = true;
      } else if (typeof sq.discountPct === 'number' && sq.discountPct !== 0) {
        effectiveUnitCost = line.baseUnitCostInrCr * (1 - sq.discountPct / 100);
        hasSpecialQuote = true;
      }
    }

    const roundedUnit = Number(effectiveUnitCost.toFixed(4));
    const extendedCostInrCr = Number((roundedUnit * line.quantity).toFixed(2));

    return {
      ...line,
      effectiveUnitCostInrCr: roundedUnit,
      extendedCostInrCr,
      hasSpecialQuote,
      specialQuote: sq
    };
  });

  const equipmentSubtotalInrCr = Number(
    boqLines.reduce((acc, l) => acc + l.extendedCostInrCr, 0).toFixed(2)
  );
  const weightedBoqMiiPercent = Number(
    (
      boqLines.reduce((acc, l) => acc + l.extendedCostInrCr * l.miiPercent, 0) /
      Math.max(0.01, equipmentSubtotalInrCr)
    ).toFixed(1)
  );

  const contingencyInrCr = Number(((equipmentSubtotalInrCr * deal.commercial.contingencyPct) / 100).toFixed(2));
  const marginInrCr = Number(
    (((equipmentSubtotalInrCr + contingencyInrCr) * deal.commercial.marginPct) / 100).toFixed(2)
  );
  const preTaxCapexInrCr = Number((equipmentSubtotalInrCr + contingencyInrCr + marginInrCr).toFixed(2));
  const gstInrCr = Number(((preTaxCapexInrCr * deal.commercial.gstPct) / 100).toFixed(2));
  const totalCapexInrCr = Number((preTaxCapexInrCr + gstInrCr).toFixed(2));
  const capexPerMwInrCr = Number((totalCapexInrCr / Math.max(0.1, mep.itLoadMw)).toFixed(2));

  // 5-Year TCO Schedule (assuming 85% AI cluster average utilization over 8,760 hrs/yr)
  const years = Math.max(1, Math.min(10, deal.commercial.tcoYears || 5));
  const utilizationFactor = 0.85;
  const annualItKwh = mep.itLoadMw * 1000 * 8760 * utilizationFactor;
  const annualFacilityKwh = annualItKwh * mep.estimatedPue;

  const schedule: TcoYearRow[] = [];
  let cumulative = totalCapexInrCr;
  let totalOpex5YrInrCr = 0;

  for (let yr = 1; yr <= years; yr++) {
    const escalationFactor = Math.pow(1 + deal.commercial.tariffEscalationPct / 100, yr - 1);
    const powerCostInrCr = Number(
      ((annualFacilityKwh * deal.commercial.powerTariffInrPerKwh * escalationFactor) / 1e7).toFixed(2)
    );
    const omCostInrCr = Number(((preTaxCapexInrCr * (deal.commercial.annualOmPctOfCapex / 100)) * escalationFactor).toFixed(2));
    const amcCostInrCr = Number(((preTaxCapexInrCr * (deal.commercial.annualAmcPctOfCapex / 100)) * escalationFactor).toFixed(2));
    const waterCostInrCr = Number(
      ((mep.annualWaterConsumptionKl * deal.commercial.waterTariffInrPerKl * escalationFactor) / 1e7).toFixed(2)
    );
    const totalOpexInrCr = Number((powerCostInrCr + omCostInrCr + amcCostInrCr + waterCostInrCr).toFixed(2));

    totalOpex5YrInrCr = Number((totalOpex5YrInrCr + totalOpexInrCr).toFixed(2));
    cumulative = Number((cumulative + totalOpexInrCr).toFixed(2));

    schedule.push({
      year: yr,
      powerCostInrCr,
      omCostInrCr,
      amcCostInrCr,
      waterCostInrCr,
      totalOpexInrCr,
      cumulativeTcoInrCr: cumulative
    });
  }

  const totalTco5YrInrCr = Number((totalCapexInrCr + totalOpex5YrInrCr).toFixed(2));
  const inrPerItKwh5Yr = Number(((totalTco5YrInrCr * 1e7) / (annualItKwh * years)).toFixed(2));

  return {
    boqLines,
    equipmentSubtotalInrCr,
    contingencyInrCr,
    marginInrCr,
    preTaxCapexInrCr,
    gstInrCr,
    totalCapexInrCr,
    capexPerMwInrCr,
    totalOpex5YrInrCr,
    totalTco5YrInrCr,
    inrPerItKwh5Yr,
    schedule,
    weightedBoqMiiPercent
  };
}
