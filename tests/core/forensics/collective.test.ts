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
});
