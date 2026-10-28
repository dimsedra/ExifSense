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

  describe('Editing Software Signature (REQ-INT-002)', () => {
    const editors = [
      'Adobe Photoshop 2024',
      'Adobe Lightroom Classic 13.0',
      'GIMP 2.10.34',
      'Canva',
      'Snapseed 2.19',
      'Pixlr Editor',
      'CorelDRAW Graphics Suite',
      'Affinity Photo 2',
      'Picsart AI Photo Editor',
      'paint.net 5.0.11',
      'Adobe Illustrator 28.0',
    ];

    it.each(editors)('flags editing software alert for "%s"', (softwareName) => {
      const asset: SingleAssetInput = {
        ...baseAsset,
        exifData: {
          Make: 'Canon',
          Model: 'EOS R5',
          DateTimeOriginal: '2025:05:10 14:30:00',
          latitude: -6.2,
          longitude: 106.8,
          Software: softwareName,
        },
      };

      const alerts = evaluateSingleAssetIntegrity(asset);
      const editorAlert = alerts.find((a) => a.type === 'editing_software');

      expect(editorAlert).toBeDefined();
      expect(editorAlert?.severity).toBe('info');
      expect(editorAlert?.messageParam).toEqual({ software: softwareName });
      expect(editorAlert?.defaultMessage).toContain(`"${softwareName}"`);
    });

    it('does not flag editing software for standard camera firmware', () => {
      const asset: SingleAssetInput = {
        ...baseAsset,
        exifData: {
          Make: 'Sony',
          Model: 'A7IV',
          DateTimeOriginal: '2025:05:10 14:30:00',
          latitude: -6.2,
          longitude: 106.8,
          Software: 'ILCE-7M4 v2.00',
        },
      };

      const alerts = evaluateSingleAssetIntegrity(asset);
      expect(alerts.find((a) => a.type === 'editing_software')).toBeUndefined();
    });
  });

  describe('Chronological Anomaly Detection (REQ-INT-003)', () => {
    const fixedNow = new Date('2025-06-01T12:00:00Z');

    it('flags future_capture_date when capture date exceeds current time by more than 5 minutes', () => {
      // 10 minutes in the future relative to fixedNow
      const futureDate = new Date(fixedNow.getTime() + 10 * 60 * 1000);
      const asset: SingleAssetInput = {
        ...baseAsset,
        fileDate: fixedNow.getTime(),
        exifData: {
          DateTimeOriginal: futureDate.toISOString(),
          Make: 'Sony',
          Model: 'A7IV',
        },
      };

      const alerts = evaluateSingleAssetIntegrity(asset, fixedNow);
      const alert = alerts.find((a) => a.type === 'future_capture_date');

      expect(alert).toBeDefined();
      expect(alert?.severity).toBe('warning');
      expect(alert?.defaultMessage).toContain('Chronological Anomaly');
    });

    it('does not flag future_capture_date when within 5 minutes clock drift tolerance', () => {
      // 3 minutes in the future relative to fixedNow
      const slightDrift = new Date(fixedNow.getTime() + 3 * 60 * 1000);
      const asset: SingleAssetInput = {
        ...baseAsset,
        fileDate: fixedNow.getTime(),
        exifData: {
          DateTimeOriginal: slightDrift.toISOString(),
          Make: 'Sony',
          Model: 'A7IV',
        },
      };

      const alerts = evaluateSingleAssetIntegrity(asset, fixedNow);
      expect(alerts.find((a) => a.type === 'future_capture_date')).toBeUndefined();
    });

    it('flags capture_after_file_modification when capture date is newer than file modification date beyond 5s buffer', () => {
      const fileDate = new Date('2025-05-01T10:00:00Z').getTime();
      const captureDate = new Date(fileDate + 60 * 1000); // 1 minute after file modified

      const asset: SingleAssetInput = {
        ...baseAsset,
        fileDate,
        exifData: {
          DateTimeOriginal: captureDate.toISOString(),
          Make: 'Sony',
          Model: 'A7IV',
        },
      };

      const alerts = evaluateSingleAssetIntegrity(asset, fixedNow);
      const alert = alerts.find((a) => a.type === 'capture_after_file_modification');

      expect(alert).toBeDefined();
      expect(alert?.severity).toBe('warning');
      expect(alert?.defaultMessage).toContain('Chronological Mismatch');
    });

    it('flags missing_original_metadata when capture date is absent but ModifyDate or Software is present', () => {
      const asset: SingleAssetInput = {
        ...baseAsset,
        exifData: {
          Make: 'Sony',
          Model: 'A7IV',
          ModifyDate: '2025:05:10 15:00:00',
        },
      };

      const alerts = evaluateSingleAssetIntegrity(asset, fixedNow);
      const alert = alerts.find((a) => a.type === 'missing_original_metadata');

      expect(alert).toBeDefined();
      expect(alert?.severity).toBe('warning');
      expect(alert?.defaultMessage).toContain('Stripped Capture Metadata');
    });
  });

  describe('Dimension Mismatch Detection (REQ-INT-004)', () => {
    it('flags dimension_mismatch when natural dimensions differ from EXIF dimensions', () => {
      const asset: SingleAssetInput = {
        ...baseAsset,
        actualWidth: 1200,
        actualHeight: 800,
        exifData: {
          Make: 'Sony',
          Model: 'A7IV',
          ExifImageWidth: 6000,
          ExifImageHeight: 4000,
        },
      };

      const alerts = evaluateSingleAssetIntegrity(asset);
      const alert = alerts.find((a) => a.type === 'dimension_mismatch');

      expect(alert).toBeDefined();
      expect(alert?.severity).toBe('warning');
      expect(alert?.messageParam).toEqual({
        exifWidth: 6000,
        exifHeight: 4000,
        actualWidth: 1200,
        actualHeight: 800,
      });
      expect(alert?.defaultMessage).toContain('6000x4000');
      expect(alert?.defaultMessage).toContain('1200x800');
    });

    it('falls back to PixelXDimension or ImageWidth if ExifImageWidth is not present', () => {
      const asset: SingleAssetInput = {
        ...baseAsset,
        actualWidth: 800,
        actualHeight: 600,
        exifData: {
          Make: 'Nikon',
          Model: 'Z6',
          PixelXDimension: 1920,
          PixelYDimension: 1080,
        },
      };

      const alerts = evaluateSingleAssetIntegrity(asset);
      const alert = alerts.find((a) => a.type === 'dimension_mismatch');

      expect(alert).toBeDefined();
      expect(alert?.messageParam?.exifWidth).toBe(1920);
      expect(alert?.messageParam?.exifHeight).toBe(1080);
    });

    it('does not flag dimension_mismatch when natural and EXIF dimensions match', () => {
      const asset: SingleAssetInput = {
        ...baseAsset,
        actualWidth: 1920,
        actualHeight: 1080,
        exifData: {
          Make: 'Sony',
          Model: 'A7IV',
          ImageWidth: 1920,
          ImageHeight: 1080,
        },
      };

      const alerts = evaluateSingleAssetIntegrity(asset);
      expect(alerts.find((a) => a.type === 'dimension_mismatch')).toBeUndefined();
    });

    it('does not flag dimension_mismatch when actual dimensions are missing or null', () => {
      const asset: SingleAssetInput = {
        ...baseAsset,
        actualWidth: null,
        actualHeight: null,
        exifData: {
          Make: 'Sony',
          Model: 'A7IV',
          ImageWidth: 1920,
          ImageHeight: 1080,
        },
      };

      const alerts = evaluateSingleAssetIntegrity(asset);
      expect(alerts.find((a) => a.type === 'dimension_mismatch')).toBeUndefined();
    });
  });
});
