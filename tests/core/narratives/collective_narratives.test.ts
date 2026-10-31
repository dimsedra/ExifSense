import { describe, it, expect } from 'vitest';
import { generateCollectiveNarratives } from '../../../src/core/narratives/narratives';
import { CollectiveIntelligenceResult } from '../../../src/core/forensics/types';

describe('Multi-Asset Collective Intelligence Narratives (Scenario 3.4)', () => {
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
      totalDurationMs: 7200000, // 2 hours
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
      jumps: [],
      velocityAlert: null
    }
  };

  it('generates consistent hardware and physical serial match narrative (Normal Path)', () => {
    const sections = generateCollectiveNarratives(baseCollective, 2, 'en');

    const hwSection = sections.find((s) => s.title.toLowerCase().includes('hardware'));
    expect(hwSection).toBeDefined();
    expect(hwSection?.narrative).toContain('same camera model: Sony ILCE-7M4');
    expect(hwSection?.narrative).toContain('Physical Camera Verified: All photos in this batch were taken using the exact same physical camera unit');
    expect(hwSection?.narrative).not.toContain('<strong>');
  });

  it('generates timeline duration and trail route geospatial spread narrative', () => {
    const sections = generateCollectiveNarratives(baseCollective, 2, 'en');

    const timelineSection = sections.find((s) => s.title.toLowerCase().includes('timeline'));
    expect(timelineSection).toBeDefined();
    expect(timelineSection?.narrative).toContain('within a span of 2 hours');

    const geoSection = sections.find((s) => s.title.toLowerCase().includes('geospatial') || s.title.toLowerCase().includes('location'));
    expect(geoSection).toBeDefined();
    expect(geoSection?.narrative).toContain('traveled about 15.5 km');
  });

  it('includes velocity warning anomaly when velocity alert is triggered (Boundary & Error Path)', () => {
    const anomalousCollective: CollectiveIntelligenceResult = {
      ...baseCollective,
      geospatial: {
        ...baseCollective.geospatial,
        velocityAlert: {
          hasAnomaly: true,
          maxSpeedKmh: 1450,
          fromFileName: 'photo1.jpg',
          toFileName: 'photo2.jpg'
        }
      }
    };

    const sections = generateCollectiveNarratives(anomalousCollective, 2, 'en');
    const geoSection = sections.find((s) => s.title.toLowerCase().includes('geospatial') || s.title.toLowerCase().includes('location'));
    expect(geoSection?.narrative).toContain('Travel Alert: The distance between locations indicates a very high speed of (1450 km/h)');
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
