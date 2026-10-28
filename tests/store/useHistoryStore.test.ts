// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import type { ForensicAsset } from '../../src/core/forensics/types';
import { sanitizeLoadedHistory, useHistoryStore } from '../../src/store/useHistoryStore';
import { useAssetStore } from '../../src/store/useAssetStore';

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


describe('useHistoryStore - QuotaExceededError Resilience (Scenario 4.3, REQ-STA-004)', () => {
  const createMockAsset = (id: string): ForensicAsset => ({
    id,
    fileName: `asset_${id}.jpg`,
    fileSize: 1024,
    fileType: 'image/jpeg',
    fileDate: 1700000000000,
    sha256: 'sha256',
    sha1: 'sha1',
    actualWidth: 800,
    actualHeight: 600,
    exifData: {},
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

  it('purges oldest 5 sessions when localStorage throws QuotaExceededError', () => {
    // Populate 10 sessions first
    for (let i = 1; i <= 10; i++) {
      useHistoryStore.getState().saveSession([createMockAsset(`file-${i}`)], {
        sessionTitle: `Session ${i}`,
      });
    }

    expect(useHistoryStore.getState().sessions).toHaveLength(10);

    const original = localStorage.setItem;
    let attempts = 0;
    Object.defineProperty(localStorage, 'setItem', {
      value: (key: string, value: string) => {
        attempts++;
        if (attempts === 1) {
          throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
        }
        return original.call(localStorage, key, value);
      },
      configurable: true,
    });

    useHistoryStore.getState().saveSession([createMockAsset('overflow')], {
      sessionTitle: 'Overflow Session',
    });

    // 11 sessions total -> 5 oldest purged -> 6 sessions remaining
    expect(useHistoryStore.getState().sessions).toHaveLength(6);
    expect(useHistoryStore.getState().sessions[0].sessionTitle).toBe('Overflow Session');

    Object.defineProperty(localStorage, 'setItem', {
      value: original,
      configurable: true,
    });
  });

  it('strips thumbnail payloads if quota is still exceeded after 5-session purge', () => {
    for (let i = 1; i <= 8; i++) {
      useHistoryStore.getState().saveSession([createMockAsset(`file-${i}`)], {
        sessionTitle: `Session ${i}`,
        mainThumb: 'data:image/jpeg;base64,large-thumbnail-payload',
      });
    }

    const original = localStorage.setItem;
    let attempts = 0;
    Object.defineProperty(localStorage, 'setItem', {
      value: (key: string, value: string) => {
        attempts++;
        // Throw on attempt 1 (initial save) and attempt 2 (after 5-session purge)
        if (attempts <= 2) {
          throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
        }
        return original.call(localStorage, key, value);
      },
      configurable: true,
    });

    useHistoryStore.getState().saveSession([createMockAsset('big-thumb')], {
      sessionTitle: 'Big Thumb Session',
      mainThumb: 'data:image/jpeg;base64,huge-thumb',
    });

    const stored = JSON.parse(localStorage.getItem('exif_forensic_history') || '[]');
    expect(stored.length).toBeGreaterThan(0);
    // All stored thumbnails must have been stripped to empty strings
    stored.forEach((s: any) => {
      expect(s.mainThumb).toBe('');
    });

    Object.defineProperty(localStorage, 'setItem', {
      value: original,
      configurable: true,
    });
  });
});


describe('useHistoryStore - Search & Mode Filtering (Scenario 4.4)', () => {
  const createMockAsset = (id: string, name: string): ForensicAsset => ({
    id,
    fileName: name,
    fileSize: 1024,
    fileType: 'image/jpeg',
    fileDate: 1700000000000,
    sha256: `sha-${id}`,
    sha1: `sha1-${id}`,
    actualWidth: 800,
    actualHeight: 600,
    exifData: {},
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
    useHistoryStore.getState().setSearchQuery('');
    useHistoryStore.getState().setFilter('all');
  });

  it('filters sessions by upload mode (all, single, batch)', () => {
    const asset1 = createMockAsset('1', 'single_car.jpg');
    const asset2 = createMockAsset('2', 'batch_dog.jpg');
    const asset3 = createMockAsset('3', 'batch_cat.jpg');

    useHistoryStore.getState().saveSession([asset1], { sessionTitle: 'Single Car' });
    useHistoryStore.getState().saveSession([asset2, asset3], { sessionTitle: 'Batch Pets' });

    expect(useHistoryStore.getState().getFilteredSessions()).toHaveLength(2);

    useHistoryStore.getState().setFilter('single');
    const singleFiltered = useHistoryStore.getState().getFilteredSessions();
    expect(singleFiltered).toHaveLength(1);
    expect(singleFiltered[0].sessionTitle).toBe('Single Car');

    useHistoryStore.getState().setFilter('batch');
    const batchFiltered = useHistoryStore.getState().getFilteredSessions();
    expect(batchFiltered).toHaveLength(1);
    expect(batchFiltered[0].sessionTitle).toBe('Batch Pets');

    useHistoryStore.getState().setFilter('all');
    expect(useHistoryStore.getState().getFilteredSessions()).toHaveLength(2);
  });

  it('searches sessions by query matching title, forensicId, or asset fileName', () => {
    const asset1 = createMockAsset('1', 'tokyo_street.jpg');
    const asset2 = createMockAsset('2', 'osaka_night.jpg');

    const s1 = useHistoryStore.getState().saveSession([asset1], { sessionTitle: 'Japan Trip 1' });
    const s2 = useHistoryStore.getState().saveSession([asset2], { sessionTitle: 'Japan Trip 2' });

    // Search by title substring
    useHistoryStore.getState().setSearchQuery('Trip 1');
    expect(useHistoryStore.getState().getFilteredSessions()).toHaveLength(1);
    expect(useHistoryStore.getState().getFilteredSessions()[0].id).toBe(s1?.id);

    // Search by asset fileName (case-insensitive)
    useHistoryStore.getState().setSearchQuery('OSAKA');
    expect(useHistoryStore.getState().getFilteredSessions()).toHaveLength(1);
    expect(useHistoryStore.getState().getFilteredSessions()[0].id).toBe(s2?.id);

    // Search by forensic ID
    useHistoryStore.getState().setSearchQuery(s1!.forensicId);
    expect(useHistoryStore.getState().getFilteredSessions()).toHaveLength(1);
    expect(useHistoryStore.getState().getFilteredSessions()[0].id).toBe(s1?.id);

    // Non-matching query returns empty array
    useHistoryStore.getState().setSearchQuery('non-existent-keyword-999');
    expect(useHistoryStore.getState().getFilteredSessions()).toHaveLength(0);
  });
});


describe('useHistoryStore - Session Restoration into Asset Store (Scenario 4.5, REQ-STA-005)', () => {
  const createMockAsset = (id: string, name: string): ForensicAsset => ({
    id,
    fileName: name,
    fileSize: 2048,
    fileType: 'image/jpeg',
    fileDate: 1700000000000,
    sha256: `sha256-${id}`,
    sha1: `sha1-${id}`,
    actualWidth: 1024,
    actualHeight: 768,
    exifData: { Make: 'Nikon', Model: 'Z9' },
    categorizedExif: {
      'Device Hardware': { Make: 'Nikon', Model: 'Z9' },
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
    useAssetStore.getState().resetSession();
  });

  it('restores historical session and hydrates useAssetStore with assets and original forensicId', () => {
    const asset1 = createMockAsset('1', 'restored_photo1.jpg');
    const asset2 = createMockAsset('2', 'restored_photo2.jpg');

    const session = useHistoryStore.getState().saveSession([asset1, asset2], {
      sessionTitle: 'Restoration Target',
    });

    expect(session).not.toBeNull();
    useAssetStore.getState().resetSession();
    expect(useAssetStore.getState().assets).toEqual([]);

    const restored = useHistoryStore.getState().restoreSession(session!.id);
    expect(restored).toBe(true);

    const assetState = useAssetStore.getState();
    expect(assetState.assets).toHaveLength(2);
    expect(assetState.assets[0].fileName).toBe('restored_photo1.jpg');
    expect(assetState.assets[1].fileName).toBe('restored_photo2.jpg');
    expect(assetState.forensicId).toBe(session!.forensicId);
  });

  it('returns false and does not alter asset store when session ID is not found', () => {
    const restored = useHistoryStore.getState().restoreSession(999999999);
    expect(restored).toBe(false);
    expect(useAssetStore.getState().assets).toEqual([]);
  });
});


describe('useHistoryStore - Resilience & Edge Cases (Blocker 2 Fix Verification)', () => {
  beforeEach(() => {
    localStorage.clear();
    useHistoryStore.getState().clearAllSessions();
  });

  it('safely parses sessions with missing sessionTitle and corrupt asset entries without crashing search', () => {
    const corruptPayload = JSON.stringify([
      {
        id: 9991,
        forensicId: 'ES-CORRUPT-1',
        // sessionTitle is missing entirely
        assets: [
          null,
          undefined,
          { id: 'corrupt-1' }, // missing fileName
          { id: 'valid-1', fileName: 'safe_photo.jpg', fileSize: 100, fileType: 'image/jpeg', fileDate: 123 },
        ],
      },
    ]);

    localStorage.setItem('exif_forensic_history', corruptPayload);
    useHistoryStore.getState().loadSessions();

    const sessions = useHistoryStore.getState().sessions;
    expect(sessions).toHaveLength(1);
    expect(sessions[0].sessionTitle).toBe('Untitled Session');
    expect(sessions[0].assets).toHaveLength(1);
    expect(sessions[0].assets[0].fileName).toBe('safe_photo.jpg');

    // Search query should not throw
    useHistoryStore.getState().setSearchQuery('safe');
    expect(() => useHistoryStore.getState().getFilteredSessions()).not.toThrow();
    expect(useHistoryStore.getState().getFilteredSessions()).toHaveLength(1);
  });
});


describe('useHistoryStore - Forensic ID Synchronization (Blocker 3 Fix Verification)', () => {
  const dummyAsset: ForensicAsset = {
    id: 'asset-sync',
    fileName: 'sync.jpg',
    fileSize: 1024,
    fileType: 'image/jpeg',
    fileDate: 1700000000000,
    sha256: 'sha-sync',
    sha1: 'sha1-sync',
    actualWidth: 1000,
    actualHeight: 800,
    exifData: {},
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
  };

  it('preserves the active forensicId from useAssetStore during saveSession', () => {
    useAssetStore.getState().setAssets([dummyAsset], 'ES-ACTIVE-FORENSIC-001');

    const session = useHistoryStore.getState().saveSession([dummyAsset]);
    expect(session?.forensicId).toBe('ES-ACTIVE-FORENSIC-001');
    expect(useHistoryStore.getState().sessions[0].forensicId).toBe('ES-ACTIVE-FORENSIC-001');
  });

  it('allows explicit forensicId override in saveSession meta', () => {
    useAssetStore.getState().setAssets([dummyAsset], 'ES-ACTIVE-FORENSIC-001');

    const session = useHistoryStore.getState().saveSession([dummyAsset], {
      forensicId: 'ES-CUSTOM-META-999',
    });
    expect(session?.forensicId).toBe('ES-CUSTOM-META-999');
  });
});
