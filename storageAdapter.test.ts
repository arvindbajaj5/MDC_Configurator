import { beforeEach, describe, expect, it } from 'vitest';
import {
  CANONICAL_STORAGE_KEY,
  LEGACY_V11_STORAGE_KEY,
  LEGACY_V12_STORAGE_KEY,
  loadWorkspaceState,
  mergeImportedJsonPayload
} from '../services/storageAdapter';

describe('storageAdapter (V12.4 Bug #3 localStorage split & relaxed import fix)', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('merges stranded state from BOTH v11_0 and v12_0 legacy keys into canonical v13 key', () => {
    window.localStorage.setItem(
      LEGACY_V11_STORAGE_KEY,
      JSON.stringify({
        deals: [{ id: 'deal-v11-custom', name: '10 MW Chennai Edge AI', targetItLoadMw: 10 }]
      })
    );
    window.localStorage.setItem(
      LEGACY_V12_STORAGE_KEY,
      JSON.stringify({
        masterCatalog: [
          {
            id: 'CAT-CUSTOM-99',
            code: 'CUSTOM-CDU-2000',
            name: '2.0 MW Custom CDU',
            category: 'Cooling - Internal',
            unitCostInrLakhs: 115,
            miiPercent: 55,
            active: true
          }
        ]
      })
    );

    const state = loadWorkspaceState(window.localStorage);

    expect(state.lastMigratedFrom).toContain(LEGACY_V11_STORAGE_KEY);
    expect(state.lastMigratedFrom).toContain(LEGACY_V12_STORAGE_KEY);
    expect(state.deals.some((d) => d.id === 'deal-v11-custom')).toBe(true);
    expect(state.catalog.some((c) => c.id === 'CAT-CUSTOM-99')).toBe(true);
    expect(window.localStorage.getItem(CANONICAL_STORAGE_KEY)).not.toBeNull();
  });

  it('accepts legacy V12 catalog & supply intel JSONs without strict schemaVersion rejection', () => {
    const current = loadWorkspaceState(window.localStorage);

    const catalogRes = mergeImportedJsonPayload(current, {
      schemaVersion: '11.2',
      items: [
        {
          id: 'CAT-NEW-1',
          code: 'NEW-POD-3MW',
          name: '3 MW Future Pod',
          category: 'Modular Pod',
          unitCostInrLakhs: 260,
          miiPercent: 90,
          active: true
        }
      ]
    });
    expect(catalogRes.summary.detectedKind).toBe('catalog');
    expect(catalogRes.summary.catalogItemsImported).toBe(1);
    expect(catalogRes.nextState.catalog.some((c) => c.id === 'CAT-NEW-1')).toBe(true);

    const supplyRes = mergeImportedJsonPayload(catalogRes.nextState, {
      skus: [
        {
          skuId: 'IND-TEST-99',
          name: 'Custom Busway Test SKU',
          category: 'Busducts & PDUs',
          oemTier: 'Tier-1 India',
          vendorArchetype: 'India OEM',
          miiPercent: 85,
          unit: 'Run',
          unitPriceInrLakhs: 20,
          leadTimeWeeks: 8,
          certifications: ['BIS']
        }
      ]
    });
    expect(supplyRes.summary.detectedKind).toBe('supply_intel');
    expect(supplyRes.summary.supplySkusImported).toBe(1);
  });
});
