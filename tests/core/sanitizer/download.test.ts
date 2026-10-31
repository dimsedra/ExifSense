// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { triggerBlobDownload } from '../../../src/core/sanitizer/sanitizer';

describe('Blob Download Trigger Lifecycle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('creates anchor element, triggers click, appends/removes from DOM, and schedules URL revocation after 150ms', () => {
    const createUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    const revokeUrlSpy = vi.spyOn(URL, 'revokeObjectURL');
    const appendChildSpy = vi.spyOn(document.body, 'appendChild');
    const removeChildSpy = vi.spyOn(document.body, 'removeChild');

    const clickSpy = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const el = originalCreateElement(tagName);
      if (tagName.toLowerCase() === 'a') {
        el.click = clickSpy;
      }
      return el;
    });

    const testBlob = new Blob(['test-content'], { type: 'text/plain' });
    triggerBlobDownload(testBlob, 'cleaned_photo.jpg');

    expect(createUrlSpy).toHaveBeenCalledWith(testBlob);
    expect(appendChildSpy).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalled();

    // Revocation must not happen immediately
    expect(revokeUrlSpy).not.toHaveBeenCalled();

    // Fast-forward timer past 150ms
    vi.advanceTimersByTime(150);
    expect(revokeUrlSpy).toHaveBeenCalledWith('blob:mock-url');
  });
});
