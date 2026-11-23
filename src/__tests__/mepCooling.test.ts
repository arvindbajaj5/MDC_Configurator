import { describe, expect, it } from 'vitest';
import { DEFAULT_NAVI_MUMBAI_DEAL } from '../data/defaults';
import { computeMepCooling } from '../engines/mepCooling';

describe('mepCooling engine invariants', () => {
  it('strictly enforces ZERO yard CDUs and mandatory 80 kW PACs', () => {
    const mep = computeMepCooling(DEFAULT_NAVI_MUMBAI_DEAL);

    expect(mep.yardCduCount).toBe(0);
    expect(mep.internalCduCountTotal).toBeGreaterThan(0);
    expect(mep.mandatoryPacUnitKw).toBe(80);
    expect(mep.pacCountTotal).toBeGreaterThanOrEqual(mep.podCount);
    expect(mep.chillerCountTotal).toBeGreaterThan(0);
  });

  it('achieves lower PUE with 80% DLC compared to 0% DLC full air cooling', () => {
    const dlcMep = computeMepCooling({ ...DEFAULT_NAVI_MUMBAI_DEAL, dlcSharePct: 80 });
    const airMep = computeMepCooling({ ...DEFAULT_NAVI_MUMBAI_DEAL, dlcSharePct: 0 });

    expect(dlcMep.estimatedPue).toBeLessThan(airMep.estimatedPue);
    expect(airMep.internalCduCountTotal).toBe(0);
    expect(airMep.pacCountTotal).toBeGreaterThan(dlcMep.pacCountTotal);
  });

  it('computes non-zero 3-zone isolation areas and compliance gear', () => {
    const mep = computeMepCooling(DEFAULT_NAVI_MUMBAI_DEAL);
    expect(mep.threeZoneIsolation.zone1WhiteSpaceM2).toBeGreaterThan(0);
    expect(mep.threeZoneIsolation.zone2HeatRejectionYardM2).toBeGreaterThan(0);
    expect(mep.threeZoneIsolation.zone3ElectricalPowerYardM2).toBeGreaterThan(0);
    expect(mep.complianceGear.vesdaDetectors).toBeGreaterThan(0);
    expect(mep.complianceGear.chemicalAirScrubbers).toBeGreaterThan(0);
  });
});
