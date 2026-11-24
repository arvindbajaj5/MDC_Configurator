import PptxGenJS from 'pptxgenjs';
import type { EngineeringResult, MasterStandards, ProjectDeal } from '../types/mdc';
import { formatMoney, totalHsdK } from './engineeringEngine';

export const PPTX_PALETTE = {
  WHITE: 'FFFFFF',
  ORANGE: 'FF5539',
  BLACK: '000000',
  CHARCOAL: '333333',
  LIGHT_GREY: 'F5F6F8',
  RULE_GREY: 'E2E4E8'
} as const;

export const PPTX_SLIDE_HEIGHT_IN = 7.5;
export const PPTX_FOOTER_CLEARANCE_IN = 3.1;
export const PPTX_MAX_CONTENT_BOTTOM_IN = PPTX_SLIDE_HEIGHT_IN - PPTX_FOOTER_CLEARANCE_IN; // 4.40"

/**
 * Pure-White & Brand-Orange ASHRAE Chart Renderer (zero navy/multi-color chrome)
 */
export function renderStrictAshraeChartPng(eng: EngineeringResult): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 1100;
  canvas.height = 380;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const padL = 68;
  const padR = 50;
  const padT = 40;
  const padB = 48;
  const plotW = canvas.width - padL - padR;
  const plotH = canvas.height - padT - padB;

  ctx.strokeStyle = '#E2E4E8';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const y = padT + (plotH * i) / 5;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + plotW, y);
    ctx.stroke();
    ctx.fillStyle = '#333333';
    ctx.font = '12px Roboto, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${50 - i * 10}°C`, padL - 10, y + 4);
  }

  const prof = eng.monthlyProfile || [];
  const maxWater = Math.max(...prof.map(m => m.monthlyWaterKl), 100);
  const stepX = plotW / 12;

  prof.forEach((m, idx) => {
    const x = padL + idx * stepX + stepX * 0.22;
    const bw = stepX * 0.56;
    const bh = (m.monthlyWaterKl / maxWater) * plotH * 0.82;
    ctx.fillStyle = m.mode === 'TrimChiller' ? '#FFD6CE' : '#F5F6F8';
    ctx.fillRect(x, padT + plotH - bh, bw, bh);
    ctx.strokeStyle = m.mode === 'TrimChiller' ? '#FF5539' : '#CCCCCC';
    ctx.strokeRect(x, padT + plotH - bh, bw, bh);

    ctx.fillStyle = '#333333';
    ctx.font = 'bold 11px Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${m.monthlyWaterKl}kL`, x + bw / 2, padT + plotH - bh - 5);
    ctx.fillText(m.month, x + bw / 2, padT + plotH + 20);
  });

  const limitTemp = Math.max(10, Math.min(50, eng.effectiveSupplyTempC - 3));
  const limitY = padT + plotH - (limitTemp / 50) * plotH;
  ctx.strokeStyle = '#000000';
  ctx.setLineDash([6, 4]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padL, limitY);
  ctx.lineTo(padL + plotW, limitY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'left';
  ctx.font = 'bold 11.5px Roboto, sans-serif';
  ctx.fillText(
    `Facility Loop Limit (${limitTemp.toFixed(1)}°C = ${eng.effectiveSupplyTempC}°C Supply - 3°C Approach)`,
    padL + 8,
    limitY - 6
  );

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
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  prof.forEach((m, idx) => {
    const x = padL + idx * stepX + stepX / 2;
    const y = padT + plotH - (Math.min(50, m.wetBulbC) / 50) * plotH;
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  ctx.font = 'bold 12px Roboto, sans-serif';
  ctx.fillStyle = '#FF5539';
  ctx.textAlign = 'left';
  ctx.fillText('— Peak Dry-Bulb (°C)', padL, 22);
  ctx.fillStyle = '#333333';
  ctx.fillText('— Coincident Wet-Bulb (°C)   |   Bars: Monthly Evaporation Water (kL)', padL + 170, 22);

  return canvas.toDataURL('image/png');
}

export function exportStrictNativePptxDeck(
  project: ProjectDeal,
  eng: EngineeringResult,
  standards: MasterStandards
): void {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE'; // 13.333" x 7.5"
  pptx.author = 'AI Modular Data Center Configurator V13.1';
  pptx.title = project.name || 'AI Modular Data Center Proposal';

  const C = PPTX_PALETTE;
  const ashraePng = renderStrictAshraeChartPng(eng);

  // Strict Header Helper:
  // - Pure White #FFFFFF background
  // - Tosh A Black 24pt header (#000000)
  // - Roshna Black 22pt subheader (#FF5539)
  // - Brand Orange #FF5539 thin rule
  // - ZERO logos on slides
  // - All content kept strictly above y = 4.40" (3.1" blank footer clearance)
  const initSlide = (slide: PptxGenJS.Slide, titleText: string, subHeaderText: string, secNum: string) => {
    slide.background = { color: C.WHITE };
    slide.addText(`${secNum}  |  ${titleText}`, {
      x: 0.55,
      y: 0.22,
      w: 12.2,
      h: 0.46,
      fontFace: 'Tosh A Black',
      fontSize: 24,
      bold: false,
      color: C.BLACK,
      margin: 0.08,
      valign: 'middle'
    });
    slide.addText(subHeaderText, {
      x: 0.55,
      y: 0.70,
      w: 12.2,
      h: 0.38,
      fontFace: 'Roshna Black',
      fontSize: 22,
      bold: false,
      color: C.ORANGE,
      margin: 0.08,
      valign: 'middle'
    });
    slide.addShape(pptx.ShapeType.line, {
      x: 0.60,
      y: 1.14,
      w: 12.1,
      h: 0,
      line: { color: C.ORANGE, width: 1.5 }
    });
  };

  // SLIDE 1: Cover Slide (Native Shapes & Tables Only, Zero Stacked Text Boxes, No Logo)
  const s1 = pptx.addSlide();
  s1.background = { color: C.WHITE };
  s1.addShape(pptx.ShapeType.rect, {
    x: 0.65,
    y: 0.95,
    w: 1.4,
    h: 0.08,
    fill: { color: C.ORANGE },
    line: { color: C.ORANGE, width: 0 }
  });
  s1.addText(project.name || 'Modular AI Data Center Proposal', {
    x: 0.55,
    y: 1.15,
    w: 12.1,
    h: 0.85,
    fontFace: 'Tosh A Black',
    fontSize: 24,
    bold: false,
    color: C.BLACK,
    margin: 0.1
  });
  s1.addText(
    `${project.shellArchitecture === 'BnM_Hall' ? 'Brick-and-Mortar (BnM) AI Hall' : 'Modular ISO AI Data Center'} Proposal  •  ${project.client || 'Enterprise Authority'}`,
    {
      x: 0.55,
      y: 2.05,
      w: 12.1,
      h: 0.52,
      fontFace: 'Roshna Black',
      fontSize: 22,
      bold: false,
      color: C.ORANGE,
      margin: 0.1
    }
  );
  s1.addTable(
    [
      [
        {
          text: `Site: ${project.cityQuery} (${project.seismicZone})   |   IT Load: ${(eng.totalDesignContKw / 1000).toFixed(2)} MW (${(eng.dlcDesignKw / 1000).toFixed(2)} MW DLC + ${(eng.acDesignKw / 1000).toFixed(2)} MW AC)   |   PUE: ${eng.pueAnnualized}   |   Tier: ${project.uptimeTier}   |   MII: ${eng.mii.miiClassLabel}`,
          options: { fontFace: 'Roboto', fontSize: 10.5, color: C.CHARCOAL, fill: { color: C.LIGHT_GREY } }
        }
      ]
    ],
    {
      x: 0.65,
      y: 2.75,
      w: 12.0,
      border: { type: 'solid', color: C.RULE_GREY, pt: 0.75 },
      margin: 0.1,
      rowH: 0.58
    }
  );

  // SLIDE 2: Executive Mandate & 15-Point Summary Snapshot (Native Table Only — Zero Stacked Shapes)
  const s2 = pptx.addSlide();
  initSlide(
    s2,
    'Executive Mandate & Solution Architecture',
    `${project.client || 'Customer'} • ${(eng.totalDesignContKw / 1000).toFixed(2)} MW ${project.archetype}`,
    '01'
  );
  const s2Table: PptxGenJS.TableRow[] = [
    [
      { text: 'Design Dimension', options: { bold: true, color: C.BLACK, fill: { color: C.LIGHT_GREY } } },
      { text: 'Engineered Specification', options: { bold: true, color: C.BLACK, fill: { color: C.LIGHT_GREY } } },
      { text: 'Design Dimension', options: { bold: true, color: C.BLACK, fill: { color: C.LIGHT_GREY } } },
      { text: 'Engineered Specification', options: { bold: true, color: C.BLACK, fill: { color: C.LIGHT_GREY } } }
    ],
    [
      { text: 'IT Load Split', options: { bold: true, color: C.ORANGE } },
      `${(eng.dlcDesignKw / 1000).toFixed(2)} MW DLC + ${(eng.acDesignKw / 1000).toFixed(2)} MW AC`,
      { text: 'White-Space & Yard', options: { bold: true, color: C.ORANGE } },
      `${eng.totalItWhiteSpaceSqm} m² Hall + ${eng.totalNonItYardSqm} m² Yard`
    ],
    [
      { text: 'Enclosures & Racks', options: { bold: true, color: C.ORANGE } },
      `${eng.pods.length} ${eng.civil.isBnM ? 'BnM Bays' : 'Pods'} (${eng.activeRacks.length} Racks)`,
      { text: 'Civil & Foundation', options: { bold: true, color: C.ORANGE } },
      `${eng.civil.isWeakSoil ? '4.5m Pile Cap' : `${eng.civil.embedmentDepthM}m Pad`} • FoS ${eng.civil.bearingSafetyFactor}×`
    ],
    [
      { text: 'Annualized / Peak PUE', options: { bold: true, color: C.ORANGE } },
      `${eng.pueAnnualized} Annualized / ${eng.puePeakDesign} Peak`,
      { text: 'Redundancy & Grid', options: { bold: true, color: C.ORANGE } },
      `${project.uptimeTier} • ${eng.gridShield.loadDropShieldMw} MW Load Shield`
    ],
    [
      { text: 'Coolant Supply Limit', options: { bold: true, color: C.ORANGE } },
      `${eng.effectiveSupplyTempC}°C (SKU Limit ${eng.governingMaxInletTempC}°C)`,
      { text: 'Commercial & MII', options: { bold: true, color: C.ORANGE } },
      `${formatMoney(eng.totals.sellingPreTax, project.currency, standards)} • ${eng.mii.overallMiiPct}% MII`
    ]
  ];
  s2.addTable(s2Table, {
    x: 0.65,
    y: 1.28,
    w: 12.0,
    fontFace: 'Roboto',
    fontSize: 10,
    color: C.CHARCOAL,
    border: { type: 'solid', color: C.RULE_GREY, pt: 0.5 },
    margin: 0.08,
    colW: [2.1, 3.9, 2.1, 3.9],
    rowH: 0.58
  });

  // SLIDE 3: 12-Month ASHRAE Microclimate & Water Profile
  const s3 = pptx.addSlide();
  initSlide(
    s3,
    'Location Microclimate & 12-Month ASHRAE Profile',
    `${project.cityQuery} (${project.peakDryBulb}°C DB / ${project.peakWetBulb}°C WB) • Supply <= ${eng.effectiveSupplyTempC}°C`,
    '02'
  );
  if (ashraePng) {
    s3.addImage({ data: ashraePng, x: 0.65, y: 1.24, w: 12.0, h: 3.05 });
  }

  // SLIDE 4: Spatial Architecture & 3-Zone Campus Layout (Native Table — Zero Stacked Shapes)
  const s4 = pptx.addSlide();
  initSlide(
    s4,
    '3-Zone Campus Architecture & White-Space Separation',
    `${eng.totalItWhiteSpaceSqm} m² White-Space + ${eng.totalNonItYardSqm} m² Yard • ${project.setbackMeters}m NBC Setback`,
    '03'
  );
  const zoneTable: PptxGenJS.TableRow[] = [
    [
      { text: 'Campus Zone', options: { bold: true, color: C.BLACK, fill: { color: C.LIGHT_GREY } } },
      { text: 'Area (m²)', options: { bold: true, color: C.BLACK, fill: { color: C.LIGHT_GREY } } },
      { text: 'Engineered Equipment & Isolation Envelope', options: { bold: true, color: C.BLACK, fill: { color: C.LIGHT_GREY } } }
    ],
    [
      { text: 'Zone A: IT White-Space + MMR', options: { bold: true, color: C.ORANGE } },
      `${Math.round(eng.totalItWhiteSpaceSqm + eng.yardBreakdown.adminStagingSqm)} m²`,
      `${eng.pods.length} ${eng.civil.isBnM ? 'BnM Bays' : 'Pods'} • ${eng.whiteSpace.internalCduCount} Internal CDU Towers + ${eng.whiteSpace.mandatoryPacCount}×80kW PACs (Zero Yard CDUs) + Carrier MMR`
    ],
    [
      { text: 'Zone B: Containerized UPS/BESS', options: { bold: true, color: C.ORANGE } },
      `${eng.yardBreakdown.upsBessSqm} m²`,
      `${eng.upsContainersCount}×${eng.selUps.ratedCapacity}kVA Modular UPS + ${eng.batteryContainersCount}×1.2MWh ${project.batteryChemistry} BESS (${project.batteryRuntimeMin} min)`
    ],
    [
      { text: 'Zone C: Open Power & Cooling Yard', options: { bold: true, color: C.ORANGE } },
      `${Math.max(0, eng.totalNonItYardSqm - eng.yardBreakdown.upsBessSqm - eng.yardBreakdown.adminStagingSqm)} m²`,
      `${eng.transformerUnits}×${eng.selTrafo.ratedCapacity}kVA Trafos • ${eng.dgUnitsCount}×${eng.selDg.ratedCapacity}kVA CPCB IV+ DGs (${totalHsdK(eng.totalHsdFuelLitres)}kL) • ${eng.adiabaticUnits}×${eng.selCooler.ratedCapacity}kW Coolers`
    ],
    [
      { text: 'Total Campus Occupied', options: { bold: true, color: C.BLACK, fill: { color: C.LIGHT_GREY } } },
      { text: `${eng.totalCampusOccupiedSqm} m²`, options: { bold: true, color: C.ORANGE, fill: { color: C.LIGHT_GREY } } },
      { text: `Plot Utilization: ${eng.plotUtilizationPct}% of Net Buildable Area • Crane: ${eng.logistics.craneTonnage}T • Turning Circle: ${eng.logistics.minTurningRadiusM}m`, options: { bold: true, fill: { color: C.LIGHT_GREY } } }
    ]
  ];
  s4.addTable(zoneTable, {
    x: 0.65,
    y: 1.28,
    w: 12.0,
    fontFace: 'Roboto',
    fontSize: 10,
    color: C.CHARCOAL,
    border: { type: 'solid', color: C.RULE_GREY, pt: 0.5 },
    margin: 0.08,
    colW: [3.2, 1.4, 7.4],
    rowH: 0.58
  });

  // SLIDE 5: Electrical SLD (E-201) & Hydraulic P&ID (M-301) Summary Table (Native Table Only)
  const s5 = pptx.addSlide();
  initSlide(
    s5,
    'Electrical Single-Line (E-201) & Hydraulic Loop (M-301)',
    `${project.uptimeTier} Power Train • ${Math.round(eng.totalFlowLpm)} LPM @ ${eng.pumpDesignHeadBar} bar TDH`,
    '04'
  );
  const mepTable: PptxGenJS.TableRow[] = [
    [
      { text: 'Stage', options: { bold: true, color: C.BLACK, fill: { color: C.LIGHT_GREY } } },
      { text: 'Electrical Power Train (Sheet E-201)', options: { bold: true, color: C.BLACK, fill: { color: C.LIGHT_GREY } } },
      { text: 'DLC Thermal & Hydraulic Loop (Sheet M-301)', options: { bold: true, color: C.BLACK, fill: { color: C.LIGHT_GREY } } }
    ],
    [
      { text: '1. Grid / Rejection', options: { bold: true, color: C.ORANGE } },
      `33kV/66kV HT VCB + ${eng.transformerUnits}×${eng.selTrafo.ratedCapacity}kVA K-13 Dry Trafos`,
      `${eng.adiabaticUnits}×${eng.selCooler.ratedCapacity}kW Adiabatic/Dry Coolers (${eng.freeCoolMonths}m Free-Cool)`
    ],
    [
      { text: '2. Backup / Storage', options: { bold: true, color: C.ORANGE } },
      `${eng.dgUnitsCount}×${eng.selDg.ratedCapacity}kVA CPCB IV+ DGs + ${eng.gridShield.loadDropShieldMw} MW Load Shield`,
      `${eng.waterTankUnits}×${eng.selTank.ratedCapacity}kL SS316L Tanks (${eng.totalWaterStorageKl} kL) + ZLD & RO/DM`
    ],
    [
      { text: '3. Conditioning', options: { bold: true, color: C.ORANGE } },
      `${eng.upsContainersCount}×${eng.selUps.ratedCapacity}kVA Modular UPS + ${eng.batteryContainersCount}×1.2MWh ${project.batteryChemistry}`,
      `${eng.pumpSkidsCount} VFD Pump Skids (${project.pumpStagingMode}) @ ${eng.pumpDesignHeadBar} bar`
    ],
    [
      { text: '4. Hall Delivery', options: { bold: true, color: C.ORANGE } },
      `Dual A/B ${standards.buswayAmperageA}A Sandwich Busways + Intelligent rPDUs`,
      `${eng.whiteSpace.internalCduCount} Internal CDU Towers (<= ${eng.effectiveSupplyTempC}°C) + ${eng.whiteSpace.mandatoryPacCount} PACs`
    ]
  ];
  s5.addTable(mepTable, {
    x: 0.65,
    y: 1.28,
    w: 12.0,
    fontFace: 'Roboto',
    fontSize: 10,
    color: C.CHARCOAL,
    border: { type: 'solid', color: C.RULE_GREY, pt: 0.5 },
    margin: 0.08,
    colW: [2.1, 4.95, 4.95],
    rowH: 0.58
  });

  // SLIDE 6: Civil Foundation, Regulatory De-Risking & L1-L5 Commissioning
  const s6 = pptx.addSlide();
  initSlide(
    s6,
    'Civil Engineering, Statutory Governance & L1–L5 IST',
    `${project.seismicLabel} • ${eng.civil.foundationType}`,
    '05'
  );
  const govRows: PptxGenJS.TableRow[] = [
    [
      { text: 'Governance Domain', options: { bold: true, color: C.BLACK, fill: { color: C.LIGHT_GREY } } },
      { text: 'Engineered Specification & Verification Gate', options: { bold: true, color: C.BLACK, fill: { color: C.LIGHT_GREY } } }
    ],
    [
      { text: 'Civil & Structural (C-101)', options: { bold: true, color: C.ORANGE } },
      `${eng.civil.foundationType} • Flood Plinth +${eng.civil.floodPlinthMm}mm • Bearing FoS ${eng.civil.bearingSafetyFactor}× (SBC ${eng.civil.sbc} kN/m²).`
    ],
    [
      { text: 'Fire, Life-Safety & Hardening', options: { bold: true, color: C.ORANGE } },
      `VESDA Laser Smoke + ${eng.novecGasKg} kg Novec 1230 Clean Agent • K12 Anti-Ram & Biometric Mantrap • #316 SS Rodent Mesh.`
    ],
    [
      { text: 'Telecom MMR & Rigging', options: { bold: true, color: C.ORANGE } },
      `${eng.telecom.mmrRoomsCount} Carrier MMR (${eng.telecom.odfBaysCount}× ${project.odfCoreDensity}F ODF, ${project.diverseVaultSeparationM}m Diverse Vaults) • ${eng.logistics.craneTonnage}T Crane.`
    ],
    [
      { text: 'L1–L5 IST & Resident O&M', options: { bold: true, color: C.ORANGE } },
      `L1 FAT -> L2 Civil -> L3 Cold/PG25 -> L4 Subsystems -> L5 100% Heat-Load IST • ${project.amcYears}-Yr AMC (${project.residentHeadcount} Staff).`
    ]
  ];
  s6.addTable(govRows, {
    x: 0.65,
    y: 1.28,
    w: 12.0,
    fontFace: 'Roboto',
    fontSize: 10,
    color: C.CHARCOAL,
    border: { type: 'solid', color: C.RULE_GREY, pt: 0.5 },
    margin: 0.08,
    colW: [3.1, 8.9],
    rowH: 0.58
  });

  // SLIDE 7+: Consolidated Commercial BOQ (Paginated, Native Table Only, Strictly Above y = 4.40")
  const rowsPerPage = 4;
  const totalBoqPages = Math.max(1, Math.ceil(eng.bomItems.length / rowsPerPage));
  for (let page = 0; page < totalBoqPages; page++) {
    const sBoq = pptx.addSlide();
    initSlide(
      sBoq,
      `Commercial Bill of Materials (${page + 1} of ${totalBoqPages})`,
      'Turnkey Non-IT Modular Infrastructure Pricing (IT Compute Racks Excluded)',
      '06'
    );
    const slice = eng.bomItems.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
    const boqTable: PptxGenJS.TableRow[] = [
      [
        { text: 'Category', options: { bold: true, color: C.BLACK, fill: { color: C.LIGHT_GREY } } },
        { text: 'Subsystem / Scope Description', options: { bold: true, color: C.BLACK, fill: { color: C.LIGHT_GREY } } },
        { text: 'Make & Model', options: { bold: true, color: C.BLACK, fill: { color: C.LIGHT_GREY } } },
        { text: 'Qty', options: { bold: true, color: C.BLACK, fill: { color: C.LIGHT_GREY } } },
        { text: `Pre-Tax (${project.currency})`, options: { bold: true, color: C.BLACK, fill: { color: C.LIGHT_GREY } } }
      ],
      ...(slice.length > 0
        ? slice.map(it => [
            it.category,
            it.label.slice(0, 44) + (it.isOverridden ? ' [Special Quote]' : it.isPlaceholder ? ' [Placeholder]' : ''),
            `${it.make} (${it.model})`.slice(0, 26),
            String(it.qty),
            formatMoney(it.sellingPreTax, project.currency, standards)
          ])
        : [['-', 'No items configured', '-', '0', '0']])
    ];
    if (page === totalBoqPages - 1) {
      boqTable.push([
        { text: 'TOTAL', options: { bold: true, color: C.ORANGE, fill: { color: C.LIGHT_GREY } } },
        {
          text: `Pre-Tax: ${formatMoney(eng.totals.sellingPreTax, project.currency, standards)}  |  Incl. ${project.gstPct}% GST: ${formatMoney(eng.totals.grandTotal, project.currency, standards)}`,
          options: { bold: true, color: C.BLACK, fill: { color: C.LIGHT_GREY } }
        },
        {
          text: `5-Yr TCO: ${formatMoney(eng.fiveYearTcoInr, project.currency, standards)}`,
          options: { bold: true, color: C.BLACK, fill: { color: C.LIGHT_GREY } }
        },
        { text: '-', options: { bold: true, fill: { color: C.LIGHT_GREY } } },
        {
          text: formatMoney(eng.totals.sellingPreTax, project.currency, standards),
          options: { bold: true, color: C.ORANGE, fill: { color: C.LIGHT_GREY } }
        }
      ]);
    }
    sBoq.addTable(boqTable, {
      x: 0.65,
      y: 1.28,
      w: 12.0,
      fontFace: 'Roboto',
      fontSize: 9.5,
      color: C.CHARCOAL,
      border: { type: 'solid', color: C.RULE_GREY, pt: 0.5 },
      margin: 0.08,
      colW: [2.45, 4.35, 2.6, 0.8, 1.8],
      rowH: 0.44
    });
  }

  // FINAL SLIDE: Turnkey Implementation Roadmap
  const sPlan = pptx.addSlide();
  const totalWks =
    eng.ganttTasks[eng.ganttTasks.length - 1].startWk + eng.ganttTasks[eng.ganttTasks.length - 1].durWk - 1;
  initSlide(
    sPlan,
    'Turnkey Implementation & Commissioning Roadmap',
    `Macro Execution Schedule • ${totalWks} Weeks to Day-1 Ready-for-Service`,
    '07'
  );
  const planRows: PptxGenJS.TableRow[] = [
    [
      { text: 'Macro Execution Workstream', options: { bold: true, color: C.BLACK, fill: { color: C.LIGHT_GREY } } },
      { text: 'Start', options: { bold: true, color: C.BLACK, fill: { color: C.LIGHT_GREY } } },
      { text: 'Duration', options: { bold: true, color: C.BLACK, fill: { color: C.LIGHT_GREY } } },
      { text: 'Milestone Window', options: { bold: true, color: C.BLACK, fill: { color: C.LIGHT_GREY } } }
    ],
    ...eng.ganttTasks.map(g => [
      g.task,
      `Week ${g.startWk}`,
      `${g.durWk} Weeks`,
      `Week ${g.startWk} – Week ${g.startWk + g.durWk - 1}`
    ])
  ];
  sPlan.addTable(planRows, {
    x: 0.65,
    y: 1.28,
    w: 12.0,
    fontFace: 'Roboto',
    fontSize: 10,
    color: C.CHARCOAL,
    border: { type: 'solid', color: C.RULE_GREY, pt: 0.5 },
    margin: 0.08,
    colW: [6.3, 1.6, 1.8, 2.3],
    rowH: 0.40
  });

  pptx.writeFile({
    fileName: `${(project.name || 'MDC_Proposal').replace(/[^a-zA-Z0-9_-]+/g, '_')}_Presentation.pptx`
  });
}
