// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { useI18nStore, LANG_STORAGE_KEY } from '../../src/store/useI18nStore';

describe('useI18nStore - Translation Formatting & Token Interpolation (Scenario 5.1, REQ-STA-006)', () => {
  beforeEach(() => {
    useI18nStore.setState({
      currentLang: 'en',
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

describe('useI18nStore - Language Switching & Document Attributes (Scenario 5.2, REQ-STA-006)', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = 'en';
  });

  it('switches to Indonesian and updates document attributes and localStorage', async () => {
    await useI18nStore.getState().setLanguage('id');

    const state = useI18nStore.getState();
    expect(state.currentLang).toBe('id');
    expect(document.documentElement.lang).toBe('id');
    expect(localStorage.getItem(LANG_STORAGE_KEY)).toBe('id');
    expect(Object.keys(state.dictionary).length).toBeGreaterThan(0);
  });

  it('switches back to English and updates document attributes and localStorage', async () => {
    await useI18nStore.getState().setLanguage('id');
    await useI18nStore.getState().setLanguage('en');

    const state = useI18nStore.getState();
    expect(state.currentLang).toBe('en');
    expect(document.documentElement.lang).toBe('en');
    expect(localStorage.getItem(LANG_STORAGE_KEY)).toBe('en');
  });
});


describe('useI18nStore - Resilience & Edge Cases (Blocker 1 Fix Verification)', () => {
  beforeEach(() => {
    useI18nStore.setState({
      currentLang: 'en',
      dictionary: {
        ui: {
          test_regex_key: 'Result is {count(total)} items',
          test_dollar_value: 'File name is {fileName}',
        },
      },
    });
  });

  it('safely interpolates parameter keys containing regex special characters without syntax error', () => {
    const result = useI18nStore.getState().t('test_regex_key', { 'count(total)': 42 });
    expect(result).toBe('Result is 42 items');
  });

  it('safely interpolates parameter values containing dollar signs without token corruption', () => {
    const result = useI18nStore.getState().t('test_dollar_value', { fileName: 'photo$1_edited$2.jpg' });
    expect(result).toBe('File name is photo$1_edited$2.jpg');
  });
});
