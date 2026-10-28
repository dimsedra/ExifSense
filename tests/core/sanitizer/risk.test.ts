import { describe, it, expect } from 'vitest';
import { evaluatePrivacyRisk } from '../../../src/core/sanitizer/sanitizer';
import { SanitizerOptions } from '../../../src/core/sanitizer/types';

describe('Live Privacy Risk Assessment (REQ-SAN-002)', () => {
  const fullExif = {
    latitude: 37.7749,
    longitude: -122.4194,
    Make: 'Sony',
    Model: 'ILCE-7M4',
    LensModel: 'FE 24-70mm F2.8 GM',
    ISO: 400,
    ApertureValue: 2.8,
    ExposureTime: 0.002,
    FocalLength: 50,
    DateTimeOriginal: '2026:10:28 10:15:00'
  };

  const allKeepOptions: SanitizerOptions = {
    gps: false,
    device: false,
    camera: false,
    date: false
  };

  const allStripOptions: SanitizerOptions = {
    gps: true,
    device: true,
    camera: true,
    date: true
  };

  it('marks overall status as risk when sensitive data is kept (Normal Path)', () => {
    const result = evaluatePrivacyRisk(fullExif, allKeepOptions);
    expect(result.isSafe).toBe(false);
    expect(result.scoreStatus).toBe('risk');

    const gpsItem = result.items.find((i) => i.category === 'gps');
    expect(gpsItem).toBeDefined();
    expect(gpsItem?.hasData).toBe(true);
    expect(gpsItem?.isRemoving).toBe(false);
    expect(gpsItem?.isAtRisk).toBe(true);

    const deviceItem = result.items.find((i) => i.category === 'device');
    expect(deviceItem?.isAtRisk).toBe(true);

    const cameraItem = result.items.find((i) => i.category === 'camera');
    expect(cameraItem?.isAtRisk).toBe(true);

    const dateItem = result.items.find((i) => i.category === 'date');
    expect(dateItem?.isAtRisk).toBe(true);
  });

  it('marks overall status as safe when all existing sensitive categories are removed', () => {
    const result = evaluatePrivacyRisk(fullExif, allStripOptions);
    expect(result.isSafe).toBe(true);
    expect(result.scoreStatus).toBe('safe');
    expect(result.items.every((i) => !i.isAtRisk)).toBe(true);
  });

  it('evaluates empty EXIF as safe regardless of options (Boundary & Limits)', () => {
    const result = evaluatePrivacyRisk({}, allKeepOptions);
    expect(result.isSafe).toBe(true);
    expect(result.scoreStatus).toBe('safe');
    expect(result.items.every((i) => !i.hasData && !i.isAtRisk)).toBe(true);
  });

  it('handles partial metadata accurately (e.g. only GPS present)', () => {
    const partialExif = { latitude: 51.5074, longitude: -0.1278 };
    const result = evaluatePrivacyRisk(partialExif, {
      gps: true,
      device: false,
      camera: false,
      date: false
    });
    expect(result.isSafe).toBe(true);
    expect(result.scoreStatus).toBe('safe');

    const gpsItem = result.items.find((i) => i.category === 'gps');
    expect(gpsItem?.hasData).toBe(true);
    expect(gpsItem?.isRemoving).toBe(true);
    expect(gpsItem?.isAtRisk).toBe(false);

    const deviceItem = result.items.find((i) => i.category === 'device');
    expect(deviceItem?.hasData).toBe(false);
    expect(deviceItem?.isAtRisk).toBe(false);
  });
});
