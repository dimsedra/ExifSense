// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateThumbnailDataUrl,
  saveImagePreview,
  getImagePreview,
  deleteImagePreview,
  clearImagePreviewCache,
} from '../../src/services/imagePreviewCache';

describe('imagePreviewCache', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateThumbnailDataUrl', () => {
    it('returns empty string for null or undefined input', async () => {
      const result = await generateThumbnailDataUrl(null as any);
      expect(result).toBe('');
    });

    it('returns empty string when URL.createObjectURL throws or is missing', async () => {
      const originalCreateObjectURL = URL.createObjectURL;
      URL.createObjectURL = () => {
        throw new Error('Not supported');
      };

      const blob = new Blob(['sample-bytes'], { type: 'image/jpeg' });
      const result = await generateThumbnailDataUrl(blob);
      expect(result).toBe('');

      URL.createObjectURL = originalCreateObjectURL;
    });

    it('handles image error gracefully by returning empty string', async () => {
      // Create a mock image that triggers onerror
      const originalImage = globalThis.Image;
      globalThis.Image = class MockImage {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        set src(_v: string) {
          setTimeout(() => {
            if (this.onerror) this.onerror();
          }, 10);
        }
      } as any;

      const blob = new Blob(['corrupt-image'], { type: 'image/jpeg' });
      const result = await generateThumbnailDataUrl(blob);
      expect(result).toBe('');

      globalThis.Image = originalImage;
    });

    it('generates a downscaled data URL when canvas succeeds', async () => {
      const originalImage = globalThis.Image;
      globalThis.Image = class MockImage {
        naturalWidth = 800;
        naturalHeight = 600;
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        set src(_v: string) {
          setTimeout(() => {
            if (this.onload) this.onload();
          }, 10);
        }
      } as any;

      // Mock canvas getContext and toDataURL
      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        if (tagName.toLowerCase() === 'canvas') {
          const canvas = originalCreateElement('canvas');
          canvas.getContext = vi.fn().mockReturnValue({
            drawImage: vi.fn(),
          });
          canvas.toDataURL = vi.fn().mockReturnValue('data:image/jpeg;base64,mockThumbnailData');
          return canvas;
        }
        return originalCreateElement(tagName);
      });

      const blob = new Blob(['mock-valid-jpeg'], { type: 'image/jpeg' });
      const result = await generateThumbnailDataUrl(blob, 180);
      expect(result).toBe('data:image/jpeg;base64,mockThumbnailData');

      globalThis.Image = originalImage;
    });
  });

  describe('IndexedDB operations', () => {
    it('returns false/null when indexedDB is undefined', async () => {
      const originalIDB = window.indexedDB;
      (window as any).indexedDB = undefined;

      const blob = new Blob(['data'], { type: 'image/jpeg' });
      expect(await saveImagePreview('test-key', blob)).toBe(false);
      expect(await getImagePreview('test-key')).toBe(null);
      expect(await deleteImagePreview('test-key')).toBe(false);
      expect(await clearImagePreviewCache()).toBe(false);

      (window as any).indexedDB = originalIDB;
    });

    it('returns false for empty key or missing blob', async () => {
      expect(await saveImagePreview('', new Blob())).toBe(false);
      expect(await saveImagePreview('valid-key', null as any)).toBe(false);
      expect(await getImagePreview('')).toBe(null);
      expect(await deleteImagePreview('')).toBe(false);
    });

    it('saves, retrieves, and deletes blob when indexedDB is available', async () => {
      const fakeStore = new Map<string, Blob>();
      const mockDb: any = {
        objectStoreNames: {
          contains: () => true,
        },
        createObjectStore: vi.fn(),
        transaction: vi.fn((_storeName, _mode) => {
          return {
            objectStore: () => ({
              put: (blob: Blob, key: string) => {
                fakeStore.set(key, blob);
              },
              get: (key: string) => {
                const req: any = { result: fakeStore.get(key) || null };
                setTimeout(() => {
                  if (req.onsuccess) req.onsuccess();
                }, 5);
                return req;
              },
              delete: (key: string) => {
                fakeStore.delete(key);
              },
              clear: () => {
                fakeStore.clear();
              },
            }),
            oncomplete: null as any,
            onerror: null as any,
          };
        }),
        close: vi.fn(),
      };

      const mockOpenRequest: any = {
        result: mockDb,
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
      };

      const mockIndexedDB: any = {
        open: vi.fn(() => {
          setTimeout(() => {
            if (mockOpenRequest.onsuccess) mockOpenRequest.onsuccess();
          }, 5);
          return mockOpenRequest;
        }),
      };
      (window as any).indexedDB = mockIndexedDB;

      // Modify transaction mock to call oncomplete
      mockDb.transaction = vi.fn((_storeName, _mode) => {
        const tx: any = {
          objectStore: () => ({
            put: (blob: Blob, key: string) => {
              fakeStore.set(key, blob);
            },
            get: (key: string) => {
              const req: any = { result: fakeStore.get(key) || null };
              setTimeout(() => {
                if (req.onsuccess) req.onsuccess();
              }, 5);
              return req;
            },
            delete: (key: string) => {
              fakeStore.delete(key);
            },
            clear: () => {
              fakeStore.clear();
            },
          }),
          oncomplete: null,
          onerror: null,
        };
        setTimeout(() => {
          if (tx.oncomplete) tx.oncomplete();
        }, 5);
        return tx;
      });

      const testBlob = new Blob(['hello-image'], { type: 'image/jpeg' });
      const saved = await saveImagePreview('hash-123', testBlob);
      expect(saved).toBe(true);

      const retrieved = await getImagePreview('hash-123');
      expect(retrieved).toBeDefined();

      const deleted = await deleteImagePreview('hash-123');
      expect(deleted).toBe(true);

      const cleared = await clearImagePreviewCache();
      expect(cleared).toBe(true);
    });
  });
});
