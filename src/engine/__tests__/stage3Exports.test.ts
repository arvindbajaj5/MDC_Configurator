import { describe, expect, it } from 'vitest';
import { CAD_SHEET_MANIFEST } from '../../components/CadBlueprintViewer';
import { INITIAL_NON_IT_CATALOG, INITIAL_SKUS, INITIAL_STANDARDS } from '../../data/masterCatalog';
import { DEFAULT_SUPPLY_CHAIN_V13 } from '../../data/supplyChainSeed';
import { build15PointSummaryRows } from '../csvPdfExporters';
import { buildFirstDraftPatch, computeEngineeringV13 } from '../engineeringEngine';
import { analyzeCostPerMwDeviation, buildPortfolioBenchmarks } from '../portfolioAnalyzer';
import {
  exportStrictNativePptxDeck,
  PPTX_BODY_FONT,
  PPTX_BODY_MAX_SIZE_PT,
  PPTX_CONTENT_TOP_IN,
  PPTX_FOOTER_CLEARANCE_IN,
  PPTX_HEADER1_FONT,
  PPTX_HEADER1_SIZE_PT,
  PPTX_HEADER2_FONT,
  PPTX_HEADER2_SIZE_PT,
  PPTX_MAX_CONTENT_BOTTOM_IN,
  PPTX_PALETTE,
  PPTX_SLIDE_HEIGHT_IN,
  PPTX_TOP_CONTENT_GAP_IN
} from '../pptxExporter';
import { makeSampleProject } from '../storageAdapter';
import { generatePartnerRfqCsv } from '../supplyMatcher';

describe('MDC Configurator V13.3 Stage 3 Outputs, 8 CAD Sheets & Sample-Slide PPTX Governance', () => {
  it('defines all 8 required CAD sheets including E-202 UPS/Battery/Switchgear Room GA', () => {
    const ids = CAD_SHEET_MANIFEST.map(s => s.id);
    expect(ids).toEqual(['A-101', 'A-102', 'C-101', 'E-201', 'E-202', 'G-101', 'R-101', 'M-301']);
  });

  it('builds complete 15-Point Summary (without Row 5 duplication), Equipment Schedule, and Partner RFQ CSV', () => {
    const base = makeSampleProject(INITIAL_STANDARDS);
    const drafted = {
      ...base,
      ...buildFirstDraftPatch(base, INITIAL_SKUS, INITIAL_NON_IT_CATALOG, INITIAL_STANDARDS, DEFAULT_SUPPLY_CHAIN_V13.items)
    };
    const eng = computeEngineeringV13(
      drafted,
      INITIAL_SKUS,
      INITIAL_NON_IT_CATALOG,
      INITIAL_STANDARDS,
      DEFAULT_SUPPLY_CHAIN_V13.items
    );

    const rows = build15PointSummaryRows(drafted, eng);
    expect(rows).toHaveLength(15);
    expect(rows[0][0]).toContain('1. Total IT Load');
    expect(rows[4][1]).not.toMatch(/Dry \/ \d+m Spray\) \(\d+m Free/);
    expect(rows[14][0]).toContain('15. City / Location');
    expect(eng.equipmentSchedule.length).toBeGreaterThanOrEqual(6);

    const rfqCsv = generatePartnerRfqCsv(drafted.name, drafted.cityQuery, eng.dealPlaceholders);
    expect(rfqCsv).toContain('Placeholder ID');
  });

  it('enforces exact Sample Slide PPTX typography, Brand Orange palette, 1.0" top gap & 3.1" footer clearance', () => {
    expect(PPTX_PALETTE.WHITE).toBe('FFFFFF');
    expect(PPTX_PALETTE.ORANGE).toBe('FF5539');
    expect(PPTX_HEADER1_FONT).toBe('Tosh A Black');
    expect(PPTX_HEADER1_SIZE_PT).toBe(24);
    expect(PPTX_HEADER2_FONT).toBe('Tosh A Black');
    expect(PPTX_HEADER2_SIZE_PT).toBe(22);
    expect(PPTX_BODY_FONT).toBe('Roboto');
    expect(PPTX_BODY_MAX_SIZE_PT).toBe(12);
    expect(PPTX_SLIDE_HEIGHT_IN).toBe(7.5);
    expect(PPTX_TOP_CONTENT_GAP_IN).toBe(1.0);
    expect(PPTX_CONTENT_TOP_IN).toBeCloseTo(2.34, 2);
    expect(PPTX_FOOTER_CLEARANCE_IN).toBe(3.1);
    expect(PPTX_MAX_CONTENT_BOTTOM_IN).toBeCloseTo(4.4, 2);
    const base = makeSampleProject(INITIAL_STANDARDS);
    const eng = computeEngineeringV13(base, INITIAL_SKUS, INITIAL_NON_IT_CATALOG, INITIAL_STANDARDS);
    expect(typeof exportStrictNativePptxDeck).toBe('function');
    expect(eng.bomItems.length).toBeGreaterThan(0);

    const bench = buildPortfolioBenchmarks(
      [base, { ...base, id: 'p2', name: 'BnM Twin', shellArchitecture: 'BnM_Hall' as const, uptimeTier: 'Tier IV' as const }],
      INITIAL_SKUS,
      INITIAL_NON_IT_CATALOG,
      INITIAL_STANDARDS,
      DEFAULT_SUPPLY_CHAIN_V13.items
    );
    expect(bench).toHaveLength(2);
    const variance = analyzeCostPerMwDeviation(bench[0], bench[1], INITIAL_STANDARDS);
    expect(variance.items.length).toBe(5);
  });
});
