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


describe('useAssetStore - Active Asset Navigation & Session State (REQ-STA-002)', () => {
  const dummyAsset1 = {
    id: 'asset-1',
    fileName: 'photo1.jpg',
    fileSize: 1024,
    fileType: 'image/jpeg',
    fileDate: 1700000000000,
    sha256: 'sha256-1',
    sha1: 'sha1-1',
    actualWidth: 1920,
    actualHeight: 1080,
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
  };

  const dummyAsset2 = {
    ...dummyAsset1,
    id: 'asset-2',
    fileName: 'photo2.jpg',
    sha256: 'sha256-2',
  };

  beforeEach(() => {
    useAssetStore.getState().resetSession();
  });

  it('sets assets and auto-generates forensicId if none provided', () => {
    useAssetStore.getState().setAssets([dummyAsset1, dummyAsset2]);
    const state = useAssetStore.getState();
    expect(state.assets).toHaveLength(2);
    expect(state.activeAssetIndex).toBe(0);
    expect(state.forensicId).toMatch(/^ES-[A-Z0-9]+-[A-Z0-9]+$/);
  });

  it('preserves explicitly provided forensicId on setAssets', () => {
    useAssetStore.getState().setAssets([dummyAsset1], 'EXIF-CUSTOM-999');
    expect(useAssetStore.getState().forensicId).toBe('EXIF-CUSTOM-999');
  });

  it('navigates activeAssetIndex within valid bounds and notifies subscribers', () => {
    useAssetStore.getState().setAssets([dummyAsset1, dummyAsset2]);
    
    let notifiedIndex = -1;
    const unsub = useAssetStore.subscribe((state) => {
      notifiedIndex = state.activeAssetIndex;
    });

    useAssetStore.getState().setActiveAssetIndex(1);
    expect(useAssetStore.getState().activeAssetIndex).toBe(1);
    expect(notifiedIndex).toBe(1);

    // Out of bounds indices should be rejected
    useAssetStore.getState().setActiveAssetIndex(5);
    expect(useAssetStore.getState().activeAssetIndex).toBe(1);

    useAssetStore.getState().setActiveAssetIndex(-1);
    expect(useAssetStore.getState().activeAssetIndex).toBe(1);

    unsub();
  });

  it('updates investigatorIdentity and isAnalyzing', () => {
    useAssetStore.getState().setInvestigatorIdentity('Agent Mulder');
    expect(useAssetStore.getState().investigatorIdentity).toBe('Agent Mulder');

    useAssetStore.getState().setIsAnalyzing(true);
    expect(useAssetStore.getState().isAnalyzing).toBe(true);

    useAssetStore.getState().setIsAnalyzing(false);
    expect(useAssetStore.getState().isAnalyzing).toBe(false);
  });

  it('resets entire session state back to initial values', () => {
    useAssetStore.getState().setAssets([dummyAsset1, dummyAsset2], 'EXIF-TEST-123');
    useAssetStore.getState().setActiveAssetIndex(1);
    useAssetStore.getState().setInvestigatorIdentity('Detective');
    useAssetStore.getState().setIsAnalyzing(true);
    useAssetStore.getState().setUploadMode('batch');
    useAssetStore.getState().stageFiles([new File([''], 'test.jpg')]);

    useAssetStore.getState().resetSession();
    const state = useAssetStore.getState();
    expect(state.assets).toEqual([]);
    expect(state.activeAssetIndex).toBe(0);
    expect(state.forensicId).toBeNull();
    expect(state.investigatorIdentity).toBeNull();
    expect(state.isAnalyzing).toBe(false);
    expect(state.uploadMode).toBe('single');
    expect(state.stagedFiles).toEqual([]);
  });
});


describe('useAssetStore - Forensic Chain of Custody (Blocker 3 Fix Verification)', () => {
  const dummyAsset = {
    id: 'asset-x',
    fileName: 'photo_x.jpg',
    fileSize: 1024,
    fileType: 'image/jpeg',
    fileDate: 1700000000000,
    sha256: 'sha256-x',
    sha1: 'sha1-x',
    actualWidth: 1920,
    actualHeight: 1080,
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
  };

  it('generates a fresh forensicId on consecutive setAssets calls without reusing stale ID', () => {
    useAssetStore.getState().setAssets([dummyAsset]);
    const id1 = useAssetStore.getState().forensicId;
    expect(id1).not.toBeNull();

    // Now analyze a new batch without explicit resetSession
    useAssetStore.getState().setAssets([{ ...dummyAsset, id: 'asset-y', fileName: 'photo_y.jpg' }]);
    const id2 = useAssetStore.getState().forensicId;
    expect(id2).not.toBeNull();
    expect(id2).not.toBe(id1);
  });

  it('updates asset location data and locationName correctly', () => {
    useAssetStore.getState().setAssets([dummyAsset]);
    expect(useAssetStore.getState().assets[0]!.locationData).toBeUndefined();

    useAssetStore.getState().updateAssetLocation('asset-x', {
      display_name: 'Pier Road, Luss, Scotland',
    });

    const updated = useAssetStore.getState().assets[0]!;
    expect(updated.locationData).toEqual({ display_name: 'Pier Road, Luss, Scotland' });
    expect(updated.locationName).toBe('Pier Road, Luss, Scotland');
  });
});
