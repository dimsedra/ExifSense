import { describe, it, expect } from 'vitest';
import {
  parseChronologicalEvents,
  evaluateTransitPace,
  generateChronologicalBatchStory,
} from '../../../src/core/narratives/chronological';
import type { ForensicAsset } from '../../../src/core/forensics/types';

function createMockAsset(overrides: Partial<ForensicAsset> = {}): ForensicAsset {
  return {
    id: 'asset-' + Math.random().toString(36).substring(7),
    fileName: 'photo.jpg',
    fileSize: 204800,
    fileType: 'image/jpeg',
    fileDate: new Date('2026-10-28T09:00:00Z').getTime(),
    sha256: 'mock-sha256',
    sha1: 'mock-sha1',
    actualWidth: 4000,
    actualHeight: 3000,
    exifData: {},
    categorizedExif: {
      'Device Hardware': {},
      'Exposure Settings': {},
      'Optics & Lens': {},
      'Image Quality': {},
      'Timeline & Date': {},
      'Geospatial': {},
      'Standards & Info': {},
      'Miscellaneous': {},
    },
    integrityAlerts: [],
    ...overrides,
  };
}

describe('Chronological Batch Narrative Engine', () => {
  describe('BP-NARRATIVE-001: Event Parsing & Sorting', () => {
    it('sorts out-of-order assets chronologically by capture timestamp (Normal Path)', () => {
      const assetA = createMockAsset({
        fileName: 'img_later.jpg',
        exifData: {
          DateTimeOriginal: '2026:10:28 11:30:00',
          Make: 'Sony',
          Model: 'ILCE-7M4',
        },
      });
      const assetB = createMockAsset({
        fileName: 'img_earlier.jpg',
        exifData: {
          DateTimeOriginal: '2026:10:28 10:00:00',
          Make: 'Sony',
          Model: 'ILCE-7M4',
        },
      });

      const nodes = parseChronologicalEvents([assetA, assetB]);

      expect(nodes).toHaveLength(2);
      expect(nodes[0]!.fileName).toBe('img_earlier.jpg');
      expect(nodes[1]!.fileName).toBe('img_later.jpg');
      expect(nodes[0]!.hasCaptureTime).toBe(true);
      expect(nodes[0]!.deviceString).toBe('Sony ILCE-7M4');
    });

    it('falls back to fileDate when EXIF capture date is missing (Degraded Path)', () => {
      const assetNoExif = createMockAsset({
        fileName: 'no_exif_date.jpg',
        fileDate: new Date('2026-10-28 08:00:00').getTime(),
        exifData: {},
      });
      const assetWithExif = createMockAsset({
        fileName: 'has_exif_date.jpg',
        fileDate: new Date('2026-10-28 12:00:00').getTime(),
        exifData: {
          DateTimeOriginal: '2026:10:28 09:30:00',
        },
      });

      const nodes = parseChronologicalEvents([assetWithExif, assetNoExif]);

      expect(nodes[0]!.fileName).toBe('no_exif_date.jpg');
      expect(nodes[0]!.hasCaptureTime).toBe(false);
      expect(nodes[0]!.timestamp.getTime()).toBe(
        new Date('2026-10-28 08:00:00').getTime(),
      );
      expect(nodes[1]!.fileName).toBe('has_exif_date.jpg');
      expect(nodes[1]!.hasCaptureTime).toBe(true);
    });

    it('marks hasGps false when coordinates are missing or invalid (Boundary Path)', () => {
      const assetGps = createMockAsset({
        fileName: 'gps.jpg',
        exifData: {
          DateTimeOriginal: '2026:10:28 10:00:00',
          latitude: 48.8584,
          longitude: 2.2945,
        },
      });
      const assetNoGps = createMockAsset({
        fileName: 'no_gps.jpg',
        exifData: {
          DateTimeOriginal: '2026:10:28 10:05:00',
          latitude: NaN,
          longitude: null,
        },
      });

      const nodes = parseChronologicalEvents([assetGps, assetNoGps]);

      expect(nodes[0]!.hasGps).toBe(true);
      expect(nodes[0]!.latitude).toBeCloseTo(48.8584);
      expect(nodes[1]!.hasGps).toBe(false);
      expect(nodes[1]!.latitude).toBeNull();
      expect(nodes[1]!.longitude).toBeNull();
    });

    it('throws descriptive error if fewer than 2 assets are passed (Core Invariant & Error Path)', () => {
      const single = createMockAsset();

      expect(() => parseChronologicalEvents([single])).toThrow(
        'Chronological narrative requires at least 2 assets',
      );
      expect(() => parseChronologicalEvents([])).toThrow(
        'Chronological narrative requires at least 2 assets',
      );
    });
  });

  describe('BP-NARRATIVE-002: Transit Pace Heuristics', () => {
    it('classifies movement under 50m as stationary (Normal Path)', () => {
      const pace = evaluateTransitPace(30, 120);

      expect(pace.mode).toBe('stationary');
      expect(pace.descriptionKey).toBe('transit_stationary');
    });

    it('classifies movement at walking speed up to 6 km/h (Normal Path)', () => {
      // 200m in 240 seconds = 3 km/h
      const pace = evaluateTransitPace(200, 240);

      expect(pace.mode).toBe('walking');
      expect(pace.speedKmh).toBeCloseTo(3);
      expect(pace.descriptionKey).toBe('transit_walking');
    });

    it('classifies movement between 15 km/h and 150 km/h as motorized transit (Normal Path)', () => {
      // 12 km in 1800 seconds (30 mins) = 24 km/h
      const pace = evaluateTransitPace(12000, 1800);

      expect(pace.mode).toBe('motorized');
      expect(pace.speedKmh).toBeCloseTo(24);
      expect(pace.descriptionKey).toBe('transit_motorized');
    });

    it('flags instant jump anomaly when elapsed time is zero and distance exceeds 50m (Error & Boundary Path)', () => {
      const pace = evaluateTransitPace(800, 0);

      expect(pace.mode).toBe('anomaly');
      expect(pace.speedKmh).toBe(999999);
      expect(pace.descriptionKey).toBe('transit_anomaly');
    });

    it('flags high-speed air or clock discrepancy when velocity exceeds 800 km/h (Boundary Path)', () => {
      // 900 km in 3600 seconds = 900 km/h
      const pace = evaluateTransitPace(900000, 3600);

      expect(pace.mode).toBe('air_or_anomaly');
      expect(pace.descriptionKey).toBe('transit_air_or_anomaly');
    });

    it('classifies in-between speeds as transition (Normal Path)', () => {
      // 500m in 200 seconds = 9 km/h
      const pace = evaluateTransitPace(500, 200);

      expect(pace.mode).toBe('transition');
      expect(pace.descriptionKey).toBe('transit_transition');
    });
  });

  describe('BP-NARRATIVE-003: Sequential Narrative Synthesis Engine', () => {
    it('synthesizes full 3-step story with same-device baseline, motorized transit, and lens change', () => {
      // Image 1: Location A in Paris (Eiffel Tower area)
      const img1 = createMockAsset({
        fileName: 'IMG_0001.JPG',
        exifData: {
          DateTimeOriginal: '2026:10:28 10:00:00',
          Make: 'Sony',
          Model: 'ILCE-7M4',
          LensModel: 'FE 24-70mm F2.8 GM II',
          latitude: 48.8584,
          longitude: 2.2945,
        },
      });

      // Image 2: 30 minutes later, 12 km away (24 km/h motorized pace)
      // Lat 48.9663, Lon 2.2945 is ~12 km north
      const img2 = createMockAsset({
        fileName: 'IMG_0002.JPG',
        exifData: {
          DateTimeOriginal: '2026:10:28 10:30:00',
          Make: 'Sony',
          Model: 'ILCE-7M4',
          LensModel: 'FE 24-70mm F2.8 GM II',
          latitude: 48.9663,
          longitude: 2.2945,
        },
      });

      // Image 3: 5 minutes later, 30m away (<50m stationary), lens swapped
      const img3 = createMockAsset({
        fileName: 'IMG_0003.JPG',
        exifData: {
          DateTimeOriginal: '2026:10:28 10:35:00',
          Make: 'Sony',
          Model: 'ILCE-7M4',
          LensModel: 'FE 70-200mm F2.8 GM OSS II',
          latitude: 48.9665,
          longitude: 2.2945,
        },
      });

      const story = generateChronologicalBatchStory([img1, img2, img3], {
        locale: 'en',
        format: 'plain',
      });

      // 1. Verify baseline text
      expect(story.baseline).toContain(
        'All photos in this batch were captured using the same camera device: Sony ILCE-7M4.',
      );

      // 2. Verify steps count
      expect(story.steps).toHaveLength(3);

      // 3. Step 0 (initial photo)
      expect(story.steps[0]!.fileName).toBe('IMG_0001.JPG');
      expect(story.steps[0]!.narrativeText).toContain('IMG_0001.JPG');
      expect(story.steps[0]!.narrativeText).toContain('FE 24-70mm F2.8 GM II');
      expect(story.steps[0]!.narrativeText).toContain('48.85840, 2.29450');

      // 4. Step 1 (motorized transit inference with transparent speed calculation)
      expect(story.steps[1]!.fileName).toBe('IMG_0002.JPG');
      expect(story.steps[1]!.narrativeText).toContain('Wednesday, October 28, 2026');
      expect(story.steps[1]!.narrativeText).toContain('30 minutes later');
      expect(story.steps[1]!.narrativeText).toContain('at an estimated speed of ~24 km/h');
      expect(story.steps[1]!.narrativeText).toContain('typically indicates vehicular transit');
      expect(story.steps[1]!.evidence.transitMode).toBe('motorized');
      expect(story.steps[1]!.evidence.speedKmh).toBeCloseTo(24);
      expect(story.steps[1]!.evidence.speedString).toBe('~24 km/h');
      expect(story.steps[1]!.evidence.deviceChanged).toBe(false);
      expect(story.steps[1]!.evidence.lensChanged).toBe(false);

      // 5. Step 2 (optical change detection + stationary vicinity)
      expect(story.steps[2]!.fileName).toBe('IMG_0003.JPG');
      expect(story.steps[2]!.narrativeText).toContain('5 minutes later');
      expect(story.steps[2]!.narrativeText).toContain('remained in the immediate vicinity');
      expect(story.steps[2]!.narrativeText).toContain(
        'Camera lens changed from FE 24-70mm F2.8 GM II to FE 70-200mm F2.8 GM OSS II',
      );
      expect(story.steps[2]!.evidence.transitMode).toBe('stationary');
      expect(story.steps[2]!.evidence.lensChanged).toBe(true);

      // 6. Verify combined full narrative includes baseline and all steps
      expect(story.fullNarrative).toContain(story.baseline);
      expect(story.fullNarrative).toContain(story.steps[0]!.narrativeText);
      expect(story.fullNarrative).toContain(story.steps[1]!.narrativeText);
      expect(story.fullNarrative).toContain(story.steps[2]!.narrativeText);
    });

    it('reports multiple devices factually without sociological inferences', () => {
      const phonePhoto = createMockAsset({
        fileName: 'phone.jpg',
        exifData: {
          DateTimeOriginal: '2026:10:28 12:00:00',
          Make: 'Apple',
          Model: 'iPhone 13 Pro',
        },
      });
      const dslrPhoto = createMockAsset({
        fileName: 'dslr.jpg',
        exifData: {
          DateTimeOriginal: '2026:10:28 12:15:00',
          Make: 'Canon',
          Model: 'EOS R5',
        },
      });

      const story = generateChronologicalBatchStory([phonePhoto, dslrPhoto], {
        locale: 'en',
        format: 'plain',
      });

      expect(story.baseline).toContain(
        'Photos in this batch were captured across multiple devices: Apple iPhone 13 Pro, Canon EOS R5.',
      );
      expect(story.steps[1]!.narrativeText).toContain(
        'Camera device changed from Apple iPhone 13 Pro to Canon EOS R5.',
      );
      expect(story.steps[1]!.evidence.deviceChanged).toBe(true);

      // Epistemic honesty invariant: No speculative sociology
      expect(story.fullNarrative).not.toMatch(/second person/i);
      expect(story.fullNarrative).not.toMatch(/contributor/i);
      expect(story.fullNarrative).not.toMatch(/another photographer/i);
    });

    it('naturally handles missing GPS gap without breaking narrative flow', () => {
      const imgWithGps = createMockAsset({
        fileName: 'photo_with_gps.jpg',
        exifData: {
          DateTimeOriginal: '2026:10:28 14:00:00',
          latitude: 40.7128,
          longitude: -74.006,
        },
      });
      const imgNoGps = createMockAsset({
        fileName: 'photo_no_gps.jpg',
        exifData: {
          DateTimeOriginal: '2026:10:28 14:20:00',
        },
      });

      const story = generateChronologicalBatchStory([imgWithGps, imgNoGps], {
        locale: 'en',
        format: 'plain',
      });

      expect(story.steps[1]!.narrativeText).toContain('20 minutes later');
      expect(story.steps[1]!.narrativeText).toContain(
        'Location data was not recorded for this capture.',
      );
      expect(story.steps[1]!.evidence.distanceMeters).toBeUndefined();
    });

    it('formats evidence tokens with distinct HTML tags, Markdown bold, and Plain text', () => {
      const assetA = createMockAsset({
        fileName: 'picA.jpg',
        exifData: {
          DateTimeOriginal: '2026:10:28 15:00:00',
          Make: 'Fujifilm',
          Model: 'X-T5',
        },
      });
      const assetB = createMockAsset({
        fileName: 'picB.jpg',
        exifData: {
          DateTimeOriginal: '2026:10:28 15:10:00',
          Make: 'Fujifilm',
          Model: 'X-T5',
        },
      });

      const htmlStory = generateChronologicalBatchStory([assetA, assetB], {
        locale: 'en',
        format: 'html',
      });
      expect(htmlStory.baseline).toContain(
        '<span class="evidence-highlight">Fujifilm X-T5</span>',
      );
      expect(htmlStory.steps[0]!.narrativeText).toContain(
        '<span class="evidence-highlight">picA.jpg</span>',
      );

      const mdStory = generateChronologicalBatchStory([assetA, assetB], {
        locale: 'en',
        format: 'markdown',
      });
      expect(mdStory.baseline).toContain('**Fujifilm X-T5**');
      expect(mdStory.steps[0]!.narrativeText).toContain('**picA.jpg**');

      const plainStory = generateChronologicalBatchStory([assetA, assetB], {
        locale: 'en',
        format: 'plain',
      });
      expect(plainStory.baseline).not.toContain('<span');
      expect(plainStory.baseline).not.toContain('**');
      expect(plainStory.baseline).toContain('Fujifilm X-T5');
    });

    it('verifies multi-language output in Indonesian (id) and Arabic (ar)', () => {
      const assetA = createMockAsset({
        fileName: 'photo_id_a.jpg',
        exifData: {
          DateTimeOriginal: '2026:10:28 10:00:00',
          Make: 'Sony',
          Model: 'ILCE-7M4',
          LensModel: 'FE 24-70mm',
          latitude: -6.2088,
          longitude: 106.8456,
        },
      });
      const assetB = createMockAsset({
        fileName: 'photo_id_b.jpg',
        exifData: {
          DateTimeOriginal: '2026:10:28 10:30:00',
          Make: 'Sony',
          Model: 'ILCE-7M4',
          LensModel: 'FE 70-200mm',
          latitude: -6.3088,
          longitude: 106.8456, // ~11 km motorized
        },
      });

      // Indonesian
      const idStory = generateChronologicalBatchStory([assetA, assetB], {
        locale: 'id',
        format: 'plain',
      });
      expect(idStory.baseline).toContain(
        'Semua foto dalam rangkaian ini diambil menggunakan perangkat kamera yang sama: Sony ILCE-7M4.',
      );
      expect(idStory.steps[0]!.narrativeText).toContain('Urutan dimulai dengan photo_id_a.jpg');
      expect(idStory.steps[0]!.narrativeText).toContain('menggunakan lensa FE 24-70mm');
      expect(idStory.steps[1]!.narrativeText).toContain('30 menit kemudian');
      expect(idStory.steps[1]!.narrativeText).toContain('estimasi kecepatan ~22 km/jam');
      expect(idStory.steps[1]!.narrativeText).toContain('pada umumnya menunjukkan transportasi kendaraan');
      expect(idStory.steps[1]!.narrativeText).toContain('Lensa kamera berganti dari FE 24-70mm ke FE 70-200mm');

      // Arabic
      const arStory = generateChronologicalBatchStory([assetA, assetB], {
        locale: 'ar',
        format: 'plain',
      });
      expect(arStory.baseline).toContain(
        'تم التقاط جميع الصور في هذه المجموعة باستخدام نفس جهاز الكاميرا: Sony ILCE-7M4.',
      );
      expect(arStory.steps[0]!.narrativeText).toContain('يبدأ التسلسل بـ photo_id_a.jpg');
      expect(arStory.steps[0]!.narrativeText).toContain('باستخدام عدسة FE 24-70mm');
      expect(arStory.steps[1]!.narrativeText).toContain('بعد 30 دقيقة');
      expect(arStory.steps[1]!.narrativeText).toContain('بسرعة تقديرية ~22 كم/ساعة');
      expect(arStory.steps[1]!.narrativeText).toContain('تشير عموماً إلى الانتقال بالمركبة');
      expect(arStory.steps[1]!.narrativeText).toContain('تغيرت عدسة الكاميرا من FE 24-70mm إلى FE 70-200mm');
    });

    it('interpolates reverse-geocoded location name into initial step narrative when available', () => {
      const assetA = createMockAsset({
        fileName: '108.jpg',
        locationName: 'Ballyhennan Crescent, Tarbet, Scotland',
        exifData: {
          DateTimeOriginal: '2019:03:19 13:52:21',
          latitude: 56.20357,
          longitude: -4.71829,
        },
      });
      const assetB = createMockAsset({
        fileName: '109.jpg',
        exifData: {
          DateTimeOriginal: '2019:03:19 13:52:32',
          latitude: 56.20399,
          longitude: -4.71717,
        },
      });

      const enStory = generateChronologicalBatchStory([assetA, assetB], {
        locale: 'en',
        format: 'plain',
      });
      expect(enStory.steps[0]!.narrativeText).toContain('at Ballyhennan Crescent, Tarbet, Scotland (coordinates 56.20357, -4.71829)');

      const idStory = generateChronologicalBatchStory([assetA, assetB], {
        locale: 'id',
        format: 'plain',
      });
      expect(idStory.steps[0]!.narrativeText).toContain('di Ballyhennan Crescent, Tarbet, Scotland (koordinat 56.20357, -4.71829)');
    });

    it('detects and explains whether subsequent images remain at the same reverse geocoded location or moved', () => {
      const asset1 = createMockAsset({
        fileName: '200.jpg',
        locationName: 'A82, Highland, Scotland',
        exifData: {
          DateTimeOriginal: '2019:03:19 16:04:23',
          latitude: 56.63213,
          longitude: -4.78969,
        },
      });
      const asset2 = createMockAsset({
        fileName: '201.jpg',
        locationName: 'A82, Highland, Scotland', // Same reverse geocode location!
        exifData: {
          DateTimeOriginal: '2019:03:19 16:05:23',
          latitude: 56.64500,
          longitude: -4.79500,
        },
      });
      const asset3 = createMockAsset({
        fileName: '202.jpg',
        locationName: 'Glen Coe, Highland, Scotland', // Changed reverse geocode location!
        exifData: {
          DateTimeOriginal: '2019:03:19 16:08:23',
          latitude: 56.68000,
          longitude: -4.85000,
        },
      });

      const idStory = generateChronologicalBatchStory([asset1, asset2, asset3], {
        locale: 'id',
        format: 'plain',
      });

      // Step 2 should detect that reverse geocoded location remains the same
      expect(idStory.steps[1]!.narrativeText).toContain('Lokasi masih berada di area yang sama: A82, Highland, Scotland');

      // Step 3 should detect that reverse geocoded location moved to a new place
      expect(idStory.steps[2]!.narrativeText).toContain('Lokasi berpindah ke Glen Coe, Highland, Scotland');

      // Verify English equivalents
      const enStory = generateChronologicalBatchStory([asset1, asset2, asset3], {
        locale: 'en',
        format: 'plain',
      });
      expect(enStory.steps[1]!.narrativeText).toContain('Location remains in the same area: A82, Highland, Scotland');
      expect(enStory.steps[2]!.narrativeText).toContain('Location moved to Glen Coe, Highland, Scotland');
    });
  });
});
