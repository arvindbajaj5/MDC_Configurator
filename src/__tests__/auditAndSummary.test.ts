import { describe, expect, it } from 'vitest';
import { DEFAULT_NAVI_MUMBAI_DEAL, DEFAULT_SUPPLY_INTEL } from '../data/defaults';
import { computeSiteEngineering } from '../engines';
import {
  build15PointExecutiveSummary,
  buildCommissioningChecklist,
  buildDefaultRiggingManifest,
  runComplianceAudits
} from '../engines/auditAndSummary';

describe('15-Point Executive Summary, L1-L5 Commissioning & Uptime/BIS Audits', () => {
  it('generates exactly 15 executive summary checkpoints', () => {
    const eng = computeSiteEngineering(DEFAULT_NAVI_MUMBAI_DEAL, DEFAULT_SUPPLY_INTEL);
    const summary = build15PointExecutiveSummary(DEFAULT_NAVI_MUMBAI_DEAL, eng);
    expect(summary).toHaveLength(15);
    expect(summary[0].index).toBe(1);
    expect(summary[14].index).toBe(15);
  });

  it('tracks L1-L5 commissioning completion accurately', () => {
    const steps = buildCommissioningChecklist(['L1-1', 'L2-1', 'L5-2']);
    expect(steps.length).toBeGreaterThanOrEqual(10);
    expect(steps.filter((s) => s.completed)).toHaveLength(3);
  });

  it('evaluates Uptime Tier, BIS, NBC, and PPP-MII audits with zero failures on Navi Mumbai baseline', () => {
    const eng = computeSiteEngineering(DEFAULT_NAVI_MUMBAI_DEAL, DEFAULT_SUPPLY_INTEL);
    const audits = runComplianceAudits(DEFAULT_NAVI_MUMBAI_DEAL, eng);
    expect(audits.length).toBeGreaterThanOrEqual(8);
    expect(audits.some((a) => a.status === 'FAIL')).toBe(false);

    const manifest = buildDefaultRiggingManifest(DEFAULT_NAVI_MUMBAI_DEAL, eng);
    expect(manifest.length).toBeGreaterThanOrEqual(4);
  });
});
