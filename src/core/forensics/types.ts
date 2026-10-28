export interface FileDetectionResult {
  isValid: boolean;
  mimeType: string | null;
  extension: string | null;
  detectedFormat: string | null;
}

export type ExifCategory =
  | 'Device Hardware'
  | 'Exposure Settings'
  | 'Optics & Lens'
  | 'Image Quality'
  | 'Timeline & Date'
  | 'Geospatial'
  | 'Standards & Info'
  | 'Miscellaneous';

export type CategorizedExif = Record<ExifCategory, Record<string, unknown>>;

export interface IntegrityAlert {
  type:
    | 'fully_stripped'
    | 'missing_gps'
    | 'missing_datetime'
    | 'missing_device'
    | 'editing_software'
    | 'future_capture_date'
    | 'capture_after_file_modification'
    | 'missing_original_metadata'
    | 'dimension_mismatch'
    | 'null_island'
    | 'integer_coordinate_precision';
  severity: 'info' | 'warning' | 'critical';
  messageParam?: Record<string, unknown>;
  defaultMessage: string;
}

export interface SingleAssetInput {
  fileName: string;
  fileSize: number;
  fileDate: number;
  exifData: Record<string, unknown>;
  actualWidth: number | null;
  actualHeight: number | null;
}

export interface TimelineJump {
  fromFileName: string;
  toFileName: string;
  deltaMs: number;
  deltaDays: number;
  deltaHours: number;
  deltaMinutes: number;
  deltaSeconds: number;
}

export interface GeospatialJump {
  fromFileName: string;
  toFileName: string;
  distanceKm: number;
  distanceMeters: number;
}

export interface CollectiveIntelligenceResult {
  integrity: {
    cleanCount: number;
    partiallyStrippedCount: number;
    fullyStrippedCount: number;
    matrix: Array<{
      fileName: string;
      presence: Record<ExifCategory, boolean>;
    }>;
  };
  hardware: {
    isConsistent: boolean;
    uniqueDevices: string[];
    uniqueSerials: string[];
    missingCount: number;
    hasSerialMatch: boolean;
    details: Array<{
      fileName: string;
      make: string;
      model: string;
      software: string;
      lensModel: string;
      bodySerial: string;
      lensSerial: string;
    }>;
  };
  timeline: {
    totalDurationMs: number;
    startTime: Date | null;
    endTime: Date | null;
    missingAssets: string[];
    jumps: TimelineJump[];
  };
  geospatial: {
    totalPathDistanceKm: number;
    maxSpreadKm: number;
    spreadCategory: 'concentrated' | 'localized' | 'trail' | 'none';
    missingCoordinatesCount: number;
    jumps: GeospatialJump[];
    velocityAlert: {
      hasAnomaly: boolean;
      maxSpeedKmh: number;
      fromFileName?: string;
      toFileName?: string;
    } | null;
  };
}
