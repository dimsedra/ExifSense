// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { stripAllMetadata, stripSpecificMetadata } from '../../../src/core/sanitizer/sanitizer';

describe('Total Canvas Metadata Stripping (REQ-SAN-004)', () => {
  let originalImage: typeof Image;
  let originalGetContext: typeof HTMLCanvasElement.prototype.getContext;
  let originalToBlob: typeof HTMLCanvasElement.prototype.toBlob;

  class MockImage {
    naturalWidth = 800;
    naturalHeight = 600;
    width = 800;
    height = 600;
    private _src = '';
    onload: (() => void) | null = null;
    onerror: ((err: Error) => void) | null = null;

    get src(): string {
      return this._src;
    }

    set src(val: string) {
      this._src = val;
      setTimeout(() => {
        if (this.onload) this.onload();
      }, 0);
    }
  }

  beforeEach(() => {
    originalImage = window.Image;
    originalGetContext = HTMLCanvasElement.prototype.getContext;
    originalToBlob = HTMLCanvasElement.prototype.toBlob;

    // @ts-expect-error Mocking browser Image constructor for testing
    window.Image = MockImage;

    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      drawImage: vi.fn()
    }) as unknown as typeof HTMLCanvasElement.prototype.getContext;

    HTMLCanvasElement.prototype.toBlob = function (
      callback: BlobCallback,
      type = 'image/png'
    ) {
      setTimeout(() => {
        callback(new Blob(['clean-pixels'], { type }));
      }, 0);
    };
  });

  afterEach(() => {
    window.Image = originalImage;
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    HTMLCanvasElement.prototype.toBlob = originalToBlob;
    vi.restoreAllMocks();
  });

  it('re-rasterizes image onto canvas and produces clean output Blob (Normal Path)', async () => {
    const inputBlob = new Blob(['dummy-image-data'], { type: 'image/png' });
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');

    const cleanedBlob = await stripAllMetadata(inputBlob);

    expect(cleanedBlob).toBeInstanceOf(Blob);
    expect(cleanedBlob.type).toBe('image/png');
    expect(revokeSpy).toHaveBeenCalled();
  });

  it('preserves JPEG MIME type when stripping JPEG files', async () => {
    const inputBlob = new Blob(['dummy-jpeg-data'], { type: 'image/jpeg' });
    const cleanedBlob = await stripAllMetadata(inputBlob);

    expect(cleanedBlob).toBeInstanceOf(Blob);
    expect(cleanedBlob.type).toBe('image/jpeg');
  });

  it('rejects with error when image loading encounters error (Error Path)', async () => {
    class FaultyImage {
      onload: (() => void) | null = null;
      onerror: ((err: Error) => void) | null = null;
      set src(_val: string) {
        setTimeout(() => {
          if (this.onerror) this.onerror(new Error('Corrupt image payload'));
        }, 0);
      }
    }
    // @ts-expect-error Mocking global Image for error path test
    window.Image = FaultyImage;

    const inputBlob = new Blob(['corrupt-data'], { type: 'image/jpeg' });
    await expect(stripAllMetadata(inputBlob)).rejects.toThrow('Corrupt image payload');
  });

  it('falls back to canvas total stripping when stripSpecificMetadata receives non-JPEG bytes (Error Path)', async () => {
    const nonJpegBlob = new Blob(['not-a-jpeg-payload'], { type: 'image/png' });
    const cleanedBlob = await stripSpecificMetadata(nonJpegBlob, {
      gps: true,
      device: true,
      camera: true,
      date: true
    });

    expect(cleanedBlob).toBeInstanceOf(Blob);
    expect(cleanedBlob.type).toBe('image/png');
  });
});
