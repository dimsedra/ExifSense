import { create } from 'zustand';
import type { ForensicAsset, IntegrityAlert } from '../core/forensics/types';
import type { SanitizerOptions } from '../core/sanitizer/types';

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

  saveSession: () => null,
  deleteSession: () => {},
  clearAllSessions: () => {},
  setSearchQuery: (query) => set({ searchQuery: query }),
  setFilter: (filter) => set({ filter }),
  getFilteredSessions: () => get().sessions,
  restoreSession: () => false,
}));
