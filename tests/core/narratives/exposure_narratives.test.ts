import { describe, it, expect } from 'vitest';
import {
  generateExposureNarrative,
  generateOpticsNarrative,
  generateQualityNarrative
} from '../../../src/core/narratives/narratives';

describe('Exposure, Optics & Quality Narratives (BP-NARRATIVE-002)', () => {
  it('generates exposure narrative with shallow depth of field note', () => {
    const props = {
      FNumber: 1.8,
      ExposureTime: 0.004,
      ISO: 100,
      ExposureProgram: 'Aperture priority'
    };

    const narrative = generateExposureNarrative(props, 'en');
    expect(narrative).toContain('f/1.8');
    expect(narrative).toContain('ISO 100');
    expect(narrative).toContain('Aperture priority');
    expect(narrative).toContain('bokeh effect');
    expect(narrative).not.toContain('<strong>');
  });

  it('generates low light exposure narrative when ISO >= 800', () => {
    const props = {
      FNumber: 4.0,
      ExposureTime: 0.02,
      ISO: 3200
    };

    const narrative = generateExposureNarrative(props, 'en');
    expect(narrative).toContain('ISO 3200');
    expect(narrative).toContain('dark place or indoors');
  });

  it('omits exp_standard fallback lighting assumption when settings do not match special thresholds', () => {
    const props = {
      FNumber: 4.0,
      ExposureTime: 0.01,
      ISO: 400
    };

    const narrative = generateExposureNarrative(props, 'en');
    expect(narrative).toContain('f/4');
    expect(narrative).toContain('ISO 400');
    expect(narrative).not.toContain('well-balanced lighting');
    expect(narrative).not.toContain('pencahayaan standar');
  });

  it('returns localized missing-exposure message when all exposure parameters are absent', () => {
    expect(generateExposureNarrative({}, 'en')).toContain('No camera exposure settings');
    expect(generateExposureNarrative({}, 'id')).toContain('Tidak ditemukan pengaturan eksposur kamera');
  });

  it('generates optics narrative with 35mm equivalent and digital zoom', () => {
    const props = {
      FocalLength: 35,
      FocalLengthIn35mmFormat: 52,
      DigitalZoomRatio: 2
    };

    const narrative = generateOpticsNarrative(props, 'en');
    expect(narrative).toContain('35mm');
    expect(narrative).toContain('equivalent to 52mm');
    expect(narrative).toContain('Digital zoom of 2x was used');
    expect(narrative).not.toContain('<strong>');
  });

  it('generates modular image quality narrative solely from present tags without fabricating Standard or sRGB', () => {
    const fullProps = {
      ImageWidth: 6000,
      ImageHeight: 4000,
      ColorSpace: 'sRGB',
      Contrast: 'Normal',
      Sharpness: 'Hard'
    };

    const fullNarrative = generateQualityNarrative(fullProps, 'en');
    expect(fullNarrative).toContain('6000x4000');
    expect(fullNarrative).toContain('sRGB');
    expect(fullNarrative).toContain('Hard');
    expect(fullNarrative).not.toContain('<strong>');

    const partialNarrative = generateQualityNarrative(
      { ImageWidth: 1920, ImageHeight: 1080 },
      'en'
    );
    expect(partialNarrative).toContain('1920x1080');
    expect(partialNarrative).not.toContain('Standard');
    expect(partialNarrative).not.toContain('sRGB');

    expect(generateQualityNarrative({}, 'en')).toContain('No image dimensions or color/processing quality tags');
    expect(generateQualityNarrative({}, 'id')).toContain('Tidak ditemukan tag dimensi gambar');
  });
});
