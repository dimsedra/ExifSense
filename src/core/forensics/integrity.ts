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

  // 5. Dimension Mismatch Detection
  const rawExifWidth =
    exif.ExifImageWidth ?? exif.PixelXDimension ?? exif.ImageWidth;
  const rawExifHeight =
    exif.ExifImageHeight ?? exif.PixelYDimension ?? exif.ImageHeight;
  const actualWidth = asset.actualWidth;
  const actualHeight = asset.actualHeight;

  if (
    rawExifWidth != null &&
    rawExifHeight != null &&
    actualWidth != null &&
    actualHeight != null
  ) {
    const exifWidth = Number(rawExifWidth);
    const exifHeight = Number(rawExifHeight);
    const numActualWidth = Number(actualWidth);
    const numActualHeight = Number(actualHeight);

    if (
      !Number.isNaN(exifWidth) &&
      !Number.isNaN(exifHeight) &&
      !Number.isNaN(numActualWidth) &&
      !Number.isNaN(numActualHeight) &&
      (exifWidth !== numActualWidth || exifHeight !== numActualHeight)
    ) {
      alerts.push({
        type: 'dimension_mismatch',
        severity: 'warning',
        messageParam: {
          exifWidth,
          exifHeight,
          actualWidth: numActualWidth,
          actualHeight: numActualHeight,
        },
        defaultMessage: `Dimension Mismatch: EXIF metadata reports image dimensions as ${exifWidth}x${exifHeight}, but the actual pixel array size is ${numActualWidth}x${numActualHeight}. This suggests the image was cropped or resized without updating the EXIF metadata.`,
      });
    }
  }

  // 6. Geospatial Spoofing Checks
  if (exif.latitude != null && exif.longitude != null) {
    const lat = Number(exif.latitude);
    const lng = Number(exif.longitude);

    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
      if (Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001) {
        alerts.push({
          type: 'null_island',
          severity: 'critical',
          defaultMessage:
            'Geospatial Spoofing: Coordinates point to Null Island (0, 0), indicating invalid or spoofed GPS data.',
        });
      } else if (Number.isInteger(lat) || Number.isInteger(lng)) {
        alerts.push({
          type: 'integer_coordinate_precision',
          severity: 'warning',
          defaultMessage:
            'Synthetic Coordinates: Latitude or longitude has integer precision, suggesting manual or synthetic coordinate entry.',
        });
      }
    }
  }

  return alerts;
}
