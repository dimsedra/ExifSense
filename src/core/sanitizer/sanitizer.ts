import { SanitizerOptions, SanitizerPreset } from './types';

const PRESET_DEFINITIONS: Record<SanitizerPreset, SanitizerOptions> = {
  'max-privacy': {
    gps: true,
    device: true,
    camera: true,
    date: true
  },
  'photo-share': {
    gps: true,
    device: false,
    camera: false,
    date: true
  },
  'location-only': {
    gps: true,
    device: false,
    camera: false,
    date: false
  }
};

/**
 * Returns a cloned SanitizerOptions configuration for a given preset identifier (REQ-SAN-001).
 * Clones the returned object to preserve internal immutability.
 */
export function getPresetOptions(preset: SanitizerPreset): SanitizerOptions {
  const selected = PRESET_DEFINITIONS[preset] ?? PRESET_DEFINITIONS['max-privacy'];
  return { ...selected };
}
