import { describe, it, expect, beforeEach } from 'vitest';
import { useSanitizerStore } from '../../src/store/useSanitizerStore';
import type { BatchSanitizerEntry } from '../../src/core/sanitizer/types';

describe('useSanitizerStore - Session Lifecycle', () => {
  beforeEach(() => {
    useSanitizerStore.getState().close();
  });

  it('initializes with inactive state and default max-privacy options', () => {
    const state = useSanitizerStore.getState();
    expect(state.isActive).toBe(false);
    expect(state.isBatch).toBe(false);
    expect(state.activeFile).toBeNull();
    expect(state.activeExif).toBeNull();
    expect(state.batchEntries).toEqual([]);
    expect(state.batchActiveIndex).toBe(0);
    expect(state.overrides).toEqual({});
    expect(state.isProcessing).toBe(false);
    expect(state.globalOptions).toEqual({
      gps: true,
      device: true,
      camera: true,
      date: true,
    });
  });

  it('opens single file mode with activeFile and activeExif', () => {
    const file = new File(['dummy'], 'sample.jpg', { type: 'image/jpeg' });
    const exif = { Make: 'Canon', Model: 'EOS R5' };

    useSanitizerStore.getState().openSingle(file, exif);
    const state = useSanitizerStore.getState();
    expect(state.isActive).toBe(true);
    expect(state.isBatch).toBe(false);
    expect(state.activeFile).toBe(file);
    expect(state.activeExif).toEqual(exif);
    expect(state.batchEntries).toEqual([]);
  });

  it('opens batch mode and handles batch index navigation', () => {
    const file1 = new File(['1'], 'batch1.jpg', { type: 'image/jpeg' });
    const file2 = new File(['2'], 'batch2.jpg', { type: 'image/jpeg' });

    const entries: BatchSanitizerEntry[] = [
      { id: 'b-1', file: file1, fileName: 'batch1.jpg', exifData: { Make: 'Sony' } },
      { id: 'b-2', file: file2, fileName: 'batch2.jpg', exifData: { Make: 'Nikon' } },
    ];

    useSanitizerStore.getState().openBatch(entries);
    const state = useSanitizerStore.getState();
    expect(state.isActive).toBe(true);
    expect(state.isBatch).toBe(true);
    expect(state.batchEntries).toHaveLength(2);
    expect(state.batchActiveIndex).toBe(0);

    useSanitizerStore.getState().setBatchActiveIndex(1);
    expect(useSanitizerStore.getState().batchActiveIndex).toBe(1);

    // Rejects out-of-bounds indices
    useSanitizerStore.getState().setBatchActiveIndex(5);
    expect(useSanitizerStore.getState().batchActiveIndex).toBe(1);
    useSanitizerStore.getState().setBatchActiveIndex(-1);
    expect(useSanitizerStore.getState().batchActiveIndex).toBe(1);
  });

  it('tracks processing state and resets clean on close', () => {
    const file = new File(['dummy'], 'sample.jpg', { type: 'image/jpeg' });
    useSanitizerStore.getState().openSingle(file, {});
    useSanitizerStore.getState().setIsProcessing(true);
    expect(useSanitizerStore.getState().isProcessing).toBe(true);

    useSanitizerStore.getState().close();
    const state = useSanitizerStore.getState();
    expect(state.isActive).toBe(false);
    expect(state.isBatch).toBe(false);
    expect(state.activeFile).toBeNull();
    expect(state.activeExif).toBeNull();
    expect(state.batchEntries).toEqual([]);
    expect(state.isProcessing).toBe(false);
  });
});


describe('useSanitizerStore - Toggles, Presets & Override Cascading (REQ-STA-003)', () => {
  beforeEach(() => {
    useSanitizerStore.getState().close();
  });

  it('updates individual global options via setGlobalOption', () => {
    useSanitizerStore.getState().setGlobalOption('gps', false);
    expect(useSanitizerStore.getState().globalOptions.gps).toBe(false);
    expect(useSanitizerStore.getState().globalOptions.device).toBe(true);

    useSanitizerStore.getState().setGlobalOption('device', false);
    expect(useSanitizerStore.getState().globalOptions.device).toBe(false);
  });

  it('applies presets to global options', () => {
    useSanitizerStore.getState().applyPreset('photo-share');
    expect(useSanitizerStore.getState().globalOptions).toEqual({
      gps: true,
      device: false,
      camera: false,
      date: true,
    });

    useSanitizerStore.getState().applyPreset('location-only');
    expect(useSanitizerStore.getState().globalOptions).toEqual({
      gps: true,
      device: false,
      camera: false,
      date: false,
    });

    useSanitizerStore.getState().applyPreset('max-privacy');
    expect(useSanitizerStore.getState().globalOptions).toEqual({
      gps: true,
      device: true,
      camera: true,
      date: true,
    });
  });

  it('cascades global options to entries without overrides', () => {
    useSanitizerStore.getState().applyPreset('photo-share');
    const effective = useSanitizerStore.getState().getEffectiveOptions('file-non-existent');
    expect(effective).toEqual({
      gps: true,
      device: false,
      camera: false,
      date: true,
    });
  });

  it('merges per-file overrides and restores inheritance on resetOverride', () => {
    useSanitizerStore.getState().applyPreset('photo-share');
    // photo-share has gps: true, device: false, camera: false, date: true

    // Custom override for entry file-1: keep GPS (gps: false), remove camera (camera: true)
    useSanitizerStore.getState().setOverride('file-1', { gps: false, camera: true });

    const effective1 = useSanitizerStore.getState().getEffectiveOptions('file-1');
    expect(effective1).toEqual({
      gps: false,
      device: false,
      camera: true,
      date: true,
    });

    // Another file still gets global options
    const effective2 = useSanitizerStore.getState().getEffectiveOptions('file-2');
    expect(effective2).toEqual({
      gps: true,
      device: false,
      camera: false,
      date: true,
    });

    // Reset override for file-1
    useSanitizerStore.getState().resetOverride('file-1');
    expect(useSanitizerStore.getState().overrides['file-1']).toBeUndefined();
    expect(useSanitizerStore.getState().getEffectiveOptions('file-1')).toEqual({
      gps: true,
      device: false,
      camera: false,
      date: true,
    });
  });
});
