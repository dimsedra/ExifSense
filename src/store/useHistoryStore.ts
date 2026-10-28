import { create } from 'zustand';
import type { ForensicAsset, IntegrityAlert, CategorizedExif } from '../core/forensics/types';
import type { SanitizerOptions } from '../core/sanitizer/types';
import { generateForensicId } from '../core/forensics/hashing';
import { categorizeExif } from '../core/forensics/metadata';
import { useAssetStore } from './useAssetStore';

export const HISTORY_KEY = 'exif_forensic_history';
export const MAX_HISTORY = 20;

export type HistoryFilter = 'all' | 'single' | 'batch';

export interface HistorySessionAsset {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  fileDate: number;
  thumbUrl: string;
  sha256: string;
  sha1: string;
  actualWidth?: number | null;
  actualHeight?: number | null;
  exifData: Record<string, unknown>;
  categorizedExif?: CategorizedExif;
  integrityAlerts: IntegrityAlert[];
  isSanitized?: boolean;
  sanitizeOptions?: SanitizerOptions | null;
}

export interface HistorySession {
  id: number;
  forensicId: string;
  date: string;
  isBatch: boolean;
  assetCount: number;
  isSanitized: boolean;
  sanitizeOptions: SanitizerOptions | null;
  sessionTitle: string;
  mainThumb: string;
  assets: HistorySessionAsset[];
}

export interface SaveSessionMeta {
  isSanitized?: boolean;
  sanitizeOptions?: SanitizerOptions;
  sessionTitle?: string;
  mainThumb?: string;
}

export interface HistoryStoreState {
  sessions: HistorySession[];
  searchQuery: string;
  filter: HistoryFilter;
  isLoading: boolean;

  loadSessions: () => void;
  saveSession: (assets: ForensicAsset[], meta?: SaveSessionMeta) => HistorySession | null;
  deleteSession: (id: number) => void;
  clearAllSessions: () => void;
  setSearchQuery: (query: string) => void;
  setFilter: (filter: HistoryFilter) => void;
  getFilteredSessions: () => HistorySession[];
  restoreSession: (id: number) => boolean;
}

let lastSessionId = 0;
function generateSessionId(): number {
  const now = Date.now();
  lastSessionId = Math.max(now, lastSessionId + 1);
  return lastSessionId;
}

function persistSessionsWithQuotaFallback(
  sessions: HistorySession[]
): HistorySession[] {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(sessions));
    return sessions;
  } catch (err: any) {
    const isQuota =
      Boolean(err) &&
      (typeof err === 'object' &&
        (('name' in (err as any) && (err as any).name === 'QuotaExceededError') ||
          ('code' in (err as any) && (err as any).code === 22)));

    if (!isQuota) {
      return sessions;
    }

    // Step 1: Purge oldest 5 sessions and retry
    const reduced = sessions.slice(0, Math.max(1, sessions.length - 5));
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(reduced));
      return reduced;
    } catch {
      // Step 2: Strip thumbnail payloads and retry
      const noThumbs = reduced.map((s) => ({
        ...s,
        mainThumb: '',
        assets: s.assets.map((a) => ({ ...a, thumbUrl: '' })),
      }));
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(noThumbs));
        return noThumbs;
      } catch {
        return noThumbs;
      }
    }
  }
}

export function sanitizeLoadedHistory(rawJson: string | null): HistorySession[] {
  if (!rawJson) return [];
  try {
    const parsed = JSON.parse(rawJson);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is HistorySession =>
        Boolean(item) &&
        typeof item.id === 'number' &&
        typeof item.forensicId === 'string' &&
        Array.isArray(item.assets)
    );
  } catch (err: any) {
    return [];
  }
}

export const useHistoryStore = create<HistoryStoreState>((set, get) => ({
  sessions: [],
  searchQuery: '',
  filter: 'all',
  isLoading: false,

  loadSessions: () => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      const sanitized = sanitizeLoadedHistory(raw);
      set({ sessions: sanitized });
    } catch {
      set({ sessions: [] });
    }
  },

  saveSession: (assets, meta = {}) => {
    if (!assets || assets.length === 0) return null;

    const first = assets[0];
    const defaultTitle =
      assets.length > 1
        ? `${first.fileName} + ${assets.length - 1} more`
        : first.fileName;

    const session: HistorySession = {
      id: generateSessionId(),
      forensicId: generateForensicId(),
      date: new Date().toISOString(),
      isBatch: assets.length > 1,
      assetCount: assets.length,
      isSanitized: !!meta.isSanitized,
      sanitizeOptions: meta.sanitizeOptions || null,
      sessionTitle: meta.sessionTitle || defaultTitle,
      mainThumb: meta.mainThumb || '',
      assets: assets.map((a) => ({
        id: a.id,
        fileName: a.fileName,
        fileSize: a.fileSize,
        fileType: a.fileType,
        fileDate: a.fileDate,
        thumbUrl: '',
        sha256: a.sha256,
        sha1: a.sha1,
        actualWidth: a.actualWidth,
        actualHeight: a.actualHeight,
        exifData: a.exifData,
        categorizedExif: a.categorizedExif,
        integrityAlerts: a.integrityAlerts,
        isSanitized: !!meta.isSanitized,
        sanitizeOptions: meta.sanitizeOptions || null,
      })),
    };

    let updated: HistorySession[] = [];
    set((state) => {
      const candidate = [session, ...state.sessions].slice(0, MAX_HISTORY);
      updated = persistSessionsWithQuotaFallback(candidate);
      return { sessions: updated };
    });

    return session;
  },

  deleteSession: (id) =>
    set((state) => {
      const updated = state.sessions.filter((s) => s.id !== id);
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      } catch {}
      return { sessions: updated };
    }),

  clearAllSessions: () =>
    set(() => {
      try {
        localStorage.removeItem(HISTORY_KEY);
      } catch {}
      return { sessions: [] };
    }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setFilter: (filter) => set({ filter }),
  getFilteredSessions: () => {
    const { sessions, filter, searchQuery } = get();
    const query = searchQuery.trim().toLowerCase();

    return sessions.filter((session) => {
      if (filter === 'single' && session.isBatch) return false;
      if (filter === 'batch' && !session.isBatch) return false;

      if (query.length > 0) {
        const matchesTitle = session.sessionTitle.toLowerCase().includes(query);
        const matchesForensicId = session.forensicId.toLowerCase().includes(query);
        const matchesAsset = session.assets.some((a) =>
          a.fileName.toLowerCase().includes(query)
        );
        return matchesTitle || matchesForensicId || matchesAsset;
      }

      return true;
    });
  },
  restoreSession: (id) => {
    const session = get().sessions.find((s) => s.id === id);
    if (!session) return false;

    const restoredAssets: ForensicAsset[] = session.assets.map((a) => ({
      id: a.id,
      fileName: a.fileName,
      fileSize: a.fileSize,
      fileType: a.fileType,
      fileDate: a.fileDate,
      sha256: a.sha256,
      sha1: a.sha1,
      actualWidth: a.actualWidth ?? null,
      actualHeight: a.actualHeight ?? null,
      exifData: a.exifData || {},
      categorizedExif:
        a.categorizedExif ||
        categorizeExif(a.exifData || {}),
      integrityAlerts: a.integrityAlerts || [],
    }));

    useAssetStore.getState().setAssets(restoredAssets, session.forensicId);
    return true;
  },
}));
