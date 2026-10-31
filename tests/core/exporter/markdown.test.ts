import { describe, it, expect } from 'vitest';
import { generateMarkdownReport } from '../../../src/core/exporter/exporter';
import { ForensicAsset } from '../../../src/core/forensics/types';
import { ForensicExportMetadata } from '../../../src/core/exporter/types';

describe('GitHub Flavored Markdown Report Export (REQ-EXP-004)', () => {
  const meta: ForensicExportMetadata = {
    sessionTitle: 'Investigation Beta',
    forensicId: 'ES-MD-007',
    investigatorIdentity: 'Inspector Lestrade',
    generatedAt: new Date('2026-10-28T14:00:00.000Z')
  };

  const asset1: ForensicAsset = {
    id: '1',
    fileName: 'street_scene.jpg',
    fileSize: 3145728,
    fileType: 'image/jpeg',
    fileDate: 1729000000000,
    sha256: 'HASH256_STREET',
    sha1: 'HASH1_STREET',
    actualWidth: 4000,
    actualHeight: 3000,
    exifData: {
      Make: 'Fujifilm',
      Model: 'X-T5',
      FocalLength: 23,
      latitude: 51.5074,
      longitude: -0.1278
    },
    categorizedExif: {
      'Device Hardware': { Make: 'Fujifilm', Model: 'X-T5' },
      'Exposure Settings': {},
      'Optics & Lens': { FocalLength: 23 },
      'Image Quality': {},
      'Timeline & Date': {},
      Geospatial: { latitude: 51.5074, longitude: -0.1278 },
      'Standards & Info': {},
      Miscellaneous: {}
    },
    integrityAlerts: []
  };

  it('generates GFM markdown with headers, tables, and forensic narratives (Normal Path)', () => {
    const md = generateMarkdownReport([asset1], meta, 'en');

    // Title & Session metadata
    expect(md).toContain('# EXIFSENSE METADATA ANALYSIS REPORT');
    expect(md).toContain('**Session:** Investigation Beta');
    expect(md).toContain('**Session Identifier:** ES-MD-007');
    expect(md).toContain('**Asset Count:** 1');

    // Asset header
    expect(md).toContain('## ASSET 1: street_scene.jpg');

    // Technical details table
    expect(md).toContain('| Property | Value |');
    expect(md).toContain('|---|---|');
    expect(md).toContain('| SHA-256 | `HASH256_STREET` |');

    // Categorized metadata table
    expect(md).toContain('#### Device Hardware');
    expect(md).toContain('| Make | Fujifilm |');
  });

  it('includes collective intelligence section with blockquotes when multi-asset', () => {
    const asset2: ForensicAsset = {
      ...asset1,
      id: '2',
      fileName: 'street_scene_2.jpg'
    };

    const md = generateMarkdownReport([asset1, asset2], meta, 'en');

    expect(md).toContain('## COMBINED METADATA INSIGHTS');
    expect(md).toContain('> '); // Blockquotes for collective narrative
    expect(md).toContain('## ASSET 1: street_scene.jpg');
    expect(md).toContain('## ASSET 2: street_scene_2.jpg');
  });

  it('handles empty asset array without asset sections (Boundary & Limits)', () => {
    const md = generateMarkdownReport([], meta, 'en');
    expect(md).toContain('# EXIFSENSE METADATA ANALYSIS REPORT');
    expect(md).toContain('**Asset Count:** 0');
    expect(md).not.toContain('## ASSET 1');
  });
});
