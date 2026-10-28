import { describe, it, expect } from 'vitest';
import { evaluateCollectiveIntelligence } from '../../../src/core/forensics/collective';
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
});
