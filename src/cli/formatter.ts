import type {
  ForensicAsset,
  CollectiveIntelligenceResult,
  ExifCategory,
} from '../core/forensics/types';
import type { ChronologicalBatchStory } from '../core/narratives/types';
import type { OsrmRouteDetails } from '../services/mapHelpers';
import type { FileHashResult } from './hasher';
import { isValidCoordinate } from '../services/mapHelpers';
import { formatExifValue, formatLabel } from '../core/forensics/metadata';
import {
  generateHardwareNarrative,
  generateIntegrityNarrative,
  generateExposureNarrative,
  generateOpticsNarrative,
  generateQualityNarrative,
  generateTimelineNarrative,
  generateGeospatialNarrative,
  generateCollectiveNarratives,
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

const DATE_LOCALE_MAP: Record<string, string> = {
  id: 'id-ID',
  ar: 'ar-SA',
};

function formatFileModifiedDate(fileDate: number | undefined, locale: string): string {
  if (fileDate == null || !Number.isFinite(fileDate) || fileDate <= 0) {
    return translate('unknown', {}, locale, 'reports');
  }
  const parsedDate = new Date(fileDate);
  if (Number.isNaN(parsedDate.getTime())) {
    return translate('unknown', {}, locale, 'reports');
  }
  const localeCode = DATE_LOCALE_MAP[locale] ?? 'en-US';
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

function formatDuration(ms: number): string {
  if (ms <= 0) return '0s';
  const seconds = Math.floor(ms / 1000) % 60;
  const minutes = Math.floor(ms / (1000 * 60)) % 60;
  const hours = Math.floor(ms / (1000 * 60 * 60)) % 24;
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

  return parts.join(' ');
}

export function formatBatchOutput(
  assets: ForensicAsset[],
  collective: CollectiveIntelligenceResult,
  story: ChronologicalBatchStory,
  options?: CliOptions,
  roadRouteDetails?: OsrmRouteDetails | null,
): string {
  const locale = options?.locale || 'en';
  const isMarkdown = options?.format === 'markdown';
  const lines: string[] = [];

  if (isMarkdown) {
    lines.push('# ExifSense Collective Intelligence Analysis');
    lines.push(`- **Total Assets**: ${assets.length}`);
    lines.push('');
  } else {
    lines.push('=== ExifSense Collective Intelligence Analysis ===');
    lines.push(`Total Assets: ${assets.length}`);
    lines.push('');
  }

  // Asset Integrity Alerts across batch
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

  if (assetAlerts.length > 0) {
    if (isMarkdown) {
      lines.push(`## Asset Integrity Alerts (${assetAlerts.length})`);
      for (const a of assetAlerts) {
        lines.push(`- **[${a.severity.toUpperCase()}]** \`${a.fileName}\`: ${a.message}`);
      }
      lines.push('');
    } else {
      lines.push(`--- Asset Integrity Alerts (${assetAlerts.length}) ---`);
      for (const a of assetAlerts) {
        lines.push(`[${a.severity.toUpperCase()}] ${a.fileName}: ${a.message}`);
      }
      lines.push('');
    }
  }

  // Combined Intelligence Analysis
  const collectiveSections = generateCollectiveNarratives(collective, assets.length, locale);
  if (collectiveSections.length > 0) {
    if (isMarkdown) {
      lines.push('## Combined Analysis');
      for (const sec of collectiveSections) {
        if (!sec.narrative) continue;
        lines.push(`### ${sec.title}`);
        lines.push(sec.narrative);
        lines.push('');
      }
    } else {
      lines.push('--- Combined Analysis ---');
      for (const sec of collectiveSections) {
        if (!sec.narrative) continue;
        lines.push(`[${sec.title}]`);
        lines.push(sec.narrative);
        lines.push('');
      }
    }
  }

  // Device Hardware
  if (isMarkdown) {
    lines.push('## Device Hardware');
    lines.push(`- **Consistent Hardware**: ${collective.hardware.isConsistent ? 'Yes' : 'No'}`);
    lines.push(`- **Unique Devices**: ${collective.hardware.uniqueDevices.join(', ') || 'None detected'}`);
    lines.push('');
  } else {
    lines.push('--- Device Hardware ---');
    lines.push(`Consistent Hardware : ${collective.hardware.isConsistent ? 'Yes' : 'No'}`);
    lines.push(`Unique Devices      : ${collective.hardware.uniqueDevices.join(', ') || 'None detected'}`);
    lines.push('');
  }

  // Timeline
  if (isMarkdown) {
    lines.push('## Timeline & Sequence');
    lines.push(`- **Total Duration**: ${formatDuration(collective.timeline.totalDurationMs)}`);
    lines.push(`- **Time Gaps Between Photos**: ${collective.timeline.jumps.length}`);
    for (const jump of collective.timeline.jumps) {
      const isLongGap = jump.deltaDays > 0;
      const tag = isLongGap ? '**[TIME ANOMALY]** ' : '';
      lines.push(`  - ${tag}${jump.fromFileName} -> ${jump.toFileName}: ${formatDuration(jump.deltaMs)}`);
    }
    lines.push('');
  } else {
    lines.push('--- Timeline & Sequence ---');
    lines.push(`Total Duration            : ${formatDuration(collective.timeline.totalDurationMs)}`);
    lines.push(`Time Gaps Between Photos  : ${collective.timeline.jumps.length}`);
    for (const jump of collective.timeline.jumps) {
      const isLongGap = jump.deltaDays > 0;
      const tag = isLongGap ? '[TIME ANOMALY] ' : '';
      lines.push(`  ${tag}Gap: ${jump.fromFileName} -> ${jump.toFileName} (${formatDuration(jump.deltaMs)})`);
    }
    lines.push('');
  }

  // Geospatial
  const velocityAlert = collective.geospatial.velocityAlert;
  if (isMarkdown) {
    lines.push('## Geospatial & Movement');
    lines.push(`- **Cumulative Displacement**: ${collective.geospatial.totalPathDistanceKm.toFixed(2)} km`);
    if (roadRouteDetails && roadRouteDetails.totalDistanceMeters > 0) {
      lines.push(`- **Estimated Road Route**: ${(roadRouteDetails.totalDistanceMeters / 1000).toFixed(2)} km`);
    }
    lines.push(`- **Max Spread**: ${collective.geospatial.maxSpreadKm.toFixed(2)} km`);
    lines.push(`- **Spread Category**: ${collective.geospatial.spreadCategory}`);
    if (velocityAlert?.hasAnomaly) {
      lines.push(`- **[CRITICAL VELOCITY ANOMALY]**: Impossible speed detected between ${velocityAlert.fromFileName} and ${velocityAlert.toFileName} (${velocityAlert.maxSpeedKmh} km/h).`);
    }
    lines.push('');
  } else {
    lines.push('--- Geospatial & Movement ---');
    lines.push(`Cumulative Displacement : ${collective.geospatial.totalPathDistanceKm.toFixed(2)} km`);
    if (roadRouteDetails && roadRouteDetails.totalDistanceMeters > 0) {
      lines.push(`Estimated Road Route    : ${(roadRouteDetails.totalDistanceMeters / 1000).toFixed(2)} km`);
    }
    lines.push(`Max Spread            : ${collective.geospatial.maxSpreadKm.toFixed(2)} km`);
    lines.push(`Spread Category       : ${collective.geospatial.spreadCategory}`);
    if (velocityAlert?.hasAnomaly) {
      lines.push(`[CRITICAL] Velocity Anomaly: Impossible speed between ${velocityAlert.fromFileName} and ${velocityAlert.toFileName} (${velocityAlert.maxSpeedKmh} km/h)`);
    }
    lines.push('');
  }

  // Chronological Story
  if (isMarkdown) {
    lines.push('## Chronological Story');
    if (story.baseline) {
      lines.push(`> ${story.baseline}`);
      lines.push('');
    }
    for (const step of story.steps) {
      lines.push(`### Step ${step.stepIndex + 1}: ${step.fileName}`);
      lines.push(step.narrativeText);
      lines.push('');
    }
  } else {
    lines.push('--- Chronological Story ---');
    if (story.baseline) {
      lines.push(`Baseline: ${story.baseline}`);
      lines.push('');
    }
    for (const step of story.steps) {
      lines.push(`[Step ${step.stepIndex + 1}] ${step.fileName}`);
      lines.push(step.narrativeText);
      lines.push('');
    }
  }

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
