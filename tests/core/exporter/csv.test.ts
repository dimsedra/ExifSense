import { describe, it, expect } from 'vitest';
import { generateCsvReport } from '../../../src/core/exporter/exporter';
import { ForensicAsset } from '../../../src/core/forensics/types';
import { ForensicExportMetadata } from '../../../src/core/exporter/types';

describe('Tabular CSV Matrix Export (REQ-EXP-003)', () => {
  const meta: ForensicExportMetadata = {
    sessionTitle: 'Incident Report 404',
    forensicId: 'ES-CSV-999',
    investigatorIdentity: 'Agent Scully',
    generatedAt: new Date('2026-10-28T12:00:00.000Z')
  };

  const asset1: ForensicAsset = {
    id: '1',
    fileName: 'photo_with,comma.jpg',
    fileSize: 1048576,
    fileType: 'image/jpeg',
    fileDate: 1729000000000,
    sha256: 'HASH256',
    sha1: 'HASH1',
    actualWidth: 1920,
    actualHeight: 1080,
    exifData: {
      Make: '=cmd|"/C calc"!A0', // Potential CSV injection payload
      Model: 'Nikon "Pro" D850', // Embedded quotes
      Description: 'Line 1\nLine 2' // Multiline cell
    },
    categorizedExif: {
      'Device Hardware': {
        Make: '=cmd|"/C calc"!A0',
        Model: 'Nikon "Pro" D850'
      },
      'Exposure Settings': {},
      'Optics & Lens': {},
      'Image Quality': {},
      'Timeline & Date': {},
      Geospatial: {},
      'Standards & Info': {},
      Miscellaneous: {
        Description: 'Line 1\nLine 2'
      }
    },
    integrityAlerts: []
  };

  it('prefixes CSV with UTF-8 BOM and outputs valid matrix structure (Normal Path)', () => {
    const csv = generateCsvReport([asset1], meta, 'en');

    // UTF-8 BOM check
    expect(csv.charCodeAt(0)).toBe(0xfeff);

    // Header metadata check
    expect(csv).toContain('Incident Report 404');
    expect(csv).toContain('ES-CSV-999');

    // Column structure
    expect(csv).toContain('Asset Name,Category,Property,Value');
  });

  it('escapes embedded quotes, commas, and multiline cells according to RFC 4180', () => {
    const csv = generateCsvReport([asset1], meta, 'en');

    // File name with comma must be quoted
    expect(csv).toContain('"photo_with,comma.jpg"');

    // Quotes must be doubled
    expect(csv).toContain('"Nikon ""Pro"" D850"');
  });

  it('sanitizes potential CSV formula injection payloads starting with = + - @ (Security)', () => {
    const csv = generateCsvReport([asset1], meta, 'en');

    // Must be prepended with a single quote so spreadsheet engines do not evaluate it as formula
    expect(csv).toContain("'=cmd");
  });

  it('sanitizes CSV formula injection padded with leading spaces or tabs (Security)', () => {
    const maliciousAsset: ForensicAsset = {
      ...asset1,
      id: 'mal-1',
      categorizedExif: {
        ...asset1.categorizedExif,
        'Device Hardware': {
          Make: '  =SUM(1+1)',
          Model: '\t+1234'
        }
      }
    };

    const csv = generateCsvReport([maliciousAsset], meta, 'en');
    expect(csv).toContain("'  =SUM(1+1)");
    expect(csv).toContain("'\t+1234");
  });

  it('produces valid CSV header without rows when assets array is empty (Boundary)', () => {
    const csv = generateCsvReport([], meta, 'en');
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('Asset Name,Category,Property,Value');
  });
});
