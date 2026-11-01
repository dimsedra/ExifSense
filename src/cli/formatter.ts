import type { ForensicAsset, CollectiveIntelligenceResult } from '../core/forensics/types';
import type { ChronologicalBatchStory } from '../core/narratives/types';
import {
  generateHardwareNarrative,
  generateIntegrityNarrative,
  generateExposureNarrative,
  generateOpticsNarrative,
  generateQualityNarrative,
  generateTimelineNarrative,
  generateGeospatialNarrative,
  generateCollectiveNarratives,
} from '../core/narratives/narratives';
import type { CliOptions } from './args';

export function formatSingleOutput(asset: ForensicAsset, options?: CliOptions): string {
  const locale = options?.locale || 'en';
  const isMarkdown = options?.format === 'markdown';

  const lines: string[] = [];

  if (isMarkdown) {
    lines.push('# ExifSense Forensic Analysis');
    lines.push(`- **File Name**: ${asset.fileName}`);
    lines.push(`- **File Size**: ${asset.fileSize} bytes`);
    lines.push(`- **Format**: ${asset.fileType}`);
    lines.push(`- **Dimensions**: ${asset.actualWidth ?? 'Unknown'} x ${asset.actualHeight ?? 'Unknown'}`);
    lines.push(`- **SHA-256**: \`${asset.sha256}\``);
    lines.push(`- **SHA-1**: \`${asset.sha1}\``);
    lines.push('');
  } else {
    lines.push('=== ExifSense Forensic Analysis ===');
    lines.push(`File Name  : ${asset.fileName}`);
    lines.push(`File Size  : ${asset.fileSize} bytes`);
    lines.push(`Format     : ${asset.fileType}`);
    lines.push(`Dimensions : ${asset.actualWidth ?? 'Unknown'} x ${asset.actualHeight ?? 'Unknown'}`);
    lines.push(`SHA-256    : ${asset.sha256}`);
    lines.push(`SHA-1      : ${asset.sha1}`);
    lines.push('');
  }

  // Integrity alerts
  const alertCount = asset.integrityAlerts.length;
  if (isMarkdown) {
    lines.push(`## Integrity Alerts (${alertCount})`);
  } else {
    lines.push(`--- Integrity Alerts (${alertCount}) ---`);
  }

  if (alertCount === 0) {
    lines.push('No integrity anomalies detected.');
  } else {
    for (const alert of asset.integrityAlerts) {
      const severityTag = `[${alert.severity.toUpperCase()}]`;
      lines.push(`${severityTag} ${alert.defaultMessage}`);
    }
  }
  lines.push('');

  // Forensic narratives
  if (isMarkdown) {
    lines.push('## Forensic Narrative');
  } else {
    lines.push('--- Forensic Narrative ---');
  }

  const hw = asset.categorizedExif?.['Device Hardware'] || asset.exifData || {};
  const exp = asset.categorizedExif?.['Exposure Settings'] || asset.exifData || {};
  const optics = asset.categorizedExif?.['Optics & Lens'] || asset.exifData || {};
  const quality = asset.categorizedExif?.['Image Quality'] || asset.exifData || {};
  const timeline = asset.categorizedExif?.['Timeline & Date'] || asset.exifData || {};

  const lat = typeof asset.exifData?.latitude === 'number' ? asset.exifData.latitude : null;
  const lon = typeof asset.exifData?.longitude === 'number' ? asset.exifData.longitude : null;
  const geoText = (lat !== null && lon !== null)
    ? generateGeospatialNarrative(lat, lon, asset.locationName ?? null, locale)
    : '';

  const narrativeSections = [
    { title: 'Hardware', text: generateHardwareNarrative(hw, locale) },
    { title: 'Integrity', text: generateIntegrityNarrative(asset, locale) },
    { title: 'Exposure', text: generateExposureNarrative(exp, locale) },
    { title: 'Optics', text: generateOpticsNarrative(optics, locale) },
    { title: 'Quality', text: generateQualityNarrative(quality, locale) },
    { title: 'Timeline', text: generateTimelineNarrative(timeline, locale) },
    { title: 'Geospatial', text: geoText },
  ];

  for (const sec of narrativeSections) {
    if (!sec.text) continue;
    if (isMarkdown) {
      lines.push(`### ${sec.title}`);
      lines.push(sec.text);
      lines.push('');
    } else {
      lines.push(`[${sec.title}]`);
      lines.push(sec.text);
      lines.push('');
    }
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
  options?: CliOptions
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
    lines.push(`- **Total Path Distance**: ${collective.geospatial.totalPathDistanceKm.toFixed(2)} km`);
    lines.push(`- **Max Spread**: ${collective.geospatial.maxSpreadKm.toFixed(2)} km`);
    lines.push(`- **Spread Category**: ${collective.geospatial.spreadCategory}`);
    if (velocityAlert?.hasAnomaly) {
      lines.push(`- **[CRITICAL VELOCITY ANOMALY]**: Impossible speed detected between ${velocityAlert.fromFileName} and ${velocityAlert.toFileName} (${velocityAlert.maxSpeedKmh} km/h).`);
    }
    lines.push('');
  } else {
    lines.push('--- Geospatial & Movement ---');
    lines.push(`Total Path Distance   : ${collective.geospatial.totalPathDistanceKm.toFixed(2)} km`);
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
