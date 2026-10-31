import { describe, it, expect, vi } from 'vitest';
import {
  generateClipboardReport,
  copyReportToClipboard
} from '../../../src/core/exporter/exporter';
import { ForensicAsset } from '../../../src/core/forensics/types';
import { ForensicExportMetadata } from '../../../src/core/exporter/types';

describe('Clipboard Report Formatter & Helper (REQ-EXP-005)', () => {
  const meta: ForensicExportMetadata = {
    sessionTitle: 'Operation Shield',
    forensicId: 'ES-CLIP-007',
    generatedAt: new Date('2026-10-28T15:00:00.000Z')
  };

  const asset1: ForensicAsset = {
    id: '1',
    fileName: 'target1.jpg',
    fileSize: 2097152,
    fileType: 'image/jpeg',
    fileDate: 1729000000000,
    sha256: 'CLIP_SHA256',
    sha1: 'CLIP_SHA1',
    actualWidth: 1920,
    actualHeight: 1080,
    exifData: { Make: 'Sony', Model: 'A1' },
    categorizedExif: {
      'Device Hardware': { Make: 'Sony', Model: 'A1' },
      'Exposure Settings': {},
      'Optics & Lens': {},
      'Image Quality': {},
      'Timeline & Date': {},
      Geospatial: {},
      'Standards & Info': {},
      Miscellaneous: {}
    },
    integrityAlerts: []
  };

  it('generates ASCII formatted clipboard text representation (Normal Path)', () => {
    const text = generateClipboardReport([asset1], meta, 'en');

    expect(text).toContain('EXIFSENSE METADATA ANALYSIS REPORT');
    expect(text).toContain('===================================');
    expect(text).toContain('Session: Operation Shield');
    expect(text).toContain('Session Identifier: ES-CLIP-007');
    expect(text).toContain('Asset Count: 1');

    expect(text).toContain('[Technical Source Details]');
    expect(text).toContain('Name: target1.jpg');
    expect(text).toContain('SHA-256: CLIP_SHA256');

    expect(text).toContain('[Metadata Analysis Story]');
    expect(text).toContain('[Raw Metadata Properties]');
    expect(text).toContain('--- Device Hardware ---');
    expect(text).toContain('Make: Sony');
  });

  it('invokes navigator.clipboard.writeText with generated text in copyReportToClipboard', async () => {
    const writeTextSpy = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis, 'navigator', {
      value: { clipboard: { writeText: writeTextSpy } },
      configurable: true,
      writable: true
    });

    await copyReportToClipboard([asset1], meta, 'en');

    expect(writeTextSpy).toHaveBeenCalledTimes(1);
    const passedText = writeTextSpy.mock.calls[0][0];
    expect(passedText).toContain('EXIFSENSE METADATA ANALYSIS REPORT');
    expect(passedText).toContain('target1.jpg');
  });

  it('bubbles clipboard permission rejections in copyReportToClipboard (Error Path)', async () => {
    const writeTextSpy = vi.fn().mockRejectedValue(new Error('Clipboard permission denied'));
    Object.defineProperty(globalThis, 'navigator', {
      value: { clipboard: { writeText: writeTextSpy } },
      configurable: true,
      writable: true
    });

    await expect(copyReportToClipboard([asset1], meta, 'en')).rejects.toThrow(
      'Clipboard permission denied'
    );
  });
});
