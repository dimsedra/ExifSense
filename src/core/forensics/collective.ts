import { categorizeExif, parseExifDate } from './metadata';
import { evaluateSingleAssetIntegrity } from './integrity';
import type {
  SingleAssetInput,
  CollectiveIntelligenceResult,
  ExifCategory,
  TimelineJump,
  GeospatialJump,
} from './types';

export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

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

  // Geospatial Analysis
  const geoAssets = assets
    .map((a) => {
      const lat =
        a.exifData?.latitude != null ? Number(a.exifData.latitude) : null;
      const lng =
        a.exifData?.longitude != null ? Number(a.exifData.longitude) : null;
      const date = parseExifDate(
        a.exifData?.DateTimeOriginal ||
          a.exifData?.CreateDate ||
          a.exifData?.DateTime,
      );
      return {
        fileName: a.fileName,
        lat,
        lng,
        date,
        time: date ? date.getTime() : null,
      };
    })
    .filter(
      (g): g is typeof g & { lat: number; lng: number } =>
        g.lat != null &&
        g.lng != null &&
        !Number.isNaN(g.lat) &&
        !Number.isNaN(g.lng),
    );

  const missingCoordinatesCount = assets.length - geoAssets.length;
  let maxSpreadKm = 0;
  let totalPathDistanceKm = 0;
  let spreadCategory: 'concentrated' | 'localized' | 'trail' | 'none' = 'none';
  const geoJumps: GeospatialJump[] = [];
  let velocityAlert: CollectiveIntelligenceResult['geospatial']['velocityAlert'] =
    null;

  if (geoAssets.length === 1) {
    spreadCategory = 'concentrated';
  } else if (geoAssets.length > 1) {
    for (let i = 0; i < geoAssets.length; i++) {
      for (let j = i + 1; j < geoAssets.length; j++) {
        const d = calculateDistance(
          geoAssets[i].lat,
          geoAssets[i].lng,
          geoAssets[j].lat,
          geoAssets[j].lng,
        );
        if (d > maxSpreadKm) {
          maxSpreadKm = d;
        }
      }
    }

    if (maxSpreadKm < 0.05) {
      spreadCategory = 'concentrated';
    } else if (maxSpreadKm < 1.0) {
      spreadCategory = 'localized';
    } else {
      spreadCategory = 'trail';
    }

    const chronoPoints = geoAssets
      .filter((g): g is typeof g & { time: number } => g.time != null)
      .sort((a, b) => a.time - b.time);

    let hasVelocityAnomaly = false;
    let maxSpeed = 0;
    let anomalyFrom: string | undefined;
    let anomalyTo: string | undefined;

    if (chronoPoints.length > 1) {
      for (let i = 0; i < chronoPoints.length - 1; i++) {
        const p1 = chronoPoints[i];
        const p2 = chronoPoints[i + 1];
        const distKm = calculateDistance(p1.lat, p1.lng, p2.lat, p2.lng);
        const distM = distKm * 1000;
        totalPathDistanceKm += distKm;

        geoJumps.push({
          fromFileName: p1.fileName,
          toFileName: p2.fileName,
          distanceKm: distKm,
          distanceMeters: distM,
        });

        const timeDiffHours = (p2.time - p1.time) / (1000 * 60 * 60);
        if (timeDiffHours > 0) {
          const speed = distKm / timeDiffHours;
          if (speed > maxSpeed) {
            maxSpeed = speed;
          }
          if (speed > 1200 && !hasVelocityAnomaly) {
            hasVelocityAnomaly = true;
            anomalyFrom = p1.fileName;
            anomalyTo = p2.fileName;
          }
        }
      }

      velocityAlert = {
        hasAnomaly: hasVelocityAnomaly,
        maxSpeedKmh: Math.round(maxSpeed),
        fromFileName: anomalyFrom,
        toFileName: anomalyTo,
      };
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
      totalPathDistanceKm,
      maxSpreadKm,
      spreadCategory,
      missingCoordinatesCount,
      jumps: geoJumps,
      velocityAlert,
    },
  };
}
