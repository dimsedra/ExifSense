import { describe, it, expect } from 'vitest';
import {
  formatIntegrityAlertMessage,
  generateHardwareNarrative,
  generateIntegrityNarrative
} from '../../../src/core/narratives/narratives';
import { ForensicAsset } from '../../../src/core/forensics/types';

describe('Integrity & Hardware Narratives (BP-NARRATIVE-002)', () => {
  const baseAsset: ForensicAsset = {
    id: '1',
    fileName: 'scene1.jpg',
    fileSize: 1024000,
    fileType: 'image/jpeg',
    fileDate: Date.now(),
    sha256: 'AAA',
    sha1: 'BBB',
    actualWidth: 4000,
    actualHeight: 3000,
    exifData: {},
    categorizedExif: {
      'Device Hardware': {},
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

  it('generates factual hardware narrative for device and lens without speculative summary', () => {
    const hwProps = {
      Make: 'Sony',
      Model: 'A7 IV',
      LensModel: 'FE 24-70mm F2.8 GM'
    };

    const narrative = generateHardwareNarrative(hwProps, 'en');
    expect(narrative).toContain('Sony A7 IV');
    expect(narrative).toContain('with a FE 24-70mm F2.8 GM lens');
    expect(narrative).not.toContain('standard and expected camera profile');
    expect(narrative).not.toContain('<strong>');
  });

  it('records Software tag neutrally for editing tools including Paint.NET and Illustrator', () => {
    const hwProps = {
      Make: 'Canon',
      Model: 'EOS R5',
      Software: 'paint.net 5.0.11'
    };

    const narrative = generateHardwareNarrative(hwProps, 'en');
    expect(narrative).toContain('Canon EOS R5');
    expect(narrative).toContain('Software tag paint.net 5.0.11');
    expect(narrative).not.toContain('running paint.net');
    expect(narrative).not.toContain('<strong>');
  });

  it('handles missing Make/Model when Software is present without English fallback nouns', () => {
    const narrativeId = generateHardwareNarrative({ Software: 'Adobe Photoshop 2024' }, 'id');
    expect(narrativeId).toContain('Produsen dan model perangkat tidak tercatat');
    expect(narrativeId).toContain('Adobe Photoshop 2024');
    expect(narrativeId).not.toContain('unknown manufacturer');
    expect(narrativeId).not.toContain('unspecified device');
  });

  it('returns localized missing-hardware message when all hardware and software tags are absent', () => {
    const enText = generateHardwareNarrative({}, 'en');
    const idText = generateHardwareNarrative({}, 'id');

    expect(enText).toContain('No device manufacturer, model, lens, or software tags');
    expect(idText).toContain('Tidak ditemukan tag produsen, model perangkat, lensa, maupun Software');
  });

  it('generates neutral integrity_clean narrative when no alerts are present', () => {
    const narrative = generateIntegrityNarrative(baseAsset, 'en');
    expect(narrative).toContain('Core metadata categories');
    expect(narrative).not.toContain('retains its original');
    expect(narrative).not.toContain('<strong>');
  });

  it('localizes integrity alerts into Indonesian and English via formatIntegrityAlertMessage', () => {
    const assetWithAlerts: ForensicAsset = {
      ...baseAsset,
      integrityAlerts: [
        {
          type: 'missing_gps',
          severity: 'info',
          defaultMessage: 'GPS coordinates are not recorded in this file.'
        },
        {
          type: 'editing_software',
          severity: 'info',
          messageParam: { software: 'GIMP 2.10' },
          defaultMessage: 'Software tag records "GIMP 2.10".'
        }
      ]
    };

    const idNarrative = generateIntegrityNarrative(assetWithAlerts, 'id');
    expect(idNarrative).toContain('Koordinat lokasi GPS tidak tercatat pada berkas ini.');
    expect(idNarrative).toContain('Tag Software mencatat GIMP 2.10.');
    expect(formatIntegrityAlertMessage(assetWithAlerts.integrityAlerts[0]!, 'en')).toBe(
      'GPS coordinates are not recorded in this file.'
    );
  });

  it('translates hardware narratives into Indonesian when locale is set to "id"', () => {
    const hwProps = { Make: 'Sony', Model: 'A7 IV' };
    const narrative = generateHardwareNarrative(hwProps, 'id');
    expect(narrative).toContain('Foto ini mencatat perangkat Sony A7 IV');
  });

  it('safely interpolates metadata containing special replacement tokens like $& or $1', () => {
    const hwProps = { Make: 'Vendor $1', Model: 'Model $& Special' };
    const narrative = generateHardwareNarrative(hwProps, 'en');
    expect(narrative).toContain('Vendor $1 Model $& Special');
  });
});
