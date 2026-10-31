import { describe, it, expect } from 'vitest';
import { categorizeExif, parseExifDate, formatExifValue, formatFullDate, formatLabel } from '../../../src/core/forensics/metadata.ts';

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
      ComponentsConfiguration: [1, 2, 3, 0],
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
      ExifVersion: '0231',
      ComponentsConfiguration: [1, 2, 3, 0],
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

  describe('Robust Date Parser (REQ-META-002)', () => {
    it('parses standard EXIF colon-separated timestamp', () => {
      const d = parseExifDate('2026:05:14 12:30:45');
      expect(d).toBeInstanceOf(Date);
      expect(d?.getFullYear()).toBe(2026);
      expect(d?.getMonth()).toBe(4); // 0-indexed, May = 4
      expect(d?.getDate()).toBe(14);
      expect(d?.getHours()).toBe(12);
      expect(d?.getMinutes()).toBe(30);
      expect(d?.getSeconds()).toBe(45);
    });

    it('parses ISO-8601 and space-separated date strings', () => {
      const dIso = parseExifDate('2026-05-14T12:30:45.000Z');
      expect(dIso).toBeInstanceOf(Date);
      expect(dIso?.toISOString()).toBe('2026-05-14T12:30:45.000Z');

      const dSpace = parseExifDate('2026-05-14 12:30:45');
      expect(dSpace).toBeInstanceOf(Date);
      expect(dSpace?.getFullYear()).toBe(2026);
    });

    it('parses epoch millisecond timestamps (number and string)', () => {
      const epochMs = 1778761845000;
      const dNum = parseExifDate(epochMs);
      expect(dNum?.getTime()).toBe(epochMs);

      const dStr = parseExifDate(String(epochMs));
      expect(dStr?.getTime()).toBe(epochMs);
    });

    it('returns the same Date if already a Date instance', () => {
      const now = new Date();
      expect(parseExifDate(now)).toBe(now);
    });

    it('returns null for empty, invalid or corrupt timestamps', () => {
      expect(parseExifDate(null)).toBeNull();
      expect(parseExifDate(undefined)).toBeNull();
      expect(parseExifDate('')).toBeNull();
      expect(parseExifDate('not-a-valid-date')).toBeNull();
      expect(parseExifDate('0000:00:00 00:00:00')).toBeNull();
    });
  });

  describe('Optical and EXIF Value Formatting (REQ-META-001)', () => {
    it('formats exposure times below 1 second as clean fractions', () => {
      expect(formatExifValue('ExposureTime', 0.002)).toBe('1/500');
      expect(formatExifValue('ExposureTime', 0.004)).toBe('1/250');
      expect(formatExifValue('ExposureTime', 2)).toBe('2');
    });

    it('formats aperture values with f/ prefix', () => {
      expect(formatExifValue('FNumber', 2.8)).toBe('f/2.8');
      expect(formatExifValue('FNumber', 1.4)).toBe('f/1.4');
    });

    it('formats focal lengths with mm suffix', () => {
      expect(formatExifValue('FocalLength', 50)).toBe('50mm');
      expect(formatExifValue('FocalLengthIn35mmFormat', 75)).toBe('75mm');
    });

    it('formats full dates into standard DD-MM-YYYY HH:mm:ss format', () => {
      const d = new Date(2026, 4, 14, 9, 5, 2);
      expect(formatFullDate(d)).toBe('14-05-2026 09:05:02');
      expect(formatFullDate(null)).toBe('Unknown');
    });

    it('formats camelCase and PascalCase EXIF keys into readable space-separated labels', () => {
      expect(formatLabel('Make')).toBe('Make');
      expect(formatLabel('Model')).toBe('Model');
      expect(formatLabel('DateTimeOriginal')).toBe('Date Time Original');
      expect(formatLabel('FocalLengthIn35mmFormat')).toBe('Focal Length In35mm Format');
      expect(formatLabel('')).toBe('');
    });
  });
});
