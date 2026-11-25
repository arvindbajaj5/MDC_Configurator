import { describe, expect, it } from 'vitest';
import { CAD_SHEET_MANIFEST } from '../../components/CadBlueprintViewer';
import { INITIAL_NON_IT_CATALOG, INITIAL_SKUS, INITIAL_STANDARDS } from '../../data/masterCatalog';
import { DEFAULT_SUPPLY_CHAIN_V13 } from '../../data/supplyChainSeed';
import { build15PointSummaryRows } from '../csvPdfExporters';
import { buildFirstDraftPatch, computeEngineeringV13 } from '../engineeringEngine';
import {
  exportStrictNativePptxDeck,
  PPTX_FOOTER_CLEARANCE_IN,
  PPTX_MAX_CONTENT_BOTTOM_IN,
  PPTX_PALETTE,
  PPTX_SLIDE_HEIGHT_IN
} from '../pptxExporter';
import { makeSampleProject } from '../storageAdapter';
import { generatePartnerRfqCsv } from '../supplyMatcher';

describe('MDC Configurator V13.1 Stage 3 Outputs, 7 CAD Sheets & PPTX Governance', () => {
  it('defines all 7 required CAD sheets (A-101, A-102, C-101, E-201, G-101, R-101, M-301)', () => {
    const ids = CAD_SHEET_MANIFEST.map(s => s.id);
    expect(ids).toEqual(['A-101', 'A-102', 'C-101', 'E-201', 'G-101', 'R-101', 'M-301']);
  });

  it('builds complete 15-Point Executive Solution Summary and Partner RFQ CSV', () => {
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
    expect(rows[14][0]).toContain('15. City / Location');

    const rfqCsv = generatePartnerRfqCsv(drafted.name, drafted.cityQuery, eng.dealPlaceholders);
    expect(rfqCsv).toContain('Placeholder ID');
  });

  it('enforces strict Pure-White #FFFFFF, Brand-Orange #FF5539, and 3.1" blank footer PPTX constants', () => {
    expect(PPTX_PALETTE.WHITE).toBe('FFFFFF');
    expect(PPTX_PALETTE.ORANGE).toBe('FF5539');
    expect(PPTX_PALETTE.BLACK).toBe('000000');
    expect(PPTX_SLIDE_HEIGHT_IN).toBe(7.5);
    expect(PPTX_FOOTER_CLEARANCE_IN).toBe(3.1);
    expect(PPTX_MAX_CONTENT_BOTTOM_IN).toBeCloseTo(4.4, 2);
    const base = makeSampleProject(INITIAL_STANDARDS);
    const eng = computeEngineeringV13(base, INITIAL_SKUS, INITIAL_NON_IT_CATALOG, INITIAL_STANDARDS);
    expect(typeof exportStrictNativePptxDeck).toBe('function');
    expect(eng.bomItems.length).toBeGreaterThan(0);
  });
});
