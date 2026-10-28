import { describe, it, expect } from 'vitest';
import { generatePdfReport } from '../../../src/core/exporter/exporter';
import { ForensicAsset } from '../../../src/core/forensics/types';
import { ForensicExportMetadata } from '../../../src/core/exporter/types';

describe('Multi-Page Forensic PDF Generation (REQ-EXP-001)', () => {
  const meta: ForensicExportMetadata = {
    sessionTitle: 'Operation PDF Forensics',
    forensicId: 'ES-PDF-2026',
    investigatorIdentity: 'Senior Agent Fox (Badge: 8819)',
    generatedAt: new Date('2026-10-28T16:00:00.000Z')
  };

  const asset1: ForensicAsset = {
    id: '1',
    fileName: 'photo_evidence_1.jpg',
    fileSize: 4194304,
    fileType: 'image/jpeg',
    fileDate: 1729000000000,
    sha256: 'E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855',
    sha1: 'DA39A3EE5E6B4B0D3255BFEF95601890AFD80709',
    actualWidth: 6000,
    actualHeight: 4000,
    exifData: {
      Make: 'Sony',
      Model: 'A7 IV',
      FocalLength: 50,
      FNumber: 2.8,
      ISO: 400,
      ExposureTime: 0.002,
      latitude: 37.7749,
      longitude: -122.4194,
      DateTimeOriginal: '2026:10:28 10:00:00'
    },
    categorizedExif: {
      'Device Hardware': { Make: 'Sony', Model: 'A7 IV' },
      'Exposure Settings': { FNumber: 2.8, ISO: 400, ExposureTime: 0.002 },
      'Optics & Lens': { FocalLength: 50 },
      'Image Quality': { ImageWidth: 6000, ImageHeight: 4000 },
      'Timeline & Date': { DateTimeOriginal: '2026:10:28 10:00:00' },
      Geospatial: { latitude: 37.7749, longitude: -122.4194 },
      'Standards & Info': {},
      Miscellaneous: {}
    },
    integrityAlerts: []
  };

  const asset2: ForensicAsset = {
    ...asset1,
    id: '2',
    fileName: 'photo_evidence_2.jpg',
    fileDate: 1729007200000,
    exifData: {
      ...asset1.exifData,
      latitude: 37.7949,
      longitude: -122.4094,
      DateTimeOriginal: '2026:10:28 12:00:00'
    }
  };

  it('generates valid binary PDF blob with %PDF- header for single asset (Normal Path)', async () => {
    const pdfBlob = await generatePdfReport([asset1], meta, 'en');

    expect(pdfBlob).toBeInstanceOf(Blob);
    expect(pdfBlob.type).toBe('application/pdf');

    const buffer = await pdfBlob.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // Verify PDF header %PDF-
    const header = String.fromCharCode(...bytes.subarray(0, 5));
    expect(header).toBe('%PDF-');
  });

  it('generates multi-page PDF with collective matrix tables when multiple assets provided', async () => {
    const pdfBlob = await generatePdfReport([asset1, asset2], meta, 'en');

    expect(pdfBlob).toBeInstanceOf(Blob);
    expect(pdfBlob.size).toBeGreaterThan(1000);

    const buffer = await pdfBlob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const header = String.fromCharCode(...bytes.subarray(0, 5));
    expect(header).toBe('%PDF-');
  });

  it('handles empty assets array returning valid PDF with cover page (Boundary & Limits)', async () => {
    const pdfBlob = await generatePdfReport([], meta, 'en');
    expect(pdfBlob).toBeInstanceOf(Blob);

    const buffer = await pdfBlob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    expect(String.fromCharCode(...bytes.subarray(0, 5))).toBe('%PDF-');
  });
});
