import PptxGenJS from 'pptxgenjs';
import type { EngineeringResult, MasterStandards, ProjectDeal } from '../types/mdc';
import { formatMoney, totalHsdK } from './engineeringEngine';

export const PPTX_PALETTE = {
  WHITE: 'FFFFFF',
  ORANGE: 'FF5539',
  ORANGE_DARK: 'D93F24',
  ORANGE_TINT: 'FFF3F0',
  ORANGE_SOFT: 'FFD6CC',
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
export const PPTX_HEADER2_BOTTOM_IN = 1.34; // y=0.91" + h=0.43" matching Sample slide.pptx
export const PPTX_TOP_CONTENT_GAP_IN = 1.0; // Exact 1.0" gap below Header 2
export const PPTX_CONTENT_TOP_IN = PPTX_HEADER2_BOTTOM_IN + PPTX_TOP_CONTENT_GAP_IN; // 2.34"
export const PPTX_FOOTER_CLEARANCE_IN = 3.1; // Exact 3.1" gap from bottom footer
export const PPTX_MAX_CONTENT_BOTTOM_IN = PPTX_SLIDE_HEIGHT_IN - PPTX_FOOTER_CLEARANCE_IN; // 4.40"
export const PPTX_CONTENT_HEIGHT_IN = PPTX_MAX_CONTENT_BOTTOM_IN - PPTX_CONTENT_TOP_IN; // 2.06"

type PptxSlide = ReturnType<PptxGenJS['addSlide']>;
type PptxTableRow = Parameters<PptxSlide['addTable']>[0][number];
type PptxTableCell = Exclude<PptxTableRow[number], string>;

const tc = (text: string, options?: PptxTableCell['options']): PptxTableCell =>
  options ? { text, options } : { text };

/**
 * Brand-Orange ASHRAE 12-Month Thermal & Water Chart (Canvas -> PNG)
 */
export function renderStrictAshraeChartPng(eng: EngineeringResult): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 1240;
  canvas.height = 250;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const padL = 62;
  const padR = 32;
  const padT = 30;
  const padB = 34;
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
    ctx.font = '11px Roboto, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${50 - i * 10}°C`, padL - 8, y + 4);
  }

  const prof = eng.monthlyProfile || [];
  const maxWater = Math.max(...prof.map(m => m.monthlyWaterKl), 100);
  const stepX = plotW / 12;

  prof.forEach((m, idx) => {
    const x = padL + idx * stepX + stepX * 0.22;
    const bw = stepX * 0.56;
    const bh = (m.monthlyWaterKl / maxWater) * plotH * 0.78;
    ctx.fillStyle = m.mode === 'TrimChiller' ? '#FFD6CC' : '#FFF3F0';
    ctx.fillRect(x, padT + plotH - bh, bw, bh);
    ctx.strokeStyle = '#FF5539';
    ctx.strokeRect(x, padT + plotH - bh, bw, bh);

    ctx.fillStyle = '#222222';
    ctx.font = 'bold 10.5px Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${m.monthlyWaterKl}kL`, x + bw / 2, padT + plotH - bh - 4);
    ctx.fillText(m.month, x + bw / 2, padT + plotH + 17);
  });

  const limitTemp = Math.max(10, Math.min(50, eng.effectiveSupplyTempC - 3));
  const limitY = padT + plotH - (limitTemp / 50) * plotH;
  ctx.strokeStyle = '#000000';
  ctx.setLineDash([6, 4]);
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(padL, limitY);
  ctx.lineTo(padL + plotW, limitY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'left';
  ctx.font = 'bold 11px Roboto, sans-serif';
  ctx.fillText(`Facility Loop Limit (${limitTemp.toFixed(1)}°C)`, padL + 8, limitY - 5);

  ctx.strokeStyle = '#FF5539';
  ctx.lineWidth = 3;
  ctx.beginPath();
  prof.forEach((m, idx) => {
    const x = padL + idx * stepX + stepX / 2;
    const y = padT + plotH - (Math.min(50, m.dryBulbC) / 50) * plotH;
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  ctx.strokeStyle = '#333333';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  prof.forEach((m, idx) => {
    const x = padL + idx * stepX + stepX / 2;
    const y = padT + plotH - (Math.min(50, m.wetBulbC) / 50) * plotH;
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  ctx.font = 'bold 11.5px Roboto, sans-serif';
  ctx.fillStyle = '#FF5539';
  ctx.fillText('— Peak Dry-Bulb (°C)', padL, 18);
  ctx.fillStyle = '#222222';
  ctx.fillText('— Coincident Wet-Bulb (°C)  |  Bars: Monthly Evap Water (kL)', padL + 160, 18);

  return canvas.toDataURL('image/png');
}

/**
 * Brand-Orange Schematic Canvas Renderer for White-Space (A-102), Yard (A-101),
 * Electrical Room (E-202), Civil Section (C-101), and Hydraulics P&ID (M-301)
 */
function renderBrandOrangeDiagramPng(
  kind: 'whitespace' | 'yard' | 'elec_room' | 'civil' | 'hydraulics',
  project: ProjectDeal,
  eng: EngineeringResult
): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 760;
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
  ctx.lineWidth = 2;
  ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);

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
    ctx.lineWidth = 1.4;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = filled ? '#FFFFFF' : DARK;
    ctx.font = 'bold 11.5px Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, x + w / 2, y + h / 2 - (sub ? 5 : -4));
    if (sub) {
      ctx.fillStyle = filled ? '#FFF3F0' : '#444444';
      ctx.font = '10px Roboto, sans-serif';
      ctx.fillText(sub, x + w / 2, y + h / 2 + 11);
    }
  };

  if (kind === 'whitespace') {
    const pod0 = eng.pods?.[0];
    const dims = eng.civil.isBnM
      ? `BnM Hall ${project.bnmHallLengthM}m × ${project.bnmHallWidthM}m (Floor #${project.bnmFloorLevel})`
      : `${((pod0?.extLengthMm || 13500) / 1000).toFixed(2)}m L × ${((pod0?.extWidthMm || 4200) / 1000).toFixed(2)}m W Pod`;
    ctx.fillStyle = ORANGE;
    ctx.font = 'bold 12px Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SHEET A-102: WHITE-SPACE & CONTAINMENT LAYOUT — ${dims}`, 16, 24);

    drawBox(16, 36, 95, 188, 'AIRLOCK &', 'INT. LV PANEL', false);
    drawBox(122, 36, 460, 48, `ROW A COMPUTE RACKS (${pod0?.rowA?.length || 0} Racks)`, `${eng.dlcRacks.length} DLC / ${eng.acRacks.length} AC Total`, true);
    drawBox(122, 92, 460, 74, `${project.containmentType} (${project.frontServiceClearanceMm}mm Aisle)`, `${project.airflowDelivery} • ${eng.raisedFloor.enabled ? `${eng.raisedFloor.heightMm}mm Raised Floor` : 'Slab'}`, false);
    drawBox(122, 174, 460, 50, `ROW B COMPUTE RACKS (${pod0?.rowB?.length || 0} Racks)`, `Dual A/B ${eng.whiteSpace.pduFootprintSqm} m² PDU Envelope`, true);
    drawBox(594, 36, 150, 90, `INTERNAL PACs`, `${eng.whiteSpace.mandatoryPacCount} × 80 kW CW`, false);
    drawBox(594, 134, 150, 90, `INTERNAL CDUs`, `${eng.whiteSpace.internalCduCount} Towers (<= ${eng.effectiveSupplyTempC}°C)`, true);
  } else if (kind === 'yard') {
    ctx.fillStyle = ORANGE;
    ctx.font = 'bold 12px Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SHEET A-101: 3-ZONE CAMPUS & YARD GENERAL ARRANGEMENT (${project.setbackMeters}m NBC FIRE LANE)`, 16, 24);
    ctx.strokeStyle = '#666666';
    ctx.setLineDash([5, 4]);
    ctx.strokeRect(14, 32, 732, 194);
    ctx.setLineDash([]);

    drawBox(24, 42, 235, 174, `ZONE A: IT WHITE-SPACE`, `${eng.pods.length} Units • ${eng.totalItWhiteSpaceSqm} m² • Zero Yard CDUs`, true);
    drawBox(272, 42, 165, 174, `ZONE B: UPS & BESS`, `${eng.upsContainersCount}× UPS + ${eng.batteryContainersCount}× BESS (${eng.yardBreakdown.upsBessSqm} m²)`, false);
    drawBox(450, 42, 286, 40, `HT VCB & K-13 TRAFOS`, `${eng.transformerUnits}×${eng.selTrafo.ratedCapacity}kVA (${eng.yardBreakdown.substationSqm} m²)`, false);
    drawBox(450, 88, 286, 40, `CPCB IV+ DGs & PESO FUEL`, `${eng.dgUnitsCount}×${eng.selDg.ratedCapacity}kVA (${totalHsdK(eng.totalHsdFuelLitres)} kL)`, true);
    drawBox(450, 134, 286, 40, `ADIABATIC COOLERS & TANKS`, `${eng.adiabaticUnits}×${eng.selCooler.ratedCapacity}kW + ${eng.totalWaterStorageKl} kL`, false);
    drawBox(450, 180, 286, 36, `VFD PUMPS, CHILLERS & ZLD`, `${eng.pumpSkidsCount} Pumps @ ${eng.pumpDesignHeadBar} bar TDH`, false);
  } else if (kind === 'elec_room') {
    ctx.fillStyle = ORANGE;
    ctx.font = 'bold 12px Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SHEET E-202: UPS, BATTERY & SWITCHGEAR ROOM / POD LAYOUT (${project.uptimeTier})`, 16, 24);

    drawBox(16, 38, 230, 186, `SWITCHGEAR & TRAFO BAY`, `${eng.transformerUnits}×${eng.selTrafo.ratedCapacity}kVA • Form-4B LV PCC • APFC/SPD • MCC`, false);
    drawBox(262, 38, 236, 186, `MODULAR UPS ROOM / POD`, `${eng.upsContainersCount}×${eng.selUps.ratedCapacity}kVA (${eng.upsCalc.activeN}+${eng.upsCalc.redundantR}) • 24°C PAC • 1.5m Aisle`, true);
    drawBox(514, 38, 230, 186, `${project.batteryChemistry} BATTERY ROOM / BESS`, `${eng.batteryContainersCount}×1.2MWh (${project.batteryRuntimeMin}m) • 22-25°C + H2 Exhaust`, false);
  } else if (kind === 'civil') {
    ctx.fillStyle = ORANGE;
    ctx.font = 'bold 12px Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SHEET C-101: CIVIL PLINTH & FOUNDATION SECTION — ${project.cityQuery} (${project.seismicZone})`, 16, 24);

    drawBox(110, 38, 540, 62, eng.civil.isBnM ? `BnM STRUCTURAL HALL (FLOOR #${eng.bnmAux.floorLevel})` : `MODULAR POD (${eng.civil.unitGrossTonnes}T LOADED MASS)`, `Floor Load ${eng.civil.floorPressureKpa} kN/m² • Corner Node ${eng.civil.cornerNodeKn} kN • M30 Seismic Bolts`, true);
    drawBox(80, 106, 600, 44, `M35 RCC RAISED PLINTH (+${eng.civil.floodPlinthMm}mm FLOOD LIFT)`, `1:50 Storm Drain Apron • 100-Yr Flood Mark ${project.historicalFloodLevelMm}mm`, false);
    ctx.fillStyle = SOFT;
    ctx.fillRect(80, 156, 600, 68);
    ctx.strokeStyle = BORDER;
    ctx.strokeRect(80, 156, 600, 68);
    ctx.fillStyle = DARK;
    ctx.font = 'bold 11.5px Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      eng.civil.isWeakSoil
        ? `BORED FRICTION PILES (${eng.civil.embedmentDepthM}m PILE CAP DEPTH • SBC ${eng.civil.sbc} kN/m²)`
        : `ISOLATED M35 PAD FOOTING (${eng.civil.embedmentDepthM}m IS 1904 DEPTH • SBC ${eng.civil.sbc} kN/m²)`,
      380,
      184
    );
    ctx.font = '10.5px Roboto, sans-serif';
    ctx.fillText(`Imposed Bearing: ${eng.civil.imposedBearingKpa} kN/m²  |  Bearing Safety Factor: ${eng.civil.bearingSafetyFactor}×`, 380, 206);
  } else {
    ctx.fillStyle = ORANGE;
    ctx.font = 'bold 12px Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SHEET M-301: PRIMARY / SECONDARY HYDRAULICS & COOLING LOOP P&ID`, 16, 24);

    const blocks = [
      ['1. YARD COOLERS', `${eng.adiabaticUnits}×${eng.selCooler.ratedCapacity}kW`, `${eng.freeCoolMonths}m Free / ${eng.adiabaticMonths}m Spray`],
      ['2. PUMPS & TANKS', `${eng.pumpSkidsCount} VFD Skids`, `${eng.totalWaterStorageKl} kL • ${eng.pumpDesignHeadBar} bar`],
      ['3. INTERNAL CDUs', `${eng.whiteSpace.internalCduCount} White-Space`, `Supply <= ${eng.effectiveSupplyTempC}°C PG25`],
      ['4. PACs & CHILLERS', `${eng.whiteSpace.mandatoryPacCount}×80kW PACs`, `${eng.whiteSpace.chillerUnitsCount}×1MW Chillers`]
    ];
    blocks.forEach(([t, s1, s2], i) => {
      const bx = 18 + i * 184;
      drawBox(bx, 54, 168, 148, t, `${s1} | ${s2}`, i % 2 === 0);
      if (i < 3) {
        ctx.strokeStyle = ORANGE;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(bx + 168, 128);
        ctx.lineTo(bx + 184, 128);
        ctx.stroke();
      }
    });
  }

  return canvas.toDataURL('image/png');
}

export function exportStrictNativePptxDeck(
  project: ProjectDeal,
  eng: EngineeringResult,
  standards: MasterStandards
): void {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE'; // 13.333" x 7.5"
  pptx.author = 'AI Modular Data Center Configurator V13.3';
  pptx.title = project.name || 'AI Modular Data Center Engineering Proposal';

  const C = PPTX_PALETTE;
  const TOP = PPTX_CONTENT_TOP_IN; // 2.34" (exact 1.0" below Header 2)
  const H = PPTX_CONTENT_HEIGHT_IN; // 2.06" (exact 3.1" clearance above footer)
  const L = 0.45;
  const W = 12.46;

  // Strict Sample Slide Header Layout:
  // Header 1: Tosh A Black 24pt Bold at (0.45", 0.52", 12.46" x 0.40")
  // Header 2: Tosh A Black 22pt Regular Brand Orange at (0.45", 0.91", 12.46" x 0.43", bottom = 1.34")
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
      margin: 0,
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
      margin: 0,
      valign: 'middle'
    });
  };

  // Single-layer native shape card helper (ZERO nested shapes/text boxes!)
  const addNativeCard = (
    slide: PptxSlide,
    x: number,
    y: number,
    w: number,
    h: number,
    title: string,
    bodyLines: string[],
    filled = false
  ) => {
    const runs = [
      {
        text: title + '\n',
        options: {
          fontFace: PPTX_BODY_FONT,
          fontSize: 10.5,
          bold: true,
          color: filled ? C.WHITE : C.ORANGE
        }
      },
      ...bodyLines.map((ln, idx) => ({
        text: ln + (idx < bodyLines.length - 1 ? '\n' : ''),
        options: {
          fontFace: PPTX_BODY_FONT,
          fontSize: 9,
          bold: false,
          color: filled ? C.WHITE : C.CHARCOAL
        }
      }))
    ];
    slide.addText(runs, {
      shape: 'roundRect' as Parameters<PptxSlide['addShape']>[0],
      x,
      y,
      w,
      h,
      rectRadius: 0.08,
      fill: { color: filled ? C.ORANGE : C.ORANGE_TINT },
      line: { color: C.ORANGE, width: 1 },
      margin: 0.1,
      valign: 'middle'
    });
  };

  // =========================================================================
  // SLIDE 1: COVER SLIDE
  // =========================================================================
  const s1 = pptx.addSlide();
  initSlide(
    s1,
    project.name || 'Turnkey AI Modular Data Center Proposal',
    `${project.shellArchitecture === 'BnM_Hall' ? 'Brick-and-Mortar (BnM) AI Hall' : 'Modular ISO AI Data Center'}  •  ${project.client || 'Enterprise Authority'}`
  );
  addNativeCard(
    s1,
    L,
    TOP,
    3.0,
    H,
    'IT & THERMAL CAPACITY',
    [
      `${(eng.totalDesignContKw / 1000).toFixed(2)} MW Continuous TDP`,
      `${(eng.dlcDesignKw / 1000).toFixed(2)} MW DLC + ${(eng.acDesignKw / 1000).toFixed(2)} MW AC`,
      `${eng.activeRacks.length} Racks (${eng.dlcRacks.length} DLC / ${eng.acRacks.length} AC)`,
      `Max Coolant Supply <= ${eng.effectiveSupplyTempC}°C`
    ],
    true
  );
  addNativeCard(
    s1,
    L + 3.15,
    TOP,
    3.0,
    H,
    'EFFICIENCY & LOCATION',
    [
      `Site: ${project.cityQuery}`,
      `Climate: ${project.peakDryBulb}°C DB / ${project.peakWetBulb}°C WB`,
      `Annualized PUE: ${eng.pueAnnualized} (Peak ${eng.puePeakDesign})`,
      `Seismic: ${project.seismicZone} (${project.seismicZFactor}g)`
    ],
    false
  );
  addNativeCard(
    s1,
    L + 6.3,
    TOP,
    3.0,
    H,
    'ENCLOSURE & FOOTPRINT',
    [
      eng.civil.isBnM
        ? `BnM Hall ${project.bnmHallLengthM}m × ${project.bnmHallWidthM}m (Fl #${project.bnmFloorLevel})`
        : `${eng.pods.length} ISO Corten Pods (${eng.containerTotalVolumeCum} m³)`,
      `White-Space: ${eng.totalItWhiteSpaceSqm} m²`,
      `Non-IT Yard: ${eng.totalNonItYardSqm} m²`,
      `Campus Total: ${eng.totalCampusOccupiedSqm} m² (${eng.plotUtilizationPct}% Plot)`
    ],
    false
  );
  addNativeCard(
    s1,
    L + 9.45,
    TOP,
    3.01,
    H,
    'RESILIENCE & COMPLIANCE',
    [
      `Redundancy: ${project.uptimeTier}`,
      `MII: ${eng.mii.miiClassLabel}`,
      `Pre-Tax: ${formatMoney(eng.totals.sellingPreTax, project.currency, standards)}`,
      `Prepared: ${new Date().toISOString().slice(0, 10)}`
    ],
    false
  );

  // =========================================================================
  // SLIDE 2: COOLING STRATEGY & THERMAL LOAD HANDLING
  // =========================================================================
  const s2 = pptx.addSlide();
  initSlide(
    s2,
    '01 | Cooling Strategy & Thermal Load Handling',
    `${eng.coolingMode} • Governing Supply <= ${eng.effectiveSupplyTempC}°C`
  );
  const flowW = 2.98;
  const flowGap = 0.18;
  addNativeCard(
    s2,
    L,
    TOP,
    flowW,
    H,
    '1. RACK THERMAL CAPTURE',
    [
      `DLC Heat: ${Math.round(eng.totalLiquidKw).toLocaleString()} kW Liquid`,
      `Air Residual: ${Math.round(eng.totalAirKw).toLocaleString()} kW`,
      `Governing Limit: ${eng.governingMaxInletTempC}°C`,
      `Secondary Flow: ${Math.round(eng.totalFlowLpm).toLocaleString()} LPM`
    ],
    true
  );
  addNativeCard(
    s2,
    L + (flowW + flowGap),
    TOP,
    flowW,
    H,
    '2. INTERNAL WHITE-SPACE MEP',
    [
      `${eng.whiteSpace.internalCduCount} Internal Floor CDUs (Zero Yard CDUs)`,
      `${eng.whiteSpace.mandatoryPacCount} × 80 kW Mandatory PACs`,
      `Factory-Isolated PG25 Loop`,
      `${project.containmentType} (${eng.raisedFloor.heightMm}mm Floor)`
    ],
    false
  );
  addNativeCard(
    s2,
    L + (flowW + flowGap) * 2,
    TOP,
    flowW,
    H,
    '3. HYDRAULICS & BUFFERS',
    [
      `${eng.pumpSkidsCount} VFD Pump Skids (${project.pumpStagingMode})`,
      `Design Head: ${eng.pumpDesignHeadBar} bar TDH`,
      `${eng.totalWaterStorageKl} kL SS316L Tanks (${project.waterAutonomyDays}d)`,
      `Pre-Loop RO/DM + ZLD Recovery`
    ],
    false
  );
  addNativeCard(
    s2,
    L + (flowW + flowGap) * 3,
    TOP,
    flowW,
    H,
    '4. HEAT REJECTION MODES',
    [
      `${eng.adiabaticUnits}×${eng.selCooler.ratedCapacity}kW Fluid Coolers`,
      `${eng.freeCoolMonths}m Free / ${eng.adiabaticMonths}m Spray / ${eng.trimChillerMonths}m Trim`,
      `${eng.whiteSpace.chillerUnitsCount}×1MW Chillers (${project.chillerPlacement === 'ContainerRoof' ? 'Roof' : 'Yard'})`,
      `Annual Water: ${eng.annualWaterKl.toLocaleString()} kL`
    ],
    false
  );

  // =========================================================================
  // SLIDE 3: 12-MONTH ASHRAE MICROCLIMATE & WATER PROFILE
  // =========================================================================
  const s3 = pptx.addSlide();
  initSlide(
    s3,
    '02 | Site Microclimate & 12-Month ASHRAE Thermal Profile',
    `${project.cityQuery} (${project.peakDryBulb}°C DB / ${project.peakWetBulb}°C WB) • Annual PUE ${eng.pueAnnualized}`
  );
  const ashraePng = renderStrictAshraeChartPng(eng);
  if (ashraePng) {
    s3.addImage({ data: ashraePng, x: L, y: TOP, w: W, h: H });
  }

  // =========================================================================
  // SLIDE 4: CONTAINER / BnM HALL DESIGN, RAISED FLOORING & WHITE-SPACE LAYOUT
  // =========================================================================
  const s4 = pptx.addSlide();
  initSlide(
    s4,
    eng.civil.isBnM
      ? '03 | Brick-and-Mortar Hall, Raised Floor & White-Space Layout'
      : '03 | Container Architecture, Raised Floor & White-Space Layout',
    `${eng.totalItWhiteSpaceSqm} m² White-Space • ${eng.pods.length} ${eng.civil.isBnM ? 'BnM Bays' : 'Pods'} • ${eng.raisedFloor.enabled ? `${eng.raisedFloor.heightMm}mm Raised Floor` : 'Slab-Mounted'}`
  );
  const wsPng = renderBrandOrangeDiagramPng('whitespace', project, eng);
  if (wsPng) {
    s4.addImage({ data: wsPng, x: L, y: TOP, w: 7.75, h: H });
  }
  addNativeCard(
    s4,
    L + 7.95,
    TOP,
    4.51,
    H,
    'ENCLOSURE & RAISED ACCESS FLOOR',
    [
      eng.civil.isBnM
        ? `Hall: ${project.bnmHallLengthM}m × ${project.bnmHallWidthM}m × ${project.bnmClearSoffitM}m H (Fit: ${eng.bnmAux.hallFitStatus})`
        : `Shell: ${project.metallurgy} (${eng.containerTotalVolumeCum} m³ total)`,
      eng.raisedFloor.enabled
        ? `Floor: ${eng.raisedFloor.totalTiles.toLocaleString()} Tiles (${eng.raisedFloor.tilePointLoadKn} kN), ${eng.raisedFloor.pedestalStemCount.toLocaleString()} Stems (${eng.raisedFloor.pedestalAxialRatingKn} kN)`
        : 'Direct Slab-Mounted Racks',
      `Heavy Rack Sub-Frames: ${eng.raisedFloor.heavyRackSubFramesCount} Direct-to-Slab`,
      `Clearances: ${project.frontServiceClearanceMm}mm F / ${project.rearServiceClearanceMm}mm R • ${project.futureGrowthReservePct}% Growth`
    ],
    false
  );

  // =========================================================================
  // SLIDE 5: 3-ZONE CAMPUS & YARD GENERAL ARRANGEMENT (SHEET A-101)
  // =========================================================================
  const s5 = pptx.addSlide();
  initSlide(
    s5,
    '04 | 3-Zone Campus & Technical Yard Layout (Sheet A-101)',
    `${eng.totalCampusOccupiedSqm} m² Occupied (${eng.plotUtilizationPct}% Net Plot) • ${project.setbackMeters}m NBC Fire Lane`
  );
  const yardPng = renderBrandOrangeDiagramPng('yard', project, eng);
  if (yardPng) {
    s5.addImage({ data: yardPng, x: L, y: TOP, w: 7.75, h: H });
  }
  addNativeCard(
    s5,
    L + 7.95,
    TOP,
    4.51,
    H,
    'SPATIAL ISOLATION & LOGISTICS',
    [
      `Zone A (IT White-Space): ${eng.totalItWhiteSpaceSqm} m²`,
      `Zone B (UPS / BESS): ${eng.yardBreakdown.upsBessSqm} m²`,
      `Zone C (Substation/DG/Cooling): ${Math.max(0, eng.totalNonItYardSqm - eng.yardBreakdown.upsBessSqm - eng.yardBreakdown.adminStagingSqm)} m²`,
      `Boundary Noise: ${eng.boundaryNoiseDba} dBA (CPCB <= 65 dBA)`,
      `Rigging: ${eng.logistics.craneTonnage}T Crane • Turning >= ${eng.logistics.minTurningRadiusM}m`
    ],
    false
  );

  // =========================================================================
  // SLIDE 6: POWER DISTRIBUTION & REDUNDANCY ARCHITECTURE
  // =========================================================================
  const s6 = pptx.addSlide();
  initSlide(
    s6,
    '05 | Power Distribution & Redundancy Architecture (Sheet E-201)',
    `${project.uptimeTier} Fault Tolerance • Peak Facility ${(eng.totalFacilityPeakKva || 0).toLocaleString()} kVA • Dual A/B Paths`
  );
  addNativeCard(
    s6,
    L,
    TOP,
    flowW,
    H,
    '1. UTILITY & TRANSFORMATION',
    [
      `33kV/66kV Dual HT VCB + SPD`,
      `${eng.transformerUnits}×${eng.selTrafo.ratedCapacity}kVA K-13 Dry Trafos`,
      `Redundancy: ${eng.trafoCalc.activeN}+${eng.trafoCalc.redundantR} (${project.uptimeTier})`,
      `200% Neutral • Solidly Grounded`
    ],
    true
  );
  addNativeCard(
    s6,
    L + (flowW + flowGap),
    TOP,
    flowW,
    H,
    '2. LV PCC, DG & LOAD SHIELD',
    [
      `${eng.lvSwitchgearUnits}× 3200A Form-4B LV PCC`,
      `${eng.dgUnitsCount}×${eng.selDg.ratedCapacity}kVA CPCB IV+ DGs (${eng.dgCalc.activeN}+${eng.dgCalc.redundantR})`,
      `PESO HSD Fuel: ${totalHsdK(eng.totalHsdFuelLitres)} kL (${project.dgAutonomyHours}h)`,
      `Load-Drop Shield: ${eng.gridShield.loadDropShieldMw} MW`
    ],
    false
  );
  addNativeCard(
    s6,
    L + (flowW + flowGap) * 2,
    TOP,
    flowW,
    H,
    '3. MODULAR UPS & BESS',
    [
      `${eng.upsContainersCount}×${eng.selUps.ratedCapacity}kVA UPS (${eng.upsCalc.activeN}+${eng.upsCalc.redundantR})`,
      `${eng.batteryContainersCount}×1.2MWh ${project.batteryChemistry} (${project.batteryRuntimeMin} min)`,
      `Mode: ${project.upsRideThroughMode}`,
      `Cooling Pumps: ${project.upsBacksUpCooling ? 'UPS-Backed' : 'DG-Backed'}`
    ],
    false
  );
  addNativeCard(
    s6,
    L + (flowW + flowGap) * 3,
    TOP,
    flowW,
    H,
    '4. BUSWAYS & RACK rPDUs',
    [
      `Dual A/B ${standards.buswayAmperageA}A IP55 Busducts`,
      `${eng.activeRacks.length} Dual-Corded Metered rPDUs`,
      `Detuned 500 kVAr APFC + MCC`,
      `Exothermic Copper Earth Grid (<0.5Ω)`
    ],
    false
  );

  // =========================================================================
  // SLIDE 7: UPS, BATTERY & SWITCHGEAR ROOM / POD LAYOUT (SHEET E-202)
  // =========================================================================
  const s7 = pptx.addSlide();
  initSlide(
    s7,
    '06 | UPS, Battery & Switchgear Room / Pod Layout (Sheet E-202)',
    eng.civil.isBnM
      ? `BnM Support Rooms: UPS ${eng.bnmAux.upsRoomSqm}m² • Battery ${eng.bnmAux.batteryRoomSqm}m² • Switchgear ${eng.bnmAux.switchgearRoomSqm}m²`
      : `Dedicated Containerized Power Blocks • Separated Electrical Fire Compartments`
  );
  const elecPng = renderBrandOrangeDiagramPng('elec_room', project, eng);
  if (elecPng) {
    s7.addImage({ data: elecPng, x: L, y: TOP, w: 7.75, h: H });
  }
  addNativeCard(
    s7,
    L + 7.95,
    TOP,
    4.51,
    H,
    'ROOM COOLING, EXHAUST & ACCESS',
    [
      `UPS Room: 24°C Precision PAC (${eng.bnmAux.upsRoomCoolingKw} kW heat rejection)`,
      `Battery Room: 22–25°C Cooling (${eng.bnmAux.batteryRoomCoolingKw} kW) + H2/Thermal Exhaust`,
      `Switchgear Bay: 28°C Forced Ventilation (${eng.bnmAux.switchgearCoolingKw} kW)`,
      `Clearances: >= 1.5m Front Drawout / >= 1.0m Rear Maintenance`,
      `2-Hr Fire-Rated Separation & Clean-Agent Suppression`
    ],
    false
  );

  // =========================================================================
  // SLIDE 8: CIVIL FOUNDATION, PLINTH & UPPER-FLOOR READINESS (SHEET C-101)
  // =========================================================================
  const s8 = pptx.addSlide();
  initSlide(
    s8,
    '07 | Civil Foundation, Plinth & Upper-Floor Readiness (Sheet C-101)',
    `${eng.civil.foundationType} • Bearing FoS ${eng.civil.bearingSafetyFactor}×`
  );
  const civilPng = renderBrandOrangeDiagramPng('civil', project, eng);
  if (civilPng) {
    s8.addImage({ data: civilPng, x: L, y: TOP, w: 7.75, h: H });
  }
  addNativeCard(
    s8,
    L + 7.95,
    TOP,
    4.51,
    H,
    eng.bnmAux.isUpperFloor ? 'UPPER-FLOOR LIFT & DRESSING BAY' : 'STRUCTURAL & SEISMIC BASIS',
    eng.bnmAux.isUpperFloor
      ? [
          `Hall Location: Upper Floor #${eng.bnmAux.floorLevel}`,
          `Freight Lift: >= ${eng.bnmAux.freightLiftRequiredKg.toLocaleString()} kg Rated`,
          `Min Clear Door Height: >= ${eng.bnmAux.freightLiftMinDoorHeightM} m`,
          `Rack Undressing/Dressing Bay: ${eng.bnmAux.stagingDressingSqm} m²`,
          `Slab Live Load: >= ${eng.civil.floorPressureKpa} kN/m² verified`
        ]
      : [
          `Site SBC: ${eng.civil.sbc} kN/m² vs Imposed ${eng.civil.imposedBearingKpa} kN/m²`,
          `Embedment: ${eng.civil.embedmentDepthM}m (${eng.civil.isWeakSoil ? '4.5m Pile Cap' : 'IS 1904 Pad'})`,
          `Flood Plinth Lift: +${eng.civil.floodPlinthMm}mm (100-Yr + 300mm)`,
          `Seismic Anchorage: M30 Shear Bolts (${project.seismicZone})`,
          `Total Civil Plinth & Apron Area: ${eng.plinthSqm} m²`
        ],
    false
  );

  // =========================================================================
  // SLIDE 9: HYDRAULICS P&ID (M-301) & COMPLETE 8-SHEET CAD PACK INDEX
  // =========================================================================
  const s9 = pptx.addSlide();
  initSlide(
    s9,
    '08 | Hydraulics P&ID (Sheet M-301) & 8-Sheet CAD Blueprint Pack',
    'Complete IFC-Ready Vector CAD Package Included in Digital Deliverables'
  );
  const hydPng = renderBrandOrangeDiagramPng('hydraulics', project, eng);
  if (hydPng) {
    s9.addImage({ data: hydPng, x: L, y: TOP, w: 7.75, h: H });
  }
  addNativeCard(
    s9,
    L + 7.95,
    TOP,
    4.51,
    H,
    '8 DELIVERABLE CAD SHEETS (SVG)',
    [
      'A-101: Site & 3-Zone Yard GA Plan (1:250)',
      'A-102: White-Space, PAC, CDU & Raised Floor (1:50)',
      'C-101: Civil Plinth / 4.5m Pile Cap Section (1:40)',
      'E-201: Yard-to-Hall Electrical SLD (NTS)',
      'E-202: UPS, Battery & Switchgear Room Layout (1:50)',
      'G-101 Earthing • R-101 Cable/Fiber • M-301 Hydraulics'
    ],
    false
  );

  // =========================================================================
  // SLIDE 10+: MASTER EQUIPMENT SCHEDULE (RATINGS, DIMENSIONS, WEIGHTS, ROOMS)
  // =========================================================================
  const eqPerPage = 4;
  const eqPages = Math.max(1, Math.ceil(eng.equipmentSchedule.length / eqPerPage));
  for (let p = 0; p < eqPages; p++) {
    const sEq = pptx.addSlide();
    initSlide(
      sEq,
      `09 | Master Equipment Schedule (${p + 1} of ${eqPages})`,
      'Major Infrastructure Assets — Ratings, Physical Dimensions, Weights & Room Locations'
    );
    const slice = eng.equipmentSchedule.slice(p * eqPerPage, (p + 1) * eqPerPage);
    const eqRows: PptxTableRow[] = [
      [
        tc('Tag', { bold: true, color: C.WHITE, fill: { color: C.ORANGE } }),
        tc('Equipment & OEM Make/Model', { bold: true, color: C.WHITE, fill: { color: C.ORANGE } }),
        tc('Location / Room', { bold: true, color: C.WHITE, fill: { color: C.ORANGE } }),
        tc('Rating & N+R', { bold: true, color: C.WHITE, fill: { color: C.ORANGE } }),
        tc('L × W × H', { bold: true, color: C.WHITE, fill: { color: C.ORANGE } }),
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
      margin: 0.05,
      colW: [1.05, 3.65, 2.45, 2.15, 1.85, 1.31],
      rowH: 0.39
    });
  }

  // =========================================================================
  // SLIDE: GOVERNANCE, COMPLIANCE & L1-L5 COMMISSIONING ROADMAP
  // =========================================================================
  const sGov = pptx.addSlide();
  const totalWks =
    eng.ganttTasks[eng.ganttTasks.length - 1].startWk + eng.ganttTasks[eng.ganttTasks.length - 1].durWk - 1;
  initSlide(
    sGov,
    '10 | Statutory Compliance & L1–L5 Turnkey Commissioning Roadmap',
    `${project.regulatoryCode.slice(0, 52)} • ${totalWks} Weeks to Ready-for-Service`
  );
  const istRows: PptxTableRow[] = [
    [
      tc('Commissioning Gate', { bold: true, color: C.WHITE, fill: { color: C.ORANGE } }),
      tc('Verification Scope & Witness Testing', { bold: true, color: C.WHITE, fill: { color: C.ORANGE } }),
      tc('Release Sign-Off', { bold: true, color: C.WHITE, fill: { color: C.ORANGE } })
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
    margin: 0.04,
    colW: [3.3, 6.96, 2.2],
    rowH: 0.33
  });

  // =========================================================================
  // FINAL SECTION: COMMERCIAL SUMMARY, 5-YEAR TCO & BOQ (LAST!)
  // =========================================================================
  const rowsPerPage = 4;
  const totalBoqPages = Math.max(1, Math.ceil(eng.bomItems.length / rowsPerPage));
  for (let page = 0; page < totalBoqPages; page++) {
    const sBoq = pptx.addSlide();
    initSlide(
      sBoq,
      `11 | Commercial Bill of Quantities & 5-Year TCO (${page + 1} of ${totalBoqPages})`,
      `Pre-Tax: ${formatMoney(eng.totals.sellingPreTax, project.currency, standards)} • 5-Yr TCO: ${formatMoney(eng.fiveYearTcoInr, project.currency, standards)} • MII ${eng.mii.overallMiiPct}%`
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
          `Pre-Tax: ${formatMoney(eng.totals.sellingPreTax, project.currency, standards)} | Incl. ${project.gstPct}% GST: ${formatMoney(eng.totals.grandTotal, project.currency, standards)}`,
          { bold: true, color: C.BLACK, fill: { color: C.ORANGE_SOFT } }
        ),
        tc(`5-Yr TCO: ${formatMoney(eng.fiveYearTcoInr, project.currency, standards)}`, {
          bold: true,
          color: C.BLACK,
          fill: { color: C.ORANGE_SOFT }
        }),
        tc(String(eng.bomItems.length), { bold: true, fill: { color: C.ORANGE_SOFT } }),
        tc(formatMoney(eng.totals.sellingPreTax, project.currency, standards), {
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
      margin: 0.04,
      colW: [2.4, 4.65, 2.75, 0.76, 1.9],
      rowH: 0.34
    });
  }

  pptx.writeFile({
    fileName: `${(project.name || 'MDC_Proposal').replace(/[^a-zA-Z0-9_-]+/g, '_')}_Engineering_Proposal.pptx`
  });
}
