import { build15PointExecutiveSummary, runComplianceAudits } from '../engines/auditAndSummary';
import { renderCivilPlinthPng, renderElectricalSldPng, renderMepSchematicPng } from './cadCanvasRenderers';
import type { DealConfig, FullEngineeringOutput } from '../types/schema';

export async function exportEngineeringDossierPdf(
  deal: DealConfig,
  eng: FullEngineeringOutput
): Promise<string> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;

  const addPageHeader = (sectionTitle: string, pageNum: number) => {
    doc.setFillColor(0, 40, 112); // #002870 Deep Navy
    doc.rect(0, 0, pageW, 18, 'F');
    doc.setFillColor(255, 85, 57); // #FF5539 Coral-Orange
    doc.rect(0, 0, 5, 18, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`MDC CONFIGURATOR V13  |  ${sectionTitle}`, margin, 11);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Page ${pageNum}`, pageW - margin - 12, 11);
  };

  // Page 1: Executive Technical Dossier & 15-Point Summary
  addPageHeader('15-POINT EXECUTIVE ENGINEERING DOSSIER', 1);
  doc.setTextColor(0, 40, 112);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(deal.name, margin, 28);
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Client: ${deal.customer}  |  Location: ${deal.climate.city}, ${deal.climate.state}  |  Generated: ${new Date().toLocaleDateString('en-IN')}`,
    margin,
    34
  );

  // KPI strip
  const kpis = [
    ['IT Load', `${eng.mep.itLoadMw.toFixed(1)} MW`],
    ['Design PUE', eng.mep.estimatedPue.toFixed(2)],
    ['Turnkey CapEx', `INR ${eng.commercial.totalCapexInrCr} Cr`],
    ['5-Yr TCO', `INR ${eng.commercial.totalTco5YrInrCr} Cr`],
    ['BOQ MII %', `${eng.commercial.weightedBoqMiiPercent}%`]
  ];
  kpis.forEach(([lbl, val], i) => {
    const x = margin + i * 37;
    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(248, 250, 252);
    doc.rect(x, 39, 34, 16, 'FD');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(lbl, x + 2.5, 44.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 40, 112);
    doc.text(val, x + 2.5, 51.5);
    doc.setFont('helvetica', 'normal');
  });

  // 15-Point Summary list
  const points = build15PointExecutiveSummary(deal, eng);
  let y = 63;
  doc.setFontSize(9);
  for (const pt of points) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 85, 57);
    doc.text(`${String(pt.index).padStart(2, '0')}.`, margin, y);
    doc.setTextColor(0, 40, 112);
    doc.text(`${pt.category}: ${pt.headline}`, margin + 7, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.setFontSize(8);
    const wrapped = doc.splitTextToSize(pt.detail, pageW - margin * 2 - 7);
    doc.text(wrapped, margin + 7, y + 4.2);
    y += 6 + wrapped.length * 3.8;
    doc.setFontSize(9);
  }

  // Page 2: CAD Schematics (E-201 SLD & M-301 MEP & C-101 Civil)
  doc.addPage();
  addPageHeader('ENGINEERING SCHEMATICS (E-201, M-301, C-101)', 2);
  const sldPng = renderElectricalSldPng(deal, eng, { theme: 'light', width: 1200, height: 580 });
  const mepPng = renderMepSchematicPng(deal, eng, { theme: 'light', width: 1200, height: 580 });
  const civPng = renderCivilPlinthPng(deal, eng, { theme: 'light', width: 1200, height: 580 });

  if (sldPng) doc.addImage(sldPng, 'PNG', margin, 24, pageW - margin * 2, 82);
  if (mepPng) doc.addImage(mepPng, 'PNG', margin, 112, pageW - margin * 2, 82);
  if (civPng) doc.addImage(civPng, 'PNG', margin, 200, pageW - margin * 2, 82);

  // Page 3: Commercial BOQ, 5-Year TCO & Compliance Audits
  doc.addPage();
  addPageHeader('COMMERCIAL BOQ, 5-YEAR TCO & COMPLIANCE AUDITS', 3);

  let ty = 28;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 40, 112);
  doc.text('Turnkey Engineering Bill of Quantities (BOQ)', margin, ty);
  ty += 5;

  doc.setFillColor(0, 40, 112);
  doc.rect(margin, ty, pageW - margin * 2, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text('Code', margin + 2, ty + 4.8);
  doc.text('Package & Scope', margin + 20, ty + 4.8);
  doc.text('Qty', margin + 126, ty + 4.8);
  doc.text('MII%', margin + 146, ty + 4.8);
  doc.text('INR Cr', margin + 163, ty + 4.8);
  ty += 7;

  doc.setFont('helvetica', 'normal');
  for (const line of eng.commercial.boqLines) {
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, ty + 6.5, pageW - margin, ty + 6.5);
    doc.setTextColor(15, 23, 42);
    doc.text(line.lineId, margin + 2, ty + 4.6);
    doc.text(line.description.slice(0, 62), margin + 20, ty + 4.6);
    doc.text(`${line.quantity} ${line.unit}`, margin + 126, ty + 4.6);
    doc.text(`${line.miiPercent}%`, margin + 146, ty + 4.6);
    doc.setFont('helvetica', 'bold');
    doc.text(line.extendedCostInrCr.toFixed(2), margin + 163, ty + 4.6);
    doc.setFont('helvetica', 'normal');
    ty += 6.8;
  }

  ty += 4;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 40, 112);
  doc.text(
    `Equipment Subtotal: INR ${eng.commercial.equipmentSubtotalInrCr} Cr  |  Pre-Tax CapEx: INR ${eng.commercial.preTaxCapexInrCr} Cr  |  Total CapEx (incl. ${deal.commercial.gstPct}% GST): INR ${eng.commercial.totalCapexInrCr} Cr`,
    margin,
    ty
  );

  // 5-Yr TCO summary
  ty += 12;
  doc.setFontSize(10);
  doc.text(`${deal.commercial.tcoYears}-Year TCO Projection`, margin, ty);
  ty += 5;
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, ty, pageW - margin * 2, 6.5, 'F');
  doc.setFontSize(8);
  doc.text('Year', margin + 2, ty + 4.5);
  doc.text('Power (INR Cr)', margin + 24, ty + 4.5);
  doc.text('O&M + AMC', margin + 62, ty + 4.5);
  doc.text('Water', margin + 96, ty + 4.5);
  doc.text('Annual OpEx', margin + 122, ty + 4.5);
  doc.text('Cumulative TCO', margin + 154, ty + 4.5);
  ty += 6.5;

  doc.setFont('helvetica', 'normal');
  for (const row of eng.commercial.schedule) {
    doc.setTextColor(15, 23, 42);
    doc.text(`Year ${row.year}`, margin + 2, ty + 4.4);
    doc.text(row.powerCostInrCr.toFixed(2), margin + 24, ty + 4.4);
    doc.text((row.omCostInrCr + row.amcCostInrCr).toFixed(2), margin + 62, ty + 4.4);
    doc.text(row.waterCostInrCr.toFixed(2), margin + 96, ty + 4.4);
    doc.text(row.totalOpexInrCr.toFixed(2), margin + 122, ty + 4.4);
    doc.setFont('helvetica', 'bold');
    doc.text(`INR ${row.cumulativeTcoInrCr.toFixed(2)} Cr`, margin + 154, ty + 4.4);
    doc.setFont('helvetica', 'normal');
    ty += 6;
  }

  // Compliance Audit Summary
  ty += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 40, 112);
  doc.text('Uptime Tier, BIS & NBC Compliance Verification', margin, ty);
  ty += 6;
  doc.setFontSize(8);
  for (const aud of runComplianceAudits(deal, eng)) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(aud.status === 'PASS' ? 0 : 255, aud.status === 'PASS' ? 140 : 85, aud.status === 'PASS' ? 110 : 57);
    doc.text(`[${aud.status}]`, margin, ty);
    doc.setTextColor(15, 23, 42);
    doc.text(`${aud.codeRef}: `, margin + 14, ty);
    doc.setFont('helvetica', 'normal');
    doc.text(aud.evidence.slice(0, 82), margin + 62, ty);
    ty += 5.5;
  }

  const slug = deal.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  const filename = `${slug || deal.id}_Engineering_Dossier_V13.pdf`;
  doc.save(filename);
  return filename;
}
