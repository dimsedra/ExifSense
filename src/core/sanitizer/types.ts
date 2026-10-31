export interface SanitizerOptions {
  gps: boolean;
  device: boolean;
  camera: boolean;
  date: boolean;
}

export type SanitizerPreset = 'max-privacy' | 'photo-share' | 'location-only';

export interface BatchSanitizerEntry {
  id: string;
  file: File | Blob;
  fileName: string;
  exifData: Record<string, unknown>;
  optionsOverride?: Partial<SanitizerOptions>;
}

export interface PrivacyRiskItem {
  category: 'gps' | 'device' | 'camera' | 'date';
  hasData: boolean;
  isRemoving: boolean;
  isAtRisk: boolean;
  riskDetails?: string;
}

export interface PrivacyScoreResult {
  isSafe: boolean;
  scoreStatus: 'safe' | 'risk';
  items: PrivacyRiskItem[];
}
