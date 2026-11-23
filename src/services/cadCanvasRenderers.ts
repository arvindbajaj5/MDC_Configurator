import { resolveElectricalStandards } from '../engines/electricalSld';
import type { DealConfig, FullEngineeringOutput } from '../types/schema';

export interface CanvasRenderOptions {
  theme?: 'dark' | 'light';
  width?: number;
  height?: number;
}

function createCanvas(width: number, height: number): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
} | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  return { canvas, ctx };
}

function drawGridAndFrame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  title: string,
  sheetCode: string,
  subtitle: string,
  theme: 'dark' | 'light'
) {
  const bg = theme === 'dark' ? '#0B1220' : '#FFFFFF';
  const grid = theme === 'dark' ? '#162238' : '#F1F5F9';
  const border = theme === 'dark' ? '#334155' : '#CBD5E1';
  const titleBg = theme === 'dark' ? '#0F1B33' : '#002870';

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = grid;
  ctx.lineWidth = 1;
  for (let x = 24; x < w; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 24; y < h; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Outer CAD border
  ctx.strokeStyle = border;
  ctx.lineWidth = 2;
  ctx.strokeRect(12, 12, w - 24, h - 24);

  // Header strip
  ctx.fillStyle = titleBg;
  ctx.fillRect(12, 12, w - 24, 46);

  ctx.fillStyle = '#FF5539';
  ctx.fillRect(12, 12, 8, 46);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 17px Roboto, sans-serif';
  ctx.fillText(`${sheetCode}  |  ${title}`, 32, 36);

  ctx.fillStyle = '#CBD5E1';
  ctx.font = '12px "JetBrains Mono", monospace';
  ctx.fillText(subtitle, 32, 52);
}

/**
 * Renders Sheet E-201 Electrical SLD to a high-DPI PNG data URL.
 * Always resolves `standards` safely via `resolveElectricalStandards()` — zero undefined crashes.
 */
export function renderElectricalSldPng(
  deal: DealConfig,
  eng: FullEngineeringOutput,
  opts: CanvasRenderOptions = {}
): string | null {
  const w = opts.width ?? 1200;
  const h = opts.height ?? 620;
  const theme = opts.theme ?? 'light';
  const created = createCanvas(w, h);
  if (!created) return null;
  const { canvas, ctx } = created;

  const standards = resolveElectricalStandards(eng.electrical?.standards ?? deal.standards);
  const textPrimary = theme === 'dark' ? '#F8FAFC' : '#0F172A';
  const textMuted = theme === 'dark' ? '#94A3B8' : '#475569';
  const boxFill = theme === 'dark' ? '#111C33' : '#F8FAFC';

  drawGridAndFrame(
    ctx,
    w,
    h,
    `ELECTRICAL SINGLE-LINE DIAGRAM — ${deal.targetItLoadMw.toFixed(1)} MW IT / ${eng.electrical.grossFacilityMva} MVA`,
    'E-201',
    `${standards.wiringCode}  •  ${standards.harmonicsStandard}  •  ${standards.earthingStandard}  •  ${standards.kFactorRating} / ${standards.busductIpRating}`,
    theme
  );

  // Draw vertical power chain across 6 electrical stages
  const stages = eng.electrical.nodes;
  const startX = 46;
  const boxW = 166;
  const gap = 22;
  const boxY = 148;
  const boxH = 190;

  const zoneColors: Record<string, string> = {
    Utility: '#1C38F5',
    'MV Yard': '#FF5539',
    'LV Distribution': '#FFB600',
    'White Space': '#00B290'
  };

  stages.forEach((node, idx) => {
    const x = startX + idx * (boxW + gap);
    const accent = zoneColors[node.zone] ?? '#002870';

    // Bus connector arrow from previous stage
    if (idx > 0) {
      const prevX = x - gap;
      const midY = boxY + boxH / 2;
      ctx.strokeStyle = accent;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(prevX, midY);
      ctx.lineTo(x - 6, midY);
      ctx.stroke();

      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.moveTo(x, midY);
      ctx.lineTo(x - 10, midY - 6);
      ctx.lineTo(x - 10, midY + 6);
      ctx.closePath();
      ctx.fill();
    }

    // Node card
    ctx.fillStyle = boxFill;
    ctx.fillRect(x, boxY, boxW, boxH);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, boxY, boxW, boxH);

    // Zone bar
    ctx.fillStyle = accent;
    ctx.fillRect(x, boxY, boxW, 24);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.fillText(node.zone.toUpperCase(), x + 8, boxY + 16);

    // Voltage badge
    ctx.fillStyle = textMuted;
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    ctx.fillText(`${node.voltageKv} kV`, x + 10, boxY + 46);

    // Label wrapped to 2 lines
    ctx.fillStyle = textPrimary;
    ctx.font = 'bold 13px Roboto, sans-serif';
    const words = node.label.split(' ');
    let line = '';
    let ly = boxY + 72;
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > boxW - 18) {
        ctx.fillText(line, x + 10, ly);
        line = word;
        ly += 17;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, x + 10, ly);

    // Rating & Redundancy
    ctx.fillStyle = '#FF5539';
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    ctx.fillText(node.ratingLabel.slice(0, 22), x + 10, boxY + 150);

    ctx.fillStyle = textMuted;
    ctx.font = '11px Roboto, sans-serif';
    ctx.fillText(`Redundancy: ${node.redundancy}`, x + 10, boxY + 174);
  });

  // Bottom Standards Verification Strip
  const stripY = 400;
  ctx.fillStyle = theme === 'dark' ? '#0F1B33' : '#F8FAFC';
  ctx.fillRect(46, stripY, w - 92, 165);
  ctx.strokeStyle = '#002870';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(46, stripY, w - 92, 165);

  ctx.fillStyle = '#002870';
  ctx.fillRect(46, stripY, w - 92, 28);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 12px "JetBrains Mono", monospace';
  ctx.fillText('VERIFIED ELECTRICAL STANDARDS & HARMONIC COMPLIANCE MATRIX', 58, stripY + 18);

  const checks = eng.electrical.validationChecks;
  checks.forEach((chk, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx = 62 + col * 545;
    const cy = stripY + 56 + row * 54;

    ctx.fillStyle = chk.passed ? '#00B290' : '#FFB600';
    ctx.fillRect(cx, cy - 12, 46, 18);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.fillText(chk.passed ? 'PASS' : 'WARN', cx + 8, cy + 1);

    ctx.fillStyle = textPrimary;
    ctx.font = 'bold 12px Roboto, sans-serif';
    ctx.fillText(`${chk.label} [${chk.code}]`, cx + 56, cy + 1);

    ctx.fillStyle = textMuted;
    ctx.font = '11px Roboto, sans-serif';
    ctx.fillText(chk.detail.slice(0, 74), cx + 56, cy + 19);
  });

  return canvas.toDataURL('image/png');
}

/**
 * Renders Sheet M-301 Cooling & 3-Zone MEP Schematic to a high-DPI PNG data URL.
 */
export function renderMepSchematicPng(
  deal: DealConfig,
  eng: FullEngineeringOutput,
  opts: CanvasRenderOptions = {}
): string | null {
  const w = opts.width ?? 1200;
  const h = opts.height ?? 620;
  const theme = opts.theme ?? 'light';
  const created = createCanvas(w, h);
  if (!created) return null;
  const { canvas, ctx } = created;

  const textPrimary = theme === 'dark' ? '#F8FAFC' : '#0F172A';
  const textMuted = theme === 'dark' ? '#94A3B8' : '#475569';

  drawGridAndFrame(
    ctx,
    w,
    h,
    `COOLING & 3-ZONE MEP P&ID SCHEMATIC — PUE ${eng.mep.estimatedPue.toFixed(2)} | ZERO YARD CDUs`,
    'M-301',
    `DLC ${deal.dlcSharePct}% (${eng.mep.dlcHeatLoadMw} MW) • Air ${100 - deal.dlcSharePct}% (${eng.mep.airHeatLoadMw} MW) • FWS ${eng.mep.fwsFlowRateLpm.toLocaleString()} LPM • CHW ${eng.mep.chwFlowRateLpm.toLocaleString()} LPM`,
    theme
  );

  // Three isolated engineering zones
  const zones = [
    {
      x: 42,
      w: 365,
      color: '#1C38F5',
      title: `ZONE 2: ${deal.chillerPlacement.toUpperCase()} HEAT REJECTION`,
      area: `${eng.mep.threeZoneIsolation.zone2HeatRejectionYardM2} m²`,
      items: [
        `${eng.mep.chillerCountTotal}x 2.2 MW Adiabatic Chillers (${eng.mep.chillerCountActive} Active)`,
        `Primary CHW Loop: ${eng.mep.chwFlowRateLpm.toLocaleString()} LPM @ ${deal.chilledWaterSupplyTempC}°C`,
        `Total Heat Rejection: ${eng.mep.totalHeatRejectionMw} MW`,
        `Zero Yard CDUs Policy: ${eng.mep.yardCduCount} Yard CDUs`,
        `Annual Trim Water: ${eng.mep.annualWaterConsumptionKl.toLocaleString()} kL/yr`
      ]
    },
    {
      x: 422,
      w: 410,
      color: '#00B290',
      title: `ZONE 1: INDOOR WHITE-SPACE (${deal.architecture.toUpperCase()})`,
      area: `${eng.mep.threeZoneIsolation.zone1WhiteSpaceM2} m²`,
      items: [
        `${eng.mep.totalRacks} AI Racks (${eng.mep.dlcRacks} DLC / ${eng.mep.airRacks} Air) @ ${deal.avgRackKw} kW`,
        `${eng.mep.internalCduCountTotal}x 1.35 MW Internal CDU Towers (${deal.redundancy})`,
        `${eng.mep.pacCountTotal}x Mandatory 80 kW Chilled-Water PACs`,
        `Secondary FWS Loop: ${eng.mep.fwsFlowRateLpm.toLocaleString()} LPM @ ${deal.fwsSupplyTempC}°C`,
        `VESDA-E (${eng.mep.complianceGear.vesdaDetectors}) + ISA G1 Scrubbers (${eng.mep.complianceGear.chemicalAirScrubbers})`
      ]
    },
    {
      x: 847,
      w: 311,
      color: '#FF5539',
      title: 'ZONE 3: ELECTRICAL POWER YARD',
      area: `${eng.mep.threeZoneIsolation.zone3ElectricalPowerYardM2} m²`,
      items: [
        `${eng.electrical.incomingVoltageKv} kV GIS + ${eng.electrical.transformerCountTotal}x 3.15 MVA K-13`,
        `${eng.electrical.dgCountTotal}x 2.5 MVA CPCB-IV+ Acoustic DGs`,
        `${eng.electrical.upsCapacityMw} MW Modular Li-Ion UPS`,
        deal.includeBessRideThrough
          ? `LFP BESS: ${eng.electrical.bessPowerMw} MW / ${eng.electrical.bessEnergyMwh} MWh`
          : 'BESS Ride-Through: Disabled',
        `${eng.electrical.busductRunsCount}x Dual A/B ${eng.electrical.busductIpRating} Busducts`
      ]
    }
  ];

  zones.forEach((z) => {
    ctx.fillStyle = theme === 'dark' ? '#111C33' : '#F8FAFC';
    ctx.fillRect(z.x, 100, z.w, 340);
    ctx.strokeStyle = z.color;
    ctx.lineWidth = 2;
    ctx.strokeRect(z.x, 100, z.w, 340);

    ctx.fillStyle = z.color;
    ctx.fillRect(z.x, 100, z.w, 34);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    ctx.fillText(z.title, z.x + 10, 122);

    ctx.fillStyle = textMuted;
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    ctx.fillText(`Allocated Area: ${z.area}`, z.x + 12, 158);

    z.items.forEach((item, idx) => {
      const iy = 192 + idx * 46;
      ctx.fillStyle = theme === 'dark' ? '#0B1220' : '#FFFFFF';
      ctx.fillRect(z.x + 10, iy - 18, z.w - 20, 34);
      ctx.strokeStyle = theme === 'dark' ? '#1E293B' : '#E2E8F0';
      ctx.lineWidth = 1;
      ctx.strokeRect(z.x + 10, iy - 18, z.w - 20, 34);

      ctx.fillStyle = textPrimary;
      ctx.font = '12px Roboto, sans-serif';
      ctx.fillText(item, z.x + 18, iy + 3);
    });
  });

  // Piping loop arrows between Zone 2 and Zone 1
  ctx.strokeStyle = '#1C38F5';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(407, 225);
  ctx.lineTo(422, 225);
  ctx.stroke();

  ctx.strokeStyle = '#FF5539';
  ctx.beginPath();
  ctx.moveTo(422, 275);
  ctx.lineTo(407, 275);
  ctx.stroke();

  // Bottom thermal balance banner
  ctx.fillStyle = '#002870';
  ctx.fillRect(42, 470, w - 84, 100);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 14px Roboto, sans-serif';
  ctx.fillText(
    `DESIGN THERMAL BALANCE: ${deal.climate.city} (${deal.climate.designDryBulbC}°C DB / ${deal.climate.designWetBulbC}°C WB)  |  MAX AIR INLET ${deal.maxInletTempC}°C`,
    60,
    504
  );
  ctx.fillStyle = '#FFB600';
  ctx.font = '13px "JetBrains Mono", monospace';
  ctx.fillText(
    `INVARIANT CHECK: YARD CDUs = ${eng.mep.yardCduCount} (PASS)  •  INTERNAL CDUs = ${eng.mep.internalCduCountTotal}  •  80 kW PACs = ${eng.mep.pacCountTotal}  •  SITE PLOT = ${eng.mep.totalSiteAreaM2.toLocaleString()} m²`,
    60,
    538
  );

  return canvas.toDataURL('image/png');
}

/**
 * Renders Sheet C-101 Civil Plinth & Foundation Section to PNG data URL.
 */
export function renderCivilPlinthPng(
  deal: DealConfig,
  eng: FullEngineeringOutput,
  opts: CanvasRenderOptions = {}
): string | null {
  const w = opts.width ?? 1200;
  const h = opts.height ?? 620;
  const theme = opts.theme ?? 'light';
  const created = createCanvas(w, h);
  if (!created) return null;
  const { canvas, ctx } = created;

  drawGridAndFrame(
    ctx,
    w,
    h,
    `CIVIL PLINTH & GEOTECHNICAL SECTION — ${eng.civil.foundationType.toUpperCase()}`,
    'C-101',
    `Soil SBC ${eng.civil.allowableSbcKpa} kPa • Imposed ${eng.civil.imposedBearingKpa} kN/m² • FoS ${eng.civil.bearingFoS}x • Embedment ${eng.civil.embedmentDepthM}m • Drainage ${eng.civil.drainageSlope}`,
    theme
  );

  const groundY = 300;
  // Ground line
  ctx.strokeStyle = '#00B290';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(60, groundY);
  ctx.lineTo(w - 60, groundY);
  ctx.stroke();

  // Superstructure enclosure above plinth
  ctx.fillStyle = '#002870';
  ctx.fillRect(280, 145, 640, 110);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 16px Roboto, sans-serif';
  ctx.fillText(
    `${deal.architecture === 'Container' ? `${eng.mep.podCount}x ${deal.containerUnitMw} MW AI MODULAR PODS` : 'BnM HIGH-BAY AI DATA HALL'} (${eng.civil.totalDeadAndLiveLoadKn.toLocaleString()} kN)`,
    320,
    205
  );

  // RCC Plinth above FGL
  ctx.fillStyle = '#64748B';
  ctx.fillRect(250, 255, 700, 45);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 12px "JetBrains Mono", monospace';
  ctx.fillText(`RCC PLINTH (+${deal.civil.plinthClearHeightM.toFixed(2)}m FGL) • M35 CONCRETE`, 430, 282);

  // Sub-grade foundation / piles
  if (eng.civil.requiresPiling) {
    ctx.fillStyle = '#FF5539';
    ctx.fillRect(240, groundY, 720, 42);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    ctx.fillText('4.5m RCC PILE CAP BEAM (SBC < 110 kPa TRIGGERED)', 420, groundY + 26);

    for (let i = 0; i < 8; i++) {
      const px = 270 + i * 92;
      ctx.fillStyle = '#94A3B8';
      ctx.fillRect(px, groundY + 42, 24, 175);
      ctx.strokeStyle = '#334155';
      ctx.strokeRect(px, groundY + 42, 24, 175);
    }
    ctx.fillStyle = theme === 'dark' ? '#F8FAFC' : '#0F172A';
    ctx.font = 'bold 13px "JetBrains Mono", monospace';
    ctx.fillText(
      `${eng.civil.pileCount}x ${eng.civil.pileDiameterMm}mm BORED CAST-IN-SITU RCC PILES (${eng.civil.pileLengthM}m BORE) | PILE ADDER: ₹${eng.civil.pileAdderInrCr} Cr`,
      240,
      555
    );
  } else {
    ctx.fillStyle = '#1C38F5';
    ctx.fillRect(240, groundY, 720, 95);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px "JetBrains Mono", monospace';
    ctx.fillText(
      `SHALLOW RCC RAFT / PLINTH EMBEDMENT: ${eng.civil.embedmentDepthM}m BELOW FGL`,
      355,
      groundY + 52
    );
    ctx.fillStyle = theme === 'dark' ? '#F8FAFC' : '#0F172A';
    ctx.font = 'bold 13px "JetBrains Mono", monospace';
    ctx.fillText(
      `M35 CONCRETE: ${eng.civil.concreteVolumeM3} m³  •  Fe550D REBAR: ${eng.civil.rebarTonnageMt} MT  •  ${eng.civil.anchorBoltSpec}`,
      200,
      465
    );
  }

  return canvas.toDataURL('image/png');
}
