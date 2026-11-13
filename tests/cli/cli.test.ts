import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseCliArgs, CliArgumentError } from '../../src/cli/args';
import {
  loadAssetSource,
  resolveScenario,
  extractBaseline,
  FileNotFoundError,
  InvalidJsonError,
  UnsupportedFormatError,
  ScenarioNotFoundError,
} from '../../src/cli/loader';
import { runCli } from '../../src/cli/runner';
import { createFixtureJpegWithExif } from '../fixtures/sample_jpeg';

describe('CLI Analysis and Simulation Harness', () => {
  let tempDir: string;
  let sampleJpegPath: string;
  let corruptJsonPath: string;
  let nonImageBinPath: string;

  beforeAll(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'exifsense-cli-test-'));

    // Create a real JPEG with EXIF tags for testing
    const jpegBytes = createFixtureJpegWithExif({
      make: 'Google',
      model: 'Pixel 6',
      software: 'Camera App 1.0',
      dateTimeOriginal: '2023:05:10 14:30:00',
      latitude: [55, 51],
      longitude: [4, 25],
    });
    sampleJpegPath = path.join(tempDir, 'sample.jpg');
    await fs.promises.writeFile(sampleJpegPath, Buffer.from(jpegBytes));

    // Create corrupt JSON
    corruptJsonPath = path.join(tempDir, 'corrupt.json');
    await fs.promises.writeFile(corruptJsonPath, '{ invalid json content', 'utf8');

    // Create non-image binary file
    nonImageBinPath = path.join(tempDir, 'plain.bin');
    await fs.promises.writeFile(nonImageBinPath, Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04]));
  });

  afterAll(async () => {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  });

  // ==========================================
  // BP-CLI-001: CLI Argument Parsing
  // ==========================================
  describe('BP-CLI-001: parseCliArgs', () => {
    it('Given empty arguments, When parsed, Then returns help command', () => {
      const result = parseCliArgs([]);
      expect(result.command).toBe('help');
    });

    it('Given --help flag, When parsed, Then returns help command', () => {
      const result = parseCliArgs(['--help']);
      expect(result.command).toBe('help');
    });

    it('Given --version flag, When parsed, Then returns version command', () => {
      const result = parseCliArgs(['--version']);
      expect(result.command).toBe('version');
    });

    it('Given single command with path, When parsed, Then returns single command with default options', () => {
      const result = parseCliArgs(['single', 'test.jpg']);
      expect(result.command).toBe('single');
      if (result.command === 'single') {
        expect(result.targetPath).toBe('test.jpg');
        expect(result.options.locale).toBe('en');
        expect(result.options.format).toBe('plain');
        expect(result.options.out).toBeUndefined();
      }
    });

    it('Given single command with custom flags, When parsed, Then populates options correctly', () => {
      const result = parseCliArgs([
        'single',
        'test.jpg',
        '--locale',
        'id',
        '--format',
        'markdown',
        '--out',
        'report.md',
      ]);
      expect(result.command).toBe('single');
      if (result.command === 'single') {
        expect(result.targetPath).toBe('test.jpg');
        expect(result.options.locale).toBe('id');
        expect(result.options.format).toBe('markdown');
        expect(result.options.out).toBe('report.md');
      }
    });

    it('Given batch command with multiple files, When parsed, Then returns all target paths with detailed false by default', () => {
      const result = parseCliArgs(['batch', 'file1.jpg', 'file2.jpg', 'file3.json']);
      expect(result.command).toBe('batch');
      if (result.command === 'batch') {
        expect(result.targetPaths).toEqual(['file1.jpg', 'file2.jpg', 'file3.json']);
        expect(result.options.detailed).toBe(false);
      }
    });

    it('Given batch command with --detailed flag, When parsed, Then sets detailed option to true', () => {
      const result = parseCliArgs(['batch', 'file1.jpg', 'file2.jpg', '--detailed']);
      expect(result.command).toBe('batch');
      if (result.command === 'batch') {
        expect(result.targetPaths).toEqual(['file1.jpg', 'file2.jpg']);
        expect(result.options.detailed).toBe(true);
      }
    });

    it('Given scenario command with preset name and --detailed flag, When parsed, Then returns scenario name and detailed true', () => {
      const result = parseCliArgs(['scenario', 'missing-gps', '--detailed']);
      expect(result.command).toBe('scenario');
      if (result.command === 'scenario') {
        expect(result.scenarioName).toBe('missing-gps');
        expect(result.options.detailed).toBe(true);
      }
    });

    it('Given extract command with output path, When parsed, Then returns source and output paths', () => {
      const result = parseCliArgs(['extract', 'source.jpg', 'out.json']);
      expect(result.command).toBe('extract');
      if (result.command === 'extract') {
        expect(result.sourcePath).toBe('source.jpg');
        expect(result.outputPath).toBe('out.json');
      }
    });

    it('Given unknown command, When parsed, Then throws CliArgumentError', () => {
      expect(() => parseCliArgs(['destroy', 'file.jpg'])).toThrow(CliArgumentError);
    });

    it('Given single command without target path, When parsed, Then throws CliArgumentError', () => {
      expect(() => parseCliArgs(['single'])).toThrow(CliArgumentError);
    });

    it('Given batch command without target paths, When parsed, Then throws CliArgumentError', () => {
      expect(() => parseCliArgs(['batch'])).toThrow(CliArgumentError);
    });

    it('Given scenario command without scenario name, When parsed, Then throws CliArgumentError', () => {
      expect(() => parseCliArgs(['scenario'])).toThrow(CliArgumentError);
    });

    it('Given extract command without source image, When parsed, Then throws CliArgumentError', () => {
      expect(() => parseCliArgs(['extract'])).toThrow(CliArgumentError);
    });

    it('Given unsupported locale flag, When parsed, Then throws CliArgumentError', () => {
      expect(() => parseCliArgs(['single', 'test.jpg', '--locale', 'fr'])).toThrow(CliArgumentError);
      expect(() => parseCliArgs(['single', 'test.jpg', '--locale', 'ar'])).toThrow(
        "Unsupported locale 'ar'. Supported: en, id."
      );
    });

    it('Given unsupported format flag, When parsed, Then throws CliArgumentError', () => {
      expect(() => parseCliArgs(['single', 'test.jpg', '--format', 'pdf'])).toThrow(CliArgumentError);
    });

    // BP-HASH-001: CLI Arguments Parsing for 'hash'
    it('Given hash command with single target path, When parsed, Then returns hash command with targetPaths and default options', () => {
      const result = parseCliArgs(['hash', 'img1.jpg']);
      expect(result.command).toBe('hash');
      if (result.command === 'hash') {
        expect(result.targetPaths).toEqual(['img1.jpg']);
        expect(result.options.format).toBe('plain');
        expect(result.options.locale).toBe('en');
        expect(result.options.out).toBeUndefined();
      }
    });

    it('Given hash command with multiple targets and flags, When parsed, Then returns hash command with mapped options', () => {
      const result = parseCliArgs([
        'hash',
        'img1.jpg',
        'dir/img2.png',
        '--format',
        'markdown',
        '--out',
        'manifest.md',
      ]);
      expect(result.command).toBe('hash');
      if (result.command === 'hash') {
        expect(result.targetPaths).toEqual(['img1.jpg', 'dir/img2.png']);
        expect(result.options.format).toBe('markdown');
        expect(result.options.out).toBe('manifest.md');
      }
    });

    it('Given hash command without target paths, When parsed, Then throws CliArgumentError', () => {
      expect(() => parseCliArgs(['hash'])).toThrow(CliArgumentError);
    });
  });

  // ==========================================
  // BP-CLI-002: Universal Asset Loader
  // ==========================================
  describe('BP-CLI-002: loadAssetSource', () => {
    it('Given a valid binary image file, When loaded, Then extracts EXIF and computes hashes', async () => {
      const asset = await loadAssetSource(sampleJpegPath);
      expect(asset.fileName).toBe('sample.jpg');
      expect(asset.fileSize).toBeGreaterThan(0);
      expect(asset.sha256).toMatch(/^[0-9A-F]{64}$/);
      expect(asset.sha1).toMatch(/^[0-9A-F]{40}$/);
      expect(asset.exifData).toBeDefined();
      expect(asset.categorizedExif['Device Hardware']).toBeDefined();
    });

    it('Given a valid JSON scenario file, When loaded, Then parses asset structure and evaluates integrity', async () => {
      const asset = await loadAssetSource('tests/fixtures/scenarios/baseline.json');
      expect(asset.fileName).toBe('000.jpg');
      expect(asset.fileSize).toBeGreaterThan(0);
      expect(asset.exifData.Make).toBe('LGE');
      expect(asset.exifData.Model).toBe('Nexus 5X');
      expect(asset.integrityAlerts).toBeDefined();
    });

    it('Given a non-existent file path, When loaded, Then throws FileNotFoundError', async () => {
      await expect(loadAssetSource('/non/existent/file.jpg')).rejects.toThrow(FileNotFoundError);
    });

    it('Given a corrupt JSON file, When loaded, Then throws InvalidJsonError', async () => {
      await expect(loadAssetSource(corruptJsonPath)).rejects.toThrow(InvalidJsonError);
    });

    it('Given a non-image binary file, When loaded, Then throws UnsupportedFormatError', async () => {
      await expect(loadAssetSource(nonImageBinPath)).rejects.toThrow(UnsupportedFormatError);
    });
  });

  // ==========================================
  // BP-CLI-003: Preset Scenario Resolver
  // ==========================================
  describe('BP-CLI-003: resolveScenario', () => {
    it('Given a single-asset scenario name (missing-gps), When resolved, Then returns single ForensicAsset', async () => {
      const result = await resolveScenario('missing-gps');
      expect(Array.isArray(result)).toBe(false);
      const asset = result as import('../../src/core/forensics/types').ForensicAsset;
      expect(asset.fileName).toBe('000.jpg');
      expect(asset.exifData.latitude).toBeUndefined();
    });

    it('Given a single-asset scenario with tampered software, When resolved, Then includes software integrity alert', async () => {
      const result = await resolveScenario('tampered-software');
      expect(Array.isArray(result)).toBe(false);
      const asset = result as import('../../src/core/forensics/types').ForensicAsset;
      expect(asset.exifData.Software).toBe('Adobe Photoshop 2024');
      const hasSoftwareAlert = asset.integrityAlerts.some((a) => a.type === 'editing_software');
      expect(hasSoftwareAlert).toBe(true);
    });

    it('Given a batch scenario name (travel-sequence), When resolved, Then returns array of ForensicAssets', async () => {
      const result = await resolveScenario('travel-sequence');
      expect(Array.isArray(result)).toBe(true);
      const assets = result as import('../../src/core/forensics/types').ForensicAsset[];
      expect(assets.length).toBe(5);
      expect(assets[0].fileName).toBe('000.jpg');
      expect(assets[4].fileName).toBe('004.jpg');
    });

    it('Given a batch scenario name with time jump anomaly, When resolved, Then returns assets with timeline difference', async () => {
      const result = await resolveScenario('time-jump-anomaly');
      expect(Array.isArray(result)).toBe(true);
      const assets = result as import('../../src/core/forensics/types').ForensicAsset[];
      expect(assets.length).toBe(5);
    });

    it('Given a non-existent scenario name, When resolved, Then throws ScenarioNotFoundError listing available scenarios', async () => {
      await expect(resolveScenario('unknown-future-scenario')).rejects.toThrow(
        ScenarioNotFoundError
      );
    });
  });

  // ==========================================
  // BP-CLI-004: Execution Runner
  // ==========================================
  describe('BP-CLI-004: runCli', () => {
    it('Given help flag, When executed, Then returns success with help text', async () => {
      const result = await runCli(['--help']);
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.outputText).toContain('Usage:');
      expect(result.outputText).toContain('--locale <en|id>');
    });

    it('Given --locale ar, When executed, Then fails fast with unsupported locale error', async () => {
      const result = await runCli(['scenario', 'baseline', '--locale', 'ar']);
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(result.errorText).toContain("Unsupported locale 'ar'. Supported: en, id.");
    });

    it('Given version flag, When executed, Then returns success with version text', async () => {
      const result = await runCli(['--version']);
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.outputText).toContain('ExifSense CLI v');
    });

    it('Given single command on a valid JPEG, When executed, Then outputs forensic sections', async () => {
      const result = await runCli(['single', sampleJpegPath]);
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.outputText).toContain('=== ExifSense Forensic Analysis ===');
      expect(result.outputText).toContain('SHA-256');
      expect(result.outputText).toContain('--- Forensic Narrative ---');
    });

    it('Given batch command on scenario files, When executed, Then outputs collective analysis and chronological story', async () => {
      const originalFetch = globalThis.fetch;
      const { clearGeocodeCache, clearOsrmCache } = await import('../../src/services/mapHelpers');
      clearGeocodeCache();
      clearOsrmCache();

      globalThis.fetch = (async () => {
        throw new Error('Offline test isolation');
      }) as typeof fetch;

      try {
        const result = await runCli([
          'batch',
          'tests/fixtures/scenarios/baseline.json',
          'tests/fixtures/scenarios/single/tampered-software.json',
        ]);
        expect(result.success).toBe(true);
        expect(result.exitCode).toBe(0);
        expect(result.outputText).toContain('=== ExifSense Collective Intelligence Analysis ===');
        expect(result.outputText).toContain('Total Assets: 2');
        expect(result.outputText).toContain('--- Combined Analysis ---');
        expect(result.outputText).toContain('--- Chronological Story ---');
      } finally {
        globalThis.fetch = originalFetch;
        clearGeocodeCache();
        clearOsrmCache();
      }
    });

    it('Given scenario command on travel-sequence, When executed, Then outputs movement details and story steps', { timeout: 10000 }, async () => {
      const originalFetch = globalThis.fetch;
      const { clearGeocodeCache, clearOsrmCache } = await import('../../src/services/mapHelpers');
      clearGeocodeCache();
      clearOsrmCache();

      globalThis.fetch = (async () => {
        throw new Error('Offline test isolation');
      }) as typeof fetch;

      try {
        const result = await runCli(['scenario', 'travel-sequence']);
        expect(result.success).toBe(true);
        expect(result.exitCode).toBe(0);
        expect(result.outputText).toContain('Total Assets: 5');
        expect(result.outputText).toContain('Cumulative Displacement');
        expect(result.outputText).toContain('[Step 1]');
        expect(result.outputText).toContain('[Step 5]');
      } finally {
        globalThis.fetch = originalFetch;
        clearGeocodeCache();
        clearOsrmCache();
      }
    });

    it('Given scenario command with --out flag, When executed, Then writes output to destination file', async () => {
      const outFilePath = path.join(tempDir, 'output.txt');
      const result = await runCli(['scenario', 'missing-gps', '--out', outFilePath]);
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(fs.existsSync(outFilePath)).toBe(true);
      const fileContent = await fs.promises.readFile(outFilePath, 'utf8');
      expect(fileContent).toContain('=== ExifSense Forensic Analysis ===');
    });

    it('Given single command with --format markdown, When executed, Then formats with markdown headers', async () => {
      const result = await runCli(['single', sampleJpegPath, '--format', 'markdown']);
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.outputText).toContain('# ExifSense Forensic Analysis');
    });

    it('Given invalid arguments, When executed, Then returns exitCode 1 and errorText', async () => {
      const result = await runCli(['non-existent-command']);
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(result.errorText).toBeDefined();
    });

    it('Given missing file to single command, When executed, Then returns exitCode 1 and errorText', async () => {
      const result = await runCli(['single', '/non/existent/missing.jpg']);
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(result.errorText).toContain('File not found');
    });

    // BP-HASH-004: End-to-End CLI Runner Execution for hash command
    it('Given hash command on valid file, When executed, Then outputs cryptographic hash manifest', async () => {
      const result = await runCli(['hash', sampleJpegPath]);
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.outputText).toContain('=== ExifSense Cryptographic Hash Manifest ===');
      expect(result.outputText).toContain('Total Files: 1');
      expect(result.outputText).toContain('sample.jpg');
      expect(result.outputText).toContain('SHA-256');
      expect(result.outputText).toContain('SHA-1');
    });

    it('Given hash command with --format markdown and --out flag, When executed, Then delivers markdown manifest to disk', async () => {
      const hashOutFile = path.join(tempDir, 'hash-manifest.md');
      const result = await runCli(['hash', sampleJpegPath, '--format', 'markdown', '--out', hashOutFile]);
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(fs.existsSync(hashOutFile)).toBe(true);
      const content = await fs.promises.readFile(hashOutFile, 'utf8');
      expect(content).toContain('# ExifSense Cryptographic Hash Manifest');
      expect(content).toContain('| sample.jpg |');
    });

    it('Given hash command with non-existent file, When executed, Then returns failure with exitCode 1', async () => {
      const result = await runCli(['hash', path.join(tempDir, 'non-existent.jpg')]);
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(result.errorText).toContain('Target path does not exist');
    });

    it('Given help flag, When executed, Then includes hash subcommand and --detailed option in usage guide', async () => {
      const result = await runCli(['--help']);
      expect(result.success).toBe(true);
      expect(result.outputText).toContain('exifsense hash <path...>');
      expect(result.outputText).toContain('--detailed');
    });
  });

  // ==========================================
  // BP-CLI-005: Baseline Extraction
  // ==========================================
  describe('BP-CLI-005: extractBaseline', () => {
    it('Given an image with EXIF, When baseline extracted, Then returns complete metadata object', async () => {
      const metadata = await extractBaseline(sampleJpegPath);
      expect(metadata).toBeDefined();
      expect(metadata.Make).toBe('Google');
      expect(metadata.Model).toBe('Pixel 6');
    });

    it('Given destination file path, When extracted, Then writes formatted JSON to disk', async () => {
      const destPath = path.join(tempDir, 'extracted.json');
      const metadata = await extractBaseline(sampleJpegPath, destPath);
      expect(fs.existsSync(destPath)).toBe(true);
      const diskContent = JSON.parse(await fs.promises.readFile(destPath, 'utf8'));
      expect(diskContent.Make).toBe('Google');
      expect(diskContent.Model).toBe('Pixel 6');
      expect(diskContent).toEqual(JSON.parse(JSON.stringify(metadata)));
    });

    it('Given non-existent image path, When extracted, Then throws FileNotFoundError', async () => {
      await expect(extractBaseline('/non/existent/source.jpg')).rejects.toThrow(
        FileNotFoundError
      );
    });
  });

  // ==========================================
  // BP-DUALDIST-004: Dual-Distance CLI Realignment
  // ==========================================
  describe('BP-DUALDIST-004: CLI Batch Dual-Distance and Offline Fallback', () => {
    it('resolves road route when online and outputs both Cumulative Displacement and Estimated Road Route', { timeout: 10000 }, async () => {
      const originalFetch = globalThis.fetch;
      const { clearOsrmCache, clearGeocodeCache } = await import('../../src/services/mapHelpers');
      clearOsrmCache();
      clearGeocodeCache();

      globalThis.fetch = (async (url: RequestInfo | URL) => {
        const urlStr = String(url);
        if (urlStr.includes('project-osrm.org')) {
          return {
            ok: true,
            json: async () => ({
              code: 'Ok',
              routes: [
                {
                  geometry: { type: 'LineString', coordinates: [] },
                  distance: 21500,
                  legs: [{ distance: 9500 }, { distance: 12000 }],
                },
              ],
            }),
          } as unknown as Response;
        }
        return {
          ok: true,
          json: async () => ({ display_name: 'Mocked Place, Scotland' }),
        } as unknown as Response;
      }) as typeof fetch;

      try {
        const result = await runCli(['scenario', 'travel-sequence']);
        expect(result.success).toBe(true);
        expect(result.exitCode).toBe(0);
        expect(result.outputText).toContain('Cumulative Displacement');
        expect(result.outputText).toContain('Estimated Road Route');
        expect(result.outputText).toContain('21.50 km');
        expect(result.outputText).toContain('via road route');
      } finally {
        globalThis.fetch = originalFetch;
        clearOsrmCache();
        clearGeocodeCache();
      }
    });

    it('falls back cleanly to displacement only when offline or network fails', { timeout: 10000 }, async () => {
      const originalFetch = globalThis.fetch;
      const { clearOsrmCache, clearGeocodeCache } = await import('../../src/services/mapHelpers');
      clearOsrmCache();
      clearGeocodeCache();

      globalThis.fetch = (async () => {
        throw new Error('Network connection offline');
      }) as typeof fetch;

      try {
        const result = await runCli(['scenario', 'travel-sequence']);
        expect(result.success).toBe(true);
        expect(result.exitCode).toBe(0);
        expect(result.outputText).toContain('Cumulative Displacement');
        expect(result.outputText).not.toContain('Estimated Road Route');
        expect(result.outputText).toContain('cumulative straight-line displacement');
        expect(result.outputText).not.toContain('via road route');
      } finally {
        globalThis.fetch = originalFetch;
        clearOsrmCache();
        clearGeocodeCache();
      }
    });
  });

  // ==========================================
  // BP-BATCH-PARITY-002: Batch Reverse Geocoding Enrichment
  // ==========================================
  describe('BP-BATCH-PARITY-002: Batch Reverse Geocoding Enrichment', () => {
    it('enriches batch assets sequentially with Nominatim place names when online', async () => {
      const batchFileA = path.join(tempDir, 'batch-geo-a.json');
      const batchFileB = path.join(tempDir, 'batch-geo-b.json');
      await fs.promises.writeFile(
        batchFileA,
        JSON.stringify({
          fileName: 'stop_one.jpg',
          exifData: {
            DateTimeOriginal: '2025:05:10 10:00:00',
            latitude: -6.1754,
            longitude: 106.8272,
          },
        }),
        'utf8'
      );
      await fs.promises.writeFile(
        batchFileB,
        JSON.stringify({
          fileName: 'stop_two.jpg',
          exifData: {
            DateTimeOriginal: '2025:05:10 10:30:00',
            GPSLatitude: -6.195,
            GPSLongitude: 106.823,
          },
        }),
        'utf8'
      );

      const originalFetch = globalThis.fetch;
      const { clearGeocodeCache, clearOsrmCache } = await import('../../src/services/mapHelpers');
      clearGeocodeCache();
      clearOsrmCache();

      globalThis.fetch = (async (url: RequestInfo | URL) => {
        const urlStr = String(url);
        if (urlStr.includes('project-osrm.org')) {
          return {
            ok: true,
            json: async () => ({
              code: 'Ok',
              routes: [{ distance: 3200, legs: [{ distance: 3200 }] }],
            }),
          } as unknown as Response;
        }
        if (urlStr.includes('-6.1754')) {
          return {
            ok: true,
            json: async () => ({ display_name: 'Monas, Gambir, Central Jakarta' }),
          } as unknown as Response;
        }
        return {
          ok: true,
          json: async () => ({ display_name: 'Bundaran HI, Menteng, Central Jakarta' }),
        } as unknown as Response;
      }) as typeof fetch;

      try {
        const result = await runCli(['batch', batchFileA, batchFileB]);
        expect(result.success).toBe(true);
        expect(result.exitCode).toBe(0);
        expect(result.outputText).toContain('Monas, Gambir, Central Jakarta');
        expect(result.outputText).toContain('Bundaran HI, Menteng, Central Jakarta');
      } finally {
        globalThis.fetch = originalFetch;
        clearGeocodeCache();
        clearOsrmCache();
      }
    });

    it('falls back cleanly to coordinates when Nominatim is offline during batch run', async () => {
      const batchFileA = path.join(tempDir, 'batch-offline-a.json');
      const batchFileB = path.join(tempDir, 'batch-offline-b.json');
      await fs.promises.writeFile(
        batchFileA,
        JSON.stringify({
          fileName: 'offline_one.jpg',
          exifData: {
            DateTimeOriginal: '2025:05:10 10:00:00',
            GPSLatitude: -6.1754,
            GPSLongitude: 106.8272,
          },
        }),
        'utf8'
      );
      await fs.promises.writeFile(
        batchFileB,
        JSON.stringify({
          fileName: 'offline_two.jpg',
          exifData: {
            DateTimeOriginal: '2025:05:10 10:30:00',
            GPSLatitude: -6.195,
            GPSLongitude: 106.823,
          },
        }),
        'utf8'
      );

      const originalFetch = globalThis.fetch;
      const { clearGeocodeCache, clearOsrmCache } = await import('../../src/services/mapHelpers');
      clearGeocodeCache();
      clearOsrmCache();

      globalThis.fetch = (async () => {
        throw new Error('Offline network');
      }) as typeof fetch;

      try {
        const result = await runCli(['batch', batchFileA, batchFileB]);
        expect(result.success).toBe(true);
        expect(result.exitCode).toBe(0);
        expect(result.outputText).toContain('-6.17540, 106.82720');
        expect(result.outputText).toContain('-6.19500, 106.82300');
      } finally {
        globalThis.fetch = originalFetch;
        clearGeocodeCache();
        clearOsrmCache();
      }
    });
  });

  // ==========================================
  // BP-PARITY-001: Single-Asset Reverse Geocoding Enrichment
  // ==========================================
  describe('BP-PARITY-001: Single-Asset Reverse Geocoding', () => {
    it('preserves locationName and locationData when present in JSON asset', async () => {
      const jsonWithLocation = path.join(tempDir, 'with-location.json');
      await fs.promises.writeFile(
        jsonWithLocation,
        JSON.stringify({
          fileName: 'preloaded.jpg',
          exifData: { latitude: 55.86449, longitude: -4.42989 },
          locationName: 'Paisley, Renfrewshire, Scotland',
          locationData: { display_name: 'Paisley, Renfrewshire, Scotland' },
        }),
        'utf8'
      );

      const asset = await loadAssetSource(jsonWithLocation);
      expect(asset.locationName).toBe('Paisley, Renfrewshire, Scotland');
      expect(asset.locationData?.display_name).toBe('Paisley, Renfrewshire, Scotland');
    });

    it('enriches single-asset CLI output with resolved Nominatim place name when online', async () => {
      const originalFetch = globalThis.fetch;
      const { clearGeocodeCache } = await import('../../src/services/mapHelpers');
      clearGeocodeCache();

      globalThis.fetch = (async () => {
        return {
          ok: true,
          json: async () => ({
            display_name: 'Luss, Argyll and Bute, Scotland',
            address: { village: 'Luss' },
          }),
        } as unknown as Response;
      }) as typeof fetch;

      try {
        const result = await runCli(['scenario', 'baseline']);
        expect(result.success).toBe(true);
        expect(result.exitCode).toBe(0);
        expect(result.outputText).toContain('Luss, Argyll and Bute, Scotland');
      } finally {
        globalThis.fetch = originalFetch;
        clearGeocodeCache();
      }
    });

    it('falls back gracefully to coordinates when Nominatim is offline during single run', async () => {
      const originalFetch = globalThis.fetch;
      const { clearGeocodeCache } = await import('../../src/services/mapHelpers');
      clearGeocodeCache();

      globalThis.fetch = (async () => {
        throw new Error('Offline');
      }) as typeof fetch;

      try {
        const result = await runCli(['scenario', 'baseline']);
        expect(result.success).toBe(true);
        expect(result.exitCode).toBe(0);
        expect(result.outputText).toContain('55.86449');
        expect(result.outputText).toContain('-4.42989');
      } finally {
        globalThis.fetch = originalFetch;
        clearGeocodeCache();
      }
    });
  });

  // ==========================================
  // BP-PARITY-004: End-to-End Single-Asset Web Parity
  // ==========================================
  describe('BP-PARITY-004: End-to-End Single-Asset Web Parity', () => {
    it('outputs complete file info, 7 narratives, and 8 raw categories for missing-gps in id markdown mode', async () => {
      const result = await runCli([
        'scenario',
        'missing-gps',
        '--locale',
        'id',
        '--format',
        'markdown',
      ]);

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.outputText).toContain('# ExifSense Forensic Analysis');
      expect(result.outputText).toContain('**Sistem File (Terakhir Dimodifikasi)**');
      expect(result.outputText).toContain('### Analisis Integritas');
      expect(result.outputText).toContain('### Analisis Geospasial');
      expect(result.outputText).toContain('### Analisis Perangkat Keras');
      expect(result.outputText).toContain('### Analisis Eksposur');
      expect(result.outputText).toContain('### Analisis Optik');
      expect(result.outputText).toContain('### Analisis Kualitas');
      expect(result.outputText).toContain('### Analisis Kronologi');
      expect(result.outputText).toContain('Tidak ada data lokasi (GPS)');
      expect(result.outputText).toContain('## Categorized EXIF Metadata');
      expect(result.outputText).toContain('### Perangkat Keras');
      expect(result.outputText).toContain('### Pengaturan Eksposur');
      expect(result.outputText).toContain('### Optik & Lensa');
      expect(result.outputText).toContain('### Kualitas Gambar');
      expect(result.outputText).toContain('### Kronologi & Waktu');
      expect(result.outputText).toContain('### Geospasial');
      expect(result.outputText).toContain('### Standar & Info');
      expect(result.outputText).toContain('### Lain-lain');
      expect(result.outputText).toContain('G P S Latitude Ref');
    });

    it('outputs complete single-asset JPEG analysis with Nominatim place name and 8 raw categories', async () => {
      const originalFetch = globalThis.fetch;
      const { clearGeocodeCache } = await import('../../src/services/mapHelpers');
      clearGeocodeCache();

      globalThis.fetch = (async () => {
        return {
          ok: true,
          json: async () => ({
            display_name: 'Glasgow, Scotland, United Kingdom',
            address: { city: 'Glasgow' },
          }),
        } as unknown as Response;
      }) as typeof fetch;

      try {
        const result = await runCli(['single', sampleJpegPath, '--locale', 'en']);
        expect(result.success).toBe(true);
        expect(result.exitCode).toBe(0);
        expect(result.outputText).toContain('File System (Last Modified)');
        expect(result.outputText).toContain('Glasgow, Scotland, United Kingdom');
        expect(result.outputText).toContain('[Integrity Analysis]');
        expect(result.outputText).toContain('[Geospatial Analysis]');
        expect(result.outputText).toContain('[Hardware Analysis]');
        expect(result.outputText).toContain('[Exposure Analysis]');
        expect(result.outputText).toContain('[Optics Analysis]');
        expect(result.outputText).toContain('[Quality Analysis]');
        expect(result.outputText).toContain('[Timeline Analysis]');
        expect(result.outputText).toContain('--- Categorized EXIF Metadata ---');
        expect(result.outputText).toContain('[Device Hardware]');
        expect(result.outputText).toContain('[Exposure Settings]');
        expect(result.outputText).toContain('[Optics & Lens]');
        expect(result.outputText).toContain('[Image Quality]');
        expect(result.outputText).toContain('[Timeline & Date]');
        expect(result.outputText).toContain('[Geospatial]');
        expect(result.outputText).toContain('[Standards & Info]');
        expect(result.outputText).toContain('[Miscellaneous]');
        expect(result.outputText).toContain('Google');
        expect(result.outputText).toContain('Pixel 6');
        expect(result.outputText).toContain('No standard data tags were found in this category.');
      } finally {
        globalThis.fetch = originalFetch;
        clearGeocodeCache();
      }
    });
  });
});
