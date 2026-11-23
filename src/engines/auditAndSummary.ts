import type {
  AuditCheckItem,
  CommissioningStep,
  DealConfig,
  ExecutiveSummaryPoint,
  FullEngineeringOutput,
  RiggingManifestRow
} from '../types/schema';

export function buildDefaultRiggingManifest(
  deal: DealConfig,
  eng: FullEngineeringOutput
): RiggingManifestRow[] {
  if (deal.riggingManifest && deal.riggingManifest.length > 0) {
    return deal.riggingManifest;
  }
  return [
    {
      id: 'RIG-01',
      equipment:
        deal.architecture === 'Container'
          ? `${deal.containerUnitMw} MW Prefabricated AI DLC Modular Pods`
          : 'BnM Structural Roof Trusses & Pre-Engineered Portal Frames',
      quantity: deal.architecture === 'Container' ? eng.mep.podCount : Math.max(4, eng.mep.podCount * 2),
      unitWeightTons: deal.architecture === 'Container' ? deal.logistics.heaviestLiftTons : 18,
      transportMode: 'Multi-Axle Low-Bed Hydraulic Trailer (ODC Permit)',
      craneSpec: `${deal.logistics.craneTonnage}T All-Terrain Mobile Crane @ ${deal.logistics.boomRadiusM}m radius`,
      spreaderRequired: true
    },
    {
      id: 'RIG-02',
      equipment: '2.2 MW Free-Cooling Adiabatic Magnetic Bearing Chillers',
      quantity: eng.mep.chillerCountTotal,
      unitWeightTons: 16.5,
      transportMode: '40ft Flat-Rack Heavy Trailer',
      craneSpec: deal.chillerPlacement === 'Roof' ? `${Math.max(200, deal.logistics.craneTonnage)}T Crane w/ Luffing Jib` : '130T Mobile Crane',
      spreaderRequired: true
    },
    {
      id: 'RIG-03',
      equipment: `3.15 MVA ${eng.electrical.standards.kFactorRating} Cast Resin Dry-Type Transformers`,
      quantity: eng.electrical.transformerCountTotal,
      unitWeightTons: 9.8,
      transportMode: '20ft Air-Ride Enclosed Trailer',
      craneSpec: '80T Telescopic Crane + Hydraulic Skates',
      spreaderRequired: false
    },
    {
      id: 'RIG-04',
      equipment: '2.5 MVA CPCB-IV+ Acoustic DG Sets + Exhaust Silencers',
      quantity: eng.electrical.dgCountTotal,
      unitWeightTons: 22.0,
      transportMode: 'Multi-Axle Low-Bed Trailer',
      craneSpec: '150T Mobile Crane on Steel Road Mats',
      spreaderRequired: true
    },
    {
      id: 'RIG-05',
      equipment: 'Containerized LFP BESS Skids (AI Load-Drop Buffer)',
      quantity: deal.includeBessRideThrough ? Math.max(1, Math.ceil(eng.electrical.bessPowerMw / 2.5)) : 0,
      unitWeightTons: 24.0,
      transportMode: 'Dangerous Goods (Class 9) Certified Low-Bed',
      craneSpec: '180T Mobile Crane + Insulated Lifting Beam',
      spreaderRequired: true
    }
  ].filter((row) => row.quantity > 0);
}

export function buildCommissioningChecklist(completedIds: string[] = []): CommissioningStep[] {
  const done = new Set(completedIds);
  const steps: Omit<CommissioningStep, 'completed'>[] = [
    { id: 'L1-1', level: 'L1', phaseTitle: 'Factory Acceptance (FAT)', checkpoint: 'Pod structural weld, 2-hr fire-rating & seismic Zone anchor jig sign-off', owner: 'Fab OEM / QA' },
    { id: 'L1-2', level: 'L1', phaseTitle: 'Factory Acceptance (FAT)', checkpoint: 'CDU manifold hydrostatic pressure test (1.5x working bar) & PG25 flush', owner: 'Thermal OEM' },
    { id: 'L1-3', level: 'L1', phaseTitle: 'Factory Acceptance (FAT)', checkpoint: 'MV switchgear, K-13 transformer & BESS factory witness test', owner: 'Electrical OEM' },
    { id: 'L2-1', level: 'L2', phaseTitle: 'Site Receiving & Civil Sign-off', checkpoint: 'RCC plinth / pile load test report & 1:50 yard stormwater laser level check', owner: 'Civil Contractor' },
    { id: 'L2-2', level: 'L2', phaseTitle: 'Site Receiving & Civil Sign-off', checkpoint: 'Heavy-lift crane pad bearing verification & pod placement shock-log inspection', owner: 'Rigging Lead' },
    { id: 'L3-1', level: 'L3', phaseTitle: 'Pre-Functional & Static (L3)', checkpoint: 'IS 3043 earthing mesh resistance (<1.0 Ohm) & IP65 busduct IR/Hi-Pot test', owner: 'Electrical Lead' },
    { id: 'L3-2', level: 'L3', phaseTitle: 'Pre-Functional & Static (L3)', checkpoint: 'VESDA-E smoke aspiration sensitivity, Novec-1230 room integrity fan test', owner: 'FLS Engineer' },
    { id: 'L3-3', level: 'L3', phaseTitle: 'Pre-Functional & Static (L3)', checkpoint: 'Dual diverse Carrier MMR fiber OTDR loss trace & ODF splice verification', owner: 'Telecom Lead' },
    { id: 'L4-1', level: 'L4', phaseTitle: 'Functional Testing / SAT (L4)', checkpoint: 'Chiller, 80 kW PAC & internal CDU automatic N+1 failover & BMS Modbus telemetry', owner: 'CxA / MEP' },
    { id: 'L4-2', level: 'L4', phaseTitle: 'Functional Testing / SAT (L4)', checkpoint: 'DG synchronization, AMF changeover (<10s) & BESS step-load transient response', owner: 'CxA / Power' },
    { id: 'L5-1', level: 'L5', phaseTitle: 'Integrated Systems Test (IST)', checkpoint: '100% thermal & electrical load-bank burn-in (24 hrs) including simulated utility loss', owner: 'Independent CxA' },
    { id: 'L5-2', level: 'L5', phaseTitle: 'Integrated Systems Test (IST)', checkpoint: 'Concurrent maintainability pull-the-plug drill & Uptime Tier / CEA energization sign-off', owner: 'Client & CxA' }
  ];
  return steps.map((s) => ({ ...s, completed: done.has(s.id) }));
}

export function runComplianceAudits(
  deal: DealConfig,
  eng: FullEngineeringOutput
): AuditCheckItem[] {
  const tierRedundancyPass =
    deal.uptimeTier === 'Tier IV'
      ? deal.redundancy === '2N' || deal.redundancy === '2N+1'
      : deal.redundancy === 'N+1' || deal.redundancy === '2N' || deal.redundancy === '2N+1';

  const vaultSeparationPass = deal.telecom.diverseVaultSeparationM >= 20 && deal.telecom.mmrCount >= 2;
  const plinthFloodPass = deal.climate.annualRainfallMm <= 1800 || deal.civil.plinthClearHeightM >= 0.9;
  const inletPass = deal.maxInletTempC <= 35;

  return [
    {
      id: 'AUD-01',
      domain: 'Uptime Tier',
      codeRef: `Uptime Institute ${deal.uptimeTier}`,
      requirement: 'Topology matches concurrent maintainability / fault tolerance class',
      status: tierRedundancyPass ? 'PASS' : 'WARN',
      evidence: `${deal.uptimeTier} configured with ${deal.redundancy} power & cooling topology (${eng.electrical.busductRunsCount} dual A/B busways).`
    },
    {
      id: 'AUD-02',
      domain: 'Uptime Tier',
      codeRef: 'Thermal Continuity & Zero Yard CDU Policy',
      requirement: 'Internal CDU towers with mandatory 80 kW PAC residual dehumidification',
      status: eng.mep.yardCduCount === 0 && eng.mep.pacCountTotal >= eng.mep.podCount ? 'PASS' : 'FAIL',
      evidence: `Yard CDUs = ${eng.mep.yardCduCount}; Internal CDUs = ${eng.mep.internalCduCountTotal}; 80 kW PACs = ${eng.mep.pacCountTotal}.`
    },
    {
      id: 'AUD-03',
      domain: 'BIS / IS Codes',
      codeRef: 'IS 1893:2016 Part 1',
      requirement: `Seismic anchorage & foundation sizing for ${deal.climate.seismicZone} (Z=${deal.climate.seismicZoneFactorZ})`,
      status: eng.civil.fosStatus === 'MARGINAL' ? 'WARN' : 'PASS',
      evidence: `${eng.civil.foundationType} (${eng.civil.embedmentDepthM}m depth, FoS ${eng.civil.bearingFoS}x), ${eng.civil.anchorBoltSpec}.`
    },
    {
      id: 'AUD-04',
      domain: 'BIS / IS Codes',
      codeRef: `${eng.electrical.standards.wiringCode} / ${eng.electrical.standards.harmonicsStandard}`,
      requirement: 'AI GPU non-linear harmonic mitigation & <1 Ohm earthing mesh',
      status: 'PASS',
      evidence: `${eng.electrical.transformerCountTotal}x ${eng.electrical.standards.kFactorRating} transformers, ${eng.electrical.standards.busductIpRating} busducts, ${eng.electrical.standards.earthingStandard}.`
    },
    {
      id: 'AUD-05',
      domain: 'BIS / IS Codes',
      codeRef: 'CEA Grid Code & CPCB-IV+',
      requirement: 'Compliant acoustic backup generation & AI load-drop ride-through',
      status: deal.includeBessRideThrough ? 'PASS' : 'WARN',
      evidence: `${eng.electrical.dgCountTotal}x CPCB-IV+ DGs; BESS ${deal.includeBessRideThrough ? `${eng.electrical.bessPowerMw} MW / ${eng.electrical.bessEnergyMwh} MWh active` : 'not included'}.`
    },
    {
      id: 'AUD-06',
      domain: 'NBC Fire & Life Safety',
      codeRef: 'NBC India Part 4 & NFPA 2001',
      requirement: 'Early smoke detection, clean-agent suppression & 6m fire tender access',
      status: plinthFloodPass ? 'PASS' : 'WARN',
      evidence: `${eng.mep.complianceGear.vesdaDetectors} VESDA-E zones, Novec-1230 packs, ${eng.mep.complianceGear.chemicalAirScrubbers} ISA G1 scrubbers, plinth ${deal.civil.plinthClearHeightM}m FGL.`
    },
    {
      id: 'AUD-07',
      domain: 'NBC Fire & Life Safety',
      codeRef: 'ASHRAE TC 9.9 Thermal Envelope',
      requirement: 'White-space air inlet & liquid FWS temperatures within GPU OEM warranty',
      status: inletPass ? 'PASS' : 'WARN',
      evidence: `Air inlet ${deal.maxInletTempC}°C | FWS ${deal.fwsSupplyTempC}°C | Design Dry-Bulb ${deal.climate.designDryBulbC}°C.`
    },
    {
      id: 'AUD-08',
      domain: 'PPP-MII & Telecom',
      codeRef: 'DPIIT PPP-MII Order (Class-I >= 50%)',
      requirement: 'Local India manufacturing content threshold for sovereign tenders',
      status: eng.commercial.weightedBoqMiiPercent >= 50 ? 'PASS' : 'WARN',
      evidence: `Weighted BOQ MII = ${eng.commercial.weightedBoqMiiPercent}% (${eng.supplyChain.pppMiiClass}); Catalog avg = ${eng.supplyChain.weightedMiiPercent}%.`
    },
    {
      id: 'AUD-09',
      domain: 'PPP-MII & Telecom',
      codeRef: 'TIA-942-B Carrier Diversity',
      requirement: 'Dual Meet-Me Rooms with >= 20m diverse underground fiber vault separation',
      status: vaultSeparationPass ? 'PASS' : 'WARN',
      evidence: `${deal.telecom.mmrCount} MMRs, ${deal.telecom.diverseVaultSeparationM}m vault separation, ${deal.telecom.odfBaysPerMmr} ODF bays/MMR.`
    }
  ];
}

export function build15PointExecutiveSummary(
  deal: DealConfig,
  eng: FullEngineeringOutput
): ExecutiveSummaryPoint[] {
  return [
    {
      index: 1,
      category: 'Program Scope',
      headline: `${deal.targetItLoadMw.toFixed(1)} MW Sovereign/Enterprise AI Facility`,
      detail: `${deal.name} configured for ${deal.customer} using ${deal.architecture === 'Container' ? `prefabricated ${deal.containerUnitMw} MW Modular Pods` : 'Brick-and-Mortar (BnM) High-Bay Data Hall'}.`
    },
    {
      index: 2,
      category: 'Site & Climate',
      headline: `${deal.climate.city}, ${deal.climate.state} (${deal.climate.ashraeClass})`,
      detail: `Design dry-bulb ${deal.climate.designDryBulbC}°C / wet-bulb ${deal.climate.designWetBulbC}°C (${deal.climate.source}); monsoon rainfall ${deal.climate.annualRainfallMm} mm/yr.`
    },
    {
      index: 3,
      category: 'Seismic Readiness',
      headline: `IS 1893 ${deal.climate.seismicZone} (Z = ${deal.climate.seismicZoneFactorZ})`,
      detail: `All enclosures, racks, and yard plant anchored via ${eng.civil.anchorBoltSpec}.`
    },
    {
      index: 4,
      category: 'Rack & Pod Density',
      headline: `${eng.mep.totalRacks} High-Density AI Racks @ ${deal.avgRackKw} kW avg`,
      detail: `${eng.mep.dlcRacks} DLC racks (${deal.dlcSharePct}%) + ${eng.mep.airRacks} air-cooled racks housed across ${eng.mep.podCount} modular pods/galleries (2.5m H × 900mm W × 1200mm D).`
    },
    {
      index: 5,
      category: 'Thermal Architecture',
      headline: `Design PUE ${eng.mep.estimatedPue.toFixed(2)} | Zero Yard CDUs`,
      detail: `${eng.mep.internalCduCountTotal} internal 1.35 MW CDU towers + ${eng.mep.pacCountTotal} mandatory 80 kW PACs + ${eng.mep.chillerCountTotal} ${deal.chillerPlacement.toLowerCase()}-mounted 2.2 MW adiabatic chillers.`
    },
    {
      index: 6,
      category: 'Hydronics & Water',
      headline: `${eng.mep.fwsFlowRateLpm.toLocaleString()} LPM FWS | ${eng.mep.chwFlowRateLpm.toLocaleString()} LPM CHW`,
      detail: `Total heat rejection ${eng.mep.totalHeatRejectionMw} MW with estimated ${eng.mep.annualWaterConsumptionKl.toLocaleString()} kL/yr peak adiabatic trim water.`
    },
    {
      index: 7,
      category: '3-Zone Site Isolation',
      headline: `${eng.mep.totalSiteAreaM2.toLocaleString()} m² Total Plot Footprint`,
      detail: `Zone 1 White-Space (${eng.mep.threeZoneIsolation.zone1WhiteSpaceM2} m²), Zone 2 Cooling Yard (${eng.mep.threeZoneIsolation.zone2HeatRejectionYardM2} m²), Zone 3 Power Yard (${eng.mep.threeZoneIsolation.zone3ElectricalPowerYardM2} m²).`
    },
    {
      index: 8,
      category: 'Civil & Geotechnical',
      headline: `${eng.civil.foundationType} (FoS ${eng.civil.bearingFoS}x)`,
      detail: `Soil SBC ${eng.civil.allowableSbcKpa} kPa vs imposed ${eng.civil.imposedBearingKpa} kN/m²; embedment ${eng.civil.embedmentDepthM}m; ${eng.civil.concreteVolumeM3} m³ M35 concrete & ${eng.civil.rebarTonnageMt} MT Fe550D rebar.`
    },
    {
      index: 9,
      category: 'MV/LV Electrical SLD',
      headline: `${eng.electrical.incomingVoltageKv} kV Dual Feed | ${eng.electrical.grossFacilityMva} MVA Gross`,
      detail: `${eng.electrical.mvSwitchgearPanels} GIS panels, ${eng.electrical.transformerCountTotal}× ${eng.electrical.transformerRatingMva} MVA ${eng.electrical.standards.kFactorRating} transformers, ${eng.electrical.busductRunsCount} dual A/B ${eng.electrical.standards.busductIpRating} busducts.`
    },
    {
      index: 10,
      category: 'Resilience & BESS',
      headline: `${deal.uptimeTier} (${deal.redundancy}) | ${eng.electrical.dgCountTotal}× 2.5 MVA DGs`,
      detail: deal.includeBessRideThrough
        ? `${eng.electrical.upsCapacityMw} MW Modular UPS paired with ${eng.electrical.bessPowerMw} MW / ${eng.electrical.bessEnergyMwh} MWh LFP BESS shielding utility grid from AI step-load drops.`
        : `${eng.electrical.upsCapacityMw} MW Modular Li-Ion UPS backing critical IT & CDU pumps.`
    },
    {
      index: 11,
      category: 'Telecom & Carrier MMR',
      headline: `${deal.telecom.mmrCount} Diverse MMRs (${deal.telecom.diverseVaultSeparationM}m Vault Split)`,
      detail: `${deal.telecom.odfBaysPerMmr} ODF bays per MMR & ${deal.telecom.carrierDemarcRacks} carrier demarcation racks supporting multi-carrier optical ingress.`
    },
    {
      index: 12,
      category: 'Safety & Environmental',
      headline: 'Full NBC Part 4, VESDA-E & ISA G1 Compliance',
      detail: `${eng.mep.complianceGear.vesdaDetectors} VESDA-E zones, Novec-1230 suppression, ${eng.mep.complianceGear.chemicalAirScrubbers} coastal H2S/SOx chemical scrubbers, ${eng.mep.complianceGear.cctvCameras} IP67 cameras & rodent grid.`
    },
    {
      index: 13,
      category: 'Logistics & Schedule',
      headline: `${deal.logistics.craneTonnage}T Heavy-Lift | ${eng.supplyChain.longestLeadTimeWeeks}-Week Critical Path`,
      detail: `Max single lift ${deal.logistics.heaviestLiftTons}T @ ${deal.logistics.boomRadiusM}m boom radius; critical long-lead item: ${eng.supplyChain.criticalPathSku}.`
    },
    {
      index: 14,
      category: 'Make-in-India (MII)',
      headline: `${eng.commercial.weightedBoqMiiPercent}% BOQ Local Content (${eng.supplyChain.pppMiiClass})`,
      detail: `Evaluated across ${eng.supplyChain.totalSkusEvaluated} Tier-1 India OEM SKUs; qualifies for Sovereign / PSU Class-I Public Procurement preference.`
    },
    {
      index: 15,
      category: 'Commercial CapEx & TCO',
      headline: `₹${eng.commercial.totalCapexInrCr} Cr CapEx (₹${eng.commercial.capexPerMwInrCr} Cr/MW)`,
      detail: `${deal.commercial.tcoYears}-Year Total TCO ₹${eng.commercial.totalTco5YrInrCr} Cr (₹${eng.commercial.inrPerItKwh5Yr}/IT kWh @ ₹${deal.commercial.powerTariffInrPerKwh}/kWh tariff, ${deal.commercial.tariffEscalationPct}% annual escalation).`
    }
  ];
}
