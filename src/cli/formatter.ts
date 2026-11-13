import type {
  ForensicAsset,
  CollectiveIntelligenceResult,
  ExifCategory,
} from '../core/forensics/types';
import type { ChronologicalBatchStory } from '../core/narratives/types';
import type { OsrmRouteDetails } from '../services/mapHelpers';
import type { FileHashResult } from './hasher';
import { isValidCoordinate } from '../services/mapHelpers';
import {
  formatExifValue,
  formatLabel,
  formatNaturalDate,
  extractGpsCoordinates,
} from '../core/forensics/metadata';
import {
  generateHardwareNarrative,
  generateIntegrityNarrative,
  generateExposureNarrative,
  generateOpticsNarrative,
  generateQualityNarrative,
  generateTimelineNarrative,
  generateGeospatialNarrative,
  translate,
} from '../core/narratives/narratives';
import type { CliOptions, SupportedFormat } from './args';

const RAW_METADATA_CATEGORIES: Array<{ id: ExifCategory; catKey: string }> = [
  { id: 'Device Hardware', catKey: 'cat_hardware' },
  { id: 'Exposure Settings', catKey: 'cat_exposure' },
  { id: 'Optics & Lens', catKey: 'cat_optics' },
  { id: 'Image Quality', catKey: 'cat_quality' },
  { id: 'Timeline & Date', catKey: 'cat_timeline' },
  { id: 'Geospatial', catKey: 'cat_geospatial' },
  { id: 'Standards & Info', catKey: 'cat_standards' },
  { id: 'Miscellaneous', catKey: 'cat_misc' },
];

function escapeMarkdownCell(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/[\r\n]+/g, ' ');
}

function formatCategoryEntries(
  entries: Array<[string, unknown]>,
  format: SupportedFormat,
  locale: string
): string[] {
  if (entries.length === 0) {
    return [translate('no_metadata_tags', {}, locale, 'narratives')];
  }

  const formattedRows = entries.map(([key, val]) => ({
    label: formatLabel(key),
    value: formatExifValue(key, val, locale),
  }));

  if (format === 'markdown') {
    const propHeader = translate('property', {}, locale, 'ui');
    const valHeader = translate('value', {}, locale, 'ui');
    const tableLines = [`| ${propHeader} | ${valHeader} |`, '| --- | --- |'];
    for (const row of formattedRows) {
      tableLines.push(`| ${escapeMarkdownCell(row.label)} | ${escapeMarkdownCell(row.value)} |`);
    }
    return tableLines;
  }

  const maxKeyWidth = Math.max(...formattedRows.map((row) => row.label.length));
  return formattedRows.map((row) => `  ${row.label.padEnd(maxKeyWidth)} : ${row.value}`);
}

function formatReadableFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatFileModifiedDate(fileDate: number | undefined, locale: string): string {
  if (fileDate == null || !Number.isFinite(fileDate) || fileDate <= 0) {
    return translate('unknown', {}, locale, 'reports');
  }
  const parsedDate = new Date(fileDate);
  if (Number.isNaN(parsedDate.getTime())) {
    return translate('unknown', {}, locale, 'reports');
  }
  const localeCode = locale === 'id' ? 'id-ID' : 'en-US';
  return parsedDate.toLocaleString(localeCode);
}

export function formatSingleOutput(asset: ForensicAsset, options?: CliOptions): string {
  const locale = options?.locale || 'en';
  const format: SupportedFormat = options?.format === 'markdown' ? 'markdown' : 'plain';
  const isMarkdown = format === 'markdown';
  const lines: string[] = [];

  const fileNameLabel = translate('file_name', {}, locale, 'ui');
  const fileTypeLabel = translate('file_type', {}, locale, 'ui');
  const fileSizeLabel = translate('file_size', {}, locale, 'ui');
  const fileDateLabel = translate('file_date', {}, locale, 'ui');
  const unknownText = translate('unknown', {}, locale, 'reports');
  const formattedSize = `${formatReadableFileSize(asset.fileSize)} (${asset.fileSize} bytes)`;
  const formattedDate = formatFileModifiedDate(asset.fileDate, locale);
  const dimensions = `${asset.actualWidth ?? unknownText} x ${asset.actualHeight ?? unknownText}`;

  const headerRows: Array<[string, string]> = [
    [fileNameLabel, asset.fileName],
    [fileTypeLabel, asset.fileType || unknownText],
    [fileSizeLabel, formattedSize],
    [fileDateLabel, formattedDate],
    ['Dimensions', dimensions],
    ['SHA-256', asset.sha256],
    ['SHA-1', asset.sha1],
  ];

  if (isMarkdown) {
    lines.push('# ExifSense Forensic Analysis');
    for (const [label, value] of headerRows) {
      const safeVal = value.replace(/[\r\n]+/g, ' ');
      const formattedVal = label === 'SHA-256' || label === 'SHA-1' ? `\`${safeVal}\`` : safeVal;
      lines.push(`- **${label}**: ${formattedVal}`);
    }
    lines.push('');
  } else {
    lines.push('=== ExifSense Forensic Analysis ===');
    const maxLabelWidth = Math.max(...headerRows.map(([label]) => label.length));
    for (const [label, value] of headerRows) {
      lines.push(`${label.padEnd(maxLabelWidth)} : ${value}`);
    }
    lines.push('');
  }

  // Integrity alerts
  const alertCount = asset.integrityAlerts.length;
  lines.push(
    isMarkdown ? `## Integrity Alerts (${alertCount})` : `--- Integrity Alerts (${alertCount}) ---`
  );

  if (alertCount === 0) {
    lines.push('No integrity anomalies detected.');
  } else {
    for (const alert of asset.integrityAlerts) {
      lines.push(`[${alert.severity.toUpperCase()}] ${alert.defaultMessage}`);
    }
  }
  lines.push('');

  // Forensic narratives (7 sections matching Web ExpertAnalysisTabs order)
  lines.push(isMarkdown ? '## Forensic Narrative' : '--- Forensic Narrative ---');

  const exif = (asset.exifData || {}) as Record<string, unknown>;
  const rawLat = exif.latitude ?? exif.GPSLatitude;
  const rawLng = exif.longitude ?? exif.GPSLongitude;
  const hasGps = isValidCoordinate(rawLat, rawLng);
  const latNum = hasGps ? Number(rawLat) : NaN;
  const lngNum = hasGps ? Number(rawLng) : NaN;
  const locName = (asset.locationData?.display_name as string) || asset.locationName || null;

  const narrativeSections = [
    {
      title: translate('analysis_integrity', {}, locale, 'ui'),
      text: generateIntegrityNarrative(asset, locale),
    },
    {
      title: translate('analysis_geospatial', {}, locale, 'ui'),
      text: generateGeospatialNarrative(latNum, lngNum, locName, locale),
    },
    {
      title: translate('analysis_hardware', {}, locale, 'ui'),
      text: generateHardwareNarrative(exif, locale),
    },
    {
      title: translate('analysis_exposure', {}, locale, 'ui'),
      text: generateExposureNarrative(exif, locale),
    },
    {
      title: translate('analysis_optics', {}, locale, 'ui'),
      text: generateOpticsNarrative(exif, locale),
    },
    {
      title: translate('analysis_quality', {}, locale, 'ui'),
      text: generateQualityNarrative(exif, locale),
    },
    {
      title: translate('analysis_timeline', {}, locale, 'ui'),
      text: generateTimelineNarrative(exif, locale),
    },
  ];

  for (const sec of narrativeSections) {
    lines.push(isMarkdown ? `### ${sec.title}` : `[${sec.title}]`);
    lines.push(sec.text);
    lines.push('');
  }

  // Categorized EXIF metadata (8 groups matching Web ExpertAnalysisTabs order)
  lines.push(isMarkdown ? '## Categorized EXIF Metadata' : '--- Categorized EXIF Metadata ---');

  for (const cat of RAW_METADATA_CATEGORIES) {
    const catTitle = translate(cat.catKey, {}, locale, 'ui');
    const rawData = asset.categorizedExif?.[cat.id] || {};
    const entries = Object.entries(rawData);

    lines.push(isMarkdown ? `### ${catTitle}` : `[${catTitle}]`);
    lines.push(...formatCategoryEntries(entries, format, locale));
    lines.push('');
  }

  return lines.join('\n').trim();
}

function stripTrailingColon(label: string): string {
  return label.replace(/:\s*$/, '');
}

function formatKeyValueRows(
  rows: Array<[string, string]>,
  format: SupportedFormat
): string[] {
  if (rows.length === 0) return [];

  if (format === 'markdown') {
    return rows.map(([key, val]) => `- **${stripTrailingColon(key)}**: ${val}`);
  }

  const normalized = rows.map(([key, val]) => [stripTrailingColon(key), val] as const);
  const maxWidth = Math.max(...normalized.map(([key]) => key.length));
  return normalized.map(([key, val]) => `${key.padEnd(maxWidth)} : ${val}`);
}

function formatTable(
  headers: string[],
  rows: string[][],
  format: SupportedFormat
): string[] {
  if (rows.length === 0) return [];

  if (format === 'markdown') {
    const headerRow = `| ${headers.map((h) => escapeMarkdownCell(h)).join(' | ')} |`;
    const dividerRow = `| ${headers.map(() => '---').join(' | ')} |`;
    const bodyRows = rows.map(
      (row) => `| ${row.map((cell) => escapeMarkdownCell(cell)).join(' | ')} |`
    );
    return [headerRow, dividerRow, ...bodyRows];
  }

  const colWidths = headers.map((header, colIdx) => {
    const rowWidths = rows.map((row) => (row[colIdx] ?? '').length);
    return Math.max(header.length, ...rowWidths);
  });

  const padRow = (cells: string[]) =>
    cells.map((cell, idx) => cell.padEnd(colWidths[idx] ?? 0)).join('  ');

  const lines = [`  ${padRow(headers)}`];
  for (const row of rows) {
    lines.push(`  ${padRow(row)}`);
  }
  return lines;
}

function formatLocalizedDuration(
  days: number,
  hours: number,
  minutes: number,
  seconds: number,
  locale: string
): string {
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} ${translate('time_day', {}, locale, 'narratives')}`);
  if (hours > 0) parts.push(`${hours} ${translate('time_hour', {}, locale, 'narratives')}`);
  if (minutes > 0) parts.push(`${minutes} ${translate('time_minute', {}, locale, 'narratives')}`);
  if (seconds > 0 || parts.length === 0) {
    parts.push(`${seconds} ${translate('time_second', {}, locale, 'narratives')}`);
  }
  return parts.join(' ');
}

function formatDurationFromMs(ms: number, locale: string): string {
  if (ms <= 0) {
    return formatLocalizedDuration(0, 0, 0, 0, locale);
  }
  const seconds = Math.floor(ms / 1000) % 60;
  const minutes = Math.floor(ms / (1000 * 60)) % 60;
  const hours = Math.floor(ms / (1000 * 60 * 60)) % 24;
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  return formatLocalizedDuration(days, hours, minutes, seconds, locale);
}

function formatGeoDistance(km: number, meters: number): string {
  if (km >= 1) {
    return `${km.toFixed(2)} km`;
  }
  return `${Math.round(meters)} m`;
}

function resolveMatrixStatusLabel(
  presence: Record<string, boolean>,
  locale: string
): string {
  const hasGps = Boolean(presence['Geospatial']);
  const hasHardware = Boolean(presence['Device Hardware']);
  const hasTimeline = Boolean(presence['Timeline & Date']);

  if (hasGps && hasHardware && hasTimeline) {
    return translate('filter_complete', {}, locale, 'narratives');
  }
  if (hasHardware || hasTimeline || hasGps) {
    return translate('privacy_score_risk', {}, locale, 'ui');
  }
  return translate('filter_stripped', {}, locale, 'narratives');
}

function appendBatchAlerts(
  lines: string[],
  assets: ForensicAsset[],
  format: SupportedFormat,
  locale: string
): void {
  const assetAlerts: Array<{ fileName: string; severity: string; message: string }> = [];
  for (const asset of assets) {
    for (const alert of asset.integrityAlerts) {
      assetAlerts.push({
        fileName: asset.fileName,
        severity: alert.severity,
        message: alert.defaultMessage,
      });
    }
  }

  if (assetAlerts.length === 0) return;

  const title = translate('batch_asset_alerts', {}, locale, 'ui');
  if (format === 'markdown') {
    lines.push(`## ${title} (${assetAlerts.length})`);
    for (const alert of assetAlerts) {
      lines.push(`- **[${alert.severity.toUpperCase()}]** \`${alert.fileName}\`: ${alert.message}`);
    }
    lines.push('');
    return;
  }

  lines.push(`--- ${title} (${assetAlerts.length}) ---`);
  for (const alert of assetAlerts) {
    lines.push(`[${alert.severity.toUpperCase()}] ${alert.fileName}: ${alert.message}`);
  }
  lines.push('');
}

function appendChronologicalStorySection(
  lines: string[],
  story: ChronologicalBatchStory,
  format: SupportedFormat,
  locale: string
): void {
  const title = translate('chronological_story_title', {}, locale, 'ui');
  lines.push(format === 'markdown' ? `## ${title}` : `--- ${title} ---`);

  if (story.baseline) {
    lines.push(format === 'markdown' ? `> ${story.baseline}` : story.baseline);
    lines.push('');
  }

  for (const step of story.steps) {
    const stepHeader =
      format === 'markdown'
        ? `### Step ${step.stepIndex + 1}: ${step.fileName}`
        : `[Step ${step.stepIndex + 1}] ${step.fileName}`;
    lines.push(stepHeader);
    lines.push(step.narrativeText);
    lines.push('');
  }
}

function appendIntegrityEvidenceSection(
  lines: string[],
  assets: ForensicAsset[],
  collective: CollectiveIntelligenceResult,
  format: SupportedFormat,
  locale: string
): void {
  const title = translate('analysis_integrity', {}, locale, 'ui');
  lines.push(format === 'markdown' ? `### ${title}` : `[${title}]`);

  const cleanLbl = translate('batch_integrity_clean', {}, locale, 'ui');
  const partialLbl = translate('batch_integrity_partial', {}, locale, 'ui');
  const strippedLbl = translate('batch_integrity_stripped', {}, locale, 'ui');
  const { cleanCount, partiallyStrippedCount, fullyStrippedCount, matrix } = collective.integrity;

  if (format === 'markdown') {
    lines.push(
      `- **${cleanLbl}**: ${cleanCount} | **${partialLbl}**: ${partiallyStrippedCount} | **${strippedLbl}**: ${fullyStrippedCount}`
    );
  } else {
    lines.push(`${cleanLbl}: ${cleanCount} | ${partialLbl}: ${partiallyStrippedCount} | ${strippedLbl}: ${fullyStrippedCount}`);
  }

  const headers = [
    translate('file_name', {}, locale, 'ui'),
    title,
    translate('cat_hardware', {}, locale, 'ui'),
    'GPS',
  ];
  const yesText = translate('yes', {}, locale, 'ui');
  const noText = translate('no', {}, locale, 'ui');
  const unknownText = translate('unknown', {}, locale, 'reports');

  const rows = matrix.map((row, idx) => {
    const asset = assets[idx];
    const hardwareLabel = String(
      asset?.exifData?.Make || asset?.exifData?.Model || unknownText
    );
    const hasGps = extractGpsCoordinates(asset?.exifData) !== null;
    return [
      row.fileName,
      resolveMatrixStatusLabel(row.presence, locale),
      hardwareLabel,
      hasGps ? yesText : noText,
    ];
  });

  lines.push(...formatTable(headers, rows, format));
  lines.push('');
}

function appendHardwareEvidenceSection(
  lines: string[],
  collective: CollectiveIntelligenceResult,
  format: SupportedFormat,
  locale: string
): void {
  const title = translate('analysis_hardware', {}, locale, 'ui');
  lines.push(format === 'markdown' ? `### ${title}` : `[${title}]`);

  const yesText = translate('yes', {}, locale, 'ui');
  const noText = translate('no', {}, locale, 'ui');
  const noneText = translate('none_detected', {}, locale, 'ui');

  lines.push(
    ...formatKeyValueRows(
      [
        [
          translate('consistent_hardware', {}, locale, 'ui'),
          collective.hardware.isConsistent ? yesText : noText,
        ],
        [
          translate('unique_devices', {}, locale, 'ui'),
          collective.hardware.uniqueDevices.join(', ') || noneText,
        ],
      ],
      format
    )
  );

  const headers = [
    translate('file_name', {}, locale, 'ui'),
    'Make',
    'Model',
    'Software',
    'Lens Model',
    'Body Serial',
    'Lens Serial',
  ];
  const rows = collective.hardware.details.map((hw) => [
    hw.fileName,
    hw.make,
    hw.model,
    hw.software,
    hw.lensModel,
    hw.bodySerial,
    hw.lensSerial,
  ]);

  lines.push(...formatTable(headers, rows, format));
  lines.push('');
}

function appendTimelineEvidenceSection(
  lines: string[],
  collective: CollectiveIntelligenceResult,
  format: SupportedFormat,
  locale: string
): void {
  const title = translate('analysis_timeline', {}, locale, 'ui');
  lines.push(format === 'markdown' ? `### ${title}` : `[${title}]`);

  const { startTime, endTime, totalDurationMs, jumps, missingAssets } = collective.timeline;
  const startStr = startTime ? formatNaturalDate(startTime, locale) : '-';
  const endStr = endTime ? formatNaturalDate(endTime, locale) : '-';

  lines.push(
    ...formatKeyValueRows(
      [
        [translate('reconstruct_start', {}, locale, 'narratives'), startStr],
        [translate('reconstruct_end', {}, locale, 'narratives'), endStr],
        [
          translate('reconstruct_total', {}, locale, 'narratives'),
          formatDurationFromMs(totalDurationMs, locale),
        ],
        [translate('reconstruct_jumps', {}, locale, 'narratives'), String(jumps.length)],
      ],
      format
    )
  );

  const anomalyTag = translate('time_anomaly_tag', {}, locale, 'ui');
  for (const jump of jumps) {
    const delta = formatLocalizedDuration(
      jump.deltaDays,
      jump.deltaHours,
      jump.deltaMinutes,
      jump.deltaSeconds,
      locale
    );
    const prefix =
      jump.deltaDays > 0
        ? format === 'markdown'
          ? `**[${anomalyTag}]** `
          : `[${anomalyTag}] `
        : '';
    const lineBody = `${prefix}${jump.fromFileName} -> (+${delta}) ${jump.toFileName}`;
    lines.push(format === 'markdown' ? `  - ${lineBody}` : `  ${lineBody}`);
  }

  if (missingAssets.length > 0) {
    const missingLabel = stripTrailingColon(
      translate('reconstruct_missing', { count: missingAssets.length }, locale, 'narratives')
    );
    lines.push(format === 'markdown' ? `- **${missingLabel}**:` : `${missingLabel}:`);
    for (const fileName of missingAssets) {
      lines.push(`  - ${fileName}`);
    }
  }

  lines.push('');
}

function appendGeospatialEvidenceSection(
  lines: string[],
  collective: CollectiveIntelligenceResult,
  format: SupportedFormat,
  locale: string,
  roadRouteDetails?: OsrmRouteDetails | null
): void {
  const title = translate('analysis_geospatial', {}, locale, 'ui');
  lines.push(format === 'markdown' ? `### ${title}` : `[${title}]`);

  const { maxSpreadKm, totalPathDistanceKm, spreadCategory, jumps, velocityAlert } =
    collective.geospatial;
  const hasRoadRoute = Boolean(roadRouteDetails && roadRouteDetails.totalDistanceMeters > 0);
  const rows: Array<[string, string]> = [
    [
      translate('geo_max_spread', {}, locale, 'narratives'),
      formatGeoDistance(maxSpreadKm, maxSpreadKm * 1000),
    ],
    [
      translate('geo_reconstruct_range', {}, locale, 'narratives'),
      formatGeoDistance(totalPathDistanceKm, totalPathDistanceKm * 1000),
    ],
  ];

  if (hasRoadRoute && roadRouteDetails) {
    rows.push([
      translate('geo_estimated_road_route', {}, locale, 'narratives'),
      formatGeoDistance(
        roadRouteDetails.totalDistanceMeters / 1000,
        roadRouteDetails.totalDistanceMeters
      ),
    ]);
  }

  rows.push([
    translate('spread_category', {}, locale, 'ui'),
    translate(`spread_${spreadCategory}`, {}, locale, 'ui'),
  ]);

  lines.push(...formatKeyValueRows(rows, format));
  lines.push(
    translate(
      hasRoadRoute ? 'geo_reconstruct_note_road' : 'geo_reconstruct_note_displacement',
      {},
      locale,
      'narratives'
    )
  );

  if (velocityAlert?.hasAnomaly) {
    const alertLabel = translate('velocity_anomaly_label', {}, locale, 'ui');
    const alertDesc = translate(
      'velocity_anomaly_desc',
      {
        from: velocityAlert.fromFileName || '-',
        to: velocityAlert.toFileName || '-',
        speed: velocityAlert.maxSpeedKmh,
      },
      locale,
      'ui'
    );
    lines.push(
      format === 'markdown'
        ? `- **[${alertLabel}]**: ${alertDesc}`
        : `[${alertLabel}] ${alertDesc}`
    );
  }

  if (jumps.length > 0) {
    const jumpsLabel = stripTrailingColon(
      translate('geo_reconstruct_jumps', {}, locale, 'narratives')
    );
    lines.push(format === 'markdown' ? `- **${jumpsLabel}**:` : `${jumpsLabel}:`);
    const viaRoadText = translate('geo_via_road', {}, locale, 'narratives');

    for (let idx = 0; idx < jumps.length; idx++) {
      const jump = jumps[idx]!;
      const directDist = formatGeoDistance(jump.distanceKm, jump.distanceMeters);
      const legMeters = roadRouteDetails?.legDistancesMeters?.[idx];
      const roadSuffix =
        legMeters != null && legMeters > 0
          ? ` (~${formatGeoDistance(legMeters / 1000, legMeters)} ${viaRoadText})`
          : '';
      const entry = `${jump.fromFileName} -> (+${directDist}${roadSuffix}) ${jump.toFileName}`;
      lines.push(format === 'markdown' ? `  - ${entry}` : `  ${entry}`);
    }
  }

  lines.push('');
}

export function formatBatchOutput(
  assets: ForensicAsset[],
  collective: CollectiveIntelligenceResult,
  story: ChronologicalBatchStory,
  options?: CliOptions,
  roadRouteDetails?: OsrmRouteDetails | null,
): string {
  const locale = options?.locale || 'en';
  const format: SupportedFormat = options?.format === 'markdown' ? 'markdown' : 'plain';
  const lines: string[] = [];

  const totalAssetsLabel = translate('batch_total_assets', {}, locale, 'ui');
  if (format === 'markdown') {
    lines.push('# ExifSense Collective Intelligence Analysis');
    lines.push(`- **${totalAssetsLabel}**: ${assets.length}`);
    lines.push('');
  } else {
    lines.push('=== ExifSense Collective Intelligence Analysis ===');
    lines.push(`${totalAssetsLabel}: ${assets.length}`);
    lines.push('');
  }

  appendBatchAlerts(lines, assets, format, locale);
  appendChronologicalStorySection(lines, story, format, locale);

  const combinedTitle = translate('combined_intel', {}, locale, 'ui');
  lines.push(format === 'markdown' ? `## ${combinedTitle}` : `--- ${combinedTitle} ---`);
  appendIntegrityEvidenceSection(lines, assets, collective, format, locale);
  appendHardwareEvidenceSection(lines, collective, format, locale);
  appendTimelineEvidenceSection(lines, collective, format, locale);
  appendGeospatialEvidenceSection(lines, collective, format, locale, roadRouteDetails);

  return lines.join('\n').trim();
}

/**
 * Formats cryptographic hash manifest results into plain text ASCII table or markdown table.
 */
export function formatHashOutput(results: FileHashResult[], options?: CliOptions): string {
  const isMarkdown = options?.format === 'markdown';
  const totalFiles = results.length;

  if (isMarkdown) {
    const lines: string[] = [
      '# ExifSense Cryptographic Hash Manifest',
      `- **Total Files**: ${totalFiles}`,
      '',
    ];

    if (totalFiles === 0) {
      lines.push('No files found.');
      return lines.join('\n');
    }

    lines.push('| File Name | Size (bytes) | SHA-256 | SHA-1 |');
    lines.push('| --- | --- | --- | --- |');

    for (const file of results) {
      const safeName = file.fileName.replace(/\|/g, '\\|');
      lines.push(`| ${safeName} | ${file.fileSize} | \`${file.sha256}\` | \`${file.sha1}\` |`);
    }

    return lines.join('\n');
  }

  // Plain text ASCII table format
  const lines: string[] = [
    '=== ExifSense Cryptographic Hash Manifest ===',
    `Total Files: ${totalFiles}`,
    '',
  ];

  if (totalFiles === 0) {
    lines.push('No files found.');
    return lines.join('\n');
  }

  let maxNameWidth = 'File Name'.length;
  let maxSizeWidth = 'Size (bytes)'.length;

  for (const file of results) {
    if (file.fileName.length > maxNameWidth) {
      maxNameWidth = file.fileName.length;
    }
    const sizeStr = String(file.fileSize);
    if (sizeStr.length > maxSizeWidth) {
      maxSizeWidth = sizeStr.length;
    }
  }

  const headerName = 'File Name'.padEnd(maxNameWidth);
  const headerSize = 'Size (bytes)'.padEnd(maxSizeWidth);
  const headerSha256 = 'SHA-256'.padEnd(64);
  const headerSha1 = 'SHA-1';

  lines.push(`${headerName}  ${headerSize}  ${headerSha256}  ${headerSha1}`);

  for (const file of results) {
    const colName = file.fileName.padEnd(maxNameWidth);
    const colSize = String(file.fileSize).padEnd(maxSizeWidth);
    const colSha256 = file.sha256.padEnd(64);
    const colSha1 = file.sha1;
    lines.push(`${colName}  ${colSize}  ${colSha256}  ${colSha1}`);
  }

  return lines.join('\n');
}
