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
export function categorizeExif(data: Record<string, unknown>): CategorizedExif {
  const categories: CategorizedExif = {
    'Device Hardware': {},
    'Exposure Settings': {},
    'Optics & Lens': {},
    'Image Quality': {},
    'Timeline & Date': {},
    'Geospatial': {},
    'Standards & Info': {},
    'Miscellaneous': {}
  };

  if (!data) return categories;

  for (const [key, value] of Object.entries(data)) {
    if (value == null) continue;
    if (typeof value === 'object' && !(value instanceof Date)) continue;

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
