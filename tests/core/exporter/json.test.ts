import { describe, it, expect } from 'vitest';
import { generateJsonReport } from '../../../src/core/exporter/exporter';
import { ForensicAsset } from '../../../src/core/forensics/types';
import { ForensicExportMetadata } from '../../../src/core/exporter/types';

describe('Machine-Readable JSON Report Export (REQ-EXP-002)', () => {
  const meta: ForensicExportMetadata = {
    sessionTitle: 'Operation Alpha',
    forensicId: 'ES-TEST-001',
    investigatorIdentity: 'Detective Smith (ID: 442)',
    generatedAt: new Date('2026-10-28T10:00:00.000Z')
  };

  const asset1: ForensicAsset = {
    id: 'asset-1',
    fileName: 'evidence1.jpg',
    fileSize: 2048000,
    fileType: 'image/jpeg',
    fileDate: 1729000000000,
    sha256: 'E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855',
    sha1: 'DA39A3EE5E6B4B0D3255BFEF95601890AFD80709',
    actualWidth: 4000,
    actualHeight: 3000,
    exifData: { Make: 'Canon', Model: 'EOS R5' },
    categorizedExif: {
      'Device Hardware': { Make: 'Canon', Model: 'EOS R5' },
      'Exposure Settings': {},
      'Optics & Lens': {},
      'Image Quality': {},
      'Timeline & Date': {},
      Geospatial: {},
      'Standards & Info': {},
      Miscellaneous: {}
    },
    integrityAlerts: []
  };

  it('generates schema-compliant, formatted JSON report (Normal Path)', () => {
    const jsonString = generateJsonReport([asset1], meta);
    expect(typeof jsonString).toBe('string');

    const parsed = JSON.parse(jsonString);
    expect(parsed.forensicId).toBe('ES-TEST-001');
    expect(parsed.sessionTitle).toBe('Operation Alpha');
    expect(parsed.investigator).toBe('Detective Smith (ID: 442)');
    expect(parsed.assetCount).toBe(1);
    expect(parsed.assets).toHaveLength(1);

    const assetReport = parsed.assets[0];
    expect(assetReport.id).toBe('asset-1');
    expect(assetReport.fileName).toBe('evidence1.jpg');
    expect(assetReport.sha256).toBe(
      'E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855'
    );
    expect(assetReport.sha1).toBe('DA39A3EE5E6B4B0D3255BFEF95601890AFD80709');
    expect(assetReport.rawExif).toEqual({ Make: 'Canon', Model: 'EOS R5' });

    // 2-space indentation verification
    expect(jsonString).toContain('  "forensicId": "ES-TEST-001"');
  });

  it('handles empty assets array with zero count (Boundary & Limits)', () => {
    const jsonString = generateJsonReport([], meta);
    const parsed = JSON.parse(jsonString);

    expect(parsed.assetCount).toBe(0);
    expect(parsed.assets).toEqual([]);
    expect(parsed.collectiveIntelligence).toBeNull();
  });
});
