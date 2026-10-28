import { describe, it, expect, beforeEach } from 'vitest';
import { useI18nStore } from '../../src/store/useI18nStore';

describe('useI18nStore - Translation Formatting & Token Interpolation (Scenario 5.1, REQ-STA-006)', () => {
  beforeEach(() => {
    useI18nStore.setState({
      currentLang: 'en',
      direction: 'ltr',
      dictionary: {
        ui: {
          greeting: 'Hello {name}!',
          batch_count: 'Processed {count} of {total} files',
          simple_label: 'Start Exploring',
        },
        reports: {
          report_title: 'Forensic Report: {id}',
        },
      },
    });
  });

  it('translates simple key from default ui namespace', () => {
    expect(useI18nStore.getState().t('simple_label')).toBe('Start Exploring');
  });

  it('interpolates token parameters in translation strings', () => {
    expect(useI18nStore.getState().t('greeting', { name: 'Alice' })).toBe('Hello Alice!');
    expect(
      useI18nStore.getState().t('batch_count', { count: 3, total: 10 })
    ).toBe('Processed 3 of 10 files');
  });

  it('resolves key from explicit namespace and falls back to ui or raw key', () => {
    expect(
      useI18nStore.getState().t('report_title', { id: 'ES-123' }, 'reports')
    ).toBe('Forensic Report: ES-123');

    // Missing in custom namespace falls back to ui
    expect(useI18nStore.getState().t('simple_label', {}, 'non_existent_ns')).toBe(
      'Start Exploring'
    );

    // Completely missing key returns the raw key string
    expect(useI18nStore.getState().t('totally_unknown_key')).toBe('totally_unknown_key');
  });
});
