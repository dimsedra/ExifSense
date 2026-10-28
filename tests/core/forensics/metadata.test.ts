import { describe, it, expect } from 'vitest';
import { categorizeExif } from '../../../src/core/forensics/metadata.ts';

describe('EXIF Normalization & Categorization (REQ-META-001)', () => {
  it('correctly maps properties across the 8 standardized categories', () => {
    const rawData = {
      Make: 'Sony',
      Model: 'ILCE-7RM4',
      LensModel: 'FE 24-70mm F2.8 GM',
      BodySerialNumber: '1234567',
      ExposureTime: 0.002,
      FNumber: 2.8,
      ISO: 100,
      FocalLength: 50,
      FocalLengthIn35mmFormat: 50,
      ImageWidth: 9504,
      ImageHeight: 6336,
      ColorSpace: 'sRGB',
      DateTimeOriginal: '2026:05:14 12:30:00',
      latitude: -6.2088,
      longitude: 106.8456,
      ExifVersion: '0231',
      CustomVendorTag: 'ProprietaryValue'
    };

    const categorized = categorizeExif(rawData);

    expect(categorized['Device Hardware']).toMatchObject({
      Make: 'Sony',
      Model: 'ILCE-7RM4',
      LensModel: 'FE 24-70mm F2.8 GM',
      BodySerialNumber: '1234567'
    });

    expect(categorized['Exposure Settings']).toMatchObject({
      ExposureTime: 0.002,
      FNumber: 2.8,
      ISO: 100
    });

    expect(categorized['Optics & Lens']).toMatchObject({
      FocalLength: 50,
      FocalLengthIn35mmFormat: 50
    });

    expect(categorized['Image Quality']).toMatchObject({
      ImageWidth: 9504,
      ImageHeight: 6336,
      ColorSpace: 'sRGB'
    });

    expect(categorized['Timeline & Date']).toMatchObject({
      DateTimeOriginal: '2026:05:14 12:30:00'
    });

    expect(categorized['Geospatial']).toMatchObject({
      latitude: -6.2088,
      longitude: 106.8456
    });

    expect(categorized['Standards & Info']).toMatchObject({
      ExifVersion: '0231'
    });

    expect(categorized['Miscellaneous']).toMatchObject({
      CustomVendorTag: 'ProprietaryValue'
    });
  });

  it('filters out null and undefined values and keeps all 8 category keys intact', () => {
    const categorized = categorizeExif({ Make: 'Nikon', Model: null, ISO: undefined });
    expect(categorized['Device Hardware']).toEqual({ Make: 'Nikon' });
    expect(categorized['Exposure Settings']).toEqual({});
    expect(categorized['Optics & Lens']).toEqual({});
    expect(categorized['Image Quality']).toEqual({});
    expect(categorized['Timeline & Date']).toEqual({});
    expect(categorized['Geospatial']).toEqual({});
    expect(categorized['Standards & Info']).toEqual({});
    expect(categorized['Miscellaneous']).toEqual({});
  });
});
