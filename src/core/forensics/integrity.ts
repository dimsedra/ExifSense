import { categorizeExif, parseExifDate, formatFullDate } from './metadata';
import type { SingleAssetInput, IntegrityAlert, ExifCategory } from './types';

const MEANINGFUL_CATEGORIES: ExifCategory[] = [
  'Device Hardware',
  'Exposure Settings',
  'Optics & Lens',
  'Image Quality',
  'Timeline & Date',
  'Geospatial',
];

const EDITING_SOFTWARE_KEYWORDS = [
  'adobe',
  'photoshop',
  'lightroom',
  'gimp',
  'canva',
  'snapseed',
  'pixlr',
  'corel',
  'affinity',
  'picsart',
  'paint.net',
  'illustrator',
];

export function evaluateSingleAssetIntegrity(
  asset: SingleAssetInput,
  _now: Date = new Date(),
): IntegrityAlert[] {
  const alerts: IntegrityAlert[] = [];
  const exif = asset.exifData || {};

  const hasGps = exif.latitude != null && exif.longitude != null;
  const hasDateTime = Boolean(
    exif.DateTimeOriginal || exif.CreateDate || exif.DateTime || exif.ModifyDate,
  );
  const hasMake = Boolean(exif.Make || exif.Model);
  const hasExposure = Boolean(exif.ExposureTime || exif.FNumber || exif.ISO);

  const categorized = categorizeExif(exif);
  const hasAnyExif = MEANINGFUL_CATEGORIES.some(
    (cat) => Object.keys(categorized[cat]).length > 0,
  );

  // 1. Fully stripped check
  if (!hasAnyExif && !hasGps) {
    alerts.push({
      type: 'fully_stripped',
      severity: 'info',
      defaultMessage: 'No EXIF metadata found in this file.',
    });
    return alerts;
  }

  // 2. Partially stripped check
  const missingPillars: Array<'gps' | 'datetime' | 'device'> = [];
  if (!hasGps) missingPillars.push('gps');
  if (!hasDateTime) missingPillars.push('datetime');
  if (!hasMake && !hasExposure) missingPillars.push('device');

  if (missingPillars.length >= 2 && hasAnyExif) {
    for (const pillar of missingPillars) {
      alerts.push({
        type: `missing_${pillar}` as 'missing_gps' | 'missing_datetime' | 'missing_device',
        severity: 'info',
        defaultMessage: `Selective Metadata Removal: ${pillar.toUpperCase()} data is absent while other metadata is present.`,
      });
    }
  }

  // 3. Editing Software Signature
  const software = typeof exif.Software === 'string' ? exif.Software : '';
  if (software) {
    const softwareLower = software.toLowerCase();
    const isEditingTool = EDITING_SOFTWARE_KEYWORDS.some((kw) =>
      softwareLower.includes(kw),
    );
    if (isEditingTool) {
      alerts.push({
        type: 'editing_software',
        severity: 'info',
        messageParam: { software },
        defaultMessage: `Editing software signature found: "${software}". This image was likely saved or processed using an image editor.`,
      });
    }
  }

  // 4. Chronological Anomaly Detection
  const originalDate = parseExifDate(
    exif.DateTimeOriginal || exif.CreateDate || exif.DateTime,
  );
  const modifyDate = parseExifDate(exif.ModifyDate);
  const fileDate =
    typeof asset.fileDate === 'number' && !Number.isNaN(asset.fileDate)
      ? new Date(asset.fileDate)
      : null;

  if (originalDate) {
    // 5 minutes clock drift allowance
    if (originalDate.getTime() > _now.getTime() + 5 * 60 * 1000) {
      alerts.push({
        type: 'future_capture_date',
        severity: 'warning',
        messageParam: { date: formatFullDate(originalDate) },
        defaultMessage: `Chronological Anomaly: Capture date (${formatFullDate(originalDate)}) is in the future. This indicates possible timestamp manipulation.`,
      });
    }

    // 5 seconds buffer compared to file system modification time
    if (fileDate && originalDate.getTime() > fileDate.getTime() + 5000) {
      alerts.push({
        type: 'capture_after_file_modification',
        severity: 'warning',
        messageParam: {
          date: formatFullDate(originalDate),
          fileDate: formatFullDate(fileDate),
        },
        defaultMessage: `Chronological Mismatch: Capture date (${formatFullDate(originalDate)}) is newer than the file modification date (${formatFullDate(fileDate)}). This is chronologically impossible.`,
      });
    }
  }

  if (!originalDate && (modifyDate || software)) {
    alerts.push({
      type: 'missing_original_metadata',
      severity: 'warning',
      messageParam: { indicator: software || (modifyDate ? 'ModifyDate' : '') },
      defaultMessage:
        'Stripped Capture Metadata: Original capture timestamp is missing, but post-processing indicators are present.',
    });
  }

  return alerts;
}
