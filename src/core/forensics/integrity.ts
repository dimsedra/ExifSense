import { categorizeExif, extractGpsCoordinates } from './metadata';
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

const MISSING_PILLAR_MESSAGES: Record<'gps' | 'datetime' | 'device', string> = {
  gps: 'GPS coordinates are not recorded in this file.',
  datetime: 'Capture date and time are not recorded in this file.',
  device: 'Device manufacturer, model, and camera settings are not recorded in this file.',
};

/**
 * Checks whether a Software tag string matches known image editing software keywords.
 */
export function isEditingSoftware(software: string): boolean {
  const softwareLower = software.toLowerCase();
  return EDITING_SOFTWARE_KEYWORDS.some((kw) => softwareLower.includes(kw));
}

/**
 * Evaluates metadata completeness and Software tag observations for a single asset.
 */
export function evaluateSingleAssetIntegrity(asset: SingleAssetInput): IntegrityAlert[] {
  const alerts: IntegrityAlert[] = [];
  const exif = asset.exifData || {};

  const hasGps = extractGpsCoordinates(exif) !== null;
  const hasDateTime = Boolean(
    exif.DateTimeOriginal || exif.CreateDate || exif.DateTime,
  );
  const hasDevice = Boolean(
    exif.Make || exif.Model || exif.ExposureTime || exif.FNumber || exif.ISO,
  );

  const categorized = categorizeExif(exif);
  const hasAnyExif = MEANINGFUL_CATEGORIES.some(
    (cat) => Object.keys(categorized[cat]).length > 0,
  );

  if (!hasAnyExif && !hasGps) {
    alerts.push({
      type: 'fully_stripped',
      severity: 'info',
      defaultMessage: 'No EXIF metadata was found in this file.',
    });
    return alerts;
  }

  const missingPillars: Array<'gps' | 'datetime' | 'device'> = [];
  if (!hasGps) missingPillars.push('gps');
  if (!hasDateTime) missingPillars.push('datetime');
  if (!hasDevice) missingPillars.push('device');

  for (const pillar of missingPillars) {
    alerts.push({
      type: `missing_${pillar}`,
      severity: 'info',
      defaultMessage: MISSING_PILLAR_MESSAGES[pillar],
    });
  }

  const software = typeof exif.Software === 'string' ? exif.Software.trim() : '';
  if (software && isEditingSoftware(software)) {
    alerts.push({
      type: 'editing_software',
      severity: 'info',
      messageParam: { software },
      defaultMessage: `Software tag records "${software}".`,
    });
  }

  return alerts;
}
