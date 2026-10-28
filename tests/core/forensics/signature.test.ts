import { describe, it, expect } from 'vitest';
import { detectFileType } from '../../../src/core/forensics/signature.ts';

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
});
