import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import { build15PointSummaryRows } from './csvPdfExporters';
import { formatMoney } from './engineeringEngine';
import { generateStyledXlsxBlob } from './excelExporter';
import type { EngineeringResult, MasterStandards, ProjectDeal } from '../types/mdc';
import { GOOGLE_DRIVE_SCOPE } from './drivePicker';

export type EmailChannelPref = 'outlook_desktop' | 'outlook_web' | 'gmail' | 'share_sheet';

const EMAIL_PREF_STORAGE_KEY = 'mdc_email_channel_pref_v13_4';

export function getSavedEmailChannelPref(): EmailChannelPref | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const v = window.localStorage.getItem(EMAIL_PREF_STORAGE_KEY) as EmailChannelPref | null;
    if (v === 'outlook_desktop' || v === 'outlook_web' || v === 'gmail' || v === 'share_sheet') {
      return v;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveEmailChannelPref(pref: EmailChannelPref): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(EMAIL_PREF_STORAGE_KEY, pref);
    }
  } catch {
    // Ignore
  }
}

export function isMobileOrTabletDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
}

export function buildExecutiveEmailSummaryText(
  project: ProjectDeal,
  eng: EngineeringResult,
  standards: MasterStandards
): string {
  const mw = (eng.totalDesignContKw / 1000).toFixed(2);
  const costPerMw = formatMoney(
    eng.totals.sellingPreTax / Math.max(0.05, eng.totalDesignContKw / 1000),
    project.currency,
    standards
  );
  return [
    `Proposal Package: ${project.name}`,
    `Client / Authority: ${project.client || 'Enterprise Authority'}`,
    `Site & Seismic: ${project.cityQuery} (${project.seismicZone})`,
    `Architecture & Tier: ${project.shellArchitecture === 'BnM_Hall' ? 'Brick-and-Mortar Hall' : 'Modular ISO Containers'} • ${project.uptimeTier}`,
    `Continuous IT Load: ${mw} MW (${eng.dlcRacks.length} DLC + ${eng.acRacks.length} AC racks) • Governing Inlet: ${eng.governingMaxInletTempC}°C`,
    `Annualized PUE: ${eng.pueAnnualized} (Peak ${eng.puePeakDesign}) • MII: ${eng.mii.miiClassLabel}`,
    `Commercials (Non-IT): Pre-Tax ${formatMoney(eng.totals.sellingPreTax, project.currency, standards)} | Incl. ${project.gstPct}% GST ${formatMoney(eng.totals.grandTotal, project.currency, standards)} | ~${costPerMw}/MW | 5-Yr TCO ${formatMoney(eng.fiveYearTcoInr, project.currency, standards)}`,
    `Validity: ${project.costValidityDays} days • Prepared: ${new Date().toISOString().slice(0, 10)}`
  ].join('\n');
}

function buildCompactPdfBytes(project: ProjectDeal, eng: EngineeringResult, standards: MasterStandards): Uint8Array {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(`Engineering Dossier — ${project.name}`, 14, 16);
  doc.setFontSize(10);
  doc.setTextColor(255, 85, 57);
  doc.text(
    `${project.cityQuery} (${project.seismicZone}) • ${(eng.totalDesignContKw / 1000).toFixed(2)} MW • PUE ${eng.pueAnnualized} • Pre-Tax ${formatMoney(eng.totals.sellingPreTax, project.currency, standards)}`,
    14,
    23
  );
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(8);
  let y = 31;
  build15PointSummaryRows(project, eng).forEach(([k, v], idx) => {
    if (idx % 2 === 0) {
      doc.setFillColor(245, 247, 250);
      doc.rect(14, y - 3, pageW - 28, 9, 'F');
    }
    doc.setFont('helvetica', 'bold');
    doc.text(k, 16, y + 1.5);
    doc.setFont('helvetica', 'normal');
    doc.text(doc.splitTextToSize(v, pageW - 92)[0] || '', 82, y + 1.5);
    y += 9.5;
  });
  const arrBuf = doc.output('arraybuffer');
  return new Uint8Array(arrBuf);
}

export async function buildProposalZipBlob(
  project: ProjectDeal,
  eng: EngineeringResult,
  standards: MasterStandards,
  logoDataUrl?: string
): Promise<Blob> {
  const safeBase = (project.name || 'MDC_Proposal').replace(/[^a-zA-Z0-9_-]+/g, '_');
  const xlsxBlob = await generateStyledXlsxBlob(
    [
      {
        name: '15-Point Summary',
        title: 'EXECUTIVE 15-POINT ENGINEERING SUMMARY',
        subtitle: `${project.name} • ${project.cityQuery}`,
        colWidths: [36, 96, 20],
        headers: ['Parameter', 'Specification', 'Status'],
        rows: build15PointSummaryRows(project, eng).map(([k, v]) => [{ value: k }, { value: v }, { value: 'Verified' }])
      },
      {
        name: 'Equipment Schedule',
        title: 'MASTER EQUIPMENT SCHEDULE',
        subtitle: `${eng.equipmentSchedule.length} Subsystems`,
        colWidths: [14, 34, 28, 22, 22, 14, 36],
        headers: ['Tag', 'Equipment', 'Location', 'Rating', 'Dimensions', 'Area m²', 'Key Specs'],
        rows: eng.equipmentSchedule.map(eq => [
          { value: eq.assetTag },
          { value: eq.equipmentName },
          { value: eq.location },
          { value: eq.ratingAndRedundancy },
          { value: eq.dimensionsM },
          { value: eq.footprintSqm },
          { value: eq.keySpecs }
        ])
      }
    ],
    project,
    eng,
    logoDataUrl
  );
  const xlsxBytes = new Uint8Array(await xlsxBlob.arrayBuffer());
  const pdfBytes = buildCompactPdfBytes(project, eng, standards);

  const zip = new JSZip();
  zip.file(`${safeBase}_Proposal_Workbook.xlsx`, xlsxBytes);
  zip.file(`${safeBase}_Engineering_Dossier.pdf`, pdfBytes);
  zip.file('README_Executive_Brief.txt', buildExecutiveEmailSummaryText(project, eng, standards));
  return zip.generateAsync({ type: 'blob', mimeType: 'application/zip' });
}

function uint8ToBase64(bytes: Uint8Array): string {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return btoa(bin).replace(/(.{76})/g, '$1\r\n');
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Generates an RFC-822 .EML draft with X-Unsent: 1 and pre-attached .XLSX + .PDF files
 * so double-clicking opens directly inside Microsoft Outlook Desktop as a ready-to-send draft.
 */
export async function downloadOutlookDesktopEmlDraft(params: {
  to: string;
  cc: string;
  subject: string;
  bodyText: string;
  project: ProjectDeal;
  eng: EngineeringResult;
  standards: MasterStandards;
  logoDataUrl?: string;
}): Promise<string> {
  const { to, cc, subject, bodyText, project, eng, standards, logoDataUrl } = params;
  const safeBase = (project.name || 'MDC_Proposal').replace(/[^a-zA-Z0-9_-]+/g, '_');

  const xlsxBlob = await generateStyledXlsxBlob(
    [
      {
        name: '15-Point Summary',
        title: 'EXECUTIVE 15-POINT ENGINEERING SUMMARY',
        subtitle: `${project.name} • ${project.cityQuery}`,
        colWidths: [36, 96, 20],
        headers: ['Parameter', 'Specification', 'Status'],
        rows: build15PointSummaryRows(project, eng).map(([k, v]) => [{ value: k }, { value: v }, { value: 'Verified' }])
      },
      {
        name: 'Equipment Schedule',
        title: 'MASTER EQUIPMENT SCHEDULE',
        subtitle: `${eng.equipmentSchedule.length} Subsystems`,
        colWidths: [14, 34, 28, 22, 22, 14, 36],
        headers: ['Tag', 'Equipment', 'Location', 'Rating', 'Dimensions', 'Area m²', 'Key Specs'],
        rows: eng.equipmentSchedule.map(eq => [
          { value: eq.assetTag },
          { value: eq.equipmentName },
          { value: eq.location },
          { value: eq.ratingAndRedundancy },
          { value: eq.dimensionsM },
          { value: eq.footprintSqm },
          { value: eq.keySpecs }
        ])
      }
    ],
    project,
    eng,
    logoDataUrl
  );
  const xlsxB64 = uint8ToBase64(new Uint8Array(await xlsxBlob.arrayBuffer()));
  const pdfB64 = uint8ToBase64(buildCompactPdfBytes(project, eng, standards));

  const boundary = `----=_MDC_Proposal_${Date.now()}`;
  const safeSubj = subject.replace(/[\r\n]+/g, ' ');
  const htmlBody = `<div style="font-family:Calibri,Arial,sans-serif;font-size:11pt;color:#1E293B;line-height:1.5;">${bodyText
    .split('\n')
    .map(l => `<p style="margin:0 0 6px 0;">${l.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</p>`)
    .join('')}</div>`;

  const eml = [
    ...(to.trim() ? [`To: ${to.trim()}`] : []),
    ...(cc.trim() ? [`Cc: ${cc.trim()}`] : []),
    `Subject: ${safeSubj}`,
    'X-Unsent: 1',
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset="utf-8"',
    'Content-Transfer-Encoding: 8bit',
    '',
    htmlBody,
    '',
    `--${boundary}`,
    `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; name="${safeBase}_Proposal_Workbook.xlsx"`,
    'Content-Transfer-Encoding: base64',
    `Content-Disposition: attachment; filename="${safeBase}_Proposal_Workbook.xlsx"`,
    '',
    xlsxB64,
    '',
    `--${boundary}`,
    `Content-Type: application/pdf; name="${safeBase}_Engineering_Dossier.pdf"`,
    'Content-Transfer-Encoding: base64',
    `Content-Disposition: attachment; filename="${safeBase}_Engineering_Dossier.pdf"`,
    '',
    pdfB64,
    '',
    `--${boundary}--`,
    ''
  ].join('\r\n');

  const fileName = `${safeBase}_Outlook_Draft.eml`;
  triggerBlobDownload(new Blob([eml], { type: 'message/rfc822;charset=utf-8' }), fileName);
  return fileName;
}

export async function launchCorporateOutlookWeb(params: {
  to: string;
  cc: string;
  subject: string;
  bodyText: string;
  project: ProjectDeal;
  eng: EngineeringResult;
  standards: MasterStandards;
  logoDataUrl?: string;
}): Promise<string> {
  const { to, cc, subject, bodyText, project, eng, standards, logoDataUrl } = params;
  const safeBase = (project.name || 'MDC_Proposal').replace(/[^a-zA-Z0-9_-]+/g, '_');
  const zipBlob = await buildProposalZipBlob(project, eng, standards, logoDataUrl);
  const zipName = `${safeBase}_Proposal_Pack.zip`;
  triggerBlobDownload(zipBlob, zipName);

  const url = new URL('https://outlook.office.com/mail/deeplink/compose');
  if (to.trim()) url.searchParams.set('to', to.trim());
  if (cc.trim()) url.searchParams.set('cc', cc.trim());
  url.searchParams.set('subject', subject);
  url.searchParams.set('body', `${bodyText}\n\n[Attached bundle downloaded: ${zipName} — also export .PPTX separately from Stage 3 if needed.]`);
  window.open(url.toString(), '_blank', 'noopener,noreferrer');
  return zipName;
}

export async function launchGmailComposeOrDraft(params: {
  clientId: string;
  existingToken: string;
  to: string;
  cc: string;
  subject: string;
  bodyText: string;
  project: ProjectDeal;
  eng: EngineeringResult;
  standards: MasterStandards;
  logoDataUrl?: string;
}): Promise<string> {
  const { clientId, existingToken, to, cc, subject, bodyText, project, eng, standards, logoDataUrl } = params;
  const safeBase = (project.name || 'MDC_Proposal').replace(/[^a-zA-Z0-9_-]+/g, '_');

  const ensureGmailToken = (): Promise<string | null> =>
    new Promise(resolve => {
      if (existingToken) {
        resolve(existingToken);
        return;
      }
      const oauth2 = window.google?.accounts?.oauth2;
      if (!oauth2) {
        resolve(null);
        return;
      }
      const tc = oauth2.initTokenClient({
        client_id: clientId,
        scope: `${GOOGLE_DRIVE_SCOPE} https://www.googleapis.com/auth/gmail.compose`,
        callback: resp => resolve(resp.access_token || null)
      });
      tc.requestAccessToken();
    });

  const token = await ensureGmailToken();
  if (token) {
    try {
      const xlsxBlob = await generateStyledXlsxBlob(
        [
          {
            name: '15-Point Summary',
            title: 'EXECUTIVE 15-POINT ENGINEERING SUMMARY',
            subtitle: `${project.name} • ${project.cityQuery}`,
            colWidths: [36, 96, 20],
            headers: ['Parameter', 'Specification', 'Status'],
            rows: build15PointSummaryRows(project, eng).map(([k, v]) => [{ value: k }, { value: v }, { value: 'Verified' }])
          }
        ],
        project,
        eng,
        logoDataUrl
      );
      const xlsxB64 = uint8ToBase64(new Uint8Array(await xlsxBlob.arrayBuffer()));
      const pdfB64 = uint8ToBase64(buildCompactPdfBytes(project, eng, standards));
      const bnd = `MDC_GMAIL_${Date.now()}`;
      const rawMime = [
        ...(to.trim() ? [`To: ${to.trim()}`] : []),
        ...(cc.trim() ? [`Cc: ${cc.trim()}`] : []),
        `Subject: ${subject.replace(/[\r\n]+/g, ' ')}`,
        'MIME-Version: 1.0',
        `Content-Type: multipart/mixed; boundary="${bnd}"`,
        '',
        `--${bnd}`,
        'Content-Type: text/plain; charset="utf-8"',
        '',
        bodyText,
        '',
        `--${bnd}`,
        `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; name="${safeBase}_Proposal_Workbook.xlsx"`,
        'Content-Transfer-Encoding: base64',
        `Content-Disposition: attachment; filename="${safeBase}_Proposal_Workbook.xlsx"`,
        '',
        xlsxB64,
        '',
        `--${bnd}`,
        `Content-Type: application/pdf; name="${safeBase}_Engineering_Dossier.pdf"`,
        'Content-Transfer-Encoding: base64',
        `Content-Disposition: attachment; filename="${safeBase}_Engineering_Dossier.pdf"`,
        '',
        pdfB64,
        '',
        `--${bnd}--`
      ].join('\r\n');

      const b64Url = btoa(unescape(encodeURIComponent(rawMime)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      const resp = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: { raw: b64Url } })
      });
      if (resp.ok) {
        return 'Created Gmail Draft with attached .XLSX workbook & .PDF dossier.';
      }
    } catch {
      // Fall through to Gmail web compose + ZIP download
    }
  }

  const zipBlob = await buildProposalZipBlob(project, eng, standards, logoDataUrl);
  const zipName = `${safeBase}_Proposal_Pack.zip`;
  triggerBlobDownload(zipBlob, zipName);
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to.trim())}&cc=${encodeURIComponent(cc.trim())}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(`${bodyText}\n\n[Attached bundle downloaded: ${zipName}]`)}`;
  window.open(gmailUrl, '_blank', 'noopener,noreferrer');
  return `Downloaded ${zipName} and opened Gmail compose.`;
}

export async function shareProposalPackViaDevice(params: {
  subject: string;
  bodyText: string;
  project: ProjectDeal;
  eng: EngineeringResult;
  standards: MasterStandards;
  logoDataUrl?: string;
}): Promise<string> {
  const { subject, bodyText, project, eng, standards, logoDataUrl } = params;
  const safeBase = (project.name || 'MDC_Proposal').replace(/[^a-zA-Z0-9_-]+/g, '_');
  const zipBlob = await buildProposalZipBlob(project, eng, standards, logoDataUrl);
  const zipName = `${safeBase}_Proposal_Pack.zip`;

  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
    share?: (data: ShareData) => Promise<void>;
  };

  if (typeof File !== 'undefined' && nav.share) {
    const file = new File([zipBlob], zipName, { type: 'application/zip' });
    if (!nav.canShare || nav.canShare({ files: [file] })) {
      try {
        await nav.share({
          title: subject,
          text: bodyText,
          files: [file]
        });
        return `Shared ${zipName} via device share sheet.`;
      } catch {
        // User cancelled or fallback
      }
    }
  }

  triggerBlobDownload(zipBlob, zipName);
  return `Downloaded ${zipName} for sharing.`;
}
