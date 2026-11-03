import { ForensicAsset } from '../forensics/types';
import { parseExifDate, formatNaturalDate } from '../forensics/metadata';
import { calculateDistance } from '../forensics/collective';
import type {
  SupportedLocale,
  ChronologicalEventNode,
  ChronologicalStoryStep,
  ChronologicalBatchStory,
  ChronologicalStoryOptions,
} from './types';
import enLocale from '../../locales/en.json';
import idLocale from '../../locales/id.json';
import arLocale from '../../locales/ar.json';

const LOCALES: Record<SupportedLocale, Record<string, Record<string, string>>> = {
  en: enLocale as unknown as Record<string, Record<string, string>>,
  id: idLocale as unknown as Record<string, Record<string, string>>,
  ar: arLocale as unknown as Record<string, Record<string, string>>,
};

function getTemplate(
  key: string,
  locale: SupportedLocale,
  section = 'narratives',
): string {
  const dictionary = LOCALES[locale]?.[section] || LOCALES.en[section] || {};
  return dictionary[key] || LOCALES.en[section]?.[key] || key;
}

function interpolate(template: string, params: Record<string, string>): string {
  let result = template;
  for (const [k, v] of Object.entries(params)) {
    result = result.replace(new RegExp(`\\{${k}\\}`, 'g'), () => v);
  }
  return result;
}

function formatEvidence(
  value: string,
  format: 'html' | 'markdown' | 'plain',
): string {
  if (format === 'html') {
    return `<span class="evidence-highlight">${value}</span>`;
  }
  if (format === 'markdown') {
    return `**${value}**`;
  }
  return value;
}

function formatElapsedTime(
  diffSeconds: number,
  locale: SupportedLocale,
): string {
  if (diffSeconds < 60) {
    const template = getTemplate('time_seconds_later', locale);
    return interpolate(template, { seconds: String(diffSeconds) });
  }

  if (diffSeconds < 3600) {
    const mins = Math.max(1, Math.round(diffSeconds / 60));
    const template = getTemplate('time_minutes_later', locale);
    return interpolate(template, { minutes: String(mins) });
  }

  if (diffSeconds < 86400) {
    const hours = (diffSeconds / 3600).toFixed(1).replace('.0', '');
    const template = getTemplate('time_hours_later', locale);
    return interpolate(template, { hours });
  }

  const days = (diffSeconds / 86400).toFixed(1).replace('.0', '');
  const template = getTemplate('time_days_later', locale);
  return interpolate(template, { days });
}

function formatDistance(distanceMeters: number): string {
  if (distanceMeters >= 1000) {
    const km = (distanceMeters / 1000).toFixed(1).replace('.0', '');
    return `${km} km`;
  }
  return `${distanceMeters} m`;
}

function formatSpanDuration(diffSeconds: number, locale: SupportedLocale): string {
  const hours = diffSeconds / 3600;
  if (hours >= 1) {
    const formattedHours = (Math.round(hours * 10) / 10).toFixed(1).replace('.0', '');
    if (locale === 'id') {
      const idFormatted = formattedHours.replace('.', ',');
      return `${idFormatted} jam`;
    }
    if (locale === 'ar') return `${formattedHours} ساعة`;
    return `${formattedHours} hours`;
  }
  const minutes = Math.max(1, Math.round(diffSeconds / 60));
  if (locale === 'id') return `${minutes} menit`;
  if (locale === 'ar') return `${minutes} دقيقة`;
  return `${minutes} minutes`;
}

function calculateTotalPathDistance(nodes: ChronologicalEventNode[]): number {
  let totalKm = 0;
  const geoNodes = nodes.filter(
    (n) => n.hasGps && n.latitude !== null && n.longitude !== null,
  );
  if (geoNodes.length >= 2) {
    for (let i = 0; i < geoNodes.length - 1; i++) {
      totalKm += calculateDistance(
        geoNodes[i]!.latitude!,
        geoNodes[i]!.longitude!,
        geoNodes[i + 1]!.latitude!,
        geoNodes[i + 1]!.longitude!,
      );
    }
  }
  return totalKm;
}

function formatDualDistance(
  distStr: string,
  roadDistStr: string | undefined,
  locale: SupportedLocale,
): string {
  if (locale === 'id') {
    if (roadDistStr) {
      return `sekitar ${distStr} perpindahan garis lurus (atau ~${roadDistStr} melalui rute jalan)`;
    }
    return `sekitar ${distStr} perpindahan garis lurus`;
  }
  if (locale === 'ar') {
    if (roadDistStr) {
      return `حوالي ${distStr} إزاحة خط مستقيم (أو ~${roadDistStr} عبر مسار الطريق)`;
    }
    return `حوالي ${distStr} إزاحة خط مستقيم`;
  }
  if (roadDistStr) {
    return `approximately ${distStr} in straight-line displacement (or ~${roadDistStr} via road route)`;
  }
  return `approximately ${distStr} in straight-line displacement`;
}


/**
 * Parses and sorts an array of forensic assets into chronological event nodes (BP-NARRATIVE-001).
 * Fails fast if fewer than 2 assets are provided.
 */
export function parseChronologicalEvents(
  assets: ForensicAsset[],
): ChronologicalEventNode[] {
  if (!assets || assets.length < 2) {
    throw new Error('Chronological narrative requires at least 2 assets');
  }

  const nodes: ChronologicalEventNode[] = assets.map((asset, index) => {
    const exif = asset.exifData || {};
    const rawDate = exif.DateTimeOriginal || exif.CreateDate || exif.DateTime;
    const parsedDate = parseExifDate(rawDate);
    const hasCaptureTime = parsedDate !== null;
    const timestamp = parsedDate || new Date(asset.fileDate || 0);

    const latRaw = exif.latitude != null ? Number(exif.latitude) : null;
    const lngRaw = exif.longitude != null ? Number(exif.longitude) : null;
    const hasGps =
      latRaw !== null &&
      lngRaw !== null &&
      !Number.isNaN(latRaw) &&
      !Number.isNaN(lngRaw);

    const make =
      typeof exif.Make === 'string' && exif.Make.trim()
        ? exif.Make.trim()
        : '';
    const model =
      typeof exif.Model === 'string' && exif.Model.trim()
        ? exif.Model.trim()
        : '';
    const deviceString = [make, model].filter(Boolean).join(' ');

    const lensModel =
      typeof exif.LensModel === 'string' && exif.LensModel.trim()
        ? exif.LensModel.trim()
        : null;

    const focalLength =
      exif.FocalLength != null ? String(exif.FocalLength).trim() : null;

    const fNumber =
      exif.FNumber != null ? String(exif.FNumber).trim() : null;

    const iso = exif.ISO != null ? String(exif.ISO).trim() : null;

    const locationName =
      (asset.locationData?.display_name as string) ||
      asset.locationName ||
      null;

    return {
      assetIndex: index,
      fileName: asset.fileName,
      timestamp,
      hasCaptureTime,
      latitude: hasGps ? latRaw : null,
      longitude: hasGps ? lngRaw : null,
      hasGps,
      locationName,
      make,
      model,
      deviceString,
      lensModel,
      focalLength,
      fNumber,
      iso,
    };
  });

  return nodes.slice().sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}


function buildBaseline(
  nodes: ChronologicalEventNode[],
  locale: SupportedLocale,
  format: 'html' | 'markdown' | 'plain',
): string {
  const devices = Array.from(
    new Set(nodes.map((n) => n.deviceString).filter(Boolean)),
  );

  const timedNodes = nodes.filter((n) => n.hasCaptureTime);
  let timeSpanInfo: {
    spanString: string;
    startDateString: string;
    endDateString: string;
  } | null = null;

  if (timedNodes.length >= 2) {
    const firstTime = timedNodes[0]!.timestamp;
    const lastTime = timedNodes[timedNodes.length - 1]!.timestamp;
    const diffMs = lastTime.getTime() - firstTime.getTime();
    if (diffMs > 0) {
      const diffSeconds = Math.round(diffMs / 1000);
      timeSpanInfo = {
        spanString: formatSpanDuration(diffSeconds, locale),
        startDateString: formatNaturalDate(firstTime, locale),
        endDateString: formatNaturalDate(lastTime, locale),
      };
    }
  }

  const totalDistanceKm = calculateTotalPathDistance(nodes);
  const hasDistance = totalDistanceKm > 0;
  const distanceString = hasDistance
    ? formatDistance(Math.round(totalDistanceKm * 1000))
    : '';

  const deviceType =
    devices.length === 1 ? 'single' : devices.length > 1 ? 'multiple' : 'unknown';
  const hasTime = timeSpanInfo !== null;

  if (!hasTime && !hasDistance) {
    if (deviceType === 'single') {
      const formattedDevice = formatEvidence(devices[0]!, format);
      const template = getTemplate('chrono_baseline_single', locale);
      return interpolate(template, { device: formattedDevice });
    }
    if (deviceType === 'multiple') {
      const formattedList = devices
        .map((d) => formatEvidence(d, format))
        .join(', ');
      const template = getTemplate('chrono_baseline_multiple', locale);
      return interpolate(template, { devices: formattedList });
    }
    return getTemplate('chrono_baseline_unknown', locale);
  }

  let templateKey = '';
  if (hasTime && hasDistance) {
    templateKey = `chrono_macro_${deviceType}_full`;
  } else if (hasTime && !hasDistance) {
    templateKey = `chrono_macro_${deviceType}_no_geo`;
  } else {
    templateKey = `chrono_macro_${deviceType}_no_time`;
  }

  const template = getTemplate(templateKey, locale);
  const params: Record<string, string> = {};

  if (deviceType === 'single') {
    params.device = formatEvidence(devices[0]!, format);
  } else if (deviceType === 'multiple') {
    params.devices = devices
      .map((d) => formatEvidence(d, format))
      .join(', ');
  }

  if (timeSpanInfo) {
    params.span = formatEvidence(timeSpanInfo.spanString, format);
    params.startDate = formatEvidence(timeSpanInfo.startDateString, format);
    params.endDate = formatEvidence(timeSpanInfo.endDateString, format);
  }

  if (hasDistance) {
    params.distance = formatEvidence(distanceString, format);
  }

  return interpolate(template, params);
}

function buildInitialStep(
  node: ChronologicalEventNode,
  locale: SupportedLocale,
  format: 'html' | 'markdown' | 'plain',
): ChronologicalStoryStep {
  const formattedFileName = formatEvidence(node.fileName, format);
  const formattedDate = formatNaturalDate(node.timestamp, locale);
  const highlightedDate = formatEvidence(formattedDate, format);

  let lensPart = '';
  let lensString: string | undefined;

  if (node.lensModel) {
    lensString = node.lensModel;
    const highlightedLens = formatEvidence(node.lensModel, format);
    lensPart = interpolate(getTemplate('chrono_initial_lens', locale), {
      lens: highlightedLens,
    });
  } else if (node.focalLength) {
    const focalWithUnit = node.focalLength.endsWith('mm')
      ? node.focalLength
      : `${node.focalLength}mm`;
    lensString = focalWithUnit;
    const highlightedFocal = formatEvidence(focalWithUnit, format);
    lensPart = interpolate(getTemplate('chrono_initial_focal', locale), {
      focal: highlightedFocal,
    });
  }

  let narrativeText = '';

  if (node.hasGps && node.latitude !== null && node.longitude !== null) {
    const coordsStr = `${node.latitude.toFixed(5)}, ${node.longitude.toFixed(5)}`;
    const highlightedCoords = formatEvidence(coordsStr, format);

    if (node.locationName) {
      const highlightedLocation = formatEvidence(node.locationName, format);
      const template = getTemplate('chrono_initial_location', locale);
      narrativeText = interpolate(template, {
        fileName: formattedFileName,
        date: highlightedDate,
        location: highlightedLocation,
        coordinates: highlightedCoords,
        lens: lensPart,
      });
    } else {
      const template = getTemplate('chrono_initial_gps', locale);
      narrativeText = interpolate(template, {
        fileName: formattedFileName,
        date: highlightedDate,
        coordinates: highlightedCoords,
        lens: lensPart,
      });
    }
  } else {
    const template = getTemplate('chrono_initial_no_gps', locale);
    narrativeText = interpolate(template, {
      fileName: formattedFileName,
      date: highlightedDate,
      lens: lensPart,
    });
  }

  return {
    stepIndex: 0,
    assetIndex: node.assetIndex,
    fileName: node.fileName,
    narrativeText,
    evidence: {
      formattedDate,
      deviceString: node.deviceString,
      deviceChanged: false,
      lensString,
      lensChanged: false,
    },
  };
}

function buildSubsequentStep(
  curr: ChronologicalEventNode,
  prev: ChronologicalEventNode,
  stepIndex: number,
  locale: SupportedLocale,
  format: 'html' | 'markdown' | 'plain',
  roadDistMeters?: number,
): ChronologicalStoryStep {
  const diffMs = curr.timestamp.getTime() - prev.timestamp.getTime();
  const diffSeconds = Math.max(0, Math.round(diffMs / 1000));
  const rawElapsedTime = formatElapsedTime(diffSeconds, locale);
  const highlightedElapsedTime = formatEvidence(rawElapsedTime, format);
  const formattedFileName = formatEvidence(curr.fileName, format);
  const formattedPrevFileName = formatEvidence(prev.fileName, format);

  const formattedDate = formatNaturalDate(curr.timestamp, locale);
  const highlightedDate = formatEvidence(formattedDate, format);

  let distanceMeters: number | undefined;
  let distanceString: string | undefined;
  let roadDistanceMeters: number | undefined;
  let roadDistanceString: string | undefined;
  let narrativeText = '';

  const hasBothGps =
    curr.hasGps &&
    prev.hasGps &&
    curr.latitude !== null &&
    curr.longitude !== null &&
    prev.latitude !== null &&
    prev.longitude !== null;

  if (hasBothGps) {
    const distKm = calculateDistance(
      prev.latitude!,
      prev.longitude!,
      curr.latitude!,
      curr.longitude!,
    );
    distanceMeters = Math.round(distKm * 1000);
    distanceString = formatDistance(distanceMeters);

    if (roadDistMeters != null && roadDistMeters > 0) {
      roadDistanceMeters = roadDistMeters;
      roadDistanceString = formatDistance(roadDistMeters);
    }

    const dualDistanceText = formatDualDistance(
      distanceString,
      roadDistanceString,
      locale,
    );
    const highlightedDistance = formatEvidence(dualDistanceText, format);

    if (curr.locationName) {
      const highlightedLocation = formatEvidence(curr.locationName, format);
      const template = getTemplate('chrono_step_location', locale);
      narrativeText = interpolate(template, {
        fileName: formattedFileName,
        date: highlightedDate,
        elapsedTime: highlightedElapsedTime,
        distance: highlightedDistance,
        prevFileName: formattedPrevFileName,
        location: highlightedLocation,
      });
    } else {
      const coordsStr = `${curr.latitude!.toFixed(5)}, ${curr.longitude!.toFixed(5)}`;
      const highlightedCoords = formatEvidence(coordsStr, format);
      const template = getTemplate('chrono_step_gps', locale);
      narrativeText = interpolate(template, {
        fileName: formattedFileName,
        date: highlightedDate,
        elapsedTime: highlightedElapsedTime,
        distance: highlightedDistance,
        prevFileName: formattedPrevFileName,
        coordinates: highlightedCoords,
      });
    }
  } else if (curr.hasGps && curr.latitude !== null && curr.longitude !== null) {
    if (curr.locationName) {
      const highlightedLocation = formatEvidence(curr.locationName, format);
      const template = getTemplate('chrono_step_location_no_prev_gps', locale);
      narrativeText = interpolate(template, {
        fileName: formattedFileName,
        date: highlightedDate,
        elapsedTime: highlightedElapsedTime,
        location: highlightedLocation,
      });
    } else {
      const coordsStr = `${curr.latitude.toFixed(5)}, ${curr.longitude.toFixed(5)}`;
      const highlightedCoords = formatEvidence(coordsStr, format);
      const template = getTemplate('chrono_step_gps_no_prev_gps', locale);
      narrativeText = interpolate(template, {
        fileName: formattedFileName,
        date: highlightedDate,
        elapsedTime: highlightedElapsedTime,
        coordinates: highlightedCoords,
      });
    }
  } else {
    const template = getTemplate('chrono_step_no_gps', locale);
    narrativeText = interpolate(template, {
      fileName: formattedFileName,
      date: highlightedDate,
      elapsedTime: highlightedElapsedTime,
    });
  }

  // Device change detection (strictly factual without sociological inferences)
  const deviceChanged =
    Boolean(curr.deviceString) &&
    Boolean(prev.deviceString) &&
    curr.deviceString !== prev.deviceString;

  if (deviceChanged) {
    const prevDev = formatEvidence(prev.deviceString, format);
    const currDev = formatEvidence(curr.deviceString, format);
    const deviceClause = interpolate(getTemplate('chrono_device_changed', locale), {
      prevDevice: prevDev,
      currDevice: currDev,
    });
    narrativeText += deviceClause;
  }

  // Optical change detection
  let lensChanged = false;
  let lensString: string | undefined;

  if (curr.lensModel) {
    lensString = curr.lensModel;
  } else if (curr.focalLength) {
    lensString = curr.focalLength.endsWith('mm')
      ? curr.focalLength
      : `${curr.focalLength}mm`;
  }

  if (curr.lensModel && prev.lensModel && curr.lensModel !== prev.lensModel) {
    lensChanged = true;
    const prevL = formatEvidence(prev.lensModel, format);
    const currL = formatEvidence(curr.lensModel, format);
    const lensClause = interpolate(getTemplate('chrono_lens_changed', locale), {
      prevLens: prevL,
      currLens: currL,
    });
    narrativeText += lensClause;
  } else if (
    curr.focalLength &&
    prev.focalLength &&
    curr.focalLength !== prev.focalLength
  ) {
    lensChanged = true;
    const prevFWithUnit = prev.focalLength.endsWith('mm')
      ? prev.focalLength
      : `${prev.focalLength}mm`;
    const currFWithUnit = curr.focalLength.endsWith('mm')
      ? curr.focalLength
      : `${curr.focalLength}mm`;
    const prevF = formatEvidence(prevFWithUnit, format);
    const currF = formatEvidence(currFWithUnit, format);
    const focalClause = interpolate(getTemplate('chrono_focal_changed', locale), {
      prevFocal: prevF,
      currFocal: currF,
    });
    narrativeText += focalClause;
  }

  return {
    stepIndex,
    assetIndex: curr.assetIndex,
    fileName: curr.fileName,
    narrativeText,
    evidence: {
      formattedDate,
      elapsedTimeString: rawElapsedTime,
      prevFileName: prev.fileName,
      distanceMeters,
      distanceString,
      roadDistanceMeters,
      roadDistanceString,
      locationName: curr.locationName || undefined,
      deviceString: curr.deviceString,
      deviceChanged,
      lensString,
      lensChanged,
    },
  };
}

/**
 * Synthesizes a sequential, chronological batch narrative across multiple forensic assets (BP-NARRATIVE-003).
 */
export function generateChronologicalBatchStory(
  assets: ForensicAsset[],
  options?: ChronologicalStoryOptions,
): ChronologicalBatchStory {
  const locale: SupportedLocale = options?.locale || 'en';
  const format: 'html' | 'markdown' | 'plain' = options?.format || 'html';

  const nodes = parseChronologicalEvents(assets);
  const baseline = buildBaseline(nodes, locale, format);

  const steps: ChronologicalStoryStep[] = [];
  steps.push(buildInitialStep(nodes[0]!, locale, format));

  let gpsTransitionIdx = 0;
  for (let i = 1; i < nodes.length; i++) {
    let roadDistMeters: number | undefined;
    const hasBothGps =
      nodes[i]!.hasGps &&
      nodes[i - 1]!.hasGps &&
      nodes[i]!.latitude !== null &&
      nodes[i]!.longitude !== null &&
      nodes[i - 1]!.latitude !== null &&
      nodes[i - 1]!.longitude !== null;

    if (
      hasBothGps &&
      options?.roadDistances &&
      options.roadDistances.length > gpsTransitionIdx
    ) {
      roadDistMeters = options.roadDistances[gpsTransitionIdx];
      gpsTransitionIdx++;
    }

    steps.push(
      buildSubsequentStep(
        nodes[i]!,
        nodes[i - 1]!,
        i,
        locale,
        format,
        roadDistMeters,
      ),
    );
  }

  const fullNarrative = [baseline, ...steps.map((s) => s.narrativeText)].join('\n\n');

  return {
    baseline,
    steps,
    fullNarrative,
  };
}
