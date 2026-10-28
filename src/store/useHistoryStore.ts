import { create } from 'zustand';
import type { ForensicAsset, IntegrityAlert } from '../core/forensics/types';
import type { SanitizerOptions } from '../core/sanitizer/types';
import { generateForensicId } from '../core/forensics/hashing';

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
  exifData: Record<string, unknown>;
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
  } catch (err) {
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
        exifData: a.exifData,
        integrityAlerts: a.integrityAlerts,
        isSanitized: !!meta.isSanitized,
        sanitizeOptions: meta.sanitizeOptions || null,
      })),
    };

    let updated: HistorySession[] = [];
    set((state) => {
      updated = [session, ...state.sessions].slice(0, MAX_HISTORY);
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      } catch (err) {
        // Quota handling will be enhanced in 4.3
      }
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
  getFilteredSessions: () => get().sessions,
  restoreSession: () => false,
}));
