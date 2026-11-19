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

    it('validates coordinate ranges and rejects non-numeric coercions correctly', () => {
      expect(isValidCoordinate(90, 180)).toBe(true);
      expect(isValidCoordinate(-90, -180)).toBe(true);
      expect(isValidCoordinate(90.1, 0)).toBe(false);
      expect(isValidCoordinate(0, 180.1)).toBe(false);
      expect(isValidCoordinate('', '')).toBe(false);
      expect(isValidCoordinate('   ', '   ')).toBe(false);
      expect(isValidCoordinate(false, false)).toBe(false);
      expect(isValidCoordinate([], [])).toBe(false);
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

    it('paces consecutive uncached lookups while serving first call and cache hits immediately', async () => {
      const { resolveLocationWithPacing, clearGeocodeCache } = await import('../../src/services/mapHelpers');
      clearGeocodeCache();

      const originalFetch = globalThis.fetch;
      const callTimestamps: number[] = [];
      let capturedHeaders: Record<string, string> | undefined;

      globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
        callTimestamps.push(Date.now());
        capturedHeaders = init?.headers as Record<string, string> | undefined;
        return {
          ok: true,
          json: async () => ({
            display_name: `Place ${callTimestamps.length}`,
            address: {},
          }),
        } as unknown as Response;
      }) as typeof fetch;

      try {
        const first = await resolveLocationWithPacing(55.86449, -4.42989, { minIntervalMs: 80 });
        expect(first?.display_name).toBe('Place 1');
        expect(capturedHeaders?.['User-Agent']).toContain('ExifSense');

        const cached = await resolveLocationWithPacing(55.86449, -4.42989, { minIntervalMs: 80 });
        expect(cached?.display_name).toBe('Place 1');
        expect(callTimestamps.length).toBe(1);

        const second = await resolveLocationWithPacing(55.86183, -4.41538, { minIntervalMs: 80 });
        expect(second?.display_name).toBe('Place 2');
        expect(callTimestamps.length).toBe(2);
        expect(callTimestamps[1]! - callTimestamps[0]!).toBeGreaterThanOrEqual(70);
      } finally {
        globalThis.fetch = originalFetch;
        clearGeocodeCache();
      }
    });

    it('returns null gracefully when Nominatim request exceeds timeoutMs', async () => {
      const { resolveLocationWithPacing, clearGeocodeCache } = await import('../../src/services/mapHelpers');
      clearGeocodeCache();

      const originalFetch = globalThis.fetch;
      globalThis.fetch = (() => new Promise(() => {})) as unknown as typeof fetch;

      try {
        const res = await resolveLocationWithPacing(55.86449, -4.42989, {
          minIntervalMs: 0,
          timeoutMs: 30,
        });
        expect(res).toBeNull();
      } finally {
        globalThis.fetch = originalFetch;
        clearGeocodeCache();
      }
    });

    it('coalesces concurrent uncached lookups for identical coordinates into a single fetch', async () => {
      const { resolveLocationWithPacing, clearGeocodeCache } = await import('../../src/services/mapHelpers');
      clearGeocodeCache();

      const originalFetch = globalThis.fetch;
      let fetchCalls = 0;

      globalThis.fetch = (async () => {
        fetchCalls++;
        await new Promise((r) => setTimeout(r, 20));
        return {
          ok: true,
          json: async () => ({
            display_name: 'Coalesced Place',
            address: {},
          }),
        } as unknown as Response;
      }) as typeof fetch;

      try {
        const [a, b] = await Promise.all([
          resolveLocationWithPacing(55.86449, -4.42989, { minIntervalMs: 0 }),
          resolveLocationWithPacing(55.86449, -4.42989, { minIntervalMs: 0 }),
        ]);
        expect(fetchCalls).toBe(1);
        expect(a?.display_name).toBe('Coalesced Place');
        expect(b?.display_name).toBe('Coalesced Place');
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

    it('fetches route details with total distance and individual leg distances', async () => {
      const { fetchOsrmRouteDetails, clearOsrmCache } = await import('../../src/services/mapHelpers');
      clearOsrmCache();

      const mockRoute = {
        type: 'LineString',
        coordinates: [
          [-4.71, 56.20],
          [-4.72, 56.21],
          [-4.73, 56.22],
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
            routes: [
              {
                geometry: mockRoute,
                distance: 21500,
                legs: [
                  { distance: 9500 },
                  { distance: 12000 },
                ],
              },
            ],
          }),
        } as unknown as Response;
      }) as typeof fetch;

      try {
        const points = [
          { lat: 56.20, lng: -4.71 },
          { lat: 56.21, lng: -4.72 },
          { lat: 56.22, lng: -4.73 },
        ];

        const details = await fetchOsrmRouteDetails(points);
        expect(details).not.toBeNull();
        expect(details?.totalDistanceMeters).toBe(21500);
        expect(details?.legDistancesMeters).toEqual([9500, 12000]);
        expect(details?.geometry).toEqual(mockRoute);
        expect(callCount).toBe(1);

        // Verify cache hit
        const detailsCached = await fetchOsrmRouteDetails(points);
        expect(detailsCached).toEqual(details);
        expect(callCount).toBe(1);
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

    it('extracts chronological waypoints sorted by EXIF capture timestamp with fileDate fallback', async () => {
      const { extractChronologicalWaypoints } = await import('../../src/services/mapHelpers');

      const later = createMockAsset('2', 'second.jpg', 56.21, -4.72);
      later.fileDate = 2000;
      later.exifData.DateTimeOriginal = '2026:10:28 12:00:00';

      const earlier = createMockAsset('1', 'first.jpg', 56.20, -4.71);
      earlier.fileDate = 9000;
      earlier.exifData.DateTimeOriginal = '2026:10:28 10:00:00';

      const noGeo = createMockAsset('3', 'nogeo.jpg', null, null);
      noGeo.exifData.DateTimeOriginal = '2026:10:28 09:00:00';

      const waypoints = extractChronologicalWaypoints([later, noGeo, earlier]);
      expect(waypoints.map((w) => w.fileName)).toEqual(['first.jpg', 'second.jpg']);
    });

    it('reads cached OSRM route synchronously via getCachedOsrmRouteDetails and aborts on timeout', async () => {
      const {
        fetchOsrmRouteDetails,
        getCachedOsrmRouteDetails,
        clearOsrmCache,
      } = await import('../../src/services/mapHelpers');
      clearOsrmCache();

      const points = [
        { lat: 56.20, lng: -4.71 },
        { lat: 56.21, lng: -4.72 },
      ];

      expect(getCachedOsrmRouteDetails(points)).toBeNull();

      const originalFetch = globalThis.fetch;
      globalThis.fetch = ((_url: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new Error('Aborted'));
          });
        })) as typeof fetch;

      try {
        const timedOut = await fetchOsrmRouteDetails(points, { timeoutMs: 25 });
        expect(timedOut).toBeNull();
        expect(getCachedOsrmRouteDetails(points)).toBeNull();

        globalThis.fetch = (async () =>
          ({
            ok: true,
            json: async () => ({
              code: 'Ok',
              routes: [{ distance: 1850, legs: [{ distance: 1850 }] }],
            }),
          }) as unknown as Response) as typeof fetch;

        const fetched = await fetchOsrmRouteDetails(points, { timeoutMs: 1000 });
        expect(fetched?.totalDistanceMeters).toBe(1850);
        expect(getCachedOsrmRouteDetails(points)?.totalDistanceMeters).toBe(1850);
      } finally {
        globalThis.fetch = originalFetch;
        clearOsrmCache();
      }
    });
  });
});
