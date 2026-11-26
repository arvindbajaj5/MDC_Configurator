import PptxGenJS from 'pptxgenjs';
import type { EngineeringResult, MasterStandards, ProjectDeal } from '../types/mdc';
import { formatMoney, totalHsdK } from './engineeringEngine';
import type { StoredPptxTemplate } from './templateStorage';

export const PPTX_PALETTE = {
  WHITE: 'FFFFFF',
  ORANGE: 'FF5539',
  ORANGE_DARK: 'D93F24',
  ORANGE_TINT: 'FFF3F0',
  ORANGE_SOFT: 'FFD6CC',
  LIGHT_BAND: 'F7F7F7',
  BLACK: '000000',
  CHARCOAL: '222222',
  MUTED: '555555',
  RULE_GREY: 'E5E5E5'
} as const;

export const PPTX_SLIDE_WIDTH_IN = 13.333;
export const PPTX_SLIDE_HEIGHT_IN = 7.5;
export const PPTX_HEADER1_FONT = 'Tosh A Black';
export const PPTX_HEADER1_SIZE_PT = 24;
export const PPTX_HEADER2_FONT = 'Tosh A Black';
export const PPTX_HEADER2_SIZE_PT = 22;
export const PPTX_BODY_FONT = 'Roboto';
export const PPTX_BODY_MAX_SIZE_PT = 12;
export const PPTX_INNER_MARGIN_PT = 7.2; // Exact 0.10" = 7.2pt padding inside shapes & cells
export const PPTX_HEADER2_BOTTOM_IN = 1.34;
export const PPTX_TOP_CONTENT_GAP_IN = 1.0;
export const PPTX_CONTENT_TOP_IN = PPTX_HEADER2_BOTTOM_IN + PPTX_TOP_CONTENT_GAP_IN; // 2.34"
export const PPTX_FOOTER_CLEARANCE_IN = 3.1;
export const PPTX_MAX_CONTENT_BOTTOM_IN = PPTX_SLIDE_HEIGHT_IN - PPTX_FOOTER_CLEARANCE_IN; // 4.40"
export const PPTX_CONTENT_HEIGHT_IN = PPTX_MAX_CONTENT_BOTTOM_IN - PPTX_CONTENT_TOP_IN; // 2.06"

type PptxSlide = ReturnType<PptxGenJS['addSlide']>;
type PptxTableRow = Parameters<PptxSlide['addTable']>[0][number];
type PptxTableCell = Exclude<PptxTableRow[number], string>;

const tc = (text: string, options?: PptxTableCell['options']): PptxTableCell =>
  options ? { text, options } : { text };

export interface ConsultingNarrativeOverride {
  executiveThesis?: string;
  thermalPhysicsStory?: string;
  cityDriversStory?: string;
  tradeoffsStory?: string;
  commercialStory?: string;
}

/**
 * Optional BYOK Gemini Executive Storyteller that turns the deal's internal telemetry
 * & counterfactual deltas into sharp consulting prose (max 12pt Roboto, non-boxy narrative).
 */
export async function polishConsultingNarrativeWithByokGemini(
  apiKey: string,
  project: ProjectDeal,
  eng: EngineeringResult,
  standards: MasterStandards
): Promise<ConsultingNarrativeOverride> {
  const key = apiKey.trim();
  if (!key) {
    throw new Error('Enter a session-only BYOK Gemini API key first.');
  }

  const mw = (eng.totalDesignContKw / 1000).toFixed(2);
  const preTax = formatMoney(eng.totals.sellingPreTax, project.currency, standards);
  const tco5 = formatMoney(eng.fiveYearTcoInr, project.currency, standards);

  const prompt = `You are a Principal Infrastructure Partner writing concise, analytical consulting slide narratives (NOT bullet dumps, NOT marketing fluff) for an executive AI Data Center proposal.
Keep every paragraph crisp (2-3 sentences, ~45-65 words), grounded strictly in these numbers:
- Project: ${project.name} for ${project.client || 'Authority'} in ${project.cityQuery} (${project.seismicZone}, ${project.peakDryBulb}°C DB / ${project.peakWetBulb}°C WB, Elev ${project.elevationM}m)
- Architecture: ${project.shellArchitecture === 'BnM_Hall' ? `BnM Hall ${project.bnmHallLengthM}×${project.bnmHallWidthM}m Floor #${project.bnmFloorLevel}` : `${eng.pods.length} ISO Pods (${eng.containerTotalVolumeCum} m³)`}
- Loads: ${mw} MW continuous (${eng.dlcRacks.length} DLC racks @ ${eng.governingMaxInletTempC}°C governing max inlet temp, ${eng.acRacks.length} AC racks)
- Cooling & PUE: ${eng.coolingMode}, Annual PUE ${eng.pueAnnualized}, Peak PUE ${eng.puePeakDesign}, Annual Water ${eng.annualWaterKl} kL
- Redundancy & Civil: ${project.uptimeTier} (Trafo ${eng.trafoCalc.activeN}+${eng.trafoCalc.redundantR}, UPS ${eng.upsCalc.activeN}+${eng.upsCalc.redundantR}, DG ${eng.dgCalc.activeN}+${eng.dgCalc.redundantR}), Civil ${eng.civil.foundationType.split('(')[0].trim()} (FoS ${eng.civil.bearingSafetyFactor}×)
- Economics: Pre-Tax ${preTax}, 5-Yr TCO ${tco5}, MII ${eng.mii.overallMiiPct}%

Return STRICT JSON with keys:
{"executiveThesis":"...","thermalPhysicsStory":"...","cityDriversStory":"...","tradeoffsStory":"...","commercialStory":"..."}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.25 }
      })
    }
  );
  if (!res.ok) throw new Error(`Gemini API HTTP ${res.status}`);
  const data = await res.json();
  const raw = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || '').join('') || '';
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('Could not parse narrative JSON from Gemini.');
  return JSON.parse(m[0]) as ConsultingNarrativeOverride;
}

/**
 * Brand-Orange ASHRAE 12-Month Thermal & Water Chart (Canvas -> PNG)
 */
export function renderStrictAshraeChartPng(eng: EngineeringResult): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 920;
  canvas.height = 240;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const padL = 56;
  const padR = 24;
  const padT = 28;
  const padB = 32;
  const plotW = canvas.width - padL - padR;
  const plotH = canvas.height - padT - padB;

  ctx.strokeStyle = '#E5E5E5';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const y = padT + (plotH * i) / 5;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + plotW, y);
    ctx.stroke();
    ctx.fillStyle = '#444444';
    ctx.font = '10.5px Roboto, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${50 - i * 10}°C`, padL - 7, y + 4);
  }

  const prof = eng.monthlyProfile || [];
  const maxWater = Math.max(...prof.map(m => m.monthlyWaterKl), 100);
  const stepX = plotW / 12;

  prof.forEach((m, idx) => {
    const x = padL + idx * stepX + stepX * 0.22;
    const bw = stepX * 0.56;
    const bh = (m.monthlyWaterKl / maxWater) * plotH * 0.76;
    ctx.fillStyle = m.mode === 'TrimChiller' ? '#FFD6CC' : '#FFF3F0';
    ctx.fillRect(x, padT + plotH - bh, bw, bh);
    ctx.strokeStyle = '#FF5539';
    ctx.strokeRect(x, padT + plotH - bh, bw, bh);

    ctx.fillStyle = '#222222';
    ctx.font = 'bold 9.5px Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${m.monthlyWaterKl}kL`, x + bw / 2, padT + plotH - bh - 3);
    ctx.fillText(m.month, x + bw / 2, padT + plotH + 16);
  });

  const limitTemp = Math.max(10, Math.min(50, eng.effectiveSupplyTempC - 3));
  const limitY = padT + plotH - (limitTemp / 50) * plotH;
  ctx.strokeStyle = '#222222';
  ctx.setLineDash([5, 4]);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(padL, limitY);
  ctx.lineTo(padL + plotW, limitY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#222222';
  ctx.textAlign = 'left';
  ctx.font = 'bold 10px Roboto, sans-serif';
  ctx.fillText(`Loop Ceiling (${limitTemp.toFixed(1)}°C)`, padL + 6, limitY - 4);

  ctx.strokeStyle = '#FF5539';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  prof.forEach((m, idx) => {
    const x = padL + idx * stepX + stepX / 2;
    const y = padT + plotH - (Math.min(50, m.dryBulbC) / 50) * plotH;
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  ctx.strokeStyle = '#555555';
  ctx.lineWidth = 2;
  ctx.beginPath();
  prof.forEach((m, idx) => {
    const x = padL + idx * stepX + stepX / 2;
    const y = padT + plotH - (Math.min(50, m.wetBulbC) / 50) * plotH;
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  ctx.font = 'bold 10.5px Roboto, sans-serif';
  ctx.fillStyle = '#FF5539';
  ctx.fillText('— Dry-Bulb (°C)', padL, 16);
  ctx.fillStyle = '#444444';
  ctx.fillText('— Wet-Bulb (°C)  |  Bars: Evap Water (kL)', padL + 125, 16);

  return canvas.toDataURL('image/png');
}

/**
 * Clean Brand-Orange Architectural & MEP Diagrams for the Technical Design Section
 */
function renderTechnicalDiagramPng(
  kind: 'whitespace' | 'yard' | 'elec_room' | 'civil' | 'hydraulics',
  project: ProjectDeal,
  eng: EngineeringResult
): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 780;
  canvas.height = 240;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const ORANGE = '#FF5539';
  const TINT = '#FFF3F0';
  const SOFT = '#FFD6CC';
  const DARK = '#222222';
  const BORDER = '#D93F24';

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = ORANGE;
  ctx.lineWidth = 1.6;
  ctx.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);

  const drawBox = (
    x: number,
    y: number,
    w: number,
    h: number,
    title: string,
    sub: string,
    filled = false
  ) => {
    ctx.fillStyle = filled ? ORANGE : TINT;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = BORDER;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = filled ? '#FFFFFF' : DARK;
    ctx.font = 'bold 11px Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, x + w / 2, y + h / 2 - (sub ? 4 : -4));
    if (sub) {
      ctx.fillStyle = filled ? '#FFF3F0' : '#444444';
      ctx.font = '9.5px Roboto, sans-serif';
      ctx.fillText(sub, x + w / 2, y + h / 2 + 11);
    }
  };

  if (kind === 'whitespace') {
    const pod0 = eng.pods?.[0];
    const dims = eng.civil.isBnM
      ? `BnM Hall ${project.bnmHallLengthM}m × ${project.bnmHallWidthM}m (Fl #${project.bnmFloorLevel})`
      : `${((pod0?.extLengthMm || 13500) / 1000).toFixed(2)}m L × ${((pod0?.extWidthMm || 4200) / 1000).toFixed(2)}m W Pod`;
    ctx.fillStyle = ORANGE;
    ctx.font = 'bold 11.5px Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SHEET A-102: WHITE-SPACE & CONTAINMENT — ${dims}`, 14, 22);

    drawBox(14, 34, 96, 192, 'AIRLOCK &', 'LV PANEL', false);
    drawBox(120, 34, 476, 48, `ROW A RACKS (${pod0?.rowA?.length || 0})`, `${eng.dlcRacks.length} DLC / ${eng.acRacks.length} AC`, true);
    drawBox(120, 90, 476, 76, `${project.containmentType} (${project.frontServiceClearanceMm}mm)`, `${project.airflowDelivery} • ${eng.raisedFloor.enabled ? `${eng.raisedFloor.heightMm}mm Raised Floor` : 'Slab'}`, false);
    drawBox(120, 174, 476, 52, `ROW B RACKS (${pod0?.rowB?.length || 0})`, `Dual A/B Busway + ${eng.whiteSpace.pduFootprintSqm} m² PDU`, true);
    drawBox(606, 34, 160, 92, 'ROOM PACs', `${eng.whiteSpace.mandatoryPacCount} × 80 kW CW`, false);
    drawBox(606, 134, 160, 92, 'INTERNAL CDUs', `${eng.whiteSpace.internalCduCount} Towers (≤ ${eng.effectiveSupplyTempC}°C)`, true);
  } else if (kind === 'yard') {
    ctx.fillStyle = ORANGE;
    ctx.font = 'bold 11.5px Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SHEET A-101: 3-ZONE CAMPUS & YARD GA (${project.setbackMeters}m NBC FIRE LANE)`, 14, 22);

    drawBox(18, 36, 240, 188, 'ZONE A: IT WHITE-SPACE', `${eng.pods.length} Units • ${eng.totalItWhiteSpaceSqm} m²`, true);
    drawBox(270, 36, 174, 188, 'ZONE B: UPS & BESS', `${eng.upsContainersCount}× UPS + ${eng.batteryContainersCount}× BESS`, false);
    drawBox(456, 36, 308, 42, 'HT VCB & K-13 TRAFOS', `${eng.transformerUnits}×${eng.selTrafo.ratedCapacity}kVA (${eng.yardBreakdown.substationSqm} m²)`, false);
    drawBox(456, 84, 308, 42, 'CPCB IV+ DGs & PESO', `${eng.dgUnitsCount}×${eng.selDg.ratedCapacity}kVA (${totalHsdK(eng.totalHsdFuelLitres)} kL)`, true);
    drawBox(456, 132, 308, 42, 'ADIABATIC COOLERS & TANKS', `${eng.adiabaticUnits}×${eng.selCooler.ratedCapacity}kW + ${eng.totalWaterStorageKl} kL`, false);
    drawBox(456, 180, 308, 44, 'PUMPS, CHILLERS & ZLD', `${eng.pumpSkidsCount} Pumps @ ${eng.pumpDesignHeadBar} bar`, false);
  } else if (kind === 'elec_room') {
    ctx.fillStyle = ORANGE;
    ctx.font = 'bold 11.5px Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SHEET E-202: UPS, BATTERY & SWITCHGEAR ROOM / POD GA (${project.uptimeTier})`, 14, 22);

    drawBox(16, 36, 242, 188, 'SWITCHGEAR & TRAFO BAY', `${eng.transformerUnits}×${eng.selTrafo.ratedCapacity}kVA • Form-4B • APFC/SPD`, false);
    drawBox(270, 36, 244, 188, 'MODULAR UPS ROOM / POD', `${eng.upsContainersCount}×${eng.selUps.ratedCapacity}kVA (${eng.upsCalc.activeN}+${eng.upsCalc.redundantR}) • 24°C PAC`, true);
    drawBox(526, 36, 238, 188, `${project.batteryChemistry} BATTERY ROOM`, `${eng.batteryContainersCount}×1.2MWh • 22–25°C + H2 Exhaust`, false);
  } else if (kind === 'civil') {
    ctx.fillStyle = ORANGE;
    ctx.font = 'bold 11.5px Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SHEET C-101: CIVIL FOUNDATION & PLINTH SECTION — ${project.cityQuery} (${project.seismicZone})`, 14, 22);

    drawBox(100, 36, 580, 58, eng.civil.isBnM ? `BnM HALL (FLOOR #${eng.bnmAux.floorLevel})` : `CORTEN-A POD (${eng.civil.unitGrossTonnes}T LOADED)`, `Floor ${eng.civil.floorPressureKpa} kN/m² • Corner ${eng.civil.cornerNodeKn} kN • M30 Bolts`, true);
    drawBox(75, 100, 630, 42, `M35 RCC PLINTH (+${eng.civil.floodPlinthMm}mm FLOOD LIFT)`, `1:50 Storm Drain Apron • 100-Yr Flood ${project.historicalFloodLevelMm}mm`, false);
    ctx.fillStyle = SOFT;
    ctx.fillRect(75, 148, 630, 76);
    ctx.strokeStyle = BORDER;
    ctx.strokeRect(75, 148, 630, 76);
    ctx.fillStyle = DARK;
    ctx.font = 'bold 11px Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      eng.civil.isWeakSoil
        ? `4.5m BORED FRICTION PILE CAP (SBC ${eng.civil.sbc} kN/m²)`
        : `ISOLATED M35 PAD FOOTING (${eng.civil.embedmentDepthM}m IS 1904 • SBC ${eng.civil.sbc} kN/m²)`,
      390,
      178
    );
    ctx.font = '10px Roboto, sans-serif';
    ctx.fillText(`Imposed: ${eng.civil.imposedBearingKpa} kN/m²  |  Bearing FoS: ${eng.civil.bearingSafetyFactor}×`, 390, 202);
  } else {
    ctx.fillStyle = ORANGE;
    ctx.font = 'bold 11.5px Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('SHEET M-301: PRIMARY / SECONDARY HYDRAULIC & THERMAL LOOP P&ID', 14, 22);

    const blocks = [
      ['1. YARD COOLERS', `${eng.adiabaticUnits}×${eng.selCooler.ratedCapacity}kW`, `${eng.freeCoolMonths}m Free / ${eng.adiabaticMonths}m Spray`],
      ['2. PUMPS & TANKS', `${eng.pumpSkidsCount} VFD Skids`, `${eng.totalWaterStorageKl} kL • ${eng.pumpDesignHeadBar} bar`],
      ['3. INTERNAL CDUs', `${eng.whiteSpace.internalCduCount} White-Space`, `Supply ≤ ${eng.effectiveSupplyTempC}°C PG25`],
      ['4. PACs & CHILLERS', `${eng.whiteSpace.mandatoryPacCount}×80kW PACs`, `${eng.whiteSpace.chillerUnitsCount}×1MW Chillers`]
    ];
    blocks.forEach(([t, s1, s2], i) => {
      const bx = 18 + i * 190;
      drawBox(bx, 48, 172, 162, t, `${s1} | ${s2}`, i % 2 === 0);
    });
  }

  return canvas.toDataURL('image/png');
}

export function exportStrictNativePptxDeck(
  project: ProjectDeal,
  eng: EngineeringResult,
  standards: MasterStandards,
  narrativeOverride?: ConsultingNarrativeOverride,
  corporateTemplate?: StoredPptxTemplate | null
): void {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE'; // 13.333" x 7.5"
  pptx.author = 'AI Modular Data Center Configurator V13.4';
  pptx.title = project.name || 'AI Modular Data Center Consulting Proposal';

  const C = PPTX_PALETTE;
  const TOP = PPTX_CONTENT_TOP_IN; // 2.34" (exact 1.0" below Header 2)
  const H = PPTX_CONTENT_HEIGHT_IN; // 2.06" (exact 3.1" clearance above footer)
  const M = PPTX_INNER_MARGIN_PT; // Exact 7.2pt = 0.10" inner margin on every shape/cell
  const L = 0.45;
  const W = 12.46;

  // Dynamic slide counter so Slide 2 Compliance & Requirement Checklist points to exact slide numbers
  let slideCounter = 0;
  const nextSlideNum = () => {
    slideCounter += 1;
    return slideCounter;
  };

  // Sample slide 2-header format:
  // Header 1: Tosh A Black 24pt Bold at (0.45", 0.52", 12.46" x 0.40")
  // Header 2: Tosh A Black 22pt Brand Orange at (0.45", 0.91", 12.46" x 0.43", bottom = 1.34")
  const initSlide = (slide: PptxSlide, h1: string, h2: string) => {
    slide.background = { color: C.WHITE };
    slide.addText(h1, {
      x: L,
      y: 0.52,
      w: W,
      h: 0.40,
      fontFace: PPTX_HEADER1_FONT,
      fontSize: PPTX_HEADER1_SIZE_PT,
      bold: true,
      color: C.BLACK,
      margin: M,
      valign: 'middle'
    });
    slide.addText(h2, {
      x: L,
      y: 0.91,
      w: W,
      h: 0.43,
      fontFace: PPTX_HEADER2_FONT,
      fontSize: PPTX_HEADER2_SIZE_PT,
      bold: false,
      color: C.ORANGE,
      margin: M,
      valign: 'middle'
    });
  };

  // Editorial narrative block (single-layer native shape with 7.2pt / 0.10" margin, Roboto <= 12pt)
  const addEditorialNote = (
    slide: PptxSlide,
    x: number,
    y: number,
    w: number,
    h: number,
    leadTitle: string,
    paragraphs: string[],
    accentBorder = true
  ) => {
    const runs = [
      {
        text: leadTitle + '\n',
        options: {
          fontFace: PPTX_BODY_FONT,
          fontSize: 10.5,
          bold: true,
          color: C.ORANGE
        }
      },
      ...paragraphs.map((p, idx) => ({
        text: p + (idx < paragraphs.length - 1 ? '\n\n' : ''),
        options: {
          fontFace: PPTX_BODY_FONT,
          fontSize: 9.5,
          bold: false,
          color: C.CHARCOAL
        }
      }))
    ];
    slide.addText(runs, {
      shape: 'rect' as Parameters<PptxSlide['addShape']>[0],
      x,
      y,
      w,
      h,
      fill: { color: C.LIGHT_BAND },
      line: accentBorder ? { color: C.ORANGE, width: 1 } : { color: C.RULE_GREY, width: 0.75 },
      margin: M,
      valign: 'top'
    });
  };

  const mw = (eng.totalDesignContKw / 1000).toFixed(2);
  const dlcMw = (eng.dlcDesignKw / 1000).toFixed(2);
  const acMw = (eng.acDesignKw / 1000).toFixed(2);
  const preTaxStr = formatMoney(eng.totals.sellingPreTax, project.currency, standards);
  const gstTotalStr = formatMoney(eng.totals.grandTotal, project.currency, standards);
  const tco5Str = formatMoney(eng.fiveYearTcoInr, project.currency, standards);
  const costPerMwStr = formatMoney(
    eng.totals.sellingPreTax / Math.max(0.05, eng.totalDesignContKw / 1000),
    project.currency,
    standards
  );

  // =========================================================================
  // SLIDE 1: COVER & EXECUTIVE CONSULTING THESIS
  // =========================================================================
  const s1 = pptx.addSlide();
  nextSlideNum();
  initSlide(
    s1,
    project.name || 'Turnkey AI Modular Data Center Proposal',
    `${project.client || 'Enterprise Authority'} • ${project.cityQuery} • ${mw} MW IT • Annual PUE ${eng.pueAnnualized}`
  );

  const defaultExecThesis =
    narrativeOverride?.executiveThesis ||
    `This briefing establishes a ${mw} MW continuous AI infrastructure architecture (${dlcMw} MW Direct Liquid Cooled across ${eng.dlcRacks.length} racks and ${acMw} MW Air-Cooled across ${eng.acRacks.length} racks) for ${project.client || 'the client'} in ${project.cityQuery}. By pairing high-efficiency thermal capture with ${project.uptimeTier} redundancy and ${eng.mii.miiClassLabel}, the design achieves an annualized PUE of ${eng.pueAnnualized} at ${preTaxStr} pre-tax (~${costPerMwStr}/MW) and ${tco5Str} 5-year lifecycle TCO${corporateTemplate ? ` (Mapped to template: ${corporateTemplate.name})` : ''}.`;

  addEditorialNote(
    s1,
    L,
    TOP,
    7.65,
    H,
    'EXECUTIVE THESIS & ARCHITECTURAL MANDATE',
    [
      defaultExecThesis,
      `Enclosure & Site Posture: ${eng.civil.isBnM ? `Brick-and-Mortar Hall (${project.bnmHallLengthM}m × ${project.bnmHallWidthM}m, Floor #${project.bnmFloorLevel})` : `${eng.pods.length} Corten-A Modular Pods (${eng.containerTotalVolumeCum} m³)`} on ${eng.civil.foundationType.split('(')[0].trim()} (Bearing FoS ${eng.civil.bearingSafetyFactor}×), occupying ${eng.totalCampusOccupiedSqm} m² (${eng.plotUtilizationPct}% of net buildable plot).`
    ],
    true
  );

  const kpiRows: PptxTableRow[] = [
    [
      tc('Key Metric', { bold: true, color: C.WHITE, fill: { color: C.ORANGE } }),
      tc('Engineered Value', { bold: true, color: C.WHITE, fill: { color: C.ORANGE } })
    ],
    [tc('Continuous IT Load', { bold: true }), tc(`${mw} MW (${eng.activeRacks.length} Racks)`)],
    [tc('Annual / Peak PUE', { bold: true }), tc(`${eng.pueAnnualized} / ${eng.puePeakDesign}`)],
    [tc('Governing Inlet Temp', { bold: true }), tc(`${eng.governingMaxInletTempC}°C (Loop ≤ ${(eng.effectiveSupplyTempC - 3).toFixed(1)}°C)`)],
    [tc('Pre-Tax / Unit Cost', { bold: true }), tc(`${preTaxStr} (${costPerMwStr}/MW)`)],
    [tc('5-Yr TCO / MII', { bold: true }), tc(`${tco5Str} • ${eng.mii.overallMiiPct}%`)]
  ];
  s1.addTable(kpiRows, {
    x: L + 7.85,
    y: TOP,
    w: 4.61,
    fontFace: PPTX_BODY_FONT,
    fontSize: 9,
    color: C.CHARCOAL,
    border: { type: 'solid', color: C.ORANGE_SOFT, pt: 0.5 },
    margin: M,
    colW: [2.05, 2.56],
    rowH: 0.34
  });

  // =========================================================================
  // SLIDE 2: CUSTOMER REQUIREMENTS & COMPLIANCE TRACEABILITY CHECKLIST
  // =========================================================================
  const s2 = pptx.addSlide();
  nextSlideNum();
  initSlide(
    s2,
    'Customer Requirements & Compliance Traceability',
    'How Each Mandate & Statutory Clause Is Satisfied and Where It Appears in This Deck'
  );

  // Compute exact upcoming slide numbers dynamically
  const slideThermalPhysics = 3;
  const slideCityDrivers = 4;
  const slideTradeoffs = 5;
  const slideTechSectionStart = 6;
  const slideEquipStart = slideTechSectionStart + 5;
  const eqPages = Math.max(1, Math.ceil(eng.equipmentSchedule.length / 4));
  const slideGov = slideEquipStart + eqPages;
  const slideBoqStart = slideGov + 1;

  const checklistRows: PptxTableRow[] = [
    [
      tc('Requirement / Clause', { bold: true, color: C.WHITE, fill: { color: C.ORANGE } }),
      tc('How Met in Engineering Design', { bold: true, color: C.WHITE, fill: { color: C.ORANGE } }),
      tc('Status', { bold: true, color: C.WHITE, fill: { color: C.ORANGE } }),
      tc('Deck Ref', { bold: true, color: C.WHITE, fill: { color: C.ORANGE } })
    ],
    [
      tc(`IT & Thermal Load (${mw} MW)`, { bold: true }),
      tc(`${eng.dlcRacks.length} DLC racks (${dlcMw} MW, ${Math.round(eng.totalLiquidKw)} kW liq) + ${eng.acRacks.length} AC racks (${acMw} MW); loop ≤ ${eng.effectiveSupplyTempC}°C`),
      tc('Met', { bold: true, color: C.ORANGE }),
      tc(`Slide ${slideThermalPhysics}`, { bold: true })
    ],
    [
      tc(`Site Climate & Water (${project.cityQuery})`, { bold: true }),
      tc(`${project.peakDryBulb}°C DB / ${project.peakWetBulb}°C WB; ${eng.coolingMode.split('(')[0].trim()}; ${eng.annualWaterKl.toLocaleString()} kL/yr + ZLD`),
      tc('Met', { bold: true, color: C.ORANGE }),
      tc(`Slide ${slideCityDrivers}`, { bold: true })
    ],
    [
      tc(`Enclosure, Floor & Civil (${project.seismicZone})`, { bold: true }),
      tc(`${eng.civil.isBnM ? `BnM ${project.bnmHallLengthM}×${project.bnmHallWidthM}m (Fl #${project.bnmFloorLevel})` : `${eng.pods.length} Pods (${eng.containerTotalVolumeCum} m³)`}; ${eng.raisedFloor.enabled ? `${eng.raisedFloor.heightMm}mm floor (${eng.raisedFloor.pedestalStemCount} stems)` : 'Slab'}; FoS ${eng.civil.bearingSafetyFactor}×`),
      tc('Met', { bold: true, color: C.ORANGE }),
      tc(`Slides ${slideTechSectionStart}–${slideTechSectionStart + 4}`, { bold: true })
    ],
    [
      tc(`Redundancy, MII & Commercials`, { bold: true }),
      tc(`${project.uptimeTier} (${project.dgAutonomyHours}h PESO fuel, ${eng.gridShield.loadDropShieldMw} MW shield); ${eng.mii.miiClassLabel}; Pre-Tax ${preTaxStr} (${tco5Str} 5-Yr TCO)`),
      tc(eng.waivedCount > 0 ? `Met (${eng.waivedCount} Waived)` : 'Met', { bold: true, color: C.ORANGE }),
      tc(`Slides ${slideTradeoffs}, ${slideEquipStart}–${slideBoqStart + 1}`, { bold: true })
    ]
  ];
  s2.addTable(checklistRows, {
    x: L,
    y: TOP,
    w: W,
    fontFace: PPTX_BODY_FONT,
    fontSize: 8.5,
    color: C.CHARCOAL,
    border: { type: 'solid', color: C.ORANGE_SOFT, pt: 0.5 },
    margin: M,
    colW: [2.55, 6.91, 1.45, 1.55],
    rowH: 0.34
  });

  // =========================================================================
  // SLIDE 3: WORKLOAD PHYSICS, INLET TEMP CEILING & PUE DETERMINATION
  // =========================================================================
  const s3 = pptx.addSlide();
  nextSlideNum();
  initSlide(
    s3,
    'Workload Physics, Governing Inlet Temp & PUE',
    `Minimum Rack Inlet Ceiling (${eng.governingMaxInletTempC}°C) Sets Loop Temp, Cooler Mode & PUE (${eng.pueAnnualized})`
  );

  // Counterfactual: what if governing inlet temp were 35°C vs actual governingMaxInletTempC?
  const loopTempC = (eng.effectiveSupplyTempC - 3).toFixed(1);
  const defaultThermalStory =
    narrativeOverride?.thermalPhysicsStory ||
    `Active racks split into ${eng.dlcRacks.length} DLC compute racks (${Math.round(eng.totalLiquidKw).toLocaleString()} kW liquid heat at ${Math.round(eng.totalFlowLpm).toLocaleString()} LPM) and ${eng.acRacks.length} air-cooled storage/fabric racks (${Math.round(eng.totalAirKw).toLocaleString()} kW air heat). Because the most thermally sensitive active rack caps inlet coolant at ${eng.governingMaxInletTempC}°C, subtracting a 3°C CDU heat-exchange approach bounds the facility heat-rejection loop to ${loopTempC}°C.`;

  const pueMechanismText = `Equipment & PUE Impact: Keeping the loop at ${loopTempC}°C enables ${eng.freeCoolMonths} months of dry free-cooling and ${eng.adiabaticMonths} months of adiabatic spray (${eng.trimChillerMonths} trim-chiller months), holding annualized PUE at ${eng.pueAnnualized} (peak ${eng.puePeakDesign}). Any tighter rack inlet spec would force earlier trim-chiller engagement and raise PUE and fan/compressor kWh.`;

  addEditorialNote(
    s3,
    L,
    TOP,
    6.1,
    H,
    'LOAD MIX -> GOVERNING INLET TEMPERATURE',
    [defaultThermalStory],
    true
  );
  addEditorialNote(
    s3,
    L + 6.36,
    TOP,
    6.1,
    H,
    'EQUIPMENT SELECTION -> PUE & WATER PHYSICS',
    [pueMechanismText],
    false
  );

  // =========================================================================
  // SLIDE 4: WHY SITE & CITY TELEMETRY DRIVES THERMAL & STRUCTURAL CALLS
  // =========================================================================
  const s4 = pptx.addSlide();
  nextSlideNum();
  initSlide(
    s4,
    `Why ${project.cityQuery} Climate & Site Physics Shape the Design`,
    `${project.peakDryBulb}°C DB / ${project.peakWetBulb}°C WB • ${project.seismicZone} • SBC ${eng.civil.sbc} kN/m² • Flood +${eng.civil.floodPlinthMm}mm`
  );

  const ashraePng = renderStrictAshraeChartPng(eng);
  if (ashraePng) {
    s4.addImage({ data: ashraePng, x: L, y: TOP, w: 7.45, h: H });
  }

  const defaultCityStory =
    narrativeOverride?.cityDriversStory ||
    `In ${project.cityQuery} (elev. ${project.elevationM}m), coincident ${project.peakDryBulb}°C dry-bulb and ${project.peakWetBulb}°C wet-bulb temperatures govern adiabatic wet-bulb depression and annual evaporative make-up (${eng.annualWaterKl.toLocaleString()} kL/yr), while site elevation & ambient heat apply a ${eng.dgDerateFactor}× derating factor to CPCB IV+ DGs (${eng.effectiveDgKva} kVA net per ${eng.selDg.ratedCapacity} kVA set).`;

  addEditorialNote(
    s4,
    L + 7.65,
    TOP,
    4.81,
    H,
    'CITY & SITE CAUSAL DRIVERS',
    [
      defaultCityStory,
      `Civil & Seismic Call: ${eng.civil.isWeakSoil ? `Low SBC (${eng.civil.sbc} kN/m²) mandates 4.5m bored friction piles` : `IS 1904 pad footing (${eng.civil.embedmentDepthM}m) achieves ${eng.civil.bearingSafetyFactor}× FoS`}; ${project.seismicZone} governs M30 anchorage & bracing.`
    ],
    false
  );

  // =========================================================================
  // SLIDE 5: BOM COST OPTIMIZATION & ENGINEERING TRADEOFFS
  // =========================================================================
  const s5 = pptx.addSlide();
  nextSlideNum();
  initSlide(
    s5,
    'BOM Cost Optimization & Deliberate Tradeoffs',
    `Controlled Pre-Tax CapEx at ${preTaxStr} (${costPerMwStr}/MW) via Block Sizing, Supply DB & Scope Discipline`
  );

  const defaultTradeoffsStory =
    narrativeOverride?.tradeoffsStory ||
    `Rather than over-buying oversized blocks or carrying unrequested scope by default, the engine selects OEM SKUs within +20% capacity and ≤8 active units per group, routes Supply Chain DB rates into the BOQ, keeps Telecom/MMR (${project.includeTelecomMmr ? 'Included' : 'Opt-In Off'}) and Rental Logistics (${project.includeLogisticsRigging ? 'Included' : 'Opt-In Off'}) opt-in, and isolates heavy-duty inside-DC server lifts as owned CapEx (${eng.logistics.ownedServerLifts}×).`;

  addEditorialNote(
    s5,
    L,
    TOP,
    5.8,
    H,
    'HOW WE OPTIMIZED BOM COST',
    [
      defaultTradeoffsStory,
      `Explicit Tradeoffs Made: ${project.uptimeTier === 'Tier III' ? 'Selected Tier III (N+1) over Tier IV (2N) to avoid doubling UPS/BESS/busway CapEx while preserving concurrent maintainability.' : `Selected ${project.uptimeTier} fault tolerance for maximum availability.`}`
    ],
    true
  );

  const tradeoffRows: PptxTableRow[] = [
    [
      tc('Optimization / Tradeoff Lever', { bold: true, color: C.WHITE, fill: { color: C.ORANGE } }),
      tc('Decision & Engineering Impact', { bold: true, color: C.WHITE, fill: { color: C.ORANGE } })
    ],
    [tc('±20% / ≤8-Unit OEM Matcher', { bold: true }), tc('Prevents excessive unit count or oversized idle capacity; flags gaps as [PLACEHOLDER] RFQ items')],
    [tc('Internal CDUs (Zero Yard CDUs)', { bold: true }), tc(`${eng.whiteSpace.internalCduCount} white-space CDUs + ${eng.whiteSpace.mandatoryPacCount} PACs shorten secondary DLC runs & protect loop temp`)],
    [tc('False Floor & Sub-Frames', { bold: true }), tc(`${eng.raisedFloor.enabled ? `${eng.raisedFloor.pedestalStemCount.toLocaleString()} stems (${eng.raisedFloor.pedestalAxialRatingKn}kN) + ${eng.raisedFloor.heavyRackSubFramesCount} direct-to-slab rack sub-frames` : 'Slab-mounted direct load transfer'}`)],
    [tc('Telecom & Rental Logistics', { bold: true }), tc(`Opt-in off by default so client-supplied fiber/cranes do not inflate baseline proposal pricing`)]
  ];
  s5.addTable(tradeoffRows, {
    x: L + 6.02,
    y: TOP,
    w: 6.44,
    fontFace: PPTX_BODY_FONT,
    fontSize: 8.5,
    color: C.CHARCOAL,
    border: { type: 'solid', color: C.ORANGE_SOFT, pt: 0.5 },
    margin: M,
    colW: [2.35, 4.09],
    rowH: 0.41
  });

  // =========================================================================
  // TECHNICAL DESIGN SECTION (SLIDES 6–10): HALL/POD, YARD, ELEC ROOMS, CIVIL, P&ID
  // =========================================================================
  // Slide 6: Enclosure / BnM Hall, Raised Flooring & White-Space Layout (A-102)
  const s6 = pptx.addSlide();
  nextSlideNum();
  initSlide(
    s6,
    'Technical Section | Hall / Container & White-Space Layout',
    `Sheet A-102 • ${eng.totalItWhiteSpaceSqm} m² White-Space • ${project.containmentType} • ${eng.raisedFloor.enabled ? `${eng.raisedFloor.heightMm}mm Raised Floor` : 'Slab'}`
  );
  const wsPng = renderTechnicalDiagramPng('whitespace', project, eng);
  if (wsPng) s6.addImage({ data: wsPng, x: L, y: TOP, w: 7.75, h: H });
  addEditorialNote(
    s6,
    L + 7.95,
    TOP,
    4.51,
    H,
    'WHITE-SPACE & FLOORING DESIGN',
    [
      eng.civil.isBnM
        ? `BnM Hall ${project.bnmHallLengthM}m × ${project.bnmHallWidthM}m × ${project.bnmClearSoffitM}m H (Floor #${project.bnmFloorLevel}, Fit: ${eng.bnmAux.hallFitStatus}); Rack Dressing Bay: ${eng.bnmAux.stagingDressingSqm} m².`
        : `${eng.pods.length} Corten-A pods (${eng.containerTotalVolumeCum} m³ total, ${project.hallTopology}) with ${project.futureGrowthReservePct}% growth reserve.`,
      eng.raisedFloor.enabled
        ? `${eng.raisedFloor.totalTiles.toLocaleString()} tiles (${eng.raisedFloor.tilePointLoadKn} kN), ${eng.raisedFloor.pedestalStemCount.toLocaleString()} stems (${eng.raisedFloor.pedestalAxialRatingKn} kN), ${eng.raisedFloor.heavyRackSubFramesCount} slab sub-frames.`
        : 'Racks anchored directly to structural slab.'
    ],
    false
  );

  // Slide 7: 3-Zone Campus & Technical Yard Layout (A-101)
  const s7 = pptx.addSlide();
  nextSlideNum();
  initSlide(
    s7,
    'Technical Section | 3-Zone Campus & Technical Yard Layout',
    `Sheet A-101 • ${eng.totalCampusOccupiedSqm} m² Occupied (${eng.plotUtilizationPct}% Plot) • ${project.setbackMeters}m Fire Lane`
  );
  const yardPng = renderTechnicalDiagramPng('yard', project, eng);
  if (yardPng) s7.addImage({ data: yardPng, x: L, y: TOP, w: 7.75, h: H });
  addEditorialNote(
    s7,
    L + 7.95,
    TOP,
    4.51,
    H,
    'YARD ZONING & SITE ACCESS',
    [
      `Zone A (${eng.totalItWhiteSpaceSqm} m²) isolates compute & internal CDUs; Zone B (${eng.yardBreakdown.upsBessSqm} m²) houses UPS/BESS; Zone C groups HT/LV power, DGs (${totalHsdK(eng.totalHsdFuelLitres)} kL PESO fuel), coolers, pumps & ZLD.`,
      `Perimeter noise is ${eng.boundaryNoiseDba} dBA; crane rigging sized for ${eng.logistics.craneTonnage}T with ≥${eng.logistics.minTurningRadiusM}m turning circle.`
    ],
    false
  );

  // Slide 8: UPS, Battery & Switchgear Room / Pod Layout & Redundancy (E-201 & E-202)
  const s8 = pptx.addSlide();
  nextSlideNum();
  initSlide(
    s8,
    'Technical Section | UPS, Battery & Switchgear Room Layout',
    `Sheets E-201 & E-202 • ${project.uptimeTier} • Peak ${(eng.totalFacilityPeakKva || 0).toLocaleString()} kVA • Dual A/B Busways`
  );
  const elecPng = renderTechnicalDiagramPng('elec_room', project, eng);
  if (elecPng) s8.addImage({ data: elecPng, x: L, y: TOP, w: 7.75, h: H });
  addEditorialNote(
    s8,
    L + 7.95,
    TOP,
    4.51,
    H,
    'ELECTRICAL ROOMS & CONTINUITY',
    [
      eng.civil.isBnM
        ? `Rooms — UPS: ${eng.bnmAux.upsRoomSqm} m² (${project.bnmUpsRoom.placement.replace(/_/g, ' ')}, 24°C); Battery: ${eng.bnmAux.batteryRoomSqm} m² (22–25°C + H2 exhaust); Switchgear: ${eng.bnmAux.switchgearRoomSqm} m² (Form-4B).`
        : `Containerized power blocks with ${eng.transformerUnits}×${eng.selTrafo.ratedCapacity}kVA K-13 trafos, ${eng.upsContainersCount}×${eng.selUps.ratedCapacity}kVA UPS, ${eng.batteryContainersCount}×1.2MWh ${project.batteryChemistry} & ${eng.gridShield.loadDropShieldMw} MW load-drop shield.`,
      `Dual A/B ${standards.buswayAmperageA}A busways feed dual-corded rack rPDUs.`
    ],
    false
  );

  // Slide 9: Civil Foundation, Plinth & Upper-Floor Access (C-101)
  const s9 = pptx.addSlide();
  nextSlideNum();
  initSlide(
    s9,
    'Technical Section | Civil Foundation, Plinth & Upper-Floor Access',
    `Sheet C-101 • ${eng.civil.foundationType.split('(')[0].trim()} • Bearing FoS ${eng.civil.bearingSafetyFactor}×`
  );
  const civilPng = renderTechnicalDiagramPng('civil', project, eng);
  if (civilPng) s9.addImage({ data: civilPng, x: L, y: TOP, w: 7.75, h: H });
  addEditorialNote(
    s9,
    L + 7.95,
    TOP,
    4.51,
    H,
    'STRUCTURAL & LIFT READINESS',
    [
      `Imposed bearing ${eng.civil.imposedBearingKpa} kN/m² vs. site SBC ${eng.civil.sbc} kN/m² (${eng.civil.bearingSafetyFactor}× FoS); flood plinth +${eng.civil.floodPlinthMm}mm above grade.`,
      eng.bnmAux.isUpperFloor
        ? `Upper Floor #${eng.bnmAux.floorLevel}: requires ≥${eng.bnmAux.freightLiftRequiredKg.toLocaleString()} kg freight lift (clear door ≥${eng.bnmAux.freightLiftMinDoorHeightM}m) and ${eng.bnmAux.stagingDressingSqm} m² rack undressing/dressing bay.`
        : `M30 seismic anchor bolts (${project.seismicZone}) and 1:50 perimeter storm drainage apron.`
    ],
    false
  );

  // Slide 10: Hydraulics P&ID & Full 8-Sheet CAD Blueprint Reference (M-301)
  const s10 = pptx.addSlide();
  nextSlideNum();
  initSlide(
    s10,
    'Technical Section | Hydraulics P&ID & 8-Sheet CAD Pack',
    `Sheet M-301 • ${Math.round(eng.totalFlowLpm).toLocaleString()} LPM @ ${eng.pumpDesignHeadBar} bar TDH • ${eng.totalWaterStorageKl} kL Storage`
  );
  const hydPng = renderTechnicalDiagramPng('hydraulics', project, eng);
  if (hydPng) s10.addImage({ data: hydPng, x: L, y: TOP, w: 7.75, h: H });
  addEditorialNote(
    s10,
    L + 7.95,
    TOP,
    4.51,
    H,
    'HYDRAULICS & 8 CAD DRAWINGS',
    [
      `${eng.pumpSkidsCount} VFD pump skids (${project.pumpStagingMode}), ${eng.totalWaterStorageKl} kL water tanks (${project.waterAutonomyDays}d), RO/DM pre-treatment, factory PG25 loop & ZLD recovery.`,
      `8 Vector CAD Sheets in Stage 3: A-101 Yard GA, A-102 White-Space, C-101 Civil, E-201 SLD, E-202 Room GA, G-101 Earthing, R-101 Cable/Fiber, M-301 P&ID.`
    ],
    false
  );

  // =========================================================================
  // MASTER EQUIPMENT SCHEDULE (RATINGS, DIMENSIONS, WEIGHTS & ROOMS)
  // =========================================================================
  const eqPerPage = 4;
  const eqPages = Math.max(1, Math.ceil(eng.equipmentSchedule.length / eqPerPage));
  for (let p = 0; p < eqPages; p++) {
    const sEq = pptx.addSlide();
    nextSlideNum();
    initSlide(
      sEq,
      `Master Equipment Schedule (${p + 1} of ${eqPages})`,
      'Equipment Ratings, Redundancy, Physical Dimensions (L×W×H), Footprint, Weight & Room Location'
    );
    const slice = eng.equipmentSchedule.slice(p * eqPerPage, (p + 1) * eqPerPage);
    const eqRows: PptxTableRow[] = [
      [
        tc('Tag', { bold: true, color: C.WHITE, fill: { color: C.ORANGE } }),
        tc('Equipment & OEM Make/Model', { bold: true, color: C.WHITE, fill: { color: C.ORANGE } }),
        tc('Location / Room', { bold: true, color: C.WHITE, fill: { color: C.ORANGE } }),
        tc('Rating & N+R', { bold: true, color: C.WHITE, fill: { color: C.ORANGE } }),
        tc('Dimensions (L×W×H)', { bold: true, color: C.WHITE, fill: { color: C.ORANGE } }),
        tc('Area / Wt', { bold: true, color: C.WHITE, fill: { color: C.ORANGE } })
      ],
      ...slice.map((eq, idx) => {
        const bg = idx % 2 === 1 ? C.ORANGE_TINT : C.WHITE;
        return [
          tc(eq.assetTag, { bold: true, color: C.ORANGE, fill: { color: bg } }),
          tc(`${eq.equipmentName.slice(0, 34)} (${eq.make})`, { fill: { color: bg } }),
          tc(eq.location.slice(0, 26), { fill: { color: bg } }),
          tc(eq.ratingAndRedundancy.slice(0, 24), { fill: { color: bg } }),
          tc(eq.dimensionsM.slice(0, 22), { fill: { color: bg } }),
          tc(`${eq.footprintSqm}m² / ${(eq.operatingWeightKg / 1000).toFixed(1)}T`, { fill: { color: bg } })
        ];
      })
    ];
    sEq.addTable(eqRows, {
      x: L,
      y: TOP,
      w: W,
      fontFace: PPTX_BODY_FONT,
      fontSize: 8.5,
      color: C.CHARCOAL,
      border: { type: 'solid', color: C.ORANGE_SOFT, pt: 0.5 },
      margin: M,
      colW: [1.05, 3.65, 2.45, 2.15, 1.85, 1.31],
      rowH: 0.36
    });
  }

  // =========================================================================
  // L1-L5 COMMISSIONING & GOVERNANCE ROADMAP
  // =========================================================================
  const sGov = pptx.addSlide();
  nextSlideNum();
  const totalWks =
    eng.ganttTasks[eng.ganttTasks.length - 1].startWk + eng.ganttTasks[eng.ganttTasks.length - 1].durWk - 1;
  initSlide(
    sGov,
    'L1–L5 Turnkey Commissioning & Governance Roadmap',
    `${totalWks}-Week Delivery Program • ${project.regulatoryCode.slice(0, 48)}`
  );
  const istRows: PptxTableRow[] = [
    [
      tc('Commissioning Gate', { bold: true, color: C.WHITE, fill: { color: C.ORANGE } }),
      tc('Scope & Acceptance Criteria', { bold: true, color: C.WHITE, fill: { color: C.ORANGE } }),
      tc('Sign-Off Gate', { bold: true, color: C.WHITE, fill: { color: C.ORANGE } })
    ],
    ...eng.commissioningSchedule.slice(0, 5).map((c, idx) => {
      const bg = idx % 2 === 1 ? C.ORANGE_TINT : C.WHITE;
      return [
        tc(c.level, { bold: true, color: C.ORANGE, fill: { color: bg } }),
        tc(c.scope, { fill: { color: bg } }),
        tc(c.gate, { bold: true, fill: { color: bg } })
      ];
    })
  ];
  sGov.addTable(istRows, {
    x: L,
    y: TOP,
    w: W,
    fontFace: PPTX_BODY_FONT,
    fontSize: 8.5,
    color: C.CHARCOAL,
    border: { type: 'solid', color: C.ORANGE_SOFT, pt: 0.5 },
    margin: M,
    colW: [3.2, 7.06, 2.2],
    rowH: 0.32
  });

  // =========================================================================
  // COMMERCIAL SUMMARY, 5-YEAR TCO & BOQ (CLOSING COMMERCIAL SECTION)
  // =========================================================================
  const sComSummary = pptx.addSlide();
  nextSlideNum();
  initSlide(
    sComSummary,
    'Commercial Summary & 5-Year Lifecycle TCO',
    `Pre-Tax ${preTaxStr} • Incl. ${project.gstPct}% GST ${gstTotalStr} • 5-Yr TCO ${tco5Str}`
  );
  const defaultCommercialStory =
    narrativeOverride?.commercialStory ||
    `Turnkey non-IT pre-tax CapEx is ${preTaxStr} (${gstTotalStr} incl. ${project.gstPct}% GST) at ${project.marginPct}% margin and ${project.contingencyPct}% contingency, with ${eng.mii.miiClassLabel}. Over 5 years, total lifecycle TCO reaches ${tco5Str} (${formatMoney(eng.annualTotalOpexInr, project.currency, standards)}/yr average OpEx across power, water, and ${project.amcYears}-yr AMC).`;

  addEditorialNote(
    sComSummary,
    L,
    TOP,
    6.2,
    H,
    'CAPEX, OPEX & 5-YEAR TCO NARRATIVE',
    [defaultCommercialStory],
    true
  );
  const tcoRows: PptxTableRow[] = [
    [
      tc('Commercial Component', { bold: true, color: C.WHITE, fill: { color: C.ORANGE } }),
      tc('Amount', { bold: true, color: C.WHITE, fill: { color: C.ORANGE } })
    ],
    [tc('Non-IT CapEx (Pre-Tax)', { bold: true }), tc(preTaxStr)],
    [tc(`GST (${project.gstPct}%) & Grand Total`, { bold: true }), tc(`${formatMoney(eng.totals.gst, project.currency, standards)} / ${gstTotalStr}`)],
    [tc('Annual Power & Water OpEx', { bold: true }), tc(`${formatMoney(eng.annualPowerCostInr + eng.annualWaterCostInr, project.currency, standards)}/yr`)],
    [tc('Annual AMC / O&M OpEx', { bold: true }), tc(`${formatMoney(eng.annualAmcCostInr, project.currency, standards)}/yr`)],
    [tc('5-Year Lifecycle TCO', { bold: true, color: C.ORANGE }), tc(tco5Str, { bold: true })]
  ];
  sComSummary.addTable(tcoRows, {
    x: L + 6.42,
    y: TOP,
    w: 6.04,
    fontFace: PPTX_BODY_FONT,
    fontSize: 8.5,
    color: C.CHARCOAL,
    border: { type: 'solid', color: C.ORANGE_SOFT, pt: 0.5 },
    margin: M,
    colW: [3.2, 2.84],
    rowH: 0.34
  });

  const rowsPerPage = 4;
  const totalBoqPages = Math.max(1, Math.ceil(eng.bomItems.length / rowsPerPage));
  for (let page = 0; page < totalBoqPages; page++) {
    const sBoq = pptx.addSlide();
    nextSlideNum();
    initSlide(
      sBoq,
      `Bill of Quantities (BOQ) — Page ${page + 1} of ${totalBoqPages}`,
      `${project.name} • Validity ${project.costValidityDays} Days • All Figures in ${project.currency}`
    );
    const slice = eng.bomItems.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
    const boqTable: PptxTableRow[] = [
      [
        tc('Category', { bold: true, color: C.WHITE, fill: { color: C.ORANGE } }),
        tc('Subsystem / Scope Description', { bold: true, color: C.WHITE, fill: { color: C.ORANGE } }),
        tc('OEM Make & Model', { bold: true, color: C.WHITE, fill: { color: C.ORANGE } }),
        tc('Qty', { bold: true, color: C.WHITE, fill: { color: C.ORANGE } }),
        tc(`Pre-Tax (${project.currency})`, { bold: true, color: C.WHITE, fill: { color: C.ORANGE } })
      ],
      ...slice.map((it, idx) => {
        const bg = idx % 2 === 1 ? C.ORANGE_TINT : C.WHITE;
        return [
          tc(it.category.slice(0, 26), { fill: { color: bg } }),
          tc(it.label.slice(0, 44) + (it.isOverridden ? ' [Quote]' : it.isPlaceholder ? ' [PH]' : ''), { fill: { color: bg } }),
          tc(`${it.make} (${it.model})`.slice(0, 26), { fill: { color: bg } }),
          tc(String(it.qty), { fill: { color: bg } }),
          tc(formatMoney(it.sellingPreTax, project.currency, standards), { bold: true, fill: { color: bg } })
        ];
      })
    ];
    if (page === totalBoqPages - 1) {
      boqTable.push([
        tc('TOTAL', { bold: true, color: C.WHITE, fill: { color: C.ORANGE } }),
        tc(
          `Pre-Tax: ${preTaxStr} | Incl. ${project.gstPct}% GST: ${gstTotalStr}`,
          { bold: true, color: C.BLACK, fill: { color: C.ORANGE_SOFT } }
        ),
        tc(`5-Yr TCO: ${tco5Str}`, {
          bold: true,
          color: C.BLACK,
          fill: { color: C.ORANGE_SOFT }
        }),
        tc(String(eng.bomItems.length), { bold: true, fill: { color: C.ORANGE_SOFT } }),
        tc(preTaxStr, {
          bold: true,
          color: C.ORANGE_DARK,
          fill: { color: C.ORANGE_SOFT }
        })
      ]);
    }
    sBoq.addTable(boqTable, {
      x: L,
      y: TOP,
      w: W,
      fontFace: PPTX_BODY_FONT,
      fontSize: 8.5,
      color: C.CHARCOAL,
      border: { type: 'solid', color: C.ORANGE_SOFT, pt: 0.5 },
      margin: M,
      colW: [2.4, 4.65, 2.75, 0.76, 1.9],
      rowH: 0.34
    });
  }

  // =========================================================================
  // FINAL SLIDE: Q&A & DISCUSSION
  // =========================================================================
  const sQa = pptx.addSlide();
  nextSlideNum();
  initSlide(
    sQa,
    'Q&A & Technical / Commercial Discussion',
    `${project.name} • ${project.client || 'Enterprise Authority'} • ${project.cityQuery}`
  );
  addEditorialNote(
    sQa,
    L,
    TOP,
    W,
    H,
    'OPEN TECHNICAL & COMMERCIAL DISCUSSION',
    [
      `Ready to walk through detailed thermal heat-rejection curves, ${project.uptimeTier} redundancy pathways, ${eng.civil.isBnM ? 'BnM hall/auxiliary room partitions & freight lift specs' : 'containerized pod sizing & yard layout'}, and commercial phasing.`,
      `Prepared by ${project.name} Engineering Desk • ${new Date().toISOString().slice(0, 10)}`
    ],
    true
  );

  pptx.writeFile({
    fileName: `${(project.name || 'MDC_Proposal').replace(/[^a-zA-Z0-9_-]+/g, '_')}_Consulting_Proposal.pptx`
  });
}
