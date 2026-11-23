import {
  DEFAULT_MASTER_CATALOG,
  DEFAULT_NAVI_MUMBAI_DEAL,
  DEFAULT_SUPPLY_INTEL
} from '../data/defaults';
import { resolveElectricalStandards } from '../engines/electricalSld';
import type {
  DealConfig,
  MasterCatalogItem,
  SupplyIntelSku,
  WorkspaceState
} from '../types/schema';

export const CANONICAL_STORAGE_KEY = 'ai_mdc_studio_v13_enterprise';
export const LEGACY_V12_STORAGE_KEY = 'ai_mdc_studio_v12_0_enterprise';
export const LEGACY_V11_STORAGE_KEY = 'ai_mdc_studio_v11_0_enterprise';

export interface ImportSummary {
  detectedKind: 'deal' | 'catalog' | 'supply_intel' | 'workspace_bundle' | 'localstorage_dump';
  dealsImported: number;
  catalogItemsImported: number;
  supplySkusImported: number;
  sourceSchemaVersion: string;
}

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Normalizes any legacy V11 / V12 / V12.4 deal JSON into a strict V13 DealConfig,
 * backfilling missing fields (like `standards`, `civil`, `telecom`, `specialQuotes`)
 * without discarding existing customer settings.
 */
export function normalizeLegacyDeal(raw: Partial<DealConfig> & Record<string, unknown>): DealConfig {
  const base = DEFAULT_NAVI_MUMBAI_DEAL;
  return {
    ...base,
    ...raw,
    id: typeof raw.id === 'string' && raw.id.trim() ? raw.id : `deal-${Date.now()}`,
    schemaVersion: typeof raw.schemaVersion === 'string' ? raw.schemaVersion : '12.4-migrated',
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name : base.name,
    customer: typeof raw.customer === 'string' ? raw.customer : base.customer,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
    targetItLoadMw:
      typeof raw.targetItLoadMw === 'number' && Number.isFinite(raw.targetItLoadMw)
        ? raw.targetItLoadMw
        : base.targetItLoadMw,
    climate: { ...base.climate, ...(raw.climate ?? {}) },
    civil: { ...base.civil, ...(raw.civil ?? {}) },
    telecom: { ...base.telecom, ...(raw.telecom ?? {}) },
    logistics: { ...base.logistics, ...(raw.logistics ?? {}) },
    branding: { ...base.branding, ...(raw.branding ?? {}) },
    commercial: { ...base.commercial, ...(raw.commercial ?? {}) },
    standards: resolveElectricalStandards(raw.standards),
    specialQuotes:
      raw.specialQuotes && typeof raw.specialQuotes === 'object' ? { ...raw.specialQuotes } : {}
  };
}

function dedupeById<T>(items: T[], getId: (item: T) => string): T[] {
  const map = new Map<string, T>();
  for (const item of items) {
    map.set(getId(item), item);
  }
  return Array.from(map.values());
}

/**
 * Loads workspace state from CANONICAL_STORAGE_KEY.
 * If missing (or first upgrade from V12.4), automatically inspects and merges BOTH
 * `ai_mdc_studio_v12_0_enterprise` AND `ai_mdc_studio_v11_0_enterprise` so zero data
 * is lost from the V12.4 key-split bug.
 */
export function loadWorkspaceState(storage: Storage = window.localStorage): WorkspaceState {
  const canonical = safeJsonParse<Partial<WorkspaceState>>(storage.getItem(CANONICAL_STORAGE_KEY));
  if (canonical && Array.isArray(canonical.deals) && canonical.deals.length > 0) {
    const deals = canonical.deals.map((d) => normalizeLegacyDeal(d as Partial<DealConfig> & Record<string, unknown>));
    return {
      schemaVersion: '13.0',
      activeDealId: canonical.activeDealId || deals[0].id,
      deals,
      catalog:
        Array.isArray(canonical.catalog) && canonical.catalog.length > 0
          ? canonical.catalog
          : DEFAULT_MASTER_CATALOG,
      supplyIntel:
        Array.isArray(canonical.supplyIntel) && canonical.supplyIntel.length > 0
          ? canonical.supplyIntel
          : DEFAULT_SUPPLY_INTEL,
      driveConfig: {
        selectedFolderId: canonical.driveConfig?.selectedFolderId ?? null,
        selectedFolderPath: canonical.driveConfig?.selectedFolderPath ?? 'My Drive',
        includeReadonlyScope: canonical.driveConfig?.includeReadonlyScope ?? true
      },
      lastMigratedFrom: canonical.lastMigratedFrom
    };
  }

  // Auto-migrate stranded V11 & V12.4 keys
  const migratedSources: string[] = [];
  let mergedDeals: DealConfig[] = [];
  let mergedCatalog: MasterCatalogItem[] = [...DEFAULT_MASTER_CATALOG];
  let mergedSupply: SupplyIntelSku[] = [...DEFAULT_SUPPLY_INTEL];

  for (const legacyKey of [LEGACY_V11_STORAGE_KEY, LEGACY_V12_STORAGE_KEY]) {
    const parsed = safeJsonParse<Record<string, unknown>>(storage.getItem(legacyKey));
    if (!parsed) continue;
    migratedSources.push(legacyKey);

    if (Array.isArray(parsed.deals)) {
      const normalized = parsed.deals.map((d) =>
        normalizeLegacyDeal(d as Partial<DealConfig> & Record<string, unknown>)
      );
      mergedDeals = dedupeById([...mergedDeals, ...normalized], (d) => d.id);
    } else if (parsed.deal && typeof parsed.deal === 'object') {
      mergedDeals = dedupeById(
        [...mergedDeals, normalizeLegacyDeal(parsed.deal as Partial<DealConfig> & Record<string, unknown>)],
        (d) => d.id
      );
    }

    const legacyCatalog = (parsed.catalog ?? parsed.masterCatalog ?? parsed.items) as MasterCatalogItem[] | undefined;
    if (Array.isArray(legacyCatalog) && legacyCatalog.length > 0) {
      mergedCatalog = dedupeById([...mergedCatalog, ...legacyCatalog], (c) => c.id || c.code);
    }

    const legacySupply = (parsed.supplyIntel ?? parsed.skus) as SupplyIntelSku[] | undefined;
    if (Array.isArray(legacySupply) && legacySupply.length > 0) {
      mergedSupply = dedupeById([...mergedSupply, ...legacySupply], (s) => s.skuId);
    }
  }

  if (mergedDeals.length === 0) {
    mergedDeals = [normalizeLegacyDeal(DEFAULT_NAVI_MUMBAI_DEAL as unknown as Record<string, unknown>)];
  }

  const nextState: WorkspaceState = {
    schemaVersion: '13.0',
    activeDealId: mergedDeals[0].id,
    deals: mergedDeals,
    catalog: mergedCatalog,
    supplyIntel: mergedSupply,
    driveConfig: {
      selectedFolderId: null,
      selectedFolderPath: 'My Drive',
      includeReadonlyScope: true
    },
    lastMigratedFrom: migratedSources.length > 0 ? migratedSources : undefined
  };

  saveWorkspaceState(nextState, storage);
  return nextState;
}

export function saveWorkspaceState(state: WorkspaceState, storage: Storage = window.localStorage): void {
  const payload: WorkspaceState = {
    ...state,
    schemaVersion: '13.0'
  };
  storage.setItem(CANONICAL_STORAGE_KEY, JSON.stringify(payload));
}

/**
 * Relaxed schemaVersion JSON importer:
 * Supports V11/V12/V13 Deal JSONs, mdc_master_catalog.json, mdc_supply_intel.json,
 * full WorkspaceState bundles, AND Step 1 DevTools localStorage dumps.
 */
export function mergeImportedJsonPayload(
  current: WorkspaceState,
  rawPayload: unknown
): { nextState: WorkspaceState; summary: ImportSummary } {
  if (!rawPayload || typeof rawPayload !== 'object') {
    throw new Error('Imported JSON must be a valid object or array.');
  }

  const obj = rawPayload as Record<string, unknown>;
  const sourceSchemaVersion =
    typeof obj.schemaVersion === 'string' ? obj.schemaVersion : 'unversioned/legacy';

  let deals = [...current.deals];
  let catalog = [...current.catalog];
  let supplyIntel = [...current.supplyIntel];
  let activeDealId = current.activeDealId;

  let dealsImported = 0;
  let catalogItemsImported = 0;
  let supplySkusImported = 0;
  let detectedKind: ImportSummary['detectedKind'] = 'workspace_bundle';

  // Case 1: Raw array of catalog items or supply SKUs
  if (Array.isArray(rawPayload)) {
    const first = rawPayload[0] as Record<string, unknown> | undefined;
    if (first && typeof first.skuId === 'string') {
      detectedKind = 'supply_intel';
      const incoming = rawPayload as SupplyIntelSku[];
      supplyIntel = dedupeById([...supplyIntel, ...incoming], (s) => s.skuId);
      supplySkusImported = incoming.length;
    } else if (first && (typeof first.code === 'string' || typeof first.id === 'string')) {
      detectedKind = 'catalog';
      const incoming = rawPayload as MasterCatalogItem[];
      catalog = dedupeById([...catalog, ...incoming], (c) => c.id || c.code);
      catalogItemsImported = incoming.length;
    } else {
      throw new Error('Unrecognized JSON array format: expected catalog items or supply SKUs.');
    }
  }
  // Case 2: Step 1 localStorage dump ({ keys: { ai_mdc_studio_v11_0_enterprise: ... } })
  else if (obj.keys && typeof obj.keys === 'object') {
    detectedKind = 'localstorage_dump';
    const keysObj = obj.keys as Record<string, unknown>;
    for (const val of Object.values(keysObj)) {
      if (val && typeof val === 'object') {
        const sub = mergeImportedJsonPayload(
          { ...current, deals, catalog, supplyIntel, activeDealId },
          val
        );
        deals = sub.nextState.deals;
        catalog = sub.nextState.catalog;
        supplyIntel = sub.nextState.supplyIntel;
        activeDealId = sub.nextState.activeDealId;
        dealsImported += sub.summary.dealsImported;
        catalogItemsImported += sub.summary.catalogItemsImported;
        supplySkusImported += sub.summary.supplySkusImported;
      }
    }
  }
  // Case 3: mdc_supply_intel.json ({ skus: [...] })
  else if (Array.isArray(obj.skus)) {
    detectedKind = 'supply_intel';
    const incoming = obj.skus as SupplyIntelSku[];
    supplyIntel = dedupeById([...supplyIntel, ...incoming], (s) => s.skuId);
    supplySkusImported = incoming.length;
  }
  // Case 4: mdc_master_catalog.json ({ items: [...] } or { masterCatalog: [...] })
  else if (Array.isArray(obj.items) || Array.isArray(obj.masterCatalog)) {
    detectedKind = 'catalog';
    const incoming = (obj.items ?? obj.masterCatalog) as MasterCatalogItem[];
    catalog = dedupeById([...catalog, ...incoming], (c) => c.id || c.code);
    catalogItemsImported = incoming.length;
  }
  // Case 5: Full Workspace bundle ({ deals: [...], catalog?: [...], supplyIntel?: [...] })
  else if (Array.isArray(obj.deals)) {
    detectedKind = 'workspace_bundle';
    const incomingDeals = obj.deals.map((d) =>
      normalizeLegacyDeal(d as Partial<DealConfig> & Record<string, unknown>)
    );
    deals = dedupeById([...deals, ...incomingDeals], (d) => d.id);
    dealsImported = incomingDeals.length;
    if (incomingDeals.length > 0) activeDealId = incomingDeals[incomingDeals.length - 1].id;

    if (Array.isArray(obj.catalog)) {
      const incomingCat = obj.catalog as MasterCatalogItem[];
      catalog = dedupeById([...catalog, ...incomingCat], (c) => c.id || c.code);
      catalogItemsImported = incomingCat.length;
    }
    if (Array.isArray(obj.supplyIntel)) {
      const incomingSup = obj.supplyIntel as SupplyIntelSku[];
      supplyIntel = dedupeById([...supplyIntel, ...incomingSup], (s) => s.skuId);
      supplySkusImported = incomingSup.length;
    }
  }
  // Case 6: Single V11/V12/V13 Deal JSON
  else if (typeof obj.targetItLoadMw === 'number' || typeof obj.architecture === 'string' || typeof obj.name === 'string') {
    detectedKind = 'deal';
    const normalized = normalizeLegacyDeal(obj as Partial<DealConfig> & Record<string, unknown>);
    deals = dedupeById([...deals, normalized], (d) => d.id);
    activeDealId = normalized.id;
    dealsImported = 1;
  } else {
    throw new Error('Could not recognize MDC deal, catalog, or supply intel structure in JSON file.');
  }

  const nextState: WorkspaceState = {
    ...current,
    schemaVersion: '13.0',
    activeDealId,
    deals,
    catalog,
    supplyIntel
  };

  return {
    nextState,
    summary: {
      detectedKind,
      dealsImported,
      catalogItemsImported,
      supplySkusImported,
      sourceSchemaVersion
    }
  };
}

/**
 * Browser File input helper — guarantees `inputEl.value = ''` in `finally`
 * so selecting the same filename twice always triggers `onChange`.
 */
export async function importJsonFileInput(
  file: File,
  current: WorkspaceState,
  inputEl?: HTMLInputElement | null
): Promise<{ nextState: WorkspaceState; summary: ImportSummary }> {
  try {
    const text = await file.text();
    const parsed = JSON.parse(text) as unknown;
    const result = mergeImportedJsonPayload(current, parsed);
    saveWorkspaceState(result.nextState);
    return result;
  } finally {
    if (inputEl) {
      inputEl.value = '';
    }
  }
}

export function triggerJsonDownload(filename: string, payload: unknown): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
