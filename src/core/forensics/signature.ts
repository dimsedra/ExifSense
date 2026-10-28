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

  const getHex = (arr: Uint8Array) =>
    Array.from(arr)
      .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
      .join(' ');

  const getAscii = (arr: Uint8Array) => String.fromCharCode(...arr);

  const hex = getHex(headerBytes);
  const ascii = getAscii(headerBytes);

  // 1. JPEG: FF D8 FF
  if (hex.startsWith('FF D8 FF')) {
    return { isValid: true, mimeType: 'image/jpeg', extension: 'jpg', detectedFormat: 'JPEG' };
  }

  // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (hex.startsWith('89 50 4E 47 0D 0A 1A 0A')) {
    return { isValid: true, mimeType: 'image/png', extension: 'png', detectedFormat: 'PNG' };
  }

  // 3. GIF: GIF8 (47 49 46 38)
  if (hex.startsWith('47 49 46 38')) {
    return { isValid: true, mimeType: 'image/gif', extension: 'gif', detectedFormat: 'GIF' };
  }

  // 4. WEBP: starts with "RIFF" (52 49 46 46) and "WEBP" at offset 8 (57 45 42 50)
  if (hex.startsWith('52 49 46 46') && hex.substring(24, 35) === '57 45 42 50') {
    return { isValid: true, mimeType: 'image/webp', extension: 'webp', detectedFormat: 'WEBP' };
  }

  // 5. TIFF (Little Endian): 49 49 2A 00
  if (hex.startsWith('49 49 2A 00')) {
    // Canon RAW (.cr2) specifically has "CR" (43 52 02 00) at offset 8
    if (hex.substring(24, 35) === '43 52 02 00') {
      return { isValid: true, mimeType: 'image/x-canon-cr2', extension: 'cr2', detectedFormat: 'Canon RAW (CR2)' };
    }
    return { isValid: true, mimeType: 'image/tiff', extension: 'tiff', detectedFormat: 'TIFF' };
  }

  // 6. TIFF (Big Endian): 4D 4D 00 2A
  if (hex.startsWith('4D 4D 00 2A')) {
    return { isValid: true, mimeType: 'image/tiff', extension: 'tiff', detectedFormat: 'TIFF' };
  }

  // 7. HEIC / HEIF: Check for 'ftyp' starting at byte 4 (hex `66 74 79 70`)
  // and compatible brand containing 'heic', 'heix', 'hevc', 'mif1', 'msf1' starting at byte 8
  if (hex.substring(12, 23) === '66 74 79 70') {
    const brand = ascii.substring(8, 12).toLowerCase();
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
