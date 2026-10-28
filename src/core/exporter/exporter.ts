import { ForensicAsset } from '../forensics/types';
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

  // Neutralize CSV formula injection characters
  if (/^[=+\-@]/.test(str)) {
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
      fileDate: new Date(asset.fileDate).toISOString(),
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
