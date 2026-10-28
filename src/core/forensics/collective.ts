import { categorizeExif, parseExifDate } from './metadata';
import { evaluateSingleAssetIntegrity } from './integrity';
import type {
  SingleAssetInput,
  CollectiveIntelligenceResult,
  ExifCategory,
  TimelineJump,
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

  // Timeline Analysis
  const validTimeAssets: Array<{
    fileName: string;
    date: Date;
    time: number;
  }> = [];
  const missingAssets: string[] = [];

  for (const asset of assets) {
    const exif = asset.exifData || {};
    const d = parseExifDate(
      exif.DateTimeOriginal || exif.CreateDate || exif.DateTime,
    );
    if (d) {
      validTimeAssets.push({
        fileName: asset.fileName,
        date: d,
        time: d.getTime(),
      });
    } else {
      missingAssets.push(asset.fileName);
    }
  }

  validTimeAssets.sort((a, b) => a.time - b.time);

  const timelineJumps: TimelineJump[] = [];
  let startTime: Date | null = null;
  let endTime: Date | null = null;
  let totalDurationMs = 0;

  if (validTimeAssets.length > 0) {
    startTime = validTimeAssets[0].date;
    endTime = validTimeAssets[validTimeAssets.length - 1].date;
    totalDurationMs = endTime.getTime() - startTime.getTime();

    for (let i = 0; i < validTimeAssets.length - 1; i++) {
      const curr = validTimeAssets[i];
      const next = validTimeAssets[i + 1];
      const diffMs = next.time - curr.time;

      const deltaDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const deltaHours = Math.floor(
        (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
      );
      const deltaMinutes = Math.floor(
        (diffMs % (1000 * 60 * 60)) / (1000 * 60),
      );
      const deltaSeconds = Math.floor((diffMs % (1000 * 60)) / 1000);

      timelineJumps.push({
        fromFileName: curr.fileName,
        toFileName: next.fileName,
        deltaMs: diffMs,
        deltaDays,
        deltaHours,
        deltaMinutes,
        deltaSeconds,
      });
    }
  }

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
      totalDurationMs,
      startTime,
      endTime,
      missingAssets,
      jumps: timelineJumps,
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
