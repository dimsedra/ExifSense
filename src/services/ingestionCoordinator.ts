import exifr from 'exifr';
import { detectFileType } from '../core/forensics/signature';
import { calculateFileHash, generateForensicId } from '../core/forensics/hashing';
import { categorizeExif } from '../core/forensics/metadata';
import { evaluateSingleAssetIntegrity } from '../core/forensics/integrity';
import type {
  ForensicAsset,
  FileDetectionResult,
} from '../core/forensics/types';
import type { BatchSanitizerEntry } from '../core/sanitizer/types';
import { useAssetStore, MAX_STAGED_FILES } from '../store/useAssetStore';
import { useSanitizerStore } from '../store/useSanitizerStore';
import { reverseGeocode } from './mapHelpers';

export interface ExtendedForensicAsset extends ForensicAsset {
  hashes: {
    sha256: string;
    sha1: string;
  };
  signature: FileDetectionResult;
  forensicSessionId: string;
}

export interface ExtendedBatchSanitizerEntry extends BatchSanitizerEntry {
  name: string;
  thumbUrl?: string;
}

function createSafePreviewUrl(file: File): string {
  try {
    if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
      return URL.createObjectURL(file);
    }
  } catch {
    // Fallback to empty string when object URLs are unavailable
  }
  return '';
}

/**
 * Validates a file's header bytes and returns its detected signature.
 */
export async function getFileSignature(file: File): Promise<FileDetectionResult> {
  const headerSlice = file.slice(0, 16);
  const headerBuffer = await headerSlice.arrayBuffer();
  return detectFileType(new Uint8Array(headerBuffer));
}

/**
 * Processes a single uploaded image file into a fully analyzed ForensicAsset.
 */
export async function processSingleAsset(file: File): Promise<ExtendedForensicAsset> {
  const signature = await getFileSignature(file);
  if (!signature.isValid) {
    throw new Error(`Unsupported file signature for ${file.name}`);
  }

  const fullBuffer = await file.arrayBuffer();
  const [sha256, sha1] = await Promise.all([
    calculateFileHash(fullBuffer, 'SHA-256'),
    calculateFileHash(fullBuffer, 'SHA-1'),
  ]);

  let rawExif: Record<string, unknown> = {};
  try {
    const parsed = await exifr.parse(file, true);
    if (parsed && typeof parsed === 'object') {
      rawExif = parsed;
    }
  } catch {
    rawExif = {};
  }

  const categorizedExif = categorizeExif(rawExif);
  const integrityAlerts = evaluateSingleAssetIntegrity({
    fileName: file.name,
    fileSize: file.size,
    fileDate: file.lastModified,
    exifData: rawExif,
    actualWidth: null,
    actualHeight: null,
  });

  const forensicSessionId = generateForensicId();
  const id = `asset-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  let locationData = undefined;
  const lat = Number(rawExif.latitude ?? rawExif.GPSLatitude);
  const lng = Number(rawExif.longitude ?? rawExif.GPSLongitude);
  if (!isNaN(lat) && !isNaN(lng)) {
    try {
      const loc = await reverseGeocode(lat, lng);
      if (loc) {
        locationData = loc;
      }
    } catch {
      // Ignore network errors
    }
  }

  const asset: ExtendedForensicAsset = {
    id,
    fileName: file.name,
    fileSize: file.size,
    fileType: signature.mimeType || file.type || 'application/octet-stream',
    fileDate: file.lastModified,
    sha256,
    sha1,
    actualWidth: null,
    actualHeight: null,
    exifData: rawExif,
    categorizedExif,
    integrityAlerts,
    thumbUrl: createSafePreviewUrl(file),
    fileObject: file,
    locationData: locationData ?? null,
    locationName: locationData?.display_name as string | undefined,
    hashes: {
      sha256,
      sha1,
    },
    signature,
    forensicSessionId,
  };

  useAssetStore.getState().setAssets([asset], forensicSessionId);
  return asset;
}

/**
 * Processes a batch of uploaded image files, filtering unsupported ones,
 * capping at MAX_STAGED_FILES, and grouping under a shared forensicSessionId.
 */
export async function processBatchAssets(
  files: File[]
): Promise<ExtendedForensicAsset[]> {
  if (!files || files.length === 0) {
    useAssetStore.getState().setAssets([]);
    return [];
  }

  const cappedFiles = files.slice(0, MAX_STAGED_FILES);
  const sharedSessionId = generateForensicId();
  const processedAssets: ExtendedForensicAsset[] = [];

  for (let i = 0; i < cappedFiles.length; i++) {
    const file = cappedFiles[i]!;
    const signature = await getFileSignature(file);
    if (!signature.isValid) {
      continue;
    }

    const fullBuffer = await file.arrayBuffer();
    const [sha256, sha1] = await Promise.all([
      calculateFileHash(fullBuffer, 'SHA-256'),
      calculateFileHash(fullBuffer, 'SHA-1'),
    ]);

    let rawExif: Record<string, unknown> = {};
    try {
      const parsed = await exifr.parse(file, true);
      if (parsed && typeof parsed === 'object') {
        rawExif = parsed;
      }
    } catch {
      rawExif = {};
    }

    const categorizedExif = categorizeExif(rawExif);
    const integrityAlerts = evaluateSingleAssetIntegrity({
      fileName: file.name,
      fileSize: file.size,
      fileDate: file.lastModified,
      exifData: rawExif,
      actualWidth: null,
      actualHeight: null,
    });

    const asset: ExtendedForensicAsset = {
      id: `asset-${Date.now()}-${i}`,
      fileName: file.name,
      fileSize: file.size,
      fileType: signature.mimeType || file.type || 'application/octet-stream',
      fileDate: file.lastModified,
      sha256,
      sha1,
      actualWidth: null,
      actualHeight: null,
      exifData: rawExif,
      categorizedExif,
      integrityAlerts,
      thumbUrl: createSafePreviewUrl(file),
      fileObject: file,
      hashes: {
        sha256,
        sha1,
      },
      signature,
      forensicSessionId: sharedSessionId,
    };

    processedAssets.push(asset);
  }

  useAssetStore.getState().setAssets(processedAssets, sharedSessionId);
  return processedAssets;
}

/**
 * Ingests files into the sanitizer store for metadata stripping.
 */
export async function processSanitizerIntake(
  files: File[]
): Promise<ExtendedBatchSanitizerEntry[]> {
  const entries: ExtendedBatchSanitizerEntry[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i]!;
    let rawExif: Record<string, unknown> = {};
    try {
      const parsed = await exifr.parse(file, true);
      if (parsed && typeof parsed === 'object') {
        rawExif = parsed;
      }
    } catch {
      rawExif = {};
    }

    const entry: ExtendedBatchSanitizerEntry = {
      id: `sanitizer-entry-${Date.now()}-${i}`,
      file,
      fileName: file.name,
      name: file.name,
      exifData: rawExif,
      thumbUrl: createSafePreviewUrl(file),
    };
    entries.push(entry);
  }

  useSanitizerStore.getState().openBatch(entries);
  return entries;
}
