// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import type { ForensicAsset } from '../../src/core/forensics/types';
import { sanitizeLoadedHistory, useHistoryStore } from '../../src/store/useHistoryStore';

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


describe('useHistoryStore - Session Persistence & 20-Entry Cap (Scenario 4.2, REQ-STA-004)', () => {
  const createMockAsset = (id: string, name: string): ForensicAsset => ({
    id,
    fileName: name,
    fileSize: 2048,
    fileType: 'image/jpeg',
    fileDate: 1700000000000,
    sha256: `sha256-${id}`,
    sha1: `sha1-${id}`,
    actualWidth: 1000,
    actualHeight: 800,
    exifData: { Make: 'Canon' },
    categorizedExif: {
      'Device Hardware': {},
      'Exposure Settings': {},
      'Optics & Lens': {},
      'Image Quality': {},
      'Timeline & Date': {},
      'Geospatial': {},
      'Standards & Info': {},
      'Miscellaneous': {},
    },
    integrityAlerts: [],
  });

  beforeEach(() => {
    localStorage.clear();
    useHistoryStore.getState().clearAllSessions();
  });

  it('saves session and prepends to history, syncing to localStorage', () => {
    const asset1 = createMockAsset('a-1', 'photo1.jpg');
    const asset2 = createMockAsset('a-2', 'photo2.jpg');

    const session = useHistoryStore.getState().saveSession([asset1, asset2], {
      sessionTitle: 'photo1.jpg + 1 more',
      mainThumb: 'data:image/jpeg;base64,mockthumb',
    });

    expect(session).not.toBeNull();
    expect(session?.assetCount).toBe(2);
    expect(session?.isBatch).toBe(true);
    expect(session?.sessionTitle).toBe('photo1.jpg + 1 more');

    const state = useHistoryStore.getState();
    expect(state.sessions).toHaveLength(1);
    expect(state.sessions[0].id).toBe(session?.id);

    // Verify localStorage has been written
    const stored = JSON.parse(localStorage.getItem('exif_forensic_history') || '[]');
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe(session?.id);
  });

  it('enforces maximum 20-entry FIFO cap when saving more than 20 sessions', () => {
    for (let i = 1; i <= 25; i++) {
      const asset = createMockAsset(`asset-${i}`, `photo_${i}.jpg`);
      useHistoryStore.getState().saveSession([asset], {
        sessionTitle: `Session ${i}`,
      });
    }

    const state = useHistoryStore.getState();
    expect(state.sessions).toHaveLength(20);
    // Newest sessions are at the front
    expect(state.sessions[0].sessionTitle).toBe('Session 25');
    // Oldest preserved session should be Session 6 (sessions 1 to 5 evicted)
    expect(state.sessions[19].sessionTitle).toBe('Session 6');

    const stored = JSON.parse(localStorage.getItem('exif_forensic_history') || '[]');
    expect(stored).toHaveLength(20);
    expect(stored[0].sessionTitle).toBe('Session 25');
  });

  it('deletes session by id and updates localStorage', () => {
    const asset1 = createMockAsset('a-1', 'file1.jpg');
    const asset2 = createMockAsset('a-2', 'file2.jpg');

    const s1 = useHistoryStore.getState().saveSession([asset1]);
    const s2 = useHistoryStore.getState().saveSession([asset2]);

    expect(useHistoryStore.getState().sessions).toHaveLength(2);

    useHistoryStore.getState().deleteSession(s1!.id);
    expect(useHistoryStore.getState().sessions).toHaveLength(1);
    expect(useHistoryStore.getState().sessions[0].id).toBe(s2!.id);

    const stored = JSON.parse(localStorage.getItem('exif_forensic_history') || '[]');
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe(s2!.id);
  });

  it('clears all sessions and removes localStorage key', () => {
    const asset1 = createMockAsset('a-1', 'file1.jpg');
    useHistoryStore.getState().saveSession([asset1]);
    expect(useHistoryStore.getState().sessions).toHaveLength(1);

    useHistoryStore.getState().clearAllSessions();
    expect(useHistoryStore.getState().sessions).toHaveLength(0);
    expect(localStorage.getItem('exif_forensic_history')).toBeNull();
  });
});
