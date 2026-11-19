import { describe, it, expect } from 'vitest';
import {
  generateTimelineNarrative,
  generateGeospatialNarrative
} from '../../../src/core/narratives/narratives';

describe('Timeline & Geospatial Narratives (BP-NARRATIVE-002)', () => {
  it('generates chronological timeline narrative with capture and UTC timestamps without consistency verdicts', () => {
    const props = {
      DateTimeOriginal: '2026:10:28 14:30:00',
      ModifyDate: '2026:10:28 16:00:00'
    };

    const narrative = generateTimelineNarrative(props, 'en');
    expect(narrative).toContain('Taken on:');
    expect(narrative).toContain('2026:10:28 14:30:00');
    expect(narrative).toContain('Coordinated Universal Time (GMT/UTC):');
    expect(narrative).not.toContain('natural and consistent');
    expect(narrative).not.toContain('subsequent file modification time');
    expect(narrative).not.toContain('<strong>');
  });

  it('returns fallback narrative when capture timestamp is missing', () => {
    const narrative = generateTimelineNarrative({}, 'en');
    expect(narrative).toBe('No capture date or time could be found in this file.');
  });

  it('generates factual geospatial narrative without authenticity claims', () => {
    const narrative = generateGeospatialNarrative(37.77492, -122.41941, 'San Francisco, CA', 'en');
    expect(narrative).toContain('San Francisco, CA');
    expect(narrative).toContain('37.77492, -122.41941');
    expect(narrative).not.toContain('appears natural and genuine');
    expect(narrative).not.toContain('<strong>');
  });

  it('reports missing GPS factually without guessing disabled GPS or intentional removal', () => {
    const enMissing = generateGeospatialNarrative(NaN, NaN, null, 'en');
    const idMissing = generateGeospatialNarrative(NaN, NaN, null, 'id');

    expect(enMissing).toBe('No GPS coordinates were recorded in this file.');
    expect(idMissing).toBe('Koordinat lokasi GPS tidak tercatat pada berkas ini.');
  });

  it('falls back to remote location descriptor when location name is omitted', () => {
    const narrative = generateGeospatialNarrative(0, 0, null, 'en');
    expect(narrative).toContain('an unindexed or remote location');
    expect(narrative).toContain('0.00000, 0.00000');
  });
});
