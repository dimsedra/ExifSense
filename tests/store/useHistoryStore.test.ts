import { describe, it, expect } from 'vitest';
import { sanitizeLoadedHistory } from '../../src/store/useHistoryStore';

describe('useHistoryStore - Schema Validation & Defensive Parsing (Scenario 4.1)', () => {
  it('returns empty array on null, empty string, or undefined input', () => {
    expect(sanitizeLoadedHistory(null)).toEqual([]);
    expect(sanitizeLoadedHistory('')).toEqual([]);
    expect(sanitizeLoadedHistory(undefined as any)).toEqual([]);
  });

  it('returns empty array on malformed or non-array JSON', () => {
    expect(sanitizeLoadedHistory('{ broken json ...')).toEqual([]);
    expect(sanitizeLoadedHistory('{"id": 1, "forensicId": "ES-123"}')).toEqual([]);
    expect(sanitizeLoadedHistory('12345')).toEqual([]);
    expect(sanitizeLoadedHistory('"string"')).toEqual([]);
  });

  it('filters out invalid items and keeps valid sessions', () => {
    const rawSessions = [
      null,
      undefined,
      {},
      { id: 'not-a-number', forensicId: 'ES-1', assets: [] },
      { id: 101, forensicId: 1234, assets: [] }, // forensicId not string
      { id: 102, forensicId: 'ES-VALID-1', assets: 'not-an-array' },
      {
        id: 103,
        forensicId: 'ES-VALID-2',
        date: '2026-10-28T10:00:00Z',
        isBatch: false,
        assetCount: 1,
        isSanitized: false,
        sanitizeOptions: null,
        sessionTitle: 'photo.jpg',
        mainThumb: 'data:image/jpeg;base64,thumb',
        assets: [
          {
            id: 'a1',
            fileName: 'photo.jpg',
            fileSize: 100,
            fileType: 'image/jpeg',
            fileDate: 1700000000000,
            thumbUrl: 'thumb',
            sha256: 'hash256',
            sha1: 'hash1',
            exifData: {},
            integrityAlerts: [],
          },
        ],
      },
    ];

    const result = sanitizeLoadedHistory(JSON.stringify(rawSessions));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(103);
    expect(result[0].forensicId).toBe('ES-VALID-2');
    expect(result[0].assets).toHaveLength(1);
  });
});
