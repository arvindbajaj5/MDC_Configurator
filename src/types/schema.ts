/**
 * MDC Configurator V13 — Strict TypeScript Domain Schema
 * Maintains 100% backward compatibility with V11 / V12 / V12.4 deal JSONs,
 * mdc_master_catalog.json, and mdc_supply_intel.json.
 */

export type DeploymentArchitecture = 'Container' | 'BnM';
export type RedundancyTopology = 'N+1' | '2N' | '2N+1';
export type UptimeTier = 'Tier II' | 'Tier III' | 'Tier IV';
export type SeismicZone = 'Zone II' | 'Zone III' | 'Zone IV' | 'Zone V';
export type SoilClass = 'Hard Rock' | 'Dense Gravel/Sand' | 'Stiff Clay' | 'Soft Marine Clay' | 'Reclaimed Fill';
export type CoolingArchitecture = 'DLC_Hybrid' | 'Full_Air';
export type ChillerPlacement = 'Yard' | 'Roof';
export type SupplyCategory =
  | 'Power & Switchgear'
  | 'Transformers'
  | 'Cooling & Chillers'
  | 'Internal CDU & PAC'
  | 'Busducts & PDUs'
  | 'Modular Enclosures'
  | 'BESS & UPS'
  | 'DG Backup Power'
  | 'Compliance & Safety'
  | 'Telecom & MMR'
  | 'Consumables & Spares';

export interface ElectricalStandards {
  wiringCode: string;
  lowVoltageStandard: string;
  harmonicsStandard: string;
  lightningProtection: string;
  earthingStandard: string;
  ceaRegulation: string;
  transformerStandard: string;
  busductIpRating: 'IP55' | 'IP65';
  kFactorRating: 'K-13' | 'K-20';
}

export interface SiteClimateProfile {
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  designDryBulbC: number;
  designWetBulbC: number;
  peakAmbientC: number;
  annualAvgTempC: number;
  ashraeClass: 'A1' | 'A2' | 'A3' | 'W3' | 'W4';
  seismicZone: SeismicZone;
  seismicZoneFactorZ: number;
  annualRainfallMm: number;
  source: 'Open-Meteo ERA5' | 'Preset Baseline' | 'Manual Override';
  fetchedAt?: string;
}

export interface RackSpec {
  id: string;
  label: string;
  coolingMode: 'DLC' | 'Air';
  powerKwPerRack: number;
  heightM: number;
  widthMm: number;
  depthMm: number;
  weightKg: number;
  count?: number;
}

export interface BrandingConfig {
  clientName: string;
  primaryHex: string;
  accentHex: string;
  containerFinish: 'Matte Graphite' | 'Sovereign White' | 'Deep Navy' | 'Custom RAL';
  logoUrl?: string;
  artworkDeferred: boolean;
  deferredCaveatNote: string;
}

export interface CivilConfig {
  soilClass: SoilClass;
  soilSbcKpa: number;
  groundwaterDepthM: number;
  plinthClearHeightM: number;
  yardDrainageSlope: '1:50' | '1:40';
  bnmSlabLiveLoadKpa: number;
  bnmClearHeightM: number;
}

export interface TelecomMmrConfig {
  mmrCount: number;
  diverseVaultSeparationM: number;
  odfBaysPerMmr: number;
  carrierDemarcRacks: number;
  redundantPathways: boolean;
}

export interface LogisticsRiggingConfig {
  heaviestLiftTons: number;
  craneTonnage: number;
  boomRadiusM: number;
  hydraulicAxleTrailers: number;
  steelRoadMatsCount: number;
  spreaderBeamCapacityTons: number;
  siteTurningRadiusM: number;
}

export interface CommercialConfig {
  currency: 'INR' | 'USD';
  fxInrPerUsd: number;
  powerTariffInrPerKwh: number;
  tariffEscalationPct: number;
  annualOmPctOfCapex: number;
  annualAmcPctOfCapex: number;
  waterTariffInrPerKl: number;
  contingencyPct: number;
  marginPct: number;
  gstPct: number;
  tcoYears: number;
}

export interface SpecialVendorQuote {
  lineId: string;
  vendorName: string;
  quoteRef: string;
  discountPct?: number;
  overrideUnitCostInrCr?: number;
  leadTimeWeeks?: number;
  validUntil?: string;
  notes?: string;
}

export interface DealConfig {
  id: string;
  schemaVersion: string;
  name: string;
  customer: string;
  updatedAt: string;
  architecture: DeploymentArchitecture;
  uptimeTier: UptimeTier;
  redundancy: RedundancyTopology;
  targetItLoadMw: number;
  dlcSharePct: number;
  avgRackKw: number;
  maxInletTempC: number;
  chilledWaterSupplyTempC: number;
  fwsSupplyTempC: number;
  chillerPlacement: ChillerPlacement;
  containerUnitMw: 0.5 | 1.0 | 2.0;
  includeBessRideThrough: boolean;
  bessDurationMin: number;
  climate: SiteClimateProfile;
  civil: CivilConfig;
  telecom: TelecomMmrConfig;
  logistics: LogisticsRiggingConfig;
  branding: BrandingConfig;
  commercial: CommercialConfig;
  standards?: Partial<ElectricalStandards>;
  specialQuotes: Record<string, SpecialVendorQuote>;
  driveFolderId?: string;
  driveFolderPath?: string;
}

export interface SupplyIntelSku {
  skuId: string;
  name: string;
  category: SupplyCategory;
  oemTier: 'Tier-1 India' | 'Tier-1 Global-MakeInIndia' | 'Tier-2 Approved';
  vendorArchetype: string;
  miiPercent: number;
  unit: string;
  unitPriceInrLakhs: number;
  leadTimeWeeks: number;
  certifications: string[];
  notes?: string;
}

export interface MasterCatalogItem {
  id: string;
  code: string;
  name: string;
  category: string;
  ratingKw?: number;
  footprintM2?: number;
  weightTons?: number;
  unitCostInrLakhs: number;
  miiPercent: number;
  active: boolean;
  specs?: Record<string, string | number | boolean>;
}

export interface WorkspaceState {
  schemaVersion: string;
  activeDealId: string;
  deals: DealConfig[];
  catalog: MasterCatalogItem[];
  supplyIntel: SupplyIntelSku[];
  driveConfig: {
    selectedFolderId: string | null;
    selectedFolderPath: string;
    includeReadonlyScope: boolean;
  };
  lastMigratedFrom?: string[];
}

/* ----- Computed Engineering Result Interfaces ----- */

export interface CivilPlinthResult {
  foundationType: 'RCC Plinth / Raft' | '4.5m RCC Pile Cap Foundation';
  requiresPiling: boolean;
  embedmentDepthM: number;
  pileLengthM: number;
  pileDiameterMm: number;
  pileCount: number;
  totalDeadAndLiveLoadKn: number;
  footprintAreaM2: number;
  imposedBearingKpa: number;
  allowableSbcKpa: number;
  effectiveCapacityKpa: number;
  bearingFoS: number;
  fosStatus: 'PASS' | 'MARGINAL' | 'PILE_MITIGATED';
  concreteVolumeM3: number;
  rebarTonnageMt: number;
  anchorBoltSpec: string;
  drainageSlope: string;
  pileAdderInrCr: number;
  civilBaseCostInrCr: number;
  civilTotalCostInrCr: number;
  advisoryNotes: string[];
}

export interface ElectricalSldNode {
  id: string;
  label: string;
  voltageKv: number;
  ratingLabel: string;
  redundancy: string;
  zone: 'Utility' | 'MV Yard' | 'LV Distribution' | 'White Space';
}

export interface ElectricalSldResult {
  standards: ElectricalStandards;
  itLoadMw: number;
  grossFacilityMw: number;
  grossFacilityMva: number;
  incomingVoltageKv: 33 | 132;
  mvSwitchgearPanels: number;
  transformerRatingMva: number;
  transformerCountActive: number;
  transformerCountTotal: number;
  busductRunsCount: number;
  busductRatingAmps: number;
  busductIpRating: 'IP55' | 'IP65';
  dgUnitRatingMva: number;
  dgCountActive: number;
  dgCountTotal: number;
  upsCapacityMw: number;
  bessPowerMw: number;
  bessEnergyMwh: number;
  nodes: ElectricalSldNode[];
  validationChecks: Array<{ code: string; label: string; passed: boolean; detail: string }>;
}

export interface MepCoolingResult {
  itLoadMw: number;
  dlcHeatLoadMw: number;
  airHeatLoadMw: number;
  totalHeatRejectionMw: number;
  estimatedPue: number;
  totalRacks: number;
  dlcRacks: number;
  airRacks: number;
  podCount: number;
  whiteSpaceAreaM2: number;
  totalSiteAreaM2: number;
  yardCduCount: 0; // Strictly enforced invariant: ZERO yard CDUs
  internalCduCountActive: number;
  internalCduCountTotal: number;
  cduUnitCapacityKw: number;
  mandatoryPacUnitKw: 80;
  pacCountActive: number;
  pacCountTotal: number;
  chillerUnitMw: number;
  chillerCountActive: number;
  chillerCountTotal: number;
  chillerPlacement: ChillerPlacement;
  fwsFlowRateLpm: number;
  chwFlowRateLpm: number;
  annualWaterConsumptionKl: number;
  threeZoneIsolation: {
    zone1WhiteSpaceM2: number;
    zone2HeatRejectionYardM2: number;
    zone3ElectricalPowerYardM2: number;
  };
  complianceGear: {
    vesdaDetectors: number;
    chemicalAirScrubbers: number;
    cctvCameras: number;
    rodentRepellentUnits: number;
  };
  inletTempWarning: string | null;
}

export interface SupplyChainScoreResult {
  weightedMiiPercent: number;
  pppMiiClass: 'Class-I Local Supplier' | 'Class-II Local Supplier' | 'Non-Local Supplier';
  totalSkusEvaluated: number;
  longestLeadTimeWeeks: number;
  criticalPathSku: string;
  categoryBreakdown: Array<{
    category: SupplyCategory;
    skuCount: number;
    avgMiiPercent: number;
    maxLeadWeeks: number;
  }>;
}

export interface BoqLineItem {
  lineId: string;
  category: string;
  description: string;
  unit: string;
  quantity: number;
  baseUnitCostInrCr: number;
  effectiveUnitCostInrCr: number;
  extendedCostInrCr: number;
  miiPercent: number;
  hasSpecialQuote: boolean;
  specialQuote?: SpecialVendorQuote;
}

export interface TcoYearRow {
  year: number;
  powerCostInrCr: number;
  omCostInrCr: number;
  amcCostInrCr: number;
  waterCostInrCr: number;
  totalOpexInrCr: number;
  cumulativeTcoInrCr: number;
}

export interface CommercialTcoResult {
  boqLines: BoqLineItem[];
  equipmentSubtotalInrCr: number;
  contingencyInrCr: number;
  marginInrCr: number;
  preTaxCapexInrCr: number;
  gstInrCr: number;
  totalCapexInrCr: number;
  capexPerMwInrCr: number;
  totalOpex5YrInrCr: number;
  totalTco5YrInrCr: number;
  inrPerItKwh5Yr: number;
  schedule: TcoYearRow[];
  weightedBoqMiiPercent: number;
}

export interface FullEngineeringOutput {
  mep: MepCoolingResult;
  civil: CivilPlinthResult;
  electrical: ElectricalSldResult;
  supplyChain: SupplyChainScoreResult;
  commercial: CommercialTcoResult;
}
