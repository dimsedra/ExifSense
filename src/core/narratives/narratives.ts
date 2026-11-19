import { ForensicAsset, CollectiveIntelligenceResult, IntegrityAlert } from '../forensics/types';
import { isEditingSoftware } from '../forensics/integrity';
import { parseExifDate, formatFullDate } from '../forensics/metadata';
import { SupportedLocale, NarrativeSection } from './types';
import enLocale from '../../locales/en.json';
import idLocale from '../../locales/id.json';

const LOCALES: Record<SupportedLocale, Record<string, Record<string, string>>> = {
  en: enLocale as unknown as Record<string, Record<string, string>>,
  id: idLocale as unknown as Record<string, Record<string, string>>,
};

const ALERT_LOCALE_KEYS: Record<IntegrityAlert['type'], string> = {
  fully_stripped: 'integrity_fully_stripped',
  missing_gps: 'integrity_missing_gps',
  missing_datetime: 'integrity_missing_datetime',
  missing_device: 'integrity_missing_device',
  editing_software: 'integrity_edit_software',
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
  const activeLocale: SupportedLocale = locale === 'id' ? 'id' : 'en';
  const dictionary = Object.hasOwn(LOCALES[activeLocale], section)
    ? LOCALES[activeLocale][section]!
    : {};
  const fallbackDictionary = Object.hasOwn(LOCALES.en, section)
    ? LOCALES.en[section]!
    : {};

  let template = key;
  if (Object.hasOwn(dictionary, key)) {
    template = dictionary[key]!;
  } else if (Object.hasOwn(fallbackDictionary, key)) {
    template = fallbackDictionary[key]!;
  }

  for (const [k, v] of Object.entries(params)) {
    template = template.replace(new RegExp(`\\{${k}\\}`, 'g'), () => String(v ?? ''));
  }

  return template
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .trim();
}

/**
 * Translates a single IntegrityAlert into a localized plain-text message.
 */
export function formatIntegrityAlertMessage(
  alert: IntegrityAlert,
  locale: string = 'en'
): string {
  const key = ALERT_LOCALE_KEYS[alert.type];
  if (!key) {
    return alert.defaultMessage;
  }
  const params = alert.type === 'editing_software'
    ? { software: String(alert.messageParam?.software ?? '') }
    : {};
  return translate(key, params, locale);
}

/**
 * Generates plain-text hardware and Software tag narrative from observed EXIF tags.
 */
export function generateHardwareNarrative(
  props: Record<string, unknown>,
  locale: string = 'en'
): string {
  const make = typeof props.Make === 'string' || typeof props.Make === 'number'
    ? String(props.Make).trim()
    : '';
  const model = typeof props.Model === 'string' || typeof props.Model === 'number'
    ? String(props.Model).trim()
    : '';
  const device = [make, model].filter(Boolean).join(' ');
  const lensModel = props.LensModel ? String(props.LensModel).trim() : '';
  const lens = lensModel ? ` ${translate('with_lens', { lens: lensModel }, locale)}` : '';
  const softwareName = props.Software ? String(props.Software).trim() : '';

  if (!device && !lensModel && !softwareName) {
    return translate('no_hardware_narrative', {}, locale);
  }

  const isEditor = softwareName ? isEditingSoftware(softwareName) : false;

  if (!device) {
    if (isEditor) {
      return translate('hardware_mod_no_device', { lens, software: softwareName }, locale);
    }
    const base = translate('hardware_no_device', { lens }, locale);
    return softwareName
      ? `${base} ${translate('hardware_software', { software: softwareName }, locale)}`.trim()
      : base;
  }

  if (isEditor) {
    return translate('hardware_mod', { device, lens, software: softwareName }, locale);
  }

  const base = translate('hardware', { device, lens }, locale);
  return softwareName
    ? `${base} ${translate('hardware_software', { software: softwareName }, locale)}`.trim()
    : base;
}

/**
 * Generates localized plain-text metadata completeness and Software observation narrative.
 */
export function generateIntegrityNarrative(asset: ForensicAsset, locale: string = 'en'): string {
  if (asset.integrityAlerts && asset.integrityAlerts.length > 0) {
    return asset.integrityAlerts
      .map((alert) => formatIntegrityAlertMessage(alert, locale))
      .join(' | ');
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
 * Generates plain-text narrative summarizing recorded exposure settings.
 */
export function generateExposureNarrative(
  props: Record<string, unknown>,
  locale: string = 'en'
): string {
  const hasAnyExposure = Boolean(
    props.FNumber || props.ApertureValue || props.ExposureTime || props.ISO
  );
  if (!hasAnyExposure) {
    return translate('no_exposure_narrative', {}, locale);
  }

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

  let lightingKey = '';
  if (fVal > 0 && fVal < 2.8) {
    lightingKey = 'exp_shallow_depth';
  } else if (isoVal >= 800) {
    lightingKey = 'exp_low_light';
  } else if (isoVal > 0 && isoVal <= 200 && shutterVal > 0 && shutterVal <= 0.002) {
    lightingKey = 'exp_bright';
  }

  const baseText = translate('exposure', { aperture, shutter, iso, program }, locale);
  if (!lightingKey) {
    return baseText;
  }
  return `${baseText} ${translate(lightingKey, {}, locale)}`.trim();
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

function readOptionalTag(props: Record<string, unknown>, key: string): string | null {
  const val = props[key];
  if (val === undefined || val === null) return null;
  const str = String(val).trim();
  return str === '' ? null : str;
}

const QUALITY_TAG_SPECS: Array<{ key: string; localeKey: string; paramName: string }> = [
  { key: 'Contrast', localeKey: 'quality_contrast', paramName: 'contrast' },
  { key: 'Sharpness', localeKey: 'quality_sharpness', paramName: 'sharpness' },
  { key: 'ColorSpace', localeKey: 'quality_color_space', paramName: 'colorSpace' },
];

/**
 * Generates plain-text narrative strictly from present image dimensions and color/processing tags.
 */
export function generateQualityNarrative(
  props: Record<string, unknown>,
  locale: string = 'en'
): string {
  const width = readOptionalTag(props, 'ImageWidth') ?? readOptionalTag(props, 'PixelXDimension');
  const height = readOptionalTag(props, 'ImageHeight') ?? readOptionalTag(props, 'PixelYDimension');

  const parts: string[] = [];
  if (width !== null && height !== null) {
    parts.push(translate('quality_resolution', { width, height }, locale));
  }

  for (const spec of QUALITY_TAG_SPECS) {
    const value = readOptionalTag(props, spec.key);
    if (value !== null) {
      parts.push(translate(spec.localeKey, { [spec.paramName]: value }, locale));
    }
  }

  if (parts.length === 0) {
    return translate('no_quality_narrative', {}, locale);
  }

  return parts.join(' ');
}

/**
 * Generates plain-text narrative summarizing recorded capture timestamp and UTC representation.
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

  const lines = [
    translate('timeline_capture', { dateStr }, locale),
    translate('timeline_format', { rawStr }, locale),
    translate('timeline_gmt', { gmtStr }, locale),
  ];

  return lines.join('\n').trim();
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

function formatAdaptiveKmDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  return `${distanceKm.toFixed(1).replace('.0', '')} km`;
}

/**
 * Generates natural language multi-asset collective narratives for UI and report exports.
 */
export function generateCollectiveNarratives(
  collective: CollectiveIntelligenceResult,
  totalAssets: number,
  locale: string = 'en'
): NarrativeSection[] {
  const sections: NarrativeSection[] = [];

  // 1. Metadata Completeness
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
        clean: collective.integrity.cleanCount,
      },
      locale
    );
  }
  sections.push({
    title: translate('analysis_integrity', {}, locale, 'ui'),
    narrative: integrityText,
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
    narrative: hwText,
  });

  // 3. Timeline
  let timelineText = '';
  if (
    collective.timeline.totalDurationMs > 0 &&
    collective.timeline.startTime &&
    collective.timeline.endTime
  ) {
    const diffHours = (collective.timeline.totalDurationMs / (1000 * 60 * 60))
      .toFixed(1)
      .replace('.0', '');
    timelineText = translate(
      'combined_timeline',
      {
        diffHours,
        start: formatFullDate(collective.timeline.startTime),
        end: formatFullDate(collective.timeline.endTime),
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
    narrative: timelineText,
  });

  // 4. Geospatial
  let geoText = '';
  const pathKm = collective.geospatial.totalPathDistanceKm;
  const maxSpreadKm = collective.geospatial.maxSpreadKm;

  if (collective.geospatial.spreadCategory === 'concentrated') {
    geoText = translate('combined_geo_concentrated', {}, locale);
  } else if (
    collective.geospatial.spreadCategory === 'localized' ||
    collective.geospatial.spreadCategory === 'trail'
  ) {
    if (pathKm > 0) {
      const key =
        collective.geospatial.spreadCategory === 'localized'
          ? 'combined_geo_localized'
          : 'combined_geo_trail';
      geoText = translate(key, { dist: formatAdaptiveKmDistance(pathKm) }, locale);
    } else if (maxSpreadKm > 0) {
      geoText = translate(
        'combined_geo_spread_only',
        { spread: formatAdaptiveKmDistance(maxSpreadKm) },
        locale
      );
    }
  }

  sections.push({
    title: translate('analysis_geospatial', {}, locale, 'ui'),
    narrative: geoText,
  });

  return sections;
}
