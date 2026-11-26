export type CoolingType = 'DLC' | 'AC';
export type ShellArchitecture = 'Container' | 'BnM_Hall';
export type CurrencyCode = 'INR' | 'USD' | 'EUR';
export type UptimeTier = 'None' | 'Tier II' | 'Tier III' | 'Tier IV';
export type SupplyTier = 'Tier-1' | 'Tier-2';
export type ConfidenceLevel = 'Verified' | 'High' | 'Medium' | 'ROM';
export type TrustSource =
  | 'DealVerifiedQuote'
  | 'PartnerRFQ'
  | 'ManualMaster'
  | 'GeminiSearchRefresh'
  | 'SeedCatalog';

export type BnmRoomPlacement = 'extended_from_hall' | 'separate_room' | 'outdoor_container';
export type RaisedFloorTileType =
  | 'CalciumSulphate_Heavy'
  | 'Cementitious_Heavy'
  | 'SolidSteel_Ultra';

export interface BnmSupportRoomSpec {
  placement: BnmRoomPlacement;
  lengthM: number;
  widthM: number;
  heightM: number;
  coolingMode: string;
}

export interface RackSku {
  id: string;
  name: string;
  coolingType: CoolingType;
  standard: string;
  heightMm: number;
  widthMm: number;
  depthMm: number;
  weightKg: number;
  peakKw: number;
  continuousFactor: number;
  operatingUtilFactor: number;
  liquidSplitPct: number;
  maxInletTempC: number;
  cduIntegrated: boolean;
  cduTowerHeightMm: number;
  cduTowerWidthMm: number;
  cduTowerDepthMm: number;
  flowLpmPerKw: number;
  reqDeltaPBar: number;
  mawpBar: number;
  powerEntry: 'Top' | 'Bottom';
  plumbingEntry: 'Top' | 'Bottom' | 'None';
}

export interface ContainerSpec {
  id: string;
  name: string;
  lengthMm: number;
  widthMm: number;
  heightMm: number;
  metallurgy: string;
  wallMm: number;
  roofMm: number;
  floorMm: number;
  plenumMm: number;
  topClearanceMm: number;
  baseCostInr: number;
}

export interface NonItCatalogItem {
  id: string;
  group: string;
  category: string;
  label: string;
  ratedCapacity: number;
  capacityUnit: string;
  footprintSqm: number;
  unit: string;
  cost: number;
  make: string;
  model: string;
  miiPct?: number;
  origin?: string;
}

export interface MasterStandards {
  iso20LengthMm: number;
  iso40LengthMm: number;
  defaultCustomMaxLenMm: number;
  defaultHeightMm: number;
  defaultWidthMm: number;
  defaultMetallurgy: string;
  wallThicknessMm: number;
  roofThicknessMm: number;
  floorThicknessMm: number;
  plenumHeightMm: number;
  topClearanceMm: number;
  maxPodPayloadKg: number;
  maxDlcKwPerPod: number;
  maxAcKwPerPod: number;
  coolantType: string;
  buswayAmperageA: number;
  lfpDoDPct: number;
  vrlaDoDPct: number;
  gridTariffInrKwh: number;
  waterTariffInrKl: number;
  defaultAmcPctOfCapex: number;
  defaultMarginPct: number;
  defaultContingencyPct: number;
  defaultGstPct: number;
  defaultShellRatePerCumInr: number;
  usdRate: number;
  eurRate: number;
}

export interface MasterCatalog {
  schemaVersion?: string;
  exportedAt?: string;
  skus: RackSku[];
  containerCatalog: ContainerSpec[];
  nonItCatalog: NonItCatalogItem[];
  standards: MasterStandards;
}

export interface SupplyChainSku {
  id: string;
  group: string;
  category: string;
  vendor: string;
  tier: SupplyTier;
  family: string;
  sku: string;
  rating: number;
  unit: string;
  footprintSqm: number;
  basis: string;
  lead: string;
  baseLow: number;
  baseHigh: number;
  miiClass: 'Class-I' | 'Class-II';
  miiPct: number;
  confidence: ConfidenceLevel;
  trustSource: TrustSource;
  lastSeen: string;
  marketRefreshNote?: string;
}

export interface SupplyChainDataset {
  schemaVersion: string;
  lastRefreshed: string;
  refreshSource?: string;
  items: SupplyChainSku[];
}

export interface PlaceholderSku {
  id: string;
  isPlaceholder: true;
  dealId: string;
  group: string;
  category: string;
  builtUpName: string;
  synthesizedRating: number;
  capacityUnit: string;
  activeN: number;
  redundantR: number;
  totalUnits: number;
  romUnitPriceInr: number;
  scaledFootprintSqm: number;
  nearestOemRef: string;
  marketScoutRemark: string;
  createdAt: string;
}

export interface MonthlyClimatePoint {
  month: string;
  dryBulbC: number;
  wetBulbC: number;
}

export interface MonthlyOperatingPoint extends MonthlyClimatePoint {
  mode: 'FreeCooling' | 'AdiabaticSpray' | 'TrimChiller' | 'DryChiller' | 'AirCooling';
  evapFactor: number;
  chillerFrac: number;
  monthlyWaterKl: number;
}

export interface DealPriceOverride {
  mode: 'discount' | 'price';
  discountPct?: number | string;
  specialPrice?: number | string;
  validUntil?: string;
  comments?: string;
  vendorName?: string;
  vendorSku?: string;
}

export interface InlineSkuOverride {
  group: string;
  skuId: string;
  label: string;
  make: string;
  model: string;
  ratedCapacity: number;
  capacityUnit: string;
  footprintSqm: number;
  unitCostInr: number;
  miiPct: number;
  scope: 'deal_only' | 'promoted_master';
  qtyOverride?: number;
}

export interface ValidationWaiver {
  code: string;
  waived: boolean;
  note: string;
  waivedBy?: string;
  waivedAt: string;
}

export interface NonStandardWork {
  id: string;
  desc: string;
  unit: string;
  qty: number;
  unitCostInr: number;
}

export interface ParcelVertex {
  x: number;
  y: number;
}

export interface LogisticsOverrides {
  trailers?: number | '';
  craneTonnage?: number | '';
  stagingSqm?: number | '';
  cranes?: number;
  mats?: number;
  forklifts?: number;
  skates?: number;
  jacks?: number;
  serverLifts?: number;
  safetyLadders?: number;
}

export interface ProjectDeal {
  id: string;
  name: string;
  client: string;
  status: string;
  updatedAt: string;
  archetype: string;
  shellArchitecture: ShellArchitecture;
  deploymentMode: 'OneShot' | 'Phased';
  day1SharePct: number;
  targetItMw: number;
  currency: CurrencyCode;
  marginPct: number;
  contingencyPct: number;
  gstPct: number;
  cityQuery: string;
  lat: number;
  lon: number;
  elevationM: number;
  peakDryBulb: number;
  peakWetBulb: number;
  relHumidityPct: number;
  monthlyClimate: MonthlyClimatePoint[];
  seismicZone: 'Zone II' | 'Zone III' | 'Zone IV' | 'Zone V';
  seismicZFactor: number;
  seismicLabel: string;
  rackQuantities: Record<string, number>;
  loadingMode: 'Standard' | 'ActualPerRack';
  actualRackLoads: Record<string, number | string>;
  futureGrowthReservePct: number;
  containerCatalogId: string;
  containerLengthMode: 'CustomOptimum' | 'ISO20' | 'ISO40' | 'AllInOne';
  containerFabBasis: 'PerCubicMeter' | 'PerSqm';
  maxCustomLengthMm: number;
  containerHeightMm: number;
  containerWidthMm: number;
  metallurgy: string;
  wallThicknessMm: number;
  roofThicknessMm: number;
  floorThicknessMm: number;
  plenumHeightMm: number;
  topClearanceMm: number;
  bespokeContainerPriceInr: number | string;
  hallTopology: 'GangedLinear' | 'GangedUShaped' | 'Isolated';
  packingStrategy: 'MinCapex' | 'Segregated';
  targetSupplyTempC: number | string;
  upsRideThroughMode: 'DGTransferBridge' | 'CheckpointDrain';
  batteryRuntimeMin: number;
  batteryChemistry: 'LFP' | 'VRLA';
  upsBacksUpCooling: boolean;
  dgAutonomyHours: number;
  pumpStagingMode: 'EqualParallel' | 'PonyPlusMainVFD' | 'DecoupledPrimarySecondary';
  includeTransformer: boolean;
  selectedTrafoId: string;
  transformerType: string;
  includeHtVcb: boolean;
  includeLvSwitchgear: boolean;
  includeIntelligentRpdu: boolean;
  includeUpsContainer: boolean;
  selectedUpsId: string;
  includeBatteryContainer: boolean;
  includeDgYard: boolean;
  selectedDgId: string;
  includeIntegratedBms: boolean;
  includeLeakRope: boolean;
  includeVesdaFire: boolean;
  includeCctvSecurity: boolean;
  includeAcousticBarrier: boolean;
  includeAdminModule: boolean;
  includeStagingModule: boolean;
  coolingOverrideMode: string;
  includeLiquidLoop: boolean;
  selectedCoolerId: string;
  includeExtCdu: boolean;
  selectedCduId: string;
  includePumpSkids: boolean;
  includeWaterTanks: boolean;
  selectedTankId: string;
  includeGlycolDosing: boolean;
  waterAutonomyDays: number;
  includeRoomDehum: boolean;
  waterAvailability: 'Abundant' | 'Constrained' | 'Zero';
  airCoolingType: 'RDHX' | 'In-Row' | 'PAC';
  uptimeTier: UptimeTier;
  regulatoryCode: string;
  emiShielding: boolean;
  monsoonCanopy: boolean;
  airlockVestibule: boolean;
  includeInstallation: boolean;
  amcYears: number;
  includeAmcContract: boolean;
  amcPricingBasis: 'PctOfCapex' | 'PerMwRate';
  amcPctOfCapex: number;
  amcSupportModel: string;
  residentHeadcount: number;
  nonStandardWorks: NonStandardWork[];
  solutionQtyOverrides: Record<string, number | string>;
  gridTariffInrKwh: number;
  waterTariffInrKl: number;
  plotAreaUnit: 'acres' | 'sqm';
  plotAreaInput: number | string;
  parcelShape: string;
  parcelVertices: ParcelVertex[];
  setbackMeters: number;
  hallRotationDeg: number;
  dealOverrides: Record<string, DealPriceOverride>;
  airflowDelivery: 'UnderfloorPlenumUpward' | 'FrontToRearContainment';
  containmentType: 'ColdAisleContainment' | 'HotAisleContainment';
  frontServiceClearanceMm: number;
  rearServiceClearanceMm: number;
  chillerPlacement: 'ContainerRoof' | 'DedicatedYardPad';
  soilBearingCapacityKpa: number;
  historicalFloodLevelMm: number;
  bnmColumnGridM: string;
  bnmSlabThicknessMm: number;
  bnmClearSoffitM: number;
  bnmDimUnit: 'm' | 'ft';
  bnmHallLengthM: number;
  bnmHallWidthM: number;
  bnmLayoutDataUrl: string;
  bnmLayoutFileName: string;
  bnmFloorLevel: number;
  bnmFreightLiftMode: 'existing_verify' | 'new_in_boq' | 'not_applicable';
  bnmStagingAreaSqm: number;
  bnmUpsRoom: BnmSupportRoomSpec;
  bnmBatteryRoom: BnmSupportRoomSpec;
  bnmSwitchgearRoom: BnmSupportRoomSpec;
  raisedFloorEnabled: boolean;
  raisedFloorHeightMm: number;
  raisedFloorTileType: RaisedFloorTileType;
  raisedFloorTileLoadKn: number;
  raisedFloorPedestalRatingKn: number;
  raisedFloorPerforatedPct: number;
  raisedFloorSubFrameForHeavyRacks: boolean;
  includeMonsoonCanopy: boolean;
  includeRadiantHeatBarrier: boolean;
  includeGasScrubber: boolean;
  includeRodentRepellent: boolean;
  includeZldRecovery: boolean;
  includeK12Mantrap: boolean;
  includeGridLoadShield: boolean;
  includeTelecomMmr: boolean;
  includeLogisticsRigging: boolean;
  includeOwnedDcTools: boolean;
  costValidityDays: number;
  carrierCount: number;
  odfCoreDensity: number;
  diverseVaultSeparationM: number;
  fabricType: string;
  approachRoadWidthM: number;
  overheadClearanceM: number;
  craneWorkingRadiusM: number;
  groundSurfaceType: string;
  logisticsOverrides?: LogisticsOverrides;
  brandingMode: 'standard' | 'custom_ready' | 'custom_tbd';
  exteriorColorHex: string;
  exteriorRalLabel: string;
  interiorColorHex: string;
  interiorRalLabel: string;
  rackBezelFinish: string;
  clientLogoDataUrl: string;
  inlineSkuOverrides?: Record<string, InlineSkuOverride>;
  validationWaivers?: Record<string, ValidationWaiver>;
  firstDraftGeneratedAt?: string;
}

export interface ActiveRackInstance extends RackSku {
  isDlc: boolean;
  isExtCdu: boolean;
  instanceKey: string;
  instanceIndex: number;
  designContKw: number;
  actualKw: number;
  liqKw: number;
  airKw: number;
  totalWeightKg: number;
}

export interface ContainerPod {
  id: string;
  kind: 'DLC' | 'AC';
  label: string;
  racks: ActiveRackInstance[];
  rowA: ActiveRackInstance[];
  rowB: ActiveRackInstance[];
  designContKw: number;
  actualKw: number;
  peakKw: number;
  liqKw: number;
  airKw: number;
  wetWeightKg: number;
  extLengthMm: number;
  extWidthMm: number;
  extHeightMm: number;
  volumeCum: number;
  floorFootprintSqm: number;
  reservedGrowthMm: number;
  emptyTareKg: number;
  grossRiggingKg: number;
  shellAreaSqm: number;
  bayUtilPct: number;
  rowAKw: number;
  rowBKw: number;
  phaseBalancePct: number;
}

export interface RedundancySizing {
  activeN: number;
  redundantR: number;
  total: number;
}

export interface BomLineItem {
  key: string;
  group?: string;
  category: string;
  label: string;
  specs: string;
  make: string;
  model: string;
  unit: string;
  qty: number;
  masterUnitCost: number;
  unitCost: number;
  isOverridden: boolean;
  isPlaceholder?: boolean;
  isDealLocalSku?: boolean;
  discountPct: number;
  validUntil: string;
  comments: string;
  miiPct: number;
  rawCostTotal: number;
  withContingency: number;
  sellingPreTax: number;
  gstAmt: number;
  grandTotalInclGst: number;
}

export interface ValidationCheck {
  status: 'PASS' | 'WARNING' | 'FAIL' | 'GREEN' | 'AMBER' | 'RED' | 'NA';
  code: string;
  title: string;
  msg: string;
  waived?: boolean;
  waiverNote?: string;
  waivedAt?: string;
}

export interface ColorPalette {
  label?: string;
  dlcRack: string;
  acRack: string;
  itPod: string;
  cduPump: string;
  coolerTank: string;
  transformer: string;
  upsBess: string;
  dgSet: string;
  adminStage: string;
}

export interface UnitDatasheet {
  unitId: string;
  shellSpec: string;
  itKw: number;
  rackCount: number;
  internalEquip: string;
  grossTonnes: number;
  coatingSpec: string;
  rackFinish: string;
  artworkStatus: string;
}

export interface CivilEngineeringSummary {
  isBnM: boolean;
  floodPlinthMm: number;
  unitGrossTonnes: number;
  floorPressureKpa: number;
  cornerNodeKn: number;
  sbc: number;
  isWeakSoil: boolean;
  embedmentDepthM: number;
  imposedBearingKpa: number;
  bearingSafetyFactor: number;
  foundationType: string;
}

export interface RaisedFloorSummary {
  enabled: boolean;
  areaSqm: number;
  heightMm: number;
  tileSizeMm: string;
  tileSpecLabel: string;
  totalTiles: number;
  perforatedTiles: number;
  pedestalStemCount: number;
  pedestalTubeSpec: string;
  pedestalAxialRatingKn: number;
  tilePointLoadKn: number;
  boltedStringersRequired: boolean;
  seismicBracingRequired: boolean;
  heavyRackSubFramesCount: number;
  maxRackPointLoadKn: number;
  exceedsTilePointLoad: boolean;
}

export interface BnmAuxEngineeringSummary {
  hallProvidedSqm: number;
  hallVolumeCum: number;
  hallFitStatus: 'FITS' | 'TIGHT' | 'OVERSIZE';
  floorLevel: number;
  isUpperFloor: boolean;
  freightLiftRequiredKg: number;
  freightLiftMinDoorHeightM: number;
  freightLiftCabinSpec: string;
  stagingDressingSqm: number;
  upsRoomSqm: number;
  upsRoomCoolingKw: number;
  batteryRoomSqm: number;
  batteryRoomCoolingKw: number;
  switchgearRoomSqm: number;
  switchgearCoolingKw: number;
  totalAuxIndoorSqm: number;
}

export interface EquipmentScheduleItem {
  assetTag: string;
  category: string;
  equipmentName: string;
  location: string;
  make: string;
  model: string;
  ratingAndRedundancy: string;
  dimensionsM: string;
  footprintSqm: number;
  operatingWeightKg: number;
  keySpecs: string;
}

export interface SupplySynthesisMatch {
  group: string;
  demand: number;
  demandUnit: string;
  matchedSkuId: string;
  vendor: string;
  model: string;
  label: string;
  ratedCapacity: number;
  activeN: number;
  redundantR: number;
  totalUnits: number;
  unitPriceInr: number;
  footprintSqm: number;
  miiPct: number;
  tier?: SupplyTier;
  confidence?: ConfidenceLevel;
  utilizationPct: number;
  isPlaceholder: boolean;
  placeholder?: PlaceholderSku;
}

export interface EngineeringResult {
  activeRacks: ActiveRackInstance[];
  dlcRacks: ActiveRackInstance[];
  acRacks: ActiveRackInstance[];
  pods: ContainerPod[];
  dlcPods: ContainerPod[];
  acPods: ContainerPod[];
  containerTotalVolumeCum: number;
  totalNameplatePeakKw: number;
  totalDesignContKw: number;
  totalActualKw: number;
  dlcDesignKw: number;
  acDesignKw: number;
  totalLiquidKw: number;
  totalAirKw: number;
  governingMaxInletTempC: number;
  effectiveSupplyTempC: number;
  inletTempViolation: boolean;
  monthlyProfile: MonthlyOperatingPoint[];
  freeCoolMonths: number;
  adiabaticMonths: number;
  trimChillerMonths: number;
  peakMonthWaterKl: number;
  annualWaterKl: number;
  totalFlowLpm: number;
  maxReqDeltaPBar: number;
  headerFrictionBar: number;
  cduDropBar: number;
  pumpDesignHeadBar: number;
  pumpSkidsCount: number;
  pumpCalc: RedundancySizing;
  reqWaterKl: number;
  totalWaterStorageKl: number;
  waterTankUnits: number;
  selTank: NonItCatalogItem;
  extCduRequiredKw: number;
  hasDlcRacks: boolean;
  hasExtCduRacks: boolean;
  recommendedCoolingMode: string;
  coolingMode: string;
  trimChillerKw: number;
  pueAnnualized: number;
  puePeakDesign: number;
  totalFacilityPeakKw: number;
  totalFacilityPeakKva: number;
  selTrafo: NonItCatalogItem;
  trafoCalc: RedundancySizing;
  transformerUnits: number;
  lvSwitchgearUnits: number;
  selUps: NonItCatalogItem;
  upsCalc: RedundancySizing;
  upsContainersCount: number;
  upsCriticalLoadKva: number;
  batteryKwhReq: number;
  batteryContainersCount: number;
  selDg: NonItCatalogItem;
  dgCalc: RedundancySizing;
  dgUnitsCount: number;
  dgDerateFactor: number;
  effectiveDgKva: number;
  totalHsdFuelLitres: number;
  selCdu: NonItCatalogItem;
  cduCalc: RedundancySizing;
  extCduUnits: number;
  selCooler: NonItCatalogItem;
  coolerCalc: RedundancySizing;
  adiabaticUnits: number;
  trimChillerUnits: number;
  airSideUnits: number;
  novecGasKg: number;
  activeRackFootprintSqm: number;
  aisleServiceAreaSqm: number;
  futureGrowthAreaSqm: number;
  totalItWhiteSpaceSqm: number;
  yardBreakdown: {
    cduPumpSqm: number;
    coolerChillerSqm: number;
    waterTankSqm: number;
    substationSqm: number;
    upsBessSqm: number;
    dgPesoSqm: number;
    adminStagingSqm: number;
  };
  totalNonItYardSqm: number;
  totalCampusOccupiedSqm: number;
  plinthSqm: number;
  sharedWallSavingsSqm: number;
  bomItems: BomLineItem[];
  totals: {
    rawCost: number;
    contingency: number;
    sellingPreTax: number;
    gst: number;
    grandTotal: number;
  };
  capexSellingPreTax: number;
  servicesAmcPreTax: number;
  day1CapexPreTax: number;
  dayNCapexPreTax: number;
  annualPowerCostInr: number;
  annualWaterCostInr: number;
  annualAmcCostInr: number;
  annualTotalOpexInr: number;
  fiveYearTcoInr: number;
  grossPlotSqm: number;
  netBuildableSqm: number;
  plotUtilizationPct: number;
  boundaryNoiseDba: number;
  ganttTasks: { task: string; startWk: number; durWk: number }[];
  validations: ValidationCheck[];
  uptimeChecks: ValidationCheck[];
  bisChecks: ValidationCheck[];
  failCount: number;
  unwaivedFailCount: number;
  warnCount: number;
  waivedCount: number;
  whiteSpace: {
    internalCduCount: number;
    internalCduFootprintSqm: number;
    mandatoryPacCount: number;
    pacFootprintSqm: number;
    chillerUnitsCount: number;
    totalChillerLoadKw: number;
    pduFootprintSqm: number;
    whiteSpaceSupportSqm: number;
  };
  civil: CivilEngineeringSummary;
  raisedFloor: RaisedFloorSummary;
  bnmAux: BnmAuxEngineeringSummary;
  equipmentSchedule: EquipmentScheduleItem[];
  gridShield: { loadDropShieldMw: number };
  telecom: {
    mmrRoomsCount: number;
    odfBaysCount: number;
    totalFiberStrands: number;
    overheadFiberMeters: number;
    gpuFabricLinks: number;
    fabricType: string;
  };
  logistics: {
    trailerCount: number;
    minTurningRadiusM: number;
    craneTonnage: number;
    outriggerGroundKpa: number;
    laydownStagingSqm: number;
    ownedServerLifts: number;
    ownedSafetyLadders: number;
  };
  unitDatasheets: UnitDatasheet[];
  mii: { overallMiiPct: number; miiClassLabel: string };
  commissioningSchedule: { level: string; scope: string; gate: string }[];
  supplyMatches: Record<string, SupplySynthesisMatch>;
  dealPlaceholders: PlaceholderSku[];
}

export interface CostPerMwDrivers {
  enclosureCivilPerMw: number;
  powerRedundancyPerMw: number;
  thermalCoolingPerMw: number;
  optionalScopePerMw: number;
  commercialOverheadPerMw: number;
  totalPreTaxPerMw: number;
}

export interface ProjectBenchmarkRow {
  project: ProjectDeal;
  eng: EngineeringResult;
  mwContinuous: number;
  totalAreaSqm: number;
  preTaxCapexInr: number;
  grandTotalInclGstInr: number;
  costPerMwInr: number;
  tco5YrPerMwInr: number;
  drivers: CostPerMwDrivers;
}

export interface CostVarianceDriverItem {
  driver: string;
  deltaPerMwInr: number;
  pctOfTotalDelta: number;
  explanation: string;
}

export interface CostVarianceAnalysis {
  baseProjectName: string;
  targetProjectName: string;
  baseCostPerMwInr: number;
  targetCostPerMwInr: number;
  deltaPerMwInr: number;
  items: CostVarianceDriverItem[];
  headlineSummary: string;
}
