import { create } from 'zustand';
import type {
  SanitizerOptions,
  SanitizerPreset,
  BatchSanitizerEntry,
} from '../core/sanitizer/types';
import { getPresetOptions } from '../core/sanitizer/sanitizer';

export interface SanitizerStoreState {
  isActive: boolean;
  isBatch: boolean;
  activeFile: File | null;
  activeExif: Record<string, unknown> | null;
  batchEntries: BatchSanitizerEntry[];
  batchActiveIndex: number;
  globalOptions: SanitizerOptions;
  overrides: Record<string, Partial<SanitizerOptions>>;
  isProcessing: boolean;

  openSingle: (file: File, exif: Record<string, unknown>) => void;
  openBatch: (entries: BatchSanitizerEntry[]) => void;
  setGlobalOption: (key: keyof SanitizerOptions, value: boolean) => void;
  applyPreset: (preset: SanitizerPreset) => void;
  setBatchActiveIndex: (index: number) => void;
  setOverride: (id: string, options: Partial<SanitizerOptions>) => void;
  resetOverride: (id: string) => void;
  resetAllOverrides: () => void;
  getEffectiveOptions: (id?: string) => SanitizerOptions;
  setIsProcessing: (isProcessing: boolean) => void;
  close: () => void;
}

const defaultOptions: SanitizerOptions = {
  gps: true,
  device: true,
  camera: true,
  date: true,
};

const initialState = {
  isActive: false,
  isBatch: false,
  activeFile: null as File | null,
  activeExif: null as Record<string, unknown> | null,
  batchEntries: [] as BatchSanitizerEntry[],
  batchActiveIndex: 0,
  globalOptions: { ...defaultOptions },
  overrides: {} as Record<string, Partial<SanitizerOptions>>,
  isProcessing: false,
};

export const useSanitizerStore = create<SanitizerStoreState>((set, get) => ({
  ...initialState,

  openSingle: (file, exif) =>
    set({
      isActive: true,
      isBatch: false,
      activeFile: file,
      activeExif: exif,
      batchEntries: [],
      batchActiveIndex: 0,
      overrides: {},
    }),

  openBatch: (entries) =>
    set({
      isActive: true,
      isBatch: true,
      batchEntries: entries,
      batchActiveIndex: 0,
      activeFile: entries[0]?.file instanceof File ? (entries[0].file as File) : null,
      activeExif: entries[0]?.exifData || null,
      overrides: {},
    }),

  setGlobalOption: (key, value) =>
    set((state) => ({
      globalOptions: {
        ...state.globalOptions,
        [key]: value,
      },
    })),

  applyPreset: (preset) =>
    set({
      globalOptions: getPresetOptions(preset),
    }),

  setBatchActiveIndex: (index) =>
    set((state) => {
      if (
        state.batchEntries.length === 0 ||
        index < 0 ||
        index >= state.batchEntries.length
      ) {
        return state;
      }
      const entry = state.batchEntries[index];
      return {
        batchActiveIndex: index,
        activeFile: entry?.file instanceof File ? (entry.file as File) : null,
        activeExif: entry?.exifData || null,
      };
    }),

  setOverride: (id, options) =>
    set((state) => ({
      overrides: {
        ...state.overrides,
        [id]: {
          ...(state.overrides[id] || {}),
          ...options,
        },
      },
    })),

  resetOverride: (id) =>
    set((state) => {
      const rest = { ...state.overrides };
      delete rest[id];
      return { overrides: rest };
    }),

  resetAllOverrides: () => set({ overrides: {} }),

  getEffectiveOptions: (id) => {
    const { globalOptions, overrides } = get();
    if (!id || !overrides[id]) {
      return { ...globalOptions };
    }
    return {
      ...globalOptions,
      ...overrides[id],
    };
  },

  setIsProcessing: (isProcessing) => set({ isProcessing }),

  close: () => set({ ...initialState }),
}));
