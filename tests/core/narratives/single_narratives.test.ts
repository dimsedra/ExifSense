import { describe, it, expect } from 'vitest';
import {
  generateHardwareNarrative,
  generateIntegrityNarrative
} from '../../../src/core/narratives/narratives';
import { ForensicAsset } from '../../../src/core/forensics/types';

describe('Integrity & Hardware Forensic Narratives (Scenario 3.1)', () => {
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

  it('generates standard hardware narrative for camera and lens (Normal Path)', () => {
    const hwProps = {
      Make: 'Sony',
      Model: 'A7 IV',
      LensModel: 'FE 24-70mm F2.8 GM'
    };

    const narrative = generateHardwareNarrative(hwProps, 'en');
    expect(narrative).toContain('Sony A7 IV');
    expect(narrative).toContain('with a FE 24-70mm F2.8 GM lens');
    expect(narrative).not.toContain('<strong>'); // Plain text output without HTML tags
  });

  it('detects editing software in hardware and flags modification narrative (Boundary Path)', () => {
    const hwProps = {
      Make: 'Canon',
      Model: 'EOS R5',
      Software: 'Adobe Photoshop 2024'
    };

    const narrative = generateHardwareNarrative(hwProps, 'en');
    expect(narrative).toContain('Adobe Photoshop 2024');
    expect(narrative).toContain('subsequently processed or saved via');
    expect(narrative).not.toContain('<strong>');
  });

  it('generates clean integrity narrative when no alerts are present', () => {
    const narrative = generateIntegrityNarrative(baseAsset, 'en');
    expect(narrative).toContain('This photo retains its original date and location details');
    expect(narrative).not.toContain('<strong>');
  });

  it('generates alert-based integrity narrative when tampering is detected', () => {
    const tamperedAsset: ForensicAsset = {
      ...baseAsset,
      integrityAlerts: [
        {
          type: 'dimension_mismatch',
          severity: 'warning',
          defaultMessage:
            'Dimension Mismatch: EXIF metadata reports image dimensions as 3000x2000, but actual pixel array size is 4000x3000.'
        }
      ]
    };

    const narrative = generateIntegrityNarrative(tamperedAsset, 'en');
    expect(narrative).toContain('Dimension Mismatch');
  });

  it('translates narratives into Indonesian when locale is set to "id"', () => {
    const hwProps = { Make: 'Sony', Model: 'A7 IV' };
    const narrative = generateHardwareNarrative(hwProps, 'id');
    expect(narrative).toContain('Foto ini diambil menggunakan kamera Sony A7 IV');
  });
});
