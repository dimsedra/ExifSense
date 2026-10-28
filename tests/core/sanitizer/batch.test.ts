import { describe, it, expect, vi } from 'vitest';
import exifr from 'exifr';
import { sanitizeBatch } from '../../../src/core/sanitizer/sanitizer';
import { BatchSanitizerEntry, SanitizerOptions } from '../../../src/core/sanitizer/types';
import { createFixtureJpegWithExif } from '../../fixtures/sample_jpeg';

describe('Batch Sanitization Engine (REQ-SAN-005)', () => {
  const globalOptions: SanitizerOptions = {
    gps: true,
    device: true,
    camera: false,
    date: false
  };

  const fixture1Bytes = createFixtureJpegWithExif({
    make: 'Canon',
    model: 'R5',
    latitude: [37, 46],
    longitude: [122, 25],
    dateTimeOriginal: '2026:10:28 10:00:00'
  });

  const fixture2Bytes = createFixtureJpegWithExif({
    make: 'Nikon',
    model: 'Z9',
    latitude: [51, 30],
    dateTimeOriginal: '2026:10:28 11:00:00'
  });

  it('processes batch entries, applies global options, and prefixes filenames with cleaned_ (Normal Path)', async () => {
    const entries: BatchSanitizerEntry[] = [
      {
        id: '1',
        fileName: 'photo1.jpg',
        file: new Blob([fixture1Bytes.buffer as ArrayBuffer], { type: 'image/jpeg' }),
        exifData: {}
      },
      {
        id: '2',
        fileName: 'photo2.jpg',
        file: new Blob([fixture2Bytes.buffer as ArrayBuffer], { type: 'image/jpeg' }),
        exifData: {}
      }
    ];

    const progressCalls: Array<[number, number]> = [];
    const onProgress = vi.fn((completed: number, total: number) => {
      progressCalls.push([completed, total]);
    });

    const results = await sanitizeBatch(entries, globalOptions, onProgress);

    expect(results).toHaveLength(2);
    expect(results[0].fileName).toBe('cleaned_photo1.jpg');
    expect(results[1].fileName).toBe('cleaned_photo2.jpg');
    expect(results[0].cleanedBlob).toBeInstanceOf(Blob);

    // Verify GPS was removed per global options
    const parsed1 = await exifr.parse(await results[0].cleanedBlob.arrayBuffer(), { gps: true });
    expect(parsed1?.latitude).toBeUndefined();

    // Verify progress was reported
    expect(onProgress).toHaveBeenCalledTimes(2);
    expect(progressCalls).toEqual([
      [1, 2],
      [2, 2]
    ]);
  });

  it('applies per-file overrides over global options', async () => {
    const entries: BatchSanitizerEntry[] = [
      {
        id: '1',
        fileName: 'override_test.jpg',
        file: new Blob([fixture1Bytes.buffer as ArrayBuffer], { type: 'image/jpeg' }),
        exifData: {},
        optionsOverride: {
          gps: false // keep GPS despite global true
        }
      }
    ];

    const results = await sanitizeBatch(entries, globalOptions);
    const parsed = await exifr.parse(await results[0].cleanedBlob.arrayBuffer(), { gps: true });

    // GPS should be KEPT because of per-file override
    expect(parsed?.latitude).toBeCloseTo(37.766, 2);
  });

  it('returns empty array when entries list is empty (Boundary & Limits)', async () => {
    const results = await sanitizeBatch([], globalOptions);
    expect(results).toEqual([]);
  });
});
