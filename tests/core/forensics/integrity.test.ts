import { describe, it, expect } from 'vitest';
import {
  evaluateSingleAssetIntegrity,
  isEditingSoftware,
} from '../../../src/core/forensics/integrity';
import type { SingleAssetInput } from '../../../src/core/forensics/types';

describe('evaluateSingleAssetIntegrity - Metadata Completeness & Software', () => {
  const baseAsset: SingleAssetInput = {
    fileName: 'test.jpg',
    fileSize: 1024 * 100,
    fileDate: Date.now(),
    exifData: {},
    actualWidth: 1920,
    actualHeight: 1080,
  };

  it('flags fully_stripped with neutral message when no EXIF tags exist', () => {
    const alerts = evaluateSingleAssetIntegrity({ ...baseAsset, exifData: {} });

    expect(alerts).toHaveLength(1);
    expect(alerts[0].type).toBe('fully_stripped');
    expect(alerts[0].severity).toBe('info');
    expect(alerts[0].defaultMessage).toBe('No EXIF metadata was found in this file.');
  });

  it('reports all absent core pillars uniformly when 2 or 3 pillars are missing while other metadata exists', () => {
    const asset: SingleAssetInput = {
      ...baseAsset,
      exifData: {
        ColorSpace: 1,
        Orientation: 1,
      },
    };

    const alerts = evaluateSingleAssetIntegrity(asset);
    const alertTypes = alerts.map((a) => a.type);

    expect(alertTypes).toEqual(['missing_gps', 'missing_datetime', 'missing_device']);
    for (const alert of alerts) {
      expect(alert.defaultMessage).not.toContain('Selective Metadata Removal');
    }
  });

  it('reports missing_gps uniformly even when only 1 core pillar (GPS) is absent', () => {
    const asset: SingleAssetInput = {
      ...baseAsset,
      exifData: {
        Make: 'Sony',
        Model: 'A7IV',
        DateTimeOriginal: '2025:05:10 14:30:00',
      },
    };

    const alerts = evaluateSingleAssetIntegrity(asset);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].type).toBe('missing_gps');
    expect(alerts[0].defaultMessage).toBe('GPS coordinates are not recorded in this file.');
  });

  it('reports missing_datetime when only ModifyDate is present without a capture timestamp', () => {
    const asset: SingleAssetInput = {
      ...baseAsset,
      exifData: {
        Make: 'Sony',
        Model: 'A7IV',
        latitude: -6.2088,
        longitude: 106.8456,
        ModifyDate: '2025:05:10 15:00:00',
      },
    };

    const alerts = evaluateSingleAssetIntegrity(asset);
    expect(alerts.map((a) => a.type)).toEqual(['missing_datetime']);
  });

  it('accepts GPSLatitude and GPSLongitude fallback when latitude and longitude are absent', () => {
    const asset: SingleAssetInput = {
      ...baseAsset,
      exifData: {
        Make: 'Sony',
        Model: 'A7IV',
        DateTimeOriginal: '2025:05:10 14:30:00',
        GPSLatitude: -6.2088,
        GPSLongitude: 106.8456,
      },
    };

    const alerts = evaluateSingleAssetIntegrity(asset);
    expect(alerts).toEqual([]);
  });

  it('does not flag missing or stripped alerts when all core pillars are present', () => {
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
    expect(alerts).toEqual([]);
  });

  describe('Editing Software Observation', () => {
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

    it.each(editors)('flags neutral editing_software observation for "%s"', (softwareName) => {
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

      expect(isEditingSoftware(softwareName)).toBe(true);
      expect(editorAlert).toBeDefined();
      expect(editorAlert?.severity).toBe('info');
      expect(editorAlert?.messageParam).toEqual({ software: softwareName });
      expect(editorAlert?.defaultMessage).toBe(`Software tag records "${softwareName}".`);
    });

    it('does not flag editing_software for standard camera firmware', () => {
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

      expect(isEditingSoftware('ILCE-7M4 v2.00')).toBe(false);
      expect(evaluateSingleAssetIntegrity(asset)).toEqual([]);
    });
  });

  describe('Deprecated Manipulation & Spoofing Heuristics', () => {
    it('does not emit legacy chronological, dimension, or coordinate spoofing alerts', () => {
      const asset: SingleAssetInput = {
        ...baseAsset,
        fileDate: new Date('2020-01-01T00:00:00Z').getTime(),
        actualWidth: 800,
        actualHeight: 600,
        exifData: {
          Make: 'Sony',
          Model: 'A7IV',
          DateTimeOriginal: '2035-01-01T00:00:00Z',
          ExifImageWidth: 4000,
          ExifImageHeight: 3000,
          latitude: 0,
          longitude: 0,
        },
      };

      const alerts = evaluateSingleAssetIntegrity(asset);
      expect(alerts).toEqual([]);
    });
  });
});
