import { describe, expect, it } from 'vitest';
import { DEFAULT_NAVI_MUMBAI_DEAL, DEFAULT_SUPPLY_INTEL } from '../data/defaults';
import { computeSiteEngineering } from '../engines';

describe('supplyChain & tcoEngine', () => {
  it('scores all 16 India OEM SKUs and classifies Navi Mumbai baseline as Class-I Local Supplier', () => {
    const out = computeSiteEngineering(DEFAULT_NAVI_MUMBAI_DEAL, DEFAULT_SUPPLY_INTEL);

    expect(out.supplyChain.totalSkusEvaluated).toBe(16);
    expect(out.supplyChain.weightedMiiPercent).toBeGreaterThanOrEqual(50);
    expect(out.supplyChain.pppMiiClass).toBe('Class-I Local Supplier');
    expect(out.commercial.weightedBoqMiiPercent).toBeGreaterThanOrEqual(50);
  });

  it('applies special vendor quote discounts accurately and reduces CapEx', () => {
    const baseOut = computeSiteEngineering(DEFAULT_NAVI_MUMBAI_DEAL, DEFAULT_SUPPLY_INTEL);
    const quotedDeal = {
      ...DEFAULT_NAVI_MUMBAI_DEAL,
      specialQuotes: {
        'BOQ-CHL': {
          lineId: 'BOQ-CHL',
          vendorName: 'Tier-1 Thermal Partner',
          quoteRef: 'SQ-2026-881',
          discountPct: 15
        }
      }
    };
    const quotedOut = computeSiteEngineering(quotedDeal, DEFAULT_SUPPLY_INTEL);
    const chlLine = quotedOut.commercial.boqLines.find((l) => l.lineId === 'BOQ-CHL');

    expect(chlLine?.hasSpecialQuote).toBe(true);
    expect(quotedOut.commercial.totalCapexInrCr).toBeLessThan(baseOut.commercial.totalCapexInrCr);
  });

  it('generates a 5-year TCO schedule with positive tariff escalation', () => {
    const out = computeSiteEngineering(DEFAULT_NAVI_MUMBAI_DEAL, DEFAULT_SUPPLY_INTEL);
    expect(out.commercial.schedule).toHaveLength(5);
    expect(out.commercial.schedule[4].powerCostInrCr).toBeGreaterThan(
      out.commercial.schedule[0].powerCostInrCr
    );
    expect(out.commercial.totalTco5YrInrCr).toBeGreaterThan(out.commercial.totalCapexInrCr);
  });
});
