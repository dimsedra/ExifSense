import { create } from 'zustand';
import type { ForensicAsset } from '../core/forensics/types';
import { generateForensicId } from '../core/forensics/hashing';

export const MAX_STAGED_FILES = 50;

export type UploadMode = 'single' | 'batch' | 'remove';

export interface AssetStoreState {
  uploadMode: UploadMode;
  stagedFiles: File[];
  assets: ForensicAsset[];
  activeAssetIndex: number;
  forensicId: string | null;
  investigatorIdentity: string | null;
  isAnalyzing: boolean;

  setUploadMode: (mode: UploadMode) => void;
  stageFiles: (files: File[]) => void;
  removeStagedFile: (index: number) => void;
  clearStagedFiles: () => void;
  setAssets: (assets: ForensicAsset[], forensicId?: string) => void;
  setActiveAssetIndex: (index: number) => void;
  updateAssetLocation: (assetId: string, locationData: Record<string, unknown> | null) => void;
  setInvestigatorIdentity: (identity: string | null) => void;
  setIsAnalyzing: (isAnalyzing: boolean) => void;
  resetSession: () => void;
}

const initialState = {
  uploadMode: 'single' as UploadMode,
  stagedFiles: [] as File[],
  assets: [] as ForensicAsset[],
  activeAssetIndex: 0,
  forensicId: null as string | null,
  investigatorIdentity: null as string | null,
  isAnalyzing: false,
};

export const useAssetStore = create<AssetStoreState>((set) => ({
  ...initialState,

  setUploadMode: (mode) => set({ uploadMode: mode }),

  stageFiles: (files) =>
    set((state) => {
      const merged = [...state.stagedFiles, ...files];
      return { stagedFiles: merged.slice(0, MAX_STAGED_FILES) };
    }),

  removeStagedFile: (index) =>
    set((state) => {
      if (index < 0 || index >= state.stagedFiles.length) {
        return state;
      }
      return {
        stagedFiles: state.stagedFiles.filter((_, i) => i !== index),
      };
    }),

  clearStagedFiles: () => set({ stagedFiles: [] }),

  setAssets: (assets, forensicId) =>
    set({
      assets,
      activeAssetIndex: 0,
      forensicId: forensicId ?? generateForensicId(),
    }),

  setActiveAssetIndex: (index) =>
    set((state) => {
      if (state.assets.length === 0 || index < 0 || index >= state.assets.length) {
        return state;
      }
      return { activeAssetIndex: index };
    }),

  updateAssetLocation: (assetId, locationData) =>
    set((state) => ({
      assets: state.assets.map((asset) =>
        asset.id === assetId
          ? {
              ...asset,
              locationData,
              locationName: (locationData?.display_name as string) || null,
            }
          : asset
      ),
    })),

  setInvestigatorIdentity: (identity) => set({ investigatorIdentity: identity }),

  setIsAnalyzing: (isAnalyzing) => set({ isAnalyzing }),

  resetSession: () => set({ ...initialState }),
}));
