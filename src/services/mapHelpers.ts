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
