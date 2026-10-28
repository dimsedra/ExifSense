// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { stripAllMetadata } from '../../../src/core/sanitizer/sanitizer';

describe('Total Canvas Metadata Stripping (REQ-SAN-004)', () => {
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
    const originalImage = window.Image;
    // Mock Image onerror trigger
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

    window.Image = originalImage;
  });
});
