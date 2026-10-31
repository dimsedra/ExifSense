import { ForensicAsset, CollectiveIntelligenceResult } from '../forensics/types';
import { parseExifDate, formatFullDate } from '../forensics/metadata';
import { SupportedLocale, NarrativeSection } from './types';
import enLocale from '../../locales/en.json';
import idLocale from '../../locales/id.json';
import arLocale from '../../locales/ar.json';

const LOCALES: Record<SupportedLocale, Record<string, Record<string, string>>> = {
  en: enLocale as unknown as Record<string, Record<string, string>>,
  id: idLocale as unknown as Record<string, Record<string, string>>,
  ar: arLocale as unknown as Record<string, Record<string, string>>
};

/**
 * Translates a key with parameter substitution and strips HTML tags to produce pure plain text.
 */
export function translate(
  key: string,
  params: Record<string, unknown> = {},
  locale: string = 'en',
  section: string = 'narratives'
): string {
  const activeLocale: SupportedLocale =
    locale in LOCALES ? (locale as SupportedLocale) : 'en';
  const dictionary = LOCALES[activeLocale]?.[section] || LOCALES.en[section] || {};
  let template = dictionary[key] || LOCALES.en[section]?.[key] || key;

  for (const [k, v] of Object.entries(params)) {
    template = template.replace(new RegExp(`\\{${k}\\}`, 'g'), () => String(v ?? ''));
  }

  // Strip HTML tags for clean plain text output
  return template
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .trim();
}

const EDIT_SOFTWARE = [
  'adobe',
  'photoshop',
  'lightroom',
  'gimp',
  'canva',
  'snapseed',
  'pixlr',
  'corel',
  'affinity',
  'picsart'
];

/**
 * Generates plain-text hardware profile and software tampering narrative.
 */
export function generateHardwareNarrative(
  props: Record<string, unknown>,
  locale: string = 'en'
): string {
  const make = String(props.Make || 'an unknown manufacturer');
  const model = String(props.Model || 'an unspecified device');
  const lensModel = props.LensModel ? String(props.LensModel) : '';
  const lens = lensModel ? ` ${translate('with_lens', { lens: lensModel }, locale)}` : '';
  const softwareName = props.Software ? String(props.Software) : '';

  const isModified =
    softwareName && EDIT_SOFTWARE.some((s) => softwareName.toLowerCase().includes(s));

  if (isModified) {
    return translate('hardware_mod', { make, model, lens, software: softwareName }, locale);
  }

  let narrative = translate('hardware', { make, model, lens }, locale);
  if (softwareName) {
    narrative += ` ${translate('hardware_software', { software: softwareName }, locale)}`;
  }
  narrative += ` ${translate('hardware_analysis', {}, locale)}`;

  return narrative.trim();
}

/**
 * Generates plain-text digital integrity narrative for a single forensic asset.
 */
export function generateIntegrityNarrative(asset: ForensicAsset, locale: string = 'en'): string {
  if (asset.integrityAlerts && asset.integrityAlerts.length > 0) {
    return asset.integrityAlerts.map((a) => a.defaultMessage).join(' | ');
  }

  const hasGps =
    asset.exifData.latitude !== undefined && asset.exifData.longitude !== undefined;
  const hasDate = Boolean(
    asset.exifData.DateTimeOriginal ||
      asset.exifData.DateTimeDigitized ||
      asset.exifData.DateTime
  );
  const hasDevice = Boolean(asset.exifData.Make || asset.exifData.Model);

  if (!hasGps && hasDate && hasDevice) {
    return translate('integrity_clean_no_gps', {}, locale);
  }
  if (!hasDate && hasGps && hasDevice) {
    return translate('integrity_clean_no_datetime', {}, locale);
  }
  if (!hasDevice && hasGps && hasDate) {
    return translate('integrity_clean_no_device', {}, locale);
  }

  return translate('integrity_clean', {}, locale);
}

/**
 * Formats exposure time into human readable representation (e.g. 1/250s or 2s).
 */
function formatExposureTime(value: unknown): string {
  if (value === undefined || value === null) return '';
  const num = Number(value);
  if (isNaN(num) || num <= 0) return String(value);
  if (num < 1) {
    const denom = Math.round(1 / num);
    return `1/${denom}s`;
  }
  return `${num}s`;
}

/**
 * Generates plain-text narrative summarizing exposure and ambient lighting conditions.
 */
export function generateExposureNarrative(
  props: Record<string, unknown>,
  locale: string = 'en'
): string {
  const aperture = props.FNumber
    ? `f/${props.FNumber}`
    : props.ApertureValue
      ? `f/${props.ApertureValue}`
      : translate('unknown_aperture', {}, locale);

  const shutter = props.ExposureTime
    ? formatExposureTime(props.ExposureTime)
    : translate('unknown_shutter', {}, locale);

  const iso = props.ISO ? `ISO ${props.ISO}` : translate('unspecified_iso', {}, locale);
  const program = props.ExposureProgram
    ? translate('using_program', { program: props.ExposureProgram }, locale)
    : '';

  const fVal = parseFloat(String(props.FNumber || props.ApertureValue || '0'));
  const isoVal = parseInt(String(props.ISO || '0'), 10);
  const shutterVal = parseFloat(String(props.ExposureTime || '0'));

  let lightingKey = 'exp_standard';
  if (fVal > 0 && fVal < 2.8) {
    lightingKey = 'exp_shallow_depth';
  } else if (isoVal >= 800) {
    lightingKey = 'exp_low_light';
  } else if (isoVal > 0 && isoVal <= 200 && shutterVal > 0 && shutterVal <= 0.002) {
    lightingKey = 'exp_bright';
  }

  const baseText = translate('exposure', { aperture, shutter, iso, program }, locale);
  const conditionText = translate(lightingKey, {}, locale);
  return `${baseText} ${conditionText}`.trim();
}

/**
 * Generates plain-text narrative summarizing optics, focal length, and digital zoom.
 */
export function generateOpticsNarrative(
  props: Record<string, unknown>,
  locale: string = 'en'
): string {
  const focal = props.FocalLength
    ? `${props.FocalLength}mm`
    : translate('unknown_focal', {}, locale);

  const focal35 = props.FocalLengthIn35mmFormat
    ? translate('equivalent_35mm', { mm: props.FocalLengthIn35mmFormat }, locale)
    : '';

  const zoomRatio = Number(props.DigitalZoomRatio || 0);
  const zoom =
    zoomRatio > 1 ? `. ${translate('digital_zoom', { zoom: zoomRatio }, locale)}` : '';

  return translate('optics', { focal, focal35, zoom }, locale);
}

/**
 * Generates plain-text narrative summarizing image resolution, contrast, sharpness, and color space.
 */
export function generateQualityNarrative(
  props: Record<string, unknown>,
  locale: string = 'en'
): string {
  const width = String(props.ImageWidth || props.PixelXDimension || 'unknown');
  const height = String(props.ImageHeight || props.PixelYDimension || 'unknown');
  const contrast = String(props.Contrast || 'Standard');
  const sharpness = String(props.Sharpness || 'Standard');
  const colorSpace = String(props.ColorSpace || 'sRGB');

  return translate(
    'quality',
    { width, height, contrast, sharpness, colorSpace },
    locale
  );
}

/**
 * Generates plain-text narrative summarizing chronology, UTC conversion, and modification divergence.
 */
export function generateTimelineNarrative(
  props: Record<string, unknown>,
  locale: string = 'en'
): string {
  const rawCapture = props.DateTimeOriginal || props.CreateDate || props.DateTime;
  if (!rawCapture) {
    return translate('no_chrono', {}, locale);
  }

  const dateObj = parseExifDate(rawCapture);
  const rawStr = String(rawCapture);
  const dateStr = dateObj ? formatFullDate(dateObj) : rawStr;
  const gmtStr = dateObj ? dateObj.toUTCString() : rawStr;

  let narrative = translate('timeline_capture', { dateStr }, locale);
  narrative += `\n${translate('timeline_format', { rawStr }, locale)}`;
  narrative += `\n${translate('timeline_gmt', { gmtStr }, locale)}`;

  const parsedMod = props.ModifyDate ? parseExifDate(props.ModifyDate) : null;
  if (parsedMod && dateObj && parsedMod.getTime() !== dateObj.getTime()) {
    const modStr = formatFullDate(parsedMod);
    narrative += `\n${translate('timeline_mod_note', { modStr }, locale)}`;
  } else {
    narrative += `\n${translate('timeline_integrity', {}, locale)}`;
  }

  return narrative.trim();
}

/**
 * Generates plain-text geospatial coordinates and location summary narrative.
 */
export function generateGeospatialNarrative(
  latitude: number,
  longitude: number,
  locationName?: string | null,
  locale: string = 'en'
): string {
  if (
    latitude === undefined ||
    longitude === undefined ||
    isNaN(latitude) ||
    isNaN(longitude)
  ) {
    return translate('no_geo', {}, locale);
  }

  const locName = locationName || translate('remote_location', {}, locale);
  const lat = latitude.toFixed(5);
  const lng = longitude.toFixed(5);

  return translate('geospatial', { locationName: locName, lat, lng }, locale);
}

/**
 * Generates natural language multi-asset collective narratives for PDF, Markdown, and UI displays.
 */
export function generateCollectiveNarratives(
  collective: CollectiveIntelligenceResult,
  totalAssets: number,
  locale: string = 'en'
): NarrativeSection[] {
  const sections: NarrativeSection[] = [];

  // 1. Digital Integrity
  let integrityText = '';
  if (collective.integrity.fullyStrippedCount === totalAssets) {
    integrityText = translate(
      'combined_integrity_stripped_all',
      { count: totalAssets, total: totalAssets },
      locale
    );
  } else if (collective.integrity.cleanCount === totalAssets) {
    integrityText = translate('combined_integrity_clean', { total: totalAssets }, locale);
  } else {
    integrityText = translate(
      'combined_integrity_mix',
      {
        total: totalAssets,
        fully: collective.integrity.fullyStrippedCount,
        partially: collective.integrity.partiallyStrippedCount,
        clean: collective.integrity.cleanCount
      },
      locale
    );
  }
  sections.push({
    title: translate('analysis_integrity', {}, locale, 'ui'),
    narrative: integrityText
  });

  // 2. Device Hardware
  let hwText = '';
  if (
    collective.hardware.uniqueDevices.length === 1 &&
    collective.hardware.missingCount === 0
  ) {
    hwText = translate(
      'combined_hw_consistent',
      { device: collective.hardware.uniqueDevices[0] },
      locale
    );
  } else if (collective.hardware.uniqueDevices.length > 1) {
    hwText = translate(
      'combined_hw_discrepancy',
      { deviceList: collective.hardware.uniqueDevices.join(', ') },
      locale
    );
  } else if (
    collective.hardware.uniqueDevices.length === 1 &&
    collective.hardware.missingCount > 0
  ) {
    const count = totalAssets - collective.hardware.missingCount;
    hwText = translate(
      'combined_hw_sparse_consistent',
      { count, total: totalAssets, device: collective.hardware.uniqueDevices[0] },
      locale
    );
  }

  if (
    collective.hardware.hasSerialMatch &&
    collective.hardware.uniqueSerials.length === 1
  ) {
    const serialNote = translate(
      'combined_serial_match',
      { serial: collective.hardware.uniqueSerials[0] },
      locale
    );
    hwText = hwText ? `${hwText}\n\n${serialNote}` : serialNote;
  }
  sections.push({
    title: translate('analysis_hardware', {}, locale, 'ui'),
    narrative: hwText
  });

  // 3. Timeline
  let timelineText = '';
  if (
    collective.timeline.totalDurationMs > 0 &&
    collective.timeline.startTime &&
    collective.timeline.endTime
  ) {
    const diffHours = (
      collective.timeline.totalDurationMs /
      (1000 * 60 * 60)
    )
      .toFixed(1)
      .replace('.0', '');
    timelineText = translate(
      'combined_timeline',
      {
        diffHours,
        start: formatFullDate(collective.timeline.startTime),
        end: formatFullDate(collective.timeline.endTime)
      },
      locale
    );
  } else if (collective.timeline.missingAssets.length === totalAssets - 1) {
    timelineText = translate(
      'combined_timeline_sparse',
      { total: totalAssets },
      locale
    );
  }
  sections.push({
    title: translate('analysis_timeline', {}, locale, 'ui'),
    narrative: timelineText
  });

  // 4. Geospatial
  let geoText = '';
  const dist = collective.geospatial.totalPathDistanceKm;
  if (collective.geospatial.spreadCategory === 'concentrated') {
    geoText = translate('combined_geo_concentrated', {}, locale);
  } else if (collective.geospatial.spreadCategory === 'localized') {
    geoText = translate('combined_geo_localized', { dist: Math.round(dist * 1000) }, locale);
  } else if (collective.geospatial.spreadCategory === 'trail') {
    geoText = translate('combined_geo_trail', { dist: dist.toFixed(1) }, locale);
  }

  if (collective.geospatial.velocityAlert?.hasAnomaly) {
    const speed = collective.geospatial.velocityAlert.maxSpeedKmh;
    const velNote = translate('velocity_warning', { speed }, locale);
    geoText = geoText ? `${geoText}\n\n${velNote}` : velNote;
  }
  sections.push({
    title: translate('analysis_geospatial', {}, locale, 'ui'),
    narrative: geoText
  });

  return sections;
}
