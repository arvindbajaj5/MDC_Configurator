import { describe, expect, it } from 'vitest';
import { DEFAULT_NAVI_MUMBAI_DEAL } from '../data/defaults';
import { computeCivilPlinth } from '../engines/civilPlinth';
import { computeMepCooling } from '../engines/mepCooling';

describe('civilPlinth engine (V12.4 Bug #4 fix)', () => {
  it('uses shallow RCC Plinth/Raft (1.35-1.80m) when soil SBC >= 110 kPa', () => {
    const deal = {
      ...DEFAULT_NAVI_MUMBAI_DEAL,
      civil: { ...DEFAULT_NAVI_MUMBAI_DEAL.civil, soilSbcKpa: 135 }
    };
    const mep = computeMepCooling(deal);
    const civil = computeCivilPlinth(deal, mep);

    expect(civil.requiresPiling).toBe(false);
    expect(civil.foundationType).toBe('RCC Plinth / Raft');
    expect(civil.embedmentDepthM).toBeGreaterThanOrEqual(1.35);
    expect(civil.embedmentDepthM).toBeLessThanOrEqual(1.8);
    expect(civil.pileCount).toBe(0);
    expect(civil.pileAdderInrCr).toBe(0);
    expect(civil.imposedBearingKpa).toBeGreaterThan(0);
    expect(civil.bearingFoS).toBeGreaterThan(1.0);
  });

  it('automatically switches to 4.5m RCC Pile Cap when soil SBC < 110 kPa', () => {
    const deal = {
      ...DEFAULT_NAVI_MUMBAI_DEAL,
      civil: { ...DEFAULT_NAVI_MUMBAI_DEAL.civil, soilSbcKpa: 85 }
    };
    const mep = computeMepCooling(deal);
    const civil = computeCivilPlinth(deal, mep);

    expect(civil.requiresPiling).toBe(true);
    expect(civil.foundationType).toBe('4.5m RCC Pile Cap Foundation');
    expect(civil.embedmentDepthM).toBe(4.5);
    expect(civil.pileCount).toBeGreaterThanOrEqual(8);
    expect(civil.pileAdderInrCr).toBeGreaterThan(0);
    expect(civil.fosStatus).toBe('PILE_MITIGATED');
    expect(civil.bearingFoS).toBeGreaterThanOrEqual(1.2);
  });

  it('scales seismic anchorage bolts up for Zone IV/V', () => {
    const zoneIVDeal = {
      ...DEFAULT_NAVI_MUMBAI_DEAL,
      climate: { ...DEFAULT_NAVI_MUMBAI_DEAL.climate, seismicZone: 'Zone IV' as const, seismicZoneFactorZ: 0.24 }
    };
    const mep = computeMepCooling(zoneIVDeal);
    const civil = computeCivilPlinth(zoneIVDeal, mep);
    expect(civil.anchorBoltSpec).toContain('M30');
  });
});
