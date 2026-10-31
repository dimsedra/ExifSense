import type { CategorizedExif, ExifCategory } from './types.ts';

const PROPERTY_MAP: Record<string, ExifCategory> = {
  Make: 'Device Hardware',
  Model: 'Device Hardware',
  Software: 'Device Hardware',
  LensModel: 'Device Hardware',
  LensMake: 'Device Hardware',
  BodySerialNumber: 'Device Hardware',
  LensSerialNumber: 'Device Hardware',
  SerialNumber: 'Device Hardware',
  InternalSerialNumber: 'Device Hardware',

  ExposureTime: 'Exposure Settings',
  FNumber: 'Exposure Settings',
  ISO: 'Exposure Settings',
  ExposureProgram: 'Exposure Settings',
  ExposureBiasValue: 'Exposure Settings',
  MeteringMode: 'Exposure Settings',
  Flash: 'Exposure Settings',
  WhiteBalance: 'Exposure Settings',
  ShutterSpeedValue: 'Exposure Settings',
  ApertureValue: 'Exposure Settings',

  FocalLength: 'Optics & Lens',
  FocalLengthIn35mmFormat: 'Optics & Lens',
  MaxApertureValue: 'Optics & Lens',
  DigitalZoomRatio: 'Optics & Lens',
  SubjectDistance: 'Optics & Lens',

  PixelXDimension: 'Image Quality',
  PixelYDimension: 'Image Quality',
  ImageWidth: 'Image Quality',
  ImageHeight: 'Image Quality',
  ColorSpace: 'Image Quality',
  Orientation: 'Image Quality',
  Contrast: 'Image Quality',
  Saturation: 'Image Quality',
  Sharpness: 'Image Quality',
  SceneCaptureType: 'Image Quality',
  GainControl: 'Image Quality',

  DateTimeOriginal: 'Timeline & Date',
  CreateDate: 'Timeline & Date',
  ModifyDate: 'Timeline & Date',
  DateTime: 'Timeline & Date',
  SubSecTimeOriginal: 'Timeline & Date',
  SubSecTimeDigitized: 'Timeline & Date',
  OffsetTime: 'Timeline & Date',
  OffsetTimeOriginal: 'Timeline & Date',
  OffsetTimeDigitized: 'Timeline & Date',
  GPSDateStamp: 'Timeline & Date',
  GPSTimeStamp: 'Timeline & Date',

  latitude: 'Geospatial',
  longitude: 'Geospatial',
  GPSLatitude: 'Geospatial',
  GPSLongitude: 'Geospatial',
  GPSAltitude: 'Geospatial',
  GPSImgDirection: 'Geospatial',
  GPSDestBearing: 'Geospatial',
  GPSSpeed: 'Geospatial',

  ExifVersion: 'Standards & Info',
  FlashpixVersion: 'Standards & Info',
  ComponentsConfiguration: 'Standards & Info',
  UserComment: 'Standards & Info'
};

/**
 * Categorizes arbitrary parsed EXIF tags into 8 standardized forensic domains (REQ-META-001).
 */
export function categorizeExif(
  rawExif: Record<string, unknown>,
): CategorizedExif {
  const categories: CategorizedExif = {
    'Device Hardware': {},
    'Exposure Settings': {},
    'Optics & Lens': {},
    'Image Quality': {},
    'Timeline & Date': {},
    'Geospatial': {},
    'Standards & Info': {},
    'Miscellaneous': {},
  };

  if (!rawExif) return categories;

  for (const [key, value] of Object.entries(rawExif)) {
    if (value == null) continue;
    if (
      typeof value === 'object' &&
      !(value instanceof Date) &&
      !Array.isArray(value)
    )
      continue;

    let category = PROPERTY_MAP[key];
    if (!category) {
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes('gps') || lowerKey.includes('latitude') || lowerKey.includes('longitude')) {
        category = 'Geospatial';
      } else if (key.startsWith('Profile')) {
        category = 'Miscellaneous';
      } else if (lowerKey.includes('date') || lowerKey.includes('time')) {
        category = 'Timeline & Date';
      } else {
        category = 'Miscellaneous';
      }
    }

    categories[category][key] = value;
  }

  return categories;
}

/**
 * Robustly parses camera EXIF date representations into a valid Date object (REQ-META-002).
 * Returns null if the value is empty, invalid, or unparseable.
 */
export function parseExifDate(dateVal: unknown): Date | null {
  if (!dateVal) return null;
  if (dateVal instanceof Date) {
    return isNaN(dateVal.getTime()) ? null : dateVal;
  }

  let cleaned = String(dateVal).trim();
  if (!cleaned || cleaned.startsWith('0000:00:00')) return null;

  // EXIF standard: YYYY:MM:DD HH:MM:SS -> YYYY-MM-DD
  if (/^\d{4}:\d{2}:\d{2}/.test(cleaned)) {
    cleaned = cleaned.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
  }

  // Pure numeric digits (epoch millisecond timestamp)
  if (/^\d+$/.test(cleaned)) {
    const d = new Date(Number(cleaned));
    if (!isNaN(d.getTime())) return d;
  }

  // Standard ISO or default Date parsing
  const dDefault = new Date(cleaned);
  if (!isNaN(dDefault.getTime())) return dDefault;

  // Space-separated time to ISO separator T
  const tSeparated = cleaned.replace(' ', 'T');
  const d2 = new Date(tSeparated);
  if (!isNaN(d2.getTime())) return d2;

  return null;
}

/**
 * Formats a Date instance into standard DD-MM-YYYY HH:mm:ss string.
 */
export function formatFullDate(dateVal: unknown): string {
  const d = parseExifDate(dateVal);
  if (!d || isNaN(d.getTime())) return 'Unknown';

  const pad = (n: number) => String(n).padStart(2, '0');
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());

  return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
}

/**
 * Formats specialized EXIF values for human-readable presentation (REQ-META-001).
 */
export function formatExifValue(
  key: string,
  value: unknown,
  _locale?: string,
): string {
  if (value == null) return '';

  if (value instanceof Date) {
    return formatFullDate(value);
  }

  if (key === 'ExposureTime') {
    const num = Number(value);
    if (!isNaN(num) && num > 0 && num < 1) {
      return `1/${Math.round(1 / num)}`;
    }
    return String(value);
  }

  if (key === 'FNumber') {
    return `f/${value}`;
  }

  if (key.includes('FocalLength')) {
    return `${value}mm`;
  }

  const lowerKey = key.toLowerCase();
  if (lowerKey.includes('date') || lowerKey.includes('time')) {
    const parsed = parseExifDate(value);
    if (parsed) return formatFullDate(parsed);
  }

  return String(value);
}

/**
 * Formats camelCase/PascalCase metadata tag names into human-readable space-separated labels.
 */
export function formatLabel(key: string): string {
  if (!key) return '';
  return key.replace(/([A-Z])/g, ' $1').trim();
}
