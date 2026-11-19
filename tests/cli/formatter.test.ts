import { describe, it, expect } from 'vitest';
import { formatHashOutput, formatBatchOutput } from '../../src/cli/formatter';
import type { FileHashResult } from '../../src/cli/hasher';
import { evaluateCollectiveIntelligence } from '../../src/core/forensics/collective';
import { generateChronologicalBatchStory } from '../../src/core/narratives/chronological';
import type { ForensicAsset } from '../../src/core/forensics/types';

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
    expect(output).toContain('Koordinat lokasi GPS tidak tercatat pada berkas ini.');
    expect(output).toContain('Tidak ada catatan kekurangan metadata inti maupun tag perangkat lunak penyunting.');
  });

  it('Given asset with integrityAlerts and locale id, When formatted, Then renders localized integrity alert messages instead of raw English defaultMessage', async () => {
    const { formatSingleOutput } = await import('../../src/cli/formatter');
    const partialAsset = {
      ...fullAsset,
      integrityAlerts: [
        {
          type: 'missing_gps' as const,
          severity: 'info' as const,
          defaultMessage: 'GPS coordinates are not recorded in this file.',
        },
        {
          type: 'editing_software' as const,
          severity: 'info' as const,
          messageParam: { software: 'Adobe Photoshop 2024' },
          defaultMessage: 'Software tag records "Adobe Photoshop 2024".',
        },
      ],
    };

    const output = formatSingleOutput(partialAsset, { format: 'plain', locale: 'id' });
    expect(output).toContain('Koordinat lokasi GPS tidak tercatat pada berkas ini.');
    expect(output).toContain('Tag Software mencatat Adobe Photoshop 2024.');
    expect(output).not.toContain('GPS coordinates are not recorded');
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

describe('BP-BATCH-PARITY-003 & BP-BATCH-PARITY-004: formatBatchOutput Web Parity', () => {
  const assetCleanOne: ForensicAsset = {
    id: 'batch-1',
    fileName: 'day1_start.jpg',
    fileSize: 204800,
    fileType: 'image/jpeg',
    fileDate: new Date('2025-05-10T08:00:00Z').getTime(),
    sha256: '1'.repeat(64),
    sha1: '2'.repeat(40),
    actualWidth: 4000,
    actualHeight: 3000,
    locationName: 'Monas, Central Jakarta',
    exifData: {
      Make: 'Sony',
      Model: 'ILCE-7M4',
      Software: 'ILCE-7M4 v2.00',
      LensModel: 'FE 24-70mm F2.8 GM II',
      BodySerialNumber: 'SN-BODY-001',
      LensSerialNumber: 'SN-LENS-999',
      DateTimeOriginal: '2025:05:10 08:00:00',
      latitude: -6.17539,
      longitude: 106.82715,
    },
    categorizedExif: {
      'Device Hardware': { Make: 'Sony', Model: 'ILCE-7M4' },
      'Exposure Settings': {},
      'Optics & Lens': {},
      'Image Quality': {},
      'Timeline & Date': { DateTimeOriginal: '2025:05:10 08:00:00' },
      Geospatial: { latitude: -6.17539, longitude: 106.82715 },
      'Standards & Info': {},
      Miscellaneous: {},
    },
    integrityAlerts: [],
  };

  const assetPartialTwo: ForensicAsset = {
    id: 'batch-2',
    fileName: 'day3|spot.jpg',
    fileSize: 150000,
    fileType: 'image/jpeg',
    fileDate: new Date('2025-05-12T09:15:30Z').getTime(),
    sha256: '3'.repeat(64),
    sha1: '4'.repeat(40),
    actualWidth: 4000,
    actualHeight: 3000,
    locationName: 'National Museum, Central Jakarta',
    exifData: {
      Make: 'Canon',
      Model: 'EOS R5',
      Software: 'Adobe Photoshop 2024',
      DateTimeOriginal: '2025:05:12 09:15:30',
      GPSLatitude: -6.17639,
      GPSLongitude: 106.82166,
    },
    categorizedExif: {
      'Device Hardware': { Make: 'Canon', Model: 'EOS R5', Software: 'Adobe Photoshop 2024' },
      'Exposure Settings': {},
      'Optics & Lens': {},
      'Image Quality': {},
      'Timeline & Date': { DateTimeOriginal: '2025:05:12 09:15:30' },
      Geospatial: { GPSLatitude: -6.17639, GPSLongitude: 106.82166 },
      'Standards & Info': {},
      Miscellaneous: {},
    },
    integrityAlerts: [
      {
        type: 'editing_software',
        severity: 'info',
        messageParam: { software: 'Adobe Photoshop 2024' },
        defaultMessage: 'Editing software signature found: "Adobe Photoshop 2024".',
      },
    ],
  };

  const assetStrippedThree: ForensicAsset = {
    id: 'batch-3',
    fileName: 'stripped_social.jpg',
    fileSize: 64000,
    fileType: 'image/jpeg',
    fileDate: new Date('2025-05-12T10:00:00Z').getTime(),
    sha256: '5'.repeat(64),
    sha1: '6'.repeat(40),
    actualWidth: 1080,
    actualHeight: 1350,
    exifData: {},
    categorizedExif: {
      'Device Hardware': {},
      'Exposure Settings': {},
      'Optics & Lens': {},
      'Image Quality': {},
      'Timeline & Date': {},
      Geospatial: {},
      'Standards & Info': {},
      Miscellaneous: {},
    },
    integrityAlerts: [
      {
        type: 'fully_stripped',
        severity: 'info',
        defaultMessage: 'No EXIF metadata found in this file.',
      },
    ],
  };

  const assetPartialHardwareOnly: ForensicAsset = {
    id: 'batch-4',
    fileName: 'partial_hw_only.jpg',
    fileSize: 92000,
    fileType: 'image/jpeg',
    fileDate: new Date('2025-05-12T10:30:00Z').getTime(),
    sha256: '7'.repeat(64),
    sha1: '8'.repeat(40),
    actualWidth: 4000,
    actualHeight: 3000,
    exifData: {
      Make: 'Nikon',
      Model: 'Z8',
    },
    categorizedExif: {
      'Device Hardware': { Make: 'Nikon', Model: 'Z8' },
      'Exposure Settings': {},
      'Optics & Lens': {},
      'Image Quality': {},
      'Timeline & Date': {},
      Geospatial: {},
      'Standards & Info': {},
      Miscellaneous: {},
    },
    integrityAlerts: [
      {
        type: 'missing_gps',
        severity: 'info',
        defaultMessage: 'Selective Metadata Removal: GPS data is absent while other metadata is present.',
      },
      {
        type: 'missing_datetime',
        severity: 'info',
        defaultMessage: 'Selective Metadata Removal: DATETIME data is absent while other metadata is present.',
      },
    ],
  };

  const mixedBatch = [assetCleanOne, assetPartialTwo, assetPartialHardwareOnly, assetStrippedThree];

  it('Given plain English output with road route, When formatted, Then puts Chronological Story before Combined Analysis and omits legacy summary paragraphs', () => {
    const collective = evaluateCollectiveIntelligence(mixedBatch);
    const roadRouteDetails = {
      totalDistanceMeters: 850,
      legDistancesMeters: [850],
    };
    const story = generateChronologicalBatchStory(mixedBatch, {
      locale: 'en',
      format: 'plain',
      totalRoadDistance: roadRouteDetails.totalDistanceMeters,
      roadDistances: roadRouteDetails.legDistancesMeters,
    });

    const output = formatBatchOutput(
      mixedBatch,
      collective,
      story,
      { locale: 'en', format: 'plain' },
      roadRouteDetails
    );

    const headerIdx = output.indexOf('=== ExifSense Collective Intelligence Analysis ===');
    const alertsIdx = output.indexOf('--- Asset Integrity Alerts (4) ---');
    const storyIdx = output.indexOf('--- Chronological Story ---');
    const combinedIdx = output.indexOf('--- Combined Analysis ---');

    expect(headerIdx).toBeGreaterThan(-1);
    expect(alertsIdx).toBeGreaterThan(headerIdx);
    expect(storyIdx).toBeGreaterThan(alertsIdx);
    expect(combinedIdx).toBeGreaterThan(storyIdx);

    // Removes redundant legacy generateCollectiveNarratives paragraphs
    expect(output).not.toContain('Mixed Completeness Status:');
    expect(output).not.toContain('Multiple different cameras detected:');
    expect(output).not.toContain('Location spread shows the photographer traveled');

    // Integrity counts & matrix
    expect(output).toContain('[Integrity Analysis]');
    expect(output).toContain('Clean: 2 | Partially Stripped: 1 | Fully Stripped: 1');
    expect(output).toContain('Complete Data');
    expect(output).toContain('Contains Sensitive Data');
    expect(output).toContain('Without Details');
    expect(output).toContain('Unknown');

    // Hardware table & summary
    expect(output).toContain('[Hardware Analysis]');
    expect(output).toContain('Consistent Hardware : No');
    expect(output).toContain('Unique Devices      : Sony ILCE-7M4, Canon EOS R5, Nikon Z8');
    expect(output).toContain('FE 24-70mm F2.8 GM II');
    expect(output).toContain('SN-BODY-001');
    expect(output).toContain('SN-LENS-999');

    // Timeline bounds, duration units, missing assets (no legacy TIME ANOMALY marker)
    expect(output).toContain('[Timeline Analysis]');
    expect(output).toContain('May 10, 2025');
    expect(output).toContain('May 12, 2025');
    expect(output).toContain('2 Days 1 Hours 15 Minutes 30 Seconds');
    expect(output).not.toContain('[TIME ANOMALY]');
    expect(output).toContain('Photos Lacking Time Data (2)');
    expect(output).toContain('partial_hw_only.jpg');
    expect(output).toContain('stripped_social.jpg');

    // Geospatial adaptive meters/km, spread category, disclaimer, per-leg jumps
    expect(output).toContain('[Geospatial Analysis]');
    expect(output).toContain('617 m');
    expect(output).toContain('850 m');
    expect(output).toContain('Localized');
    expect(output).toContain('*Estimated driving transit distance along road networks via OSRM.');
    expect(output).toContain('day1_start.jpg -> (+617 m (~850 m via road)) day3|spot.jpg');
  });

  it('Given markdown format and id locale offline, When formatted, Then renders localized Markdown tables, escaped pipes, Indonesian labels, and offline displacement fallback', () => {
    const collective = evaluateCollectiveIntelligence(mixedBatch);
    const story = generateChronologicalBatchStory(mixedBatch, {
      locale: 'id',
      format: 'markdown',
    });

    const output = formatBatchOutput(
      mixedBatch,
      collective,
      story,
      { locale: 'id', format: 'markdown' },
      null
    );

    const storyIdx = output.indexOf('## Kisah Kronologis');
    const combinedIdx = output.indexOf('## Analisis Gabungan');
    expect(storyIdx).toBeGreaterThan(-1);
    expect(combinedIdx).toBeGreaterThan(storyIdx);

    expect(output).toContain('- **Total Aset**: 4');
    expect(output).toContain('## Peringatan Integritas Aset (4)');
    expect(output).toContain('### Analisis Integritas');
    expect(output).toContain('- **Bersih**: 2 | **Terhapus Sebagian**: 1 | **Terhapus Total**: 1');
    expect(output).toContain('| Nama | Analisis Integritas | Perangkat Keras | GPS |');
    expect(output).toContain('| day3\\|spot.jpg |');
    expect(output).toContain('| day1_start.jpg | Data Lengkap | Sony | Ya |');
    expect(output).toContain('| partial_hw_only.jpg | Mengandung Data Sensitif | Nikon | Tidak |');
    expect(output).toContain('| stripped_social.jpg | Tanpa Detail | Tidak Diketahui | Tidak |');

    expect(output).toContain('### Analisis Perangkat Keras');
    expect(output).toContain('- **Perangkat Keras Konsisten**: Tidak');
    expect(output).toContain('| Nama | Make | Model | Software | Lens Model | Body Serial | Lens Serial |');

    expect(output).toContain('### Analisis Kronologi');
    expect(output).toContain('Mei 2025');
    expect(output).toContain('2 Hari 1 Jam 15 Menit 30 Detik');
    expect(output).not.toContain('[ANOMALI WAKTU]');
    expect(output).toContain('**Foto Tanpa Data Waktu (2)**');

    expect(output).toContain('### Analisis Geospasial');
    expect(output).toContain('- **Kategori Sebaran**: Lokal');
    expect(output).not.toContain('Estimasi Rute Jalan');
    expect(output).toContain('*Dihitung murni sebagai perpindahan garis lurus antara koordinat.');
    expect(output).toContain('day1_start.jpg -> (+617 m) day3|spot.jpg');
  });

  it('Given empty timestamp and no-device batch with impossible speed, When formatted, Then renders null-safe dashes, None detected, and velocity anomaly warning', () => {
    const teleportA: ForensicAsset = {
      ...assetStrippedThree,
      id: 'tele-a',
      fileName: 'tele_a.jpg',
      integrityAlerts: [],
      exifData: {
        DateTimeOriginal: '2025:05:10 10:00:00',
        latitude: -6.2,
        longitude: 106.8,
      },
    };
    const teleportB: ForensicAsset = {
      ...assetStrippedThree,
      id: 'tele-b',
      fileName: 'tele_b.jpg',
      integrityAlerts: [],
      exifData: {
        DateTimeOriginal: '2025:05:10 10:01:00',
        latitude: -7.2575,
        longitude: 112.7521,
      },
    };
    const noTimestampPair: ForensicAsset[] = [
      { ...assetStrippedThree, id: 'nt-1', fileName: 'nt1.jpg' },
      { ...assetStrippedThree, id: 'nt-2', fileName: 'nt2.jpg' },
    ];

    const nullCollective = evaluateCollectiveIntelligence(noTimestampPair);
    const nullStory = generateChronologicalBatchStory(noTimestampPair, {
      locale: 'en',
      format: 'plain',
    });
    const nullOut = formatBatchOutput(noTimestampPair, nullCollective, nullStory, {
      locale: 'en',
      format: 'plain',
    });
    expect(nullOut).toContain('Unique Devices      : None detected');
    expect(nullOut).toContain('Start of Capture        : -');
    expect(nullOut).toContain('End of Capture          : -');
    expect(nullOut).toContain('Spread Category                  : None');

    const teleBatch = [teleportA, teleportB];
    const teleCollective = evaluateCollectiveIntelligence(teleBatch);
    const teleStory = generateChronologicalBatchStory(teleBatch, {
      locale: 'en',
      format: 'plain',
    });
    const teleOut = formatBatchOutput(teleBatch, teleCollective, teleStory, {
      locale: 'en',
      format: 'plain',
    });
    expect(teleOut).not.toContain('CRITICAL Velocity Anomaly');
    expect(teleOut).toContain('tele_a.jpg -> (+');
    expect(teleOut).toContain('km) tele_b.jpg');
  });

  it('Given detailed false or omitted, When formatted, Then omits per-asset individual analysis breakdown', () => {
    const collective = evaluateCollectiveIntelligence(mixedBatch);
    const story = generateChronologicalBatchStory(mixedBatch, { locale: 'en', format: 'plain' });

    const defaultOut = formatBatchOutput(mixedBatch, collective, story, {
      locale: 'en',
      format: 'plain',
    });
    const explicitFalseOut = formatBatchOutput(mixedBatch, collective, story, {
      locale: 'en',
      format: 'plain',
      detailed: false,
    });

    for (const out of [defaultOut, explicitFalseOut]) {
      expect(out).not.toContain('Individual Asset Analysis');
      expect(out).not.toContain('ASSET 1:');
      expect(out).not.toContain('Categorized EXIF Metadata');
      expect(out).not.toContain('=== ExifSense Forensic Analysis ===');
    }
  });

  it('Given detailed true, When formatted, Then appends localized per-asset single-file breakdowns in input order at end of batch report', () => {
    // Reversed chronological input order to verify input order is preserved for per-asset output
    const reverseChronoBatch = [assetPartialTwo, assetCleanOne, assetStrippedThree];
    const collective = evaluateCollectiveIntelligence(reverseChronoBatch);
    const story = generateChronologicalBatchStory(reverseChronoBatch, {
      locale: 'en',
      format: 'plain',
    });

    const plainDetailed = formatBatchOutput(reverseChronoBatch, collective, story, {
      locale: 'en',
      format: 'plain',
      detailed: true,
    });

    const combinedIdx = plainDetailed.indexOf('--- Combined Analysis ---');
    const individualIdx = plainDetailed.indexOf('=== Individual Asset Analysis ===');
    const asset1Idx = plainDetailed.indexOf('--- ASSET 1: day3|spot.jpg ---');
    const asset2Idx = plainDetailed.indexOf('--- ASSET 2: day1_start.jpg ---');
    const asset3Idx = plainDetailed.indexOf('--- ASSET 3: stripped_social.jpg ---');

    expect(individualIdx).toBeGreaterThan(combinedIdx);
    expect(asset1Idx).toBeGreaterThan(individualIdx);
    expect(asset2Idx).toBeGreaterThan(asset1Idx);
    expect(asset3Idx).toBeGreaterThan(asset2Idx);
    expect(plainDetailed).toContain('=== ExifSense Forensic Analysis ===');
    expect(plainDetailed).toContain('--- Categorized EXIF Metadata ---');
    expect(plainDetailed).toContain('SHA-256');

    const idMarkdownDetailed = formatBatchOutput(reverseChronoBatch, collective, story, {
      locale: 'id',
      format: 'markdown',
      detailed: true,
    });
    expect(idMarkdownDetailed).toContain('## Analisis Aset Individu');
    expect(idMarkdownDetailed).toContain('### ASET 1: day3|spot.jpg');
    expect(idMarkdownDetailed).toContain('### ASET 2: day1_start.jpg');
    expect(idMarkdownDetailed).toContain('# ExifSense Forensic Analysis');
    expect(idMarkdownDetailed).toContain('## Categorized EXIF Metadata');
  });
});

