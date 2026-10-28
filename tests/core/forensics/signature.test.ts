import { describe, it, expect } from 'vitest';
import { detectFileType, reconcileFileExtension } from '../../../src/core/forensics/signature.ts';
import type { FileDetectionResult } from '../../../src/core/forensics/types.ts';

describe('File Signature Detection (REQ-SIG-001)', () => {
  it('detects JPEG magic bytes correctly', () => {
    const bytes = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00]);
    const res = detectFileType(bytes);
    expect(res).toEqual({
      isValid: true,
      mimeType: 'image/jpeg',
      extension: 'jpg',
      detectedFormat: 'JPEG'
    });
  });

  it('detects PNG magic bytes correctly', () => {
    const bytes = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52]);
    const res = detectFileType(bytes);
    expect(res).toEqual({
      isValid: true,
      mimeType: 'image/png',
      extension: 'png',
      detectedFormat: 'PNG'
    });
  });

  it('detects GIF magic bytes correctly', () => {
    const bytes = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00]);
    const res = detectFileType(bytes);
    expect(res).toEqual({
      isValid: true,
      mimeType: 'image/gif',
      extension: 'gif',
      detectedFormat: 'GIF'
    });
  });

  it('detects WEBP magic bytes correctly', () => {
    // RIFF....WEBP
    const bytes = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20]);
    const res = detectFileType(bytes);
    expect(res).toEqual({
      isValid: true,
      mimeType: 'image/webp',
      extension: 'webp',
      detectedFormat: 'WEBP'
    });
  });

  it('detects TIFF Little Endian correctly', () => {
    const bytes = new Uint8Array([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
    const res = detectFileType(bytes);
    expect(res).toEqual({
      isValid: true,
      mimeType: 'image/tiff',
      extension: 'tiff',
      detectedFormat: 'TIFF'
    });
  });

  it('detects TIFF Big Endian correctly', () => {
    const bytes = new Uint8Array([0x4D, 0x4D, 0x00, 0x2A, 0x00, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
    const res = detectFileType(bytes);
    expect(res).toEqual({
      isValid: true,
      mimeType: 'image/tiff',
      extension: 'tiff',
      detectedFormat: 'TIFF'
    });
  });

  it('detects Canon RAW (CR2) correctly', () => {
    // 49 49 2A 00 ... CR (43 52 02 00) at offset 8
    const bytes = new Uint8Array([0x49, 0x49, 0x2A, 0x00, 0x10, 0x00, 0x00, 0x00, 0x43, 0x52, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00]);
    const res = detectFileType(bytes);
    expect(res).toEqual({
      isValid: true,
      mimeType: 'image/x-canon-cr2',
      extension: 'cr2',
      detectedFormat: 'Canon RAW (CR2)'
    });
  });

  it('detects HEIC/HEIF correctly', () => {
    // offset 4: ftyp (66 74 79 70), offset 8: heic (68 65 69 63)
    const bytes = new Uint8Array([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63, 0x00, 0x00, 0x00, 0x00]);
    const res = detectFileType(bytes);
    expect(res).toEqual({
      isValid: true,
      mimeType: 'image/heic',
      extension: 'heic',
      detectedFormat: 'HEIC/HEIF'
    });
  });

  it('rejects short buffers with less than 4 bytes (REQ-SIG-001 Error Path)', () => {
    const emptyBytes = new Uint8Array([]);
    const shortBytes = new Uint8Array([0xFF, 0xD8]);
    expect(detectFileType(emptyBytes)).toEqual({
      isValid: false,
      mimeType: null,
      extension: null,
      detectedFormat: null
    });
    expect(detectFileType(shortBytes)).toEqual({
      isValid: false,
      mimeType: null,
      extension: null,
      detectedFormat: null
    });
  });

  it('rejects arbitrary non-image binaries (REQ-SIG-001 Error Path)', () => {
    // PDF header %PDF
    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x35, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
    expect(detectFileType(pdfBytes)).toEqual({
      isValid: false,
      mimeType: null,
      extension: null,
      detectedFormat: null
    });

    // Random noise
    const randomBytes = new Uint8Array([0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC, 0xDE, 0xF0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
    expect(detectFileType(randomBytes)).toEqual({
      isValid: false,
      mimeType: null,
      extension: null,
      detectedFormat: null
    });
  });

  describe('Extension Reconciliation & Filename Repair (REQ-SIG-002)', () => {
    it('accepts exact matching extension', () => {
      const detection: FileDetectionResult = {
        isValid: true,
        mimeType: 'image/png',
        extension: 'png',
        detectedFormat: 'PNG'
      };
      const res = reconcileFileExtension('sample.png', detection);
      expect(res).toEqual({
        isEquivalent: true,
        resolvedFileName: 'sample.png'
      });
    });

    it('treats equivalent pairs (jpg/jpeg, tif/tiff, heic/heif) as valid equivalents', () => {
      const jpgDetection: FileDetectionResult = {
        isValid: true,
        mimeType: 'image/jpeg',
        extension: 'jpg',
        detectedFormat: 'JPEG'
      };
      expect(reconcileFileExtension('photo.jpeg', jpgDetection)).toEqual({
        isEquivalent: true,
        resolvedFileName: 'photo.jpeg'
      });

      const tiffDetection: FileDetectionResult = {
        isValid: true,
        mimeType: 'image/tiff',
        extension: 'tiff',
        detectedFormat: 'TIFF'
      };
      expect(reconcileFileExtension('scan.tif', tiffDetection)).toEqual({
        isEquivalent: true,
        resolvedFileName: 'scan.tif'
      });
    });

    it('corrects mismatched or missing file extensions', () => {
      const pngDetection: FileDetectionResult = {
        isValid: true,
        mimeType: 'image/png',
        extension: 'png',
        detectedFormat: 'PNG'
      };
      // Mismatched: photo.jpg is actually a PNG
      expect(reconcileFileExtension('photo.jpg', pngDetection)).toEqual({
        isEquivalent: false,
        resolvedFileName: 'photo.png'
      });

      // Missing extension
      expect(reconcileFileExtension('avatar', pngDetection)).toEqual({
        isEquivalent: false,
        resolvedFileName: 'avatar.png'
      });
    });
  });
});
