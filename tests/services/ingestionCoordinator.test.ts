import { describe, it, expect, beforeEach } from 'vitest';
import {
  processSingleAsset,
  processBatchAssets,
  processSanitizerIntake,
} from '../../src/services/ingestionCoordinator';
import { useAssetStore } from '../../src/store/useAssetStore';
import { useSanitizerStore } from '../../src/store/useSanitizerStore';

// Valid JPEG magic bytes header: FF D8 FF E0
function createMockJpegFile(name = 'test.jpg'): File {
  const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
  return new File([bytes], name, { type: 'image/jpeg' });
}

// Invalid text file
function createMockTxtFile(name = 'test.txt'): File {
  const bytes = new Uint8Array([0x68, 0x65, 0x6c, 0x6c, 0x6f]);
  return new File([bytes], name, { type: 'text/plain' });
}

describe('ingestionCoordinator', () => {
  beforeEach(() => {
    useAssetStore.getState().resetSession();
    useSanitizerStore.getState().close();
  });

  describe('Normal Path', () => {
    it('processes single valid image asset and stores in useAssetStore', async () => {
      const file = createMockJpegFile('sample1.jpg');
      const asset = await processSingleAsset(file);

      expect(asset).toBeDefined();
      expect(asset.fileName).toBe('sample1.jpg');
      expect(asset.hashes.sha256).toBeDefined();
      expect(asset.hashes.sha1).toBeDefined();
      expect(asset.signature.mimeType).toBe('image/jpeg');

      // Verify store updated
      const storeAssets = useAssetStore.getState().assets;
      expect(storeAssets.length).toBe(1);
      expect(storeAssets[0].fileName).toBe('sample1.jpg');
    });

    it('processes multiple valid image assets as batch', async () => {
      const files = [
        createMockJpegFile('sample1.jpg'),
        createMockJpegFile('sample2.jpg'),
      ];

      const assets = await processBatchAssets(files);

      expect(assets.length).toBe(2);
      expect(assets[0].fileName).toBe('sample1.jpg');
      expect(assets[1].fileName).toBe('sample2.jpg');

      const storeAssets = useAssetStore.getState().assets;
      expect(storeAssets.length).toBe(2);
    });

    it('processes sanitizer intake and populates useSanitizerStore', async () => {
      const files = [createMockJpegFile('photo.jpg')];
      const entries = await processSanitizerIntake(files);

      expect(entries.length).toBe(1);
      expect(entries[0].name).toBe('photo.jpg');

      const storeEntries = useSanitizerStore.getState().batchEntries;
      expect(storeEntries.length).toBe(1);
    });
  });

  describe('Boundary & Edge Cases', () => {
    it('returns empty array when batch processing empty file array', async () => {
      const assets = await processBatchAssets([]);
      expect(assets).toEqual([]);
      expect(useAssetStore.getState().assets).toEqual([]);
    });

    it('strictly caps batch processing at 50 files', async () => {
      const files: File[] = [];
      for (let i = 0; i < 55; i++) {
        files.push(createMockJpegFile(`photo_${i}.jpg`));
      }

      const assets = await processBatchAssets(files);
      expect(assets.length).toBe(50);
      expect(useAssetStore.getState().assets.length).toBe(50);
    });
  });

  describe('Error Paths', () => {
    it('rejects unsupported file signature in single processing', async () => {
      const txtFile = createMockTxtFile('malicious.exe.txt');
      await expect(processSingleAsset(txtFile)).rejects.toThrow(/Unsupported file signature/i);
    });

    it('filters out unsupported files in batch processing without crashing', async () => {
      const files = [
        createMockJpegFile('valid1.jpg'),
        createMockTxtFile('invalid.txt'),
        createMockJpegFile('valid2.jpg'),
      ];

      const assets = await processBatchAssets(files);
      expect(assets.length).toBe(2);
      expect(assets.map((a) => a.fileName)).toEqual(['valid1.jpg', 'valid2.jpg']);
    });
  });

  describe('Core Invariants', () => {
    it('assigns unique forensic session id across all assets in a batch', async () => {
      const files = [
        createMockJpegFile('batch1.jpg'),
        createMockJpegFile('batch2.jpg'),
      ];

      const assets = await processBatchAssets(files);
      const sessionIds = new Set(assets.map((a) => a.forensicSessionId));
      expect(sessionIds.size).toBe(1);
      expect(assets[0].forensicSessionId).toBeTruthy();
    });
  });
});
