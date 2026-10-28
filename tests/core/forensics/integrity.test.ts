import { describe, it, expect } from 'vitest';
import { evaluateSingleAssetIntegrity } from '../../../src/core/forensics/integrity';
import type { SingleAssetInput } from '../../../src/core/forensics/types';

describe('evaluateSingleAssetIntegrity - Stripped Metadata (REQ-INT-001)', () => {
  const baseAsset: SingleAssetInput = {
    fileName: 'test.jpg',
    fileSize: 1024 * 100,
    fileDate: Date.now(),
    exifData: {},
    actualWidth: 1920,
    actualHeight: 1080,
  };

  it('detects fully stripped metadata when no EXIF tags exist', () => {
    const asset: SingleAssetInput = {
      ...baseAsset,
      exifData: {},
    };

    const alerts = evaluateSingleAssetIntegrity(asset);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].type).toBe('fully_stripped');
    expect(alerts[0].severity).toBe('info');
    expect(alerts[0].defaultMessage).toContain('No EXIF metadata');
  });

  it('detects partially stripped metadata when 2 or more core pillars are missing while other metadata exists', () => {
    // Only Image Quality category has metadata (ColorSpace, Orientation)
    // Missing: GPS, DateTime, Device
    const asset: SingleAssetInput = {
      ...baseAsset,
      exifData: {
        ColorSpace: 1,
        Orientation: 1,
      },
    };

    const alerts = evaluateSingleAssetIntegrity(asset);
    const alertTypes = alerts.map((a) => a.type);

    expect(alertTypes).toContain('missing_gps');
    expect(alertTypes).toContain('missing_datetime');
    expect(alertTypes).toContain('missing_device');
    expect(alertTypes).not.toContain('fully_stripped');
  });

  it('does not flag fully or partially stripped when all core pillars are present', () => {
    const asset: SingleAssetInput = {
      ...baseAsset,
      exifData: {
        Make: 'Sony',
        Model: 'A7IV',
        DateTimeOriginal: '2025:05:10 14:30:00',
        latitude: -6.2088,
        longitude: 106.8456,
      },
    };

    const alerts = evaluateSingleAssetIntegrity(asset);
    const alertTypes = alerts.map((a) => a.type);
    expect(alertTypes).not.toContain('fully_stripped');
    expect(alertTypes).not.toContain('missing_gps');
    expect(alertTypes).not.toContain('missing_datetime');
    expect(alertTypes).not.toContain('missing_device');
  });
});
