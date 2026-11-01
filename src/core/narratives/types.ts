export type SupportedLocale = 'en' | 'id' | 'ar';

export interface NarrativeSection {
  title: string;
  narrative: string;
}

export interface ChronologicalEventNode {
  assetIndex: number;
  fileName: string;
  timestamp: Date;
  hasCaptureTime: boolean;
  latitude: number | null;
  longitude: number | null;
  hasGps: boolean;
  locationName: string | null;
  make: string;
  model: string;
  deviceString: string;
  lensModel: string | null;
  focalLength: string | null;
  fNumber: string | null;
  iso: string | null;
}

export interface ChronologicalStoryStep {
  stepIndex: number;
  assetIndex: number;
  fileName: string;
  narrativeText: string;
  evidence: {
    formattedDate?: string;
    elapsedTimeString?: string;
    prevFileName?: string;
    distanceMeters?: number;
    distanceString?: string;
    locationName?: string;
    deviceString: string;
    deviceChanged: boolean;
    lensString?: string;
    lensChanged: boolean;
  };
}

export interface ChronologicalBatchStory {
  baseline: string;
  steps: ChronologicalStoryStep[];
  fullNarrative: string;
}

export interface ChronologicalStoryOptions {
  locale?: SupportedLocale;
  format?: 'html' | 'markdown' | 'plain';
}
