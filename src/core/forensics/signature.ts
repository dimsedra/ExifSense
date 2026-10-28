import type { FileDetectionResult } from './types.ts';

/**
 * Detect file type using magic bytes (file signature verification).
 * Reads the first 16 bytes of the file and matches them against known signatures.
 * @param headerBytes Uint8Array of at least the first 16 bytes.
 */
export function detectFileType(headerBytes: Uint8Array): FileDetectionResult {
  if (!headerBytes || headerBytes.length < 4) {
    return { isValid: false, mimeType: null, extension: null, detectedFormat: null };
  }

  const header = headerBytes.subarray(0, 16);

  // 1. JPEG: FF D8 FF
  if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) {
    return { isValid: true, mimeType: 'image/jpeg', extension: 'jpg', detectedFormat: 'JPEG' };
  }

  // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    header.length >= 8 &&
    header[0] === 0x89 &&
    header[1] === 0x50 &&
    header[2] === 0x4e &&
    header[3] === 0x47 &&
    header[4] === 0x0d &&
    header[5] === 0x0a &&
    header[6] === 0x1a &&
    header[7] === 0x0a
  ) {
    return { isValid: true, mimeType: 'image/png', extension: 'png', detectedFormat: 'PNG' };
  }

  // 3. GIF: GIF8 (47 49 46 38)
  if (
    header[0] === 0x47 &&
    header[1] === 0x49 &&
    header[2] === 0x46 &&
    header[3] === 0x38
  ) {
    return { isValid: true, mimeType: 'image/gif', extension: 'gif', detectedFormat: 'GIF' };
  }

  // 4. WEBP: starts with "RIFF" (52 49 46 46) and "WEBP" at offset 8 (57 45 42 50)
  if (
    header.length >= 12 &&
    header[0] === 0x52 &&
    header[1] === 0x49 &&
    header[2] === 0x46 &&
    header[3] === 0x46 &&
    header[8] === 0x57 &&
    header[9] === 0x45 &&
    header[10] === 0x42 &&
    header[11] === 0x50
  ) {
    return { isValid: true, mimeType: 'image/webp', extension: 'webp', detectedFormat: 'WEBP' };
  }

  // 5. TIFF (Little Endian): 49 49 2A 00
  if (
    header[0] === 0x49 &&
    header[1] === 0x49 &&
    header[2] === 0x2a &&
    header[3] === 0x00
  ) {
    // Canon RAW (.cr2) specifically has "CR" (43 52 02 00) at offset 8
    if (
      header.length >= 12 &&
      header[8] === 0x43 &&
      header[9] === 0x52 &&
      header[10] === 0x02 &&
      header[11] === 0x00
    ) {
      return { isValid: true, mimeType: 'image/x-canon-cr2', extension: 'cr2', detectedFormat: 'Canon RAW (CR2)' };
    }
    return { isValid: true, mimeType: 'image/tiff', extension: 'tiff', detectedFormat: 'TIFF' };
  }

  // 6. TIFF (Big Endian): 4D 4D 00 2A
  if (
    header[0] === 0x4d &&
    header[1] === 0x4d &&
    header[2] === 0x00 &&
    header[3] === 0x2a
  ) {
    return { isValid: true, mimeType: 'image/tiff', extension: 'tiff', detectedFormat: 'TIFF' };
  }

  // 7. HEIC / HEIF: Check for 'ftyp' starting at byte 4 (hex `66 74 79 70`)
  // and compatible brand containing 'heic', 'heix', 'hevc', 'mif1', 'msf1' starting at byte 8
  if (
    header.length >= 12 &&
    header[4] === 0x66 &&
    header[5] === 0x74 &&
    header[6] === 0x79 &&
    header[7] === 0x70
  ) {
    const brand = String.fromCharCode(
      header[8],
      header[9],
      header[10],
      header[11],
    ).toLowerCase();
    if (['heic', 'heix', 'hevc', 'mif1', 'msf1'].some((b) => brand.includes(b))) {
      return { isValid: true, mimeType: 'image/heic', extension: 'heic', detectedFormat: 'HEIC/HEIF' };
    }
  }

  return { isValid: false, mimeType: null, extension: null, detectedFormat: null };
}

const EXTENSION_EQUIVALENTS: Record<string, string[]> = {
  jpg: ['jpg', 'jpeg'],
  jpeg: ['jpg', 'jpeg'],
  tif: ['tif', 'tiff'],
  tiff: ['tif', 'tiff'],
  heic: ['heic', 'heif'],
  heif: ['heic', 'heif']
};

/**
 * Reconciles the file extension of a file against detected format signature.
 * @param originalFileName The original file name.
 * @param detection Result from detectFileType.
 */
export function reconcileFileExtension(
  originalFileName: string,
  detection: FileDetectionResult
): { isEquivalent: boolean; resolvedFileName: string } {
  if (!detection.isValid || !detection.extension) {
    return { isEquivalent: false, resolvedFileName: originalFileName };
  }

  const lastDotIndex = originalFileName.lastIndexOf('.');
  const hasExtension = lastDotIndex !== -1 && lastDotIndex < originalFileName.length - 1;
  const originalExt = hasExtension ? originalFileName.substring(lastDotIndex + 1).toLowerCase() : '';
  const detectedExt = detection.extension.toLowerCase();

  const isExact = originalExt === detectedExt;
  const isEquivalent =
    isExact ||
    (EXTENSION_EQUIVALENTS[detectedExt] != null &&
      EXTENSION_EQUIVALENTS[detectedExt].includes(originalExt));

  if (isEquivalent) {
    return { isEquivalent: true, resolvedFileName: originalFileName };
  }

  const baseName = hasExtension ? originalFileName.substring(0, lastDotIndex) : originalFileName;
  return {
    isEquivalent: false,
    resolvedFileName: `${baseName}.${detectedExt}`
  };
}

export interface FileLike {
  name: string;
  size: number;
}

/**
 * Validates batch files against 100MB file size limit and 50-file batch quota (REQ-SIG-003).
 */
export function validateBatchLimits<T extends FileLike>(
  files: T[],
  maxCount = 50,
  maxSizeBytes = 100 * 1024 * 1024
): {
  accepted: T[];
  rejected: Array<{ file: T; reason: 'exceeds_file_size' | 'exceeds_batch_limit' }>;
} {
  const accepted: T[] = [];
  const rejected: Array<{ file: T; reason: 'exceeds_file_size' | 'exceeds_batch_limit' }> = [];

  for (const file of files) {
    if (file.size > maxSizeBytes) {
      rejected.push({ file, reason: 'exceeds_file_size' });
      continue;
    }

    if (accepted.length >= maxCount) {
      rejected.push({ file, reason: 'exceeds_batch_limit' });
      continue;
    }

    accepted.push(file);
  }

  return { accepted, rejected };
}
