import type { ForensicAsset } from '../core/forensics/types';
import { extractGpsCoordinates, parseExifDate } from '../core/forensics/metadata';

export interface MapWaypoint {
  assetId: string;
  fileName: string;
  lat: number;
  lng: number;
}

export interface MapBoundsResult {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
  center: [number, number];
}

function isNumericCoordinateValue(val: unknown): boolean {
  if (val == null || typeof val === 'boolean' || Array.isArray(val)) {
    return false;
  }
  if (typeof val === 'string' && val.trim() === '') {
    return false;
  }
  return Number.isFinite(Number(val));
}

/**
 * Validates if a latitude/longitude pair falls within valid spherical coordinates.
 */
export function isValidCoordinate(lat: unknown, lng: unknown): boolean {
  if (!isNumericCoordinateValue(lat) || !isNumericCoordinateValue(lng)) {
    return false;
  }
  const numLat = Number(lat);
  const numLng = Number(lng);
  return numLat >= -90 && numLat <= 90 && numLng >= -180 && numLng <= 180;
}

/**
 * Extracts and filters valid geographic coordinates from a list of forensic assets.
 */
export function extractAssetCoordinates(assets: ForensicAsset[]): MapWaypoint[] {
  if (!assets || assets.length === 0) return [];

  const waypoints: MapWaypoint[] = [];

  for (const asset of assets) {
    const lat = asset.exifData?.latitude ?? asset.exifData?.GPSLatitude;
    const lng = asset.exifData?.longitude ?? asset.exifData?.GPSLongitude;

    if (isValidCoordinate(lat, lng)) {
      waypoints.push({
        assetId: asset.id,
        fileName: asset.fileName,
        lat: Number(lat),
        lng: Number(lng),
      });
    }
  }

  return waypoints;
}

/**
 * Extracts valid GPS waypoints sorted chronologically by EXIF capture timestamp with fileDate fallback.
 */
export function extractChronologicalWaypoints(assets: ForensicAsset[]): MapWaypoint[] {
  if (!assets || assets.length === 0) return [];

  const entries: Array<{ waypoint: MapWaypoint; time: number; index: number }> = [];

  for (let index = 0; index < assets.length; index++) {
    const asset = assets[index]!;
    const coords = extractGpsCoordinates(asset.exifData);
    if (!coords) {
      continue;
    }

    const rawDate =
      asset.exifData?.DateTimeOriginal ||
      asset.exifData?.CreateDate ||
      asset.exifData?.DateTime;
    const parsedDate = parseExifDate(rawDate);
    const time = parsedDate ? parsedDate.getTime() : asset.fileDate || 0;

    entries.push({
      waypoint: {
        assetId: asset.id,
        fileName: asset.fileName,
        lat: coords.lat,
        lng: coords.lng,
      },
      time,
      index,
    });
  }

  entries.sort((a, b) => a.time - b.time || a.index - b.index);
  return entries.map((entry) => entry.waypoint);
}

/**
 * Calculates geographic bounding box and midpoint center around waypoints.
 */
export function calculateMapBounds(
  coords: Array<{ lat: number; lng: number }>
): MapBoundsResult | null {
  if (!coords || coords.length === 0) return null;

  let minLat = coords[0]!.lat;
  let maxLat = coords[0]!.lat;
  let minLng = coords[0]!.lng;
  let maxLng = coords[0]!.lng;

  for (let i = 1; i < coords.length; i++) {
    const p = coords[i]!;
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  }

  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;

  return {
    minLat,
    maxLat,
    minLng,
    maxLng,
    center: [centerLat, centerLng],
  };
}

export interface ReverseGeocodeResult {
  place_id?: number;
  display_name: string;
  address?: Record<string, string>;
  [key: string]: unknown;
}

export interface GeocodeOptions {
  minIntervalMs?: number;
  timeoutMs?: number;
}

const geocodeCache = new Map<string, ReverseGeocodeResult | null>();
const inFlightGeocodes = new Map<string, Promise<ReverseGeocodeResult | null>>();
let lastGeocodeScheduledAt = 0;

function waitForDelay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createAbortTimeout(
  timeoutMs: number,
  controller?: AbortController
): { promise: Promise<null>; clear: () => void } {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const promise = new Promise<null>((resolve) => {
    timeoutId = setTimeout(() => {
      controller?.abort();
      resolve(null);
    }, timeoutMs);
  });
  return {
    promise,
    clear: () => {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    },
  };
}

async function performNominatimRequest(
  url: string,
  fetchInit: RequestInit
): Promise<ReverseGeocodeResult | null> {
  const response = await fetch(url, fetchInit);
  if (!response.ok) {
    return null;
  }
  return (await response.json()) as ReverseGeocodeResult;
}

async function fetchNominatimJson(url: string, timeoutMs: number): Promise<ReverseGeocodeResult | null> {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : undefined;
  const fetchInit: RequestInit = {};

  if (typeof window === 'undefined') {
    fetchInit.headers = {
      'User-Agent': 'ExifSense-CLI/1.0',
      Accept: 'application/json',
    };
  }
  if (controller) {
    fetchInit.signal = controller.signal;
  }

  const timeout = createAbortTimeout(timeoutMs, controller);

  try {
    return await Promise.race([performNominatimRequest(url, fetchInit), timeout.promise]);
  } catch (error) {
    console.error('Reverse geocoding failed:', error);
    return null;
  } finally {
    timeout.clear();
  }
}

async function executePacedGeocode(
  cacheKey: string,
  lat: number,
  lng: number,
  options?: GeocodeOptions
): Promise<ReverseGeocodeResult | null> {
  const minIntervalMs = options?.minIntervalMs ?? 1000;
  const timeoutMs = options?.timeoutMs ?? 3000;
  const now = Date.now();
  const waitMs =
    lastGeocodeScheduledAt > 0 && minIntervalMs > 0
      ? Math.max(0, lastGeocodeScheduledAt + minIntervalMs - now)
      : 0;
  lastGeocodeScheduledAt = Math.max(lastGeocodeScheduledAt, now + waitMs);

  if (waitMs > 0) {
    await waitForDelay(waitMs);
  }

  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(
    lat
  )}&lon=${encodeURIComponent(lng)}&zoom=18&addressdetails=1`;

  const data = await fetchNominatimJson(url, timeoutMs);
  if (!data) {
    return null;
  }

  geocodeCache.set(cacheKey, data);
  return data;
}

/**
 * Resolves coordinates via Nominatim with automatic rate-limit pacing,
 * request timeout protection, in-flight coalescing, and memory caching.
 */
export async function resolveLocationWithPacing(
  lat: number,
  lng: number,
  options?: GeocodeOptions
): Promise<ReverseGeocodeResult | null> {
  if (!isValidCoordinate(lat, lng)) {
    return null;
  }

  const cacheKey = `${Number(lat).toFixed(5)},${Number(lng).toFixed(5)}`;
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey) ?? null;
  }

  const pending = inFlightGeocodes.get(cacheKey);
  if (pending) {
    return pending;
  }

  const requestPromise = executePacedGeocode(cacheKey, lat, lng, options).finally(() => {
    inFlightGeocodes.delete(cacheKey);
  });
  inFlightGeocodes.set(cacheKey, requestPromise);
  return requestPromise;
}

/**
 * Performs reverse geocoding via OpenStreetMap Nominatim with memory caching.
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<ReverseGeocodeResult | null> {
  return resolveLocationWithPacing(lat, lng, { minIntervalMs: 0, timeoutMs: 3000 });
}

/**
 * Resets the in-memory geocoding cache and pacing timer (useful for testing).
 */
export function clearGeocodeCache(): void {
  geocodeCache.clear();
  inFlightGeocodes.clear();
  lastGeocodeScheduledAt = 0;
}

export interface OsrmRouteDetails {
  totalDistanceMeters: number;
  legDistancesMeters: number[];
  geometry?: GeoJSON.GeoJsonObject;
}

const osrmCache = new Map<string, GeoJSON.GeoJsonObject | null>();
const osrmDetailsCache = new Map<string, OsrmRouteDetails | null>();

export interface OsrmFetchOptions {
  timeoutMs?: number;
}

function buildOsrmCacheKey(waypoints: Array<{ lat: number; lng: number }>): string {
  // OSRM public demo server limits waypoints (~100 max)
  const capped = waypoints.slice(0, 100);
  return capped.map((p) => `${p.lng},${p.lat}`).join(';');
}

/**
 * Synchronously returns cached OSRM route details for waypoints when already fetched, or null.
 */
export function getCachedOsrmRouteDetails(
  waypoints: Array<{ lat: number; lng: number }>
): OsrmRouteDetails | null {
  if (!waypoints || waypoints.length < 2) return null;
  const coordsStr = buildOsrmCacheKey(waypoints);
  return osrmDetailsCache.get(coordsStr) ?? null;
}

/**
 * Fetches real-world road-following driving route details between waypoints via OSRM,
 * including total road distance, individual waypoint-to-waypoint leg distances, and geometry.
 */
export async function fetchOsrmRouteDetails(
  waypoints: Array<{ lat: number; lng: number }>,
  options?: OsrmFetchOptions
): Promise<OsrmRouteDetails | null> {
  if (!waypoints || waypoints.length < 2) return null;

  const coordsStr = buildOsrmCacheKey(waypoints);
  if (osrmDetailsCache.has(coordsStr)) {
    return osrmDetailsCache.get(coordsStr) ?? null;
  }

  const timeoutMs = options?.timeoutMs ?? 3000;
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : undefined;
  const timeout = createAbortTimeout(timeoutMs, controller);

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson`;
    const fetchInit: RequestInit = controller ? { signal: controller.signal } : {};
    const response = await Promise.race([fetch(url, fetchInit), timeout.promise]);
    if (!response || !response.ok) {
      return null;
    }
    const data = (await response.json()) as {
      code: string;
      routes?: Array<{
        geometry?: GeoJSON.GeoJsonObject;
        distance?: number;
        legs?: Array<{ distance?: number }>;
      }>;
    };

    if (data.code === 'Ok' && data.routes?.[0]) {
      const primaryRoute = data.routes[0];
      const totalDistanceMeters = Number(primaryRoute.distance || 0);
      const legDistancesMeters = (primaryRoute.legs || []).map((leg) => Number(leg.distance || 0));
      const result: OsrmRouteDetails = {
        totalDistanceMeters,
        legDistancesMeters,
        geometry: primaryRoute.geometry,
      };

      osrmDetailsCache.set(coordsStr, result);
      if (primaryRoute.geometry) {
        osrmCache.set(coordsStr, primaryRoute.geometry);
      }
      return result;
    }
  } catch (error) {
    console.error('OSRM route fetch failed:', error);
  } finally {
    timeout.clear();
  }

  return null;
}

/**
 * Fetches real-world road-following driving route geometry between waypoints via OSRM.
 */
export async function fetchOsrmRoute(
  waypoints: Array<{ lat: number; lng: number }>
): Promise<GeoJSON.GeoJsonObject | null> {
  const details = await fetchOsrmRouteDetails(waypoints);
  return details?.geometry ?? null;
}

/**
 * Resets the in-memory OSRM route cache (useful for testing).
 */
export function clearOsrmCache(): void {
  osrmCache.clear();
  osrmDetailsCache.clear();
}


