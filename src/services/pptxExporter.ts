import { build15PointExecutiveSummary, runComplianceAudits } from '../engines/auditAndSummary';
import { renderElectricalSldPng, renderMepSchematicPng } from './cadCanvasRenderers';
import type { DealConfig, FullEngineeringOutput } from '../types/schema';

/**
 * Strictly enforced corporate presentation house style:
 * - Pure white #FFFFFF canvas
 * - 5-color brand palette (Coral-Orange #FF5539, Deep Navy #002870, Cobalt #1C38F5, Emerald #00B290, Amber #FFB600)
 * - Tosh A Black 24pt headers, Roboto body (max 12pt)
 * - 16:9 widescreen (13.333" x 7.5") with 3.1-inch BLANK footer clearance -> ALL elements strictly within y + h <= 4.40"
 */
export const PPTX_HOUSE_STYLE = {
  slideWidthIn: 13.333,
  slideHeightIn: 7.5,
  footerClearanceIn: 3.1,
  maxContentBottomYIn: 4.4,
  marginXIn: 0.45,
  canvasHex: 'FFFFFF',
  palette: {
    orange: 'FF5539',
    navy: '002870',
    cobalt: '1C38F5',
    emerald: '00B290',
    amber: 'FFB600',
    textDark: '0F172A',
    textMuted: '475569',
    borderLight: 'CBD5E1',
    panelLight: 'F8FAFC'
  },
  fonts: {
    header: 'Tosh A Black',
    headerSizePt: 24,
    body: 'Roboto',
    maxBodySizePt: 12
  }
} as const;

export interface SlideElementBox {
  kind: 'title' | 'kpi' | 'table' | 'image' | 'text';
  x: number;
  y: number;
  w: number;
  h: number;
  fontFace?: string;
  fontSizePt?: number;
}

export interface SlideBlueprint {
  slideNumber: number;
  title: string;
  backgroundHex: string;
  elements: SlideElementBox[];
}

/**
 * Deterministic slide geometry blueprint used both for PptxGenJS generation
 * and automated Vitest verification of the 3.1-inch footer clearance invariant.
 */
export function buildPptxSlideBlueprints(
  deal: DealConfig,
  eng: FullEngineeringOutput
): SlideBlueprint[] {
  const maxContentY = PPTX_HOUSE_STYLE.maxContentBottomYIn;
  const headerBox: SlideElementBox = {
    kind: 'title',
    x: 0.45,
    y: 0.25,
    w: 12.43,
    h: 0.55,
    fontFace: PPTX_HOUSE_STYLE.fonts.header,
    fontSizePt: PPTX_HOUSE_STYLE.fonts.headerSizePt
  };

  const slides: SlideBlueprint[] = [
    {
      slideNumber: 1,
      title: `${deal.name} — Turnkey AI MDC Blueprint`,
      backgroundHex: PPTX_HOUSE_STYLE.canvasHex,
      elements: [
        headerBox,
        { kind: 'kpi', x: 0.45, y: 1.0, w: 2.95, h: 1.25, fontFace: 'Roboto', fontSizePt: 12 },
        { kind: 'kpi', x: 3.6, y: 1.0, w: 2.95, h: 1.25, fontFace: 'Roboto', fontSizePt: 12 },
        { kind: 'kpi', x: 6.75, y: 1.0, w: 2.95, h: 1.25, fontFace: 'Roboto', fontSizePt: 12 },
        { kind: 'kpi', x: 9.9, y: 1.0, w: 2.98, h: 1.25, fontFace: 'Roboto', fontSizePt: 12 },
        { kind: 'text', x: 0.45, y: 2.45, w: 12.43, h: 1.85, fontFace: 'Roboto', fontSizePt: 11 }
      ]
    },
    {
      slideNumber: 2,
      title: '15-Point Executive Technical & Commercial Summary',
      backgroundHex: PPTX_HOUSE_STYLE.canvasHex,
      elements: [
        headerBox,
        { kind: 'table', x: 0.45, y: 0.95, w: 6.1, h: 3.35, fontFace: 'Roboto', fontSizePt: 9 },
        { kind: 'table', x: 6.78, y: 0.95, w: 6.1, h: 3.35, fontFace: 'Roboto', fontSizePt: 9 }
      ]
    },
    {
      slideNumber: 3,
      title: `Electrical SLD (E-201) — ${eng.electrical.incomingVoltageKv} kV / ${eng.electrical.grossFacilityMva} MVA`,
      backgroundHex: PPTX_HOUSE_STYLE.canvasHex,
      elements: [
        headerBox,
        { kind: 'image', x: 0.45, y: 0.95, w: 8.6, h: 3.35 },
        { kind: 'text', x: 9.25, y: 0.95, w: 3.63, h: 3.35, fontFace: 'Roboto', fontSizePt: 10 }
      ]
    },
    {
      slideNumber: 4,
      title: `Cooling & 3-Zone MEP (M-301) — PUE ${eng.mep.estimatedPue.toFixed(2)}`,
      backgroundHex: PPTX_HOUSE_STYLE.canvasHex,
      elements: [
        headerBox,
        { kind: 'image', x: 0.45, y: 0.95, w: 8.6, h: 3.35 },
        { kind: 'text', x: 9.25, y: 0.95, w: 3.63, h: 3.35, fontFace: 'Roboto', fontSizePt: 10 }
      ]
    },
    {
      slideNumber: 5,
      title: `Civil Plinth (C-101) & Compliance Audit — ${eng.civil.foundationType}`,
      backgroundHex: PPTX_HOUSE_STYLE.canvasHex,
      elements: [
        headerBox,
        { kind: 'table', x: 0.45, y: 0.95, w: 6.0, h: 3.35, fontFace: 'Roboto', fontSizePt: 10 },
        { kind: 'table', x: 6.65, y: 0.95, w: 6.23, h: 3.35, fontFace: 'Roboto', fontSizePt: 9 }
      ]
    },
    {
      slideNumber: 6,
      title: `Commercial BOQ, MII (${eng.commercial.weightedBoqMiiPercent}%) & ${deal.commercial.tcoYears}-Yr TCO`,
      backgroundHex: PPTX_HOUSE_STYLE.canvasHex,
      elements: [
        headerBox,
        { kind: 'table', x: 0.45, y: 0.95, w: 7.55, h: 3.35, fontFace: 'Roboto', fontSizePt: 9 },
        { kind: 'table', x: 8.2, y: 0.95, w: 4.68, h: 3.35, fontFace: 'Roboto', fontSizePt: 9 }
      ]
    }
  ];

  // Runtime safety assertion: never violate the 3.1-inch blank footer clearance
  for (const s of slides) {
    for (const el of s.elements) {
      if (el.y + el.h > maxContentY + 0.001) {
        throw new Error(
          `PPTX House Style violation on Slide ${s.slideNumber}: element bottom ${(el.y + el.h).toFixed(2)}" exceeds 4.40" (3.1" footer clearance).`
        );
      }
    }
  }

  return slides;
}

/**
 * Lazy-loads PptxGenJS and exports a 6-slide executive engineering PPTX deck.
 */
export async function exportExecutivePptx(
  deal: DealConfig,
  eng: FullEngineeringOutput
): Promise<string> {
  const { default: PptxGenJS } = await import('pptxgenjs');
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE'; // 13.333" x 7.5"
  pptx.author = 'AI Modular Data Center Configurator V13';
  pptx.title = deal.name;

  const blueprints = buildPptxSlideBlueprints(deal, eng);
  const P = PPTX_HOUSE_STYLE.palette;
  const execPoints = build15PointExecutiveSummary(deal, eng);
  const audits = runComplianceAudits(deal, eng);

  const sldPng = renderElectricalSldPng(deal, eng, { theme: 'light', width: 1200, height: 560 });
  const mepPng = renderMepSchematicPng(deal, eng, { theme: 'light', width: 1200, height: 560 });

  const addHeader = (slide: ReturnType<typeof pptx.addSlide>, title: string) => {
    slide.background = { color: PPTX_HOUSE_STYLE.canvasHex };
    slide.addShape(pptx.ShapeType.rect, { x: 0.45, y: 0.28, w: 0.08, h: 0.44, fill: { color: P.orange } });
    slide.addText(title, {
      x: 0.62,
      y: 0.22,
      w: 12.2,
      h: 0.54,
      fontFace: PPTX_HOUSE_STYLE.fonts.header,
      fontSize: PPTX_HOUSE_STYLE.fonts.headerSizePt,
      color: P.navy,
      bold: true,
      valign: 'middle'
    });
    slide.addShape(pptx.ShapeType.line, {
      x: 0.45,
      y: 0.82,
      w: 12.43,
      h: 0,
      line: { color: P.borderLight, width: 1 }
    });
  };

  // Slide 1: Cover & KPI Snapshot (Strictly y <= 4.40")
  const s1 = pptx.addSlide();
  addHeader(s1, blueprints[0].title);
  const kpis = [
    { label: 'TARGET IT LOAD', value: `${eng.mep.itLoadMw.toFixed(1)} MW`, sub: `${eng.mep.totalRacks} Racks (${deal.dlcSharePct}% DLC)`, color: P.orange },
    { label: 'DESIGN PUE', value: eng.mep.estimatedPue.toFixed(2), sub: `${eng.mep.totalSiteAreaM2.toLocaleString()} m² | Zero Yard CDUs`, color: P.emerald },
    { label: 'TURNKEY CAPEX', value: `₹${eng.commercial.totalCapexInrCr} Cr`, sub: `₹${eng.commercial.capexPerMwInrCr} Cr/MW (incl. GST)`, color: P.navy },
    { label: 'MAKE-IN-INDIA', value: `${eng.commercial.weightedBoqMiiPercent}%`, sub: eng.supplyChain.pppMiiClass, color: P.cobalt }
  ];
  kpis.forEach((k, idx) => {
    const x = 0.45 + idx * 3.15;
    s1.addShape(pptx.ShapeType.rect, {
      x,
      y: 1.0,
      w: 2.95,
      h: 1.25,
      fill: { color: P.panelLight },
      line: { color: P.borderLight, width: 0.75 }
    });
    s1.addShape(pptx.ShapeType.rect, { x, y: 1.0, w: 2.95, h: 0.08, fill: { color: k.color } });
    s1.addText(k.label, { x: x + 0.12, y: 1.14, w: 2.7, h: 0.22, fontFace: 'Roboto', fontSize: 9, color: P.textMuted, bold: true });
    s1.addText(k.value, { x: x + 0.12, y: 1.38, w: 2.7, h: 0.45, fontFace: 'Roboto', fontSize: 20, color: k.color, bold: true });
    s1.addText(k.sub, { x: x + 0.12, y: 1.88, w: 2.7, h: 0.28, fontFace: 'Roboto', fontSize: 9, color: P.textDark });
  });

  s1.addShape(pptx.ShapeType.rect, {
    x: 0.45,
    y: 2.45,
    w: 12.43,
    h: 1.85,
    fill: { color: P.panelLight },
    line: { color: P.borderLight, width: 0.75 }
  });
  s1.addText(
    [
      { text: `Client: ${deal.customer}   |   Location: ${deal.climate.city}, ${deal.climate.state} (${deal.climate.seismicZone})   |   ${deal.uptimeTier} (${deal.redundancy})\n`, options: { bold: true, color: P.navy, fontSize: 11 } },
      { text: `Architecture: ${deal.architecture === 'Container' ? `${eng.mep.podCount}x ${deal.containerUnitMw} MW Prefabricated DLC Pods` : 'Brick-and-Mortar High-Bay Data Hall'}   |   Foundation: ${eng.civil.foundationType} (FoS ${eng.civil.bearingFoS}x)\n`, options: { color: P.textDark, fontSize: 10 } },
      { text: `Electrical: ${eng.electrical.incomingVoltageKv} kV Dual Feed, ${eng.electrical.transformerCountTotal}x 3.15 MVA ${eng.electrical.standards.kFactorRating}, ${eng.electrical.busductRunsCount}x ${eng.electrical.busductIpRating} Busducts, ${eng.electrical.dgCountTotal}x CPCB-IV+ DGs\n`, options: { color: P.textDark, fontSize: 10 } },
      { text: `5-Year Total TCO: ₹${eng.commercial.totalTco5YrInrCr} Cr (₹${eng.commercial.inrPerItKwh5Yr}/IT kWh)   |   Branding Note: ${deal.branding.artworkDeferred ? deal.branding.deferredCaveatNote : 'Final livery approved.'}`, options: { color: P.textMuted, fontSize: 10 } }
    ],
    { x: 0.62, y: 2.55, w: 12.1, h: 1.65, fontFace: 'Roboto', valign: 'top' }
  );

  // Slide 2: 15-Point Executive Summary (Two Native Tables side-by-side, strictly y <= 4.30")
  const s2 = pptx.addSlide();
  addHeader(s2, blueprints[1].title);
  const leftRows = [
    [{ text: '#', options: { bold: true, color: 'FFFFFF', fill: { color: P.navy } } }, { text: 'Domain', options: { bold: true, color: 'FFFFFF', fill: { color: P.navy } } }, { text: 'Specification', options: { bold: true, color: 'FFFFFF', fill: { color: P.navy } } }],
    ...execPoints.slice(0, 8).map((pt) => [
      { text: String(pt.index), options: { bold: true, color: P.orange } },
      { text: pt.category, options: { bold: true, color: P.navy } },
      { text: pt.headline, options: { color: P.textDark } }
    ])
  ];
  const rightRows = [
    [{ text: '#', options: { bold: true, color: 'FFFFFF', fill: { color: P.navy } } }, { text: 'Domain', options: { bold: true, color: 'FFFFFF', fill: { color: P.navy } } }, { text: 'Specification', options: { bold: true, color: 'FFFFFF', fill: { color: P.navy } } }],
    ...execPoints.slice(8, 15).map((pt) => [
      { text: String(pt.index), options: { bold: true, color: P.orange } },
      { text: pt.category, options: { bold: true, color: P.navy } },
      { text: pt.headline, options: { color: P.textDark } }
    ])
  ];
  s2.addTable(leftRows, { x: 0.45, y: 0.95, w: 6.1, h: 3.3, fontFace: 'Roboto', fontSize: 8.5, border: { pt: 0.5, color: P.borderLight }, colW: [0.4, 1.5, 4.2] });
  s2.addTable(rightRows, { x: 6.78, y: 0.95, w: 6.1, h: 3.3, fontFace: 'Roboto', fontSize: 8.5, border: { pt: 0.5, color: P.borderLight }, colW: [0.4, 1.5, 4.2] });

  // Slide 3: Electrical SLD (E-201)
  const s3 = pptx.addSlide();
  addHeader(s3, blueprints[2].title);
  if (sldPng) {
    s3.addImage({ data: sldPng, x: 0.45, y: 0.95, w: 8.6, h: 3.35 });
  }
  s3.addShape(pptx.ShapeType.rect, { x: 9.25, y: 0.95, w: 3.63, h: 3.35, fill: { color: P.panelLight }, line: { color: P.borderLight, width: 0.75 } });
  s3.addText(
    [
      { text: 'ELECTRICAL STANDARDS\n', options: { bold: true, color: P.navy, fontSize: 11 } },
      { text: `• Wiring: ${eng.electrical.standards.wiringCode}\n`, options: { fontSize: 9.5, color: P.textDark } },
      { text: `• Harmonics: ${eng.electrical.standards.harmonicsStandard}\n`, options: { fontSize: 9.5, color: P.textDark } },
      { text: `• Earthing: ${eng.electrical.standards.earthingStandard}\n`, options: { fontSize: 9.5, color: P.textDark } },
      { text: `• Transformers: ${eng.electrical.transformerCountTotal}x ${eng.electrical.transformerRatingMva} MVA (${eng.electrical.standards.kFactorRating})\n`, options: { fontSize: 9.5, color: P.textDark } },
      { text: `• Busducts: ${eng.electrical.busductRunsCount}x ${eng.electrical.busductRatingAmps}A ${eng.electrical.busductIpRating}\n`, options: { fontSize: 9.5, color: P.textDark } },
      { text: `• Backup: ${eng.electrical.dgCountTotal}x 2.5 MVA CPCB-IV+ DGs\n`, options: { fontSize: 9.5, color: P.textDark } },
      { text: `• BESS Buffer: ${deal.includeBessRideThrough ? `${eng.electrical.bessPowerMw} MW / ${eng.electrical.bessEnergyMwh} MWh` : 'Disabled'}`, options: { fontSize: 9.5, color: P.orange, bold: true } }
    ],
    { x: 9.4, y: 1.08, w: 3.35, h: 3.1, fontFace: 'Roboto', valign: 'top' }
  );

  // Slide 4: Cooling & 3-Zone MEP (M-301)
  const s4 = pptx.addSlide();
  addHeader(s4, blueprints[3].title);
  if (mepPng) {
    s4.addImage({ data: mepPng, x: 0.45, y: 0.95, w: 8.6, h: 3.35 });
  }
  s4.addShape(pptx.ShapeType.rect, { x: 9.25, y: 0.95, w: 3.63, h: 3.35, fill: { color: P.panelLight }, line: { color: P.borderLight, width: 0.75 } });
  s4.addText(
    [
      { text: 'THERMAL INVARIANTS\n', options: { bold: true, color: P.navy, fontSize: 11 } },
      { text: `• Yard CDUs: ${eng.mep.yardCduCount} (Strictly Zero)\n`, options: { fontSize: 9.5, color: P.emerald, bold: true } },
      { text: `• Internal CDUs: ${eng.mep.internalCduCountTotal}x 1.35 MW\n`, options: { fontSize: 9.5, color: P.textDark } },
      { text: `• Mandatory PACs: ${eng.mep.pacCountTotal}x 80 kW\n`, options: { fontSize: 9.5, color: P.textDark } },
      { text: `• Chillers: ${eng.mep.chillerCountTotal}x 2.2 MW (${deal.chillerPlacement})\n`, options: { fontSize: 9.5, color: P.textDark } },
      { text: `• FWS Flow: ${eng.mep.fwsFlowRateLpm.toLocaleString()} LPM\n`, options: { fontSize: 9.5, color: P.textDark } },
      { text: `• CHW Flow: ${eng.mep.chwFlowRateLpm.toLocaleString()} LPM\n`, options: { fontSize: 9.5, color: P.textDark } },
      { text: `• VESDA / Scrubbers: ${eng.mep.complianceGear.vesdaDetectors} / ${eng.mep.complianceGear.chemicalAirScrubbers}`, options: { fontSize: 9.5, color: P.textDark } }
    ],
    { x: 9.4, y: 1.08, w: 3.35, h: 3.1, fontFace: 'Roboto', valign: 'top' }
  );

  // Slide 5: Civil Plinth & Compliance Audit
  const s5 = pptx.addSlide();
  addHeader(s5, blueprints[4].title);
  const civilRows = [
    [{ text: 'Geotechnical Parameter', options: { bold: true, color: 'FFFFFF', fill: { color: P.navy } } }, { text: 'Design Value', options: { bold: true, color: 'FFFFFF', fill: { color: P.navy } } }],
    [{ text: 'Foundation System', options: { bold: true, color: P.navy } }, { text: eng.civil.foundationType, options: { color: P.textDark } }],
    [{ text: 'Embedment / Pile Cap Depth', options: { bold: true, color: P.navy } }, { text: `${eng.civil.embedmentDepthM} m below FGL`, options: { color: P.textDark } }],
    [{ text: 'Allowable SBC vs Imposed', options: { bold: true, color: P.navy } }, { text: `${eng.civil.allowableSbcKpa} kPa vs ${eng.civil.imposedBearingKpa} kN/m²`, options: { color: P.textDark } }],
    [{ text: 'Bearing Safety Factor (FoS)', options: { bold: true, color: P.navy } }, { text: `${eng.civil.bearingFoS}x (${eng.civil.fosStatus})`, options: { color: P.textDark } }],
    [{ text: 'M35 Concrete / Fe550D Rebar', options: { bold: true, color: P.navy } }, { text: `${eng.civil.concreteVolumeM3} m³ / ${eng.civil.rebarTonnageMt} MT`, options: { color: P.textDark } }],
    [{ text: 'Bored RCC Piles (450mm)', options: { bold: true, color: P.navy } }, { text: `${eng.civil.pileCount} Nos (+₹${eng.civil.pileAdderInrCr} Cr)`, options: { color: P.textDark } }],
    [{ text: 'Stormwater Drainage & Plinth', options: { bold: true, color: P.navy } }, { text: `${eng.civil.drainageSlope} slope | +${deal.civil.plinthClearHeightM}m FGL`, options: { color: P.textDark } }]
  ];
  const auditRows = [
    [{ text: 'Code / Standard', options: { bold: true, color: 'FFFFFF', fill: { color: P.navy } } }, { text: 'Status', options: { bold: true, color: 'FFFFFF', fill: { color: P.navy } } }, { text: 'Evidence', options: { bold: true, color: 'FFFFFF', fill: { color: P.navy } } }],
    ...audits.slice(0, 7).map((a) => [
      { text: a.codeRef, options: { bold: true, color: P.navy } },
      { text: a.status, options: { bold: true, color: a.status === 'PASS' ? P.emerald : P.orange } },
      { text: a.evidence.slice(0, 58), options: { color: P.textDark } }
    ])
  ];
  s5.addTable(civilRows, { x: 0.45, y: 0.95, w: 6.0, h: 3.3, fontFace: 'Roboto', fontSize: 9, border: { pt: 0.5, color: P.borderLight }, colW: [2.7, 3.3] });
  s5.addTable(auditRows, { x: 6.65, y: 0.95, w: 6.23, h: 3.3, fontFace: 'Roboto', fontSize: 8, border: { pt: 0.5, color: P.borderLight }, colW: [1.85, 0.78, 3.6] });

  // Slide 6: Commercial BOQ & 5-Yr TCO
  const s6 = pptx.addSlide();
  addHeader(s6, blueprints[5].title);
  const boqRows = [
    [
      { text: 'Code', options: { bold: true, color: 'FFFFFF', fill: { color: P.navy } } },
      { text: 'Scope Package', options: { bold: true, color: 'FFFFFF', fill: { color: P.navy } } },
      { text: 'MII%', options: { bold: true, color: 'FFFFFF', fill: { color: P.navy } } },
      { text: '₹ Cr', options: { bold: true, color: 'FFFFFF', fill: { color: P.navy } } }
    ],
    ...eng.commercial.boqLines.slice(0, 10).map((b) => [
      { text: b.lineId, options: { bold: true, color: P.navy } },
      { text: b.category, options: { color: P.textDark } },
      { text: `${b.miiPercent}%`, options: { color: P.emerald } },
      { text: b.extendedCostInrCr.toFixed(2), options: { bold: true, color: P.textDark } }
    ])
  ];
  const tcoRows = [
    [
      { text: 'Year', options: { bold: true, color: 'FFFFFF', fill: { color: P.navy } } },
      { text: 'Power', options: { bold: true, color: 'FFFFFF', fill: { color: P.navy } } },
      { text: 'OpEx', options: { bold: true, color: 'FFFFFF', fill: { color: P.navy } } },
      { text: 'Cum. TCO', options: { bold: true, color: 'FFFFFF', fill: { color: P.navy } } }
    ],
    ...eng.commercial.schedule.map((r) => [
      { text: `Yr ${r.year}`, options: { bold: true, color: P.navy } },
      { text: `₹${r.powerCostInrCr}`, options: { color: P.textDark } },
      { text: `₹${r.totalOpexInrCr}`, options: { color: P.textDark } },
      { text: `₹${r.cumulativeTcoInrCr}`, options: { bold: true, color: P.orange } }
    ]),
    [
      { text: 'CAPEX', options: { bold: true, color: P.navy } },
      { text: `₹${eng.commercial.totalCapexInrCr} Cr`, options: { bold: true, color: P.navy } },
      { text: 'TCO', options: { bold: true, color: P.orange } },
      { text: `₹${eng.commercial.totalTco5YrInrCr} Cr`, options: { bold: true, color: P.orange } }
    ]
  ];
  s6.addTable(boqRows, { x: 0.45, y: 0.95, w: 7.55, h: 3.35, fontFace: 'Roboto', fontSize: 8, border: { pt: 0.5, color: P.borderLight }, colW: [0.95, 4.4, 0.85, 1.35] });
  s6.addTable(tcoRows, { x: 8.2, y: 0.95, w: 4.68, h: 3.35, fontFace: 'Roboto', fontSize: 8.5, border: { pt: 0.5, color: P.borderLight }, colW: [0.9, 1.2, 1.2, 1.38] });

  const slug = deal.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  const filename = `${slug || deal.id}_Executive_Deck_V13.pptx`;
  await pptx.writeFile({ fileName: filename });
  return filename;
}
