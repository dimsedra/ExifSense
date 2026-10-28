import { describe, it, expect } from 'vitest';
import { getPresetOptions } from '../../../src/core/sanitizer/sanitizer';

describe('Sanitizer Presets (REQ-SAN-001)', () => {
  it('returns max-privacy preset stripping all metadata categories', () => {
    const options = getPresetOptions('max-privacy');
    expect(options).toEqual({
      gps: true,
      device: true,
      camera: true,
      date: true
    });
  });

  it('returns photo-share preset stripping GPS and date while keeping device and camera', () => {
    const options = getPresetOptions('photo-share');
    expect(options).toEqual({
      gps: true,
      device: false,
      camera: false,
      date: true
    });
  });

  it('returns location-only preset stripping GPS exclusively', () => {
    const options = getPresetOptions('location-only');
    expect(options).toEqual({
      gps: true,
      device: false,
      camera: false,
      date: false
    });
  });

  it('returns a fresh object preventing caller mutation of internal presets (Core Invariant)', () => {
    const options1 = getPresetOptions('max-privacy');
    options1.gps = false;
    const options2 = getPresetOptions('max-privacy');
    expect(options2.gps).toBe(true);
  });

  it('falls back safely to balanced preset when given an unknown preset name (Boundary)', () => {
    const fallback = getPresetOptions('unknown_custom_preset' as any);
    expect(fallback).toEqual({
      gps: true,
      device: true,
      camera: false,
      date: false
    });
  });
});
