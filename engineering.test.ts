import { describe, expect, it } from 'vitest';
import { INITIAL_NON_IT_CATALOG, INITIAL_SKUS, INITIAL_STANDARDS } from '../../data/masterCatalog';
import { DEFAULT_SUPPLY_CHAIN_V13 } from '../../data/supplyChainSeed';
import { isProtectedMasterFile } from '../drivePicker';
import { computeEngineeringV13 } from '../engineeringEngine';
import { makeSampleProject, sanitizeProject } from '../storageAdapter';
import { matchOrSynthesizeSubsystem, mergeSupplyChainWithDedup } from '../supplyMatcher';

describe('MDC Configurator V13.1 Core Engines & Backward Compatibility', () => {
  it('preserves 100% backward compatibility with legacy V11/V12 deal JSONs', () => {
    const legacyV11Deal = {
      id: 'legacy-v11-01',
      name: 'Legacy V11 Sovereign Deal',
      client: 'State HPC',
      cityQuery: 'Guwahati',
      peakDryBulb: 36,
      peakWetBulb: 28,
      rackQuantities: { 'sku-dlc-265': 8, 'sku-air-core': 4 }
    };
    const sanitized = sanitizeProject(legacyV11Deal as never, INITIAL_STANDARDS);
    expect(sanitized.shellArchitecture).toBe('Container');
    expect(sanitized.monthlyClimate).toHaveLength(12);
    expect(sanitized.rackQuantities['sku-dlc-265']).toBe(8);
    expect(sanitized.inlineSkuOverrides).toEqual({});
    expect(sanitized.validationWaivers).toEqual({});
  });

  it('pre-seeds >= 50 Tier-1 & Tier-2 India OEM SKUs in Supply Chain DB', () => {
    expect(DEFAULT_SUPPLY_CHAIN_V13.items.length).toBeGreaterThanOrEqual(50);
    const hasTier1 = DEFAULT_SUPPLY_CHAIN_V13.items.some(i => i.tier === 'Tier-1');
    const hasTier2 = DEFAULT_SUPPLY_CHAIN_V13.items.some(i => i.tier === 'Tier-2');
    expect(hasTier1).toBe(true);
    expect(hasTier2).toBe(true);
  });

  it('triggers ±20% / <=8 active unit Auto-Placeholder synthesis without mutating master catalog', () => {
    const masterLenBefore = INITIAL_NON_IT_CATALOG.length;
    // Extreme hyperscale demand: 60,000 kVA exceeds 8 × 5,000 kVA largest transformer -> forces placeholder
    const match = matchOrSynthesizeSubsystem({
      dealId: 'deal-hyperscale',
      group: 'trafo',
      categoryLabel: 'MV/LV K-Factor Transformer',
      demand: 60000,
      demandUnit: 'kVA',
      uptimeTier: 'Tier III',
      supplyItems: DEFAULT_SUPPLY_CHAIN_V13.items,
      masterFallbacks: INITIAL_NON_IT_CATALOG
    });

    expect(match).not.toBeNull();
    expect(match?.isPlaceholder).toBe(true);
    expect(match?.label).toContain('[PLACEHOLDER]');
    expect(match?.placeholder?.marketScoutRemark).toContain('Market-Scout Required');
    expect(match?.placeholder?.romUnitPriceInr).toBeGreaterThan(0);
    // Master catalog strictly untouched
    expect(INITIAL_NON_IT_CATALOG.length).toBe(masterLenBefore);
  });

  it('computes 4.5m Pile Cap foundation when soil bearing capacity < 110 kN/m²', () => {
    const deal = { ...makeSampleProject(INITIAL_STANDARDS), soilBearingCapacityKpa: 95 };
    const eng = computeEngineeringV13(deal, INITIAL_SKUS, INITIAL_NON_IT_CATALOG, INITIAL_STANDARDS);
    expect(eng.civil.isWeakSoil).toBe(true);
    expect(eng.civil.embedmentDepthM).toBe(4.5);
    expect(eng.civil.foundationType).toContain('4.5m Pile Cap');
  });

  it('supports SOFT Validation Gate waivers without hard-blocking Outputs', () => {
    const deal = {
      ...makeSampleProject(INITIAL_STANDARDS),
      setbackMeters: 4.5, // Triggers VAL-07 FAIL
      validationWaivers: {
        'VAL-07': {
          code: 'VAL-07',
          waived: true,
          note: 'Client campus has shared 8m perimeter road outside parcel boundary',
          waivedAt: '2026-11-23'
        }
      }
    };
    const eng = computeEngineeringV13(deal, INITIAL_SKUS, INITIAL_NON_IT_CATALOG, INITIAL_STANDARDS);
    expect(eng.failCount).toBeGreaterThan(0);
    expect(eng.waivedCount).toBe(1);
    expect(eng.unwaivedFailCount).toBe(eng.failCount - 1);
    const val07 = eng.validations.find(v => v.code === 'VAL-07');
    expect(val07?.waived).toBe(true);
  });

  it('enforces 2-stage deduplication & trust-hierarchy merge in Supply Chain DB', () => {
    const existing = [
      {
        ...DEFAULT_SUPPLY_CHAIN_V13.items[0],
        vendor: 'ABB India',
        sku: 'RESI-2000-K13',
        group: 'trafo',
        rating: 2000,
        baseLow: 3800000,
        baseHigh: 3900000,
        trustSource: 'DealVerifiedQuote' as const
      }
    ];
    const incomingLowerTrust = [
      {
        ...DEFAULT_SUPPLY_CHAIN_V13.items[0],
        id: 'SI-NEW',
        vendor: 'ABB', // Alias should normalize to 'abb india'
        sku: 'RESI-2000-K13-ALT',
        group: 'trafo',
        rating: 2050, // Within ±5% of 2000 kVA -> Stage 2 dedup match!
        baseLow: 4600000,
        baseHigh: 4900000,
        trustSource: 'GeminiSearchRefresh' as const
      }
    ];

    const res = mergeSupplyChainWithDedup(existing, incomingLowerTrust);
    expect(res.merged).toHaveLength(1);
    expect(res.preservedHigherTrustCount).toBe(1);
    // Higher-trust DealVerifiedQuote price must remain untouched
    expect(res.merged[0].baseLow).toBe(3800000);
  });

  it('protects master catalog and supply intel files in Google Drive Picker', () => {
    expect(isProtectedMasterFile('mdc_master_catalog.json')).toBe(true);
    expect(isProtectedMasterFile('mdc_supply_intel_2026.json')).toBe(true);
    expect(isProtectedMasterFile('Sovereign_AI_15MW_Deal.json')).toBe(false);
  });
});
