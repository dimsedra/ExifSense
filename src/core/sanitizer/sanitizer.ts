import {
  SanitizerOptions,
  SanitizerPreset,
  PrivacyRiskItem,
  PrivacyScoreResult
} from './types';

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

/**
 * Evaluates active EXIF metadata against target sanitization toggle options (REQ-SAN-002).
 * Returns individual risk items per category and an overall privacy score status.
 */
export function evaluatePrivacyRisk(
  exifData: Record<string, unknown>,
  options: SanitizerOptions
): PrivacyScoreResult {
  const hasGps = exifData.latitude !== undefined && exifData.longitude !== undefined;
  const hasDevice = Boolean(exifData.Make || exifData.Model);
  const hasCamera = Boolean(
    exifData.ApertureValue !== undefined ||
      exifData.FNumber !== undefined ||
      exifData.ISO !== undefined ||
      exifData.ExposureTime !== undefined ||
      exifData.FocalLength !== undefined ||
      exifData.LensModel
  );
  const hasDate = Boolean(
    exifData.DateTimeOriginal || exifData.DateTimeDigitized || exifData.DateTime
  );

  const items: PrivacyRiskItem[] = [
    {
      category: 'gps',
      hasData: hasGps,
      isRemoving: options.gps,
      isAtRisk: hasGps && !options.gps
    },
    {
      category: 'date',
      hasData: hasDate,
      isRemoving: options.date,
      isAtRisk: hasDate && !options.date
    },
    {
      category: 'device',
      hasData: hasDevice,
      isRemoving: options.device,
      isAtRisk: hasDevice && !options.device
    },
    {
      category: 'camera',
      hasData: hasCamera,
      isRemoving: options.camera,
      isAtRisk: hasCamera && !options.camera
    }
  ];

  const isSafe = !items.some((item) => item.isAtRisk);

  return {
    isSafe,
    scoreStatus: isSafe ? 'safe' : 'risk',
    items
  };
}
