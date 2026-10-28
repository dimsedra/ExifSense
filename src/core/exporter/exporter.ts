import { ForensicAsset } from '../forensics/types';
import { evaluateCollectiveIntelligence } from '../forensics/collective';
import { ForensicExportMetadata, JsonReportSchema } from './types';

/**
 * Generates machine-readable JSON forensic report (REQ-EXP-002).
 * Formatted with 2-space indentation.
 */
export function generateJsonReport(
  assets: ForensicAsset[],
  meta: ForensicExportMetadata
): string {
  const collective = assets.length > 1 ? evaluateCollectiveIntelligence(assets) : null;

  const report: JsonReportSchema = {
    forensicId: meta.forensicId,
    sessionTitle: meta.sessionTitle,
    generatedAt: meta.generatedAt.toISOString(),
    investigator: meta.investigatorIdentity || null,
    assetCount: assets.length,
    collectiveIntelligence: collective,
    assets: assets.map((asset) => ({
      id: asset.id,
      fileName: asset.fileName,
      fileSize: asset.fileSize,
      fileType: asset.fileType,
      fileDate: new Date(asset.fileDate).toISOString(),
      sha256: asset.sha256,
      sha1: asset.sha1,
      dimensions: {
        actualWidth: asset.actualWidth,
        actualHeight: asset.actualHeight
      },
      rawExif: asset.exifData,
      categorizedExif: asset.categorizedExif,
      integrityAlerts: asset.integrityAlerts
    }))
  };

  return JSON.stringify(report, null, 2);
}
