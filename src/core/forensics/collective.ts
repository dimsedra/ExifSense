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

  return {
    integrity: {
      cleanCount,
      partiallyStrippedCount,
      fullyStrippedCount,
      matrix,
    },
    hardware: {
      isConsistent: true,
      uniqueDevices: [],
      uniqueSerials: [],
      missingCount: 0,
      hasSerialMatch: false,
      details: [],
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
