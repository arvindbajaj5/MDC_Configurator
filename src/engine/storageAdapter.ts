import { COLOR_THEMES, INITIAL_CONTAINER_CATALOG, INITIAL_NON_IT_CATALOG, INITIAL_SKUS, INITIAL_STANDARDS } from '../data/masterCatalog';
import { DEFAULT_SUPPLY_CHAIN_V13 } from '../data/supplyChainSeed';
import type {
  ColorPalette,
  ContainerSpec,
  MasterStandards,
  NonItCatalogItem,
  ProjectDeal,
  RackSku,
  SupplyChainDataset
} from '../types/mdc';
import { synthesizeMonthlyClimate } from './climateSeismic';

export const STORAGE_KEY_V13 = 'ai_mdc_studio_v13_1_enterprise';
export const LEGACY_STORAGE_KEYS = [
  'ai_mdc_studio_v13_0_enterprise',
  'ai_mdc_studio_v12_0_enterprise',
  'ai_mdc_studio_v11_0_enterprise',
  'ai_mdc_studio_v10_5_enterprise'
];

export interface PersistedWorkspaceState {
  schemaVersion: string;
  projects: ProjectDeal[];
  editingId: string;
  skus: RackSku[];
  containerCatalog: ContainerSpec[];
  nonItCatalog: NonItCatalogItem[];
  standards: MasterStandards;
  palette: ColorPalette;
  supplyIntel: SupplyChainDataset;
  logoDataUrl: string;
  clientId: string;
}

export function makeBlankProject(id: string, indexNum: number, std: MasterStandards = INITIAL_STANDARDS): ProjectDeal {
  return {
    id,
    name: `New AI MDC Project #${indexNum}`,
    client: '',
    status: 'Draft',
    updatedAt: new Date().toISOString().slice(0, 10),
    archetype: 'Sovereign AI Training Factory',
    shellArchitecture: 'Container',
    deploymentMode: 'OneShot',
    day1SharePct: 50,
    targetItMw: 0,
    currency: 'INR',
    marginPct: std.defaultMarginPct,
    contingencyPct: std.defaultContingencyPct,
    gstPct: std.defaultGstPct,
    cityQuery: 'Navi Mumbai',
    lat: 19.03,
    lon: 73.02,
    elevationM: 14,
    peakDryBulb: 38.0,
    peakWetBulb: 29.2,
    relHumidityPct: 78,
    monthlyClimate: synthesizeMonthlyClimate(38.0, 29.2, 78),
    seismicZone: 'Zone III',
    seismicZFactor: 0.16,
    seismicLabel: 'IS 1893 Zone III (Moderate Seismicity — 0.16g)',
    rackQuantities: {},
    loadingMode: 'Standard',
    actualRackLoads: {},
    futureGrowthReservePct: 10,
    containerCatalogId: 'custom',
    containerLengthMode: 'CustomOptimum',
    containerFabBasis: 'PerCubicMeter',
    maxCustomLengthMm: std.defaultCustomMaxLenMm,
    containerHeightMm: std.defaultHeightMm,
    containerWidthMm: std.defaultWidthMm,
    metallurgy: std.defaultMetallurgy,
    wallThicknessMm: std.wallThicknessMm,
    roofThicknessMm: std.roofThicknessMm,
    floorThicknessMm: std.floorThicknessMm,
    plenumHeightMm: std.plenumHeightMm,
    topClearanceMm: std.topClearanceMm,
    bespokeContainerPriceInr: '',
    hallTopology: 'GangedLinear',
    packingStrategy: 'MinCapex',
    targetSupplyTempC: '',
    upsRideThroughMode: 'DGTransferBridge',
    batteryRuntimeMin: 15,
    batteryChemistry: 'LFP',
    upsBacksUpCooling: true,
    dgAutonomyHours: 24,
    pumpStagingMode: 'PonyPlusMainVFD',
    includeTransformer: true,
    selectedTrafoId: 'trafo-2000kva',
    transformerType: 'Cast-Resin Dry Type',
    includeHtVcb: true,
    includeLvSwitchgear: true,
    includeIntelligentRpdu: true,
    includeUpsContainer: true,
    selectedUpsId: 'ups-1000kva',
    includeBatteryContainer: true,
    includeDgYard: true,
    selectedDgId: 'dg-1500kva',
    includeIntegratedBms: true,
    includeLeakRope: true,
    includeVesdaFire: true,
    includeCctvSecurity: true,
    includeAcousticBarrier: false,
    includeAdminModule: true,
    includeStagingModule: true,
    coolingOverrideMode: 'Auto',
    includeLiquidLoop: false,
    selectedCoolerId: 'cooler-1000kw',
    includeExtCdu: false,
    selectedCduId: 'cdu-1350kw',
    includePumpSkids: false,
    includeWaterTanks: false,
    selectedTankId: 'tank-25kl',
    includeGlycolDosing: false,
    waterAutonomyDays: 3,
    includeRoomDehum: false,
    waterAvailability: 'Constrained',
    airCoolingType: 'RDHX',
    uptimeTier: 'Tier III',
    regulatoryCode: 'India BIS / CEA / CPCB IV+ / PESO / NBC / IS 1893',
    emiShielding: true,
    monsoonCanopy: true,
    airlockVestibule: true,
    includeInstallation: true,
    amcYears: 5,
    includeAmcContract: true,
    amcPricingBasis: 'PctOfCapex',
    amcPctOfCapex: std.defaultAmcPctOfCapex || 3.5,
    amcSupportModel: '24x7 Resident Engineers + Spares',
    residentHeadcount: 8,
    nonStandardWorks: [],
    solutionQtyOverrides: {},
    gridTariffInrKwh: std.gridTariffInrKwh,
    waterTariffInrKl: std.waterTariffInrKl,
    plotAreaUnit: 'acres',
    plotAreaInput: 2.5,
    parcelShape: 'IrregularTrapezoid',
    parcelVertices: [
      { x: 0, y: 0 },
      { x: 110, y: 0 },
      { x: 128, y: 78 },
      { x: 16, y: 92 }
    ],
    setbackMeters: 6.0,
    hallRotationDeg: 0,
    dealOverrides: {},
    airflowDelivery: 'UnderfloorPlenumUpward',
    containmentType: 'ColdAisleContainment',
    frontServiceClearanceMm: 1200,
    rearServiceClearanceMm: 1000,
    chillerPlacement: 'ContainerRoof',
    soilBearingCapacityKpa: 150,
    historicalFloodLevelMm: 450,
    bnmColumnGridM: '8m x 8m',
    bnmSlabThicknessMm: 300,
    bnmClearSoffitM: 5.8,
    bnmDimUnit: 'm',
    bnmHallLengthM: 32,
    bnmHallWidthM: 18,
    bnmLayoutDataUrl: '',
    bnmLayoutFileName: '',
    bnmFloorLevel: 0,
    bnmFreightLiftMode: 'existing_verify',
    bnmStagingAreaSqm: 45,
    bnmUpsRoom: {
      placement: 'extended_from_hall',
      lengthM: 12,
      widthM: 8,
      heightM: 4.5,
      coolingMode: 'Dedicated 24°C Precision PAC (N+1)'
    },
    bnmBatteryRoom: {
      placement: 'separate_room',
      lengthM: 10,
      widthM: 7,
      heightM: 4.2,
      coolingMode: '22–25°C Precision Cooling + H2/Thermal Exhaust'
    },
    bnmSwitchgearRoom: {
      placement: 'separate_room',
      lengthM: 14,
      widthM: 8,
      heightM: 4.8,
      coolingMode: '28°C Forced Ventilation / Spot Cooling'
    },
    raisedFloorEnabled: true,
    raisedFloorHeightMm: 700,
    raisedFloorTileType: 'CalciumSulphate_Heavy',
    raisedFloorTileLoadKn: 10.0,
    raisedFloorPedestalRatingKn: 22.0,
    raisedFloorPerforatedPct: 22,
    raisedFloorSubFrameForHeavyRacks: true,
    includeMonsoonCanopy: true,
    includeRadiantHeatBarrier: true,
    includeGasScrubber: false,
    includeRodentRepellent: true,
    includeZldRecovery: true,
    includeK12Mantrap: true,
    includeGridLoadShield: true,
    includeTelecomMmr: false,
    includeLogisticsRigging: false,
    includeOwnedDcTools: true,
    costValidityDays: 60,
    carrierCount: 3,
    odfCoreDensity: 576,
    diverseVaultSeparationM: 35,
    fabricType: 'InfiniBand NDR (800G OSFP)',
    approachRoadWidthM: 12,
    overheadClearanceM: 5.5,
    craneWorkingRadiusM: 10,
    groundSurfaceType: 'Compacted WMM + Concrete Apron',
    brandingMode: 'custom_tbd',
    exteriorColorHex: '#002870',
    exteriorRalLabel: 'RAL 5002 Ultramarine Blue',
    interiorColorHex: '#F8FAFC',
    interiorRalLabel: 'RAL 9016 Traffic White',
    rackBezelFinish: 'Matte Black + Brand Orange Trim',
    clientLogoDataUrl: '',
    inlineSkuOverrides: {},
    validationWaivers: {}
  };
}

export function makeSampleProject(std: MasterStandards = INITIAL_STANDARDS): ProjectDeal {
  const p = makeBlankProject('proj-15mw-sample', 1, std);
  return {
    ...p,
    name: 'Sample: 15 MW Sovereign AI Cluster — Navi Mumbai',
    client: 'National HPC Authority',
    status: 'Solution Reviewed',
    targetItMw: 15.0,
    rackQuantities: {
      'sku-dlc-265': 32,
      'sku-dlc-300-ext': 12,
      'sku-dlc-140-ext': 16,
      'sku-dlc-240-800v': 0,
      'sku-air-core': 12
    },
    selectedTrafoId: 'trafo-3150kva',
    selectedUpsId: 'ups-1500kva',
    selectedDgId: 'dg-2250kva',
    selectedCoolerId: 'cooler-1500kw',
    selectedCduId: 'cdu-1350kw',
    selectedTankId: 'tank-50kl',
    airCoolingType: 'RDHX',
    includeLiquidLoop: true,
    includeExtCdu: true,
    includePumpSkids: true,
    includeWaterTanks: true,
    includeGlycolDosing: true,
    includeRoomDehum: true,
    residentHeadcount: 14,
    nonStandardWorks: [
      { id: 'nsw-1', desc: '33kV HT Armored Cable Laying from Grid Bay', unit: 'meters', qty: 240, unitCostInr: 6800 },
      { id: 'nsw-2', desc: 'RCC Underground Utility Trench & Hume Pipe Crossing', unit: 'meters', qty: 180, unitCostInr: 9500 }
    ]
  };
}

/**
 * 100% Backward-Compatible V11/V12/V13 Deal Sanitizer
 * Safely migrates legacy JSON deals without losing overrides, rack quantities, or site parameters.
 */
export function sanitizeProject(raw: Partial<ProjectDeal> | null | undefined, std: MasterStandards = INITIAL_STANDARDS): ProjectDeal {
  const base = makeBlankProject(raw?.id || `proj-${Date.now()}`, 1, std);
  const merged: ProjectDeal = { ...base, ...(raw || {}) };

  if (!Array.isArray(merged.parcelVertices) || merged.parcelVertices.length < 3) {
    merged.parcelVertices = base.parcelVertices;
  }
  if (!Array.isArray(merged.nonStandardWorks)) merged.nonStandardWorks = [];
  if (!Array.isArray(merged.monthlyClimate) || merged.monthlyClimate.length !== 12) {
    merged.monthlyClimate = synthesizeMonthlyClimate(merged.peakDryBulb || 38, merged.peakWetBulb || 29, merged.relHumidityPct || 75);
  }
  if (!merged.rackQuantities || typeof merged.rackQuantities !== 'object') merged.rackQuantities = {};
  if (!merged.actualRackLoads || typeof merged.actualRackLoads !== 'object') merged.actualRackLoads = {};
  if (!merged.dealOverrides || typeof merged.dealOverrides !== 'object') merged.dealOverrides = {};
  if (!merged.solutionQtyOverrides || typeof merged.solutionQtyOverrides !== 'object') merged.solutionQtyOverrides = {};
  if (!merged.inlineSkuOverrides || typeof merged.inlineSkuOverrides !== 'object') merged.inlineSkuOverrides = {};
  if (!merged.validationWaivers || typeof merged.validationWaivers !== 'object') merged.validationWaivers = {};
  if (merged.shellArchitecture !== 'BnM_Hall') merged.shellArchitecture = 'Container';
  if (!merged.bnmUpsRoom) merged.bnmUpsRoom = base.bnmUpsRoom;
  if (!merged.bnmBatteryRoom) merged.bnmBatteryRoom = base.bnmBatteryRoom;
  if (!merged.bnmSwitchgearRoom) merged.bnmSwitchgearRoom = base.bnmSwitchgearRoom;
  if (!merged.containerFabBasis) merged.containerFabBasis = 'PerCubicMeter';
  if (!merged.bnmDimUnit) merged.bnmDimUnit = 'm';
  if (merged.raisedFloorEnabled === undefined) merged.raisedFloorEnabled = true;
  if (!merged.raisedFloorTileType) merged.raisedFloorTileType = 'CalciumSulphate_Heavy';
  if (merged.includeOwnedDcTools === undefined) merged.includeOwnedDcTools = true;

  return merged;
}

export function loadWorkspaceWithMigration(defaultClientId: string): {
  state: PersistedWorkspaceState;
  migratedFrom: string | null;
} {
  const fallback: PersistedWorkspaceState = {
    schemaVersion: 'MDC_V13_1',
    projects: [makeSampleProject(INITIAL_STANDARDS)],
    editingId: 'proj-15mw-sample',
    skus: INITIAL_SKUS,
    containerCatalog: INITIAL_CONTAINER_CATALOG,
    nonItCatalog: INITIAL_NON_IT_CATALOG,
    standards: INITIAL_STANDARDS,
    palette: COLOR_THEMES.projector,
    supplyIntel: DEFAULT_SUPPLY_CHAIN_V13,
    logoDataUrl: '',
    clientId: defaultClientId
  };

  if (typeof window === 'undefined' || !window.localStorage) {
    return { state: fallback, migratedFrom: null };
  }

  try {
    let raw = window.localStorage.getItem(STORAGE_KEY_V13);
    let migratedFrom: string | null = null;

    if (!raw) {
      for (const legacyKey of LEGACY_STORAGE_KEYS) {
        const candidate = window.localStorage.getItem(legacyKey);
        if (candidate) {
          raw = candidate;
          migratedFrom = legacyKey;
          break;
        }
      }
    }

    if (!raw) return { state: fallback, migratedFrom: null };
    const parsed = JSON.parse(raw);
    const std: MasterStandards = { ...INITIAL_STANDARDS, ...(parsed.standards || {}) };
    const projects: ProjectDeal[] = Array.isArray(parsed.projects) && parsed.projects.length > 0
      ? parsed.projects.map((p: Partial<ProjectDeal>) => sanitizeProject(p, std))
      : fallback.projects;

    // Upgrade legacy 16-item V12 supply intel seamlessly if it lacks V13 tier/confidence tags
    const existingSupplyItems = parsed.supplyIntel?.items;
    const supplyIntel: SupplyChainDataset =
      Array.isArray(existingSupplyItems) && existingSupplyItems.length >= 40 && existingSupplyItems[0]?.tier
        ? parsed.supplyIntel
        : DEFAULT_SUPPLY_CHAIN_V13;

    const hydrated: PersistedWorkspaceState = {
      schemaVersion: 'MDC_V13_1',
      projects,
      editingId: parsed.editingId || projects[0].id,
      skus: Array.isArray(parsed.skus) && parsed.skus.length > 0 ? parsed.skus : INITIAL_SKUS,
      containerCatalog: Array.isArray(parsed.containerCatalog) && parsed.containerCatalog.length > 0 ? parsed.containerCatalog : INITIAL_CONTAINER_CATALOG,
      nonItCatalog: Array.isArray(parsed.nonItCatalog) && parsed.nonItCatalog.length > 0 ? parsed.nonItCatalog : INITIAL_NON_IT_CATALOG,
      standards: std,
      palette: { ...COLOR_THEMES.projector, ...(parsed.palette || {}) },
      supplyIntel,
      logoDataUrl: parsed.logoDataUrl || '',
      clientId: parsed.clientId || defaultClientId
    };

    if (migratedFrom) {
      window.localStorage.setItem(STORAGE_KEY_V13, JSON.stringify(hydrated));
    }
    return { state: hydrated, migratedFrom };
  } catch {
    return { state: fallback, migratedFrom: null };
  }
}

export function saveWorkspaceState(state: PersistedWorkspaceState): { ok: boolean; time: string } {
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY_V13, JSON.stringify(state));
    }
    return { ok: true, time };
  } catch {
    return { ok: false, time };
  }
}

export async function saveFilesToLocalDirectory(
  filesList: { name: string; content: string }[]
): Promise<{ method: 'directoryPicker' | 'downloadFallback'; folderName: string; count: number }> {
  const win = window as unknown as {
    showDirectoryPicker?: (opts: { mode: string }) => Promise<{
      name: string;
      getFileHandle: (name: string, opts: { create: boolean }) => Promise<{
        createWritable: () => Promise<{ write: (c: string) => Promise<void>; close: () => Promise<void> }>;
      }>;
    }>;
  };
  if (win.showDirectoryPicker) {
    const dirHandle = await win.showDirectoryPicker({ mode: 'readwrite' });
    for (const f of filesList) {
      const fh = await dirHandle.getFileHandle(f.name, { create: true });
      const wr = await fh.createWritable();
      await wr.write(f.content);
      await wr.close();
    }
    return { method: 'directoryPicker', folderName: dirHandle.name, count: filesList.length };
  }
  for (const f of filesList) {
    const blob = new Blob([f.content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = f.name;
    a.click();
    URL.revokeObjectURL(url);
  }
  return { method: 'downloadFallback', folderName: 'Browser Downloads Folder', count: filesList.length };
}
