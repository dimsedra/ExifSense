import piexif from 'piexifjs';

// Minimal valid 1x1 white JPEG base64 string
export const MINIMAL_JPEG_DATA_URL =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

export interface TestExifOptions {
  make?: string;
  model?: string;
  software?: string;
  dateTime?: string;
  dateTimeOriginal?: string;
  dateTimeDigitized?: string;
  exposureTime?: [number, number];
  fNumber?: [number, number];
  iso?: number;
  latitude?: [number, number];
  longitude?: [number, number];
}

/**
 * Creates a valid JPEG Uint8Array buffer with embedded EXIF tags.
 */
export function createFixtureJpegWithExif(options: TestExifOptions = {}): Uint8Array {
  const zeroth: Record<number, unknown> = {};
  const exif: Record<number, unknown> = {};
  const gps: Record<number, unknown> = {};

  // Device & 0th IFD
  if (options.make) zeroth[piexif.ImageIFD.Make] = options.make;
  if (options.model) zeroth[piexif.ImageIFD.Model] = options.model;
  if (options.software) zeroth[piexif.ImageIFD.Software] = options.software;
  if (options.dateTime) zeroth[piexif.ImageIFD.DateTime] = options.dateTime;

  // Camera settings
  if (options.dateTimeOriginal) exif[piexif.ExifIFD.DateTimeOriginal] = options.dateTimeOriginal;
  if (options.dateTimeDigitized) exif[piexif.ExifIFD.DateTimeDigitized] = options.dateTimeDigitized;
  if (options.exposureTime) exif[piexif.ExifIFD.ExposureTime] = options.exposureTime;
  if (options.fNumber) exif[piexif.ExifIFD.FNumber] = options.fNumber;
  if (options.iso) exif[piexif.ExifIFD.ISOSpeedRatings] = options.iso;

  // GPS
  if (options.latitude) {
    gps[piexif.GPSIFD.GPSLatitude] = [
      [options.latitude[0], 1],
      [options.latitude[1], 1],
      [0, 1]
    ];
    gps[piexif.GPSIFD.GPSLatitudeRef] = 'N';
  }
  if (options.longitude) {
    gps[piexif.GPSIFD.GPSLongitude] = [
      [options.longitude[0], 1],
      [options.longitude[1], 1],
      [0, 1]
    ];
    gps[piexif.GPSIFD.GPSLongitudeRef] = 'W';
  }

  const exifObj = { '0th': zeroth, Exif: exif, GPS: gps };
  const exifBytes = piexif.dump(exifObj);
  const jpegWithExif = piexif.insert(exifBytes, MINIMAL_JPEG_DATA_URL);

  const base64 = jpegWithExif.split(',')[1];
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
