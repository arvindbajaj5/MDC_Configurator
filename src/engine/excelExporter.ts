import JSZip from 'jszip';
import type { EngineeringResult, MasterStandards, ProjectDeal } from '../types/mdc';
import { build15PointSummaryRows } from './csvPdfExporters';

interface ExcelCellSpec {
  value: string | number;
  formula?: string;
  style?: number;
}

interface ExcelSheetSpec {
  name: string;
  title: string;
  subtitle: string;
  colWidths: number[];
  headers: string[];
  rows: ExcelCellSpec[][];
  summaryRows?: ExcelCellSpec[][];
  currencySymbol?: string;
}

function xmlEsc(str: string): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function colLetter(colIdx1Based: number): string {
  let n = colIdx1Based;
  let s = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function sanitizeSheetName(name: string): string {
  return name.replace(/[\\/*?:[\]]/g, ' ').trim().slice(0, 31) || 'Sheet';
}

/**
 * Parses a data URL (data:image/png;base64,... or jpeg) and reads natural pixel width/height
 * so the logo is placed proportionally inside the Excel header without distortion.
 */
async function parseLogoForExcel(
  logoDataUrl?: string
): Promise<{ ext: 'png' | 'jpeg'; base64: string; widthPx: number; heightPx: number } | null> {
  if (!logoDataUrl || !logoDataUrl.startsWith('data:image/')) return null;
  const match = logoDataUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/i);
  if (!match) return null;
  let ext: 'png' | 'jpeg' = match[1].toLowerCase() === 'png' ? 'png' : 'jpeg';
  let base64 = match[2];
  let widthPx = 220;
  let heightPx = 70;

  if (typeof Image !== 'undefined' && typeof document !== 'undefined') {
    try {
      const dims = await new Promise<{ w: number; h: number; pngB64?: string }>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const w = img.naturalWidth || 220;
          const h = img.naturalHeight || 70;
          if (match[1].toLowerCase() === 'webp') {
            const c = document.createElement('canvas');
            c.width = w;
            c.height = h;
            const ctx = c.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              const converted = c.toDataURL('image/png').split(',')[1] || '';
              resolve({ w, h, pngB64: converted });
              return;
            }
          }
          resolve({ w, h });
        };
        img.onerror = () => reject(new Error('logo load failed'));
        img.src = logoDataUrl;
      });
      widthPx = dims.w;
      heightPx = dims.h;
      if (dims.pngB64) {
        ext = 'png';
        base64 = dims.pngB64;
      }
    } catch {
      // Keep fallback dimensions
    }
  }
  return { ext, base64, widthPx, heightPx };
}

/**
 * Builds xl/styles.xml with Brand Navy (#002870), Brand Orange (#FF5539),
 * Light Tint (#F5F7FA), borders, wrapped alignment, and currency formats.
 *
 * Style indices (cellXfs):
 *  0: Default body (Calibri/Roboto 10pt, wrap)
 *  1: Title Banner (Navy fill #002870, White 14pt bold)
 *  2: Subtitle Banner (Light Orange tint #FFF3F0, Orange #FF5539 10pt bold)
 *  3: Meta Label (Light Slate #EEF2F7, Navy 9.5pt bold, bordered)
 *  4: Meta Value (White, Charcoal 9.5pt, bordered, wrap)
 *  5: Table Header (Navy fill #002870, White 10pt bold, wrap, centered/left)
 *  6: Body Text Left (White, Charcoal 10pt, wrap, thin border)
 *  7: Body Text Zebra (Light Grey #F8FAFC, Charcoal 10pt, wrap, thin border)
 *  8: Body Bold Navy (White, Navy 10pt bold, wrap, thin border)
 *  9: Body Bold Navy Zebra (Light Grey #F8FAFC, Navy 10pt bold, wrap, thin border)
 * 10: Numeric Integer Right (White, 10pt, #,##0, thin border)
 * 11: Numeric Integer Right Zebra (Light Grey, 10pt, #,##0, thin border)
 * 12: Currency Right (White, 10pt, #,##0, thin border)
 * 13: Currency Right Zebra (Light Grey, 10pt, #,##0, thin border)
 * 14: Total Row Label (Warm Orange tint #FFF3F0, Navy 10.5pt bold, top/bottom orange border)
 * 15: Total Row Currency (Warm Orange tint #FFF3F0, Orange #FF5539 10.5pt bold, #,##0, top/bottom orange border)
 * 16: Accent Highlight Badge (Emerald tint #ECFDF5, Dark Green #065F46 10pt bold, centered)
 */
function buildStylesXml(currencySymbol: string): string {
  const safeSym = xmlEsc(currencySymbol);
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="2">
    <numFmt numFmtId="164" formatCode="${safeSym}#,##0"/>
    <numFmt numFmtId="165" formatCode="#,##0"/>
  </numFmts>
  <fonts count="8">
    <font><sz val="10"/><color rgb="FF1E293B"/><name val="Roboto"/></font>
    <font><b/><sz val="14"/><color rgb="FFFFFFFF"/><name val="Roboto"/></font>
    <font><b/><sz val="10"/><color rgb="FFFF5539"/><name val="Roboto"/></font>
    <font><b/><sz val="9.5"/><color rgb="FF002870"/><name val="Roboto"/></font>
    <font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Roboto"/></font>
    <font><b/><sz val="10"/><color rgb="FF002870"/><name val="Roboto"/></font>
    <font><b/><sz val="10.5"/><color rgb="FFFF5539"/><name val="Roboto"/></font>
    <font><b/><sz val="10"/><color rgb="FF065F46"/><name val="Roboto"/></font>
  </fonts>
  <fills count="7">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF002870"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFF3F0"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFEEF2F7"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF8FAFC"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFECFDF5"/></patternFill></fill>
  </fills>
  <borders count="3">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FFD8E0EA"/></left>
      <right style="thin"><color rgb="FFD8E0EA"/></right>
      <top style="thin"><color rgb="FFD8E0EA"/></top>
      <bottom style="thin"><color rgb="FFD8E0EA"/></bottom>
      <diagonal/>
    </border>
    <border>
      <left style="thin"><color rgb="FFFF5539"/></left>
      <right style="thin"><color rgb="FFFF5539"/></right>
      <top style="medium"><color rgb="FFFF5539"/></top>
      <bottom style="double"><color rgb="FFFF5539"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="17">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"><alignment vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="left" vertical="center" indent="1"/></xf>
    <xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" indent="1"/></xf>
    <xf numFmtId="0" fontId="3" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="4" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="5" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="5" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="165" fontId="0" fillId="5" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="164" fontId="0" fillId="5" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="0" fontId="5" fillId="3" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="164" fontId="6" fillId="3" borderId="2" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="0" fontId="7" fillId="6" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
}

function cellXml(ref: string, spec: ExcelCellSpec): string {
  const sAttr = spec.style !== undefined ? ` s="${spec.style}"` : '';
  if (spec.formula) {
    const valTag = typeof spec.value === 'number' ? `<v>${spec.value}</v>` : '';
    return `<c r="${ref}"${sAttr}><f>${xmlEsc(spec.formula)}</f>${valTag}</c>`;
  }
  if (typeof spec.value === 'number' && Number.isFinite(spec.value)) {
    return `<c r="${ref}"${sAttr}><v>${spec.value}</v></c>`;
  }
  return `<c r="${ref}" t="inlineStr"${sAttr}><is><t xml:space="preserve">${xmlEsc(String(spec.value ?? ''))}</t></is></c>`;
}

function buildWorksheetXml(
  sheet: ExcelSheetSpec,
  project: ProjectDeal,
  eng: EngineeringResult,
  hasLogo: boolean
): string {
  const numCols = Math.max(4, sheet.colWidths.length);
  const lastCol = colLetter(numCols);
  const generatedDate = new Date().toISOString().slice(0, 10);
  const shellLabel =
    project.shellArchitecture === 'BnM_Hall'
      ? `Brick-and-Mortar Hall (${project.bnmHallLengthM}m × ${project.bnmHallWidthM}m, Floor #${project.bnmFloorLevel})`
      : `Modular ISO Containers (${eng.pods.length} Pods, ${eng.containerTotalVolumeCum} m³)`;

  const rowsXml: string[] = [];
  const merges: string[] = [];

  // Row 1: Top Title Banner (leaves right corner room if logo present)
  const titleEndCol = hasLogo && numCols >= 5 ? colLetter(numCols - 1) : lastCol;
  rowsXml.push(
    `<row r="1" ht="34" customHeight="1">${cellXml('A1', { value: sheet.title, style: 1 })}${
      Array.from({ length: numCols - 1 }, (_, i) => cellXml(`${colLetter(i + 2)}1`, { value: '', style: 1 })).join('')
    }</row>`
  );
  merges.push(`A1:${titleEndCol}1`);

  // Row 2: Subtitle Bar
  rowsXml.push(
    `<row r="2" ht="22" customHeight="1">${cellXml('A2', { value: sheet.subtitle, style: 2 })}${
      Array.from({ length: numCols - 1 }, (_, i) => cellXml(`${colLetter(i + 2)}2`, { value: '', style: 2 })).join('')
    }</row>`
  );
  merges.push(`A2:${titleEndCol}2`);

  // Rows 3-5: Structured Client & Engineering Metadata Header Block
  const metaRows: [string, string, string, string][] = [
    [
      'Client / Authority',
      project.client || 'Enterprise Authority',
      'Project / Deal Name',
      project.name || 'AI Modular Data Center'
    ],
    [
      'Site Location & Seismic',
      `${project.cityQuery} (${project.seismicZone} • ${project.peakDryBulb}°C DB / ${project.peakWetBulb}°C WB)`,
      'Total IT / Thermal Load',
      `${(eng.totalDesignContKw / 1000).toFixed(2)} MW Continuous (${(eng.dlcDesignKw / 1000).toFixed(2)} MW DLC + ${(eng.acDesignKw / 1000).toFixed(2)} MW AC)`
    ],
    [
      'Enclosure & Availability',
      `${shellLabel} • ${project.uptimeTier}`,
      'Prepared Date & MII',
      `${generatedDate} • ${eng.mii.miiClassLabel} • Annual PUE ${eng.pueAnnualized}`
    ]
  ];

  const halfCol = Math.max(2, Math.floor(numCols / 2));
  metaRows.forEach((mr, idx) => {
    const rNum = 3 + idx;
    const cells: string[] = [];
    for (let c = 1; c <= numCols; c++) {
      const ref = `${colLetter(c)}${rNum}`;
      if (c === 1) cells.push(cellXml(ref, { value: mr[0], style: 3 }));
      else if (c === 2) cells.push(cellXml(ref, { value: mr[1], style: 4 }));
      else if (c === halfCol + 1) cells.push(cellXml(ref, { value: mr[2], style: 3 }));
      else if (c === halfCol + 2) cells.push(cellXml(ref, { value: mr[3], style: 4 }));
      else cells.push(cellXml(ref, { value: '', style: 4 }));
    }
    rowsXml.push(`<row r="${rNum}" ht="22" customHeight="1">${cells.join('')}</row>`);
    if (halfCol > 2) merges.push(`B${rNum}:${colLetter(halfCol)}${rNum}`);
    if (numCols > halfCol + 2) merges.push(`${colLetter(halfCol + 2)}${rNum}:${lastCol}${rNum}`);
  });

  // Row 6: Blank visual spacer
  rowsXml.push(`<row r="6" ht="10" customHeight="1"/>`);

  // Row 7: Table Headers
  const headerCells = sheet.headers.map((h, idx) => cellXml(`${colLetter(idx + 1)}7`, { value: h, style: 5 }));
  rowsXml.push(`<row r="7" ht="26" customHeight="1">${headerCells.join('')}</row>`);

  // Rows 8+: Data rows
  let curRow = 8;
  sheet.rows.forEach((rowCells, rIdx) => {
    const isZebra = rIdx % 2 === 1;
    const maxLen = rowCells.reduce((mx, c) => Math.max(mx, String(c.value ?? '').length), 20);
    const estHt = Math.min(64, Math.max(22, Math.ceil(maxLen / 55) * 15 + 8));
    const xmlCells = rowCells.map((cell, cIdx) => {
      const style = cell.style ?? (cIdx === 0 ? (isZebra ? 9 : 8) : isZebra ? 7 : 6);
      return cellXml(`${colLetter(cIdx + 1)}${curRow}`, { ...cell, style });
    });
    rowsXml.push(`<row r="${curRow}" ht="${estHt}" customHeight="1">${xmlCells.join('')}</row>`);
    curRow++;
  });

  // Optional Summary / Formula Total Rows
  (sheet.summaryRows || []).forEach(sumCells => {
    const xmlCells = sumCells.map((cell, cIdx) =>
      cellXml(`${colLetter(cIdx + 1)}${curRow}`, { ...cell, style: cell.style ?? 14 })
    );
    rowsXml.push(`<row r="${curRow}" ht="26" customHeight="1">${xmlCells.join('')}</row>`);
    curRow++;
  });

  const colsXml = sheet.colWidths
    .map((w, idx) => `<col min="${idx + 1}" max="${idx + 1}" width="${w}" customWidth="1"/>`)
    .join('');

  const mergeXml =
    merges.length > 0
      ? `<mergeCells count="${merges.length}">${merges.map(m => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>`
      : '';

  const drawingTag = hasLogo ? `<drawing r:id="rId1"/>` : '';

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheetViews>
    <sheetView workbookViewId="0">
      <pane ySplit="7" topLeftCell="A8" activePane="bottomLeft" state="frozen"/>
    </sheetView>
  </sheetViews>
  <sheetFormatPr defaultRowHeight="20"/>
  <cols>${colsXml}</cols>
  <sheetData>${rowsXml.join('')}</sheetData>
  ${mergeXml}
  <pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/>
  ${drawingTag}
</worksheet>`;
}

function buildDrawingXml(anchorColIdx0: number, widthPx: number, heightPx: number): string {
  // Fit logo proportionally inside 150×48 px box in top-right header
  const maxW = 148;
  const maxH = 44;
  const ratio = Math.min(maxW / Math.max(1, widthPx), maxH / Math.max(1, heightPx));
  const finalW = Math.round(widthPx * ratio);
  const finalH = Math.round(heightPx * ratio);
  const cx = finalW * 9525; // 1 px = 9525 EMU
  const cy = finalH * 9525;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <xdr:oneCellAnchor>
    <xdr:from>
      <xdr:col>${anchorColIdx0}</xdr:col>
      <xdr:colOff>76200</xdr:colOff>
      <xdr:row>0</xdr:row>
      <xdr:rowOff>57150</xdr:rowOff>
    </xdr:from>
    <xdr:ext cx="${cx}" cy="${cy}"/>
    <xdr:pic>
      <xdr:nvPicPr>
        <xdr:cNvPr id="2" name="CompanyLogo"/>
        <xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr>
      </xdr:nvPicPr>
      <xdr:blipFill>
        <a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="rId1"/>
        <a:stretch><a:fillRect/></a:stretch>
      </xdr:blipFill>
      <xdr:spPr>
        <a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>
        <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
      </xdr:spPr>
    </xdr:pic>
    <xdr:clientData/>
  </xdr:oneCellAnchor>
</xdr:wsDr>`;
}

export async function generateStyledXlsxBlob(
  sheets: ExcelSheetSpec[],
  project: ProjectDeal,
  eng: EngineeringResult,
  logoDataUrl?: string
): Promise<Blob> {
  const zip = new JSZip();
  const logo = await parseLogoForExcel(logoDataUrl);
  const curSym = project.currency === 'USD' ? '$' : project.currency === 'EUR' ? '€' : '₹';

  // [Content_Types].xml
  const overrides: string[] = [
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>',
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
  ];
  sheets.forEach((_, idx) => {
    overrides.push(
      `<Override PartName="/xl/worksheets/sheet${idx + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
    );
    if (logo) {
      overrides.push(
        `<Override PartName="/xl/drawings/drawing${idx + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`
      );
    }
  });
  const logoDefault = logo
    ? `<Default Extension="${logo.ext}" ContentType="image/${logo.ext}"/>`
    : '';

  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  ${logoDefault}
  ${overrides.join('\n  ')}
</Types>`
  );

  zip.file(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`
  );

  const wbSheetsXml = sheets
    .map(
      (sh, idx) =>
        `<sheet name="${xmlEsc(sanitizeSheetName(sh.name))}" sheetId="${idx + 1}" r:id="rId${idx + 1}"/>`
    )
    .join('\n    ');

  zip.file(
    'xl/workbook.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    ${wbSheetsXml}
  </sheets>
</workbook>`
  );

  const wbRels = sheets.map(
    (_, idx) =>
      `<Relationship Id="rId${idx + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${idx + 1}.xml"/>`
  );
  wbRels.push(
    `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`
  );
  zip.file(
    'xl/_rels/workbook.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${wbRels.join('\n  ')}
</Relationships>`
  );

  zip.file('xl/styles.xml', buildStylesXml(curSym));

  if (logo) {
    zip.file(`xl/media/logo.${logo.ext}`, logo.base64, { base64: true });
  }

  sheets.forEach((sh, idx) => {
    const num = idx + 1;
    zip.file(`xl/worksheets/sheet${num}.xml`, buildWorksheetXml(sh, project, eng, Boolean(logo)));
    if (logo) {
      const anchorCol0 = Math.max(0, sh.colWidths.length - 1);
      zip.file(`xl/drawings/drawing${num}.xml`, buildDrawingXml(anchorCol0, logo.widthPx, logo.heightPx));
      zip.file(
        `xl/drawings/_rels/drawing${num}.xml.rels`,
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/logo.${logo.ext}"/>
</Relationships>`
      );
      zip.file(
        `xl/worksheets/_rels/sheet${num}.xml.rels`,
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing${num}.xml"/>
</Relationships>`
      );
    }
  });

  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
}

function triggerXlsxDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function currencyFactor(project: ProjectDeal, standards: MasterStandards): number {
  if (project.currency === 'USD') return 1 / (standards.usdRate || 84);
  if (project.currency === 'EUR') return 1 / (standards.eurRate || 91);
  return 1;
}

function buildSummarySheet(project: ProjectDeal, eng: EngineeringResult): ExcelSheetSpec {
  const rows = build15PointSummaryRows(project, eng);
  return {
    name: '15-Point Summary',
    title: 'EXECUTIVE 15-POINT ENGINEERING & SOLUTION SUMMARY',
    subtitle: `${project.name} • ${project.cityQuery} • ${(eng.totalDesignContKw / 1000).toFixed(2)} MW Continuous IT Load`,
    colWidths: [36, 98, 22, 22],
    headers: ['Engineering Dimension', 'Engineered Technical & Commercial Specification', 'Status', 'Ref Code'],
    rows: rows.map(([k, v], i) => [
      { value: k },
      { value: v },
      { value: 'Verified', style: 16 },
      { value: `SPEC-${String(i + 1).padStart(2, '0')}` }
    ])
  };
}

function buildEquipmentScheduleSheet(project: ProjectDeal, eng: EngineeringResult): ExcelSheetSpec {
  return {
    name: 'Equipment Schedule',
    title: 'MASTER EQUIPMENT SCHEDULE (RATINGS, DIMENSIONS, WEIGHTS & ROOMS)',
    subtitle: `${project.name} • ${eng.equipmentSchedule.length} Major Subsystems Configured`,
    colWidths: [14, 22, 34, 28, 22, 20, 24, 22, 13, 14, 38],
    headers: [
      'Asset Tag',
      'Category',
      'Equipment Description',
      'Room / Campus Location',
      'OEM Make',
      'Model / SKU',
      'Rating & Redundancy',
      'Dimensions (L×W×H)',
      'Footprint (m²)',
      'Unit Wt (kg)',
      'Key Electrical / Thermal Specs'
    ],
    rows: eng.equipmentSchedule.map((eq, idx) => {
      const z = idx % 2 === 1;
      return [
        { value: eq.assetTag },
        { value: eq.category },
        { value: eq.equipmentName },
        { value: eq.location },
        { value: eq.make },
        { value: eq.model },
        { value: eq.ratingAndRedundancy },
        { value: eq.dimensionsM },
        { value: eq.footprintSqm, style: z ? 11 : 10 },
        { value: eq.operatingWeightKg, style: z ? 11 : 10 },
        { value: eq.keySpecs }
      ];
    })
  };
}

function buildEngineeringBomSheet(project: ProjectDeal, eng: EngineeringResult): ExcelSheetSpec {
  return {
    name: 'Engineering BOM',
    title: 'TURNKEY NON-IT ENGINEERING BILL OF MATERIALS (QUANTITIES & MII)',
    subtitle: `${project.name} • ${eng.bomItems.length} Line Items • MII: ${eng.mii.miiClassLabel}`,
    colWidths: [28, 42, 22, 22, 48, 11, 10, 14],
    headers: ['Category', 'Subsystem / Scope Description', 'OEM Make', 'Model / SKU', 'Technical Specifications', 'MII %', 'Qty', 'Unit'],
    rows: eng.bomItems.map((it, idx) => {
      const z = idx % 2 === 1;
      return [
        { value: it.category },
        { value: it.label },
        { value: it.make },
        { value: it.model },
        { value: it.specs },
        { value: `${it.miiPct}%`, style: z ? 11 : 10 },
        { value: it.qty, style: z ? 11 : 10 },
        { value: it.unit }
      ];
    })
  };
}

function buildCommercialPriceSheet(
  project: ProjectDeal,
  eng: EngineeringResult,
  standards: MasterStandards
): ExcelSheetSpec {
  const cf = currencyFactor(project, standards);
  const startRow = 8;
  const endRow = Math.max(startRow, startRow + eng.bomItems.length - 1);

  return {
    name: 'Commercial Price Sheet',
    title: `COMMERCIAL BILL OF QUANTITIES & 5-YEAR TCO (${project.currency})`,
    subtitle: `${project.name} • Margin ${project.marginPct}% • Contingency ${project.contingencyPct}% • GST ${project.gstPct}%`,
    colWidths: [26, 40, 20, 18, 9, 18, 18, 18, 18, 28],
    headers: [
      'Category',
      'Subsystem / Scope Description',
      'OEM Make',
      'Model',
      'Qty',
      `Unit Base (${project.currency})`,
      `Pre-Tax Total (${project.currency})`,
      `GST ${project.gstPct}% (${project.currency})`,
      `Incl. GST (${project.currency})`,
      'Commercial / Quote Notes'
    ],
    rows: eng.bomItems.map((it, idx) => {
      const z = idx % 2 === 1;
      const r = startRow + idx;
      const unitBase = Math.round(it.unitCost * cf);
      const preTax = Math.round(it.sellingPreTax * cf);
      const gst = Math.round(it.gstAmt * cf);
      const grand = Math.round(it.grandTotalInclGst * cf);
      return [
        { value: it.category },
        { value: it.label },
        { value: it.make },
        { value: it.model },
        { value: it.qty, style: z ? 11 : 10 },
        { value: unitBase, style: z ? 13 : 12 },
        { value: preTax, style: z ? 13 : 12 },
        { value: gst, formula: `ROUND(G${r}*${(project.gstPct || 18) / 100},0)`, style: z ? 13 : 12 },
        { value: grand, formula: `G${r}+H${r}`, style: z ? 13 : 12 },
        { value: it.comments || (it.isPlaceholder ? 'Market-Scout Placeholder ROM' : it.isOverridden ? 'Special Vendor Quote' : '') }
      ];
    }),
    summaryRows: [
      [
        { value: 'TOTAL NON-IT PROPOSAL', style: 14 },
        { value: `5-Yr Lifecycle TCO: ${Math.round(eng.fiveYearTcoInr * cf).toLocaleString()} ${project.currency}`, style: 14 },
        { value: `MII: ${eng.mii.overallMiiPct}%`, style: 14 },
        { value: project.uptimeTier, style: 14 },
        { value: eng.bomItems.length, style: 14 },
        { value: '', style: 14 },
        { value: Math.round(eng.totals.sellingPreTax * cf), formula: `SUM(G${startRow}:G${endRow})`, style: 15 },
        { value: Math.round(eng.totals.gst * cf), formula: `SUM(H${startRow}:H${endRow})`, style: 15 },
        { value: Math.round(eng.totals.grandTotal * cf), formula: `SUM(I${startRow}:I${endRow})`, style: 15 },
        { value: 'IT Compute Racks Excluded', style: 14 }
      ]
    ]
  };
}

function buildAshraeSheet(project: ProjectDeal, eng: EngineeringResult): ExcelSheetSpec {
  const startRow = 8;
  const endRow = startRow + eng.monthlyProfile.length - 1;
  return {
    name: '12-Month ASHRAE',
    title: '12-MONTH ASHRAE MICROCLIMATE & SEASONAL WATER PROFILE',
    subtitle: `${project.cityQuery} • Coolant Supply <= ${eng.effectiveSupplyTempC}°C • Annual Water ${eng.annualWaterKl.toLocaleString()} kL`,
    colWidths: [14, 16, 16, 22, 18, 22],
    headers: ['Month', 'Peak Dry Bulb (°C)', 'Wet Bulb (°C)', 'Cooling Mode', 'Chiller Load Frac', 'Monthly Evap Water (kL)'],
    rows: eng.monthlyProfile.map((m, idx) => {
      const z = idx % 2 === 1;
      return [
        { value: m.month },
        { value: m.dryBulbC, style: z ? 11 : 10 },
        { value: m.wetBulbC, style: z ? 11 : 10 },
        { value: m.mode },
        { value: `${Math.round(m.chillerFrac * 100)}%`, style: z ? 11 : 10 },
        { value: m.monthlyWaterKl, style: z ? 11 : 10 }
      ];
    }),
    summaryRows: [
      [
        { value: 'ANNUAL TOTAL', style: 14 },
        { value: `Peak ${project.peakDryBulb}°C`, style: 14 },
        { value: `Peak ${project.peakWetBulb}°C`, style: 14 },
        { value: `${eng.freeCoolMonths}m Free / ${eng.adiabaticMonths}m Spray / ${eng.trimChillerMonths}m Trim`, style: 14 },
        { value: `PUE ${eng.pueAnnualized}`, style: 14 },
        { value: eng.annualWaterKl, formula: `SUM(F${startRow}:F${endRow})`, style: 15 }
      ]
    ]
  };
}

function buildPartnerRfqSheet(project: ProjectDeal, eng: EngineeringResult): ExcelSheetSpec {
  return {
    name: 'Partner RFQ Scout',
    title: 'PARTNER RFQ / MARKET-SCOUT PLACEHOLDER SPECIFICATION SHEET',
    subtitle: `${project.name} • Subsystems Requiring Partner OEM Quotation`,
    colWidths: [20, 14, 24, 38, 16, 16, 20, 28, 44],
    headers: [
      'Placeholder ID',
      'Group',
      'Category',
      'Synthesized Equipment Spec',
      'Target Rating',
      'Qty (N+R)',
      'ROM Unit Budget (INR)',
      'Nearest OEM Reference',
      'Engineering Remark'
    ],
    rows:
      eng.dealPlaceholders.length > 0
        ? eng.dealPlaceholders.map((p, idx) => {
            const z = idx % 2 === 1;
            return [
              { value: p.id },
              { value: p.group.toUpperCase() },
              { value: p.category },
              { value: p.builtUpName },
              { value: `${p.synthesizedRating} ${p.capacityUnit}` },
              { value: `${p.totalUnits} (${p.activeN}+${p.redundantR})` },
              { value: p.romUnitPriceInr, style: z ? 13 : 12 },
              { value: p.nearestOemRef },
              { value: p.marketScoutRemark }
            ];
          })
        : [
            [
              { value: 'NONE' },
              { value: '-' },
              { value: 'All Matched' },
              { value: 'All major MEP subsystems matched verified India OEM SKUs in Supply Chain DB.' },
              { value: '-' },
              { value: '0' },
              { value: 0, style: 12 },
              { value: '-' },
              { value: 'No open Market-Scout placeholders.' }
            ]
          ]
  };
}

const safePrefix = (name: string) => (name || 'MDC_Proposal').replace(/[^a-zA-Z0-9_-]+/g, '_');

export async function exportFullProposalWorkbookXlsx(
  project: ProjectDeal,
  eng: EngineeringResult,
  standards: MasterStandards,
  logoDataUrl?: string
): Promise<void> {
  const sheets: ExcelSheetSpec[] = [
    buildSummarySheet(project, eng),
    buildEquipmentScheduleSheet(project, eng),
    buildEngineeringBomSheet(project, eng),
    buildCommercialPriceSheet(project, eng, standards),
    buildAshraeSheet(project, eng)
  ];
  if (eng.dealPlaceholders.length > 0) {
    sheets.push(buildPartnerRfqSheet(project, eng));
  }
  const blob = await generateStyledXlsxBlob(sheets, project, eng, logoDataUrl);
  triggerXlsxDownload(blob, `${safePrefix(project.name)}_Complete_Proposal_Workbook.xlsx`);
}

export async function export15PointSummaryXlsx(
  project: ProjectDeal,
  eng: EngineeringResult,
  logoDataUrl?: string
): Promise<void> {
  const blob = await generateStyledXlsxBlob([buildSummarySheet(project, eng)], project, eng, logoDataUrl);
  triggerXlsxDownload(blob, `${safePrefix(project.name)}_15Point_Solution_Summary.xlsx`);
}

export async function exportEngineeringBomXlsx(
  project: ProjectDeal,
  eng: EngineeringResult,
  logoDataUrl?: string
): Promise<void> {
  const blob = await generateStyledXlsxBlob(
    [buildEngineeringBomSheet(project, eng), buildEquipmentScheduleSheet(project, eng)],
    project,
    eng,
    logoDataUrl
  );
  triggerXlsxDownload(blob, `${safePrefix(project.name)}_Engineering_BOM_and_Schedule.xlsx`);
}

export async function exportCommercialPriceXlsx(
  project: ProjectDeal,
  eng: EngineeringResult,
  standards: MasterStandards,
  logoDataUrl?: string
): Promise<void> {
  const blob = await generateStyledXlsxBlob(
    [buildCommercialPriceSheet(project, eng, standards)],
    project,
    eng,
    logoDataUrl
  );
  triggerXlsxDownload(blob, `${safePrefix(project.name)}_Commercial_Price_Sheet.xlsx`);
}

export async function exportPartnerRfqXlsx(
  project: ProjectDeal,
  eng: EngineeringResult,
  logoDataUrl?: string
): Promise<void> {
  const blob = await generateStyledXlsxBlob([buildPartnerRfqSheet(project, eng)], project, eng, logoDataUrl);
  triggerXlsxDownload(blob, `${safePrefix(project.name)}_Partner_RFQ_MarketScout.xlsx`);
}
