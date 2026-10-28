import { ForensicAsset } from '../forensics/types';
import { evaluateCollectiveIntelligence } from '../forensics/collective';
import { formatFullDate } from '../forensics/metadata';
import { translate, generateIntegrityNarrative } from '../narratives/narratives';
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
