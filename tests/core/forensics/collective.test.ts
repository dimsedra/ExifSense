import { describe, it, expect } from 'vitest';
import {
  evaluateCollectiveIntelligence,
  calculateDistance,
} from '../../../src/core/forensics/collective';
import type { SingleAssetInput } from '../../../src/core/forensics/types';

describe('evaluateCollectiveIntelligence - Integrity Matrix (REQ-COL-001)', () => {
  const asset1: SingleAssetInput = {
    fileName: 'photo1.jpg',
    fileSize: 2048,
    fileDate: Date.now(),
    exifData: {
      Make: 'Sony',
      Model: 'A7IV',
      DateTimeOriginal: '2025:05:10 10:00:00',
      latitude: -6.2088,
      longitude: 106.8456,
      ISO: 100,
    },
    actualWidth: 1920,
    actualHeight: 1080,
  };

  const asset2: SingleAssetInput = {
    fileName: 'photo2.jpg',
    fileSize: 1024,
    fileDate: Date.now(),
    exifData: {}, // Fully stripped
    actualWidth: 1920,
    actualHeight: 1080,
  };

  const asset3: SingleAssetInput = {
    fileName: 'photo3.jpg',
    fileSize: 1500,
    fileDate: Date.now(),
    exifData: {
      ColorSpace: 1, // Only Image Quality, partially stripped
    },
    actualWidth: 1920,
    actualHeight: 1080,
  };

  it('generates a 6-category presence matrix and calculates clean, partially, and fully stripped counts', () => {
    const result = evaluateCollectiveIntelligence([asset1, asset2, asset3]);

    expect(result.integrity.cleanCount).toBe(1);
    expect(result.integrity.fullyStrippedCount).toBe(1);
    expect(result.integrity.partiallyStrippedCount).toBe(1);

    expect(result.integrity.matrix).toHaveLength(3);
    const row1 = result.integrity.matrix.find((r) => r.fileName === 'photo1.jpg');
    expect(row1?.presence['Device Hardware']).toBe(true);
    expect(row1?.presence['Timeline & Date']).toBe(true);
    expect(row1?.presence['Geospatial']).toBe(true);

    const row2 = result.integrity.matrix.find((r) => r.fileName === 'photo2.jpg');
    expect(row2?.presence['Device Hardware']).toBe(false);
    expect(row2?.presence['Timeline & Date']).toBe(false);
    expect(row2?.presence['Geospatial']).toBe(false);
  });

  describe('Hardware & Camera Body Serial Provenance (REQ-COL-002)', () => {
    it('detects consistent hardware and confirms single sensor provenance when body serial matches', () => {
      const assetA: SingleAssetInput = {
        fileName: 'a.jpg',
        fileSize: 1000,
        fileDate: Date.now(),
        exifData: {
          Make: 'Sony',
          Model: 'ILCE-7M4',
          BodySerialNumber: 'SN-987654',
          LensModel: 'FE 24-70mm F2.8 GM',
          LensSerialNumber: 'LENS-111',
          Software: 'v1.0',
        },
        actualWidth: 1920,
        actualHeight: 1080,
      };

      const assetB: SingleAssetInput = {
        fileName: 'b.jpg',
        fileSize: 1000,
        fileDate: Date.now(),
        exifData: {
          Make: 'Sony',
          Model: 'ILCE-7M4',
          BodySerialNumber: 'SN-987654',
          LensModel: 'FE 24-70mm F2.8 GM',
          LensSerialNumber: 'LENS-111',
          Software: 'v1.0',
        },
        actualWidth: 1920,
        actualHeight: 1080,
      };

      const result = evaluateCollectiveIntelligence([assetA, assetB]);

      expect(result.hardware.isConsistent).toBe(true);
      expect(result.hardware.uniqueDevices).toEqual(['Sony ILCE-7M4']);
      expect(result.hardware.uniqueSerials).toEqual(['SN-987654']);
      expect(result.hardware.hasSerialMatch).toBe(true);
      expect(result.hardware.missingCount).toBe(0);
      expect(result.hardware.details).toHaveLength(2);
      expect(result.hardware.details[0]).toEqual({
        fileName: 'a.jpg',
        make: 'Sony',
        model: 'ILCE-7M4',
        software: 'v1.0',
        lensModel: 'FE 24-70mm F2.8 GM',
        bodySerial: 'SN-987654',
        lensSerial: 'LENS-111',
      });
    });

    it('flags hardware inconsistency when multiple camera models are found', () => {
      const assetA: SingleAssetInput = {
        fileName: 'sony.jpg',
        fileSize: 1000,
        fileDate: Date.now(),
        exifData: {
          Make: 'Sony',
          Model: 'A7IV',
        },
        actualWidth: 1920,
        actualHeight: 1080,
      };

      const assetB: SingleAssetInput = {
        fileName: 'canon.jpg',
        fileSize: 1000,
        fileDate: Date.now(),
        exifData: {
          Make: 'Canon',
          Model: 'EOS R6',
        },
        actualWidth: 1920,
        actualHeight: 1080,
      };

      const result = evaluateCollectiveIntelligence([assetA, assetB]);

      expect(result.hardware.isConsistent).toBe(false);
      expect(result.hardware.uniqueDevices).toHaveLength(2);
      expect(result.hardware.uniqueDevices).toContain('Sony A7IV');
      expect(result.hardware.uniqueDevices).toContain('Canon EOS R6');
      expect(result.hardware.hasSerialMatch).toBe(false);
    });
  });

  describe('Timeline Reconstruction & Step-by-Step Delta Jumps (REQ-COL-003)', () => {
    it('reconstructs chronological timeline, calculates duration, and computes time jumps', () => {
      const assetA: SingleAssetInput = {
        fileName: 'second.jpg',
        fileSize: 1000,
        fileDate: Date.now(),
        exifData: {
          DateTimeOriginal: '2025-05-10T10:15:30.000Z',
        },
        actualWidth: 1920,
        actualHeight: 1080,
      };

      const assetB: SingleAssetInput = {
        fileName: 'first.jpg',
        fileSize: 1000,
        fileDate: Date.now(),
        exifData: {
          DateTimeOriginal: '2025-05-10T10:00:00.000Z',
        },
        actualWidth: 1920,
        actualHeight: 1080,
      };

      const assetC: SingleAssetInput = {
        fileName: 'third.jpg',
        fileSize: 1000,
        fileDate: Date.now(),
        exifData: {
          DateTimeOriginal: '2025-05-11T11:20:00.000Z',
        },
        actualWidth: 1920,
        actualHeight: 1080,
      };

      const assetMissing: SingleAssetInput = {
        fileName: 'no-date.jpg',
        fileSize: 1000,
        fileDate: Date.now(),
        exifData: {},
        actualWidth: 1920,
        actualHeight: 1080,
      };

      const result = evaluateCollectiveIntelligence([
        assetA,
        assetB,
        assetC,
        assetMissing,
      ]);

      expect(result.timeline.missingAssets).toEqual(['no-date.jpg']);
      expect(result.timeline.startTime?.toISOString()).toBe(
        '2025-05-10T10:00:00.000Z',
      );
      expect(result.timeline.endTime?.toISOString()).toBe(
        '2025-05-11T11:20:00.000Z',
      );

      // Total duration between first and third
      const expectedTotalMs =
        new Date('2025-05-11T11:20:00.000Z').getTime() -
        new Date('2025-05-10T10:00:00.000Z').getTime();
      expect(result.timeline.totalDurationMs).toBe(expectedTotalMs);

      // Check jumps
      expect(result.timeline.jumps).toHaveLength(2);

      const firstJump = result.timeline.jumps[0];
      expect(firstJump.fromFileName).toBe('first.jpg');
      expect(firstJump.toFileName).toBe('second.jpg');
      expect(firstJump.deltaMs).toBe(15 * 60 * 1000 + 30 * 1000);
      expect(firstJump.deltaDays).toBe(0);
      expect(firstJump.deltaHours).toBe(0);
      expect(firstJump.deltaMinutes).toBe(15);
      expect(firstJump.deltaSeconds).toBe(30);

      const secondJump = result.timeline.jumps[1];
      expect(secondJump.fromFileName).toBe('second.jpg');
      expect(secondJump.toFileName).toBe('third.jpg');
      expect(secondJump.deltaDays).toBe(1);
      expect(secondJump.deltaHours).toBe(1);
      expect(secondJump.deltaMinutes).toBe(4);
      expect(secondJump.deltaSeconds).toBe(30);
    });
  });

  describe('Geospatial Haversine & Velocity Anomaly Warning (REQ-COL-004)', () => {
    it('accurately computes Haversine distance between two coordinates', () => {
      // Monas (-6.1754, 106.8272) to Bundaran HI (-6.1950, 106.8230) ~ 2.22 km
      const dist = calculateDistance(-6.1754, 106.8272, -6.195, 106.823);
      expect(dist).toBeGreaterThan(2.1);
      expect(dist).toBeLessThan(2.3);
    });

    it('does not return NaN for antipodal coordinates with floating-point rounding', () => {
      // Near-antipodal floating point boundary
      const dist = calculateDistance(
        -88.40000000000009,
        -180,
        88.40000000000009,
        0,
      );
      expect(Number.isNaN(dist)).toBe(false);
      expect(dist).toBeGreaterThan(19000);
    });

    it('classifies spread category and calculates total path distance and jumps', () => {
      // Two points ~2.2 km apart => category 'trail'
      const assetA: SingleAssetInput = {
        fileName: 'monas.jpg',
        fileSize: 1000,
        fileDate: Date.now(),
        exifData: {
          DateTimeOriginal: '2025-05-10T10:00:00.000Z',
          latitude: -6.1754,
          longitude: 106.8272,
        },
        actualWidth: 1920,
        actualHeight: 1080,
      };

      const assetB: SingleAssetInput = {
        fileName: 'bundaran-hi.jpg',
        fileSize: 1000,
        fileDate: Date.now(),
        exifData: {
          DateTimeOriginal: '2025-05-10T11:00:00.000Z',
          latitude: -6.195,
          longitude: 106.823,
        },
        actualWidth: 1920,
        actualHeight: 1080,
      };

      const result = evaluateCollectiveIntelligence([assetA, assetB]);

      expect(result.geospatial.spreadCategory).toBe('trail');
      expect(result.geospatial.maxSpreadKm).toBeGreaterThan(2.1);
      expect(result.geospatial.totalPathDistanceKm).toBeGreaterThan(2.1);
      expect(result.geospatial.jumps).toHaveLength(1);
      expect(result.geospatial.jumps[0].fromFileName).toBe('monas.jpg');
      expect(result.geospatial.jumps[0].toFileName).toBe('bundaran-hi.jpg');
      expect(result.geospatial.velocityAlert?.hasAnomaly).toBe(false);
    });

    it('flags velocity anomaly when consecutive points require travel exceeding 1,200 km/h', () => {
      // Jakarta to Tokyo (~5,800 km) in 30 minutes => speed ~11,600 km/h
      const jakartaAsset: SingleAssetInput = {
        fileName: 'jakarta.jpg',
        fileSize: 1000,
        fileDate: Date.now(),
        exifData: {
          DateTimeOriginal: '2025-05-10T10:00:00.000Z',
          latitude: -6.2088,
          longitude: 106.8456,
        },
        actualWidth: 1920,
        actualHeight: 1080,
      };

      const tokyoAsset: SingleAssetInput = {
        fileName: 'tokyo.jpg',
        fileSize: 1000,
        fileDate: Date.now(),
        exifData: {
          DateTimeOriginal: '2025-05-10T10:30:00.000Z', // 30 minutes later
          latitude: 35.6762,
          longitude: 139.6503,
        },
        actualWidth: 1920,
        actualHeight: 1080,
      };

      const result = evaluateCollectiveIntelligence([jakartaAsset, tokyoAsset]);

      expect(result.geospatial.velocityAlert?.hasAnomaly).toBe(true);
      expect(result.geospatial.velocityAlert?.maxSpeedKmh).toBeGreaterThan(1200);
      expect(result.geospatial.velocityAlert?.fromFileName).toBe('jakarta.jpg');
      expect(result.geospatial.velocityAlert?.toFileName).toBe('tokyo.jpg');
    });

    it('flags velocity anomaly when two photos have identical timestamps but different locations (impossible teleportation)', () => {
      const assetA: SingleAssetInput = {
        fileName: 'place-a.jpg',
        fileSize: 1000,
        fileDate: Date.now(),
        exifData: {
          DateTimeOriginal: '2025-05-10T10:00:00.000Z',
          latitude: -6.2088,
          longitude: 106.8456, // Jakarta
        },
        actualWidth: 1920,
        actualHeight: 1080,
      };

      const assetB: SingleAssetInput = {
        fileName: 'place-b.jpg',
        fileSize: 1000,
        fileDate: Date.now(),
        exifData: {
          DateTimeOriginal: '2025-05-10T10:00:00.000Z', // Exact same second
          latitude: 51.5074,
          longitude: -0.1278, // London
        },
        actualWidth: 1920,
        actualHeight: 1080,
      };

      const result = evaluateCollectiveIntelligence([assetA, assetB]);

      expect(result.geospatial.velocityAlert?.hasAnomaly).toBe(true);
      expect(result.geospatial.velocityAlert?.fromFileName).toBe('place-a.jpg');
      expect(result.geospatial.velocityAlert?.toFileName).toBe('place-b.jpg');
    });
  });
});
