import { describe, it, expect } from 'vitest';
import exifr from 'exifr';
import { stripSpecificMetadata } from '../../../src/core/sanitizer/sanitizer';
import { createFixtureJpegWithExif } from '../../fixtures/sample_jpeg';

describe('Surgical JPEG Stripping (REQ-SAN-003)', () => {
  const fullFixtureBytes = createFixtureJpegWithExif({
    make: 'Canon',
    model: 'EOS R5',
    software: 'Firmware 1.5',
    dateTime: '2026:10:28 10:00:00',
    dateTimeOriginal: '2026:10:28 09:30:00',
    exposureTime: [1, 500],
    fNumber: [28, 10],
    iso: 200,
    latitude: [37, 46],
    longitude: [122, 25]
  });

  it('strips GPS tags while keeping device, camera, and date metadata (Normal Path)', async () => {
    const inputBlob = new Blob([fullFixtureBytes.buffer as ArrayBuffer], { type: 'image/jpeg' });
    const outputBlob = await stripSpecificMetadata(inputBlob, {
      gps: true,
      device: false,
      camera: false,
      date: false
    });

    expect(outputBlob).toBeInstanceOf(Blob);
    expect(outputBlob.type).toBe('image/jpeg');

    const outputBuffer = await outputBlob.arrayBuffer();
    const parsed = await exifr.parse(outputBuffer, { tiff: true, gps: true, exif: true });

    expect(parsed).toBeDefined();
    // GPS should be removed
    expect(parsed?.latitude).toBeUndefined();
    expect(parsed?.longitude).toBeUndefined();
    // Device and date should remain intact
    expect(parsed?.Make).toBe('Canon');
    expect(parsed?.Model).toBe('EOS R5');
  });

  it('strips device identity while keeping GPS and camera metadata', async () => {
    const inputBlob = new Blob([fullFixtureBytes.buffer as ArrayBuffer], { type: 'image/jpeg' });
    const outputBlob = await stripSpecificMetadata(inputBlob, {
      gps: false,
      device: true,
      camera: false,
      date: false
    });

    const outputBuffer = await outputBlob.arrayBuffer();
    const parsed = await exifr.parse(outputBuffer, { tiff: true, gps: true, exif: true });

    expect(parsed).toBeDefined();
    // Device tags should be removed
    expect(parsed?.Make).toBeUndefined();
    expect(parsed?.Model).toBeUndefined();
    expect(parsed?.Software).toBeUndefined();
    // GPS should remain intact
    expect(parsed?.latitude).toBeCloseTo(37.766, 2);
  });

  it('strips date timestamps while keeping device and GPS', async () => {
    const inputBlob = new Blob([fullFixtureBytes.buffer as ArrayBuffer], { type: 'image/jpeg' });
    const outputBlob = await stripSpecificMetadata(inputBlob, {
      gps: false,
      device: false,
      camera: false,
      date: true
    });

    const outputBuffer = await outputBlob.arrayBuffer();
    const parsed = await exifr.parse(outputBuffer, { tiff: true, gps: true, exif: true });

    expect(parsed).toBeDefined();
    expect(parsed?.DateTimeOriginal).toBeUndefined();
    expect(parsed?.DateTime).toBeUndefined();
    expect(parsed?.Make).toBe('Canon');
  });

  it('strips camera exposure settings while keeping device and GPS', async () => {
    const inputBlob = new Blob([fullFixtureBytes.buffer as ArrayBuffer], { type: 'image/jpeg' });
    const outputBlob = await stripSpecificMetadata(inputBlob, {
      gps: false,
      device: false,
      camera: true,
      date: false
    });

    const outputBuffer = await outputBlob.arrayBuffer();
    const parsed = await exifr.parse(outputBuffer, { tiff: true, gps: true, exif: true });

    expect(parsed).toBeDefined();
    expect(parsed?.ExposureTime).toBeUndefined();
    expect(parsed?.FNumber).toBeUndefined();
    expect(parsed?.Make).toBe('Canon');
    expect(parsed?.DateTimeOriginal).toBeDefined();
  });
});
