import { describe, it, expect } from 'vitest';
import { formatHashOutput } from '../../src/cli/formatter';
import type { FileHashResult } from '../../src/cli/hasher';

describe('BP-HASH-003: formatHashOutput', () => {
  const sampleResults: FileHashResult[] = [
    {
      fileName: 'photo_alpha.jpg',
      filePath: '/evidence/photo_alpha.jpg',
      fileSize: 1048576,
      sha256: 'A591A6D40BF420404A011733CFB7B190D62C65BF0BCDA32B57B277D9AD9F146E',
      sha1: '0A4D55A8D778E5022FAB701977C5D840BBC486D0',
    },
    {
      fileName: 'doc_beta.png',
      filePath: '/evidence/doc_beta.png',
      fileSize: 2048,
      sha256: 'E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855',
      sha1: 'DA39A3EE5E6B4B0D3255BFEF95601890AFD80709',
    },
  ];

  it('Given plain format, When formatted, Then returns aligned ASCII table with header metrics and hashes', () => {
    const output = formatHashOutput(sampleResults, { format: 'plain', locale: 'en' });

    expect(output).toContain('=== ExifSense Cryptographic Hash Manifest ===');
    expect(output).toContain('Total Files: 2');
    expect(output).toContain('File Name');
    expect(output).toContain('Size (bytes)');
    expect(output).toContain('SHA-256');
    expect(output).toContain('SHA-1');

    expect(output).toContain('photo_alpha.jpg');
    expect(output).toContain('1048576');
    expect(output).toContain('A591A6D40BF420404A011733CFB7B190D62C65BF0BCDA32B57B277D9AD9F146E');
    expect(output).toContain('0A4D55A8D778E5022FAB701977C5D840BBC486D0');

    expect(output).toContain('doc_beta.png');
    expect(output).toContain('2048');
  });

  it('Given markdown format, When formatted, Then returns Markdown table with backtick wrapped hashes', () => {
    const output = formatHashOutput(sampleResults, { format: 'markdown', locale: 'en' });

    expect(output).toContain('# ExifSense Cryptographic Hash Manifest');
    expect(output).toContain('- **Total Files**: 2');
    expect(output).toContain('| File Name | Size (bytes) | SHA-256 | SHA-1 |');
    expect(output).toContain('| --- | --- | --- | --- |');
    expect(output).toContain('| photo_alpha.jpg | 1048576 | `A591A6D40BF420404A011733CFB7B190D62C65BF0BCDA32B57B277D9AD9F146E` | `0A4D55A8D778E5022FAB701977C5D840BBC486D0` |');
    expect(output).toContain('| doc_beta.png | 2048 | `E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855` | `DA39A3EE5E6B4B0D3255BFEF95601890AFD80709` |');
  });

  it('Given empty array in plain format, When formatted, Then returns graceful empty manifest header', () => {
    const output = formatHashOutput([], { format: 'plain', locale: 'en' });

    expect(output).toContain('=== ExifSense Cryptographic Hash Manifest ===');
    expect(output).toContain('Total Files: 0');
    expect(output).toContain('No files found.');
  });

  it('Given empty array in markdown format, When formatted, Then returns graceful empty manifest markdown', () => {
    const output = formatHashOutput([], { format: 'markdown', locale: 'en' });

    expect(output).toContain('# ExifSense Cryptographic Hash Manifest');
    expect(output).toContain('- **Total Files**: 0');
    expect(output).toContain('No files found.');
  });
});

describe('BP-PARITY-002: formatSingleOutput Header and 7-Section Narrative Parity', () => {
  const fullAsset = {
    id: 'asset-1',
    fileName: 'photo_001.jpg',
    fileSize: 987375,
    fileType: 'image/jpeg',
    fileDate: new Date('2023-05-10T14:30:00Z').getTime(),
    sha256: 'A'.repeat(64),
    sha1: 'B'.repeat(40),
    actualWidth: 4032,
    actualHeight: 3024,
    locationName: 'Luss, Argyll and Bute, Scotland',
    exifData: {
      Make: 'LGE',
      Model: 'Nexus 5X',
      ExposureTime: 0.002,
      FNumber: 2,
      ISO: 100,
      FocalLength: 4.67,
      ImageWidth: 4032,
      ImageHeight: 3024,
      DateTimeOriginal: '2023:05:10 14:30:00',
      GPSLatitude: 55.86449,
      GPSLongitude: -4.42989,
    },
    categorizedExif: {
      'Device Hardware': { Make: 'LGE', Model: 'Nexus 5X' },
      'Exposure Settings': { ExposureTime: 0.002, FNumber: 2, ISO: 100 },
      'Optics & Lens': { FocalLength: 4.67 },
      'Image Quality': { ImageWidth: 4032, ImageHeight: 3024 },
      'Timeline & Date': { DateTimeOriginal: '2023:05:10 14:30:00' },
      'Geospatial': { GPSLatitude: 55.86449, GPSLongitude: -4.42989 },
      'Standards & Info': {},
      'Miscellaneous': {},
    },
    integrityAlerts: [],
  };

  it('Given geotagged asset, When formatted in plain English, Then includes File Date, readable size, GPSLatitude place name, and all 7 narratives in Web order', async () => {
    const { formatSingleOutput } = await import('../../src/cli/formatter');
    const output = formatSingleOutput(fullAsset, { format: 'plain', locale: 'en' });

    expect(output).toContain('File System (Last Modified)');
    expect(output).toContain('964.2 KB (987375 bytes)');
    expect(output).toContain('Luss, Argyll and Bute, Scotland');
    expect(output).toContain('4032 x 3024');
    expect(output).toContain('4032x3024');

    const integrityIdx = output.indexOf('[Integrity Analysis]');
    const geoIdx = output.indexOf('[Geospatial Analysis]');
    const hwIdx = output.indexOf('[Hardware Analysis]');
    const expIdx = output.indexOf('[Exposure Analysis]');
    const opticsIdx = output.indexOf('[Optics Analysis]');
    const qualityIdx = output.indexOf('[Quality Analysis]');
    const timelineIdx = output.indexOf('[Timeline Analysis]');

    expect(integrityIdx).toBeGreaterThan(-1);
    expect(geoIdx).toBeGreaterThan(integrityIdx);
    expect(hwIdx).toBeGreaterThan(geoIdx);
    expect(expIdx).toBeGreaterThan(hwIdx);
    expect(opticsIdx).toBeGreaterThan(expIdx);
    expect(qualityIdx).toBeGreaterThan(opticsIdx);
    expect(timelineIdx).toBeGreaterThan(qualityIdx);
  });

  it('Given asset without GPS, When formatted, Then still renders Geospatial Analysis narrative instead of omitting it', async () => {
    const { formatSingleOutput } = await import('../../src/cli/formatter');
    const noGpsAsset = {
      ...fullAsset,
      locationName: undefined,
      exifData: { Make: 'LGE', Model: 'Nexus 5X' },
      categorizedExif: {
        ...fullAsset.categorizedExif,
        Geospatial: {},
      },
    };

    const output = formatSingleOutput(noGpsAsset, { format: 'plain', locale: 'id' });
    expect(output).toContain('[Analisis Geospasial]');
    expect(output).toContain('Tidak ada data lokasi (GPS)');
  });

  it('Given full exifData differs from categorizedExif slice, When formatted, Then narratives use full exifData just like Web UI', async () => {
    const { formatSingleOutput } = await import('../../src/cli/formatter');
    const slicedAsset = {
      ...fullAsset,
      categorizedExif: {
        'Device Hardware': {},
        'Exposure Settings': {},
        'Optics & Lens': {},
        'Image Quality': {},
        'Timeline & Date': {},
        'Geospatial': {},
        'Standards & Info': {},
        'Miscellaneous': {},
      },
    };

    const output = formatSingleOutput(slicedAsset, { format: 'plain', locale: 'en' });
    expect(output).toContain('LGE Nexus 5X');
    expect(output).toContain('4032x3024');
  });
});

describe('BP-PARITY-003: formatSingleOutput 8-Category Raw EXIF Metadata', () => {
  const sampleAsset = {
    id: 'asset-raw-1',
    fileName: 'raw_test.jpg',
    fileSize: 2048,
    fileType: 'image/jpeg',
    fileDate: new Date('2023-05-10T14:30:00Z').getTime(),
    sha256: 'A'.repeat(64),
    sha1: 'B'.repeat(40),
    actualWidth: 1920,
    actualHeight: 1080,
    exifData: {
      Make: 'LGE',
      ExposureTime: 0.004,
      FNumber: 2,
      FocalLength: 4.67,
    },
    categorizedExif: {
      'Device Hardware': { Make: 'LGE' },
      'Exposure Settings': { ExposureTime: 0.004, FNumber: 2 },
      'Optics & Lens': { FocalLength: 4.67 },
      'Image Quality': {},
      'Timeline & Date': {},
      'Geospatial': {},
      'Standards & Info': {},
      'Miscellaneous': {},
    },
    integrityAlerts: [],
  };

  it('Given plain format, When formatted, Then prints all 8 categories with formatted tags and explicit empty-category notices', async () => {
    const { formatSingleOutput } = await import('../../src/cli/formatter');
    const output = formatSingleOutput(sampleAsset, { format: 'plain', locale: 'en' });

    expect(output).toContain('--- Categorized EXIF Metadata ---');
    expect(output).toContain('[Device Hardware]');
    expect(output).toContain('[Exposure Settings]');
    expect(output).toContain('[Optics & Lens]');
    expect(output).toContain('[Image Quality]');
    expect(output).toContain('[Timeline & Date]');
    expect(output).toContain('[Geospatial]');
    expect(output).toContain('[Standards & Info]');
    expect(output).toContain('[Miscellaneous]');

    expect(output).toContain('Exposure Time');
    expect(output).toContain('1/250');
    expect(output).toContain('f/2');
    expect(output).toContain('4.67mm');
    expect(output).toContain('No standard data tags were found in this category.');
  });

  it('Given markdown format and id locale, When formatted, Then prints localized Markdown tables and localized empty-category messages', async () => {
    const { formatSingleOutput } = await import('../../src/cli/formatter');
    const output = formatSingleOutput(sampleAsset, { format: 'markdown', locale: 'id' });

    expect(output).toContain('## Categorized EXIF Metadata');
    expect(output).toContain('### Perangkat Keras');
    expect(output).toContain('### Pengaturan Eksposur');
    expect(output).toContain('### Lain-lain');
    expect(output).toContain('| Properti | Nilai |');
    expect(output).toContain('| Exposure Time | 1/250 |');
    expect(output).toContain('Tidak ada tag data standar yang ditemukan.');
  });
});
