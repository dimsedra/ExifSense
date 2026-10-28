import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ForensicAsset, ExifCategory } from '../forensics/types';
import { evaluateCollectiveIntelligence } from '../forensics/collective';
import { formatFullDate } from '../forensics/metadata';
import {
  translate,
  generateIntegrityNarrative,
  generateHardwareNarrative,
  generateExposureNarrative,
  generateOpticsNarrative,
  generateQualityNarrative,
  generateTimelineNarrative,
  generateGeospatialNarrative,
  generateCollectiveNarratives
} from '../narratives/narratives';
import { ForensicExportMetadata, JsonReportSchema } from './types';

/**
 * Sanitizes and escapes a cell for CSV according to RFC 4180 and formula injection security.
 */
function escapeCsvCell(value: unknown): string {
  if (value === undefined || value === null) return '';
  let str = String(value);

  // Neutralize CSV formula injection characters (including leading whitespace/tabs per OWASP)
  if (/^[\s\t\r]*[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // Wrap in quotes and escape embedded quotes if comma, quote, or newline is present
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Generates tabular CSV matrix export with UTF-8 BOM and formula injection protection (REQ-EXP-003).
 */
export function generateCsvReport(
  assets: ForensicAsset[],
  meta: ForensicExportMetadata,
  locale: string = 'en'
): string {
  const rows: string[][] = [
    [translate('title', {}, locale, 'reports'), '', '', ''],
    [translate('session', {}, locale, 'reports'), meta.sessionTitle, '', ''],
    [translate('forensic_id', {}, locale, 'reports'), meta.forensicId, '', ''],
    [translate('generated', {}, locale, 'reports'), formatFullDate(meta.generatedAt), '', ''],
    ['', '', '', ''],
    [
      'Asset Name',
      translate('category', {}, locale, 'reports'),
      translate('property', {}, locale, 'reports'),
      translate('value', {}, locale, 'reports')
    ]
  ];

  for (const asset of assets) {
    const sizeMb = (asset.fileSize / (1024 * 1024)).toFixed(2);
    const techCat = translate('tech_details', {}, locale, 'reports');

    rows.push([asset.fileName, techCat, translate('file_name', {}, locale, 'ui'), asset.fileName]);
    rows.push([asset.fileName, techCat, translate('file_type', {}, locale, 'ui'), asset.fileType]);
    rows.push([asset.fileName, techCat, translate('file_size', {}, locale, 'ui'), `${sizeMb} MB`]);
    rows.push([
      asset.fileName,
      techCat,
      translate('file_date', {}, locale, 'ui'),
      formatFullDate(new Date(asset.fileDate))
    ]);

    if (asset.sha256) {
      rows.push([asset.fileName, techCat, 'SHA-256', asset.sha256]);
    }
    if (asset.sha1) {
      rows.push([asset.fileName, techCat, 'SHA-1', asset.sha1]);
    }

    // Integrity narrative
    const integrityStory = generateIntegrityNarrative(asset, locale);
    rows.push([
      asset.fileName,
      translate('forensic_analysis', {}, locale, 'reports'),
      translate('analysis_integrity', {}, locale, 'ui'),
      integrityStory
    ]);

    // Categorized metadata
    for (const [category, properties] of Object.entries(asset.categorizedExif)) {
      for (const [key, val] of Object.entries(properties)) {
        rows.push([asset.fileName, category, key, String(val ?? '')]);
      }
    }
  }

  const csvContent = rows
    .map((row) => row.map(escapeCsvCell).join(','))
    .join('\n');

  // Prepend UTF-8 BOM
  return `\uFEFF${csvContent}`;
}

/**
 * Generates GitHub Flavored Markdown (GFM) forensic report (REQ-EXP-004).
 */
export function generateMarkdownReport(
  assets: ForensicAsset[],
  meta: ForensicExportMetadata,
  locale: string = 'en'
): string {
  let md = `# ${translate('title', {}, locale, 'reports')}\n\n`;
  md += `**${translate('session', {}, locale, 'reports')}:** ${meta.sessionTitle}  \n`;
  md += `**${translate('forensic_id', {}, locale, 'reports')}:** ${meta.forensicId}  \n`;
  md += `**${translate('generated', {}, locale, 'reports')}:** ${formatFullDate(meta.generatedAt)}  \n`;
  md += `**${translate('asset_count', {}, locale, 'reports')}:** ${assets.length}  \n`;

  if (meta.investigatorIdentity) {
    md += `**Investigator:** ${meta.investigatorIdentity}  \n`;
  }

  md += `\n---\n\n`;

  if (assets.length > 1) {
    md += `## ${translate('combined_intel', {}, locale, 'reports')}\n\n`;
    const collective = evaluateCollectiveIntelligence(assets);
    const sections = generateCollectiveNarratives(collective, assets.length, locale);
    for (const section of sections) {
      md += `### ${section.title}\n`;
      const blockquoted = section.narrative.split('\n').map((l) => `> ${l}`).join('\n');
      md += `${blockquoted}\n\n`;
    }
  }

  for (let idx = 0; idx < assets.length; idx++) {
    const asset = assets[idx];
    const assetHeader = translate('asset_header', { n: idx + 1 }, locale, 'reports');
    md += `## ${assetHeader}: ${asset.fileName}\n\n`;

    // Technical details table
    md += `### ${translate('tech_details', {}, locale, 'reports')}\n\n`;
    md += `| ${translate('property', {}, locale, 'reports')} | ${translate('value', {}, locale, 'reports')} |\n`;
    md += `|---|---|\n`;
    md += `| ${translate('file_name', {}, locale, 'ui')} | ${asset.fileName} |\n`;
    md += `| ${translate('file_type', {}, locale, 'ui')} | ${asset.fileType} |\n`;
    const sizeMb = (asset.fileSize / (1024 * 1024)).toFixed(2);
    md += `| ${translate('file_size', {}, locale, 'ui')} | ${sizeMb} MB |\n`;
    md += `| ${translate('file_date', {}, locale, 'ui')} | ${formatFullDate(new Date(asset.fileDate))} |\n`;
    if (asset.sha256) md += `| SHA-256 | \`${asset.sha256}\` |\n`;
    if (asset.sha1) md += `| SHA-1 | \`${asset.sha1}\` |\n`;
    md += `\n`;

    // Narrative section
    md += `### ${translate('forensic_analysis', {}, locale, 'reports')}\n\n`;
    md += `**${translate('analysis_integrity', {}, locale, 'ui')}:**  \n${generateIntegrityNarrative(asset, locale)}  \n\n`;

    const lat = asset.exifData.latitude as number | undefined;
    const lng = asset.exifData.longitude as number | undefined;
    if (lat !== undefined && lng !== undefined) {
      md += `**${translate('analysis_geospatial', {}, locale, 'ui')}:**  \n${generateGeospatialNarrative(lat, lng, null, locale)}  \n\n`;
    }

    const hw = asset.categorizedExif['Device Hardware'];
    if (hw && Object.keys(hw).length > 0) {
      md += `**${translate('analysis_hardware', {}, locale, 'ui')}:**  \n${generateHardwareNarrative(hw, locale)}  \n\n`;
    }

    const exp = asset.categorizedExif['Exposure Settings'];
    if (exp && Object.keys(exp).length > 0) {
      md += `**${translate('analysis_exposure', {}, locale, 'ui')}:**  \n${generateExposureNarrative(exp, locale)}  \n\n`;
    }

    const opt = asset.categorizedExif['Optics & Lens'];
    if (opt && Object.keys(opt).length > 0) {
      md += `**${translate('analysis_optics', {}, locale, 'ui')}:**  \n${generateOpticsNarrative(opt, locale)}  \n\n`;
    }

    const qual = asset.categorizedExif['Image Quality'];
    if (qual && Object.keys(qual).length > 0) {
      md += `**${translate('analysis_quality', {}, locale, 'ui')}:**  \n${generateQualityNarrative(qual, locale)}  \n\n`;
    }

    const time = asset.categorizedExif['Timeline & Date'];
    if (time && Object.keys(time).length > 0) {
      md += `**${translate('analysis_timeline', {}, locale, 'ui')}:**  \n${generateTimelineNarrative(time, locale)}  \n\n`;
    }

    // Categorized Raw Metadata
    md += `### ${translate('raw_metadata', {}, locale, 'reports')}\n\n`;
    for (const [catName, props] of Object.entries(asset.categorizedExif)) {
      const keys = Object.keys(props);
      if (keys.length === 0) continue;

      md += `#### ${catName}\n\n`;
      md += `| ${translate('property', {}, locale, 'reports')} | ${translate('value', {}, locale, 'reports')} |\n`;
      md += `|---|---|\n`;
      for (const [propKey, propVal] of Object.entries(props)) {
        md += `| ${propKey} | ${String(propVal ?? '')} |\n`;
      }
      md += `\n`;
    }
  }

  return md.trim();
}

/**
 * Generates formatted ASCII plain-text clipboard representation (REQ-EXP-005).
 */
export function generateClipboardReport(
  assets: ForensicAsset[],
  meta: ForensicExportMetadata,
  locale: string = 'en'
): string {
  let content = `${translate('title', {}, locale, 'reports')}\n`;
  content += `===================================\n`;
  content += `${translate('session', {}, locale, 'reports')}: ${meta.sessionTitle}\n`;
  content += `${translate('forensic_id', {}, locale, 'reports')}: ${meta.forensicId}\n`;
  content += `${translate('generated', {}, locale, 'reports')}: ${formatFullDate(meta.generatedAt)}\n`;
  content += `${translate('asset_count', {}, locale, 'reports')}: ${assets.length}\n\n`;
  content += `-----------------------------------\n\n`;

  if (assets.length > 1) {
    content += `${translate('combined_intel', {}, locale, 'reports')}\n`;
    content += `-----------------------------\n`;
    const collective = evaluateCollectiveIntelligence(assets);
    const sections = generateCollectiveNarratives(collective, assets.length, locale);
    for (const section of sections) {
      content += `${section.title.toUpperCase()}\n`;
      content += `${section.narrative}\n\n`;
    }
  }

  for (let idx = 0; idx < assets.length; idx++) {
    const asset = assets[idx];
    const assetHeader = translate('asset_header', { n: idx + 1 }, locale, 'reports');
    content += `${assetHeader}: ${asset.fileName}\n`;
    content += `===================================\n\n`;

    content += `[${translate('tech_details', {}, locale, 'reports')}]\n`;
    content += `${translate('file_name', {}, locale, 'ui')}: ${asset.fileName}\n`;
    content += `${translate('file_type', {}, locale, 'ui')}: ${asset.fileType}\n`;
    const sizeMb = (asset.fileSize / (1024 * 1024)).toFixed(2);
    content += `${translate('file_size', {}, locale, 'ui')}: ${sizeMb} MB\n`;
    content += `${translate('file_date', {}, locale, 'ui')}: ${formatFullDate(new Date(asset.fileDate))}\n`;
    if (asset.sha256) content += `SHA-256: ${asset.sha256}\n`;
    if (asset.sha1) content += `SHA-1: ${asset.sha1}\n`;
    content += `\n`;

    content += `[${translate('forensic_analysis', {}, locale, 'reports')}]\n`;
    content += `${translate('analysis_integrity', {}, locale, 'ui')}: ${generateIntegrityNarrative(asset, locale)}\n`;

    const lat = asset.exifData.latitude as number | undefined;
    const lng = asset.exifData.longitude as number | undefined;
    if (lat !== undefined && lng !== undefined) {
      content += `${translate('analysis_geospatial', {}, locale, 'ui')}: ${generateGeospatialNarrative(lat, lng, null, locale)}\n`;
    }

    const hw = asset.categorizedExif['Device Hardware'];
    if (hw && Object.keys(hw).length > 0) {
      content += `${translate('analysis_hardware', {}, locale, 'ui')}: ${generateHardwareNarrative(hw, locale)}\n`;
    }

    const exp = asset.categorizedExif['Exposure Settings'];
    if (exp && Object.keys(exp).length > 0) {
      content += `${translate('analysis_exposure', {}, locale, 'ui')}: ${generateExposureNarrative(exp, locale)}\n`;
    }

    const opt = asset.categorizedExif['Optics & Lens'];
    if (opt && Object.keys(opt).length > 0) {
      content += `${translate('analysis_optics', {}, locale, 'ui')}: ${generateOpticsNarrative(opt, locale)}\n`;
    }

    const qual = asset.categorizedExif['Image Quality'];
    if (qual && Object.keys(qual).length > 0) {
      content += `${translate('analysis_quality', {}, locale, 'ui')}: ${generateQualityNarrative(qual, locale)}\n`;
    }

    const time = asset.categorizedExif['Timeline & Date'];
    if (time && Object.keys(time).length > 0) {
      content += `${translate('analysis_timeline', {}, locale, 'ui')}: ${generateTimelineNarrative(time, locale)}\n`;
    }
    content += `\n`;

    content += `[${translate('raw_metadata', {}, locale, 'reports')}]\n`;
    for (const [catName, props] of Object.entries(asset.categorizedExif)) {
      const keys = Object.keys(props);
      if (keys.length === 0) continue;

      content += `--- ${catName} ---\n`;
      for (const [propKey, propVal] of Object.entries(props)) {
        content += `${propKey}: ${String(propVal ?? '')}\n`;
      }
      content += `\n`;
    }
  }

  return content.trim();
}

/**
 * Copies generated forensic report directly to system clipboard via navigator.clipboard.
 */
export async function copyReportToClipboard(
  assets: ForensicAsset[],
  meta: ForensicExportMetadata,
  locale: string = 'en'
): Promise<void> {
  const content = generateClipboardReport(assets, meta, locale);
  await navigator.clipboard.writeText(content);
}

/**
 * Generates a formal multi-page forensic PDF report via jsPDF and AutoTable (REQ-EXP-001).
 */
export async function generatePdfReport(
  assets: ForensicAsset[],
  meta: ForensicExportMetadata,
  locale: string = 'en'
): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // ===== PAGE 1: Official Header & Provenance =====
  doc.setFontSize(22);
  doc.setTextColor(37, 99, 235);
  doc.text(translate('title', {}, locale, 'reports'), 14, 22);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`${translate('session', {}, locale, 'reports')}: ${meta.sessionTitle}`, 14, 30);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235);
  doc.text(`${translate('forensic_id', {}, locale, 'reports')}: ${meta.forensicId}`, 14, 35);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`${translate('generated', {}, locale, 'reports')}: ${formatFullDate(meta.generatedAt)}`, 14, 40);
  doc.text(`${translate('asset_count', {}, locale, 'reports')}: ${assets.length}`, 14, 45);

  let separatorY = 50;
  if (meta.investigatorIdentity) {
    doc.text(`Investigator: ${meta.investigatorIdentity}`, 14, 50);
    separatorY = 55;
  }

  doc.setDrawColor(229, 231, 235);
  doc.line(14, separatorY, 196, separatorY);

  // ===== PAGE 2+: Collective Intelligence (if assets > 1) =====
  if (assets.length > 1) {
    doc.addPage();
    let currentY = 20;

    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text(translate('combined_intel', {}, locale, 'reports'), 14, currentY);
    currentY += 10;

    const collective = evaluateCollectiveIntelligence(assets);
    const sections = generateCollectiveNarratives(collective, assets.length, locale);

    for (const section of sections) {
      if (currentY > 240) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(section.title, 14, currentY);
      currentY += 6;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const splitText = doc.splitTextToSize(section.narrative, 180);
      doc.text(splitText, 14, currentY);
      currentY += splitText.length * 4.5 + 8;
    }

    // Integrity Verification Matrix Table
    const categories: Array<{ name: ExifCategory; label: string }> = [
      { name: 'Device Hardware', label: translate('cat_hardware', {}, locale, 'ui') },
      { name: 'Timeline & Date', label: translate('cat_timeline', {}, locale, 'ui') },
      { name: 'Geospatial', label: translate('cat_geospatial', {}, locale, 'ui') },
      { name: 'Exposure Settings', label: translate('cat_exposure', {}, locale, 'ui') },
      { name: 'Optics & Lens', label: translate('cat_optics', {}, locale, 'ui') },
      { name: 'Image Quality', label: translate('cat_quality', {}, locale, 'ui') }
    ];

    const integrityMatrixRows = assets.map((a) => {
      const row = [a.fileName];
      categories.forEach((cat) => {
        const props = a.categorizedExif[cat.name];
        row.push(props && Object.keys(props).length > 0 ? '✓' : '✗');
      });
      return row;
    });

    if (currentY > 220) {
      doc.addPage();
      currentY = 20;
    }

    autoTable(doc, {
      startY: currentY + 2,
      head: [[translate('file_name', {}, locale, 'ui'), ...categories.map((c) => c.label)]],
      body: integrityMatrixRows,
      theme: 'grid',
      headStyles: { fillColor: [71, 85, 105] },
      styles: { fontSize: 8 },
      margin: { bottom: 10 }
    });

    currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;

    // Hardware Consistency Table
    const hwProps = [
      { name: 'Make', label: 'Make' },
      { name: 'Model', label: 'Model' },
      { name: 'Software', label: 'Software' },
      { name: 'LensModel', label: 'Lens Model' },
      { name: 'BodySerialNumber', label: 'Body Serial' }
    ];

    const hwRows = assets.map((a) => {
      const row = [a.fileName];
      hwProps.forEach((p) => {
        const val = a.exifData[p.name];
        row.push(val != null && String(val).trim() !== '' ? String(val).trim() : '-');
      });
      return row;
    });

    if (currentY > 220) {
      doc.addPage();
      currentY = 20;
    }

    autoTable(doc, {
      startY: currentY + 2,
      head: [[translate('file_name', {}, locale, 'ui'), ...hwProps.map((p) => p.label)]],
      body: hwRows,
      theme: 'grid',
      headStyles: { fillColor: [71, 85, 105] },
      styles: { fontSize: 8 },
      margin: { bottom: 10 }
    });
  }

  // ===== PER-ASSET PAGES =====
  for (let idx = 0; idx < assets.length; idx++) {
    const asset = assets[idx];
    doc.addPage();

    doc.setFontSize(16);
    doc.setTextColor(37, 99, 235);
    const assetHeader = translate('asset_header', { n: idx + 1 }, locale, 'reports');
    doc.text(`${assetHeader}: ${asset.fileName}`, 14, 20);

    // Tech Details AutoTable
    const sizeMb = (asset.fileSize / (1024 * 1024)).toFixed(2);
    const techRows = [
      [translate('file_name', {}, locale, 'ui'), asset.fileName],
      [translate('file_type', {}, locale, 'ui'), asset.fileType],
      [translate('file_size', {}, locale, 'ui'), `${sizeMb} MB`],
      [translate('file_date', {}, locale, 'ui'), formatFullDate(new Date(asset.fileDate))]
    ];
    if (asset.sha256) techRows.push(['SHA-256', asset.sha256]);
    if (asset.sha1) techRows.push(['SHA-1', asset.sha1]);

    autoTable(doc, {
      startY: 25,
      head: [[translate('property', {}, locale, 'reports'), translate('value', {}, locale, 'reports')]],
      body: techRows,
      theme: 'grid',
      headStyles: { fillColor: [71, 85, 105] },
      margin: { bottom: 10 }
    });

    let currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

    // Forensic Narratives
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text(translate('forensic_analysis', {}, locale, 'reports'), 14, currentY);
    currentY += 8;

    const narrativeList: Array<{ title: string; story: string }> = [
      {
        title: translate('analysis_integrity', {}, locale, 'ui'),
        story: generateIntegrityNarrative(asset, locale)
      }
    ];

    const lat = asset.exifData.latitude as number | undefined;
    const lng = asset.exifData.longitude as number | undefined;
    if (lat !== undefined && lng !== undefined) {
      narrativeList.push({
        title: translate('analysis_geospatial', {}, locale, 'ui'),
        story: generateGeospatialNarrative(lat, lng, null, locale)
      });
    }

    const hw = asset.categorizedExif['Device Hardware'];
    if (hw && Object.keys(hw).length > 0) {
      narrativeList.push({
        title: translate('analysis_hardware', {}, locale, 'ui'),
        story: generateHardwareNarrative(hw, locale)
      });
    }

    const exp = asset.categorizedExif['Exposure Settings'];
    if (exp && Object.keys(exp).length > 0) {
      narrativeList.push({
        title: translate('analysis_exposure', {}, locale, 'ui'),
        story: generateExposureNarrative(exp, locale)
      });
    }

    const opt = asset.categorizedExif['Optics & Lens'];
    if (opt && Object.keys(opt).length > 0) {
      narrativeList.push({
        title: translate('analysis_optics', {}, locale, 'ui'),
        story: generateOpticsNarrative(opt, locale)
      });
    }

    const qual = asset.categorizedExif['Image Quality'];
    if (qual && Object.keys(qual).length > 0) {
      narrativeList.push({
        title: translate('analysis_quality', {}, locale, 'ui'),
        story: generateQualityNarrative(qual, locale)
      });
    }

    const time = asset.categorizedExif['Timeline & Date'];
    if (time && Object.keys(time).length > 0) {
      narrativeList.push({
        title: translate('analysis_timeline', {}, locale, 'ui'),
        story: generateTimelineNarrative(time, locale)
      });
    }

    doc.setFontSize(9);
    for (const item of narrativeList) {
      if (currentY > 265) {
        doc.addPage();
        currentY = 20;
      }
      doc.setFont('helvetica', 'bold');
      doc.text(`${item.title}:`, 14, currentY);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(item.story, 165);
      doc.text(lines, 24, currentY + 4);
      currentY += lines.length * 4 + 7;
    }

    // Categorized Raw Metadata AutoTable
    if (currentY > 230) {
      doc.addPage();
      currentY = 20;
    }

    const tableData: string[][] = [];
    for (const [cat, props] of Object.entries(asset.categorizedExif)) {
      for (const [key, val] of Object.entries(props)) {
        tableData.push([cat, key, String(val ?? '')]);
      }
    }

    if (tableData.length > 0) {
      autoTable(doc, {
        startY: currentY + 4,
        head: [[
          translate('category', {}, locale, 'reports'),
          translate('property', {}, locale, 'reports'),
          translate('value', {}, locale, 'reports')
        ]],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235] },
        styles: { fontSize: 8 },
        margin: { top: 20 }
      });
    }
  }

  const pdfOutput = doc.output('blob');
  return Promise.resolve(pdfOutput);
}

/**
 * Generates machine-readable JSON forensic report (REQ-EXP-002).
 * Formatted with 2-space indentation.
 */
export function generateJsonReport(
  assets: ForensicAsset[],
  meta: ForensicExportMetadata
): string {
  const collective = assets.length > 1 ? evaluateCollectiveIntelligence(assets) : null;

  const report: JsonReportSchema = {
    forensicId: meta.forensicId,
    sessionTitle: meta.sessionTitle,
    generatedAt: meta.generatedAt.toISOString(),
    investigator: meta.investigatorIdentity || null,
    assetCount: assets.length,
    collectiveIntelligence: collective,
    assets: assets.map((asset) => ({
      id: asset.id,
      fileName: asset.fileName,
      fileSize: asset.fileSize,
      fileType: asset.fileType,
      fileDate: (() => {
        const d = new Date(asset.fileDate);
        return !isNaN(d.getTime()) ? d.toISOString() : new Date(0).toISOString();
      })(),
      sha256: asset.sha256,
      sha1: asset.sha1,
      dimensions: {
        actualWidth: asset.actualWidth,
        actualHeight: asset.actualHeight
      },
      rawExif: asset.exifData,
      categorizedExif: asset.categorizedExif,
      integrityAlerts: asset.integrityAlerts
    }))
  };

  return JSON.stringify(report, null, 2);
}
