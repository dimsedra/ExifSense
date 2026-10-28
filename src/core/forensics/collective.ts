import { categorizeExif } from './metadata';
import { evaluateSingleAssetIntegrity } from './integrity';
import type {
  SingleAssetInput,
  CollectiveIntelligenceResult,
  ExifCategory,
} from './types';

const EXIF_CATEGORIES: ExifCategory[] = [
  'Device Hardware',
  'Exposure Settings',
  'Optics & Lens',
  'Image Quality',
  'Timeline & Date',
  'Geospatial',
  'Standards & Info',
  'Miscellaneous',
];

export function evaluateCollectiveIntelligence(
  assets: SingleAssetInput[],
): CollectiveIntelligenceResult {
  let cleanCount = 0;
  let partiallyStrippedCount = 0;
  let fullyStrippedCount = 0;

  const matrix = assets.map((asset) => {
    const alerts = evaluateSingleAssetIntegrity(asset);
    const isFullyStripped = alerts.some((a) => a.type === 'fully_stripped');
    const isPartiallyStripped = alerts.some((a) =>
      ['missing_gps', 'missing_datetime', 'missing_device'].includes(a.type),
    );

    if (isFullyStripped) {
      fullyStrippedCount += 1;
    } else if (isPartiallyStripped) {
      partiallyStrippedCount += 1;
    } else {
      cleanCount += 1;
    }

    const categorized = categorizeExif(asset.exifData || {});
    const presence = {} as Record<ExifCategory, boolean>;

    for (const cat of EXIF_CATEGORIES) {
      const hasProps = Object.keys(categorized[cat] || {}).length > 0;
      if (cat === 'Geospatial') {
        const hasCoords =
          asset.exifData?.latitude != null && asset.exifData?.longitude != null;
        presence[cat] = hasProps || hasCoords;
      } else {
        presence[cat] = hasProps;
      }
    }

    return {
      fileName: asset.fileName,
      presence,
    };
  });

  // Hardware Analysis
  const hardwareDetails: Array<{
    fileName: string;
    make: string;
    model: string;
    software: string;
    lensModel: string;
    bodySerial: string;
    lensSerial: string;
  }> = [];

  const rawDevices: string[] = [];
  const rawSerials: string[] = [];
  let missingHwCount = 0;

  for (const asset of assets) {
    const exif = asset.exifData || {};
    const make =
      typeof exif.Make === 'string' && exif.Make.trim() ? exif.Make.trim() : '-';
    const model =
      typeof exif.Model === 'string' && exif.Model.trim()
        ? exif.Model.trim()
        : '-';
    const software =
      typeof exif.Software === 'string' && exif.Software.trim()
        ? exif.Software.trim()
        : '-';
    const lensModel =
      typeof exif.LensModel === 'string' && exif.LensModel.trim()
        ? exif.LensModel.trim()
        : '-';

    const bodySerialVal =
      exif.BodySerialNumber ?? exif.SerialNumber ?? exif.InternalSerialNumber;
    const bodySerial =
      bodySerialVal != null && String(bodySerialVal).trim()
        ? String(bodySerialVal).trim()
        : '-';

    const lensSerialVal = exif.LensSerialNumber;
    const lensSerial =
      lensSerialVal != null && String(lensSerialVal).trim()
        ? String(lensSerialVal).trim()
        : '-';

    hardwareDetails.push({
      fileName: asset.fileName,
      make,
      model,
      software,
      lensModel,
      bodySerial,
      lensSerial,
    });

    const devStr = [make !== '-' ? make : '', model !== '-' ? model : '']
      .filter(Boolean)
      .join(' ')
      .trim();

    if (devStr) {
      rawDevices.push(devStr);
    } else {
      missingHwCount += 1;
    }

    if (bodySerial !== '-') {
      rawSerials.push(bodySerial);
    }
  }

  const uniqueDevices = Array.from(new Set(rawDevices));
  const uniqueSerials = Array.from(new Set(rawSerials));
  const isConsistent = uniqueDevices.length <= 1;
  const hasSerialMatch = uniqueSerials.length === 1 && assets.length > 1;

  return {
    integrity: {
      cleanCount,
      partiallyStrippedCount,
      fullyStrippedCount,
      matrix,
    },
    hardware: {
      isConsistent,
      uniqueDevices,
      uniqueSerials,
      missingCount: missingHwCount,
      hasSerialMatch,
      details: hardwareDetails,
    },
    timeline: {
      totalDurationMs: 0,
      startTime: null,
      endTime: null,
      missingAssets: [],
      jumps: [],
    },
    geospatial: {
      totalPathDistanceKm: 0,
      maxSpreadKm: 0,
      spreadCategory: 'none',
      missingCoordinatesCount: assets.length,
      jumps: [],
      velocityAlert: null,
    },
  };
}
