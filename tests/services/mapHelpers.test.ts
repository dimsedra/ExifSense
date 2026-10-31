import { describe, it, expect } from 'vitest';
import {
  extractAssetCoordinates,
  calculateMapBounds,
  isValidCoordinate,
} from '../../src/services/mapHelpers';
import type { ForensicAsset } from '../../src/core/forensics/types';

function createMockAsset(id: string, name: string, lat?: number | null, lng?: number | null): ForensicAsset {
  return {
    id,
    fileName: name,
    fileSize: 1024,
    fileType: 'image/jpeg',
    fileDate: Date.now(),
    sha256: 'HASH256',
    sha1: 'HASH1',
    actualWidth: 1920,
    actualHeight: 1080,
    exifData: {
      latitude: lat,
      longitude: lng,
    },
    categorizedExif: {
      'Device Hardware': {},
      'Exposure Settings': {},
      'Optics & Lens': {},
      'Image Quality': {},
      'Timeline & Date': {},
      'Geospatial': lat != null && lng != null ? { latitude: lat, longitude: lng } : {},
      'Standards & Info': {},
      'Miscellaneous': {},
    },
    integrityAlerts: [],
  };
}

describe('mapHelpers', () => {
  describe('Normal Path', () => {
    it('extracts valid coordinates from geotagged assets in order', () => {
      const assets = [
        createMockAsset('1', 'paris.jpg', 48.8566, 2.3522),
        createMockAsset('2', 'berlin.jpg', 52.5200, 13.4050),
      ];

      const waypoints = extractAssetCoordinates(assets);
      expect(waypoints.length).toBe(2);
      expect(waypoints[0]!.lat).toBeCloseTo(48.8566);
      expect(waypoints[0]!.lng).toBeCloseTo(2.3522);
      expect(waypoints[1]!.lat).toBeCloseTo(52.5200);
      expect(waypoints[1]!.lng).toBeCloseTo(13.4050);
    });

    it('calculates geographic bounds around multiple points', () => {
      const coords = [
        { lat: 10, lng: 20 },
        { lat: -10, lng: 40 },
        { lat: 0, lng: 30 },
      ];

      const bounds = calculateMapBounds(coords);
      expect(bounds).toEqual({
        minLat: -10,
        maxLat: 10,
        minLng: 20,
        maxLng: 40,
        center: [0, 30],
      });
    });
  });

  describe('Boundary & Edge Cases', () => {
    it('handles single coordinate point bounds gracefully', () => {
      const coords = [{ lat: 37.7749, lng: -122.4194 }];
      const bounds = calculateMapBounds(coords);

      expect(bounds).toEqual({
        minLat: 37.7749,
        maxLat: 37.7749,
        minLng: -122.4194,
        maxLng: -122.4194,
        center: [37.7749, -122.4194],
      });
    });

    it('returns default bounds when coordinates array is empty', () => {
      const bounds = calculateMapBounds([]);
      expect(bounds).toBeNull();
    });

    it('validates coordinate ranges correctly', () => {
      expect(isValidCoordinate(90, 180)).toBe(true);
      expect(isValidCoordinate(-90, -180)).toBe(true);
      expect(isValidCoordinate(90.1, 0)).toBe(false);
      expect(isValidCoordinate(0, 180.1)).toBe(false);
    });
  });

  describe('Error Paths', () => {
    it('filters out assets with null, undefined, or NaN coordinates', () => {
      const assets = [
        createMockAsset('1', 'no-geo.jpg', null, null),
        createMockAsset('2', 'nan-geo.jpg', NaN, 100),
        createMockAsset('3', 'valid.jpg', 20.5, 30.5),
      ];

      const waypoints = extractAssetCoordinates(assets);
      expect(waypoints.length).toBe(1);
      expect(waypoints[0]!.fileName).toBe('valid.jpg');
    });
  });

  describe('Core Invariants', () => {
    it('preserves forensic asset id and filename association with coordinates', () => {
      const assets = [createMockAsset('id-xyz', 'crime-scene.jpg', 1.3521, 103.8198)];
      const waypoints = extractAssetCoordinates(assets);

      expect(waypoints[0]!.assetId).toBe('id-xyz');
      expect(waypoints[0]!.fileName).toBe('crime-scene.jpg');
    });
  });

  describe('Reverse Geocoding', () => {
    it('returns null when coordinates are invalid', async () => {
      const { reverseGeocode } = await import('../../src/services/mapHelpers');
      const res = await reverseGeocode(999, 999);
      expect(res).toBeNull();
    });

    it('caches successful reverse geocode results in memory', async () => {
      const { reverseGeocode, clearGeocodeCache } = await import('../../src/services/mapHelpers');
      clearGeocodeCache();

      const mockResponse = {
        display_name: 'Luss, Argyll and Bute, Scotland',
        address: { village: 'Luss', country: 'United Kingdom' },
      };

      const originalFetch = globalThis.fetch;
      let callCount = 0;
      globalThis.fetch = (async () => {
        callCount++;
        return {
          ok: true,
          json: async () => mockResponse,
        } as unknown as Response;
      }) as typeof fetch;

      try {
        const first = await reverseGeocode(56.1023, -4.6404);
        expect(first?.display_name).toBe('Luss, Argyll and Bute, Scotland');
        expect(callCount).toBe(1);

        const second = await reverseGeocode(56.1023, -4.6404);
        expect(second?.display_name).toBe('Luss, Argyll and Bute, Scotland');
        expect(callCount).toBe(1); // Served from cache
      } finally {
        globalThis.fetch = originalFetch;
        clearGeocodeCache();
      }
    });

    it('returns null and does not throw when network fetch fails', async () => {
      const { reverseGeocode, clearGeocodeCache } = await import('../../src/services/mapHelpers');
      clearGeocodeCache();

      const originalFetch = globalThis.fetch;
      globalThis.fetch = (async () => {
        throw new Error('Network error');
      }) as typeof fetch;

      try {
        const res = await reverseGeocode(56.1023, -4.6404);
        expect(res).toBeNull();
      } finally {
        globalThis.fetch = originalFetch;
        clearGeocodeCache();
      }
    });
  });

  describe('OSRM Road Routing', () => {
    it('returns null when waypoints are fewer than 2', async () => {
      const { fetchOsrmRoute } = await import('../../src/services/mapHelpers');
      const res = await fetchOsrmRoute([{ lat: 56.1, lng: -4.6 }]);
      expect(res).toBeNull();
    });

    it('fetches and caches driving geometry from OSRM', async () => {
      const { fetchOsrmRoute, clearOsrmCache } = await import('../../src/services/mapHelpers');
      clearOsrmCache();

      const mockRoute = {
        type: 'LineString',
        coordinates: [
          [-4.71829, 56.20357],
          [-4.71839, 56.20353],
        ],
      };

      const originalFetch = globalThis.fetch;
      let callCount = 0;
      globalThis.fetch = (async () => {
        callCount++;
        return {
          ok: true,
          json: async () => ({
            code: 'Ok',
            routes: [{ geometry: mockRoute }],
          }),
        } as unknown as Response;
      }) as typeof fetch;

      try {
        const points = [
          { lat: 56.20357, lng: -4.71829 },
          { lat: 56.20399, lng: -4.71717 },
        ];
        const res1 = await fetchOsrmRoute(points);
        expect(res1).toEqual(mockRoute);
        expect(callCount).toBe(1);

        const res2 = await fetchOsrmRoute(points);
        expect(res2).toEqual(mockRoute);
        expect(callCount).toBe(1); // Cached
      } finally {
        globalThis.fetch = originalFetch;
        clearOsrmCache();
      }
    });

    it('returns null gracefully on OSRM error', async () => {
      const { fetchOsrmRoute, clearOsrmCache } = await import('../../src/services/mapHelpers');
      clearOsrmCache();

      const originalFetch = globalThis.fetch;
      globalThis.fetch = (async () => {
        throw new Error('OSRM network failure');
      }) as typeof fetch;

      try {
        const res = await fetchOsrmRoute([
          { lat: 56.20357, lng: -4.71829 },
          { lat: 56.20399, lng: -4.71717 },
        ]);
        expect(res).toBeNull();
      } finally {
        globalThis.fetch = originalFetch;
        clearOsrmCache();
      }
    });
  });
});
