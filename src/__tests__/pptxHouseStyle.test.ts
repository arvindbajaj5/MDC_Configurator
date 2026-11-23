import { describe, expect, it } from 'vitest';
import { DEFAULT_NAVI_MUMBAI_DEAL, DEFAULT_SUPPLY_INTEL } from '../data/defaults';
import { computeSiteEngineering } from '../engines';
import { buildPptxSlideBlueprints, PPTX_HOUSE_STYLE } from '../services/pptxExporter';

describe('PPTX Corporate House Style & 3.1-inch Footer Clearance', () => {
  it('enforces pure white #FFFFFF canvas, 5-color palette, Tosh A Black 24pt, and Roboto <=12pt', () => {
    expect(PPTX_HOUSE_STYLE.canvasHex).toBe('FFFFFF');
    expect(PPTX_HOUSE_STYLE.palette.orange).toBe('FF5539');
    expect(PPTX_HOUSE_STYLE.palette.navy).toBe('002870');
    expect(PPTX_HOUSE_STYLE.palette.cobalt).toBe('1C38F5');
    expect(PPTX_HOUSE_STYLE.palette.emerald).toBe('00B290');
    expect(PPTX_HOUSE_STYLE.palette.amber).toBe('FFB600');
    expect(PPTX_HOUSE_STYLE.fonts.header).toBe('Tosh A Black');
    expect(PPTX_HOUSE_STYLE.fonts.headerSizePt).toBe(24);
    expect(PPTX_HOUSE_STYLE.fonts.body).toBe('Roboto');
    expect(PPTX_HOUSE_STYLE.fonts.maxBodySizePt).toBeLessThanOrEqual(12);
    expect(PPTX_HOUSE_STYLE.footerClearanceIn).toBe(3.1);
  });

  it('keeps every single element across all 6 slides strictly within y + h <= 4.40 inches', () => {
    const eng = computeSiteEngineering(DEFAULT_NAVI_MUMBAI_DEAL, DEFAULT_SUPPLY_INTEL);
    const slides = buildPptxSlideBlueprints(DEFAULT_NAVI_MUMBAI_DEAL, eng);

    expect(slides).toHaveLength(6);
    for (const slide of slides) {
      expect(slide.backgroundHex).toBe('FFFFFF');
      for (const el of slide.elements) {
        expect(el.y + el.h).toBeLessThanOrEqual(4.4001);
        if (el.kind !== 'title' && el.fontSizePt) {
          expect(el.fontSizePt).toBeLessThanOrEqual(12);
        }
      }
    }
  });
});
