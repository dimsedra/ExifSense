import { describe, it, expect } from 'vitest';
import { generateCollectiveNarratives } from '../../../src/core/narratives/narratives';
import { CollectiveIntelligenceResult } from '../../../src/core/forensics/types';

describe('Multi-Asset Collective Narratives (BP-NARRATIVE-002)', () => {
  const baseCollective: CollectiveIntelligenceResult = {
    integrity: {
      cleanCount: 2,
      partiallyStrippedCount: 0,
      fullyStrippedCount: 0,
      matrix: []
    },
    hardware: {
      isConsistent: true,
      uniqueDevices: ['Sony ILCE-7M4'],
      uniqueSerials: ['1234567'],
      missingCount: 0,
      hasSerialMatch: true,
      details: []
    },
    timeline: {
      totalDurationMs: 7200000,
      startTime: new Date('2026-10-28T10:00:00Z'),
      endTime: new Date('2026-10-28T12:00:00Z'),
      missingAssets: [],
      jumps: []
    },
    geospatial: {
      totalPathDistanceKm: 15.5,
      maxSpreadKm: 15.5,
      spreadCategory: 'trail',
      missingCoordinatesCount: 0,
      jumps: []
    }
  };

  it('generates factual hardware consistency without photographer-identity assumptions', () => {
    const sections = generateCollectiveNarratives(baseCollective, 2, 'en');

    const hwSection = sections.find((s) => s.title.toLowerCase().includes('hardware'));
    expect(hwSection).toBeDefined();
    expect(hwSection?.narrative).toContain('same camera model: Sony ILCE-7M4');
    expect(hwSection?.narrative).not.toContain('same person');
    expect(hwSection?.narrative).toContain('Physical Camera Verified');
    expect(hwSection?.narrative).not.toContain('<strong>');
  });

  it('generates timeline duration and straight-line geospatial narrative without vehicle assumptions', () => {
    const sections = generateCollectiveNarratives(baseCollective, 2, 'en');

    const timelineSection = sections.find((s) => s.title.toLowerCase().includes('timeline'));
    expect(timelineSection?.narrative).toContain('2 hours');
    expect(timelineSection?.narrative).not.toContain('no chronological overlap');

    const geoSection = sections.find((s) => s.title.toLowerCase().includes('geospatial') || s.title.toLowerCase().includes('location'));
    expect(geoSection?.narrative).toContain('straight-line');
    expect(geoSection?.narrative).toContain('15.5 km');
    expect(geoSection?.narrative).not.toContain('likely using a vehicle');
    expect(geoSection?.narrative).toMatch(/15\.5 km\.$/);
  });

  it('includes OSRM road distance inside combined_geo_trail and combined_geo_localized when available', () => {
    const trailSections = generateCollectiveNarratives(baseCollective, 2, 'en', {
      roadDistanceMeters: 21400,
    });
    const trailGeo = trailSections.find((s) => s.title.toLowerCase().includes('geospatial'));
    expect(trailGeo?.narrative).toBe(
      'Cumulative straight-line displacement across chronological GPS points is approximately 15.5 km (or ~21.4 km via OSRM road route).'
    );

    const localizedCollective: CollectiveIntelligenceResult = {
      ...baseCollective,
      geospatial: {
        ...baseCollective.geospatial,
        totalPathDistanceKm: 0.45,
        maxSpreadKm: 0.45,
        spreadCategory: 'localized',
      },
    };
    const localizedId = generateCollectiveNarratives(localizedCollective, 2, 'id', {
      roadDistanceMeters: 620,
    });
    const locGeoId = localizedId.find((s) => s.title.toLowerCase().includes('geospasial'));
    expect(locGeoId?.narrative).toBe(
      'Akumulasi perpindahan garis lurus antar-titik GPS berurutan sekitar 450 m (atau ~620 m melalui rute jalan OSRM).'
    );
  });

  it('reports max spread when geotagged photos lack EXIF timestamps (totalPathDistanceKm === 0)', () => {
    const untimedGeo: CollectiveIntelligenceResult = {
      ...baseCollective,
      geospatial: {
        totalPathDistanceKm: 0,
        maxSpreadKm: 2.4,
        spreadCategory: 'trail',
        missingCoordinatesCount: 0,
        jumps: []
      }
    };

    const sections = generateCollectiveNarratives(untimedGeo, 2, 'en');
    const geoSection = sections.find((s) => s.title.toLowerCase().includes('geospatial') || s.title.toLowerCase().includes('location'));
    expect(geoSection?.narrative).toContain('2.4 km');
    expect(geoSection?.narrative).not.toContain('0 km');
  });

  it('reports mixed metadata completeness when assets have partial metadata', () => {
    const mixedCollective: CollectiveIntelligenceResult = {
      ...baseCollective,
      integrity: {
        cleanCount: 1,
        partiallyStrippedCount: 1,
        fullyStrippedCount: 1,
        matrix: []
      }
    };

    const sections = generateCollectiveNarratives(mixedCollective, 3, 'en');
    const integritySection = sections.find((s) => s.title.toLowerCase().includes('integrity'));
    expect(integritySection?.narrative).toContain('Mixed Completeness Status: Out of 3 photos');
  });
});
