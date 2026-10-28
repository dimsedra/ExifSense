import { describe, it, expect, beforeEach } from 'vitest';
import { useAssetStore } from '../../src/store/useAssetStore';

describe('useAssetStore - Staged Queue Management (REQ-STA-001)', () => {
  beforeEach(() => {
    useAssetStore.getState().resetSession();
    useAssetStore.getState().clearStagedFiles();
  });

  it('initializes with default state values', () => {
    const state = useAssetStore.getState();
    expect(state.uploadMode).toBe('single');
    expect(state.stagedFiles).toEqual([]);
    expect(state.assets).toEqual([]);
    expect(state.activeAssetIndex).toBe(0);
    expect(state.forensicId).toBeNull();
    expect(state.investigatorIdentity).toBeNull();
    expect(state.isAnalyzing).toBe(false);
  });

  it('updates upload mode via setUploadMode', () => {
    useAssetStore.getState().setUploadMode('batch');
    expect(useAssetStore.getState().uploadMode).toBe('batch');

    useAssetStore.getState().setUploadMode('remove');
    expect(useAssetStore.getState().uploadMode).toBe('remove');
  });

  it('stages files and allows removing staged file by index', () => {
    const file1 = new File(['a'], 'photo1.jpg', { type: 'image/jpeg' });
    const file2 = new File(['b'], 'photo2.jpg', { type: 'image/jpeg' });
    const file3 = new File(['c'], 'photo3.jpg', { type: 'image/jpeg' });

    useAssetStore.getState().stageFiles([file1, file2, file3]);
    expect(useAssetStore.getState().stagedFiles).toHaveLength(3);
    expect(useAssetStore.getState().stagedFiles[1].name).toBe('photo2.jpg');

    // Remove index 1
    useAssetStore.getState().removeStagedFile(1);
    expect(useAssetStore.getState().stagedFiles).toHaveLength(2);
    expect(useAssetStore.getState().stagedFiles[0].name).toBe('photo1.jpg');
    expect(useAssetStore.getState().stagedFiles[1].name).toBe('photo3.jpg');

    // Out of bounds index should not modify queue
    useAssetStore.getState().removeStagedFile(10);
    useAssetStore.getState().removeStagedFile(-1);
    expect(useAssetStore.getState().stagedFiles).toHaveLength(2);
  });

  it('enforces maximum 50-file limit on staged queue', () => {
    const files: File[] = [];
    for (let i = 0; i < 60; i++) {
      files.push(new File([`data-${i}`], `file_${i}.jpg`, { type: 'image/jpeg' }));
    }

    useAssetStore.getState().stageFiles(files);
    expect(useAssetStore.getState().stagedFiles).toHaveLength(50);
    expect(useAssetStore.getState().stagedFiles[0].name).toBe('file_0.jpg');
    expect(useAssetStore.getState().stagedFiles[49].name).toBe('file_49.jpg');

    // Adding more files when already at 50 keeps it capped at 50
    useAssetStore.getState().stageFiles([new File(['extra'], 'extra.jpg', { type: 'image/jpeg' })]);
    expect(useAssetStore.getState().stagedFiles).toHaveLength(50);
  });

  it('clears all staged files', () => {
    const file1 = new File(['a'], 'photo1.jpg', { type: 'image/jpeg' });
    useAssetStore.getState().stageFiles([file1]);
    expect(useAssetStore.getState().stagedFiles).toHaveLength(1);

    useAssetStore.getState().clearStagedFiles();
    expect(useAssetStore.getState().stagedFiles).toEqual([]);
  });
});
