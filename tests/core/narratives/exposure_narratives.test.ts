import { describe, it, expect } from 'vitest';
import {
  generateExposureNarrative,
  generateOpticsNarrative,
  generateQualityNarrative
} from '../../../src/core/narratives/narratives';

describe('Exposure, Optics & Quality Narratives (Scenario 3.2)', () => {
  it('generates exposure narrative with shallow depth of field lighting note (Normal Path)', () => {
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
    expect(narrative).toContain('bokeh effect'); // exp_shallow_depth
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
    expect(narrative).toContain('dark place or indoors'); // exp_low_light
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

  it('generates image quality narrative with resolution and color space (Boundary & Limits)', () => {
    const props = {
      ImageWidth: 6000,
      ImageHeight: 4000,
      ColorSpace: 'sRGB',
      Contrast: 'Normal',
      Sharpness: 'Hard'
    };

    const narrative = generateQualityNarrative(props, 'en');
    expect(narrative).toContain('6000x4000');
    expect(narrative).toContain('sRGB');
    expect(narrative).toContain('Hard');
    expect(narrative).not.toContain('<strong>');
  });
});
