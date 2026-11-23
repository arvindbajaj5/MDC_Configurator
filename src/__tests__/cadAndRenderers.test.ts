import { describe, expect, it } from 'vitest';
import { CAD_SHEET_CATALOG } from '../components/modules/CadStudioModule';
import { DEFAULT_NAVI_MUMBAI_DEAL, DEFAULT_SUPPLY_INTEL } from '../data/defaults';
import { computeSiteEngineering } from '../engines';
import { renderElectricalSldPng, renderMepSchematicPng } from '../services/cadCanvasRenderers';

describe('7-Sheet CAD Studio & Canvas Renderers (E-201 crash safety)', () => {
  it('exposes all 7 mandatory CAD engineering sheets', () => {
    const ids = CAD_SHEET_CATALOG.map((c) => c.id);
    expect(ids).toEqual(['A-101', 'A-102', 'C-101', 'E-201', 'G-101', 'R-101', 'M-301']);
  });

  it('does not throw in renderElectricalSldPng / renderMepSchematicPng when standards is undefined', () => {
    const dealNoStandards = { ...DEFAULT_NAVI_MUMBAI_DEAL, standards: undefined };
    const eng = computeSiteEngineering(dealNoStandards, DEFAULT_SUPPLY_INTEL);

    expect(() => renderElectricalSldPng(dealNoStandards, eng)).not.toThrow();
    expect(() => renderMepSchematicPng(dealNoStandards, eng)).not.toThrow();
  });
});
