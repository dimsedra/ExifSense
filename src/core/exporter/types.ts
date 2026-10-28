import { ForensicAsset } from '../forensics/types';

export interface ForensicExportMetadata {
  sessionTitle: string;
  forensicId: string;
  investigatorIdentity?: string | null;
  generatedAt: Date;
}

export interface ExportFileResult {
  fileName: string;
  mimeType: string;
  blob: Blob;
}

export interface JsonReportSchema {
  forensicId: string;
  sessionTitle: string;
  generatedAt: string;
  investigator: string | null;
  assetCount: number;
  collectiveIntelligence: unknown;
  assets: Array<{
    id: string;
    fileName: string;
    fileSize: number;
    fileType: string;
    fileDate: string;
    sha256: string;
    sha1: string;
    dimensions: {
      actualWidth: number | null;
      actualHeight: number | null;
    };
    rawExif: Record<string, unknown>;
    categorizedExif: Record<string, Record<string, unknown>>;
    integrityAlerts: unknown[];
  }>;
}
