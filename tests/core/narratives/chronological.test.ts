import { describe, it, expect } from 'vitest';
import {
  parseChronologicalEvents,
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

  describe('BP-NARRATIVE-002: Spatial-Temporal Distance Evaluation', () => {
    it('calculates physical distance and elapsed time without speculative velocity heuristics (Normal Path)', () => {
      const assetA = createMockAsset({
        fileName: 'loc_a.jpg',
        exifData: {
          DateTimeOriginal: '2026:10:28 10:00:00',
          latitude: 48.8584,
          longitude: 2.2945,
        },
      });
      const assetB = createMockAsset({
        fileName: 'loc_b.jpg',
        exifData: {
          DateTimeOriginal: '2026:10:28 10:30:00',
          latitude: 48.9663,
          longitude: 2.2945,
        },
      });

      const story = generateChronologicalBatchStory([assetA, assetB], {
        locale: 'en',
        format: 'plain',
      });

      expect(story.steps[1]!.evidence.distanceMeters).toBe(11998);
      expect(story.steps[1]!.evidence.distanceString).toBe('12 km');
      expect(story.steps[1]!.evidence.elapsedTimeString).toBe('30 minutes later');
      expect(story.steps[1]!.narrativeText).toContain(
        'approximately 12 km in straight-line displacement from loc_a.jpg at coordinates 48.96630, 2.29450.',
      );
      expect(story.steps[1]!.narrativeText).not.toMatch(/speed/i);
      expect(story.steps[1]!.narrativeText).not.toMatch(/indicates/i);
    });
  });

  describe('BP-NARRATIVE-003: Sequential Narrative Synthesis Engine', () => {
    it('synthesizes full 3-step story with same-device baseline, spatial progression, and lens change', () => {
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

      // Image 2: 30 minutes later, 12 km away
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

      // Image 3: 5 minutes later, 22m away, lens swapped
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
        'All photos in this batch were captured using the same camera device: Sony ILCE-7M4',
      );

      // 2. Verify steps count
      expect(story.steps).toHaveLength(3);

      // 3. Step 0 (initial photo)
      expect(story.steps[0]!.fileName).toBe('IMG_0001.JPG');
      expect(story.steps[0]!.narrativeText).toContain('IMG_0001.JPG');
      expect(story.steps[0]!.narrativeText).toContain('FE 24-70mm F2.8 GM II');
      expect(story.steps[0]!.narrativeText).toContain('48.85840, 2.29450');

      // 4. Step 1 (factual spatial-temporal progression without speculative speed)
      expect(story.steps[1]!.fileName).toBe('IMG_0002.JPG');
      expect(story.steps[1]!.narrativeText).toContain('Wednesday, October 28, 2026');
      expect(story.steps[1]!.narrativeText).toContain('30 minutes later');
      expect(story.steps[1]!.narrativeText).toContain(
        'approximately 12 km in straight-line displacement from IMG_0001.JPG at coordinates 48.96630, 2.29450.',
      );
      expect(story.steps[1]!.evidence.prevFileName).toBe('IMG_0001.JPG');
      expect(story.steps[1]!.evidence.distanceMeters).toBe(11998);
      expect(story.steps[1]!.evidence.deviceChanged).toBe(false);
      expect(story.steps[1]!.evidence.lensChanged).toBe(false);

      // 5. Step 2 (optical change detection + vicinity progression)
      expect(story.steps[2]!.fileName).toBe('IMG_0003.JPG');
      expect(story.steps[2]!.narrativeText).toContain('5 minutes later');
      expect(story.steps[2]!.narrativeText).toContain(
        'approximately 22 m in straight-line displacement from IMG_0002.JPG at coordinates 48.96650, 2.29450.',
      );
      expect(story.steps[2]!.evidence.prevFileName).toBe('IMG_0002.JPG');
      expect(story.steps[2]!.narrativeText).toContain(
        'Camera lens changed from FE 24-70mm F2.8 GM II to FE 70-200mm F2.8 GM OSS II',
      );
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
        'Photos in this batch were captured across multiple devices: Apple iPhone 13 Pro, Canon EOS R5',
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
        'Semua foto dalam rangkaian ini diambil menggunakan perangkat kamera yang sama: Sony ILCE-7M4',
      );
      expect(idStory.steps[0]!.narrativeText).toContain('Urutan dimulai dengan photo_id_a.jpg');
      expect(idStory.steps[0]!.narrativeText).toContain('menggunakan lensa FE 24-70mm');
      expect(idStory.steps[1]!.narrativeText).toContain('30 menit kemudian');
      expect(idStory.steps[1]!.narrativeText).toContain('11.1 km');
      expect(idStory.steps[1]!.narrativeText).toContain('photo_id_a.jpg di koordinat -6.30880, 106.84560.');
      expect(idStory.steps[1]!.narrativeText).toContain('Lensa kamera berganti dari FE 24-70mm ke FE 70-200mm');

      // Arabic
      const arStory = generateChronologicalBatchStory([assetA, assetB], {
        locale: 'ar',
        format: 'plain',
      });
      expect(arStory.baseline).toContain(
        'تم التقاط جميع الصور في هذه المجموعة باستخدام نفس جهاز الكاميرا: Sony ILCE-7M4',
      );
      expect(arStory.steps[0]!.narrativeText).toContain('يبدأ التسلسل بـ photo_id_a.jpg');
      expect(arStory.steps[0]!.narrativeText).toContain('باستخدام عدسة FE 24-70mm');
      expect(arStory.steps[1]!.narrativeText).toContain('بعد 30 دقيقة');
      expect(arStory.steps[1]!.narrativeText).toContain('11.1 km');
      expect(arStory.steps[1]!.narrativeText).toContain('photo_id_a.jpg عند الإحداثيات -6.30880, 106.84560.');
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

    it('interpolates reverse-geocoded location name into subsequent step narratives', () => {
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
        locationName: 'A82, Highland, Scotland',
        exifData: {
          DateTimeOriginal: '2019:03:19 16:05:23',
          latitude: 56.64500,
          longitude: -4.79500,
        },
      });
      const asset3 = createMockAsset({
        fileName: '202.jpg',
        locationName: 'Glen Coe, Highland, Scotland',
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

      expect(idStory.steps[1]!.narrativeText).toContain('di A82, Highland, Scotland.');
      expect(idStory.steps[2]!.narrativeText).toContain('di Glen Coe, Highland, Scotland.');

      // Verify English equivalents
      const enStory = generateChronologicalBatchStory([asset1, asset2, asset3], {
        locale: 'en',
        format: 'plain',
      });
      expect(enStory.steps[1]!.narrativeText).toContain('at A82, Highland, Scotland.');
      expect(enStory.steps[2]!.narrativeText).toContain('at Glen Coe, Highland, Scotland.');
    });
  });

  describe('BP-DUALDIST-002: Dual-Distance Narrative Formatting and Localization', () => {
    it('formats dual distance with displacement and road route when road distance is provided (en)', () => {
      const assetA = createMockAsset({
        fileName: '731.jpg',
        exifData: {
          DateTimeOriginal: '2026:10:28 10:00:00',
          latitude: 56.64500,
          longitude: -4.79500,
        },
      });
      const assetB = createMockAsset({
        fileName: '732.jpg',
        exifData: {
          DateTimeOriginal: '2026:10:28 10:35:00',
          latitude: 56.78000,
          longitude: -4.95000,
        },
      });

      const story = generateChronologicalBatchStory([assetA, assetB], {
        locale: 'en',
        format: 'plain',
        roadDistances: [21500],
      });

      expect(story.steps[1]!.evidence.distanceString).toBe('17.7 km');
      expect(story.steps[1]!.evidence.roadDistanceMeters).toBe(21500);
      expect(story.steps[1]!.evidence.roadDistanceString).toBe('21.5 km');
      expect(story.steps[1]!.narrativeText).toContain(
        'approximately 17.7 km in straight-line displacement (or ~21.5 km via road route) from 731.jpg',
      );
    });

    it('falls back to displacement only when road distance is not provided (en)', () => {
      const assetA = createMockAsset({
        fileName: '731.jpg',
        exifData: {
          DateTimeOriginal: '2026:10:28 10:00:00',
          latitude: 56.64500,
          longitude: -4.79500,
        },
      });
      const assetB = createMockAsset({
        fileName: '732.jpg',
        exifData: {
          DateTimeOriginal: '2026:10:28 10:35:00',
          latitude: 56.78000,
          longitude: -4.95000,
        },
      });

      const story = generateChronologicalBatchStory([assetA, assetB], {
        locale: 'en',
        format: 'plain',
      });

      expect(story.steps[1]!.evidence.roadDistanceMeters).toBeUndefined();
      expect(story.steps[1]!.narrativeText).toContain(
        'approximately 17.7 km in straight-line displacement from 731.jpg',
      );
      expect(story.steps[1]!.narrativeText).not.toContain('via road route');
    });

    it('formats dual distance and displacement fallback in Indonesian (id)', () => {
      const assetA = createMockAsset({
        fileName: '731.jpg',
        exifData: {
          DateTimeOriginal: '2026:10:28 10:00:00',
          latitude: 56.64500,
          longitude: -4.79500,
        },
      });
      const assetB = createMockAsset({
        fileName: '732.jpg',
        exifData: {
          DateTimeOriginal: '2026:10:28 10:35:00',
          latitude: 56.78000,
          longitude: -4.95000,
        },
      });

      const storyWithRoad = generateChronologicalBatchStory([assetA, assetB], {
        locale: 'id',
        format: 'plain',
        roadDistances: [21500],
      });
      expect(storyWithRoad.steps[1]!.narrativeText).toContain(
        'sekitar 17.7 km perpindahan garis lurus (atau ~21.5 km melalui rute jalan) dari 731.jpg',
      );

      const storyWithoutRoad = generateChronologicalBatchStory([assetA, assetB], {
        locale: 'id',
        format: 'plain',
      });
      expect(storyWithoutRoad.steps[1]!.narrativeText).toContain(
        'sekitar 17.7 km perpindahan garis lurus dari 731.jpg',
      );
    });

    it('formats dual distance and displacement fallback in Arabic (ar)', () => {
      const assetA = createMockAsset({
        fileName: '731.jpg',
        exifData: {
          DateTimeOriginal: '2026:10:28 10:00:00',
          latitude: 56.64500,
          longitude: -4.79500,
        },
      });
      const assetB = createMockAsset({
        fileName: '732.jpg',
        exifData: {
          DateTimeOriginal: '2026:10:28 10:35:00',
          latitude: 56.78000,
          longitude: -4.95000,
        },
      });

      const storyWithRoad = generateChronologicalBatchStory([assetA, assetB], {
        locale: 'ar',
        format: 'plain',
        roadDistances: [21500],
      });
      expect(storyWithRoad.steps[1]!.narrativeText).toContain(
        'حوالي 17.7 km إزاحة خط مستقيم (أو ~21.5 km عبر مسار الطريق) من 731.jpg',
      );

      const storyWithoutRoad = generateChronologicalBatchStory([assetA, assetB], {
        locale: 'ar',
        format: 'plain',
      });
      expect(storyWithoutRoad.steps[1]!.narrativeText).toContain(
        'حوالي 17.7 km إزاحة خط مستقيم من 731.jpg',
      );
    });

    it('formats macro baseline dual distance with displacement and road route when totalRoadDistance is provided (en)', () => {
      const assetA = createMockAsset({
        fileName: '731.jpg',
        exifData: {
          DateTimeOriginal: '2026:10:28 10:00:00',
          latitude: 56.64500,
          longitude: -4.79500,
        },
      });
      const assetB = createMockAsset({
        fileName: '732.jpg',
        exifData: {
          DateTimeOriginal: '2026:10:28 10:35:00',
          latitude: 56.78000,
          longitude: -4.95000,
        },
      });

      const story = generateChronologicalBatchStory([assetA, assetB], {
        locale: 'en',
        format: 'plain',
        totalRoadDistance: 21500,
      });

      expect(story.baseline).toContain(
        'covering approximately 17.7 km in cumulative straight-line displacement (or ~21.5 km via road route).',
      );
    });

    it('falls back to displacement only in macro baseline when totalRoadDistance is absent (en)', () => {
      const assetA = createMockAsset({
        fileName: '731.jpg',
        exifData: {
          DateTimeOriginal: '2026:10:28 10:00:00',
          latitude: 56.64500,
          longitude: -4.79500,
        },
      });
      const assetB = createMockAsset({
        fileName: '732.jpg',
        exifData: {
          DateTimeOriginal: '2026:10:28 10:35:00',
          latitude: 56.78000,
          longitude: -4.95000,
        },
      });

      const story = generateChronologicalBatchStory([assetA, assetB], {
        locale: 'en',
        format: 'plain',
      });

      expect(story.baseline).toContain(
        'covering approximately 17.7 km in cumulative straight-line displacement.',
      );
      expect(story.baseline).not.toContain('via road route');
    });

    it('formats macro baseline dual distance and fallback in Indonesian (id)', () => {
      const assetA = createMockAsset({
        fileName: '731.jpg',
        exifData: {
          DateTimeOriginal: '2026:10:28 10:00:00',
          latitude: 56.64500,
          longitude: -4.79500,
        },
      });
      const assetB = createMockAsset({
        fileName: '732.jpg',
        exifData: {
          DateTimeOriginal: '2026:10:28 10:35:00',
          latitude: 56.78000,
          longitude: -4.95000,
        },
      });

      const storyWithRoad = generateChronologicalBatchStory([assetA, assetB], {
        locale: 'id',
        format: 'plain',
        totalRoadDistance: 21500,
      });
      expect(storyWithRoad.baseline).toContain(
        'mencakup perpindahan garis lurus kumulatif sekitar 17.7 km (atau ~21.5 km melalui rute jalan).',
      );

      const storyWithoutRoad = generateChronologicalBatchStory([assetA, assetB], {
        locale: 'id',
        format: 'plain',
      });
      expect(storyWithoutRoad.baseline).toContain(
        'mencakup perpindahan garis lurus kumulatif sekitar 17.7 km.',
      );
    });

    it('formats macro baseline dual distance and fallback in Arabic (ar)', () => {
      const assetA = createMockAsset({
        fileName: '731.jpg',
        exifData: {
          DateTimeOriginal: '2026:10:28 10:00:00',
          latitude: 56.64500,
          longitude: -4.79500,
        },
      });
      const assetB = createMockAsset({
        fileName: '732.jpg',
        exifData: {
          DateTimeOriginal: '2026:10:28 10:35:00',
          latitude: 56.78000,
          longitude: -4.95000,
        },
      });

      const storyWithRoad = generateChronologicalBatchStory([assetA, assetB], {
        locale: 'ar',
        format: 'plain',
        totalRoadDistance: 21500,
      });
      expect(storyWithRoad.baseline).toContain(
        'مغطية إزاحة خط مستقيم تراكمية بحوالي 17.7 km (أو ~21.5 km عبر مسار الطريق).',
      );

      const storyWithoutRoad = generateChronologicalBatchStory([assetA, assetB], {
        locale: 'ar',
        format: 'plain',
      });
      expect(storyWithoutRoad.baseline).toContain(
        'مغطية إزاحة خط مستقيم تراكمية بحوالي 17.7 km.',
      );
    });
  });

  describe('BP-SYNTHESIS-001: Unified Macro Baseline Synthesis', () => {
    it('synthesizes single device, localized time span with natural dates, and total distance in one flowing sentence', () => {
      const assetA = createMockAsset({
        fileName: '731.jpg',
        exifData: {
          Make: 'LGE',
          Model: 'Nexus 5X',
          DateTimeOriginal: '2019:03:19 18:01:04',
          latitude: 57.15961,
          longitude: -4.56474,
        },
      });
      const assetB = createMockAsset({
        fileName: '735.jpg',
        exifData: {
          Make: 'LGE',
          Model: 'Nexus 5X',
          DateTimeOriginal: '2019:03:20 11:38:31',
          latitude: 57.14829,
          longitude: -2.08942,
        },
      });

      const story = generateChronologicalBatchStory([assetA, assetB], {
        locale: 'en',
        format: 'plain',
      });

      expect(story.baseline).toContain(
        'All photos in this batch were captured using the same camera device: LGE Nexus 5X',
      );
      expect(story.baseline).toContain('across a span of 17.6 hours');
      expect(story.baseline).toContain('Tuesday, March 19, 2019 at 18:01:04');
      expect(story.baseline).toContain('Wednesday, March 20, 2019 at 11:38:31');
      expect(story.baseline).toContain('covering approximately 149.3 km in cumulative straight-line displacement.');
    });

    it('synthesizes multiple devices with time span and distance in one sentence', () => {
      const assetA = createMockAsset({
        fileName: 'phone.jpg',
        exifData: {
          Make: 'Apple',
          Model: 'iPhone 13 Pro',
          DateTimeOriginal: '2019:03:19 18:01:04',
          latitude: 57.15961,
          longitude: -4.56474,
        },
      });
      const assetB = createMockAsset({
        fileName: 'dslr.jpg',
        exifData: {
          Make: 'Canon',
          Model: 'EOS R5',
          DateTimeOriginal: '2019:03:20 11:38:31',
          latitude: 57.14829,
          longitude: -2.08942,
        },
      });

      const story = generateChronologicalBatchStory([assetA, assetB], {
        locale: 'en',
        format: 'plain',
      });

      expect(story.baseline).toContain(
        'Photos in this batch were captured across multiple devices: Apple iPhone 13 Pro, Canon EOS R5',
      );
      expect(story.baseline).toContain('across a span of 17.6 hours');
      expect(story.baseline).toContain('Tuesday, March 19, 2019 at 18:01:04');
      expect(story.baseline).toContain('Wednesday, March 20, 2019 at 11:38:31');
      expect(story.baseline).toContain('covering approximately 149.3 km in cumulative straight-line displacement.');
    });

    it('omits distance gracefully when assets lack GPS coordinates', () => {
      const assetA = createMockAsset({
        fileName: 'a.jpg',
        exifData: {
          Make: 'Sony',
          Model: 'A7IV',
          DateTimeOriginal: '2026:10:28 10:00:00',
        },
      });
      const assetB = createMockAsset({
        fileName: 'b.jpg',
        exifData: {
          Make: 'Sony',
          Model: 'A7IV',
          DateTimeOriginal: '2026:10:28 12:00:00',
        },
      });

      const story = generateChronologicalBatchStory([assetA, assetB], {
        locale: 'en',
        format: 'plain',
      });

      expect(story.baseline).toContain(
        'All photos in this batch were captured using the same camera device: Sony A7IV',
      );
      expect(story.baseline).toContain('across a span of 2 hours');
      expect(story.baseline).not.toContain('straight-line displacement');
    });

    it('omits time span gracefully when assets lack capture timestamps', () => {
      const assetA = createMockAsset({
        fileName: 'a.jpg',
        exifData: {
          Make: 'Sony',
          Model: 'A7IV',
          latitude: 48.8584,
          longitude: 2.2945,
        },
      });
      const assetB = createMockAsset({
        fileName: 'b.jpg',
        exifData: {
          Make: 'Sony',
          Model: 'A7IV',
          latitude: 48.9663,
          longitude: 2.2945,
        },
      });

      const story = generateChronologicalBatchStory([assetA, assetB], {
        locale: 'en',
        format: 'plain',
      });

      expect(story.baseline).toContain(
        'All photos in this batch were captured using the same camera device: Sony A7IV',
      );
      expect(story.baseline).toContain('covering approximately 12 km in cumulative straight-line displacement.');
      expect(story.baseline).not.toContain('across a span');
    });

    it('localizes unified macro baseline into Indonesian (id) and Arabic (ar)', () => {
      const assetA = createMockAsset({
        fileName: '731.jpg',
        exifData: {
          Make: 'LGE',
          Model: 'Nexus 5X',
          DateTimeOriginal: '2019:03:19 18:01:04',
          latitude: 57.15961,
          longitude: -4.56474,
        },
      });
      const assetB = createMockAsset({
        fileName: '735.jpg',
        exifData: {
          Make: 'LGE',
          Model: 'Nexus 5X',
          DateTimeOriginal: '2019:03:20 11:38:31',
          latitude: 57.14829,
          longitude: -2.08942,
        },
      });

      const storyId = generateChronologicalBatchStory([assetA, assetB], {
        locale: 'id',
        format: 'plain',
      });
      expect(storyId.baseline).toContain(
        'Semua foto dalam rangkaian ini diambil menggunakan perangkat kamera yang sama: LGE Nexus 5X',
      );
      expect(storyId.baseline).toContain('dalam rentang waktu 17,6 jam');
      expect(storyId.baseline).toContain('Selasa, 19 Maret 2019');
      expect(storyId.baseline).toContain('Rabu, 20 Maret 2019');
      expect(storyId.baseline).toContain('mencakup perpindahan garis lurus kumulatif sekitar 149.3 km.');

      const storyAr = generateChronologicalBatchStory([assetA, assetB], {
        locale: 'ar',
        format: 'plain',
      });
      expect(storyAr.baseline).toContain(
        'تم التقاط جميع الصور في هذه المجموعة باستخدام نفس جهاز الكاميرا: LGE Nexus 5X',
      );
      expect(storyAr.baseline).toContain('خلال فترة زمنية مدتها 17.6 ساعة');
      expect(storyAr.baseline).toContain('مغطية إزاحة خط مستقيم تراكمية بحوالي 149.3 km.');
    });
  });
});
