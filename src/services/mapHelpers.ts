import type { ForensicAsset } from '../core/forensics/types';

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

/**
 * Validates if a latitude/longitude pair falls within valid spherical coordinates.
 */
export function isValidCoordinate(lat: unknown, lng: unknown): boolean {
  if (lat == null || lng == null) return false;
  const numLat = Number(lat);
  const numLng = Number(lng);
  if (isNaN(numLat) || isNaN(numLng)) return false;
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

const geocodeCache = new Map<string, ReverseGeocodeResult | null>();

/**
 * Performs reverse geocoding via OpenStreetMap Nominatim with memory caching.
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<ReverseGeocodeResult | null> {
  if (!isValidCoordinate(lat, lng)) {
    return null;
  }

  const cacheKey = `${Number(lat).toFixed(5)},${Number(lng).toFixed(5)}`;
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey) ?? null;
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(
      lat
    )}&lon=${encodeURIComponent(lng)}&zoom=18&addressdetails=1`;
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as ReverseGeocodeResult;
    geocodeCache.set(cacheKey, data);
    return data;
  } catch (error) {
    console.error('Reverse geocoding failed:', error);
    return null;
  }
}

/**
 * Resets the in-memory geocoding cache (useful for testing).
 */
export function clearGeocodeCache(): void {
  geocodeCache.clear();
}

const osrmCache = new Map<string, GeoJSON.GeoJsonObject | null>();

/**
 * Fetches real-world road-following driving route geometry between waypoints via OSRM.
 */
export async function fetchOsrmRoute(
  waypoints: Array<{ lat: number; lng: number }>
): Promise<GeoJSON.GeoJsonObject | null> {
  if (!waypoints || waypoints.length < 2) return null;

  // OSRM public demo server limits waypoints (~100 max)
  const capped = waypoints.slice(0, 100);
  const coordsStr = capped.map((p) => `${p.lng},${p.lat}`).join(';');

  if (osrmCache.has(coordsStr)) {
    return osrmCache.get(coordsStr) ?? null;
  }

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson`;
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as {
      code: string;
      routes?: Array<{ geometry: GeoJSON.GeoJsonObject }>;
    };
    if (data.code === 'Ok' && data.routes?.[0]?.geometry) {
      const geometry = data.routes[0].geometry;
      osrmCache.set(coordsStr, geometry);
      return geometry;
    }
  } catch (error) {
    console.error('OSRM route fetch failed:', error);
  }

  return null;
}

/**
 * Resets the in-memory OSRM route cache (useful for testing).
 */
export function clearOsrmCache(): void {
  osrmCache.clear();
}


