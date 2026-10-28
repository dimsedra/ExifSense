import { categorizeExif } from './metadata';
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

  return alerts;
}
