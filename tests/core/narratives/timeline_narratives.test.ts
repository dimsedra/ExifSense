import { describe, it, expect } from 'vitest';
import {
  generateTimelineNarrative,
  generateGeospatialNarrative
} from '../../../src/core/narratives/narratives';

describe('Timeline & Geospatial Narratives (Scenario 3.3)', () => {
  it('generates chronological timeline narrative with capture and UTC timestamps (Normal Path)', () => {
    const props = {
      DateTimeOriginal: '2026:10:28 14:30:00'
    };

    const narrative = generateTimelineNarrative(props, 'en');
    expect(narrative).toContain('Taken on:');
    expect(narrative).toContain('2026:10:28 14:30:00');
    expect(narrative).toContain('Coordinated Universal Time (GMT/UTC):');
    expect(narrative).toContain('timeline of photo capture appears natural and consistent');
    expect(narrative).not.toContain('<strong>');
  });

  it('detects and warns when file modification date differs from capture date (Boundary Path)', () => {
    const props = {
      DateTimeOriginal: '2026:10:28 10:00:00',
      ModifyDate: '2026:10:28 16:00:00'
    };

    const narrative = generateTimelineNarrative(props, 'en');
    expect(narrative).toContain('subsequent file modification time was detected');
    expect(narrative).not.toContain('<strong>');
  });

  it('returns fallback narrative when capture timestamp is missing', () => {
    const narrative = generateTimelineNarrative({}, 'en');
    expect(narrative).toBe('No capture date or time could be found in this file.');
  });

  it('generates geospatial narrative with coordinates and location name (Normal Path)', () => {
    const narrative = generateGeospatialNarrative(37.77492, -122.41941, 'San Francisco, CA', 'en');
    expect(narrative).toContain('San Francisco, CA');
    expect(narrative).toContain('37.77492, -122.41941');
    expect(narrative).not.toContain('<strong>');
  });

  it('falls back to remote location descriptor when location name is omitted', () => {
    const narrative = generateGeospatialNarrative(0, 0, null, 'en');
    expect(narrative).toContain('an unindexed or remote location');
    expect(narrative).toContain('0.00000, 0.00000');
  });
});
