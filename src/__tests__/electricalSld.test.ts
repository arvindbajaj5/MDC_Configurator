import { describe, expect, it } from 'vitest';
import { DEFAULT_NAVI_MUMBAI_DEAL } from '../data/defaults';
import { computeElectricalSld, resolveElectricalStandards } from '../engines/electricalSld';
import { computeMepCooling } from '../engines/mepCooling';

describe('electricalSld engine (V12.4 Bug #1 E-201 standards crash fix)', () => {
  it('never returns undefined standards even when deal.standards is omitted', () => {
    const legacyDealWithoutStandards = {
      ...DEFAULT_NAVI_MUMBAI_DEAL,
      standards: undefined
    };
    const mep = computeMepCooling(legacyDealWithoutStandards);
    const sld = computeElectricalSld(legacyDealWithoutStandards, mep);

    expect(sld.standards).toBeDefined();
    expect(sld.standards.wiringCode).toContain('IS 732');
    expect(sld.standards.harmonicsStandard).toContain('IEEE 519');
    expect(sld.standards.kFactorRating).toBe('K-13');
    expect(sld.standards.busductIpRating).toBe('IP65');
    expect(sld.nodes.length).toBeGreaterThanOrEqual(6);
  });

  it('switches utility incoming voltage to 132 kV above 20 MW gross demand', () => {
    const megaDeal = { ...DEFAULT_NAVI_MUMBAI_DEAL, targetItLoadMw: 25 };
    const mep = computeMepCooling(megaDeal);
    const sld = computeElectricalSld(megaDeal, mep);

    expect(sld.incomingVoltageKv).toBe(132);
    expect(sld.grossFacilityMw).toBeGreaterThan(25);
  });

  it('fills partial standards safely with defaults', () => {
    const resolved = resolveElectricalStandards({ kFactorRating: 'K-20', busductIpRating: 'IP55' });
    expect(resolved.kFactorRating).toBe('K-20');
    expect(resolved.busductIpRating).toBe('IP55');
    expect(resolved.earthingStandard).toContain('IS 3043');
  });
});
