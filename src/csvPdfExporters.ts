import { jsPDF } from 'jspdf';
import type { EngineeringResult, MasterStandards, ProjectDeal } from '../types/mdc';
import { formatMoney } from './engineeringEngine';
import { generatePartnerRfqCsv } from './supplyMatcher';

export function build15PointSummaryRows(project: ProjectDeal, eng: EngineeringResult): [string, string][] {
  const isBnM = eng.civil.isBnM;
  return [
    [
      '1. Total IT Load (DLC vs. AC Split)',
      `${(eng.totalDesignContKw / 1000).toFixed(2)} MW Continuous TDP (${(eng.totalActualKw / 1000).toFixed(2)} MW Actual) — ${(eng.dlcDesignKw / 1000).toFixed(2)} MW DLC + ${(eng.acDesignKw / 1000).toFixed(2)} MW Air-Cooled`
    ],
    [
      '2. Racks & Enclosures (DLC / AC)',
      `${eng.dlcRacks.length} DLC Racks across ${eng.dlcPods.length} ${isBnM ? 'BnM Bays' : 'DLC Pods'}  |  ${eng.acRacks.length} AC Racks across ${eng.acPods.length} ${isBnM ? 'BnM Bays' : 'AC Pods'}`
    ],
    [
      '3. Overall Annualized & Peak PUE',
      `PUE ${eng.pueAnnualized} Annualized (weighted across 12-month ASHRAE profile)  |  Peak Design PUE: ${eng.puePeakDesign}`
    ],
    [
      '4. Max Inlet Coolant Temp Maintained',
      `${eng.effectiveSupplyTempC}°C Target Supply (Governing Active SKU Limit: ${eng.governingMaxInletTempC}°C) — ${eng.inletTempViolation ? 'EXCEEDS RACK LIMIT' : 'Within Rack Envelope'}`
    ],
    [
      '5. Extreme Weather & Hydraulics',
      `${eng.coolingMode} | ${eng.totalWaterStorageKl} kL Tanks (${project.waterAutonomyDays}d) | ${Math.round(eng.totalFlowLpm)} LPM @ ${eng.pumpDesignHeadBar} bar TDH`
    ],
    [
      '6. Container / BnM Bay Dimensions',
      eng.pods[0]
        ? `${isBnM ? `BnM Hall ${project.bnmHallLengthM}m × ${project.bnmHallWidthM}m × ${project.bnmClearSoffitM}m H (Floor #${project.bnmFloorLevel}, ${project.bnmColumnGridM})` : `${(eng.pods[0].extLengthMm / 1000).toFixed(2)}m L × ${(eng.pods[0].extWidthMm / 1000).toFixed(2)}m W × ${(eng.pods[0].extHeightMm / 1000).toFixed(2)}m H (${eng.containerTotalVolumeCum} m³ total, ${project.metallurgy})`} • ${eng.civil.unitGrossTonnes}T loaded • ${eng.raisedFloor.enabled ? `${eng.raisedFloor.heightMm}mm Raised Floor (${eng.raisedFloor.pedestalStemCount} stems)` : 'Slab-Mounted'}`
        : 'Configure racks to size'
    ],
    [
      '7. Additional Non-IT Containers',
      `${eng.upsContainersCount} Modular UPS Pods (${eng.selUps.ratedCapacity} kVA)  |  ${eng.batteryContainersCount} ${project.batteryChemistry} BESS Pods (${project.batteryRuntimeMin}m)  |  Admin/NOC: ${project.includeAdminModule ? 'Yes' : 'No'}  |  Staging Bay: ${project.includeStagingModule ? 'Yes' : 'No'}`
    ],
    [
      '8. IT White-Space Area & Internal MEP',
      `${eng.totalItWhiteSpaceSqm} m² Total White-Space (${Math.round(eng.activeRackFootprintSqm)} m² Racks + ${Math.round(eng.aisleServiceAreaSqm)} m² Aisles + ${Math.round(eng.futureGrowthAreaSqm)} m² Growth [${project.futureGrowthReservePct}%] + ${eng.whiteSpace.internalCduCount} Internal CDUs & ${eng.whiteSpace.mandatoryPacCount} PACs)`
    ],
    [
      '9. Technical Yard Layout & Total m²',
      `${eng.totalNonItYardSqm} m² Separated Non-IT Yard (Coolers: ${eng.yardBreakdown.coolerChillerSqm}m², Tanks: ${eng.yardBreakdown.waterTankSqm}m², Substation: ${eng.yardBreakdown.substationSqm}m², UPS/BESS: ${eng.yardBreakdown.upsBessSqm}m², DGs/PESO: ${eng.yardBreakdown.dgPesoSqm}m²) — Total Campus: ${eng.totalCampusOccupiedSqm} m² (${eng.plotUtilizationPct}% Plot)`
    ],
    [
      '10. Redundancy Management (Uptime Tier)',
      `${project.uptimeTier} — Trafos: ${eng.trafoCalc.activeN}+${eng.trafoCalc.redundantR} | UPS: ${eng.upsCalc.activeN}+${eng.upsCalc.redundantR} | DGs: ${eng.dgCalc.activeN}+${eng.dgCalc.redundantR} (${eng.effectiveDgKva}kVA derated) | Coolers: ${eng.coolerCalc.activeN}+${eng.coolerCalc.redundantR}`
    ],
    [
      '11. Cabling, Telecom MMR & Plumbing',
      `Overhead Dual A/B Busways + ${eng.telecom.mmrRoomsCount} Carrier MMR (${eng.telecom.odfBaysCount}× ${project.odfCoreDensity}F ODF, Diverse Vaults) | SS316L Manifolds + Factory-Isolated PG25`
    ],
    [
      '12. Data Center Management (IBMS)',
      `${project.includeIntegratedBms ? 'Integrated IBMS, DCIM, EPMS & PLC/SCADA Telemetry' : 'Standard Telemetry'}  |  ${project.includeLeakRope ? 'Addressable Conductive Liquid Leak-Detection Ropes' : 'Point Leak Sensors'}`
    ],
    [
      '13. Civil, Seismic & Regulatory De-Risking',
      `${eng.civil.foundationType} (FoS ${eng.civil.bearingSafetyFactor}×) | +${eng.civil.floodPlinthMm}mm Flood Plinth | VESDA + ${eng.novecGasKg} kg Novec 1230 | K12 Mantrap | ${project.seismicLabel} | ${project.setbackMeters}m Fire Lane | <= 65 dBA CPCB`
    ],
    [
      '14. Operations, AMC & MII Compliance',
      `${project.includeAmcContract ? `${project.amcYears}-Yr AMC (${project.residentHeadcount} Resident Staff)` : 'Self-Operated'} | Make-in-India: ${eng.mii.miiClassLabel} | ${eng.totalHsdFuelLitres.toLocaleString()} L PESO Fuel (${project.dgAutonomyHours}h)`
    ],
    [
      '15. City / Location & ASHRAE Profile',
      `${project.cityQuery} (${project.lat}°N, ${project.lon}°E, Elev ${project.elevationM}m) — Peak ${project.peakDryBulb}°C DB / ${project.peakWetBulb}°C WB (${project.relHumidityPct}% RH) — Annual Water: ${eng.annualWaterKl.toLocaleString()} kL`
    ]
  ];
}

export function triggerCsvDownload(filename: string, rows: string[][]): void {
  const csv = rows
    .map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportEngineeringBomCsv(project: ProjectDeal, eng: EngineeringResult): void {
  const header = ['Category', 'Subsystem / Item', 'Make', 'Model', 'Technical Specifications', 'MII %', 'Qty'];
  const rows = eng.bomItems.map(it => [
    it.category,
    it.label,
    it.make,
    it.model,
    it.specs,
    `${it.miiPct}%`,
    String(it.qty)
  ]);
  triggerCsvDownload(`${project.name.replace(/[^a-zA-Z0-9_-]+/g, '_')}_Engineering_BOM.csv`, [header, ...rows]);
}

export function exportCommercialPriceCsv(project: ProjectDeal, eng: EngineeringResult): void {
  const header = [
    'Category',
    'Item Description',
    'Make',
    'Model',
    'Qty',
    'Master Base Cost (INR)',
    'Deal Unit Cost (INR)',
    'Special Quote Notes',
    'Pre-Tax Total (INR)',
    `GST (${project.gstPct}%)`,
    'Grand Total Incl. GST (INR)'
  ];
  const rows = eng.bomItems.map(it => [
    it.category,
    it.label,
    it.make,
    it.model,
    String(it.qty),
    String(Math.round(it.masterUnitCost)),
    String(Math.round(it.unitCost)),
    it.comments || (it.isPlaceholder ? 'Market-Scout Placeholder ROM' : ''),
    String(Math.round(it.sellingPreTax)),
    String(Math.round(it.gstAmt)),
    String(Math.round(it.grandTotalInclGst))
  ]);
  triggerCsvDownload(`${project.name.replace(/[^a-zA-Z0-9_-]+/g, '_')}_Commercial_Price_Sheet.csv`, [header, ...rows]);
}

export function export15PointSummaryCsv(project: ProjectDeal, eng: EngineeringResult): void {
  const summaryRows = build15PointSummaryRows(project, eng);
  triggerCsvDownload(`${project.name.replace(/[^a-zA-Z0-9_-]+/g, '_')}_15Point_Solution_Summary.csv`, [
    ['Parameter', 'Engineered Specification'],
    ...summaryRows
  ]);
}

export function exportDealPartnerRfqCsv(project: ProjectDeal, eng: EngineeringResult): void {
  const csv = generatePartnerRfqCsv(project.name, project.cityQuery, eng.dealPlaceholders);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.name.replace(/[^a-zA-Z0-9_-]+/g, '_')}_Partner_RFQ_MarketScout.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Multi-Page Engineering & Commercial PDF Dossier (jsPDF)
 */
export function exportEngineeringPdfDossier(
  project: ProjectDeal,
  eng: EngineeringResult,
  standards: MasterStandards
): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const drawPageHeader = (title: string, subTitle: string, pageNum: number) => {
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageW, pageH, 'F');
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(title, 14, 15);
    doc.setTextColor(255, 85, 57);
    doc.setFontSize(11);
    doc.text(subTitle, 14, 22);
    doc.setDrawColor(255, 85, 57);
    doc.setLineWidth(0.6);
    doc.line(14, 25, pageW - 14, 25);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(
      `${project.name} • ${project.client || 'Enterprise Authority'} • ${project.cityQuery} (${project.seismicZone})`,
      14,
      pageH - 8
    );
    doc.text(`Page ${pageNum}`, pageW - 24, pageH - 8);
  };

  // Page 1: 15-Point Executive Solution Summary
  drawPageHeader(
    '1. Executive Engineering & Commercial Dossier — 15-Point Summary',
    `${project.shellArchitecture === 'BnM_Hall' ? 'Brick-and-Mortar Hall' : 'Modular ISO Containers'} • ${(eng.totalDesignContKw / 1000).toFixed(2)} MW IT • ${project.uptimeTier}`,
    1
  );

  const summaryRows = build15PointSummaryRows(project, eng);
  let y = 30;
  summaryRows.forEach(([k, v], idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor(245, 246, 248);
      doc.rect(14, y - 3.5, pageW - 28, 10, 'F');
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(0, 0, 0);
    doc.text(k, 16, y + 1);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 51, 51);
    const wrapped = doc.splitTextToSize(v, pageW - 95);
    doc.text(wrapped[0] || '', 82, y + 1);
    if (wrapped[1]) doc.text(wrapped[1], 82, y + 5);
    y += 10.5;
  });

  // Page 2: 12-Month ASHRAE Profile + Civil, Telecom, Rigging & L1-L5 Commissioning
  doc.addPage();
  drawPageHeader(
    '2. 12-Month ASHRAE Microclimate, Civil Foundation & L1–L5 Commissioning',
    `Supply <= ${eng.effectiveSupplyTempC}°C • ${eng.civil.foundationType} • MII: ${eng.mii.miiClassLabel}`,
    2
  );

  let cy = 31;
  doc.setFillColor(245, 246, 248);
  doc.rect(14, cy, pageW - 28, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.text('Month', 16, cy + 4.8);
  eng.monthlyProfile.forEach((m, i) => {
    doc.text(m.month, 44 + i * 20, cy + 4.8);
  });
  cy += 8;
  doc.setFont('helvetica', 'normal');
  doc.text('DB / WB (°C)', 16, cy + 4);
  eng.monthlyProfile.forEach((m, i) => {
    doc.text(`${m.dryBulbC}/${m.wetBulbC}`, 44 + i * 20, cy + 4);
  });
  cy += 7;
  doc.text('Water (kL)', 16, cy + 4);
  eng.monthlyProfile.forEach((m, i) => {
    doc.text(`${m.monthlyWaterKl}kL`, 44 + i * 20, cy + 4);
  });
  cy += 12;

  // Civil & Logistics Summary Box
  doc.setFillColor(245, 246, 248);
  doc.rect(14, cy, pageW - 28, 22, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);
  doc.text(
    `Civil & Structural: ${eng.civil.foundationType} | Flood Lift: +${eng.civil.floodPlinthMm}mm | Bearing FoS: ${eng.civil.bearingSafetyFactor}x (SBC ${eng.civil.sbc} kN/m2)`,
    16,
    cy + 6
  );
  doc.text(
    `Telecom & Rigging: ${eng.telecom.mmrRoomsCount} MMR (${eng.telecom.odfBaysCount}x ${project.odfCoreDensity}F ODF) | Crane: ${eng.logistics.craneTonnage}T @ ${project.craneWorkingRadiusM}m | Staging: ${eng.logistics.laydownStagingSqm} m2`,
    16,
    cy + 14
  );
  cy += 28;

  // L1-L5 Commissioning Schedule
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 85, 57);
  doc.text('L1–L5 Turnkey Commissioning & IST Sign-Off Matrix', 14, cy);
  cy += 5;
  eng.commissioningSchedule.forEach((c, idx) => {
    if (idx % 2 === 0) {
      doc.setFillColor(245, 246, 248);
      doc.rect(14, cy, pageW - 28, 11, 'F');
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(0, 0, 0);
    doc.text(c.level, 16, cy + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 51, 51);
    doc.text(`${c.scope}  [Gate: ${c.gate}]`, 16, cy + 9.2);
    cy += 12;
  });

  // Page 3: Master Equipment Schedule (Ratings, Dimensions, Weights & Rooms)
  doc.addPage();
  drawPageHeader(
    '3. Master Equipment Schedule (Ratings, Physical Dimensions, Weights & Rooms)',
    `${eng.equipmentSchedule.length} Major Subsystems • ${eng.raisedFloor.enabled ? `Raised Floor: ${eng.raisedFloor.heightMm}mm (${eng.raisedFloor.pedestalStemCount} Stems, ${eng.raisedFloor.tilePointLoadKn} kN Tiles)` : 'Slab-Mounted'}`,
    3
  );
  let ey = 30;
  doc.setFillColor(245, 246, 248);
  doc.rect(14, ey, pageW - 28, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(0, 0, 0);
  doc.text('Tag', 16, ey + 4.8);
  doc.text('Equipment & Rating', 36, ey + 4.8);
  doc.text('Room / Location', 112, ey + 4.8);
  doc.text('Make & Model', 170, ey + 4.8);
  doc.text('Dimensions (L×W×H)', 220, ey + 4.8);
  doc.text('Area / Wt', 262, ey + 4.8);
  ey += 8.5;

  eng.equipmentSchedule.slice(0, 20).forEach((eq, idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor(248, 249, 250);
      doc.rect(14, ey - 3, pageW - 28, 7.2, 'F');
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.3);
    doc.setTextColor(0, 40, 112);
    doc.text(eq.assetTag, 16, ey + 1.2);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    doc.text(`${eq.equipmentName.slice(0, 38)} (${eq.ratingAndRedundancy.slice(0, 22)})`, 36, ey + 1.2);
    doc.text(eq.location.slice(0, 32), 112, ey + 1.2);
    doc.text(`${eq.make} ${eq.model}`.slice(0, 26), 170, ey + 1.2);
    doc.text(eq.dimensionsM.slice(0, 22), 220, ey + 1.2);
    doc.text(`${eq.footprintSqm}m² / ${(eq.operatingWeightKg / 1000).toFixed(1)}T`, 262, ey + 1.2);
    ey += 7.4;
  });

  // Page 4+: Commercial BOQ & 5-Year Lifecycle TCO
  doc.addPage();
  drawPageHeader(
    '4. Consolidated Commercial Bill of Materials & 5-Year Lifecycle TCO',
    `Pre-Tax: ${formatMoney(eng.totals.sellingPreTax, project.currency, standards)} • Incl. GST: ${formatMoney(eng.totals.grandTotal, project.currency, standards)} • 5-Yr TCO: ${formatMoney(eng.fiveYearTcoInr, project.currency, standards)}`,
    4
  );

  let by = 30;
  let pg = 4;
  const drawBoqHeader = () => {
    doc.setFillColor(245, 246, 248);
    doc.rect(14, by, pageW - 28, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text('Category', 16, by + 4.8);
    doc.text('Subsystem / Scope', 72, by + 4.8);
    doc.text('Make & Model', 168, by + 4.8);
    doc.text('Qty', 222, by + 4.8);
    doc.text(`Pre-Tax (${project.currency})`, 242, by + 4.8);
    by += 8;
  };
  drawBoqHeader();

  eng.bomItems.forEach((it, idx) => {
    if (by > pageH - 22) {
      pg++;
      doc.addPage();
      drawPageHeader('3. Consolidated Commercial Bill of Materials (Continued)', project.name, pg);
      by = 30;
      drawBoqHeader();
    }
    if (idx % 2 === 1) {
      doc.setFillColor(248, 249, 250);
      doc.rect(14, by - 3, pageW - 28, 6.5, 'F');
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(51, 51, 51);
    doc.text(it.category.slice(0, 30), 16, by + 1);
    doc.text(it.label.slice(0, 52), 72, by + 1);
    doc.text(`${it.make} (${it.model})`.slice(0, 28), 168, by + 1);
    doc.text(String(it.qty), 222, by + 1);
    doc.setFont('helvetica', 'bold');
    doc.text(formatMoney(it.sellingPreTax, project.currency, standards), 242, by + 1);
    by += 6.8;
  });

  doc.save(`${(project.name || 'MDC_Proposal').replace(/[^a-zA-Z0-9_-]+/g, '_')}_Engineering_Dossier.pdf`);
}

/**
 * Per-Unit Container / BnM Bay Technical & Branding Datasheets PDF (jsPDF)
 */
export function exportPerUnitDatasheetsPdf(project: ProjectDeal, eng: EngineeringResult): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const units = eng.unitDatasheets || [];
  if (units.length === 0) {
    alert('Configure IT racks first to generate Per-Unit Datasheets.');
    return;
  }

  units.forEach((u, idx) => {
    if (idx > 0) doc.addPage();
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageW, pageH, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    doc.text(`UNIT DATASHEET: ${u.unitId} — ${project.name}`, 14, 18);

    doc.setFontSize(12);
    doc.setTextColor(255, 85, 57);
    doc.text(`${u.shellSpec} • ${u.itKw} kW Continuous IT Load (${u.rackCount} Racks)`, 14, 26);

    doc.setDrawColor(255, 85, 57);
    doc.setLineWidth(0.7);
    doc.line(14, 30, pageW - 14, 30);

    const rows: [string, string][] = [
      ['Unit Identifier', u.unitId],
      ['Customer / Authority', project.client || 'Enterprise Authority'],
      ['Site Location & Seismic Zone', `${project.cityQuery} (${project.seismicLabel})`],
      ['Enclosure / Structural Bay Spec', u.shellSpec],
      ['Continuous IT Capacity & Rack Count', `${u.itKw} kW Continuous TDP across ${u.rackCount} Racks`],
      ['Internal White-Space Cooling & CDU', u.internalEquip],
      ['Containment & Airflow Delivery', `${project.containmentType} • ${project.airflowDelivery}`],
      ['Loaded Gross Rigging Mass', `${u.grossTonnes} Tonnes (Crane: ${eng.logistics.craneTonnage}T)`],
      ['Exterior & Interior Coating Spec', u.coatingSpec],
      ['Rack Enclosure / Bezel Branding', u.rackFinish],
      ['Customer Artwork / Logo Status', u.artworkStatus],
      ['Make-in-India (MII) Compliance', eng.mii.miiClassLabel]
    ];

    let y = 38;
    rows.forEach(([k, v], rIdx) => {
      if (rIdx % 2 === 0) {
        doc.setFillColor(245, 246, 248);
        doc.rect(14, y - 4, pageW - 28, 11, 'F');
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(0, 0, 0);
      doc.text(k, 18, y + 2.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 51, 51);
      doc.text(v, 105, y + 2.5);
      y += 11.5;
    });

    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`Unit ${idx + 1} of ${units.length} • Generated by AI Modular Data Center Configurator V13.1`, 14, pageH - 8);
  });

  doc.save(`${(project.name || 'MDC').replace(/[^a-zA-Z0-9_-]+/g, '_')}_Per_Unit_Datasheets.pdf`);
}
